import type { IncomingMessage, ServerResponse } from "node:http";
import { enforceRateLimit, getSupabaseAdmin, handleApiError, json, PortalHttpError, readJsonBody, requirePortalUser } from "../_lib/server.js";
import { handleTimesheetDatabaseError, requireTimesheetAssignment, timesheetConflict, timesheetSelection, toTimesheet, validateTimesheetSave, type TimesheetRow } from "../_lib/timesheets.js";

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return json(response, 405, { error: "Method not allowed." });
  }
  try {
    const actor = await requirePortalUser(request, response);
    await enforceRateLimit(request, actor.user.id, "timesheet_save", 120, 600);
    const input = validateTimesheetSave(await readJsonBody(request));
    const admin = getSupabaseAdmin();
    let current: TimesheetRow | null = null;
    if (input.id) {
      const result = await admin.from("timesheets").select(timesheetSelection)
        .eq("id", input.id).eq("consultant_id", actor.user.id).maybeSingle();
      if (result.error) throw result.error;
      current = result.data as TimesheetRow | null;
      if (!current) throw new PortalHttpError(404, "Timesheet not found.");
      if (current.status !== "draft" && current.status !== "returned")
        throw new PortalHttpError(409, "Submitted and approved timesheets are locked for review.");
      if (current.assignment_id !== input.assignmentId || current.week_start !== input.weekStart)
        throw new PortalHttpError(400, "The project and week cannot be changed after a timesheet is created.");
    }
    await requireTimesheetAssignment(admin, actor.user.id, input.assignmentId);
    const submitting = input.action === "submit";
    const record = {
      consultant_id: actor.user.id,
      assignment_id: input.assignmentId,
      week_start: input.weekStart,
      entries: input.entries,
      status: submitting ? "submitted" : current?.status ?? "draft",
      submitted_at: submitting ? new Date().toISOString() : current?.submitted_at ?? null,
      reviewed_at: submitting ? null : current?.reviewed_at ?? null,
      reviewed_by: submitting ? null : current?.reviewed_by ?? null,
      review_note: submitting ? "" : current?.review_note ?? "",
    };
    const result = current
      ? await admin.from("timesheets").update(record).eq("id", current.id)
          .eq("consultant_id", actor.user.id).eq("updated_at", input.expectedUpdatedAt!)
          .in("status", ["draft", "returned"]).select(timesheetSelection).maybeSingle()
      : await admin.from("timesheets").insert(record).select(timesheetSelection).single();
    if (result.error) handleTimesheetDatabaseError(result.error);
    if (!result.data) throw timesheetConflict();
    return json(response, current ? 200 : 201, { timesheet: toTimesheet(result.data as TimesheetRow) });
  } catch (error) {
    return handleApiError(response, error);
  }
}
