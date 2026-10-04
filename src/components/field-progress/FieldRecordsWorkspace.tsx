"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, BookOpen, Boxes, Building2, CalendarDays, ChevronDown, Clock3, Cloud, FileBarChart2, FileText, FolderOpen, Home, LogOut, Settings, ShieldCheck, UserRound, Users, Wrench } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/config";
import { DailyDprWorkspace } from "@/components/field-progress/DailyDprWorkspace";
import { DrawingFirstWorkbench } from "@/components/field-progress/DrawingFirstWorkbench";
import { FieldWorkspaceHome } from "@/components/field-progress/FieldWorkspaceHome";
import { FieldRecordWorkbench } from "@/components/field-progress/FieldRecordWorkbench";
import { emptyFieldProject, FieldProjectProfile, type FieldProject } from "@/components/field-progress/FieldProjectProfile";

type Page = "workspace" | "drawings" | "dpr" | "today" | "records" | "reports" | "record" | "project" | "profile" | "team";
const mainNavigation: { id: Page; label: string; icon: typeof Home }[] = [
  { id: "workspace", label: "Workspace", icon: Home }, { id: "drawings", label: "Drawings", icon: BookOpen }, { id: "dpr", label: "DPR", icon: FileText }, { id: "today", label: "Today", icon: CalendarDays }, { id: "records", label: "Records", icon: FolderOpen }, { id: "reports", label: "Reports", icon: FileBarChart2 },
];

export function FieldRecordsWorkspace({ view = "workspace", add = "", record = "" }: { view?: string; add?: string; record?: string }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const initialPage: Page = ["dpr", "today", "drawings", "records", "reports", "project", "profile", "team"].includes(view) ? view as Page : "workspace";
  const [page, setPage] = useState<Page>(initialPage);
  const [addAction, setAddAction] = useState<"drawing" | "dpr" | "">(add === "dpr" ? "dpr" : add === "drawing" ? "drawing" : "");
  const [initialDprId, setInitialDprId] = useState(record);
  const [initialRecordId, setInitialRecordId] = useState("");
  const [project, setProject] = useState<FieldProject>(emptyFieldProject);
  const [organizationName, setOrganizationName] = useState("Not set");
  const [profileLoading, setProfileLoading] = useState(true);
  const [projectSaving, setProjectSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (!user || user.isAnonymous) { setProject(emptyFieldProject); setProfileLoading(false); return; }
    let active = true;
    setProfileLoading(true);
    getDoc(doc(db, "users", user.uid)).then((snapshot) => {
      const userData=snapshot.data();const saved = userData?.fieldWorkspace?.project;
      if(active){const organization=userData?.organization;if(typeof organization==="string")setOrganizationName(organization);else if(organization&&typeof organization.name==="string")setOrganizationName(organization.name);else if(typeof userData?.organizationName==="string")setOrganizationName(userData.organizationName);else setOrganizationName("Not set");}
      if (active && saved && typeof saved === "object") setProject({ ...emptyFieldProject, ...(saved as Partial<FieldProject>) });
    }).catch(() => { if (active) setNotice("Project profile could not be loaded. You can retry by reopening this page."); }).finally(() => { if (active) setProfileLoading(false); });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update(); window.addEventListener("online", update); window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);

  function openDrawing(id: string) {
    if (user?.uid) localStorage.setItem(`epcx-current-drawing:${user.uid}`, id);
    setAddAction(""); setPage("drawings");
  }
  function showWorkspace() { setAddAction(""); setPage("workspace"); }
  function showDrawings() { setAddAction(""); setInitialDprId(""); setPage("drawings"); }
  function showDpr() { setAddAction(""); setPage("dpr"); }
  async function signOutToHome() { await logout(); router.push("/"); }
  function addDrawing() { setAddAction("drawing"); setPage("drawings"); }
  function addDpr() { setAddAction("dpr"); setPage("dpr"); }
  function openDpr(id: string) { setInitialDprId(id); setAddAction(""); setPage("dpr"); }
  function openRecord(id: string) { setInitialRecordId(id); setAddAction(""); setPage("record"); }
  async function saveProject(next: FieldProject) {
    if (!user || user.isAnonymous) return;
    setProjectSaving(true); setNotice("");
    try {
      const saved = { ...next, id: next.id || "primary", updatedAt: new Date().toISOString() };
      await setDoc(doc(db, "users", user.uid), { fieldWorkspace: { project: saved } }, { merge: true });
      setProject(saved); setNotice("Project profile saved. New records will use this project context."); setPage("workspace");
    } catch { setNotice("Project profile could not be saved. Check your connection and try again."); }
    finally { setProjectSaving(false); }
  }

  const displayName = user?.displayName || user?.email || "Account";
  const initials = displayName.slice(0, 1).toUpperCase();
  const pageProps = { onAddDrawing: addDrawing, onAddDpr: addDpr, onOpenDrawing: openDrawing, onOpenDpr: openDpr, onOpenRecord: openRecord, project, onContinueWork: showDrawings, onOpenProject: () => setPage("project") };

  return <main className="field-records-app">
    <header className="field-app-header">
      <div className="field-app-brand-area">
        <Link href="/" className="field-app-logo" aria-label="EPCX.cloud home">EPCX<span>.cloud</span></Link>
        <div className="field-project-switcher">
          <button className="field-project-trigger" onClick={() => { setProjectOpen((open) => !open); setAccountOpen(false); setToolsOpen(false); }} aria-expanded={projectOpen}><Building2 size={16}/><span><small>PROJECT / SITE</small><b>{profileLoading ? "Loading…" : project.name || "Set up project"}</b></span><ChevronDown size={14}/></button>
          {projectOpen && <div className="field-app-popover project-popover"><small>CURRENT PROJECT</small><b>{project.name || "No project profile yet"}</b><span>{project.location || "Add a site location to identify today’s records."}</span><button onClick={() => { setProjectOpen(false); setPage("project"); }}>Project profile <ArrowIcon/></button></div>}
        </div>
      </div>
      <nav className="field-app-primary-nav" aria-label="Workspace navigation">{mainNavigation.map(({ id, label, icon: Icon }) => <button key={id} className={page === id || (id === "records" && page === "record") ? "active" : ""} onClick={() => { setPage(id); setAddAction(""); setToolsOpen(false); }}>{<Icon size={16}/>}<span>{label}</span></button>)}
        <div className="field-tools-wrap"><button className={toolsOpen ? "active" : ""} onClick={() => { setToolsOpen((open) => !open); setAccountOpen(false); setProjectOpen(false); }} aria-expanded={toolsOpen}><Wrench size={16}/><span>Tools</span><ChevronDown size={13}/></button>{toolsOpen&&<div className="field-app-popover tools-popover"><small>FIELD TOOLS</small><Link href="/start?view=drawings&add=drawing"><BookOpen size={16}/>Drawing Workbench</Link><Link href="/tools/drawing-materials"><Boxes size={16}/>Material records</Link><Link href="/tools/work-order"><FileText size={16}/>Work orders</Link><Link href="/tools/ra-check"><Activity size={16}/>RA bill check</Link><Link href="/tools/photo-review"><ShieldCheck size={16}/>Photo review</Link><p>MIV, welding and NDT tools can be added here as their field record workflows are ready.</p></div>}</div>
      </nav>
      <div className="field-app-right">
        <div className={`field-app-connection ${online ? "online" : "offline"}`} title={online ? "Internet connection available; individual records may still be saving" : "Offline; changes may be waiting to sync"}>
          <Cloud size={14}/><span>{online ? "Online" : "Offline"}</span>
        </div>
        <div className="field-account-wrap">
          <button className="field-profile-trigger" onClick={() => { setAccountOpen((open) => !open); setProjectOpen(false); setToolsOpen(false); }} aria-expanded={accountOpen} aria-label={`Account: ${displayName}`}>
            {user?.photoURL ? <img src={user.photoURL} alt=""/> : <span className="field-account-avatar">{initials}</span>}
            <span className="field-profile-name">{displayName}</span><ChevronDown size={14}/>
          </button>
          {accountOpen && <div className="field-app-popover account-popover">
            <div className="field-account-summary">
              {user?.photoURL ? <img src={user.photoURL} alt=""/> : <span className="field-account-avatar">{initials}</span>}
              <span><b>{displayName}</b><small>{user?.email || "Signed-in EPCX account"}</small></span>
            </div>
            <div className="field-account-meta"><span>Organization</span><b>{organizationName}</b><span>Current project</span><b>{project.name || "Not set"}</b></div>
            <button onClick={() => { setAccountOpen(false); setPage("profile"); }}><UserRound size={15}/>Profile</button>
            <button onClick={() => { setAccountOpen(false); setPage("project"); }}><Building2 size={15}/>Project</button>
            <button onClick={() => { setAccountOpen(false); setPage("team"); }}><Users size={15}/>Team</button>
            <Link href="/settings"><Settings size={15}/>Settings</Link>
            <button className="field-account-signout" onClick={() => { void signOutToHome(); }}><LogOut size={15}/>Sign out</button>
          </div>}
        </div>
      </div>
    </header>
    {notice&&<div className="field-app-notice" role="status">{notice}<button onClick={() => setNotice("")}>Dismiss</button></div>}
    <div className="field-records-panel" key={page}>
      {(page === "workspace" || page === "records") && <FieldWorkspaceHome {...pageProps}/>}
      {page === "today" && <FieldWorkspaceHome {...pageProps} today/>}
      {page === "reports" && <FieldWorkspaceHome {...pageProps} reports/>}
      {page === "drawings" && <DrawingFirstWorkbench initialView="drawings" initialAction={addAction === "drawing" ? "drawing" : ""} project={project}/>}
      {page === "dpr" && <DailyDprWorkspace onOpenDrawing={openDrawing} initialAdd={addAction === "dpr"} initialRecordId={initialDprId} project={project}/>}
      {page === "record" && <FieldRecordWorkbench recordId={initialRecordId} onBack={showWorkspace}/>}
      {page === "project" && <FieldProjectProfile project={project} saving={projectSaving} onSave={(next) => void saveProject(next)}/>}
      {page === "profile" && <section className="field-settings-page"><header><span><UserRound size={18}/>ACCOUNT PROFILE</span><h1>Your EPCX account</h1><p>Your sign-in is shared across the workspace and workbenches.</p></header><div className="field-profile-account-card">{user?.photoURL?<img src={user.photoURL} alt="Profile"/>:<span className="field-account-avatar">{initials}</span>}<div><h2>{displayName}</h2><p>{user?.email}</p><small>{user?.providerData.map((provider) => provider.providerId === "google.com" ? "Google account" : provider.providerId).join(" · ") || "EPCX account"}</small></div></div><button className="field-back-to-workspace" onClick={showWorkspace}>Return to workspace</button></section>}
      {page === "team" && <section className="field-settings-page"><header><span><Users size={18}/>TEAM</span><h1>Site team</h1><p>Keep this workspace ready for project collaboration. Team invitations and role controls will be added when shared project access is enabled.</p></header><div className="field-team-card"><div className="field-account-avatar">{initials}</div><span><b>{displayName}</b><small>Current account · project owner</small></span><span className="field-team-status">You</span></div><button className="field-back-to-workspace" onClick={() => setPage("project")}>Review project profile</button></section>}
    </div>
  </main>;
}

function ArrowIcon() { return <span aria-hidden="true">→</span>; }
