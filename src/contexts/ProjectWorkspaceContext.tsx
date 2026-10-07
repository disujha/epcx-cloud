"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getUserProjects } from "@/lib/firebase/firestore";
import type { Project } from "@/types/firebase";

const STORAGE_KEY = "epcx-selected-project";
type Value = { projects: Project[]; project: Project | null; loading: boolean; selectProject: (id: string) => void; refreshProjects: (selectId?: string) => Promise<void> };
const Context = createContext<Value | null>(null);

export function ProjectWorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]); const [projectId, setProjectId] = useState(""); const [loading, setLoading] = useState(true);
  const refreshProjects = useCallback(async (selectId?: string) => {
    if (!user) { setProjects([]); setProjectId(""); setLoading(false); return; }
    try {
      const rows = await getUserProjects(user.uid); setProjects(rows);
      const saved = window.localStorage.getItem(STORAGE_KEY) ?? "";
      const activeId = rows.some((item) => item.id === selectId) ? selectId! : rows.some((item) => item.id === saved) ? saved : rows[0]?.id ?? "";
      setProjectId(activeId);
      if (activeId) window.localStorage.setItem(STORAGE_KEY, activeId); else window.localStorage.removeItem(STORAGE_KEY);
    } finally { setLoading(false); }
  }, [user]);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => refreshProjects()).catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refreshProjects]);
  const selectProject = useCallback((id: string) => {
    if (!projects.some((item) => item.id === id)) return;
    setProjectId(id); window.localStorage.setItem(STORAGE_KEY, id);
  }, [projects]);
  const project = projects.find((item) => item.id === projectId) ?? null;
  const value = useMemo(() => ({ projects, project, loading, selectProject, refreshProjects }), [projects, project, loading, selectProject, refreshProjects]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useProjectWorkspace() {
  const value = useContext(Context);
  if (!value) throw new Error("useProjectWorkspace must be used within ProjectWorkspaceProvider");
  return value;
}
