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
    await enforceRateLimit(request, actor.user.id, "contract_access", 80, 600);
    const body = await readJsonBody(request);
    const versionId =
      typeof body.versionId === "string" ? body.versionId : "";
    const kind =
      body.kind === "final" || body.kind === "certificate"
        ? body.kind
        : "source";
    if (!/^[0-9a-f-]{36}$/i.test(versionId))
      throw new PortalHttpError(400, "A valid contract version is required.");
    const admin = getSupabaseAdmin();
    const { data: version, error } = await admin
      .from("contract_versions")
      .select(
        "id, contract_id, source_storage_path, final_storage_path, certificate_storage_path, malware_scan_status, locked_at, final_scan_status, certificate_scan_status",
      )
      .eq("id", versionId)
      .single();
    if (error || !version)
      throw new PortalHttpError(404, "Contract version not found.");
    const storagePath =
      kind === "final"
        ? version.final_storage_path
        : kind === "certificate"
          ? version.certificate_storage_path
          : version.source_storage_path;
    const cleared =
      kind === "final"
        ? version.final_scan_status === "clean"
        : kind === "certificate"
          ? version.certificate_scan_status === "clean"
          : version.malware_scan_status === "clean" && version.locked_at;
    if (!storagePath || !cleared)
      throw new PortalHttpError(
        409,
        "This contract file has not passed its security checks.",
      );
    const { data, error: signedUrlError } = await admin.storage
      .from("contract-documents")
      .createSignedUrl(storagePath, 300, { download: kind !== "source" });
    if (signedUrlError) throw signedUrlError;
    await admin.from("audit_events").insert({
      actor_id: actor.user.id,
      actor_label: actor.profile.full_name,
      action: kind === "source" ? "contract_viewed" : "contract_downloaded",
      object_type: "contract_version",
      object_id: version.id,
      ...requestContext(request),
      metadata: { contract_id: version.contract_id, kind },
    });
    return json(response, 200, { url: data.signedUrl });
  } catch (error) {
    return handleApiError(response, error);
  }
}
