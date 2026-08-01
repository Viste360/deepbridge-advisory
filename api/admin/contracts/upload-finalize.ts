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
import { googleDriveArchiveConfigured } from "../../_lib/googleDrive.js";
import { requestMalwareScan } from "../../_lib/scanner.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;
const contractTypes = new Set([
  "client_services",
  "consultant_supply",
  "partnership",
  "intercompany",
  "nda",
  "other",
]);

function clean(value: unknown, maximum: number) {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, maximum)
    : "";
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
    const contractId = clean(body.contractId, 36);
    const reference = clean(body.reference, 80).toUpperCase();
    const title = clean(body.title, 240);
    const contractType = clean(body.contractType, 40);
    const ownerOrganisationId = clean(body.ownerOrganisationId, 36);
    const counterpartyOrganisationId = clean(
      body.counterpartyOrganisationId,
      36,
    );
    const assignmentId = clean(body.assignmentId, 36);
    const description = clean(body.description, 1_000);
    const versionLabel = clean(body.versionLabel, 40);
    const storagePath = clean(body.storagePath, 500);
    const originalFilename = clean(body.originalFilename, 240);
    const contentSha256 = clean(body.contentSha256, 64).toLowerCase();
    const ownerSignatoryName = clean(body.ownerSignatoryName, 160);
    const ownerSignatoryEmail = clean(body.ownerSignatoryEmail, 254).toLowerCase();
    const counterpartySignatoryName = clean(body.counterpartySignatoryName, 160);
    const counterpartySignatoryEmail = clean(body.counterpartySignatoryEmail, 254).toLowerCase();
    const effectiveDate = clean(body.effectiveDate, 10);
    const expiryDate = clean(body.expiryDate, 10);
    const requiresSignature = body.requiresSignature !== false;
    const sizeBytes =
      typeof body.sizeBytes === "number" ? Math.round(body.sizeBytes) : 0;
    if (
      !reference ||
      title.length < 2 ||
      !contractTypes.has(contractType) ||
      !uuidPattern.test(ownerOrganisationId) ||
      !uuidPattern.test(counterpartyOrganisationId) ||
      ownerOrganisationId === counterpartyOrganisationId ||
      (assignmentId && !uuidPattern.test(assignmentId)) ||
      !versionLabel ||
      !storagePath.startsWith(`source/${actor.user.id}/`) ||
      storagePath.includes("..") ||
      !originalFilename.toLowerCase().endsWith(".pdf") ||
      body.mimeType !== "application/pdf" ||
      sizeBytes <= 0 ||
      sizeBytes > 25 * 1024 * 1024 ||
      !/^[0-9a-f]{64}$/.test(contentSha256)
    )
      throw new PortalHttpError(400, "Invalid contract metadata.");
    if (effectiveDate && expiryDate && expiryDate < effectiveDate)
      throw new PortalHttpError(400, "The expiry date cannot be earlier than the effective date.");
    if (
      requiresSignature &&
      (!ownerSignatoryName ||
        !counterpartySignatoryName ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerSignatoryEmail) ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(counterpartySignatoryEmail))
    )
      throw new PortalHttpError(400, "Both signatories and their valid email addresses are required.");

    const admin = getSupabaseAdmin();
    const { data: organisations, error: organisationError } = await admin
      .from("organisations")
      .select("id")
      .in("id", [ownerOrganisationId, counterpartyOrganisationId]);
    if (organisationError) throw organisationError;
    if ((organisations ?? []).length !== 2)
      throw new PortalHttpError(404, "A contract organisation was not found.");
    if (assignmentId) {
      const { data: assignment, error } = await admin
        .from("assignments")
        .select("id")
        .eq("id", assignmentId)
        .single();
      if (error || !assignment)
        throw new PortalHttpError(404, "Assignment not found.");
    }
    const pathParts = storagePath.split("/");
    const storedFilename = pathParts.pop() ?? "";
    const { data: stored, error: storageError } = await admin.storage
      .from("contract-documents")
      .list(pathParts.join("/"), { search: storedFilename, limit: 1 });
    if (storageError) throw storageError;
    if (!stored?.some((item) => item.name === storedFilename))
      throw new PortalHttpError(409, "The uploaded contract could not be verified.");

    const now = new Date().toISOString();
    let activeContractId = contractId;
    if (activeContractId) {
      if (!uuidPattern.test(activeContractId))
        throw new PortalHttpError(400, "Invalid contract record.");
      const { error } = await admin
        .from("contracts")
        .update({
          reference,
          title,
          contract_type: contractType,
          owner_organisation_id: ownerOrganisationId,
          counterparty_organisation_id: counterpartyOrganisationId,
          assignment_id: assignmentId || null,
          description: description || null,
          requires_signature: requiresSignature,
          status: "security_review",
          updated_at: now,
        })
        .eq("id", activeContractId);
      if (error) throw error;
    } else {
      const { data, error } = await admin
        .from("contracts")
        .insert({
          reference,
          title,
          contract_type: contractType,
          owner_organisation_id: ownerOrganisationId,
          counterparty_organisation_id: counterpartyOrganisationId,
          assignment_id: assignmentId || null,
          description: description || null,
          requires_signature: requiresSignature,
          effective_date: effectiveDate || null,
          expiry_date: expiryDate || null,
          currency: clean(body.currency, 3).toUpperCase() || null,
          contract_value:
            typeof body.contractValue === "number" && body.contractValue >= 0
              ? body.contractValue
              : null,
          status: "security_review",
          created_by: actor.user.id,
        })
        .select("id")
        .single();
      if (error || !data) {
        if (error?.code === "23505")
          throw new PortalHttpError(
            409,
            "That contract reference already exists.",
          );
        throw error || new Error("Contract record was not created.");
      }
      activeContractId = data.id;
    }

    const { data: version, error: versionError } = await admin
      .from("contract_versions")
      .insert({
        contract_id: activeContractId,
        version_label: versionLabel,
        source_storage_path: storagePath,
        content_sha256: contentSha256,
        original_filename: originalFilename,
        mime_type: "application/pdf",
        size_bytes: sizeBytes,
        malware_scan_status: "pending",
        drive_sync_status: googleDriveArchiveConfigured()
          ? "pending"
          : "not_configured",
        created_by: actor.user.id,
      })
      .select("id")
      .single();
    if (versionError || !version) {
      if (versionError?.code === "23505")
        throw new PortalHttpError(
          409,
          "That version label already exists for this contract.",
        );
      throw versionError || new Error("Contract version was not created.");
    }

    const { error: partyError } = await admin.from("contract_parties").upsert(
      [
        {
          contract_id: activeContractId,
          organisation_id: ownerOrganisationId,
          party_role: "deepbridge_entity",
          signatory_name: ownerSignatoryName || null,
          signatory_email: ownerSignatoryEmail || null,
          signature_required: requiresSignature,
          signing_order: 2,
        },
        {
          contract_id: activeContractId,
          organisation_id: counterpartyOrganisationId,
          party_role:
            contractType === "consultant_supply"
              ? "consultant_supplier"
              : contractType === "partnership"
                ? "partner"
                : contractType === "intercompany"
                  ? "affiliate"
                  : "client",
          signatory_name: counterpartySignatoryName || null,
          signatory_email: counterpartySignatoryEmail || null,
          signature_required: requiresSignature,
          signing_order: 1,
        },
      ],
      { onConflict: "contract_id,organisation_id,party_role" },
    );
    if (partyError) throw partyError;

    await admin.from("audit_events").insert({
      actor_id: actor.user.id,
      actor_label: actor.profile.full_name,
      action: "contract_uploaded",
      object_type: "contract_version",
      object_id: version.id,
      assignment_id: assignmentId || null,
      ...requestContext(request),
      metadata: {
        contract_id: activeContractId,
        reference,
        version_label: versionLabel,
      },
    });
    try {
      await requestMalwareScan({
        objectType: "contract_version",
        objectId: version.id,
        bucket: "contract-documents",
        storagePath,
      });
    } catch {
      await Promise.all([
        admin
          .from("contract_versions")
          .update({ malware_scan_status: "failed", malware_scanned_at: new Date().toISOString() })
          .eq("id", version.id),
        admin
          .from("contracts")
          .update({ status: "blocked", updated_at: new Date().toISOString() })
          .eq("id", activeContractId),
      ]);
      await admin.from("audit_events").insert({
        actor_id: actor.user.id,
        actor_label: actor.profile.full_name,
        action: "contract_security_scan_trigger_failed",
        object_type: "contract_version",
        object_id: version.id,
        ...requestContext(request),
        metadata: { contract_id: activeContractId },
      });
      return json(response, 202, {
        contractId: activeContractId,
        versionId: version.id,
        status: "scan_retry_needed",
      });
    }
    return json(response, 201, {
      contractId: activeContractId,
      versionId: version.id,
      status: "pending_scan",
    });
  } catch (error) {
    return handleApiError(response, error);
  }
}
