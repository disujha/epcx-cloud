"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, BookOpen, Building2, CalendarDays, Camera, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleDashed, ClipboardList, Cloud, Clock3, Download, FileBarChart2, FileSpreadsheet, FileText, Image as ImageIcon, Layers, LoaderCircle, MapPin, MoreHorizontal, Pencil, Plus, Printer, RefreshCw, Search, ShieldCheck, Users, X } from "lucide-react";
import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/contexts/AuthContext";
import { useFieldWork } from "@/contexts/FieldWorkContext";
import { deleteDocument, uploadDocument } from "@/lib/firebase/storage";
import type { FieldProject } from "@/components/field-progress/FieldProjectProfile";
import type { BillingOverview } from "@/lib/billing";
import { EpcxSpinner } from "@/components/ui/EpcxSpinner";

type RecordType = "drawing" | "DPR" | "TBT" | "PHOTO" | "DOCUMENT";
type WorkItem = { id: string; label: string; status?: string; updatedAt?: string; drawingId: string };
type WorkspaceRecord = {
  id: string; title: string; subtitle: string; date: string; createdAt?: string; updatedAt?: string; uploadedAt?: string;
  image?: string; type: RecordType; workItems: number; complete: number; inProgress: number; openItems: number;
  items?: WorkItem[]; filePath?: string; mimeType?: string; fileName?: string; area?: string; revision?: string;
  syncPending?: boolean; manpower?: string; workers?: string; staff?: string; topic?: string; projectId?: string;
  drawingLinks?: string[]; relatedCount?: number; relatedRecords?: string[];
};
type DailyEvent = { id: string; drawingId: string; workItemId: string; action: string; status?: string; localDate?: string; timestamp?: string };
type ActivityItem = { id: string; type: RecordType; title: string; details: string; time: string; drawingId?: string; recordId?: string; photoCount?: number };

const localDay = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
const recordDay = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : value ? localDay(new Date(value)) : "undated";
const dateText = (date: string) => date && date !== "undated" ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T12:00:00` : date).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) : "Date not set";
const monthText = (date: string) => date !== "undated" ? new Date(`${date.slice(0,7)}-01T12:00:00`).toLocaleDateString("en-GB", { month:"long", year:"numeric" }) : "Date not set";
const timeText = (value?: string) => value ? new Date(value).toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" }) : "—";
const accepted = ".pdf,.jpg,.jpeg,.png,.webp";
const labels: Record<RecordType, string> = { drawing: "Drawing", DPR: "DPR", TBT: "TBT", PHOTO: "Photo", DOCUMENT: "Document" };
const planUsageFields = [
  { key: "drawings", label: "Drawings", limit: (plan: BillingOverview["currentPlan"]) => plan.drawingLimit },
  { key: "dpr", label: "DPR uploads", limit: (plan: BillingOverview["currentPlan"]) => plan.dprLimit },
  { key: "photos", label: "Photos", limit: (plan: BillingOverview["currentPlan"]) => plan.photoLimit },
  { key: "workItems", label: "Work items", limit: (plan: BillingOverview["currentPlan"]) => plan.workItemLimit },
  { key: "projects", label: "Projects", limit: (plan: BillingOverview["currentPlan"]) => plan.projectLimit },
  { key: "members", label: "Team members", limit: (plan: BillingOverview["currentPlan"]) => plan.memberLimit },
  { key: "tbt", label: "TBT records", limit: (plan: BillingOverview["currentPlan"]) => plan.tbtLimit },
  { key: "ocr", label: "OCR uses", limit: (plan: BillingOverview["currentPlan"]) => plan.ocrLimit },
  { key: "exports", label: "Exports", limit: (plan: BillingOverview["currentPlan"]) => plan.exportLimit },
] as const;

export function FieldWorkspaceHome({
  onAddDrawing,
  onAddDpr,
  onOpenDrawing,
  onOpenDpr,
  onOpenRecord,
  today = false,
  reports = false,
  project,
  billing,
  onContinueWork,
  onOpenProject,
  onOpenWork,
  onOpenTools,
}: {
  onAddDrawing: () => void;
  onAddDpr: () => void;
  onOpenDrawing: (id: string) => void;
  onOpenDpr: (id: string) => void;
  onOpenRecord?: (id: string) => void;
  today?: boolean;
  reports?: boolean;
  project?: FieldProject;
  billing?: BillingOverview;
  onContinueWork?: () => void;
  onOpenProject?: () => void;
  onOpenWork?: () => void;
  onOpenTools?: () => void;
}) {
  const { user, loading } = useAuth();
  const accountUser = user && !user.isAnonymous ? user : null;
  const {
    workItems,
    todayWorkItems,
    todayCompletedCount,
    todayInProgressCount,
    needsAttentionCount,
    isDprDraftReady,
    syncState: fieldSyncState,
    dprRecords,
    todayDpr: activeTodayDpr,
    activeReconciliation,
  } = useFieldWork();

  const [reportType, setReportType] = useState<
    "dpr_summary" | "work_register" | "drawing_progress" | "reconciliation" | "missing_unreported"
  >("dpr_summary");
  const tbtInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const [drawings, setDrawings] = useState<WorkspaceRecord[]>([]);
  const [documents, setDocuments] = useState<WorkspaceRecord[]>([]);
  const [events, setEvents] = useState<DailyEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [online, setOnline] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeDrawingMenuId, setActiveDrawingMenuId] = useState<string | null>(null);
  const [contextualDrawing, setContextualDrawing] = useState<{ id: string; title: string } | null>(null);
  const [tbtDialogOpen, setTbtDialogOpen] = useState(false);
  const [tbtDetails, setTbtDetails] = useState({ date: localDay(), area: "", topic: "", supervisor: "", manpower: "", workers: "", staff: "", remarks: "" });
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<"all" | RecordType>("all");
  const [query, setQuery] = useState("");
  const [historyMonth, setHistoryMonth] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1); });
  const [historyDay, setHistoryDay] = useState("");
  const [reportDate, setReportDate] = useState("");
  const [excelExporting, setExcelExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState("");

  const load = useCallback(async () => {
    if (!user || user.isAnonymous) { setDrawings([]); setDocuments([]); setEvents([]); setLoadFailed(false); return; }
    setBusy(true); setLoadFailed(false); setMessage("");
    try {
      const [drawingSnapshot, documentSnapshot] = await Promise.all([
        getDocs(collection(db,"users",user.uid,"fieldDrawings")),
        getDocs(collection(db,"users",user.uid,"fieldDocuments")),
      ]);
      const drawingRows = drawingSnapshot.docs.map((snapshot) => ({ id:snapshot.id, data:snapshot.data() }));
      const nextDrawings: WorkspaceRecord[] = drawingRows.map(({id,data}) => {
        const rawItems = Array.isArray(data.workItems) ? data.workItems as Record<string, unknown>[] : Array.isArray(data.marks) ? (data.marks as Record<string, unknown>[]).filter((mark)=>mark.kind==="mark") : [];
        const items: WorkItem[] = rawItems.map((item,index)=>({ id:String(item.id??item.annotationId??`${id}-${index}`), drawingId:id, label:String(item.label??item.name??`Work item ${index+1}`), status:typeof item.status==="string"?item.status:undefined, updatedAt:String(item.updatedAt??item.createdAt??"") }));
        const completed=items.filter((item)=>item.status==="Complete").length;
        const inProgress=items.filter((item)=>item.status==="In Progress").length;
        const area=String(data.area??"").trim(); const revision=String(data.revision??"").trim();
        const relatedRecords=Array.isArray(data.relatedRecords)?data.relatedRecords.map(String):[];
        const localThumb = typeof window !== "undefined" ? localStorage.getItem(`epcx-drawing-thumb:${user.uid}:${id}`) : null;
        const isPdfDrawing = String(data.mimeType ?? data.contentType ?? "").toLowerCase().includes("pdf") || data.drawingType === "pdf" || String(data.fileName ?? "").toLowerCase().endsWith(".pdf");
        const resolvedImage = (typeof data.thumbnail === "string" && data.thumbnail) ? data.thumbnail : (localThumb || (!isPdfDrawing && typeof data.downloadURL === "string" ? data.downloadURL : undefined));
        return { id,title:String(data.name??data.fileName??"Drawing").replace(/\.[^.]+$/, ""),subtitle:[revision?`Rev ${revision}`:"Drawing",area].filter(Boolean).join(" · "),revision,date:String(data.updatedAt??data.createdAt??""),createdAt:String(data.createdAt??""),updatedAt:String(data.updatedAt??""),image:resolvedImage,type:"drawing",workItems:items.length,complete:completed,inProgress,openItems:Math.max(0,items.length-completed-inProgress),items,filePath:String(data.storagePath??""),mimeType:String(data.mimeType??data.contentType??""),area,syncPending:data.storagePending===true,projectId:String(data.projectId??""),relatedCount:relatedRecords.length,relatedRecords };
      });
      const nextDocuments: WorkspaceRecord[] = documentSnapshot.docs.map((snapshot) => {
        const data=snapshot.data(); const type=data.type as RecordType;
        const date=String(data.documentDate||data.recordDate||data.createdAt||"");
        const title=String(data.title??data.fileName??(type==="PHOTO"?"Site photo":type==="TBT"?"Toolbox talk":"Daily Progress Report"));
        const status=type==="DPR"?(data.ocrStatus==="processed"?"Text extracted":data.ocrStatus==="needs-ocr"?"Review source document":"Daily progress report"):type==="TBT"?[String(data.topic??"Toolbox talk"),"Shift record"].join(" · "):type==="PHOTO"?"Site photo":"Project document";
        const extracted=data.extracted&&typeof data.extracted==="object"?data.extracted as Record<string,unknown>:{};
        const confirmed=Array.isArray(data.confirmedFields)?data.confirmedFields as string[]:[];
        const suggestions=Array.isArray(data.drawingSuggestions)?data.drawingSuggestions as {drawingName?:string;confirmed?:boolean}[]:[];
        const relatedRecords=Array.isArray(data.relatedRecords)?data.relatedRecords.map(String):[];
        return { id:snapshot.id,title,subtitle:status,date,createdAt:String(data.createdAt??""),uploadedAt:String(data.createdAt??""),updatedAt:String(data.updatedAt??data.createdAt??""),type,workItems:0,complete:0,inProgress:0,openItems:0,filePath:String(data.filePath??""),mimeType:String(data.mimeType??""),fileName:String(data.fileName??title),image:typeof data.downloadURL==="string"?data.downloadURL:undefined,area:String(data.area??extracted.area??""),topic:String(data.topic??""),manpower:type==="TBT"?String(data.manpower??""):confirmed.includes("manpower")?String(extracted.manpower??""):"",workers:String(data.workers??""),staff:String(data.staff??""),projectId:String(data.projectId??""),drawingLinks:suggestions.filter((item)=>item.confirmed&&item.drawingName).map((item)=>String(item.drawingName)),relatedCount:relatedRecords.length,relatedRecords };
      }).filter((record)=>["DPR","TBT","PHOTO","DOCUMENT"].includes(record.type));
      const todayKey=localDay();
      const dayEvents=drawingRows.flatMap(({id,data})=>(Array.isArray(data.workEvents)?data.workEvents as DailyEvent[]:[]).filter((event)=>event.localDate===todayKey).map((event)=>({...event,drawingId:event.drawingId||id})));
      setDrawings(nextDrawings); setDocuments(nextDocuments); setEvents(dayEvents); setLoadFailed(false);
    } catch (error) {
      console.error("Workspace records could not be loaded",error);
      setLoadFailed(true);
      setMessage("Could not check your latest saved records. Check the connection and retry.");
    } finally { setBusy(false); }
  },[user]);

  useEffect(()=>{let cancelled=false;void Promise.resolve().then(()=>{if(!cancelled) return load();});return()=>{cancelled=true;};},[load]);
  useEffect(()=>{const update=()=>setOnline(navigator.onLine);update();window.addEventListener("online",update);window.addEventListener("offline",update);return()=>{window.removeEventListener("online",update);window.removeEventListener("offline",update);};},[]);

  useEffect(() => {
    function handleDocClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target || !target.closest(".field-drawing-card-menu-wrap")) {
        setActiveDrawingMenuId(null);
      }
    }
    document.addEventListener("click", handleDocClick);
    return () => document.removeEventListener("click", handleDocClick);
  }, []);

  const todayKey=localDay();
  const allRecords=useMemo(()=>[...drawings,...documents].sort((a,b)=>String(b.updatedAt??b.date).localeCompare(String(a.updatedAt??a.date))),[drawings,documents]);
  const recordCountsByDay=useMemo(()=>{const counts=new Map<string,number>();for(const record of allRecords){const day=recordDay(record.date);if(day!=="undated")counts.set(day,(counts.get(day)??0)+1);}return counts;},[allRecords]);
  const calendarOffset=(historyMonth.getDay()+6)%7;
  const calendarDayCount=new Date(historyMonth.getFullYear(),historyMonth.getMonth()+1,0).getDate();
  const calendarCells:(number|null)[]=[...Array(calendarOffset).fill(null),...Array.from({length:calendarDayCount},(_,index)=>index+1)];
  const historyMonthLabel=historyMonth.toLocaleDateString("en-GB",{month:"long",year:"numeric"});
  const visibleRecords=useMemo(()=>allRecords.filter((record)=>(!historyDay||recordDay(record.date)===historyDay)&&(filter==="all"||record.type===filter)&&(!query.trim()||`${record.title} ${record.subtitle} ${record.date} ${record.type} ${record.area??""} ${record.revision??""}`.toLowerCase().includes(query.trim().toLowerCase()))),[allRecords,filter,historyDay,query]);
  const reportRecords=useMemo(()=>allRecords.filter((record)=>!reportDate||recordDay(record.date)===reportDate),[allRecords,reportDate]);
  const reportCount=(type:RecordType)=>reportRecords.filter((record)=>record.type===type).length;
  const groups=useMemo(()=>{const months=new Map<string,Map<string,WorkspaceRecord[]>>();for(const record of visibleRecords){const date=recordDay(record.date);const month=date==="undated"?"undated":date.slice(0,7);if(!months.has(month))months.set(month,new Map());const days=months.get(month)!;if(!days.has(date))days.set(date,[]);days.get(date)!.push(record);}return [...months.entries()].sort(([a],[b])=>b.localeCompare(a));},[visibleRecords]);
  const latestByWork=new Map<string,DailyEvent>();
  for(const event of events){const key=`${event.drawingId}:${event.workItemId}`;const previous=latestByWork.get(key);if(!previous||String(event.timestamp)>String(previous.timestamp))latestByWork.set(key,event);}
  const activeUpdates=[...latestByWork.values()].filter((event)=>event.action!=="deleted");
  const everyWorkItem=drawings.flatMap((drawing)=>drawing.items??[]);
  const completed=everyWorkItem.filter((item)=>item.status==="Complete").length;
  const inProgress=everyWorkItem.filter((item)=>item.status==="In Progress").length;
  const openItems=Math.max(0,everyWorkItem.length-completed-inProgress);
  const updatedToday=new Set(activeUpdates.map((event)=>`${event.drawingId}:${event.workItemId}`)).size;
  const activeDrawings=drawings.slice(0,3);
  const activeDrawing=activeDrawings[0];
  const todayDocuments=documents.filter((record)=>recordDay(record.uploadedAt||record.createdAt||record.date)===todayKey);
  const todayDpr=todayDocuments.filter((record)=>record.type==="DPR");
  const todayTbt=todayDocuments.filter((record)=>record.type==="TBT");
  const todayPhotos=todayDocuments.filter((record)=>record.type==="PHOTO");
  const todayDocs=todayDocuments.filter((record)=>record.type==="DOCUMENT");
  const todayDrawings=drawings.filter((record)=>recordDay(record.updatedAt||record.date)===todayKey);
  const manpowerRecord=[...todayTbt,...todayDpr].find((record)=>Number(record.manpower)>0);
  const manpower=manpowerRecord?Number(manpowerRecord.manpower):0;
  const workers=[...todayTbt,...todayDpr].map((record)=>Number(record.workers)).find((value)=>Number.isFinite(value)&&value>0)??0;
  const staff=[...todayTbt,...todayDpr].map((record)=>Number(record.staff)).find((value)=>Number.isFinite(value)&&value>0)??0;
  const pendingDrawing=drawings.find((record)=>record.syncPending);
  const todayRecords=allRecords.filter((record)=>recordDay(record.uploadedAt||record.date)===todayKey);
  const planUsage = billing ? planUsageFields.filter(({ key, limit }) => typeof billing.usage[key] === "number" && limit(billing.currentPlan) > 0).map(({ key, label, limit }) => ({ key, label, used: Number(billing.usage[key]), limit: limit(billing.currentPlan) })) : [];
  const highlightedUsage = planUsage.filter(({ key }) => ["drawings", "dpr", "photos", "workItems"].includes(key));
  const additionalUsage = planUsage.filter(({ key }) => !["drawings", "dpr", "photos", "workItems"].includes(key));

  const activity=useMemo(()=>{
    const items:ActivityItem[]=[];
    const eventsByDrawing=new Map<string,DailyEvent[]>();
    for(const event of activeUpdates){const group=eventsByDrawing.get(event.drawingId)??[];group.push(event);eventsByDrawing.set(event.drawingId,group);}
    for(const drawing of drawings){
      const drawingEvents=eventsByDrawing.get(drawing.id)??[];
      if(drawingEvents.length){items.push({id:`drawing-${drawing.id}`,type:"drawing",title:`${drawing.title}${drawing.revision?` · Rev ${drawing.revision}`:""}`,details:`${drawingEvents.length} work item${drawingEvents.length===1?"":"s"} updated${drawing.area?` · ${drawing.area}`:""}`,time:drawingEvents.map((event)=>event.timestamp??"").sort().at(-1)??drawing.updatedAt??"",drawingId:drawing.id});}
      else if(recordDay(drawing.createdAt??"")===todayKey){items.push({id:`drawing-${drawing.id}`,type:"drawing",title:`${drawing.title}${drawing.revision?` · Rev ${drawing.revision}`:""}`,details:`Drawing added${drawing.area?` · ${drawing.area}`:""}`,time:drawing.createdAt??"",drawingId:drawing.id});}
    }
    const dayDocs=todayDocuments.filter((record)=>record.type!=="PHOTO");
    for(const record of dayDocs){items.push({id:`${record.type}-${record.id}`,type:record.type,title:record.type==="DPR"?"Daily progress report":record.type==="TBT"?(record.topic||record.title):record.title,details:record.type==="TBT"?[record.area,record.workers?`${record.workers} workers`:""].filter(Boolean).join(" · ")||"Toolbox talk added":record.type==="DPR"?"DPR added to today’s work":record.subtitle,time:record.createdAt||record.updatedAt||record.date,recordId:record.id});}
    if(todayPhotos.length){const newest=[...todayPhotos].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)))[0];items.push({id:"photos-today",type:"PHOTO",title:"Site photos",details:`${todayPhotos.length} photo${todayPhotos.length===1?"":"s"}${todayPhotos[0]?.area?` · ${todayPhotos[0].area}`:""}`,time:newest?.createdAt||newest?.date||"",recordId:newest?.id,photoCount:todayPhotos.length});}
    return items.sort((a,b)=>String(a.time).localeCompare(String(b.time)));
  },[activeUpdates,drawings,todayDocuments,todayKey,todayPhotos]);

  // Unified Execution Metrics across Drawings, DPRs, and Work Register
  const totalWorkCount = workItems.length > 0 ? workItems.length : everyWorkItem.length;
  const totalCompletedCount = workItems.length > 0 ? workItems.filter((i) => i.status === "Complete").length : completed;
  const totalInProgressCount = workItems.length > 0 ? workItems.filter((i) => i.status === "In Progress").length : inProgress;
  const totalNeedsStatusCount = workItems.length > 0 ? workItems.filter((i) => i.status !== "Complete" && i.status !== "In Progress").length : openItems;
  const updatedTodayCount = todayWorkItems.length > 0 ? todayWorkItems.length : updatedToday;

  const syncStatus = uploading
    ? { kind: "saving", label: "Saving…" }
    : !online
    ? { kind: "offline", label: "Offline · local cache active" }
    : loadFailed || fieldSyncState === "failed"
    ? { kind: "failed", label: "Sync check failed · Retry" }
    : pendingDrawing
    ? { kind: "pending", label: "Drawing sync pending" }
    : busy || fieldSyncState === "syncing"
    ? { kind: "checking", label: "Syncing field records…" }
    : fieldSyncState === "saving"
    ? { kind: "saving", label: "Saving…" }
    : { kind: "saved", label: "Authoritative sync · All saved" };

  const count = (type: RecordType) => allRecords.filter((record) => record.type === type).length;
  const typeOptions: ["all" | RecordType, string, number][] = [
    ["all", "All", allRecords.length],
    ["drawing", "Drawings", count("drawing")],
    ["DPR", "DPR", count("DPR")],
    ["TBT", "TBT", count("TBT")],
    ["PHOTO", "Photos", count("PHOTO")],
    ["DOCUMENT", "Documents", count("DOCUMENT")],
  ];
  const icon = (type: RecordType) =>
    type === "drawing" ? <BookOpen size={17} /> : type === "PHOTO" ? <ImageIcon size={17} /> : type === "TBT" ? <ShieldCheck size={17} /> : <FileText size={17} />;

  // ─── Filtered Data for Execution Reports ───────────────────────
  const filteredWorkItems = useMemo(() => {
    return workItems.filter((item) => !reportDate || item.fieldDate === reportDate);
  }, [workItems, reportDate]);

  const unreportedItems = useMemo(() => {
    return workItems.filter((item) => item.status === "Complete" && !item.dprReported);
  }, [workItems]);

  const dprSummaryRows = useMemo(() => {
    return dprRecords.filter((dpr) => !reportDate || dpr.documentDate === reportDate);
  }, [dprRecords, reportDate]);

  // ─── Execution Report Export Handlers ─────────────────────────
  function downloadCsv() {
    let filename = `epcx-${reportType}-${reportDate || "all-dates"}.csv`;
    let rows: string[][] = [];

    if (reportType === "work_register") {
      rows = [
        ["Item ID", "Date", "Drawing", "Line / Area", "Discipline", "Description", "Status", "Quantity", "Unit", "DPR Reported", "NDT Status"],
        ...filteredWorkItems.map((item) => [
          item.jointId || item.id,
          item.fieldDate,
          item.drawingName || "",
          item.lineId || "",
          item.discipline,
          item.description,
          item.status,
          String(item.quantity ?? 1),
          item.unit || "ea",
          item.dprReported ? "Yes" : "No",
          item.ndtStatus || "not_required",
        ]),
      ];
    } else if (reportType === "drawing_progress") {
      rows = [
        ["Drawing ID", "Title", "Revision", "Area", "Total Work Items", "Complete", "In Progress", "Needs Status", "% Complete"],
        ...drawings.map((dwg) => [
          dwg.id,
          dwg.title,
          dwg.revision || "",
          dwg.area || "",
          String(dwg.workItems),
          String(dwg.complete),
          String(dwg.inProgress),
          String(dwg.openItems),
          `${dwg.workItems ? Math.round((dwg.complete / dwg.workItems) * 100) : 0}%`,
        ]),
      ];
    } else if (reportType === "missing_unreported") {
      rows = [
        ["Item ID", "Date", "Drawing", "Line / Area", "Discipline", "Description", "Crew", "Status", "Issue"],
        ...unreportedItems.map((item) => [
          item.jointId || item.id,
          item.fieldDate,
          item.drawingName || "",
          item.lineId || "",
          item.discipline,
          item.description,
          item.crew || "",
          item.status,
          "Completed on site but missing from client DPR",
        ]),
      ];
    } else if (reportType === "reconciliation") {
      rows = [
        ["Item ID", "Discipline", "Line / Area", "Description", "Status", "DPR Match", "Drawing Pin Match"],
        ...workItems.map((item) => [
          item.jointId || item.id,
          item.discipline,
          item.lineId || "",
          item.description,
          item.status,
          item.dprReported ? "Reported in DPR" : "Missing from DPR",
          item.drawingId ? "Pinned on Drawing" : "No Drawing Pin",
        ]),
      ];
    } else {
      // Default / DPR summary
      rows = [
        ["DPR Date", "Title", "Contractor", "Status", "Work Items Recorded", "Complete", "Manpower", "Remarks"],
        ...dprSummaryRows.map((dpr) => [
          dpr.documentDate,
          dpr.title || `DPR ${dpr.documentDate}`,
          dpr.contractor || project?.epcContractor || "",
          dpr.state || "Recorded",
          String(dpr.items?.length ?? 0),
          String(dpr.items?.length ?? 0),
          String(dpr.manpower?.total ?? ""),
          dpr.remarks || "",
        ]),
      ];
    }

    const csv = rows.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setExportMessage(`CSV exported: ${rows.length - 1} records.`);
  }

  async function downloadExcel() {
    setExcelExporting(true);
    setExportMessage("");
    try {
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.default.Workbook();
      const sheet = workbook.addWorksheet(
        reportType === "work_register"
          ? "Work Register"
          : reportType === "drawing_progress"
          ? "Drawing Progress"
          : reportType === "missing_unreported"
          ? "Unreported Work"
          : reportType === "reconciliation"
          ? "Reconciliation"
          : "Daily DPR Summary"
      );

      if (reportType === "work_register") {
        sheet.columns = [
          { header: "Item ID", key: "id", width: 16 },
          { header: "Date", key: "date", width: 14 },
          { header: "Drawing", key: "drawing", width: 22 },
          { header: "Line / Area", key: "line", width: 18 },
          { header: "Discipline", key: "discipline", width: 14 },
          { header: "Description", key: "desc", width: 34 },
          { header: "Status", key: "status", width: 14 },
          { header: "Qty", key: "qty", width: 10 },
          { header: "DPR State", key: "dpr", width: 14 },
          { header: "NDT", key: "ndt", width: 12 },
        ];
        for (const item of filteredWorkItems) {
          sheet.addRow({
            id: item.jointId || item.id,
            date: item.fieldDate,
            drawing: item.drawingName || "",
            line: item.lineId || "",
            discipline: item.discipline,
            desc: item.description,
            status: item.status,
            qty: item.quantity ?? 1,
            dpr: item.dprReported ? "Reported" : "Missing",
            ndt: item.ndtStatus || "None",
          });
        }
      } else if (reportType === "drawing_progress") {
        sheet.columns = [
          { header: "Drawing", key: "name", width: 30 },
          { header: "Rev", key: "rev", width: 10 },
          { header: "Area", key: "area", width: 20 },
          { header: "Work Items", key: "items", width: 14 },
          { header: "Complete", key: "complete", width: 12 },
          { header: "In Progress", key: "progress", width: 12 },
          { header: "% Complete", key: "pct", width: 14 },
        ];
        for (const dwg of drawings) {
          sheet.addRow({
            name: dwg.title,
            rev: dwg.revision || "",
            area: dwg.area || "",
            items: dwg.workItems,
            complete: dwg.complete,
            progress: dwg.inProgress,
            pct: `${dwg.workItems ? Math.round((dwg.complete / dwg.workItems) * 100) : 0}%`,
          });
        }
      } else if (reportType === "missing_unreported") {
        sheet.columns = [
          { header: "Item ID", key: "id", width: 16 },
          { header: "Date", key: "date", width: 14 },
          { header: "Drawing", key: "drawing", width: 22 },
          { header: "Line / Area", key: "line", width: 18 },
          { header: "Discipline", key: "discipline", width: 14 },
          { header: "Description", key: "desc", width: 34 },
          { header: "Status", key: "status", width: 14 },
          { header: "Audit Note", key: "note", width: 36 },
        ];
        for (const item of unreportedItems) {
          sheet.addRow({
            id: item.jointId || item.id,
            date: item.fieldDate,
            drawing: item.drawingName || "",
            line: item.lineId || "",
            discipline: item.discipline,
            desc: item.description,
            status: item.status,
            note: "Completed on site but missing from client DPR",
          });
        }
      } else {
        sheet.columns = [
          { header: "Date", key: "date", width: 14 },
          { header: "Title", key: "title", width: 30 },
          { header: "Status", key: "status", width: 16 },
          { header: "Work Items", key: "items", width: 14 },
          { header: "Complete", key: "complete", width: 12 },
          { header: "Workers", key: "workers", width: 12 },
          { header: "Remarks", key: "remarks", width: 36 },
        ];
        for (const dpr of dprSummaryRows) {
          sheet.addRow({
            date: dpr.documentDate,
            title: dpr.title || `DPR ${dpr.documentDate}`,
            status: dpr.state || "Recorded",
            items: dpr.items?.length ?? 0,
            complete: dpr.items?.length ?? 0,
            workers: dpr.manpower?.total ?? "",
            remarks: dpr.remarks || "",
          });
        }
      }

      sheet.getRow(1).font = { bold: true };
      const buffer = await workbook.xlsx.writeBuffer();
      const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `epcx-${reportType}-${reportDate || "all-dates"}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setExportMessage("Formatted Excel workbook downloaded.");
    } catch (err) {
      console.error("Excel export error", err);
      setExportMessage("Excel export could not be created. Please retry.");
    } finally {
      setExcelExporting(false);
    }
  }

  function printReport() {
    const popup = window.open("", "_blank");
    if (!popup) {
      setMessage("Allow pop-ups to print or save this report as a PDF.");
      return;
    }
    const escape = (val: string) => String(val).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

    let titleText =
      reportType === "work_register"
        ? "Work-Item Master Register"
        : reportType === "drawing_progress"
        ? "Drawing Progress Report"
        : reportType === "missing_unreported"
        ? "Missing / Unreported Work Register"
        : reportType === "reconciliation"
        ? "DPR vs Drawing Reconciliation Report"
        : "Daily Progress Report (DPR) Summary";

    let headersHtml = "";
    let rowsHtml = "";

    if (reportType === "work_register") {
      headersHtml = "<tr><th>Item ID</th><th>Date</th><th>Drawing</th><th>Line / Area</th><th>Discipline</th><th>Description</th><th>Status</th><th>DPR</th><th>NDT</th></tr>";
      rowsHtml = filteredWorkItems.map((item) => `<tr><td>${escape(item.jointId || item.id.slice(0, 8))}</td><td>${escape(item.fieldDate)}</td><td>${escape(item.drawingName || "—")}</td><td>${escape(item.lineId || "—")}</td><td>${escape(item.discipline)}</td><td>${escape(item.description)}</td><td>${escape(item.status)}</td><td>${item.dprReported ? "Reported" : "Missing"}</td><td>${escape(item.ndtStatus || "—")}</td></tr>`).join("");
    } else if (reportType === "drawing_progress") {
      headersHtml = "<tr><th>Drawing</th><th>Rev</th><th>Area</th><th>Total Items</th><th>Complete</th><th>In Progress</th><th>% Complete</th></tr>";
      rowsHtml = drawings.map((dwg) => `<tr><td>${escape(dwg.title)}</td><td>${escape(dwg.revision || "—")}</td><td>${escape(dwg.area || "—")}</td><td>${dwg.workItems}</td><td>${dwg.complete}</td><td>${dwg.inProgress}</td><td>${dwg.workItems ? Math.round((dwg.complete / dwg.workItems) * 100) : 0}%</td></tr>`).join("");
    } else if (reportType === "missing_unreported") {
      headersHtml = "<tr><th>Item ID</th><th>Date</th><th>Drawing</th><th>Line / Area</th><th>Discipline</th><th>Description</th><th>Action</th></tr>";
      rowsHtml = unreportedItems.map((item) => `<tr><td>${escape(item.jointId || item.id.slice(0, 8))}</td><td>${escape(item.fieldDate)}</td><td>${escape(item.drawingName || "—")}</td><td>${escape(item.lineId || "—")}</td><td>${escape(item.discipline)}</td><td>${escape(item.description)}</td><td style="color:#a63212">Needs DPR Report</td></tr>`).join("");
    } else {
      headersHtml = "<tr><th>Date</th><th>Title</th><th>Contractor</th><th>Status</th><th>Items</th><th>Workers</th><th>Remarks</th></tr>";
      rowsHtml = dprSummaryRows.map((dpr) => `<tr><td>${escape(dpr.documentDate)}</td><td>${escape(dpr.title || "DPR")}</td><td>${escape(dpr.contractor || "—")}</td><td>${escape(dpr.state || "Recorded")}</td><td>${dpr.items?.length ?? 0}</td><td>${dpr.manpower?.total ?? "—"}</td><td>${escape(dpr.remarks || "—")}</td></tr>`).join("");
    }

    popup.document.write(`<!doctype html><html><head><title>${escape(titleText)}</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:13px Arial,sans-serif;color:#18272e;padding:32px;background:#fff}h1{font-size:22px;margin:0 0 4px;color:#18272e}.meta{color:#526269;margin-bottom:20px;font-size:12px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{text-align:left;border-bottom:1px solid #d7ddd7;padding:8px 6px;font-size:12px}th{background:#f4f4ef;color:#315e49;font-weight:700}@media print{body{padding:0}}</style></head><body><h1>${escape(titleText)}</h1><div class="meta">${escape(project?.name || "EPCX Field Intelligence")} · Date: ${escape(reportDate || dateText(localDay()))}</div><table><thead>${headersHtml}</thead><tbody>${rowsHtml || "<tr><td colspan='7'>No records match the filter.</td></tr>"}</tbody></table></body></html>`);
    popup.document.close();
    popup.focus();
    window.setTimeout(() => popup.print(), 300);
  }

  function startUpload(type: "TBT" | "PHOTO" | "DOCUMENT") {
    setMenuOpen(false);
    if (!accountUser) {
      setMessage("Sign in to save field records to your workspace.");
      return;
    }
    if (type === "TBT") {
      setTbtDetails((old) => ({ ...old, date: localDay() }));
      setTbtDialogOpen(true);
      return;
    }
    (type === "PHOTO" ? photoInputRef : documentInputRef).current?.click();
  }

  function chooseTbtFile() {
    setTbtDialogOpen(false);
    window.setTimeout(() => tbtInputRef.current?.click(), 0);
  }

  async function uploadFiles(type: "TBT" | "PHOTO" | "DOCUMENT", files: FileList | null) {
    if (!files || !user || user.isAnonymous) return;
    const selected = Array.from(files);
    const added: WorkspaceRecord[] = [];
    setUploading(true);
    setMessage("");
    try {
      for (const file of selected) {
        const id = crypto.randomUUID();
        const timestamp = new Date().toISOString();
        const date = type === "TBT" ? tbtDetails.date || localDay() : localDay();
        const path = `documents/${user.uid}/field-records/${id}/original`;
        const downloadURL = await uploadDocument(file, user.uid, null, () => {}, { folder: `field-records/${id}`, objectName: "original" });
        const title = type === "TBT" && tbtDetails.topic.trim() ? tbtDetails.topic.trim() : file.name.replace(/\.[^.]+$/, "") || labels[type];
        const record = {
          id, ownerUid: user.uid, createdBy: user.uid, updatedBy: user.uid, type, title, fileName: file.name, filePath: path, downloadURL,
          mimeType: file.type || "application/octet-stream", attachments: [{ filePath: path, fileName: file.name, mimeType: file.type || "application/octet-stream" }],
          recordDate: date, documentDate: date, createdAt: timestamp, updatedAt: timestamp, projectId: project?.id || null, projectName: project?.name || "",
          drawingId: contextualDrawing?.id || null, drawingName: contextualDrawing?.title || null,
          drawingLinks: contextualDrawing?.id ? [contextualDrawing.id] : [],
          area: type === "TBT" ? tbtDetails.area : contextualDrawing?.title || "", topic: type === "TBT" ? tbtDetails.topic : "", supervisor: type === "TBT" ? tbtDetails.supervisor : "",
          manpower: type === "TBT" ? tbtDetails.manpower : "", workers: type === "TBT" ? tbtDetails.workers : "", staff: type === "TBT" ? tbtDetails.staff : "",
          remarks: type === "TBT" ? tbtDetails.remarks : "", discipline: "", tags: contextualDrawing?.title ? [contextualDrawing.title] : [], status: "active", relatedRecords: [], ocrStatus: type === "TBT" ? "needs-ocr" : "not-applicable",
          rawOcrText: "", extracted: {}, confirmedFields: [],
        };
        try {
          await setDoc(doc(db, "users", user.uid, "fieldDocuments", id), record);
        } catch (error) {
          await deleteDocument(path).catch(() => undefined);
          throw error;
        }
        added.push({
          id, title, subtitle: type === "TBT" ? [record.topic || "Toolbox talk", "Shift record"].join(" · ") : type === "DOCUMENT" ? "Project document" : "Site photo",
          date, createdAt: timestamp, uploadedAt: timestamp, updatedAt: timestamp, type, workItems: 0, complete: 0, inProgress: 0, openItems: 0,
          filePath: path, mimeType: record.mimeType, fileName: file.name, image: (type === "PHOTO" || type === "DOCUMENT") && record.mimeType.startsWith("image/") ? downloadURL : undefined,
          area: record.area, topic: record.topic, manpower: record.manpower, workers: record.workers, staff: record.staff,
        });
      }
      setDocuments((old) => [...added, ...old]);
      setMessage(`${added.length} ${type === "PHOTO" ? (added.length === 1 ? "photo" : "photos") : type === "TBT" ? "TBT record" : "document"} added to today’s work.`);
    } catch (error) {
      console.error("Field record upload failed", error);
      if (added.length) setDocuments((old) => [...added, ...old]);
      setMessage(added.length ? `${added.length} record saved. Next upload failed; check connection.` : "Upload could not be completed. Check Storage access and retry.");
    } finally {
      setUploading(false);
      if (tbtInputRef.current) tbtInputRef.current.value = "";
      if (photoInputRef.current) photoInputRef.current.value = "";
      if (documentInputRef.current) documentInputRef.current.value = "";
    }
  }

  function openRecord(record: WorkspaceRecord) {
    if (record.type === "drawing") onOpenDrawing(record.id);
    else if (record.type === "DPR") onOpenDpr(record.id);
    else onOpenRecord?.(record.id);
  }

  const continueWork = () => activeDrawing ? onOpenDrawing(activeDrawing.id) : onContinueWork?.();
  const siteArea = activeDrawing?.area || project?.areas.split(",").map((area) => area.trim()).find(Boolean) || "Site area not set";

  // Check DPR Draft readiness and Reconciliation triggers
  const dprDraftReady = isDprDraftReady || (!todayDpr.length && !activeTodayDpr && (todayWorkItems.length > 0 || totalCompletedCount + totalInProgressCount > 0));
  const reconNeeded = (activeTodayDpr && activeTodayDpr.state !== "REVIEWED" && activeTodayDpr.state !== "FINAL") || (activeReconciliation && (activeReconciliation.dprOnlyCount > 0 || activeReconciliation.drawingOnlyCount > 0));

  return (
    <main className={`field-dashboard field-workspace-home${reports ? " is-reports" : ""}`}>
      <input ref={tbtInputRef} hidden type="file" accept={accepted} onChange={(event) => void uploadFiles("TBT", event.target.files)} />
      <input ref={photoInputRef} hidden type="file" accept=".jpg,.jpeg,.png,.webp" multiple onChange={(event) => void uploadFiles("PHOTO", event.target.files)} />
      <input ref={documentInputRef} hidden type="file" accept={accepted} onChange={(event) => void uploadFiles("DOCUMENT", event.target.files)} />

      {tbtDialogOpen && (
        <div className="field-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setTbtDialogOpen(false); }}>
          <section className="field-tbt-dialog" role="dialog" aria-modal="true" aria-labelledby="field-tbt-title">
            <header>
              <span><ShieldCheck size={18} />TOOLBOX TALK</span>
              <h2 id="field-tbt-title">Add today&apos;s TBT</h2>
              <p>Record the details you know, then attach the original sheet or photo.</p>
            </header>
            <div className="field-tbt-fields">
              <label>Date<input type="date" value={tbtDetails.date} onChange={(event) => setTbtDetails((old) => ({ ...old, date: event.target.value }))} /></label>
              <label>Area<input value={tbtDetails.area} onChange={(event) => setTbtDetails((old) => ({ ...old, area: event.target.value }))} placeholder="e.g. Pipe rack north" /></label>
              <label className="wide">Topic<input value={tbtDetails.topic} onChange={(event) => setTbtDetails((old) => ({ ...old, topic: event.target.value }))} placeholder="Toolbox talk topic" /></label>
              <label>Supervisor<input value={tbtDetails.supervisor} onChange={(event) => setTbtDetails((old) => ({ ...old, supervisor: event.target.value }))} /></label>
              <label>Manpower<input type="number" min="0" value={tbtDetails.manpower} onChange={(event) => setTbtDetails((old) => ({ ...old, manpower: event.target.value }))} /></label>
              <label>Workers<input type="number" min="0" value={tbtDetails.workers} onChange={(event) => setTbtDetails((old) => ({ ...old, workers: event.target.value }))} /></label>
              <label>Staff / supervisors<input type="number" min="0" value={tbtDetails.staff} onChange={(event) => setTbtDetails((old) => ({ ...old, staff: event.target.value }))} /></label>
              <label className="wide">Remarks<input value={tbtDetails.remarks} onChange={(event) => setTbtDetails((old) => ({ ...old, remarks: event.target.value }))} placeholder="Optional note" /></label>
            </div>
            <footer>
              <button className="secondary" onClick={() => setTbtDialogOpen(false)}>Cancel</button>
              <button onClick={chooseTbtFile}><ShieldCheck size={16} />Attach sheet or photo</button>
            </footer>
          </section>
        </div>
      )}

      {reports ? (
        <>
          <header className="work-reg-header field-workspace-intro">
            <div className="work-reg-title-wrap field-workspace-intro-copy">
              <p className="field-section-kicker">
                <FileBarChart2 size={14} />
                <span>PROJECT REPORTS &amp; REGISTERS</span>
              </p>
              <h1>Project Reports &amp; Registers</h1>
              <p className="field-workspace-subline">
                Authoritative field reporting across drawings, DPRs, work items, and reconciliation.
              </p>
            </div>
          </header>

          {/* Execution Report Type Switcher */}
          <div className="flex flex-wrap gap-1 p-1 bg-white border border-[#d7ddd7] rounded-[4px] shadow-sm mb-4">
            <button
              onClick={() => setReportType("dpr_summary")}
              className={`px-3 py-1.5 text-xs font-bold rounded-[3px] transition-colors ${reportType === "dpr_summary" ? "bg-[#315e49] text-white" : "text-[#526269] hover:bg-[#eef4ef]"}`}
            >
              1. Daily DPR Summary
            </button>
            <button
              onClick={() => setReportType("work_register")}
              className={`px-3 py-1.5 text-xs font-bold rounded-[3px] transition-colors ${reportType === "work_register" ? "bg-[#315e49] text-white" : "text-[#526269] hover:bg-[#eef4ef]"}`}
            >
              2. Work-Item Master Register
            </button>
            <button
              onClick={() => setReportType("drawing_progress")}
              className={`px-3 py-1.5 text-xs font-bold rounded-[3px] transition-colors ${reportType === "drawing_progress" ? "bg-[#315e49] text-white" : "text-[#526269] hover:bg-[#eef4ef]"}`}
            >
              3. Drawing Progress Report
            </button>
            <button
              onClick={() => setReportType("reconciliation")}
              className={`px-3 py-1.5 text-xs font-bold rounded-[3px] transition-colors ${reportType === "reconciliation" ? "bg-[#315e49] text-white" : "text-[#526269] hover:bg-[#eef4ef]"}`}
            >
              4. DPR vs Drawing Reconciliation
            </button>
            <button
              onClick={() => setReportType("missing_unreported")}
              className={`px-3 py-1.5 text-xs font-bold rounded-[3px] transition-colors ${reportType === "missing_unreported" ? "bg-[#315e49] text-white" : "text-[#526269] hover:bg-[#eef4ef]"}`}
            >
              5. Missing / Unreported Work
            </button>
          </div>

          <section className="field-report-export" aria-labelledby="field-report-title">
            <header>
              <div>
                <p className="field-section-kicker">OUTPUT BUILDER</p>
                <h2 id="field-report-title">
                  {reportType === "work_register"
                    ? "Work-Item Master Register"
                    : reportType === "drawing_progress"
                    ? "Drawing Spatial Progress"
                    : reportType === "missing_unreported"
                    ? "Missing / Unreported Work Exception Register"
                    : reportType === "reconciliation"
                    ? "DPR ↔ Drawing Reconciliation"
                    : "Daily Progress Report (DPR) Summary"}
                </h2>
                <p>Filter by shift date or export cumulative project execution data.</p>
              </div>
              <label>
                Report date
                <input type="date" value={reportDate} onChange={(event) => setReportDate(event.target.value)} />
              </label>
            </header>

            {/* Context KPI Bar for Active Report */}
            <div className="field-report-counts">
              {reportType === "work_register" && (
                <>
                  <article><span>Total Items</span><b>{filteredWorkItems.length}</b></article>
                  <article><span>Complete</span><b>{filteredWorkItems.filter((i) => i.status === "Complete").length}</b></article>
                  <article><span>In Progress</span><b>{filteredWorkItems.filter((i) => i.status === "In Progress").length}</b></article>
                  <article><span>DPR Missing</span><b>{filteredWorkItems.filter((i) => i.status === "Complete" && !i.dprReported).length}</b></article>
                </>
              )}
              {reportType === "drawing_progress" && (
                <>
                  <article><span>Drawings</span><b>{drawings.length}</b></article>
                  <article><span>Total Work Items</span><b>{drawings.reduce((a, c) => a + c.workItems, 0)}</b></article>
                  <article><span>Completed</span><b>{drawings.reduce((a, c) => a + c.complete, 0)}</b></article>
                  <article><span>Still Open</span><b>{drawings.reduce((a, c) => a + c.inProgress + c.openItems, 0)}</b></article>
                </>
              )}
              {reportType === "missing_unreported" && (
                <>
                  <article><span>Unreported Work</span><b className="text-amber-700">{unreportedItems.length}</b></article>
                  <article><span>Piping / Welding</span><b>{unreportedItems.filter((i) => i.discipline === "piping" || i.discipline === "welding").length}</b></article>
                  <article><span>Structural Steel</span><b>{unreportedItems.filter((i) => i.discipline === "structural").length}</b></article>
                  <article><span>Other Disciplines</span><b>{unreportedItems.filter((i) => !["piping", "welding", "structural"].includes(i.discipline)).length}</b></article>
                </>
              )}
              {reportType === "reconciliation" && (
                <>
                  <article><span>Total Evaluated</span><b>{workItems.length}</b></article>
                  <article><span>Matched (DPR &amp; Dwg)</span><b>{workItems.filter((i) => i.dprReported && i.drawingId).length}</b></article>
                  <article><span>Drawing Only</span><b>{workItems.filter((i) => i.drawingId && !i.dprReported).length}</b></article>
                  <article><span>DPR Only</span><b>{workItems.filter((i) => i.dprReported && !i.drawingId).length}</b></article>
                </>
              )}
              {reportType === "dpr_summary" && (
                <>
                  <article><span>DPRs Saved</span><b>{dprSummaryRows.length}</b></article>
                  <article><span>Drawings Linked</span><b>{drawings.length}</b></article>
                  <article><span>TBTs &amp; Manpower</span><b>{todayTbt.length}</b></article>
                  <article><span>Photos &amp; Evidence</span><b>{todayPhotos.length}</b></article>
                </>
              )}
            </div>

            {/* Export Actions */}
            <div className="field-report-export-actions">
              <button onClick={printReport} disabled={!accountUser}>
                <span><Printer size={19} /></span>
                <b>Print / save as PDF</b>
                <small>Formatted print output with technical header.</small>
              </button>
              <button onClick={downloadCsv} disabled={!accountUser}>
                <span><Download size={19} /></span>
                <b>Download CSV</b>
                <small>Import directly into spreadsheet tools.</small>
              </button>
              <button onClick={() => void downloadExcel()} disabled={!accountUser || excelExporting}>
                <span><FileSpreadsheet size={19} /></span>
                <b>{excelExporting ? "Preparing Excel…" : "Download Excel"}</b>
                <small>Formatted Excel workbook with headers.</small>
              </button>
            </div>

            {exportMessage && <p className="field-report-export-status" role="status">{exportMessage}</p>}

            {/* Report Table Preview */}
            <div className="field-report-preview">
              <div>
                <b>Report Preview</b>
                <span>{reportDate ? dateText(reportDate) : "All saved dates"}</span>
              </div>
              <div className="field-report-table-wrap">
                {reportType === "work_register" ? (
                  <table>
                    <thead>
                      <tr><th>Item ID</th><th>Date</th><th>Drawing</th><th>Line / Area</th><th>Discipline</th><th>Description</th><th>Status</th><th>DPR</th><th>NDT</th></tr>
                    </thead>
                    <tbody>
                      {filteredWorkItems.slice(0, 8).map((item) => (
                        <tr key={item.id}>
                          <td className="font-mono font-medium">{item.jointId || item.id.slice(0, 8)}</td>
                          <td>{item.fieldDate}</td>
                          <td>{item.drawingName || "—"}</td>
                          <td>{item.lineId || "—"}</td>
                          <td><span className="discipline-badge text-[10px]">{item.discipline}</span></td>
                          <td>{item.description}</td>
                          <td><span className={`status-pill ${item.status.toLowerCase().replace(/\s+/g, "-")}`}>{item.status}</span></td>
                          <td>{item.dprReported ? "✓" : "Missing"}</td>
                          <td>{item.ndtStatus || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : reportType === "drawing_progress" ? (
                  <table>
                    <thead>
                      <tr><th>Drawing Sheet</th><th>Rev</th><th>Area</th><th>Work Items</th><th>Complete</th><th>In Progress</th><th>% Complete</th></tr>
                    </thead>
                    <tbody>
                      {drawings.slice(0, 8).map((dwg) => (
                        <tr key={dwg.id}>
                          <td><b>{dwg.title}</b></td>
                          <td>{dwg.revision ? `Rev ${dwg.revision}` : "—"}</td>
                          <td>{dwg.area || "—"}</td>
                          <td>{dwg.workItems}</td>
                          <td>{dwg.complete}</td>
                          <td>{dwg.inProgress}</td>
                          <td><b>{dwg.workItems ? Math.round((dwg.complete / dwg.workItems) * 100) : 0}%</b></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : reportType === "missing_unreported" ? (
                  <table>
                    <thead>
                      <tr><th>Item ID</th><th>Date Completed</th><th>Drawing</th><th>Line / Area</th><th>Discipline</th><th>Description</th><th>Action Needed</th></tr>
                    </thead>
                    <tbody>
                      {unreportedItems.slice(0, 8).map((item) => (
                        <tr key={item.id}>
                          <td className="font-mono font-medium">{item.jointId || item.id.slice(0, 8)}</td>
                          <td>{item.fieldDate}</td>
                          <td>{item.drawingName || "—"}</td>
                          <td>{item.lineId || "—"}</td>
                          <td><span className="discipline-badge text-[10px]">{item.discipline}</span></td>
                          <td>{item.description}</td>
                          <td className="text-amber-800 font-medium">Add to DPR Draft</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table>
                    <thead>
                      <tr><th>Date</th><th>Record</th><th>Area / Contractor</th><th>Work Items</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {reportRecords.slice(0, 8).map((record) => (
                        <tr key={`${record.type}-${record.id}`}>
                          <td>{dateText(recordDay(record.date))}</td>
                          <td><b>{record.title}</b> ({labels[record.type]})</td>
                          <td>{record.area || project?.epcContractor || "—"}</td>
                          <td>{record.workItems || "—"}</td>
                          <td>{record.subtitle}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </section>
        </>
      ) : (
        <>
          <header className="work-reg-header field-workspace-intro">
            <div className="work-reg-title-wrap field-workspace-intro-copy">
              <p className="field-section-kicker">
                <CalendarDays size={14} />
                <span>DAILY FIELD COMMAND CENTRE</span>
              </p>
              <h1>Today&apos;s Field Work</h1>
              <p className="field-workspace-subline">
                Keep today&apos;s work items, drawings, DPRs, and site evidence together.
              </p>
              <div className="field-workspace-site-context">
                <span className="field-context-chip-date">
                  <CalendarDays size={13} />
                  <b>{dateText(todayKey)}</b>
                </span>
                <button type="button" onClick={() => onOpenProject?.()} disabled={!onOpenProject} aria-label={`Edit project details: ${project?.name || "Project not set"}`} title="Edit project details">
                  <Building2 size={13} />
                  PROJECT <b>{project?.name || "Project not set"}</b>
                  <Pencil className="field-context-edit-icon" size={11} />
                </button>
                <button type="button" onClick={() => onOpenProject?.()} disabled={!onOpenProject} aria-label={`Edit site and area: ${siteArea}`} title="Edit site and area details">
                  <MapPin size={13} />
                  SITE / AREA <b>{siteArea}</b>
                  <Pencil className="field-context-edit-icon" size={11} />
                </button>
                {project?.projectNumber && (
                  <button type="button" onClick={() => onOpenProject?.()} disabled={!onOpenProject} aria-label={`Edit project number: ${project.projectNumber}`} title="Edit project number">
                    <span className="field-project-number-icon">#</span>
                    PROJECT NO. <b>{project.projectNumber}</b>
                    <Pencil className="field-context-edit-icon" size={12} />
                  </button>
                )}
              </div>
            </div>

            <div className="field-workspace-actions">
              <div className={`field-sync-state ${syncStatus.kind}`} role="status">
                {syncStatus.kind === "saving" || syncStatus.kind === "checking" ? (
                  <EpcxSpinner size="xs" inline />
                ) : syncStatus.kind === "failed" ? (
                  <AlertTriangle size={14} />
                ) : syncStatus.kind === "saved" ? (
                  <CheckCircle2 size={14} />
                ) : (
                  <Cloud size={14} />
                )}
                <span>{syncStatus.label}</span>
                {loadFailed && (
                  <button onClick={() => void load()} aria-label="Retry checking saved records">
                    <RefreshCw size={13} />
                  </button>
                )}
                {pendingDrawing && <button onClick={() => onOpenDrawing(pendingDrawing.id)}>Retry drawing sync</button>}
              </div>

              <button className="field-continue-button" onClick={continueWork}>
                <ArrowRight size={16} />
                <span>Continue today&apos;s work</span>
              </button>

              <div className="field-workspace-add-wrap">
                <button className="field-add-button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} disabled={uploading}>
                  <Plus size={18} />
                  <span>{uploading ? "Saving…" : "Add record"}</span>
                </button>
                {menuOpen && (
                  <div className="field-add-menu-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setMenuOpen(false); }}>
                    <div className="field-add-menu" role="menu">
                      <div>
                        <b>Add to today&apos;s work</b>
                        <button className="field-add-menu-close" onClick={() => setMenuOpen(false)} aria-label="Close">
                          <X size={17} />
                        </button>
                      </div>
                      <button role="menuitem" onClick={() => { setMenuOpen(false); onAddDrawing(); }}>
                        <BookOpen size={18} />
                        <span><b>Drawing</b><small>Mark work on an engineering drawing</small></span>
                      </button>
                      <button role="menuitem" onClick={() => { setMenuOpen(false); onAddDpr(); }}>
                        <FileText size={18} />
                        <span><b>DPR</b><small>Upload today&apos;s report</small></span>
                      </button>
                      <button role="menuitem" onClick={() => startUpload("TBT")}>
                        <ShieldCheck size={18} />
                        <span><b>TBT</b><small>Add a toolbox talk</small></span>
                      </button>
                      <button role="menuitem" onClick={() => startUpload("PHOTO")}>
                        <ImageIcon size={18} />
                        <span><b>Photo</b><small>Add site photos</small></span>
                      </button>
                      <button role="menuitem" onClick={() => startUpload("DOCUMENT")}>
                        <FileText size={18} />
                        <span><b>Document</b><small>Add a supporting record</small></span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {billing && today && !reports && (
            <section className="field-plan-usage" aria-label="Plan and usage">
              <header>
                <div>
                  <p className="field-section-kicker">YOUR EPCX PLAN</p>
                  <h2>{billing.currentPlan.name}</h2>
                  <div className="field-plan-feature-tags">
                    {billing.currentPlan.historyDays > 0 && <span>{billing.currentPlan.historyDays} day history</span>}
                    {billing.currentPlan.sharingEnabled && <span>Project sharing</span>}
                    {billing.currentPlan.advancedReportsEnabled && <span>Advanced reports</span>}
                    {billing.currentPlan.externalSharingEnabled && <span>External sharing</span>}
                  </div>
                </div>
                <Link href="/pricing">Plan details &amp; pricing <ArrowRight size={14} /></Link>
              </header>
              <div className="field-plan-usage-grid">
                {highlightedUsage.map(({ key, label, used, limit }) => (
                  <div key={key}>
                    <div>
                      <span>{label}</span>
                      <b>{used.toLocaleString("en-IN")} <small>/ {limit.toLocaleString("en-IN")}</small></b>
                    </div>
                    <div className="field-plan-usage-bar"><i style={{ width: `${Math.min(100, Math.round((used / limit) * 100))}%` }} /></div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {message && <div className={`field-record-message ${loadFailed ? "error" : ""}`} role="status">{message}<button onClick={() => setMessage("")} aria-label="Dismiss"><X size={15} /></button></div>}
          {!accountUser && !loading && <div className="field-record-empty">Sign in once to keep your field records with your account. <a href="/login?redirect=%2Fstart">Sign in</a></div>}
          {busy && <div className="field-record-empty"><EpcxSpinner size="sm" inline /> Checking today&apos;s saved work…</div>}

          {accountUser && !busy && !loadFailed && !reports && (
            <>
              {/* TODAY'S FIELD STATUS */}
              <section className="field-work-progress" aria-label="Today's work progress">
                <div className="field-work-progress-main">
                  <div className="field-work-progress-head">
                    <div>
                      <p className="field-section-kicker">TODAY&apos;S FIELD STATUS</p>
                      <h2>Work progress</h2>
                    </div>
                    <span>{updatedTodayCount} work item{updatedTodayCount === 1 ? "" : "s"} updated today</span>
                  </div>
                  <div className="field-work-progress-bar">
                    <i style={{ width: `${totalWorkCount ? Math.round((totalCompletedCount / totalWorkCount) * 100) : 0}%` }} />
                  </div>
                  <div className="field-work-progress-counts">
                    <span><b>{totalCompletedCount}</b><small>Complete</small></span>
                    <span><b>{totalInProgressCount}</b><small>In progress</small></span>
                    <span><b>{totalNeedsStatusCount}</b><small>Needs attention</small></span>
                    <span className="field-work-progress-total"><b>{totalWorkCount}</b><small>Total work items</small></span>
                  </div>
                </div>
                <div className="field-work-support-status">
                  <div>
                    <span><Users size={15} />MANPOWER</span>
                    <b>{manpower ? `${manpower} recorded` : workers || staff ? `${workers || 0} workers · ${staff || 0} staff` : "Not recorded"}</b>
                    {(workers || staff) && <small>{workers} workers · {staff} supervisors</small>}
                  </div>
                  <div>
                    <span><ClipboardList size={15} />TODAY&apos;S RECORDS</span>
                    <b>{todayDpr.length || activeTodayDpr ? "DPR added" : "DPR not added"} <i /> {todayTbt.length ? "TBT added" : "TBT not added"}</b>
                    <small>{todayPhotos.length} photos · {todayDocs.length} documents</small>
                  </div>
                  <div>
                    <span><BookOpen size={15} />DRAWINGS</span>
                    <b>{drawings.length} active · {todayDrawings.length} updated today</b>
                    <small>{drawings.length ? "Field work stays anchored to drawings" : "Add a drawing to start site work"}</small>
                  </div>
                </div>
              </section>

              {/* NEXT ACTIONS */}
              <section className="field-needs-attention">
                <header>
                  <div>
                    <p className="field-section-kicker">NEXT ACTIONS</p>
                    <h2>Needs attention</h2>
                  </div>
                  <span>{(!drawings.length ? 1 : 0) + (dprDraftReady || reconNeeded || !todayDpr.length ? 1 : 0) + (totalNeedsStatusCount ? 1 : 0) + (!todayTbt.length && !manpower ? 1 : 0)} items</span>
                </header>
                <div className="field-attention-list">
                  {!drawings.length && (
                    <article>
                      <span className="attention-icon"><BookOpen size={17} /></span>
                      <div><b>No drawing in today&apos;s work</b><small>Add the drawing the team is working from.</small></div>
                      <button onClick={onAddDrawing}>Add drawing <ChevronRight size={15} /></button>
                    </article>
                  )}

                  {dprDraftReady ? (
                    <article className="attention-item-dpr-ready">
                      <span className="attention-icon attention-icon-ready"><CheckCircle2 size={17} /></span>
                      <div>
                        <b>{updatedTodayCount || (totalCompletedCount + totalInProgressCount)} work item{updatedTodayCount === 1 ? "" : "s"} recorded · DPR draft ready</b>
                        <small>Review and finalise today&apos;s DPR using work already captured in EPCX.</small>
                      </div>
                      <button onClick={onAddDpr}>Review DPR draft <ChevronRight size={15} /></button>
                    </article>
                  ) : reconNeeded ? (
                    <article className="attention-item-dpr-ready">
                      <span className="attention-icon attention-icon-ready"><Layers size={17} /></span>
                      <div>
                        <b>DPR uploaded · Records need reconciliation</b>
                        <small>Compare reported items against drawing markups to uncover discrepancies.</small>
                      </div>
                      <button onClick={() => onOpenTools?.()}>Reconcile <ChevronRight size={15} /></button>
                    </article>
                  ) : !todayDpr.length && !activeTodayDpr ? (
                    <article>
                      <span className="attention-icon"><FileText size={17} /></span>
                      <div><b>Today&apos;s DPR not added</b><small>Keep the shift report with the work recorded today.</small></div>
                      <button onClick={onAddDpr}>Upload DPR <ChevronRight size={15} /></button>
                    </article>
                  ) : null}

                  {totalNeedsStatusCount > 0 && (
                    <article>
                      <span className="attention-icon"><CircleDashed size={17} /></span>
                      <div>
                        <b>{totalNeedsStatusCount} work item{totalNeedsStatusCount === 1 ? "" : "s"} need status</b>
                        <small>Review items in the central register or mark on drawings.</small>
                      </div>
                      <button onClick={() => onOpenWork ? onOpenWork() : continueWork()}>Review register <ChevronRight size={15} /></button>
                    </article>
                  )}

                  {!todayTbt.length && !manpower && (
                    <article>
                      <span className="attention-icon"><ShieldCheck size={17} /></span>
                      <div><b>TBT and manpower not recorded</b><small>Add the toolbox talk details for this shift.</small></div>
                      <button onClick={() => startUpload("TBT")}>Add TBT <ChevronRight size={15} /></button>
                    </article>
                  )}

                  {pendingDrawing && (
                    <article>
                      <span className="attention-icon"><Cloud size={17} /></span>
                      <div><b>Drawing sync is waiting</b><small>{pendingDrawing.title} is saved on this device and needs cloud sync.</small></div>
                      <button onClick={() => onOpenDrawing(pendingDrawing.id)}>Retry sync <ChevronRight size={15} /></button>
                    </article>
                  )}
                </div>
              </section>

              {/* ACTIVE DRAWING */}
              <section className="field-active-drawings">
                <header>
                  <div>
                    <p className="field-section-kicker">WORK ANCHOR</p>
                    <h2>Active drawing</h2>
                  </div>
                  <button onClick={onAddDrawing}><Plus size={15} />Add drawing</button>
                </header>
                {activeDrawing ? (
                  <div className="field-active-drawing-list">
                    {activeDrawings.map((drawing) => {
                      const isImage = Boolean(drawing.image && (
                        drawing.image.startsWith("data:image/") ||
                        drawing.image.startsWith("blob:") ||
                        drawing.mimeType?.startsWith("image/") ||
                        /\.(jpe?g|png|webp)/i.test(drawing.image)
                      ));
                      return (
                        <article className="field-active-drawing" key={drawing.id}>
                          <button className="field-active-drawing-preview" onClick={() => onOpenDrawing(drawing.id)} aria-label={`Open ${drawing.title}`}>
                            {isImage ? <img src={drawing.image} alt="" /> : <span className="field-drawing-file-mark"><BookOpen size={27} /><small>{drawing.mimeType?.includes("pdf") ? "PDF" : "DRAWING"}</small></span>}
                            <span className="field-drawing-preview-status"><Check size={12} />FIELD DRAWING</span>
                          </button>
                          <div className="field-active-drawing-info">
                            <div className="field-active-drawing-title">
                              <span><b>{drawing.title}{drawing.revision ? ` · Rev ${drawing.revision}` : ""}</b><small>{drawing.area || project?.name || "Site area not set"}</small></span>
                              {recordDay(drawing.updatedAt || "") === todayKey && <i>Updated today</i>}
                            </div>
                            <div className="field-active-drawing-stats">
                              <span><b>{drawing.workItems}</b> work items</span>
                              <span><b>{drawing.complete}</b> complete</span>
                              <span><b>{drawing.inProgress + drawing.openItems}</b> still open</span>
                            </div>
                            <div className="field-active-drawing-progress">
                              <i style={{ width: `${drawing.workItems ? Math.round((drawing.complete / drawing.workItems) * 100) : 0}%` }} />
                            </div>
                            <div className="field-active-drawing-actions-row">
                              <button className="field-open-drawing" onClick={() => onOpenDrawing(drawing.id)}>
                                Open drawing <ArrowRight size={15} />
                              </button>

                              <div className="field-drawing-card-menu-wrap">
                                <button
                                  className={`field-drawing-card-menu-btn ${activeDrawingMenuId === drawing.id ? "active" : ""}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveDrawingMenuId((id) => (id === drawing.id ? null : drawing.id));
                                  }}
                                  aria-label="Drawing quick actions"
                                  title="Quick actions"
                                >
                                  <MoreHorizontal size={15} />
                                </button>

                                {activeDrawingMenuId === drawing.id && (
                                  <div className="field-submenu-popover field-drawing-card-popover" onClick={(e) => e.stopPropagation()}>
                                    <span className="field-submenu-eyebrow">DRAWING ACTIONS</span>
                                    <div className="field-submenu-list">
                                      <button className="field-submenu-item" onClick={() => { setActiveDrawingMenuId(null); onOpenDrawing(drawing.id); }}>
                                        <span className="field-submenu-icon">
                                          <BookOpen size={15} />
                                        </span>
                                        <span className="field-submenu-text">
                                          <span className="field-submenu-title">Open Drawing Canvas</span>
                                          <span className="field-submenu-desc">Spatial viewer & high-res zoom</span>
                                        </span>
                                        <ChevronRight size={13} className="field-submenu-arrow" />
                                      </button>
                                      <button className="field-submenu-item" onClick={() => { setActiveDrawingMenuId(null); onOpenDrawing(drawing.id); }}>
                                        <span className="field-submenu-icon">
                                          <Pencil size={15} />
                                        </span>
                                        <span className="field-submenu-text">
                                          <span className="field-submenu-title">Mark Today&apos;s Work</span>
                                          <span className="field-submenu-desc">Place joint pins & shift progress</span>
                                        </span>
                                        <ChevronRight size={13} className="field-submenu-arrow" />
                                      </button>
                                    </div>
                                    <hr className="field-submenu-divider" />
                                    <span className="field-submenu-eyebrow">ATTACH TO THIS SHEET</span>
                                    <div className="field-submenu-list">
                                      <button
                                        className="field-submenu-item"
                                        onClick={() => {
                                          setActiveDrawingMenuId(null);
                                          setContextualDrawing({ id: drawing.id, title: drawing.title });
                                          photoInputRef.current?.click();
                                        }}
                                      >
                                        <span className="field-submenu-icon">
                                          <Camera size={15} />
                                        </span>
                                        <span className="field-submenu-text">
                                          <span className="field-submenu-title">+ Attach Site Photo</span>
                                          <span className="field-submenu-desc">Link photo to this drawing</span>
                                        </span>
                                      </button>
                                      <button
                                        className="field-submenu-item"
                                        onClick={() => {
                                          setActiveDrawingMenuId(null);
                                          onAddDpr();
                                        }}
                                      >
                                        <span className="field-submenu-icon">
                                          <FileText size={15} />
                                        </span>
                                        <span className="field-submenu-text">
                                          <span className="field-submenu-title">+ Link DPR Record</span>
                                          <span className="field-submenu-desc">Attach daily progress report</span>
                                        </span>
                                      </button>
                                      <button
                                        className="field-submenu-item"
                                        onClick={() => {
                                          setActiveDrawingMenuId(null);
                                          setContextualDrawing({ id: drawing.id, title: drawing.title });
                                          startUpload("TBT");
                                        }}
                                      >
                                        <span className="field-submenu-icon">
                                          <ShieldCheck size={15} />
                                        </span>
                                        <span className="field-submenu-text">
                                          <span className="field-submenu-title">+ Attach TBT Record</span>
                                          <span className="field-submenu-desc">Toolbox talk shift sheet</span>
                                        </span>
                                      </button>
                                      <button
                                        className="field-submenu-item"
                                        onClick={() => {
                                          setActiveDrawingMenuId(null);
                                          setContextualDrawing({ id: drawing.id, title: drawing.title });
                                          documentInputRef.current?.click();
                                        }}
                                      >
                                        <span className="field-submenu-icon">
                                          <FileSpreadsheet size={15} />
                                        </span>
                                        <span className="field-submenu-text">
                                          <span className="field-submenu-title">+ Field Document</span>
                                          <span className="field-submenu-desc">Test certificate or spec sheet</span>
                                        </span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="field-empty-drawing">
                    <BookOpen size={23} />
                    <div><b>No drawing in this project yet</b><span>Add the drawing your team uses to anchor work items and daily records.</span></div>
                    <button onClick={onAddDrawing}>Add drawing <ArrowRight size={15} /></button>
                  </div>
                )}
              </section>

              {/* QUICK CAPTURE */}
              <section className="field-quick-capture">
                <header>
                  <div>
                    <p className="field-section-kicker">QUICK CAPTURE</p>
                    <h2>Add to today&apos;s work</h2>
                  </div>
                  <span>Choose what you have on site.</span>
                </header>
                <div className="field-quick-actions">
                  <button onClick={onAddDrawing}><span><BookOpen size={20} /></span><b>Drawing</b><small>Mark work</small></button>
                  <button onClick={onAddDpr}><span><FileText size={20} /></span><b>DPR</b><small>Upload today&apos;s report</small></button>
                  <button onClick={() => startUpload("TBT")}><span><ShieldCheck size={20} /></span><b>TBT</b><small>Add toolbox talk</small></button>
                  <button onClick={() => startUpload("PHOTO")}><span><ImageIcon size={20} /></span><b>Photo</b><small>Add site photos</small></button>
                  <button onClick={() => startUpload("DOCUMENT")}><span><FileSpreadsheet size={20} /></span><b>Document</b><small>Supporting record</small></button>
                </div>
              </section>

              {/* TODAY'S ACTIVITY */}
              <section className="field-today-activity">
                <header>
                  <div>
                    <p className="field-section-kicker">{dateText(todayKey).toUpperCase()} · PROJECT ACTIVITY</p>
                    <h2>Today&apos;s work</h2>
                    <p>Drawings, progress and supporting records from the shift.</p>
                  </div>
                  <button onClick={onOpenProject}><MapPin size={14} />{siteArea}</button>
                </header>
                <div className="field-today-record-chain">
                  <span><BookOpen size={14} />Drawing</span><i />
                  <span><Check size={14} />Work items</span><i />
                  <span><FileText size={14} />DPR {todayDpr.length || activeTodayDpr ? "✓" : "—"}</span><i />
                  <span><ShieldCheck size={14} />TBT {todayTbt.length ? "✓" : "—"}</span><i />
                  <span><ImageIcon size={14} />Photos {todayPhotos.length}</span>
                </div>
                {activity.length ? (
                  <div className="field-activity-timeline">
                    {activity.map((item) => (
                      <article key={item.id}>
                        <time>{timeText(item.time)}</time>
                        <span className={`field-activity-icon ${item.type.toLowerCase()}`}>{icon(item.type)}</span>
                        <div><b>{item.title}</b><small>{item.details}</small></div>
                        <button onClick={() => item.drawingId ? onOpenDrawing(item.drawingId) : item.recordId ? openRecord(allRecords.find((record) => record.id === item.recordId) ?? { id: item.recordId, type: item.type, title: item.title, subtitle: item.details, date: todayKey, workItems: 0, complete: 0, inProgress: 0, openItems: 0 }) : undefined}>
                          {item.type === "drawing" ? "Open drawing" : item.type === "PHOTO" ? "View photos" : item.type === "DPR" ? "Open DPR" : "Open record"}
                          <ArrowRight size={14} />
                        </button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="field-activity-empty">
                    <Clock3 size={18} />
                    <span><b>No activity recorded today yet.</b><small>Start with the drawing, DPR, TBT or photos you already have.</small></span>
                  </div>
                )}
              </section>
            </>
          )}


      {accountUser&&!busy&&!reports&&<section className="field-recent-section"><header className="field-recent-heading"><div><p className="field-section-kicker">PROJECT MEMORY</p><h2>Field history</h2><p>Browse site activity by date, then search or filter saved records.</p></div><label className="field-record-search"><Search size={16}/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search drawings, work items, dates or records"/></label></header><div className="field-history-layout"><aside className="field-history-calendar" aria-label="Browse field history by date"><div className="field-history-calendar-heading"><b>{historyMonthLabel}</b><span><button aria-label="Previous month" onClick={()=>setHistoryMonth((month)=>new Date(month.getFullYear(),month.getMonth()-1,1))}><ChevronLeft size={16}/></button><button aria-label="Next month" onClick={()=>setHistoryMonth((month)=>new Date(month.getFullYear(),month.getMonth()+1,1))}><ChevronRight size={16}/></button></span></div><div className="field-history-weekdays">{["M","T","W","T","F","S","S"].map((day,index)=><span key={`${day}-${index}`}>{day}</span>)}</div><div className="field-history-calendar-days">{calendarCells.map((day,index)=>{if(!day)return <i key={`blank-${index}`}/>;const date=`${historyMonth.getFullYear()}-${String(historyMonth.getMonth()+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;const count=recordCountsByDay.get(date)??0;return <button key={date} className={`${historyDay===date?"selected":""} ${count?"has-records":""} ${date===todayKey?"is-today":""}`} aria-label={`${dateText(date)}${count?`, ${count} records`:""}`} aria-pressed={historyDay===date} onClick={()=>setHistoryDay((selected)=>selected===date?"":date)}>{day}{count>0&&<small>{count}</small>}</button>;})}</div><button className="field-history-all-dates" onClick={()=>setHistoryDay("")}>{historyDay?"Show all dates":"Showing all dates"}</button></aside><div className="field-history-records"><div className="field-history-toolbar"><div className="field-record-filter" role="tablist" aria-label="Filter field history">{typeOptions.map(([value,label,total])=><button key={value} role="tab" aria-selected={filter===value} className={filter===value?"active":""} onClick={()=>setFilter(value)}>{label}<span>{total}</span></button>)}</div>{historyDay&&<button className="field-history-selected-date" onClick={()=>setHistoryDay("")}>{dateText(historyDay)} <X size={13}/></button>}</div>{!visibleRecords.length?<div className="field-record-empty">{query?"No records match that search.":historyDay?`No ${filter==="all"?"field":"matching"} records on ${dateText(historyDay)}.`:filter==="all"?"No records have been added yet.":`No ${labels[filter as RecordType].toLowerCase()} records yet.`}</div>:<div className="field-month-groups">{groups.map(([month,days],monthIndex)=><details key={month} open={Boolean(historyDay)||monthIndex===0} className="field-month-group"><summary><CalendarDays size={16}/><b>{monthText(month)}</b><span>{[...days.values()].flat().length} records</span></summary>{[...days.entries()].sort(([a],[b])=>b.localeCompare(a)).map(([day,records])=><section className="field-date-group" key={day}><h3>{dateText(day)}{records.filter((record)=>record.type==="PHOTO").length>0&&<span className="field-date-photo-count"> ({records.filter((record)=>record.type==="PHOTO").length} photos)</span>}</h3><div className="field-record-list">{records.map((record)=><button className="field-record-row" key={`${record.type}-${record.id}`} onClick={()=>openRecord(record)}><span className={`field-record-thumb ${record.type.toLowerCase()}`}>{(record.image && (record.image.startsWith("data:image/") || record.image.startsWith("blob:") || record.mimeType?.startsWith("image/") || /\.(jpe?g|png|webp)/i.test(record.image) || (record.type === "drawing" && !record.mimeType?.includes("pdf")))) ? <img src={record.image} alt=""/> : icon(record.type)}</span><span className="field-record-main"><b>{record.title}</b><small>{labels[record.type]} / {record.subtitle}</small>{record.type==="drawing"&&<small>{record.workItems} work items / {record.complete} complete{record.area?` / ${record.area}`:""}</small>}{record.relatedCount?<small>Related records / {record.relatedCount} linked</small>:null}{record.type==="DPR"&&record.drawingLinks?.length?<small>Related drawings / {record.drawingLinks.join(", ")}</small>:null}</span><span className="field-record-updated">{record.type==="drawing"?"Open drawing":"Open record"}</span></button>)}</div></section>)}</details>)}</div>}</div></div></section>}
        </>
      )}
    </main>
  );
}
