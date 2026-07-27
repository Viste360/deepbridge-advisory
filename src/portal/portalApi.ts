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
  providerStatus?: string;
  sentAt?: string;
  consultantSignedAt?: string;
  completedAt?: string;
  finalScanStatus?: "pending" | "clean" | "infected" | "failed";
  certificateScanStatus?: "pending" | "clean" | "infected" | "failed";
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
  const result = (await response.json()) as T & { error?: string };
  if (!response.ok)
    throw new Error(result.error || "The secure request could not complete.");
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

async function authorisedRequest(path: string, body: Record<string, unknown>) {
  return post<{
    error?: string;
    url?: string;
    message?: string;
  }>(path, body);
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
      providerStatus: text(envelope.provider_status) || undefined,
      sentAt: displayDateTime(envelope.sent_at) || undefined,
      consultantSignedAt:
        displayDateTime(envelope.consultant_signed_at) || undefined,
      completedAt: displayDateTime(row.completed_at) || undefined,
      finalScanStatus: scanStatus(envelope.final_scan_status),
      certificateScanStatus: scanStatus(envelope.certificate_scan_status),
    };
  });
}

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
  kind: "final" | "certificate",
  file: File,
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
