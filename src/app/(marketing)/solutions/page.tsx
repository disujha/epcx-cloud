import type { Metadata } from "next";
import { SolutionSection } from "@/components/marketing/SolutionSection";

export const metadata: Metadata = {
  title: "Solutions — AI for Engineering Document Review",
  description:
    "Explore how EPCX.cloud AI solutions help EPC teams with document review, specification comparison, vendor analysis, and workflow automation.",
};

export default function SolutionsPage() {
  return (
    <div className="pt-16">
      <div className="bg-brand-950 py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-slate-400 mb-4">
            <span className="w-6 h-px bg-slate-700" />
            Platform
            <span className="w-6 h-px bg-slate-700" />
          </div>
          <h1 className="font-display text-5xl sm:text-6xl font-bold text-white leading-tight tracking-tight mb-5">
            Engineering AI Solutions
          </h1>
          <p className="text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Purpose-built tools for engineering teams who work with complex
            documents, tight specifications, and high-stakes decisions.
          </p>
        </div>
      </div>
      <SolutionSection />
    </div>
  );
}
