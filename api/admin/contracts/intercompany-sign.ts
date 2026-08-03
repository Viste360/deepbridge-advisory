import { createHash, randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  createAuditCertificate,
  createCountersignedPdf,
  createPlacedSignaturePdf,
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

function organisationName(value: unknown) {
  const record = Array.isArray(value) ? value[0] : value;
  if (!record || typeof record !== "object") return "";
  const row = record as { legal_name?: unknown; trading_name?: unknown };
  return clean(row.trading_name, 200) || clean(row.legal_name, 200);
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
      "intercompany_contract_sign",
      12,
      3_600,
    );
    const body = await readJsonBody(request);
    const contractId = clean(body.contractId, 36);
    const versionId = clean(body.versionId, 36);
    const signerName = clean(body.signerName, 100);
    const signerTitle = clean(body.signerTitle, 120);
    const manualPlacement = decodeManualPlacement(body.placement);
    if (
      !/^[0-9a-f-]{36}$/i.test(contractId) ||
      !/^[0-9a-f-]{36}$/i.test(versionId)
    )
      throw new PortalHttpError(400, "A valid contract and version are required.");
    if (
      signerName.length < 2 ||
      signerTitle.length < 2 ||
      body.confirmed !== true
    )
      throw new PortalHttpError(
        400,
        "Confirm the signatory, authority and signing intent.",
      );
    if (!manualPlacement)
      throw new PortalHttpError(
        400,
        "Place the signature and date in the selected company execution block.",
      );
    if (
      signerName.toLocaleLowerCase("en-GB") !==
      actor.profile.full_name.trim().toLocaleLowerCase("en-GB")
    )
      throw new PortalHttpError(
        403,
        "Sign using the authenticated administrator name.",
      );
    const signatureBytes = decodeSignature(body.signatureImageDataUrl);
    const admin = getSupabaseAdmin();
    const { data: contract, error: contractError } = await admin
      .from("contracts")
      .select(
        "id, reference, title, contract_type, status, requires_signature, owner_organisation_id, counterparty_organisation_id, owner:organisations!contracts_owner_organisation_id_fkey(legal_name, trading_name), counterparty:organisations!contracts_counterparty_organisation_id_fkey(legal_name, trading_name), contract_parties(id, organisation_id, signatory_name, signatory_email)",
      )
      .eq("id", contractId)
      .single();
    if (contractError || !contract)
      throw new PortalHttpError(404, "Contract not found.");
    if (
      contract.contract_type !== "intercompany" ||
      !contract.requires_signature ||
      !["ready_to_sign", "out_for_signature", "partially_signed"].includes(
        contract.status,
      )
    )
      throw new PortalHttpError(
        409,
        "This intercompany contract is not ready for portal signing.",
      );

    const { data: version, error: versionError } = await admin
      .from("contract_versions")
      .select(
        "id, contract_id, version_label, source_storage_path, content_sha256, malware_scan_status, locked_at, intermediate_storage_path, intermediate_content_sha256, final_storage_path",
      )
      .eq("id", versionId)
      .eq("contract_id", contractId)
      .single();
    if (versionError || !version)
      throw new PortalHttpError(404, "Contract version not found.");
    if (version.malware_scan_status !== "clean" || !version.locked_at)
      throw new PortalHttpError(
        409,
        "The source contract must pass security review before signing.",
      );
    if (version.final_storage_path)
      throw new PortalHttpError(409, "This contract version is already executed.");

    const { data: existingEvents, error: eventError } = await admin
      .from("contract_signature_events")
      .select(
        "id, signing_order, signer_name, signer_email, signer_title, organisation_name, signed_at, output_sha256, output_storage_path",
      )
      .eq("contract_version_id", version.id)
      .order("signing_order", { ascending: true });
    if (eventError) throw eventError;
    if ((existingEvents ?? []).length > 1)
      throw new PortalHttpError(409, "Both intercompany signatures are already recorded.");
    const signingOrder = (existingEvents ?? []).length + 1;
    const partyOrganisationId =
      signingOrder === 1
        ? contract.owner_organisation_id
        : contract.counterparty_organisation_id;
    const parties = Array.isArray(contract.contract_parties)
      ? contract.contract_parties
      : [];
    const party = parties.find(
      (item) => item.organisation_id === partyOrganisationId,
    );
    if (!party)
      throw new PortalHttpError(409, "The signing company is not recorded.");
    const ownerName = organisationName(contract.owner);
    const counterpartyName = organisationName(contract.counterparty);
    const signingOrganisation = signingOrder === 1 ? ownerName : counterpartyName;
    if (!signingOrganisation)
      throw new PortalHttpError(409, "The signing company name is unavailable.");
    const signerEmail = clean(party.signatory_email, 254).toLowerCase();
    if (signerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signerEmail))
      throw new PortalHttpError(400, "The signing company email is invalid.");

    const inputPath =
      signingOrder === 1
        ? version.source_storage_path
        : version.intermediate_storage_path;
    const expectedInputHash =
      signingOrder === 1
        ? version.content_sha256
        : version.intermediate_content_sha256;
    if (!inputPath || !expectedInputHash)
      throw new PortalHttpError(
        409,
        "The first intercompany signature must be completed before countersigning.",
      );
    const { data: inputBlob, error: inputError } = await admin.storage
      .from("contract-documents")
      .download(inputPath);
    if (inputError || !inputBlob)
      throw new PortalHttpError(409, "The protected signing PDF is unavailable.");
    const inputBytes = new Uint8Array(await inputBlob.arrayBuffer());
    if (
      inputBytes.length < 5 ||
      inputBytes.length > 25 * 1024 * 1024 ||
      Buffer.from(inputBytes.subarray(0, 5)).toString("ascii") !== "%PDF-"
    )
      throw new PortalHttpError(409, "The protected signing PDF is invalid.");
    const inputHash = sha256(inputBytes);
    if (inputHash !== expectedInputHash)
      throw new PortalHttpError(
        409,
        "The protected signing PDF no longer matches its SHA-256 record.",
      );

    const signedAt = new Date();
    const envelopeId = randomUUID();
    const prefix = `signed/${contract.id}/${version.id}/${envelopeId}`;
    if (signingOrder === 1) {
      const intermediateBytes = await createPlacedSignaturePdf({
        sourceBytes: inputBytes,
        signatureBytes,
        signerName,
        signedAt,
        manualPlacement,
        title: contract.title,
      });
      const outputHash = sha256(intermediateBytes);
      const outputPath = `${prefix}/01-${filePart(ownerName)}-signed.pdf`;
      const { error: uploadError } = await admin.storage
        .from("contract-documents")
        .upload(outputPath, intermediateBytes, {
          contentType: "application/pdf",
          upsert: false,
        });
      if (uploadError) throw uploadError;
      const [partyUpdate, eventInsert, versionUpdate, contractUpdate] =
        await Promise.all([
          admin
            .from("contract_parties")
            .update({ signatory_name: signerName })
            .eq("id", party.id),
          admin.from("contract_signature_events").insert({
            contract_version_id: version.id,
            contract_party_id: party.id,
            signing_order: 1,
            event_role: "signature",
            organisation_name: signingOrganisation,
            signer_name: signerName,
            signer_email: signerEmail || null,
            signer_title: signerTitle,
            signed_at: signedAt.toISOString(),
            input_sha256: inputHash,
            output_sha256: outputHash,
            output_storage_path: outputPath,
            manual_placement: manualPlacement,
            created_by: actor.user.id,
          }),
          admin
            .from("contract_versions")
            .update({
              intermediate_storage_path: outputPath,
              intermediate_content_sha256: outputHash,
              updated_at: signedAt.toISOString(),
            })
            .eq("id", version.id),
          admin
            .from("contracts")
            .update({
              status: "partially_signed",
              updated_at: signedAt.toISOString(),
            })
            .eq("id", contract.id),
        ]);
      const mutationError =
        partyUpdate.error ||
        eventInsert.error ||
        versionUpdate.error ||
        contractUpdate.error;
      if (mutationError) {
        await admin.storage.from("contract-documents").remove([outputPath]);
        throw mutationError;
      }
      await admin.from("audit_events").insert({
        actor_id: actor.user.id,
        actor_label: actor.profile.full_name,
        action: "intercompany_contract_first_signature_applied",
        object_type: "contract_version",
        object_id: version.id,
        ...requestContext(request),
        metadata: {
          contract_id: contract.id,
          envelope_id: envelopeId,
          organisation_id: partyOrganisationId,
          organisation_name: signingOrganisation,
          signer_name: signerName,
          signer_title: signerTitle,
          signer_email: signerEmail,
          signed_at: signedAt.toISOString(),
          input_sha256: inputHash,
          output_sha256: outputHash,
          manual_placement: manualPlacement,
        },
      });
      return json(response, 200, {
        status: "partially_signed",
        signingOrder: 1,
        envelopeId,
      });
    }

    const firstEvent = (existingEvents ?? [])[0];
    if (!firstEvent)
      throw new PortalHttpError(409, "The first signature record is missing.");
    const statement = `${firstEvent.signer_name} signed for ${ownerName} at ${new Date(firstEvent.signed_at).toISOString()} (UTC). ${signerName}, being authorised to sign for ${counterpartyName}, countersigned this intercompany agreement through the authenticated DeepBridge portal.`;
    const finalDocument = await createCountersignedPdf({
      sourceBytes: inputBytes,
      signatureBytes,
      title: contract.title,
      versionLabel: version.version_label,
      consultantName: firstEvent.signer_name,
      consultantEmail: firstEvent.signer_email || "Not supplied",
      signerName,
      signerTitle,
      signerEmail: signerEmail || "Not supplied",
      signedFor: counterpartyName,
      signedAt,
      assignedDocumentId: version.id,
      envelopeId,
      sourceHash: version.content_sha256,
      manualPlacement,
      sourceReference: contract.reference,
      counterpartyLabel: "First signatory",
      signedSourceLabel: "Original verified source SHA-256",
      countersignatureStatement: statement,
      recordTitle: "Intercompany agreement executed by both parties",
      recordEyebrow: "INTERCOMPANY ELECTRONIC EXECUTION RECORD",
      recordNote:
        "This page forms part of the executed intercompany agreement and records both ordered portal signing events and the SHA-256 hash of the original verified source document.",
    });
    const finalHash = sha256(finalDocument.bytes);
    const certificateBytes = await createAuditCertificate({
      title: contract.title,
      versionLabel: version.version_label,
      consultantName: firstEvent.signer_name,
      consultantEmail: firstEvent.signer_email || "Not supplied",
      signerName,
      signerTitle: `${signerTitle} · ${counterpartyName}`,
      signerEmail: signerEmail || "Not supplied",
      signedFor: counterpartyName,
      signedAt,
      assignedDocumentId: version.id,
      envelopeId,
      sourceHash: version.content_sha256,
      finalHash,
      signaturePlacement: finalDocument.signaturePlacement,
      sourceReference: contract.reference,
      counterpartyLabel: "First signatory",
      signedSourceLabel: "Original verified source SHA-256",
      portalLabel: "Generated by the DeepBridge Contract Portal",
      auditTitle: "Intercompany execution audit certificate",
      evidenceStatement:
        "The authenticated administrator completed two separately recorded company signing events. The portal retained the original verified PDF, the first-signed intermediate PDF, the final executed PDF and their SHA-256 evidence.",
    });
    const certificateHash = sha256(certificateBytes);
    const stem = `DeepBridge-${filePart(contract.reference)}-${filePart(contract.title)}-v${filePart(version.version_label)}`;
    const finalPath = `${prefix}/${stem}-Executed.pdf`;
    const certificatePath = `${prefix}/${stem}-Audit-Certificate.pdf`;
    const [finalUpload, certificateUpload] = await Promise.all([
      admin.storage.from("contract-documents").upload(
        finalPath,
        finalDocument.bytes,
        { contentType: "application/pdf", upsert: false },
      ),
      admin.storage.from("contract-documents").upload(
        certificatePath,
        certificateBytes,
        { contentType: "application/pdf", upsert: false },
      ),
    ]);
    if (finalUpload.error || certificateUpload.error) {
      await admin.storage
        .from("contract-documents")
        .remove([finalPath, certificatePath]);
      throw finalUpload.error || certificateUpload.error;
    }
    const now = signedAt.toISOString();
    const [partyUpdate, eventInsert, versionUpdate, contractUpdate] =
      await Promise.all([
        admin
          .from("contract_parties")
          .update({ signatory_name: signerName })
          .eq("id", party.id),
        admin.from("contract_signature_events").insert({
          contract_version_id: version.id,
          contract_party_id: party.id,
          signing_order: 2,
          event_role: "countersignature",
          organisation_name: signingOrganisation,
          signer_name: signerName,
          signer_email: signerEmail || null,
          signer_title: signerTitle,
          signed_at: now,
          input_sha256: inputHash,
          output_sha256: finalHash,
          output_storage_path: finalPath,
          manual_placement: manualPlacement,
          created_by: actor.user.id,
        }),
        admin
          .from("contract_versions")
          .update({
            pending_final_storage_path: finalPath,
            pending_certificate_storage_path: certificatePath,
            final_storage_path: finalPath,
            certificate_storage_path: certificatePath,
            final_scan_status: "clean",
            certificate_scan_status: "clean",
            drive_sync_status: "pending",
            signed_at: now,
            updated_at: now,
          })
          .eq("id", version.id),
        admin
          .from("contracts")
          .update({ status: "completed", updated_at: now })
          .eq("id", contract.id),
      ]);
    const mutationError =
      partyUpdate.error ||
      eventInsert.error ||
      versionUpdate.error ||
      contractUpdate.error;
    if (mutationError) {
      await admin.storage
        .from("contract-documents")
        .remove([finalPath, certificatePath]);
      throw mutationError;
    }
    await admin.from("audit_events").insert({
      actor_id: actor.user.id,
      actor_label: actor.profile.full_name,
      action: "intercompany_contract_countersignature_applied",
      object_type: "contract_version",
      object_id: version.id,
      ...requestContext(request),
      metadata: {
        contract_id: contract.id,
        envelope_id: envelopeId,
        organisation_id: partyOrganisationId,
        organisation_name: signingOrganisation,
        signer_name: signerName,
        signer_title: signerTitle,
        signer_email: signerEmail,
        signed_at: now,
        original_source_sha256: version.content_sha256,
        first_signed_sha256: inputHash,
        final_content_sha256: finalHash,
        certificate_content_sha256: certificateHash,
        manual_placement: manualPlacement,
      },
    });
    return json(response, 200, {
      status: "completed",
      signingOrder: 2,
      envelopeId,
    });
  } catch (error) {
    return handleApiError(response, error);
  }
}
