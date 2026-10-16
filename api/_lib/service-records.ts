import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PortalHttpError } from "./server.js";

export const serviceRecordBucket = "supplier-service-records";
export const serviceRecordMaxBytes = 10 * 1024 * 1024;
export const serviceRecordSelection = "id, consultant_id, assignment_id, period_start, period_end, summary, invoice_reference, original_filename, mime_type, size_bytes, storage_path, content_sha256, status, scan_status, submitted_at, scanned_at, created_at, consultant:portal_profiles!supplier_service_records_consultant_id_fkey(full_name), assignment:assignments!supplier_service_records_assignment_id_fkey(title, programme)";

export interface ServiceRecordRow {
  id: string;
  consultant_id: string;
  assignment_id: string;
  period_start: string;
  period_end: string;
  summary: string;
  invoice_reference: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  content_sha256: string | null;
  status: "uploading" | "submitted";
  scan_status: "pending" | "clean" | "infected" | "failed";
  submitted_at: string | null;
  scanned_at: string | null;
  created_at: string;
  consultant?: { full_name: string } | { full_name: string }[] | null;
  assignment?: { title: string; programme: string } | { title: string; programme: string }[] | null;
}

export function requireServiceRecordId(value: unknown) {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))
    throw new PortalHttpError(400, "Select a valid service record or project.");
  return value;
}

function dateValue(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new PortalHttpError(400, "Choose valid service period dates.");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.getUTCFullYear() < 1 || date.toISOString().slice(0, 10) !== value)
    throw new PortalHttpError(400, "Choose valid service period dates.");
  return value;
}

function optionalText(value: unknown, maximum: number, label: string) {
  if (value == null) return "";
  if (typeof value !== "string" || value.trim().length > maximum)
    throw new PortalHttpError(400, `Keep ${label} within ${maximum.toLocaleString("en-GB")} characters.`);
  return value.trim();
}

export function validateServiceRecordUpload(body: Record<string, unknown>) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new PortalHttpError(400, "Provide a service record to upload.");
  const assignmentId = requireServiceRecordId(body.assignmentId);
  const periodStart = dateValue(body.periodStart);
  const periodEnd = dateValue(body.periodEnd);
  if (periodEnd < periodStart)
    throw new PortalHttpError(400, "The service period must end on or after its start date.");
  const originalFilename = typeof body.originalFilename === "string" ? body.originalFilename.trim() : "";
  const unsafeFilename = [...originalFilename].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127 || character === "/" || character === "\\");
  if (!originalFilename || originalFilename.length > 240 || unsafeFilename || !originalFilename.toLowerCase().endsWith(".pdf") || body.mimeType !== "application/pdf")
    throw new PortalHttpError(400, "Upload your service record as a PDF file.");
  if (typeof body.sizeBytes !== "number" || !Number.isInteger(body.sizeBytes) || body.sizeBytes <= 0 || body.sizeBytes > serviceRecordMaxBytes)
    throw new PortalHttpError(400, "The maximum PDF size is 10 MB.");
  return {
    assignmentId, periodStart, periodEnd, originalFilename,
    mimeType: "application/pdf", sizeBytes: body.sizeBytes,
    summary: optionalText(body.summary, 2000, "the service summary"),
    invoiceReference: optionalText(body.invoiceReference, 120, "the invoice reference"),
  };
}

export async function requireServiceRecordAssignment(client: SupabaseClient, userId: string, assignmentId: string) {
  const { data, error } = await client.from("assignment_consultants")
    .select("assignment_id, consultants!inner(user_id), assignments!inner(status)")
    .eq("assignment_id", assignmentId).eq("consultants.user_id", userId)
    .eq("assignments.status", "active").is("removed_at", null).maybeSingle();
  if (error) throw error;
  if (!data) throw new PortalHttpError(403, "Service records can only be submitted for your active assigned projects.");
}

export function toServiceRecord(row: ServiceRecordRow) {
  const consultant = Array.isArray(row.consultant) ? row.consultant[0] : row.consultant;
  const assignment = Array.isArray(row.assignment) ? row.assignment[0] : row.assignment;
  return {
    id: row.id, consultantId: row.consultant_id, consultantName: consultant?.full_name ?? "Consultant",
    assignmentId: row.assignment_id, assignmentTitle: assignment?.title ?? "Previous project",
    periodStart: row.period_start, periodEnd: row.period_end, summary: row.summary,
    invoiceReference: row.invoice_reference, originalFilename: row.original_filename,
    sizeBytes: row.size_bytes, status: row.status, scanStatus: row.scan_status, createdAt: row.created_at,
  };
}

export function verifyServiceRecordPdf(bytes: Uint8Array, expectedSize: number) {
  if (bytes.length !== expectedSize || !bytes.length || bytes.length > serviceRecordMaxBytes)
    throw new PortalHttpError(409, "The uploaded file size differs from the selected PDF. Please upload it again.");
  // Read bytes only; PDF parsing waits until the external malware scan clears it.
  const buffer = Buffer.from(bytes);
  if (!/^%PDF-\d\.\d/.test(buffer.subarray(0, 16).toString("ascii")) || !buffer.subarray(Math.max(0, buffer.length - 1024)).includes(Buffer.from("%%EOF")))
    throw new PortalHttpError(400, "The uploaded file is not a complete PDF. Export your service record as PDF and try again.");
  return createHash("sha256").update(bytes).digest("hex");
}
