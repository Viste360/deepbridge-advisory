import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
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
    const actor = await requirePortalUser(request, response);
    if (actor.profile.role !== "consultant")
      throw new PortalHttpError(403, "Consultant access is required.");
    const body = await readJsonBody(request);
    const assignedDocumentId = cleanText(body.assignedDocumentId, 36);
    const storagePath = cleanText(body.storagePath, 500);
    const originalFilename = cleanText(body.originalFilename, 255);
    const contentSha256 = cleanText(body.contentSha256, 64).toLowerCase();
    const sizeBytes =
      typeof body.sizeBytes === "number" ? Math.round(body.sizeBytes) : 0;
    if (
      !/^[0-9a-f-]{36}$/i.test(assignedDocumentId) ||
      !/^[0-9a-f]{64}$/.test(contentSha256) ||
      !originalFilename.toLowerCase().endsWith(".pdf") ||
      body.mimeType !== "application/pdf" ||
      sizeBytes <= 0 ||
      sizeBytes > 25 * 1024 * 1024 ||
      storagePath.includes("..")
    ) {
      throw new PortalHttpError(400, "Invalid signed-PDF metadata.");
    }

    const admin = getSupabaseAdmin();
    const { data: assigned, error: assignedError } = await admin
      .from("assigned_documents")
      .select(
        "id, consultant_id, assignment_id, status, document_versions!inner(malware_scan_status, locked_at, documents!inner(category))",
      )
      .eq("id", assignedDocumentId)
      .eq("consultant_id", actor.user.id)
      .single();
    if (assignedError || !assigned)
      throw new PortalHttpError(404, "Assigned document not found.");
    const version = Array.isArray(assigned.document_versions)
      ? assigned.document_versions[0]
      : assigned.document_versions;
    const document = Array.isArray(version?.documents)
      ? version.documents[0]
      : version?.documents;
    if (
      document?.category !== "signature" ||
      version?.malware_scan_status !== "clean" ||
      !version?.locked_at
    )
      throw new PortalHttpError(409, "The approved PDF is not ready for signing.");
    if (!["not_reviewed", "ready_to_sign"].includes(assigned.status))
      throw new PortalHttpError(
        409,
        "This document is not accepting another signed upload.",
      );

    const expectedPrefix = `${actor.user.id}/${assignedDocumentId}/manual-consultant/`;
    if (!storagePath.startsWith(expectedPrefix))
      throw new PortalHttpError(400, "The uploaded file is outside this record.");
    const parts = storagePath.split("/");
    const storedFilename = parts.pop() ?? "";
    const { data: stored, error: storageError } = await admin.storage
      .from("signed-documents")
      .list(parts.join("/"), { search: storedFilename, limit: 1 });
    if (storageError) throw storageError;
    if (!stored?.some((item) => item.name === storedFilename))
      throw new PortalHttpError(409, "The uploaded PDF could not be verified.");

    const { data: activeEnvelope, error: activeEnvelopeError } = await admin
      .from("signature_envelopes")
      .select("id")
      .eq("assigned_document_id", assignedDocumentId)
      .eq("provider", "manual_upload")
      .in("provider_status", [
        "consultant_upload_security_review",
        "consultant_signed",
        "security_review",
        "completed",
      ])
      .maybeSingle();
    if (activeEnvelopeError) throw activeEnvelopeError;
    if (activeEnvelope)
      throw new PortalHttpError(
        409,
        "A signed PDF is already being processed for this document.",
      );

    const { data: envelope, error: envelopeError } = await admin
      .from("signature_envelopes")
      .insert({
        assigned_document_id: assignedDocumentId,
        provider: "manual_upload",
        external_envelope_id: `manual-upload:${assignedDocumentId}:${randomUUID()}`,
        provider_status: "consultant_upload_security_review",
        consultant_recipient_id: actor.user.id,
        created_by: actor.user.id,
        pending_final_storage_path: storagePath,
        final_content_sha256: contentSha256,
        final_scan_status: "pending",
      })
      .select("id")
      .single();
    if (envelopeError || !envelope)
      throw envelopeError || new Error("Signed upload record creation failed.");

    await admin.from("audit_events").insert({
      actor_id: actor.user.id,
      actor_label: actor.profile.full_name,
      action: "manual_signed_pdf_uploaded",
      object_type: "signature_envelope",
      object_id: envelope.id,
      assignment_id: assigned.assignment_id,
      consultant_id: actor.user.id,
      ...requestContext(request),
      metadata: {
        provider: "manual_upload",
        original_filename: originalFilename,
        size_bytes: sizeBytes,
        scan_status: "pending",
      },
    });

    try {
      await requestMalwareScan({
        objectType: "signature_artifact",
        objectId: envelope.id,
        artifactKind: "final",
        bucket: "signed-documents",
        storagePath,
      });
    } catch (scanError) {
      await admin
        .from("signature_envelopes")
        .update({
          provider_status: "security_review_failed",
          final_scan_status: "failed",
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
