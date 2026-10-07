"use client";

import { useState } from "react";
import {
  Wrench,
  FileText,
  Layers,
  FileSpreadsheet,
  Calculator,
  ChevronRight,
  Upload,
  HardHat,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { DprExtractionAndReconciliation } from "./DprExtractionAndReconciliation";
import { useFieldWork } from "@/contexts/FieldWorkContext";
import type { CentralWorkItem, WorkType } from "@/lib/field-progress/work-item-model";
import type { FieldProject } from "./FieldProjectProfile";

export type ActiveTool =
  | "menu"
  | "dpr_extractor"
  | "reconciliation"
  | "import_register"
  | "inch_dia_calc"
  | "structural_calc";

interface FieldToolboxWorkspaceProps {
  project?: FieldProject;
  initialTool?: ActiveTool;
  onOpenDrawing?: (drawingId: string) => void;
  onOpenDpr?: (dprId: string) => void;
}

export function FieldToolboxWorkspace({
  project,
  initialTool = "menu",
  onOpenDrawing,
  onOpenDpr,
}: FieldToolboxWorkspaceProps) {
  const [activeTool, setActiveTool] = useState<ActiveTool>(initialTool);
  const { addWorkItemsBulk } = useFieldWork();

  // Excel / CSV Import Tool state
  const [importText, setImportText] = useState("");
  const [importDiscipline, setImportDiscipline] = useState<WorkType>("piping");
  const [importStatus, setImportStatus] = useState("");

  // Inch-Dia Calculator state
  const [inchDiaEntries, setInchDiaEntries] = useState<
    Array<{ sizeInch: number; thicknessMm: number; quantity: number; line: string }>
  >([
    { sizeInch: 4, thicknessMm: 6.02, quantity: 6, line: "12-P-101" },
    { sizeInch: 6, thicknessMm: 7.11, quantity: 4, line: "12-P-101" },
    { sizeInch: 10, thicknessMm: 9.27, quantity: 2, line: "12-P-102" },
  ]);

  const totalInchDia = inchDiaEntries.reduce(
    (acc, curr) => acc + curr.sizeInch * curr.quantity,
    0
  );

  // Structural Calculator state
  const [structuralEntries, setStructuralEntries] = useState<
    Array<{ section: string; weightKgM: number; lengthM: number; count: number; area: string }>
  >([
    { section: "ISMB 300", weightKgM: 44.2, lengthM: 6.0, count: 4, area: "Pipe Rack Tier 1" },
    { section: "ISMB 200", weightKgM: 25.4, lengthM: 4.5, count: 6, area: "Pipe Rack Secondary" },
    { section: "ISMC 150", weightKgM: 16.4, lengthM: 3.0, count: 8, area: "Walkway Bracing" },
  ]);

  const totalStructuralWeightKg = structuralEntries.reduce(
    (acc, curr) => acc + curr.weightKgM * curr.lengthM * curr.count,
    0
  );
  const totalStructuralTons = (totalStructuralWeightKg / 1000).toFixed(2);

  async function handleCsvImport() {
    if (!importText.trim()) return;
    try {
      const lines = importText.trim().split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) {
        setImportStatus("Please provide a header row and at least one data row.");
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const jointIdx = headers.findIndex((h) =>
        ["joint", "joint_id", "tag", "item", "id"].includes(h)
      );
      const lineIdx = headers.findIndex((h) =>
        ["line", "line_id", "area", "system"].includes(h)
      );
      const descIdx = headers.findIndex((h) =>
        ["desc", "description", "activity"].includes(h)
      );
      const qtyIdx = headers.findIndex((h) => ["qty", "quantity"].includes(h));

      const newItems: CentralWorkItem[] = [];
      const today = new Date().toISOString().slice(0, 10);
      const now = new Date().toISOString();

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
        const jointId = jointIdx >= 0 ? parts[jointIdx] : `WI-${i}`;
        const lineId = lineIdx >= 0 ? parts[lineIdx] : "";
        const desc = descIdx >= 0 ? parts[descIdx] : `Field item ${jointId}`;
        const qty = qtyIdx >= 0 ? Number(parts[qtyIdx]) || 1 : 1;

        newItems.push({
          id: crypto.randomUUID(),
          fieldDate: today,
          discipline: importDiscipline,
          lineId,
          jointId,
          description: desc,
          quantity: qty,
          unit: importDiscipline === "welding" ? "joint" : "m",
          status: "Planned",
          progress: 0,
          createdFrom: "import",
          dprReported: false,
          createdAt: now,
          updatedAt: now,
        });
      }

      await addWorkItemsBulk(newItems);
      setImportStatus(`Successfully imported ${newItems.length} work items into the register.`);
      setImportText("");
    } catch (err) {
      setImportStatus("Import failed. Check CSV formatting (comma separated values).");
    }
  }

  return (
    <div className="work-register-workbench field-toolbox-workbench">
      {/* Sub-navigation bar when a tool is active */}
      {activeTool !== "menu" && (
        <div className="toolbox-nav-bar">
          <button onClick={() => setActiveTool("menu")} className="toolbox-back-btn">
            ← Back to Field Toolbox
          </button>
          <div className="toolbox-breadcrumb">
            <Wrench size={14} />
            <button onClick={() => setActiveTool("menu")}>Field Toolbox</button>
            <span>/</span>
            <b>
              {activeTool === "dpr_extractor"
                ? "DPR Table Extractor"
                : activeTool === "reconciliation"
                ? "DPR ↔ Drawing Reconciliation"
                : activeTool === "import_register"
                ? "CSV/Excel Register Importer"
                : activeTool === "inch_dia_calc"
                ? "Piping Inch-Dia Calculator"
                : "Structural Steel Tonnage Estimator"}
            </b>
          </div>
        </div>
      )}

      {/* Main Tools Catalog Menu */}
      {activeTool === "menu" && (
        <div className="toolbox-catalog">
          <header className="work-reg-header">
            <div className="work-reg-title-wrap">
              <p className="field-section-kicker">
                <Wrench size={14} />
                <span>FIELD ENGINEERING TOOLBOX</span>
              </p>
              <h1>Field Engineering Toolbox</h1>
              <p className="field-workspace-subline">
                Utilities that transform, verify, reconcile, or calculate site execution data.
              </p>
            </div>
          </header>

          <div className="toolbox-grid">
            {/* Tool 1: Capture - DPR Extractor */}
            <article className="tool-card" onClick={() => setActiveTool("dpr_extractor")}>
              <div className="tool-card-icon">
                <FileText size={20} />
              </div>
              <div className="tool-card-body">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">CAPTURE</span>
                </div>
                <h3>DPR Table Extractor</h3>
                <p>
                  Extract structured work items, manpower, and progress tables directly from client
                  DPR photos or PDFs with side-by-side verification.
                </p>
              </div>
              <div className="tool-card-action">
                <span>Open Extractor</span>
                <ArrowRight size={14} />
              </div>
            </article>

            {/* Tool 2: Capture - CSV Register Importer */}
            <article className="tool-card" onClick={() => setActiveTool("import_register")}>
              <div className="tool-card-icon">
                <FileSpreadsheet size={20} />
              </div>
              <div className="tool-card-body">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">CAPTURE</span>
                </div>
                <h3>CSV / Excel Register Importer</h3>
                <p>
                  Quickly bulk-import joint registers, line lists, or equipment tags into the central
                  work register to pin on drawings or report.
                </p>
              </div>
              <div className="tool-card-action">
                <span>Import Register</span>
                <ArrowRight size={14} />
              </div>
            </article>

            {/* Tool 3: Connect - DPR ↔ Drawing Reconciliation */}
            <article className="tool-card" onClick={() => setActiveTool("reconciliation")}>
              <div className="tool-card-icon">
                <Layers size={20} />
              </div>
              <div className="tool-card-body">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">CONNECT</span>
                </div>
                <h3>DPR ↔ Drawing Reconciliation</h3>
                <p>
                  Compare reported work from daily DPRs against actual marks on drawings; categorizes into
                  MATCHED, DPR ONLY, and DRAWING ONLY with 1-click resolution.
                </p>
              </div>
              <div className="tool-card-action">
                <span>Run Reconciliation</span>
                <ArrowRight size={14} />
              </div>
            </article>

            {/* Tool 4: Calculate - Piping Inch-Dia */}
            <article className="tool-card" onClick={() => setActiveTool("inch_dia_calc")}>
              <div className="tool-card-icon">
                <Calculator size={20} />
              </div>
              <div className="tool-card-body">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">CALCULATE</span>
                  <span className="text-[10px] font-mono text-slate-500">Piping</span>
                </div>
                <h3>Piping Inch-Dia Calculator</h3>
                <p>
                  Calculate total diameter-inch production, equivalent joint factors, and welder
                  productivity rates for piping erection shifts.
                </p>
              </div>
              <div className="tool-card-action">
                <span>Calculate Inch-Dia</span>
                <ArrowRight size={14} />
              </div>
            </article>

            {/* Tool 5: Calculate - Structural Steel Tonnage */}
            <article className="tool-card" onClick={() => setActiveTool("structural_calc")}>
              <div className="tool-card-icon">
                <HardHat size={20} />
              </div>
              <div className="tool-card-body">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">CALCULATE</span>
                  <span className="text-[10px] font-mono text-slate-500">Structural</span>
                </div>
                <h3>Structural Tonnage Estimator</h3>
                <p>
                  Estimate structural steel erection weight (MT), member section tallies, and coating
                  surface area for structural progress reports.
                </p>
              </div>
              <div className="tool-card-action">
                <span>Estimate Tonnage</span>
                <ArrowRight size={14} />
              </div>
            </article>
          </div>
        </div>
      )}

      {/* TOOL VIEWS */}
      {activeTool === "dpr_extractor" && (
        <DprExtractionAndReconciliation
          project={project}
          initialMode="extract"
          onOpenDrawing={onOpenDrawing}
          onDprSaved={() => setActiveTool("reconciliation")}
        />
      )}

      {activeTool === "reconciliation" && (
        <DprExtractionAndReconciliation
          project={project}
          initialMode="reconcile"
          onOpenDrawing={onOpenDrawing}
        />
      )}



      {activeTool === "import_register" && (
        <div className="tool-detail-card">
          <header className="tool-detail-header">
            <h2>CSV / Excel Register Importer</h2>
            <p>Paste comma-separated rows or columns to batch load work items into EPCX.</p>
          </header>

          <div className="tool-import-form">
            <div className="tool-import-controls">
              <label>
                <span>Target Discipline:</span>
                <select
                  value={importDiscipline}
                  onChange={(e) => setImportDiscipline(e.target.value as WorkType)}
                >
                  <option value="piping">Piping</option>
                  <option value="welding">Welding</option>
                  <option value="structural">Structural Steel</option>
                  <option value="civil">Civil</option>
                  <option value="equipment">Equipment</option>
                  <option value="electrical">Electrical</option>
                </select>
              </label>
            </div>

            <textarea
              rows={8}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={`joint,line,desc,qty\nJ-101,12-P-101,Fit-up joint 101,1\nJ-102,12-P-101,Fit-up joint 102,1\nJ-103,12-P-102,Field weld 103,1`}
              className="tool-import-textarea font-mono text-xs"
            />

            <div className="tool-import-actions">
              <button onClick={handleCsvImport} className="tool-primary-btn">
                <Upload size={16} />
                <span>Import Work Items</span>
              </button>
            </div>

            {importStatus && <p className="tool-status-msg">{importStatus}</p>}
          </div>
        </div>
      )}

      {activeTool === "inch_dia_calc" && (
        <div className="tool-detail-card">
          <header className="tool-detail-header">
            <h2>Piping Inch-Dia Production Calculator</h2>
            <p>Calculate total cumulative inch-diameter for welding &amp; piping field progress.</p>
          </header>

          <div className="inch-dia-tool">
            <div className="inch-dia-kpi">
              <span>Total Inch-Dia</span>
              <b>{totalInchDia} ID</b>
              <small>Across {inchDiaEntries.reduce((a, c) => a + c.quantity, 0)} joints</small>
            </div>

            <table className="inch-dia-table">
              <thead>
                <tr>
                  <th>Line No.</th>
                  <th>Size (NPS)</th>
                  <th>Thickness (mm)</th>
                  <th>Joint Qty</th>
                  <th>Inch-Dia</th>
                </tr>
              </thead>
              <tbody>
                {inchDiaEntries.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.line}</td>
                    <td>{row.sizeInch}&quot;</td>
                    <td>{row.thicknessMm} mm</td>
                    <td>{row.quantity}</td>
                    <td>
                      <b>{row.sizeInch * row.quantity} ID</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTool === "structural_calc" && (
        <div className="tool-detail-card">
          <header className="tool-detail-header">
            <h2>Structural Steel Tonnage Estimator</h2>
            <p>Calculate erection steel weight (Metric Tons) from member sections and lengths.</p>
          </header>

          <div className="inch-dia-tool">
            <div className="inch-dia-kpi">
              <span>Total Structural Weight</span>
              <b>{totalStructuralTons} MT</b>
              <small>{totalStructuralWeightKg.toFixed(1)} kg across {structuralEntries.reduce((a, c) => a + c.count, 0)} members</small>
            </div>

            <table className="inch-dia-table">
              <thead>
                <tr>
                  <th>Section Profile</th>
                  <th>Unit Weight</th>
                  <th>Length (m)</th>
                  <th>Member Count</th>
                  <th>Total Weight</th>
                  <th>Erection Area</th>
                </tr>
              </thead>
              <tbody>
                {structuralEntries.map((row, idx) => {
                  const lineKg = row.weightKgM * row.lengthM * row.count;
                  return (
                    <tr key={idx}>
                      <td className="font-mono font-bold">{row.section}</td>
                      <td>{row.weightKgM} kg/m</td>
                      <td>{row.lengthM} m</td>
                      <td>{row.count}</td>
                      <td>
                        <b>{(lineKg / 1000).toFixed(3)} MT</b>
                        <small className="text-slate-500 block text-[10px]">({lineKg.toFixed(1)} kg)</small>
                      </td>
                      <td>{row.area}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
