"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getSafePostAuthPath } from "@/lib/auth-redirect";
import { getFriendlyAuthErrorMessage } from "@/lib/firebase/auth";
import { EpcxSpinner } from "@/components/ui/EpcxSpinner";

export default function LoginPage() {
  const { user, loading: authLoading, redirectError, signIn, signInGoogle } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestRegister, setSuggestRegister] = useState(false);
  const [redirectPath, setRedirectPath] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const target = params.get("redirect");
    if (target) setRedirectPath(target);
  }, []);

  // Automatically navigate if user completes redirect flow or is already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      const target = redirectPath || new URLSearchParams(window.location.search).get("redirect");
      const safePath = getSafePostAuthPath(target);
      window.location.href = safePath;
    }
  }, [user, authLoading, redirectPath]);

  // Display errors that occurred during redirect OAuth callback
  useEffect(() => {
    if (redirectError) {
      setError(redirectError);
    }
  }, [redirectError]);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuggestRegister(false);
    setLoading(true);
    try {
      await signIn(email, password);
      const target = redirectPath || new URLSearchParams(window.location.search).get("redirect");
      window.location.href = getSafePostAuthPath(target);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/user-not-found" || code === "auth/invalid-credential") {
        setSuggestRegister(true);
        setError("No account found matching this email address.");
      } else {
        setSuggestRegister(false);
        setError(getFriendlyAuthErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError("");
    setSuggestRegister(false);
    setGoogleLoading(true);
    try {
      const result = await signInGoogle();
      if (result) {
        const target = redirectPath || new URLSearchParams(window.location.search).get("redirect");
        const safePath = getSafePostAuthPath(target);
        window.location.href = safePath;
        return;
      }
      // If result is undefined/void, browser is redirecting to Google
    } catch (err: unknown) {
      console.error("Google sign-in error:", err);
      const code = (err as { code?: string })?.code;
      if (code === "auth/popup-closed-by-user") {
        setError("Sign-in window was closed before completion. Tap to try again.");
      } else {
        setError(getFriendlyAuthErrorMessage(err));
      }
      setGoogleLoading(false);
    }
  }

  const registerHref = redirectPath
    ? `/register?redirect=${encodeURIComponent(redirectPath)}`
    : "/register";

  if (!authLoading && user) {
    return (
      <div className="text-center py-12 space-y-3">
        <EpcxSpinner size="md" inline />
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          Signed in successfully
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Moving you to your field workspace...
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white mb-1.5">
          Welcome back
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Sign in to EPCX Cloud
        </p>
      </div>

      {/* Google */}
      <button
        onClick={handleGoogleLogin}
        disabled={googleLoading}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all disabled:opacity-60 mb-5 active:scale-[0.99]"
      >
        <svg className="w-4.5 h-4.5" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        {googleLoading ? "Connecting with Google..." : "Continue with Google"}
      </button>

      <div className="relative mb-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200 dark:border-slate-700" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 text-xs text-slate-400 bg-white dark:bg-brand-900">
            or continue with email
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-sm text-slate-800 dark:text-slate-200 space-y-2.5">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <span className="text-slate-700 dark:text-slate-300">{error}</span>
          </div>
          {suggestRegister && (
            <div className="pt-2 border-t border-amber-200/60 dark:border-amber-800/40 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400">Don&apos;t have an account yet?</span>
              <Link
                href={`/register?email=${encodeURIComponent(email)}&redirect=${encodeURIComponent(redirectPath || "/start")}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent-600 hover:bg-accent-700 text-white text-xs font-semibold transition-colors shadow-sm"
              >
                Create free account →
              </Link>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleEmailLogin} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
            Email address
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (suggestRegister) setSuggestRegister(false);
              }}
              placeholder="you@company.com"
              className="w-full pl-10 pr-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-accent-500 transition-colors"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-11 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-accent-500 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-accent-500 hover:bg-accent-600 text-white font-semibold text-sm transition-all duration-200 disabled:opacity-60 mt-2 active:scale-[0.99]"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Don&apos;t have an account?{" "}
        <Link href={registerHref} className="font-semibold text-accent-500 hover:text-accent-600 transition-colors">
          Create account
        </Link>
      </p>
    </motion.div>
  );
}
