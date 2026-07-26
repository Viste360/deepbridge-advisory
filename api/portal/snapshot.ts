import type { IncomingMessage, ServerResponse } from "node:http";
import {
  getSupabaseForUser,
  handleApiError,
  json,
  requirePortalUser,
} from "../_lib/server";

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return json(response, 405, { error: "Method not allowed." });
  }
  try {
    const actor = await requirePortalUser(request, response);
    const supabase = getSupabaseForUser(actor.accessToken);
    const [
      profile,
      assignment,
      documents,
      compliance,
      tasks,
      audit,
    ] = await Promise.all([
      supabase
        .from("portal_profiles")
        .select("*")
        .eq("id", actor.user.id)
        .single(),
      supabase.from("portal_assignment_summary").select("*").limit(1).single(),
      supabase.from("portal_document_summary").select("*").order("sort_order"),
      supabase
        .from("portal_compliance_summary")
        .select("*")
        .order("sort_order"),
      supabase
        .from("portal_onboarding_summary")
        .select("*")
        .order("sort_order"),
      supabase
        .from("audit_events")
        .select("id, action, object_type, object_id, created_at, actor_label")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    const error = [
      profile.error,
      assignment.error,
      documents.error,
      compliance.error,
      tasks.error,
      audit.error,
    ].find(Boolean);
    if (error) throw error;
    return json(response, 200, {
      profile: profile.data,
      assignment: assignment.data,
      documents: documents.data,
      compliance: compliance.data,
      tasks: tasks.data,
      audit: audit.data,
    });
  } catch (error) {
    return handleApiError(response, error);
  }
}
