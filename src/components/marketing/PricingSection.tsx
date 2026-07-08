"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Starter Pilot",
    price: "Project Pilot",
    period: "",
    desc: "Evaluate our document verification platform on a single active project package.",
    highlight: false,
    cta: "Book Pilot",
    href: "/contact",
    features: [
      "Up to 5 team members",
      "Single active project space",
      "All core verification modules",
      "Standard index search",
      "Standard document query logs",
      "Email support",
    ],
  },
  {
    name: "Professional",
    price: "Enterprise SaaS",
    period: "",
    desc: "For multi-project teams running daily estimations, compliance audits, and design reviews.",
    highlight: true,
    cta: "Contact Sales",
    href: "/contact",
    features: [
      "Unlimited project spaces",
      "Unlimited team members",
      "Advanced drawing revision comparison",
      "Technical bid evaluation exports",
      "Custom compliance audit matrices",
      "Priority SLA support",
    ],
  },
  {
    name: "Enterprise",
    price: "Private Custom",
    period: "",
    desc: "For large EPC contractors requiring dedicated hosting and custom document adapters.",
    highlight: false,
    cta: "Contact Sales",
    href: "/contact",
    features: [
      "Private Deployment (AWS, Azure, GCP)",
      "Hybrid & Cloud AI configurations",
      "SharePoint & document control system integrations",
      "Custom ERP & estimation adapters",
      "Dedicated support engineers",
      "Custom model training on legacy specifications",
    ],
  },
];

export function PricingSection() {
  return (
    <section className="section bg-slate-50/50 dark:bg-brand-900/20" id="pricing">
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
            Pricing Plans
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white leading-tight tracking-tight">
            Designed for{" "}
            <span className="gradient-text">industrial scale</span>
          </h2>
          <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">
            Deploy as a flexible project pilot or integrate deeply into your global engineering workflow.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 items-start">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={cn(
                "relative rounded-2xl border p-8 transition-all duration-300 min-h-[520px] flex flex-col justify-between",
                plan.highlight
                  ? "border-accent-500/50 bg-gradient-to-b from-white to-accent-500/5 dark:from-brand-900 dark:to-accent-500/10 shadow-xl shadow-accent-500/10 ring-1 ring-accent-500/30"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50"
              )}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white bg-accent-500 rounded-full shadow-sm">
                    Recommended
                  </span>
                </div>
              )}

              <div>
                <div className="mb-6">
                  <h3 className="font-display font-bold text-xl text-slate-900 dark:text-white mb-1">
                    {plan.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">{plan.desc}</p>
                </div>

                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-3xl font-bold text-slate-900 dark:text-white font-display">
                    {plan.price}
                  </span>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-accent-500 flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-slate-600 dark:text-slate-400">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href={plan.href}
                className={cn(
                  "flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200",
                  plan.highlight
                    ? "bg-accent-500 hover:bg-accent-600 text-white shadow-md hover:shadow-glow"
                    : "border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                {plan.cta}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
