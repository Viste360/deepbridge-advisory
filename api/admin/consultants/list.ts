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
    const { data: profiles, error: profilesError } = await admin
      .from("portal_profiles")
      .select(
        "id, email, full_name, business_name, access_status, last_login_at, created_at",
      )
      .eq("role", "consultant")
      .order("created_at", { ascending: false });
    if (profilesError) throw profilesError;

    const profileIds = (profiles ?? []).map((profile) => profile.id);
    if (!profileIds.length) return json(response, 200, { consultants: [] });

    const { data: consultantRecords, error: consultantsError } = await admin
      .from("consultants")
      .select("id, user_id")
      .in("user_id", profileIds);
    if (consultantsError) throw consultantsError;

    const consultantIds = (consultantRecords ?? []).map(
      (consultant) => consultant.id,
    );
    const { data: memberships, error: membershipsError } = consultantIds.length
      ? await admin
          .from("assignment_consultants")
          .select(
            "consultant_id, assignment_id, assigned_at, removed_at, assignments!inner(id, title, primary_location, start_date, status)",
          )
          .in("consultant_id", consultantIds)
          .is("removed_at", null)
          .order("assigned_at", { ascending: false })
      : { data: [], error: null };
    if (membershipsError) throw membershipsError;

    const [tasksResult, assignedDocumentsResult] = await Promise.all([
      admin
        .from("onboarding_tasks")
        .select("consultant_id, assignment_id, complete")
        .in("consultant_id", profileIds),
      admin
        .from("assigned_documents")
        .select(
          "id, consultant_id, assignment_id, status, assigned_at, superseded_at, document_versions!inner(version_label, documents!inner(id, slug, title, category, sort_order))",
        )
        .in("consultant_id", profileIds)
        .order("assigned_at", { ascending: false }),
    ]);
    if (tasksResult.error) throw tasksResult.error;
    if (assignedDocumentsResult.error) throw assignedDocumentsResult.error;
    const tasks = tasksResult.data;
    const assignedDocuments = assignedDocumentsResult.data;

    const consultantRecordByUserId = new Map(
      (consultantRecords ?? []).map((consultant) => [
        consultant.user_id,
        consultant,
      ]),
    );
    const membershipByConsultantId = new Map<string, Record<string, unknown>>();
    for (const membership of memberships ?? []) {
      if (!membershipByConsultantId.has(membership.consultant_id))
        membershipByConsultantId.set(
          membership.consultant_id,
          membership as Record<string, unknown>,
        );
    }

    const consultants = (profiles ?? []).map((profile) => {
      const consultantRecord = consultantRecordByUserId.get(profile.id);
      const membership = consultantRecord
        ? membershipByConsultantId.get(consultantRecord.id)
        : undefined;
      const assignmentValue = membership?.assignments;
      const assignment = Array.isArray(assignmentValue)
        ? assignmentValue[0]
        : assignmentValue;
      const assignmentId =
        typeof membership?.assignment_id === "string"
          ? membership.assignment_id
          : "";
      const consultantTasks = (tasks ?? []).filter(
        (task) =>
          task.consultant_id === profile.id &&
          (!assignmentId || task.assignment_id === assignmentId),
      );
      const latestDocumentById = new Map<string, Record<string, unknown>>();
      for (const assignedDocument of assignedDocuments ?? []) {
        if (
          assignedDocument.consultant_id !== profile.id ||
          (assignmentId &&
            assignedDocument.assignment_id &&
            assignedDocument.assignment_id !== assignmentId)
        )
          continue;
        const version = Array.isArray(assignedDocument.document_versions)
          ? assignedDocument.document_versions[0]
          : assignedDocument.document_versions;
        const document = Array.isArray(version?.documents)
          ? version.documents[0]
          : version?.documents;
        if (document?.id && !latestDocumentById.has(document.id)) {
          latestDocumentById.set(document.id, {
            assigned_document_id: assignedDocument.id,
            document_id: document.id,
            slug: document.slug,
            title: document.title,
            category: document.category,
            sort_order: document.sort_order,
            status: assignedDocument.status,
            version_label: version?.version_label,
            selected:
              assignedDocument.status !== "superseded" &&
              !assignedDocument.superseded_at,
          });
        }
      }

      return {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        business_name: profile.business_name,
        access_status: profile.access_status,
        last_login_at: profile.last_login_at,
        assignment: assignment ?? null,
        onboarding_complete: consultantTasks.filter((task) => task.complete)
          .length,
        onboarding_total: consultantTasks.length,
        documents: [...latestDocumentById.values()].sort(
          (left, right) =>
            Number(left.sort_order ?? 0) - Number(right.sort_order ?? 0),
        ),
      };
    });

    return json(response, 200, { consultants });
  } catch (error) {
    return handleApiError(response, error);
  }
}
