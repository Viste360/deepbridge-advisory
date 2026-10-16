import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { enforceRateLimit, getSupabaseAdmin, handleApiError, json, readJsonBody, requirePortalUser } from "../_lib/server.js";
import { requireServiceRecordAssignment, serviceRecordBucket, validateServiceRecordUpload } from "../_lib/service-records.js";

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return json(response, 405, { error: "Method not allowed." });
  }
  try {
    const actor = await requirePortalUser(request, response);
    await enforceRateLimit(request, actor.user.id, "service_record_upload", 20, 3600);
    const input = validateServiceRecordUpload(await readJsonBody(request));
    const admin = getSupabaseAdmin();
    await requireServiceRecordAssignment(admin, actor.user.id, input.assignmentId);
    const recordId = randomUUID();
    const path = `${actor.user.id}/${recordId}.pdf`;
    const { error: insertError } = await admin.from("supplier_service_records").insert({
      id: recordId, consultant_id: actor.user.id, assignment_id: input.assignmentId,
      period_start: input.periodStart, period_end: input.periodEnd, summary: input.summary,
      invoice_reference: input.invoiceReference, original_filename: input.originalFilename,
      mime_type: input.mimeType, size_bytes: input.sizeBytes, storage_path: path,
    });
    if (insertError) throw insertError;
    const { data, error } = await admin.storage.from(serviceRecordBucket).createSignedUploadUrl(path, { upsert: false });
    if (error) {
      await admin.from("supplier_service_records").delete().eq("id", recordId).eq("status", "uploading");
      throw error;
    }
    return json(response, 200, { recordId, path, token: data.token });
  } catch (error) {
    return handleApiError(response, error);
  }
}
