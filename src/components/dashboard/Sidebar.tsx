"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, FileText, FolderOpen, Sparkles,
  Settings, User, LogOut, Zap, ChevronRight
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/ai-review", label: "AI Review", icon: Sparkles },
];

const bottomItems = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/profile", label: "Profile", icon: User },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="flex flex-col w-64 h-full bg-white dark:bg-brand-900 border-r border-slate-200 dark:border-slate-800">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-200 dark:border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-500 to-brand-700 flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <span className="font-display font-bold text-base text-slate-900 dark:text-white">
          EPCX<span className="text-accent-500">.cloud</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="mb-4">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-600 mb-1">
            Main
          </p>
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                  active
                    ? "bg-accent-500/10 dark:bg-accent-500/15 text-accent-600 dark:text-accent-400"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <item.icon className={cn("w-4.5 h-4.5 flex-shrink-0", active ? "text-accent-500" : "")} strokeWidth={1.75} />
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight className="w-3.5 h-3.5 text-accent-500" />}
              </Link>
            );
          })}
        </div>

        <div>
          <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-600 mb-1">
            Account
          </p>
          {bottomItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-accent-500/10 text-accent-600 dark:text-accent-400"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <item.icon className={cn("w-4.5 h-4.5", active ? "text-accent-500" : "")} strokeWidth={1.75} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          {user?.photoURL ? (
            <img src={user.photoURL} alt={user.displayName ?? "User"} className="w-8 h-8 rounded-full flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-500 to-brand-700 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
              {getInitials(user?.displayName ?? user?.email ?? "U")}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
              {user?.displayName ?? "User"}
            </div>
            <div className="text-xs text-slate-400 truncate">{user?.email}</div>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-slate-500 dark:text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
        >
          <LogOut className="w-4 h-4" strokeWidth={1.75} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
