"use client";

import { useEffect, useState } from "react";
import { FileText, ArrowRight, CheckCircle2, Search } from "lucide-react";

/**
 * DprExtractionDemo
 * 
 * Demonstrates:
 * PAPER DPR / IMAGE -> EXTRACT -> STRUCTURED TABLE -> REVIEW
 * 
 * Shows a miniature realistic DPR document, an extraction scan line / progress,
 * and the resulting structured tabular format with check review.
 * Respects prefers-reduced-motion.
 */
export function DprExtractionDemo() {
  const [stage, setStage] = useState<number>(0); // 0 = original, 1 = extracting, 2 = structured table, 3 = reviewed check
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setReducedMotion(true);
      setStage(3);
      return;
    }

    const handler = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
      if (e.matches) setStage(3);
    };
    mq.addEventListener("change", handler);

    let interval: NodeJS.Timeout;
    const timeouts: NodeJS.Timeout[] = [];

    const runLoop = () => {
      setStage(0);
      timeouts.push(setTimeout(() => setStage(1), 1200));
      timeouts.push(setTimeout(() => setStage(2), 2400));
      timeouts.push(setTimeout(() => setStage(3), 3600));
    };

    runLoop();
    interval = setInterval(runLoop, 5400);

    return () => {
      mq.removeEventListener("change", handler);
      clearInterval(interval);
      timeouts.forEach(clearTimeout);
    };
  }, []);

  const isExtracted = stage >= 2 || reducedMotion;
  const isReviewed = stage >= 3 || reducedMotion;

  return (
    <div className="field-home-extract-flow" data-scroll-reveal="card">
      {/* 1. Uploaded Paper DPR Document */}
      <div className={`field-home-extract-document ${stage === 1 ? "is-scanning" : ""}`}>
        <div className="extract-doc-header">
          <span><FileText size={15} />SOURCE DPR · PDF / SCAN</span>
          <i>07 OCT 2026</i>
        </div>
        <b>Daily Progress Report</b>
        <small>Project: Haven Petro Expansion</small>
        <small>Drawing: P-102 · Rev 03</small>
        
        {/* Source snippet representation */}
        <div className="extract-doc-raw-box">
          <div className="raw-line"><span>Shift manpower:</span><b>38 crew</b></div>
          <div className="raw-line highlight"><span>Field activity:</span><b>Piping spool fit-up &amp; weld</b></div>
          <div className="raw-line"><span>Daily qty:</span><b>12 joints recorded</b></div>
        </div>

        {stage === 1 && !reducedMotion && (
          <div className="extract-scanner-bar" aria-hidden="true" />
        )}
      </div>

      {/* Transition Arrow */}
      <div className={`field-home-extract-arrow ${isExtracted ? "is-active" : ""}`}>
        <ArrowRight size={17} />
      </div>

      {/* 2. Structured Table & Verified Review */}
      <div className="field-home-extract-result">
        <div className="extract-result-header">
          <b>STRUCTURED EXECUTION TABLE</b>
          <span className={`extract-status-pill ${isReviewed ? "is-verified" : ""}`}>
            {isReviewed ? <CheckCircle2 size={11} /> : <Search size={11} />}
            <small>{isReviewed ? "VERIFIED" : "DETECTED"}</small>
          </span>
        </div>

        {/* Structured data table as requested in specification */}
        <div className="extract-table-mini">
          <div className="table-mini-head">
            <span>Activity</span>
            <span>Today</span>
            <span>Cum.</span>
          </div>
          <div className="table-mini-row">
            <span>Piping (Dia-in)</span>
            <b>120</b>
            <small>860</small>
          </div>
          <div className="table-mini-row">
            <span>Welding joints</span>
            <b>18</b>
            <small>142</small>
          </div>
          <div className="table-mini-row">
            <span>Fit-up approved</span>
            <b>14</b>
            <small>110</small>
          </div>
        </div>

        {/* Audit footer */}
        <footer>
          <span className={stage >= 1 ? "active" : ""}>1 EXTRACT</span>
          <i />
          <span className={stage >= 2 ? "active" : ""}>2 STRUCTURE</span>
          <i />
          <span className={isReviewed ? "active confirmed" : ""}>3 REVIEW ✓</span>
        </footer>
      </div>
    </div>
  );
}
