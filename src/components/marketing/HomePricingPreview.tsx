"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Check,
  Clock,
  CreditCard,
  FileSpreadsheet,
  HardHat,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react";
import { getPublicBillingPlans, type Entitlements, type PlanId } from "@/lib/billing";

const formatPrice = (minor: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(minor / 100);

interface PlanCardConfig {
  id: PlanId;
  name: string;
  badge: string;
  role: string;
  purpose: string;
  defaultMonthlyAmount: number; // in paise
  isPopular?: boolean;
  icon: typeof HardHat;
  iconBg: string;
  iconColor: string;
  features: string[];
  ctaText: string;
  ctaHref: string;
}

const PLAN_CONFIGS: PlanCardConfig[] = [
  {
    id: "free",
    name: "Free",
    badge: "FIELD PILOT",
    role: "Site Engineers & Inspectors",
    purpose: "Evaluate EPCX on real engineering drawings without budget or approval delays.",
    defaultMonthlyAmount: 0,
    icon: HardHat,
    iconBg: "bg-[#eef5f1] border-[#d2e4d7]",
    iconColor: "text-[#286849]",
    features: [
      "1 active project workspace",
      "3 drawings with pinpoint joint markup",
      "5 DPR drafts with photo attachments",
      "Standard OCR text recognition",
      "Daily shift summary PDF export",
    ],
    ctaText: "Start Free Workspace",
    ctaHref: "/start",
  },
  {
    id: "field",
    name: "Field",
    badge: "SITE SUPERVISOR",
    role: "Single Construction Sites",
    purpose: "Everything a field supervisor needs to log daily work and maintain site memory.",
    defaultMonthlyAmount: 199900,
    icon: MapPin,
    iconBg: "bg-[#f4f7f2] border-[#d6e2d4]",
    iconColor: "text-[#24583d]",
    features: [
      "1 project & up to 3 team members",
      "25 engineering drawings & revisions",
      "50 DPRs + TBTs & photo records",
      "Structured tabular OCR extraction",
      "Full Excel & PDF daily registers",
    ],
    ctaText: "Choose Field Plan",
    ctaHref: "/pricing#plan-field",
  },
  {
    id: "project",
    name: "Project",
    badge: "RECOMMENDED FOR TEAMS",
    role: "Full Site & QC Teams",
    purpose: "Connect drawings, DPRs, QA/QC inspections, and subcontractors in one live ledger.",
    defaultMonthlyAmount: 499900,
    isPopular: true,
    icon: Users,
    iconBg: "bg-[#e8f2ec] border-[#b8d7c4]",
    iconColor: "text-[#155b49]",
    features: [
      "1 project & up to 10 team members",
      "Unlimited drawings & revision tracking",
      "Unlimited DPRs, TBTs & photo records",
      "External view-only sharing for clients",
      "Advanced compliance reports & audit logs",
    ],
    ctaText: "Choose Project Plan",
    ctaHref: "/pricing#plan-project",
  },
  {
    id: "company",
    name: "Company",
    badge: "MULTI-PROJECT",
    role: "EPC Contractors & Management",
    purpose: "Centralized governance, multiple project teams, and enterprise audit records.",
    defaultMonthlyAmount: 1499900,
    icon: Building2,
    iconBg: "bg-[#f0f4f2] border-[#d0ded5]",
    iconColor: "text-[#1e3f32]",
    features: [
      "Organization-level administration",
      "Unlimited projects & team members",
      "Central cross-project record exports",
      "High-volume OCR & AI extraction",
      "Priority SLA & dedicated onboarding",
    ],
    ctaText: "Contact Enterprise",
    ctaHref: "/contact",
  },
];

const assurances = [
  {
    icon: ShieldCheck,
    title: "Zero Record Lock-in",
    desc: "Drawings, work items, and DPR records remain permanently accessible even if your plan changes.",
  },
  {
    icon: FileSpreadsheet,
    title: "1-Click Full Export",
    desc: "Export complete Excel registers and audit-ready PDF summary packages anytime you need.",
  },
  {
    icon: Clock,
    title: "Ready in 60 Seconds",
    desc: "Open a drawing or paper DPR and immediately start capturing progress without IT setup.",
  },
  {
    icon: CreditCard,
    title: "Transparent & Flexible",
    desc: "No credit card required to start free. Upgrade, adjust, or cancel without hidden exit penalties.",
  },
];

export function HomePricingPreview() {
  const [plans, setPlans] = useState<Entitlements[]>([]);
  const [isAnnual, setIsAnnual] = useState(false);

  useEffect(() => {
    let live = true;
    void getPublicBillingPlans()
      .then((items) => {
        if (live && items && items.length) {
          setPlans(items.filter((item) => item.active).sort((a, b) => a.amount - b.amount));
        }
      })
      .catch(() => {
        // Fallback data handles display gracefully
      });
    return () => {
      live = false;
    };
  }, []);

  return (
    <section className="border-t border-[#dce3db] bg-[#f6f8f5] py-20 text-[#172922] sm:py-24 lg:py-28" id="pricing">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <p className="field-home-eyebrow justify-center">
            <span />
            TRANSPARENT SITE PRICING
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-[#172922] sm:text-4xl lg:text-5xl">
            Start on the shift. Grow with the site.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#55675f] sm:text-lg">
            Predictable plans engineered for site engineers, QA/QC leads, and multi-project contractors. Every plan keeps your records connected directly to drawings.
          </p>

          {/* Smart Monthly vs Annual Toggle */}
          <div className="mt-8 flex items-center justify-center gap-3 sm:mt-10">
            <span className={`text-xs font-semibold sm:text-sm transition ${!isAnnual ? "text-[#155b49]" : "text-[#6c7d74]"}`}>
              Monthly billing
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isAnnual}
              onClick={() => setIsAnnual(!isAnnual)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#155b49] focus:ring-offset-2 ${
                isAnnual ? "bg-[#155b49]" : "bg-[#cbd5cb]"
              }`}
              title="Toggle billing cadence"
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isAnnual ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <span className={`flex items-center gap-1.5 text-xs font-semibold sm:text-sm transition ${isAnnual ? "text-[#155b49]" : "text-[#6c7d74]"}`}>
              Annual billing
              <span className="inline-block rounded-full bg-[#e3efe6] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#1f6645]">
                Save 20%
              </span>
            </span>
          </div>
        </div>

        {/* 4 Spacious Plan Cards */}
        <div className="mt-12 grid grid-cols-1 items-stretch gap-6 sm:mt-16 sm:grid-cols-2 lg:grid-cols-4 xl:gap-7">
          {PLAN_CONFIGS.map((config) => {
            const livePlan = plans.find((p) => p.id === config.id);
            const baseAmount = livePlan ? livePlan.amount : config.defaultMonthlyAmount;
            const displayAmount = isAnnual && baseAmount > 0 ? Math.round((baseAmount * 0.8) / 100) * 100 : baseAmount;
            const Icon = config.icon;
            const isFeatured = Boolean(config.isPopular);

            return (
              <article
                key={config.id}
                className={`flex flex-col rounded-md bg-white p-6 sm:p-7 xl:p-8 transition-shadow duration-200 ${
                  isFeatured
                    ? "relative border-2 border-[#155b49] shadow-[0_16px_36px_rgba(21,91,73,0.11)]"
                    : "border border-[#d8e1d7] shadow-sm hover:border-[#b8cbb8]"
                }`}
              >
                {/* Popular Pill for Featured Tier */}
                {isFeatured && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#155b49] px-3.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                    Most Popular for EPC
                  </div>
                )}

                {/* Card Header with Icon & Role Badge */}
                <div className="flex items-center justify-between gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-lg border ${config.iconBg} ${config.iconColor}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="rounded border border-[#d6e0d4] bg-[#f7faf7] px-2 py-0.5 font-mono text-[9px] font-bold tracking-wider text-[#3d654d]">
                    {config.badge}
                  </span>
                </div>

                {/* Plan Name & Target Audience */}
                <div className="mt-5">
                  <h3 className="font-display text-2xl font-bold tracking-tight text-[#172922]">{config.name}</h3>
                  <p className="mt-1 text-xs font-semibold text-[#61746b]">{config.role}</p>
                  <p className="mt-2.5 min-h-[38px] text-xs leading-relaxed text-[#52655d]">{config.purpose}</p>
                </div>

                {/* Prominent Price Block */}
                <div className="mt-6 border-t border-[#edf1ec] pt-5">
                  <div className="flex items-baseline gap-1">
                    {baseAmount > 0 ? (
                      <>
                        <span className="text-sm font-semibold text-[#55675f]">₹</span>
                        <strong className="font-display text-4xl font-bold tracking-tight text-[#172922]">
                          {formatPrice(displayAmount)}
                        </strong>
                        <span className="ml-1 text-xs text-[#6c7d74]">
                          {config.id === "company" ? "starting / mo" : "/ month"}
                        </span>
                      </>
                    ) : (
                      <>
                        <strong className="font-display text-4xl font-bold tracking-tight text-[#172922]">₹0</strong>
                        <span className="ml-1.5 text-xs font-semibold text-[#1f6645]">Free forever</span>
                      </>
                    )}
                  </div>
                  <p className="mt-1.5 text-[11px] text-[#718279]">
                    {baseAmount === 0
                      ? "No credit card needed to begin"
                      : isAnnual
                      ? "Billed annually · Save 20% on project cost"
                      : "Billed monthly · Cancel anytime"}
                  </p>
                </div>

                {/* High-Signal Feature List */}
                <ul className="my-6 flex-1 space-y-3 border-t border-[#edf1ec] pt-5">
                  {config.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-xs leading-relaxed text-[#2c3d35]">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#edf5f0] text-[#1f6645]">
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Action CTA Button */}
                <div className="mt-auto space-y-2.5 pt-2">
                  <Link
                    href={config.ctaHref}
                    className={`flex min-h-11 w-full items-center justify-center gap-2 rounded px-4 text-xs font-bold uppercase tracking-wider transition ${
                      isFeatured
                        ? "bg-[#155b49] text-white shadow-sm hover:bg-[#0f4637]"
                        : "border border-[#cbd5cb] bg-white text-[#172922] hover:border-[#155b49] hover:bg-[#f4f7f4]"
                    }`}
                  >
                    <span>{config.ctaText}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <div className="text-center">
                    <Link
                      href={`/pricing#plan-${config.id}`}
                      className="text-[11px] font-semibold text-[#3d654d] underline underline-offset-4 hover:text-[#155b49]"
                    >
                      View detailed limits <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Trust & Field Guarantees Bar */}
        <div className="mt-16 border-t border-[#dce3db] pt-12">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {assurances.map((item) => {
              const ItemIcon = item.icon;
              return (
                <div key={item.title} className="flex items-start gap-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#d2e0d3] bg-[#edf4ee] text-[#1b5e3f]">
                    <ItemIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#172922]">{item.title}</h4>
                    <p className="mt-1 text-xs leading-relaxed text-[#55675f]">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Feature Matrix Link */}
        <div className="mt-12 text-center">
          <p className="text-sm text-[#55675f]">
            Managing large EPC joint-ventures or specialized compliance frameworks?{" "}
            <Link
              href="/pricing"
              className="font-semibold text-[#155b49] underline underline-offset-4 hover:text-[#0d3f32]"
            >
              Compare full plan matrix &amp; user entitlements <ArrowRight className="inline h-3.5 w-3.5" />
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
