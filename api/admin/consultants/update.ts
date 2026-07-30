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

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
      "consultant_profile_update",
      20,
      3_600,
    );
    const body = await readJsonBody(request);
    const consultantId = cleanText(body.consultantId, 36);
    const fullName = cleanText(body.fullName, 160);
    const businessName = cleanText(body.businessName, 200);
    const email = cleanText(body.email, 254).toLowerCase();
    const includedDocumentIds = [
      ...new Set(
        (Array.isArray(body.includedDocumentIds)
          ? body.includedDocumentIds
          : []
        )
          .map((value) => cleanText(value, 36))
          .filter((value) => uuidPattern.test(value)),
      ),
    ].slice(0, 100);

    if (!uuidPattern.test(consultantId))
      throw new PortalHttpError(400, "A valid consultant is required.");
    if (fullName.length < 2 || businessName.length < 2)
      throw new PortalHttpError(
        400,
        "The consultant name and business name are required.",
      );
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new PortalHttpError(400, "A valid consultant email is required.");

    const admin = getSupabaseAdmin();
    const { data: profile, error: profileError } = await admin
      .from("portal_profiles")
      .select("id, email, full_name, business_name, role")
      .eq("id", consultantId)
      .single();
    if (profileError || !profile || profile.role !== "consultant")
      throw new PortalHttpError(404, "Consultant record not found.");

    const { data: consultant, error: consultantError } = await admin
      .from("consultants")
      .select("id")
      .eq("user_id", consultantId)
      .single();
    if (consultantError || !consultant)
      throw new PortalHttpError(404, "Consultant business record not found.");

    const { data: membership, error: membershipError } = await admin
      .from("assignment_consultants")
      .select("assignment_id")
      .eq("consultant_id", consultant.id)
      .is("removed_at", null)
      .order("assigned_at", { ascending: false })
      .limit(1)
      .single();
    if (membershipError || !membership)
      throw new PortalHttpError(
        409,
        "Assign the consultant to an engagement before selecting documents.",
      );

    const assignmentId = membership.assignment_id;
    const [{ data: documents, error: documentsError }, existingResult] =
      await Promise.all([
        admin
          .from("documents")
          .select("id, slug, title")
          .order("sort_order"),
        admin
          .from("assigned_documents")
          .select(
            "id, status, superseded_at, document_version_id, document_versions!inner(document_id)",
          )
          .eq("consultant_id", consultantId)
          .eq("assignment_id", assignmentId)
          .order("assigned_at", { ascending: false }),
      ]);
    if (documentsError) throw documentsError;
    if (existingResult.error) throw existingResult.error;

    const documentById = new Map(
      (documents ?? []).map((document) => [document.id, document]),
    );
    if (
      includedDocumentIds.some((documentId) => !documentById.has(documentId))
    ) {
      throw new PortalHttpError(
        400,
        "One or more selected documents are not available.",
      );
    }

    const versionByDocumentId = new Map<
      string,
      { id: string; document_id: string }
    >();
    if (includedDocumentIds.length) {
      const { data: versions, error: versionsError } = await admin
        .from("document_versions")
        .select("id, document_id, assignment_id, effective_at")
        .in("document_id", includedDocumentIds)
        .eq("malware_scan_status", "clean")
        .not("locked_at", "is", null)
        .is("superseded_at", null)
        .or(`assignment_id.is.null,assignment_id.eq.${assignmentId}`)
        .order("effective_at", { ascending: false });
      if (versionsError) throw versionsError;
      for (const version of versions ?? []) {
        if (!versionByDocumentId.has(version.document_id))
          versionByDocumentId.set(version.document_id, version);
      }
      const unpublished = includedDocumentIds
        .filter((documentId) => !versionByDocumentId.has(documentId))
        .map((documentId) => documentById.get(documentId)?.title)
        .filter(Boolean);
      if (unpublished.length) {
        throw new PortalHttpError(
          409,
          `Publish and security-check these documents first: ${unpublished.join(", ")}.`,
        );
      }
    }

    const activeByDocumentId = new Map<
      string,
      {
        id: string;
        status: string;
        document_version_id: string;
      }
    >();
    for (const assignedDocument of existingResult.data ?? []) {
      const version = Array.isArray(assignedDocument.document_versions)
        ? assignedDocument.document_versions[0]
        : assignedDocument.document_versions;
      if (
        version?.document_id &&
        assignedDocument.status !== "superseded" &&
        !assignedDocument.superseded_at &&
        !activeByDocumentId.has(version.document_id)
      ) {
        activeByDocumentId.set(version.document_id, assignedDocument);
      }
    }

    const requested = new Set(includedDocumentIds);
    const retainedCompletedDocuments: string[] = [];
    const effectiveIncluded = new Set(includedDocumentIds);
    const now = new Date().toISOString();

    for (const [documentId, assignedDocument] of activeByDocumentId) {
      if (requested.has(documentId)) continue;
      if (assignedDocument.status === "completed") {
        retainedCompletedDocuments.push(
          documentById.get(documentId)?.title ?? documentId,
        );
        effectiveIncluded.add(documentId);
        continue;
      }
      const { error } = await admin
        .from("assigned_documents")
        .update({ status: "superseded", superseded_at: now })
        .eq("id", assignedDocument.id);
      if (error) throw error;
    }

    for (const documentId of includedDocumentIds) {
      const active = activeByDocumentId.get(documentId);
      if (active) continue;
      const version = versionByDocumentId.get(documentId);
      if (!version) continue;
      const { error } = await admin.from("assigned_documents").upsert(
        {
          consultant_id: consultantId,
          assignment_id: assignmentId,
          document_version_id: version.id,
          status: "not_reviewed",
          assigned_at: now,
          superseded_at: null,
        },
        {
          onConflict: "consultant_id,assignment_id,document_version_id",
        },
      );
      if (error) throw error;
    }

    const taskByDocumentSlug: Record<string, string> = {
      framework: "agreement",
      "sow-planning-cluster-lead": "sow",
      charter: "charter",
    };
    for (const document of documents ?? []) {
      const taskKey = taskByDocumentSlug[document.slug];
      if (!taskKey) continue;
      const { error } = await admin
        .from("onboarding_tasks")
        .update({ internal: !effectiveIncluded.has(document.id) })
        .eq("consultant_id", consultantId)
        .eq("assignment_id", assignmentId)
        .eq("task_key", taskKey);
      if (error) throw error;
    }

    const emailChanged = profile.email.toLowerCase() !== email;
    const { data: authUser, error: authUserError } =
      await admin.auth.admin.getUserById(consultantId);
    if (authUserError || !authUser.user)
      throw authUserError || new Error("Consultant login record not found.");
    const { error: authUpdateError } = await admin.auth.admin.updateUserById(
      consultantId,
      {
        ...(emailChanged ? { email, email_confirm: true } : {}),
        user_metadata: {
          ...authUser.user.user_metadata,
          full_name: fullName,
          business_name: businessName,
        },
      },
    );
    if (authUpdateError) throw authUpdateError;

    const { error: profileUpdateError } = await admin
      .from("portal_profiles")
      .update({
        email,
        full_name: fullName,
        business_name: businessName,
        ...(emailChanged ? { email_verified_at: now } : {}),
        updated_at: now,
      })
      .eq("id", consultantId);
    if (profileUpdateError) throw profileUpdateError;

    const { error: businessUpdateError } = await admin
      .from("consultants")
      .update({
        legal_name: fullName,
        business_name: businessName,
        updated_at: now,
      })
      .eq("id", consultant.id);
    if (businessUpdateError) throw businessUpdateError;

    if (emailChanged) {
      const { error: invitationUpdateError } = await admin
        .from("portal_invitations")
        .update({
          email,
          full_name: fullName,
          business_name: businessName,
        })
        .ilike("email", profile.email);
      if (invitationUpdateError) throw invitationUpdateError;
    }

    await admin.from("audit_events").insert({
      actor_id: actor.user.id,
      actor_label: actor.profile.full_name,
      action: "consultant_profile_and_document_package_updated",
      object_type: "consultant",
      object_id: consultantId,
      assignment_id: assignmentId,
      consultant_id: consultantId,
      ...requestContext(request),
      metadata: {
        previous_email: profile.email,
        email,
        email_changed: emailChanged,
        included_document_ids: [...effectiveIncluded],
        retained_completed_documents: retainedCompletedDocuments,
      },
    });

    return json(response, 200, {
      updated: true,
      retainedCompletedDocuments,
    });
  } catch (error) {
    return handleApiError(response, error);
  }
}
