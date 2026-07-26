import type { IncomingMessage, ServerResponse } from "node:http";
import {
  getSupabaseAdmin,
  handleApiError,
  json,
  PortalHttpError,
  readJsonBody,
  requestContext,
  requirePortalUser,
} from "../../_lib/server";

function cleanText(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return json(response, 405, { error: "Method not allowed." });
  }
  try {
    const actor = await requirePortalUser(request, response, "admin");
    const body = await readJsonBody(request);
    const documentId = cleanText(body.documentId, 36);
    const assignmentId = cleanText(body.assignmentId, 36);
    const storagePath = cleanText(body.storagePath, 500);
    const versionLabel = cleanText(body.versionLabel, 40);
    const originalFilename = cleanText(body.originalFilename, 240);
    const contentSha256 = cleanText(body.contentSha256, 64).toLowerCase();
    const sizeBytes =
      typeof body.sizeBytes === "number" ? Math.round(body.sizeBytes) : 0;
    if (
      !/^[0-9a-f-]{36}$/i.test(documentId) ||
      !/^[0-9a-f-]{36}$/i.test(assignmentId) ||
      !storagePath.startsWith(`source/${documentId}/`) ||
      storagePath.includes("..") ||
      !versionLabel ||
      !originalFilename.toLowerCase().endsWith(".pdf") ||
      body.mimeType !== "application/pdf" ||
      sizeBytes <= 0 ||
      sizeBytes > 25 * 1024 * 1024 ||
      !/^[0-9a-f]{64}$/.test(contentSha256)
    ) {
      throw new PortalHttpError(400, "Invalid document metadata.");
    }

    const admin = getSupabaseAdmin();
    const { data: document, error: documentError } = await admin
      .from("documents")
      .select("id, category")
      .eq("id", documentId)
      .single();
    if (documentError || !document)
      throw new PortalHttpError(404, "Document type not found.");
    const { data: assignment, error: assignmentError } = await admin
      .from("assignments")
      .select("id")
      .eq("id", assignmentId)
      .single();
    if (assignmentError || !assignment)
      throw new PortalHttpError(404, "Assignment not found.");

    const parts = storagePath.split("/");
    const filename = parts.pop() ?? "";
    const { data: stored, error: listError } = await admin.storage
      .from("portal-documents")
      .list(parts.join("/"), { search: filename, limit: 1 });
    if (listError) throw listError;
    if (!stored?.some((item) => item.name === filename))
      throw new PortalHttpError(409, "The uploaded PDF could not be verified.");

    const { data: version, error: versionError } = await admin
      .from("document_versions")
      .insert({
        document_id: documentId,
        assignment_id: assignmentId,
        version_label: versionLabel,
        source_storage_path: storagePath,
        provider_template_id: null,
        content_sha256: contentSha256,
        original_filename: originalFilename,
        mime_type: "application/pdf",
        size_bytes: sizeBytes,
        malware_scan_status: "pending",
        created_by: actor.user.id,
      })
      .select("id")
      .single();
    if (versionError) {
      if (versionError.code === "23505")
        throw new PortalHttpError(
          409,
          "That version label already exists for this document.",
        );
      throw versionError;
    }

    await admin.from("audit_events").insert({
      actor_id: actor.user.id,
      actor_label: actor.profile.full_name,
      action: "document_version_uploaded",
      object_type: "document_version",
      object_id: version.id,
      assignment_id: assignmentId,
      ...requestContext(request),
      metadata: { document_id: documentId, version_label: versionLabel },
    });

    return json(response, 201, {
      versionId: version.id,
      status: "pending_scan",
    });
  } catch (error) {
    return handleApiError(response, error);
  }
}
