"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { useProjectWorkspace } from "@/contexts/ProjectWorkspaceContext";
import { ChevronDown, MapPinned, CreditCard } from "lucide-react";
import { getBillingOverview, type BillingOverview } from "@/lib/billing";
import Link from "next/link";
import { EpcxSpinner } from "@/components/ui/EpcxSpinner";

function ProjectContextBar() {
  const { projects, project, loading, selectProject } = useProjectWorkspace();
  const { user } = useAuth();
  const [billing, setBilling] = useState<BillingOverview | null>(null);
  useEffect(() => { let live = true; if (user) void getBillingOverview(project?.id).then((result) => { if (live) setBilling(result); }).catch(() => undefined); return () => { live = false; }; }, [user, project?.id]);
  if (!loading && projects.length === 0) return null;
  return <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-6 py-3 backdrop-blur dark:border-slate-800 dark:bg-brand-950/95 lg:px-8">
    <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
      <div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-[.18em] text-slate-400">Project / site</p>
        {projects.length > 1 ? <label className="flex items-center gap-1"><select aria-label="Select project" className="max-w-[min(70vw,520px)] truncate bg-transparent text-sm font-semibold text-slate-900 outline-none dark:text-white" value={project?.id ?? ""} onChange={(e) => selectProject(e.target.value)}>{projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown className="h-3.5 w-3.5 text-slate-400" /></label> : <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{project?.name ?? (loading ? "Loading project…" : "No project selected")}</p>}
      </div><div className="flex items-center gap-3"><Link href="/pricing" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 hover:border-accent-500 hover:text-accent-700 dark:border-slate-700 dark:text-slate-300"><CreditCard className="h-3.5 w-3.5 text-accent-600" />{billing?.currentPlan.name ?? "Plans"}{typeof billing?.usage.dpr === "number" ? <span className="hidden text-slate-400 sm:inline">· {billing.usage.dpr}/{billing.currentPlan.dprLimit} DPR</span> : null}</Link><MapPinned className="h-4 w-4 shrink-0 text-accent-600" /></div>
    </div>
  </div>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-brand-950">
        <div className="flex items-center gap-3">
          <EpcxSpinner size="sm" inline />
          <span className="text-sm text-slate-500">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-brand-950 overflow-hidden">
      {/* Sidebar */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <ProjectContextBar />
        <div className="max-w-7xl mx-auto p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
