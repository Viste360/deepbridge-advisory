import type { IncomingMessage, ServerResponse } from "node:http";
import {
  enforceRateLimit,
  getSupabaseAdmin,
  handleApiError,
  json,
  PortalHttpError,
  readJsonBody,
  requestContext,
  requirePortalUser,
} from "../_lib/server.js";

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return json(response, 405, { error: "Method not allowed." });
  }

  try {
    const actor = await requirePortalUser(request, response);
    await enforceRateLimit(request, actor.user.id, "document_access", 60, 600);
    const body = await readJsonBody(request);
    const documentId =
      typeof body.documentId === "string" ? body.documentId : "";
    const kind =
      body.kind === "final" || body.kind === "certificate"
        ? body.kind
        : "source";
    if (!/^[0-9a-f-]{36}$/i.test(documentId))
      throw new PortalHttpError(400, "A valid document is required.");

    const admin = getSupabaseAdmin();
    let query = admin
      .from("assigned_documents")
      .select(
        "id, consultant_id, assignment_id, status, final_storage_path, certificate_storage_path, document_versions!inner(source_storage_path, malware_scan_status, locked_at)",
      )
      .eq("id", documentId);
    if (actor.profile.role !== "admin")
      query = query.eq("consultant_id", actor.user.id);
    const { data: assigned, error } = await query.single();
    if (error || !assigned)
      throw new PortalHttpError(404, "Assigned document not found.");

    const version = Array.isArray(assigned.document_versions)
      ? assigned.document_versions[0]
      : assigned.document_versions;
    const storagePath =
      kind === "final"
        ? assigned.final_storage_path
        : kind === "certificate"
          ? assigned.certificate_storage_path
          : version?.source_storage_path;
    if (!storagePath)
      throw new PortalHttpError(
        409,
        "The requested document file is not available yet.",
      );
    if (kind !== "source" && assigned.status !== "completed")
      throw new PortalHttpError(409, "The signed document is not complete.");
    if (
      kind === "source" &&
      (version?.malware_scan_status !== "clean" || !version?.locked_at)
    )
      throw new PortalHttpError(
        409,
        "This document version has not passed publication checks.",
      );

    const bucket =
      kind === "source" ? "portal-documents" : "signed-documents";
    const { data: signed, error: signedUrlError } = await admin.storage
      .from(bucket)
      .createSignedUrl(storagePath, 300, {
        download: kind === "source" ? false : true,
      });
    if (signedUrlError) throw signedUrlError;

    await admin.from("audit_events").insert({
      actor_id: actor.user.id,
      actor_label: actor.profile.full_name,
      action: kind === "source" ? "document_viewed" : "document_downloaded",
      object_type: "assigned_document",
      object_id: assigned.id,
      assignment_id: assigned.assignment_id,
      consultant_id: assigned.consultant_id,
      ...requestContext(request),
      metadata: { kind },
    });

    return json(response, 200, { url: signed.signedUrl });
  } catch (error) {
    return handleApiError(response, error);
  }
}
