"use client";

import { motion } from "framer-motion";
import {
  FileText, GitCompare, Search, CheckCircle, Eye, Database, Workflow
} from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: FileText,
    title: "Engineering Review",
    desc: "Comprehensive technical review of engineering specifications, data sheets, and project documents to identify technical inconsistencies.",
    highlight: true,
  },
  {
    icon: GitCompare,
    title: "Document Comparison",
    desc: "Instantly compare revisions of specifications, drawings, and standards, flagging design discrepancies and structural alterations.",
    highlight: false,
  },
  {
    icon: Search,
    title: "Specification Search",
    desc: "Context-aware semantic search across your entire project archive. Retrieve standard reference clauses and piping specifications immediately.",
    highlight: false,
  },
  {
    icon: Eye,
    title: "Drawing Intelligence",
    desc: "Extract and cross-reference tag numbers, line lists, and equipment specifications directly from P&IDs and isometrics.",
    highlight: false,
  },
  {
    icon: CheckCircle,
    title: "Compliance Validation",
    desc: "Cross-check vendor quotes, material certifications, and subcontractor packages against main contract specifications to flag deviations.",
    highlight: false,
  },
  {
    icon: Database,
    title: "Engineering Knowledge Base",
    desc: "Consolidate institutional lessons learned, legacy specifications, and standard datasheets into a single searchable repository.",
    highlight: false,
  },
  {
    icon: Workflow,
    title: "Workflow Automation",
    desc: "Automate repetitive document workflows, including technical query drafting, RFI routing, and progress reporting compilation.",
    highlight: false,
  },
];

export function SolutionSection() {
  return (
    <section className="section bg-slate-50/50 dark:bg-brand-900/30" id="solutions">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mb-14"
        >
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-slate-400 dark:text-slate-500 mb-4">
            <span className="w-6 h-px bg-slate-300 dark:bg-slate-700" />
            Capabilities
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white leading-tight tracking-tight">
            Designed for{" "}
            <span className="gradient-text">Engineering Verification</span>
          </h2>
          <p className="mt-4 text-lg text-slate-500 dark:text-slate-400 leading-relaxed">
            A precise document intelligence platform built specifically for EPC contractors, engineering estimators, and QA/QC reviewers.
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className={cn(
                "group p-6 rounded-2xl border transition-all duration-300",
                feat.highlight
                  ? "border-accent-500/30 bg-gradient-to-br from-accent-500/5 to-brand-700/5 dark:from-accent-500/10 dark:to-brand-900/50 hover:border-accent-500/50 md:col-span-2 lg:col-span-1"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-card"
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center mb-5 transition-colors",
                  feat.highlight
                    ? "bg-accent-500/15 group-hover:bg-accent-500/25"
                    : "bg-slate-100 dark:bg-slate-800 group-hover:bg-accent-500/10 dark:group-hover:bg-accent-500/10"
                )}
              >
                <feat.icon
                  className={cn(
                    "w-5 h-5 transition-colors",
                    feat.highlight
                      ? "text-accent-500"
                      : "text-slate-500 dark:text-slate-400 group-hover:text-accent-500"
                  )}
                  strokeWidth={1.5}
                />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2 leading-snug">
                {feat.title}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {feat.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
