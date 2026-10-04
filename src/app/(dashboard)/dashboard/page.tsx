"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ClipboardCheck, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const tasks = [
  { title: "RA bill review", description: "Compare claimed progress with BOQ quantities and rates.", href: "/tools/ra-check" },
  { title: "Drawing material extraction", description: "Turn a selectable drawing schedule into editable material rows.", href: "/tools/drawing-materials" },
  { title: "Work order extraction", description: "Prepare editable work-order fields and BOQ items.", href: "/tools/work-order" },
  { title: "TBT record digitization", description: "Structure toolbox-talk attendance rows for review.", href: "/tools/tbt-register" },
  { title: "Fit-up photo review", description: "Prepare possible observations for a qualified person to review.", href: "/tools/fitup-photo" },
  { title: "Welding photo review", description: "Summarize possible visible features for inspector review.", href: "/tools/welding-photo" },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const firstName = user?.displayName?.trim().split(/\s+/)[0];

  return <div className="space-y-8">
    <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-600 dark:text-accent-400">EPCX Cloud workspace</p>
      <h1 className="mt-2 font-display text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">{firstName ? `Welcome, ${firstName}` : "Your EPC work"}</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">Choose a task and prepare a draft for review.</p>
    </motion.header>

    <section aria-labelledby="task-heading">
      <div className="mb-4 flex items-end justify-between gap-4"><div><h2 id="task-heading" className="font-display text-lg font-semibold text-slate-900 dark:text-white">Your tasks</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Every result is editable and needs human review.</p></div><ClipboardCheck className="hidden h-5 w-5 text-slate-400 sm:block" aria-hidden="true" /></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{tasks.map((task, index) => <motion.div key={task.href} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: index * 0.04 }}><Link href={task.href} className="group block h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition-colors hover:border-accent-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 dark:border-slate-800 dark:bg-brand-900 sm:p-6"><FileText className="h-5 w-5 text-accent-600 dark:text-accent-400" aria-hidden="true"/><h3 className="mt-4 font-semibold text-slate-900 dark:text-white">{task.title}</h3><p className="mt-1.5 text-sm leading-5 text-slate-500 dark:text-slate-400">{task.description}</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-accent-600 dark:text-accent-400">Open task<ArrowRight className="h-4 w-4" aria-hidden="true"/></span></Link></motion.div>)}</div>
    </section>

    <p className="text-sm text-slate-500 dark:text-slate-400">Need your organization&apos;s billing workspace? <Link href="/billcheck" className="font-semibold text-accent-600 underline underline-offset-2">Open BillCheck</Link>.</p>
  </div>;
}
