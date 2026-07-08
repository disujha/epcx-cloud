"use client";

import { motion } from "framer-motion";
import { Flame, Factory, Gauge, Zap, Building2, Wrench, GitBranch, RotateCcw } from "lucide-react";

const industries = [
  { icon: Flame, name: "Oil & Gas", desc: "Upstream, midstream and downstream operations" },
  { icon: Factory, name: "Petrochemical", desc: "Complex process plant specifications" },
  { icon: Gauge, name: "Refinery", desc: "Turnaround and capital project support" },
  { icon: Zap, name: "Power", desc: "Generation and transmission engineering" },
  { icon: Building2, name: "Infrastructure", desc: "Civil and structural engineering projects" },
  { icon: Wrench, name: "Heavy Fabrication", desc: "Structural steel and equipment manufacture" },
  { icon: GitBranch, name: "Pipeline", desc: "Pipeline design, integrity and construction" },
  { icon: RotateCcw, name: "Shutdown Projects", desc: "TAR planning, execution and close-out" },
];

export function IndustriesSection() {
  return (
    <section className="section bg-slate-50/50 dark:bg-brand-900/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mb-14"
        >
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-slate-400 dark:text-slate-500 mb-4">
            <span className="w-6 h-px bg-slate-300 dark:bg-slate-700" />
            Industries
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white leading-tight tracking-tight">
            Built for{" "}
            <span className="gradient-text">heavy engineering</span>
          </h2>
          <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">
            EPCX.cloud is purpose-built for industries where documents are critical
            and mistakes are costly.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {industries.map((ind, i) => (
            <motion.div
              key={ind.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.06 }}
              className="group p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-accent-500/30 hover:shadow-card transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 group-hover:bg-accent-500/10 transition-colors">
                <ind.icon className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-accent-500 transition-colors" strokeWidth={1.5} />
              </div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white mb-1">{ind.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{ind.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
