"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, ClipboardCheck, Plus, ReceiptText } from "lucide-react";
import { useBillCheckWorkspace } from "@/components/billcheck/use-billcheck-workspace";
import { WorkspaceHeader, WorkspaceUnavailable } from "@/components/billcheck/WorkspaceHeader";
import { EditorAccessPanel } from "@/components/billcheck/EditorAccessPanel";
import { createWorkOrder, listRACycles, listWorkOrders, updateOrganizationBillCheckEditors } from "@/lib/billcheck/data";
import type { BillCheckRACycle, BillCheckWorkOrder } from "@/types/firebase";

export default function BillCheckPage() {
  const router = useRouter();
  const workspace = useBillCheckWorkspace();
  const [workOrders, setWorkOrders] = useState<BillCheckWorkOrder[]>([]);
  const [cycleByContract, setCycleByContract] = useState<Record<string, BillCheckRACycle[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({ workOrderNumber: "", clientName: "", projectName: "", date: "", currency: "INR" });

  const loadWorkOrders = useCallback(async () => {
    if (!workspace.organization) return;
    setLoading(true);
    setError("");
    try {
      const items = await listWorkOrders(workspace.organization.id);
      setWorkOrders(items);
      const cycles = await Promise.all(items.map((item) => listRACycles(workspace.organization!.id, item.id)));
      setCycleByContract(Object.fromEntries(items.map((item, index) => [item.id, cycles[index]])));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load work orders.");
    } finally {
      setLoading(false);
    }
  }, [workspace.organization]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadWorkOrders(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadWorkOrders]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!workspace.organization || !workspace.user) return;
    setSaving(true);
    setFormError("");
    try {
      const contractId = await createWorkOrder({
        organizationId: workspace.organization.id,
        createdBy: workspace.user.uid,
        ...form,
      });
      router.push(`/billcheck/${contractId}`);
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "Could not create this work order.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-accent-500 mb-2"><ReceiptText className="w-5 h-5" /><span className="text-xs font-semibold uppercase tracking-wider">EPCX BillCheck</span></div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Work Orders</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Check progress and previous billing before submitting an RA.</p>
        </div>
        {workspace.isEditor && workspace.organization && <button onClick={() => setShowForm((value) => !value)} className="inline-flex items-center gap-2 rounded-xl bg-accent-500 hover:bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white"><Plus className="w-4 h-4" />New Work Order</button>}
      </div>

      <WorkspaceHeader {...workspace} onSelect={workspace.selectOrganization} />
      {workspace.organization && !workspace.isEditor && <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">You can review this organization’s BillCheck records. Ask an organization admin to add you as a BillCheck editor to make changes.</div>}
      {!workspace.organization ? <WorkspaceUnavailable loading={workspace.loading} error={workspace.error} signedIn={Boolean(workspace.user)} /> : <>
        {workspace.isAdmin && workspace.user && <EditorAccessPanel key={workspace.organization.id} organization={workspace.organization} userId={workspace.user.uid} onSave={async (editorIds) => { await updateOrganizationBillCheckEditors(workspace.organization!.id, editorIds); await workspace.refreshOrganizations(); }} />}
        {showForm && workspace.isEditor && <form onSubmit={(event) => void handleCreate(event)} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-brand-900 p-5 shadow-card space-y-4">
          <div><h2 className="font-semibold text-slate-900 dark:text-white">Create a work order</h2><p className="text-xs text-slate-500 mt-1">Add the reference details first. You can import or enter contract items next.</p></div>
          <div className="grid sm:grid-cols-2 gap-3">
            {([
              ["workOrderNumber", "Work order number *", "WO-001"],
              ["clientName", "Client *", "Client name"],
              ["projectName", "Project", "Project or site name"],
              ["date", "Date", ""],
              ["currency", "Currency", "INR"],
            ] as const).map(([key, label, placeholder]) => <label key={key} className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}<input required={key === "workOrderNumber" || key === "clientName"} type={key === "date" ? "date" : "text"} value={form[key]} placeholder={placeholder} onChange={(event) => setForm((previous) => ({ ...previous, [key]: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white" /></label>)}
          </div>
          {formError && <p role="alert" className="flex items-center gap-2 text-sm text-red-500"><AlertCircle className="w-4 h-4" />{formError}</p>}
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button><button disabled={saving} className="px-4 py-2 rounded-lg bg-accent-500 hover:bg-accent-600 disabled:opacity-60 text-sm font-semibold text-white">{saving ? "Creating…" : "Create work order"}</button></div>
        </form>}

        {error && <p role="alert" className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-brand-900 shadow-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 px-5 py-4"><ClipboardCheck className="w-4 h-4 text-accent-500" /><h2 className="font-semibold text-sm text-slate-900 dark:text-white">Active Work Orders</h2></div>
          {loading || workspace.loading ? <div className="px-5 py-12 text-center text-sm text-slate-400">Loading work orders…</div> : workOrders.length === 0 ? <div className="px-5 py-14 text-center"><ReceiptText className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-3" /><p className="font-medium text-slate-700 dark:text-slate-300">No work orders yet</p><p className="text-sm text-slate-400 mt-1">Create one to add your work-order items and start an RA check.</p></div> : <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {workOrders.map((order) => {
              const cycles = cycleByContract[order.id] ?? [];
              const current = [...cycles].reverse().find((cycle) => !["CERTIFIED", "SUBMITTED"].includes(cycle.status)) ?? cycles[cycles.length - 1];
              const issues = (current?.reconciliation?.needsReview ?? 0) + (current?.reconciliation?.blocked ?? 0);
              return <Link key={order.id} href={`/billcheck/${order.id}`} className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr_1fr_0.8fr_0.8fr_auto] items-center gap-3 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <div><p className="font-semibold text-sm text-slate-900 dark:text-white">{order.workOrderNumber}</p><p className="text-xs text-slate-400">{order.clientName}</p></div>
                <span className="text-xs text-slate-500 dark:text-slate-400">{order.projectName || "—"}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{current?.raNumber ?? "No RA cycle"}</span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{current?.status.replaceAll("_", " ") ?? "Work order"}</span>
                <span className={`text-xs font-semibold ${issues ? "text-amber-600" : "text-accent-600"}`}>{issues ? `${issues} issues` : current?.status === "READY_TO_SUBMIT" ? "Ready" : "—"}</span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </Link>;
            })}
          </div>}
        </div>
      </>}
    </div>
  );
}
