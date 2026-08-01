import { createClient } from "@supabase/supabase-js";
import type {
  Assignment,
  AuditEvent,
  ComplianceRequirement,
  OnboardingTask,
  PortalDocument,
  PortalProfile,
  PortalSnapshot,
} from "./types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export interface PortalBrowserSession {
  user: { id: string; email: string };
  role: "consultant" | "admin";
}

export interface AdminDocumentCatalogueItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: "signature" | "acknowledgement" | "information";
  versions: Array<{
    id: string;
    versionLabel: string;
    scanStatus: "pending" | "clean" | "infected" | "failed";
    locked: boolean;
    assignmentId?: string;
    effectiveAt: string;
    createdAt: string;
    originalFilename: string;
    sizeBytes: number;
  }>;
}

export interface AdminDocumentCatalogue {
  documents: AdminDocumentCatalogueItem[];
  scannerConfigured: boolean;
}

export interface UploadProgress {
  phase: "preparing" | "uploading" | "finalising";
  percent: number;
  estimatedSecondsRemaining?: number;
}

export interface AdminOrganisation {
  id: string;
  legalName: string;
  tradingName: string;
  companyNumber: string;
  countryCode: string;
  relationshipTypes: string[];
  registeredAddress: string;
  website: string;
  taxNumber: string;
  notes: string;
  active: boolean;
}

export interface AdminContract {
  id: string;
  reference: string;
  title: string;
  contractType:
    | "client_services"
    | "consultant_supply"
    | "partnership"
    | "intercompany"
    | "nda"
    | "other";
  description: string;
  status: string;
  requiresSignature: boolean;
  effectiveDate: string;
  expiryDate: string;
  currency: string;
  contractValue?: number;
  assignmentId: string;
  owner: { id: string; name: string };
  counterparty: { id: string; name: string };
  parties: Array<{
    id: string;
    organisationId: string;
    role: string;
    signatoryName: string;
    signatoryEmail: string;
    signatureRequired: boolean;
    signingOrder: number;
  }>;
  versions: Array<{
    id: string;
    versionLabel: string;
    originalFilename: string;
    sizeBytes: number;
    scanStatus: "pending" | "clean" | "infected" | "failed";
    locked: boolean;
    driveSyncStatus: "not_configured" | "pending" | "synced" | "failed";
    finalScanStatus: "pending" | "clean" | "infected" | "failed";
    certificateScanStatus: "pending" | "clean" | "infected" | "failed";
    finalAvailable: boolean;
    certificateAvailable: boolean;
    signedAt: string;
    createdAt: string;
  }>;
}

export interface AdminSigningItem {
  id: string;
  consultantId: string;
  consultantName: string;
  consultantEmail: string;
  assignmentId: string;
  documentSlug: string;
  title: string;
  versionLabel: string;
  status: PortalDocument["status"];
  publicationReady: boolean;
  provider?: "google_workspace" | "manual_upload";
  providerStatus?: string;
  sentAt?: string;
  consultantSignedAt?: string;
  completedAt?: string;
  scanUpdatedAt?: string;
  finalScanStatus?: "pending" | "clean" | "infected" | "failed";
  certificateScanStatus?: "pending" | "clean" | "infected" | "failed";
  portalGenerated?: boolean;
  hasPreviousCompleted?: boolean;
}

export interface AdminConsultant {
  id: string;
  fullName: string;
  email: string;
  businessName: string;
  accessStatus: "invited" | "active" | "revoked";
  lastLoginAt?: string;
  assignment?: {
    id: string;
    title: string;
    location: string;
    startDate: string;
    status: string;
  };
  onboardingComplete: number;
  onboardingTotal: number;
  documents: Array<{
    assignedDocumentId: string;
    documentId: string;
    slug: string;
    title: string;
    category: "signature" | "acknowledgement" | "information";
    status: PortalDocument["status"];
    versionLabel: string;
    selected: boolean;
  }>;
}

export const portalDemoEnabled =
  import.meta.env.DEV && import.meta.env.VITE_PORTAL_DEMO_MODE !== "false";

export const portalConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const storageClient =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      })
    : null;

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function bool(value: unknown) {
  return value === true;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(record) : [];
}

function displayDate(value: unknown) {
  const raw = text(value);
  if (!raw) return "";
  const parsed = new Date(raw);
  return Number.isNaN(parsed.valueOf())
    ? raw
    : new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(parsed);
}

function displayDateTime(value: unknown) {
  const raw = text(value);
  if (!raw) return "";
  const parsed = new Date(raw);
  return Number.isNaN(parsed.valueOf())
    ? raw
    : new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(parsed);
}

async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
  });
  const responseText = await response.text();
  const result = (() => {
    if (!responseText) return null;
    try {
      return JSON.parse(responseText) as T & { error?: string };
    } catch {
      if (!response.ok) {
        throw new Error(
          response.status >= 500
            ? "The secure service encountered a temporary error. Please try again."
            : "The secure request could not complete.",
        );
      }
      throw new Error("The secure service returned an invalid response.");
    }
  })();
  if (!response.ok)
    throw new Error(
      result?.error || "The secure request could not complete.",
    );
  if (!result) throw new Error("The secure service returned an empty response.");
  return result;
}

async function post<T>(path: string, body: Record<string, unknown>) {
  return apiRequest<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getPortalSession(): Promise<PortalBrowserSession | null> {
  if (!portalConfigured) return null;
  const response = await fetch("/api/auth/session", {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  if (response.status === 401 || response.status === 403) return null;
  const result = (await response.json()) as {
    session?: PortalBrowserSession;
    error?: string;
  };
  if (!response.ok) throw new Error(result.error || "Session check failed.");
  return result.session ?? null;
}

export function onPortalSessionChange(
  listener: (session: PortalBrowserSession | null) => void,
) {
  void listener;
  return () => undefined;
}

export async function completeAuthCallback({
  code,
  tokenHash,
  type,
}: {
  code?: string;
  tokenHash?: string;
  type?: string;
}) {
  return post<{ authenticated: true }>("/api/auth/exchange", {
    code,
    tokenHash,
    type,
  });
}

export async function sendMagicLink(email: string) {
  if (!portalConfigured)
    throw new Error("Portal authentication is not configured.");
  return post<{ message: string }>("/api/auth/request-link", { email });
}

export async function signInWithGoogle() {
  if (!portalConfigured)
    throw new Error("Portal authentication is not configured.");
  window.location.assign("/api/auth/google");
}

export async function signOutPortal() {
  await post<{ signedOut: true }>("/api/auth/logout", {});
}

export async function loadPortalSnapshot(
  userId: string,
): Promise<PortalSnapshot> {
  void userId;
  const result = await apiRequest<{
    profile: unknown;
    assignment: unknown;
    documents: unknown;
    compliance: unknown;
    tasks: unknown;
    audit: unknown;
  }>("/api/portal/snapshot");

  const profileRow = record(result.profile);
  const assignmentRow = record(result.assignment);

  const profile: PortalProfile = {
    id: text(profileRow.id),
    email: text(profileRow.email),
    fullName: text(profileRow.full_name),
    businessName: text(profileRow.business_name),
    country: text(profileRow.country),
    phone: text(profileRow.phone),
    role: text(profileRow.role) === "admin" ? "admin" : "consultant",
  };

  const assignment: Assignment = {
    id: text(assignmentRow.id),
    title: text(assignmentRow.title),
    programme: text(assignmentRow.programme),
    customer: text(assignmentRow.customer_name),
    endCustomer: text(assignmentRow.end_customer_name),
    location: text(assignmentRow.primary_location),
    startDate: displayDate(assignmentRow.start_date),
    expectedEnd: text(assignmentRow.expected_end_display),
    onsiteExpectation: text(assignmentRow.onsite_expectation),
    dailyRate: text(assignmentRow.daily_rate_display),
    trialPeriod: text(assignmentRow.trial_period),
    notice: text(assignmentRow.notice_terms),
    accommodation: text(assignmentRow.accommodation_terms),
    travel: text(assignmentRow.travel_terms),
    commercialContact: {
      name: text(assignmentRow.contact_name),
      role: text(assignmentRow.contact_role),
      email: text(assignmentRow.contact_email),
    },
  };

  const documents: PortalDocument[] = records(result.documents).map((row) => ({
    id: text(row.id),
    title: text(row.title),
    description: text(row.description),
    category:
      text(row.category) === "signature"
        ? "signature"
        : text(row.category) === "acknowledgement"
          ? "acknowledgement"
          : "information",
    status: text(row.status, "not_reviewed") as PortalDocument["status"],
    version: text(row.version_label),
    updatedAt: displayDate(row.updated_at),
    completedAt: displayDate(row.completed_at) || undefined,
    certificateAvailable: bool(row.certificate_storage_path),
    storagePath: text(row.final_storage_path) || undefined,
  }));

  const compliance: ComplianceRequirement[] = records(result.compliance).map(
    (row) => ({
      id: text(row.id),
      consultantId: text(row.consultant_id) || undefined,
      consultantName: text(row.consultant_name) || undefined,
      consultantEmail: text(row.consultant_email) || undefined,
      title: text(row.title),
      description: text(row.description),
      status: text(
        row.status,
        "missing",
      ) as ComplianceRequirement["status"],
      required: bool(row.required),
      uploadedAt: displayDate(row.uploaded_at) || undefined,
      expiryDate: displayDate(row.expiry_date) || undefined,
      administratorNote: text(row.administrator_note) || undefined,
      rejectionReason: text(row.rejection_reason) || undefined,
      submissionId: text(row.submission_id) || undefined,
      originalFilename: text(row.original_filename) || undefined,
      mimeType: text(row.mime_type) || undefined,
      sizeBytes:
        typeof row.size_bytes === "number"
          ? row.size_bytes
          : typeof row.size_bytes === "string"
            ? Number(row.size_bytes)
            : undefined,
      scanStatus:
        text(row.malware_scan_status) === "clean"
          ? "clean"
          : text(row.malware_scan_status) === "infected"
            ? "infected"
            : text(row.malware_scan_status) === "failed"
              ? "failed"
              : row.submission_id
                ? "pending"
                : undefined,
    }),
  );

  const tasks: OnboardingTask[] = records(result.tasks).map((row) => ({
    id: text(row.id),
    title: text(row.title),
    description: text(row.description),
    complete: bool(row.complete),
    internal: bool(row.internal),
  }));

  const audit: AuditEvent[] = records(result.audit).map((row) => ({
    id: text(row.id),
    action: text(row.action).replaceAll("_", " "),
    actor: text(row.actor_label, "Portal user"),
    object: `${text(row.object_type)} ${text(row.object_id)}`.trim(),
    createdAt: displayDateTime(row.created_at),
  }));

  return { profile, assignment, documents, compliance, tasks, audit };
}

export async function acknowledgeDocument(documentId: string) {
  await post<{ acknowledged: true }>("/api/documents/acknowledge", {
    documentId,
  });
}

export async function uploadComplianceFile(
  requirementId: string,
  file: File,
  expiryDate?: string,
) {
  if (!storageClient) throw new Error("Portal storage is not configured.");
  const upload = await post<{ path: string; token: string }>(
    "/api/compliance/upload-url",
    {
      requirementId,
      originalFilename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    },
  );
  const { error } = await storageClient.storage
    .from("consultant-compliance")
    .uploadToSignedUrl(upload.path, upload.token, file, {
      contentType: file.type,
      upsert: false,
    });
  if (error) throw error;
  await post<{ submissionId: string }>(
    "/api/compliance/upload-finalize",
    {
      requirementId,
      storagePath: upload.path,
      originalFilename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      expiryDate: expiryDate || null,
    },
  );
}

export async function uploadComplianceFileAsAdmin(
  requirementId: string,
  file: File,
  expiryDate?: string,
) {
  if (!storageClient) throw new Error("Portal storage is not configured.");
  const upload = await post<{ path: string; token: string }>(
    "/api/admin/compliance/upload-url",
    {
      requirementId,
      originalFilename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    },
  );
  const { error } = await storageClient.storage
    .from("consultant-compliance")
    .uploadToSignedUrl(upload.path, upload.token, file, {
      contentType: file.type,
      upsert: false,
    });
  if (error) throw error;
  await post<{ submissionId: string }>(
    "/api/admin/compliance/upload-finalize",
    {
      requirementId,
      storagePath: upload.path,
      originalFilename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      expiryDate: expiryDate || null,
    },
  );
}

export async function getComplianceSubmissionAccess(submissionId: string) {
  return authorisedRequest("/api/admin/compliance/access", { submissionId });
}

export async function reviewComplianceSubmission(
  submissionId: string,
  status: "accepted" | "rejected",
  note: string,
) {
  await post<{ reviewed: true }>("/api/compliance/review", {
    submissionId,
    status,
    note,
  });
}

async function authorisedRequest<
  T extends Record<string, unknown> = {
    error?: string;
    url?: string;
    message?: string;
  },
>(path: string, body: Record<string, unknown>) {
  return post<T>(path, body);
}

export async function getDocumentAccess(
  documentId: string,
  kind: "source" | "final" | "certificate",
) {
  return authorisedRequest("/api/documents/access", { documentId, kind });
}

export async function createInvitation(input: {
  fullName: string;
  email: string;
  businessName: string;
}) {
  return authorisedRequest("/api/invitations/create", input);
}

export async function updateAdminConsultant(input: {
  consultantId: string;
  fullName: string;
  businessName: string;
  email: string;
  includedDocumentIds: string[];
}) {
  return authorisedRequest<{
    updated: true;
    retainedCompletedDocuments: string[];
  }>("/api/admin/consultants/update", input);
}

export async function sendConsultantPortalLink(input: {
  consultantId: string;
  message: string;
}) {
  return authorisedRequest<{ message: string }>(
    "/api/admin/consultants/send-portal-link",
    input,
  );
}

export async function uploadManualSignedDocument(input: {
  assignedDocumentId: string;
  file: File;
}) {
  if (!storageClient) throw new Error("Portal storage is not configured.");
  if (input.file.type !== "application/pdf")
    throw new Error("Only PDF documents are accepted.");
  if (input.file.size > 25 * 1024 * 1024)
    throw new Error("The maximum PDF size is 25 MB.");
  const upload = await post<{ path: string; token: string }>(
    "/api/documents/manual-signing/upload-url",
    {
      assignedDocumentId: input.assignedDocumentId,
      mimeType: input.file.type,
      sizeBytes: input.file.size,
    },
  );
  const { error } = await storageClient.storage
    .from("signed-documents")
    .uploadToSignedUrl(upload.path, upload.token, input.file, {
      contentType: "application/pdf",
      upsert: false,
    });
  if (error) throw error;
  return post<{ envelopeId: string; status: string }>(
    "/api/documents/manual-signing/upload-finalize",
    {
      assignedDocumentId: input.assignedDocumentId,
      storagePath: upload.path,
      originalFilename: input.file.name,
      mimeType: input.file.type,
      sizeBytes: input.file.size,
      contentSha256: await sha256(input.file),
    },
  );
}

export async function listAdminConsultants(): Promise<AdminConsultant[]> {
  const result = await apiRequest<{ consultants: unknown }>(
    "/api/admin/consultants/list",
  );
  return records(result.consultants).map((row) => {
    const assignment = record(row.assignment);
    return {
      id: text(row.id),
      fullName: text(row.full_name),
      email: text(row.email),
      businessName: text(row.business_name),
      accessStatus: text(
        row.access_status,
        "invited",
      ) as AdminConsultant["accessStatus"],
      lastLoginAt: displayDateTime(row.last_login_at) || undefined,
      assignment: text(assignment.id)
        ? {
            id: text(assignment.id),
            title: text(assignment.title),
            location: text(assignment.primary_location),
            startDate: displayDate(assignment.start_date),
            status: text(assignment.status),
          }
        : undefined,
      onboardingComplete: Number(row.onboarding_complete) || 0,
      onboardingTotal: Number(row.onboarding_total) || 0,
      documents: records(row.documents).map((document) => ({
        assignedDocumentId: text(document.assigned_document_id),
        documentId: text(document.document_id),
        slug: text(document.slug),
        title: text(document.title),
        category: text(
          document.category,
          "information",
        ) as AdminConsultant["documents"][number]["category"],
        status: text(
          document.status,
          "not_reviewed",
        ) as AdminConsultant["documents"][number]["status"],
        versionLabel: text(document.version_label),
        selected: bool(document.selected),
      })),
    };
  });
}

export async function listAdminDocumentCatalogue(): Promise<AdminDocumentCatalogue> {
  const result = await apiRequest<{
    documents: unknown;
    scannerConfigured?: boolean;
  }>(
    "/api/admin/documents/catalogue",
  );
  return {
    scannerConfigured: result.scannerConfigured === true,
    documents: records(result.documents).map((row) => ({
      id: text(row.id),
      slug: text(row.slug),
      title: text(row.title),
      description: text(row.description),
      category:
        text(row.category) === "signature"
          ? "signature"
          : text(row.category) === "acknowledgement"
            ? "acknowledgement"
            : "information",
      versions: records(row.document_versions).map((version) => ({
        id: text(version.id),
        versionLabel: text(version.version_label),
        scanStatus: text(
          version.malware_scan_status,
          "pending",
        ) as AdminDocumentCatalogueItem["versions"][number]["scanStatus"],
        locked: Boolean(version.locked_at),
        assignmentId: text(version.assignment_id) || undefined,
        effectiveAt: displayDate(version.effective_at),
        createdAt: text(version.created_at),
        originalFilename: text(version.original_filename),
        sizeBytes:
          typeof version.size_bytes === "number"
            ? version.size_bytes
            : Number(version.size_bytes) || 0,
      })),
    })),
  };
}

export async function listAdminOrganisations(): Promise<
  AdminOrganisation[]
> {
  const result = await apiRequest<{ organisations: unknown }>(
    "/api/admin/organisations/list",
  );
  return records(result.organisations).map((row) => ({
    id: text(row.id),
    legalName: text(row.legal_name),
    tradingName: text(row.trading_name),
    companyNumber: text(row.company_number),
    countryCode: text(row.country_code),
    relationshipTypes: Array.isArray(row.relationship_types)
      ? row.relationship_types.filter(
          (value): value is string => typeof value === "string",
        )
      : [],
    registeredAddress: text(row.registered_address),
    website: text(row.website),
    taxNumber: text(row.tax_number),
    notes: text(row.notes),
    active: row.active !== false,
  }));
}

export async function saveAdminOrganisation(input: {
  organisationId?: string;
  legalName: string;
  tradingName: string;
  companyNumber: string;
  countryCode: string;
  relationshipTypes: string[];
  registeredAddress: string;
  website: string;
  taxNumber: string;
  notes: string;
  active: boolean;
}) {
  return post<{ organisationId: string }>(
    "/api/admin/organisations/save",
    input,
  );
}

export async function listAdminContracts(): Promise<{
  contracts: AdminContract[];
  driveConfigured: boolean;
}> {
  const result = await apiRequest<{
    contracts: unknown;
    driveConfigured?: boolean;
  }>("/api/admin/contracts/list");
  return {
    driveConfigured: result.driveConfigured === true,
    contracts: records(result.contracts).map((row) => {
      const owner = record(row.owner);
      const counterparty = record(row.counterparty);
      return {
        id: text(row.id),
        reference: text(row.reference),
        title: text(row.title),
        contractType: text(row.contract_type, "other") as AdminContract["contractType"],
        description: text(row.description),
        status: text(row.status),
        requiresSignature: row.requires_signature !== false,
        effectiveDate: displayDate(row.effective_date),
        expiryDate: displayDate(row.expiry_date),
        currency: text(row.currency),
        contractValue:
          typeof row.contract_value === "number"
            ? row.contract_value
            : undefined,
        assignmentId: text(row.assignment_id),
        owner: {
          id: text(owner.id),
          name: text(owner.trading_name) || text(owner.legal_name),
        },
        counterparty: {
          id: text(counterparty.id),
          name:
            text(counterparty.trading_name) ||
            text(counterparty.legal_name),
        },
        parties: records(row.contract_parties).map((party) => ({
          id: text(party.id),
          organisationId: text(party.organisation_id),
          role: text(party.party_role),
          signatoryName: text(party.signatory_name),
          signatoryEmail: text(party.signatory_email),
          signatureRequired: party.signature_required !== false,
          signingOrder: Number(party.signing_order) || 1,
        })),
        versions: records(row.contract_versions).map((version) => ({
          id: text(version.id),
          versionLabel: text(version.version_label),
          originalFilename: text(version.original_filename),
          sizeBytes: Number(version.size_bytes) || 0,
          scanStatus: text(
            version.malware_scan_status,
            "pending",
          ) as AdminContract["versions"][number]["scanStatus"],
          locked: Boolean(version.locked_at),
          driveSyncStatus: text(
            version.drive_sync_status,
            "not_configured",
          ) as AdminContract["versions"][number]["driveSyncStatus"],
          finalScanStatus: text(
            version.final_scan_status,
            "pending",
          ) as AdminContract["versions"][number]["finalScanStatus"],
          certificateScanStatus: text(
            version.certificate_scan_status,
            "pending",
          ) as AdminContract["versions"][number]["certificateScanStatus"],
          finalAvailable: Boolean(version.final_storage_path),
          certificateAvailable: Boolean(version.certificate_storage_path),
          signedAt: displayDateTime(version.signed_at),
          createdAt: text(version.created_at),
        })),
      };
    }),
  };
}

export async function uploadAdminContract(input: {
  contractId?: string;
  reference: string;
  title: string;
  contractType: AdminContract["contractType"];
  ownerOrganisationId: string;
  counterpartyOrganisationId: string;
  assignmentId?: string;
  description: string;
  versionLabel: string;
  requiresSignature: boolean;
  effectiveDate: string;
  expiryDate: string;
  currency: string;
  contractValue?: number;
  ownerSignatoryName: string;
  ownerSignatoryEmail: string;
  counterpartySignatoryName: string;
  counterpartySignatoryEmail: string;
  file: File;
  onProgress?: (progress: UploadProgress) => void;
}) {
  if (!storageClient)
    throw new Error("Portal storage is not configured.");
  if (input.file.type !== "application/pdf")
    throw new Error("Only PDF contracts are accepted.");
  if (input.file.size > 25 * 1024 * 1024)
    throw new Error("The maximum contract size is 25 MB.");
  input.onProgress?.({ phase: "preparing", percent: 0 });
  const contentSha256 = await sha256(input.file);
  const upload = await post<{ path: string; token: string }>(
    "/api/admin/contracts/upload-url",
    { mimeType: input.file.type, sizeBytes: input.file.size },
  );
  await uploadSignedStorageFile({
    bucket: "contract-documents",
    path: upload.path,
    token: upload.token,
    file: input.file,
    onProgress: input.onProgress,
  });
  input.onProgress?.({ phase: "finalising", percent: 100 });
  return post<{ contractId: string; versionId: string; status: string }>(
    "/api/admin/contracts/upload-finalize",
    {
      ...input,
      file: undefined,
      onProgress: undefined,
      storagePath: upload.path,
      originalFilename: input.file.name,
      mimeType: input.file.type,
      sizeBytes: input.file.size,
      contentSha256,
    },
  );
}

export async function uploadAdminContractSignedPack(input: {
  contractId: string;
  versionId: string;
  finalPdf: File;
  certificatePdf: File;
  onProgress?: (progress: UploadProgress) => void;
}) {
  if (!storageClient)
    throw new Error("Portal storage is not configured.");
  const upload = await post<{
    final: { path: string; token: string };
    certificate: { path: string; token: string };
  }>("/api/admin/contracts/signing-upload-url", {
    contractId: input.contractId,
    versionId: input.versionId,
    finalMimeType: input.finalPdf.type,
    finalSizeBytes: input.finalPdf.size,
    certificateMimeType: input.certificatePdf.type,
    certificateSizeBytes: input.certificatePdf.size,
  });
  input.onProgress?.({ phase: "preparing", percent: 0 });
  await uploadSignedStorageFile({
    bucket: "contract-documents",
    path: upload.final.path,
    token: upload.final.token,
    file: input.finalPdf,
    progressStart: 0,
    progressShare: 50,
    onProgress: input.onProgress,
  });
  await uploadSignedStorageFile({
    bucket: "contract-documents",
    path: upload.certificate.path,
    token: upload.certificate.token,
    file: input.certificatePdf,
    progressStart: 50,
    progressShare: 50,
    onProgress: input.onProgress,
  });
  input.onProgress?.({ phase: "finalising", percent: 100 });
  return post<{ status: string }>(
    "/api/admin/contracts/signing-upload-finalize",
    {
      contractId: input.contractId,
      versionId: input.versionId,
      finalPath: upload.final.path,
      certificatePath: upload.certificate.path,
    },
  );
}

async function uploadSignedStorageFile(input: {
  bucket: string;
  path: string;
  token: string;
  file: File;
  progressStart?: number;
  progressShare?: number;
  onProgress?: (progress: UploadProgress) => void;
}) {
  if (!supabaseUrl || !supabaseAnonKey)
    throw new Error("Portal storage is not configured.");
  const encodedPath = input.path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  const uploadUrl = new URL(
    `${supabaseUrl}/storage/v1/object/upload/sign/${encodeURIComponent(input.bucket)}/${encodedPath}`,
  );
  uploadUrl.searchParams.set("token", input.token);
  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    const startedAt = performance.now();
    request.open("PUT", uploadUrl.toString());
    request.setRequestHeader("apikey", supabaseAnonKey);
    request.setRequestHeader("Authorization", `Bearer ${supabaseAnonKey}`);
    request.setRequestHeader("x-upsert", "false");
    request.upload.addEventListener("progress", (event) => {
      const total = event.lengthComputable ? event.total : input.file.size;
      const elapsedSeconds = Math.max(
        (performance.now() - startedAt) / 1000,
        0.1,
      );
      const bytesPerSecond = event.loaded / elapsedSeconds;
      const estimatedSecondsRemaining =
        bytesPerSecond > 0
          ? Math.max(0, Math.ceil((total - event.loaded) / bytesPerSecond))
          : undefined;
      const localPercent = Math.min(
        99,
        Math.round((event.loaded / total) * 100),
      );
      const overallPercent = Math.round(
        (input.progressStart ?? 0) +
          localPercent * ((input.progressShare ?? 100) / 100),
      );
      input.onProgress?.({
        phase: "uploading",
        percent: overallPercent,
        estimatedSecondsRemaining,
      });
    });
    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else {
        let message = "The private upload could not be completed.";
        try {
          const result = JSON.parse(request.responseText) as {
            message?: string;
            error?: string;
          };
          message = result.message || result.error || message;
        } catch {
          // Supabase may return a non-JSON gateway error.
        }
        reject(new Error(message));
      }
    });
    request.addEventListener("error", () =>
      reject(new Error("The private upload connection was interrupted.")),
    );
    const form = new FormData();
    form.append("cacheControl", "3600");
    form.append("", input.file);
    request.send(form);
  });
}

export async function getAdminContractAccess(
  versionId: string,
  kind: "source" | "final" | "certificate",
) {
  return post<{ url: string }>("/api/admin/contracts/access", {
    versionId,
    kind,
  });
}

export async function updateAdminContractStatus(
  contractId: string,
  status: string,
) {
  return post<{ updated: true }>("/api/admin/contracts/update-status", {
    contractId,
    status,
  });
}

export async function removeAdminContractVersion(versionId: string) {
  return post<{ removed: true }>("/api/admin/contracts/remove-version", {
    versionId,
  });
}

export async function retryAdminContractDriveArchive(versionId: string) {
  return post<{ synced: boolean; copiedFiles: number }>(
    "/api/admin/contracts/retry-drive",
    { versionId },
  );
}

async function sha256(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function uploadAdminDocumentVersion(input: {
  documentId: string;
  assignmentId: string;
  versionLabel: string;
  file: File;
  onProgress?: (progress: UploadProgress) => void;
}) {
  if (!storageClient || !supabaseUrl || !supabaseAnonKey)
    throw new Error("Portal storage is not configured.");
  if (input.file.type !== "application/pdf")
    throw new Error("Only PDF documents are accepted.");
  if (input.file.size > 25 * 1024 * 1024)
    throw new Error("The maximum document size is 25 MB.");

  input.onProgress?.({ phase: "preparing", percent: 0 });
  const contentSha256 = await sha256(input.file);
  const upload = await post<{ path: string; token: string }>(
    "/api/admin/documents/upload-url",
    {
      documentId: input.documentId,
      mimeType: input.file.type,
      sizeBytes: input.file.size,
    },
  );

  const encodedPath = upload.path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  const uploadUrl = new URL(
    `${supabaseUrl}/storage/v1/object/upload/sign/portal-documents/${encodedPath}`,
  );
  uploadUrl.searchParams.set("token", upload.token);
  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    const startedAt = performance.now();
    request.open("PUT", uploadUrl.toString());
    request.setRequestHeader("apikey", supabaseAnonKey);
    request.setRequestHeader("Authorization", `Bearer ${supabaseAnonKey}`);
    request.setRequestHeader("x-upsert", "false");
    request.upload.addEventListener("progress", (event) => {
      const total = event.lengthComputable ? event.total : input.file.size;
      const elapsedSeconds = Math.max(
        (performance.now() - startedAt) / 1000,
        0.1,
      );
      const bytesPerSecond = event.loaded / elapsedSeconds;
      const estimatedSecondsRemaining =
        bytesPerSecond > 0
          ? Math.max(0, Math.ceil((total - event.loaded) / bytesPerSecond))
          : undefined;
      input.onProgress?.({
        phase: "uploading",
        percent: Math.min(99, Math.round((event.loaded / total) * 100)),
        estimatedSecondsRemaining,
      });
    });
    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else {
        let message = "The private upload could not be completed.";
        try {
          const result = JSON.parse(request.responseText) as {
            message?: string;
            error?: string;
          };
          message = result.message || result.error || message;
        } catch {
          // Supabase may return a non-JSON gateway error.
        }
        reject(new Error(message));
      }
    });
    request.addEventListener("error", () =>
      reject(new Error("The private upload connection was interrupted.")),
    );
    const form = new FormData();
    form.append("cacheControl", "3600");
    form.append("", input.file);
    request.send(form);
  });

  input.onProgress?.({ phase: "finalising", percent: 100 });
  return post<{ versionId: string; status: string }>(
    "/api/admin/documents/upload-finalize",
    {
      documentId: input.documentId,
      assignmentId: input.assignmentId,
      storagePath: upload.path,
      versionLabel: input.versionLabel,
      originalFilename: input.file.name,
      mimeType: input.file.type,
      sizeBytes: input.file.size,
      contentSha256,
    },
  );
}

export async function removeAdminDocumentVersion(versionId: string) {
  return post<{ removed: true }>("/api/admin/documents/remove-version", {
    versionId,
  });
}

export async function listAdminSigningItems(): Promise<AdminSigningItem[]> {
  const result = await apiRequest<{ items: unknown }>(
    "/api/admin/signing/catalogue",
  );
  return records(result.items).map((row) => {
    const consultant = record(row.consultant);
    const document = record(row.document);
    const envelope = record(row.envelope);
    const scanStatus = (
      value: unknown,
    ): AdminSigningItem["finalScanStatus"] => {
      const status = text(value);
      return status === "pending" ||
        status === "clean" ||
        status === "infected" ||
        status === "failed"
        ? status
        : undefined;
    };
    return {
      id: text(row.id),
      consultantId: text(row.consultant_id),
      consultantName: text(consultant.full_name),
      consultantEmail: text(consultant.email),
      assignmentId: text(row.assignment_id),
      documentSlug: text(document.slug),
      title: text(document.title),
      versionLabel: text(row.version_label),
      status: text(row.status, "not_reviewed") as PortalDocument["status"],
      publicationReady: bool(row.publication_ready),
      provider:
        text(envelope.provider) === "manual_upload"
          ? "manual_upload"
          : text(envelope.provider) === "google_workspace"
            ? "google_workspace"
            : undefined,
      providerStatus: text(envelope.provider_status) || undefined,
      sentAt: displayDateTime(envelope.sent_at) || undefined,
      consultantSignedAt:
        displayDateTime(envelope.consultant_signed_at) || undefined,
      completedAt: displayDateTime(row.completed_at) || undefined,
      scanUpdatedAt: text(envelope.updated_at) || undefined,
      finalScanStatus: scanStatus(envelope.final_scan_status),
      certificateScanStatus: scanStatus(envelope.certificate_scan_status),
      portalGenerated: bool(envelope.portal_generated),
      hasPreviousCompleted: bool(envelope.has_previous_completed),
    };
  });
}

export async function getConsultantSignedUpload(
  assignedDocumentId: string,
) {
  return authorisedRequest<{ url?: string }>("/api/admin/signing/consultant-upload", {
    assignedDocumentId,
  });
}

export type ManualPdfPlacement = {
  pageIndex: number;
  signature: { x: number; y: number; size: number };
  date: { x: number; y: number; size: number };
};

export async function recordGoogleSigningStep(
  assignedDocumentId: string,
  action: "request_sent" | "consultant_signed",
) {
  await post<{ updated: true }>("/api/admin/signing/update", {
    assignedDocumentId,
    action,
  });
}

async function uploadSigningArtifact(
  assignedDocumentId: string,
  kind: "final" | "certificate" | "countersign_source",
  file: File,
  reissue = false,
) {
  if (!storageClient) throw new Error("Portal storage is not configured.");
  if (file.type !== "application/pdf")
    throw new Error("Only PDF documents are accepted.");
  if (file.size > 25 * 1024 * 1024)
    throw new Error("The maximum PDF size is 25 MB.");
  const upload = await post<{ path: string; token: string }>(
    "/api/admin/signing/upload-url",
    {
      assignedDocumentId,
      kind,
      reissue,
      mimeType: file.type,
      sizeBytes: file.size,
    },
  );
  const { error } = await storageClient.storage
    .from("signed-documents")
    .uploadToSignedUrl(upload.path, upload.token, file, {
      contentType: "application/pdf",
      upsert: false,
    });
  if (error) throw error;
  return { path: upload.path, sha256: await sha256(file) };
}

export async function prepareCountersignSource(input: {
  assignedDocumentId: string;
  consultantSignedPdf: File;
  reissue?: boolean;
}) {
  const source = await uploadSigningArtifact(
    input.assignedDocumentId,
    "countersign_source",
    input.consultantSignedPdf,
    input.reissue === true,
  );
  return post<{ envelopeId: string; status: string }>(
    "/api/admin/signing/countersign-source",
    {
      assignedDocumentId: input.assignedDocumentId,
      sourcePath: source.path,
      sourceSha256: source.sha256,
      reissue: input.reissue === true,
    },
  );
}

export async function createPortalCountersignature(input: {
  assignedDocumentId: string;
  signerName: string;
  signerTitle: string;
  signatureImageDataUrl: string;
  confirmed: boolean;
  placement?: ManualPdfPlacement;
}) {
  return post<{
    envelopeId: string;
    status: string;
    downloadAvailable?: boolean;
  }>(
    "/api/admin/signing/countersign",
    input,
  );
}

export async function retrySigningSecurityScan(assignedDocumentId: string) {
  return post<{
    envelopeId: string;
    status: string;
    downloadAvailable?: boolean;
  }>(
    "/api/admin/signing/retry-scan",
    { assignedDocumentId },
  );
}

export async function discardSigningAttempt(assignedDocumentId: string) {
  return post<{
    discarded: true;
    previousCopyRestored: boolean;
    resetForRetry: boolean;
  }>(
    "/api/admin/signing/discard-attempt",
    { assignedDocumentId },
  );
}

export async function uploadCompletedSigningPack(input: {
  assignedDocumentId: string;
  completedPdf: File;
  auditTrailPdf: File;
}) {
  const [completed, certificate] = await Promise.all([
    uploadSigningArtifact(
      input.assignedDocumentId,
      "final",
      input.completedPdf,
    ),
    uploadSigningArtifact(
      input.assignedDocumentId,
      "certificate",
      input.auditTrailPdf,
    ),
  ]);
  return post<{ envelopeId: string; status: string }>(
    "/api/admin/signing/upload-finalize",
    {
      assignedDocumentId: input.assignedDocumentId,
      finalPath: completed.path,
      certificatePath: certificate.path,
      finalSha256: completed.sha256,
      certificateSha256: certificate.sha256,
    },
  );
}
