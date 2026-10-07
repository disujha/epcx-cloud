"use client";

import { useEffect, useState } from "react";
import { BookOpen, CalendarDays, FileText, ShieldCheck, Image as ImageIcon, Search } from "lucide-react";

interface HistoryDayRecord {
  date: string;
  isToday?: boolean;
  drawing: string;
  dpr: string;
  dprStatus?: "draft" | "reviewed";
  tbt: string;
  photos: number;
}

const historyData: HistoryDayRecord[] = [
  {
    date: "05 OCT",
    drawing: "Drawing P-101",
    dpr: "DPR Reviewed",
    dprStatus: "reviewed",
    tbt: "TBT ✓",
    photos: 3,
  },
  {
    date: "06 OCT",
    drawing: "Drawing P-102 Rev 02",
    dpr: "DPR ✓",
    dprStatus: "reviewed",
    tbt: "TBT ✓",
    photos: 6,
  },
  {
    date: "07 OCT",
    isToday: true,
    drawing: "Drawing P-102 Rev 03",
    dpr: "DPR Draft",
    dprStatus: "draft",
    tbt: "TBT ✓",
    photos: 4,
  },
];

/**
 * FieldHistoryMemoryDemo
 * 
 * Demonstrates:
 * Accumulation of field records by date:
 * 06 OCT: Drawing ✓, DPR ✓, Photos 6, TBT ✓
 * 07 OCT: Drawing ✓, DPR Draft, Photos 4
 * Searchable recall query: e.g. "P-102" or "06 Oct" highlights the matching day.
 * 
 * Communicates: EPCX remembers the work after the shift.
 * Respects prefers-reduced-motion.
 */
export function FieldHistoryMemoryDemo() {
  const [activeQuery, setActiveQuery] = useState<string>("");
  const [highlightDate, setHighlightDate] = useState<string>("07 OCT");
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setReducedMotion(true);
      return;
    }

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);

    // Subtle cycle between showcasing recent dates and recalling past dates
    const queries = ["", "P-102", "06 OCT", ""];
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % queries.length;
      const q = queries[index];
      setActiveQuery(q);
      if (q === "06 OCT") {
        setHighlightDate("06 OCT");
      } else if (q === "P-102") {
        setHighlightDate("ALL");
      } else {
        setHighlightDate("07 OCT");
      }
    }, 3800);

    return () => {
      mq.removeEventListener("change", handler);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="field-home-timeline" data-scroll-reveal="side">
      {/* Header with Search Recall Bar */}
      <header className="timeline-interactive-header">
        <div className="timeline-title-wrap">
          <CalendarDays size={15} />
          <span>PROJECT MEMORY</span>
          <span className="timeline-project-name">HAVEN EXPANSION</span>
        </div>
        
        {/* Subtle search query showing date / drawing recall */}
        <div className="timeline-search-badge" title="Searchable site memory">
          <Search size={11} />
          <span>{activeQuery ? `Recall: "${activeQuery}"` : "Filter by date or drawing"}</span>
        </div>
      </header>

      {/* Date Rows accumulating evidence */}
      {historyData.map(({ date, isToday, drawing, dpr, dprStatus, tbt, photos }) => {
        const isMatched = highlightDate === "ALL" || highlightDate === date || (!activeQuery && isToday);
        return (
          <article
            key={date}
            className={`timeline-day-row ${isMatched ? "is-highlighted" : ""} ${isToday ? "is-today-active" : ""}`}
          >
            <div className="timeline-date-col">
              <time>{date}</time>
              {isToday && <small className="timeline-live-tag">TODAY</small>}
            </div>

            <div className="field-home-timeline-items">
              <span className="timeline-chip drawing-chip">
                <BookOpen size={13} />
                <b>{drawing}</b>
              </span>
              <span className={`timeline-chip dpr-chip ${dprStatus === "draft" ? "is-draft" : "is-final"}`}>
                <FileText size={13} />
                <span>{dpr}</span>
              </span>
              <span className="timeline-chip tbt-chip">
                <ShieldCheck size={13} />
                <span>{tbt}</span>
              </span>
              {photos > 0 && (
                <span className="timeline-chip photo-chip">
                  <ImageIcon size={13} />
                  <span>{photos} Photos</span>
                </span>
              )}
            </div>

            <b className="timeline-state-label">
              {isToday ? "Active Shift" : "Archived ✓"}
            </b>
          </article>
        );
      })}
    </div>
  );
}
