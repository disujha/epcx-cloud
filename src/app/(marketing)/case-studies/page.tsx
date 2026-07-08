import type { Metadata } from "next";
import { CaseStudySection } from "@/components/marketing/CaseStudySection";

export const metadata: Metadata = {
  title: "Case Studies — EPCX.cloud in Action",
  description:
    "See how EPC teams use EPCX.cloud to improve document control, accelerate engineering reviews, and gain project visibility.",
};

export default function CaseStudiesPage() {
  return (
    <div className="pt-16">
      <div className="bg-brand-950 py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-slate-400 mb-4">
            <span className="w-6 h-px bg-slate-700" />
            Case Studies
            <span className="w-6 h-px bg-slate-700" />
          </div>
          <h1 className="font-display text-5xl sm:text-6xl font-bold text-white leading-tight tracking-tight mb-5">
            Real Projects. Real Results.
          </h1>
          <p className="text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Engineering teams across refinery, power and infrastructure projects
            are using EPCX.cloud to work smarter and faster.
          </p>
        </div>
      </div>
      <CaseStudySection />
    </div>
  );
}
