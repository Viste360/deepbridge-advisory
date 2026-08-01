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
import { requestMalwareScan } from "../../_lib/scanner.js";

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
    await enforceRateLimit(request, actor.user.id, "contract_scan_retry", 20, 3_600);
    const body = await readJsonBody(request);
    const versionId = typeof body.versionId === "string" ? body.versionId : "";
    if (!/^[0-9a-f-]{36}$/i.test(versionId))
      throw new PortalHttpError(400, "A valid contract version is required.");

    const admin = getSupabaseAdmin();
    const { data: version, error } = await admin
      .from("contract_versions")
      .select("id, contract_id, source_storage_path, malware_scan_status, locked_at")
      .eq("id", versionId)
      .single();
    if (error || !version)
      throw new PortalHttpError(404, "Contract version not found.");
    if (version.malware_scan_status === "clean" && version.locked_at)
      return json(response, 200, { status: "clean" });
    if (version.malware_scan_status === "infected")
      throw new PortalHttpError(409, "This file did not pass security review and must be replaced.");

    const now = new Date().toISOString();
    const [versionReset, contractReset] = await Promise.all([
      admin
        .from("contract_versions")
        .update({ malware_scan_status: "pending", malware_scanned_at: null, updated_at: now })
        .eq("id", version.id),
      admin
        .from("contracts")
        .update({ status: "security_review", updated_at: now })
        .eq("id", version.contract_id),
    ]);
    if (versionReset.error) throw versionReset.error;
    if (contractReset.error) throw contractReset.error;

    try {
      await requestMalwareScan({
        objectType: "contract_version",
        objectId: version.id,
        bucket: "contract-documents",
        storagePath: version.source_storage_path,
      });
    } catch (scanError) {
      await Promise.all([
        admin
          .from("contract_versions")
          .update({ malware_scan_status: "failed", malware_scanned_at: new Date().toISOString() })
          .eq("id", version.id),
        admin
          .from("contracts")
          .update({ status: "blocked", updated_at: new Date().toISOString() })
          .eq("id", version.contract_id),
      ]);
      throw scanError;
    }

    await admin.from("audit_events").insert({
      actor_id: actor.user.id,
      actor_label: actor.profile.full_name,
      action: "contract_security_scan_retried",
      object_type: "contract_version",
      object_id: version.id,
      ...requestContext(request),
      metadata: { contract_id: version.contract_id },
    });
    return json(response, 200, { status: "pending" });
  } catch (error) {
    return handleApiError(response, error);
  }
}
