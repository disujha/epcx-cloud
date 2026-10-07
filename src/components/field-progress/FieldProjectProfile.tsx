"use client";

import { Building2, Save, X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";

export type FieldProject = {
  id: string;
  name: string;
  projectNumber: string;
  projectType: string;
  projectStatus: string;
  client: string;
  pmcConsultant: string;
  epcContractor: string;
  mainContractor: string;
  location: string;
  facility: string;
  contact: string;
  startDate: string;
  expectedCompletion: string;
  actualCompletion: string;
  areas: string;
  disciplines: string;
  workTypes: string;
  primaryDisciplines: string;
  logoUrl: string;
};

export const emptyFieldProject: FieldProject = {
  id: "", name: "", projectNumber: "", projectType: "", projectStatus: "planning", client: "", pmcConsultant: "",
  epcContractor: "", mainContractor: "", location: "", facility: "", contact: "",
  startDate: "", expectedCompletion: "", actualCompletion: "", areas: "", disciplines: "", workTypes: "", primaryDisciplines: "", logoUrl: "",
};

const inputClass = "field-project-input";
const projectTypes = ["EPC", "Construction", "Shutdown / Turnaround", "Maintenance", "Fabrication", "Engineering", "Other"];
const projectStatuses = ["planning", "active", "on_hold", "completed", "closed", "archived"];
const workTypeOptions = ["Piping", "Equipment", "Tanks", "Structural", "Civil", "Electrical", "Instrumentation", "Mechanical", "HVAC", "Insulation", "Painting / Coating", "Fire & Safety Systems", "Underground / Utilities", "Road / Infrastructure", "E&I", "Testing & Commissioning", "Maintenance", "Shutdown / Turnaround", "QA/QC", "Other"];

function splitTags(value: string) {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
}

function TagField({ label, value, suggestions, onChange, readOnly = false }: { label: string; value: string; suggestions: string[]; onChange: (value: string) => void; readOnly?: boolean }) {
  const [entry, setEntry] = useState("");
  const tags = splitTags(value);
  function add(valueToAdd = entry) {
    const next = valueToAdd.trim();
    if (!next || tags.some((tag) => tag.toLowerCase() === next.toLowerCase())) { setEntry(""); return; }
    onChange([...tags, next].join(", "));
    setEntry("");
  }
  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") { event.preventDefault(); add(); }
    if (event.key === "Backspace" && !entry && tags.length) onChange(tags.slice(0, -1).join(", "));
  }
  return <div className="field-tag-field"><span>{label} <small>Optional</small></span><div className="field-tag-control"><div className="field-tags">{tags.map((tag) => <button type="button" key={tag} disabled={readOnly} onClick={() => onChange(tags.filter((item) => item !== tag).join(", "))} aria-label={`Remove ${tag}`} title={`Remove ${tag}`}>{tag}{!readOnly && <X size={13}/>}</button>)}</div>{!readOnly && <><div className="field-tag-entry"><input value={entry} onChange={(event) => setEntry(event.target.value)} onKeyDown={keyDown} placeholder={tags.length ? "Add another" : "Type a value and press Enter"} aria-label={`Add ${label.toLowerCase()}`}/><button type="button" onClick={() => add()}>Add</button></div>{suggestions.length > 0 && <div className="field-tag-suggestions" aria-label={`${label} suggestions`}>{suggestions.filter((item) => !tags.some((tag) => tag.toLowerCase() === item.toLowerCase())).map((item) => <button type="button" key={item} onClick={() => add(item)}>+ {item}</button>)}</div>}</>}</div></div>;
}

export function FieldProjectProfile({ project, onSave, saving = false, readOnly = false }: { project: FieldProject; onSave: (project: FieldProject) => void; saving?: boolean; readOnly?: boolean }) {
  const [draft, setDraft] = useState(project);
  function set(key: keyof FieldProject, value: string) { setDraft((old) => ({ ...old, [key]: value })); }
  function field(key: keyof FieldProject, label: string, placeholder = "", type = "text") {
    return <label className="field-profile-field" key={key}><span>{label} <small>Optional</small></span><input disabled={readOnly || saving} className={inputClass} type={type} value={draft[key]} onChange={(event) => set(key, event.target.value)} placeholder={placeholder}/></label>;
  }
  return <main className="field-settings-page field-project-profile"><header><span><Building2 size={18}/>PROJECT / SITE PROFILE</span><h1>{draft.name || "Set up your project"}</h1><p>Start with a project name. Add site, organization, and schedule details when they’re available.</p></header>
    <form onSubmit={(event) => { event.preventDefault(); if (!draft.name.trim() || readOnly) return; onSave({ ...draft, name: draft.name.trim(), id: draft.id || crypto.randomUUID() }); }}>
      <section><h2>Project identity</h2><div className="field-profile-grid"><label className="field-profile-field"><span>Project name</span><input disabled={readOnly || saving} className={inputClass} required autoFocus={!draft.name} value={draft.name} onChange={(event) => set("name", event.target.value)} placeholder="e.g. Haven Petrochemical Expansion"/></label>{field("projectNumber", "Project number / contract number")}<label className="field-profile-field"><span>Project type <small>Optional</small></span><select disabled={readOnly || saving} className={inputClass} value={draft.projectType} onChange={(event) => set("projectType", event.target.value)}><option value="">Select project type</option>{projectTypes.map((type) => <option key={type}>{type}</option>)}</select></label><label className="field-profile-field"><span>Project status</span><select disabled={readOnly || saving} className={inputClass} value={draft.projectStatus} onChange={(event) => set("projectStatus", event.target.value)}>{projectStatuses.map((status) => <option key={status} value={status}>{status === "on_hold" ? "On hold" : status.replace(/^./, (character) => character.toUpperCase())}</option>)}</select></label></div></section>
      <section><h2>Project organizations</h2><div className="field-profile-grid">{field("client", "Owner / Client")}{field("pmcConsultant", "PMC / Consultant")}{field("epcContractor", "EPC Contractor")}{field("mainContractor", "Main Contractor")}</div></section>
      <section><h2>Site / facility</h2><div className="field-profile-grid">{field("location", "Site / location", "e.g. Dahej, Gujarat")}{field("facility", "Plant / facility", "e.g. Utilities Plant")}</div><div className="field-tag-grid"><TagField readOnly={readOnly} label="Areas / units" value={draft.areas} suggestions={["Pipe Rack North", "Unit 4", "Tank Farm", "Utilities"]} onChange={(value) => set("areas", value)}/><TagField readOnly={readOnly} label="Disciplines" value={draft.disciplines} suggestions={["Piping", "Mechanical", "Civil", "Structural", "Electrical", "Instrumentation", "QA/QC"]} onChange={(value) => set("disciplines", value)}/></div></section>
      <section><h2>Workspace profile</h2><p className="field-profile-help">Select the work this project needs. Primary disciplines guide the workspace recommendations; other work remains available.</p><div className="field-tag-grid"><TagField readOnly={readOnly} label="Available work types" value={draft.workTypes || draft.disciplines} suggestions={workTypeOptions} onChange={(value) => set("workTypes", value)}/><TagField readOnly={readOnly} label="Primary disciplines · choose up to 2" value={draft.primaryDisciplines} suggestions={splitTags(draft.workTypes || draft.disciplines).slice(0, 12)} onChange={(value) => set("primaryDisciplines", splitTags(value).slice(0, 2).join(", "))}/></div></section>
      <section><h2>Schedule</h2><div className="field-profile-grid">{field("startDate", "Start date", "", "date")}{field("expectedCompletion", "Planned completion", "", "date")}{field("actualCompletion", "Actual completion", "", "date")}</div></section>
      <section><h2>Project contacts</h2><div className="field-profile-grid">{field("contact", "Primary project contact")}</div></section>
      <footer><small>{readOnly ? "Only a Project Admin can edit project details." : "Project number, organizations, site details and dates can be added later."}</small>{!readOnly && <button type="submit" disabled={saving || !draft.name.trim()}><Save size={16}/>{saving ? "Saving…" : "Save project"}</button>}</footer>
    </form>
  </main>;
}
