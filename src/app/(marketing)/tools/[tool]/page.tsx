import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PilotTaskClient } from "@/components/pilot/PilotTaskClient";
import type { PilotTool } from "@/lib/firebase/pilot";

const tools: PilotTool[] = ["ra-check", "drawing-materials", "work-order", "tbt-register", "fitup-photo", "welding-photo"];
const titles: Record<PilotTool,string> = {
  "ra-check":"RA bill preparation and checking | EPCX Cloud",
  "drawing-materials":"Drawing material extraction | EPCX Cloud",
  "work-order":"Work order extraction | EPCX Cloud",
  "tbt-register":"TBT record digitization | EPCX Cloud",
  "fitup-photo":"Fit-up photo assistance | EPCX Cloud",
  "welding-photo":"Welding photo assistance | EPCX Cloud",
};

export async function generateStaticParams() { return tools.map((tool) => ({ tool })); }
export async function generateMetadata({ params }: { params: Promise<{ tool:string }> }): Promise<Metadata> {
  const { tool } = await params;
  return tools.includes(tool as PilotTool) ? { title:titles[tool as PilotTool] } : {};
}
export default async function PilotToolPage({ params }: { params: Promise<{ tool:string }> }) {
  const { tool } = await params;
  if (!tools.includes(tool as PilotTool)) notFound();
  return <PilotTaskClient tool={tool as PilotTool}/>;
}
