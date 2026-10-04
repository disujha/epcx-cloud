import Link from "next/link";
import Image from "next/image";
import { ArrowDown, ArrowRight, BookOpen, CalendarDays, Check, CheckCircle2, CircleDashed, ClipboardList, FileSpreadsheet, FileText, Image as ImageIcon, PenLine, RotateCw, ScanText, Search, ShieldCheck, Upload, ZoomIn } from "lucide-react";

const dayStages = [
  ["START", "Open the drawing or today’s DPR.", "Pick up the records already used on site."],
  ["CAPTURE", "Mark work where it happened.", "Update work items against the engineering drawing."],
  ["CONNECT", "Keep records with the day’s work.", "Add DPR, TBT, photos and supporting documents."],
  ["REVIEW", "Find the record again later.", "Review by day or export when the project needs it."],
];

const roles = [
  ["SUPERVISOR", "Stop rebuilding the day from memory.", "Mark work while you are on site and keep the day’s records together."],
  ["SITE IN-CHARGE", "Know what moved today.", "See drawings, DPRs, TBTs and records by date and work area."],
  ["QC / ENGINEERING", "Keep the evidence with the work.", "Review drawing marks, revisions and supporting records together."],
  ["RCM / PROJECT MANAGER", "See progress without chasing the site.", "Use field records to understand what happened and what remains."],
];

const timeline = [
  ["04 OCT", "Drawing P-102", "DPR", "TBT", "6 Photos"],
  ["03 OCT", "Drawing P-102 Rev 03", "DPR", "TBT", "4 Photos"],
  ["02 OCT", "Drawing P-101", "DPR", "TBT", ""],
];

const recordChain = ["DRAWING", "WORK ITEMS", "DPR", "TBT", "PHOTOS", "DAILY RECORD"];

export function WorkspaceSupportSections() {
  return <>
    <section className="field-home-day" id="how-it-works">
      <div className="field-home-section-head"><p className="field-home-eyebrow"><span/>A DAY ON SITE</p><h2>One shift. One working record.</h2><p>Capture once. Keep it connected. Find it later.</p></div>
      <div className="field-home-stages">{dayStages.map(([label,title,text],index)=><article key={label} className="field-home-stage" data-scroll-reveal="stage"><div className="field-home-stage-index"><span>0{index+1}</span><i/></div><p>{label}</p><h3>{title}</h3><span>{text}</span></article>)}</div>
    </section>

    <section className="field-home-drawing-story" id="product">
      <div className="field-home-drawing-story-inner">
        <div className="field-home-drawing-story-copy" data-scroll-reveal="side"><p className="field-home-eyebrow"><span/>DRAWING WORKBENCH</p><h2>Work where the work happens.</h2><p>Mark progress directly on the engineering drawing instead of reconstructing it later from notes. EPCX adds a field-record layer around engineering work; it does not replace CAD.</p><div className="field-home-workbench-tools"><span><ZoomIn size={15}/>Zoom</span><span><RotateCw size={15}/>Rotate</span><span><PenLine size={15}/>Markup</span></div><div className="field-home-status-list"><span data-scroll-reveal="detail"><i className="status-complete"/><b>J-014</b><small>Complete</small><Check size={15}/></span><span data-scroll-reveal="detail"><i className="status-progress"/><b>J-017</b><small>In progress</small><CircleDashed size={14}/></span><span data-scroll-reveal="detail"><i className="status-pending"/><b>J-018</b><small>Pending</small><span/></span></div><p className="field-home-drawing-promise">Drawing revision, work items and today’s progress — together in one field view.</p></div>
        <div className="field-home-drawing-panel" data-scroll-reveal="side"><div className="field-home-panel-bar"><span>P-102 · REV 03 <i/> PIPE RACK NORTH</span><span>EXAMPLE VIEW</span></div><div className="field-home-panel-image"><Image src="/images/fitup.jpg" alt="Engineering line drawing of a pipe fit-up" width={817} height={459}/><span className="panel-joint joint-a">J-014 <b>Complete</b></span><span className="panel-joint joint-b">J-017 <b>In progress</b></span><span className="panel-joint joint-c">J-018 <b>Pending</b></span></div><div className="field-home-panel-footer"><span>12 work items · 7 completed today</span><b>J-017 · Update status <ArrowRight size={14}/></b></div></div>
      </div>
    </section>

    <section className="field-home-audience-section" id="field-teams">
      <div className="field-home-audience-inner"><div className="field-home-section-head align-left" data-scroll-reveal="side"><p className="field-home-eyebrow"><span/>FOR THE PEOPLE KEEPING THE RECORD</p><h2>Built around the real work of the field team.</h2></div><div className="field-home-roles">{roles.map(([title,headline,text],index)=><article key={title} data-scroll-reveal="detail"><span>0{index+1}</span><div><small>{title}</small><h3>{headline}</h3><p>{text}</p></div></article>)}</div></div>
    </section>

    <section className="field-home-pain" id="examples">
      <div className="field-home-pain-inner"><div className="field-home-pain-copy" data-scroll-reveal="pain"><p className="field-home-eyebrow"><span/>THE WORK ALREADY EXISTS</p><h2>The work happens on site.<br/><em>The records get scattered.</em></h2><p>Drawings, WhatsApp photos, Excel sheets, PDF DPRs, TBT forms and phone notes each hold part of the story. At the end of the shift, someone has to join it all back together.</p><strong>EPCX connects the records around the work and date.</strong></div>
        <div className="field-home-before-after" data-scroll-reveal="side"><article className="field-home-scattered"><header>BEFORE <span>Scattered</span></header><span><BookOpen size={15}/>Drawing</span><i>+</i><span><ImageIcon size={15}/>WhatsApp photos</span><i>+</i><span><FileSpreadsheet size={15}/>Excel</span><i>+</i><span><FileText size={15}/>PDF DPR</span><i>+</i><span><ShieldCheck size={15}/>TBT sheet</span><i>+</i><span><ClipboardList size={15}/>Phone notes</span></article><div className="field-home-compare-arrow"><ArrowRight size={18}/></div><article className="field-home-together"><header>WITH EPCX <span>Connected by day &amp; work</span></header>{recordChain.map((record,index)=><div key={record}><span>{index===0?<BookOpen size={15}/>:index===2?<FileText size={15}/>:index===3?<ShieldCheck size={15}/>:index===4?<ImageIcon size={15}/>:index===5?<CheckCircle2 size={15}/>:<PenLine size={15}/>}</span><b>{record}</b>{index<recordChain.length-1&&<i/>}</div>)}</article></div>
      </div>
    </section>

    <section className="field-home-dpr-spotlight">
      <div className="field-home-dpr-inner"><article className="field-home-dpr-preview" data-scroll-reveal="side"><header><span>DAILY PROGRESS REPORT</span><b>FIELD RECORD · EXAMPLE</b></header><div className="field-home-dpr-fields"><div><small>DATE</small><b>04 Oct 2026</b></div><div><small>PROJECT / SITE</small><b>Haven Petrochemical Expansion</b></div><div><small>DRAWING / AREA</small><b>P-102 · Pipe rack north</b></div><div><small>WORK COMPLETED</small><b>Joint fit-up · J-014</b></div><div><small>WORK IN PROGRESS</small><b>Welding · J-017</b></div><div><small>MANPOWER</small><b>38 recorded</b></div><div><small>TBT</small><b>Attached</b></div><div><small>PHOTOS</small><b>6 attached</b></div><div className="dpr-remarks"><small>REMARKS</small><b>Access platform ready for next work area.</b></div></div><footer><Check size={14}/>Source document retained with the record</footer></article><div className="field-home-dpr-copy" data-scroll-reveal="side"><p className="field-home-eyebrow"><span/>DAILY RECORDS</p><h2>Keep the day’s record with the work.</h2><p>Upload the DPR your team already uses, or build the day’s review from the field records captured on site. Start with a drawing, an existing DPR, TBT, photos or another project record.</p><Link href="/start?view=dpr&add=dpr" className="field-home-inline-link">Upload a DPR <ArrowRight size={15}/></Link></div></div>
    </section>

    <section className="field-home-document-intel">
      <div className="field-home-intel-inner"><div className="field-home-intel-copy" data-scroll-reveal="side"><p className="field-home-eyebrow"><span/>DOCUMENT REVIEW</p><h2>Turn documents into usable records.</h2><p>For supported PDFs, EPCX can extract document text and help identify details such as date, project, manpower, quantities, drawing number and revision. Review what was detected, then confirm it before it becomes part of the record.</p></div><div className="field-home-extract-flow" data-scroll-reveal="card"><div className="field-home-extract-document"><span><FileText size={17}/>UPLOADED DPR · PDF</span><i>04 OCT 2026</i><b>Daily Progress Report</b><small>Project: Haven Petrochemical Expansion</small><small>Drawing: P-102 · Rev 03</small><small>Manpower: 38</small><div className="extract-highlight">Work quantity: 12 joints</div></div><div className="field-home-extract-arrow"><ArrowRight size={17}/></div><div className="field-home-extract-result"><b>DETECTED DETAILS</b><span>Date <strong>04 Oct 2026</strong></span><span>Project <strong>Haven Petrochemical…</strong></span><span>Manpower <strong>38</strong></span><span>Drawing / Rev <strong>P-102 · 03</strong></span><footer><span>1 EXTRACT</span><i/><span>2 REVIEW</span><i/><span>3 CONFIRM</span></footer></div></div></div>
    </section>

    <section className="field-home-timeline-section">
      <div className="field-home-timeline-inner"><div className="field-home-timeline-copy" data-scroll-reveal="side"><p className="field-home-eyebrow"><span/>DATE-FIRST ORGANIZATION</p><h2>Find the day again.</h2><p>Records stay organized by date, project and work — without asking the field team to build a complicated filing system.</p></div><div className="field-home-timeline" data-scroll-reveal="side"><header><CalendarDays size={15}/>OCTOBER 2026 <span>PROJECT RECORD</span></header>{timeline.map(([date,drawing,dpr,tbt,photos],index)=><article key={date} data-scroll-reveal="detail"><time>{date}</time><div className="field-home-timeline-items"><span><BookOpen size={14}/>{drawing}</span><span><FileText size={14}/>{dpr}</span><span><ShieldCheck size={14}/>{tbt}</span>{photos&&<span><ImageIcon size={14}/>{photos}</span>}</div><b>{index===0?"TODAY":""}</b></article>)}</div></div>
    </section>

    <section className="field-home-day-result">
      <div className="field-home-result-inner"><div className="field-home-result-copy" data-scroll-reveal="side"><p className="field-home-eyebrow"><span/>END OF SHIFT · READY TO REVIEW</p><h2>Know what happened today before you leave site.</h2><p>One view of the day’s work, source documents and progress — ready for a supervisor or project team to review.</p></div>
        <article className="field-home-today-card" data-scroll-reveal="card"><header><span><i/>TODAY AT SITE</span><b>04 OCT 2026</b></header><div className="field-home-today-project"><small>PROJECT</small><b>Haven Petrochemical Expansion</b></div><div className="field-home-today-drawing"><span><BookOpen size={17}/><b>P-102 <small>Rev 03</small></b></span><strong>15 work items</strong></div><div className="field-home-progress-track"><i/><i/><i/></div><div className="field-home-counts"><span><b>8</b> completed</span><span><b>3</b> in progress</span><span><b>4</b> open</span></div><div className="field-home-today-records"><span><FileText size={15}/>DPR <b>Uploaded</b></span><span><ShieldCheck size={15}/>TBT <b>Recorded</b></span><span><ImageIcon size={15}/>Site photos <b>6</b></span><span><Check size={15}/>Drawing updates <b>8</b></span></div><footer><Check size={16}/>Ready for review <small>EXAMPLE RECORD</small></footer></article>
      </div>
    </section>

    <section className="field-home-outputs"><div className="field-home-outputs-inner"><div data-scroll-reveal="side"><p className="field-home-eyebrow"><span/>OUTPUTS WHEN YOU NEED THEM</p><h2>When the record is ready, take it with you.</h2><p>Export the information your project team needs without rebuilding the day’s work in another spreadsheet. The useful output follows good field capture.</p></div><div className="field-home-output-list">{[[FileSpreadsheet,"Excel / CSV"],[FileText,"Daily summary / PDF"],[Search,"Searchable project records"]].map(([Icon,label])=>{const ItemIcon=Icon as typeof FileSpreadsheet;return <span key={String(label)} data-scroll-reveal="detail"><ItemIcon size={18}/>{String(label)}</span>;})}</div></div></section>

    <section className="field-home-principles"><div className="field-home-principles-inner"><div className="field-home-section-head"><p className="field-home-eyebrow"><span/>THE EPCX DIFFERENCE</p><h2>Built around field reality.</h2></div><div className="field-home-principle-list"><article data-scroll-reveal="detail"><span>01</span><h3>Drawing first</h3><p>Keep engineering work tied to the drawing where it belongs.</p></article><article data-scroll-reveal="detail"><span>02</span><h3>Capture once</h3><p>Keep the record with the work so teams don’t re-enter the same story later.</p></article><article data-scroll-reveal="detail"><span>03</span><h3>Human review</h3><p>Extracted information is reviewed and confirmed by people.</p></article></div></div></section>

    <section className="field-home-cta"><div data-scroll-reveal="cta"><p className="field-home-eyebrow"><span/>START WITH THE RECORD YOU HAVE</p><h2>Bring the record you already have.</h2><p>Start with a drawing, upload today&apos;s DPR, or open your field workspace.</p><div><Link href="/start?view=drawings&add=drawing"><BookOpen size={17}/>Start with a drawing<ArrowRight size={16}/></Link><Link href="/start?view=dpr&add=dpr"><Upload size={17}/>Upload a DPR<ArrowRight size={16}/></Link><Link href="/start"><ClipboardList size={17}/>Open workspace<ArrowRight size={16}/></Link></div></div></section>
  </>;
}
