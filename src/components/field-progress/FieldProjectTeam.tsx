"use client";

import { useEffect, useState, type FormEvent } from "react";
import { MailPlus, ShieldCheck, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createProjectInvitation, getUserProfile } from "@/lib/firebase/firestore";
import type { Project, ProjectRole, UserProfile } from "@/types/firebase";

const roles: Array<{ id: ProjectRole; label: string; access: string }> = [
  { id: "project_admin", label: "Project Admin", access: "Admin" },
  { id: "editor", label: "Editor", access: "Editor" },
  { id: "contributor", label: "Contributor", access: "Contributor" },
  { id: "viewer", label: "Viewer", access: "Viewer" },
];

export function FieldProjectTeam({ project, organizationName = "", onSetUpProject }: { project: Project | null; organizationName?: string; onSetUpProject: () => void }) {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Record<string, UserProfile | null>>({});
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ProjectRole>("editor");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const memberIds = project ? [...new Set([...(project.memberIds ?? []), ...(project.ownerId ? [project.ownerId] : []), ...Object.keys(project.members ?? {})])] : [];
  const memberIdsKey = memberIds.join("|");

  useEffect(() => {
    let active = true;
    const ids = memberIdsKey ? memberIdsKey.split("|") : [];
    void Promise.all(ids.map(async (id) => [id, await getUserProfile(id).catch(() => null)] as const))
      .then((entries) => { if (active) setProfiles(Object.fromEntries(entries)); });
    return () => { active = false; };
  }, [project?.id, memberIdsKey]);

  const canInvite = Boolean(user && project && (project.ownerId === user.uid || project.members?.[user.uid] === "project_admin"));
  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project || !user || !canInvite) return;
    setBusy(true); setMessage("");
    try {
      await createProjectInvitation({ project, email, role, invitedBy: user.uid, organizationName });
      setMessage(`Invitation saved for ${email.trim()}. They can accept it after signing in with that email.`);
      setEmail("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Invitation could not be created."); }
    finally { setBusy(false); }
  }

  if (!project) return <section className="field-settings-page"><header><span><Users size={18}/>PROJECT TEAM</span><h1>Project team</h1><p>Create or select a project to see its members and access.</p></header><div className="field-team-empty"><Users size={22}/><span><b>No project selected</b><small>Project members and access are managed within a project.</small></span><button onClick={onSetUpProject}>Set up project</button></div></section>;

  return <section className="field-settings-page field-project-team"><header><span><Users size={18}/>PROJECT ACCESS</span><h1>Project team</h1><p>People, project roles, and access for {project.name}.</p></header>
    <section className="field-team-member-list" aria-label="Project members"><header><div><h2>{project.name}</h2><p>{memberIds.length} member{memberIds.length === 1 ? "" : "s"}</p></div></header>
      {memberIds.map((id) => {
        const profile = profiles[id];
        const memberRole = project.members?.[id] ?? (id === project.ownerId ? "project_admin" : "contributor");
        const roleInfo = roles.find((item) => item.id === memberRole) ?? roles[3];
        return <article className="field-team-member" key={id}><span className="field-team-avatar">{(profile?.displayName || (id === user?.uid ? user?.displayName : "M") || "M").slice(0, 1).toUpperCase()}</span><div className="field-team-member-main"><b>{profile?.displayName || (id === user?.uid ? user?.displayName : "Project member")}{id === user?.uid && <small className="field-team-you">You</small>}</b><span>{profile?.email || (id === user?.uid ? user?.email : "")}</span></div><div className="field-team-org"><b>{profile?.company || "Organization not set"}</b><span>{[profile?.designation, profile?.discipline].filter(Boolean).join(" · ") || "Role details not set"}</span></div><div className="field-team-access"><span className={`field-team-role ${memberRole}`}><ShieldCheck size={14}/>{roleInfo.label}</span><small>{roleInfo.access} access · Active</small></div></article>;
      })}
      {!memberIds.length && <p className="field-team-no-members">No project members are listed yet.</p>}
    </section>
    {canInvite ? <form className="field-team-invite" onSubmit={(event) => void invite(event)}><div><h2>Invite a project member</h2><p>They’ll join this project after accepting with the invited email.</p></div><div className="field-team-invite-fields"><label>Email address<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com"/></label><label>Project role<select value={role} onChange={(event) => setRole(event.target.value as ProjectRole)}>{roles.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label><button type="submit" disabled={busy}><MailPlus size={16}/>{busy ? "Saving…" : "Create invitation"}</button></div>{message && <p className="field-team-message" role="status">{message}</p>}</form> : <p className="field-team-note">Project invitations are available to Project Admins.</p>}
  </section>;
}
