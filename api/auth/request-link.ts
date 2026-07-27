import { createHash } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createPortalAuthClient } from "../_lib/authCookies.js";
import {
  enforceRateLimit,
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
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new PortalHttpError(400, "A valid email address is required.");
    const anonymousKey = createHash("sha256").update(email).digest("hex");
    await enforceRateLimit(request, anonymousKey, "magic_link", 5, 900);
    const portalUrl = process.env.PORTAL_PUBLIC_URL?.replace(/\/$/, "");
    if (!portalUrl)
      throw new Error("Missing required server configuration: PORTAL_PUBLIC_URL");

    const auth = createPortalAuthClient(request, response);
    const { error } = await auth.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${portalUrl}/auth/callback`,
        shouldCreateUser: false,
      },
    });
    if (error) {
      console.error("Magic link request failed", error);
    }

    return json(response, 200, {
      message:
        "If this email has an active invitation, a secure sign-in link has been sent.",
    });
  } catch (error) {
    return handleApiError(response, error);
  }
}
