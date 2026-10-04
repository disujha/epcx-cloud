import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Service notes | EPCX Cloud",
  description: "Scope and review responsibilities for the current EPCX Cloud BillCheck workflow.",
};

export default function TermsPage() {
  return (
    <article className="bg-[#f7f8f6] px-4 pb-16 pt-28 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-800">EPCX Cloud / Service notes</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[#142421]">Using BillCheck</h1>
        <p className="mt-5 text-sm leading-6 text-slate-600">These notes explain the current product scope and review responsibilities for EPCX BillCheck.</p>
        <div className="mt-10 space-y-8 border-t border-slate-300 pt-8 text-sm leading-6 text-slate-700">
          <section><h2 className="font-semibold text-slate-950">Product scope</h2><p className="mt-2">EPCX Cloud provides task workflows for RA bill review, drawing material extraction, work order extraction, TBT record digitization, fit-up photo assistance, and welding photo assistance. Each result is a draft for user review and is subject to the supported input formats and limits shown in the task flow.</p></section>
          <section><h2 className="font-semibold text-slate-950">Review responsibility</h2><p className="mt-2">Match suggestions and quantity flags are aids for review. Check source records, units, mappings and calculations before relying on an export. BillCheck does not certify engineering calculations, approve construction work or replace professional judgment.</p></section>
          <section><h2 className="font-semibold text-slate-950">Access and organization records</h2><p className="mt-2">Use BillCheck through an authorized account and organization. Organization administrators manage editor access. Users should only upload files their organization permits them to process and should follow its retention requirements.</p></section>
          <section><h2 className="font-semibold text-slate-950">Questions</h2><p className="mt-2">For product questions, contact <a className="font-semibold text-accent-800 underline underline-offset-2" href="mailto:support@epcx.cloud">support@epcx.cloud</a>.</p></section>
        </div>
      </div>
    </article>
  );
}
