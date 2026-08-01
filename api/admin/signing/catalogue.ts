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
    const { data: assigned, error: assignedError } = await admin
      .from("assigned_documents")
      .select(
        "id, consultant_id, assignment_id, status, completed_at, document_versions!inner(version_label, malware_scan_status, locked_at, documents!inner(slug, title, category))",
      )
      .eq("document_versions.documents.category", "signature")
      .order("assigned_at", { ascending: false });
    if (assignedError) throw assignedError;

    const consultantIds = [
      ...new Set((assigned ?? []).map((item) => item.consultant_id)),
    ];
    const assignedIds = (assigned ?? []).map((item) => item.id);
    const [profiles, envelopes] = await Promise.all([
      consultantIds.length
        ? admin
            .from("portal_profiles")
            .select("id, full_name, email")
            .in("id", consultantIds)
        : Promise.resolve({ data: [], error: null }),
      assignedIds.length
        ? admin
            .from("signature_envelopes")
            .select(
              "id, assigned_document_id, provider, provider_status, sent_at, consultant_signed_at, completed_at, final_scan_status, certificate_scan_status, created_at, updated_at",
            )
            .in("assigned_document_id", assignedIds)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (profiles.error) throw profiles.error;
    if (envelopes.error) throw envelopes.error;

    const envelopeIds = (envelopes.data ?? []).map((envelope) => envelope.id);
    const portalGeneratedEvents = envelopeIds.length
      ? await admin
          .from("audit_events")
          .select("object_id")
          .eq("object_type", "signature_envelope")
          .eq("action", "portal_countersignature_applied")
          .in("object_id", envelopeIds)
      : { data: [], error: null };
    if (portalGeneratedEvents.error) throw portalGeneratedEvents.error;
    const portalGeneratedEnvelopeIds = new Set(
      (portalGeneratedEvents.data ?? []).map((event) => event.object_id),
    );

    const profileById = new Map(
      (profiles.data ?? []).map((profile) => [profile.id, profile]),
    );
    const latestEnvelopeByDocument = new Map<string, Record<string, unknown>>();
    const completedEnvelopeCountByDocument = new Map<string, number>();
    for (const envelope of envelopes.data ?? []) {
      if (!latestEnvelopeByDocument.has(envelope.assigned_document_id))
        latestEnvelopeByDocument.set(
          envelope.assigned_document_id,
          envelope as Record<string, unknown>,
        );
      if (envelope.provider_status === "completed")
        completedEnvelopeCountByDocument.set(
          envelope.assigned_document_id,
          (completedEnvelopeCountByDocument.get(envelope.assigned_document_id) ??
            0) + 1,
        );
    }

    const items = (assigned ?? []).map((item) => {
      const version = Array.isArray(item.document_versions)
        ? item.document_versions[0]
        : item.document_versions;
      const document = Array.isArray(version?.documents)
        ? version.documents[0]
        : version?.documents;
      const latestEnvelope = latestEnvelopeByDocument.get(item.id) ?? null;
      return {
        id: item.id,
        consultant_id: item.consultant_id,
        assignment_id: item.assignment_id,
        consultant: profileById.get(item.consultant_id) ?? null,
        status: item.status,
        completed_at: item.completed_at,
        version_label: version?.version_label,
        publication_ready:
          version?.malware_scan_status === "clean" && Boolean(version?.locked_at),
        document,
        envelope: latestEnvelope
          ? {
              ...latestEnvelope,
              portal_generated: portalGeneratedEnvelopeIds.has(
                String(latestEnvelope.id),
              ),
              has_previous_completed:
                (completedEnvelopeCountByDocument.get(item.id) ?? 0) >
                (latestEnvelope.provider_status === "completed" ? 1 : 0),
            }
          : null,
      };
    });

    return json(response, 200, { items });
  } catch (error) {
    return handleApiError(response, error);
  }
}
