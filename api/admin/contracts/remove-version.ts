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
    const versionId =
      typeof body.versionId === "string" ? body.versionId : "";
    if (!/^[0-9a-f-]{36}$/i.test(versionId))
      throw new PortalHttpError(400, "A valid contract version is required.");
    const admin = getSupabaseAdmin();
    const { data: version, error } = await admin
      .from("contract_versions")
      .select(
        "id, contract_id, source_storage_path, malware_scan_status, locked_at, final_storage_path, pending_final_storage_path",
      )
      .eq("id", versionId)
      .single();
    if (error || !version)
      throw new PortalHttpError(404, "Contract version not found.");
    if (
      version.locked_at ||
      version.malware_scan_status === "clean" ||
      version.final_storage_path ||
      version.pending_final_storage_path
    )
      throw new PortalHttpError(
        409,
        "Published or signed contract versions cannot be deleted. Archive or supersede the contract instead.",
      );
    const { error: storageError } = await admin.storage
      .from("contract-documents")
      .remove([version.source_storage_path]);
    if (storageError) throw storageError;
    const { error: deleteError } = await admin
      .from("contract_versions")
      .delete()
      .eq("id", version.id);
    if (deleteError) throw deleteError;
    const { count, error: countError } = await admin
      .from("contract_versions")
      .select("id", { count: "exact", head: true })
      .eq("contract_id", version.contract_id);
    if (countError) throw countError;
    if (!count) {
      const { error: partyDeleteError } = await admin
        .from("contract_parties")
        .delete()
        .eq("contract_id", version.contract_id);
      if (partyDeleteError) throw partyDeleteError;
      const { error: contractDeleteError } = await admin
        .from("contracts")
        .delete()
        .eq("id", version.contract_id);
      if (contractDeleteError) throw contractDeleteError;
    }
    await admin.from("audit_events").insert({
      actor_id: actor.user.id,
      actor_label: actor.profile.full_name,
      action: "contract_quarantine_upload_removed",
      object_type: "contract_version",
      object_id: version.id,
      ...requestContext(request),
      metadata: { contract_id: version.contract_id },
    });
    return json(response, 200, { removed: true });
  } catch (error) {
    return handleApiError(response, error);
  }
}
