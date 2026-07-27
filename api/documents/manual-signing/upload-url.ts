import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  enforceRateLimit,
  getSupabaseAdmin,
  handleApiError,
  json,
  PortalHttpError,
  readJsonBody,
  requirePortalUser,
} from "../../_lib/server.js";

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
    if (actor.profile.role !== "consultant")
      throw new PortalHttpError(403, "Consultant access is required.");
    await enforceRateLimit(
      request,
      actor.user.id,
      "manual_signature_upload",
      10,
      3600,
    );
    const body = await readJsonBody(request);
    const assignedDocumentId =
      typeof body.assignedDocumentId === "string"
        ? body.assignedDocumentId
        : "";
    const sizeBytes =
      typeof body.sizeBytes === "number" ? Math.round(body.sizeBytes) : 0;
    if (!/^[0-9a-f-]{36}$/i.test(assignedDocumentId))
      throw new PortalHttpError(400, "A valid assigned document is required.");
    if (body.mimeType !== "application/pdf")
      throw new PortalHttpError(400, "Only PDF documents are accepted.");
    if (sizeBytes <= 0 || sizeBytes > 25 * 1024 * 1024)
      throw new PortalHttpError(400, "The maximum PDF size is 25 MB.");

    const admin = getSupabaseAdmin();
    const { data: assigned, error: assignedError } = await admin
      .from("assigned_documents")
      .select(
        "id, consultant_id, status, document_versions!inner(malware_scan_status, locked_at, documents!inner(category))",
      )
      .eq("id", assignedDocumentId)
      .eq("consultant_id", actor.user.id)
      .single();
    if (assignedError || !assigned)
      throw new PortalHttpError(404, "Assigned document not found.");
    const version = Array.isArray(assigned.document_versions)
      ? assigned.document_versions[0]
      : assigned.document_versions;
    const document = Array.isArray(version?.documents)
      ? version.documents[0]
      : version?.documents;
    if (document?.category !== "signature")
      throw new PortalHttpError(400, "This document does not require signing.");
    if (version?.malware_scan_status !== "clean" || !version?.locked_at)
      throw new PortalHttpError(
        409,
        "The approved PDF has not passed publication checks.",
      );
    if (!["not_reviewed", "ready_to_sign"].includes(assigned.status))
      throw new PortalHttpError(
        409,
        "This document is not accepting another signed upload.",
      );

    const path = `${actor.user.id}/${assignedDocumentId}/manual-consultant/${randomUUID()}.pdf`;
    const { data, error } = await admin.storage
      .from("signed-documents")
      .createSignedUploadUrl(path, { upsert: false });
    if (error) throw error;
    return json(response, 200, { path, token: data.token });
  } catch (error) {
    return handleApiError(response, error);
  }
}
