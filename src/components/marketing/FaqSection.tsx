"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "Does my data train AI models?",
    a: "No. Your documents and engineering inputs are never used to train public models. All calculations and retrievals run in your designated secure sandbox environment. For private deployments, your data remains fully on your network.",
  },
  {
    q: "Can I use OpenAI or my own model?",
    a: "Yes. EPCX is provider-agnostic. You can connect public APIs like OpenAI, Claude, or Google Gemini, utilize private instances, or configure a local model (such as Llama-3 or Mistral) to run completely offline.",
  },
  {
    q: "Can EPCX run on-premise?",
    a: "Yes. We offer fully self-hosted deployment options via Docker or Kubernetes. It can run in air-gapped networks and highly secure control rooms with zero external internet dependencies.",
  },
  {
    q: "Can EPCX integrate with SharePoint?",
    a: "Yes. We support direct connectors for SharePoint, OpenText Documentum, Bentley ProjectWise, and local file storage systems to index and sync your engineering libraries automatically.",
  },
  {
    q: "Can EPCX integrate with ERP systems?",
    a: "Yes. Enterprise customers can integrate document exceptions and verification approvals directly into ERP and scheduling systems like SAP, Oracle Primavera, or Autodesk Construction Cloud.",
  },
  {
    q: "Which engineering documents are supported?",
    a: "We support PDF, DWG/DXF drawings, DOCX specifications, and scanned image files. The system is designed to parse piping class specifications, vendor quote datasheets, P&IDs, isometrics, and inspection packages.",
  },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="section bg-white dark:bg-brand-950" id="faq">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-slate-400 dark:text-slate-500 mb-4">
            <span className="w-6 h-px bg-slate-300 dark:bg-slate-700" />
            FAQ
            <span className="w-6 h-px bg-slate-300 dark:bg-slate-700" />
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white leading-tight tracking-tight">
            Common questions
          </h2>
        </motion.div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className={cn(
                  "w-full flex items-center justify-between gap-4 px-6 py-5 text-left transition-colors",
                  open === i
                    ? "bg-slate-50 dark:bg-slate-900"
                    : "bg-white dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-900/60"
                )}
              >
                <span className="font-semibold text-slate-900 dark:text-white text-sm leading-snug pr-4">
                  {faq.q}
                </span>
                <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  {open === i ? (
                    <Minus className="w-3.5 h-3.5 text-accent-500" />
                  ) : (
                    <Plus className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </div>
              </button>
              <AnimatePresence>
                {open === i && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-5 text-sm text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 pt-4">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
