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
    const { data, error } = await admin
      .from("organisations")
      .select(
        "id, legal_name, trading_name, company_number, country_code, organisation_type, relationship_types, registered_address, website, tax_number, notes, active, created_at, organisation_contacts(id, full_name, email, job_title, phone, is_primary)",
      )
      .order("legal_name");
    if (error) throw error;
    return json(response, 200, { organisations: data ?? [] });
  } catch (error) {
    return handleApiError(response, error);
  }
}
