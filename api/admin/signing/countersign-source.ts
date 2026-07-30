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
import { requestMalwareScan } from "../../_lib/scanner.js";

function cleanText(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

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
      "countersign_source_upload",
      20,
      3_600,
    );
    const body = await readJsonBody(request);
    const assignedDocumentId = cleanText(body.assignedDocumentId, 36);
    const sourcePath = cleanText(body.sourcePath, 500);
    const sourceSha256 = cleanText(body.sourceSha256, 64).toLowerCase();
    const reissue = body.reissue === true;
    if (
      !/^[0-9a-f-]{36}$/i.test(assignedDocumentId) ||
      !/^[0-9a-f]{64}$/.test(sourceSha256) ||
      sourcePath.includes("..")
    ) {
      throw new PortalHttpError(400, "Invalid consultant-signed PDF metadata.");
    }

    const admin = getSupabaseAdmin();
    const { data: assigned, error: assignedError } = await admin
      .from("assigned_documents")
      .select("id, consultant_id, assignment_id, status")
      .eq("id", assignedDocumentId)
      .single();
    if (assignedError || !assigned)
      throw new PortalHttpError(404, "Assigned document not found.");
    if (
      assigned.status !== "awaiting_deepbridge" &&
      !(reissue && assigned.status === "completed")
    )
      throw new PortalHttpError(
        409,
        "The agreement is not ready for DeepBridge countersignature.",
      );

    const { data: envelope, error: envelopeError } = await admin
      .from("signature_envelopes")
      .select(
        "id, provider, provider_status, sent_at, consultant_signed_at, pending_final_storage_path, pending_certificate_storage_path, final_content_sha256, certificate_content_sha256",
      )
      .eq("assigned_document_id", assignedDocumentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    const expectedStatus = reissue ? "completed" : "consultant_signed";
    if (envelopeError || !envelope || envelope.provider_status !== expectedStatus) {
      throw new PortalHttpError(
        409,
        reissue
          ? "A completed countersignature record was not found."
          : "A verified consultant signature record was not found.",
      );
    }

    const expectedPrefix = reissue
      ? `${assigned.consultant_id}/${assignedDocumentId}/reissue-`
      : `${assigned.consultant_id}/${assignedDocumentId}/${envelope.id}/countersign_source-`;
    if (!sourcePath.startsWith(expectedPrefix))
      throw new PortalHttpError(400, "The uploaded PDF is outside this record.");

    const parts = sourcePath.split("/");
    const filename = parts.pop() ?? "";
    const { data: stored, error: storedError } = await admin.storage
      .from("signed-documents")
      .list(parts.join("/"), { search: filename, limit: 1 });
    if (storedError) throw storedError;
    if (!stored?.some((item) => item.name === filename))
      throw new PortalHttpError(
        409,
        "The consultant-signed PDF could not be verified.",
      );

    let envelopeId = envelope.id;
    if (reissue) {
      const { data: replacement, error: replacementError } = await admin
        .from("signature_envelopes")
        .insert({
          assigned_document_id: assignedDocumentId,
          provider: envelope.provider,
          provider_status: "countersign_reissue_source_security_review",
          consultant_recipient_id: assigned.consultant_id,
          deepbridge_recipient_id: actor.profile.email,
          created_by: actor.user.id,
          sent_at: envelope.sent_at,
          consultant_signed_at: envelope.consultant_signed_at,
          pending_final_storage_path: sourcePath,
          final_content_sha256: sourceSha256,
          final_scan_status: "pending",
        })
        .select("id")
        .single();
      if (replacementError || !replacement) throw replacementError;
      envelopeId = replacement.id;
      const { error: reopenError } = await admin
        .from("assigned_documents")
        .update({ status: "awaiting_deepbridge" })
        .eq("id", assignedDocumentId);
      if (reopenError) throw reopenError;
    } else {
      const { error: updateError } = await admin
        .from("signature_envelopes")
        .update({
          provider_status: "countersign_source_security_review",
          pending_final_storage_path: sourcePath,
          final_content_sha256: sourceSha256,
          final_scan_status: "pending",
        })
        .eq("id", envelope.id);
      if (updateError) throw updateError;
    }

    await admin.from("audit_events").insert({
      actor_id: actor.user.id,
      actor_label: actor.profile.full_name,
      action: reissue
        ? "countersignature_reissue_source_uploaded"
        : "countersign_source_uploaded",
      object_type: "signature_envelope",
      object_id: envelopeId,
      assignment_id: assigned.assignment_id,
      consultant_id: assigned.consultant_id,
      ...requestContext(request),
      metadata: {
        content_sha256: sourceSha256,
        scan_status: "pending",
        reissue,
        supersedes_envelope_id: reissue ? envelope.id : null,
        previous_final_storage_path: reissue
          ? envelope.pending_final_storage_path
          : null,
        previous_certificate_storage_path: reissue
          ? envelope.pending_certificate_storage_path
          : null,
        previous_final_content_sha256: reissue
          ? envelope.final_content_sha256
          : null,
        previous_certificate_content_sha256: reissue
          ? envelope.certificate_content_sha256
          : null,
      },
    });

    await requestMalwareScan({
      objectType: "signature_artifact",
      objectId: envelopeId,
      artifactKind: "final",
      bucket: "signed-documents",
      storagePath: sourcePath,
    });

    return json(response, 202, {
      envelopeId,
      status: "pending_security_scan",
      reissue,
    });
  } catch (error) {
    return handleApiError(response, error);
  }
}
