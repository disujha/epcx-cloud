import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { deleteObject, ref, uploadBytes } from "firebase/storage";
import { db } from "@/lib/firebase/config";
import { storage } from "@/lib/firebase/config";
import type {
  BillCheckAlias,
  BillCheckImportBatch,
  BillCheckRACycle,
  BillCheckWorkOrder,
  Organization,
} from "@/types/firebase";

export type BillCheckCollection =
  | "contractItems"
  | "clientLines"
  | "aliases"
  | "billingLedger"
  | "raCycles"
  | "imports";

export async function listUserOrganizations(uid: string): Promise<Organization[]> {
  const organizationCollection = collection(db, "organizations");
  const [memberSnapshots, adminSnapshots] = await Promise.all([
    getDocs(query(organizationCollection, where("memberIds", "array-contains", uid))),
    getDocs(query(organizationCollection, where("adminIds", "array-contains", uid))),
  ]);
  const byId = new Map<string, Organization>();
  for (const snapshot of [...memberSnapshots.docs, ...adminSnapshots.docs]) {
    byId.set(snapshot.id, { id: snapshot.id, ...snapshot.data() } as Organization);
  }
  return [...byId.values()].sort((left, right) => left.name.localeCompare(right.name));
}

const contractCollection = (organizationId: string) =>
  collection(db, "organizations", organizationId, "billcheckContracts");
const contractDocument = (organizationId: string, contractId: string) =>
  doc(db, "organizations", organizationId, "billcheckContracts", contractId);
const nestedCollection = (organizationId: string, contractId: string, name: BillCheckCollection) =>
  collection(contractDocument(organizationId, contractId), name);

function safeDocumentId(value: string) {
  return encodeURIComponent(value).replace(/%/g, "_").slice(0, 400) || "empty";
}

export async function getOrganization(organizationId: string): Promise<Organization | null> {
  const snapshot = await getDoc(doc(db, "organizations", organizationId));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Organization) : null;
}

export async function updateOrganizationBillCheckEditors(organizationId: string, editorIds: string[]) {
  await updateDoc(doc(db, "organizations", organizationId), {
    billCheckEditorIds: [...new Set(editorIds)],
    updatedAt: serverTimestamp(),
  });
}

export async function createWorkOrder(input: {
  organizationId: string;
  createdBy: string;
  workOrderNumber: string;
  clientName: string;
  projectName: string;
  currency: string;
  date?: string;
}): Promise<string> {
  const record = await addDoc(contractCollection(input.organizationId), {
    ...input,
    sourceFiles: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return record.id;
}

export async function listWorkOrders(organizationId: string): Promise<BillCheckWorkOrder[]> {
  const snapshot = await getDocs(query(contractCollection(organizationId), orderBy("updatedAt", "desc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as BillCheckWorkOrder);
}

export async function getWorkOrder(organizationId: string, contractId: string): Promise<BillCheckWorkOrder | null> {
  const snapshot = await getDoc(contractDocument(organizationId, contractId));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as BillCheckWorkOrder) : null;
}

export async function updateWorkOrder(
  organizationId: string,
  contractId: string,
  update: Partial<Pick<BillCheckWorkOrder, "workOrderNumber" | "clientName" | "projectName" | "currency" | "date">>
) {
  return updateDoc(contractDocument(organizationId, contractId), {
    ...update,
    updatedAt: serverTimestamp(),
  });
}

export async function listBillCheckRows<T>(
  organizationId: string,
  contractId: string,
  name: BillCheckCollection
): Promise<T[]> {
  const snapshot = await getDocs(query(nestedCollection(organizationId, contractId, name), orderBy("createdAt", "asc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as T);
}

export async function listRACycles(organizationId: string, contractId: string): Promise<BillCheckRACycle[]> {
  return listBillCheckRows<BillCheckRACycle>(organizationId, contractId, "raCycles");
}

export async function createRACycle(input: {
  organizationId: string;
  contractId: string;
  raNumber: string;
  period: string;
  createdBy: string;
}): Promise<string> {
  const record = await addDoc(nestedCollection(input.organizationId, input.contractId, "raCycles"), {
    ...input,
    status: "DRAFT",
    sourceFiles: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return record.id;
}

export async function updateRACycle(
  organizationId: string,
  contractId: string,
  raCycleId: string,
  updates: Partial<BillCheckRACycle>
) {
  return updateDoc(doc(nestedCollection(organizationId, contractId, "raCycles"), raCycleId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function saveRows(
  organizationId: string,
  contractId: string,
  name: Exclude<BillCheckCollection, "imports">,
  rows: Array<Record<string, unknown>>
) {
  for (let start = 0; start < rows.length; start += 400) {
    const batch = writeBatch(db);
    for (const row of rows.slice(start, start + 400)) {
      const reference = doc(nestedCollection(organizationId, contractId, name));
      batch.set(reference, { ...row, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    }
    await batch.commit();
  }
}

export async function updateBillCheckRow(
  organizationId: string,
  contractId: string,
  name: Exclude<BillCheckCollection, "imports">,
  rowId: string,
  updates: Record<string, unknown>
) {
  await updateDoc(doc(nestedCollection(organizationId, contractId, name), rowId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function updateBillCheckRowsBatch(
  organizationId: string,
  contractId: string,
  name: Exclude<BillCheckCollection, "imports">,
  updates: Array<{ id: string; values: Record<string, unknown> }>
) {
  for (let start = 0; start < updates.length; start += 400) {
    const batch = writeBatch(db);
    for (const entry of updates.slice(start, start + 400)) {
      batch.update(doc(nestedCollection(organizationId, contractId, name), entry.id), {
        ...entry.values,
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  }
}

export async function saveConfirmedAlias(input: {
  organizationId: string;
  contractId: string;
  aliasValue: string;
  normalizedAlias: string;
  canonicalLineId: string;
  canonicalLineNumber: string;
  confirmedBy: string;
}) {
  const id = safeDocumentId(input.normalizedAlias);
  const alias: Omit<BillCheckAlias, "id" | "createdAt"> & { createdAt: Timestamp } = {
    ...input,
    createdBy: input.confirmedBy,
    createdAt: Timestamp.now(),
  };
  await setDoc(doc(nestedCollection(input.organizationId, input.contractId, "aliases"), id), alias);
  await updateDoc(contractDocument(input.organizationId, input.contractId), {
    updatedAt: serverTimestamp(),
  });
}

export async function importBillCheckFile(input: {
  organizationId: string;
  contractId: string;
  raCycleId?: string;
  file: File;
  kind: BillCheckImportBatch["kind"];
  importedBy: string;
  mapping: Record<string, string>;
  rowCount: number;
}) {
  const extension = input.file.name.split(".").pop()?.toLowerCase() ?? "";
  const contentTypeByExtension: Record<string, string> = {
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    csv: "text/csv",
    tsv: "text/tab-separated-values",
    txt: "text/plain",
  };
  const contentType = contentTypeByExtension[extension];
  if (!contentType || input.file.size > 10 * 1024 * 1024) {
    throw new Error("Choose a supported spreadsheet or CSV file no larger than 10 MB.");
  }

  const importReference = doc(nestedCollection(input.organizationId, input.contractId, "imports"));
  const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  const storagePath = `organizations/${input.organizationId}/billcheck/${input.contractId}/${importReference.id}/${safeName}`;
  const storageReference = ref(storage, storagePath);
  try {
    await uploadBytes(storageReference, input.file, { contentType });
    await setDoc(importReference, {
      organizationId: input.organizationId,
      contractId: input.contractId,
      raCycleId: input.raCycleId ?? null,
      kind: input.kind,
      fileName: input.file.name,
      storagePath,
      importedBy: input.importedBy,
      createdBy: input.importedBy,
      importedAt: serverTimestamp(),
      rowCount: input.rowCount,
      mapping: input.mapping,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    await deleteObject(storageReference).catch(() => undefined);
    throw error;
  }

  if (input.raCycleId) {
    await updateRACycle(input.organizationId, input.contractId, input.raCycleId, { status: "CHECKING" });
  }
  return { id: importReference.id, storagePath };
}

export function serverImportTrace(input: {
  fileName: string;
  sourceRow: number;
  sourceColumns: Record<string, string>;
  importBatchId: string;
  importedBy: string;
}) {
  return { ...input, importedAt: Timestamp.now() };
}

export async function addWorkOrderSourceFile(organizationId: string, contractId: string, file: {
  fileName: string;
  storagePath: string;
  importBatchId: string;
  importedBy: string;
}) {
  await updateDoc(contractDocument(organizationId, contractId), {
    sourceFiles: arrayUnion({ ...file, importedAt: Timestamp.now() }),
    updatedAt: serverTimestamp(),
  });
}

export async function addCycleSourceFile(
  organizationId: string,
  contractId: string,
  raCycleId: string,
  file: { fileName: string; storagePath: string; importBatchId: string; importedBy: string }
) {
  await updateDoc(doc(nestedCollection(organizationId, contractId, "raCycles"), raCycleId), {
    sourceFiles: arrayUnion({ ...file, importedAt: Timestamp.now() }),
    updatedAt: serverTimestamp(),
  });
}
