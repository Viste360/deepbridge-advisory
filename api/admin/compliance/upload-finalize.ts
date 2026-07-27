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
import { requestMalwareScan } from "../../_lib/scanner.js";

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

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
    const requirementId =
      typeof body.requirementId === "string" ? body.requirementId : "";
    const storagePath =
      typeof body.storagePath === "string" ? body.storagePath : "";
    const mimeType = typeof body.mimeType === "string" ? body.mimeType : "";
    const sizeBytes =
      typeof body.sizeBytes === "number" ? Math.round(body.sizeBytes) : 0;
    const originalFilename =
      typeof body.originalFilename === "string"
        ? body.originalFilename.trim().slice(0, 240)
        : "";
    const expiryDate =
      typeof body.expiryDate === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(body.expiryDate)
        ? body.expiryDate
        : null;

    if (!/^[0-9a-f-]{36}$/i.test(requirementId))
      throw new PortalHttpError(400, "A valid compliance requirement is required.");

    const admin = getSupabaseAdmin();
    const { data: requirement, error: requirementError } = await admin
      .from("consultant_compliance_requirements")
      .select(
        "id, consultant_id, portal_profiles!consultant_compliance_requirements_consultant_id_fkey(access_status)",
      )
      .eq("id", requirementId)
      .single();
    if (requirementError || !requirement)
      throw new PortalHttpError(404, "Compliance requirement not found.");

    const profile = Array.isArray(requirement.portal_profiles)
      ? requirement.portal_profiles[0]
      : requirement.portal_profiles;
    if (profile?.access_status === "revoked")
      throw new PortalHttpError(
        409,
        "Compliance files cannot be added while access is revoked.",
      );

    const expectedPrefix = `${requirement.consultant_id}/${requirementId}/`;
    if (
      !storagePath.startsWith(expectedPrefix) ||
      storagePath.includes("..") ||
      !allowedMimeTypes.has(mimeType) ||
      sizeBytes <= 0 ||
      sizeBytes > 10 * 1024 * 1024 ||
      !originalFilename
    ) {
      throw new PortalHttpError(400, "Invalid upload metadata.");
    }

    const pathParts = storagePath.split("/");
    const filename = pathParts.pop() ?? "";
    const folder = pathParts.join("/");
    const { data: stored, error: listError } = await admin.storage
      .from("consultant-compliance")
      .list(folder, { search: filename, limit: 1 });
    if (listError) throw listError;
    if (!stored?.some((item) => item.name === filename))
      throw new PortalHttpError(409, "The uploaded file could not be verified.");

    const { data: submission, error } = await admin
      .from("compliance_submissions")
      .insert({
        requirement_id: requirementId,
        consultant_id: requirement.consultant_id,
        storage_path: storagePath,
        original_filename: originalFilename,
        mime_type: mimeType,
        size_bytes: sizeBytes,
        expiry_date: expiryDate,
        status: "uploaded",
        malware_scan_status: "pending",
      })
      .select("id")
      .single();
    if (error) throw error;

    await admin.from("audit_events").insert({
      actor_id: actor.user.id,
      actor_label: actor.profile.full_name,
      action: "file_uploaded_by_admin",
      object_type: "compliance_submission",
      object_id: submission.id,
      consultant_id: requirement.consultant_id,
      ...requestContext(request),
      metadata: { uploaded_on_behalf: true },
    });

    await requestMalwareScan({
      objectType: "compliance_submission",
      objectId: submission.id,
      bucket: "consultant-compliance",
      storagePath,
    });

    return json(response, 201, {
      submissionId: submission.id,
      status: "pending_scan",
    });
  } catch (error) {
    return handleApiError(response, error);
  }
}
