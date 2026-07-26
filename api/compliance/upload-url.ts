import type { IncomingMessage, ServerResponse } from "node:http";
import {
  enforceRateLimit,
  getSupabaseAdmin,
  getSupabaseForUser,
  handleApiError,
  json,
  PortalHttpError,
  readJsonBody,
  requirePortalUser,
} from "../_lib/server";

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
    const actor = await requirePortalUser(request, response);
    await enforceRateLimit(request, actor.user.id, "compliance_upload", 20, 3600);
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

    const scoped = getSupabaseForUser(actor.accessToken);
    const { data: requirement, error: requirementError } = await scoped
      .from("consultant_compliance_requirements")
      .select("id")
      .eq("id", requirementId)
      .eq("consultant_id", actor.user.id)
      .single();
    if (requirementError || !requirement)
      throw new PortalHttpError(404, "Compliance requirement not found.");

    const uploadId = crypto.randomUUID();
    const normalisedExtension = extension === "jpeg" ? "jpg" : extension;
    const storagePath = `${actor.user.id}/${requirementId}/${uploadId}.${normalisedExtension}`;
    const admin = getSupabaseAdmin();
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
