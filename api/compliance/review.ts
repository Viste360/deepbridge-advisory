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
    const actor = await requirePortalUser(request, response, "admin");
    await enforceRateLimit(request, actor.user.id, "compliance_review", 60, 600);
    const body = await readJsonBody(request);
    const submissionId =
      typeof body.submissionId === "string" ? body.submissionId : "";
    const status =
      body.status === "accepted" || body.status === "rejected"
        ? body.status
        : null;
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) : "";
    if (!/^[0-9a-f-]{36}$/i.test(submissionId) || !status)
      throw new PortalHttpError(400, "A valid review decision is required.");
    const supabase = getSupabaseForUser(actor.accessToken);
    const { error } = await supabase.rpc("review_compliance_submission", {
      requested_submission_id: submissionId,
      requested_status: status,
      requested_note: note,
    });
    if (error) throw error;
    return json(response, 200, { reviewed: true });
  } catch (error) {
    return handleApiError(response, error);
  }
}
