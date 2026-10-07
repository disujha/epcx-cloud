"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import type { CentralWorkItem, DprRecordData, ReconciliationSummary, WorkItemStatus, WorkType } from "@/lib/field-progress/work-item-model";
import {
  listCentralWorkItems,
  saveCentralWorkItem,
  saveCentralWorkItemsBulk,
  deleteCentralWorkItem,
  listDprRecords,
  saveDprRecord,
  saveReconciliationRecord,
  getReconciliationRecord,
} from "@/lib/field-progress/work-item-store";
import { generateDprDraftFromWorkItems, reconcileDprWithWorkItems } from "@/lib/field-progress/work-item-model";
import type { FieldProject } from "@/components/field-progress/FieldProjectProfile";

export type SyncState = "saving" | "synced" | "offline" | "syncing" | "failed";

interface FieldWorkContextType {
  workItems: CentralWorkItem[];
  todayWorkItems: CentralWorkItem[];
  dprRecords: DprRecordData[];
  todayDpr: DprRecordData | null;
  syncState: SyncState;
  loading: boolean;
  selectedDate: string; // YYYY-MM-DD
  setSelectedDate: (date: string) => void;

  // Work item actions
  addOrUpdateWorkItem: (item: CentralWorkItem) => Promise<void>;
  updateWorkItemStatus: (id: string, status: WorkItemStatus) => Promise<void>;
  addWorkItemsBulk: (items: CentralWorkItem[]) => Promise<void>;
  deleteWorkItem: (id: string) => Promise<void>;
  refreshWorkItems: () => Promise<void>;

  // DPR actions
  saveDpr: (dpr: DprRecordData) => Promise<void>;
  generateTodayDprDraft: (project?: FieldProject) => DprRecordData;

  // Reconciliation actions
  activeReconciliation: ReconciliationSummary | null;
  runReconciliationForDate: (date?: string) => Promise<ReconciliationSummary>;
  resolveReconciliationItem: (
    itemId: string,
    action: "created_work_item" | "linked" | "marked_reported" | "dismissed",
    note?: string
  ) => Promise<void>;

  // Derived execution counters
  todayCompletedCount: number;
  todayInProgressCount: number;
  needsAttentionCount: number;
  isDprDraftReady: boolean;
}

const FieldWorkContext = createContext<FieldWorkContextType | undefined>(undefined);

const getLocalDay = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function FieldWorkProvider({ children, currentProjectId }: { children: ReactNode; currentProjectId?: string }) {
  const { user } = useAuth();
  const [workItems, setWorkItems] = useState<CentralWorkItem[]>([]);
  const [dprRecords, setDprRecords] = useState<DprRecordData[]>([]);
  const [syncState, setSyncState] = useState<SyncState>("synced");
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDay());
  const [activeReconciliation, setActiveReconciliation] = useState<ReconciliationSummary | null>(null);

  const todayKey = getLocalDay();

  // Load authoritative items from store
  const refreshWorkItems = useCallback(async () => {
    if (!user || user.isAnonymous) {
      setWorkItems([]);
      setDprRecords([]);
      setLoading(false);
      return;
    }

    try {
      setSyncState("syncing");
      const [items, dprs] = await Promise.all([
        listCentralWorkItems(user.uid, currentProjectId),
        listDprRecords(user.uid),
      ]);
      setWorkItems(items);
      setDprRecords(dprs);
      setSyncState("synced");
    } catch (err) {
      console.error("Failed to load field work items", err);
      setSyncState("failed");
    } finally {
      setLoading(false);
    }
  }, [user, currentProjectId]);

  useEffect(() => {
    void refreshWorkItems();
  }, [refreshWorkItems]);

  // Online / offline listeners
  useEffect(() => {
    const handleOnline = () => {
      setSyncState("syncing");
      void refreshWorkItems();
    };
    const handleOffline = () => setSyncState("offline");
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refreshWorkItems]);

  // Today's work items filter
  const todayWorkItems = useMemo(() => {
    return workItems.filter(
      (wi) => wi.fieldDate === selectedDate || wi.updatedAt.slice(0, 10) === selectedDate
    );
  }, [workItems, selectedDate]);

  // Today's DPR
  const todayDpr = useMemo(() => {
    return dprRecords.find((d) => d.documentDate === selectedDate) || null;
  }, [dprRecords, selectedDate]);

  // Today counts
  const todayCompletedCount = useMemo(
    () => todayWorkItems.filter((wi) => wi.status === "Complete").length,
    [todayWorkItems]
  );
  const todayInProgressCount = useMemo(
    () => todayWorkItems.filter((wi) => wi.status === "In Progress").length,
    [todayWorkItems]
  );
  const needsAttentionCount = useMemo(
    () =>
      todayWorkItems.filter(
        (wi) => wi.needsIdentification || !wi.dprReported || wi.ndtStatus === "pending"
      ).length,
    [todayWorkItems]
  );

  const isDprDraftReady = useMemo(() => {
    return todayWorkItems.length > 0 && (!todayDpr || todayDpr.state === "DRAFT");
  }, [todayWorkItems, todayDpr]);

  // Work item mutators
  const addOrUpdateWorkItem = useCallback(
    async (item: CentralWorkItem) => {
      if (!user) return;
      setSyncState("saving");
      setWorkItems((prev) => {
        const idx = prev.findIndex((i) => i.id === item.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = item;
          return next;
        }
        return [item, ...prev];
      });

      try {
        await saveCentralWorkItem(user.uid, item);
        setSyncState(navigator.onLine ? "synced" : "offline");
      } catch {
        setSyncState("failed");
      }
    },
    [user]
  );

  const updateWorkItemStatus = useCallback(
    async (id: string, status: WorkItemStatus) => {
      const item = workItems.find((i) => i.id === id);
      if (!item || !user) return;
      const updated: CentralWorkItem = {
        ...item,
        status,
        progress: status === "Complete" ? 100 : status === "In Progress" ? 50 : 0,
        updatedAt: new Date().toISOString(),
      };
      await addOrUpdateWorkItem(updated);
    },
    [workItems, user, addOrUpdateWorkItem]
  );

  const addWorkItemsBulk = useCallback(
    async (items: CentralWorkItem[]) => {
      if (!user || !items.length) return;
      setSyncState("saving");
      setWorkItems((prev) => {
        const map = new Map(prev.map((i) => [i.id, i]));
        for (const it of items) map.set(it.id, it);
        return [...map.values()];
      });

      try {
        await saveCentralWorkItemsBulk(user.uid, items);
        setSyncState(navigator.onLine ? "synced" : "offline");
      } catch {
        setSyncState("failed");
      }
    },
    [user]
  );

  const deleteWorkItem = useCallback(
    async (id: string) => {
      if (!user) return;
      setWorkItems((prev) => prev.filter((i) => i.id !== id));
      await deleteCentralWorkItem(user.uid, id);
    },
    [user]
  );

  // DPR actions
  const saveDpr = useCallback(
    async (dpr: DprRecordData) => {
      if (!user) return;
      setSyncState("saving");
      setDprRecords((prev) => {
        const idx = prev.findIndex((d) => d.id === dpr.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = dpr;
          return next;
        }
        return [dpr, ...prev];
      });

      try {
        await saveDprRecord(user.uid, dpr);
        // Mark work items as reported in DPR
        const reportedIds = new Set(
          dpr.items.map((i) => i.matchedWorkItemId).filter((id): id is string => Boolean(id))
        );
        if (reportedIds.size > 0) {
          const updatedItems = workItems.map((wi) =>
            reportedIds.has(wi.id)
              ? { ...wi, dprReported: true, dprId: dpr.id, dprDate: dpr.documentDate }
              : wi
          );
          setWorkItems(updatedItems);
          const changed = updatedItems.filter((wi) => reportedIds.has(wi.id));
          await saveCentralWorkItemsBulk(user.uid, changed);
        }
        setSyncState(navigator.onLine ? "synced" : "offline");
      } catch {
        setSyncState("failed");
      }
    },
    [user, workItems]
  );

  const generateTodayDprDraft = useCallback(
    (project?: FieldProject): DprRecordData => {
      return generateDprDraftFromWorkItems(todayWorkItems, project, selectedDate);
    },
    [todayWorkItems, selectedDate]
  );

  // Reconciliation
  const runReconciliationForDate = useCallback(
    async (date = selectedDate): Promise<ReconciliationSummary> => {
      const dprForDay = dprRecords.find((d) => d.documentDate === date);
      const workItemsForDay = workItems.filter(
        (wi) => wi.fieldDate === date || wi.updatedAt.slice(0, 10) === date
      );

      const dprItems = dprForDay ? dprForDay.items : [];
      const summary = reconcileDprWithWorkItems(dprItems, workItemsForDay, date);
      setActiveReconciliation(summary);

      if (user) {
        await saveReconciliationRecord(user.uid, summary);
      }
      return summary;
    },
    [dprRecords, workItems, selectedDate, user]
  );

  const resolveReconciliationItem = useCallback(
    async (
      itemId: string,
      action: "created_work_item" | "linked" | "marked_reported" | "dismissed",
      note?: string
    ) => {
      if (!activeReconciliation) return;
      const recItem = activeReconciliation.items.find((i) => i.id === itemId);
      if (!recItem) return;

      const updatedItems = activeReconciliation.items.map((i) => {
        if (i.id === itemId) {
          return {
            ...i,
            resolved: true,
            resolutionAction: action,
            resolutionNote: note,
          };
        }
        return i;
      });

      const updatedSummary: ReconciliationSummary = {
        ...activeReconciliation,
        resolvedCount: updatedItems.filter((i) => i.resolved).length,
        items: updatedItems,
      };

      setActiveReconciliation(updatedSummary);
      if (user) {
        await saveReconciliationRecord(user.uid, updatedSummary);

        // If action is "created_work_item", create a real CentralWorkItem
        if (action === "created_work_item" && recItem.dprItem) {
          const newWorkItem: CentralWorkItem = {
            id: crypto.randomUUID(),
            fieldDate: activeReconciliation.date,
            discipline: recItem.dprItem.discipline || "piping",
            lineId: recItem.dprItem.lineOrArea || "",
            jointId: recItem.dprItem.jointOrTag || "",
            description: recItem.dprItem.activityDescription,
            quantity: typeof recItem.dprItem.todayQty === "number" ? recItem.dprItem.todayQty : 1,
            unit: recItem.dprItem.unit || "ea",
            status: "Complete",
            progress: 100,
            createdFrom: "dpr",
            dprReported: true,
            dprId: recItem.dprId,
            dprDate: activeReconciliation.date,
            remarks: recItem.dprItem.remarks,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await addOrUpdateWorkItem(newWorkItem);
        } else if (action === "marked_reported" && recItem.workItem) {
          await addOrUpdateWorkItem({
            ...recItem.workItem,
            dprReported: true,
            dprDate: activeReconciliation.date,
          });
        }
      }
    },
    [activeReconciliation, user, addOrUpdateWorkItem]
  );

  return (
    <FieldWorkContext.Provider
      value={{
        workItems,
        todayWorkItems,
        dprRecords,
        todayDpr,
        syncState,
        loading,
        selectedDate,
        setSelectedDate,
        addOrUpdateWorkItem,
        updateWorkItemStatus,
        addWorkItemsBulk,
        deleteWorkItem,
        refreshWorkItems,
        saveDpr,
        generateTodayDprDraft,
        activeReconciliation,
        runReconciliationForDate,
        resolveReconciliationItem,
        todayCompletedCount,
        todayInProgressCount,
        needsAttentionCount,
        isDprDraftReady,
      }}
    >
      {children}
    </FieldWorkContext.Provider>
  );
}

export function useFieldWork() {
  const context = useContext(FieldWorkContext);
  if (!context) {
    throw new Error("useFieldWork must be used within a FieldWorkProvider");
  }
  return context;
}

export function useOptionalFieldWork() {
  return useContext(FieldWorkContext);
}
