"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { BookOpen, Building2, CalendarDays, Camera, ChevronDown, ChevronRight, Cloud, CreditCard, FileBarChart2, FileText, FolderOpen, Home, LogOut, Save, Settings, Sparkles, UserRound, Users, Wrench, ShieldCheck, ClipboardList, ArrowRight, HardHat, Clock, PlusCircle, UploadCloud, History, Layers, CheckCircle2, ClipboardCheck, FileSpreadsheet, FileCheck2, Calculator, Scale } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useAuth } from "@/contexts/AuthContext";
import { db, storage } from "@/lib/firebase/config";
import { createProject, getUserProfile, saveProfessionalProfile, updateProject } from "@/lib/firebase/firestore";
import { DailyDprWorkspace } from "@/components/field-progress/DailyDprWorkspace";
import { DrawingFirstWorkbench } from "@/components/field-progress/DrawingFirstWorkbench";
import { FieldWorkspaceHome } from "@/components/field-progress/FieldWorkspaceHome";
import { FieldRecordWorkbench } from "@/components/field-progress/FieldRecordWorkbench";
import { FieldProjectTeam } from "@/components/field-progress/FieldProjectTeam";
import { PhotoReviewClient } from "@/components/pilot/PhotoReviewClient";
import { useProjectWorkspace } from "@/contexts/ProjectWorkspaceContext";
import type { Project } from "@/types/firebase";
import { getBillingOverview, type BillingOverview } from "@/lib/billing";
import { emptyFieldProject, FieldProjectProfile, type FieldProject } from "@/components/field-progress/FieldProjectProfile";
import { WorkRegisterWorkspace } from "@/components/field-progress/WorkRegisterWorkspace";
import { FieldToolboxWorkspace, type ActiveTool } from "@/components/field-progress/FieldToolboxWorkspace";
import { FieldWorkProvider } from "@/contexts/FieldWorkContext";
import { EpcxSpinner, EpcxLoadingScreen } from "@/components/ui/EpcxSpinner";

type Page = "workspace" | "work" | "drawings" | "dpr" | "today" | "quality" | "reports" | "tools" | "record" | "photo-review" | "project" | "profile" | "settings" | "team";
const mainNavigation: { id: Page; label: string; icon: typeof Home }[] = [
  { id: "today", label: "Today & history", icon: CalendarDays }, { id: "work", label: "Work", icon: HardHat }, { id: "drawings", label: "Drawings", icon: BookOpen }, { id: "quality", label: "Quality", icon: ShieldCheck }, { id: "reports", label: "Reports", icon: FileBarChart2 }, { id: "tools", label: "Tools", icon: Wrench },
];
export function FieldRecordsWorkspace({ view = "workspace", add = "", record = "" }: { view?: string; add?: string; record?: string }) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { project: selectedProject, projects: projectSites, loading: projectContextLoading, selectProject, refreshProjects } = useProjectWorkspace();
  const router = useRouter();
  const initialPage: Page = view === "records" ? "today" : ["dpr", "today", "drawings", "reports", "project", "profile", "settings", "team", "tools", "work", "quality"].includes(view) ? view as Page : "today";
  const [page, setPage] = useState<Page>(initialPage);
  const [activeQualityWorkItemId, setActiveQualityWorkItemId] = useState<string | undefined>(undefined);
  const [activeQualityKind, setActiveQualityKind] = useState<"fitup-photo" | "welding-photo">("welding-photo");
  const [activeToolboxTool, setActiveToolboxTool] = useState<ActiveTool>("menu");
  const [activeReportSubtype, setActiveReportSubtype] = useState<"dpr_summary" | "work_register" | "drawing_progress" | "reconciliation" | "missing_unreported">("dpr_summary");
  const [drawingSubView, setDrawingSubView] = useState<"today" | "history" | "drawings">("today");
  const [addAction, setAddAction] = useState<"drawing" | "dpr" | "tbt" | "">(add === "dpr" ? "dpr" : add === "drawing" ? "drawing" : add === "tbt" ? "tbt" : "");
  const [initialDprId, setInitialDprId] = useState(record);
  const [initialRecordId, setInitialRecordId] = useState("");
  const [project, setProject] = useState<FieldProject>(emptyFieldProject);
  const [organizationName, setOrganizationName] = useState("Not set");
  const [profileLoading, setProfileLoading] = useState(true);
  const [projectSaving, setProjectSaving] = useState(false);
  const [projectCreateMode, setProjectCreateMode] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  const [accountOpen, setAccountOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [activeNavDropdown, setActiveNavDropdown] = useState<Page | null>(null);
  const navHoverTimeout = useRef<NodeJS.Timeout | null>(null);

  function handleNavEnter(id: Page) {
    if (navHoverTimeout.current) clearTimeout(navHoverTimeout.current);
    navHoverTimeout.current = setTimeout(() => {
      setActiveNavDropdown(id);
    }, 100);
  }

  function handleNavLeave() {
    if (navHoverTimeout.current) clearTimeout(navHoverTimeout.current);
    navHoverTimeout.current = setTimeout(() => {
      setActiveNavDropdown(null);
    }, 150);
  }

  function handleNavClick(id: Page) {
    if (navHoverTimeout.current) clearTimeout(navHoverTimeout.current);
    setActiveNavDropdown(null);
    setPage(id);
    setAddAction("");
    setAccountOpen(false);
    setProjectOpen(false);
    if (id === "tools") setActiveToolboxTool("menu");
    if (id === "drawings") setDrawingSubView("today");
  }

  const [online, setOnline] = useState(true);
  const [billing, setBilling] = useState<BillingOverview | null>(null);
  const [profileForm, setProfileForm] = useState({ displayName: user?.displayName ?? "", designation: "", phoneNumber: "", company: "", department: "", discipline: "", workLocation: "", employeeId: "", photoURL: user?.photoURL ?? "" });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  useEffect(() => { let live = true; if (user && !user.isAnonymous) void getBillingOverview(selectedProject?.id).then((value) => { if (live) setBilling(value); }).catch(() => undefined); return () => { live = false; }; }, [user, selectedProject?.id]);

  useEffect(() => {
    let active = true;
    if (!user || user.isAnonymous) { Promise.resolve().then(() => { if (active) { setProject(emptyFieldProject); setProfileLoading(false); } }); return () => { active = false; }; }
    getDoc(doc(db, "users", user.uid)).then((snapshot) => {
      const userData=snapshot.data();const saved = userData?.fieldWorkspace?.project;
      if(active){const organization=userData?.organization;if(typeof organization==="string")setOrganizationName(organization);else if(organization&&typeof organization.name==="string")setOrganizationName(organization.name);else if(typeof userData?.organizationName==="string")setOrganizationName(userData.organizationName);else setOrganizationName("Not set");}
      if (active && saved && typeof saved === "object") setProject({ ...emptyFieldProject, ...(saved as Partial<FieldProject>) });
    }).catch(() => { if (active) setNotice("Project profile could not be loaded. You can retry by reopening this page."); }).finally(() => { if (active) setProfileLoading(false); });
    return () => { active = false; };
  }, [user, selectedProject?.id]);

  useEffect(() => {
    if (!user || user.isAnonymous) return;
    let active = true;
    void getUserProfile(user.uid).then((saved) => {
      if (!active) return;
      if (!saved) {
        setProfileForm((current) => ({ ...current, displayName: user.displayName || current.displayName }));
        return;
      }
      setProfileForm((current) => ({
        displayName: saved.displayName || user.displayName || current.displayName,
        designation: saved.designation ?? "",
        phoneNumber: saved.phoneNumber ?? "",
        company: saved.company ?? "",
        department: saved.department ?? "",
        discipline: saved.discipline ?? "",
        workLocation: saved.workLocation ?? "",
        employeeId: saved.employeeId ?? "",
        photoURL: saved.photoURL ?? user.photoURL ?? "",
      }));
    }).catch(() => { if (active) setProfileMessage("Saved profile details could not be loaded."); });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update(); window.addEventListener("online", update); window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);

  useEffect(() => {
    function handleDocumentClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (!target.closest(".field-project-switcher") && !target.closest(".field-account-wrap") && !target.closest(".field-nav-wrapper")) {
        setProjectOpen(false);
        setAccountOpen(false);
        setActiveNavDropdown(null);
      }
    }
    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, []);

  function openDrawing(id: string) {
    if (user?.uid) localStorage.setItem(`epcx-current-drawing:${user.uid}`, id);
    setAddAction(""); setPage("drawings");
  }
  function showWorkspace() { setAddAction(""); setPage("workspace"); }
  function showDrawings() { setAddAction(""); setInitialDprId(""); setPage("drawings"); }
  async function signOutToHome() { await logout(); router.push("/"); }
  function addDrawing() {
    if (billing && typeof billing.usage.drawings === "number" && billing.usage.drawings >= billing.currentPlan.drawingLimit) { setNotice(`Drawing allowance reached. Your existing drawings remain available. View Usage & Plan to review capacity.`); return; }
    setAddAction("drawing"); setPage("drawings");
  }
  function addDpr() {
    if (billing && typeof billing.usage.dpr === "number" && billing.usage.dpr >= billing.currentPlan.dprLimit) { setNotice(`DPR allowance reached. Your existing DPRs remain available. View Usage & Plan to review capacity.`); return; }
    setAddAction("dpr"); setPage("dpr");
  }
  function openDpr(id: string) { setInitialDprId(id); setAddAction(""); setPage("dpr"); }
  function openRecord(id: string) { setInitialRecordId(id); setAddAction(""); setPage("record"); }
  async function saveProject(next: FieldProject) {
    if (!user || user.isAnonymous || !next.name.trim()) return;
    if (projectContextLoading) { setNotice("Project access is still loading. Try saving again in a moment."); return; }
    setProjectSaving(true); setNotice("");
    try {
      const values = Object.fromEntries(Object.entries({
        name: next.name.trim(), projectCode: next.projectNumber.trim(), projectType: (next.projectType || undefined) as Project["projectType"],
        status: next.projectStatus as Project["status"], client: next.client.trim(), pmcConsultant: next.pmcConsultant.trim(),
        epcContractor: next.epcContractor.trim(), mainContractor: next.mainContractor.trim(), location: next.location.trim(),
        facility: next.facility.trim(), projectContact: next.contact.trim(),
        startDate: next.startDate, endDate: next.expectedCompletion, actualCompletion: next.actualCompletion,
        areaUnits: next.areas.split(",").map((item) => item.trim()).filter(Boolean),
        disciplines: next.disciplines.split(",").map((item) => item.trim()).filter(Boolean),
        workTypes: (next.workTypes || next.disciplines).split(",").map((item) => item.trim()).filter(Boolean),
        primaryDisciplines: next.primaryDisciplines.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 2),
      }).filter(([, value]) => value !== undefined)) as Partial<Project>;
      let projectId = selectedProject?.id;
      if (selectedProject && !projectCreateMode) {
        try {
          await updateProject(selectedProject.id, values);
        } catch (updateErr: unknown) {
          const errStr = String(updateErr);
          if (errStr.includes("insufficient permissions") || errStr.includes("permission-denied") || errStr.includes("Missing or insufficient permissions")) {
            const created = await createProject({ ...values, name: next.name.trim(), ownerId: user.uid });
            projectId = created.id;
          } else {
            throw updateErr;
          }
        }
      } else {
        const created = await createProject({ ...values, name: next.name.trim(), ownerId: user.uid });
        projectId = created.id;
      }
      const saved = { ...next, id: projectId || next.id, name: next.name.trim() };
      setProject(saved);
      setProjectCreateMode(false);
      try {
        await setDoc(doc(db, "users", user.uid), { fieldWorkspace: { project: saved } }, { merge: true });
      } catch (userErr) {
        console.warn("[FieldRecordsWorkspace] could not save project to user profile", userErr);
      }
      if (projectId) await refreshProjects(projectId);
      setNotice("Project profile saved.");
      setPage("workspace");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Project profile could not be saved. Check your connection and try again."); }
    finally { setProjectSaving(false); }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || user.isAnonymous) return;
    setProfileSaving(true);
    setProfileMessage("");
    const displayName = profileForm.displayName.trim();
    try {
      await saveProfessionalProfile(user.uid, { ...profileForm, displayName, email: user.email ?? "" });
      if (displayName && displayName !== user.displayName || profileForm.photoURL && profileForm.photoURL !== user.photoURL) {
        await updateProfile(user, { ...(displayName && displayName !== user.displayName ? { displayName } : {}), ...(profileForm.photoURL ? { photoURL: profileForm.photoURL } : {}) });
      }
      setProfileForm((current) => ({ ...current, displayName }));
      setProfileMessage("Profile details saved.");
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : "Profile details could not be saved.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function uploadProfilePhoto(file?: File) {
    if (!file || !user || user.isAnonymous) return;
    if (!file.type.startsWith("image/")) { setProfileMessage("Choose an image file for your profile photo."); return; }
    if (file.size > 5 * 1024 * 1024) { setProfileMessage("Profile photos must be 5 MB or smaller."); return; }
    setProfileSaving(true); setProfileMessage("");
    try {
      const photoRef = ref(storage, `users/${user.uid}/profile/avatar-${Date.now()}`);
      await uploadBytes(photoRef, file);
      const photoURL = await getDownloadURL(photoRef);
      setProfileForm((current) => ({ ...current, photoURL }));
      setProfileMessage("Photo uploaded. Save your profile to keep it.");
    } catch (error) { setProfileMessage(error instanceof Error ? error.message : "Profile photo could not be uploaded."); }
    finally { setProfileSaving(false); }
  }

  const displayName = user?.displayName || user?.email || "Account";
  const initials = displayName.slice(0, 1).toUpperCase();
  const legacyProjectMatches = Boolean(selectedProject && (project.id === selectedProject.id || (projectSites.length === 1 && project.name.trim().toLowerCase() === selectedProject.name.trim().toLowerCase())));
  const legacyProject = selectedProject && !legacyProjectMatches ? emptyFieldProject : project;
  const workspaceProject: FieldProject = selectedProject ? {
    ...emptyFieldProject, ...legacyProject, id: selectedProject.id, name: selectedProject.name,
    projectNumber: selectedProject.projectCode ?? legacyProject.projectNumber,
    projectType: selectedProject.projectType ?? legacyProject.projectType,
    projectStatus: selectedProject.status ?? "planning",
    client: selectedProject.client ?? legacyProject.client,
    pmcConsultant: selectedProject.pmcConsultant ?? legacyProject.pmcConsultant,
    epcContractor: selectedProject.epcContractor ?? legacyProject.epcContractor,
    mainContractor: selectedProject.mainContractor ?? legacyProject.mainContractor,
    location: selectedProject.location ?? legacyProject.location,
    facility: selectedProject.facility ?? legacyProject.facility,
    contact: selectedProject.projectContact ?? legacyProject.contact,
    startDate: selectedProject.startDate ?? legacyProject.startDate,
    expectedCompletion: selectedProject.endDate ?? legacyProject.expectedCompletion,
    actualCompletion: selectedProject.actualCompletion ?? legacyProject.actualCompletion,
    areas: selectedProject.areaUnits?.join(", ") ?? legacyProject.areas,
    disciplines: selectedProject.disciplines?.join(", ") ?? legacyProject.disciplines,
    workTypes: selectedProject.workTypes?.join(", ") ?? legacyProject.workTypes,
    primaryDisciplines: selectedProject.primaryDisciplines?.join(", ") ?? legacyProject.primaryDisciplines,
  } : project;
  const pageProps = {
    onAddDrawing: addDrawing,
    onAddDpr: addDpr,
    onOpenDrawing: openDrawing,
    onOpenDpr: openDpr,
    onOpenRecord: openRecord,
    project: workspaceProject,
    billing: billing ?? undefined,
    onContinueWork: showDrawings,
    onOpenProject: () => setPage("project"),
    onOpenWork: () => setPage("work"),
    onOpenTools: () => setPage("tools"),
    initialAdd: addAction,
  };

  return <main className="field-records-app">
    <header className="field-app-header">
      <div className="field-app-brand-area">
        <Link href="/" className="field-app-logo" aria-label="EPCX.cloud home">EPCX<span>.cloud</span></Link>
        <div className="field-project-switcher">
          <button className="field-project-trigger" onClick={() => { setProjectOpen((open) => !open); setAccountOpen(false); setActiveNavDropdown(null); }} aria-expanded={projectOpen}><Building2 size={16}/><span><small>PROJECT / SITE</small><b>{profileLoading ? <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><EpcxSpinner size="xs" inline />Loading…</span> : workspaceProject.name || "Set up project"}</b></span><ChevronDown size={14}/></button>
          {projectOpen && (
            <div className="field-submenu-popover project-popover" onClick={(e) => e.stopPropagation()}>
              <div className="field-submenu-project-hero">
                <small>PROJECT / SITE CONTEXT</small>
                <b>{workspaceProject.name || "No project selected"}</b>
                <span>{workspaceProject.location || "Add a site location to identify today’s records."}</span>
              </div>
              {projectSites.length > 0 && (
                <div style={{ padding: "4px 8px 6px" }}>
                  <label style={{ display: "grid", gap: "3px" }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "#718278", textTransform: "uppercase" }}>{projectSites.length > 1 ? "Switch project" : "Current project"}</span>
                    <select
                      style={{ width: "100%", height: "30px", padding: "0 8px", border: "1px solid #d7ddd7", borderRadius: "5px", background: "#fff", fontSize: "12px", color: "#18272e" }}
                      value={selectedProject?.id ?? ""}
                      onChange={(event) => {
                        if (event.target.value === "__new_project__") {
                          setProjectOpen(false);
                          setProjectCreateMode(true);
                          setProject(emptyFieldProject);
                          setPage("project");
                          return;
                        }
                        selectProject(event.target.value);
                        setProjectCreateMode(false);
                      }}
                    >
                      <option value="" disabled>Select a project</option>
                      {projectSites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
                      <option value="__new_project__">+ New project / site</option>
                    </select>
                  </label>
                </div>
              )}
              <div className="field-submenu-list">
                <button
                  className="field-submenu-item"
                  onClick={() => {
                    setProjectOpen(false);
                    setProjectCreateMode(!workspaceProject.name && !selectedProject);
                    if (!workspaceProject.name && !selectedProject) setProject(emptyFieldProject);
                    setPage("project");
                  }}
                >
                  <span className="field-submenu-icon">
                    <Building2 size={16} />
                  </span>
                  <span className="field-submenu-text">
                    <span className="field-submenu-title">{workspaceProject.name ? "Project Profile & Codes" : "Set Up Project"}</span>
                    <span className="field-submenu-desc">Location, contractors & contract metadata</span>
                  </span>
                  <ChevronRight size={14} className="field-submenu-arrow" />
                </button>
                <button
                  className="field-submenu-item"
                  onClick={() => {
                    setProjectOpen(false);
                    setProjectCreateMode(true);
                    setProject(emptyFieldProject);
                    setPage("project");
                  }}
                >
                  <span className="field-submenu-icon">
                    <PlusCircle size={16} />
                  </span>
                  <span className="field-submenu-text">
                    <span className="field-submenu-title">Create New Project Site</span>
                    <span className="field-submenu-desc">Start a separate isolated project workspace</span>
                  </span>
                  <ChevronRight size={14} className="field-submenu-arrow" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <nav className="field-app-primary-nav" aria-label="Workspace navigation">
        {mainNavigation.map(({ id, label, icon: Icon }) => {
          const isDropdownOpen = activeNavDropdown === id;
          const align = id === "today" ? "left" : id === "tools" ? "right" : "center";
          return (
            <div
              key={id}
              className="field-nav-wrapper"
              data-align={align}
              data-open={isDropdownOpen}
              onMouseEnter={() => handleNavEnter(id)}
              onMouseLeave={handleNavLeave}
            >
              <button
                data-nav={id}
                className={page === id || (id === "today" && page === "record") ? "active" : ""}
                onClick={() => handleNavClick(id)}
                aria-expanded={isDropdownOpen}
              >
                <Icon size={16} />
                <span>{label}</span>
                <ChevronDown size={11} className="field-nav-chevron" />
              </button>

              {isDropdownOpen && (
                <div className="field-submenu-popover field-nav-submenu" onClick={(e) => e.stopPropagation()}>
                  {id === "today" && (
                    <>
                      <span className="field-submenu-eyebrow">FIELD COMMAND DESK</span>
                      <div className="field-submenu-list">
                        <button
                          className="field-submenu-item"
                          onClick={() => { handleNavClick("today"); }}
                        >
                          <span className="field-submenu-icon">
                            <CalendarDays size={16} />
                          </span>
                          <span className="field-submenu-text">
                            <span className="field-submenu-title">Today’s Field Work</span>
                            <span className="field-submenu-desc">Daily status, active work items & site desk</span>
                          </span>
                          <ChevronRight size={14} className="field-submenu-arrow" />
                        </button>
                        <button
                          className="field-submenu-item"
                          onClick={() => { handleNavClick("today"); }}
                        >
                          <span className="field-submenu-icon">
                            <Clock size={16} />
                          </span>
                          <span className="field-submenu-text">
                            <span className="field-submenu-title">Shift Activity History</span>
                            <span className="field-submenu-desc">Historical shift logs, updates & timeline</span>
                          </span>
                          <ChevronRight size={14} className="field-submenu-arrow" />
                        </button>
                        <hr className="field-submenu-divider" />
                        <button
                          className="field-submenu-item"
                          onClick={() => { setActiveNavDropdown(null); setPage("today"); addDrawing(); }}
                        >
                          <span className="field-submenu-icon">
                            <PlusCircle size={16} />
                          </span>
                          <span className="field-submenu-text">
                            <span className="field-submenu-title">+ Add Field Record</span>
                            <span className="field-submenu-desc">Contextual capture: drawing, DPR, TBT or photo</span>
                          </span>
                          <ChevronRight size={14} className="field-submenu-arrow" />
                        </button>
                      </div>
                    </>
                  )}

                  {id === "work" && (
                    <>
                      <span className="field-submenu-eyebrow">CENTRAL REGISTER</span>
                      <div className="field-submenu-list">
                        <button
                          className="field-submenu-item"
                          onClick={() => { handleNavClick("work"); }}
                        >
                          <span className="field-submenu-icon">
                            <HardHat size={16} />
                          </span>
                          <span className="field-submenu-text">
                            <span className="field-submenu-title">Project Work Register</span>
                            <span className="field-submenu-desc">Authoritative register of all site work items</span>
                          </span>
                          <ChevronRight size={14} className="field-submenu-arrow" />
                        </button>
                        <button
                          className="field-submenu-item"
                          onClick={() => { handleNavClick("work"); }}
                        >
                          <span className="field-submenu-icon">
                            <Layers size={16} />
                          </span>
                          <span className="field-submenu-text">
                            <span className="field-submenu-title">Discipline & Area Audit</span>
                            <span className="field-submenu-desc">Filter piping, civil, electrical or structures</span>
                          </span>
                          <ChevronRight size={14} className="field-submenu-arrow" />
                        </button>
                        <button
                          className="field-submenu-item"
                          onClick={() => { handleNavClick("work"); }}
                        >
                          <span className="field-submenu-icon">
                            <BookOpen size={16} />
                          </span>
                          <span className="field-submenu-text">
                            <span className="field-submenu-title">Drawing-Linked Items</span>
                            <span className="field-submenu-desc">Work items anchored to spatial drawings</span>
                          </span>
                          <ChevronRight size={14} className="field-submenu-arrow" />
                        </button>
                      </div>
                    </>
                  )}

                  {id === "drawings" && (
                    <>
                      <span className="field-submenu-eyebrow">SPATIAL WORKBENCH</span>
                      <div className="field-submenu-list">
                        <button
                          className="field-submenu-item"
                          onClick={() => { setActiveNavDropdown(null); setDrawingSubView("today"); setPage("drawings"); }}
                        >
                          <span className="field-submenu-icon">
                            <BookOpen size={16} />
                          </span>
                          <span className="field-submenu-text">
                            <span className="field-submenu-title">Today’s Active Drawings</span>
                            <span className="field-submenu-desc">Working sheets with today’s markups & progress</span>
                          </span>
                          <ChevronRight size={14} className="field-submenu-arrow" />
                        </button>
                        <button
                          className="field-submenu-item"
                          onClick={() => { setActiveNavDropdown(null); setDrawingSubView("history"); setPage("drawings"); }}
                        >
                          <span className="field-submenu-icon">
                            <History size={16} />
                          </span>
                          <span className="field-submenu-text">
                            <span className="field-submenu-title">Previous & Historical Sheets</span>
                            <span className="field-submenu-desc">Browse earlier drawing revisions & sheets</span>
                          </span>
                          <ChevronRight size={14} className="field-submenu-arrow" />
                        </button>
                        <hr className="field-submenu-divider" />
                        <button
                          className="field-submenu-item"
                          onClick={() => { setActiveNavDropdown(null); addDrawing(); }}
                        >
                          <span className="field-submenu-icon">
                            <UploadCloud size={16} />
                          </span>
                          <span className="field-submenu-text">
                            <span className="field-submenu-title">+ Upload New Drawing</span>
                            <span className="field-submenu-desc">Add PDF or image drawing to project</span>
                          </span>
                          <ChevronRight size={14} className="field-submenu-arrow" />
                        </button>
                      </div>
                    </>
                  )}

                  {id === "quality" && (
                    <>
                      <span className="field-submenu-eyebrow">QUALITY & INSPECTION</span>
                      <div className="field-submenu-list">
                        <button
                          className="field-submenu-item"
                          onClick={() => { setActiveNavDropdown(null); setActiveQualityKind("welding-photo"); setPage("quality"); }}
                        >
                          <span className="field-submenu-icon">
                            <ShieldCheck size={16} />
                          </span>
                          <span className="field-submenu-text">
                            <span className="field-submenu-title">Welding Inspection Desk</span>
                            <span className="field-submenu-desc">Visual observations & weld joint verification</span>
                          </span>
                          <ChevronRight size={14} className="field-submenu-arrow" />
                        </button>
                        <button
                          className="field-submenu-item"
                          onClick={() => { setActiveNavDropdown(null); setActiveQualityKind("fitup-photo"); setPage("quality"); }}
                        >
                          <span className="field-submenu-icon">
                            <CheckCircle2 size={16} />
                          </span>
                          <span className="field-submenu-text">
                            <span className="field-submenu-title">Fit-up Photo Check</span>
                            <span className="field-submenu-desc">Joint alignment, root gap & bevel verification</span>
                          </span>
                          <ChevronRight size={14} className="field-submenu-arrow" />
                        </button>
                        <button
                          className="field-submenu-item"
                          onClick={() => { setActiveNavDropdown(null); setPage("quality"); }}
                        >
                          <span className="field-submenu-icon">
                            <ClipboardCheck size={16} />
                          </span>
                          <span className="field-submenu-text">
                            <span className="field-submenu-title">Observation Review Register</span>
                            <span className="field-submenu-desc">Inspector observations, NDT status & sign-off</span>
                          </span>
                          <ChevronRight size={14} className="field-submenu-arrow" />
                        </button>
                      </div>
                    </>
                  )}

                  {id === "reports" && (
                    <>
                      <span className="field-submenu-eyebrow">FIELD REPORTING & EXPORTS</span>
                      <div className="field-submenu-list">
                        <button
                          className="field-submenu-item"
                          onClick={() => { setActiveNavDropdown(null); setActiveReportSubtype("dpr_summary"); setPage("reports"); }}
                        >
                          <span className="field-submenu-icon">
                            <FileBarChart2 size={16} />
                          </span>
                          <span className="field-submenu-text">
                            <span className="field-submenu-title">Daily Progress Report (DPR)</span>
                            <span className="field-submenu-desc">Daily executive summary and shift outputs</span>
                          </span>
                          <ChevronRight size={14} className="field-submenu-arrow" />
                        </button>
                        <button
                          className="field-submenu-item"
                          onClick={() => { setActiveNavDropdown(null); setActiveReportSubtype("work_register"); setPage("reports"); }}
                        >
                          <span className="field-submenu-icon">
                            <FileSpreadsheet size={16} />
                          </span>
                          <span className="field-submenu-text">
                            <span className="field-submenu-title">Work Item Register Export</span>
                            <span className="field-submenu-desc">Export complete project register to Excel/CSV</span>
                          </span>
                          <ChevronRight size={14} className="field-submenu-arrow" />
                        </button>
                        <button
                          className="field-submenu-item"
                          onClick={() => { setActiveNavDropdown(null); setActiveReportSubtype("reconciliation"); setPage("reports"); }}
                        >
                          <span className="field-submenu-icon">
                            <FileCheck2 size={16} />
                          </span>
                          <span className="field-submenu-text">
                            <span className="field-submenu-title">DPR ↔ Drawing Reconciliation</span>
                            <span className="field-submenu-desc">Audit reported DPR progress vs sheet markups</span>
                          </span>
                          <ChevronRight size={14} className="field-submenu-arrow" />
                        </button>
                      </div>
                    </>
                  )}

                  {id === "tools" && (
                    <>
                      <span className="field-submenu-eyebrow">FIELD TOOLS & TRANSFORMS</span>
                      <div className="field-submenu-list">
                        <button
                          className="field-submenu-item"
                          onClick={() => { setActiveNavDropdown(null); setActiveToolboxTool("dpr_extractor"); setPage("tools"); }}
                        >
                          <span className="field-submenu-icon">
                            <FileText size={16} />
                          </span>
                          <span className="field-submenu-text">
                            <span className="field-submenu-title">DPR Table Extractor</span>
                            <span className="field-submenu-desc">Parse tabular data from PDF/image reports</span>
                          </span>
                          <ChevronRight size={14} className="field-submenu-arrow" />
                        </button>
                        <button
                          className="field-submenu-item"
                          onClick={() => { setActiveNavDropdown(null); setActiveToolboxTool("reconciliation"); setPage("tools"); }}
                        >
                          <span className="field-submenu-icon">
                            <FileCheck2 size={16} />
                          </span>
                          <span className="field-submenu-text">
                            <span className="field-submenu-title">DPR ↔ Drawing Reconciliation</span>
                            <span className="field-submenu-desc">Cross-verify reported vs spatial execution</span>
                          </span>
                          <ChevronRight size={14} className="field-submenu-arrow" />
                        </button>
                        <button
                          className="field-submenu-item"
                          onClick={() => { setActiveNavDropdown(null); setActiveToolboxTool("inch_dia_calc"); setPage("tools"); }}
                        >
                          <span className="field-submenu-icon">
                            <Calculator size={16} />
                          </span>
                          <span className="field-submenu-text">
                            <span className="field-submenu-title">Inch-Dia Piping Calculator</span>
                            <span className="field-submenu-desc">Welding inch-dia progress & inch-meter factors</span>
                          </span>
                          <ChevronRight size={14} className="field-submenu-arrow" />
                        </button>
                        <button
                          className="field-submenu-item"
                          onClick={() => { setActiveNavDropdown(null); setActiveToolboxTool("structural_calc"); setPage("tools"); }}
                        >
                          <span className="field-submenu-icon">
                            <Scale size={16} />
                          </span>
                          <span className="field-submenu-text">
                            <span className="field-submenu-title">Structural Steel Estimator</span>
                            <span className="field-submenu-desc">Tonnage takeoff and structural erection tracking</span>
                          </span>
                          <ChevronRight size={14} className="field-submenu-arrow" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div className="field-app-right">
        <div className={`field-app-connection ${online ? "online" : "offline"}`} title={online ? "Internet connection available; individual records may still be saving" : "Offline; changes may be waiting to sync"}>
          <Cloud size={14}/><span>{online ? "Online" : "Offline"}</span>
        </div>
        <Link href="/pricing" className="field-billing-pill" aria-label="View EPCX plans and pricing"><CreditCard size={13}/><span>{billing?.currentPlan.name ?? "Plans"}</span>{typeof billing?.usage.dpr === "number" && <small>{billing.usage.dpr}/{billing.currentPlan.dprLimit} DPR</small>}</Link>
        <div className="field-account-wrap">
          <button
            className="field-profile-trigger"
            onClick={() => {
              setAccountOpen((open) => !open);
              setProjectOpen(false);
              setActiveNavDropdown(null);
            }}
            aria-expanded={accountOpen}
            aria-label={`Account: ${displayName}`}
          >
            {user?.photoURL ? <img src={user.photoURL} alt=""/> : <span className="field-account-avatar">{initials}</span>}
            <span className="field-profile-name">{displayName}</span><ChevronDown size={14}/>
          </button>
          {accountOpen && (
            <div className="field-submenu-popover account-popover" onClick={(e) => e.stopPropagation()}>
              <div className="field-submenu-account-header">
                {user?.photoURL ? <img src={user.photoURL} alt="" /> : <span className="field-account-avatar">{initials}</span>}
                <div>
                  <b>{displayName}</b>
                  <small>{user?.email || "Signed-in EPCX account"}</small>
                </div>
              </div>
              <div className="field-submenu-account-meta">
                <span>Organization</span>
                <b>{organizationName}</b>
                <span>Current project</span>
                <b>{workspaceProject.name || "Not set"}</b>
              </div>
              <div className="field-submenu-list">
                <button className="field-submenu-item" onClick={() => { setAccountOpen(false); setPage("profile"); }}>
                  <span className="field-submenu-icon">
                    <UserRound size={16} />
                  </span>
                  <span className="field-submenu-text">
                    <span className="field-submenu-title">Account Profile</span>
                    <span className="field-submenu-desc">Personal & professional credentials</span>
                  </span>
                  <ChevronRight size={14} className="field-submenu-arrow" />
                </button>
                <button className="field-submenu-item" onClick={() => { setAccountOpen(false); setPage("project"); }}>
                  <span className="field-submenu-icon">
                    <Building2 size={16} />
                  </span>
                  <span className="field-submenu-text">
                    <span className="field-submenu-title">Project Settings</span>
                    <span className="field-submenu-desc">Site parameters, codes & contractors</span>
                  </span>
                  <ChevronRight size={14} className="field-submenu-arrow" />
                </button>
                <button className="field-submenu-item" onClick={() => { setAccountOpen(false); setPage("team"); }}>
                  <span className="field-submenu-icon">
                    <Users size={16} />
                  </span>
                  <span className="field-submenu-text">
                    <span className="field-submenu-title">Project Team</span>
                    <span className="field-submenu-desc">Site members, roles & permissions</span>
                  </span>
                  <ChevronRight size={14} className="field-submenu-arrow" />
                </button>
                <button className="field-submenu-item" onClick={() => { setAccountOpen(false); setPage("settings"); }}>
                  <span className="field-submenu-icon">
                    <Settings size={16} />
                  </span>
                  <span className="field-submenu-text">
                    <span className="field-submenu-title">Workspace Settings</span>
                    <span className="field-submenu-desc">Color appearance, theme & security</span>
                  </span>
                  <ChevronRight size={14} className="field-submenu-arrow" />
                </button>
                <hr className="field-submenu-divider" />
                <button className="field-submenu-item danger" onClick={() => { void signOutToHome(); }}>
                  <span className="field-submenu-icon">
                    <LogOut size={16} />
                  </span>
                  <span className="field-submenu-text">
                    <span className="field-submenu-title">Sign Out</span>
                    <span className="field-submenu-desc">Log out of EPCX on this device</span>
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
    {notice && (
      <aside className="field-app-notice-overlay" aria-live="polite">
        <div
          className={`field-app-notice ${
            notice.toLowerCase().includes("could not") ||
            notice.toLowerCase().includes("error") ||
            notice.toLowerCase().includes("permission")
              ? "danger"
              : ""
          }`}
          role="status"
        >
          <span className="field-app-notice-icon">
            {notice.toLowerCase().includes("could not") ||
            notice.toLowerCase().includes("error") ||
            notice.toLowerCase().includes("permission") ? (
              <span className="notice-chip-dot danger" />
            ) : (
              <CheckCircle2 size={16} className="notice-chip-icon-success" />
            )}
          </span>
          <span className="field-app-notice-text">{notice}</span>
          {notice.includes("allowance reached") && (
            <Link href="/pricing" className="field-app-notice-link">
              View plans
            </Link>
          )}
          <button
            type="button"
            className="field-app-notice-dismiss"
            onClick={() => setNotice("")}
            aria-label="Dismiss notification"
          >
            Dismiss
          </button>
        </div>
      </aside>
    )}
    <div className="field-records-panel" key={page}>
      <FieldWorkProvider currentProjectId={workspaceProject.id || undefined}>
        {page === "workspace" && <FieldWorkspaceHome {...pageProps}/>}
        {page === "today" && <FieldWorkspaceHome {...pageProps} today/>}
        {page === "work" && (
          <WorkRegisterWorkspace
            project={workspaceProject}
            onOpenDrawing={openDrawing}
            onOpenDpr={openDpr}
            onOpenQuality={(workItemId) => {
              setActiveQualityWorkItemId(workItemId);
              setActiveQualityKind("welding-photo");
              setPage("quality");
            }}
          />
        )}
        {page === "reports" && <FieldWorkspaceHome {...pageProps} reports/>}
        {page === "drawings" && (
          <DrawingFirstWorkbench
            initialView={drawingSubView}
            initialAction={addAction === "drawing" ? "drawing" : ""}
            project={workspaceProject}
          />
        )}
        {page === "dpr" && <DailyDprWorkspace onOpenDrawing={openDrawing} initialAdd={addAction === "dpr"} initialRecordId={initialDprId} project={workspaceProject}/>}
        {page === "record" && <FieldRecordWorkbench recordId={initialRecordId} onBack={showWorkspace}/>}
        {page === "photo-review" && <section className="field-settings-page field-ai-review-page"><header><p className="field-section-kicker"><Sparkles size={14}/>AI ASSISTED REVIEW</p><h1>Welding &amp; fit-up photos</h1><p className="field-workspace-subline">Prepare draft observations from site photos for a qualified inspector to review.</p></header><PhotoReviewClient embedded/></section>}
        {page === "quality" && (
          <section className="work-register-workbench field-quality-hub">
            <header className="work-reg-header">
              <div className="work-reg-title-wrap">
                <p className="field-section-kicker">
                  <ShieldCheck size={14} />
                  <span>QUALITY &amp; INSPECTION DESK</span>
                </p>
                <h1>Quality &amp; Inspection Desk</h1>
                <p className="field-workspace-subline">
                  Contextual visual observations and NDT decisions for qualified inspector review.
                </p>
              </div>
            </header>
            <PhotoReviewClient
              embedded
              initialWorkItemId={activeQualityWorkItemId}
              initialKind={activeQualityKind}
            />
          </section>
        )}
        {page === "tools" && (
          <FieldToolboxWorkspace
            project={workspaceProject}
            initialTool={activeToolboxTool}
            onOpenDrawing={openDrawing}
            onOpenDpr={openDpr}
          />
        )}
        {page === "settings" && <section className="field-settings-page"><header><p className="field-section-kicker"><Settings size={14}/>WORKSPACE SETTINGS</p><h1>Settings</h1><p className="field-workspace-subline">Choose how EPCX behaves and manage your account and project workspace.</p></header><form onSubmit={(event) => event.preventDefault()}><section><h2>Appearance</h2><label className="field-profile-field">Color theme<select aria-label="Color theme" value={theme ?? "system"} onChange={(event) => setTheme(event.target.value)}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select><small>Applied immediately on this device.</small></label></section><section><h2>Account</h2><div className="field-settings-account"><span>Signed-in account</span><b>{user?.email || "No email address"}</b></div><button className="field-settings-action" type="button" onClick={() => setPage("profile")}><UserRound size={15}/>Account profile</button></section><section><h2>Project / Workspace</h2><div className="field-settings-account"><span>Current project / site</span><b>{workspaceProject.name || "No project selected"}</b></div><div className="field-settings-actions"><button className="field-settings-action" type="button" onClick={() => setPage("project")}><Building2 size={15}/>Project profile</button><button className="field-settings-action" type="button" onClick={() => setPage("team")}><Users size={15}/>Project team</button></div></section><section><h2>Security</h2><p className="field-settings-security">Password and sign-in methods are managed by your account provider.</p></section><footer><small>Theme is saved automatically on this device.</small></footer></form><button className="field-back-to-workspace" onClick={showWorkspace}>Return to workspace</button></section>}
        {page === "project" && <FieldProjectProfile key={`${projectCreateMode ? "new" : workspaceProject.id}`} project={projectCreateMode ? emptyFieldProject : workspaceProject} saving={projectSaving} readOnly={!projectCreateMode && Boolean(selectedProject && selectedProject.ownerId !== user?.uid && selectedProject.members?.[user?.uid ?? ""] !== "project_admin")} onSave={(next) => void saveProject(next)}/>}
        {page === "profile" && <section className="field-settings-page field-profile-page"><header><p className="field-section-kicker"><UserRound size={14}/>ACCOUNT PROFILE</p><h1>Account profile</h1><p className="field-workspace-subline">Your personal and professional details.</p></header><div className="field-profile-account-card">{profileForm.photoURL?<img src={profileForm.photoURL} alt="Profile"/>:<span className="field-account-avatar">{initials}</span>}<div><h2>{profileForm.displayName || displayName}</h2><p>{profileForm.designation || "Add your designation"} · {profileForm.company || "Company not set"}</p><small>{user?.email}</small></div></div><label className="field-profile-photo-upload"><Camera size={15}/>{profileSaving ? "Uploading…" : "Upload / change photo"}<input type="file" accept="image/*" disabled={profileSaving} onChange={(event) => void uploadProfilePhoto(event.target.files?.[0])}/></label><form onSubmit={(event) => void saveProfile(event)}><section><h2>Personal details</h2><div className="field-profile-grid"><label className="field-profile-field">Full name<input autoComplete="name" value={profileForm.displayName} onChange={(event) => setProfileForm((current) => ({ ...current, displayName: event.target.value }))}/></label><label className="field-profile-field">Email address<input type="email" value={user?.email ?? ""} readOnly aria-describedby="profile-email-note"/><small id="profile-email-note">Managed by your sign-in provider.</small></label><label className="field-profile-field">Phone number<input type="tel" autoComplete="tel" value={profileForm.phoneNumber} onChange={(event) => setProfileForm((current) => ({ ...current, phoneNumber: event.target.value }))}/></label><label className="field-profile-field">Base location<input autoComplete="address-level2" value={profileForm.workLocation} onChange={(event) => setProfileForm((current) => ({ ...current, workLocation: event.target.value }))}/></label></div></section><section><h2>Professional details</h2><div className="field-profile-grid"><label className="field-profile-field">Designation / role<input autoComplete="organization-title" value={profileForm.designation} onChange={(event) => setProfileForm((current) => ({ ...current, designation: event.target.value }))} placeholder="e.g. Site Engineer"/></label><label className="field-profile-field">Company<input autoComplete="organization" value={profileForm.company} onChange={(event) => setProfileForm((current) => ({ ...current, company: event.target.value }))}/></label><label className="field-profile-field">Department<input value={profileForm.department} onChange={(event) => setProfileForm((current) => ({ ...current, department: event.target.value }))}/></label><label className="field-profile-field">Discipline<input value={profileForm.discipline} onChange={(event) => setProfileForm((current) => ({ ...current, discipline: event.target.value }))} placeholder="e.g. Civil, Mechanical, QA/QC"/></label><label className="field-profile-field">Employee ID <small>Optional</small><input value={profileForm.employeeId} onChange={(event) => setProfileForm((current) => ({ ...current, employeeId: event.target.value }))}/></label></div></section><footer><small role="status">{profileMessage || "Changes are saved to your EPCX account."}</small><button type="submit" disabled={profileSaving}><Save size={15}/>{profileSaving ? "Saving…" : "Save profile"}</button></footer></form><button className="field-back-to-workspace" onClick={showWorkspace}>Return to workspace</button></section>}
        {page === "team" && <FieldProjectTeam project={selectedProject} organizationName={organizationName} onSetUpProject={() => setPage("project")}/>}
      </FieldWorkProvider>
    </div>
  </main>;
}

function ArrowIcon() { return <span aria-hidden="true">→</span>; }
