import type { IncomingMessage, ServerResponse } from "node:http";
import {
  getSupabaseAdmin,
  handleApiError,
  json,
  requirePortalUser,
} from "../../_lib/server";

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
      .from("documents")
      .select(
        "id, slug, title, description, category, sort_order, document_versions(id, version_label, malware_scan_status, locked_at, effective_at, assignment_id)",
      )
      .order("sort_order")
      .order("created_at", {
        referencedTable: "document_versions",
        ascending: false,
      });
    if (error) throw error;
    return json(response, 200, { documents: data ?? [] });
  } catch (error) {
    return handleApiError(response, error);
  }
}
