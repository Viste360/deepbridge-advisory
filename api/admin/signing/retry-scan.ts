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
import {
  completeSigningRecord,
  downloadAndVerifyPdfArtifact,
} from "../../_lib/signing-completion.js";

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
      "signing_security_scan_retry",
      20,
      3_600,
    );
    const body = await readJsonBody(request);
    const assignedDocumentId = cleanText(body.assignedDocumentId, 36);
    if (!/^[0-9a-f-]{36}$/i.test(assignedDocumentId))
      throw new PortalHttpError(400, "A valid signing record is required.");

    const admin = getSupabaseAdmin();
    const { data: assigned, error: assignedError } = await admin
      .from("assigned_documents")
      .select(
        "id, consultant_id, assignment_id, status, document_versions!inner(documents!inner(slug))",
      )
      .eq("id", assignedDocumentId)
      .single();
    if (assignedError || !assigned)
      throw new PortalHttpError(404, "Signing record not found.");
    if (assigned.status !== "awaiting_deepbridge")
      throw new PortalHttpError(
        409,
        assigned.status === "completed"
          ? "The signed agreement is already complete."
          : "This agreement is not awaiting its final security check.",
      );

    const { data: envelope, error: envelopeError } = await admin
      .from("signature_envelopes")
      .select(
        "id, provider_status, pending_final_storage_path, pending_certificate_storage_path, final_content_sha256, certificate_content_sha256, final_scan_status, certificate_scan_status",
      )
      .eq("assigned_document_id", assignedDocumentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (envelopeError || !envelope)
      throw new PortalHttpError(404, "Security-check record not found.");
    if (
      ![
        "security_review",
        "security_review_retry_needed",
        "security_review_failed",
      ].includes(envelope.provider_status)
    ) {
      throw new PortalHttpError(
        409,
        "This agreement is not awaiting its final security check.",
      );
    }
    if (
      !envelope.pending_final_storage_path ||
      !envelope.pending_certificate_storage_path
    ) {
      throw new PortalHttpError(
        409,
        "The final signed files are incomplete. Create the countersignature again.",
      );
    }
    if (
      envelope.final_scan_status === "infected" ||
      envelope.certificate_scan_status === "infected"
    ) {
      throw new PortalHttpError(
        409,
        "A file did not pass the security check and cannot be retried. Replace the signed file.",
      );
    }

    const { data: portalGeneratedEvent, error: portalGeneratedError } =
      await admin
        .from("audit_events")
        .select("id")
        .eq("object_type", "signature_envelope")
        .eq("object_id", envelope.id)
        .eq("action", "portal_countersignature_applied")
        .limit(1)
        .maybeSingle();
    if (portalGeneratedError) throw portalGeneratedError;

    if (portalGeneratedEvent) {
      await Promise.all([
        downloadAndVerifyPdfArtifact(
          admin,
          envelope.pending_final_storage_path,
          envelope.final_content_sha256 ?? "",
          "The signed PDF",
        ),
        downloadAndVerifyPdfArtifact(
          admin,
          envelope.pending_certificate_storage_path,
          envelope.certificate_content_sha256 ?? "",
          "The audit certificate",
        ),
      ]);
      const version = Array.isArray(assigned.document_versions)
        ? assigned.document_versions[0]
        : assigned.document_versions;
      const document = Array.isArray(version?.documents)
        ? version.documents[0]
        : version?.documents;
      const completedAt = new Date().toISOString();
      await completeSigningRecord({
        admin,
        envelopeId: envelope.id,
        assignedDocumentId,
        assignmentId: assigned.assignment_id,
        consultantId: assigned.consultant_id,
        documentSlug: document?.slug,
        finalStoragePath: envelope.pending_final_storage_path,
        certificateStoragePath: envelope.pending_certificate_storage_path,
        completedAt,
      });
      await admin.from("audit_events").insert({
        actor_id: actor.user.id,
        actor_label: actor.profile.full_name,
        action: "portal_generated_signing_recovered",
        object_type: "signature_envelope",
        object_id: envelope.id,
        assignment_id: assigned.assignment_id,
        consultant_id: assigned.consultant_id,
        ...requestContext(request),
        metadata: {
          verification: "stored_pdf_and_sha256",
          previous_scanner_status: {
            final: envelope.final_scan_status,
            certificate: envelope.certificate_scan_status,
          },
        },
      });
      return json(response, 200, {
        envelopeId: envelope.id,
        status: "completed",
        downloadAvailable: true,
      });
    }

    const artifacts: Array<{
      kind: "final" | "certificate";
      path: string;
    }> = [];
    if (envelope.final_scan_status !== "clean")
      artifacts.push({
        kind: "final",
        path: envelope.pending_final_storage_path,
      });
    if (envelope.certificate_scan_status !== "clean")
      artifacts.push({
        kind: "certificate",
        path: envelope.pending_certificate_storage_path,
      });
    // If both results arrived but the completion callback did not finish,
    // rescan one artifact so the normal completion path runs again.
    if (!artifacts.length)
      artifacts.push({
        kind: "final",
        path: envelope.pending_final_storage_path,
      });

    const now = new Date().toISOString();
    const pendingStatuses: Record<string, string> = {
      provider_status: "security_review",
      updated_at: now,
    };
    for (const artifact of artifacts) {
      pendingStatuses[
        artifact.kind === "certificate"
          ? "certificate_scan_status"
          : "final_scan_status"
      ] = "pending";
    }
    const { error: resetError } = await admin
      .from("signature_envelopes")
      .update(pendingStatuses)
      .eq("id", envelope.id);
    if (resetError) throw resetError;

    await admin.from("audit_events").insert({
      actor_id: actor.user.id,
      actor_label: actor.profile.full_name,
      action: "signing_security_scan_retried",
      object_type: "signature_envelope",
      object_id: envelope.id,
      assignment_id: assigned.assignment_id,
      consultant_id: assigned.consultant_id,
      ...requestContext(request),
      metadata: { artifact_kinds: artifacts.map((artifact) => artifact.kind) },
    });

    try {
      await Promise.all(
        artifacts.map((artifact) =>
          requestMalwareScan({
            objectType: "signature_artifact",
            objectId: envelope.id,
            artifactKind: artifact.kind,
            bucket: "signed-documents",
            storagePath: artifact.path,
          }),
        ),
      );
    } catch (scanError) {
      await admin
        .from("signature_envelopes")
        .update({
          provider_status: "security_review_retry_needed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", envelope.id);
      throw scanError;
    }

    return json(response, 202, {
      envelopeId: envelope.id,
      status: "pending_security_scan",
    });
  } catch (error) {
    return handleApiError(response, error);
  }
}
