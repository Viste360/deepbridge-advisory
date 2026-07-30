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

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;
const allowedRelationships = new Set([
  "deepbridge_entity",
  "client",
  "end_customer",
  "consultant_supplier",
  "partner",
  "affiliate",
  "vendor",
]);

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
    await enforceRateLimit(
      request,
      actor.user.id,
      "organisation_save",
      50,
      3_600,
    );
    const body = await readJsonBody(request);
    const organisationId = clean(body.organisationId, 36);
    const legalName = clean(body.legalName, 200);
    const tradingName = clean(body.tradingName, 200);
    const companyNumber = clean(body.companyNumber, 80);
    const countryCode = clean(body.countryCode, 2).toUpperCase();
    const registeredAddress = clean(body.registeredAddress, 500);
    const website = clean(body.website, 300);
    const taxNumber = clean(body.taxNumber, 100);
    const notes = clean(body.notes, 1_000);
    const relationshipTypes = [
      ...new Set(
        (Array.isArray(body.relationshipTypes)
          ? body.relationshipTypes
          : []
        )
          .map((value) => clean(value, 40))
          .filter((value) => allowedRelationships.has(value)),
      ),
    ];
    if (legalName.length < 2 || !/^[A-Z]{2}$/.test(countryCode))
      throw new PortalHttpError(
        400,
        "Legal name and two-letter country code are required.",
      );
    if (!relationshipTypes.length)
      throw new PortalHttpError(
        400,
        "Select at least one company relationship.",
      );
    const organisationType =
      relationshipTypes[0] === "deepbridge_entity"
        ? "contracting_company"
        : relationshipTypes[0] === "consultant_supplier"
          ? "consultant_company"
          : relationshipTypes[0];
    const admin = getSupabaseAdmin();
    const payload = {
      legal_name: legalName,
      trading_name: tradingName || null,
      company_number: companyNumber || null,
      country_code: countryCode,
      organisation_type: organisationType,
      relationship_types: relationshipTypes,
      registered_address: registeredAddress || null,
      website: website || null,
      tax_number: taxNumber || null,
      notes: notes || null,
      active: body.active !== false,
      updated_at: new Date().toISOString(),
    };
    const query =
      organisationId && uuidPattern.test(organisationId)
        ? admin
            .from("organisations")
            .update(payload)
            .eq("id", organisationId)
            .select("id")
            .single()
        : admin.from("organisations").insert(payload).select("id").single();
    const { data, error } = await query;
    if (error || !data) throw error || new Error("Organisation was not saved.");

    await admin.from("audit_events").insert({
      actor_id: actor.user.id,
      actor_label: actor.profile.full_name,
      action: organisationId
        ? "organisation_updated"
        : "organisation_created",
      object_type: "organisation",
      object_id: data.id,
      ...requestContext(request),
      metadata: { legal_name: legalName, relationship_types: relationshipTypes },
    });
    return json(response, organisationId ? 200 : 201, {
      organisationId: data.id,
    });
  } catch (error) {
    return handleApiError(response, error);
  }
}
