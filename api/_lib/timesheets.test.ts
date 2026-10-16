import { describe, expect, it } from "vitest";
import { requireTimesheetRevision, timesheetTotalHours, validateTimesheetReview, validateTimesheetSave } from "./timesheets";

const projectId = "20000000-0000-4000-8000-000000000001";
const sheetId = "70000000-0000-4000-8000-000000000001";
const savedAt = "2026-09-09T10:00:00.123456+00:00";
const valid = {
  assignmentId: projectId,
  weekStart: "2026-09-07",
  entries: [{ date: "2026-09-07", hours: 7.25, notes: "Planning workshop" }],
  action: "submit",
};

describe("weekly timesheet validation", () => {
  it("normalizes a sparse week to seven days and totals hundredths accurately", () => {
    const { entries } = validateTimesheetSave(valid);
    expect(entries).toHaveLength(7);
    expect(entries[6]).toEqual({ date: "2026-09-13", hours: 0, notes: "" });
    expect(timesheetTotalHours([{ date: "", hours: 0.1, notes: "" }, { date: "", hours: 0.2, notes: "" }])).toBe(0.3);
  });

  it.each(["2026-09-08", "2026-02-30", "2026-9-07", "0000-01-03"])("rejects invalid Monday %s", (weekStart) => {
    expect(() => validateTimesheetSave({ ...valid, weekStart })).toThrow("valid week");
  });

  it.each([-1, 24.01, 2.555, Number.NaN, Number.POSITIVE_INFINITY, "8"])("rejects invalid daily hours %s", (hours) => {
    expect(() => validateTimesheetSave({ ...valid, entries: [{ ...valid.entries[0], hours }] })).toThrow("Daily hours");
  });

  it("rejects duplicate days and dates outside the selected week", () => {
    expect(() => validateTimesheetSave({ ...valid, entries: [valid.entries[0], valid.entries[0]] })).toThrow("Use each date once");
    expect(() => validateTimesheetSave({ ...valid, entries: [{ ...valid.entries[0], date: "2026-09-14" }] })).toThrow("within the selected week");
  });

  it("permits incomplete drafts but requires work notes and hours to submit", () => {
    const incomplete = { ...valid, entries: [{ ...valid.entries[0], notes: " " }] };
    expect(validateTimesheetSave({ ...incomplete, action: "save" }).entries[0].notes).toBe("");
    expect(() => validateTimesheetSave(incomplete)).toThrow("brief description");
    expect(() => validateTimesheetSave({ ...valid, entries: [] })).toThrow("working hours");
    expect(validateTimesheetSave({ ...valid, entries: [], action: "save" }).entries).toHaveLength(7);
  });

  it("limits daily note size and rejects invalid actions", () => {
    expect(() => validateTimesheetSave({ ...valid, entries: [{ ...valid.entries[0], notes: "x".repeat(2001) }] })).toThrow("2,000 characters");
    expect(() => validateTimesheetSave({ ...valid, action: "approve" })).toThrow("save or submit");
  });

  it("requires a revision for existing sheets and preserves database microseconds", () => {
    expect(() => validateTimesheetSave({ ...valid, id: sheetId })).toThrow("Reload");
    expect(requireTimesheetRevision(savedAt)).toBe(savedAt);
    expect(validateTimesheetSave({ ...valid, id: sheetId, expectedUpdatedAt: savedAt }).expectedUpdatedAt).toBe(savedAt);
  });

  it("requires a return reason and validates review decisions", () => {
    const review = { id: sheetId, expectedUpdatedAt: savedAt, status: "returned", reviewNote: " " };
    expect(() => validateTimesheetReview(review)).toThrow("Explain what needs changing");
    expect(validateTimesheetReview({ ...review, reviewNote: " Correct Friday hours " }).reviewNote).toBe("Correct Friday hours");
    expect(() => validateTimesheetReview({ ...review, status: "draft" })).toThrow("approve or return");
    expect(() => validateTimesheetReview({ ...review, status: "approved", reviewNote: 42 })).toThrow("must be text");
  });
});
