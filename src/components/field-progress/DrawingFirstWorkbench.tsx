"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent, type PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Camera, Check, ChevronDown, ChevronLeft, ChevronRight, Circle, Copy, Crop, Eye, EyeOff, FileText, Highlighter, LoaderCircle, Lock, MousePointer2, MoveUpRight, MoreHorizontal, Pencil, Plus, RotateCcw, RotateCw, Save, ShieldCheck, Type, Undo2, Redo2, Upload, X } from "lucide-react";
import { downloadDocument, uploadDocument } from "@/lib/firebase/storage";
import type { FieldProject } from "@/components/field-progress/FieldProjectProfile";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { auth, db, storage } from "@/lib/firebase/config";
import { extractText, type TextExtractionResult } from "@/lib/field-progress/text-extraction";
import { useFieldWork } from "@/contexts/FieldWorkContext";
import type { CentralWorkItem, WorkType } from "@/lib/field-progress/work-item-model";
import { EpcxSpinner } from "@/components/ui/EpcxSpinner";

type Tool = "select" | "mark" | "highlight" | "draw" | "arrow" | "text" | "crop" | "move";
type MarkStatus = "In Progress" | "Complete";
type Mark = { id: string; x: number; y: number; page: number; kind: "mark" | "highlight" | "draw" | "arrow" | "text"; status?: MarkStatus; itemType?: string; label?: string; line?: string; crew?: string; welder?: string; points?: { x: number; y: number }[]; width?: number; height?: number; createdAt?: string; updatedAt?: string; history?: { action: string; at: string }[]; extractedText?: TextExtractionResult };
type WorkEvent = { id: string; ownerUid: string; workItemId: string; drawingId: string; action: "created" | "status_changed" | "renamed" | "moved" | "deleted" | "reopened"; status?: MarkStatus; localDate: string; timestamp: string; userUid: string };
type LocalDrawing = { id: string; file?: File; snapshot: Record<string, unknown> };
const accepted = ".pdf,.jpg,.jpeg,.png,.webp";
const isPdf = (file?: File | Blob | null) => {
  if (!file) return false;
  if (file.type === "application/pdf") return true;
  if ("name" in file && typeof file.name === "string" && file.name.toLowerCase().endsWith(".pdf")) return true;
  return false;
};
const drawingStoragePath = (uid: string, drawingId: string) => `documents/${uid}/field-work/${drawingId}/source-drawing`;
const maxDrawingBytes = 50 * 1024 * 1024;
const drawingTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
type DrawingContentType = (typeof drawingTypes)[number];

async function generatePdfThumbnailFromFile(file: File | Blob): Promise<string | null> {
  try {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
    const arrayBuffer = await file.arrayBuffer();
    const task = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await task.promise;
    const pageDoc = await pdf.getPage(1);
    const baseViewport = pageDoc.getViewport({ scale: 1 });
    const targetWidth = 320;
    const scale = targetWidth / Math.max(1, baseViewport.width);
    const viewport = pageDoc.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const context = canvas.getContext("2d");
    if (!context) {
      await task.destroy();
      return null;
    }
    await pageDoc.render({ canvas, canvasContext: context, viewport }).promise;
    const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
    await task.destroy();
    return dataUrl;
  } catch (err) {
    console.warn("Could not generate PDF thumbnail", err);
    return null;
  }
}

async function generatePdfThumbnailFromUrl(fileUrl: string): Promise<string | null> {
  try {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
    const task = pdfjs.getDocument({ url: fileUrl });
    const pdf = await task.promise;
    const pageDoc = await pdf.getPage(1);
    const baseViewport = pageDoc.getViewport({ scale: 1 });
    const targetWidth = 320;
    const scale = targetWidth / Math.max(1, baseViewport.width);
    const viewport = pageDoc.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const context = canvas.getContext("2d");
    if (!context) {
      await task.destroy();
      return null;
    }
    await pageDoc.render({ canvas, canvasContext: context, viewport }).promise;
    const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
    await task.destroy();
    return dataUrl;
  } catch (err) {
    console.warn("Could not generate PDF thumbnail from URL", err);
    return null;
  }
}

async function generateImageThumbnailFromFile(file: File | Blob): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          const targetWidth = 320;
          const scale = Math.min(1, targetWidth / Math.max(1, img.naturalWidth));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.naturalWidth * scale);
          canvas.height = Math.round(img.naturalHeight * scale);
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            URL.revokeObjectURL(url);
            resolve(null);
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
          URL.revokeObjectURL(url);
          resolve(dataUrl);
        } catch {
          URL.revokeObjectURL(url);
          resolve(null);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    } catch {
      resolve(null);
    }
  });
}

async function generateImageThumbnailFromUrl(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const targetWidth = 320;
          const scale = Math.min(1, targetWidth / Math.max(1, img.naturalWidth));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.naturalWidth * scale);
          canvas.height = Math.round(img.naturalHeight * scale);
          const ctx = canvas.getContext("2d");
          if (!ctx) { resolve(url); return; }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.72));
        } catch {
          resolve(url);
        }
      };
      img.onerror = () => resolve(url);
      img.src = url;
    } catch {
      resolve(null);
    }
  });
}

function sanitizeForFirestore<T extends Record<string, unknown>>(data: T): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      clean[key] = value;
    }
  }
  return clean;
}

function isPdfDrawingSnapshot(snapshot: Record<string, unknown>) {
  const mime = String(snapshot.mimeType ?? snapshot.contentType ?? "").toLowerCase();
  const fileName = String(snapshot.fileName ?? "").toLowerCase();
  return mime.includes("pdf") || snapshot.drawingType === "pdf" || fileName.endsWith(".pdf");
}

/**
 * Ordered list of usable thumbnail sources for a drawing.
 * Cloud thumbnail comes first (same priority as the Today screen), then local caches,
 * then the original image itself for non-PDF drawings.
 */
function drawingThumbnailCandidates(
  snapshot: Record<string, unknown>,
  thumbnailsState: Record<string, string>,
  userUid?: string,
  currentId?: string,
  currentUrl?: string
): string[] {
  const id = String(snapshot.id ?? "");
  if (!id) return [];
  const readLocal = (key: string) => { try { return localStorage.getItem(key) ?? ""; } catch { return ""; } };
  const pdf = isPdfDrawingSnapshot(snapshot);
  const list = [
    snapshot.thumbnail,
    thumbnailsState[id],
    userUid ? readLocal(`epcx-drawing-thumb:${userUid}:${id}`) : "",
    snapshot.thumbnailURL,
    snapshot.previewURL,
    !pdf && id === currentId ? currentUrl : "",
    !pdf ? snapshot.downloadURL : "",
    !pdf ? snapshot.image : "",
    !pdf && userUid ? readLocal(`epcx-drawing-cloud:${userUid}:${id}`) : "",
  ];
  const seen = new Set<string>();
  return list.filter((value): value is string => {
    if (typeof value !== "string" || !value.trim() || seen.has(value)) return false;
    // Object URLs only survive for the drawing currently open in this tab.
    if (value.startsWith("blob:") && value !== currentUrl) return false;
    seen.add(value);
    return true;
  });
}

function resolveDrawingThumbnail(
  snapshot: Record<string, unknown>,
  thumbnailsState: Record<string, string>,
  userUid?: string,
  currentId?: string,
  currentUrl?: string,
  failed?: Set<string>
): string | null {
  return drawingThumbnailCandidates(snapshot, thumbnailsState, userUid, currentId, currentUrl).find((src) => !failed?.has(src)) ?? null;
}

async function detectDrawingContentType(file: File): Promise<DrawingContentType | null> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const matchesAt = (offset: number, ...signature: number[]) => signature.every((byte, index) => bytes[offset + index] === byte);
  let detected: DrawingContentType | null = null;
  if (matchesAt(0, 0x25, 0x50, 0x44, 0x46, 0x2d)) detected = "application/pdf";
  else if (matchesAt(0, 0xff, 0xd8, 0xff)) detected = "image/jpeg";
  else if (matchesAt(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) detected = "image/png";
  else if (matchesAt(0, 0x52, 0x49, 0x46, 0x46) && matchesAt(8, 0x57, 0x45, 0x42, 0x50) && bytes.length >= 12) detected = "image/webp";
  if (detected && drawingTypes.includes(file.type as DrawingContentType) && file.type !== detected) return null;
  return detected;
}

function persistenceErrorCode(reason: unknown) {
  return typeof reason === "object" && reason !== null && "code" in reason && typeof reason.code === "string" ? reason.code : "";
}

function persistenceErrorMessage(reason: unknown, stage = "") {
  const code = persistenceErrorCode(reason);
  if (code === "field-progress/unsupported-file") return "This file’s contents don’t match a supported PDF, JPG, PNG or WEBP drawing.";
  if (stage === "local recovery" || stage === "browser recovery") return "This browser could not save a recovery copy. Check available browser storage before continuing; your current drawing is still open.";
  if (["auth/credential-already-in-use", "auth/account-exists-with-different-credential", "auth/email-already-in-use"].includes(code)) return "That Google account already has an EPCX account. Your guest drawing is still here; continue as guest or use the existing account.";
  if (code.startsWith("auth/")) return "Your signed-in session could not be confirmed. Your work is saved in this browser; retry the save, or reload and try again.";
  if (code === "storage/unauthorized" || code === "permission-denied" || code === "firestore/permission-denied") return "Couldn't sync this drawing yet. Your work is saved locally and we'll retry automatically. Please retry, or contact support@epcx.cloud if it continues.";
  if (code.includes("network") || code.includes("unavailable") || code === "storage/retry-limit-exceeded") return "You're offline or the connection was interrupted. Your work is saved locally and will retry when the connection returns.";
  return "Couldn't sync this drawing yet. Your work is saved locally and we'll retry automatically.";
}

function logPersistenceFailure(stage: string, uid: string, file: File, drawingId: string, reason: unknown, contentType?: string) {
  if (process.env.NODE_ENV !== "development") return;
  const activeUser = auth.currentUser;
  console.warn("[EPCX Field Progress persistence]", {
    stage,
    projectId: auth.app.options.projectId,
    storageBucket: storage.app.options.storageBucket,
    firestoreDatabase: "(default)",
    firestorePath: `users/${uid}`,
    authenticatedUid: activeUser?.uid ?? null,
    authProvider: activeUser?.isAnonymous ? "anonymous" : activeUser?.providerData.map((provider) => provider.providerId) ?? null,
    storagePath: drawingStoragePath(uid, drawingId),
    contentType: (contentType ?? file.type) || "(browser did not provide a MIME type)",
    fileSizeBytes: file.size,
    errorCode: persistenceErrorCode(reason) || "unknown",
    errorMessage: reason instanceof Error ? reason.message : String(reason),
    reason,
  });
}

function localDrawingStore(key: string, value?: { file?: File; snapshot?: Record<string, unknown> }): Promise<{ file?: File; snapshot?: Record<string, unknown> } | undefined> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("epcx-field-work", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("sessions");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction("sessions", value ? "readwrite" : "readonly");
      const store = tx.objectStore("sessions");
      if (value) { store.put(value, key); tx.oncomplete = () => { db.close(); resolve(undefined); }; tx.onerror = () => { db.close(); reject(tx.error); }; tx.onabort = () => { db.close(); reject(tx.error); }; }
      else { const get = store.get(key); get.onsuccess = () => { db.close(); resolve(get.result); }; get.onerror = () => { db.close(); reject(get.error); }; }
    };
  });
}

function localDrawingList(ownerUid: string): Promise<LocalDrawing[]> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("epcx-field-work", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("sessions");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction("sessions", "readonly");
      const store = tx.objectStore("sessions");
      const keys = store.getAllKeys();
      const values = store.getAll();
      tx.oncomplete = () => {
        const rows = keys.result.map((key, index) => ({ key: String(key), value: values.result[index] as { file?: File; snapshot?: Record<string, unknown> } | undefined }));
        const matches = rows.filter(({ key, value }) => key.startsWith(`${ownerUid}:`) && value?.snapshot);
        if (!matches.length) {
          const legacy = rows.find(({ key, value }) => key === ownerUid && value?.snapshot);
          if (legacy?.value?.snapshot) matches.push({ key: `${ownerUid}:${String(legacy.value.snapshot.id ?? "legacy")}`, value: legacy.value });
        }
        db.close();
        resolve(matches.map(({ key, value }) => ({ id: key.slice(ownerUid.length + 1), file: value?.file, snapshot: value?.snapshot ?? {} })));
      };
      tx.onerror = () => { db.close(); reject(tx.error); };
    };
  });
}

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function workItemEventsBetween(current: Mark[], next: Mark[], ownerUid: string, drawingId: string): WorkEvent[] {
  const before = new Map(current.filter((mark) => mark.kind === "mark").map((mark) => [mark.id, mark]));
  const after = new Map(next.filter((mark) => mark.kind === "mark").map((mark) => [mark.id, mark]));
  const timestamp = new Date().toISOString();
  const makeEvent = (workItemId: string, action: WorkEvent["action"], status?: MarkStatus): WorkEvent => ({ id: crypto.randomUUID(), ownerUid, workItemId, drawingId, action, ...(status ? { status } : {}), localDate: localDateKey(), timestamp, userUid: ownerUid });
  const appended: WorkEvent[] = [];
  for (const [id, mark] of after) {
    const previous = before.get(id);
    if (!previous) { appended.push(makeEvent(id, "created", mark.status)); continue; }
    if (previous.status !== mark.status) appended.push(makeEvent(id, mark.status === "In Progress" && previous.status === "Complete" ? "reopened" : "status_changed", mark.status));
    if (previous.x !== mark.x || previous.y !== mark.y || previous.page !== mark.page) appended.push(makeEvent(id, "moved", mark.status));
    if (previous.label !== mark.label || previous.itemType !== mark.itemType || previous.line !== mark.line || previous.crew !== mark.crew || previous.welder !== mark.welder) appended.push(makeEvent(id, "renamed", mark.status));
  }
  for (const id of before.keys()) if (!after.has(id)) appended.push(makeEvent(id, "deleted", before.get(id)?.status));
  return appended;
}

async function appendCloudWorkEvents(ownerUid: string, drawingId: string, events: WorkEvent[]) {
  for (const event of events) {
    const eventRef = doc(db, "users", ownerUid, "fieldDrawings", drawingId, "workEvents", event.id);
    try { await setDoc(eventRef, event); }
    catch (reason) {
      const existing = await getDoc(eventRef);
      const data = existing.data();
      const alreadyAppended = existing.exists() && Object.entries(event).every(([key, value]) => data?.[key] === value);
      if (!alreadyAppended) throw reason;
    }
  }
}

export function DrawingFirstWorkbench({ initialView = "drawings", initialAction = "", project }: { initialView?: "drawings" | "today" | "history"; initialAction?: "drawing" | ""; project?: FieldProject } = {}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const photoCaptureRef = useRef<HTMLInputElement>(null);
  const docCaptureRef = useRef<HTMLInputElement>(null);
  const initialActionHandled = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<File | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [drawingSessions, setDrawingSessions] = useState<Record<string, Record<string, unknown>>>({});
  const [workspaceView, setWorkspaceView] = useState<"drawings" | "today">(initialView === "drawings" ? "drawings" : "today");
  const [drawingTab, setDrawingTab] = useState<"today" | "history">(initialView === "history" ? "history" : "today");
  const [drawingThumbnails, setDrawingThumbnails] = useState<Record<string, string>>({});
  const [failedThumbs, setFailedThumbs] = useState<Set<string>>(() => new Set());
  const generatingThumbnails = useRef(new Set<string>());
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [currentDrawingId, setCurrentDrawingId] = useState("");
  const [pendingFocusWorkItem, setPendingFocusWorkItem] = useState("");
  const [drawingName, setDrawingName] = useState("");
  const [revision, setRevision] = useState("");
  const [area, setArea] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingContentType, setPendingContentType] = useState<DrawingContentType | null>(null);
  const fieldContext = useFieldWork();
  const [showDrawingDetails, setShowDrawingDetails] = useState(false);
  const [enhancedView, setEnhancedView] = useState(false);
  const [revisionWarning, setRevisionWarning] = useState("");
  const [detailsError, setDetailsError] = useState("");
  const [workEvents, setWorkEvents] = useState<WorkEvent[]>([]);
  const workEventsRef = useRef<WorkEvent[]>([]);
  workEventsRef.current = workEvents;
  const [tool, setTool] = useState<Tool>("select");
  const [marks, setMarks] = useState<Mark[]>([]);
  const marksRef = useRef<Mark[]>([]);
  marksRef.current = marks;
  const historyRef = useRef<{ past: { marks: Mark[]; rotation: number; file: File | null }[]; future: { marks: Mark[]; rotation: number; file: File | null }[] }>({ past: [], future: [] });
  const [, setHistoryVersion] = useState(0);
  const [syncState, setSyncState] = useState<"synced" | "saving" | "uploading" | "offline" | "pending" | "failed">("synced");
  const [showWorkItems, setShowWorkItems] = useState(true);
  const [workListOpen, setWorkListOpen] = useState(false);
  const [workFilter, setWorkFilter] = useState<"All" | MarkStatus>("All");
  const [toast, setToast] = useState("");
  const [hintVisible, setHintVisible] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const zoomRef = useRef(zoom);
  const panOffsetRef = useRef(panOffset);
  zoomRef.current = zoom;
  panOffsetRef.current = panOffset;
  const [rotation, setRotation] = useState(0);
  const [pdfPage, setPdfPage] = useState<{ width: number; height: number; data: ImageData | null } | null>(null);
  const [editing, setEditing] = useState<Mark | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [localText, setLocalText] = useState("");
  const [detectedText, setDetectedText] = useState("");
  const [extraction, setExtraction] = useState<TextExtractionResult | null>(null);
  const [fieldTarget, setFieldTarget] = useState("line");
  const [pendingLine, setPendingLine] = useState("");
  const [pendingItemLabel, setPendingItemLabel] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const [cropRegion, setCropRegion] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [drawingPoints, setDrawingPoints] = useState<{ x: number; y: number }[]>([]);
  const [markupPreview, setMarkupPreview] = useState<Mark | null>(null);
  const [panState, setPanState] = useState<{ pointerId: number; x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const touchPoints = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ distance: number; zoom: number; pan: { x: number; y: number } } | null>(null);
  const uploadPromises = useRef(new Map<string, { file: File; promise: Promise<string> }>());

  async function ensureCloudDrawing(source: File, uid: string, drawingId: string) {
    const cloudKey = `epcx-drawing-cloud:${uid}:${drawingId}`;
    const inFlight = uploadPromises.current.get(cloudKey);
    if (inFlight) {
      const currentURL = await inFlight.promise;
      if (inFlight.file === source) return currentURL;
      localStorage.removeItem(cloudKey);
      return ensureCloudDrawing(source, uid, drawingId);
    }
    const cached = localStorage.getItem(cloudKey);
    if (cached) return cached;
    const contentType = await detectDrawingContentType(source);
    if (!contentType) throw Object.assign(new Error("The file content is not a supported PDF, JPEG, PNG, or WEBP drawing."), { code: "field-progress/unsupported-file" });
    const upload: { file: File; promise: Promise<string> } = { file: source, promise: Promise.resolve("") };
    upload.promise = uploadDocument(source, uid, null, () => {}, { folder: `field-work/${drawingId}`, objectName: "source-drawing", contentType })
      .then((downloadURL) => { localStorage.setItem(cloudKey, downloadURL); return downloadURL; })
      .finally(() => { if (uploadPromises.current.get(cloudKey) === upload) uploadPromises.current.delete(cloudKey); });
    uploadPromises.current.set(cloudKey, upload);
    return upload.promise;
  }

  async function retryPendingDrawings(ownerUid: string) {
    if (!navigator.onLine || !ownerUid) return;
    const activeId = localStorage.getItem(`epcx-current-drawing:${ownerUid}`);
    const rows = await localDrawingList(ownerUid);
    for (const row of rows) {
      if (!row.file || row.id === activeId || row.snapshot.storagePending !== true) continue;
      const contentType = await detectDrawingContentType(row.file);
      if (!contentType) continue;
      try {
        const downloadURL = await ensureCloudDrawing(row.file, ownerUid, row.id);
        const synced = { ...row.snapshot, contentType, mimeType: contentType, storagePath: drawingStoragePath(ownerUid, row.id), downloadURL, storagePending: false, updatedAt: new Date().toISOString() };
        const pendingEvents = (row.snapshot as Record<string, unknown>).workEvents;
        await appendCloudWorkEvents(ownerUid, row.id, Array.isArray(pendingEvents) ? pendingEvents as WorkEvent[] : []);
        await setDoc(doc(db, "users", ownerUid, "fieldDrawings", row.id), sanitizeForFirestore(synced), { merge: true });
        await localDrawingStore(`${ownerUid}:${row.id}`, { file: row.file, snapshot: synced });
        setDrawingSessions((current) => ({ ...current, [row.id]: synced }));
      } catch { /* Leave failed records marked pending for the next online retry. */ }
    }
  }

  const requestThumbnailGeneration = useCallback((id: string, snapshot: Record<string, unknown>) => {
    const existing = drawingThumbnails[id];
    if (!user || user.isAnonymous || (existing && !failedThumbs.has(existing)) || generatingThumbnails.current.has(id)) return;
    generatingThumbnails.current.add(id);

    void (async () => {
      try {
        let sourceFile: File | undefined = undefined;
        try {
          const local = await localDrawingStore(`${user.uid}:${id}`);
          sourceFile = local?.file;
          if (!sourceFile) {
            const rows = await localDrawingList(user.uid);
            sourceFile = rows.find((r) => r.id === id)?.file;
          }
        } catch { /* ignore */ }

        let thumb: string | null = null;
        if (sourceFile) {
          thumb = isPdf(sourceFile)
            ? await generatePdfThumbnailFromFile(sourceFile)
            : await generateImageThumbnailFromFile(sourceFile);
        }

        // Try downloading source via Firebase Storage SDK to reliably bypass browser CORS blocks
        const storagePath = (typeof snapshot.storagePath === "string" && snapshot.storagePath) || drawingStoragePath(user.uid, id);
        if (!thumb && navigator.onLine) {
          try {
            sourceFile = await downloadDocument(storagePath);
            if (sourceFile) {
              await localDrawingStore(`${user.uid}:${id}`, { file: sourceFile, snapshot });
              thumb = isPdf(sourceFile)
                ? await generatePdfThumbnailFromFile(sourceFile)
                : await generateImageThumbnailFromFile(sourceFile);
            }
          } catch { /* downloadDocument failed */ }
        }

        // Fallback to generating from downloadURL if available
        if (!thumb && typeof snapshot.downloadURL === "string" && snapshot.downloadURL) {
          if (isPdfDrawingSnapshot(snapshot)) {
            thumb = await generatePdfThumbnailFromUrl(snapshot.downloadURL);
          } else {
            thumb = await generateImageThumbnailFromUrl(snapshot.downloadURL);
          }
        }

        if (thumb) {
          try { localStorage.setItem(`epcx-drawing-thumb:${user.uid}:${id}`, thumb); } catch { /* noop */ }
          setDrawingThumbnails((prev) => ({ ...prev, [id]: thumb }));
          setDrawingSessions((prev) => prev[id] ? ({ ...prev, [id]: { ...prev[id], thumbnail: thumb } }) : prev);
          if (navigator.onLine) {
            void setDoc(doc(db, "users", user.uid, "fieldDrawings", id), { thumbnail: thumb }, { merge: true });
          }
        }
      } catch (e) {
        console.warn("Could not generate thumbnail for drawing", id, e);
      }
    })();
  }, [user, drawingThumbnails, failedThumbs]);

  function commitMarks(update: Mark[] | ((current: Mark[]) => Mark[]), message = "") {
    const current = marksRef.current;
    const next = typeof update === "function" ? update(current) : update;
    const signedInOwner = user && !user.isAnonymous ? user.uid : "";
    const drawingId = signedInOwner ? localStorage.getItem(`epcx-current-drawing:${signedInOwner}`) ?? "" : "";
    if (signedInOwner && drawingId) {
      const appended = workItemEventsBetween(current, next, signedInOwner, drawingId);
      if (appended.length) { const updatedEvents = [...workEventsRef.current, ...appended]; workEventsRef.current = updatedEvents; setWorkEvents(updatedEvents); }
      
      // Authoritative synchronization to central work item store
      const now = new Date().toISOString();
      const currentDrawingName = drawingName || fileRef.current?.name?.replace(/\.[^.]+$/, "") || "Drawing";
      const workMarks = next.filter((m) => m.kind === "mark");
      for (const m of workMarks) {
        const existingCentral = fieldContext?.workItems.find((w) => w.id === m.id);
        const centralItem: CentralWorkItem = {
          id: m.id,
          projectId: project?.id || "",
          projectName: project?.name || "",
          fieldDate: (m.createdAt || now).slice(0, 10),
          discipline: (m.itemType?.toLowerCase() as WorkType) || "piping",
          drawingId: drawingId || "",
          drawingName: currentDrawingName,
          drawingRevision: revision || "",
          drawingLocation: { x: m.x, y: m.y, page: m.page },
          lineId: m.line || "",
          jointId: m.label || "",
          description: m.label ? `Joint / item ${m.label}` : "Drawing marked work item",
          quantity: 1,
          unit: "ea",
          status: m.status === "Complete" ? "Complete" : "In Progress",
          progress: m.status === "Complete" ? 100 : 50,
          createdFrom: "drawing",
          sourceRecordId: m.id,
          dprReported: Boolean(existingCentral?.dprReported),
          dprId: existingCentral?.dprId || "",
          dprDate: existingCentral?.dprDate || "",
          crew: m.crew || "",
          welder: m.welder || "",
          remarks: m.crew ? `Crew: ${m.crew}` : "",
          needsIdentification: !m.label || m.label.startsWith("WI-"),
          photos: existingCentral?.photos || [],
          documents: existingCentral?.documents || [],
          history: [
            ...(existingCentral?.history || []),
            {
              at: now,
              action: `Status set to ${m.status === "Complete" ? "Complete" : "In Progress"} via drawing workbench`,
              by: signedInOwner,
              details: m.label ? `Joint / item ${m.label}` : "Drawing marked work item",
            },
          ].slice(-20),
          createdAt: m.createdAt || existingCentral?.createdAt || now,
          updatedAt: now,
        };
        void fieldContext?.addOrUpdateWorkItem(centralItem);
      }
    }
    historyRef.current = { past: [...historyRef.current.past.slice(-49), { marks: current, rotation, file: fileRef.current }], future: [] };
    marksRef.current = next;
    setMarks(next);
    setHistoryVersion((version) => version + 1);
    setSaved(false);
    if (message) { setToast(message); window.setTimeout(() => setToast(""), 2600); }
  }

  function undo() {
    const history = historyRef.current;
    if (!history.past.length) return;
    const previous = history.past[history.past.length - 1];
    const ownerUid = user && !user.isAnonymous ? user.uid : "";
    const drawingId = ownerUid ? localStorage.getItem(`epcx-current-drawing:${ownerUid}`) ?? "" : "";
    if (ownerUid && drawingId) { const events = workItemEventsBetween(marksRef.current, previous.marks, ownerUid, drawingId); if (events.length) { const updated = [...workEventsRef.current, ...events]; workEventsRef.current = updated; setWorkEvents(updated); } }
    historyRef.current = { past: history.past.slice(0, -1), future: [{ marks: marksRef.current, rotation, file: fileRef.current }, ...history.future] };
    marksRef.current = previous.marks; setMarks(previous.marks); setRotation(previous.rotation); setEditing((old) => old ? previous.marks.find((mark) => mark.id === old.id) ?? null : null);
    if (previous.file !== fileRef.current) {
      const drawingId = user && localStorage.getItem(`epcx-current-drawing:${user.uid}`);
      if (user && drawingId) localStorage.removeItem(`epcx-drawing-cloud:${user.uid}:${drawingId}`);
      fileRef.current = previous.file; setFile(previous.file); setUrl(previous.file ? URL.createObjectURL(previous.file) : "");
    }
    setHistoryVersion((version) => version + 1); setSaved(false); setToast("Undone"); window.setTimeout(() => setToast(""), 2200);
  }

  function redo() {
    const history = historyRef.current;
    if (!history.future.length) return;
    const next = history.future[0];
    const ownerUid = user && !user.isAnonymous ? user.uid : "";
    const drawingId = ownerUid ? localStorage.getItem(`epcx-current-drawing:${ownerUid}`) ?? "" : "";
    if (ownerUid && drawingId) { const events = workItemEventsBetween(marksRef.current, next.marks, ownerUid, drawingId); if (events.length) { const updated = [...workEventsRef.current, ...events]; workEventsRef.current = updated; setWorkEvents(updated); } }
    historyRef.current = { past: [...history.past, { marks: marksRef.current, rotation, file: fileRef.current }], future: history.future.slice(1) };
    marksRef.current = next.marks; setMarks(next.marks); setRotation(next.rotation); setEditing((old) => old ? next.marks.find((mark) => mark.id === old.id) ?? null : null);
    if (next.file !== fileRef.current) {
      const drawingId = user && localStorage.getItem(`epcx-current-drawing:${user.uid}`);
      if (user && drawingId) localStorage.removeItem(`epcx-drawing-cloud:${user.uid}:${drawingId}`);
      fileRef.current = next.file; setFile(next.file); setUrl(next.file ? URL.createObjectURL(next.file) : "");
    }
    setHistoryVersion((version) => version + 1); setSaved(false); setToast("Redone"); window.setTimeout(() => setToast(""), 2200);
  }

  function recordViewAction() {
    historyRef.current = { past: [...historyRef.current.past.slice(-49), { marks: marksRef.current, rotation, file: fileRef.current }], future: [] };
    setHistoryVersion((version) => version + 1);
  }

  useEffect(() => () => { if (url.startsWith("blob:")) URL.revokeObjectURL(url); }, [url]);

  useEffect(() => {
    if (initialAction !== "drawing" || initialActionHandled.current || !user || user.isAnonymous) return;
    initialActionHandled.current = true;
    inputRef.current?.click();
  }, [initialAction, user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (activeUser) => {
      if (!activeUser) { setUser(null); return; }
      setUser(activeUser);
      if (activeUser.isAnonymous) return;
      if (fileRef.current) return;
      try {
        let localRows: LocalDrawing[] = [];
        try { localRows = await localDrawingList(activeUser.uid); } catch { /* Browser storage unavailable; continue with cloud records. */ }
        const sessions: Record<string, Record<string, unknown>> = Object.fromEntries(localRows.map((row) => [row.id, { ...row.snapshot, id: row.id }]));
        const initialThumbs: Record<string, string> = {};
        for (const row of localRows) {
          const cached = localStorage.getItem(`epcx-drawing-thumb:${activeUser.uid}:${row.id}`);
          if (cached) {
            initialThumbs[row.id] = cached;
          } else if (typeof row.snapshot?.thumbnail === "string" && row.snapshot.thumbnail) {
            initialThumbs[row.id] = row.snapshot.thumbnail;
            localStorage.setItem(`epcx-drawing-thumb:${activeUser.uid}:${row.id}`, row.snapshot.thumbnail);
          } else if (row.file) {
            const rowFile = row.file;
            const rowId = row.id;
            void (isPdf(rowFile) ? generatePdfThumbnailFromFile(rowFile) : generateImageThumbnailFromFile(rowFile)).then((thumb) => {
              if (thumb) {
                localStorage.setItem(`epcx-drawing-thumb:${activeUser.uid}:${rowId}`, thumb);
                setDrawingThumbnails((prev) => ({ ...prev, [rowId]: thumb }));
              }
            });
          }
        }
        setDrawingThumbnails((prev) => ({ ...initialThumbs, ...prev }));
        if (navigator.onLine) {
          let remoteDocs: { id: string; data: Record<string, unknown> }[] = [];
          try {
            const remoteDrawings = await getDocs(collection(db, "users", activeUser.uid, "fieldDrawings"));
            remoteDocs = remoteDrawings.docs.map((entry) => ({ id: entry.id, data: entry.data() as Record<string, unknown> }));
          } catch { /* Keep the local recovery copy available if cloud lookup is unavailable. */ }
          // 1. Merge cloud metadata (thumbnail, downloadURL, storagePath) first so every history card can resolve an image.
          for (const { id, data: remote } of remoteDocs) {
            const local = sessions[id];
            const remoteIsNewer = !local || String(remote.updatedAt ?? "") > String(local.updatedAt ?? "");
            const merged = remoteIsNewer ? { ...local, ...remote } : { ...remote, ...local };
            const remoteThumb = typeof remote.thumbnail === "string" && remote.thumbnail ? remote.thumbnail : undefined;
            const localThumb = typeof local?.thumbnail === "string" && local.thumbnail ? local.thumbnail : undefined;
            const resolvedThumb = remoteThumb || localThumb;
            if (resolvedThumb) {
              initialThumbs[id] = resolvedThumb;
              try { localStorage.setItem(`epcx-drawing-thumb:${activeUser.uid}:${id}`, resolvedThumb); } catch { /* noop */ }
            }
            sessions[id] = {
              ...merged,
              id,
              thumbnail: resolvedThumb,
              downloadURL: (typeof remote.downloadURL === "string" && remote.downloadURL) || (typeof local?.downloadURL === "string" && local.downloadURL) || undefined,
              storagePath: (typeof remote.storagePath === "string" && remote.storagePath) || (typeof local?.storagePath === "string" && local.storagePath) || undefined,
            };
            if (typeof remote.downloadURL === "string" && remote.downloadURL) {
              try { localStorage.setItem(`epcx-drawing-cloud:${activeUser.uid}:${id}`, remote.downloadURL); } catch { /* noop */ }
            }
          }
          setDrawingThumbnails((prev) => ({ ...initialThumbs, ...prev }));
          setDrawingSessions({ ...sessions });
          // 2. Merge work events per drawing; one failing lookup must not drop the remaining drawings.
          await Promise.all(remoteDocs.map(async ({ id }) => {
            try {
              const remoteEvents = await getDocs(collection(db, "users", activeUser.uid, "fieldDrawings", id, "workEvents"));
              const mergedEvents = new Map<string, WorkEvent>();
              for (const eventDoc of remoteEvents.docs) mergedEvents.set(eventDoc.id, eventDoc.data() as WorkEvent);
              const existingEvents = Array.isArray(sessions[id]?.workEvents) ? sessions[id].workEvents as WorkEvent[] : [];
              for (const event of existingEvents) if (!mergedEvents.has(event.id)) mergedEvents.set(event.id, event);
              sessions[id] = { ...sessions[id], workEvents: [...mergedEvents.values()] };
            } catch { /* Keep embedded/local work events for this drawing. */ }
          }));
        }
        setDrawingSessions({ ...sessions });
        const requestedId = localStorage.getItem(`epcx-current-drawing:${activeUser.uid}`);
        const snapshot = (requestedId && sessions[requestedId]) || Object.values(sessions).sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")))[0];
        if (!snapshot || typeof snapshot.id !== "string") return;
        const local = localRows.find((row) => row.id === snapshot.id);
        let drawingFile = local?.file;
        if (!drawingFile && navigator.onLine && typeof snapshot.storagePath === "string") {
          try { drawingFile = await downloadDocument(snapshot.storagePath); await localDrawingStore(`${activeUser.uid}:${String(snapshot.id)}`, { file: drawingFile, snapshot }); } catch { /* Local metadata remains visible and can be retried when online. */ }
        }
        setDrawingName(String(snapshot.name ?? snapshot.fileName ?? "Drawing").replace(/\.[^.]+$/, ""));
        setRevision(String(snapshot.revision ?? "")); setArea(String(snapshot.area ?? ""));
        const restoredEvents = Array.isArray(snapshot.workEvents) ? snapshot.workEvents as WorkEvent[] : [];
        workEventsRef.current = restoredEvents; setWorkEvents(restoredEvents);
        if (!drawingFile) { localStorage.setItem(`epcx-current-drawing:${activeUser.uid}`, snapshot.id); setCurrentDrawingId(snapshot.id); return; }
        fileRef.current = drawingFile; setFile(drawingFile); setUrl(URL.createObjectURL(drawingFile));
        const restoredMarks = Array.isArray(snapshot.marks) ? snapshot.marks as Mark[] : [];
        marksRef.current = restoredMarks; setMarks(restoredMarks); setPage(Number(snapshot.page ?? 1)); setZoom(Number(snapshot.zoom ?? 1)); setRotation(Number(snapshot.rotation ?? 0));
        historyRef.current = { past: [], future: [] };
        localStorage.setItem(`epcx-current-drawing:${activeUser.uid}`, snapshot.id);
        setCurrentDrawingId(snapshot.id);
        if (snapshot.downloadURL) localStorage.setItem(`epcx-drawing-cloud:${activeUser.uid}:${snapshot.id}`, String(snapshot.downloadURL));
        setSaved(snapshot.storagePending !== true);
        setSyncState(navigator.onLine ? (snapshot.storagePending === true ? "pending" : "synced") : "offline");
      } catch { setSyncState("pending"); }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user || user.isAnonymous) return;
    const list = Object.values(drawingSessions);
    for (const snap of list) {
      const snapId = String(snap.id ?? "");
      if (snapId && !resolveDrawingThumbnail(snap, drawingThumbnails, user.uid, currentDrawingId, url, failedThumbs)) {
        requestThumbnailGeneration(snapId, snap);
      }
    }
  }, [drawingSessions, drawingThumbnails, user, currentDrawingId, url, failedThumbs, requestThumbnailGeneration]);

  function handleThumbnailError(drawingId: string, src: string) {
    setFailedThumbs((prev) => { if (prev.has(src)) return prev; const next = new Set(prev); next.add(src); return next; });
    if (!user) return;
    try {
      for (const key of [`epcx-drawing-thumb:${user.uid}:${drawingId}`, `epcx-drawing-cloud:${user.uid}:${drawingId}`]) {
        if (localStorage.getItem(key) === src) localStorage.removeItem(key);
      }
    } catch { /* noop */ }
  }

  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || !["z", "y"].includes(event.key.toLowerCase())) return;
      const target = event.target as HTMLElement;
      if (target.matches("input,textarea,select,[contenteditable=true]")) return;
      event.preventDefault();
      if (event.key.toLowerCase() === "y" || event.shiftKey) redo(); else undo();
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  });

  useEffect(() => {
    function online() {
      setSyncState("saving"); setMarks([...marksRef.current]);
      const activeUser = auth.currentUser;
      if (activeUser && !activeUser.isAnonymous) void retryPendingDrawings(activeUser.uid);
    }
    function offline() { setSyncState("offline"); }
    window.addEventListener("online", online); window.addEventListener("offline", offline);
    return () => { window.removeEventListener("online", online); window.removeEventListener("offline", offline); };
  }, []);

  useEffect(() => {
    if (!file || !pendingFocusWorkItem) return;
    const timer = window.setTimeout(() => {
      const item = marksRef.current.find((mark) => mark.id === pendingFocusWorkItem && mark.kind === "mark");
      if (item) {
        setSelectedId(item.id); setEditing(item);
        const stage = stageRef.current;
        const sheet = sheetRef.current;
        if (stage && sheet) {
          const stageRect = stage.getBoundingClientRect();
          const sheetRect = sheet.getBoundingClientRect();
          const visual = rotation === 90 ? { x: 1 - item.y, y: item.x } : rotation === 180 ? { x: 1 - item.x, y: 1 - item.y } : rotation === 270 ? { x: item.y, y: 1 - item.x } : { x: item.x, y: item.y };
          const pointX = sheetRect.left + visual.x * sheetRect.width;
          const pointY = sheetRect.top + visual.y * sheetRect.height;
          setPanOffset((current) => ({ x: current.x + stageRect.left + stage.clientWidth / 2 - pointX, y: current.y + stageRect.top + stage.clientHeight / 2 - pointY }));
        }
      }
      setPendingFocusWorkItem("");
    }, 50);
    return () => window.clearTimeout(timer);
  }, [file, pendingFocusWorkItem, rotation]);

  useEffect(() => {
    if (!file || !user || user.isAnonymous) return;
    const timer = window.setTimeout(async () => {
      setSyncState(navigator.onLine ? "saving" : "offline");
      const savedAt = new Date().toISOString();
      const drawingId = localStorage.getItem(`epcx-current-drawing:${user.uid}`) ?? crypto.randomUUID();
      localStorage.setItem(`epcx-current-drawing:${user.uid}`, drawingId);
      const createdKey = `epcx-drawing-created:${user.uid}:${drawingId}`;
      const createdAt = localStorage.getItem(createdKey) ?? savedAt;
      localStorage.setItem(createdKey, createdAt);
      let stage = "verify file type";
      let contentType: DrawingContentType | undefined;
      try {
        const detectedType = await detectDrawingContentType(file);
        if (!detectedType) throw Object.assign(new Error("Unsupported or mismatched file content."), { code: "field-progress/unsupported-file" });
        contentType = detectedType;
        let cachedThumb = localStorage.getItem(`epcx-drawing-thumb:${user.uid}:${drawingId}`) || drawingThumbnails[drawingId] || undefined;
        if (!cachedThumb && file) {
          try {
            const generated = isPdf(file)
              ? await generatePdfThumbnailFromFile(file)
              : await generateImageThumbnailFromFile(file);
            if (generated) {
              cachedThumb = generated;
              try { localStorage.setItem(`epcx-drawing-thumb:${user.uid}:${drawingId}`, generated); } catch { /* noop */ }
              setDrawingThumbnails((prev) => ({ ...prev, [drawingId]: generated }));
            }
          } catch { /* thumbnail generation fallback */ }
        }
        const snapshot = {
          id: drawingId,
          ownerUid: user.uid,
          name: drawingName.trim() || file.name.replace(/\.[^.]+$/, ""),
          revision: revision.trim(),
          area: area.trim(),
          fileName: file.name,
          contentType,
          mimeType: contentType,
          drawingType: contentType === "application/pdf" ? "pdf" : "image",
          storagePath: drawingStoragePath(user.uid, drawingId),
          projectId: project?.id || null,
          projectName: project?.name || "",
          page,
          pageCount: contentType === "application/pdf" ? pages : 1,
          zoom,
          rotation,
          marks,
          workItems: marks.filter((mark) => mark.kind === "mark").map((mark) => ({
            ...mark,
            ownerUid: user.uid,
            drawingId,
            pageIndex: mark.page,
            annotationId: mark.id,
            createdAt: mark.createdAt ?? savedAt,
            updatedAt: mark.updatedAt ?? savedAt,
          })),
          workEvents,
          thumbnail: cachedThumb,
          createdAt,
          updatedAt: savedAt,
          storagePending: true,
        };
        stage = "local recovery";
        await localDrawingStore(`${user.uid}:${drawingId}`, { file, snapshot });
        localStorage.setItem(`epcx-drawing-session:${user.uid}`, JSON.stringify(snapshot));
        if (!navigator.onLine) { setSyncState("offline"); return; }
        const cloudKey = `epcx-drawing-cloud:${user.uid}:${drawingId}`;
        let downloadURL = localStorage.getItem(cloudKey) || (typeof drawingSessions[drawingId]?.downloadURL === "string" ? String(drawingSessions[drawingId]?.downloadURL) : "");
        if (!downloadURL) {
          setSyncState("uploading");
          stage = "Storage upload";
          downloadURL = await ensureCloudDrawing(file, user.uid, drawingId);
        }
        const latestThumb = localStorage.getItem(`epcx-drawing-thumb:${user.uid}:${drawingId}`) || drawingThumbnails[drawingId] || cachedThumb || undefined;
        const storedPending = { ...snapshot, downloadURL, thumbnail: latestThumb, storagePending: true };
        localStorage.setItem(`epcx-drawing-session:${user.uid}`, JSON.stringify(storedPending));
        await localDrawingStore(`${user.uid}:${drawingId}`, { file, snapshot: storedPending });
        const synced = { ...storedPending, thumbnail: latestThumb, storagePending: false };
        stage = "Firestore metadata";
        await appendCloudWorkEvents(user.uid, drawingId, workEvents);
        await setDoc(doc(db, "users", user.uid, "fieldDrawings", drawingId), sanitizeForFirestore(synced), { merge: true });
        stage = "local recovery";
        localStorage.setItem(`epcx-drawing-session:${user.uid}`, JSON.stringify(synced));
        await localDrawingStore(`${user.uid}:${drawingId}`, { file, snapshot: synced });
        setDrawingSessions((current) => ({ ...current, [drawingId]: synced }));
        setSaved(true);
        setSyncState("synced");
      } catch (reason) {
        logPersistenceFailure(stage, user.uid, file, drawingId, reason, contentType);
        setSyncState("failed");
        setToast(persistenceErrorMessage(reason, stage));
        window.setTimeout(() => setToast(""), 4200);
      }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [file, user, marks, workEvents, drawingName, revision, area, page, pages, zoom, rotation]);

  useEffect(() => {
    if (!file || !isPdf(file)) {
      const resetTimer = window.setTimeout(() => { setPdfPage(null); setPages(1); setPage(1); }, 0);
      return () => window.clearTimeout(resetTimer);
    }
    let cancelled = false;
    let task: import("pdfjs-dist").PDFDocumentLoadingTask | undefined;
    void import("pdfjs-dist").then(async (pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      task = pdfjs.getDocument({ data: await file.arrayBuffer() });
      const pdf = await task.promise;
      if (cancelled) return;
      setPages(pdf.numPages);
      const pageDoc = await pdf.getPage(page);
      const base = pageDoc.getViewport({ scale: 1 });
      const hostW = Math.max(400, (stageRef.current?.clientWidth ?? 1200) - 48);
      const hostH = Math.max(300, (stageRef.current?.clientHeight ?? 750) - 48);
      const scale = Math.min(hostW / base.width, hostH / base.height);
      const viewport = pageDoc.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width * (window.devicePixelRatio || 1));
      canvas.height = Math.ceil(viewport.height * (window.devicePixelRatio || 1));
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
      await pageDoc.render({ canvas, canvasContext: context, viewport }).promise;
      if (!cancelled) {
        setPdfPage({ width: viewport.width, height: viewport.height, data: context.getImageData(0, 0, canvas.width, canvas.height) });
        if (page === 1) {
          try {
            const thumbW = 320;
            const thumbH = Math.max(160, Math.round((thumbW * viewport.height) / Math.max(1, viewport.width)));
            const thumbCanvas = document.createElement("canvas");
            thumbCanvas.width = thumbW;
            thumbCanvas.height = thumbH;
            const thumbCtx = thumbCanvas.getContext("2d");
            if (thumbCtx) {
              thumbCtx.drawImage(canvas, 0, 0, thumbW, thumbH);
              const thumbUrl = thumbCanvas.toDataURL("image/jpeg", 0.72);
              const activeId = localStorage.getItem(`epcx-current-drawing:${user?.uid ?? ""}`) || currentDrawingId;
              if (activeId && user?.uid) {
                try { localStorage.setItem(`epcx-drawing-thumb:${user.uid}:${activeId}`, thumbUrl); } catch { /* noop */ }
                setDrawingThumbnails((prev) => ({ ...prev, [activeId]: thumbUrl }));
                setDrawingSessions((prev) => prev[activeId] ? ({ ...prev, [activeId]: { ...prev[activeId], thumbnail: thumbUrl } }) : prev);
                if (navigator.onLine) {
                  void setDoc(doc(db, "users", user.uid, "fieldDrawings", activeId), { thumbnail: thumbUrl }, { merge: true });
                }
              }
            }
          } catch { /* non-blocking */ }
        }
      }
      await task.destroy();
    }).catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not open this PDF."); });
    return () => { cancelled = true; if (task) void task.destroy(); };
  }, [file, page]);

  async function openFile(next: File | undefined) {
    if (!next) return;
    if (!user || user.isAnonymous) { setError("Sign in or create an account before starting a drawing."); return; }
    const valid = isPdf(next) || ["image/jpeg", "image/png", "image/webp"].includes(next.type) || /\.(jpe?g|png|webp)$/i.test(next.name);
    if (!valid) { setError("Choose a PDF, JPG, JPEG, PNG or WEBP drawing."); return; }
    if (next.size > maxDrawingBytes) { setError("Choose a drawing no larger than 50 MB."); return; }
    setError("");
    try {
      const detectedType = await detectDrawingContentType(next);
      if (!detectedType) { setError("The file contents don’t match a supported PDF, JPG, PNG or WEBP drawing."); return; }
      const baseName = next.name.replace(/\.[^.]+$/, "");
      setPendingFile(next);
      setPendingContentType(detectedType);
      
      const revMatch = baseName.match(/(?:rev|r)[\s._-]?([0-9a-zA-Z]+)/i);
      const detectedRev = revMatch ? `Rev ${revMatch[1].toUpperCase()}` : "";
      const lineMatch = baseName.match(/\b(\d{1,4}-[A-Za-z]{1,4}-\d{1,5})\b/);
      const detectedArea = lineMatch ? lineMatch[1] : "";
      
      setDrawingName(baseName.replace(/[-_]?(?:rev|r)[\s._-]?([0-9a-zA-Z]+)/i, "").trim() || baseName);
      setRevision(detectedRev);
      setArea(detectedArea);
      setDetailsError("");
      
      const existing = Object.values(drawingSessions).find((s) => 
        String(s.name || s.fileName || "").toLowerCase().includes(baseName.toLowerCase().slice(0, 8))
      );
      if (existing && existing.revision && detectedRev && existing.revision !== detectedRev) {
        setRevisionWarning(`Note: An existing revision (${existing.revision}) was found for this drawing.`);
      } else {
        setRevisionWarning("");
      }
      
      setShowDrawingDetails(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not open this drawing."); }
  }

  function beginDrawing(next: File) {
    if (!user || user.isAnonymous) return;
    const drawingId = crypto.randomUUID();
    setCurrentDrawingId(drawingId);
    localStorage.setItem(`epcx-current-drawing:${user.uid}`, drawingId);
    const isPdfFile = isPdf(next);
    void (isPdfFile ? generatePdfThumbnailFromFile(next) : generateImageThumbnailFromFile(next)).then(async (thumb) => {
      if (thumb && user?.uid) {
        try { localStorage.setItem(`epcx-drawing-thumb:${user.uid}:${drawingId}`, thumb); } catch { /* noop */ }
        setDrawingThumbnails((prev) => ({ ...prev, [drawingId]: thumb }));
        setDrawingSessions((prev) => prev[drawingId] ? ({ ...prev, [drawingId]: { ...prev[drawingId], thumbnail: thumb } }) : prev);
        if (navigator.onLine) {
          try {
            await setDoc(doc(db, "users", user.uid, "fieldDrawings", drawingId), { thumbnail: thumb, updatedAt: new Date().toISOString() }, { merge: true });
          } catch { /* offline / retryable */ }
        }
      }
    });
    const createdAt = new Date().toISOString();
    const contentType = pendingContentType ?? ((next.type && drawingTypes.includes(next.type as DrawingContentType) ? next.type : isPdf(next) ? "application/pdf" : "image/jpeg") as DrawingContentType);
    const initialSnapshot = { id: drawingId, ownerUid: user.uid, name: drawingName.trim() || next.name.replace(/\.[^.]+$/, ""), revision: revision.trim(), area: area.trim(), fileName: next.name, contentType, mimeType: contentType, drawingType: contentType === "application/pdf" ? "pdf" : "image", storagePath: drawingStoragePath(user.uid, drawingId), projectId: project?.id || null, projectName: project?.name || "", page: 1, pageCount: 1, zoom: 1, rotation: 0, marks: [], workItems: [], workEvents: [], createdAt, updatedAt: createdAt, storagePending: true };
    setDrawingSessions((current) => ({ ...current, [drawingId]: initialSnapshot }));
    void localDrawingStore(`${user.uid}:${drawingId}`, { file: next, snapshot: initialSnapshot });
    fileRef.current = next; setFile(next); setUrl(URL.createObjectURL(next));
    historyRef.current = { past: [], future: [] };
    marksRef.current = []; setMarks([]); workEventsRef.current = []; setWorkEvents([]);
    setPage(1); setPages(1); setZoom(1); setPanOffset({ x: 0, y: 0 }); setRotation(0); setCropStart(null); setCropRegion(null); setSaved(false); setSelectedId("");
    setHintVisible(!sessionStorage.getItem("epcx-workbench-mark-hint"));
    setSyncState("saving"); setWorkspaceView("drawings"); setWorkListOpen(false); setShowDrawingDetails(false); setPendingFile(null); setPendingContentType(null);
  }

  async function handleContextualCapture(type: "PHOTO" | "DOCUMENT", selectedFile?: File) {
    if (!selectedFile || !user || user.isAnonymous) return;
    const drawingId = currentDrawingId;
    const activeItem = editing || marks.find((m) => m.id === selectedId);
    const itemLabel = activeItem?.label?.trim() || "";
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const date = localDateKey();
    const path = `documents/${user.uid}/field-records/${id}/original`;
    setToast(`Uploading ${type === "PHOTO" ? "photo" : "document"}…`);
    try {
      const downloadURL = await uploadDocument(selectedFile, user.uid, null, () => {}, {
        folder: `field-records/${id}`,
        objectName: "original",
      });
      const record = {
        id,
        ownerUid: user.uid,
        createdBy: user.uid,
        updatedBy: user.uid,
        type,
        title: itemLabel ? `${itemLabel} - ${selectedFile.name.replace(/\.[^.]+$/, "")}` : selectedFile.name.replace(/\.[^.]+$/, ""),
        fileName: selectedFile.name,
        filePath: path,
        downloadURL,
        mimeType: selectedFile.type || "application/octet-stream",
        recordDate: date,
        documentDate: date,
        createdAt: timestamp,
        updatedAt: timestamp,
        projectId: project?.id || null,
        projectName: project?.name || "",
        drawingId: drawingId || null,
        drawingName: drawingName || null,
        workItemId: activeItem?.id || null,
        workItemLabel: itemLabel || null,
        area: area || "",
        tags: [drawingName, itemLabel].filter(Boolean),
      };
      await setDoc(doc(db, "users", user.uid, "fieldDocuments", id), record);
      setToast(`${type === "PHOTO" ? "Photo" : "Document"} attached to ${itemLabel || drawingName || "drawing"}.`);
    } catch {
      setToast("Upload failed. Check your connection.");
    } finally {
      setAddMenuOpen(false);
      window.setTimeout(() => setToast(""), 3500);
    }
  }

  function confirmDrawingDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pendingFile || !drawingName.trim()) { setDetailsError("Enter a drawing name to continue."); return; }
    beginDrawing(pendingFile);
  }

  async function openDrawing(drawingId: string) {
    if (!user || user.isAnonymous) return;
    const snapshot = drawingSessions[drawingId];
    if (!snapshot) return;
    try {
      const localFile = (await localDrawingStore(`${user.uid}:${drawingId}`))?.file ?? (await localDrawingList(user.uid)).find((row) => row.id === drawingId)?.file;
      let source = localFile;
      const storagePath = (typeof snapshot.storagePath === "string" && snapshot.storagePath) || drawingStoragePath(user.uid, drawingId);
      if (!source && navigator.onLine) {
        try {
          source = await downloadDocument(storagePath);
          await localDrawingStore(`${user.uid}:${drawingId}`, { file: source, snapshot });
        } catch { /* offline fallback */ }
      }
      if (!source) { setError("This drawing is not available offline yet. Reconnect and try again."); return; }
      const priorId = localStorage.getItem(`epcx-current-drawing:${user.uid}`);
      if (priorId && fileRef.current) {
        try {
          const timestamp = new Date().toISOString();
          const contentType = await detectDrawingContentType(fileRef.current);
          const priorThumb = localStorage.getItem(`epcx-drawing-thumb:${user.uid}:${priorId}`) || drawingThumbnails[priorId] || undefined;
          const priorSnapshot = { ...(drawingSessions[priorId] ?? {}), id: priorId, ownerUid: user.uid, name: drawingName, revision, area, fileName: fileRef.current.name, contentType, mimeType: contentType, drawingType: contentType === "application/pdf" ? "pdf" : "image", storagePath: drawingStoragePath(user.uid, priorId), projectId: project?.id || null, projectName: project?.name || "", marks, workItems: marks.filter((mark) => mark.kind === "mark").map((mark) => ({ ...mark, ownerUid: user.uid, drawingId: priorId, pageIndex: mark.page })), workEvents, page, pageCount: pages, zoom, rotation, thumbnail: priorThumb, updatedAt: timestamp, storagePending: true };
          await localDrawingStore(`${user.uid}:${priorId}`, { file: fileRef.current, snapshot: priorSnapshot });
          setDrawingSessions((current) => ({ ...current, [priorId]: priorSnapshot }));
          if (navigator.onLine && contentType) {
            try {
              const downloadURL = await ensureCloudDrawing(fileRef.current, user.uid, priorId);
              const synced = { ...priorSnapshot, downloadURL, thumbnail: priorThumb, storagePending: false };
              await appendCloudWorkEvents(user.uid, priorId, workEvents);
              await setDoc(doc(db, "users", user.uid, "fieldDrawings", priorId), sanitizeForFirestore(synced), { merge: true });
              await localDrawingStore(`${user.uid}:${priorId}`, { file: fileRef.current, snapshot: synced });
              setDrawingSessions((current) => ({ ...current, [priorId]: synced }));
            } catch { /* The local drawing remains available and will retry when connectivity returns. */ }
          }
        } catch (priorErr) {
          console.warn("[openDrawing] Could not auto-flush prior drawing", priorErr);
        }
      }
      localStorage.setItem(`epcx-current-drawing:${user.uid}`, drawingId);
      setCurrentDrawingId(drawingId);
      fileRef.current = source; setFile(source); setUrl(URL.createObjectURL(source));
      const restoredMarks = Array.isArray(snapshot.marks) ? snapshot.marks as Mark[] : [];
      const restoredEvents = Array.isArray(snapshot.workEvents) ? snapshot.workEvents as WorkEvent[] : [];
      marksRef.current = restoredMarks; setMarks(restoredMarks); workEventsRef.current = restoredEvents; setWorkEvents(restoredEvents);
      setDrawingName(String(snapshot.name ?? snapshot.fileName ?? "Drawing").replace(/\.[^.]+$/, "")); setRevision(String(snapshot.revision ?? "")); setArea(String(snapshot.area ?? ""));
      setPage(Number(snapshot.page ?? 1)); setPages(Number(snapshot.pageCount ?? 1)); setZoom(Number(snapshot.zoom ?? 1)); setRotation(Number(snapshot.rotation ?? 0));
      setSaved(snapshot.storagePending !== true); setSelectedId(""); setEditing(null); setWorkspaceView("drawings"); setSyncState(navigator.onLine ? (snapshot.storagePending === true ? "pending" : "synced") : "offline");
      historyRef.current = { past: [], future: [] };
    } catch (err) {
      console.error("[openDrawing error]", err);
      setError("This drawing could not be opened. Your other work remains available.");
    }
  }

  async function openSampleDrawing() {
    if (!user || user.isAnonymous) { setError("Sign in or create an account before starting a drawing."); return; }
    try {
      const response = await fetch("/images/drawing.jpg");
      if (!response.ok) throw new Error("Sample drawing could not be loaded.");
      const sample = new File([await response.blob()], "sample-piping-drawing.jpg", { type: "image/jpeg" });
      setDrawingName("Sample piping drawing"); setRevision(""); setArea(""); setPendingContentType("image/jpeg");
      beginDrawing(sample);
      setHintVisible(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Sample drawing could not be loaded."); }
  }

  function point(event: ReactPointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const visualX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const visualY = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    if (rotation === 90) return { x: visualY, y: 1 - visualX };
    if (rotation === 180) return { x: 1 - visualX, y: 1 - visualY };
    if (rotation === 270) return { x: 1 - visualY, y: visualX };
    return { x: visualX, y: visualY };
  }

  function handleDrawingWheel(event: WheelEvent) {
    if (!file || !sheetRef.current) return;
    event.preventDefault();
    const normalizedDelta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stageRef.current?.clientHeight ?? 800 : 1);
    const currentZoom = zoomRef.current;
    const currentPan = panOffsetRef.current;
    const nextZoom = Math.max(.5, Math.min(2.5, currentZoom * Math.exp(-normalizedDelta * .0015)));
    const stageRect = stageRef.current?.getBoundingClientRect();
    if (stageRect && currentZoom > 0) {
      const cursorX = event.clientX - (stageRect.left + stageRect.width / 2);
      const cursorY = event.clientY - (stageRect.top + stageRect.height / 2);
      const ratio = nextZoom / currentZoom;
      setPanOffset({ x: cursorX - (cursorX - currentPan.x) * ratio, y: cursorY - (cursorY - currentPan.y) * ratio });
    }
    setZoom(nextZoom);
  }

  function fitDrawing() {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    stageRef.current?.scrollTo({ left: 0, top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !file) return;
    stage.addEventListener("wheel", handleDrawingWheel, { passive: false });
    return () => stage.removeEventListener("wheel", handleDrawingWheel);
  }, [file]);

  function stagePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!file || (isPdf(file) && !pdfPage)) return;
    if (tool === "select") {
      const stage = stageRef.current;
      if (stage) {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        if (event.pointerType === "touch") {
          touchPoints.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
          if (touchPoints.current.size === 2) {
            const [a, b] = [...touchPoints.current.values()];
            pinchStart.current = { distance: Math.max(1, Math.hypot(b.x-a.x,b.y-a.y)), zoom: zoomRef.current, pan: panOffsetRef.current };
            setPanState(null);
          }
        }
        setPanState({ pointerId: event.pointerId, x: event.clientX, y: event.clientY, offsetX: panOffset.x, offsetY: panOffset.y });
      }
      return;
    }
    const p = point(event);
    if (tool === "move") {
      const targetId = selectedId;
      if (targetId) commitMarks((old) => old.map((mark) => mark.id === targetId ? { ...mark, ...p, updatedAt: new Date().toISOString(), history: [...(mark.history ?? []), { action: "Moved", at: new Date().toISOString() }] } : mark), "Work item moved");
      setTool("select");
      return;
    }
    if (tool === "crop") {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      setCropStart(p); setCropRegion(null); return;
    }
    if (tool === "highlight" || tool === "draw" || tool === "arrow") {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    setDrawStart(p);
    if (tool === "draw") setDrawingPoints([p]);
    if (tool === "mark") {
      const now = new Date().toISOString();
      const existingMarks = marksRef.current.filter((m) => m.kind === "mark");
      const autoLabel = pendingItemLabel.trim() || `J-${String(existingMarks.length + 1).padStart(2, "0")}`;
      const mark: Mark = { id: crypto.randomUUID(), ...p, page, kind: "mark", status: "In Progress", itemType: "Joint", label: autoLabel, line: pendingLine, createdAt: now, updatedAt: now };
      commitMarks((old) => [...old, { ...mark, history: [{ action: "Created", at: now }] }], "Work item marked"); setSelectedId(mark.id); setEditing({ ...mark, history: [{ action: "Created", at: now }] }); setPendingLine(""); setPendingItemLabel(""); setHintVisible(false); sessionStorage.setItem("epcx-workbench-mark-hint", "1");
    }
    if (tool === "text") { setLocalText(""); setEditing({ id: crypto.randomUUID(), ...p, page, kind: "text", label: "" }); }
  }

  function stagePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (tool === "crop" && cropStart) {
      const end = point(event);
      setCropRegion({ x: Math.min(cropStart.x, end.x), y: Math.min(cropStart.y, end.y), width: Math.abs(end.x - cropStart.x), height: Math.abs(end.y - cropStart.y) });
      setCropStart(null);
      return;
    }
    if (!drawStart || !(tool === "highlight" || tool === "draw" || tool === "arrow")) return;
    const end = point(event);
    const points = tool === "draw" ? [...drawingPoints, end] : [drawStart, end];
    const now = new Date().toISOString();
    const mark: Mark = { id: crypto.randomUUID(), ...drawStart, page, kind: tool, width: end.x - drawStart.x, height: end.y - drawStart.y, points, createdAt: now, updatedAt: now };
    commitMarks((old) => [...old, mark], tool === "highlight" ? "Highlight added" : tool === "arrow" ? "Arrow added" : "Drawing added"); setSelectedId(mark.id); setDrawStart(null); setDrawingPoints([]); setMarkupPreview(null);
    if (tool === "highlight") void extractPdfText(mark);
  }

  function stagePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch" && touchPoints.current.has(event.pointerId)) {
      touchPoints.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const pinch = pinchStart.current;
      if (pinch && touchPoints.current.size >= 2) {
        const [a,b] = [...touchPoints.current.values()];
        const distance = Math.max(1, Math.hypot(b.x-a.x,b.y-a.y));
        const nextZoom = Math.max(.5,Math.min(2.5,pinch.zoom*distance/pinch.distance));
        const stageRect = stageRef.current?.getBoundingClientRect();
        if (stageRect) {
          const cursorX = (a.x+b.x)/2 - (stageRect.left+stageRect.width/2);
          const cursorY = (a.y+b.y)/2 - (stageRect.top+stageRect.height/2);
          const ratio = nextZoom/pinch.zoom;
          setPanOffset({ x:cursorX-(cursorX-pinch.pan.x)*ratio, y:cursorY-(cursorY-pinch.pan.y)*ratio });
        }
        setZoom(nextZoom);
        return;
      }
    }
    if (panState?.pointerId === event.pointerId) {
      event.preventDefault();
      setPanOffset({ x: panState.offsetX + event.clientX - panState.x, y: panState.offsetY + event.clientY - panState.y });
      return;
    }
    const end = point(event);
    if (tool === "crop" && cropStart) {
      setCropRegion({ x: Math.min(cropStart.x, end.x), y: Math.min(cropStart.y, end.y), width: Math.abs(end.x - cropStart.x), height: Math.abs(end.y - cropStart.y) });
      return;
    }
    if (!drawStart || !(tool === "highlight" || tool === "draw" || tool === "arrow")) return;
    if (tool === "draw") setDrawingPoints((old) => old.length && Math.hypot(end.x-old[old.length-1].x,end.y-old[old.length-1].y)<.003 ? old : [...old,end]);
    setMarkupPreview({ id: "preview", ...drawStart, page, kind: tool, width: end.x-drawStart.x, height: end.y-drawStart.y, points: tool === "draw" ? [...drawingPoints,end] : [drawStart,end] });
  }

  async function applyImageCrop() {
    const source = fileRef.current;
    const region = cropRegion;
    if (!source || !region || isPdf(source) || region.width < .02 || region.height < .02) return;
    try {
      const bitmap = await createImageBitmap(source, { imageOrientation: "from-image" });
      const sourceWidth = bitmap.width; const sourceHeight = bitmap.height;
      const x = Math.max(0, Math.floor(region.x * sourceWidth));
      const y = Math.max(0, Math.floor(region.y * sourceHeight));
      const width = Math.min(sourceWidth - x, Math.ceil(region.width * sourceWidth));
      const height = Math.min(sourceHeight - y, Math.ceil(region.height * sourceHeight));
      if (width < 2 || height < 2) { bitmap.close(); throw new Error("Select a larger crop area."); }
      const cropped = document.createElement("canvas");
      cropped.width = width; cropped.height = height;
      const context = cropped.getContext("2d");
      if (!context) { bitmap.close(); throw new Error("Could not create the cropped image."); }
      context.fillStyle = "#fff"; context.fillRect(0, 0, width, height);
      context.drawImage(bitmap, x, y, width, height, 0, 0, width, height);
      bitmap.close();
      const blob = await new Promise<Blob>((resolve, reject) => cropped.toBlob((value) => value ? resolve(value) : reject(new Error("Could not export the cropped image.")), "image/jpeg", .92));
      const extensionless = source.name.replace(/\.[^.]+$/, "");
      const croppedFile = new File([blob], `${extensionless}-crop.jpg`, { type: "image/jpeg", lastModified: Date.now() });
      const left = x / sourceWidth; const top = y / sourceHeight;
      const right = (x + width) / sourceWidth; const bottom = (y + height) / sourceHeight;
      const remap = (value: number, start: number, extent: number) => (value - start) / extent;
      const nextMarks = marksRef.current.flatMap((mark) => {
        const x2 = mark.x + (mark.width ?? 0); const y2 = mark.y + (mark.height ?? 0);
        if (Math.max(mark.x, x2) < left || Math.min(mark.x, x2) > right || Math.max(mark.y, y2) < top || Math.min(mark.y, y2) > bottom) return [];
        const nextX = remap(mark.x, left, right - left); const nextY = remap(mark.y, top, bottom - top);
        return [{ ...mark, x: nextX, y: nextY, width: mark.width === undefined ? undefined : remap(x2, left, right-left) - nextX, height: mark.height === undefined ? undefined : remap(y2, top, bottom-top) - nextY, points: mark.points?.map((p) => ({ x: remap(p.x,left,right-left), y: remap(p.y,top,bottom-top) })) }];
      });
      commitMarks(nextMarks, "Crop applied");
      if (user) localStorage.removeItem(`epcx-drawing-cloud:${user.uid}:${localStorage.getItem(`epcx-current-drawing:${user.uid}`)}`);
      fileRef.current = croppedFile; setFile(croppedFile); setUrl(URL.createObjectURL(croppedFile)); setZoom(1); setPanOffset({ x: 0, y: 0 }); setCropRegion(null); setTool("mark"); setSaved(false); setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not crop this image."); }
  }

  async function extractPdfText(markup: Mark) {
    const source = fileRef.current;
    if (!source) return;
    setLocalText("Checking for selectable PDF text…");
    try {
      const result = await extractText({ x: markup.x, y: markup.y, width: markup.width ?? 0, height: markup.height ?? 0 }, source, markup.page);
      if (!result) {
        setExtraction(null); setDetectedText("");
        setLocalText(isPdf(source) ? "No selectable text was found. Your highlight is saved as drawing markup." : "Text recognition isn’t available for this drawing yet. Your highlight is saved as drawing markup.");
        return;
      }
      setExtraction(result); setDetectedText(result.text); setLocalText("text-detected");
      commitMarks((old) => old.map((item) => item.id === markup.id ? { ...item, extractedText: result } : item));
    } catch {
      setExtraction(null); setDetectedText("");
      setLocalText("Text recognition isn’t available for this drawing yet. Your highlight is saved as drawing markup.");
    }
  }

  async function persist() {
    const source = fileRef.current;
    if (!source || !user) return;
    setSaving(true); setError("");
    let stage = "verify file type";
    let drawingId = localStorage.getItem(`epcx-current-drawing:${user.uid}`) ?? "unknown";
    let contentType: DrawingContentType | undefined;
    try {
      const owner = user;
      drawingId = localStorage.getItem(`epcx-current-drawing:${owner.uid}`) ?? crypto.randomUUID();
      localStorage.setItem(`epcx-current-drawing:${owner.uid}`, drawingId);
      const savedAt = new Date().toISOString();
      const createdKey = `epcx-drawing-created:${owner.uid}:${drawingId}`;
      const createdAt = localStorage.getItem(createdKey) ?? savedAt;
      localStorage.setItem(createdKey, createdAt);
      const detectedType = await detectDrawingContentType(source);
      if (!detectedType) throw Object.assign(new Error("Unsupported or mismatched file content."), { code: "field-progress/unsupported-file" });
      contentType = detectedType;
      let cachedThumb = localStorage.getItem(`epcx-drawing-thumb:${owner.uid}:${drawingId}`) || drawingThumbnails[drawingId] || undefined;
      if (!cachedThumb && source) {
        try {
          const generated = isPdf(source)
            ? await generatePdfThumbnailFromFile(source)
            : await generateImageThumbnailFromFile(source);
          if (generated) {
            cachedThumb = generated;
            try { localStorage.setItem(`epcx-drawing-thumb:${owner.uid}:${drawingId}`, generated); } catch { /* noop */ }
            setDrawingThumbnails((prev) => ({ ...prev, [drawingId]: generated }));
          }
        } catch { /* thumbnail generation fallback */ }
      }
      const workItems = marks.filter((mark) => mark.kind === "mark").map((mark) => ({ ...mark, ownerUid: owner.uid, drawingId, annotationId: mark.id, createdAt: mark.createdAt ?? savedAt, updatedAt: mark.updatedAt ?? savedAt }));
      const snapshot = { id: drawingId, ownerUid: owner.uid, name: drawingName.trim() || source.name.replace(/\.[^.]+$/, ""), revision: revision.trim(), area: area.trim(), fileName: source.name, contentType, mimeType: contentType, drawingType: contentType === "application/pdf" ? "pdf" : "image", storagePath: drawingStoragePath(owner.uid, drawingId), projectId: project?.id || null, projectName: project?.name || "", page, pageCount: contentType === "application/pdf" ? pages : 1, zoom, rotation, marks, workItems: workItems.map((item) => ({ ...item, pageIndex: item.page })), workEvents, thumbnail: cachedThumb, createdAt, updatedAt: savedAt, relatedRecords: [] as string[] };
      stage = "local recovery";
      const pendingSnapshot = { ...snapshot, storagePending: true };
      localStorage.setItem(`epcx-drawing-session:${owner.uid}`, JSON.stringify(pendingSnapshot));
      await localDrawingStore(`${owner.uid}:${drawingId}`, { file: source, snapshot: pendingSnapshot });
      if (!navigator.onLine) { setSyncState("offline"); return; }
      stage = "Storage upload";
      const downloadURL = await ensureCloudDrawing(source, owner.uid, drawingId);
      const latestThumb = localStorage.getItem(`epcx-drawing-thumb:${owner.uid}:${drawingId}`) || drawingThumbnails[drawingId] || cachedThumb || undefined;
      const savedSnapshot = { ...snapshot, downloadURL, thumbnail: latestThumb, storagePending: false };
      stage = "Firestore metadata";
      await appendCloudWorkEvents(owner.uid, drawingId, workEvents);
      await setDoc(doc(db, "users", owner.uid, "fieldDrawings", drawingId), sanitizeForFirestore(savedSnapshot), { merge: true });
      stage = "local recovery";
      localStorage.setItem(`epcx-drawing-session:${owner.uid}`, JSON.stringify(savedSnapshot));
      await localDrawingStore(`${owner.uid}:${drawingId}`, { file: source, snapshot: savedSnapshot });
      setDrawingSessions((current) => ({ ...current, [drawingId]: savedSnapshot }));
      setSaved(true); setSyncState("synced");
    } catch (reason) {
      logPersistenceFailure(stage, user.uid, source, drawingId, reason, contentType);
      setSyncState("failed");
      setError(persistenceErrorMessage(reason, stage));
    } finally { setSaving(false); }
  }

  function saveCurrent() {
    if (!user || !file) return;
    if (user.isAnonymous) { setError("Sign in with an EPCX account to save this drawing to the cloud."); return; }
    void persist();
  }

  function rotateImage() {
    recordViewAction();
    setRotation((value) => (value + 90) % 360);
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    stageRef.current?.scrollTo({ left: 0, top: 0, behavior: "smooth" });
    setSaved(false);
  }

  function rotateCounterClockwise() {
    recordViewAction();
    setRotation((value) => (value + 270) % 360);
    setZoom(1); setPanOffset({ x: 0, y: 0 });
    stageRef.current?.scrollTo({ left: 0, top: 0, behavior: "smooth" });
    setSaved(false);
  }

  function endPointer(event: ReactPointerEvent<HTMLDivElement>) {
    if (touchPoints.current.has(event.pointerId)) {
      touchPoints.current.delete(event.pointerId);
      if (touchPoints.current.size < 2) pinchStart.current = null;
    }
    if (panState?.pointerId === event.pointerId) setPanState(null);
    else stagePointerUp(event);
  }

  function resetRotation() {
    if (rotation !== 0) recordViewAction();
    setRotation(0); setZoom(1); setPanOffset({ x: 0, y: 0 }); setSaved(false);
    stageRef.current?.scrollTo({ left: 0, top: 0, behavior: "smooth" });
  }

  function patchEditing(patch: Partial<Mark>) {
    const updated = { ...patch, updatedAt: new Date().toISOString() };
    if (editing) {
      const changedStatus = patch.status !== undefined && patch.status !== editing.status;
      const action = changedStatus ? `Marked ${patch.status}` : "Edited details";
      const next = { ...editing, ...updated, history: changedStatus ? [...(editing.history ?? []), { action, at: updated.updatedAt! }] : editing.history };
      setEditing(next);
      if (changedStatus) commitMarks((old) => old.map((entry) => entry.id === editing.id ? next : entry), `Marked ${patch.status}`);
    }
  }

  function saveMark() {
    if (!editing) return;
    if (editing.kind === "text" && !editing.label?.trim()) patchEditing({ label: localText });
    const now = new Date().toISOString();
    const prior = marksRef.current.find((entry) => entry.id === editing.id);
    const detailsChanged = prior && (prior.label !== editing.label || prior.line !== editing.line || prior.itemType !== editing.itemType);
    const activity = editing.history ?? (prior ? [] : [{ action: "Created", at: now }]);
    const result = { ...editing, ...(editing.kind === "text" ? { label: editing.label || localText } : {}), createdAt: editing.createdAt ?? now, updatedAt: now, history: detailsChanged ? [...activity, { action: "Edited details", at: now }] : activity };
    commitMarks((old) => old.some((entry) => entry.id === result.id) ? old.map((entry) => entry.id === result.id ? result : entry) : [...old, { ...result, history: [{ action: "Created", at: now }] }], result.kind === "text" ? "Note added" : "Work item saved");
    setSelectedId(result.id); setEditing(null); setLocalText(""); setSaved(false);
  }

  const toolButtons: { id: Tool; label: string; icon: typeof Circle }[] = [
    { id: "mark", label: "Mark Work", icon: Circle }, { id: "select", label: "Select / Pan", icon: MousePointer2 },
  ];
  const workItemMarks = marks.filter((mark) => mark.kind === "mark");
  const listedMarks = workItemMarks.filter((mark) => workFilter === "All" || mark.status === workFilter);
  const completedCount = workItemMarks.filter((mark) => mark.status === "Complete").length;
  const inProgressCount = workItemMarks.length - completedCount;
  const eventIndex = new Map<string, WorkEvent>();
  for (const snapshot of Object.values(drawingSessions)) for (const event of Array.isArray(snapshot.workEvents) ? snapshot.workEvents as WorkEvent[] : []) eventIndex.set(event.id, event);
  for (const event of workEvents) eventIndex.set(event.id, event);
  const todayByWorkItem = new Map<string, WorkEvent>();
  for (const event of eventIndex.values()) {
    if (event.localDate !== localDateKey()) continue;
    const key = `${event.drawingId}:${event.workItemId}`;
    const previous = todayByWorkItem.get(key);
    if (!previous || event.timestamp > previous.timestamp) todayByWorkItem.set(key, event);
  }
  const todayItems = [...todayByWorkItem.values()].filter((event) => event.action !== "deleted").sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const completedToday = todayItems.filter((event) => event.status === "Complete").length;
  const inProgressToday = todayItems.filter((event) => event.status === "In Progress").length;
  const drawingRows = Object.values(drawingSessions).sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")));
  const todayRows = todayItems.map((event) => {
    const snapshot = drawingSessions[event.drawingId];
    const eventMarks = event.drawingId === currentDrawingId ? marks : Array.isArray(snapshot?.marks) ? snapshot.marks as Mark[] : [];
    const item = eventMarks.find((mark) => mark.id === event.workItemId);
    return { event, item, drawingName: event.drawingId === currentDrawingId ? drawingName : String(snapshot?.name ?? snapshot?.fileName ?? "Drawing"), revision: event.drawingId === currentDrawingId ? revision : String(snapshot?.revision ?? "") };
  });
  const todayGroups = new Map<string, typeof todayRows>();
  for (const row of todayRows) todayGroups.set(row.event.drawingId, [...(todayGroups.get(row.event.drawingId) ?? []), row]);
  const authRedirect = initialAction === "drawing" ? "/start?view=drawings&add=drawing" : "/start";
  function contextualStyle(mark: Mark): CSSProperties {
    const stage = stageRef.current;
    const sheet = sheetRef.current;
    if (!stage || !sheet) return {};
    const stageRect = stage.getBoundingClientRect();
    const sheetRect = sheet.getBoundingClientRect();
    const areaRect = stage.closest(".drawing-workspace-area")?.getBoundingClientRect();
    const offsetX = areaRect ? stageRect.left - areaRect.left : 0;
    const offsetY = areaRect ? stageRect.top - areaRect.top : 0;
    const visual = rotation === 90 ? { x: 1-mark.y, y: mark.x } : rotation === 180 ? { x: 1-mark.x, y: 1-mark.y } : rotation === 270 ? { x: mark.y, y: 1-mark.x } : { x: mark.x, y: mark.y };
    const width = Math.min(280, stage.clientWidth - 24);
    const left = offsetX + Math.max(8, Math.min(stage.clientWidth-width-8, sheetRect.left-stageRect.left+visual.x*sheetRect.width-width/2));
    const top = offsetY + Math.max(8, Math.min(stage.clientHeight-300, sheetRect.top-stageRect.top+visual.y*sheetRect.height-150));
    return { left, top, right: "auto" };
  }

  const isCurrentDrawingToday = Boolean(currentDrawingId && (
    todayItems.some((e) => e.drawingId === currentDrawingId) ||
    (drawingSessions[currentDrawingId]?.updatedAt && String(drawingSessions[currentDrawingId]?.updatedAt).slice(0, 10) === localDateKey())
  ));

  return <main className="drawing-first">
    <aside className="drawing-workspace-rail">
      <button className="drawing-add-button" onClick={() => inputRef.current?.click()} disabled={!user || user.isAnonymous}><Plus size={16}/> Add Drawing</button>
      <input ref={inputRef} className="sr-only" type="file" accept={accepted} onChange={(event) => void openFile(event.target.files?.[0])}/>
      <input ref={photoCaptureRef} className="sr-only" type="file" accept="image/*" onChange={(event) => void handleContextualCapture("PHOTO", event.target.files?.[0])}/>
      <input ref={docCaptureRef} className="sr-only" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,image/*" onChange={(event) => void handleContextualCapture("DOCUMENT", event.target.files?.[0])}/>

      <div className="drawing-rail-tabs">
        <button
          className={`drawing-nav-item ${workspaceView === "today" && drawingTab === "today" ? "active" : ""}`}
          onClick={() => { setWorkspaceView("today"); setDrawingTab("today"); }}
        >
          <span className="drawing-nav-dot"/>Today<span className="drawing-nav-count">{todayItems.length || ""}</span>
        </button>
        <button
          className={`drawing-nav-item ${workspaceView === "today" && drawingTab === "history" ? "active" : ""}`}
          onClick={() => { setWorkspaceView("today"); setDrawingTab("history"); }}
        >
          <span className="drawing-nav-dot"/>History<span className="drawing-nav-count">{drawingRows.length || ""}</span>
        </button>
      </div>

      <p className="drawing-rail-heading">ALL DRAWINGS</p>
      <div className="drawing-rail-list">{drawingRows.map((snapshot) => {
        const id = String(snapshot.id ?? "");
        if (!id) return null;
        const active = id === currentDrawingId;
        const thumb = resolveDrawingThumbnail(snapshot, drawingThumbnails, user?.uid, currentDrawingId, url, failedThumbs);
        return <button key={id} className={`drawing-library-item ${active ? "active" : ""}`} onClick={() => { setWorkspaceView("drawings"); void openDrawing(id); }}>
          <span className="drawing-library-thumb">
            {thumb ? (
              <img src={thumb} alt="" onError={() => handleThumbnailError(id, thumb)} />
            ) : (
              <small>{String(snapshot.mimeType ?? snapshot.contentType ?? "").includes("pdf") ? "PDF" : "DWG"}</small>
            )}
          </span>
          <span><b>{String(snapshot.name ?? snapshot.fileName ?? "Drawing").replace(/\.[^.]+$/, "")}</b><small>{snapshot.revision ? `Rev ${String(snapshot.revision)}` : "Drawing"}</small></span>
        </button>;
      })}{drawingRows.length === 0 && <p className="drawing-rail-empty">Your drawings will appear here.</p>}</div>
      <div className="drawing-rail-account">{user?.displayName || user?.email || "Signed in"}</div>
    </aside>
    <div className="drawing-workspace-area">
    {workspaceView === "today" ? (
      <section className="drawing-today-view">
        <header>
          <p className="drawing-eyebrow">FIELD WORKBENCH / DRAWING LIBRARY</p>
          <div className="flex items-center justify-between gap-4">
            <h1>Drawings</h1>
            <div className="drawing-library-subtabs">
              <button
                className={drawingTab === "today" ? "active" : ""}
                onClick={() => setDrawingTab("today")}
              >
                Today ({todayGroups.size})
              </button>
              <button
                className={drawingTab === "history" ? "active" : ""}
                onClick={() => setDrawingTab("history")}
              >
                Previous / History ({drawingRows.length})
              </button>
            </div>
          </div>
          <p>
            {drawingTab === "today"
              ? `${todayItems.length} work items updated today across your active drawings.`
              : "Revisit previous drawings, revisions, and historical site markups."}
          </p>
        </header>

        {drawingTab === "today" ? (
          <>
            <div className="drawing-today-summary">
              <article><b>{todayItems.length}</b><span>Work items updated</span></article>
              <article><b>{completedToday}</b><span>Complete</span></article>
              <article><b>{inProgressToday}</b><span>In Progress</span></article>
            </div>
            {todayGroups.size ? (
              <div className="drawing-today-groups">
                {[...todayGroups.entries()].map(([drawingId, rows]) => (
                  <section key={drawingId}>
                    <header>
                      <div>
                        <h2>{rows[0].drawingName}</h2>
                        <p>{rows[0].revision ? `Rev ${rows[0].revision} · ` : ""}{rows.length} updated today</p>
                      </div>
                      <button onClick={() => { setWorkspaceView("drawings"); void openDrawing(drawingId); }}>
                        Open drawing <ArrowRight size={14}/>
                      </button>
                    </header>
                    <div>
                      {rows.map(({ event, item }) => (
                        <button
                          key={event.id}
                          className="drawing-today-row"
                          onClick={() => {
                            setWorkspaceView("drawings");
                            if (event.drawingId === currentDrawingId) setPendingFocusWorkItem(event.workItemId);
                            else void openDrawing(event.drawingId).then(() => setPendingFocusWorkItem(event.workItemId));
                          }}
                        >
                          <span className={`drawing-today-status ${event.status === "Complete" ? "complete" : "progress"}`}>
                            {event.status === "Complete" ? <Check size={12}/> : "•"}
                          </span>
                          <span>
                            <b>{item?.label?.trim() || "Unnamed"}</b>
                            <small>{item?.itemType ?? "Other"}{item?.line ? ` · ${item.line}` : ""}</small>
                          </span>
                          <em>{event.status ?? "In Progress"}</em>
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="drawing-today-empty">
                <p>No drawing markups recorded today yet.</p>
                <button onClick={() => setDrawingTab("history")}>Browse previous drawings</button>
              </div>
            )}
          </>
        ) : (
          /* Historical Drawings Grid with rich thumbnails and metadata */
          <div className="drawing-history-grid">
            {drawingRows.map((snapshot) => {
              const id = String(snapshot.id ?? "");
              if (!id) return null;
              const thumb = resolveDrawingThumbnail(snapshot, drawingThumbnails, user?.uid, currentDrawingId, url, failedThumbs);
              const marksList = Array.isArray(snapshot.marks) ? snapshot.marks as Mark[] : [];
              const workMarks = marksList.filter((m) => m.kind === "mark");
              const compCount = workMarks.filter((m) => m.status === "Complete").length;
              const isToday = String(snapshot.updatedAt ?? "").slice(0, 10) === localDateKey();

              return (
                <article key={id} className="drawing-history-card" onClick={() => { setWorkspaceView("drawings"); void openDrawing(id); }}>
                  <div className="drawing-history-thumb">
                    {thumb ? (
                      <img src={thumb} alt={String(snapshot.name ?? snapshot.fileName ?? "Drawing")} onError={() => handleThumbnailError(id, thumb)} />
                    ) : (
                      <div className="drawing-history-blueprint-card">
                        <div className="drawing-blueprint-grid" />
                        <div className="drawing-blueprint-inner">
                          <div className="drawing-blueprint-badge">
                            <FileText size={11} />
                            <span>{String(snapshot.mimeType ?? snapshot.contentType ?? "").includes("pdf") ? "PDF SHEET" : "ENGINEERING DWG"}</span>
                          </div>
                          <div className="drawing-blueprint-title">
                            {String(snapshot.name ?? snapshot.fileName ?? "Drawing").replace(/\.[^.]+$/, "")}
                          </div>
                          {Boolean(snapshot.revision) && (
                            <span className="drawing-blueprint-rev">REV {String(snapshot.revision)}</span>
                          )}
                        </div>
                      </div>
                    )}
                    {isToday && <span className="drawing-history-badge-today">Active Today</span>}
                  </div>
                  <div className="drawing-history-meta">
                    <b>{String(snapshot.name ?? snapshot.fileName ?? "Drawing").replace(/\.[^.]+$/, "")}</b>
                    <p className="drawing-history-sub">
                      {snapshot.revision ? `Rev ${String(snapshot.revision)} · ` : ""}
                      {snapshot.updatedAt ? new Date(String(snapshot.updatedAt)).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Historical"}
                    </p>
                    <div className="drawing-history-counts">
                      <span><b>{workMarks.length}</b> work items</span>
                      <span><b>{compCount}</b> complete</span>
                    </div>
                  </div>
                </article>
              );
            })}
            {drawingRows.length === 0 && (
              <div className="drawing-today-empty">
                <p>No historical drawings uploaded yet.</p>
                <button onClick={() => inputRef.current?.click()}>Upload first drawing</button>
              </div>
            )}
          </div>
        )}
      </section>
    ) : !file ? <div className="drawing-start-screen">
      <header className="drawing-start-header"><Link href="/" className="drawing-logo">EPCX<span>.cloud</span></Link><span>FIELD WORKBENCH</span></header>
      <section className={`drawing-dropzone ${dragging ? "is-dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void openFile(event.dataTransfer.files[0]); }}>
        <div className="drawing-upload-icon">{user && !user.isAnonymous ? <Upload size={21}/> : <Lock size={21}/>}</div><p className="drawing-eyebrow">FIELD WORKBENCH / {user && !user.isAnonymous ? "NEW SESSION" : "ACCOUNT REQUIRED"}</p><h1>{user && !user.isAnonymous ? "Start with your drawing" : "Sign in to start your drawing"}</h1><p>{user && !user.isAnonymous ? "Upload the PDF or image you are working on. Then mark today's progress directly on it." : "Create an account or sign in first. Your drawing and field notes will then be saved under your account."}</p>
        {user && !user.isAnonymous ? <><button className="drawing-primary" onClick={() => inputRef.current?.click()}>Choose PDF or Image <ArrowRight size={16}/></button>{drawingRows.length === 0 && <button className="drawing-sample-button" onClick={() => void openSampleDrawing()}>Try a sample piping drawing</button>}<span className="drawing-file-types">PDF · JPG · JPEG · PNG · WEBP <i/> Up to 50 MB</span></> : <div className="drawing-account-actions"><Link className="drawing-primary" href={`/login?redirect=${encodeURIComponent(authRedirect)}`}>Sign in <ArrowRight size={16}/></Link><Link className="drawing-sample-button" href={`/register?redirect=${encodeURIComponent(authRedirect)}`}>Create an account</Link></div>}
        {error && <p role="alert" className="drawing-error">{error}</p>}
      </section>
      <footer className="drawing-start-footer"><span>{user && !user.isAnonymous ? "Your drawing and today’s work save to your account." : "Your account keeps drawings and field notes associated with you."}</span>{user && !user.isAnonymous && <Link href="/login?redirect=%2Fstart">Switch account</Link>}</footer>
    </div> : <>
      <header className="drawing-work-header">
        <Link href="/" className="drawing-logo">EPCX<span>.cloud</span></Link>
        <div className="drawing-file-heading">
          <div className="flex items-center gap-2">
            <b title={`${drawingName}${revision ? ` · Rev ${revision}` : ""}`}>
              {drawingName || file.name.replace(/\.[^.]+$/, "")}{revision ? ` · Rev ${revision}` : ""}
            </b>
            {!isCurrentDrawingToday && (
              <span className="historical-drawing-pill" title="This is a historical record. Today's live sheet may differ.">
                Historical field record · {revision ? `Rev ${revision}` : "Previous"}
              </span>
            )}
          </div>
          <span>{isPdf(file) ? `Page ${page} / ${pages} · PDF` : "Image drawing"}{area ? ` · ${area}` : ""}</span>
        </div>

        {/* Contextual Chrome: + Add Record Dropdown */}
        <div className="drawing-chrome-add-wrap">
          <button
            className="drawing-chrome-add-btn"
            onClick={() => setAddMenuOpen((open) => !open)}
            aria-expanded={addMenuOpen}
          >
            <Plus size={14} />
            <span>+ Add record</span>
            <ChevronDown size={12} />
          </button>
          {addMenuOpen && (
            <div className="field-submenu-popover drawing-chrome-add-menu" onClick={(e) => e.stopPropagation()}>
              <span className="field-submenu-eyebrow">FIELD CAPTURE &amp; ATTACH</span>
              <div className="field-submenu-list">
                <button
                  className="field-submenu-item"
                  onClick={() => { setAddMenuOpen(false); photoCaptureRef.current?.click(); }}
                >
                  <span className="field-submenu-icon">
                    <Camera size={15} />
                  </span>
                  <span className="field-submenu-text">
                    <span className="field-submenu-title">Site Inspection Photo</span>
                    <span className="field-submenu-desc">Attach photo directly to active sheet</span>
                  </span>
                  <ChevronRight size={13} className="field-submenu-arrow" />
                </button>
                <button
                  className="field-submenu-item"
                  onClick={() => { setAddMenuOpen(false); docCaptureRef.current?.click(); }}
                >
                  <span className="field-submenu-icon">
                    <FileText size={15} />
                  </span>
                  <span className="field-submenu-text">
                    <span className="field-submenu-title">Field Document / Report</span>
                    <span className="field-submenu-desc">Attach test certificate, report or spec</span>
                  </span>
                  <ChevronRight size={13} className="field-submenu-arrow" />
                </button>
                <button
                  className="field-submenu-item"
                  onClick={() => { setAddMenuOpen(false); inputRef.current?.click(); }}
                >
                  <span className="field-submenu-icon">
                    <Upload size={15} />
                  </span>
                  <span className="field-submenu-text">
                    <span className="field-submenu-title">New Drawing / Revision</span>
                    <span className="field-submenu-desc">Upload next sheet revision or markups</span>
                  </span>
                  <ChevronRight size={13} className="field-submenu-arrow" />
                </button>
              </div>
            </div>
          )}
        </div>

        {syncState === "failed" ? (
          <button className="drawing-sync is-failed" onClick={() => setMarks([...marksRef.current])}>
            Upload failed · Retry
          </button>
        ) : (
          <span className={`drawing-sync is-${syncState}`} aria-live="polite">
            {syncState === "saving" || syncState === "uploading"
              ? "Uploading…"
              : syncState === "offline"
              ? "Offline · Saved locally"
              : syncState === "pending"
              ? "Syncing…"
              : "✓ Synced"}
          </span>
        )}
        <span className="drawing-guest" title="Signed-in EPCX account">
          <span className="drawing-avatar">{user?.displayName?.slice(0, 1) ?? "E"}</span>
          {user?.displayName || user?.email || "Account"}
        </span>
        <button onClick={saveCurrent} disabled={saving} className="drawing-save">
          <Save size={15}/>{saving ? "Uploading…" : saved ? "Synced" : "Save Today’s Work"}
        </button>
      </header>
      <section ref={stageRef} className="drawing-stage" style={{ touchAction: "none" }}>
        <div ref={sheetRef} className={`drawing-sheet ${tool === "crop" ? "is-cropping" : ""} ${tool === "mark" ? "is-marking" : ""} ${tool === "select" ? "is-panning" : ""} ${panState ? "is-grabbing" : ""}`} onPointerDown={stagePointerDown} onPointerMove={stagePointerMove} onPointerUp={endPointer} onPointerCancel={() => { touchPoints.current.clear(); pinchStart.current = null; setPanState(null); setCropStart(null); setCropRegion(null); setDrawStart(null); setDrawingPoints([]); setMarkupPreview(null); }} style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) rotate(${rotation}deg) scale(${zoom})`, transformOrigin: "center", width: isPdf(file) ? pdfPage?.width : undefined, height: isPdf(file) ? pdfPage?.height : undefined, touchAction: "none" }}>
        {isPdf(file) ? <>{pdfPage ? <canvas className="drawing-pdf-canvas" width={pdfPage.data?.width} height={pdfPage.data?.height} ref={(node) => { if (node && pdfPage.data) node.getContext("2d")?.putImageData(pdfPage.data, 0, 0); }} style={{ width: pdfPage.width, height: pdfPage.height, filter: enhancedView ? "contrast(140%) brightness(105%) grayscale(15%)" : undefined }} /> : <div className="drawing-loading"><EpcxSpinner size="sm" inline />Opening drawing…</div>}</> : <img className={`drawing-image ${rotation % 180 ? "is-rotated" : ""}`} src={url} alt={file.name} style={{ filter: enhancedView ? "contrast(140%) brightness(105%) grayscale(15%)" : undefined }}/>}
        <div className="drawing-overlay">
          <svg className="drawing-vector-layer" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-label="Drawing annotations">
            {marks.filter((mark) => mark.page === page && (mark.kind === "highlight" || mark.kind === "arrow" || mark.kind === "draw")).map((mark) => <g key={mark.id} onClick={() => setSelectedId(mark.id)}>{mark.kind === "highlight" ? <rect x={Math.min(mark.x, mark.x+(mark.width??0))*1000} y={Math.min(mark.y, mark.y+(mark.height??0))*1000} width={Math.abs(mark.width??0)*1000} height={Math.abs(mark.height??0)*1000} fill="rgba(243,197,48,.25)" stroke="#d5a900" strokeWidth="3"/> : mark.kind === "draw" ? <polyline points={(mark.points??[]).map((p)=>`${p.x*1000},${p.y*1000}`).join(" ")} fill="none" stroke="#c0392b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/> : <line x1={mark.x*1000} y1={mark.y*1000} x2={(mark.x+(mark.width??0))*1000} y2={(mark.y+(mark.height??0))*1000} stroke="#177947" strokeWidth="4" markerEnd="url(#arrowhead)"/>}</g>)}
            <defs><marker id="arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="#177947"/></marker></defs>
            {markupPreview && markupPreview.page === page && (markupPreview.kind === "highlight" ? <rect x={Math.min(markupPreview.x,markupPreview.x+(markupPreview.width??0))*1000} y={Math.min(markupPreview.y,markupPreview.y+(markupPreview.height??0))*1000} width={Math.abs(markupPreview.width??0)*1000} height={Math.abs(markupPreview.height??0)*1000} fill="rgba(243,197,48,.25)" stroke="#d5a900" strokeWidth="3" strokeDasharray="10 7"/> : markupPreview.kind === "draw" ? <polyline points={(markupPreview.points??[]).map((p)=>`${p.x*1000},${p.y*1000}`).join(" ")} fill="none" stroke="#c0392b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/> : <line x1={markupPreview.x*1000} y1={markupPreview.y*1000} x2={(markupPreview.x+(markupPreview.width??0))*1000} y2={(markupPreview.y+(markupPreview.height??0))*1000} stroke="#177947" strokeWidth="4" strokeDasharray="10 7" markerEnd="url(#arrowhead)"/>)}
            {tool === "crop" && cropRegion && <rect className="drawing-crop-selection" x={cropRegion.x*1000} y={cropRegion.y*1000} width={cropRegion.width*1000} height={cropRegion.height*1000} fill="rgba(39,130,82,.14)" stroke="#24764a" strokeWidth="3" strokeDasharray="12 8"/>}
          </svg>
          {marks.filter((mark) => mark.page === page && ((mark.kind === "mark" && showWorkItems) || mark.kind === "text")).map((mark) => {
            const isComplete = mark.status === "Complete";
            const label = mark.label?.trim() || "Item";
            const central = fieldContext?.workItems?.find((w) => w.id === mark.id || (w.drawingId === currentDrawingId && w.jointId === mark.label));
            const isDprReported = central?.dprReported;
            const isNdtPending = central?.ndtStatus === "pending";

            return <button key={mark.id} className={`drawing-pin ${mark.kind === "text" ? "drawing-note" : ""} ${isComplete ? "is-complete" : "is-progress"} ${selectedId === mark.id ? "is-selected" : ""}`} style={{ left: `${mark.x*100}%`, top: `${mark.y*100}%`, transform: `translate(-50%,-50%) rotate(${-rotation}deg)` }} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setSelectedId(mark.id); setEditing(mark); }} aria-label={mark.kind === "mark" ? `${label}, ${mark.status}` : mark.label}>
              {mark.kind === "text" ? mark.label || "Note" : <span className="drawing-pin-badge"><span className="pin-head">{isComplete ? <Check size={11}/> : "•"}<b>{label}</b></span><span className="pin-badges"><small className="pin-status">{isComplete ? "Complete" : "In Progress"}</small>{isComplete && <small className={`pin-dpr-tag ${isDprReported ? "dpr-ok" : "dpr-miss"}`}>{isDprReported ? "DPR ✓" : "DPR missing"}</small>}{isNdtPending && <small className="pin-ndt-tag">NDT pend</small>}</span></span>}
            </button>;
          })}
        </div>
        </div>
        {error && <div className="drawing-inline-error" role="alert">{error}<button onClick={() => setError("")} aria-label="Dismiss"><X size={14}/></button></div>}
        {editing && <aside className="drawing-context-card" style={contextualStyle(editing)} onPointerDown={(event) => event.stopPropagation()}><div className="drawing-card-head"><span>{editing.kind === "mark" ? "MARK WORK ITEM" : editing.kind === "text" ? "DRAWING NOTE" : "MARKUP"}</span><button onClick={() => setEditing(null)} aria-label="Close"><X size={16}/></button></div>
          {editing.kind === "mark" ? <><div className="drawing-card-status-bar"><p className="drawing-work-item-name">{editing.label?.trim() || "Unnamed Work Item"}</p>{editing.status === "Complete" && <span className="drawing-dpr-tag-view">{fieldContext?.workItems?.find((w) => w.id === editing.id)?.dprReported ? "DPR ✓ Reported" : "DPR missing"}</span>}</div><div className="drawing-status-label">Status (1-tap update)</div><div className="drawing-status-options"><button className={editing.status === "In Progress" ? "active" : ""} onClick={() => patchEditing({ status: "In Progress" })}>In Progress</button><button className={editing.status === "Complete" ? "active" : ""} onClick={() => patchEditing({ status: "Complete" })}><Check size={14}/>Complete</button></div><details className="drawing-work-item-details"><summary>Details &amp; NDT (optional)</summary><label>Label / Joint ID<input placeholder="Possible joint: J-017" value={editing.label ?? ""} onChange={(event) => patchEditing({ label: event.target.value })}/></label><label>Work type<select value={editing.itemType ?? "Joint"} onChange={(event) => patchEditing({ itemType: event.target.value })}><option value="Joint">Joint (Welding)</option><option value="Piping">Piping</option><option value="Structure">Structure</option><option value="Equipment">Equipment</option><option value="Tank">Tank</option><option value="Civil">Civil</option><option value="Other">Other</option></select></label><label>Line / area<input placeholder="e.g. 24-P-102" value={editing.line ?? ""} onChange={(event) => patchEditing({ line: event.target.value })}/></label><label>Crew / welder<input placeholder="e.g. Crew A, Welder 04" value={editing.crew ?? editing.welder ?? ""} onChange={(event) => patchEditing({ crew: event.target.value })}/></label></details></> : editing.kind === "text" ? <label>Note<textarea autoFocus rows={2} value={localText || editing.label || ""} onChange={(event) => setLocalText(event.target.value)} placeholder="Add a short note"/></label> : <p className="drawing-field-hint">Markup is attached to this drawing page.</p>}
          {editing.kind === "mark" && editing.history?.length ? <div className="drawing-item-history">{editing.history.slice(-4).map((entry, index) => <span key={`${entry.at}-${index}`}>{new Date(entry.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {entry.action}</span>)}</div> : null}
          <div className="drawing-card-actions">{editing.kind === "mark" && <><button className="drawing-delete" onClick={() => { const deletedId = editing.id; commitMarks((old) => old.filter((item) => item.id !== deletedId), "Work item deleted"); void fieldContext?.deleteWorkItem(deletedId); setEditing(null); }}>Delete</button><button onClick={() => { setSelectedId(editing.id); setEditing(null); setTool("move"); setToast("Tap the new location to move this item"); }}>Move</button></>}{editing.kind !== "mark" && <button className="drawing-delete" onClick={() => { commitMarks((old) => old.filter((item) => item.id !== editing.id), "Markup deleted"); setEditing(null); }}>Delete</button>}<button className="drawing-save-mark" onClick={saveMark}>{editing.kind === "mark" ? "Done" : "Save"}</button></div>
        </aside>}
        {localText && !editing && <div className="drawing-extract-card"><button onClick={() => { setLocalText(""); setDetectedText(""); setExtraction(null); }} aria-label="Close"><X size={14}/></button><b>{localText === "text-detected" ? "TEXT FOUND" : localText.startsWith("Checking") ? "CHECKING PDF TEXT" : "HIGHLIGHT SAVED"}</b>{localText === "text-detected" ? <><input aria-label="Detected drawing text" value={detectedText} onChange={(event) => setDetectedText(event.target.value)}/><select aria-label="Use detected text as" value={fieldTarget} onChange={(event) => setFieldTarget(event.target.value)}><option value="line">Line / Area</option><option value="label">Joint / Work Item</option><option value="equipment">Equipment Tag</option><option value="area">Area</option><option value="drawing">Drawing Reference</option></select><div className="drawing-extract-actions"><button onClick={() => { if (fieldTarget === "line" || fieldTarget === "area") setPendingLine(detectedText); else setPendingItemLabel(detectedText); setLocalText(""); setTool("mark"); }}>Use</button><button onClick={() => void navigator.clipboard?.writeText(detectedText)}><Copy size={13}/>Copy</button><button onClick={() => setLocalText("text-detected")}>Edit</button></div><small>{extraction?.source === "selectable-pdf-text" ? "Read from selectable PDF text. Verify before using." : "Check this suggested value."}</small></> : <p>{localText}</p>}</div>}
        {tool === "crop" && <div className="drawing-crop-actions" onPointerDown={(event) => event.stopPropagation()}><b>{cropRegion ? "Crop selected area" : "Select area to keep"}</b><span>{cropRegion ? "Everything outside will be removed." : "Drag a rectangle over the drawing."}</span><div><button onClick={() => { setCropRegion(null); setTool("mark"); }}>Cancel</button><button disabled={!cropRegion || cropRegion.width < .02 || cropRegion.height < .02} onClick={() => void applyImageCrop()}>Apply Crop</button></div></div>}
        <div className={`drawing-view-controls ${tool === "crop" ? "is-hidden" : ""}`}>{isPdf(file) && <><button aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={16}/></button><span>Page {page} / {pages}</span><button aria-label="Next page" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}><ChevronRight size={16}/></button><i/></>}<button onClick={() => setZoom((value) => Math.max(.5, Number((value-.2).toFixed(1))))} aria-label="Zoom out">−</button><button title="Set zoom to 100 percent" onClick={() => { setZoom(1); setPanOffset({ x: 0, y: 0 }); }}>{Math.round(zoom*100)}%</button><button onClick={() => setZoom((value) => Math.min(2.5, Number((value+.2).toFixed(1))))} aria-label="Zoom in"><Plus size={15}/></button><button onClick={fitDrawing}>Fit</button><button className={enhancedView ? "active" : ""} title="Enhance contrast for paper drawing photos" onClick={() => setEnhancedView(!enhancedView)}>Enhance</button></div>
      </section>
      {hintVisible && <div className="drawing-hint">Tip: <b>Mark Work</b> → tap a location on the drawing <button onClick={() => setHintVisible(false)} aria-label="Dismiss hint"><X size={13}/></button></div>}
      {toast && <div className="drawing-toast" role="status">{toast}{["Work item marked", "Highlight added", "Arrow added", "Drawing added", "Work item moved", "Work item deleted", "Markup deleted", "Work item saved", "Note added", "Crop applied", "Marked Complete", "Marked In Progress", "Work item updated"].includes(toast) && <button onClick={undo}>Undo</button>}</div>}
      {workListOpen && <aside className="drawing-work-list"><header><b>Drawing Work Items</b><button onClick={() => setWorkListOpen(false)} aria-label="Close"><X size={16}/></button></header><select aria-label="Filter work items" value={workFilter} onChange={(event) => setWorkFilter(event.target.value as "All" | MarkStatus)}><option>All</option><option>Complete</option><option>In Progress</option></select>{listedMarks.length ? listedMarks.map((mark) => <button key={mark.id} className="drawing-work-list-row" onClick={() => { setSelectedId(mark.id); setEditing(mark); setWorkListOpen(false); const rect = stageRef.current?.getBoundingClientRect(); if (rect) setPanOffset({ x: rect.width / 2 - mark.x * rect.width, y: rect.height / 2 - mark.y * rect.height }); }}><span className={mark.status === "Complete" ? "complete" : "progress"}/><span><b>{mark.label?.trim() || "Unnamed"}</b><small>{mark.line || "No line / area"}</small></span><em>{mark.status}</em></button>) : <p>No work items match this view.</p>}</aside>}
      <footer className="drawing-tools"><div>{toolButtons.map(({id,label,icon:Icon}) => <button key={id} className={`${tool === id ? "active" : ""} ${id === "mark" ? "drawing-mark-primary" : ""}`} onClick={() => { setTool(id); setEditing(null); setMoreOpen(false); }}><Icon size={16}/><span>{label}</span></button>)}<button className="drawing-rotate-tool" onClick={rotateImage} title="Rotate 90° clockwise" aria-label="Rotate 90 degrees clockwise"><RotateCw size={15}/><span>Rotate</span></button><div className="drawing-more-wrap"><button className={`drawing-tool-more ${moreOpen ? "active" : ""}`} onClick={() => setMoreOpen((open) => !open)} aria-expanded={moreOpen}><MoreHorizontal size={16}/><span>More</span></button>{moreOpen && <div className="drawing-more-menu"><button onClick={() => { setTool("highlight"); setEditing(null); setMoreOpen(false); }}><Highlighter size={15}/>Highlight</button><button onClick={() => { setTool("draw"); setEditing(null); setMoreOpen(false); }}><Pencil size={15}/>Draw</button><button onClick={() => { setTool("arrow"); setEditing(null); setMoreOpen(false); }}><MoveUpRight size={15}/>Arrow</button><button onClick={() => { setTool("text"); setEditing(null); setMoreOpen(false); }}><Type size={15}/>Text note</button>{!isPdf(file) && <button onClick={() => { setTool("crop"); setCropRegion(null); setEditing(null); setMoreOpen(false); }}><Crop size={15}/>Crop image</button>}<button onClick={() => { rotateCounterClockwise(); setMoreOpen(false); }}><RotateCcw size={15}/>Rotate counter-clockwise</button>{rotation !== 0 && <button onClick={() => { resetRotation(); setMoreOpen(false); }}><RotateCw size={15}/>Reset orientation</button>}<button disabled={!historyRef.current.past.length} onClick={() => { undo(); setMoreOpen(false); }}><Undo2 size={15}/>Undo</button><button disabled={!historyRef.current.future.length} onClick={() => { redo(); setMoreOpen(false); }}><Redo2 size={15}/>Redo</button></div>}</div></div><div className="drawing-work-count-controls"><button onClick={() => setWorkListOpen((open) => !open)}>{workItemMarks.length} work items <span className="drawing-work-count-status">{completedCount} complete · {inProgressCount} in progress</span></button><button title={showWorkItems ? "Hide Work Items" : "Show Work Items"} aria-label={showWorkItems ? "Hide Work Items" : "Show Work Items"} onClick={() => setShowWorkItems((visible) => !visible)}>{showWorkItems ? <Eye size={16}/> : <EyeOff size={16}/>}</button></div></footer>
    </>}
    </div>
    <nav className="drawing-mobile-nav" aria-label="Field workspace navigation"><button className={workspaceView === "drawings" ? "active" : ""} onClick={() => setWorkspaceView("drawings")}><span className="drawing-nav-dot"/>Drawings</button><button className={workspaceView === "today" ? "active" : ""} onClick={() => setWorkspaceView("today")}><span className="drawing-nav-dot"/>Today{todayItems.length > 0 && <small>{todayItems.length}</small>}</button></nav>
    {showDrawingDetails && pendingFile && <div className="drawing-modal-backdrop"><form className="drawing-details-modal" onSubmit={confirmDrawingDetails}><p className="drawing-eyebrow">NEW DRAWING</p><h2>Drawing details</h2><p className="drawing-details-file">{pendingFile.name}</p>{revisionWarning && <p className="drawing-rev-warning" role="alert"><AlertTriangle size={14}/> {revisionWarning}</p>}<label>Drawing name<input autoFocus required value={drawingName} onChange={(event) => setDrawingName(event.target.value)} placeholder="e.g. ISO-24-P-102"/></label><label>Revision <span>Optional</span><input value={revision} onChange={(event) => setRevision(event.target.value)} placeholder="e.g. Rev 03"/></label><label>Line / Area <span>Optional</span><input value={area} onChange={(event) => setArea(event.target.value)} placeholder="e.g. 24-P-102 · North rack"/></label>{detailsError && <p className="drawing-error">{detailsError}</p>}<div className="drawing-card-actions"><button type="button" onClick={() => { setShowDrawingDetails(false); setPendingFile(null); }}>Cancel</button><button type="submit" className="drawing-save-mark">Open drawing</button></div></form></div>}
  </main>;
}
