"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { arrayUnion, collection, doc, getDocs, setDoc } from "firebase/firestore";
import {
  CalendarDays, CheckCircle2, Download, ExternalLink, FileText,
  GitMerge, Library, LoaderCircle, Plus, RotateCw, Sparkles, Upload, X,
} from "lucide-react";
import ExcelJS from "exceljs";
import { auth, db } from "@/lib/firebase/config";
import { downloadDocument, uploadDocument } from "@/lib/firebase/storage";
import type { FieldProject } from "@/components/field-progress/FieldProjectProfile";
import { useFieldWork } from "@/contexts/FieldWorkContext";
import { DprExtractionAndReconciliation } from "./DprExtractionAndReconciliation";
import { EpcxSpinner } from "@/components/ui/EpcxSpinner";

type DprTab = "library" | "extract" | "reconcile";

type FieldDocument = {
  id: string;
  ownerUid: string;
  createdBy?: string;
  updatedBy?: string;
  type: "DPR";
  title: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  documentDate: string;
  createdAt: string;
  updatedAt: string;
  ocrStatus: "pending" | "processed" | "needs-ocr" | "failed";
  rawOcrText: string;
  extracted: Record<string, string>;
  confirmedFields: string[];
  drawingSuggestions: { drawingId: string; drawingName: string; reference: string; confidence: number; confirmed: boolean; ignored?: boolean }[];
  projectId?: string | null;
  projectName?: string;
  relatedRecords?: string[];
  attachments?: { filePath: string; fileName: string; mimeType: string }[];
  area?: string;
  discipline?: string;
  status?: string;
  tags?: string[];
};

type DrawingDocument = { id: string; name: string; drawingNumber?: string; storagePath?: string; updatedAt?: string };
const accept = ".pdf,.jpg,.jpeg,.png,.webp";
const dateLabel = (date: string) => date ? new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Date not set";

function normalizeReference(value: string) {
  return value.toUpperCase().replace(/\b(ISO|DWG|DRAWING|NO|NUMBER)\b/g, "").replace(/[^A-Z0-9]/g, "").replace(/0(?=[A-Z])/g, "O");
}

function suggestFields(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const dateMatch = text.match(/\b(\d{1,2})[\s./-]+([A-Za-z]{3,9}|\d{1,2})[\s,./-]+(20\d{2})\b/);
  let date = "";
  if (dateMatch) {
    const monthText = dateMatch[2];
    const month = /^\d+$/.test(monthText) ? Number(monthText) - 1 : new Date(`${monthText} 1, 2020`).getMonth();
    if (month >= 0 && month < 12) date = `${dateMatch[3]}-${String(month + 1).padStart(2, "0")}-${dateMatch[1].padStart(2, "0")}`;
  }
  const labeled = (pattern: RegExp) => text.match(pattern)?.[1]?.trim().slice(0, 240) ?? "";
  const manpower = labeled(/(?:manpower|total\s+(?:men|workers|personnel)|workforce)\s*[:\-]?\s*(\d{1,4})/i);
  const project = labeled(/(?:project|site)\s*(?:name)?\s*[:\-]\s*([^\n,;]+)/i);
  const contractor = labeled(/(?:contractor|agency|company)\s*[:\-]\s*([^\n,;]+)/i);
  const area = labeled(/(?:work\s*area|location|area)\s*[:\-]\s*([^\n,;]+)/i);
  const work = labeled(/(?:work\s*(?:done|completed|description|activity)|progress)\s*[:\-]\s*([^\n]+)/i);
  const quantities = labeled(/(?:quantity|qty|production)\s*[:\-]?\s*([^\n]+)/i);
  const remarks = labeled(/(?:remarks?|observations?)\s*[:\-]?\s*([^\n]+)/i);
  return { fields: { project, contractor, area, manpower, workDescription: work, activities: work, quantities, remarks }, date, lines };
}

async function readSelectablePdfText(file: File) {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return "";
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const loading = pdfjs.getDocument({ data: await file.arrayBuffer() });
  try {
    const pdf = await loading.promise;
    const pageTexts: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pageTexts.push(content.items.flatMap((item) => "str" in item && item.str.trim() ? [item.str] : []).join(" "));
    }
    return pageTexts.join("\n").replace(/[ \t]+/g, " ").trim();
  } finally { await loading.destroy(); }
}

export function DailyDprWorkspace({ onOpenDrawing, initialAdd = false, initialRecordId = "", project }: { onOpenDrawing: (drawingId: string) => void; initialAdd?: boolean; initialRecordId?: string; project?: FieldProject }) {
  const dprInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<User | null>(null);
  const [records, setRecords] = useState<FieldDocument[]>([]);
  const [drawings, setDrawings] = useState<DrawingDocument[]>([]);
  const [selectedId, setSelectedId] = useState(initialRecordId);
  const initialAddHandled = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState("");
  const [extractionOpen, setExtractionOpen] = useState(false);
  const [draftFields, setDraftFields] = useState<Record<string, string>>({});
  const [draftDate, setDraftDate] = useState("");
  const [activeTab, setActiveTab] = useState<DprTab>("library");

  // Field work context — component is always rendered inside FieldWorkProvider
  const { todayWorkItems, isDprDraftReady } = useFieldWork();
  const todayCompletedCount = todayWorkItems?.filter((wi) => wi.status === "Complete").length ?? 0;

  const selected = records.find((record) => record.id === selectedId) ?? null;
  const authRedirect = initialAdd ? "/start?view=dpr&add=dpr" : initialRecordId ? `/start?view=dpr&record=${encodeURIComponent(initialRecordId)}` : "/start?view=dpr";

  const load = useCallback(async (activeUser: User) => {
    const [documentSnapshot, drawingSnapshot] = await Promise.all([
      getDocs(collection(db, "users", activeUser.uid, "fieldDocuments")),
      getDocs(collection(db, "users", activeUser.uid, "fieldDrawings")),
    ]);
    const next = documentSnapshot.docs.map((item) => item.data() as FieldDocument).filter((item) => item.ownerUid === activeUser.uid && item.type === "DPR");
    setRecords(next.sort((a, b) => b.documentDate.localeCompare(a.documentDate) || b.createdAt.localeCompare(a.createdAt)));
    setDrawings(drawingSnapshot.docs.map((item) => ({ ...item.data(), id: item.id } as DrawingDocument)));
  }, []);

  useEffect(() => onAuthStateChanged(auth, (activeUser) => {
    if (!activeUser || activeUser.isAnonymous) { setUser(null); setRecords([]); return; }
    setUser(activeUser);
    void load(activeUser).catch(() => setMessage("Could not load your DPR library. Check your connection and retry."));
  }), [load]);

  useEffect(() => {
    if (!initialAdd || initialAddHandled.current || !user || user.isAnonymous) return;
    initialAddHandled.current = true;
    dprInputRef.current?.click();
  }, [initialAdd, user]);

  useEffect(() => {
    if (!selected) return;
    let active = true;
    void downloadDocument(selected.filePath).then((file) => { if (active) setPreviewUrl(URL.createObjectURL(file)); }).catch(() => { if (active) setMessage("The saved DPR could not be opened. Retry when you are online."); });
    return () => { active = false; };
  }, [selected]);

  useEffect(() => () => { if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const dateGroups = useMemo(() => records.reduce<Record<string, FieldDocument[]>>((groups, record) => {
    groups[record.documentDate || "undated"] = [...(groups[record.documentDate || "undated"] ?? []), record];
    return groups;
  }, {}), [records]);

  async function processFile(file?: File) {
    if (!file || !user) return;
    setBusy(true); setMessage(""); setProgress(0);
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const path = `documents/${user.uid}/field-records/${id}/original`;
    try {
      const text = await readSelectablePdfText(file);
      const detected = suggestFields(text);
      const fieldValue = Object.fromEntries(Object.entries(detected.fields).filter(([, value]) => Boolean(value)));
      const detectedDate = detected.date;
      const status: FieldDocument["ocrStatus"] = text ? "processed" : "needs-ocr";
      await uploadDocument(file, user.uid, null, (update) => setProgress(Math.round(update.progress)), { folder: `field-records/${id}`, objectName: "original" });
      const references = text ? drawings.flatMap((drawing) => {
        const number = drawing.drawingNumber || drawing.name;
        const normalized = normalizeReference(number);
        if (!normalized || normalized.length < 3) return [];
        const hit = text.toUpperCase().includes(number.toUpperCase()) || normalizeReference(text).includes(normalized);
        if (hit) return [{ drawingId: drawing.id, drawingName: drawing.name, reference: number, confidence: 0.94, confirmed: false, ignored: false }];
        const abbreviations = [normalized.replace(/^(ISO|DWG)/, ""), normalized.slice(-6), normalized.slice(-5)].filter((part) => part.length >= 4);
        const fuzzy = abbreviations.some((part) => normalizeReference(text).includes(part));
        return fuzzy ? [{ drawingId: drawing.id, drawingName: drawing.name, reference: number, confidence: 0.62, confirmed: false, ignored: false }] : [];
      }) : [];
      const record: FieldDocument = { id, ownerUid: user.uid, createdBy: user.uid, updatedBy: user.uid, type: "DPR", title: file.name.replace(/\.[^.]+$/, ""), fileName: file.name, filePath: path, mimeType: file.type || "application/octet-stream", attachments: [{ filePath: path, fileName: file.name, mimeType: file.type || "application/octet-stream" }], documentDate: detectedDate || timestamp.slice(0,10), createdAt: timestamp, updatedAt: timestamp, ocrStatus: status, rawOcrText: text, extracted: fieldValue, confirmedFields: [], drawingSuggestions: references, projectId: project?.id || null, projectName: project?.name || "", area: fieldValue.area || "", discipline: "", status: "active", tags: [], relatedRecords: [] };
      await setDoc(doc(db, "users", user.uid, "fieldDocuments", id), record);
      setRecords((old) => [record, ...old]); setSelectedId(id); setDraftDate(detectedDate); setDraftFields(fieldValue); setExtractionOpen(true); setActiveTab("library");
      setMessage(text ? "Selectable PDF text extracted. Review the suggestions; confirm them when they look right." : "Original saved. This document needs OCR; scanned content has not been read yet.");
    } catch (error) {
      console.error("DPR upload failed", error);
      setMessage("Upload could not be completed. The original remains available in this browser session; check Storage access and retry.");
    } finally { setBusy(false); }
  }

  async function retryExtraction() {
    if (!selected || !user) return;
    setBusy(true); setMessage("");
    try {
      const file = await downloadDocument(selected.filePath);
      const text = await readSelectablePdfText(file);
      if (!text) throw new Error("No selectable PDF text is available. A scanned image OCR service is not configured.");
      const detected = suggestFields(text);
      const fields = Object.fromEntries(Object.entries(detected.fields).filter(([, value]) => Boolean(value)));
      const updated = { ...selected, rawOcrText: text, extracted: fields, ocrStatus: "processed" as const, updatedAt: new Date().toISOString(), ...(detected.date ? { documentDate: detected.date } : {}) };
      await setDoc(doc(db, "users", user.uid, "fieldDocuments", selected.id), updated, { merge: true });
      setRecords((old) => old.map((item) => item.id === selected.id ? updated : item)); setDraftFields(fields); setDraftDate(updated.documentDate); setExtractionOpen(true); setMessage("Text extraction completed. Review the suggestions before confirming.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Text extraction could not be completed."); }
    finally { setBusy(false); }
  }

  async function saveCorrections(confirmAll: boolean) {
    if (!selected || !user) return;
    const updated: FieldDocument = { ...selected, documentDate: draftDate, extracted: draftFields, confirmedFields: confirmAll ? Object.keys(draftFields).filter((key) => Boolean(draftFields[key])) : selected.confirmedFields, updatedBy: user.uid, updatedAt: new Date().toISOString() };
    await setDoc(doc(db, "users", user.uid, "fieldDocuments", selected.id), updated, { merge: true });
    setRecords((old) => old.map((item) => item.id === selected.id ? updated : item)); setExtractionOpen(false); setMessage(confirmAll ? "DPR details confirmed." : "DPR corrections saved.");
  }

  async function confirmDrawing(record: FieldDocument, drawingId: string) {
    if (!user) return;
    const updated = { ...record, drawingSuggestions: record.drawingSuggestions.map((suggestion) => suggestion.drawingId === drawingId ? { ...suggestion, confirmed: true } : suggestion), updatedBy: user.uid, updatedAt: new Date().toISOString() };
    updated.relatedRecords = [...new Set([...(record.relatedRecords ?? []), drawingId])];
    await Promise.all([
      setDoc(doc(db, "users", user.uid, "fieldDocuments", record.id), updated, { merge: true }),
      setDoc(doc(db, "users", user.uid, "fieldDrawings", drawingId), { relatedRecords: arrayUnion(record.id), updatedAt: updated.updatedAt }, { merge: true }),
    ]);
    setRecords((old) => old.map((item) => item.id === record.id ? updated : item));
  }

  async function ignoreDrawing(record: FieldDocument, drawingId: string) {
    if (!user) return;
    const updated = { ...record, drawingSuggestions: record.drawingSuggestions.map((suggestion) => suggestion.drawingId === drawingId ? { ...suggestion, ignored: true } : suggestion), updatedBy: user.uid, updatedAt: new Date().toISOString() };
    await setDoc(doc(db, "users", user.uid, "fieldDocuments", record.id), updated, { merge: true });
    setRecords((old) => old.map((item) => item.id === record.id ? updated : item));
  }

  async function exportExcel() {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Daily DPR");
    sheet.columns = ["Date", "Project", "Area", "Contractor", "Manpower", "Work Description", "Progress"].map((header) => ({ header, key: header, width: Math.max(16, header.length + 3) }));
    for (const record of records) sheet.addRow({ Date: record.documentDate, Project: record.extracted.project ?? "", Area: record.extracted.area ?? "", Contractor: record.extracted.contractor ?? "", Manpower: record.extracted.manpower ? Number(record.extracted.manpower) : "", "Work Description": record.extracted.workDescription ?? "", Progress: record.extracted.progress ?? "" });
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "epcx-dpr-data.xlsx"; anchor.click(); URL.revokeObjectURL(url);
  }

  return <section className="dpr-workspace">
    {/* ── Header ── */}
    <header className="dpr-library-header">
      <div>
        <p className="field-section-kicker"><FileText size={14}/>FIELD RECORDS / DAILY DPR</p>
        <h1>Daily DPR</h1>
        <p className="field-workspace-subline">Manage daily progress reports, extract data and reconcile against work items.</p>
      </div>
      <div className="dpr-header-actions">
        <button onClick={() => void exportExcel()} disabled={!records.length}><Download size={16}/>Export DPR Data</button>
        <label className="dpr-add-button">
          <Plus size={16}/>Add DPR
          <input ref={dprInputRef} type="file" accept={accept} disabled={!user || busy} onChange={(event) => void processFile(event.target.files?.[0])}/>
        </label>
      </div>
    </header>

    {/* ── DPR draft-ready banner ── */}
    {isDprDraftReady && (
      <div className="dpr-draft-ready-banner" role="status">
        <CheckCircle2 size={18}/>
        <div>
          <b>{todayCompletedCount} work item{todayCompletedCount === 1 ? "" : "s"} recorded today.</b>
          <span> DPR draft is ready for review — add manpower, TBT and remarks, then finalise.</span>
        </div>
        <button onClick={() => setActiveTab("reconcile")} className="dpr-draft-review-btn">
          Review DPR draft <span aria-hidden="true">→</span>
        </button>
      </div>
    )}

    {/* ── Tab navigation ── */}
    <nav className="dpr-tab-nav" role="tablist" aria-label="DPR workspace sections">
      <button role="tab" aria-selected={activeTab === "library"} className={activeTab === "library" ? "active" : ""} onClick={() => setActiveTab("library")}>
        <Library size={15}/>Library
      </button>
      <button role="tab" aria-selected={activeTab === "extract"} className={activeTab === "extract" ? "active" : ""} onClick={() => setActiveTab("extract")}>
        <Sparkles size={15}/>Extract from photo / PDF
      </button>
      <button role="tab" aria-selected={activeTab === "reconcile"} className={activeTab === "reconcile" ? "active" : ""} onClick={() => setActiveTab("reconcile")}>
        <GitMerge size={15}/>DPR ↔ Drawing reconcile
      </button>
    </nav>

    {/* ── Status messages ── */}
    {!user && <div className="dpr-signin"><FileText/><h2>Sign in to add a DPR</h2><p>Your field records are private to your account.</p><Link href={`/login?redirect=${encodeURIComponent(authRedirect)}`}>Continue with Google</Link></div>}
    {message && <div className="dpr-message" role="status">{message}<button onClick={() => setMessage("")} aria-label="Dismiss"><X size={15}/></button></div>}
    {busy && <div className="dpr-upload-progress"><EpcxSpinner size="sm" inline /><span>{progress ? `Uploading original · ${progress}%` : "Reading document and saving original…"}</span></div>}

    {/* ── Tab panels ── */}

    {activeTab === "library" && (
      <div className="dpr-content">
        <aside className="dpr-list">
          <div className="dpr-list-heading"><CalendarDays size={16}/><b>By date</b><span>{records.length}</span></div>
          {Object.keys(dateGroups).length ? Object.entries(dateGroups).sort(([a], [b]) => b.localeCompare(a)).map(([date, group]) =>
            <div className="dpr-date-group" key={date}>
              <h2>{date === "undated" ? date : dateLabel(date)}</h2>
              {group.map((record) =>
                <button key={record.id} className={`dpr-list-record ${selectedId === record.id ? "active" : ""}`} onClick={() => { setSelectedId(record.id); setExtractionOpen(false); }}>
                  <span className="dpr-thumb"><FileText size={19}/></span>
                  <span><b>{record.title || record.fileName}</b><small>{record.ocrStatus === "processed" ? "Text extracted" : record.ocrStatus === "needs-ocr" ? "OCR needed" : record.ocrStatus}</small></span>
                </button>
              )}
            </div>
          ) : <p className="dpr-empty-list">No DPRs yet. Add the first report to start your date-based record.</p>}
        </aside>

        <article className="dpr-document-area">
          {selected ? <>
            <div className="dpr-document-toolbar">
              <div><b>{dateLabel(selected.documentDate)}</b><span>{selected.fileName}</span></div>
              <div>
                <button onClick={() => setExtractionOpen((open) => !open)}>Review extracted data</button>
                <button onClick={() => void retryExtraction()} disabled={busy}><RotateCw size={15}/>Retry extraction</button>
              </div>
            </div>
            <div className="dpr-document-frame">
              {previewUrl ? selected.mimeType === "application/pdf" ? <iframe src={`${previewUrl}#toolbar=1&navpanes=0`} title={`DPR ${selected.title}`}/> : <img src={previewUrl} alt={selected.title}/> : <p>Loading original…</p>}
            </div>
            <div className="dpr-related">
              <h2>Related drawings</h2>
              {selected.drawingSuggestions.length ? selected.drawingSuggestions.map((suggestion) =>
                <div className="dpr-reference" key={suggestion.drawingId}>
                  <span><b>{suggestion.drawingName}</b><small>{suggestion.ignored ? "Suggestion dismissed" : suggestion.confirmed ? "Confirmed relationship" : suggestion.confidence >= .8 ? "Possible related drawing" : "Check this drawing number"} · {suggestion.reference}</small></span>
                  {!suggestion.ignored && <><button onClick={() => void confirmDrawing(selected, suggestion.drawingId)} disabled={suggestion.confirmed}>{suggestion.confirmed ? "Linked" : "Link"}</button>{!suggestion.confirmed && <button onClick={() => void ignoreDrawing(selected, suggestion.drawingId)}>Ignore</button>}<button onClick={() => onOpenDrawing(suggestion.drawingId)}><ExternalLink size={14}/>Open</button></>}
                </div>
              ) : <p>No drawing references suggested yet. Confirmed links will appear here.</p>}
            </div>
            {extractionOpen && <aside className="dpr-extracted-panel">
              <div className="dpr-panel-title">
                <div><p className="drawing-eyebrow">SUGGESTIONS · REVIEW REQUIRED</p><h2>Detected information</h2></div>
                <button onClick={() => setExtractionOpen(false)} aria-label="Close"><X size={17}/></button>
              </div>
              <label>DPR date<input type="date" value={draftDate} onChange={(event) => setDraftDate(event.target.value)}/></label>
              {Object.entries(draftFields).map(([key, value]) =>
                <label key={key}>{key.replace(/[A-Z]/g, (letter) => ` ${letter}`).replace(/^./, (letter) => letter.toUpperCase())}<input value={value} onChange={(event) => setDraftFields((old) => ({ ...old, [key]: event.target.value }))}/></label>
              )}
              {!Object.keys(draftFields).length && <p>No selectable text was found. This upload remains available as the original; scanned document OCR requires the OCR service.</p>}
              <div className="dpr-panel-actions">
                <button onClick={() => void saveCorrections(false)}>Save corrections</button>
                <button onClick={() => void saveCorrections(true)} className="drawing-save-mark">Confirm detected details</button>
              </div>
              <details><summary>Raw extracted text</summary><pre>{selected.rawOcrText || "No text extracted"}</pre></details>
            </aside>}
          </> : <div className="dpr-no-selection">
            <FileText size={32}/>
            <h2>Your daily reports</h2>
            <p>Choose a date on the left, or add a DPR PDF or image. EPCX keeps the original and offers extracted details for your review.</p>
            {user && <label className="dpr-add-button"><Upload size={16}/>Add DPR<input type="file" accept={accept} onChange={(event) => void processFile(event.target.files?.[0])}/></label>}
          </div>}
        </article>
      </div>
    )}

    {activeTab === "extract" && (
      <div className="dpr-tab-panel">
        <DprExtractionAndReconciliation
          project={project}
          onOpenDrawing={onOpenDrawing}
          initialMode="extract"
        />
      </div>
    )}

    {activeTab === "reconcile" && (
      <div className="dpr-tab-panel">
        <DprExtractionAndReconciliation
          project={project}
          onOpenDrawing={onOpenDrawing}
          initialMode="reconcile"
        />
      </div>
    )}
  </section>;
}
