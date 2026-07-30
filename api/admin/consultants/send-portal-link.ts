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
} from "../../_lib/server.js";

function cleanText(value: unknown, maximum: number) {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, maximum)
    : "";
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
    await enforceRateLimit(
      request,
      actor.user.id,
      "consultant_portal_notification",
      20,
      3_600,
    );
    const body = await readJsonBody(request);
    const consultantId = cleanText(body.consultantId, 36);
    const message =
      cleanText(body.message, 600) ||
      "Your signed DeepBridge contract and consultant documents are ready in your secure portal.";
    if (!/^[0-9a-f-]{36}$/i.test(consultantId))
      throw new PortalHttpError(400, "A valid consultant is required.");

    const admin = getSupabaseAdmin();
    const { data: profile, error: profileError } = await admin
      .from("portal_profiles")
      .select("id, email, full_name, business_name, role, access_status")
      .eq("id", consultantId)
      .single();
    if (profileError || !profile || profile.role !== "consultant")
      throw new PortalHttpError(404, "Consultant record not found.");
    if (profile.access_status === "revoked")
      throw new PortalHttpError(
        409,
        "Restore consultant access before sending a portal link.",
      );

    const portalUrl = process.env.PORTAL_PUBLIC_URL?.replace(/\/$/, "");
    if (!portalUrl)
      throw new Error("Missing required server configuration: PORTAL_PUBLIC_URL");

    const { data: authUser, error: authUserError } =
      await admin.auth.admin.getUserById(consultantId);
    if (authUserError || !authUser.user)
      throw authUserError || new Error("Consultant login record not found.");

    const { error: metadataError } = await admin.auth.admin.updateUserById(
      consultantId,
      {
        user_metadata: {
          ...authUser.user.user_metadata,
          full_name: profile.full_name,
          business_name: profile.business_name,
          portal_notice: message,
          portal_notice_updated_at: new Date().toISOString(),
        },
      },
    );
    if (metadataError) throw metadataError;

    const { error: emailError } = await admin.auth.signInWithOtp({
      email: profile.email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${portalUrl}/auth/callback?notice=documents-ready`,
        data: {
          full_name: profile.full_name,
          first_name: profile.full_name.split(" ")[0],
          business_name: profile.business_name,
          portal_notice: message,
        },
      },
    });
    if (emailError) throw emailError;

    await admin.from("audit_events").insert({
      actor_id: actor.user.id,
      actor_label: actor.profile.full_name,
      action: "consultant_portal_link_sent",
      object_type: "consultant",
      object_id: consultantId,
      consultant_id: consultantId,
      ...requestContext(request),
      metadata: {
        recipient_email: profile.email,
        message,
        delivery: "supabase_auth_email",
      },
    });

    return json(response, 200, {
      message: `A secure portal link was sent to ${profile.email}.`,
    });
  } catch (error) {
    return handleApiError(response, error);
  }
}
