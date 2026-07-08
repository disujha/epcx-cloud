"use client";

import { motion } from "framer-motion";
import { Upload, Search, ShieldCheck, AlertTriangle, UserCheck, Download } from "lucide-react";

const steps = [
  {
    icon: Upload,
    title: "1. Upload Document",
    desc: "Drag & drop drawings, specs, codes, or technical bids into the platform.",
  },
  {
    icon: Search,
    title: "2. Document Intelligence Analysis",
    desc: "The system ingests and structure-maps the documents, understanding tables, notations, and parameters.",
  },
  {
    icon: ShieldCheck,
    title: "3. Cross-Check Specs",
    desc: "Automatically checks text and design limits against ASME/API codes and project specifications.",
  },
  {
    icon: AlertTriangle,
    title: "4. Highlight Discrepancies",
    desc: "Flags compliance errors, revision deltas, missing clauses, and non-conforming vendor specs.",
  },
  {
    icon: UserCheck,
    title: "5. Engineer Review",
    desc: "Your engineering lead verifies the flagged findings with an interactive audit-trail view.",
  },
  {
    icon: Download,
    title: "6. Export Verification",
    desc: "Export clean PDF technical bid evaluations, compliance matrices, or drawing check reports.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="section bg-slate-50/50 dark:bg-brand-900/10 border-t border-slate-100 dark:border-slate-900" id="how-it-works">
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
            Process
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white leading-tight tracking-tight">
            How EPCX Works
          </h2>
          <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">
            A structured workflow ensuring human engineering supervision at every verification step.
          </p>
        </motion.div>

        {/* Steps Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 relative">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="group relative p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 hover:shadow-card"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 group-hover:bg-accent-500/10 transition-colors">
                <step.icon className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-accent-500 transition-colors" strokeWidth={1.5} />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-2">{step.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
