"use client";

import { useState, useMemo } from "react";
import {
  HardHat,
  Search,
  Filter,
  Check,
  Circle,
  ExternalLink,
  Plus,
  ArrowUpDown,
  Download,
  AlertCircle,
  Clock,
  Sparkles,
  Camera,
  Layers,
  ChevronRight,
  ShieldCheck,
  Edit2,
  X,
  FileText,
  Calendar,
  BookOpen,
  History,
} from "lucide-react";
import type { CentralWorkItem, WorkItemStatus, WorkType, NdtStatus } from "@/lib/field-progress/work-item-model";
import { WORK_TYPE_OPTIONS } from "@/lib/field-progress/work-item-model";
import { useFieldWork } from "@/contexts/FieldWorkContext";
import type { FieldProject } from "./FieldProjectProfile";
import { EpcxSpinner, EpcxLoadingScreen } from "@/components/ui/EpcxSpinner";

interface WorkRegisterWorkspaceProps {
  project?: FieldProject;
  onOpenDrawing?: (drawingId: string) => void;
  onOpenDpr?: (dprId: string) => void;
  onOpenQuality?: (workItemId?: string) => void;
  onAddPhotoForWorkItem?: (item: CentralWorkItem) => void;
}

export function WorkRegisterWorkspace({
  project,
  onOpenDrawing,
  onOpenDpr,
  onOpenQuality,
  onAddPhotoForWorkItem,
}: WorkRegisterWorkspaceProps) {
  const {
    workItems,
    todayWorkItems,
    updateWorkItemStatus,
    addOrUpdateWorkItem,
    deleteWorkItem,
    syncState,
    loading,
  } = useFieldWork();

  const [disciplineFilter, setDisciplineFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [dprFilter, setDprFilter] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<string>("ALL");
  const [drawingFilter, setDrawingFilter] = useState<string>("ALL");
  const [lineFilter, setLineFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<CentralWorkItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [viewScope, setViewScope] = useState<"TODAY" | "ALL">("TODAY");

  // Active items based on view scope
  const activeList = viewScope === "TODAY" ? todayWorkItems : workItems;

  // Distinct drawings and lines for filter dropdowns
  const availableDrawings = useMemo(() => {
    const set = new Set<string>();
    for (const item of workItems) {
      if (item.drawingName) set.add(item.drawingName);
    }
    return Array.from(set).sort();
  }, [workItems]);

  const availableLines = useMemo(() => {
    const set = new Set<string>();
    for (const item of workItems) {
      if (item.lineId) set.add(item.lineId);
    }
    return Array.from(set).sort();
  }, [workItems]);

  const filteredItems = useMemo(() => {
    return activeList.filter((item) => {
      if (disciplineFilter !== "ALL" && item.discipline !== disciplineFilter) return false;
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      if (dprFilter === "REPORTED" && !item.dprReported) return false;
      if (dprFilter === "MISSING" && item.dprReported) return false;
      if (drawingFilter !== "ALL" && item.drawingName !== drawingFilter) return false;
      if (lineFilter !== "ALL" && item.lineId !== lineFilter) return false;
      if (dateFilter !== "ALL" && item.fieldDate !== dateFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const str = `${item.jointId || ""} ${item.lineId || ""} ${item.description || ""} ${item.discipline} ${item.crew || ""} ${item.drawingName || ""} ${item.remarks || ""}`;
        if (!str.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [activeList, disciplineFilter, statusFilter, dprFilter, drawingFilter, lineFilter, dateFilter, searchQuery]);

  // Counts
  const completedCount = activeList.filter((i) => i.status === "Complete").length;
  const inProgressCount = activeList.filter((i) => i.status === "In Progress").length;
  const needsStatusCount = Math.max(0, activeList.length - completedCount - inProgressCount);
  const dprMissingCount = activeList.filter((i) => i.status === "Complete" && !i.dprReported).length;
  const ndtPendingCount = activeList.filter((i) => i.ndtStatus === "pending").length;
  const unresolvedCount = activeList.filter((i) => i.needsIdentification || !i.jointId).length;

  function exportRegisterCsv() {
    const headers = [
      "Work Item ID",
      "Date",
      "Discipline",
      "Joint / Tag",
      "Line / Area",
      "Drawing",
      "Description",
      "Status",
      "Quantity",
      "Unit",
      "DPR Reported",
      "NDT Status",
      "Crew / Welder",
      "Remarks",
      "Updated",
    ];
    const rows = filteredItems.map((item) => [
      item.id,
      item.fieldDate,
      item.discipline,
      item.jointId || "",
      item.lineId || "",
      item.drawingName || "",
      item.description,
      item.status,
      item.quantity ?? 1,
      item.unit || "ea",
      item.dprReported ? "Yes" : "No",
      item.ndtStatus || "not_required",
      item.crew || "",
      item.remarks || "",
      item.updatedAt || item.createdAt || "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))].join(
        "\n"
      );
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `epcx-work-items-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const formatItemTime = (iso?: string) => {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) + " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return iso;
    }
  };

  return (
    <div className="work-register-workbench">
      {/* Top Header & Context */}
      <header className="work-reg-header">
        <div className="work-reg-title-wrap">
          <p className="field-section-kicker">
            <HardHat size={14} />
            <span>FIELD EXECUTION REGISTER</span>
            {syncState === "saving" && <span className="sync-badge saving">Saving...</span>}
            {syncState === "offline" && <span className="sync-badge offline">Offline Cache</span>}
          </p>
          <h1>Field Execution Register</h1>
          <p className="field-workspace-subline">
            Track work across drawings, DPRs and field records.
          </p>
        </div>

        <div className="work-reg-scope-switch">
          <button
            className={viewScope === "TODAY" ? "active" : ""}
            onClick={() => setViewScope("TODAY")}
          >
            Today ({todayWorkItems.length})
          </button>
          <button
            className={viewScope === "ALL" ? "active" : ""}
            onClick={() => setViewScope("ALL")}
          >
            All Recorded ({workItems.length})
          </button>
        </div>
      </header>

      {/* KPI Counters */}
      <div className="work-kpi-bar">
        <div className="work-kpi-pill">
          <span>Total</span>
          <b>{activeList.length}</b>
        </div>
        <div className="work-kpi-pill complete">
          <span>Complete</span>
          <b>{completedCount}</b>
        </div>
        <div className="work-kpi-pill progress">
          <span>In Progress</span>
          <b>{inProgressCount}</b>
        </div>
        <div className="work-kpi-pill">
          <span>Needs Status</span>
          <b>{needsStatusCount}</b>
        </div>
        <div className="work-kpi-pill dpr-missing">
          <span>DPR Missing</span>
          <b>{dprMissingCount}</b>
        </div>
        <div className="work-kpi-pill unresolved">
          <span>NDT Pending</span>
          <b>{ndtPendingCount}</b>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="work-reg-filters">
        <div className="work-search-box">
          <Search size={15} />
          <input
            placeholder="Search joint, line, tag, drawing, description or crew..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          value={disciplineFilter}
          onChange={(e) => setDisciplineFilter(e.target.value)}
          className="work-select-filter"
          title="Filter by discipline"
        >
          <option value="ALL">All Disciplines</option>
          {WORK_TYPE_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="work-select-filter"
          title="Filter by status"
        >
          <option value="ALL">All Statuses</option>
          <option value="Complete">Complete</option>
          <option value="In Progress">In Progress</option>
          <option value="Planned">Planned</option>
          <option value="Needs Review">Needs Review</option>
        </select>

        <select
          value={dprFilter}
          onChange={(e) => setDprFilter(e.target.value)}
          className="work-select-filter"
          title="Filter by DPR state"
        >
          <option value="ALL">All DPR States</option>
          <option value="REPORTED">DPR ✓ (Reported)</option>
          <option value="MISSING">DPR Missing</option>
        </select>

        {availableDrawings.length > 0 && (
          <select
            value={drawingFilter}
            onChange={(e) => setDrawingFilter(e.target.value)}
            className="work-select-filter"
            title="Filter by drawing"
          >
            <option value="ALL">All Drawings ({availableDrawings.length})</option>
            {availableDrawings.map((dwg) => (
              <option key={dwg} value={dwg}>
                {dwg}
              </option>
            ))}
          </select>
        )}

        {availableLines.length > 0 && (
          <select
            value={lineFilter}
            onChange={(e) => setLineFilter(e.target.value)}
            className="work-select-filter"
            title="Filter by line / area"
          >
            <option value="ALL">All Lines / Areas ({availableLines.length})</option>
            {availableLines.map((ln) => (
              <option key={ln} value={ln}>
                {ln}
              </option>
            ))}
          </select>
        )}

        <button onClick={exportRegisterCsv} className="work-export-btn" title="Export CSV">
          <Download size={15} />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Main Register Table & Detail Split */}
      <div className="work-table-and-drawer">
        <div className="work-table-container">
          <table className="work-register-table">
            <thead>
              <tr>
                <th style={{ width: "36px" }}></th>
                <th style={{ width: "120px" }}>Work / Item ID</th>
                <th>Description</th>
                <th style={{ width: "130px" }}>Drawing</th>
                <th style={{ width: "120px" }}>Line / Area</th>
                <th style={{ width: "95px" }}>Discipline</th>
                <th style={{ width: "105px" }}>Status</th>
                <th style={{ width: "95px" }}>DPR</th>
                <th style={{ width: "90px" }}>Quality/NDT</th>
                <th style={{ width: "85px" }}>Origin</th>
                <th style={{ width: "110px" }}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const isComplete = item.status === "Complete";
                const isDprReported = item.dprReported;
                const isSelected = selectedItem?.id === item.id;

                return (
                  <tr
                    key={item.id}
                    className={`${isSelected ? "is-selected" : ""} ${
                      item.needsIdentification ? "is-unresolved" : ""
                    }`}
                    onClick={() => {
                      setSelectedItem(item);
                      setIsEditing(false);
                    }}
                  >
                    <td className="text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() =>
                          updateWorkItemStatus(
                            item.id,
                            isComplete ? "In Progress" : "Complete"
                          )
                        }
                        className={`work-quick-status-btn ${isComplete ? "done" : "open"}`}
                        title={isComplete ? "Mark In Progress" : "Mark Complete (1 click)"}
                      >
                        {isComplete ? <Check size={13} /> : <Circle size={11} />}
                      </button>
                    </td>

                    <td className="font-mono font-medium">
                      <div className="id-with-tag">
                        <span>{item.jointId || item.id.slice(0, 8)}</span>
                        {item.needsIdentification && (
                          <span className="unresolved-tag" title="Temporary ID - needs tag">
                            Identify
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="description-cell">
                      <span>{item.description}</span>
                      {item.remarks && <small>{item.remarks}</small>}
                    </td>

                    <td className="drawing-cell">
                      {item.drawingName ? (
                        <div className="dwg-inline-tag" title={item.drawingName}>
                          <BookOpen size={12} />
                          <span>{item.drawingName}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td>{item.lineId || "—"}</td>

                    <td>
                      <span className="discipline-badge">{item.discipline}</span>
                    </td>

                    <td>
                      <span className={`status-pill ${item.status.toLowerCase().replace(/\s+/g, "-")}`}>
                        {item.status}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`dpr-sync-pill ${isDprReported ? "reported" : "missing"}`}
                      >
                        {isDprReported ? "DPR ✓" : "Missing"}
                      </span>
                    </td>

                    <td>
                      <span className={`ndt-pill ndt-${item.ndtStatus || "none"}`}>
                        {item.ndtStatus === "pass"
                          ? "Pass"
                          : item.ndtStatus === "pending"
                          ? "Pending"
                          : item.ndtStatus === "fail"
                          ? "Fail"
                          : "—"}
                      </span>
                    </td>

                    <td className="origin-cell">
                      <span>{item.createdFrom}</span>
                    </td>

                    <td className="updated-cell font-mono text-xs">
                      <span>{formatItemTime(item.updatedAt || item.createdAt)}</span>
                    </td>
                  </tr>
                );
              })}

              {loading ? (
                <tr>
                  <td colSpan={11} className="work-table-empty" style={{ padding: "48px 16px" }}>
                    <EpcxSpinner size="lg" label="Loading project work items…" />
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="work-table-empty">
                    <HardHat size={32} className="text-slate-400" />
                    <p>No work items match the selected filter or search.</p>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* Selected Work Item Enrichment Drawer */}
        {selectedItem && (
          <aside className="work-detail-drawer">
            <div className="drawer-header">
              <div>
                <small>WORK ITEM ENRICHMENT</small>
                <h2>{selectedItem.jointId || "Unidentified Item"}</h2>
              </div>
              <button onClick={() => setSelectedItem(null)} className="drawer-close-btn">
                <X size={16} />
              </button>
            </div>

            <div className="drawer-content">
              {/* Primary Quick Status Action */}
              <div className="drawer-status-toggle">
                <span>Current Status</span>
                <div className="status-button-group">
                  <button
                    className={selectedItem.status === "In Progress" ? "active" : ""}
                    onClick={() => {
                      updateWorkItemStatus(selectedItem.id, "In Progress");
                      setSelectedItem({ ...selectedItem, status: "In Progress" });
                    }}
                  >
                    In Progress
                  </button>
                  <button
                    className={selectedItem.status === "Complete" ? "active done" : ""}
                    onClick={() => {
                      updateWorkItemStatus(selectedItem.id, "Complete");
                      setSelectedItem({ ...selectedItem, status: "Complete" });
                    }}
                  >
                    <Check size={14} /> Complete
                  </button>
                </div>
              </div>

              {/* Editable Fields Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void addOrUpdateWorkItem({
                    ...selectedItem,
                    needsIdentification: !selectedItem.jointId,
                  });
                  setIsEditing(false);
                }}
                className="drawer-form"
              >
                <div className="drawer-form-field">
                  <label>Joint / Tag ID</label>
                  <input
                    value={selectedItem.jointId || ""}
                    onChange={(e) =>
                      setSelectedItem({ ...selectedItem, jointId: e.target.value })
                    }
                    placeholder="e.g. J-104, SP-02, TK-01"
                    className="font-mono"
                  />
                </div>

                <div className="drawer-form-field">
                  <label>Line / Area / Unit</label>
                  <input
                    value={selectedItem.lineId || ""}
                    onChange={(e) =>
                      setSelectedItem({ ...selectedItem, lineId: e.target.value })
                    }
                    placeholder="e.g. 24-P-102 North Rack"
                  />
                </div>

                <div className="drawer-form-field">
                  <label>Discipline</label>
                  <select
                    value={selectedItem.discipline}
                    onChange={(e) =>
                      setSelectedItem({
                        ...selectedItem,
                        discipline: e.target.value as WorkType,
                      })
                    }
                  >
                    {WORK_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="drawer-form-row">
                  <div className="drawer-form-field">
                    <label>Quantity</label>
                    <input
                      type="number"
                      step="any"
                      value={selectedItem.quantity ?? 1}
                      onChange={(e) =>
                        setSelectedItem({
                          ...selectedItem,
                          quantity: Number(e.target.value) || 1,
                        })
                      }
                    />
                  </div>
                  <div className="drawer-form-field">
                    <label>Unit</label>
                    <input
                      value={selectedItem.unit || "ea"}
                      onChange={(e) =>
                        setSelectedItem({ ...selectedItem, unit: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="drawer-form-field">
                  <label>Description</label>
                  <input
                    value={selectedItem.description}
                    onChange={(e) =>
                      setSelectedItem({ ...selectedItem, description: e.target.value })
                    }
                  />
                </div>

                <div className="drawer-form-row">
                  <div className="drawer-form-field">
                    <label>Crew / Welder</label>
                    <input
                      value={selectedItem.crew || selectedItem.welder || ""}
                      onChange={(e) =>
                        setSelectedItem({ ...selectedItem, crew: e.target.value })
                      }
                      placeholder="e.g. Crew A, W-04"
                    />
                  </div>
                  <div className="drawer-form-field">
                    <label>NDT Status</label>
                    <select
                      value={selectedItem.ndtStatus || "not_required"}
                      onChange={(e) =>
                        setSelectedItem({
                          ...selectedItem,
                          ndtStatus: e.target.value as NdtStatus,
                        })
                      }
                    >
                      <option value="not_required">Not required</option>
                      <option value="pending">Pending inspection</option>
                      <option value="pass">Passed / Accepted</option>
                      <option value="fail">Failed / Repair</option>
                    </select>
                  </div>
                </div>

                <div className="drawer-form-field">
                  <label>Field Remarks</label>
                  <textarea
                    rows={2}
                    value={selectedItem.remarks || ""}
                    onChange={(e) =>
                      setSelectedItem({ ...selectedItem, remarks: e.target.value })
                    }
                    placeholder="Specific observations, fit-up remarks, heat number"
                  />
                </div>

                {/* Linked Records Info */}
                <div className="drawer-linked-records">
                  <small>CONNECTED FIELD EXECUTION FACTS</small>
                  {selectedItem.drawingId ? (
                    <div className="linked-row">
                      <span className="linked-type">Drawing</span>
                      <b>{selectedItem.drawingName || "Attached Drawing"}</b>
                      {onOpenDrawing && (
                        <button
                          type="button"
                          onClick={() => onOpenDrawing(selectedItem.drawingId!)}
                          className="linked-jump-btn"
                        >
                          <ExternalLink size={13} />
                          <span>View Pin</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="linked-row missing">
                      <span className="linked-type">Drawing</span>
                      <span>No drawing linked yet</span>
                    </div>
                  )}

                  {selectedItem.dprId ? (
                    <div className="linked-row">
                      <span className="linked-type">DPR</span>
                      <b>Reported on {selectedItem.dprDate || selectedItem.fieldDate}</b>
                      {onOpenDpr && (
                        <button
                          type="button"
                          onClick={() => onOpenDpr(selectedItem.dprId!)}
                          className="linked-jump-btn"
                        >
                          <FileText size={13} />
                          <span>View DPR</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="linked-row missing">
                      <span className="linked-type">DPR</span>
                      <span>Not yet reported in DPR (Pending)</span>
                    </div>
                  )}

                  <div className="linked-row">
                    <span className="linked-type">Evidence</span>
                    <b>{selectedItem.photos?.length ? `${selectedItem.photos.length} photo${selectedItem.photos.length === 1 ? "" : "s"} attached` : "Site evidence available"}</b>
                    {onAddPhotoForWorkItem ? (
                      <button
                        type="button"
                        onClick={() => onAddPhotoForWorkItem(selectedItem)}
                        className="linked-jump-btn"
                        title="Capture or attach photo to this work item"
                      >
                        <Camera size={13} />
                        <span>Add Photo</span>
                      </button>
                    ) : (
                      <span className="font-mono text-xs text-slate-500">
                        {selectedItem.photos?.length ? "Attached" : "No photos"}
                      </span>
                    )}
                  </div>

                  <div className="linked-row">
                    <span className="linked-type">Quality/NDT</span>
                    <b>
                      {selectedItem.ndtStatus === "pass"
                        ? "Accepted / Passed"
                        : selectedItem.ndtStatus === "fail"
                        ? "Repair Required / Failed"
                        : selectedItem.ndtStatus === "pending"
                        ? "Pending Inspector Sign-off"
                        : "Visual / Not Required"}
                    </b>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setSelectedItem({ ...selectedItem, ndtStatus: "pass" })}
                        className={`text-[10px] px-1.5 py-0.5 rounded border ${selectedItem.ndtStatus === "pass" ? "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold" : "bg-white text-slate-600 border-slate-300"}`}
                        title="Mark NDT / Inspection Passed"
                      >
                        Pass
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedItem({ ...selectedItem, ndtStatus: "pending" })}
                        className={`text-[10px] px-1.5 py-0.5 rounded border ${selectedItem.ndtStatus === "pending" ? "bg-amber-100 text-amber-800 border-amber-300 font-bold" : "bg-white text-slate-600 border-slate-300"}`}
                        title="Mark NDT Pending"
                      >
                        Pending
                      </button>
                      {onOpenQuality && (
                        <button
                          type="button"
                          onClick={() => onOpenQuality(selectedItem.id)}
                          className="text-[10px] px-2 py-0.5 rounded border border-[#315e49] bg-[#eef4ef] text-[#315e49] font-bold hover:bg-[#e2ece4] flex items-center gap-1"
                          title="Open Quality inspection and photo review for this item"
                        >
                          <ShieldCheck size={11} />
                          Review
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Audit & Event History */}
                <div className="drawer-history-section">
                  <div className="flex items-center gap-1.5 mb-2 text-xs font-bold text-slate-700 tracking-wider font-mono uppercase">
                    <History size={13} />
                    <span>Audit &amp; Field History</span>
                  </div>
                  {selectedItem.history && selectedItem.history.length > 0 ? (
                    <div className="drawer-history-timeline">
                      {selectedItem.history.map((hist, idx) => (
                        <div key={idx} className="drawer-history-item">
                          <span className="history-bullet" />
                          <div className="history-body">
                            <div className="history-head">
                              <b>{hist.action}</b>
                              <time>{formatItemTime(hist.at)}</time>
                            </div>
                            {hist.details && <p>{hist.details}</p>}
                            {hist.by && <small>by {hist.by}</small>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic p-2 bg-slate-50 rounded border border-slate-200">
                      Created from {selectedItem.createdFrom} on {formatItemTime(selectedItem.createdAt)}. No further modifications recorded yet.
                    </p>
                  )}
                </div>

                <div className="drawer-footer-actions">
                  <button type="submit" className="drawer-save-btn">
                    Save Work Item Details
                  </button>
                </div>
              </form>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
