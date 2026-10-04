import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const footerGroups = {
  PRODUCT: [
    { href: "/start", label: "Workspace" }, { href: "/start?view=drawings", label: "Drawing Workbench" }, { href: "/start?view=dpr", label: "DPR" }, { href: "/start?view=today", label: "Daily Records" }, { href: "/start?view=reports", label: "Reports" },
  ],
  FIELD: [
    { href: "/start?view=drawings", label: "Drawings" }, { href: "/start", label: "TBT" }, { href: "/start", label: "Photos" }, { href: "/tools/drawing-materials", label: "Materials" }, { href: "/tools/ra-check", label: "MIV / QA tools" },
  ],
  COMPANY: [
    { href: "/solutions", label: "About EPCX" }, { href: "/contact", label: "Contact" }, { href: "mailto:support@epcx.cloud", label: "Support" },
  ],
  ACCOUNT: [
    { href: "/login?redirect=%2Fstart", label: "Sign in" }, { href: "/start?view=profile", label: "Profile" }, { href: "/start", label: "Workspace" },
  ],
  LEGAL: [
    { href: "/privacy", label: "Privacy" }, { href: "/terms", label: "Terms" },
  ],
};

export function Footer() {
  return <footer className="field-home-footer">
    <div className="field-home-footer-inner">
      <div className="field-home-footer-brand"><b>EPCX<span>.cloud</span></b><p>Field records for EPC and industrial construction.</p></div>
      <div className="field-home-footer-groups">{Object.entries(footerGroups).map(([title,links])=><section key={title}><h2>{title}</h2><ul>{links.map(({href,label})=><li key={`${href}-${label}`}>{href.startsWith("mailto:")?<a href={href}>{label}</a>:<Link href={href}>{label}</Link>}</li>)}</ul></section>)}</div>
      <div className="field-home-footer-note"><p>Field records for EPC and industrial construction — captured where the work happens.</p><a href="mailto:support@epcx.cloud">support@epcx.cloud <ArrowUpRight size={14}/></a></div>
      <div className="field-home-footer-bottom"><span>EPCX.CLOUD <i/> FIELD EXECUTION / PROJECT RECORDS</span><span>© {new Date().getFullYear()} EPCX.cloud</span></div>
    </div>
  </footer>;
}
