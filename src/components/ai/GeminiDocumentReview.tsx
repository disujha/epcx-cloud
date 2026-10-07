"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, FileText, LoaderCircle, Sparkles } from "lucide-react";
import { fetchGeminiTrialStatus, type GeminiTrialStatus } from "@/lib/ai/firebase-provider";
import type { AIResponse } from "@/lib/ai/types";

const TASKS = {
  gaps: {
    label: "Check for gaps",
    prompt: "Review the supplied engineering document for missing, ambiguous, or conflicting requirements. For every finding, quote or point to the supplied text. Separate confirmed facts from questions that need an engineer's review. Do not claim regulatory noncompliance unless the source supports it.",
  },
  summary: {
    label: "Summarize",
    prompt: "Summarize the supplied engineering document using only information in the source. Cover its scope, key requirements, applicable standards, inspection or testing requirements, and open questions when present. Mark absent information as not stated; do not infer it.",
  },
  inspection: {
    label: "Extract inspection checkpoints",
    prompt: "Extract inspection, testing, hold, and witness checkpoints from the supplied engineering document. For each item, give the activity, acceptance criteria if stated, inspection method if stated, and source section or quoted wording. Mark details not stated instead of inventing them.",
  },
} as const;
const MAX_DOCUMENT_BYTES = 14_000;

type TaskKey = keyof typeof TASKS;

function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = String(error.code);
    if (code.includes("resource-exhausted")) return "The free AI usage limit has been reached. Please try again later.";
    if (code.includes("failed-precondition")) return "The document review is temporarily unavailable. Please try again later.";
    if (code.includes("unauthenticated")) return "Your sign-in has expired. Sign in again to continue.";
    if (code.includes("unavailable")) return "The document assistant is temporarily unavailable. Please try again later.";
  }
  return "The review could not be completed. Please try again.";
}

export function GeminiDocumentReview() {
  const [status, setStatus] = useState<GeminiTrialStatus | null>(null);
  const [statusError, setStatusError] = useState("");
  const [task, setTask] = useState<TaskKey>("gaps");
  const [documentText, setDocumentText] = useState("");
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const documentBytes = new TextEncoder().encode(documentText).length;

  const refreshStatus = useCallback(async () => {
    try {
      const nextStatus = await fetchGeminiTrialStatus();
      setStatus(nextStatus);
      setStatusError("");
    } catch (reason) {
      setStatus(null);
      setStatusError(errorMessage(reason));
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refreshStatus(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshStatus]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!status || !status.monthlyBudgetAvailable || status.trialUsesRemaining < 1) return;
    setLoading(true);
    setError("");
    setResponse(null);
    try {
      const { getAIProvider } = await import("@/lib/ai");
      const provider = getAIProvider("gemini");
      const result = await provider.complete({
        messages: [{ role: "user", content: TASKS[task].prompt }],
        documentContext: documentText.trim(),
      });
      setResponse(result);
      await refreshStatus();
    } catch (reason) {
      setError(errorMessage(reason));
      await refreshStatus();
    } finally {
      setLoading(false);
    }
  }

  const disabled = loading || !status || !status.monthlyBudgetAvailable || status.trialUsesRemaining < 1 || documentText.trim().length === 0 || documentBytes > MAX_DOCUMENT_BYTES;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-700 dark:text-accent-400">Engineering document task</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-slate-900 dark:text-white">Document review</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          Check a text excerpt for gaps, create a grounded summary, or extract inspection checkpoints. Verify findings against the source before using them for engineering decisions.
        </p>
      </header>

      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>Paste only text you are allowed to share with EPCX AI, which uses an external AI service for this review. Uploaded files are not stored here. AI output can miss or misread requirements and must be checked by a qualified engineer.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-brand-900 sm:p-7">
        {statusError ? (
          <p role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{statusError}</p>
        ) : status ? (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-4 py-3 text-sm dark:bg-slate-800/70">
            <span className="font-medium text-slate-800 dark:text-slate-200">AI document review</span>
            <span className="text-slate-600 dark:text-slate-400">{status.trialUsesRemaining} of 3 uses remaining</span>
          </div>
        ) : (
          <p role="status" className="mb-5 text-sm text-slate-500">Checking availability…</p>
        )}

        {status && !status.monthlyBudgetAvailable && (
          <p role="status" className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">The free AI usage limit has been reached. Please try again later.</p>
        )}
        {status && status.trialUsesRemaining === 0 && (
          <p role="status" className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">All three AI trial uses for this account have been used.</p>
        )}

        <form onSubmit={submit} className="space-y-5">
          <div>
            <label htmlFor="review-task" className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200">What do you need?</label>
            <select id="review-task" value={task} onChange={(event) => setTask(event.target.value as TaskKey)} className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
              {Object.entries(TASKS).map(([key, option]) => <option key={key} value={key}>{option.label}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="document-text" className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200"><FileText className="h-4 w-4 text-accent-600" aria-hidden="true" />Document text</label>
            <textarea
              id="document-text"
              required
              value={documentText}
              onChange={(event) => setDocumentText(event.target.value)}
              maxLength={14000}
              rows={12}
              placeholder="Paste a specification, scope, inspection section, or other engineering text…"
              className="w-full resize-y rounded-lg border border-slate-300 bg-white p-3 text-sm leading-6 text-slate-900 placeholder:text-slate-400 focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{documentBytes.toLocaleString()} / {MAX_DOCUMENT_BYTES.toLocaleString()} UTF-8 bytes. The character limit may be reached sooner for non-ASCII text.</p>
          </div>

          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{error}</p>}

          <button type="submit" disabled={disabled} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
            {loading ? "Reviewing…" : "Run review"}
          </button>
        </form>
      </div>

      {response && (
        <section aria-live="polite" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-brand-900 sm:p-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
            <h2 className="font-semibold text-slate-900 dark:text-white">{TASKS[task].label}</h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">{response.trialUsesRemaining} free uses left</span>
          </div>
          <div className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 dark:text-slate-300">{response.content}</div>
          <p className="mt-5 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500 dark:border-slate-800 dark:text-slate-400">AI assisted output. Confirm each finding against the source document and applicable project requirements.</p>
        </section>
      )}
    </div>
  );
}
