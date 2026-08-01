import type { IncomingMessage, ServerResponse } from "node:http";
import {
  getSupabaseAdmin,
  handleApiError,
  json,
  requirePortalUser,
} from "../../_lib/server.js";

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return json(response, 405, { error: "Method not allowed." });
  }
  try {
    await requirePortalUser(request, response, "admin");
    const admin = getSupabaseAdmin();
    const [assignmentsResult, membershipsResult, contractsResult] = await Promise.all([
      admin
        .from("assignments")
        .select("id, title, programme, primary_location, start_date, expected_end_display, currency, status, contracting_organisation_id, customer_organisation_id, end_customer_organisation_id, contracting:organisations!assignments_contracting_organisation_id_fkey(id, legal_name, trading_name), customer:organisations!assignments_customer_organisation_id_fkey(id, legal_name, trading_name), end_customer:organisations!assignments_end_customer_organisation_id_fkey(id, legal_name, trading_name)")
        .order("created_at", { ascending: false }),
      admin
        .from("assignment_consultants")
        .select("assignment_id, consultant_id, removed_at, consultants!inner(id, user_id, legal_name, business_name)")
        .is("removed_at", null),
      admin
        .from("contracts")
        .select("id, assignment_id, reference, title, status, contract_type, counterparty:organisations!contracts_counterparty_organisation_id_fkey(id, legal_name, trading_name)")
        .not("assignment_id", "is", null)
        .neq("status", "archived")
        .order("updated_at", { ascending: false }),
    ]);
    if (assignmentsResult.error) throw assignmentsResult.error;
    if (membershipsResult.error) throw membershipsResult.error;
    if (contractsResult.error) throw contractsResult.error;

    const userIds = (membershipsResult.data ?? [])
      .map((membership) => {
        const consultant = Array.isArray(membership.consultants)
          ? membership.consultants[0]
          : membership.consultants;
        return consultant?.user_id;
      })
      .filter((value): value is string => Boolean(value));
    const profilesResult = userIds.length
      ? await admin
          .from("portal_profiles")
          .select("id, full_name, email")
          .in("id", userIds)
      : { data: [], error: null };
    if (profilesResult.error) throw profilesResult.error;
    const profileById = new Map(
      (profilesResult.data ?? []).map((profile) => [profile.id, profile]),
    );

    return json(response, 200, {
      assignments: (assignmentsResult.data ?? []).map((assignment) => ({
        ...assignment,
        consultants: (membershipsResult.data ?? [])
          .filter((membership) => membership.assignment_id === assignment.id)
          .map((membership) => {
            const consultant = Array.isArray(membership.consultants)
              ? membership.consultants[0]
              : membership.consultants;
            const profile = consultant?.user_id
              ? profileById.get(consultant.user_id)
              : undefined;
            return {
              id: consultant?.user_id,
              consultant_record_id: consultant?.id,
              full_name: profile?.full_name || consultant?.legal_name,
              email: profile?.email || "",
              business_name: consultant?.business_name || "",
            };
          }),
        contracts: (contractsResult.data ?? []).filter(
          (contract) => contract.assignment_id === assignment.id,
        ),
      })),
    });
  } catch (error) {
    return handleApiError(response, error);
  }
}
