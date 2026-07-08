"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Upload, Search, CheckCircle2, Clock, AlertCircle, Filter } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type DocumentStatus = "uploaded" | "processing" | "completed" | "reviewed" | "error";

interface MockDocument {
  id: string;
  name: string;
  status: DocumentStatus;
  size: string;
  date: string;
  project?: string;
}

const MOCK_DOCS: MockDocument[] = [
  { id: "1", name: "PIPING-SPEC-10A-REV-C.pdf", status: "completed", size: "2.4 MB", date: "Today, 10:32 AM", project: "Refinery TAR 2024" },
  { id: "2", name: "VENDOR-QUOTE-PMP-001.pdf", status: "processing", size: "1.1 MB", date: "Today, 09:15 AM", project: "Pump Skid Package" },
  { id: "3", name: "ELECTRICAL-SPEC-IS-400.pdf", status: "uploaded", size: "890 KB", date: "Yesterday, 3:40 PM" },
  { id: "4", name: "P-ID-AREA-4-REV-B.dwg", status: "reviewed", size: "15.2 MB", date: "Jul 6, 2:00 PM", project: "Refinery TAR 2024" },
  { id: "5", name: "STRUCTURAL-CALC-FRAME-01.pdf", status: "completed", size: "3.1 MB", date: "Jul 5, 11:20 AM" },
];

const statusConfig: Record<DocumentStatus, { icon: typeof Clock; label: string; className: string }> = {
  uploaded: { icon: Upload, label: "Uploaded", className: "text-slate-500 bg-slate-100 dark:bg-slate-800" },
  processing: { icon: Clock, label: "Processing", className: "text-blue-500 bg-blue-500/10" },
  completed: { icon: CheckCircle2, label: "Completed", className: "text-accent-500 bg-accent-500/10" },
  reviewed: { icon: CheckCircle2, label: "Reviewed", className: "text-violet-500 bg-violet-500/10" },
  error: { icon: AlertCircle, label: "Error", className: "text-red-500 bg-red-500/10" },
};

export default function DocumentsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<DocumentStatus | "all">("all");

  const filtered = MOCK_DOCS.filter((d) => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || d.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Documents</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Upload and manage your engineering documents.</p>
        </div>
        <Link
          href="/documents/upload"
          className="flex items-center gap-2 px-4 py-2.5 bg-accent-500 hover:bg-accent-600 text-white font-semibold text-sm rounded-xl transition-all shadow-sm"
        >
          <Upload className="w-4 h-4" />
          Upload
        </Link>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-brand-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-accent-500 transition-colors w-64"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          {(["all", "uploaded", "processing", "completed", "reviewed"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors",
                filter === s
                  ? "bg-accent-500/10 text-accent-500 border border-accent-500/30"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-brand-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800">
              {["Document", "Status", "Project", "Date", "Size"].map((col) => (
                <th key={col} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((doc) => {
              const status = statusConfig[doc.status];
              return (
                <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-slate-400" strokeWidth={1.5} />
                      </div>
                      <span className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-xs">{doc.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full", status.className)}>
                      <status.icon className="w-3 h-3" />
                      {status.label}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">
                    {doc.project ?? "—"}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {doc.date}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">
                    {doc.size}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <FileText className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No documents found</p>
          </div>
        )}
      </div>
    </div>
  );
}
