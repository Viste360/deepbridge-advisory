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

const uuidPattern = /^[0-9a-f-]{36}$/i;

function clean(value: unknown, maximum: number) {
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
    await enforceRateLimit(request, actor.user.id, "assignment_save", 30, 3_600);
    const body = await readJsonBody(request);
    const assignmentId = clean(body.assignmentId, 36);
    const title = clean(body.title, 240);
    const programme = clean(body.programme, 160);
    const location = clean(body.location, 160) || "Remote / as agreed";
    const startDate = clean(body.startDate, 10);
    const expectedEnd = clean(body.expectedEnd, 120) || "To be confirmed";
    const currency = clean(body.currency, 3).toUpperCase() || "EUR";
    const contractingOrganisationId = clean(body.contractingOrganisationId, 36);
    const customerOrganisationId = clean(body.customerOrganisationId, 36);
    const endCustomerOrganisationId = clean(body.endCustomerOrganisationId, 36);
    const consultantProfileIds = [...new Set(
      (Array.isArray(body.consultantProfileIds) ? body.consultantProfileIds : [])
        .map((value) => clean(value, 36))
        .filter((value) => uuidPattern.test(value)),
    )];
    if (assignmentId && !uuidPattern.test(assignmentId))
      throw new PortalHttpError(400, "A valid project record is required.");
    if (title.length < 2 || programme.length < 2 || !/^\d{4}-\d{2}-\d{2}$/.test(startDate))
      throw new PortalHttpError(400, "Project name, code and start date are required.");
    if (!/^[A-Z]{3}$/.test(currency))
      throw new PortalHttpError(400, "Use a three-letter currency code.");
    if (!uuidPattern.test(contractingOrganisationId))
      throw new PortalHttpError(400, "Select the DeepBridge contracting entity.");
    for (const organisationId of [customerOrganisationId, endCustomerOrganisationId].filter(Boolean))
      if (!uuidPattern.test(organisationId))
        throw new PortalHttpError(400, "A selected organisation is invalid.");

    const admin = getSupabaseAdmin();
    const now = new Date().toISOString();
    const record = {
      contracting_organisation_id: contractingOrganisationId,
      customer_organisation_id: customerOrganisationId || null,
      end_customer_organisation_id: endCustomerOrganisationId || null,
      title,
      programme,
      primary_location: location,
      start_date: startDate,
      expected_end_display: expectedEnd,
      onsite_expectation: "As agreed for each work package",
      currency,
      daily_rate: 0,
      trial_period: "Not applicable",
      notice_terms: "As stated in the applicable contract",
      accommodation_terms: "As stated in the applicable contract",
      travel_terms: "As stated in the applicable contract",
      contact_name: actor.profile.full_name,
      contact_role: "Director",
      contact_email: actor.user.email || "yon.wallace@deepbridgeadvisory.co.uk",
      status: "active",
      updated_at: now,
    };
    let activeAssignmentId = assignmentId;
    if (activeAssignmentId) {
      const { error } = await admin
        .from("assignments")
        .update(record)
        .eq("id", activeAssignmentId);
      if (error) throw error;
    } else {
      const { data, error } = await admin
        .from("assignments")
        .insert(record)
        .select("id")
        .single();
      if (error || !data) throw error || new Error("Project was not created.");
      activeAssignmentId = data.id;
    }

    const consultantResult = consultantProfileIds.length
      ? await admin
          .from("consultants")
          .select("id, user_id")
          .in("user_id", consultantProfileIds)
      : { data: [], error: null };
    if (consultantResult.error) throw consultantResult.error;
    if ((consultantResult.data ?? []).length !== consultantProfileIds.length)
      throw new PortalHttpError(400, "A selected consultant could not be found.");
    const selectedConsultantIds = (consultantResult.data ?? []).map((item) => item.id);
    const { data: existing, error: existingError } = await admin
      .from("assignment_consultants")
      .select("consultant_id")
      .eq("assignment_id", activeAssignmentId)
      .is("removed_at", null);
    if (existingError) throw existingError;
    const removedIds = (existing ?? [])
      .map((item) => item.consultant_id)
      .filter((id) => !selectedConsultantIds.includes(id));
    if (removedIds.length) {
      const { error } = await admin
        .from("assignment_consultants")
        .update({ removed_at: now })
        .eq("assignment_id", activeAssignmentId)
        .in("consultant_id", removedIds);
      if (error) throw error;
    }
    if (selectedConsultantIds.length) {
      const { error } = await admin.from("assignment_consultants").upsert(
        selectedConsultantIds.map((consultantId) => ({
          assignment_id: activeAssignmentId,
          consultant_id: consultantId,
          assigned_at: now,
          removed_at: null,
        })),
        { onConflict: "assignment_id,consultant_id" },
      );
      if (error) throw error;
    }
    await admin.from("audit_events").insert({
      actor_id: actor.user.id,
      actor_label: actor.profile.full_name,
      action: assignmentId ? "assignment_updated" : "assignment_created",
      object_type: "assignment",
      object_id: activeAssignmentId,
      assignment_id: activeAssignmentId,
      ...requestContext(request),
      metadata: {
        programme,
        consultant_profile_ids: consultantProfileIds,
      },
    });
    return json(response, assignmentId ? 200 : 201, {
      assignmentId: activeAssignmentId,
    });
  } catch (error) {
    return handleApiError(response, error);
  }
}
