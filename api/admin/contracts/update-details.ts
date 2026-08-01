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

const uuidPattern = /^[0-9a-f-]{36}$/i;

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
    await enforceRateLimit(request, actor.user.id, "contract_details_update", 30, 3_600);
    const body = await readJsonBody(request);
    const contractId = clean(body.contractId, 36);
    const counterpartyOrganisationId = clean(body.counterpartyOrganisationId, 36);
    const assignmentId = clean(body.assignmentId, 36);
    const signatoryName = clean(body.counterpartySignatoryName, 160);
    const signatoryEmail = clean(body.counterpartySignatoryEmail, 254).toLowerCase();
    if (!uuidPattern.test(contractId) || !uuidPattern.test(counterpartyOrganisationId))
      throw new PortalHttpError(400, "Select a valid contract and counterparty.");
    if (assignmentId && !uuidPattern.test(assignmentId))
      throw new PortalHttpError(400, "Select a valid project.");
    if (signatoryEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signatoryEmail))
      throw new PortalHttpError(400, "Enter a valid counterparty email address.");

    const admin = getSupabaseAdmin();
    const { data: contract, error } = await admin
      .from("contracts")
      .select("id, owner_organisation_id, counterparty_organisation_id, contract_type, status, contract_versions(final_storage_path), contract_parties(organisation_id, signatory_name, signatory_email)")
      .eq("id", contractId)
      .single();
    if (error || !contract)
      throw new PortalHttpError(404, "Contract not found.");
    if (contract.owner_organisation_id === counterpartyOrganisationId)
      throw new PortalHttpError(400, "The counterparty must be different from the DeepBridge entity.");
    if (
      contract.status === "completed" ||
      (contract.contract_versions ?? []).some((version) => version.final_storage_path)
    )
      throw new PortalHttpError(409, "Completed contract records cannot be reassigned. Add a corrected version instead.");
    const ownerParty = (contract.contract_parties ?? []).find(
      (party) => party.organisation_id === contract.owner_organisation_id,
    );
    if (
      signatoryName &&
      ownerParty?.signatory_name &&
      signatoryName.toLocaleLowerCase("en-GB") ===
        ownerParty.signatory_name.toLocaleLowerCase("en-GB")
    )
      throw new PortalHttpError(
        400,
        "The person who signed for the counterparty must be different from the DeepBridge countersignatory.",
      );
    if (
      signatoryEmail &&
      ownerParty?.signatory_email &&
      signatoryEmail === ownerParty.signatory_email.toLowerCase()
    )
      throw new PortalHttpError(
        400,
        "The counterparty email must be different from the DeepBridge signatory email.",
      );

    const now = new Date().toISOString();
    const { error: updateError } = await admin
      .from("contracts")
      .update({
        counterparty_organisation_id: counterpartyOrganisationId,
        assignment_id: assignmentId || null,
        updated_at: now,
      })
      .eq("id", contract.id);
    if (updateError) throw updateError;
    const partyRole =
      contract.contract_type === "consultant_supply"
        ? "consultant_supplier"
        : contract.contract_type === "partnership"
          ? "partner"
          : contract.contract_type === "intercompany"
            ? "affiliate"
            : "client";
    const { error: partyError } = await admin.from("contract_parties").upsert(
      {
        contract_id: contract.id,
        organisation_id: counterpartyOrganisationId,
        party_role: partyRole,
        signatory_name: signatoryName || null,
        signatory_email: signatoryEmail || null,
        signature_required: true,
        signing_order: 1,
      },
      { onConflict: "contract_id,organisation_id,party_role" },
    );
    if (partyError) throw partyError;
    if (contract.counterparty_organisation_id !== counterpartyOrganisationId) {
      const { error: oldPartyError } = await admin
        .from("contract_parties")
        .delete()
        .eq("contract_id", contract.id)
        .eq("organisation_id", contract.counterparty_organisation_id);
      if (oldPartyError) throw oldPartyError;
    }
    await admin.from("audit_events").insert({
      actor_id: actor.user.id,
      actor_label: actor.profile.full_name,
      action: "contract_relationship_corrected",
      object_type: "contract",
      object_id: contract.id,
      assignment_id: assignmentId || null,
      ...requestContext(request),
      metadata: {
        previous_counterparty_organisation_id: contract.counterparty_organisation_id,
        counterparty_organisation_id: counterpartyOrganisationId,
        assignment_id: assignmentId || null,
      },
    });
    return json(response, 200, { updated: true });
  } catch (error) {
    return handleApiError(response, error);
  }
}
