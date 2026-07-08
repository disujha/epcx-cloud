"use client";

import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import {
  FileText, Sparkles, FolderOpen, Upload,
  Clock, CheckCircle2, AlertCircle, TrendingUp
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const stats = [
  { label: "Total Documents", value: "0", icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10" },
  { label: "AI Reviews", value: "0", icon: Sparkles, color: "text-accent-500", bg: "bg-accent-500/10" },
  { label: "Projects", value: "0", icon: FolderOpen, color: "text-violet-500", bg: "bg-violet-500/10" },
  { label: "Hours Saved", value: "0", icon: TrendingUp, color: "text-orange-500", bg: "bg-orange-500/10" },
];

const recentDocs = [
  { name: "PIPING-SPEC-10A-REV-C.pdf", status: "completed", time: "Today, 10:32 AM", size: "2.4 MB" },
  { name: "VENDOR-QUOTE-PMP-001.pdf", status: "processing", time: "Today, 09:15 AM", size: "1.1 MB" },
  { name: "ELECTRICAL-SPEC-IS-400.pdf", status: "uploaded", time: "Yesterday, 3:40 PM", size: "890 KB" },
];

const statusConfig = {
  completed: { icon: CheckCircle2, label: "Completed", className: "text-accent-500 bg-accent-500/10" },
  processing: { icon: Clock, label: "Processing", className: "text-blue-500 bg-blue-500/10" },
  uploaded: { icon: Upload, label: "Uploaded", className: "text-slate-500 bg-slate-500/10" },
  error: { icon: AlertCircle, label: "Error", className: "text-red-500 bg-red-500/10" },
};

const quickActions = [
  { href: "/documents/upload", label: "Upload Document", icon: Upload, primary: true },
  { href: "/projects", label: "New Project", icon: FolderOpen, primary: false },
  { href: "/ai-review", label: "Start AI Review", icon: Sparkles, primary: false },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const firstName = user?.displayName?.split(" ")[0] ?? "Engineer";

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          Good morning, {firstName}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Here's an overview of your engineering workspace.
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.07 }}
            className="bg-white dark:bg-brand-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-card"
          >
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-4", stat.bg)}>
              <stat.icon className={cn("w-4.5 h-4.5", stat.color)} strokeWidth={1.75} />
            </div>
            <div className="text-2xl font-bold font-display text-slate-900 dark:text-white">{stat.value}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Documents */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="lg:col-span-2 bg-white dark:bg-brand-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="font-semibold text-slate-900 dark:text-white text-sm">Recent Documents</h2>
            <Link href="/documents" className="text-xs text-accent-500 hover:text-accent-600 font-medium">
              View all
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentDocs.map((doc) => {
              const status = statusConfig[doc.status as keyof typeof statusConfig];
              return (
                <div key={doc.name} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-slate-400" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{doc.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{doc.time} · {doc.size}</div>
                  </div>
                  <span className={cn("flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full flex-shrink-0", status.className)}>
                    <status.icon className="w-3 h-3" />
                    {status.label}
                  </span>
                </div>
              );
            })}
          </div>
          {recentDocs.length === 0 && (
            <div className="py-12 text-center">
              <FileText className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No documents yet</p>
            </div>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="bg-white dark:bg-brand-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card p-6"
        >
          <h2 className="font-semibold text-slate-900 dark:text-white text-sm mb-5">Quick Actions</h2>
          <div className="space-y-3">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className={cn(
                  "flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200",
                  action.primary
                    ? "bg-accent-500 hover:bg-accent-600 text-white shadow-sm"
                    : "border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                <action.icon className="w-4 h-4" strokeWidth={1.75} />
                {action.label}
              </Link>
            ))}
          </div>

          {/* Recent AI Task */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Last AI Task</h3>
            <div className="p-3 rounded-xl bg-accent-500/5 border border-accent-500/20">
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-accent-500" />
                <span className="text-xs font-semibold text-accent-500">Completed</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Summarized PIPING-SPEC-10A-REV-C.pdf — 5 findings
              </p>
              <p className="text-[10px] text-slate-400 mt-1">2 minutes ago</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
