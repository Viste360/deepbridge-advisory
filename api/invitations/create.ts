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
} from "../_lib/server.js";

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
    const { data: existingInvitation, error: existingInvitationError } =
      await admin
        .from("portal_invitations")
        .select("id, invited_at")
        .ilike("email", email)
        .is("accepted_at", null)
        .is("revoked_at", null)
        .maybeSingle();
    if (existingInvitationError) throw existingInvitationError;

    let invitation = existingInvitation;
    if (!invitation) {
      const { data: createdInvitation, error: invitationError } = await admin
        .from("portal_invitations")
        .insert({
          email,
          full_name: fullName,
          business_name: businessName,
          role: "consultant",
          invited_by: actor.user.id,
        })
        .select("id, invited_at")
        .single();
      if (invitationError || !createdInvitation)
        throw invitationError || new Error("Invitation record creation failed.");
      invitation = createdInvitation;
    } else {
      const { error: invitationUpdateError } = await admin
        .from("portal_invitations")
        .update({
          full_name: fullName,
          business_name: businessName,
          invited_by: actor.user.id,
          invited_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq("id", invitation.id);
      if (invitationUpdateError) throw invitationUpdateError;
    }

    const portalUrl = process.env.PORTAL_PUBLIC_URL?.replace(/\/$/, "");
    if (!portalUrl)
      throw new Error("Missing required server configuration: PORTAL_PUBLIC_URL");

    const invitationOptions = {
      redirectTo: `${portalUrl}/auth/callback`,
      data: { full_name: fullName, business_name: businessName },
    };
    const { data, error: authError } =
      await admin.auth.admin.inviteUserByEmail(email, invitationOptions);

    let invitedUser = data.user;
    let linkedExistingAccount = false;
    if (authError?.code === "email_exists") {
      linkedExistingAccount = true;
      invitedUser = null;
      for (let page = 1; page <= 100 && !invitedUser; page += 1) {
        const { data: usersPage, error: usersError } =
          await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (usersError) throw usersError;
        invitedUser =
          usersPage.users.find(
            (user) => user.email?.toLowerCase() === email,
          ) ?? null;
        if (usersPage.users.length < 1000) break;
      }
      if (!invitedUser)
        throw new PortalHttpError(
          409,
          "This email is already registered but could not be linked safely.",
        );

      const { error: profileError } = await admin
        .from("portal_profiles")
        .upsert(
          {
            id: invitedUser.id,
            email,
            full_name: fullName,
            business_name: businessName,
            role: "consultant",
            access_status: invitedUser.email_confirmed_at
              ? "active"
              : "invited",
            email_verified_at: invitedUser.email_confirmed_at,
            invited_at: invitation.invited_at,
            access_revoked_at: null,
          },
          { onConflict: "id" },
        );
      if (profileError) throw profileError;

      if (invitedUser.email_confirmed_at) {
        const { error: acceptedError } = await admin
          .from("portal_invitations")
          .update({ accepted_at: new Date().toISOString() })
          .eq("id", invitation.id);
        if (acceptedError) throw acceptedError;
      }

      const { error: signInLinkError } = await admin.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: invitationOptions.redirectTo,
          shouldCreateUser: false,
          data: invitationOptions.data,
        },
      });
      if (signInLinkError) throw signInLinkError;
    } else if (authError || !invitedUser) {
      throw authError || new Error("Invite failed.");
    }

    const { error: bootstrapError } = await admin.rpc(
      "bootstrap_invited_consultant",
      {
        requested_user_id: invitedUser.id,
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
      object_id: invitedUser.id,
      consultant_id: invitedUser.id,
      ...context,
      metadata: {
        operation: linkedExistingAccount
          ? "link_existing_consultant"
          : "invite_consultant",
      },
    });

    return json(response, 201, {
      message: linkedExistingAccount
        ? "The existing secure account has been linked and a new sign-in link has been sent."
        : "The secure invitation has been sent.",
    });
  } catch (error) {
    return handleApiError(response, error);
  }
}
