import { afterEach, describe, expect, it, vi } from "vitest";
import { addDays, loadTimesheets, mondayOf, saveTimesheet, TimesheetRequestError, timesheetsCsv, totalHours, weekEntries, weekLabel, type Timesheet } from "./timesheetData";

afterEach(() => vi.unstubAllGlobals());

describe("timesheet dates and exports", () => {
  it("keeps Sunday in the previous working week across years and DST boundaries", () => {
    expect(mondayOf("2027-01-03")).toBe("2026-12-28");
    expect(mondayOf("2026-10-25")).toBe("2026-10-19");
    expect(addDays("2026-03-27", 3)).toBe("2026-03-30");
    expect(weekEntries("2026-12-28").map((entry) => entry.date)).toEqual(["2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02", "2027-01-03"]);
    expect(weekLabel("2026-12-28")).toBe("28 Dec 2026 – 3 Jan 2027");
    expect(weekLabel("2026-09-07")).toBe("7 Sept – 13 Sept 2026");
  });
  it("totals fractional hours without floating point artefacts", () => {
    expect(totalHours([{ date: "", hours: 0.1, notes: "" }, { date: "", hours: 0.2, notes: "" }])).toBe(0.3);
  });
  it("escapes CSV text and neutralises formulas from project names and notes", () => {
    const csv = timesheetsCsv([{ consultantName: "Roland", assignmentTitle: "=HYPERLINK(\"bad\")", weekStart: "2026-09-07", entries: [{ date: "2026-09-07", hours: 8, notes: " +SUM(1,2)\nMeeting, notes" }], status: "submitted", reviewNote: "quoted \"note\"" } as Timesheet]);
    expect(csv).toContain('"\'=HYPERLINK(""bad"")"');
    expect(csv).toContain('"\' +SUM(1,2)\nMeeting, notes"');
    expect(csv).toContain('"quoted ""note"""');
  });
});

describe("timesheet request failures", () => {
  it("retains conflict status so the editor can offer a reload without losing edits", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "This timesheet has changed." }), { status: 409 })));
    await expect(saveTimesheet({ assignmentId: "project", weekStart: "2026-09-07", entries: weekEntries("2026-09-07"), action: "save" })).rejects.toMatchObject({ name: "TimesheetRequestError", status: 409, message: "This timesheet has changed." });
  });
  it("shows an actionable error for an unavailable or non-JSON API", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Service unavailable", { status: 503 })));
    await expect(loadTimesheets()).rejects.toBeInstanceOf(TimesheetRequestError);
  });
});
