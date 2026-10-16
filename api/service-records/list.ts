import type { IncomingMessage, ServerResponse } from "node:http";
import { getSupabaseForUser, handleApiError, json, requirePortalUser } from "../_lib/server.js";
import { serviceRecordSelection, toServiceRecord, type ServiceRecordRow } from "../_lib/service-records.js";

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return json(response, 405, { error: "Method not allowed." });
  }
  try {
    const actor = await requirePortalUser(request, response);
    const client = getSupabaseForUser(actor.accessToken);
    let query = client.from("supplier_service_records").select(serviceRecordSelection).eq("status", "submitted");
    if (actor.profile.role !== "admin") query = query.eq("consultant_id", actor.user.id);
    const [records, assignments] = await Promise.all([
      query.order("created_at", { ascending: false }),
      client.from("assignments").select("id, title, programme").eq("status", "active").order("title"),
    ]);
    if (records.error) throw records.error;
    if (assignments.error) throw assignments.error;
    return json(response, 200, { records: (records.data as ServiceRecordRow[]).map(toServiceRecord), assignments: assignments.data ?? [] });
  } catch (error) {
    return handleApiError(response, error);
  }
}
