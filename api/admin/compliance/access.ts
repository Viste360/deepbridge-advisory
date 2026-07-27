import type { IncomingMessage, ServerResponse } from "node:http";
import {
  enforceRateLimit,
  getSupabaseAdmin,
  handleApiError,
  json,
  PortalHttpError,
  readJsonBody,
  requestContext,
  requirePortalUser,
} from "../../_lib/server.js";

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
    await enforceRateLimit(
      request,
      actor.user.id,
      "admin_compliance_access",
      60,
      600,
    );
    const body = await readJsonBody(request);
    const submissionId =
      typeof body.submissionId === "string" ? body.submissionId : "";
    if (!/^[0-9a-f-]{36}$/i.test(submissionId))
      throw new PortalHttpError(400, "A valid compliance submission is required.");

    const admin = getSupabaseAdmin();
    const { data: submission, error } = await admin
      .from("compliance_submissions")
      .select(
        "id, consultant_id, storage_path, original_filename, malware_scan_status",
      )
      .eq("id", submissionId)
      .is("superseded_at", null)
      .single();
    if (error || !submission)
      throw new PortalHttpError(404, "Compliance submission not found.");
    if (submission.malware_scan_status !== "clean")
      throw new PortalHttpError(
        409,
        "The security scan must pass before this file can be opened.",
      );

    const { data: signed, error: signedUrlError } = await admin.storage
      .from("consultant-compliance")
      .createSignedUrl(submission.storage_path, 300, { download: false });
    if (signedUrlError) throw signedUrlError;

    await admin.from("audit_events").insert({
      actor_id: actor.user.id,
      actor_label: actor.profile.full_name,
      action: "file_viewed",
      object_type: "compliance_submission",
      object_id: submission.id,
      consultant_id: submission.consultant_id,
      ...requestContext(request),
      metadata: { filename: submission.original_filename },
    });

    return json(response, 200, { url: signed.signedUrl });
  } catch (error) {
    return handleApiError(response, error);
  }
}
