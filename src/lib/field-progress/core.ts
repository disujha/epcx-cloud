export const DEFAULT_FIELD_STAGES = ["Planned", "Fit-up complete", "Welding complete", "Visual examination", "NDT pending", "NDT complete", "Repair required", "Re-examination", "Accepted", "Coating complete", "Released"] as const;

export type FieldStage = string;
export interface JointRecord { id: string; jointId?: string; attributes?: Record<string, string>; drawingPage?: number; x?: number; y?: number; jointType?: string; weldType?: string; size?: string; material?: string; spool?: string; remarks?: string }
export interface JointEvent { id: string; stage: FieldStage; occurredAt: string | Date; recordedBy: string; recorderName: string; crew?: string; welder?: string; wps?: string; inspectionReference?: string; inspectionResult?: string; remarks?: string; correctionOf?: string; reason?: string }

export function normalizeDrawingPoint(clientX: number, clientY: number, left: number, top: number, width: number, height: number) {
  if (width <= 0 || height <= 0) throw new Error("Drawing has no measurable display area.");
  return { x: Math.max(0, Math.min(1, (clientX - left) / width)), y: Math.max(0, Math.min(1, (clientY - top) / height)) };
}

export function newerDrawingRevisions(current: string, recorded: string[]) {
  return [...new Set(recorded.filter((revision) => revision && revision.localeCompare(current, undefined, { numeric: true, sensitivity: "base" }) > 0))]
    .sort((left, right) => right.localeCompare(left, undefined, { numeric: true, sensitivity: "base" }));
}

export function validateStageChange(input: { current?: string; next: string; stages: string[]; transitions: Record<string, string[]>; reason?: string; correctionOf?: string }) {
  if (!input.stages.includes(input.next)) return "Choose a stage configured for this project.";
  if (input.correctionOf && !input.reason?.trim()) return "A correction requires a reason.";
  if (!input.current && input.next !== input.stages[0] && !input.reason?.trim()) return "Start from the first configured stage or add a reason for beginning out of sequence.";
  if (input.current && input.current !== input.next && !(input.transitions[input.current] ?? []).includes(input.next) && !input.reason?.trim()) return "This is outside the configured transition. Add a reason to continue.";
  if (["Accepted", "Released"].includes(input.next) && !input.reason?.trim()) return `${input.next} requires an authorized confirmation reason.`;
  return null;
}

export function computeFieldProgress(joints: JointRecord[], events: Array<JointEvent & { jointId: string }>, from?: Date, to?: Date) {
  const byJoint = new Map<string, JointEvent[]>();
  for (const event of events) byJoint.set(event.jointId, [...(byJoint.get(event.jointId) ?? []), event]);
  const latestByJoint = new Map<string, JointEvent>();
  for (const [jointId, history] of byJoint) {
    const corrected = new Set(history.map((event) => event.correctionOf).filter((value): value is string => Boolean(value)));
    const active = history.filter((event) => !corrected.has(event.id)).sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
    if (active.length) latestByJoint.set(jointId, active[active.length - 1]);
  }
  const statusCounts: Record<string, number> = {};
  for (const joint of joints) { const stage = latestByJoint.get(joint.jointId??joint.id)?.stage ?? "Needs review"; statusCounts[stage] = (statusCounts[stage] ?? 0) + 1; }
  const corrected = new Set(events.map((event) => event.correctionOf).filter((value): value is string => Boolean(value)));
  const inWindow = events.filter((event) => !corrected.has(event.id)).filter((event) => { const date = new Date(event.occurredAt); return (!from || date >= from) && (!to || date <= to); });
  return {
    total: joints.length, statusCounts,
    weldedInWindow: inWindow.filter((event) => event.stage === "Welding complete").length,
    ndtCompleted: inWindow.filter((event) => event.stage === "NDT complete" && Boolean(event.inspectionResult)).length,
    repairs: inWindow.filter((event) => event.stage === "Repair required").length,
    reExaminations: inWindow.filter((event) => event.stage === "Re-examination").length,
    accepted: joints.filter((joint) => latestByJoint.get(joint.jointId??joint.id)?.stage === "Accepted").length,
    released: joints.filter((joint) => latestByJoint.get(joint.jointId??joint.id)?.stage === "Released").length,
    remaining: joints.filter((joint) => !["Accepted", "Released"].includes(latestByJoint.get(joint.jointId??joint.id)?.stage ?? "")).length,
    latestByJoint,
  };
}

export function parseJointCsv(text: string): Array<Record<string, string>> {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error("Add a header row and at least one joint row.");
  const split = (line: string) => { const cells: string[] = []; let cell = ""; let quoted = false; for (let i=0;i<line.length;i++) { const char=line[i]; if(char==='"'&&quoted&&line[i+1]==='"'){cell+='"';i++;} else if(char==='"') quoted=!quoted; else if(char===","&&!quoted){cells.push(cell.trim());cell="";} else cell+=char; } cells.push(cell.trim()); return cells; };
  const headers = split(lines[0]).map((item) => item.toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,""));
  const idColumn = headers.findIndex((item) => ["joint_id","joint","id","tag"].includes(item));
  if (idColumn < 0) throw new Error("CSV needs a Joint ID column (joint_id, joint, id, or tag).");
  if (lines.length - 1 > 10000) throw new Error("Joint imports are limited to 10,000 rows.");
  const seen = new Set<string>();
  return lines.slice(1).map((line, index) => {
    const values=split(line); const row=Object.fromEntries(headers.map((header,i)=>[header,values[i]??""]));
    const id=(row[headers[idColumn]]??"").trim();
    if(!id) throw new Error(`Joint ID is missing on CSV row ${index+2}.`);
    if(seen.has(id.toLowerCase())) throw new Error(`Duplicate joint ID ${id} in this import.`);
    seen.add(id.toLowerCase()); return { ...row, joint_id:id };
  });
}
