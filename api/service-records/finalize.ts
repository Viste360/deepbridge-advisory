import type { IncomingMessage, ServerResponse } from "node:http";
import { enforceRateLimit, getSupabaseAdmin, handleApiError, json, PortalHttpError, readJsonBody, requirePortalUser } from "../_lib/server.js";
import { requestMalwareScan } from "../_lib/scanner.js";
import { requireServiceRecordAssignment, requireServiceRecordId, serviceRecordBucket, serviceRecordSelection, toServiceRecord, verifyServiceRecordPdf, type ServiceRecordRow } from "../_lib/service-records.js";

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return json(response, 405, { error: "Method not allowed." });
  }
  try {
    const actor = await requirePortalUser(request, response);
    await enforceRateLimit(request, actor.user.id, "service_record_finalize", 30, 3600);
    const recordId = requireServiceRecordId((await readJsonBody(request)).recordId);
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from("supplier_service_records").select(serviceRecordSelection)
      .eq("id", recordId).eq("consultant_id", actor.user.id).maybeSingle();
    if (error) throw error;
    if (!data) throw new PortalHttpError(404, "Service record not found.");
    const record = data as ServiceRecordRow;
    if (record.status === "submitted" && (record.scan_status === "clean" || record.scan_status === "infected"))
      return json(response, 200, { record: toServiceRecord(record) });
    await requireServiceRecordAssignment(admin, actor.user.id, record.assignment_id);
    if (record.status === "uploading") {
      const bucket = admin.storage.from(serviceRecordBucket);
      const info = await bucket.info(record.storage_path);
      if (info.error || !info.data) throw new PortalHttpError(409, "The PDF has not finished uploading. Please try again.");
      if (info.data.size !== record.size_bytes || info.data.contentType !== "application/pdf")
        throw new PortalHttpError(409, "The uploaded file does not match the selected PDF. Please upload it again.");
      const file = await bucket.download(record.storage_path);
      if (file.error || !file.data) throw new PortalHttpError(409, "The uploaded PDF could not be verified.");
      const contentSha256 = verifyServiceRecordPdf(new Uint8Array(await file.data.arrayBuffer()), record.size_bytes);
      const submitted = await admin.from("supplier_service_records").update({
        status: "submitted", submitted_at: new Date().toISOString(), content_sha256: contentSha256,
      }).eq("id", recordId).eq("consultant_id", actor.user.id).eq("status", "uploading").select("id").maybeSingle();
      if (submitted.error) throw submitted.error;
      if (!submitted.data) throw new PortalHttpError(409, "This service record changed. Reload before continuing.");
    } else if (record.scan_status === "failed") {
      const retry = await admin.from("supplier_service_records").update({ scan_status: "pending", scanned_at: null })
        .eq("id", recordId).eq("consultant_id", actor.user.id).eq("scan_status", "failed");
      if (retry.error) throw retry.error;
    }
    let scanWarning: string | undefined;
    try {
      // The existing scanner accepts the legacy submission envelope and echoes
      // its ID. The callback resolves this server-created UUID to our own table;
      // no compliance submission is created or modified by this adapter.
      await requestMalwareScan({ objectType: "compliance_submission", objectId: recordId, bucket: serviceRecordBucket, storagePath: record.storage_path });
    } catch {
      const failed = await admin.from("supplier_service_records").update({ scan_status: "failed", scanned_at: new Date().toISOString() })
        .eq("id", recordId).eq("scan_status", "pending");
      if (failed.error) throw failed.error;
      scanWarning = "Your PDF was received, but its security check could not finish. It remains private and unavailable to download. Retry the security check shortly.";
    }
    const result = await admin.from("supplier_service_records").select(serviceRecordSelection)
      .eq("id", recordId).eq("consultant_id", actor.user.id).single();
    if (result.error) throw result.error;
    return json(response, scanWarning ? 202 : 200, { record: toServiceRecord(result.data as ServiceRecordRow), ...(scanWarning ? { warning: scanWarning } : {}) });
  } catch (error) {
    return handleApiError(response, error);
  }
}
