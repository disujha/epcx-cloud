import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";

const workLoop = [
  { number: "01", label: "MARK COMPLETION", title: "Tap what got done", description: "Mark joints, work items or activities completed today." },
  { number: "02", label: "WELD / FIT-UP", title: "Record the work", description: "Keep welder, WPS, consumable, date and inspection with the item." },
  { number: "03", label: "REQUEST / TRACK NDT", title: "Carry QC forward", description: "Build requests from completed work and track results, repairs and re-tests." },
  { number: "04", label: "DAILY PROGRESS", title: "Get the DPR", description: "Assemble the day's actual field activity into a report for review." },
];

const disciplines = ["Piping", "Tank", "Structural", "Equipment", "Civil", "Other EPC"];

const dailyRecords = [
  { code: "TBT", title: "Today's briefing", copy: "Add the toolbox talk sheet or photo to the workday." },
  { code: "MIV", title: "Material movement", copy: "Record materials against the drawing or work item." },
  { code: "PHOTO", title: "Site photos", copy: "Keep progress photos with today’s work, drawing and area." },
];

const dprRows = [
  ["Today's progress", "4 / 12 items complete"],
  ["Completed work", "4 items"],
  ["Weld / fit-up", "3 records"],
  ["NDT status", "2 accepted · 1 pending"],
  ["TBT", "Briefing recorded"],
  ["Material / MIV", "2 issues"],
  ["Site photos", "6 associated"],
  ["Pending work", "8 items"],
  ["Exceptions", "1 for review"],
];

const projectRecords = [
  { label: "RA Bill", description: "Periodic quantities and billing checks", href: "/tools/ra-check" },
  { label: "Drawing & document extraction", description: "Structure source details when needed", href: "/tools/drawing-materials" },
  { label: "Material records", description: "Keep issue details against field work", href: "/field-progress" },
  { label: "Work-order records", description: "Review scope, requirements and BOQ", href: "/tools/work-order" },
  { label: "Monthly reconciliation", description: "Compare records across the billing cycle", href: "/billcheck" },
  { label: "Historical project records", description: "Return to drawings and saved project documents", href: "/dashboard/documents" },
];

export function WorkLoopSection() {
  return <section className="home-section work-loop-section" id="work-loop">
    <div className="landing-wrap">
      <div className="section-heading"><p className="eyebrow"><span/>THE DAILY LOOP</p><h2>One drawing. One day&apos;s work. One accurate DPR.</h2><p>Each step adds to the same work record, so field teams don&apos;t have to enter the shift twice.</p></div>
      <div className="work-loop-grid">{workLoop.map((step) => <article key={step.number}><span>{step.number}</span><div><small>{step.label}</small><h3>{step.title}</h3><p>{step.description}</p></div><i aria-hidden="true"><ArrowRight size={15}/></i></article>)}</div>
      <div className="same-record-note"><span className="same-record-line"/><b>ONE DRAWING-BASED WORK RECORD</b><span className="same-record-line"/></div>
    </div>
  </section>;
}

export function PipingExampleSection() {
  return <section className="home-section discipline-section" id="drawings">
    <div className="landing-wrap discipline-layout">
      <div><p className="eyebrow"><span/>PIPING EXAMPLE</p><h2>Your first daily task: mark what got done.</h2><p>Joint completion marking is a clear starting point. The same drawing-based workflow can track different work items across EPC disciplines.</p></div>
      <div className="discipline-panel"><p>THE SAME WORKFLOW APPLIES ACROSS EPC WORK</p><div>{disciplines.map((discipline) => <span key={discipline}>{discipline}</span>)}</div></div>
    </div>
  </section>;
}

export function DailyRecordsSection() {
  return <section className="home-section daily-records-section" id="daily-records">
    <div className="landing-wrap">
      <div className="section-heading"><p className="eyebrow"><span/>SUPPORTING RECORDS / SAME WORKDAY</p><h2>The other daily work stays connected.</h2><p>Keep site records with the drawing, activity and workday they support.</p></div>
      <div className="daily-records-grid">{dailyRecords.map((record) => <article key={record.code}><span>{record.code}</span><h3>{record.title}</h3><p>{record.copy}</p></article>)}</div>
      <p className="records-scope-note">Illustrative workflow areas; availability depends on project setup.</p>
    </div>
  </section>;
}

export function DprPreviewSection() {
  return <section className="home-section dpr-preview-section" id="reports">
    <div className="landing-wrap dpr-preview-layout">
      <div className="dpr-preview-copy"><p className="eyebrow"><span/>THE DAY-END REWARD</p><h2>Do the work once. EPCX builds the record.</h2><p>Your DPR should assemble itself from the work already recorded during the day. Review the shift in one place instead of re-entering it all at night.</p><strong>Capture once. Review the DPR by EOD.</strong><Link href="/start">Open Drawing Workbench <ArrowUpRight size={14}/></Link></div>
      <div className="dpr-preview-card">
        <div className="dpr-preview-head"><div><span>DAILY PROGRESS REPORT</span><b>Field work summary</b></div><i>ILLUSTRATIVE</i></div>
        <div className="dpr-preview-rows">{dprRows.map(([label, value]) => <div key={label}><span>{label}</span><b>{value}</b></div>)}</div>
        <div className="dpr-preview-foot"><span>Prepared from today&apos;s field records</span><b><i/> Ready for review</b></div>
        <div className="dpr-preview-action"><span>Generate DPR</span><ArrowRight size={15}/></div>
      </div>
    </div>
  </section>;
}

export function EngineeringRulesSection() {
  const rules = ["Welder qualification vs process / position", "WPS applicability", "Required inspection and NDT", "NDT completion before release", "Material requirements", "Project-specific checks"];
  return <section className="home-section project-rules-section" id="rules">
    <div className="landing-wrap rules-layout"><div><p className="eyebrow"><span/>PROJECT CONTROL</p><h2>Your project rules stay in control.</h2><p>EPCX applies the engineering logic your project defines, shows the check and leaves approval with qualified people.</p></div><div className="project-rule-list">{rules.map((rule, index) => <div key={rule}><span>{String(index + 1).padStart(2, "0")}</span><b>{rule}</b><i>Deterministic check</i></div>)}</div></div>
  </section>;
}

export function ProjectRecordsSection() {
  return <section className="home-section project-records-section" id="project-records">
    <div className="landing-wrap">
      <div className="project-records-heading"><div><p className="eyebrow"><span/>WHEN YOU NEED THEM</p><h2>Project records, when you need them.</h2></div><p>Occasional and periodic tools support the daily workbench without getting in its way.</p></div>
      <div className="project-records-list">{projectRecords.map((record) => <Link href={record.href} key={record.label}><span><b>{record.label}</b><small>{record.description}</small></span><ArrowUpRight size={15}/></Link>)}</div>
    </div>
  </section>;
}
