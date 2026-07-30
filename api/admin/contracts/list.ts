import type { IncomingMessage, ServerResponse } from "node:http";
import {
  getSupabaseAdmin,
  handleApiError,
  json,
  requirePortalUser,
} from "../../_lib/server.js";
import { googleDriveArchiveConfigured } from "../../_lib/googleDrive.js";

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return json(response, 405, { error: "Method not allowed." });
  }
  try {
    await requirePortalUser(request, response, "admin");
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("contracts")
      .select(
        "id, reference, title, contract_type, description, status, requires_signature, effective_date, expiry_date, currency, contract_value, assignment_id, created_at, updated_at, owner:organisations!contracts_owner_organisation_id_fkey(id, legal_name, trading_name), counterparty:organisations!contracts_counterparty_organisation_id_fkey(id, legal_name, trading_name), contract_parties(id, organisation_id, party_role, signatory_name, signatory_email, signature_required, signing_order), contract_versions(id, version_label, original_filename, size_bytes, malware_scan_status, locked_at, drive_sync_status, drive_source_file_id, drive_final_file_id, drive_certificate_file_id, final_scan_status, certificate_scan_status, final_storage_path, certificate_storage_path, signed_at, created_at, superseded_at)",
      )
      .neq("status", "archived")
      .order("updated_at", { ascending: false })
      .order("created_at", {
        referencedTable: "contract_versions",
        ascending: false,
      });
    if (error) throw error;
    return json(response, 200, {
      contracts: data ?? [],
      driveConfigured: googleDriveArchiveConfigured(),
    });
  } catch (error) {
    return handleApiError(response, error);
  }
}
