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
} from "../_lib/server";

function stringField(
  body: Record<string, unknown>,
  name: string,
  maximum: number,
) {
  const value = typeof body[name] === "string" ? body[name].trim() : "";
  if (!value || value.length > maximum)
    throw new PortalHttpError(400, `A valid ${name} is required.`);
  return value;
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
    await enforceRateLimit(request, actor.user.id, "create_invitation", 10, 3600);
    const body = await readJsonBody(request);
    const fullName = stringField(body, "fullName", 160);
    const businessName = stringField(body, "businessName", 200);
    const email = stringField(body, "email", 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new PortalHttpError(400, "A valid email address is required.");

    const admin = getSupabaseAdmin();
    const { error: invitationError } = await admin
      .from("portal_invitations")
      .insert({
        email,
        full_name: fullName,
        business_name: businessName,
        role: "consultant",
        invited_by: actor.user.id,
      });
    if (invitationError) {
      if (invitationError.code === "23505")
        throw new PortalHttpError(
          409,
          "An active invitation already exists for this email address.",
        );
      throw invitationError;
    }

    const portalUrl = process.env.PORTAL_PUBLIC_URL?.replace(/\/$/, "");
    if (!portalUrl)
      throw new Error("Missing required server configuration: PORTAL_PUBLIC_URL");

    const { data, error: authError } =
      await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${portalUrl}/auth/callback`,
        data: { full_name: fullName, business_name: businessName },
      });
    if (authError || !data.user) throw authError || new Error("Invite failed.");

    const { error: bootstrapError } = await admin.rpc(
      "bootstrap_invited_consultant",
      {
        requested_user_id: data.user.id,
        requested_full_name: fullName,
        requested_business_name: businessName,
        requested_country_code: "DE",
      },
    );
    if (bootstrapError) throw bootstrapError;

    const context = requestContext(request);
    await admin.from("audit_events").insert({
      actor_id: actor.user.id,
      actor_label: actor.profile.full_name,
      action: "administrator_action",
      object_type: "invitation",
      object_id: data.user.id,
      consultant_id: data.user.id,
      ...context,
      metadata: { operation: "invite_consultant" },
    });

    return json(response, 201, {
      message: "The secure invitation has been sent.",
    });
  } catch (error) {
    return handleApiError(response, error);
  }
}
