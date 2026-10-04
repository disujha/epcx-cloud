import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpen, Check, CircleDashed, FileText, Upload, Image as ImageIcon, ShieldCheck } from "lucide-react";

export function HeroSection() {
  return <section className="field-home-hero">
    <div className="field-home-hero-grid" aria-hidden="true" />
    <div className="field-home-hero-inner">
      <div className="field-home-hero-copy" data-scroll-reveal="hero-copy">
        <p className="field-home-eyebrow"><span />FIELD RECORDS FOR EPC PROJECTS</p>
        <h1>Keep today&apos;s<br/><em>site work together.</em></h1>
        <p className="field-home-intro">Mark progress on the drawing, keep the DPR with the shift, and connect the records that show what happened on site.</p>
        <div className="field-home-hero-actions">
          <Link href="/start?view=drawings&add=drawing" className="field-home-action field-home-action-primary"><BookOpen size={18}/><span>Start with a drawing</span><ArrowRight size={16}/></Link>
          <Link href="/start?view=dpr&add=dpr" className="field-home-action field-home-action-secondary"><Upload size={18}/><span>Upload today&apos;s DPR</span><ArrowRight size={16}/></Link>
        </div>
        <p className="field-home-audience">Built for supervisors, site engineers, QC teams and project managers.</p>
      </div>
      <div className="field-home-hero-art" data-scroll-reveal="hero-art" aria-label="Illustrative engineering drawing with field work markers">
        <div className="field-home-art-top"><span>FIELD WORKBENCH <b>ILLUSTRATIVE VIEW</b></span><span>PROJECT / PIPING</span></div>
        <div className="field-home-live-pair">
          <div className="field-home-live-drawing">
            <div className="field-home-drawing">
              <Image src="/images/drawing.jpg" alt="Line drawing of a pipe connection" width={817} height={459} priority />
              <span className="drawing-marker marker-one"><i>J-014</i><b><Check size={11}/>Complete</b></span>
              <span className="drawing-marker marker-two"><i>J-017</i><b><CircleDashed size={11}/>In progress</b></span>
              <span className="drawing-marker marker-three"><i>J-018</i><b>Open</b></span>
              <span className="drawing-leader leader-one"/><span className="drawing-leader leader-two"/>
            </div>
            <div className="field-home-drawing-caption"><div><small>DRAWING</small><b>P-102 · Rev 03</b></div><span>15 work items</span></div>
          </div>
          <aside className="field-home-live-record" data-scroll-reveal="record">
            <div className="field-home-live-record-date"><small>TODAY</small><b>04 OCT 2026</b></div>
            <div className="field-home-live-record-project"><small>PROJECT / SITE</small><b>Haven Petrochemical Expansion</b></div>
            <div className="field-home-live-record-title"><BookOpen size={14}/><span>Drawing <b>P-102 Rev 03</b></span></div>
            <div className="field-home-live-stats"><span><b>8</b><small>Completed</small></span><span><b>3</b><small>In progress</small></span><span><b>4</b><small>Open</small></span></div>
            <div className="field-home-live-record-tags"><span><FileText size={12}/>DPR</span><span><ShieldCheck size={12}/>TBT</span><span><ImageIcon size={12}/>Photos</span></div>
            <div className="field-home-live-record-link"><i>01</i><span>Drawing mark</span><b>›</b><i>02</i><span>Work item</span><b>›</b><i>03</i><span>Daily record</span></div>
          </aside>
        </div>
      </div>
    </div>
    <div className="field-home-hero-foot"><span>CAPTURE ONCE</span><i/><span>KEEP IT CONNECTED</span><i/><span>FIND IT LATER</span></div>
  </section>;
}
