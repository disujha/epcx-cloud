"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, ChevronRight, Plus, ReceiptText, Save } from "lucide-react";
import { ImportPanel } from "@/components/billcheck/ImportPanel";
import { WorkspaceHeader, WorkspaceUnavailable } from "@/components/billcheck/WorkspaceHeader";
import { useBillCheckWorkspace } from "@/components/billcheck/use-billcheck-workspace";
import {
  addWorkOrderSourceFile,
  createRACycle,
  getWorkOrder,
  importBillCheckFile,
  listBillCheckRows,
  listRACycles,
  saveRows,
  serverImportTrace,
  updateBillCheckRow,
} from "@/lib/billcheck/data";
import { mappedValue, parseImportNumber, type ImportedTable } from "@/lib/billcheck/imports";
import { normalizeLineNumber } from "@/lib/billcheck/normalization";
import { calculateLineAmount } from "@/lib/billcheck/calculations";
import type { BillCheckContractItem, BillCheckLine, BillCheckRACycle, BillCheckWorkOrder } from "@/types/firebase";

export default function BillCheckWorkOrderPage() {
  const params = useParams<{ contractId: string }>();
  const router = useRouter();
  const contractId = params.contractId;
  const workspace = useBillCheckWorkspace();
  const [workOrder, setWorkOrder] = useState<BillCheckWorkOrder | null>(null);
  const [items, setItems] = useState<BillCheckContractItem[]>([]);
  const [clientLines, setClientLines] = useState<BillCheckLine[]>([]);
  const [cycles, setCycles] = useState<BillCheckRACycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCycleForm, setShowCycleForm] = useState(false);
  const [cycleForm, setCycleForm] = useState({ raNumber: "", period: "" });
  const [newItem, setNewItem] = useState({ itemCode: "", description: "", unit: "", quantity: "", rate: "" });
  const [savedMessage, setSavedMessage] = useState("");

  const load = useCallback(async () => {
    if (!workspace.organization) return;
    setLoading(true);
    setError("");
    try {
      const [order, contractItems, lines, raCycles] = await Promise.all([
        getWorkOrder(workspace.organization.id, contractId),
        listBillCheckRows<BillCheckContractItem>(workspace.organization.id, contractId, "contractItems"),
        listBillCheckRows<BillCheckLine>(workspace.organization.id, contractId, "clientLines"),
        listRACycles(workspace.organization.id, contractId),
      ]);
      setWorkOrder(order);
      setItems(contractItems);
      setClientLines(lines);
      setCycles(raCycles);
      if (!order) setError("This work order could not be found in the selected organization.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load this work order.");
    } finally {
      setLoading(false);
    }
  }, [workspace.organization, contractId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function addImportFile(file: File, kind: "work_order" | "client_lines", table: ImportedTable, mapping: Record<string, string>, rows: Array<Record<string, unknown>>) {
    if (!workspace.organization || !workspace.user) throw new Error("Your organization session is unavailable.");
    const imported = await importBillCheckFile({
      organizationId: workspace.organization.id,
      contractId,
      file,
      kind,
      importedBy: workspace.user.uid,
      mapping,
      rowCount: rows.length,
    });
    await saveRows(workspace.organization.id, contractId, kind === "work_order" ? "contractItems" : "clientLines", rows.map((row) => ({
      organizationId: workspace.organization!.id,
      contractId,
      createdBy: workspace.user!.uid,
      ...row,
      ...(row.source && typeof row.source === "object" ? { source: { ...(row.source as Record<string, unknown>), importBatchId: imported.id } } : {}),
    })));
    const source = { fileName: file.name, storagePath: imported.storagePath, importBatchId: imported.id, importedBy: workspace.user.uid };
    await addWorkOrderSourceFile(workspace.organization.id, contractId, source);
    await load();
    void table;
  }

  async function importItems(file: File, table: ImportedTable, mapping: Record<string, string>) {
    const rows = table.rows.map((row) => {
      const quantity = parseImportNumber(mappedValue(row, table.headers, mapping.quantity), `Row ${row.sourceRow} quantity`);
      const rate = parseImportNumber(mappedValue(row, table.headers, mapping.rate), `Row ${row.sourceRow} rate`);
      const description = mappedValue(row, table.headers, mapping.description).trim();
      if (!description) throw new Error(`Row ${row.sourceRow} needs a description.`);
      const itemCode = mappedValue(row, table.headers, mapping.itemCode).trim();
      const trace = serverImportTrace({ fileName: file.name, sourceRow: row.sourceRow, sourceColumns: Object.fromEntries(Object.entries(mapping).filter(([, column]) => column).map(([field, column]) => [field, column])), importBatchId: "pending", importedBy: workspace.user?.uid ?? "" });
      return { itemCode, description, unit: mappedValue(row, table.headers, mapping.unit).trim(), contractQuantity: quantity, rate, contractAmount: calculateLineAmount(quantity, rate), source: trace };
    });
    await addImportFile(file, "work_order", table, mapping, rows);
    setSavedMessage(`${rows.length} work-order items imported.`);
  }

  async function importClientLines(file: File, table: ImportedTable, mapping: Record<string, string>) {
    const rows = table.rows.map((row) => {
      const original = mappedValue(row, table.headers, mapping.lineNumber).trim();
      if (!original) throw new Error(`Row ${row.sourceRow} has no line number.`);
      const normalized = normalizeLineNumber(original);
      const rawQuantity = mappedValue(row, table.headers, mapping.quantity);
      const trace = serverImportTrace({ fileName: file.name, sourceRow: row.sourceRow, sourceColumns: Object.fromEntries(Object.entries(mapping).filter(([, column]) => column).map(([field, column]) => [field, column])), importBatchId: "pending", importedBy: workspace.user?.uid ?? "" });
      return {
        originalLineNumber: original,
        normalizedLineNumber: normalized.normalized,
        normalizationVersion: normalized.version,
        description: mappedValue(row, table.headers, mapping.description).trim() || undefined,
        unit: mappedValue(row, table.headers, mapping.unit).trim() || undefined,
        quantity: rawQuantity ? parseImportNumber(rawQuantity, `Row ${row.sourceRow} quantity`) : undefined,
        identifiers: {
          ...(mapping.itemCode ? { itemCode: mappedValue(row, table.headers, mapping.itemCode).trim() } : {}),
          ...(mapping.other ? { other: mappedValue(row, table.headers, mapping.other).trim() } : {}),
        },
        source: trace,
      };
    });
    await addImportFile(file, "client_lines", table, mapping, rows);
    setSavedMessage(`${rows.length} client lines imported.`);
  }

  async function handleAddItem() {
    if (!workspace.organization || !workspace.user) return;
    const quantity = Number(newItem.quantity);
    const rate = Number(newItem.rate);
    if (!newItem.description.trim() || !Number.isFinite(quantity) || quantity < 0 || !Number.isFinite(rate) || rate < 0) return;
    setSaving(true);
    try {
      await saveRows(workspace.organization.id, contractId, "contractItems", [{
        organizationId: workspace.organization.id,
        contractId,
        createdBy: workspace.user.uid,
        itemCode: newItem.itemCode.trim(),
        description: newItem.description.trim(),
        unit: newItem.unit.trim(),
        contractQuantity: quantity,
        rate,
        contractAmount: calculateLineAmount(quantity, rate),
      }]);
      setNewItem({ itemCode: "", description: "", unit: "", quantity: "", rate: "" });
      await load();
    } finally { setSaving(false); }
  }

  async function saveItem(item: BillCheckContractItem) {
    if (!workspace.organization) return;
    const quantity = Number(item.contractQuantity);
    const rate = Number(item.rate);
    if (!Number.isFinite(quantity) || quantity < 0 || !Number.isFinite(rate) || rate < 0) return;
    await updateBillCheckRow(workspace.organization.id, contractId, "contractItems", item.id, {
      itemCode: item.itemCode,
      description: item.description,
      unit: item.unit,
      contractQuantity: quantity,
      rate,
      contractAmount: calculateLineAmount(quantity, rate),
    });
    setSavedMessage("Work-order item updated.");
    await load();
  }

  async function makeCycle(event: React.FormEvent) {
    event.preventDefault();
    if (!workspace.organization || !workspace.user) return;
    if (cycles.some((cycle) => cycle.raNumber.toLowerCase() === cycleForm.raNumber.trim().toLowerCase())) {
      setError("That RA number already exists for this work order.");
      return;
    }
    const id = await createRACycle({ organizationId: workspace.organization.id, contractId, createdBy: workspace.user.uid, raNumber: cycleForm.raNumber.trim(), period: cycleForm.period });
    setShowCycleForm(false);
    setCycleForm({ raNumber: "", period: "" });
    router.push(`/billcheck/${contractId}/ra/${id}`);
  }

  const statusClass = (status: string) => status === "READY_TO_SUBMIT" ? "text-accent-600 bg-accent-500/10" : status === "NEEDS_REVIEW" ? "text-amber-600 bg-amber-500/10" : "text-slate-500 bg-slate-500/10";

  return <div className="space-y-6">
    <Link href="/billcheck" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-accent-500"><ArrowLeft className="w-4 h-4" />Back to Work Orders</Link>
    <div className="flex items-start gap-3"><div className="rounded-xl bg-accent-500/10 p-3"><ReceiptText className="w-5 h-5 text-accent-500" /></div><div><p className="text-xs font-semibold uppercase tracking-wider text-accent-500">BillCheck Work Order</p><h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">{workOrder?.workOrderNumber ?? "Work Order"}</h1><p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{workOrder?.clientName}{workOrder?.projectName ? ` · ${workOrder.projectName}` : ""}</p></div></div>
    <WorkspaceHeader {...workspace} onSelect={workspace.selectOrganization} />
    {!workspace.organization ? <WorkspaceUnavailable loading={workspace.loading} error={workspace.error} signedIn={Boolean(workspace.user)} /> : loading ? <div className="text-sm text-slate-400">Loading work order…</div> : error && !workOrder ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div> : <>
      {!workspace.isEditor && <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">Read-only access · ask an organization admin to assign BillCheck editor access for imports and changes.</div>}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-brand-900 p-4"><p className="text-xs text-slate-400">Contract items</p><p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{items.length}</p></div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-brand-900 p-4"><p className="text-xs text-slate-400">Client lines</p><p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{clientLines.length}</p></div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-brand-900 p-4"><p className="text-xs text-slate-400">RA cycles</p><p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{cycles.length}</p></div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-brand-900 p-4"><p className="text-xs text-slate-400">Calculated contract total</p><p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{workOrder?.currency ?? "INR"} {items.reduce((sum, item) => sum + calculateLineAmount(item.contractQuantity, item.rate), 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</p></div>
      </div>

      {workspace.isEditor && <div className="grid xl:grid-cols-2 gap-4">
        <ImportPanel title="Import work-order items" description="Imports append items; quantity × rate is calculated by BillCheck." fields={[
          { key: "itemCode", label: "Item code", keywords: ["item code", "boq code", "item", "code"] },
          { key: "description", label: "Description", required: true, keywords: ["description", "scope", "work description"] },
          { key: "unit", label: "Unit", keywords: ["unit", "uom"] },
          { key: "quantity", label: "Contract quantity", required: true, keywords: ["quantity", "qty", "contract qty"] },
          { key: "rate", label: "Rate", required: true, keywords: ["rate", "unit rate", "price"] },
        ]} onImport={importItems} />
        <ImportPanel title="Import client line list" description="The line number is required. Other columns stay attached to the imported source." fields={[
          { key: "lineNumber", label: "Client line number", required: true, keywords: ["line number", "line no", "line tag", "tag", "pipeline number"] },
          { key: "description", label: "Description", keywords: ["description", "service", "line description"] },
          { key: "unit", label: "Unit", keywords: ["unit", "uom"] },
          { key: "quantity", label: "Client quantity", keywords: ["quantity", "qty", "client qty"] },
          { key: "itemCode", label: "Contract item code", keywords: ["item code", "boq code", "item"] },
          { key: "other", label: "Other identifier", keywords: ["spool", "identifier", "isometric", "drawing"] },
        ]} onImport={importClientLines} />
      </div>}

      {workspace.isEditor && <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-brand-900 shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800"><h2 className="font-semibold text-sm text-slate-900 dark:text-white">Work-order items</h2><p className="text-xs text-slate-400 mt-1">Edit imported rows here; each amount is recalculated as quantity × rate.</p></div>
        <div className="overflow-x-auto"><table className="min-w-[800px] w-full text-xs"><thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500"><tr>{["Code", "Description", "Unit", "Contract qty", "Rate", "Amount", ""].map((item) => <th key={item} className="px-3 py-2.5 text-left font-semibold">{item}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{items.map((item) => <ItemRow key={item.id} item={item} onSave={saveItem} />)}
            <tr><td className="p-2"><input aria-label="New item code" value={newItem.itemCode} onChange={(event) => setNewItem({ ...newItem, itemCode: event.target.value })} className="table-input" placeholder="Item code" /></td><td className="p-2"><input aria-label="New item description" value={newItem.description} onChange={(event) => setNewItem({ ...newItem, description: event.target.value })} className="table-input" placeholder="Description" /></td><td className="p-2"><input aria-label="New item unit" value={newItem.unit} onChange={(event) => setNewItem({ ...newItem, unit: event.target.value })} className="table-input" placeholder="Unit" /></td><td className="p-2"><input aria-label="New item quantity" type="number" min="0" step="any" value={newItem.quantity} onChange={(event) => setNewItem({ ...newItem, quantity: event.target.value })} className="table-input" placeholder="0" /></td><td className="p-2"><input aria-label="New item rate" type="number" min="0" step="any" value={newItem.rate} onChange={(event) => setNewItem({ ...newItem, rate: event.target.value })} className="table-input" placeholder="0" /></td><td className="p-2 text-slate-400">—</td><td className="p-2"><button onClick={() => void handleAddItem()} disabled={saving || !newItem.description || newItem.quantity === "" || newItem.rate === ""} className="p-2 rounded-lg bg-accent-500/10 text-accent-600 hover:bg-accent-500/20 disabled:opacity-40" title="Add item"><Plus className="w-4 h-4" /></button></td></tr>
          </tbody></table></div>
        {items.length === 0 && <p className="px-5 py-5 text-xs text-slate-400">No work-order items yet. Import a spreadsheet or add a row above.</p>}
      </section>}

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-brand-900 shadow-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800"><div><h2 className="font-semibold text-sm text-slate-900 dark:text-white">RA cycles</h2><p className="text-xs text-slate-400 mt-1">Each RA keeps its contractor claim separate from certified quantities.</p></div>{workspace.isEditor && <button onClick={() => setShowCycleForm((open) => !open)} className="inline-flex items-center gap-2 rounded-lg bg-accent-500 hover:bg-accent-600 px-3 py-2 text-xs font-semibold text-white"><Plus className="w-4 h-4" />New RA</button>}</div>
        {showCycleForm && <form onSubmit={(event) => void makeCycle(event)} className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 p-4 border-b border-slate-100 dark:border-slate-800"><label className="text-xs text-slate-500">RA number<input required value={cycleForm.raNumber} onChange={(event) => setCycleForm({ ...cycleForm, raNumber: event.target.value })} placeholder="RA-01" className="mt-1 block w-full table-input" /></label><label className="text-xs text-slate-500">Period / date<input value={cycleForm.period} onChange={(event) => setCycleForm({ ...cycleForm, period: event.target.value })} placeholder="Sep 2026" className="mt-1 block w-full table-input" /></label><button className="self-end rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-white"><Plus className="inline w-4 h-4 mr-1" />Create RA</button></form>}
        {cycles.length === 0 ? <div className="py-10 text-center text-sm text-slate-400">No RA cycle yet.</div> : <div className="divide-y divide-slate-100 dark:divide-slate-800">{[...cycles].reverse().map((cycle) => <Link key={cycle.id} href={`/billcheck/${contractId}/ra/${cycle.id}`} className="flex flex-wrap items-center gap-3 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/40"><div className="rounded-lg bg-accent-500/10 p-2"><CalendarDays className="w-4 h-4 text-accent-500" /></div><div className="flex-1"><p className="font-semibold text-sm text-slate-900 dark:text-white">{cycle.raNumber}</p><p className="text-xs text-slate-400">{cycle.period || "Period not set"}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusClass(cycle.status)}`}>{cycle.status.replaceAll("_", " ")}</span><span className="text-xs text-slate-400">{cycle.reconciliation ? `${cycle.reconciliation.processed} lines · ${cycle.reconciliation.needsReview + cycle.reconciliation.blocked} issues` : "Not checked"}</span><ChevronRight className="w-4 h-4 text-slate-400" /></Link>)}</div>}
      </section>
      {savedMessage && <p role="status" className="text-sm text-accent-600 dark:text-accent-400">{savedMessage}</p>}
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
    </>}
  </div>;
}

function ItemRow({ item, onSave }: { item: BillCheckContractItem; onSave: (item: BillCheckContractItem) => Promise<void> }) {
  const [draft, setDraft] = useState(item);
  const [busy, setBusy] = useState(false);
  const set = (field: keyof BillCheckContractItem, value: string) => setDraft((previous) => ({ ...previous, [field]: field === "contractQuantity" || field === "rate" ? Number(value) : value }));
  return <tr><td className="p-2"><input aria-label="Item code" value={draft.itemCode} onChange={(event) => set("itemCode", event.target.value)} className="table-input" /></td><td className="p-2"><input aria-label="Item description" value={draft.description} onChange={(event) => set("description", event.target.value)} className="table-input min-w-56" /></td><td className="p-2"><input aria-label="Item unit" value={draft.unit} onChange={(event) => set("unit", event.target.value)} className="table-input w-20" /></td><td className="p-2"><input aria-label="Contract quantity" type="number" min="0" step="any" value={draft.contractQuantity} onChange={(event) => set("contractQuantity", event.target.value)} className="table-input w-28" /></td><td className="p-2"><input aria-label="Rate" type="number" min="0" step="any" value={draft.rate} onChange={(event) => set("rate", event.target.value)} className="table-input w-28" /></td><td className="p-2 text-slate-600 dark:text-slate-300 tabular-nums">{calculateLineAmount(Number(draft.contractQuantity), Number(draft.rate)).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td><td className="p-2"><button onClick={async () => { setBusy(true); try { await onSave(draft); } finally { setBusy(false); } }} disabled={busy} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-accent-600 disabled:opacity-50" title="Save item"><Save className="w-4 h-4" /></button></td></tr>;
}
