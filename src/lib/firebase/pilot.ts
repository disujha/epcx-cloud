"use client";

import { getFunctions, httpsCallable } from "firebase/functions";
import { ref, uploadBytesResumable } from "firebase/storage";
import { signInAnonymously } from "firebase/auth";
import { signInWithGoogle } from "@/lib/firebase/auth";
import { appCheck, auth, storage } from "./config";
import app from "./config";

function functions() {
  if (typeof window === "undefined") throw new Error("Pilot tasks run in a browser.");
  const siteKey = process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY;
  if (!siteKey || !appCheck) throw new Error("This task is temporarily unavailable. Please try again later.");
  return getFunctions(app, "us-central1");
}

export type PilotTool = "ra-check" | "drawing-materials" | "work-order" | "tbt-register" | "fitup-photo" | "welding-photo";
export type PilotFileMeta = { name: string; size: number; contentType: string };
export type PilotResult = { tool: PilotTool; title: string; summary: string; rows: Array<Record<string, string | number | boolean | null>>; columns: Array<{ key: string; label: string }>; fields: Array<{ key: string; label: string; value: string; sourceRef?: { fileName: string; page?: number; row?: number; excerpt: string } }>; limitations: string[]; sources: Array<{ fileName: string; pageCount?: number; rowCount?: number }> };

export async function pilotConfig() {
  await guestAuth();
  const call = httpsCallable<Record<string, never>, { tools: Record<PilotTool, { enabled: boolean; extensions: string[]; maxUploadBytes: number; maxJobsPerRolling30Days: number; maxPdfPages: number; maxRows: number }>; privacy: { inputExpiryDays: number; resultRetentionDays: number } }>(functions(), "getPilotConfig");
  return (await call({})).data;
}

async function guestAuth() {
  functions();
  if (!auth.currentUser) await signInAnonymously(auth);
}

export async function runPilot(tool: PilotTool, files: File[], options?: { context?:string; onStage?: (message:string)=>void }): Promise<{ result: PilotResult; remainingAfterCompletion: number; jobId:string }> {
  await guestAuth();
  const fn = functions();
  const create = httpsCallable<{ tool: PilotTool; files: PilotFileMeta[]; requestId: string }, { jobId: string; files: Array<{ name: string; path: string; contentType: string }>; remainingAfterCompletion: number }>(fn, "createPilotJob");
  const created = (await create({ tool, files: files.map((file) => ({ name: file.name, size: file.size, contentType: file.type || "application/octet-stream" })), requestId: crypto.randomUUID() })).data;
  options?.onStage?.("Uploading private source files");
  await Promise.all(files.map((file, index) => new Promise<void>((resolve, reject) => {
    const target = ref(storage, created.files[index].path);
    const task = uploadBytesResumable(target, file, { contentType: file.type || created.files[index].contentType });
    task.on("state_changed", undefined, reject, resolve);
  })));
  options?.onStage?.("Files uploaded · processing review draft");
  const process = httpsCallable<{ jobId: string; context?:string }, { result: PilotResult; remainingAfterCompletion: number }>(fn, "processPilotJob", { timeout: 300_000 });
  return { ...(await process({ jobId: created.jobId,context:options?.context?.slice(0,500) })).data, jobId: created.jobId };
}

export async function trackPilotEvent(jobId: string, event: "download" | "correction") {
  await guestAuth();
  const track = httpsCallable<{jobId:string;event:"download"|"correction"}, {ok:boolean}>(functions(), "recordPilotEvent");
  await track({jobId,event});
}

export async function savePilotDraft(result: PilotResult) {
  await guestAuth();
  if (auth.currentUser?.isAnonymous) await signInWithGoogle();
  const save = httpsCallable<{result:PilotResult},{saved:boolean;jobId:string}>(functions(),"savePilotResult");
  return (await save({result})).data;
}

export type SavedPilotDraft = { id:string; tool:PilotTool; title:string; result:PilotResult; savedAtMillis:number|null };

export async function listPilotDrafts() {
  if (!auth.currentUser || auth.currentUser.isAnonymous) throw new Error("Sign in to view saved drafts.");
  const list = httpsCallable<Record<string,never>,{drafts:SavedPilotDraft[]}>(functions(),"listPilotDrafts");
  return (await list({})).data.drafts;
}

export async function deletePilotDraft(id:string) {
  const remove = httpsCallable<{id:string},{deleted:boolean}>(functions(),"deletePilotDraft");
  return (await remove({id})).data;
}

export function exportPilotCsv(result: PilotResult): string {
  const cell = (value: unknown) => '"' + String(value ?? "").replace(/"/g, '""') + '"';
  const fields = result.fields.length ? ["Draft field,Value,Source", ...result.fields.map((field) => [cell(field.label),cell(field.value),cell(field.sourceRef ? field.sourceRef.fileName + (field.sourceRef.page ? ", page " + field.sourceRef.page : field.sourceRef.row ? ", row " + field.sourceRef.row : "") : "")].join(",")),""] : [];
  return [...fields,result.columns.map((column) => cell(column.label)).join(","), ...result.rows.map((row) => result.columns.map((column) => cell(row[column.key])).join(","))].join("\r\n");
}
