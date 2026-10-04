import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "EPC Case Studies — EPCX Cloud",
  description: "Customer-approved EPCX Cloud case studies will be published here.",
};

export default function CaseStudiesPage() {
  return (
    <section className="bg-slate-50 px-4 pb-20 pt-28 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent-700">Case studies</p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          EPC project stories are coming soon
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
          We’ll share customer-approved workflows and results here when they are ready to publish.
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex min-h-11 items-center justify-center rounded-xl bg-accent-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 motion-reduce:transition-none"
        >
          Choose an EPC task
        </Link>
      </div>
    </section>
  );
}
