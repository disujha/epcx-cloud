"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, PlayCircle, Shield, CheckCircle, AlertTriangle, Layers, FileText } from "lucide-react";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-brand-950 pt-16">
      {/* Background gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-accent-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-brand-700/10 rounded-full blur-3xl" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left — Copy */}
          <div>
            {/* Badge */}
            <motion.div
              custom={0}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-accent-500/30 bg-accent-500/10 text-accent-400 text-xs font-semibold uppercase tracking-wider mb-6"
            >
              Designed for Industrial Engineering Teams
            </motion.div>

            {/* Headline */}
            <motion.h1
              custom={1}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="font-display text-5xl sm:text-6xl lg:text-6xl font-bold text-white leading-[1.08] tracking-tight mb-6"
            >
              Find Risks Before
              <br />
              They Become <span className="gradient-text">Rework</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              custom={2}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="text-lg text-slate-400 leading-relaxed mb-8 max-w-xl"
            >
              Review specifications, compare drawing revisions, validate engineering documents, identify compliance risks, and accelerate engineering decisions using our specialized document intelligence.
            </motion.p>

            {/* Trust signals */}
            <motion.div
              custom={3}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-10 text-xs text-slate-500"
            >
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-accent-500" />
                Supports cloud and private deployments
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-accent-500" />
                Role-based access control & full audit trail
              </div>
            </motion.div>

            {/* CTAs */}
            <motion.div
              custom={4}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="flex flex-wrap items-center gap-4"
            >
              <a
                href="#demo"
                className="inline-flex items-center gap-2 px-6 py-3 bg-accent-500 hover:bg-accent-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-accent-500/20 hover:shadow-accent-500/30 hover:-translate-y-0.5"
              >
                Try Free Demo
                <ArrowRight className="w-4 h-4" />
              </a>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-medium rounded-xl transition-all duration-200 hover:-translate-y-0.5"
              >
                <PlayCircle className="w-4 h-4" />
                Book a Demo
              </Link>
            </motion.div>
          </div>

          {/* Right — Engineering Review Dashboard Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="hidden lg:block"
          >
            <div className="relative">
              {/* Glow */}
              <div className="absolute -inset-4 bg-accent-500/5 rounded-3xl blur-xl" />

              {/* Dashboard card */}
              <div className="relative rounded-2xl border border-slate-700/50 bg-brand-900/80 backdrop-blur-sm overflow-hidden shadow-2xl">
                {/* Top bar */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-accent-500/60" />
                  </div>
                  <div className="flex-1 mx-4 h-5 rounded bg-slate-800/60 flex items-center px-2">
                    <span className="text-[10px] text-slate-500 font-mono">app.epcx.cloud/project-review</span>
                  </div>
                </div>

                {/* Dashboard content */}
                <div className="p-5 space-y-4">
                  {/* Widget 1: Permit Review */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Permit Review</div>
                      <div className="text-sm font-bold text-white mt-1">Refinery TAR Permit #904</div>
                      <div className="text-xs text-red-400 mt-0.5 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        3 checklist items missing
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                        High Risk
                      </span>
                    </div>
                  </div>

                  {/* Widget 2: Specification Comparison */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-2">Specification Comparison</div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <div className="text-slate-400 font-medium">Document A</div>
                        <div className="text-white mt-0.5 font-mono truncate">ASME B31.3 2020</div>
                      </div>
                      <div>
                        <div className="text-slate-400 font-medium">Document B</div>
                        <div className="text-white mt-0.5 font-mono truncate">ASME B31.3 2022</div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center gap-2 text-xs text-slate-400">
                      <Layers className="w-4 h-4 text-accent-500" />
                      <span>14 discrepancies detected in wall thickness & design pressure limits.</span>
                    </div>
                  </div>

                  {/* Widget 3: Compliance Check & AI Findings */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Compliance check</div>
                      <div className="text-lg font-bold text-white mt-1">7 Warnings</div>
                      <div className="text-[10px] text-slate-400 mt-1">Non-compliant clauses flagged</div>
                    </div>
                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Confidence Score</div>
                      <div className="text-lg font-bold text-accent-400 mt-1">98%</div>
                      <div className="text-[10px] text-slate-400 mt-1">Verified audit trail generated</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
