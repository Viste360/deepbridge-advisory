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

const allowedTransitions: Record<string, string[]> = {
  draft: ["archived"],
  security_review: ["archived"],
  ready_to_sign: ["out_for_signature", "archived"],
  out_for_signature: ["partially_signed", "ready_to_sign", "archived"],
  partially_signed: ["out_for_signature", "archived"],
  completed: ["superseded", "archived"],
  blocked: ["archived"],
  superseded: ["archived"],
};

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
    const contractId =
      typeof body.contractId === "string" ? body.contractId : "";
    const status = typeof body.status === "string" ? body.status : "";
    if (!/^[0-9a-f-]{36}$/i.test(contractId))
      throw new PortalHttpError(400, "A valid contract is required.");
    const admin = getSupabaseAdmin();
    const { data: contract, error } = await admin
      .from("contracts")
      .select("id, status")
      .eq("id", contractId)
      .single();
    if (error || !contract)
      throw new PortalHttpError(404, "Contract not found.");
    if (!allowedTransitions[contract.status]?.includes(status))
      throw new PortalHttpError(
        409,
        `The contract cannot move from ${contract.status} to ${status}.`,
      );
    const { error: updateError } = await admin
      .from("contracts")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", contractId);
    if (updateError) throw updateError;
    await admin.from("audit_events").insert({
      actor_id: actor.user.id,
      actor_label: actor.profile.full_name,
      action: "contract_status_changed",
      object_type: "contract",
      object_id: contractId,
      ...requestContext(request),
      metadata: { previous_status: contract.status, status },
    });
    return json(response, 200, { updated: true });
  } catch (error) {
    return handleApiError(response, error);
  }
}
