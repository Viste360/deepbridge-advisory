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
      "manual_signature_download",
      30,
      600,
    );
    const body = await readJsonBody(request);
    const assignedDocumentId =
      typeof body.assignedDocumentId === "string"
        ? body.assignedDocumentId
        : "";
    if (!/^[0-9a-f-]{36}$/i.test(assignedDocumentId))
      throw new PortalHttpError(400, "A valid assigned document is required.");

    const admin = getSupabaseAdmin();
    const { data: assigned, error: assignedError } = await admin
      .from("assigned_documents")
      .select("id, consultant_id, assignment_id, status")
      .eq("id", assignedDocumentId)
      .single();
    if (assignedError || !assigned)
      throw new PortalHttpError(404, "Assigned document not found.");
    if (assigned.status !== "awaiting_deepbridge")
      throw new PortalHttpError(
        409,
        "The consultant-signed PDF is not ready for review.",
      );

    const { data: envelope, error: envelopeError } = await admin
      .from("signature_envelopes")
      .select(
        "id, pending_final_storage_path, final_scan_status, provider_status",
      )
      .eq("assigned_document_id", assignedDocumentId)
      .eq("provider", "manual_upload")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (
      envelopeError ||
      !envelope ||
      envelope.provider_status !== "consultant_signed" ||
      envelope.final_scan_status !== "clean" ||
      !envelope.pending_final_storage_path
    )
      throw new PortalHttpError(
        409,
        "The consultant-signed PDF has not passed security review.",
      );

    const { data: signed, error: signedUrlError } = await admin.storage
      .from("signed-documents")
      .createSignedUrl(envelope.pending_final_storage_path, 300, {
        download: true,
      });
    if (signedUrlError) throw signedUrlError;

    await admin.from("audit_events").insert({
      actor_id: actor.user.id,
      actor_label: actor.profile.full_name,
      action: "manual_signed_pdf_downloaded",
      object_type: "signature_envelope",
      object_id: envelope.id,
      assignment_id: assigned.assignment_id,
      consultant_id: assigned.consultant_id,
      ...requestContext(request),
      metadata: { provider: "manual_upload" },
    });

    return json(response, 200, { url: signed.signedUrl });
  } catch (error) {
    return handleApiError(response, error);
  }
}
