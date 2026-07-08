import type { Metadata } from "next";
import { PricingSection } from "@/components/marketing/PricingSection";
import { FaqSection } from "@/components/marketing/FaqSection";

export const metadata: Metadata = {
  title: "Pricing — Starter, Professional & Enterprise",
  description:
    "Simple, transparent pricing for engineering teams. Start free, upgrade as you grow. Enterprise includes private AI deployment.",
};

export default function PricingPage() {
  return (
    <div className="pt-16">
      <PricingSection />
      <FaqSection />
    </div>
  );
}
