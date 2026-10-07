import { collection, doc, getDoc, getDocs, setDoc, query, where, orderBy, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { CentralWorkItem, DprRecordData, DprTemplateMapping, ReconciliationSummary, WorkType } from "./work-item-model";

const WORK_ITEMS_STORE = "epcx-central-work-items";
const RECONCILIATION_STORE = "epcx-reconciliation-records";
const DPR_TEMPLATES_STORE = "epcx-dpr-templates";

// ─── IndexedDB Local Cache ──────────────────────────────────────────

function getLocalStore(storeName: string, mode: IDBTransactionMode = "readonly"): Promise<{ db: IDBDatabase; store: IDBObjectStore }> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("epcx-field-work", 2);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains("sessions")) d.createObjectStore("sessions");
      if (!d.objectStoreNames.contains(WORK_ITEMS_STORE)) d.createObjectStore(WORK_ITEMS_STORE);
      if (!d.objectStoreNames.contains(RECONCILIATION_STORE)) d.createObjectStore(RECONCILIATION_STORE);
      if (!d.objectStoreNames.contains(DPR_TEMPLATES_STORE)) d.createObjectStore(DPR_TEMPLATES_STORE);
    };
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const d = req.result;
      const tx = d.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      resolve({ db: d, store });
    };
  });
}

async function localGet<T>(storeName: string, key: string): Promise<T | null> {
  try {
    const { db: d, store } = await getLocalStore(storeName, "readonly");
    return new Promise((resolve) => {
      const req = store.get(key);
      req.onsuccess = () => { d.close(); resolve((req.result as T) ?? null); };
      req.onerror = () => { d.close(); resolve(null); };
    });
  } catch {
    return null;
  }
}

async function localPut<T>(storeName: string, key: string, value: T): Promise<void> {
  try {
    const { db: d, store } = await getLocalStore(storeName, "readwrite");
    return new Promise((resolve, reject) => {
      const req = store.put(value, key);
      req.onsuccess = () => { d.close(); resolve(); };
      req.onerror = () => { d.close(); reject(req.error); };
    });
  } catch {
    // fallback or offline
  }
}

async function localGetAll<T>(storeName: string): Promise<T[]> {
  try {
    const { db: d, store } = await getLocalStore(storeName, "readonly");
    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => { d.close(); resolve((req.result as T[]) ?? []); };
      req.onerror = () => { d.close(); resolve([]); };
    });
  } catch {
    return [];
  }
}

// ─── Work Items Persistence ─────────────────────────────────────────

export async function listCentralWorkItems(uid: string, projectId?: string): Promise<CentralWorkItem[]> {
  if (!uid) return [];
  const localKey = `${uid}:work-items`;
  const cached = await localGet<CentralWorkItem[]>(WORK_ITEMS_STORE, localKey);

  if (navigator.onLine) {
    try {
      const colRef = collection(db, "users", uid, "fieldWorkItems");
      const q = projectId ? query(colRef, where("projectId", "==", projectId)) : colRef;
      const snapshot = await getDocs(q);
      const remoteItems: CentralWorkItem[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      } as CentralWorkItem));

      // Also harvest any legacy drawing marks that might not yet be in fieldWorkItems
      const drawingsSnap = await getDocs(collection(db, "users", uid, "fieldDrawings"));
      const legacyWorkItems: CentralWorkItem[] = [];
      const remoteIds = new Set(remoteItems.map((r) => r.id));

      for (const dDoc of drawingsSnap.docs) {
        const dData = dDoc.data();
        const drawingId = dDoc.id;
        const drawingName = String(dData.name || dData.fileName || "Drawing");
        const drawingRevision = String(dData.revision || "");
        const rawMarks = Array.isArray(dData.marks) ? dData.marks : [];
        const rawItems = Array.isArray(dData.workItems) ? dData.workItems : [];

        // Check if marks have work items not yet in remoteItems
        for (const mark of rawMarks) {
          if (mark.kind === "mark" && !remoteIds.has(mark.id)) {
            const legacyItem: CentralWorkItem = {
              id: mark.id,
              projectId: dData.projectId || projectId || "",
              projectName: dData.projectName || "",
              fieldDate: (mark.createdAt || dData.updatedAt || new Date().toISOString()).slice(0, 10),
              discipline: (mark.itemType?.toLowerCase() as WorkType) || "piping",
              drawingId,
              drawingName,
              drawingRevision,
              drawingLocation: { x: mark.x, y: mark.y, page: mark.page ?? 1 },
              lineId: mark.line || "",
              jointId: mark.label || "",
              description: mark.label ? `Joint / item ${mark.label}` : "Drawing marked work item",
              quantity: 1,
              unit: "ea",
              status: mark.status === "Complete" ? "Complete" : "In Progress",
              progress: mark.status === "Complete" ? 100 : 50,
              createdFrom: "drawing",
              sourceRecordId: mark.id,
              dprReported: false,
              remarks: mark.crew ? `Crew: ${mark.crew}` : undefined,
              crew: mark.crew,
              welder: mark.welder,
              createdAt: mark.createdAt || new Date().toISOString(),
              updatedAt: mark.updatedAt || new Date().toISOString(),
            };
            legacyWorkItems.push(legacyItem);
            remoteIds.add(mark.id);
          }
        }
      }

      const merged = [...remoteItems, ...legacyWorkItems];
      merged.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      await localPut(WORK_ITEMS_STORE, localKey, merged);
      return merged;
    } catch (err) {
      console.warn("Could not fetch remote work items, falling back to cache", err);
    }
  }

  return cached || [];
}

function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)).filter((item) => item !== undefined) as unknown as T;
  }
  if (typeof data === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (value !== undefined) {
        result[key] = sanitizeForFirestore(value);
      }
    }
    return result as T;
  }
  return data;
}

export async function saveCentralWorkItem(uid: string, item: CentralWorkItem): Promise<void> {
  if (!uid) return;
  const now = new Date().toISOString();
  const toSave: CentralWorkItem = {
    ...item,
    updatedAt: now,
    createdAt: item.createdAt || now,
  };

  // 1. Local update
  const localKey = `${uid}:work-items`;
  const current = (await localGet<CentralWorkItem[]>(WORK_ITEMS_STORE, localKey)) || [];
  const next = current.some((i) => i.id === toSave.id)
    ? current.map((i) => (i.id === toSave.id ? toSave : i))
    : [toSave, ...current];
  await localPut(WORK_ITEMS_STORE, localKey, next);

  // 2. Remote update if online
  if (navigator.onLine) {
    try {
      const docRef = doc(db, "users", uid, "fieldWorkItems", toSave.id);
      await setDoc(docRef, sanitizeForFirestore(toSave), { merge: true });

      // If tied to a drawing, also update the drawing's workItems/marks array for backward compatibility
      if (toSave.drawingId) {
        const drawingRef = doc(db, "users", uid, "fieldDrawings", toSave.drawingId);
        const dSnap = await getDoc(drawingRef);
        if (dSnap.exists()) {
          const dData = dSnap.data();
          const marks = Array.isArray(dData.marks) ? [...dData.marks] : [];
          const idx = marks.findIndex((m) => m.id === toSave.id);
          if (idx >= 0) {
            marks[idx] = {
              ...marks[idx],
              status: toSave.status,
              label: toSave.jointId || toSave.description,
              line: toSave.lineId,
              updatedAt: now,
            };
            await setDoc(drawingRef, sanitizeForFirestore({ marks, updatedAt: now }), { merge: true });
          }
        }
      }
    } catch (err) {
      console.error("Failed to sync work item to Firestore", err);
    }
  }
}

export async function saveCentralWorkItemsBulk(uid: string, items: CentralWorkItem[]): Promise<void> {
  if (!uid || !items.length) return;
  const now = new Date().toISOString();
  const prepared = items.map((item) => ({ ...item, updatedAt: now, createdAt: item.createdAt || now }));

  // Local update
  const localKey = `${uid}:work-items`;
  const current = (await localGet<CentralWorkItem[]>(WORK_ITEMS_STORE, localKey)) || [];
  const map = new Map(current.map((i) => [i.id, i]));
  for (const item of prepared) map.set(item.id, item);
  const next = [...map.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  await localPut(WORK_ITEMS_STORE, localKey, next);

  // Remote batch update
  if (navigator.onLine) {
    try {
      for (let i = 0; i < prepared.length; i += 400) {
        const batch = writeBatch(db);
        for (const item of prepared.slice(i, i + 400)) {
          const ref = doc(db, "users", uid, "fieldWorkItems", item.id);
          batch.set(ref, sanitizeForFirestore(item), { merge: true });
        }
        await batch.commit();
      }
    } catch (err) {
      console.error("Failed to bulk save work items to Firestore", err);
    }
  }
}

export async function deleteCentralWorkItem(uid: string, itemId: string): Promise<void> {
  if (!uid || !itemId) return;
  const localKey = `${uid}:work-items`;
  const current = (await localGet<CentralWorkItem[]>(WORK_ITEMS_STORE, localKey)) || [];
  await localPut(WORK_ITEMS_STORE, localKey, current.filter((i) => i.id !== itemId));

  if (navigator.onLine) {
    try {
      await deleteDoc(doc(db, "users", uid, "fieldWorkItems", itemId));
    } catch (err) {
      console.error("Failed to delete work item", err);
    }
  }
}

// ─── DPR Records Persistence ────────────────────────────────────────

export async function listDprRecords(uid: string): Promise<DprRecordData[]> {
  if (!uid) return [];
  const localKey = `${uid}:dpr-records`;
  const cached = await localGet<DprRecordData[]>("sessions", localKey);

  if (navigator.onLine) {
    try {
      const snapshot = await getDocs(collection(db, "users", uid, "fieldDocuments"));
      const remote = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown>))
        .filter((d) => d.type === "DPR")
        .map((d) => {
          const items = Array.isArray(d.items) ? d.items : [];
          return {
            id: String(d.id),
            ownerUid: String(d.ownerUid || uid),
            state: (d.state as any) || (d.ocrStatus === "processed" ? "EXTRACTED" : "SOURCE"),
            title: String(d.title || d.fileName || "DPR"),
            documentDate: String(d.documentDate || d.recordDate || new Date().toISOString().slice(0, 10)),
            projectId: d.projectId ? String(d.projectId) : undefined,
            projectName: d.projectName ? String(d.projectName) : undefined,
            area: d.area ? String(d.area) : undefined,
            contractor: d.contractor ? String(d.contractor) : undefined,
            manpower: d.manpower ? (typeof d.manpower === "object" ? d.manpower : { total: Number(d.manpower) || 0 }) : { total: 0 },
            equipment: d.equipment ? String(d.equipment) : undefined,
            safetyTbt: d.safetyTbt ? String(d.safetyTbt) : undefined,
            remarks: d.remarks ? String(d.remarks) : undefined,
            items,
            sourceFile: d.filePath ? { name: String(d.fileName || "original"), path: String(d.filePath), mimeType: String(d.mimeType || ""), downloadURL: d.downloadURL ? String(d.downloadURL) : undefined } : undefined,
            rawText: d.rawOcrText ? String(d.rawOcrText) : undefined,
            linkedDrawingIds: Array.isArray(d.relatedRecords) ? d.relatedRecords.map(String) : [],
            createdAt: String(d.createdAt || new Date().toISOString()),
            updatedAt: String(d.updatedAt || new Date().toISOString()),
          } as DprRecordData;
        });

      remote.sort((a, b) => b.documentDate.localeCompare(a.documentDate) || b.createdAt.localeCompare(a.createdAt));
      await localPut("sessions", localKey, remote);
      return remote;
    } catch (err) {
      console.warn("Could not fetch remote DPRs", err);
    }
  }

  return cached || [];
}

export async function saveDprRecord(uid: string, dpr: DprRecordData): Promise<void> {
  if (!uid) return;
  const now = new Date().toISOString();
  const toSave: DprRecordData = { ...dpr, updatedAt: now };

  // Local cache
  const localKey = `${uid}:dpr-records`;
  const current = (await localGet<DprRecordData[]>("sessions", localKey)) || [];
  const next = current.some((r) => r.id === toSave.id)
    ? current.map((r) => (r.id === toSave.id ? toSave : r))
    : [toSave, ...current];
  await localPut("sessions", localKey, next);

  // Firestore update
  if (navigator.onLine) {
    try {
      const docRef = doc(db, "users", uid, "fieldDocuments", toSave.id);
      const firestorePayload = {
        id: toSave.id,
        ownerUid: uid,
        type: "DPR",
        title: toSave.title,
        documentDate: toSave.documentDate,
        projectId: toSave.projectId || null,
        projectName: toSave.projectName || "",
        area: toSave.area || "",
        contractor: toSave.contractor || "",
        state: toSave.state,
        items: toSave.items,
        manpower: toSave.manpower,
        equipment: toSave.equipment || "",
        safetyTbt: toSave.safetyTbt || "",
        remarks: toSave.remarks || "",
        nextDayPlan: toSave.nextDayPlan || "",
        relatedRecords: toSave.linkedDrawingIds || [],
        rawOcrText: toSave.rawText || "",
        ocrStatus: toSave.state === "EXTRACTED" || toSave.items.length > 0 ? "processed" : "needs-ocr",
        extracted: {
          project: toSave.projectName || "",
          area: toSave.area || "",
          contractor: toSave.contractor || "",
          manpower: toSave.manpower?.total ? String(toSave.manpower.total) : "",
          workDescription: toSave.items.map((i) => i.activityDescription).join("; "),
          remarks: toSave.remarks || "",
        },
        confirmedFields: toSave.items.length > 0 ? ["items", "manpower", "project", "date"] : [],
        updatedAt: now,
      };

      await setDoc(docRef, sanitizeForFirestore(firestorePayload), { merge: true });
    } catch (err) {
      console.error("Failed to save DPR record to Firestore", err);
    }
  }
}

// ─── Reconciliation Persistence ──────────────────────────────────────

export async function saveReconciliationRecord(uid: string, summary: ReconciliationSummary): Promise<void> {
  if (!uid) return;
  const key = `${uid}:reconciliation:${summary.date}`;
  await localPut(RECONCILIATION_STORE, key, summary);

  if (navigator.onLine) {
    try {
      const ref = doc(db, "users", uid, "reconciliations", summary.date);
      await setDoc(ref, sanitizeForFirestore(summary), { merge: true });
    } catch (err) {
      console.warn("Could not save reconciliation to Firestore", err);
    }
  }
}

export async function getReconciliationRecord(uid: string, date: string): Promise<ReconciliationSummary | null> {
  if (!uid) return null;
  const key = `${uid}:reconciliation:${date}`;
  const cached = await localGet<ReconciliationSummary>(RECONCILIATION_STORE, key);
  if (cached) return cached;

  if (navigator.onLine) {
    try {
      const snap = await getDoc(doc(db, "users", uid, "reconciliations", date));
      if (snap.exists()) return snap.data() as ReconciliationSummary;
    } catch {
      // offline
    }
  }
  return null;
}

// ─── DPR Templates (Section 8) ──────────────────────────────────────

export async function listDprTemplates(uid: string, projectId?: string): Promise<DprTemplateMapping[]> {
  const localKey = `${uid}:templates`;
  const cached = await localGet<DprTemplateMapping[]>(DPR_TEMPLATES_STORE, localKey);
  if (cached && cached.length) return cached;

  // Default initial generic template
  const defaultTemplates: DprTemplateMapping[] = [
    {
      id: "std-daily-dpr",
      templateName: "Standard EPC Daily DPR",
      projectId,
      matchPatterns: ["activity", "description", "quantity", "manpower", "unit"],
      columnMappings: {
        itemNo: "item",
        description: "activity / description",
        lineOrArea: "line / area",
        jointOrTag: "joint / tag / spool",
        unit: "unit",
        todayQty: "today qty",
        cumulativeQty: "cumulative",
        manpower: "manpower",
        equipment: "equipment",
        remarks: "remarks",
      },
      lastUsedAt: new Date().toISOString(),
    },
  ];

  return defaultTemplates;
}

export async function saveDprTemplate(uid: string, template: DprTemplateMapping): Promise<void> {
  const localKey = `${uid}:templates`;
  const existing = (await localGet<DprTemplateMapping[]>(DPR_TEMPLATES_STORE, localKey)) || [];
  const next = existing.some((t) => t.id === template.id)
    ? existing.map((t) => (t.id === template.id ? template : t))
    : [...existing, template];
  await localPut(DPR_TEMPLATES_STORE, localKey, next);
}
