import type { IncomingMessage, ServerResponse } from "node:http";
import { createPortalAuthClient } from "../_lib/authCookies.js";
import {
  handleApiError,
  json,
  PortalHttpError,
  readJsonBody,
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
    const body = await readJsonBody(request);
    const code = typeof body.code === "string" ? body.code : "";
    if (!code) throw new PortalHttpError(400, "Sign-in code is missing.");
    const auth = createPortalAuthClient(request, response);
    const { error } = await auth.auth.exchangeCodeForSession(code);
    if (error)
      throw new PortalHttpError(
        401,
        "The secure link is invalid or has expired.",
      );
    return json(response, 200, { authenticated: true });
  } catch (error) {
    return handleApiError(response, error);
  }
}
