"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { pilotConfig, type PilotTool } from "@/lib/firebase/pilot";

const reviewTools: Array<{ id: PilotTool; title: string; description: string; href: string; mark: string }> = [
  { id: "fitup-photo", title: "Fit-up Photo Review", description: "Upload a fit-up photo for structured review notes.", href: "/tools/fitup-photo", mark: "01 / PHOTO" },
  { id: "welding-photo", title: "Welding Photo Review", description: "Organize visible observations for a qualified inspector.", href: "/tools/welding-photo", mark: "02 / PHOTO" },
  { id: "work-order", title: "Work Order Analysis", description: "Review scope, requirements and records in a work order.", href: "/tools/work-order", mark: "03 / DOCUMENT" },
];

type PilotConfig = Awaited<ReturnType<typeof pilotConfig>>;

export function ReviewToolsSection() {
  const [config, setConfig] = useState<PilotConfig | null>(null);

  useEffect(() => {
    let active = true;
    pilotConfig().then((value) => { if (active) setConfig(value); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  return <section className="home-section review-tools-section" id="review-tools">
    <div className="landing-wrap">
      <div className="project-records-heading"><div><p className="eyebrow"><span/>SECONDARY / WHEN NEEDED</p><h2>When you need help, EPCX can review it.</h2></div><p>Your daily workflow works without AI. AI helps when it adds value.</p></div>
      <div className="review-tools-grid">{reviewTools.map((tool) => {
        const available = config?.tools[tool.id]?.enabled !== false && (config?.tools[tool.id]?.maxJobsPerRolling30Days ?? 3) > 0;
        const content = <><span className="review-tool-mark">{tool.mark}</span><b className="review-tool-status">{available ? "AVAILABLE" : "PAUSED"}</b><h3>{tool.title}</h3><p>{tool.description}</p><span className="review-tool-link">Open review <ArrowUpRight size={14}/></span></>;
        return available ? <Link key={tool.id} href={tool.href} className="review-tool-card">{content}</Link> : <article key={tool.id} className="review-tool-card review-tool-paused">{content}</article>;
      })}</div>
    </div>
  </section>;
}
