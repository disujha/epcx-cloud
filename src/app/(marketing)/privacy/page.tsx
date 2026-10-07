import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy and data handling | EPCX Cloud",
  description: "How EPCX Cloud handles task uploads, saved drafts, and organization documents.",
};

export default function PrivacyPage() {
  return <article className="bg-[#f7f8f6] px-4 pb-16 pt-28 text-slate-800 sm:px-6 lg:px-8"><div className="mx-auto max-w-3xl">
    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-800">EPCX Cloud / Data handling</p>
    <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[#142421]">Privacy and your documents</h1>
    <p className="mt-5 text-sm leading-6 text-slate-600">A clear overview of how EPCX Cloud handles task uploads, saved drafts, and organization documents.</p>
    <div className="mt-10 space-y-8 border-t border-slate-300 pt-8 text-sm leading-6 text-slate-700">
      <section><h2 className="font-semibold text-slate-950">Task uploads</h2><p className="mt-2">Task uploads are kept separate from your organization&apos;s documents. Inputs are scheduled for deletion after 30 days and generated results after 7 days. RA bill checks and TBT spreadsheet digitization use rule-based processing and do not send files to EPCX AI. Drawing, work-order, and photo tasks use EPCX AI to interpret relevant document content or images. These tasks send relevant content to an external AI service provider for processing. Only upload material you are permitted to share with that provider.</p></section>
      <section><h2 className="font-semibold text-slate-950">Organization records</h2><p className="mt-2">BillCheck imports XLSX, CSV, and TSV files up to 10 MB. Access is limited to signed-in organization members with the appropriate permissions. Organization documents and Field Progress records remain available until your organization applies its records policy; ask your organization administrator about retention.</p></section>
      <section><h2 className="font-semibold text-slate-950">Saved drafts and workspace files</h2><p className="mt-2">When you sign in and save a task draft, the edited result stays in your private EPCX Cloud workspace until you delete it. Saving a draft does not create an official project record. PDF files uploaded to your workspace are not analyzed automatically and do not expire automatically.</p></section>
      <section><h2 className="font-semibold text-slate-950">AI assisted results</h2><p className="mt-2">EPCX AI output is an unverified draft for human review. EPCX does not use customer files to train a model by default. The external AI provider&apos;s service terms apply to content sent for AI processing. EPCX Cloud does not make payment, fraud, engineering acceptance, or safety certification decisions.</p></section>
      <section><h2 className="font-semibold text-slate-950">Questions and deletion requests</h2><p className="mt-2">For questions about EPCX Cloud data or a deletion request, contact <a className="font-semibold text-accent-800 underline underline-offset-2" href="mailto:support@epcx.cloud">support@epcx.cloud</a>.</p></section>
    </div>
  </div></article>;
}
