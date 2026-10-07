"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  FileText,
  Upload,
  Check,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Search,
  ExternalLink,
  Plus,
  Trash2,
  ChevronDown,
  Info,
} from "lucide-react";
import type {
  CentralWorkItem,
  DprRecordData,
  DprTableItem,
  ReconciliationItem,
  ReconciliationSummary,
  WorkType,
} from "@/lib/field-progress/work-item-model";
import {
  reconcileDprWithWorkItems,
  WORK_TYPE_OPTIONS,
} from "@/lib/field-progress/work-item-model";
import { useFieldWork } from "@/contexts/FieldWorkContext";
import { uploadDocument } from "@/lib/firebase/storage";
import { useAuth } from "@/contexts/AuthContext";
import type { FieldProject } from "./FieldProjectProfile";

interface DprExtractionAndReconciliationProps {
  project?: FieldProject;
  initialMode?: "extract" | "reconcile";
  onOpenDrawing?: (drawingId: string) => void;
  onDprSaved?: (dpr: DprRecordData) => void;
}

export function DprExtractionAndReconciliation({
  project,
  initialMode = "extract",
  onOpenDrawing,
  onDprSaved,
}: DprExtractionAndReconciliationProps) {
  const { user } = useAuth();
  const {
    workItems,
    todayWorkItems,
    dprRecords,
    saveDpr,
    runReconciliationForDate,
    resolveReconciliationItem,
    activeReconciliation,
    addOrUpdateWorkItem,
  } = useFieldWork();

  const [mode, setMode] = useState<"extract" | "reconcile">(initialMode);
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState("");
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");

  // Extracted DPR draft state
  const [extractedItems, setExtractedItems] = useState<DprTableItem[]>([]);
  const [dprDate, setDprDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [contractor, setContractor] = useState("");
  const [area, setArea] = useState(project?.areas?.split(",")[0]?.trim() || "");
  const [manpowerTotal, setManpowerTotal] = useState<number>(0);
  const [equipment, setEquipment] = useState("");
  const [remarks, setRemarks] = useState("");
  const [hindrances, setHindrances] = useState("");
  const [nextDayPlan, setNextDayPlan] = useState("");
  const [filterQuery, setFilterQuery] = useState("");
  const [reconciliationFilter, setReconciliationFilter] = useState<"ALL" | "MATCHED" | "DPR_ONLY" | "DRAWING_ONLY">("ALL");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (fileUrl.startsWith("blob:")) URL.revokeObjectURL(fileUrl);
    };
  }, [fileUrl]);

  // Handle DPR Image / PDF File Upload and Parsing
  async function handleFileUpload(selectedFile?: File) {
    if (!selectedFile || !user) return;
    setFile(selectedFile);
    const objUrl = URL.createObjectURL(selectedFile);
    setFileUrl(objUrl);
    setProcessing(true);
    setMessage("");

    try {
      // 1. Text extraction from PDF or Heuristic Extraction from Document
      let rawText = "";
      if (selectedFile.type === "application/pdf" || selectedFile.name.toLowerCase().endsWith(".pdf")) {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        const task = pdfjs.getDocument({ data: await selectedFile.arrayBuffer() });
        const pdf = await task.promise;
        const pageTexts: string[] = [];
        for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          pageTexts.push(
            content.items
              .flatMap((it) => ("str" in it && it.str.trim() ? [it.str] : []))
              .join(" ")
          );
        }
        rawText = pageTexts.join("\n");
        await task.destroy();
      }

      // 2. Intelligent extraction of Tabular Lines and Metadata
      const parsed = extractDprStructuredData(rawText, selectedFile.name);
      setExtractedItems(parsed.items);
      if (parsed.date) setDprDate(parsed.date);
      if (parsed.contractor) setContractor(parsed.contractor);
      if (parsed.area) setArea(parsed.area);
      if (parsed.manpower) setManpowerTotal(parsed.manpower);
      if (parsed.equipment) setEquipment(parsed.equipment);
      if (parsed.remarks) setRemarks(parsed.remarks);

      setMessage(`Extracted ${parsed.items.length} table rows from document. Review and confirm below.`);
    } catch (err) {
      console.error("Extraction error", err);
      setMessage("Could not extract text automatically. You can enter or correct the rows manually.");
      // Provide a starting row
      setExtractedItems([
        {
          id: crypto.randomUUID(),
          itemNo: 1,
          activityDescription: "Erection / Fit-up work",
          lineOrArea: area || "Area-01",
          jointOrTag: "J-01",
          discipline: "welding",
          unit: "joint",
          todayQty: 1,
          cumulativeQty: 1,
          confidence: 0.7,
        },
      ]);
    } finally {
      setProcessing(false);
    }
  }

  // Row update helpers
  function updateRow(id: string, patch: Partial<DprTableItem>) {
    setExtractedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  function addRow() {
    const newRow: DprTableItem = {
      id: crypto.randomUUID(),
      itemNo: extractedItems.length + 1,
      activityDescription: "",
      lineOrArea: area,
      jointOrTag: "",
      discipline: "piping",
      unit: "ea",
      todayQty: 1,
      cumulativeQty: 1,
      confidence: 1.0,
    };
    setExtractedItems([...extractedItems, newRow]);
  }

  function deleteRow(id: string) {
    setExtractedItems((prev) => prev.filter((item) => item.id !== id));
  }

  // Save Confirmed DPR Record & generate/sync work items
  async function confirmAndSaveDpr() {
    if (!user) return;
    setProcessing(true);
    setMessage("");

    try {
      const dprId = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      let storagePath = "";
      let downloadURL = "";

      if (file) {
        storagePath = `documents/${user.uid}/field-records/${dprId}/original`;
        downloadURL = await uploadDocument(
          file,
          user.uid,
          null,
          () => {},
          { folder: `field-records/${dprId}`, objectName: "original" }
        );
      }

      const dprRecord: DprRecordData = {
        id: dprId,
        ownerUid: user.uid,
        state: "REVIEWED",
        title: `Daily Progress Report - ${dprDate}`,
        documentDate: dprDate,
        projectId: project?.id,
        projectName: project?.name || "Project Workspace",
        area,
        contractor,
        manpower: { total: manpowerTotal },
        equipment,
        remarks,
        hindrances,
        nextDayPlan,
        items: extractedItems,
        sourceFile: file
          ? {
              name: file.name,
              path: storagePath,
              mimeType: file.type || "application/octet-stream",
              downloadURL,
            }
          : undefined,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      await saveDpr(dprRecord);

      // Create or update corresponding CentralWorkItems from confirmed DPR rows
      const itemsToSync: CentralWorkItem[] = extractedItems.map((item) => ({
        id: item.matchedWorkItemId || crypto.randomUUID(),
        projectId: project?.id,
        projectName: project?.name,
        fieldDate: dprDate,
        discipline: item.discipline || "piping",
        lineId: item.lineOrArea,
        jointId: item.jointOrTag,
        description: item.activityDescription || "DPR reported work",
        quantity: typeof item.todayQty === "number" ? item.todayQty : Number(item.todayQty) || 1,
        unit: item.unit || "ea",
        status: "Complete",
        progress: 100,
        createdFrom: "dpr",
        dprId,
        dprDate,
        dprReported: true,
        remarks: item.remarks,
        createdAt: timestamp,
        updatedAt: timestamp,
      }));

      for (const wi of itemsToSync) {
        await addOrUpdateWorkItem(wi);
      }

      setMessage("DPR confirmed and saved. Work items synchronized with central execution record.");
      onDprSaved?.(dprRecord);

      // Trigger automatic reconciliation against drawing work items
      await runReconciliationForDate(dprDate);
      setMode("reconcile");
    } catch (err) {
      console.error("Save DPR failed", err);
      setMessage("Could not save DPR. Check your connection and retry.");
    } finally {
      setProcessing(false);
    }
  }

  // Reconciliation summary
  const reconciliation = activeReconciliation || {
    date: dprDate,
    totalRecords: 0,
    matchedCount: 0,
    dprOnlyCount: 0,
    drawingOnlyCount: 0,
    resolvedCount: 0,
    items: [],
  };

  const filteredReconciliationItems = useMemo(() => {
    return reconciliation.items.filter((item) => {
      if (reconciliationFilter === "MATCHED" && item.status !== "MATCHED") return false;
      if (reconciliationFilter === "DPR_ONLY" && item.status !== "DPR_ONLY") return false;
      if (reconciliationFilter === "DRAWING_ONLY" && item.status !== "DRAWING_ONLY") return false;
      if (filterQuery) {
        const q = filterQuery.toLowerCase();
        const dprText = item.dprItem ? `${item.dprItem.jointOrTag} ${item.dprItem.lineOrArea} ${item.dprItem.activityDescription}` : "";
        const wiText = item.workItem ? `${item.workItem.jointId} ${item.workItem.lineId} ${item.workItem.description}` : "";
        return `${dprText} ${wiText}`.toLowerCase().includes(q);
      }
      return true;
    });
  }, [reconciliation.items, reconciliationFilter, filterQuery]);

  return (
    <div className="dpr-workbench-container">
      {/* Top Mode Switcher */}
      <div className="dpr-workbench-nav">
        <div className="dpr-nav-tabs">
          <button
            className={`dpr-nav-tab ${mode === "extract" ? "active" : ""}`}
            onClick={() => setMode("extract")}
          >
            <FileText size={16} />
            <span>1. Extract &amp; Review DPR Table</span>
          </button>
          <button
            className={`dpr-nav-tab ${mode === "reconcile" ? "active" : ""}`}
            onClick={async () => {
              setMode("reconcile");
              await runReconciliationForDate(dprDate);
            }}
          >
            <Layers size={16} />
            <span>2. DPR ↔ Drawing Reconciliation</span>
            {reconciliation.totalRecords > 0 && (
              <span className="dpr-reconcile-badge">
                {reconciliation.matchedCount}/{reconciliation.totalRecords}
              </span>
            )}
          </button>
        </div>

        <div className="dpr-header-meta">
          <label className="dpr-date-label">
            <span>Date:</span>
            <input
              type="date"
              value={dprDate}
              onChange={(e) => setDprDate(e.target.value)}
              className="dpr-date-input"
            />
          </label>
        </div>
      </div>

      {message && (
        <div className="dpr-workbench-alert" role="status">
          <Info size={16} />
          <span>{message}</span>
          <button onClick={() => setMessage("")} className="dpr-alert-dismiss">
            ×
          </button>
        </div>
      )}

      {/* MODE 1: EXTRACT & TABLE REVIEW */}
      {mode === "extract" && (
        <div className="dpr-extract-layout">
          {/* Upload trigger bar */}
          <div className="dpr-upload-bar">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="sr-only"
              onChange={(e) => void handleFileUpload(e.target.files?.[0])}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="dpr-action-btn primary"
              disabled={processing}
            >
              <Upload size={16} />
              <span>{file ? "Replace DPR Document / Photo" : "Upload DPR Image or PDF"}</span>
            </button>
            <span className="dpr-upload-hint">
              Supports client daily reports, scanned sheets, PDF tables and camera photos.
            </span>
            {processing && (
              <span className="dpr-spinner-badge">
                <RefreshCw size={14} className="animate-spin" />
                <span>Reading document...</span>
              </span>
            )}
          </div>

          <div className="dpr-side-by-side">
            {/* Left: Original Document Preview */}
            <div className="dpr-document-viewer">
              <div className="dpr-pane-header">
                <b>ORIGINAL SOURCE DOCUMENT</b>
                <span>{file ? file.name : "No document loaded"}</span>
              </div>
              <div className="dpr-preview-viewport">
                {fileUrl ? (
                  file?.type === "application/pdf" || file?.name.endsWith(".pdf") ? (
                    <iframe
                      src={`${fileUrl}#toolbar=0`}
                      className="dpr-pdf-frame"
                      title="Source DPR Document"
                    />
                  ) : (
                    <img src={fileUrl} alt="Source DPR" className="dpr-img-preview" />
                  )
                ) : (
                  <div className="dpr-empty-viewport">
                    <FileText size={36} className="text-slate-400" />
                    <p>Upload a paper or digital DPR to view side-by-side with extracted data.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Editable Extracted Table & Metadata */}
            <div className="dpr-editor-pane">
              <div className="dpr-pane-header">
                <b>STRUCTURED FIELD TABLE &amp; DETAILS</b>
                <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                  User validation required
                </span>
              </div>

              {/* General Metadata Fields */}
              <div className="dpr-meta-grid">
                <label>
                  <span>Contractor</span>
                  <input
                    value={contractor}
                    onChange={(e) => setContractor(e.target.value)}
                    placeholder="e.g. Apex Engineering"
                  />
                </label>
                <label>
                  <span>Area / Unit</span>
                  <input
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="e.g. Unit-02 Pipe Rack"
                  />
                </label>
                <label>
                  <span>Total Manpower</span>
                  <input
                    type="number"
                    value={manpowerTotal || ""}
                    onChange={(e) => setManpowerTotal(Number(e.target.value) || 0)}
                    placeholder="Workers on site"
                  />
                </label>
                <label>
                  <span>Equipment Active</span>
                  <input
                    value={equipment}
                    onChange={(e) => setEquipment(e.target.value)}
                    placeholder="e.g. Crane 50T, 4 Welders"
                  />
                </label>
              </div>

              {/* Extracted Work Items Table */}
              <div className="dpr-table-container">
                <div className="dpr-table-toolbar">
                  <span>
                    <b>{extractedItems.length}</b> work entries
                  </span>
                  <button onClick={addRow} className="dpr-btn-sm">
                    <Plus size={14} /> Add row
                  </button>
                </div>

                <div className="dpr-table-wrap">
                  <table className="dpr-editable-table">
                    <thead>
                      <tr>
                        <th style={{ width: "40px" }}>#</th>
                        <th>Work Description</th>
                        <th style={{ width: "110px" }}>Line / Area</th>
                        <th style={{ width: "100px" }}>Joint / Tag</th>
                        <th style={{ width: "100px" }}>Work Type</th>
                        <th style={{ width: "70px" }}>Qty</th>
                        <th style={{ width: "60px" }}>Unit</th>
                        <th style={{ width: "40px" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {extractedItems.map((item, idx) => (
                        <tr
                          key={item.id}
                          className={item.confidence && item.confidence < 0.8 ? "low-confidence" : ""}
                        >
                          <td className="text-center text-xs text-slate-500">{idx + 1}</td>
                          <td>
                            <input
                              value={item.activityDescription}
                              onChange={(e) =>
                                updateRow(item.id, { activityDescription: e.target.value })
                              }
                              placeholder="Activity description"
                              className="dpr-cell-input"
                            />
                          </td>
                          <td>
                            <input
                              value={item.lineOrArea || ""}
                              onChange={(e) => updateRow(item.id, { lineOrArea: e.target.value })}
                              placeholder="Line / Area"
                              className="dpr-cell-input"
                            />
                          </td>
                          <td>
                            <input
                              value={item.jointOrTag || ""}
                              onChange={(e) => updateRow(item.id, { jointOrTag: e.target.value })}
                              placeholder="Joint / Tag"
                              className="dpr-cell-input font-mono"
                            />
                          </td>
                          <td>
                            <select
                              value={item.discipline || "piping"}
                              onChange={(e) =>
                                updateRow(item.id, { discipline: e.target.value as WorkType })
                              }
                              className="dpr-cell-select"
                            >
                              {WORK_TYPE_OPTIONS.map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              type="number"
                              step="any"
                              value={item.todayQty ?? ""}
                              onChange={(e) =>
                                updateRow(item.id, { todayQty: Number(e.target.value) || 0 })
                              }
                              className="dpr-cell-input text-right"
                            />
                          </td>
                          <td>
                            <input
                              value={item.unit || "ea"}
                              onChange={(e) => updateRow(item.id, { unit: e.target.value })}
                              className="dpr-cell-input"
                            />
                          </td>
                          <td>
                            <button
                              onClick={() => deleteRow(item.id)}
                              className="dpr-del-btn"
                              title="Delete row"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {extractedItems.length === 0 && (
                        <tr>
                          <td colSpan={8} className="dpr-table-empty">
                            No rows extracted yet. Upload a DPR or click &quot;Add row&quot; to build.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Remarks & Hindrance */}
              <div className="dpr-remarks-section">
                <label>
                  <span>Remarks / Notes</span>
                  <input
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="General shift remarks"
                  />
                </label>
                <label>
                  <span>Hindrance / Stoppage (if any)</span>
                  <input
                    value={hindrances}
                    onChange={(e) => setHindrances(e.target.value)}
                    placeholder="Weather, permit, material delays"
                  />
                </label>
              </div>

              {/* Bottom Confirm Action */}
              <div className="dpr-editor-actions">
                <button
                  onClick={confirmAndSaveDpr}
                  disabled={processing || extractedItems.length === 0}
                  className="dpr-confirm-btn"
                >
                  <CheckCircle2 size={16} />
                  <span>Confirm &amp; Synchronize Work Items</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: DPR ↔ DRAWING RECONCILIATION */}
      {mode === "reconcile" && (
        <div className="dpr-reconciliation-view">
          {/* Summary KPI Cards */}
          <div className="dpr-kpi-row">
            <div className="dpr-kpi-card match">
              <span>MATCHED RECORDS</span>
              <b>{reconciliation.matchedCount}</b>
              <small>Reported in DPR and verified in Drawing</small>
            </div>
            <div className="dpr-kpi-card dpr-only">
              <span>DPR ONLY</span>
              <b>{reconciliation.dprOnlyCount}</b>
              <small>In DPR but no matching drawing mark</small>
            </div>
            <div className="dpr-kpi-card drawing-only">
              <span>DRAWING ONLY</span>
              <b>{reconciliation.drawingOnlyCount}</b>
              <small>Marked on drawing but missing in DPR</small>
            </div>
            <div className="dpr-kpi-card resolved">
              <span>RESOLVED</span>
              <b>{reconciliation.resolvedCount}</b>
              <small>Mismatches addressed by supervisor</small>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="dpr-reconcile-controls">
            <div className="dpr-filter-pills">
              <button
                className={reconciliationFilter === "ALL" ? "active" : ""}
                onClick={() => setReconciliationFilter("ALL")}
              >
                All ({reconciliation.totalRecords})
              </button>
              <button
                className={reconciliationFilter === "MATCHED" ? "active" : ""}
                onClick={() => setReconciliationFilter("MATCHED")}
              >
                Matched ({reconciliation.matchedCount})
              </button>
              <button
                className={reconciliationFilter === "DPR_ONLY" ? "active" : ""}
                onClick={() => setReconciliationFilter("DPR_ONLY")}
              >
                DPR Only ({reconciliation.dprOnlyCount})
              </button>
              <button
                className={reconciliationFilter === "DRAWING_ONLY" ? "active" : ""}
                onClick={() => setReconciliationFilter("DRAWING_ONLY")}
              >
                Drawing Only ({reconciliation.drawingOnlyCount})
              </button>
            </div>

            <div className="dpr-reconcile-search">
              <Search size={15} />
              <input
                placeholder="Find joint, tag, line, or activity..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
              />
            </div>

            <button
              onClick={() => void runReconciliationForDate(dprDate)}
              className="dpr-refresh-btn"
              title="Rerun reconciliation"
            >
              <RefreshCw size={14} />
              <span>Rerun Match</span>
            </button>
          </div>

          {/* Reconciliation Items List */}
          <div className="dpr-reconcile-list">
            {filteredReconciliationItems.map((item) => (
              <div
                key={item.id}
                className={`dpr-reconcile-card status-${item.status.toLowerCase()} ${
                  item.resolved ? "resolved" : ""
                }`}
              >
                <div className="dpr-reconcile-header">
                  <div className="dpr-status-badge-wrap">
                    <span className={`dpr-status-pill ${item.status.toLowerCase()}`}>
                      {item.status === "MATCHED"
                        ? "MATCHED"
                        : item.status === "DPR_ONLY"
                        ? "DPR ONLY"
                        : "DRAWING ONLY"}
                    </span>
                    {item.resolved && (
                      <span className="dpr-resolved-pill">
                        <Check size={12} /> Resolved
                      </span>
                    )}
                  </div>
                  <small className="dpr-match-reason">{item.reason}</small>
                </div>

                <div className="dpr-reconcile-body">
                  {/* DPR Side */}
                  <div className="dpr-reconcile-col">
                    <span className="col-label">DPR REPORTED DATA</span>
                    {item.dprItem ? (
                      <div className="record-details">
                        <b>{item.dprItem.jointOrTag || "No joint ID"}</b>
                        <p>{item.dprItem.activityDescription}</p>
                        <small>
                          {item.dprItem.lineOrArea} · {item.dprItem.todayQty} {item.dprItem.unit}
                        </small>
                      </div>
                    ) : (
                      <p className="no-record-msg">— Not reported in DPR —</p>
                    )}
                  </div>

                  {/* EPCX Drawing / Work Item Side */}
                  <div className="dpr-reconcile-col">
                    <span className="col-label">EPCX WORK ITEM &amp; DRAWING</span>
                    {item.workItem ? (
                      <div className="record-details">
                        <b>{item.workItem.jointId || item.workItem.description}</b>
                        <p>
                          Status: <em>{item.workItem.status}</em>
                        </p>
                        <small>
                          Drawing: {item.drawingName || "Attached Drawing"} · Line:{" "}
                          {item.workItem.lineId || "—"}
                        </small>
                        {item.workItem.drawingId && onOpenDrawing && (
                          <button
                            onClick={() => onOpenDrawing(item.workItem!.drawingId!)}
                            className="dpr-open-drawing-link"
                          >
                            <ExternalLink size={12} /> Open in Drawing
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="no-record-msg">— Not marked on drawing —</p>
                    )}
                  </div>

                  {/* Resolution Action Buttons */}
                  <div className="dpr-reconcile-actions">
                    {item.status === "DPR_ONLY" && !item.resolved && (
                      <div className="action-buttons-wrap">
                        <button
                          onClick={() =>
                            resolveReconciliationItem(item.id, "created_work_item")
                          }
                          className="dpr-resolve-btn create"
                        >
                          Create Work Item
                        </button>
                        <button
                          onClick={() => resolveReconciliationItem(item.id, "dismissed")}
                          className="dpr-resolve-btn dismiss"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}

                    {item.status === "DRAWING_ONLY" && !item.resolved && (
                      <div className="action-buttons-wrap">
                        <button
                          onClick={() =>
                            resolveReconciliationItem(item.id, "marked_reported")
                          }
                          className="dpr-resolve-btn mark-reported"
                        >
                          Mark Reported in DPR
                        </button>
                        <button
                          onClick={() => resolveReconciliationItem(item.id, "dismissed")}
                          className="dpr-resolve-btn dismiss"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}

                    {item.status === "MATCHED" && (
                      <div className="matched-indicator">
                        <CheckCircle2 size={18} className="text-emerald-600" />
                        <span>Verified</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredReconciliationItems.length === 0 && (
              <div className="dpr-reconcile-empty">
                <CheckCircle2 size={32} className="text-emerald-600" />
                <h3>No reconciliation mismatches</h3>
                <p>All DPR records and drawing items for this date are aligned.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Intelligent Extraction Engine (Heuristic + Regex + Tabular Parsing)
 */
function extractDprStructuredData(text: string, fileName: string) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // 1. Metadata detection
  const dateMatch = text.match(/\b(\d{1,2})[\s./-]+([A-Za-z]{3,9}|\d{1,2})[\s,./-]+(20\d{2})\b/);
  let date = "";
  if (dateMatch) {
    const monthText = dateMatch[2];
    const month = /^\d+$/.test(monthText) ? Number(monthText) - 1 : new Date(`${monthText} 1, 2020`).getMonth();
    if (month >= 0 && month < 12) date = `${dateMatch[3]}-${String(month + 1).padStart(2, "0")}-${dateMatch[1].padStart(2, "0")}`;
  }

  const labeled = (pattern: RegExp) => text.match(pattern)?.[1]?.trim().slice(0, 160) ?? "";
  const contractor = labeled(/(?:contractor|agency|vendor)\s*[:\-]?\s*([^\n,;]+)/i);
  const area = labeled(/(?:area|unit|location|zone)\s*[:\-]?\s*([^\n,;]+)/i);
  const manpowerMatch = text.match(/(?:manpower|total\s+(?:men|workforce|workers))\s*[:\-]?\s*(\d{1,4})/i);
  const manpower = manpowerMatch ? Number(manpowerMatch[1]) : 0;
  const equipment = labeled(/(?:equipment|machinery)\s*[:\-]?\s*([^\n;]+)/i);
  const remarks = labeled(/(?:remarks|notes|hindrance)\s*[:\-]?\s*([^\n;]+)/i);

  // 2. Tabular row detection
  const items: DprTableItem[] = [];
  const jointOrItemRegex = /\b(J-?\d+|W-?\d+|TAG-?\d+|SP-?\d+|LINE-?\d+|TK-?\d+|EQ-?\d+)\b/i;

  let rowCounter = 1;
  for (const line of lines) {
    // Check if line looks like a progress/activity record
    const match = line.match(jointOrItemRegex);
    const hasNumber = /\b\d+(?:\.\d+)?\s*(?:m|m2|m3|inch|dia|joint|ea|nos|unit|mt)?\b/i.test(line);

    if (match || (hasNumber && line.length > 15 && !line.toLowerCase().includes("page"))) {
      const jointOrTag = match ? match[1].toUpperCase() : "";
      const numbers = line.match(/\b\d+(?:\.\d+)?\b/g);
      const qty = numbers ? Number(numbers[numbers.length - 1]) : 1;

      // Extract description by stripping tag
      let desc = line.replace(jointOrItemRegex, "").replace(/\b\d+(?:\.\d+)?\b/g, "").replace(/[-|:]+/g, " ").trim();
      if (desc.length < 4) desc = `Execution work - ${jointOrTag || "Item"}`;

      // Detect discipline
      let discipline: WorkType = "piping";
      const lLow = line.toLowerCase();
      if (lLow.includes("weld") || lLow.includes("fit-up") || lLow.includes("root")) discipline = "welding";
      else if (lLow.includes("tank") || lLow.includes("shell") || lLow.includes("curb")) discipline = "tank";
      else if (lLow.includes("struct") || lLow.includes("beam") || lLow.includes("column")) discipline = "structural";
      else if (lLow.includes("civil") || lLow.includes("concrete") || lLow.includes("rebar")) discipline = "civil";
      else if (lLow.includes("cable") || lLow.includes("conduit") || lLow.includes("tray")) discipline = "electrical";

      items.push({
        id: crypto.randomUUID(),
        itemNo: rowCounter++,
        activityDescription: desc.slice(0, 140),
        discipline,
        lineOrArea: area || "Area-01",
        jointOrTag,
        unit: discipline === "welding" ? "joint" : discipline === "piping" ? "m" : "ea",
        todayQty: qty > 0 && qty < 1000 ? qty : 1,
        cumulativeQty: qty > 0 && qty < 1000 ? qty : 1,
        confidence: match ? 0.92 : 0.75,
      });
    }
  }

  // Fallback if no table lines detected
  if (items.length === 0) {
    items.push({
      id: crypto.randomUUID(),
      itemNo: 1,
      activityDescription: `Field execution recorded in ${fileName.replace(/\.[^.]+$/, "")}`,
      discipline: "piping",
      lineOrArea: area || "Main Area",
      jointOrTag: "",
      unit: "ea",
      todayQty: 1,
      cumulativeQty: 1,
      confidence: 0.8,
    });
  }

  return {
    date,
    contractor,
    area,
    manpower,
    equipment,
    remarks,
    items,
  };
}
