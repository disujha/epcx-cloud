"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { deletePilotDraft, exportPilotCsv, listPilotDrafts, type PilotResult, type SavedPilotDraft } from "@/lib/firebase/pilot";

export default function PilotDraftsPage() {
  const { user } = useAuth();
  const [drafts, setDrafts] = useState<SavedPilotDraft[]>([]);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!user || user.isAnonymous) return;
    try {
      setDrafts(await listPilotDrafts());
      setError("");
    } catch {
      setError("Saved drafts could not be loaded.");
    }
  }, [user]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  async function remove(id: string) {
    try {
      await deletePilotDraft(id);
      await refresh();
    } catch {
      setError("That saved draft could not be deleted.");
    }
  }

  function download(result: PilotResult) {
    const blob = new Blob(["\uFEFF", exportPilotCsv(result)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = result.tool + "-saved-review.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-full">
      <p className="text-[10px] font-bold uppercase tracking-[.2em] text-accent-800">EPCX Cloud / Saved drafts</p>
      <h1 className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">Your saved drafts</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">These are personal review copies. Saving does not create or approve an official EPC project record.</p>
      {error && <p role="alert" className="mt-5 text-sm text-red-700">{error}</p>}
      {drafts.length === 0 && !error && <p className="mt-8 border border-slate-200 bg-white p-5 text-sm text-slate-600 dark:bg-brand-900 dark:text-slate-300">No saved drafts yet.</p>}
      <div className="mt-6 space-y-3">
        {drafts.map((draft) => (
          <article key={draft.id} className="border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-brand-900">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-accent-700">{draft.tool}</p>
                <h2 className="mt-1 text-lg font-semibold">{draft.title}</h2>
                <p className="mt-1 text-xs text-slate-500">Saved {draft.savedAtMillis ? new Date(draft.savedAtMillis).toLocaleString() : "just now"} · {draft.result.rows.length} review rows</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => download(draft.result)} className="inline-flex min-h-10 items-center gap-2 border border-slate-300 px-3 text-sm"><Download size={15} /> CSV</button>
                <button type="button" onClick={() => void remove(draft.id)} aria-label="Delete saved draft" className="inline-flex min-h-10 min-w-10 items-center justify-center border border-slate-300 text-red-700"><Trash2 size={15} /></button>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{draft.result.summary}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
