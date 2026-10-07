import type { Metadata } from "next";
import PricingClient from "./PricingClient";

export const metadata: Metadata = {
  title: "Plans for project field work | EPCX.cloud",
  description: "Start free on a real project. Choose the EPCX plan that fits your site and team.",
};

export default function PricingPage() { return <PricingClient />; }
