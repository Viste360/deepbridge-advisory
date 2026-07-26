import type { IncomingMessage, ServerResponse } from "node:http";
import {
  enforceRateLimit,
  getSupabaseForUser,
  handleApiError,
  json,
  PortalHttpError,
  readJsonBody,
  requirePortalUser,
} from "../_lib/server";

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
    await enforceRateLimit(request, actor.user.id, "acknowledgement", 20, 600);
    const body = await readJsonBody(request);
    const documentId =
      typeof body.documentId === "string" ? body.documentId : "";
    if (!/^[0-9a-f-]{36}$/i.test(documentId))
      throw new PortalHttpError(400, "A valid document is required.");
    const supabase = getSupabaseForUser(actor.accessToken);
    const { error } = await supabase.rpc("acknowledge_document", {
      requested_document_id: documentId,
    });
    if (error) throw error;
    return json(response, 200, { acknowledged: true });
  } catch (error) {
    return handleApiError(response, error);
  }
}
