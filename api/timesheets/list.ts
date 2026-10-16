import type { IncomingMessage, ServerResponse } from "node:http";
import { getSupabaseForUser, handleApiError, json, requirePortalUser } from "../_lib/server.js";
import { timesheetSelection, toTimesheet, type TimesheetRow } from "../_lib/timesheets.js";

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return json(response, 405, { error: "Method not allowed." });
  }
  try {
    const actor = await requirePortalUser(request, response);
    const client = getSupabaseForUser(actor.accessToken);
    // RLS limits consultants to their own records; active admins can review all.
    let query = client.from("timesheets").select(timesheetSelection);
    if (actor.profile.role !== "admin") query = query.eq("consultant_id", actor.user.id);
    const [timesheets, assignments] = await Promise.all([
      query.order("week_start", { ascending: false }).order("created_at", { ascending: false }),
      client.from("assignments").select("id, title, programme").eq("status", "active").order("title"),
    ]);
    if (timesheets.error) throw timesheets.error;
    if (assignments.error) throw assignments.error;
    return json(response, 200, {
      timesheets: (timesheets.data as TimesheetRow[]).map(toTimesheet),
      assignments: assignments.data ?? [],
    });
  } catch (error) {
    return handleApiError(response, error);
  }
}
