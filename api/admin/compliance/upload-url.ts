import type { IncomingMessage, ServerResponse } from "node:http";
import {
  enforceRateLimit,
  getSupabaseAdmin,
  handleApiError,
  json,
  PortalHttpError,
  readJsonBody,
  requirePortalUser,
} from "../../_lib/server.js";

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);
const allowedExtensions = new Set(["pdf", "jpg", "jpeg", "png"]);

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
      "admin_compliance_upload",
      30,
      3600,
    );
    const body = await readJsonBody(request);
    const requirementId =
      typeof body.requirementId === "string" ? body.requirementId : "";
    const mimeType = typeof body.mimeType === "string" ? body.mimeType : "";
    const sizeBytes =
      typeof body.sizeBytes === "number" ? Math.round(body.sizeBytes) : 0;
    const originalFilename =
      typeof body.originalFilename === "string"
        ? body.originalFilename.trim().slice(0, 240)
        : "";
    const extension = originalFilename.split(".").pop()?.toLowerCase() ?? "";

    if (!/^[0-9a-f-]{36}$/i.test(requirementId))
      throw new PortalHttpError(400, "A valid compliance requirement is required.");
    if (!allowedMimeTypes.has(mimeType) || !allowedExtensions.has(extension))
      throw new PortalHttpError(400, "Upload a PDF, JPG or PNG file.");
    if (sizeBytes <= 0 || sizeBytes > 10 * 1024 * 1024)
      throw new PortalHttpError(400, "The maximum file size is 10 MB.");

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

    const uploadId = crypto.randomUUID();
    const normalisedExtension = extension === "jpeg" ? "jpg" : extension;
    const storagePath = `${requirement.consultant_id}/${requirementId}/${uploadId}.${normalisedExtension}`;
    const { data, error } = await admin.storage
      .from("consultant-compliance")
      .createSignedUploadUrl(storagePath, { upsert: false });
    if (error) throw error;

    return json(response, 200, {
      path: storagePath,
      token: data.token,
    });
  } catch (error) {
    return handleApiError(response, error);
  }
}
