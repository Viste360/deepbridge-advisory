import type { IncomingMessage, ServerResponse } from "node:http";
import { enforceRateLimit, getSupabaseAdmin, handleApiError, json, PortalHttpError, readJsonBody, requirePortalUser } from "../_lib/server.js";
import { requireServiceRecordId, serviceRecordBucket } from "../_lib/service-records.js";

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return json(response, 405, { error: "Method not allowed." });
  }
  try {
    const actor = await requirePortalUser(request, response);
    await enforceRateLimit(request, actor.user.id, "service_record_access", 60, 600);
    const recordId = requireServiceRecordId((await readJsonBody(request)).recordId);
    const admin = getSupabaseAdmin();
    let query = admin.from("supplier_service_records")
      .select("id, consultant_id, storage_path, original_filename, status, scan_status").eq("id", recordId);
    if (actor.profile.role !== "admin") query = query.eq("consultant_id", actor.user.id);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    if (!data) throw new PortalHttpError(404, "Service record not found.");
    if (data.status !== "submitted" || data.scan_status !== "clean")
      throw new PortalHttpError(409, "This PDF is unavailable until its security check passes.");
    const signed = await admin.storage.from(serviceRecordBucket).createSignedUrl(data.storage_path, 300, { download: data.original_filename });
    if (signed.error) throw signed.error;
    return json(response, 200, { url: signed.data.signedUrl });
  } catch (error) {
    return handleApiError(response, error);
  }
}
