import type { IncomingMessage, ServerResponse } from "node:http";
import type { EmailOtpType } from "@supabase/supabase-js";
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
    const tokenHash =
      typeof body.tokenHash === "string" ? body.tokenHash.trim() : "";
    const type = typeof body.type === "string" ? body.type.trim() : "";
    if (!code && (!tokenHash || !type))
      throw new PortalHttpError(400, "Sign-in verification is missing.");

    const auth = createPortalAuthClient(request, response);
    const { error } = code
      ? await auth.auth.exchangeCodeForSession(code)
      : await auth.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as EmailOtpType,
        });
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
