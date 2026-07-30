import { timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  getSupabaseAdmin,
  handleApiError,
  json,
  PortalHttpError,
  readJsonBody,
} from "../_lib/server.js";

function validSecret(request: IncomingMessage) {
  const expected = process.env.MALWARE_SCAN_CALLBACK_SECRET?.trim();
  const provided = request.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!expected || !provided) return false;
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  return (
    expectedBuffer.length === providedBuffer.length &&
    timingSafeEqual(expectedBuffer, providedBuffer)
  );
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
    if (!validSecret(request))
      throw new PortalHttpError(401, "Invalid scanner callback.");
    const body = await readJsonBody(request);
    const objectId =
      typeof body.objectId === "string"
        ? body.objectId
        : typeof body.submissionId === "string"
          ? body.submissionId
          : "";
    const objectType =
      body.objectType === "document_version"
        ? "document_version"
        : body.objectType === "signature_artifact"
          ? "signature_artifact"
          : "compliance_submission";
    const artifactKind =
      body.artifactKind === "certificate" ? "certificate" : "final";
    const status =
      body.status === "clean" ||
      body.status === "infected" ||
      body.status === "failed"
        ? body.status
        : null;
    if (!/^[0-9a-f-]{36}$/i.test(objectId) || !status)
      throw new PortalHttpError(400, "Invalid scan result.");

    const admin = getSupabaseAdmin();
    const now = new Date().toISOString();

    if (objectType === "signature_artifact") {
      const statusColumn =
        artifactKind === "certificate"
          ? "certificate_scan_status"
          : "final_scan_status";
      const { data: envelope, error: envelopeError } = await admin
        .from("signature_envelopes")
        .update({ [statusColumn]: status })
        .eq("id", objectId)
        .select(
          "id, assigned_document_id, provider, provider_status, pending_final_storage_path, pending_certificate_storage_path, final_scan_status, certificate_scan_status, assigned_documents!inner(consultant_id, assignment_id, document_versions!inner(documents!inner(slug)))",
        )
        .single();
      if (envelopeError || !envelope)
        throw new PortalHttpError(404, "Signing artifact record not found.");

      const finalStatus =
        artifactKind === "final" ? status : envelope.final_scan_status;
      const certificateStatus =
        artifactKind === "certificate"
          ? status
          : envelope.certificate_scan_status;
      const assigned = Array.isArray(envelope.assigned_documents)
        ? envelope.assigned_documents[0]
        : envelope.assigned_documents;

      if (
        envelope.provider_status === "countersign_source_security_review" ||
        envelope.provider_status ===
          "countersign_reissue_source_security_review"
      ) {
        const isReissue =
          envelope.provider_status ===
          "countersign_reissue_source_security_review";
        const nextProviderStatus =
          status === "clean"
            ? "consultant_signed"
            : isReissue
              ? "countersign_reissue_source_security_review_failed"
              : "countersign_source_security_review_failed";
        const { error: sourceStatusError } = await admin
          .from("signature_envelopes")
          .update({ provider_status: nextProviderStatus })
          .eq("id", envelope.id);
        if (sourceStatusError) throw sourceStatusError;
        if (isReissue && status !== "clean") {
          const { error: restoreError } = await admin
            .from("assigned_documents")
            .update({ status: "completed" })
            .eq("id", envelope.assigned_document_id);
          if (restoreError) throw restoreError;
        }

        await admin.from("audit_events").insert({
          actor_label: "Malware scanning service",
          action:
            status === "clean"
              ? "countersign_source_scan_passed"
              : "countersign_source_scan_not_cleared",
          object_type: "signature_envelope",
          object_id: envelope.id,
          assignment_id: assigned?.assignment_id,
          consultant_id: assigned?.consultant_id,
          metadata: {
            status,
            artifact_kind: artifactKind,
            purpose: "deepbridge_countersignature_source",
            reissue: isReissue,
          },
        });
        return json(response, 200, { received: true });
      }

      if (
        envelope.provider === "manual_upload" &&
        envelope.provider_status === "consultant_upload_security_review"
      ) {
        if (status === "clean" && envelope.pending_final_storage_path) {
          const [envelopeUpdate, assignedUpdate] = await Promise.all([
            admin
              .from("signature_envelopes")
              .update({
                provider_status: "consultant_signed",
                consultant_signed_at: now,
              })
              .eq("id", envelope.id),
            admin
              .from("assigned_documents")
              .update({ status: "awaiting_deepbridge" })
              .eq("id", envelope.assigned_document_id),
          ]);
          if (envelopeUpdate.error) throw envelopeUpdate.error;
          if (assignedUpdate.error) throw assignedUpdate.error;
        } else if (status !== "clean") {
          const { error: envelopeStatusError } = await admin
            .from("signature_envelopes")
            .update({ provider_status: "security_review_failed" })
            .eq("id", envelope.id);
          if (envelopeStatusError) throw envelopeStatusError;
        }

        await admin.from("audit_events").insert({
          actor_label: "Malware scanning service",
          action:
            status === "clean"
              ? "manual_signed_pdf_scan_passed"
              : "manual_signed_pdf_scan_not_cleared",
          object_type: "signature_envelope",
          object_id: envelope.id,
          assignment_id: assigned?.assignment_id,
          consultant_id: assigned?.consultant_id,
          metadata: {
            status,
            artifact_kind: artifactKind,
            provider: "manual_upload",
          },
        });
        return json(response, 200, { received: true });
      }

      if (
        finalStatus === "clean" &&
        certificateStatus === "clean" &&
        envelope.pending_final_storage_path &&
        envelope.pending_certificate_storage_path
      ) {
        const version = Array.isArray(assigned?.document_versions)
          ? assigned.document_versions[0]
          : assigned?.document_versions;
        const document = Array.isArray(version?.documents)
          ? version.documents[0]
          : version?.documents;
        const taskKey =
          document?.slug === "framework"
            ? "agreement"
            : document?.slug === "sow-planning-cluster-lead"
              ? "sow"
              : document?.slug === "charter"
                ? "charter"
                : null;
        const [envelopeUpdate, assignedUpdate] = await Promise.all([
          admin
            .from("signature_envelopes")
            .update({ provider_status: "completed", completed_at: now })
            .eq("id", envelope.id),
          admin
            .from("assigned_documents")
            .update({
              status: "completed",
              completed_at: now,
              final_storage_path: envelope.pending_final_storage_path,
              certificate_storage_path:
                envelope.pending_certificate_storage_path,
            })
            .eq("id", envelope.assigned_document_id),
        ]);
        if (envelopeUpdate.error) throw envelopeUpdate.error;
        if (assignedUpdate.error) throw assignedUpdate.error;
        if (taskKey && assigned?.consultant_id) {
          const { error: taskError } = await admin
            .from("onboarding_tasks")
            .update({ complete: true, completed_at: now })
            .eq("consultant_id", assigned.consultant_id)
            .eq("assignment_id", assigned.assignment_id)
            .eq("task_key", taskKey);
          if (taskError) throw taskError;
        }
      } else if (status !== "clean") {
        const { error: envelopeStatusError } = await admin
          .from("signature_envelopes")
          .update({ provider_status: "security_review_failed" })
          .eq("id", envelope.id);
        if (envelopeStatusError) throw envelopeStatusError;
      }

      await admin.from("audit_events").insert({
        actor_label: "Malware scanning service",
        action:
          status === "clean"
            ? "signed_artifact_scan_passed"
            : "signed_artifact_scan_not_cleared",
        object_type: "signature_envelope",
        object_id: envelope.id,
        assignment_id: assigned?.assignment_id,
        consultant_id: assigned?.consultant_id,
        metadata: { status, artifact_kind: artifactKind },
      });
      return json(response, 200, { received: true });
    }

    if (objectType === "document_version") {
      const { data: version, error: versionError } = await admin
        .from("document_versions")
        .update({
          malware_scan_status: status,
          malware_scanned_at: now,
          locked_at: status === "clean" ? now : null,
        })
        .eq("id", objectId)
        .select(
          "id, document_id, assignment_id, documents!inner(category, title)",
        )
        .single();
      if (versionError || !version)
        throw new PortalHttpError(404, "Document version not found.");

      if (status === "clean" && version.assignment_id) {
        const { data: memberships, error: membershipError } = await admin
          .from("assignment_consultants")
          .select("consultants!inner(user_id)")
          .eq("assignment_id", version.assignment_id)
          .is("removed_at", null);
        if (membershipError) throw membershipError;
        const { data: relatedVersions, error: relatedError } = await admin
          .from("document_versions")
          .select("id")
          .eq("document_id", version.document_id)
          .eq("assignment_id", version.assignment_id)
          .neq("id", version.id);
        if (relatedError) throw relatedError;
        const previousVersionIds = (relatedVersions ?? []).map((item) => item.id);
        const initialStatus = "not_reviewed";

        for (const membership of memberships ?? []) {
          const consultant = Array.isArray(membership.consultants)
            ? membership.consultants[0]
            : membership.consultants;
          if (!consultant?.user_id) continue;
          if (previousVersionIds.length) {
            const { error: supersedeError } = await admin
              .from("assigned_documents")
              .update({
                status: "superseded",
                superseded_at: now,
              })
              .eq("consultant_id", consultant.user_id)
              .eq("assignment_id", version.assignment_id)
              .in("document_version_id", previousVersionIds)
              .neq("status", "completed");
            if (supersedeError) throw supersedeError;
          }
          const { error: assignError } = await admin
            .from("assigned_documents")
            .upsert(
              {
                consultant_id: consultant.user_id,
                assignment_id: version.assignment_id,
                document_version_id: version.id,
                status: initialStatus,
              },
              {
                onConflict:
                  "consultant_id,assignment_id,document_version_id",
                ignoreDuplicates: true,
              },
            );
          if (assignError) throw assignError;
        }
      }

      await admin.from("audit_events").insert({
        actor_label: "Malware scanning service",
        action:
          status === "clean"
            ? "document_version_published"
            : "document_scan_not_cleared",
        object_type: "document_version",
        object_id: version.id,
        assignment_id: version.assignment_id,
        metadata: { status },
      });
      return json(response, 200, { received: true });
    }

    const { data: submission, error: submissionError } = await admin
      .from("compliance_submissions")
      .update({
        malware_scan_status: status,
        malware_scanned_at: now,
        status: status === "clean" ? "under_review" : "rejected",
        rejection_reason:
          status === "infected"
            ? "The upload did not pass the security scan. Please contact DeepBridge."
            : status === "failed"
              ? "The security scan could not complete. Please upload the file again."
              : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", objectId)
      .select("id, consultant_id")
      .single();
    if (submissionError || !submission)
      throw new PortalHttpError(404, "Submission not found.");

    await admin.from("audit_events").insert({
      actor_label: "Malware scanning service",
      action:
        status === "clean" ? "file_scan_passed" : "file_scan_not_cleared",
      object_type: "compliance_submission",
      object_id: submission.id,
      consultant_id: submission.consultant_id,
      metadata: { status },
    });

    return json(response, 200, { received: true });
  } catch (error) {
    return handleApiError(response, error);
  }
}
