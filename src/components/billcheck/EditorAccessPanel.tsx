"use client";

import { useState } from "react";
import { ShieldCheck, Users } from "lucide-react";
import type { Organization } from "@/types/firebase";

export function EditorAccessPanel({ organization, userId, onSave }: {
  organization: Organization;
  userId: string;
  onSave: (editorIds: string[]) => Promise<void>;
}) {
  const [selected, setSelected] = useState<string[]>(organization.billCheckEditorIds ?? []);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const admins = organization.adminIds ?? [];
  const members = [...new Set([...(organization.memberIds ?? []), ...admins])];

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      await onSave(selected);
      setMessage("BillCheck access updated.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Could not update editor access.");
    } finally { setSaving(false); }
  }

  return <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-brand-900 p-5 shadow-card space-y-4">
    <div className="flex items-start gap-3"><div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-2"><Users className="w-4 h-4 text-accent-500" /></div><div><h2 className="font-semibold text-sm text-slate-900 dark:text-white">BillCheck editors</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Organization admins and selected members can create work orders and update billing data. Other members have read-only access.</p></div></div>
    <div className="max-h-52 space-y-2 overflow-y-auto rounded-lg border border-slate-100 dark:border-slate-800 p-3">
      {members.length === 0 ? <p className="text-xs text-slate-400">No members are listed in this organization.</p> : members.map((memberId) => {
        const admin = admins.includes(memberId);
        const checked = admin || selected.includes(memberId);
        return <label key={memberId} className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
          <input type="checkbox" checked={checked} disabled={admin} onChange={(event) => setSelected((previous) => event.target.checked ? [...new Set([...previous, memberId])] : previous.filter((id) => id !== memberId))} className="accent-emerald-600" />
          <span className="min-w-0 flex-1 truncate font-mono">{memberId}</span>
          {admin ? <span className="text-slate-400">Admin</span> : selected.includes(memberId) ? <span className="inline-flex items-center gap-1 text-accent-600"><ShieldCheck className="w-3.5 h-3.5" />Editor</span> : <span className="text-slate-400">Read only</span>}
        </label>;
      })}
    </div>
    <div className="flex items-center justify-between gap-3"><span className="text-xs text-slate-400">Only selected organization members can edit BillCheck.</span><button onClick={() => void save()} disabled={saving || JSON.stringify(selected.slice().sort()) === JSON.stringify((organization.billCheckEditorIds ?? []).slice().sort())} className="rounded-lg bg-accent-500 hover:bg-accent-600 disabled:opacity-40 px-3 py-2 text-xs font-semibold text-white">{saving ? "Saving…" : "Save access"}</button></div>
    {message && <p role="status" className="text-xs text-slate-500">{message}</p>}
    <p className="text-[11px] text-slate-400">Signed in as {userId}</p>
  </section>;
}
