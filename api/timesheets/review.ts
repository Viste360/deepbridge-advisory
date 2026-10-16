import type { IncomingMessage, ServerResponse } from "node:http";
import { enforceRateLimit, getSupabaseAdmin, handleApiError, json, PortalHttpError, readJsonBody, requirePortalUser } from "../_lib/server.js";
import { handleTimesheetDatabaseError, timesheetConflict, timesheetSelection, toTimesheet, validateTimesheetReview, type TimesheetRow } from "../_lib/timesheets.js";

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return json(response, 405, { error: "Method not allowed." });
  }
  try {
    const actor = await requirePortalUser(request, response, "admin");
    await enforceRateLimit(request, actor.user.id, "timesheet_review", 120, 600);
    const input = validateTimesheetReview(await readJsonBody(request));
    const admin = getSupabaseAdmin();
    const current = await admin.from("timesheets").select("id, status").eq("id", input.id).maybeSingle();
    if (current.error) throw current.error;
    if (!current.data) throw new PortalHttpError(404, "Timesheet not found.");
    if (current.data.status !== "submitted")
      throw new PortalHttpError(409, "Only submitted timesheets can be reviewed.");
    const result = await admin.from("timesheets").update({
      status: input.status,
      review_note: input.reviewNote,
      reviewed_by: actor.user.id,
      reviewed_at: new Date().toISOString(),
    }).eq("id", input.id).eq("status", "submitted").eq("updated_at", input.expectedUpdatedAt)
      .select(timesheetSelection).maybeSingle();
    if (result.error) handleTimesheetDatabaseError(result.error);
    if (!result.data) throw timesheetConflict();
    return json(response, 200, { timesheet: toTimesheet(result.data as TimesheetRow) });
  } catch (error) {
    return handleApiError(response, error);
  }
}
