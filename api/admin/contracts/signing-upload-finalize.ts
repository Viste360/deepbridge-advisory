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

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;

function clean(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

async function storedObjectExists(
  admin: ReturnType<typeof getSupabaseAdmin>,
  storagePath: string,
) {
  const parts = storagePath.split("/");
  const filename = parts.pop() ?? "";
  const { data, error } = await admin.storage
    .from("contract-documents")
    .list(parts.join("/"), { search: filename, limit: 1 });
  if (error) throw error;
  return Boolean(data?.some((item) => item.name === filename));
}

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
    const contractId = clean(body.contractId, 36);
    const versionId = clean(body.versionId, 36);
    const finalPath = clean(body.finalPath, 500);
    const certificatePath = clean(body.certificatePath, 500);
    const expectedPrefix = `signed/${contractId}/${versionId}/`;
    if (
      !uuidPattern.test(contractId) ||
      !uuidPattern.test(versionId) ||
      !finalPath.startsWith(expectedPrefix) ||
      !certificatePath.startsWith(expectedPrefix) ||
      finalPath.includes("..") ||
      certificatePath.includes("..")
    )
      throw new PortalHttpError(400, "Invalid signed contract paths.");
    const admin = getSupabaseAdmin();
    const [finalExists, certificateExists] = await Promise.all([
      storedObjectExists(admin, finalPath),
      storedObjectExists(admin, certificatePath),
    ]);
    if (!finalExists || !certificateExists)
      throw new PortalHttpError(
        409,
        "The signed contract pack could not be verified.",
      );
    const { error } = await admin
      .from("contract_versions")
      .update({
        pending_final_storage_path: finalPath,
        pending_certificate_storage_path: certificatePath,
        final_scan_status: "pending",
        certificate_scan_status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", versionId)
      .eq("contract_id", contractId);
    if (error) throw error;
    await admin
      .from("contracts")
      .update({
        status: "partially_signed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", contractId);
    await admin.from("audit_events").insert({
      actor_id: actor.user.id,
      actor_label: actor.profile.full_name,
      action: "contract_signed_pack_uploaded",
      object_type: "contract_version",
      object_id: versionId,
      ...requestContext(request),
      metadata: { contract_id: contractId },
    });
    await Promise.all([
      requestMalwareScan({
        objectType: "contract_artifact",
        objectId: versionId,
        bucket: "contract-documents",
        storagePath: finalPath,
        artifactKind: "final",
      }),
      requestMalwareScan({
        objectType: "contract_artifact",
        objectId: versionId,
        bucket: "contract-documents",
        storagePath: certificatePath,
        artifactKind: "certificate",
      }),
    ]);
    return json(response, 201, { status: "security_review" });
  } catch (error) {
    return handleApiError(response, error);
  }
}
