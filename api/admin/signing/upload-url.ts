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
    const actor = await requirePortalUser(request, response, "admin");
    await enforceRateLimit(request, actor.user.id, "signed_pack_upload", 20, 3600);
    const body = await readJsonBody(request);
    const assignedDocumentId =
      typeof body.assignedDocumentId === "string"
        ? body.assignedDocumentId
        : "";
    const kind = body.kind === "certificate" ? "certificate" : "final";
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
      .select("id, consultant_id, status")
      .eq("id", assignedDocumentId)
      .single();
    if (assignedError || !assigned)
      throw new PortalHttpError(404, "Assigned document not found.");
    if (assigned.status !== "awaiting_deepbridge")
      throw new PortalHttpError(
        409,
        "Record the consultant signature before uploading the completed pack.",
      );

    const { data: envelope, error: envelopeError } = await admin
      .from("signature_envelopes")
      .select("id")
      .eq("assigned_document_id", assignedDocumentId)
      .eq("provider", "google_workspace")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (envelopeError || !envelope)
      throw new PortalHttpError(
        409,
        "Record the Google signature request before uploading its completed pack.",
      );

    const path = `${assigned.consultant_id}/${assignedDocumentId}/${envelope.id}/${kind}-${randomUUID()}.pdf`;
    const { data, error } = await admin.storage
      .from("signed-documents")
      .createSignedUploadUrl(path, { upsert: false });
    if (error) throw error;
    return json(response, 200, { path, token: data.token });
  } catch (error) {
    return handleApiError(response, error);
  }
}
