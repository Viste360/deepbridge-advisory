import type { SupabaseClient } from "@supabase/supabase-js";
import { PortalHttpError } from "./server.js";

export type TimesheetStatus = "draft" | "submitted" | "approved" | "returned";
export interface TimesheetEntry {
  date: string;
  hours: number;
  notes: string;
}

export interface TimesheetRow {
  id: string;
  consultant_id: string;
  assignment_id: string;
  week_start: string;
  entries: TimesheetEntry[];
  status: TimesheetStatus;
  review_note: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
  consultant?: { full_name: string } | { full_name: string }[] | null;
  assignment?: { title: string; programme: string } | { title: string; programme: string }[] | null;
}

export const timesheetSelection = "id, consultant_id, assignment_id, week_start, entries, status, review_note, submitted_at, reviewed_at, reviewed_by, created_at, updated_at, consultant:portal_profiles!timesheets_consultant_id_fkey(full_name), assignment:assignments!timesheets_assignment_id_fkey(title, programme)";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function requireTimesheetId(value: unknown, label = "timesheet") {
  if (typeof value !== "string" || !uuidPattern.test(value))
    throw new PortalHttpError(400, `Select a valid ${label}.`);
  return value;
}

export function requireTimesheetRevision(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value)))
    throw new PortalHttpError(400, "Reload the timesheet before saving your changes.");
  // Preserve PostgreSQL's microseconds: truncating through Date would break CAS.
  return value;
}

export function validateTimesheetSave(body: Record<string, unknown>) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new PortalHttpError(400, "Provide a timesheet to save.");
  const id = body.id == null ? null : requireTimesheetId(body.id);
  const assignmentId = requireTimesheetId(body.assignmentId, "project");
  const expectedUpdatedAt = id ? requireTimesheetRevision(body.expectedUpdatedAt) : null;
  const weekStart = body.weekStart;
  if (typeof weekStart !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart))
    throw new PortalHttpError(400, "Choose a valid week beginning on Monday.");
  const monday = new Date(`${weekStart}T00:00:00.000Z`);
  if (!Number.isFinite(monday.getTime()) || monday.getUTCFullYear() < 1 || monday.toISOString().slice(0, 10) !== weekStart || monday.getUTCDay() !== 1)
    throw new PortalHttpError(400, "Choose a valid week beginning on Monday.");
  if (body.action !== "save" && body.action !== "submit")
    throw new PortalHttpError(400, "Choose save or submit for this timesheet.");
  if (!Array.isArray(body.entries) || body.entries.length > 7)
    throw new PortalHttpError(400, "A weekly timesheet can contain up to seven days.");
  const entries: TimesheetEntry[] = Array.from({ length: 7 }, (_, day) => ({
    date: new Date(monday.getTime() + day * 86_400_000).toISOString().slice(0, 10),
    hours: 0,
    notes: "",
  }));
  const seen = new Set<string>();
  for (const raw of body.entries) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
      throw new PortalHttpError(400, "Each day must contain a date, hours and work notes.");
    const { date, hours, notes } = raw as Record<string, unknown>;
    const entry = entries.find((day) => day.date === date);
    if (!entry || typeof date !== "string" || seen.has(date))
      throw new PortalHttpError(400, "Use each date once, within the selected week.");
    seen.add(date);
    if (typeof hours !== "number" || !Number.isFinite(hours) || hours < 0 || hours > 24 || Math.abs(hours * 100 - Math.round(hours * 100)) > 1e-8)
      throw new PortalHttpError(400, "Daily hours must be between 0 and 24, with at most two decimal places.");
    if (typeof notes !== "string" || notes.trim().length > 2000)
      throw new PortalHttpError(400, "Work notes must contain no more than 2,000 characters per day.");
    if (body.action === "submit" && hours > 0 && !notes.trim())
      throw new PortalHttpError(400, "Add a brief description for each day worked.");
    entry.hours = Math.round(hours * 100) / 100;
    entry.notes = notes.trim();
  }
  if (body.action === "submit" && timesheetTotalHours(entries) === 0)
    throw new PortalHttpError(400, "Add some working hours before submitting the week.");
  return { id, assignmentId, weekStart, expectedUpdatedAt, entries, action: body.action };
}

export function validateTimesheetReview(body: Record<string, unknown>) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new PortalHttpError(400, "Provide a timesheet to review.");
  const id = requireTimesheetId(body.id);
  const expectedUpdatedAt = requireTimesheetRevision(body.expectedUpdatedAt);
  if (body.status !== "approved" && body.status !== "returned")
    throw new PortalHttpError(400, "Choose approve or return for this timesheet.");
  if (body.reviewNote != null && typeof body.reviewNote !== "string")
    throw new PortalHttpError(400, "The review note must be text.");
  const reviewNote = typeof body.reviewNote === "string" ? body.reviewNote.trim() : "";
  if (reviewNote.length > 2000)
    throw new PortalHttpError(400, "Keep the review note within 2,000 characters.");
  if (body.status === "returned" && !reviewNote)
    throw new PortalHttpError(400, "Explain what needs changing before returning the timesheet.");
  return { id, expectedUpdatedAt, status: body.status, reviewNote };
}

export function timesheetTotalHours(entries: TimesheetEntry[]) {
  return entries.reduce((total, entry) => total + Math.round(entry.hours * 100), 0) / 100;
}

export function toTimesheet(row: TimesheetRow) {
  const consultant = Array.isArray(row.consultant) ? row.consultant[0] : row.consultant;
  const assignment = Array.isArray(row.assignment) ? row.assignment[0] : row.assignment;
  return {
    id: row.id,
    consultantId: row.consultant_id,
    consultantName: consultant?.full_name ?? "Consultant",
    assignmentId: row.assignment_id,
    assignmentTitle: assignment?.title ?? "Previous project",
    programme: assignment?.programme ?? "",
    weekStart: row.week_start,
    entries: row.entries,
    totalHours: timesheetTotalHours(row.entries),
    status: row.status,
    reviewNote: row.review_note,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function requireTimesheetAssignment(client: SupabaseClient, userId: string, assignmentId: string) {
  const { data, error } = await client
    .from("assignment_consultants")
    .select("assignment_id, consultants!inner(user_id), assignments!inner(status)")
    .eq("assignment_id", assignmentId)
    .eq("consultants.user_id", userId)
    .eq("assignments.status", "active")
    .is("removed_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!data)
    throw new PortalHttpError(403, "Timesheets can only be saved for your active assigned projects.");
}

export function timesheetConflict() {
  return new PortalHttpError(409, "This timesheet has changed. Reload it before continuing.");
}

export function handleTimesheetDatabaseError(error: { code?: string }) {
  if (error.code === "23505")
    throw new PortalHttpError(409, "A timesheet already exists for this project and week. Reload to open it.");
  if (error.code === "23514")
    throw new PortalHttpError(400, "The timesheet is invalid. Check the dates, hours and review details.");
  if (error.code === "42501")
    throw new PortalHttpError(403, "Your timesheet access has changed. Reload before continuing.");
  throw error;
}
