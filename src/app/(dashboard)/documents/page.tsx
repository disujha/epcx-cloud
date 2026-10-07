"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, FileText, RefreshCw, Search, Upload } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatBytes } from "@/lib/utils";
import { listUserDocuments, type StoredDocument } from "@/lib/firebase/storage";
import { EpcxSpinner } from "@/components/ui/EpcxSpinner";

export default function DocumentsPage() {
  const { user, loading: authLoading } = useAuth();
  const [listing, setListing] = useState<{ uid: string; documents: StoredDocument[]; error: string }>({ uid: "", documents: [], error: "" });
  const [search, setSearch] = useState("");
  const loading = authLoading || Boolean(user && listing.uid !== user.uid);
  const documents = useMemo(() => listing.uid === user?.uid ? listing.documents : [], [listing, user?.uid]);
  const error = listing.uid === user?.uid ? listing.error : "";

  useEffect(() => {
    let active = true;
    if (authLoading || !user) return;
    void listUserDocuments(user.uid).then((items) => {
      if (active) setListing({ uid: user.uid, documents: items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)), error: "" });
    }).catch(() => {
      if (active) setListing({ uid: user.uid, documents: [], error: "Documents could not be loaded. Check your connection and account access, then try again." });
    });
    return () => { active = false; };
  }, [authLoading, user]);

  const filtered = useMemo(() => documents.filter((document) => document.name.toLowerCase().includes(search.toLowerCase())), [documents, search]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-600 dark:text-accent-400">Your workspace</p>
          <h1 className="mt-2 font-display text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Documents</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">PDF files stored in your account. Uploading a file does not analyze it.</p>
        </div>
        <Link href="/documents/upload" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-600 px-4 text-sm font-semibold text-white hover:bg-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"><Upload className="h-4 w-4" />Upload PDF</Link>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative block w-full max-w-sm">
          <span className="sr-only">Search stored documents</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="search" placeholder="Search file names" value={search} onChange={(event) => setSearch(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-800 dark:bg-brand-900 dark:text-white" />
        </label>
        <p className="text-xs text-slate-500 dark:text-slate-400">Stored files do not expire automatically. Follow your organization&apos;s retention process.</p>
      </div>

      {error && <p role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"><AlertCircle className="h-4 w-4" />{error}</p>}

      <section aria-label="Stored documents" className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-brand-900">
        {loading ? <div className="flex items-center justify-center p-12"><EpcxSpinner size="md" label="Loading stored files…" /></div> : filtered.length === 0 ? <div className="p-12 text-center">
          <FileText className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700" />
          <h2 className="mt-3 font-semibold text-slate-800 dark:text-slate-200">{search ? "No matching files" : "No stored PDFs yet"}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{search ? "Try another file name." : "Uploaded PDFs will appear here. This library does not run document analysis."}</p>
        </div> : <>
          <div className="hidden grid-cols-[1fr_120px_200px] gap-4 border-b border-slate-100 px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:border-slate-800 sm:grid"><span>File</span><span>Size</span><span>Uploaded</span></div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((document) => <li key={document.fullPath} className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_120px_200px] sm:items-center sm:gap-4">
              <div className="flex min-w-0 items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800"><FileText className="h-4 w-4" /></span><span className="min-w-0"><span className="block truncate text-sm font-medium text-slate-900 dark:text-white">{document.name}</span><span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Private workspace file</span></span></div>
              <span className="pl-12 text-xs text-slate-500 dark:text-slate-400 sm:pl-0">{formatBytes(document.size)}</span>
              <time dateTime={document.createdAt} className="pl-12 text-xs text-slate-500 dark:text-slate-400 sm:pl-0">{new Date(document.createdAt).toLocaleString()}</time>
            </li>)}
          </ul>
        </>}
      </section>
    </div>
  );
}
