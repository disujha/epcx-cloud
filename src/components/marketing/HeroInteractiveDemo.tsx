"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Check, CircleDashed, FileText, ShieldCheck, Image as ImageIcon, BookOpen } from "lucide-react";

/**
 * HeroInteractiveDemo
 * 
 * Demonstrates the core "aha" loop of EPCX:
 * 1. Clean engineering drawing
 * 2. Finger/cursor moves to joint location
 * 3. Taps location
 * 4. Contextual popover appears: "In Progress" / "Complete"
 * 5. "Complete" is tapped
 * 6. Marker J-104 turns green with Complete check
 * 7. Right desk stats update: 3 complete, DPR ready indicator lights up
 * 8. Holds for brief pause, then loops cleanly
 * 
 * Total loop: ~4.8 seconds.
 * Strictly respects prefers-reduced-motion.
 */
export function HeroInteractiveDemo() {
  // Step: 0 = idle, 1 = tap location, 2 = popup open, 3 = select complete, 4 = complete confirmed & desk updated
  const [step, setStep] = useState<number>(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setPrefersReducedMotion(true);
      setStep(4); // Show final complete state
      return;
    }

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
      if (e.matches) setStep(4);
    };
    mq.addEventListener("change", handler);

    // Sequence loop (4800ms)
    // 0ms - 800ms: pointer moves to location
    // 800ms - 1700ms: tap happens, popup opens
    // 1700ms - 2500ms: pointer taps "Complete"
    // 2500ms - 4200ms: J-104 marked Complete, desk stats update to 3 complete, DPR ready
    // 4200ms - 4800ms: pause and reset
    let interval: NodeJS.Timeout;
    const timeouts: NodeJS.Timeout[] = [];

    const runSequence = () => {
      setStep(0);
      timeouts.push(setTimeout(() => setStep(1), 750));
      timeouts.push(setTimeout(() => setStep(2), 1500));
      timeouts.push(setTimeout(() => setStep(3), 2200));
      timeouts.push(setTimeout(() => setStep(4), 2600));
    };

    runSequence();
    interval = setInterval(runSequence, 4800);

    return () => {
      mq.removeEventListener("change", handler);
      clearInterval(interval);
      timeouts.forEach(clearTimeout);
    };
  }, []);

  const isComplete = step >= 4 || prefersReducedMotion;
  const isMenuVisible = (step === 2 || step === 3) && !prefersReducedMotion;
  const isSelectingComplete = step === 3 && !prefersReducedMotion;

  return (
    <div className="field-home-live-pair">
      <div className="field-home-live-drawing">
        <div className="field-home-drawing field-demo-drawing-canvas">
          <Image
            src="/images/drawing.jpg"
            alt="Line drawing of a pipe connection"
            width={817}
            height={459}
            priority
          />

          {/* Existing static markers for context */}
          <span className="drawing-marker marker-one">
            <i>J-014</i>
            <b><Check size={11} />Complete</b>
          </span>
          <span className="drawing-marker marker-two">
            <i>J-017</i>
            <b><CircleDashed size={11} />In progress</b>
          </span>

          {/* The interactive animated target: Joint J-104 */}
          <div className="drawing-marker-interactive-wrap">
            {/* The pin dot on the drawing */}
            <span
              className={`interactive-pin-dot ${isComplete ? "is-complete" : "is-active"}`}
              aria-hidden="true"
            />

            {/* Simulated finger / cursor pointer */}
            {!prefersReducedMotion && (
              <div
                className={`interactive-pointer step-${step}`}
                aria-hidden="true"
              >
                <div className="interactive-finger-touch" />
              </div>
            )}

            {/* Contextual status menu that pops up on tap */}
            {isMenuVisible && (
              <div className="interactive-tap-popover" role="dialog" aria-label="Mark status">
                <div className="interactive-popover-head">
                  <span className="popover-joint-tag">J-104</span>
                  <small>MARK STATUS</small>
                </div>
                <div className="interactive-popover-options">
                  <div className="popover-btn in-progress">
                    <CircleDashed size={11} />
                    <span>In Progress</span>
                  </div>
                  <div className={`popover-btn complete ${isSelectingComplete ? "is-tapped" : ""}`}>
                    <Check size={11} />
                    <span>Complete</span>
                  </div>
                </div>
              </div>
            )}

            {/* The resulting marker after completion or in initial state */}
            {(!isMenuVisible || prefersReducedMotion) && (
              <span
                className={`drawing-marker marker-target ${isComplete ? "is-complete" : "is-target"}`}
              >
                <i>J-104</i>
                <b>
                  {isComplete ? (
                    <>
                      <Check size={11} />Complete
                    </>
                  ) : (
                    <>
                      <CircleDashed size={11} />Tap to mark
                    </>
                  )}
                </b>
              </span>
            )}
          </div>

          <span className="drawing-leader leader-one" />
          <span className="drawing-leader leader-two" />
        </div>

        <div className="field-home-drawing-caption">
          <div>
            <small>DRAWING WORKBENCH</small>
            <b>P-102 · Rev 03 · Spool A</b>
          </div>
          <span className="caption-execution-state">
            {isComplete ? "16 items · J-104 recorded" : "15 items on sheet"}
          </span>
        </div>
      </div>

      {/* Right side desk record with live status update */}
      <aside className="field-home-live-record" data-scroll-reveal="record">
        <div className="field-home-live-record-date">
          <small>TODAY&apos;S WORK</small>
          <b>07 OCT 2026</b>
        </div>
        <div className="field-home-live-record-project">
          <small>PROJECT / SITE</small>
          <b>Haven Petrochemical Expansion</b>
        </div>
        <div className="field-home-live-record-title">
          <BookOpen size={14} />
          <span>
            Drawing <b>P-102 Rev 03</b>
          </span>
        </div>

        {/* Live stats counter updating as J-104 completes */}
        <div className="field-home-live-stats">
          <span className={isComplete ? "stat-highlight" : ""}>
            <b key={isComplete ? "c-updated" : "c-initial"}>
              {isComplete ? "9" : "8"}
            </b>
            <small>Completed</small>
          </span>
          <span>
            <b>3</b>
            <small>In progress</small>
          </span>
          <span>
            <b>{isComplete ? "3" : "4"}</b>
            <small>Open</small>
          </span>
        </div>

        {/* DPR Ready indicator */}
        <div className="field-home-live-dpr-banner">
          <div className={`dpr-status-pill ${isComplete ? "is-ready" : ""}`}>
            <span className="dpr-status-dot" />
            <small>{isComplete ? "DPR READY FOR REVIEW" : "DPR IN DRAFT"}</small>
          </div>
        </div>

        <div className="field-home-live-record-tags">
          <span className={isComplete ? "tag-active" : ""}>
            <FileText size={12} />DPR
          </span>
          <span>
            <ShieldCheck size={12} />TBT
          </span>
          <span>
            <ImageIcon size={12} />Photos
          </span>
        </div>

        <div className="field-home-live-record-link">
          <i>01</i>
          <span>Drawing mark</span>
          <b>›</b>
          <i>02</i>
          <span>Work item</span>
          <b>›</b>
          <i>03</i>
          <span>Daily record</span>
        </div>
      </aside>
    </div>
  );
}
