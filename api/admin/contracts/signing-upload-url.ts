import { randomUUID } from "node:crypto";
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

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;

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
      "contract_signed_pack_upload",
      20,
      3_600,
    );
    const body = await readJsonBody(request);
    const contractId =
      typeof body.contractId === "string" ? body.contractId : "";
    const versionId =
      typeof body.versionId === "string" ? body.versionId : "";
    for (const size of [body.finalSizeBytes, body.certificateSizeBytes]) {
      if (
        typeof size !== "number" ||
        size <= 0 ||
        size > 25 * 1024 * 1024
      )
        throw new PortalHttpError(400, "Each PDF must be 25 MB or smaller.");
    }
    if (
      !uuidPattern.test(contractId) ||
      !uuidPattern.test(versionId) ||
      body.finalMimeType !== "application/pdf" ||
      body.certificateMimeType !== "application/pdf"
    )
      throw new PortalHttpError(400, "Invalid signed contract metadata.");
    const admin = getSupabaseAdmin();
    const { data: version, error: versionError } = await admin
      .from("contract_versions")
      .select("id, contract_id, locked_at")
      .eq("id", versionId)
      .eq("contract_id", contractId)
      .single();
    if (versionError || !version)
      throw new PortalHttpError(404, "Contract version not found.");
    if (!version.locked_at)
      throw new PortalHttpError(
        409,
        "Wait for the source contract security scan before signing.",
      );
    const base = `signed/${contractId}/${versionId}`;
    const finalPath = `${base}/final-${randomUUID()}.pdf`;
    const certificatePath = `${base}/certificate-${randomUUID()}.pdf`;
    const [finalUpload, certificateUpload] = await Promise.all([
      admin.storage
        .from("contract-documents")
        .createSignedUploadUrl(finalPath, { upsert: false }),
      admin.storage
        .from("contract-documents")
        .createSignedUploadUrl(certificatePath, { upsert: false }),
    ]);
    if (finalUpload.error) throw finalUpload.error;
    if (certificateUpload.error) throw certificateUpload.error;
    return json(response, 200, {
      final: { path: finalPath, token: finalUpload.data.token },
      certificate: {
        path: certificatePath,
        token: certificateUpload.data.token,
      },
    });
  } catch (error) {
    return handleApiError(response, error);
  }
}
