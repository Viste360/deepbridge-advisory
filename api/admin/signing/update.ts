import { randomUUID } from "node:crypto";
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
} from "../../_lib/server";

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
    await enforceRateLimit(request, actor.user.id, "signing_admin_update", 30, 3600);
    const body = await readJsonBody(request);
    const assignedDocumentId =
      typeof body.assignedDocumentId === "string"
        ? body.assignedDocumentId
        : "";
    const action =
      body.action === "request_sent" || body.action === "consultant_signed"
        ? body.action
        : null;
    if (!/^[0-9a-f-]{36}$/i.test(assignedDocumentId) || !action)
      throw new PortalHttpError(400, "Invalid signing update.");

    const admin = getSupabaseAdmin();
    const { data: assigned, error: assignedError } = await admin
      .from("assigned_documents")
      .select(
        "id, consultant_id, assignment_id, status, document_versions!inner(malware_scan_status, locked_at, documents!inner(category))",
      )
      .eq("id", assignedDocumentId)
      .single();
    if (assignedError || !assigned)
      throw new PortalHttpError(404, "Assigned document not found.");
    const version = Array.isArray(assigned.document_versions)
      ? assigned.document_versions[0]
      : assigned.document_versions;
    const document = Array.isArray(version?.documents)
      ? version.documents[0]
      : version?.documents;
    if (document?.category !== "signature")
      throw new PortalHttpError(400, "This document does not require signing.");
    if (version?.malware_scan_status !== "clean" || !version?.locked_at)
      throw new PortalHttpError(
        409,
        "Publish and security-check the approved PDF before sending it.",
      );
    if (assigned.status === "completed" || assigned.status === "superseded")
      throw new PortalHttpError(409, "This document can no longer be updated.");
    if (action === "request_sent" && assigned.status !== "not_reviewed")
      throw new PortalHttpError(
        409,
        "A request has already been recorded for this document.",
      );
    if (action === "consultant_signed" && assigned.status !== "ready_to_sign")
      throw new PortalHttpError(
        409,
        "The consultant signature can only follow a recorded request.",
      );

    const now = new Date().toISOString();
    let envelopeId = "";
    if (action === "request_sent") {
      const externalId = `google-workspace:${assignedDocumentId}:${randomUUID()}`;
      const { data: envelope, error: envelopeError } = await admin
        .from("signature_envelopes")
        .insert({
          assigned_document_id: assignedDocumentId,
          provider: "google_workspace",
          external_envelope_id: externalId,
          provider_status: "sent",
          consultant_recipient_id: assigned.consultant_id,
          deepbridge_recipient_id: actor.profile.email,
          created_by: actor.user.id,
          sent_at: now,
        })
        .select("id")
        .single();
      if (envelopeError) throw envelopeError;
      envelopeId = envelope.id;
      const { error: updateError } = await admin
        .from("assigned_documents")
        .update({ status: "ready_to_sign" })
        .eq("id", assignedDocumentId);
      if (updateError) throw updateError;
    } else {
      const { data: envelope, error: envelopeError } = await admin
        .from("signature_envelopes")
        .select("id")
        .eq("assigned_document_id", assignedDocumentId)
        .eq("provider", "google_workspace")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (envelopeError || !envelope)
        throw new PortalHttpError(
          409,
          "Record the Google signature request before recording a signature.",
        );
      envelopeId = envelope.id;
      const [envelopeUpdate, documentUpdate] = await Promise.all([
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
          .eq("id", assignedDocumentId),
      ]);
      if (envelopeUpdate.error) throw envelopeUpdate.error;
      if (documentUpdate.error) throw documentUpdate.error;
    }

    await admin.from("audit_events").insert({
      actor_id: actor.user.id,
      actor_label: actor.profile.full_name,
      action:
        action === "request_sent"
          ? "google_signature_request_recorded"
          : "consultant_signature_recorded",
      object_type: "signature_envelope",
      object_id: envelopeId,
      assignment_id: assigned.assignment_id,
      consultant_id: assigned.consultant_id,
      ...requestContext(request),
      metadata: { provider: "google_workspace" },
    });

    return json(response, 200, { updated: true });
  } catch (error) {
    return handleApiError(response, error);
  }
}
