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
      "signing_attempt_discard",
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
      .select("id, consultant_id, assignment_id, status")
      .eq("id", assignedDocumentId)
      .single();
    if (assignedError || !assigned)
      throw new PortalHttpError(404, "Signing record not found.");

    const { data: envelopes, error: envelopesError } = await admin
      .from("signature_envelopes")
      .select(
        "id, provider_status, pending_final_storage_path, pending_certificate_storage_path, created_at",
      )
      .eq("assigned_document_id", assignedDocumentId)
      .order("created_at", { ascending: false });
    if (envelopesError) throw envelopesError;
    const current = envelopes?.[0];
    if (!current || current.provider_status === "completed")
      throw new PortalHttpError(
        409,
        "There is no incomplete signing attempt to discard.",
      );

    const previous = envelopes?.find(
      (envelope) =>
        envelope.id !== current.id && envelope.provider_status === "completed",
    );
    const resetForRetry =
      !previous &&
      assigned.status === "awaiting_deepbridge" &&
      current.provider_status === "countersign_source_security_review_failed";
    if (assigned.status !== "superseded" && !previous && !resetForRetry)
      throw new PortalHttpError(
        409,
        "This is the only signed copy. Complete it or create a corrected copy instead.",
      );
    if (
      previous &&
      (!previous.pending_final_storage_path ||
        !previous.pending_certificate_storage_path)
    )
      throw new PortalHttpError(
        409,
        "The previous completed copy is incomplete and cannot be restored safely.",
      );

    const previousPaths = new Set(
      previous
        ? [
            previous.pending_final_storage_path,
            previous.pending_certificate_storage_path,
          ].filter((path): path is string => Boolean(path))
        : [],
    );
    const discardedPaths = [
      current.pending_final_storage_path,
      current.pending_certificate_storage_path,
    ].filter((path): path is string => {
      return typeof path === "string" && !previousPaths.has(path);
    });

    if (discardedPaths.length) {
      const { error: removeError } = await admin.storage
        .from("signed-documents")
        .remove(discardedPaths);
      if (removeError) throw removeError;
    }

    const now = new Date().toISOString();
    const { error: discardError } = await admin
      .from("signature_envelopes")
      .update({
        provider_status: resetForRetry ? "consultant_signed" : "discarded",
        pending_final_storage_path: null,
        pending_certificate_storage_path: null,
        final_scan_status: null,
        certificate_scan_status: null,
        updated_at: now,
      })
      .eq("id", current.id);
    if (discardError) throw discardError;

    if (previous) {
      const { error: restoreError } = await admin
        .from("assigned_documents")
        .update({
          status: "completed",
          final_storage_path: previous.pending_final_storage_path,
          certificate_storage_path: previous.pending_certificate_storage_path,
        })
        .eq("id", assignedDocumentId);
      if (restoreError) throw restoreError;
    }

    await admin.from("audit_events").insert({
      actor_id: actor.user.id,
      actor_label: actor.profile.full_name,
      action: "incomplete_signing_attempt_discarded",
      object_type: "signature_envelope",
      object_id: current.id,
      assignment_id: assigned.assignment_id,
      consultant_id: assigned.consultant_id,
      ...requestContext(request),
      metadata: {
        removed_storage_paths: discardedPaths,
        restored_envelope_id: previous?.id ?? null,
        retained_audit_record: true,
      },
    });

    return json(response, 200, {
      discarded: true,
      previousCopyRestored: Boolean(previous),
      resetForRetry,
    });
  } catch (error) {
    return handleApiError(response, error);
  }
}
