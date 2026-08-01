import { createHash } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { PDFDocument } from "pdf-lib";
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
import {
  archivePdfToGoogleDrive,
  googleDriveArchiveConfigured,
} from "../../_lib/googleDrive.js";

const activePdfFeatures =
  /\/(?:JavaScript|JS|Launch|EmbeddedFile|RichMedia|Sound|Movie|GoToE|SubmitForm|ImportData|AA)\b/;

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
    await enforceRateLimit(request, actor.user.id, "contract_pdf_verification", 20, 3_600);
    const body = await readJsonBody(request);
    const versionId = typeof body.versionId === "string" ? body.versionId : "";
    if (!/^[0-9a-f-]{36}$/i.test(versionId))
      throw new PortalHttpError(400, "A valid contract version is required.");

    const admin = getSupabaseAdmin();
    const { data: version, error } = await admin
      .from("contract_versions")
      .select("id, contract_id, version_label, source_storage_path, content_sha256, malware_scan_status, locked_at, contracts!inner(reference, title, requires_signature, assignment:assignments(programme, title), counterparty:organisations!contracts_counterparty_organisation_id_fkey(legal_name, trading_name))")
      .eq("id", versionId)
      .single();
    if (error || !version)
      throw new PortalHttpError(404, "Contract version not found.");
    if (version.malware_scan_status === "clean" && version.locked_at)
      return json(response, 200, { status: "clean" });
    if (version.malware_scan_status === "infected")
      throw new PortalHttpError(409, "This file was identified as unsafe and must be replaced.");

    const { data: sourceBlob, error: sourceError } = await admin.storage
      .from("contract-documents")
      .download(version.source_storage_path);
    if (sourceError || !sourceBlob)
      throw new PortalHttpError(409, "The quarantined PDF is not available.");
    const bytes = new Uint8Array(await sourceBlob.arrayBuffer());
    if (
      bytes.length < 5 ||
      bytes.length > 25 * 1024 * 1024 ||
      Buffer.from(bytes.subarray(0, 5)).toString("ascii") !== "%PDF-"
    )
      throw new PortalHttpError(409, "The upload is not a valid PDF.");
    const actualHash = createHash("sha256").update(bytes).digest("hex");
    if (actualHash !== version.content_sha256)
      throw new PortalHttpError(409, "The PDF no longer matches its upload checksum.");
    if (activePdfFeatures.test(Buffer.from(bytes).toString("latin1")))
      throw new PortalHttpError(
        409,
        "This PDF contains active or embedded content. Export a flattened PDF and upload it again.",
      );
    let pdf: PDFDocument;
    try {
      pdf = await PDFDocument.load(bytes, {
        ignoreEncryption: false,
        updateMetadata: false,
      });
      if (pdf.getPageCount() < 1 || pdf.getPageCount() > 2_000)
        throw new Error("Invalid page count");
    } catch {
      throw new PortalHttpError(
        409,
        "The PDF could not be opened safely. Export an unencrypted PDF and upload it again.",
      );
    }
    for (const [, object] of pdf.context.enumerateIndirectObjects()) {
      if (activePdfFeatures.test(object.toString()))
        throw new PortalHttpError(
          409,
          "This PDF contains active or embedded content. Export a flattened PDF and upload it again.",
        );
    }

    const contract = Array.isArray(version.contracts)
      ? version.contracts[0]
      : version.contracts;
    const assignment = Array.isArray(contract?.assignment)
      ? contract.assignment[0]
      : contract?.assignment;
    const counterparty = Array.isArray(contract?.counterparty)
      ? contract.counterparty[0]
      : contract?.counterparty;
    const folderPath = [
      assignment
        ? `${assignment.programme || "Project"} - ${assignment.title || "Contracts"}`
        : "Contract Library",
      counterparty?.trading_name || counterparty?.legal_name || "Unfiled Counterparty",
      `${contract?.reference || "CONTRACT"} - ${contract?.title || "Contract"}`,
    ];
    const now = new Date().toISOString();
    let driveFileId: string | null = null;
    let driveFailed = false;
    if (googleDriveArchiveConfigured()) {
      try {
        driveFileId = await archivePdfToGoogleDrive({
          filename: `${contract?.reference || "CONTRACT"}-v${version.version_label}.pdf`,
          data: Buffer.from(bytes),
          description: contract?.title || "DeepBridge contract",
          appProperties: {
            deepbridgeContractId: version.contract_id,
            deepbridgeContractVersionId: version.id,
            artifactKind: "source",
          },
          folderPath,
        });
      } catch {
        driveFailed = true;
      }
    }
    const [versionUpdate, contractUpdate] = await Promise.all([
      admin
        .from("contract_versions")
        .update({
          malware_scan_status: "clean",
          malware_scanned_at: now,
          locked_at: now,
          drive_source_file_id: driveFileId,
          drive_sync_status: googleDriveArchiveConfigured()
            ? driveFileId
              ? "synced"
              : "failed"
            : "not_configured",
          drive_synced_at: driveFileId ? now : null,
          updated_at: now,
        })
        .eq("id", version.id),
      admin
        .from("contracts")
        .update({
          status: contract?.requires_signature ? "ready_to_sign" : "completed",
          updated_at: now,
        })
        .eq("id", version.contract_id),
    ]);
    if (versionUpdate.error) throw versionUpdate.error;
    if (contractUpdate.error) throw contractUpdate.error;
    await admin.from("audit_events").insert({
      actor_id: actor.user.id,
      actor_label: actor.profile.full_name,
      action: "contract_pdf_verified_by_administrator",
      object_type: "contract_version",
      object_id: version.id,
      ...requestContext(request),
      metadata: {
        contract_id: version.contract_id,
        verification: "pdf_structure_active_content_and_sha256",
        source_content_sha256: actualHash,
        external_scanner_status: version.malware_scan_status,
        drive_archived: Boolean(driveFileId),
        drive_failed: driveFailed,
      },
    });
    return json(response, 200, {
      status: "clean",
      readyToSign: Boolean(contract?.requires_signature),
    });
  } catch (error) {
    return handleApiError(response, error);
  }
}
