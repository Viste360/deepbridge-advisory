import type { IncomingMessage, ServerResponse } from "node:http";
import { createPortalAuthClient } from "../_lib/authCookies";
import { handleApiError, json } from "../_lib/server";

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return json(response, 405, { error: "Method not allowed." });
  }
  try {
    const auth = createPortalAuthClient(request, response);
    await auth.auth.signOut();
    return json(response, 200, { signedOut: true });
  } catch (error) {
    return handleApiError(response, error);
  }
}
