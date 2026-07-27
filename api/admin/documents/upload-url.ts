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
    await enforceRateLimit(request, actor.user.id, "document_upload", 20, 3600);
    const body = await readJsonBody(request);
    const documentId =
      typeof body.documentId === "string" ? body.documentId : "";
    const sizeBytes =
      typeof body.sizeBytes === "number" ? Math.round(body.sizeBytes) : 0;
    if (!/^[0-9a-f-]{36}$/i.test(documentId))
      throw new PortalHttpError(400, "A valid document type is required.");
    if (body.mimeType !== "application/pdf")
      throw new PortalHttpError(400, "Only PDF documents are accepted.");
    if (sizeBytes <= 0 || sizeBytes > 25 * 1024 * 1024)
      throw new PortalHttpError(400, "The maximum document size is 25 MB.");

    const admin = getSupabaseAdmin();
    const { data: document, error: documentError } = await admin
      .from("documents")
      .select("id")
      .eq("id", documentId)
      .single();
    if (documentError || !document)
      throw new PortalHttpError(404, "Document type not found.");

    const storagePath = `source/${documentId}/${randomUUID()}.pdf`;
    const { data, error } = await admin.storage
      .from("portal-documents")
      .createSignedUploadUrl(storagePath, { upsert: false });
    if (error) throw error;
    return json(response, 200, { path: storagePath, token: data.token });
  } catch (error) {
    return handleApiError(response, error);
  }
}
