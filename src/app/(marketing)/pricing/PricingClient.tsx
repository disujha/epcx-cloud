"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ArrowRight, LoaderCircle } from "lucide-react";
import { EpcxSpinner } from "@/components/ui/EpcxSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { createBillingSubscription, getPublicBillingPlans, openPlanCheckout, type Entitlements } from "@/lib/billing";
import { useProjectWorkspace } from "@/contexts/ProjectWorkspaceContext";

const formatPrice = (minor: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(minor / 100);
const planDetails: Record<string, { purpose: string; features: string[] }> = {
  free: { purpose: "Try EPCX on a real project before paying.", features: ["One active project", "3 drawings and 5 DPRs per period", "Basic work items and OCR", "Basic PDF and Excel export", "Basic project sharing"] },
  field: { purpose: "For a supervisor or site engineer running a site.", features: ["One project and up to 3 users", "25 drawings and 50 DPRs per period", "OCR allowance included", "TBT, photos and full project history", "PDF and Excel reports"] },
  project: { purpose: "For a complete site and project team.", features: ["One project and up to 10 team members", "Higher drawing, DPR and OCR allowances", "Team collaboration and project roles", "External view-only sharing", "Advanced reports and project history"] },
  company: { purpose: "For contractors and EPC companies operating multiple projects.", features: ["Organization-level administration", "Multiple project teams", "Central project records and exports", "Higher OCR and AI allowance", "Priority support"] },
};

export default function PricingClient() {
  const { user } = useAuth(); const router = useRouter(); const { project } = useProjectWorkspace();
  const [plans, setPlans] = useState<Entitlements[]>([]); const [loading, setLoading] = useState(true); const [loadFailed, setLoadFailed] = useState(false); const [retryCount, setRetryCount] = useState(0); const [working, setWorking] = useState(""); const [message, setMessage] = useState("");
  useEffect(() => { let live = true; void getPublicBillingPlans().then((items) => { if (live) setPlans(items.filter((item) => item.active).sort((a, b) => a.amount - b.amount)); }).catch(() => { if (live) { setPlans([]); setLoadFailed(true); } }).finally(() => { if (live) setLoading(false); }); return () => { live = false; }; }, [retryCount]);
  function retryPlans() { setLoading(true); setLoadFailed(false); setRetryCount((count) => count + 1); }
  async function choose(plan: Entitlements) {
    setMessage("");
    if (plan.id === "free") { router.push(user ? "/start" : "/register?redirect=%2Fstart"); return; }
    if (!user) { router.push(`/login?redirect=${encodeURIComponent(`/pricing?plan=${plan.id}`)}`); return; }
    setWorking(plan.id);
    try {
      const session = await createBillingSubscription(plan.id, project?.id);
      await openPlanCheckout(session, async () => { router.push("/start"); }, (reason) => setMessage(reason));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Checkout could not be started. Your current plan remains available."); }
    finally { setWorking(""); }
  }
  return <section className="bg-[#f7f8f6] px-4 pb-20 pt-28 text-[#172922] sm:px-6 lg:px-8">
    <div className="mx-auto max-w-6xl">
      <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#3d6b55]">EPCX plans</p>
      <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">EPCX for every stage of site work</h1>
      <p className="mt-4 text-lg text-slate-600">Start free. Upgrade when your project grows.</p>
      <div className="mt-9 flex flex-wrap gap-3 text-sm"><Link href="/start" className="font-semibold text-[#155b49] underline underline-offset-4">Open field workspace</Link><span className="text-slate-400">·</span><Link href="/start" className="font-semibold text-[#155b49] underline underline-offset-4">Usage in today&apos;s workspace</Link></div>
      {message && <p role="status" className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{message}</p>}
      {loading ? <p className="mt-12 flex items-center gap-2 text-sm text-slate-500"><EpcxSpinner size="xs" inline />Loading plan details…</p> : plans.length ? <div className="mt-10 grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-4">{plans.map((plan) => { const content = planDetails[plan.id]; const featured = plan.id === "project"; return <article id={`plan-${plan.id}`} key={plan.id} className={`flex flex-col border bg-white p-5 ${featured ? "border-[#4e8166] shadow-[0_12px_30px_#163c2414]" : "border-slate-200"}`}>
        {featured && <p className="mb-4 text-[10px] font-bold uppercase tracking-[.16em] text-[#3d6b55]">Best for project teams</p>}
        <h2 className="font-display text-xl font-semibold">{plan.name}</h2><p className="mt-1 min-h-10 text-sm text-slate-600">{content?.purpose ?? "EPCX workspace plan."}</p>
        <p className="mt-5 flex items-baseline gap-1"><span className="text-sm">₹</span><strong className="font-display text-3xl">{formatPrice(plan.amount)}</strong><span className="text-xs text-slate-500">{plan.id === "company" ? "starting / month" : plan.amount === 0 ? "forever" : "/ month"}</span></p>
        <ul className="my-6 flex-1 space-y-3 border-t border-slate-100 pt-5">{(content?.features ?? []).map((feature) => <li key={feature} className="flex items-start gap-2 text-xs leading-5 text-slate-700"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#287052]" />{feature}</li>)}</ul>
        <button disabled={working !== ""} onClick={() => void choose(plan)} className={`flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-semibold transition disabled:opacity-60 ${featured ? "bg-[#155b49] text-white hover:bg-[#0d4939]" : "border border-slate-300 text-slate-800 hover:border-[#4e8166] hover:bg-[#f5f8f5]"}`}>{working === plan.id ? "Starting checkout…" : plan.id === "free" ? "Start free" : `Choose ${plan.name}`}<ArrowRight className="h-4 w-4" /></button>
      </article>; })}</div> : loadFailed ? <div className="mt-10 rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600"><p>We couldn’t load plan details right now. Please try again or <Link href="/contact" className="font-semibold text-[#155b49] underline">contact EPCX</Link>.</p><button onClick={retryPlans} className="mt-3 font-semibold text-[#155b49] underline">Try again</button></div> : <p className="mt-10 rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">Plans are being prepared. <Link href="/contact" className="font-semibold text-[#155b49] underline">Contact EPCX</Link> for current plan information.</p>}
      <div className="mt-8 border-t border-slate-300 pt-5 text-xs leading-5 text-slate-500">No payment details are needed for the Free plan. Changing plans never deletes project records. Paid checkout and activation are confirmed by EPCX billing services.</div>
    </div>
  </section>;
}
