import { createHash } from "node:crypto";

import { PortalHttpError } from "./server.js";

const MAXIMUM_PDF_BYTES = 25 * 1024 * 1024;

export function verifyPdfArtifact(
  bytes: Uint8Array,
  expectedSha256: string,
  label: string,
) {
  if (
    bytes.length < 5 ||
    bytes.length > MAXIMUM_PDF_BYTES ||
    Buffer.from(bytes.subarray(0, 5)).toString("ascii") !== "%PDF-"
  ) {
    throw new PortalHttpError(409, `${label} is not a valid PDF.`);
  }
  const actualSha256 = createHash("sha256").update(bytes).digest("hex");
  if (!expectedSha256 || actualSha256 !== expectedSha256) {
    throw new PortalHttpError(
      409,
      `${label} does not match the signed record. Create a corrected copy instead.`,
    );
  }
  return actualSha256;
}

export async function downloadAndVerifyPdfArtifact(
  admin: ReturnType<typeof import("./server.js")["getSupabaseAdmin"]>,
  storagePath: string,
  expectedSha256: string,
  label: string,
) {
  const { data, error } = await admin.storage
    .from("signed-documents")
    .download(storagePath);
  if (error || !data)
    throw new PortalHttpError(409, `${label} is not available.`);
  const bytes = new Uint8Array(await data.arrayBuffer());
  return verifyPdfArtifact(bytes, expectedSha256, label);
}

export async function completeSigningRecord(input: {
  admin: ReturnType<typeof import("./server.js")["getSupabaseAdmin"]>;
  envelopeId: string;
  assignedDocumentId: string;
  assignmentId: string | null;
  consultantId: string;
  documentSlug?: string;
  finalStoragePath: string;
  certificateStoragePath: string;
  completedAt: string;
}) {
  const { admin } = input;
  const [envelopeUpdate, assignedUpdate] = await Promise.all([
    admin
      .from("signature_envelopes")
      .update({
        provider_status: "completed",
        final_scan_status: "clean",
        certificate_scan_status: "clean",
        completed_at: input.completedAt,
        updated_at: input.completedAt,
      })
      .eq("id", input.envelopeId),
    admin
      .from("assigned_documents")
      .update({
        status: "completed",
        completed_at: input.completedAt,
        final_storage_path: input.finalStoragePath,
        certificate_storage_path: input.certificateStoragePath,
      })
      .eq("id", input.assignedDocumentId),
  ]);
  if (envelopeUpdate.error) throw envelopeUpdate.error;
  if (assignedUpdate.error) throw assignedUpdate.error;

  const { error: supersedeError } = await admin
    .from("signature_envelopes")
    .update({
      provider_status: "superseded",
      updated_at: input.completedAt,
    })
    .eq("assigned_document_id", input.assignedDocumentId)
    .eq("provider_status", "completed")
    .neq("id", input.envelopeId);
  if (supersedeError) throw supersedeError;

  const taskKey =
    input.documentSlug === "framework"
      ? "agreement"
      : input.documentSlug === "sow-planning-cluster-lead"
        ? "sow"
        : input.documentSlug === "charter"
          ? "charter"
          : null;
  if (taskKey && input.assignmentId) {
    const { error: taskError } = await admin
      .from("onboarding_tasks")
      .update({ complete: true, completed_at: input.completedAt })
      .eq("consultant_id", input.consultantId)
      .eq("assignment_id", input.assignmentId)
      .eq("task_key", taskKey);
    if (taskError) throw taskError;
  }
}
