import { useEffect, useState, type FormEvent } from "react";
import type { Assignment, PortalProfile } from "../types";
import {
  addDays, downloadTimesheets, formatDate, loadTimesheets, localDate, mondayOf,
  reviewTimesheet, saveTimesheet, statusLabels, totalHours, weekEntries, weekLabel,
  TimesheetRequestError,
  type Timesheet, type TimesheetAssignment, type TimesheetEntry, type TimesheetList,
} from "./timesheetData";
import "./timesheets.css";
import { ServiceRecordsPanel } from "./ServiceRecordsPanel";

export function TimesheetsPage(props: { profile: PortalProfile; demo: boolean; assignment: Assignment }) {
  const [view, setView] = useState<"records" | "weekly">("records");
  const [weeklyOpened, setWeeklyOpened] = useState(false);
  return <div className="timesheets-area">
    <header className="portal-page-header"><div><p className="portal-kicker">{props.profile.role === "admin" ? "Supplier administration" : "Your services"}</p><h1>Service records</h1><p>{props.profile.role === "admin" ? "View supplier records and supporting documents for invoice reconciliation." : "Upload your own record of services for the agreed billing period. Use the format that works for your business."}</p></div></header>
    <div className="service-record-views" aria-label="Record format"><button type="button" aria-pressed={view === "records"} onClick={() => setView("records")}>{props.profile.role === "admin" ? "Supplier uploads" : "Upload your own record"}</button><button type="button" aria-pressed={view === "weekly"} onClick={() => { setWeeklyOpened(true); setView("weekly"); }}>Weekly form (optional)</button></div>
    <div hidden={view !== "records"}><ServiceRecordsPanel {...props} /></div>
    {weeklyOpened ? <div hidden={view !== "weekly"}><WeeklyTimesheets {...props} /></div> : null}
  </div>;
}

function Status({ sheet }: { sheet?: Timesheet }) {
  return <span className={`timesheet-status ${sheet?.status || "draft"}`}>{sheet ? statusLabels[sheet.status] : "New timesheet"}</span>;
}

function demoData(profile: PortalProfile, assignment: Assignment): TimesheetList {
  const weekStart = addDays(mondayOf(localDate()), -7);
  return {
    assignments: [{ id: assignment.id, title: assignment.title, programme: assignment.programme }],
    timesheets: [{
      id: "demo-previous-week", consultantId: profile.id,
      consultantName: profile.role === "admin" ? "Roland Schneider" : profile.fullName,
      assignmentId: assignment.id, assignmentTitle: assignment.title, programme: assignment.programme,
      weekStart, entries: weekEntries(weekStart).map((entry, index) => ({ ...entry, hours: index < 5 ? 8 : 0, notes: index < 5 ? "Programme planning and coordination (sample)." : "" })),
      totalHours: 40, status: "submitted", reviewNote: "", submittedAt: new Date().toISOString(),
      reviewedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }],
  };
}

function WeeklyTimesheets({ profile, demo, assignment }: {
  profile: PortalProfile; demo: boolean; assignment: Assignment;
}) {
  const [data, setData] = useState<TimesheetList | null>(() => demo ? demoData(profile, assignment) : null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (demo) return;
    const controller = new AbortController();
    loadTimesheets(controller.signal).then((result) => {
      if (!controller.signal.aborted) { setData(result); setError(""); }
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Unable to load timesheets.");
    });
    return () => controller.abort();
  }, [demo, retry]);

  return <div className="timesheets-area">
    <header className="portal-page-header">
      <div><p className="portal-kicker">{profile.role === "admin" ? "Administration" : "Your working week"}</p>
        <h2>Weekly timesheets</h2>
        <p>{profile.role === "admin" ? "Review submitted hours, request changes and keep a copy for your records." : "If useful for your agreed billing basis, use this optional form to record time spent delivering your services."}</p>
      </div>
      {data?.timesheets.length ? <button type="button" className="portal-button" onClick={() => downloadTimesheets(data.timesheets)}>Download all CSV</button> : null}
    </header>
    {error ? <div className="portal-form-message error" role="alert">{error} <button type="button" onClick={() => { setError(""); setRetry((value) => value + 1); }}>Try again</button></div> : null}
    {!data && !error ? <p className="portal-panel" role="status">Loading your timesheets…</p> : null}
    {data ? <TimesheetWorkspace data={data} profile={profile} demo={demo} onReload={async () => { const latest = await loadTimesheets(); setData(latest); setError(""); }} onUpdate={(sheet) => setData((current) => current ? { ...current, timesheets: [sheet, ...current.timesheets.filter((item) => item.id !== sheet.id)].sort((a, b) => b.weekStart.localeCompare(a.weekStart)) } : current)} /> : null}
  </div>;
}

function TimesheetWorkspace({ data, profile, demo, onUpdate, onReload }: {
  data: TimesheetList; profile: PortalProfile; demo: boolean; onUpdate: (sheet: Timesheet) => void; onReload: () => Promise<void>;
}) {
  const admin = profile.role === "admin";
  const [weekStart, setWeekStart] = useState(() => mondayOf(localDate()));
  const [assignmentId, setAssignmentId] = useState(data.assignments[0]?.id || "");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [filter, setFilter] = useState("all");
  const selected = admin ? data.timesheets.find((sheet) => sheet.id === selectedId) : data.timesheets.find((sheet) => sheet.weekStart === weekStart && sheet.assignmentId === assignmentId);
  const project = data.assignments.find((item) => item.id === assignmentId);
  const previousProject = !project ? data.timesheets.find((sheet) => sheet.assignmentId === assignmentId) : undefined;
  const pending = data.timesheets.filter((sheet) => sheet.status === "submitted");
  const history = data.timesheets.filter((sheet) => filter === "all" || sheet.status === filter);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const protectNavigation = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (link && !window.confirm("You have unsaved changes. Leave without saving?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", protectNavigation, true);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", protectNavigation, true); };
  }, [dirty]);

  function changeSelection(change: () => void) {
    if (busy || refreshing || (dirty && !window.confirm("You have unsaved changes. Discard them and switch timesheet?"))) return;
    setDirty(false);
    change();
  }

  function updated(sheet: Timesheet) {
    setDirty(false);
    onUpdate(sheet);
  }

  async function reload() {
    if (busy || refreshing || (dirty && !window.confirm("Reload the saved timesheet and discard your unsaved changes?"))) return;
    setRefreshError("");
    setRefreshing(true);
    try {
      await onReload();
      setDirty(false);
      // Reset local edits even if the server revision has not changed.
      setRefreshVersion((value) => value + 1);
    } catch (reason) {
      setRefreshError(reason instanceof Error ? reason.message : "Unable to refresh your timesheets. Your changes are still here.");
    } finally { setRefreshing(false); }
  }

  return <>
    {!demo ? <div className="timesheet-footer"><p role="status">{refreshing ? "Refreshing timesheets…" : ""}</p><button className="portal-button" type="button" disabled={busy || refreshing} onClick={() => void reload()}>Refresh timesheets</button></div> : null}
    {refreshError ? <p className="portal-form-message error" role="alert">{refreshError} Your unsaved changes have been kept.</p> : null}
    {admin ? <div className="timesheet-review-summary"><strong>{pending.length}</strong><div><b>Timesheets awaiting review</b><p>Open a submitted week below to approve it or request a correction.</p></div></div> : null}
    {!admin ? <section className="portal-panel timesheet-picker" aria-label="Choose your working week">
      <label>Project<select value={assignmentId} disabled={busy || !data.assignments.length} onChange={(event) => changeSelection(() => setAssignmentId(event.target.value))}>
        {!data.assignments.length ? <option value="">No assigned projects</option> : null}
        {previousProject ? <option value={previousProject.assignmentId}>{previousProject.assignmentTitle} (previous project)</option> : null}
        {data.assignments.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
      </select></label>
      <label>Week commencing<input type="date" value={weekStart} disabled={busy} onChange={(event) => { if (event.target.value) changeSelection(() => setWeekStart(mondayOf(event.target.value))); }} /></label>
      <div className="timesheet-week-buttons"><button type="button" aria-label="Previous week" disabled={busy} onClick={() => changeSelection(() => setWeekStart(addDays(weekStart, -7)))}>←</button><button type="button" disabled={busy} onClick={() => changeSelection(() => setWeekStart(mondayOf(localDate())))}>This week</button><button type="button" aria-label="Next week" disabled={busy} onClick={() => changeSelection(() => setWeekStart(addDays(weekStart, 7)))}>→</button></div>
    </section> : null}

    {!admin && (project || selected) ? <TimesheetEditor key={`${assignmentId}:${weekStart}:${selected?.updatedAt || "new"}:${refreshVersion}`} sheet={selected} project={project || { id: selected!.assignmentId, title: selected!.assignmentTitle, programme: selected!.programme }} weekStart={weekStart} profile={profile} demo={demo} refreshing={refreshing} canEditProject={Boolean(project)} onReload={reload} onUpdate={updated} onDirty={setDirty} onBusy={setBusy} /> : null}
    {!admin && !data.assignments.length && !selected ? <div className="portal-panel timesheet-empty"><h2>Your project is not assigned yet</h2><p>Ask DeepBridge to link your project in the consultant portal. Your timesheet will then be ready to complete.</p></div> : null}
    {!admin && previousProject && !selected && data.assignments.length > 0 ? <div className="portal-panel timesheet-empty"><h2>No saved timesheet for this week</h2><p>This previous project is no longer assigned to you. Open one of its saved weeks below, or select an active project.</p></div> : null}

    {admin && selected ? <TimesheetReview key={`${selected.id}:${selected.updatedAt}:${refreshVersion}`} sheet={selected} demo={demo} refreshing={refreshing} onReload={reload} onUpdate={updated} onDirty={setDirty} onBusy={setBusy} /> : null}

    <section className="portal-panel timesheet-history" aria-labelledby="timesheet-history-title">
      <div className="timesheet-section-heading"><div><p className="portal-kicker">{admin ? "Consultant submissions" : "Saved and submitted"}</p><h2 id="timesheet-history-title">{admin ? "All timesheets" : "Your timesheets"}</h2></div>
        <label className="timesheet-filter">Status<select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All statuses</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      {!history.length ? <div className="timesheet-empty"><p>{data.timesheets.length ? "No timesheets match this status." : "Your saved timesheets will appear here."}</p></div> : <div className="timesheet-table-scroll"><table className="timesheet-history-table"><thead><tr>{admin ? <th scope="col">Consultant</th> : null}<th scope="col">Week commencing</th><th scope="col">Project</th><th scope="col">Hours</th><th scope="col">Status</th><th scope="col"><span className="timesheet-sr-only">Actions</span></th></tr></thead><tbody>
        {history.map((sheet) => <tr key={sheet.id}>{admin ? <td>{sheet.consultantName}</td> : null}<td>{formatDate(sheet.weekStart)} {sheet.weekStart.slice(0, 4)}</td><td>{sheet.assignmentTitle}</td><td>{sheet.totalHours.toFixed(2)}</td><td><Status sheet={sheet} /></td><td><button type="button" className="portal-text-link" disabled={busy} aria-label={`Open timesheet for ${sheet.consultantName}, week commencing ${sheet.weekStart}`} onClick={() => changeSelection(() => { setSelectedId(sheet.id); setAssignmentId(sheet.assignmentId); setWeekStart(sheet.weekStart); })}>Open</button></td></tr>)}
      </tbody></table></div>}
    </section>
  </>;
}

function TimesheetEditor({ sheet, project, weekStart, profile, demo, refreshing, canEditProject, onUpdate, onDirty, onBusy, onReload }: {
  sheet?: Timesheet; project: TimesheetAssignment; weekStart: string; profile: PortalProfile; demo: boolean; canEditProject: boolean;
  refreshing: boolean; onReload: () => Promise<void>;
  onUpdate: (sheet: Timesheet) => void; onDirty: (dirty: boolean) => void; onBusy: (busy: boolean) => void;
}) {
  const [entries, setEntries] = useState<TimesheetEntry[]>(() => sheet?.entries.map((entry) => ({ ...entry })) || weekEntries(weekStart));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reloadSuggested, setReloadSuggested] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const editable = canEditProject && (!sheet || sheet.status === "draft" || sheet.status === "returned");
  const total = totalHours(entries);
  const dirty = JSON.stringify(entries) !== JSON.stringify(sheet?.entries || weekEntries(weekStart));

  function edit(index: number, value: Partial<TimesheetEntry>) {
    const next = entries.map((entry, entryIndex) => entryIndex === index ? { ...entry, ...value } : entry);
    setEntries(next);
    onDirty(JSON.stringify(next) !== JSON.stringify(sheet?.entries || weekEntries(weekStart)));
    setError("");
    setReloadSuggested(false);
    setConfirmSubmit(false);
  }

  async function persist(action: "save" | "submit") {
    if (busy || refreshing || !editable) return;
    if (entries.some((entry) => !Number.isFinite(entry.hours) || entry.hours < 0 || entry.hours > 24 || Math.abs(entry.hours * 100 - Math.round(entry.hours * 100)) > 0.000001)) { setError("Enter between 0 and 24 hours per day, with up to two decimal places."); return; }
    if (action === "submit" && (!total || entries.some((entry) => entry.hours > 0 && !entry.notes.trim()))) { setError("Add your hours and a short work note for every day worked before submitting."); return; }
    setBusy(true); onBusy(true); setError(""); setReloadSuggested(false);
    try {
      if (demo) {
        const now = new Date().toISOString();
        onUpdate({ id: sheet?.id || crypto.randomUUID(), consultantId: profile.id, consultantName: profile.fullName, assignmentId: project.id, assignmentTitle: project.title, programme: project.programme, weekStart, entries, totalHours: total, status: action === "submit" ? "submitted" : (sheet?.status === "returned" ? "returned" : "draft"), reviewNote: action === "submit" ? "" : sheet?.reviewNote || "", submittedAt: action === "submit" ? now : sheet?.submittedAt || null, reviewedAt: action === "submit" ? null : sheet?.reviewedAt || null, createdAt: sheet?.createdAt || now, updatedAt: now });
      } else {
        const result = await saveTimesheet({ id: sheet?.id, assignmentId: project.id, weekStart, entries, action, expectedUpdatedAt: sheet?.updatedAt });
        onUpdate(result.timesheet);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your timesheet could not be saved.");
      setReloadSuggested(reason instanceof TimesheetRequestError && [403, 404, 409].includes(reason.status));
    }
    finally { setBusy(false); onBusy(false); }
  }

  function submitForm(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void persist("save"); }

  return <section className="portal-panel timesheet-editor" aria-labelledby="timesheet-week-heading">
    <div className="timesheet-section-heading"><div><p className="portal-kicker">Weekly timesheet</p><h2 id="timesheet-week-heading">{weekLabel(weekStart)}</h2><p>{project.title}</p></div><Status sheet={sheet} /></div>
    {sheet?.reviewNote ? <div className={`portal-form-message ${sheet.status === "returned" ? "warning" : "neutral"}`}><strong>DeepBridge review:</strong> {sheet.reviewNote}</div> : null}
    {!editable ? <p className="timesheet-info">{sheet?.status === "submitted" ? "Submitted to DeepBridge. Your hours are locked while this timesheet is reviewed." : sheet?.status === "approved" ? "Approved by DeepBridge. This timesheet is complete." : "This previous project is no longer assigned to you. Contact DeepBridge if a correction is needed."}</p> : null}
    <form onSubmit={submitForm}>
      <fieldset disabled={busy || refreshing || !editable} className="timesheet-days"><legend className="timesheet-sr-only">Daily hours and work notes</legend>
        <div className="timesheet-column-headings" aria-hidden="true"><span>Day</span><span>Hours</span><span>What did you work on?</span></div>
        {entries.map((entry, index) => <div key={entry.date} className={`timesheet-day ${index > 4 ? "weekend" : ""}`}>
          <div className="timesheet-date"><strong>{new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "UTC" }).format(new Date(`${entry.date}T12:00:00Z`))}</strong><span>{formatDate(entry.date)}</span></div>
          <label><span className="timesheet-sr-only">Hours for {formatDate(entry.date, true)}</span><input aria-label={`Hours for ${formatDate(entry.date, true)}`} type="number" inputMode="decimal" min="0" max="24" step="0.01" value={entry.hours || ""} placeholder="0" onChange={(event) => edit(index, { hours: event.target.value === "" ? 0 : Number(event.target.value) })} /></label>
          <label><span className="timesheet-sr-only">Work notes for {formatDate(entry.date, true)}</span><textarea aria-label={`Work notes for ${formatDate(entry.date, true)}`} rows={1} maxLength={2000} placeholder={index > 4 ? "If applicable" : "A brief description of your work"} value={entry.notes} onChange={(event) => edit(index, { notes: event.target.value })} /></label>
        </div>)}
      </fieldset>
      <div className="timesheet-total"><span>Weekly total <small>{entries.filter((entry) => entry.hours > 0).length} days worked</small></span><strong>{total.toFixed(2)} <small>hours</small></strong></div>
      {error ? <p className="portal-form-message error" role="alert">{error} {reloadSuggested ? <button type="button" disabled={busy || refreshing} onClick={() => void onReload()}>Reload saved timesheets</button> : null}</p> : null}
      {confirmSubmit ? <div className="timesheet-confirm" role="group" aria-label="Confirm timesheet submission"><p><strong>Submit {total.toFixed(2)} hours for review?</strong><br />Check your entries first. DeepBridge can return the week if a correction is needed.</p><div><button className="portal-button portal-button-primary" type="button" disabled={busy} onClick={() => void persist("submit")}>{busy ? "Submitting…" : "Confirm submission"}</button><button className="portal-button" type="button" disabled={busy} onClick={() => setConfirmSubmit(false)}>Keep editing</button></div></div> : null}
      <div className="timesheet-footer"><p role="status">{busy ? "Saving your timesheet…" : dirty ? "Unsaved changes" : sheet ? `Saved ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(sheet.updatedAt))}${demo ? " · Preview only" : ""}` : "Save a draft to keep your progress."}</p><div>
        {sheet ? <button className="portal-button" type="button" disabled={busy} onClick={() => downloadTimesheets([sheet])}>{dirty ? "Download saved CSV" : "Download CSV"}</button> : null}
        {editable ? <><button className="portal-button" type="submit" disabled={busy || (!dirty && Boolean(sheet))}>Save draft</button><button className="portal-button portal-button-primary" type="button" disabled={busy || !total || confirmSubmit} onClick={() => setConfirmSubmit(true)}>Submit for review</button></> : null}
      </div></div>
    </form>
  </section>;
}

function TimesheetReview({ sheet, demo, refreshing, onUpdate, onBusy, onDirty, onReload }: {
  sheet: Timesheet; demo: boolean; refreshing: boolean; onUpdate: (sheet: Timesheet) => void; onBusy: (busy: boolean) => void;
  onDirty: (dirty: boolean) => void; onReload: () => Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reloadSuggested, setReloadSuggested] = useState(false);
  async function review(status: "approved" | "returned") {
    if (busy || refreshing || sheet.status !== "submitted") return;
    if (status === "returned" && !note.trim()) { setError("Add a note so the consultant knows what to change."); return; }
    setBusy(true); onBusy(true); setError(""); setReloadSuggested(false);
    try {
      const timesheet = demo ? { ...sheet, status, reviewNote: note.trim(), reviewedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : (await reviewTimesheet({ id: sheet.id, status, reviewNote: note, expectedUpdatedAt: sheet.updatedAt })).timesheet;
      onUpdate(timesheet);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The review could not be saved.");
      setReloadSuggested(reason instanceof TimesheetRequestError && [403, 404, 409].includes(reason.status));
    }
    finally { setBusy(false); onBusy(false); }
  }
  return <section className="portal-panel timesheet-editor" aria-labelledby="timesheet-review-title"><div className="timesheet-section-heading"><div><p className="portal-kicker">{sheet.consultantName}</p><h2 id="timesheet-review-title">{weekLabel(sheet.weekStart)}</h2><p>{sheet.assignmentTitle}</p></div><Status sheet={sheet} /></div>
    <div className="timesheet-table-scroll"><table className="timesheet-history-table"><thead><tr><th scope="col">Day</th><th scope="col">Hours</th><th scope="col">Work notes</th></tr></thead><tbody>{sheet.entries.map((entry) => <tr key={entry.date}><td>{formatDate(entry.date, true)}</td><td>{entry.hours.toFixed(2)}</td><td className="timesheet-notes">{entry.notes || "—"}</td></tr>)}</tbody></table></div>
    <div className="timesheet-total"><span>Weekly total</span><strong>{sheet.totalHours.toFixed(2)} <small>hours</small></strong></div>
    {sheet.reviewNote ? <p className="portal-form-message neutral"><strong>Review note:</strong> {sheet.reviewNote}</p> : null}
    {error ? <p className="portal-form-message error" role="alert">{error} {reloadSuggested ? <button type="button" disabled={busy || refreshing} onClick={() => void onReload()}>Reload saved timesheets</button> : null}</p> : null}
    {sheet.status === "submitted" ? <label className="timesheet-review-note">Review note <span>(required when requesting changes)</span><textarea value={note} maxLength={2000} rows={3} disabled={busy || refreshing} onChange={(event) => { setNote(event.target.value); onDirty(Boolean(event.target.value.trim())); }} placeholder="Let the consultant know if anything needs correcting." /></label> : null}
    <div className="timesheet-footer"><p role="status">{busy ? "Saving review…" : sheet.status === "submitted" ? "The consultant can see the review in their timesheet area." : statusLabels[sheet.status]}</p><div><button className="portal-button" type="button" onClick={() => downloadTimesheets([sheet])}>Download CSV</button>{sheet.status === "submitted" ? <><button className="portal-button" disabled={busy} type="button" onClick={() => void review("returned")}>Request changes</button><button className="portal-button portal-button-primary" disabled={busy} type="button" onClick={() => void review("approved")}>Approve timesheet</button></> : null}</div></div>
  </section>;
}
