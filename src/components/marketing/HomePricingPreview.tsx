"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, LoaderCircle } from "lucide-react";
import { EpcxSpinner } from "@/components/ui/EpcxSpinner";
import { getPublicBillingPlans, type Entitlements } from "@/lib/billing";

const formatPrice = (minor: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(minor / 100);

export function HomePricingPreview() {
  const [plans, setPlans] = useState<Entitlements[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    void getPublicBillingPlans()
      .then((items) => {
        if (live) setPlans(items.filter((item) => item.active).sort((a, b) => a.amount - b.amount));
      })
      .catch(() => {
        if (live) setPlans([]);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => { live = false; };
  }, []);

  return <section className="bg-[#f7f8f6] px-4 py-16 text-[#172922] sm:px-6 lg:px-8" id="pricing">
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#3d6b55]">Plans for every project</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Start free. Grow with your team.</h2>
          <p className="mt-3 max-w-2xl text-base text-slate-600">See current EPCX plans and choose the workspace that fits your site work.</p>
        </div>
        <Link href="/pricing" className="inline-flex min-h-11 items-center gap-2 border border-slate-300 bg-white px-4 text-sm font-semibold text-[#155b49] hover:border-[#4e8166]">
          View all plan details <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      {loading ? <p className="mt-8 flex items-center gap-2 text-sm text-slate-500"><EpcxSpinner size="xs" inline />Loading plan details</p> : plans.length ? <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => <article key={plan.id} className="flex min-h-48 flex-col border border-slate-200 bg-white p-5">
          <h3 className="font-display text-lg font-semibold">{plan.name}</h3>
          <p className="mt-3 flex items-baseline gap-1 text-slate-700"><span className="text-sm">₹</span><strong className="font-display text-3xl">{formatPrice(plan.amount)}</strong><span className="text-xs text-slate-500">{plan.amount === 0 ? "forever" : "/ month"}</span></p>
          <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-600"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#287052]" />{plan.projectLimit === -1 ? "Multiple projects" : `${plan.projectLimit} ${plan.projectLimit === 1 ? "project" : "projects"}`} · {plan.memberLimit === -1 ? "unlimited members" : `up to ${plan.memberLimit} ${plan.memberLimit === 1 ? "member" : "members"}`}</p>
          <Link href={`/pricing#plan-${plan.id}`} className="mt-auto pt-5 text-sm font-semibold text-[#155b49] underline underline-offset-4">Plan details <span aria-hidden="true">→</span></Link>
        </article>)}
      </div> : <p className="mt-8 border border-slate-200 bg-white p-5 text-sm text-slate-600">Plan details are temporarily unavailable. Visit <Link href="/pricing" className="font-semibold text-[#155b49] underline">pricing</Link> for the latest information.</p>}
    </div>
  </section>;
}
