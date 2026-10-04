import type { Metadata } from "next";
import { HeroSection } from "@/components/marketing/HeroSection";
import { WorkspaceSupportSections } from "@/components/marketing/WorkspaceSupportSections";
import { PublicScrollMotion } from "@/components/marketing/PublicScrollMotion";

export const metadata: Metadata = {
  title: "EPCX.cloud | Field records for EPC and industrial sites",
  description: "Capture site work from the drawings and daily reports teams already use. Connect drawings, DPRs, toolbox talks and photos in one EPCX field workspace.",
};

export default function HomePage() {
  return <div className="landing-page">
    <PublicScrollMotion />
    <HeroSection />
    <WorkspaceSupportSections />
  </div>;
}
