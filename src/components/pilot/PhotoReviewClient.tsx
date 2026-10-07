"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, CheckCircle2, Clock, Layers, ShieldCheck, XCircle } from "lucide-react";
import { PilotTaskClient } from "./PilotTaskClient";
import { useOptionalFieldWork } from "@/contexts/FieldWorkContext";
import type { CentralWorkItem, NdtStatus } from "@/lib/field-progress/work-item-model";

export function PhotoReviewClient({
  embedded = false,
  initialWorkItemId = "",
  initialKind = "fitup-photo",
}: {
  embedded?: boolean;
  initialWorkItemId?: string;
  initialKind?: "fitup-photo" | "welding-photo";
}) {
  const [kind, setKind] = useState<"fitup-photo" | "welding-photo">(initialKind);
  const fieldWork = useOptionalFieldWork();

  const [selectedItemId, setSelectedItemId] = useState<string>(initialWorkItemId);
  const [decisionFeedback, setDecisionFeedback] = useState<string>("");

  useEffect(() => {
    if (initialWorkItemId) setSelectedItemId(initialWorkItemId);
  }, [initialWorkItemId]);

  useEffect(() => {
    if (initialKind) setKind(initialKind);
  }, [initialKind]);

  const selectedItem: CentralWorkItem | undefined = useMemo(() => {
    if (!fieldWork || !selectedItemId) return undefined;
    return fieldWork.workItems.find((item) => item.id === selectedItemId);
  }, [fieldWork, selectedItemId]);

  const initialContext = useMemo(() => {
    if (!selectedItem) return "";
    const parts = [
      selectedItem.jointId ? `Joint: ${selectedItem.jointId}` : "",
      selectedItem.lineId ? `Line: ${selectedItem.lineId}` : "",
      selectedItem.drawingName ? `Drawing: ${selectedItem.drawingName}` : "",
      selectedItem.description ? `Desc: ${selectedItem.description}` : "",
      selectedItem.discipline ? `Discipline: ${selectedItem.discipline}` : "",
    ].filter(Boolean);
    return parts.join(" · ");
  }, [selectedItem]);

  async function handleRecordDecision(decision: NdtStatus) {
    if (!fieldWork || !selectedItem) return;

    const actionText =
      decision === "pass"
        ? "Visual inspection approved"
        : decision === "fail"
        ? "Visual inspection rejected / rectification required"
        : "NDT inspection marked pending";

    const updated: CentralWorkItem = {
      ...selectedItem,
      ndtStatus: decision,
      updatedAt: new Date().toISOString(),
      history: [
        ...(selectedItem.history || []),
        {
          at: new Date().toISOString(),
          action: "inspector_review",
          details: `${actionText} (${kind === "fitup-photo" ? "Fit-up review" : "Welding review"})`,
        },
      ],
    };

    try {
      await fieldWork.addOrUpdateWorkItem(updated);
      setDecisionFeedback(`Decision saved: ${decision}`);
      setTimeout(() => setDecisionFeedback(""), 3500);
    } catch (e) {
      console.error("Failed to save inspector decision", e);
      setDecisionFeedback("Failed to save decision.");
    }
  }

  return (
    <div className={embedded ? "field-photo-review" : "mx-auto max-w-5xl px-4 pb-12 pt-28 sm:px-6"}>
      {/* Field Work Item Linkage */}
      {fieldWork && fieldWork.workItems.length > 0 && (
        <div className="mb-4 rounded border border-[#d7ddd7] bg-[#f9faf8] p-4 text-xs text-[#18272e]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e1e6e1] pb-2">
            <span className="flex items-center gap-1.5 font-bold tracking-wider text-[#315e49]">
              <Layers size={14} /> CONNECT WORK ITEM
            </span>
            <span className="text-[11px] text-slate-500">
              Attach inspection observation to authoritative register
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Work Item:</span>
              <select
                className="rounded border border-[#c4ccc4] bg-white px-2.5 py-1 text-xs text-[#18272e] focus:border-[#315e49] focus:outline-none"
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
              >
                <option value="">Select item (optional)…</option>
                {fieldWork.workItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.jointId || item.id.slice(0, 8)} · {item.drawingName || "No dwg"} ({item.lineId || item.discipline})
                  </option>
                ))}
              </select>
            </label>

            {selectedItem && (
              <div className="flex flex-wrap items-center gap-2 rounded bg-white px-2.5 py-1 border border-[#e1e6e1]">
                <span><b>Drawing:</b> {selectedItem.drawingName || "—"}</span>
                <span><b>Line/Area:</b> {selectedItem.lineId || "—"}</span>
                <span>
                  <b>NDT State:</b>{" "}
                  <span
                    className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      selectedItem.ndtStatus === "pass"
                        ? "bg-emerald-100 text-emerald-800"
                        : selectedItem.ndtStatus === "fail"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {selectedItem.ndtStatus ? selectedItem.ndtStatus.toUpperCase() : "PENDING"}
                  </span>
                </span>
              </div>
            )}
          </div>

          {/* Inspector Decision Actions */}
          {selectedItem && (
            <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-[#e1e6e1] pt-3">
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-[#315e49]" />
                <span className="font-bold text-slate-700">Inspector Decision:</span>
                <span className="text-[11px] text-slate-500">Record authoritative inspection result for {selectedItem.jointId || selectedItem.id.slice(0, 8)}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRecordDecision("pass")}
                  className="flex items-center gap-1 rounded bg-[#315e49] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#284d3c]"
                >
                  <Check size={13} /> Visual Pass
                </button>
                <button
                  type="button"
                  onClick={() => handleRecordDecision("pending")}
                  className="flex items-center gap-1 rounded border border-[#c4ccc4] bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Clock size={13} /> Pending NDT
                </button>
                <button
                  type="button"
                  onClick={() => handleRecordDecision("fail")}
                  className="flex items-center gap-1 rounded border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800 hover:bg-rose-100"
                >
                  <XCircle size={13} /> Reject / Rework
                </button>
                {decisionFeedback && (
                  <span className="text-xs font-medium text-emerald-700 ml-1">
                    {decisionFeedback}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Review Type Selector */}
      <fieldset className="field-photo-kind">
        <legend>Choose a photo review</legend>
        <div className="field-photo-kind-options">
          <label>
            <input
              type="radio"
              name="photo-review-kind"
              value="fitup-photo"
              checked={kind === "fitup-photo"}
              onChange={() => setKind("fitup-photo")}
            />
            <span>Fit-up</span>
          </label>
          <label>
            <input
              type="radio"
              name="photo-review-kind"
              value="welding-photo"
              checked={kind === "welding-photo"}
              onChange={() => setKind("welding-photo")}
            />
            <span>Welding</span>
          </label>
        </div>
        <p>
          AI observations are draft suggestions for qualified inspector review. They do not indicate acceptance or replace inspection/NDT.
        </p>
      </fieldset>

      <PilotTaskClient
        key={`${kind}-${selectedItemId}`}
        tool={kind}
        embedded={embedded}
        initialContext={initialContext}
      />
    </div>
  );
}
