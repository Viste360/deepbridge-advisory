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
    const actor = await requirePortalUser(request, response, "admin");
    const body = await readJsonBody(request);
    const assignedDocumentId = cleanText(body.assignedDocumentId, 36);
    const finalPath = cleanText(body.finalPath, 500);
    const certificatePath = cleanText(body.certificatePath, 500);
    const finalSha256 = cleanText(body.finalSha256, 64).toLowerCase();
    const certificateSha256 = cleanText(
      body.certificateSha256,
      64,
    ).toLowerCase();
    if (
      !/^[0-9a-f-]{36}$/i.test(assignedDocumentId) ||
      !/^[0-9a-f]{64}$/.test(finalSha256) ||
      !/^[0-9a-f]{64}$/.test(certificateSha256) ||
      finalPath.includes("..") ||
      certificatePath.includes("..")
    ) {
      throw new PortalHttpError(400, "Invalid completed-pack metadata.");
    }

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
        "Record the consultant signature before uploading the completed pack.",
      );

    const { data: envelope, error: envelopeError } = await admin
      .from("signature_envelopes")
      .select("id")
      .eq("assigned_document_id", assignedDocumentId)
      .eq("provider", "google_workspace")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (envelopeError || !envelope)
      throw new PortalHttpError(409, "Google signature record not found.");

    const expectedPrefix = `${assigned.consultant_id}/${assignedDocumentId}/${envelope.id}/`;
    if (
      !finalPath.startsWith(expectedPrefix) ||
      !certificatePath.startsWith(expectedPrefix)
    ) {
      throw new PortalHttpError(400, "The uploaded files are outside this record.");
    }

    for (const path of [finalPath, certificatePath]) {
      const parts = path.split("/");
      const filename = parts.pop() ?? "";
      const { data: stored, error } = await admin.storage
        .from("signed-documents")
        .list(parts.join("/"), { search: filename, limit: 1 });
      if (error) throw error;
      if (!stored?.some((item) => item.name === filename))
        throw new PortalHttpError(
          409,
          "One of the uploaded PDFs could not be verified.",
        );
    }

    const { error: updateError } = await admin
      .from("signature_envelopes")
      .update({
        provider_status: "security_review",
        pending_final_storage_path: finalPath,
        pending_certificate_storage_path: certificatePath,
        final_content_sha256: finalSha256,
        certificate_content_sha256: certificateSha256,
        final_scan_status: "pending",
        certificate_scan_status: "pending",
      })
      .eq("id", envelope.id);
    if (updateError) throw updateError;

    await admin.from("audit_events").insert({
      actor_id: actor.user.id,
      actor_label: actor.profile.full_name,
      action: "signed_pack_uploaded",
      object_type: "signature_envelope",
      object_id: envelope.id,
      assignment_id: assigned.assignment_id,
      consultant_id: assigned.consultant_id,
      ...requestContext(request),
      metadata: { provider: "google_workspace", scan_status: "pending" },
    });

    await Promise.all([
      requestMalwareScan({
        objectType: "signature_artifact",
        objectId: envelope.id,
        artifactKind: "final",
        bucket: "signed-documents",
        storagePath: finalPath,
      }),
      requestMalwareScan({
        objectType: "signature_artifact",
        objectId: envelope.id,
        artifactKind: "certificate",
        bucket: "signed-documents",
        storagePath: certificatePath,
      }),
    ]);

    return json(response, 202, {
      envelopeId: envelope.id,
      status: "pending_security_scan",
    });
  } catch (error) {
    return handleApiError(response, error);
  }
}
