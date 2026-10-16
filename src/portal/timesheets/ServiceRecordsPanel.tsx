import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Assignment, PortalProfile } from "../types";
import { formatDate, localDate } from "./timesheetData";
import { finalizeServiceRecord, loadServiceRecords, serviceRecordAccess, uploadServiceRecord, type ServiceRecord, type ServiceRecordList } from "./serviceRecordData";

export function ServiceRecordsPanel({ profile, demo, assignment }: { profile: PortalProfile; demo: boolean; assignment: Assignment }) {
  const admin = profile.role === "admin";
  const [data, setData] = useState<ServiceRecordList | null>(() => demo ? { records: [], assignments: [{ id: assignment.id, title: assignment.title, programme: assignment.programme }] } : null);
  const [project, setProject] = useState("");
  const [start, setStart] = useState(() => `${localDate().slice(0, 7)}-01`);
  const [end, setEnd] = useState(localDate);
  const [summary, setSummary] = useState("");
  const [invoice, setInvoice] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const [pendingRecordId, setPendingRecordId] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (demo) return;
    const controller = new AbortController();
    loadServiceRecords(controller.signal).then(setData).catch((reason: unknown) => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Records could not be loaded.");
    });
    return () => controller.abort();
  }, [demo, reload]);

  useEffect(() => {
    if (!busy && !file) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy, file]);

  const assignmentId = project || data?.assignments[0]?.id || "";

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file || !assignmentId) return;
    setError(""); setNotice("");
    if (!/\.pdf$/i.test(file.name) || (file.type && file.type !== "application/pdf")) { setError("Please export your record as a PDF and choose that file."); return; }
    if (!file.size || file.size > 10 * 1024 * 1024) { setError("Choose a PDF of up to 10 MB."); return; }
    if (end < start) { setError("The period end must be on or after the start."); return; }
    setBusy(true);
    try {
      if (demo) {
        const record: ServiceRecord = { id: crypto.randomUUID(), consultantId: profile.id, consultantName: profile.fullName, assignmentId, assignmentTitle: data?.assignments.find((item) => item.id === assignmentId)?.title || "Project", periodStart: start, periodEnd: end, summary, invoiceReference: invoice, originalFilename: file.name, sizeBytes: file.size, status: "submitted", scanStatus: "pending", createdAt: new Date().toISOString() };
        setData((current) => current ? { ...current, records: [record, ...current.records] } : current);
        setNotice("Preview record added. No file was uploaded or scanned.");
      } else {
        const uploaded = pendingRecordId ? { recordId: pendingRecordId } : await uploadServiceRecord({ assignmentId, periodStart: start, periodEnd: end, summary, invoiceReference: invoice }, file, setPhase);
        setPendingRecordId(uploaded.recordId);
        setPhase("Checking your document… This can take a moment.");
        const result = await finalizeServiceRecord(uploaded.recordId);
        setReload((value) => value + 1);
        setData((current) => current ? { ...current, records: [result.record, ...current.records.filter((record) => record.id !== result.record.id)] } : current);
        if (result.warning) setError(result.warning);
        else setNotice(result.record.scanStatus === "clean" ? "Your service record has been received and is available to DeepBridge." : "Your service record has been submitted. Its document is available after the security check completes.");
      }
      setFile(null); setSummary(""); setInvoice(""); setPendingRecordId(null);
      if (fileInput.current) fileInput.current.value = "";
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The upload could not be completed."); }
    finally { setBusy(false); setPhase(""); }
  }

  async function download(record: ServiceRecord) {
    setError("");
    try {
      if (demo) { setNotice("Document downloads are available after a real upload and security check."); return; }
      const { url } = await serviceRecordAccess(record.id);
      const link = document.createElement("a"); link.href = url; link.rel = "noopener"; link.download = record.originalFilename; link.click();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The document could not be opened."); }
  }

  async function retryCheck(record: ServiceRecord) {
    setBusy(true); setError(""); setNotice("");
    try {
      if (demo) { setNotice("Security checks run after a real upload. This is a local preview."); return; }
      const result = await finalizeServiceRecord(record.id);
      setData((current) => current ? { ...current, records: current.records.map((item) => item.id === record.id ? result.record : item) } : current);
      if (result.warning) setError(result.warning);
      else setNotice("The security check has been retried. The record below shows its current status.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The security check could not be retried."); }
    finally { setBusy(false); }
  }

  return <>
    {error ? <div className="portal-form-message error" role="alert">{error} {!data ? <button type="button" onClick={() => { setError(""); setReload((value) => value + 1); }}>Try again</button> : null}</div> : null}
    {notice ? <p className="portal-form-message success" role="status">{notice}</p> : null}
    {!data && !error ? <p className="portal-panel" role="status">Loading service records…</p> : null}
    {data && !admin ? <section className="portal-panel service-record-upload" aria-labelledby="upload-service-record"><div className="timesheet-section-heading"><div><p className="portal-kicker">Your document, your format</p><h2 id="upload-service-record">Upload your service record</h2><p>Export your own timesheet, activity report or statement of services as a PDF.</p></div><span className="timesheet-status">Private upload</span></div>
      {data.assignments.length ? <form onSubmit={(event) => void submit(event)}>
        <fieldset disabled={busy || Boolean(pendingRecordId)} className="service-record-fields"><legend className="timesheet-sr-only">Service record details</legend>
          <label className="service-record-full">Project<select value={assignmentId} onChange={(event) => setProject(event.target.value)} required>{data.assignments.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <label>Period from<input type="date" value={start} onChange={(event) => setStart(event.target.value)} required /></label><label>Period to<input type="date" value={end} min={start} onChange={(event) => setEnd(event.target.value)} required /></label>
          <label className="service-record-full">Services delivered <span>(optional if described in your PDF)</span><textarea rows={3} maxLength={2000} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Briefly describe the services or deliverables covered by your record." /></label>
          <label className="service-record-full">Invoice reference <span>(optional)</span><input value={invoice} maxLength={120} onChange={(event) => setInvoice(event.target.value)} placeholder="For example, HS-2026-09" /></label>
          <label className="service-record-file service-record-full">Choose your PDF<input ref={fileInput} type="file" accept=".pdf,application/pdf" required onChange={(event) => { setFile(event.target.files?.[0] || null); setError(""); }} /><span>PDF · Up to 10 MB. Include the dates, services and billable units agreed in your contract.</span></label>
        </fieldset>
        {pendingRecordId && !busy ? <p className="portal-form-message neutral">Your PDF is uploaded. Retry the final check to complete this submission. <button type="button" onClick={() => { setPendingRecordId(null); setFile(null); if (fileInput.current) fileInput.current.value = ""; }}>Choose another PDF</button></p> : null}
        <div className="timesheet-footer"><p role="status">{phase || "Use your own record. The weekly form is available if you prefer it."}</p><button type="submit" disabled={busy || !file} className="portal-button portal-button-primary">{busy ? "Submitting…" : pendingRecordId ? "Retry final check" : "Submit service record"}</button></div>
      </form> : <p className="timesheet-empty">Ask DeepBridge to link your project before submitting a service record.</p>}
    </section> : null}
    {data ? <section className="portal-panel timesheet-history" aria-labelledby="service-record-history"><div className="timesheet-section-heading"><div><p className="portal-kicker">{admin ? "Supplier documents" : "Submitted documents"}</p><h2 id="service-record-history">{admin ? "Supplier service records" : "Your service records"}</h2></div><button className="portal-button" type="button" disabled={busy} onClick={() => { setError(""); setReload((value) => value + 1); }}>Refresh</button></div>
      {!data.records.length ? <div className="timesheet-empty"><p>{admin ? "Supplier submissions will appear here." : "Your submitted PDFs will appear here, ready for DeepBridge to check against your invoice."}</p></div> : <div className="service-record-list">{data.records.map((record) => <article className="service-record-card" key={record.id}><div className="service-record-card-heading"><div>{admin ? <p className="portal-kicker">{record.consultantName}</p> : null}<h3>{record.assignmentTitle}</h3><p>{formatDate(record.periodStart)} {record.periodStart.slice(0, 4)} – {formatDate(record.periodEnd)} {record.periodEnd.slice(0, 4)}</p></div><span className={`timesheet-status ${record.scanStatus === "clean" ? "approved" : record.scanStatus === "pending" ? "submitted" : "returned"}`}>{record.scanStatus === "clean" ? "Received" : record.scanStatus === "pending" ? "Security check pending" : record.scanStatus === "infected" ? "Document blocked" : "Check needs attention"}</span></div><p className="timesheet-notes">{record.summary}</p>{record.invoiceReference ? <p className="service-record-reference">Invoice: {record.invoiceReference}</p> : null}<div className="timesheet-footer"><p>{record.originalFilename} · {(record.sizeBytes / 1024).toFixed(0)} KB</p><div>{record.scanStatus === "failed" && !admin ? <button type="button" className="portal-button" disabled={busy} onClick={() => void retryCheck(record)}>Retry security check</button> : null}<button type="button" className="portal-button" disabled={busy || record.scanStatus !== "clean"} onClick={() => void download(record)}>Download PDF</button></div></div></article>)}</div>}
    </section> : null}
  </>;
}
