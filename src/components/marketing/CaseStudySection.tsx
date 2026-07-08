"use client";

import { motion } from "framer-motion";
import { TrendingUp, Users, MessageSquare, FolderOpen, CheckCircle } from "lucide-react";

const metrics = [
  { value: "74%", label: "Reduction in technical review durations" },
  { value: "3.2×", label: "Accelerated technical query (TQ) resolution cycles" },
  { value: "100%", label: "Compliance audit trail verification" },
  { value: "12", label: "Construction rework incidents prevented" },
];

const outcomes = [
  {
    icon: TrendingUp,
    title: "Daily Technical Reports",
    desc: "Automatically compiled daily progress summaries from project specifications and inspections, saving engineers 2 hours per shift.",
  },
  {
    icon: Users,
    title: "Management Exception Reports",
    desc: "Project directors obtained instant exception visibility regarding unapproved materials and overdue vendor approvals.",
  },
  {
    icon: MessageSquare,
    title: "Technical Query Drafting",
    desc: "Client-contractor technical query drafts were pre-verified against code records, decreasing engineering response delays.",
  },
  {
    icon: FolderOpen,
    title: "Quality Records Verification",
    desc: "Maintained automated index matching on over 6,000 engineering datasheets and inspection certificates.",
  },
];

export function CaseStudySection() {
  return (
    <section className="section bg-white dark:bg-brand-950 border-t border-slate-100 dark:border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-slate-400 dark:text-slate-500 mb-4">
              <span className="w-6 h-px bg-slate-300 dark:bg-slate-700" />
              Case Study
            </div>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white leading-tight tracking-tight mb-5">
              Industrial Refinery{" "}
              <span className="gradient-text">Turnaround</span>
            </h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
              A midstream contractor deployed our document review tools to evaluate vendor packages and code compliance during a 14-month facility turnaround project.
            </p>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4">
              {metrics.map((m, i) => (
                <motion.div
                  key={m.label}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40"
                >
                  <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1 font-display">
                    {m.value}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 leading-snug">{m.label}</div>
                </motion.div>
              ))}
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
              <CheckCircle className="w-3.5 h-3.5 text-accent-500" />
              Project details verified under NDA. Available on request.
            </div>
          </motion.div>

          {/* Right */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="space-y-5"
          >
            {outcomes.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.08 }}
                className="flex gap-5 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <item.icon className="w-5 h-5 text-accent-500" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1.5">{item.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
