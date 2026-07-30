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
    await enforceRateLimit(request, actor.user.id, "contract_upload", 30, 3_600);
    const body = await readJsonBody(request);
    const sizeBytes =
      typeof body.sizeBytes === "number" ? Math.round(body.sizeBytes) : 0;
    if (body.mimeType !== "application/pdf")
      throw new PortalHttpError(400, "Only PDF contracts are accepted.");
    if (sizeBytes <= 0 || sizeBytes > 25 * 1024 * 1024)
      throw new PortalHttpError(400, "The maximum contract size is 25 MB.");
    const storagePath = `source/${actor.user.id}/${randomUUID()}.pdf`;
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.storage
      .from("contract-documents")
      .createSignedUploadUrl(storagePath, { upsert: false });
    if (error) throw error;
    return json(response, 200, { path: storagePath, token: data.token });
  } catch (error) {
    return handleApiError(response, error);
  }
}
