"use client";

import { useState } from "react";
import { Check, ChevronRight, MoveUpRight } from "lucide-react";

const workItems = [
  { id: "J-014", status: "complete", name: "Completed", welder: "W-009", wps: "WPS-07", fitup: "Accepted", weld: "Complete", ndt: "Accepted", x: 37, y: 56 },
  { id: "J-017", status: "active", name: "Weld in progress", welder: "W-014", wps: "WPS-07", fitup: "Complete", weld: "In progress", ndt: "Pending", x: 53, y: 56 },
  { id: "J-018", status: "pending", name: "Pending", welder: "—", wps: "WPS-07", fitup: "Not started", weld: "Not started", ndt: "Not requested", x: 68, y: 56 },
  { id: "J-019", status: "pending", name: "Pending", welder: "—", wps: "WPS-07", fitup: "Not started", weld: "Not started", ndt: "Not requested", x: 74, y: 67 },
] as const;

export function DrawingWorkbench() {
  const [selectedId, setSelectedId] = useState("J-017");
  const [completedIds, setCompletedIds] = useState<string[]>(["J-008", "J-011", "J-012", "J-014"]);
  const [message, setMessage] = useState("");
  const selected = workItems.find((item) => item.id === selectedId) ?? workItems[1];
  const isComplete = completedIds.includes(selected.id);
  const completeCount = completedIds.length;
  const totalItems = 12;

  function markComplete() {
    if (isComplete) return;
    setCompletedIds((current) => [...current, selected.id]);
    setMessage(`${selected.id} marked complete in this preview.`);
  }

  return (
    <div className="workbench-shell" aria-label="Illustrative EPCX drawing workbench">
      <div className="workbench-topbar">
        <div className="workbench-brand"><span className="workbench-mark">E</span><div><b>FIELD WORK / TODAY</b><span>Drawing-based workbench</span></div></div>
        <span className="workbench-sample">PIPING EXAMPLE</span>
      </div>
      <div className="workbench-progress">
        <div><span>TODAY&apos;S PROGRESS</span><b>{completeCount} <small>/ {totalItems} items</small></b></div>
        <div className="workbench-progress-track"><span style={{ width: `${Math.min(100, (completeCount / totalItems) * 100)}%` }} /></div>
        <div className="workbench-counts"><span><i className="status-dot status-dot-complete" />{completeCount} complete</span><span><i className="status-dot status-dot-pending" />{totalItems - completeCount} pending</span></div>
      </div>

      <div className="workbench-body">
        <div className="workbench-drawing-pane">
          <div className="workbench-drawing-heading"><div><b>ISO / 24-P-102</b><span>UNIT 04 · PIPE RACK NORTH</span></div><span>REV 03</span></div>
          <div className="workbench-drawing">
            <svg viewBox="0 0 900 520" role="img" aria-label="Piping isometric drawing with selectable work items">
              <defs><pattern id="workbench-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#e9eee9" strokeWidth="1" /></pattern></defs>
              <rect width="900" height="520" fill="url(#workbench-grid)" />
              <g fill="none" stroke="#77867e" strokeWidth="3" strokeLinecap="square" strokeLinejoin="round">
                <path d="M102 338 255 249 402 334 544 252 752 372" /><path d="M255 249V107L332 62" /><path d="M402 334V443L488 493" /><path d="M544 252V124L623 78" /><path d="M544 252 699 162 805 224" />
              </g>
              <g fill="none" stroke="#bac5be" strokeWidth="1.4" strokeDasharray="7 6"><path d="M91 384 767 418" /><path d="M204 275 204 119M590 226 590 105M727 173 775 201" /><path d="M119 355 237 286M425 349 528 290M566 273 682 206" /></g>
              <g fill="none" stroke="#8e9d94" strokeWidth="2"><path d="M245 240l20 12m-20-2 20 12M392 325l20 12m-20-2 20 12M534 243l20 12m-20-2 20 12" /><path d="M239 107h31M528 124h31M394 443h17" /></g>
              <g fill="#68776e" fontFamily="ui-monospace, monospace" fontSize="13"><text x="112" y="409">24&quot;-P-102-CS1</text><text x="170" y="100">TO HEADER / EL +8.400</text><text x="578" y="103">VENT / DN 25</text><text x="674" y="145">TIE-IN / P-104</text><text x="113" y="462">ISO-24-P-102-04 · NOT TO SCALE</text></g>
              <g fill="#f8faf8" stroke="#7b8d82" strokeWidth="1.5"><circle cx="178" cy="293" r="4"/><circle cx="331" cy="293" r="4"/><circle cx="474" cy="293" r="4"/><circle cx="610" cy="291" r="4"/><circle cx="662" cy="351" r="4"/><circle cx="255" cy="171" r="4"/><circle cx="402" cy="390" r="4"/><circle cx="544" cy="190" r="4"/></g>
            </svg>
            {workItems.map((item) => {
              const complete = completedIds.includes(item.id);
              return <button type="button" key={item.id} className={`workbench-pin pin-${complete ? "complete" : item.status}${selectedId === item.id ? " pin-selected" : ""}`} style={{ left: `${item.x}%`, top: `${item.y}%` }} aria-label={`${item.id}, ${complete ? "complete" : item.name}`} aria-pressed={selectedId === item.id} onClick={() => { setSelectedId(item.id); setMessage(""); }}><span /><b>{item.id}</b></button>;
            })}
          </div>
          <div className="workbench-map-legend"><span><i className="status-dot status-dot-complete"/>Completed</span><span><i className="status-dot status-dot-pending"/>Pending</span><span><i className="status-dot status-dot-active"/>Selected</span></div>
        </div>

        <aside className="workbench-side">
          <div className="workbench-list-head"><b>WORK ITEMS</b><span>{totalItems} TOTAL</span></div>
          <div className="workbench-item-list">{workItems.map((item) => {
            const complete = completedIds.includes(item.id);
            return <button type="button" key={item.id} className={`workbench-item${selectedId === item.id ? " item-selected" : ""}`} onClick={() => { setSelectedId(item.id); setMessage(""); }}>
              <i className={`status-dot ${complete ? "status-dot-complete" : item.status === "active" ? "status-dot-active" : "status-dot-pending"}`} />
              <span><b>{item.id}</b><small>{complete ? "Completed" : item.name}</small></span><ChevronRight size={14}/>
            </button>;
          })}</div>
          <div className="workbench-selected">
            <p>SELECTED WORK ITEM</p><h3>{selected.id}</h3><span className="workbench-line">Line 24&quot;-P-102</span>
            <dl><div><dt>Welder</dt><dd>{selected.welder}</dd></div><div><dt>WPS</dt><dd>{selected.wps}</dd></div><div><dt>Fit-up</dt><dd>{selected.fitup}</dd></div><div><dt>Weld</dt><dd>{isComplete ? "Complete" : selected.weld}</dd></div><div><dt>NDT</dt><dd>{selected.ndt}</dd></div></dl>
            <button type="button" className="mark-complete-button" onClick={markComplete} disabled={isComplete}><Check size={15}/>{isComplete ? "Marked complete" : "Mark Complete"}</button>
            <p className="workbench-demo-note" aria-live="polite">{message || "Illustrative preview · no project data is saved"}</p>
          </div>
        </aside>
      </div>
      <div className="workbench-footer"><span><i/> Drawing workspace / Revision 03</span><span>Today&apos;s work stays with this drawing</span><MoveUpRight size={14}/></div>
    </div>
  );
}
