"use client";

import { motion } from "framer-motion";
import { FolderOpen, Plus, MoreHorizontal, FileText, Calendar } from "lucide-react";
import Link from "next/link";

const MOCK_PROJECTS = [
  { id: "1", name: "Refinery TAR 2024", industry: "Refinery", docs: 24, status: "active", date: "Jun 2024" },
  { id: "2", name: "Pump Skid Package", industry: "Oil & Gas", docs: 8, status: "active", date: "Jul 2024" },
  { id: "3", name: "Power Plant Upgrade", industry: "Power", docs: 42, status: "completed", date: "Mar 2024" },
];

const statusColors: Record<string, string> = {
  active: "text-accent-500 bg-accent-500/10",
  completed: "text-slate-500 bg-slate-100 dark:bg-slate-800",
  archived: "text-slate-400 bg-slate-50 dark:bg-slate-900",
};

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Projects</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Organize documents and reviews by project.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-accent-500 hover:bg-accent-600 text-white font-semibold text-sm rounded-xl transition-all shadow-sm">
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MOCK_PROJECTS.map((proj, i) => (
          <motion.div
            key={proj.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="bg-white dark:bg-brand-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-card hover:shadow-card-hover hover:border-slate-300 dark:hover:border-slate-700 transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-accent-500" strokeWidth={1.75} />
              </div>
              <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{proj.name}</h3>
            <p className="text-xs text-slate-400 mb-4">{proj.industry}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  {proj.docs} docs
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {proj.date}
                </div>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-1 rounded-full capitalize ${statusColors[proj.status]}`}>
                {proj.status}
              </span>
            </div>
          </motion.div>
        ))}

        {/* Empty state / Add new */}
        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-accent-500/50 hover:bg-accent-500/5 transition-all text-slate-400 hover:text-accent-500 min-h-[160px]"
        >
          <Plus className="w-6 h-6" />
          <span className="text-sm font-medium">Create new project</span>
        </motion.button>
      </div>
    </div>
  );
}
