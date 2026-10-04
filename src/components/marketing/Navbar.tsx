"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X, LogOut, UserRound, BriefcaseBusiness, ChevronDown, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const navLinks = [
  { href: "/#product", label: "Product" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#field-teams", label: "For Teams" },
  { href: "/#examples", label: "Examples" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const accountUser = user && !user.isAnonymous ? user : null;

  async function signOutToHome() {
    await logout();
    setAccountMenuOpen(false);
    setMobileOpen(false);
    router.push("/");
  }

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isLightHome = pathname === "/";
  const isDarkHeaderPage = ["/solutions", "/industries", "/case-studies"].includes(pathname);
  const isTextLight = !scrolled && isDarkHeaderPage;

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 motion-reduce:transition-none",
        scrolled
          ? isLightHome
            ? "bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm"
            : "bg-white/90 dark:bg-brand-950/90 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 shadow-sm"
          : "bg-transparent"
      )}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg">
              <Image src="/images/icon.png" alt="EPCX Logo" width={32} height={32} className="h-full w-full object-contain" />
            </div>
            <span className={cn(
              "font-display font-bold text-lg tracking-tight transition-colors duration-200",
              isTextLight ? "text-white" : isLightHome ? "text-slate-900" : "text-slate-900 dark:text-white"
            )}>
              EPCX<span className="text-accent-500">.cloud</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-2.5 py-2 rounded-lg text-xs font-medium transition-colors duration-200 lg:text-sm",
                    active
                      ? isTextLight
                        ? "text-white bg-white/10"
                        : "text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800"
                      : isTextLight
                        ? "text-slate-300 hover:text-white hover:bg-white/5"
                      : isLightHome
                        ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/70"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-3">
            {accountUser ? (
              <div
                className="public-account-wrap"
                onMouseEnter={() => setAccountMenuOpen(true)}
                onMouseLeave={() => setAccountMenuOpen(false)}
                onFocus={() => setAccountMenuOpen(true)}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setAccountMenuOpen(false);
                }}
              >
                <button className="navbar-account" onClick={() => setAccountMenuOpen((open) => !open)} aria-expanded={accountMenuOpen} aria-haspopup="menu" aria-label={`Account menu for ${accountUser.displayName || accountUser.email}`}>
                  <span className="navbar-account-avatar">{(accountUser.displayName || accountUser.email || "E").slice(0, 1).toUpperCase()}</span>
                  <span className="navbar-account-name">{accountUser.displayName || accountUser.email}</span>
                  <ChevronDown size={14} className="navbar-account-chevron"/>
                </button>
                {accountMenuOpen && <div className="public-account-menu" role="menu">
                  <div className="public-account-menu-head"><span className="public-account-menu-kicker">SIGNED IN</span><b>{accountUser.displayName || accountUser.email}</b><small>{accountUser.email}</small></div>
                  <Link role="menuitem" href="/start" onClick={() => setAccountMenuOpen(false)}><BriefcaseBusiness size={16}/><span><b>Open workspace</b><small>Continue to your field records</small></span><ArrowUpRight size={14} className="public-account-menu-end"/></Link>
                  <Link role="menuitem" href="/start?view=profile" onClick={() => setAccountMenuOpen(false)}><UserRound size={16}/><span><b>Profile</b><small>Account details</small></span></Link>
                  <button role="menuitem" onClick={() => void signOutToHome()}><LogOut size={16}/><span><b>Sign out</b><small>Return to the EPCX home page</small></span></button>
                </div>}
              </div>
            ) : !loading && <><Link href="/login?redirect=%2Fstart" className="navbar-signin">Sign in</Link><Link href="/login?redirect=%2Fstart" className="navbar-workspace-cta">Open workspace<ArrowUpRight size={15}/></Link></>}
          </div>

          {/* Mobile toggle */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                isTextLight ? "text-white" : isLightHome ? "text-slate-700" : "text-slate-700 dark:text-slate-300"
              )}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
          <div
            className={`lg:hidden overflow-hidden border-b ${isLightHome ? "bg-white border-slate-200" : "bg-white dark:bg-brand-950 border-slate-200 dark:border-slate-800"}`}
          >
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    pathname === link.href
                      ? "text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800"
                      : isLightHome ? "text-slate-600" : "text-slate-600 dark:text-slate-400"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-3 pb-1">{accountUser ? <><div className="mobile-nav-account"><span className="navbar-account-avatar">{(accountUser.displayName || accountUser.email || "E").slice(0, 1).toUpperCase()}</span><span>{accountUser.displayName || accountUser.email}</span></div><div className="mobile-public-actions"><Link href="/start" onClick={() => setMobileOpen(false)} className="navbar-workspace-cta">Open workspace</Link><button onClick={()=>void signOutToHome()}><LogOut size={15}/>Sign out</button></div></> : !loading && <div className="mobile-public-actions"><Link href="/login?redirect=%2Fstart" onClick={() => setMobileOpen(false)}>Sign in</Link><Link href="/login?redirect=%2Fstart" onClick={() => setMobileOpen(false)} className="navbar-workspace-cta">Open workspace</Link></div>}</div>
            </div>
          </div>
        )}
    </header>
  );
}
