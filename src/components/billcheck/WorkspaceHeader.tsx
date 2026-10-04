"use client";

import { AlertCircle, Building2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { Organization } from "@/types/firebase";

export function WorkspaceHeader({
  organizations,
  organization,
  onSelect,
  isEditor,
  loading,
  error,
}: {
  organizations: Organization[];
  organization: Organization | null;
  onSelect: (id: string) => void;
  isEditor: boolean;
  loading: boolean;
  error: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-brand-900/70 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <Building2 className="w-4 h-4 text-accent-500" />
        {loading ? "Loading your organization…" : organization?.name ?? (error ? "Organization access unavailable" : "No organization access")}
        {!loading && organization && <span className="ml-1 inline-flex items-center gap-1 text-[11px] text-slate-400"><ShieldCheck className="w-3.5 h-3.5" />{isEditor ? "Editor" : "Read only"}</span>}
      </div>
      {organizations.length > 1 && (
        <select value={organization?.id ?? ""} onChange={(event) => onSelect(event.target.value)} aria-label="BillCheck organization" className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-700 dark:text-slate-200">
          {organizations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      )}
      {error && <p role="alert" className="w-full flex items-center gap-2 text-xs text-red-500"><AlertCircle className="w-4 h-4" />Could not load organization membership. {error}</p>}
    </div>
  );
}

export function WorkspaceUnavailable({ loading, error, signedIn }: { loading: boolean; error: string; signedIn: boolean }) {
  if (loading) return <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-brand-900 p-10 text-center text-sm text-slate-500">Loading BillCheck…</div>;
  if (error) return <div className="rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-6 text-sm text-red-600 dark:text-red-400">BillCheck could not load. Check your connection and try again.</div>;
  if (!signedIn) return <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-brand-900 p-10 text-center">
    <h2 className="font-semibold text-slate-900 dark:text-white">Sign in to EPCX Cloud to continue</h2>
    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Sign in with an EPCX Cloud account linked to an organization to prepare and check RA bills.</p>
    <Link href="/login?redirect=%2Fbillcheck" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-accent-600 px-4 text-sm font-semibold text-white hover:bg-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600">Sign in to EPCX Cloud</Link>
    <p className="mt-4 text-xs text-slate-500">Review our <Link href="/privacy" className="font-semibold text-accent-700 underline">file handling details</Link> before importing.</p>
  </div>;
  return <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-brand-900 p-10 text-center">
    <h2 className="font-semibold text-slate-900 dark:text-white">No organization is linked to this EPCX Cloud account</h2>
    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Ask your EPCX organization admin to add you as a member. New accounts do not create an organization automatically. Work orders and billing files stay within the organization.</p>
    <Link href="/contact" className="mt-4 inline-flex min-h-10 items-center rounded-lg border border-slate-200 px-3 text-sm font-semibold text-accent-700 hover:border-accent-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600">Request workspace access</Link>
  </div>;
}
