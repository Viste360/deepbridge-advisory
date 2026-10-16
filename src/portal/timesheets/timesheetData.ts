export type TimesheetStatus = "draft" | "submitted" | "approved" | "returned";

export interface TimesheetEntry {
  date: string;
  hours: number;
  notes: string;
}

export interface TimesheetAssignment {
  id: string;
  title: string;
  programme: string;
}

export interface Timesheet {
  id: string;
  consultantId: string;
  consultantName: string;
  assignmentId: string;
  assignmentTitle: string;
  programme: string;
  weekStart: string;
  entries: TimesheetEntry[];
  totalHours: number;
  status: TimesheetStatus;
  reviewNote: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TimesheetList {
  timesheets: Timesheet[];
  assignments: TimesheetAssignment[];
}

export const statusLabels: Record<TimesheetStatus, string> = {
  draft: "Draft",
  submitted: "Awaiting review",
  approved: "Approved",
  returned: "Changes requested",
};

export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function mondayOf(date: string) {
  const day = new Date(`${date}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number) {
  const day = new Date(`${date}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
}

export function weekEntries(weekStart: string): TimesheetEntry[] {
  return Array.from({ length: 7 }, (_, index) => ({ date: addDays(weekStart, index), hours: 0, notes: "" }));
}

export function formatDate(date: string, weekday = false) {
  return new Intl.DateTimeFormat("en-GB", {
    ...(weekday ? { weekday: "short" as const } : {}),
    day: "numeric", month: "short", timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

export function weekLabel(date: string) {
  const end = addDays(date, 6);
  const startYear = date.slice(0, 4);
  const endYear = end.slice(0, 4);
  return `${formatDate(date)}${startYear !== endYear ? ` ${startYear}` : ""} – ${formatDate(end)} ${endYear}`;
}

export function totalHours(entries: TimesheetEntry[]) {
  return Math.round(entries.reduce((sum, entry) => sum + Math.round(entry.hours * 100), 0)) / 100;
}

// Spreadsheet programs must treat user-entered text as text, including formulas.
function csvCell(value: string | number) {
  const text = String(value);
  const safe = /^[\s]*[=+@-]|^[\t\r\n]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function timesheetsCsv(timesheets: Timesheet[]) {
  const rows: Array<Array<string | number>> = [["Consultant", "Project", "Week commencing", "Date", "Hours", "Work notes", "Status", "Review note"]];
  for (const sheet of timesheets) {
    for (const entry of sheet.entries) {
      rows.push([sheet.consultantName, sheet.assignmentTitle, sheet.weekStart, entry.date, entry.hours, entry.notes, statusLabels[sheet.status], sheet.reviewNote]);
    }
  }
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

export function downloadTimesheets(timesheets: Timesheet[]) {
  const url = URL.createObjectURL(new Blob([timesheetsCsv(timesheets)], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `deepbridge-timesheets-${localDate()}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export class TimesheetRequestError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "TimesheetRequestError";
  }
}

async function request<T>(path: string, body?: object, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/timesheets/${path}`, {
    credentials: "same-origin",
    method: body ? "POST" : "GET",
    headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal,
  });
  const result = await response.json().catch(() => null) as (T & { error?: string }) | null;
  if (!response.ok || !result) throw new TimesheetRequestError(result?.error || "The timesheet request could not be completed. Please try again.", response.status);
  return result;
}

export const loadTimesheets = (signal?: AbortSignal) => request<TimesheetList>("list", undefined, signal);
export const saveTimesheet = (body: {
  id?: string; assignmentId: string; weekStart: string; entries: TimesheetEntry[];
  action: "save" | "submit"; expectedUpdatedAt?: string;
}) => request<{ timesheet: Timesheet }>("save", body);
export const reviewTimesheet = (body: {
  id: string; status: "approved" | "returned"; reviewNote: string; expectedUpdatedAt: string;
}) => request<{ timesheet: Timesheet }>("review", body);
