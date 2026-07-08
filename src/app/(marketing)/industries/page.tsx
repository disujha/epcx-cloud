import type { Metadata } from "next";
import { IndustriesSection } from "@/components/marketing/IndustriesSection";

export const metadata: Metadata = {
  title: "Industries — EPC, Oil & Gas, Refinery, Power, Pipeline",
  description:
    "EPCX.cloud serves Oil & Gas, Petrochemical, Refinery, Power, Infrastructure, Pipeline, and Shutdown project teams.",
};

export default function IndustriesPage() {
  return (
    <div className="pt-16">
      <div className="bg-brand-950 py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-slate-400 mb-4">
            <span className="w-6 h-px bg-slate-700" />
            Industries
            <span className="w-6 h-px bg-slate-700" />
          </div>
          <h1 className="font-display text-5xl sm:text-6xl font-bold text-white leading-tight tracking-tight mb-5">
            Built for Heavy Engineering
          </h1>
          <p className="text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto">
            EPCX.cloud understands the complexity of EPC environments — from piping
            specs to P&IDs to vendor data books.
          </p>
        </div>
      </div>
      <IndustriesSection />
    </div>
  );
}
