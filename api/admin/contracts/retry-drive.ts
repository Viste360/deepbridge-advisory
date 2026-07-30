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
import {
  archivePdfToGoogleDrive,
  googleDriveArchiveConfigured,
} from "../../_lib/googleDrive.js";

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
    if (!googleDriveArchiveConfigured())
      throw new PortalHttpError(
        503,
        "Google Drive archiving is not configured yet.",
      );
    const admin = getSupabaseAdmin();
    const { data: version, error } = await admin
      .from("contract_versions")
      .select(
        "id, contract_id, version_label, source_storage_path, final_storage_path, certificate_storage_path, malware_scan_status, final_scan_status, certificate_scan_status, drive_source_file_id, drive_final_file_id, drive_certificate_file_id, contracts!inner(reference, title)",
      )
      .eq("id", versionId)
      .single();
    if (error || !version)
      throw new PortalHttpError(404, "Contract version not found.");
    const contract = Array.isArray(version.contracts)
      ? version.contracts[0]
      : version.contracts;
    const artifacts = [
      {
        kind: "source",
        path: version.source_storage_path,
        clean: version.malware_scan_status === "clean",
        existing: version.drive_source_file_id,
      },
      {
        kind: "final",
        path: version.final_storage_path,
        clean: version.final_scan_status === "clean",
        existing: version.drive_final_file_id,
      },
      {
        kind: "certificate",
        path: version.certificate_storage_path,
        clean: version.certificate_scan_status === "clean",
        existing: version.drive_certificate_file_id,
      },
    ] as const;
    const updates: Record<string, string | null> = {};
    for (const artifact of artifacts) {
      if (!artifact.path || !artifact.clean || artifact.existing) continue;
      const { data: file, error: downloadError } = await admin.storage
        .from("contract-documents")
        .download(artifact.path);
      if (downloadError || !file)
        throw downloadError || new Error("Contract file was unavailable.");
      const fileId = await archivePdfToGoogleDrive({
        filename:
          artifact.kind === "source"
            ? `${contract?.reference || "CONTRACT"}-v${version.version_label}.pdf`
            : `${contract?.reference || "CONTRACT"}-${artifact.kind}.pdf`,
        data: Buffer.from(await file.arrayBuffer()),
        description: `${contract?.title || "DeepBridge contract"} — ${artifact.kind}`,
        appProperties: {
          deepbridgeContractId: version.contract_id,
          deepbridgeContractVersionId: version.id,
          artifactKind: artifact.kind,
        },
      });
      updates[
        artifact.kind === "source"
          ? "drive_source_file_id"
          : artifact.kind === "final"
            ? "drive_final_file_id"
            : "drive_certificate_file_id"
      ] = fileId;
    }
    const sourceId =
      updates.drive_source_file_id || version.drive_source_file_id;
    const finalId = updates.drive_final_file_id || version.drive_final_file_id;
    const certificateId =
      updates.drive_certificate_file_id || version.drive_certificate_file_id;
    const complete =
      Boolean(sourceId) &&
      (!version.final_storage_path || Boolean(finalId)) &&
      (!version.certificate_storage_path || Boolean(certificateId));
    const now = new Date().toISOString();
    const { error: updateError } = await admin
      .from("contract_versions")
      .update({
        ...updates,
        drive_sync_status: complete ? "synced" : "pending",
        drive_synced_at: complete ? now : null,
        updated_at: now,
      })
      .eq("id", version.id);
    if (updateError) throw updateError;
    await admin.from("audit_events").insert({
      actor_id: actor.user.id,
      actor_label: actor.profile.full_name,
      action: "contract_drive_archive_retried",
      object_type: "contract_version",
      object_id: version.id,
      ...requestContext(request),
      metadata: { contract_id: version.contract_id, complete },
    });
    return json(response, 200, {
      synced: complete,
      copiedFiles: Object.keys(updates).length,
    });
  } catch (error) {
    return handleApiError(response, error);
  }
}
