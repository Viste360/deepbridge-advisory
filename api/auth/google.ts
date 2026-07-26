import type { IncomingMessage, ServerResponse } from "node:http";
import { createPortalAuthClient } from "../_lib/authCookies";
import { handleApiError, json } from "../_lib/server";

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return json(response, 405, { error: "Method not allowed." });
  }
  try {
    const portalUrl = process.env.PORTAL_PUBLIC_URL?.replace(/\/$/, "");
    if (!portalUrl)
      throw new Error("Missing required server configuration: PORTAL_PUBLIC_URL");
    const auth = createPortalAuthClient(request, response);
    const { data, error } = await auth.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${portalUrl}/auth/callback`,
        skipBrowserRedirect: true,
      },
    });
    if (error || !data.url) throw error || new Error("OAuth URL unavailable.");
    response.statusCode = 302;
    response.setHeader("Location", data.url);
    response.setHeader("Cache-Control", "private, no-store");
    response.end();
  } catch (error) {
    return handleApiError(response, error);
  }
}
