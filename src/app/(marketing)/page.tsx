import type { Metadata } from "next";
import { HeroSection } from "@/components/marketing/HeroSection";
import { ProblemSection } from "@/components/marketing/ProblemSection";
import { DemoSection } from "@/components/marketing/DemoSection";
import { HowItWorksSection } from "@/components/marketing/HowItWorksSection";
import { SolutionSection } from "@/components/marketing/SolutionSection";
import { IndustriesSection } from "@/components/marketing/IndustriesSection";
import { CaseStudySection } from "@/components/marketing/CaseStudySection";
import { PricingSection } from "@/components/marketing/PricingSection";
import { FaqSection } from "@/components/marketing/FaqSection";

export const metadata: Metadata = {
  title: "EPCX.cloud — Engineering Document Verification for EPC Contractors",
  description:
    "Helping engineering teams make faster, safer and more informed decisions. Review specifications, compare drawing revisions, identify compliance risks and automate technical verification workflows.",
};

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <ProblemSection />
      <DemoSection />
      <HowItWorksSection />
      <SolutionSection />
      <IndustriesSection />
      <CaseStudySection />
      <PricingSection />
      <FaqSection />
    </>
  );
}
