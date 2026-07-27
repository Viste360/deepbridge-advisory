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
      typeof body.versionId === "string" ? body.versionId.trim() : "";
    if (!/^[0-9a-f-]{36}$/i.test(versionId))
      throw new PortalHttpError(400, "A valid document version is required.");

    const admin = getSupabaseAdmin();
    const { data: version, error: versionError } = await admin
      .from("document_versions")
      .select(
        "id, document_id, assignment_id, version_label, source_storage_path, malware_scan_status, locked_at",
      )
      .eq("id", versionId)
      .single();
    if (versionError || !version)
      throw new PortalHttpError(404, "Document version not found.");

    if (version.locked_at || version.malware_scan_status === "clean")
      throw new PortalHttpError(
        409,
        "Published document versions are retained for the audit history. Upload a new version instead.",
      );

    const { count, error: assignmentError } = await admin
      .from("assigned_documents")
      .select("id", { count: "exact", head: true })
      .eq("document_version_id", versionId);
    if (assignmentError) throw assignmentError;
    if ((count ?? 0) > 0)
      throw new PortalHttpError(
        409,
        "This version is already assigned and cannot be removed.",
      );

    const { data: removed, error: removeError } = await admin
      .from("document_versions")
      .delete()
      .eq("id", versionId)
      .is("locked_at", null)
      .neq("malware_scan_status", "clean")
      .select("id")
      .maybeSingle();
    if (removeError) throw removeError;
    if (!removed)
      throw new PortalHttpError(
        409,
        "The scan status changed before removal. Refresh and try again.",
      );

    let storageRemoved = true;
    if (version.source_storage_path) {
      const { error: storageError } = await admin.storage
        .from("portal-documents")
        .remove([version.source_storage_path]);
      storageRemoved = !storageError;
      if (storageError)
        console.error("Removed document metadata but storage cleanup failed", {
          versionId,
          storageError,
        });
    }

    await admin.from("audit_events").insert({
      actor_id: actor.user.id,
      actor_label: actor.profile.full_name,
      action: "document_version_removed",
      object_type: "document_version",
      object_id: versionId,
      assignment_id: version.assignment_id,
      ...requestContext(request),
      metadata: {
        document_id: version.document_id,
        version_label: version.version_label,
        previous_scan_status: version.malware_scan_status,
        storage_removed: storageRemoved,
      },
    });

    return json(response, 200, { removed: true });
  } catch (error) {
    return handleApiError(response, error);
  }
}
