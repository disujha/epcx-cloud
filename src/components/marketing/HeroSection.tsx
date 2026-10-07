import Link from "next/link";
import { ArrowRight, BookOpen, Upload } from "lucide-react";
import { HeroInteractiveDemo } from "./HeroInteractiveDemo";

export function HeroSection() {
  return <section className="field-home-hero">
    <div className="field-home-hero-grid" aria-hidden="true" />
    <div className="field-home-hero-inner">
      <div className="field-home-hero-copy" data-scroll-reveal="hero-copy">
        <p className="field-home-eyebrow"><span />FIELD RECORDS FOR EPC PROJECTS</p>
        <h1>Keep today&apos;s<br/><em>site work together.</em></h1>
        <p className="field-home-intro">Mark progress directly on the drawing, keep the DPR with the shift, and connect the evidence that proves what happened on site.</p>
        
        {/* Strengthened CTA Hierarchy & Interactive invitation */}
        <div className="field-home-hero-actions">
          <Link href="/start?view=drawings&add=drawing" className="field-home-action field-home-action-primary">
            <BookOpen size={18}/>
            <span>Start with a drawing</span>
            <ArrowRight size={16}/>
          </Link>
          <Link href="/start?view=dpr&add=dpr" className="field-home-action field-home-action-secondary">
            <Upload size={18}/>
            <span>Upload today&apos;s DPR</span>
            <ArrowRight size={16}/>
          </Link>
        </div>
        
        <p className="field-home-sample-invitation">
          <span className="sample-invite-dot" />
          <span>See how one field mark becomes a daily record · </span>
          <Link href="/start?view=drawings">Try with a sample drawing →</Link>
        </p>

        <p className="field-home-audience">Built for supervisors, site engineers, QC teams and project managers.</p>
      </div>

      <div className="field-home-hero-art" data-scroll-reveal="hero-art" aria-label="Interactive drawing workflow demonstrating tap-to-complete and daily record synchronization">
        <div className="field-home-art-top">
          <span>FIELD WORKBENCH <b>LIVE INTERACTION PREVIEW</b></span>
          <span>PROJECT / PIPING</span>
        </div>
        
        {/* Micro-interaction demonstration component */}
        <HeroInteractiveDemo />
      </div>
    </div>
    <div className="field-home-hero-foot">
      <span>MARK WORK ON DRAWING</span>
      <i/>
      <span>RECORDED FOR TODAY</span>
      <i/>
      <span>READY FOR REVIEW</span>
    </div>
  </section>;
}
