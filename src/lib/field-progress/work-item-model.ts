/**
 * EPCX Cloud - Central Field Execution & Work Item Model
 *
 * Unifies Drawings, DPRs, TBTs, Photos and Field Registers into
 * a single authoritative execution record system.
 */

export type WorkType =
  | "piping"
  | "welding"
  | "tank"
  | "structural"
  | "civil"
  | "equipment"
  | "electrical"
  | "instrumentation"
  | "insulation"
  | "painting"
  | "commissioning"
  | "other";

export const WORK_TYPE_OPTIONS: { id: WorkType; label: string; unitDefault: string }[] = [
  { id: "piping", label: "Piping", unitDefault: "m" },
  { id: "welding", label: "Welding", unitDefault: "joint" },
  { id: "structural", label: "Structural Steel", unitDefault: "MT" },
  { id: "tank", label: "Storage Tanks", unitDefault: "plate" },
  { id: "civil", label: "Civil / Concrete", unitDefault: "m³" },
  { id: "equipment", label: "Equipment Erection", unitDefault: "unit" },
  { id: "electrical", label: "Electrical", unitDefault: "m" },
  { id: "instrumentation", label: "Instrumentation", unitDefault: "loop" },
  { id: "insulation", label: "Insulation & Cladding", unitDefault: "m²" },
  { id: "painting", label: "Surface Prep & Painting", unitDefault: "m²" },
  { id: "commissioning", label: "Testing & Commissioning", unitDefault: "system" },
  { id: "other", label: "General Work", unitDefault: "ea" },
];

export type WorkItemStatus =
  | "Planned"
  | "In Progress"
  | "Complete"
  | "Accepted"
  | "Needs Review";

export type WorkItemOrigin = "drawing" | "dpr" | "import" | "manual";

export type NdtStatus = "not_required" | "pending" | "pass" | "fail";

export interface DrawingLocation {
  x: number;
  y: number;
  page: number;
  width?: number;
  height?: number;
}

export interface CentralWorkItem {
  id: string; // unique workItemId
  projectId?: string;
  projectName?: string;
  fieldDate: string; // YYYY-MM-DD
  discipline: WorkType;
  
  // Drawing coordinates & anchor
  drawingId?: string;
  drawingName?: string;
  drawingRevision?: string;
  drawingLocation?: DrawingLocation;
  
  // Identification
  lineId?: string; // line number, area, grid, or system
  jointId?: string; // joint number, item tag, spool, or component ID
  description: string;
  
  // Progress & Quantities
  quantity?: number;
  unit?: string;
  status: WorkItemStatus;
  progress?: number; // 0 - 100 percentage
  
  // Origin & Traceability
  createdFrom: WorkItemOrigin;
  sourceRecordId?: string; // e.g. drawing mark id, DPR document id, import batch id
  
  // DPR synchronization
  dprId?: string;
  dprDate?: string;
  dprReported: boolean;
  
  // Quality, NDT & Site Evidence
  photos?: string[]; // download URLs or storage paths
  documents?: string[];
  remarks?: string;
  assignee?: string;
  supervisor?: string;
  crew?: string;
  welder?: string;
  wps?: string;
  ndtStatus?: NdtStatus;
  ndtReportNumber?: string;
  
  // Needs attention flags
  needsIdentification?: boolean; // temporary ID, needs line/joint enrichment
  
  // Project memory / change history
  history?: Array<{
    at: string;
    action: string;
    by?: string;
    details?: string;
  }>;

  createdAt: string; // ISO
  updatedAt: string; // ISO
}

/**
 * DPR Lifecyle States
 */
export type DprLifecycleState =
  | "SOURCE"      // Original uploaded image/PDF
  | "EXTRACTED"   // Parsed into editable structured tables
  | "DRAFT"       // System-generated or user draft from work items
  | "REVIEWED"    // Checked and reconciled by supervisor
  | "FINAL";      // Confirmed & locked for daily export

export interface DprTableItem {
  id: string;
  itemNo?: number | string;
  activityDescription: string;
  discipline?: WorkType;
  lineOrArea?: string;
  jointOrTag?: string;
  unit?: string;
  todayQty?: number | string;
  cumulativeQty?: number | string;
  manpower?: number | string;
  equipment?: string;
  remarks?: string;
  hindrance?: string;
  nextDayPlan?: string;
  confidence?: number; // 0.0 - 1.0 (for low-confidence OCR highlight)
  matchedWorkItemId?: string;
}

export interface DprTemplateMapping {
  id: string;
  templateName: string;
  projectId?: string;
  matchPatterns: string[]; // header strings to identify this format
  columnMappings: {
    itemNo?: string;
    description: string;
    lineOrArea?: string;
    jointOrTag?: string;
    unit?: string;
    todayQty?: string;
    cumulativeQty?: string;
    manpower?: string;
    equipment?: string;
    remarks?: string;
  };
  lastUsedAt: string;
}

export interface DprRecordData {
  id: string;
  ownerUid: string;
  state: DprLifecycleState;
  title: string;
  documentDate: string; // YYYY-MM-DD
  projectId?: string;
  projectName?: string;
  area?: string;
  contractor?: string;
  shift?: "day" | "night" | "general";
  supervisor?: string;
  
  // Operational summaries
  manpower?: {
    total: number;
    workers?: number;
    supervisors?: number;
    skilled?: number;
    helpers?: number;
  };
  equipment?: string;
  weather?: string;
  safetyTbt?: string; // TBT topic or reference
  hindrances?: string;
  remarks?: string;
  nextDayPlan?: string;
  
  // Structured work entries
  items: DprTableItem[];
  
  // Source preservation
  sourceFile?: {
    name: string;
    path: string;
    mimeType: string;
    downloadURL?: string;
  };
  rawText?: string;
  templateId?: string;
  
  // Links
  linkedDrawingIds?: string[];
  generatedFromWorkItems?: boolean;
  
  createdAt: string;
  updatedAt: string;
}

/**
 * Reconciliation Model (Section 9)
 */
export type MatchStatus = "MATCHED" | "DPR_ONLY" | "DRAWING_ONLY";

export interface ReconciliationItem {
  id: string;
  status: MatchStatus;
  confidence: number; // 0 - 1
  reason: string;
  
  // DPR Record representation
  dprItem?: DprTableItem;
  dprId?: string;
  dprDate?: string;
  
  // EPCX Work Item representation
  workItem?: CentralWorkItem;
  drawingName?: string;
  
  // Resolution
  resolved: boolean;
  resolutionAction?: "created_work_item" | "linked" | "marked_reported" | "dismissed";
  resolutionNote?: string;
}

export interface ReconciliationSummary {
  date: string;
  totalRecords: number;
  matchedCount: number;
  dprOnlyCount: number;
  drawingOnlyCount: number;
  resolvedCount: number;
  items: ReconciliationItem[];
}

/**
 * Helper to normalize string tokens for fuzzy matching
 */
export function normalizeKey(text?: string): string {
  if (!text) return "";
  return text
    .toUpperCase()
    .replace(/\b(ISO|DWG|LINE|JOINT|WELD|ITEM|NO|TAG|P|J)\b/g, "")
    .replace(/[^A-Z0-9]/g, "")
    .replace(/0(?=[A-Z])/g, "O")
    .trim();
}

/**
 * Perform intelligent reconciliation between DPR table entries and Work Items
 */
export function reconcileDprWithWorkItems(
  dprItems: DprTableItem[],
  workItems: CentralWorkItem[],
  date = new Date().toISOString().slice(0, 10)
): ReconciliationSummary {
  const reconciliationItems: ReconciliationItem[] = [];
  const matchedWorkItemIds = new Set<string>();
  const matchedDprItemIds = new Set<string>();

  // 1. Try to match each DPR item to a work item
  for (const dprItem of dprItems) {
    const dprJointNorm = normalizeKey(dprItem.jointOrTag);
    const dprLineNorm = normalizeKey(dprItem.lineOrArea);
    const dprDesc = (dprItem.activityDescription || "").toLowerCase().trim();

    let bestMatch: { item: CentralWorkItem; score: number; reason: string } | null = null;

    for (const wi of workItems) {
      if (matchedWorkItemIds.has(wi.id)) continue;

      const wiJointNorm = normalizeKey(wi.jointId);
      const wiLineNorm = normalizeKey(wi.lineId);
      const wiDesc = (wi.description || "").toLowerCase().trim();

      // Strong match: Exact joint/tag match
      if (dprJointNorm && wiJointNorm && dprJointNorm === wiJointNorm) {
        const lineBonus = dprLineNorm && wiLineNorm && dprLineNorm === wiLineNorm ? 0.05 : 0;
        const score = Math.min(1.0, 0.95 + lineBonus);
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { item: wi, score, reason: `Joint/Tag matched: ${dprItem.jointOrTag}` };
        }
      }
      // Substring match on joint
      else if (
        dprJointNorm.length >= 3 &&
        wiJointNorm.length >= 3 &&
        (dprJointNorm.includes(wiJointNorm) || wiJointNorm.includes(dprJointNorm))
      ) {
        const score = 0.85;
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { item: wi, score, reason: `Similar Joint/Tag: ${dprItem.jointOrTag} ~ ${wi.jointId}` };
        }
      }
      // Line + Description match
      else if (
        dprLineNorm &&
        wiLineNorm &&
        dprLineNorm === wiLineNorm &&
        dprDesc &&
        wiDesc &&
        (dprDesc.includes(wiDesc) || wiDesc.includes(dprDesc))
      ) {
        const score = 0.80;
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { item: wi, score, reason: `Line (${dprItem.lineOrArea}) & description match` };
        }
      }
      // Description overlap
      else if (
        dprDesc.length > 5 &&
        wiDesc.length > 5 &&
        (dprDesc.includes(wiDesc) || wiDesc.includes(dprDesc))
      ) {
        const score = 0.65;
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { item: wi, score, reason: `Activity description overlap: "${wi.description}"` };
        }
      }
    }

    if (bestMatch && bestMatch.score >= 0.65) {
      matchedWorkItemIds.add(bestMatch.item.id);
      matchedDprItemIds.add(dprItem.id);
      reconciliationItems.push({
        id: `rec-match-${dprItem.id}-${bestMatch.item.id}`,
        status: "MATCHED",
        confidence: bestMatch.score,
        reason: bestMatch.reason,
        dprItem,
        workItem: bestMatch.item,
        drawingName: bestMatch.item.drawingName,
        resolved: true,
      });
    } else {
      // DPR ONLY
      reconciliationItems.push({
        id: `rec-dpr-${dprItem.id}`,
        status: "DPR_ONLY",
        confidence: 0,
        reason: "Reported in DPR but no corresponding EPCX work item found",
        dprItem,
        resolved: false,
      });
    }
  }

  // 2. Identify DRAWING ONLY (work items that were not matched)
  for (const wi of workItems) {
    if (!matchedWorkItemIds.has(wi.id)) {
      reconciliationItems.push({
        id: `rec-draw-${wi.id}`,
        status: "DRAWING_ONLY",
        confidence: 0,
        reason: `Marked in drawing ${wi.drawingName ? `(${wi.drawingName})` : ""} but missing from DPR`,
        workItem: wi,
        drawingName: wi.drawingName,
        resolved: false,
      });
    }
  }

  const matchedCount = reconciliationItems.filter((i) => i.status === "MATCHED").length;
  const dprOnlyCount = reconciliationItems.filter((i) => i.status === "DPR_ONLY").length;
  const drawingOnlyCount = reconciliationItems.filter((i) => i.status === "DRAWING_ONLY").length;
  const resolvedCount = reconciliationItems.filter((i) => i.resolved).length;

  return {
    date,
    totalRecords: reconciliationItems.length,
    matchedCount,
    dprOnlyCount,
    drawingOnlyCount,
    resolvedCount,
    items: reconciliationItems,
  };
}

/**
 * Generate a DPR Draft from today's completed / in-progress work items
 */
export function generateDprDraftFromWorkItems(
  workItems: CentralWorkItem[],
  project?: { id?: string; name?: string; location?: string },
  date = new Date().toISOString().slice(0, 10)
): DprRecordData {
  const dprId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Create table items from work items
  const items: DprTableItem[] = workItems.map((wi, index) => ({
    id: `dpr-item-${wi.id || index}`,
    itemNo: index + 1,
    activityDescription: wi.description || `${wi.discipline.toUpperCase()} - ${wi.jointId || wi.lineId || "Field Item"}`,
    discipline: wi.discipline,
    lineOrArea: wi.lineId || "",
    jointOrTag: wi.jointId || "",
    unit: wi.unit || "ea",
    todayQty: wi.quantity ?? (wi.status === "Complete" ? 1 : 0.5),
    cumulativeQty: wi.quantity ?? 1,
    remarks: [wi.status, wi.crew ? `Crew: ${wi.crew}` : "", wi.remarks].filter(Boolean).join(" · "),
    confidence: 1.0,
    matchedWorkItemId: wi.id,
  }));

  const linkedDrawingIds = [
    ...new Set(workItems.map((wi) => wi.drawingId).filter((id): id is string => Boolean(id))),
  ];

  return {
    id: dprId,
    ownerUid: "",
    state: "DRAFT",
    title: `Daily Progress Report - ${date}`,
    documentDate: date,
    projectId: project?.id,
    projectName: project?.name || "Field Project",
    area: workItems.map((wi) => wi.lineId).filter(Boolean)[0] || project?.location || "",
    items,
    linkedDrawingIds,
    generatedFromWorkItems: true,
    manpower: { total: 0 },
    createdAt: now,
    updatedAt: now,
  };
}
