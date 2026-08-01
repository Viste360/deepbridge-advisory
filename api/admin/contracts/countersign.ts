import { createHash, randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  createAuditCertificate,
  createCountersignedPdf,
  decodeManualPlacement,
  decodeSignature,
} from "../signing/countersign.js";
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

function clean(value: unknown, maximum: number) {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, maximum)
    : "";
}

function sha256(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

function filePart(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "Contract";
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
    await enforceRateLimit(request, actor.user.id, "contract_countersign", 12, 3_600);
    const body = await readJsonBody(request);
    const contractId = clean(body.contractId, 36);
    const versionId = clean(body.versionId, 36);
    const signerName = clean(body.signerName, 100);
    const signerTitle = clean(body.signerTitle, 120);
    const requestedCounterpartyName = clean(body.counterpartySignatoryName, 160);
    const requestedCounterpartyEmail = clean(body.counterpartySignatoryEmail, 254).toLowerCase();
    const manualPlacement = decodeManualPlacement(body.placement);
    if (!/^[0-9a-f-]{36}$/i.test(contractId) || !/^[0-9a-f-]{36}$/i.test(versionId))
      throw new PortalHttpError(400, "A valid contract and version are required.");
    if (signerName.length < 2 || signerTitle.length < 2 || body.confirmed !== true)
      throw new PortalHttpError(400, "Confirm the signatory, authority and signing intent.");
    if (signerName.toLocaleLowerCase("en-GB") !== actor.profile.full_name.trim().toLocaleLowerCase("en-GB"))
      throw new PortalHttpError(403, "Sign using the authenticated administrator name.");
    const signatureBytes = decodeSignature(body.signatureImageDataUrl);

    const admin = getSupabaseAdmin();
    const { data: contract, error: contractError } = await admin
      .from("contracts")
      .select("id, reference, title, status, requires_signature, owner_organisation_id, counterparty_organisation_id, contract_parties(id, organisation_id, party_role, signatory_name, signatory_email)")
      .eq("id", contractId)
      .single();
    if (contractError || !contract)
      throw new PortalHttpError(404, "Contract not found.");
    if (!contract.requires_signature || !["ready_to_sign", "out_for_signature", "partially_signed"].includes(contract.status))
      throw new PortalHttpError(409, "This contract is not ready for DeepBridge countersignature.");

    const { data: version, error: versionError } = await admin
      .from("contract_versions")
      .select("id, contract_id, version_label, source_storage_path, content_sha256, malware_scan_status, locked_at, final_storage_path")
      .eq("id", versionId)
      .eq("contract_id", contractId)
      .single();
    if (versionError || !version)
      throw new PortalHttpError(404, "Contract version not found.");
    if (version.malware_scan_status !== "clean" || !version.locked_at)
      throw new PortalHttpError(409, "The source contract must pass security review before signing.");
    if (version.final_storage_path)
      throw new PortalHttpError(409, "This contract version is already countersigned.");

    const parties = Array.isArray(contract.contract_parties) ? contract.contract_parties : [];
    const ownerParty = parties.find((party) => party.organisation_id === contract.owner_organisation_id);
    const counterparty = parties.find((party) => party.organisation_id === contract.counterparty_organisation_id);
    if (!ownerParty || !counterparty)
      throw new PortalHttpError(409, "Both contracting parties must be recorded before signing.");
    const counterpartyName = requestedCounterpartyName || counterparty.signatory_name || "";
    const counterpartyEmail = requestedCounterpartyEmail || counterparty.signatory_email || "";
    if (!counterpartyName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(counterpartyEmail))
      throw new PortalHttpError(400, "Enter the counterparty signatory and a valid email address.");
    const ownerSignatoryEmail = "yon.wallace@deepbridgeadvisory.co.uk";
    if (
      counterpartyName.toLocaleLowerCase("en-GB") === signerName.toLocaleLowerCase("en-GB") ||
      counterpartyEmail === ownerSignatoryEmail
    )
      throw new PortalHttpError(400, "The counterparty signatory must be recorded separately from the DeepBridge signatory.");
    const [ownerPartyUpdate, counterpartyUpdate] = await Promise.all([
      admin.from("contract_parties").update({ signatory_name: signerName, signatory_email: ownerSignatoryEmail }).eq("id", ownerParty.id),
      admin.from("contract_parties").update({ signatory_name: counterpartyName, signatory_email: counterpartyEmail }).eq("id", counterparty.id),
    ]);
    if (ownerPartyUpdate.error) throw ownerPartyUpdate.error;
    if (counterpartyUpdate.error) throw counterpartyUpdate.error;

    const { data: sourceBlob, error: sourceError } = await admin.storage
      .from("contract-documents")
      .download(version.source_storage_path);
    if (sourceError || !sourceBlob)
      throw new PortalHttpError(409, "The verified source contract is not available.");
    const sourceBytes = new Uint8Array(await sourceBlob.arrayBuffer());
    if (sourceBytes.length < 5 || sourceBytes.length > 25 * 1024 * 1024 || Buffer.from(sourceBytes.subarray(0, 5)).toString("ascii") !== "%PDF-")
      throw new PortalHttpError(409, "The source contract is not a valid PDF.");
    const sourceHash = sha256(sourceBytes);
    if (sourceHash !== version.content_sha256)
      throw new PortalHttpError(409, "The source contract no longer matches its verified SHA-256 record.");

    const signedAt = new Date();
    const envelopeId = randomUUID();
    const statement = "I have reviewed the complete counterparty-signed document and, being authorised to sign for DUSTDEEP LTD trading as DeepBridge Advisory, intend this electronic countersignature to bind DeepBridge to the document.";
    const countersigned = await createCountersignedPdf({
      sourceBytes,
      signatureBytes,
      title: contract.title,
      versionLabel: version.version_label,
      consultantName: counterpartyName,
      consultantEmail: counterpartyEmail,
      signerName,
      signerTitle,
      signedAt,
      assignedDocumentId: version.id,
      envelopeId,
      sourceHash,
      manualPlacement,
      preserveSourcePages: !manualPlacement,
      sourceReference: contract.reference,
      counterpartyLabel: "Counterparty",
      signedSourceLabel: "Counterparty-signed source SHA-256",
      countersignatureStatement: statement,
    });
    const finalHash = sha256(countersigned.bytes);
    const certificateBytes = await createAuditCertificate({
      title: contract.title,
      versionLabel: version.version_label,
      consultantName: counterpartyName,
      consultantEmail: counterpartyEmail,
      signerName,
      signerTitle,
      signedAt,
      assignedDocumentId: version.id,
      envelopeId,
      sourceHash,
      finalHash,
      signaturePlacement: countersigned.signaturePlacement,
      sourceReference: contract.reference,
      counterpartyLabel: "Counterparty",
      signedSourceLabel: "Counterparty-signed source SHA-256",
      portalLabel: "Generated by the DeepBridge Contract Portal",
    });
    const certificateHash = sha256(certificateBytes);
    const stem = `DeepBridge-${filePart(contract.reference)}-${filePart(contract.title)}-v${filePart(version.version_label)}`;
    const prefix = `signed/${contract.id}/${version.id}/${envelopeId}`;
    const finalPath = `${prefix}/${stem}-Countersigned.pdf`;
    const certificatePath = `${prefix}/${stem}-Audit-Certificate.pdf`;
    const [finalUpload, certificateUpload] = await Promise.all([
      admin.storage.from("contract-documents").upload(finalPath, countersigned.bytes, { contentType: "application/pdf", upsert: false }),
      admin.storage.from("contract-documents").upload(certificatePath, certificateBytes, { contentType: "application/pdf", upsert: false }),
    ]);
    if (finalUpload.error || certificateUpload.error) {
      await admin.storage.from("contract-documents").remove([finalPath, certificatePath]);
      throw finalUpload.error || certificateUpload.error;
    }
    const now = signedAt.toISOString();
    const [versionUpdate, contractUpdate] = await Promise.all([
      admin.from("contract_versions").update({
        pending_final_storage_path: finalPath,
        pending_certificate_storage_path: certificatePath,
        final_storage_path: finalPath,
        certificate_storage_path: certificatePath,
        final_scan_status: "clean",
        certificate_scan_status: "clean",
        signed_at: now,
        updated_at: now,
      }).eq("id", version.id),
      admin.from("contracts").update({ status: "completed", updated_at: now }).eq("id", contract.id),
    ]);
    if (versionUpdate.error || contractUpdate.error) {
      await admin.storage.from("contract-documents").remove([finalPath, certificatePath]);
      throw versionUpdate.error || contractUpdate.error;
    }
    await admin.from("audit_events").insert({
      actor_id: actor.user.id,
      actor_label: actor.profile.full_name,
      action: "portal_contract_countersignature_applied",
      object_type: "contract_version",
      object_id: version.id,
      ...requestContext(request),
      metadata: {
        contract_id: contract.id,
        envelope_id: envelopeId,
        signer_name: signerName,
        signer_title: signerTitle,
        signer_email: ownerSignatoryEmail,
        counterparty_signatory: counterpartyName,
        counterparty_email: counterpartyEmail,
        signed_at: now,
        source_content_sha256: sourceHash,
        final_content_sha256: finalHash,
        certificate_content_sha256: certificateHash,
        source_pages_preserved: !manualPlacement,
        signature_placement: countersigned.signaturePlacement,
        placement_mode: manualPlacement ? "administrator_selected" : "appended_record_only",
        manual_placement: manualPlacement ?? null,
        output_verification: "server_generated_pdf_and_sha256",
      },
    });
    return json(response, 200, { status: "completed", envelopeId });
  } catch (error) {
    return handleApiError(response, error);
  }
}
