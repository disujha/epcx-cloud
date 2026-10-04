"use client";

import { Building2, Save } from "lucide-react";
import { useEffect, useState } from "react";

export type FieldProject = {
  id: string;
  name: string;
  projectNumber: string;
  client: string;
  epcContractor: string;
  mainContractor: string;
  location: string;
  contact: string;
  startDate: string;
  expectedCompletion: string;
  areas: string;
  disciplines: string;
  logoUrl: string;
};

export const emptyFieldProject: FieldProject = { id: "", name: "", projectNumber: "", client: "", epcContractor: "", mainContractor: "", location: "", contact: "", startDate: "", expectedCompletion: "", areas: "", disciplines: "", logoUrl: "" };

export function FieldProjectProfile({ project, onSave, saving = false }: { project: FieldProject; onSave: (project: FieldProject) => void; saving?: boolean }) {
  const [draft, setDraft] = useState(project);
  useEffect(() => setDraft(project), [project]);
  function field(key: keyof FieldProject, label: string, placeholder = "") {
    const type = key === "startDate" || key === "expectedCompletion" ? "date" : "text";
    return <label className="field-profile-field" key={key}><span>{label}</span><input type={type} value={draft[key]} onChange={(event) => setDraft((old) => ({ ...old, [key]: event.target.value }))} placeholder={placeholder}/></label>;
  }
  return <main className="field-settings-page"><header><span><Building2 size={18}/>PROJECT PROFILE</span><h1>{draft.name || "Set up your site project"}</h1><p>Use a few details to label and organize the drawings and field records for this site. You can leave anything unknown blank.</p></header>
    <form onSubmit={(event) => { event.preventDefault(); onSave({ ...draft, id: draft.id || crypto.randomUUID() }); }}>
      <section><h2>Project identity</h2><div className="field-profile-grid">{field("name", "Project name", "e.g. Haven Petrochemical Expansion")}{field("projectNumber", "Project number")}{field("client", "Client")}{field("epcContractor", "EPC contractor")}{field("mainContractor", "Main contractor")}{field("location", "Site / location")}</div></section>
      <section><h2>Dates and contacts</h2><div className="field-profile-grid">{field("startDate", "Start date")}{field("expectedCompletion", "Expected completion")}{field("contact", "Project contact")}{field("logoUrl", "Logo image URL (optional)")}</div></section>
      <section><h2>How the site is organized</h2><div className="field-profile-grid">{field("areas", "Areas / units", "Pipe rack north, Unit 4, Tank farm")}{field("disciplines", "Disciplines", "Piping, structural, civil, equipment")}</div></section>
      <footer><small>Project details are private to your signed-in workspace.</small><button type="submit" disabled={saving}><Save size={16}/>{saving ? "Saving…" : "Save project"}</button></footer>
    </form>
  </main>;
}
