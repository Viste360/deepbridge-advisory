import type { IncomingMessage, ServerResponse } from "node:http";
import {
  handleApiError,
  json,
  requirePortalUser,
} from "../_lib/server.js";

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return json(response, 405, { error: "Method not allowed." });
  }
  try {
    const actor = await requirePortalUser(request, response);
    return json(response, 200, {
      session: {
        user: { id: actor.user.id, email: actor.profile.email },
        role: actor.profile.role,
      },
    });
  } catch (error) {
    return handleApiError(response, error);
  }
}
