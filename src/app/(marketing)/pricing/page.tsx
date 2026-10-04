import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Task access | EPCX Cloud",
  description: "Current access details for EPCX Cloud document tasks.",
};

export default function PricingPage() {
  return <section className="bg-[#f7f8f6] px-4 pb-16 pt-28 text-slate-800 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-3xl">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-800">EPCX Cloud / Task access</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[#142421]">Start with free task allowances.</h1>
      <p className="mt-5 text-base leading-7 text-slate-600">Each document task shows its current free allowance for the rolling 30-day window. No payment details are needed to try a task. When its allowance is used, that task pauses as completed jobs pass out of the window.</p>
      <div className="mt-8 border-y border-slate-300 py-6 text-sm leading-6 text-slate-700">
        <p>RA bill preparation and checking in BillCheck is available to signed-in members of an existing EPCX organization. Your organization admin manages membership and editing access.</p>
        <p className="mt-4">New accounts do not create an organization automatically. <Link href="/contact" className="font-semibold text-accent-800 underline underline-offset-2">Contact EPCX Cloud about workspace access</Link>.</p>
      </div>
      <Link href="/#tasks" className="mt-7 inline-flex min-h-11 items-center rounded-md bg-[#0e5549] px-4 text-sm font-semibold text-white hover:bg-[#0a443a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-700 focus-visible:ring-offset-2">See available tasks</Link>
    </div>
  </section>;
}
