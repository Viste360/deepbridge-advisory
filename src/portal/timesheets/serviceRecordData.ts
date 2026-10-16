import { createClient } from "@supabase/supabase-js";
import type { TimesheetAssignment } from "./timesheetData";

export interface ServiceRecord {
  id: string; consultantId: string; consultantName: string;
  assignmentId: string; assignmentTitle: string;
  periodStart: string; periodEnd: string; summary: string; invoiceReference: string;
  originalFilename: string; sizeBytes: number; status: "uploading" | "submitted";
  scanStatus: "pending" | "clean" | "infected" | "failed"; createdAt: string;
}
export interface ServiceRecordList { records: ServiceRecord[]; assignments: TimesheetAssignment[] }
export interface ServiceRecordInput { assignmentId: string; periodStart: string; periodEnd: string; summary: string; invoiceReference: string }

async function request<T>(path: string, body?: object, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/service-records/${path}`, {
    credentials: "same-origin", method: body ? "POST" : "GET", signal,
    headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json().catch(() => null) as (T & { error?: string }) | null;
  if (!response.ok || !result) throw new Error(result?.error || "The service record could not be processed. Please try again.");
  return result;
}

export const loadServiceRecords = (signal?: AbortSignal) => request<ServiceRecordList>("list", undefined, signal);
export const serviceRecordAccess = (recordId: string) => request<{ url: string }>("access", { recordId });
export const finalizeServiceRecord = (recordId: string) => request<{ record: ServiceRecord; warning?: string }>("finalize", { recordId });

export async function uploadServiceRecord(input: ServiceRecordInput, file: File, onPhase: (message: string) => void) {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) throw new Error("Private uploads are not configured.");
  onPhase("Preparing your private upload…");
  const upload = await request<{ recordId: string; path: string; token: string }>("upload-url", {
    ...input, originalFilename: file.name, mimeType: "application/pdf", sizeBytes: file.size,
  });
  const storage = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  onPhase("Uploading your PDF…");
  const { error } = await storage.storage.from("supplier-service-records").uploadToSignedUrl(upload.path, upload.token, file, { contentType: "application/pdf", upsert: false });
  if (error) throw error;
  onPhase("Checking your document… This can take a moment.");
  // Let the UI retain the record ID if a completed upload needs finalising again.
  return { recordId: upload.recordId };
}
