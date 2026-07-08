"use client";

import { motion } from "framer-motion";
import {
  Search, GitCompare, Quote, ClipboardCheck,
  FileWarning, BarChart2
} from "lucide-react";

const problems = [
  { icon: Search, title: "Searching Specifications", desc: "Hours lost hunting through hundreds of PDF specs for a single clause." },
  { icon: GitCompare, title: "Comparing Drawing Revisions", desc: "Manual side-by-side review of drawing revisions misses critical changes." },
  { icon: Quote, title: "Reviewing Vendor Quotations", desc: "Technical bid evaluations are slow, inconsistent, and error-prone." },
  { icon: ClipboardCheck, title: "QA/QC Documentation", desc: "Quality records scattered across drives and emails with no traceability." },
  { icon: FileWarning, title: "Permit Approvals", desc: "Regulatory permit packages require deep document knowledge to prepare." },
  { icon: BarChart2, title: "Engineering Reporting", desc: "Daily progress and technical reports assembled by hand — slow and inconsistent." },
];

export function ProblemSection() {
  return (
    <section className="section bg-white dark:bg-brand-950 border-t border-slate-100 dark:border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl mb-14"
        >
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-slate-400 dark:text-slate-500 mb-4">
            <span className="w-6 h-px bg-slate-300 dark:bg-slate-700" />
            The Problem
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white leading-tight tracking-tight">
            Engineering teams lose{" "}
            <span className="gradient-text">valuable time</span> every day.
          </h2>
        </motion.div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {problems.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="group p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-900/60 transition-all duration-300 gradient-border"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 group-hover:bg-accent-500/10 dark:group-hover:bg-accent-500/10 transition-colors">
                <item.icon className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-accent-500 transition-colors" strokeWidth={1.5} />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-2 leading-snug">
                {item.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
