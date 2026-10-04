"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Download, FileUp, LoaderCircle, LockKeyhole, RotateCcw } from "lucide-react";
import { exportPilotCsv, pilotConfig, runPilot, savePilotDraft, trackPilotEvent, type PilotResult, type PilotTool } from "@/lib/firebase/pilot";

const tasks: Record<PilotTool, { title:string; description:string; inputs:string; accept:string; fileCount:number; sample:string }> = {
  "ra-check": { title:"RA bill preparation / checking", description:"Compare a current RA progress sheet with its BOQ or work order. Line matching and quantity × rate calculations are deterministic.", inputs:"Select the BOQ/work-order schedule first, then the current RA progress sheet.", accept:".xlsx,.csv,.tsv", fileCount:2, sample:"A BOQ line with 12 m at ₹450/m and an RA claim for 8 m produces a source-linked quantity and amount check." },
  "drawing-materials": { title:"Drawing material extraction", description:"Transcribe an existing BOM or material schedule from selectable PDF text. No geometry takeoff is performed.", inputs:"Drawing PDF (selectable text, up to 10 pages). Scanned PDFs are not supported.", accept:".pdf", fileCount:1, sample:"Illustrative example: Item P-101 · CS pipe · DN50 · 18 m · source read, page 2." },
  "work-order": { title:"Work order extraction", description:"Create an editable draft of work-order fields and BOQ items for confirmation. Nothing is written as an official record.", inputs:"PDF, DOCX, XLSX, CSV, TXT, or pasted text.", accept:".pdf,.docx,.xlsx,.csv,.txt", fileCount:1, sample:"Illustrative example: Work order number and scope cite the original page or table row." },
  "tbt-register": { title:"TBT record digitization", description:"Copy recorded toolbox-talk attendance rows into a downloadable register. Empty marks remain empty.", inputs:"XLSX, CSV, or TSV attendance register. OCR is not enabled.", accept:".xlsx,.csv,.tsv", fileCount:1, sample:"Illustrative example: Attendee and recorded attendance mark remain linked to their source row." },
  "fitup-photo": { title:"Fit-up photo assistance", description:"List possible visible observations and image limitations for a qualified person to review. No fit-up is certified.", inputs:"Up to 3 JPG, PNG, or WebP images with joint context.", accept:".jpg,.jpeg,.png,.webp", fileCount:3, sample:"Illustrative example: Image context is limited; confirm alignment and root gap using approved inspection methods." },
  "welding-photo": { title:"Welding photo assistance", description:"Describe possible visible surface features and limitations for inspector review. Does not replace inspection or NDT.", inputs:"Up to 3 JPG, PNG, or WebP images.", accept:".jpg,.jpeg,.png,.webp", fileCount:3, sample:"Illustrative example: Possible surface feature for inspector review; image alone cannot determine weld acceptance." },
};

export function PilotTaskClient({ tool }: { tool: PilotTool }) {
  const task = tasks[tool];
  const [maxUploadBytes, setMaxUploadBytes] = useState(10 * 1024 * 1024);
  const [freeJobLimit, setFreeJobLimit] = useState(3);
  const [files, setFiles] = useState<File[]>([]);
  const [pastedText,setPastedText]=useState("");
  const [userContext,setUserContext]=useState("");
  const [result, setResult] = useState<PilotResult | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage,setStage]=useState("");
  const [error, setError] = useState("");
  const [rows, setRows] = useState<Array<Record<string, string | number | boolean | null>>>([]);
  const [jobId, setJobId] = useState("");
  const [correctionTracked, setCorrectionTracked] = useState(false);
  const [saveMessage,setSaveMessage]=useState("");
  const [saved,setSaved]=useState(false);
  const [saving,setSaving]=useState(false);

  useEffect(() => { pilotConfig().then((config) => { setMaxUploadBytes(config.tools[tool]?.maxUploadBytes ?? 10 * 1024 * 1024); setFreeJobLimit(config.tools[tool]?.maxJobsPerRolling30Days ?? 3); setEnabled(config.tools[tool]?.enabled === true); }).catch(() => setEnabled(false)); }, [tool]);
  const inputLabel = tool === "ra-check" ? ["BOQ / work order", "Current RA progress"] : [];
  async function submit() {
    if (enabled !== true) return;
    setBusy(true); setStage("Checking files"); setError(""); setResult(null);
    const taskFiles=tool==="work-order"&&!files.length&&pastedText.trim()?[new File([pastedText.trim()],"pasted-work-order.txt",{type:"text/plain"})]:files;
    try { if (taskFiles.some((file) => file.size > maxUploadBytes)) throw new Error(`Each file must be ${Math.floor(maxUploadBytes / 1024 / 1024)} MB or smaller.`); const response = await runPilot(tool, taskFiles,{context:userContext,onStage:(value)=>setStage(value)}); setResult(response.result); setRows(response.result.rows); setRemaining(response.remainingAfterCompletion); setJobId(response.jobId); setCorrectionTracked(false); }
    catch (reason) { setError(reason instanceof Error && reason.message.startsWith("Each file must be") ? reason.message : "This task could not be completed. Please try again later."); }
    finally { setBusy(false); setStage(""); }
  }
  function download() {
    if (!result) return;
    if (jobId) void trackPilotEvent(jobId,"download").catch(()=>undefined);
    const blob = new Blob(["\uFEFF", exportPilotCsv({ ...result, rows })], { type:"text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href=url; anchor.download=tool + "-review.csv"; anchor.click(); URL.revokeObjectURL(url);
  }
  async function saveToWorkspace(){
    if(!result)return;setSaving(true);setSaveMessage("");
    try{await savePilotDraft({...result,rows});setSaved(true);setSaveMessage("Draft saved to your EPCX Cloud workspace.");}
    catch{setSaveMessage("Could not save this draft. Please try again later.");}
    finally{setSaving(false);}
  }

  return <main className="min-h-screen bg-[#f7f8f6] px-4 pb-16 pt-28 text-[#142421] sm:px-6 lg:pt-32">
    <div className="mx-auto max-w-6xl">
      <Link href="/#tasks" className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-[#0e5549] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0e5549]"><ArrowLeft size={16}/> All EPC tasks</Link>
      <div className="mt-7 grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
        <section className="border border-slate-300 bg-white p-6 sm:p-8">
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#0e5549]">EPCX Cloud / EPC task</p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">{task.title}</h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">{task.description}</p>
          <p className="mt-6 text-xs font-bold uppercase tracking-wider text-slate-500">Required input</p><p className="mt-1 text-sm leading-6">{task.inputs}</p>
          <div className="mt-6 border-l-2 border-[#0e5549] bg-[#f3f6f3] p-4 text-sm leading-6"><strong>Illustrative example</strong><br/>{task.sample}</div>
          <p className="mt-5 text-xs leading-5 text-slate-600"><strong>Processing:</strong> {tool === "ra-check" || tool === "tbt-register" ? "This task does not send your files to an AI service." : "Google Gemini 3.1 Flash-Lite helps interpret these files."}</p>
          <p className="mt-3 flex gap-2 text-xs leading-5 text-slate-600"><LockKeyhole size={15} className="mt-0.5 shrink-0"/>Your files are kept private. Inputs are scheduled for deletion after 30 days and results after 7 days. Review <Link href="/privacy" className="font-semibold underline">privacy details</Link>.</p>
        </section>
        <section className="border border-slate-300 bg-white p-6 sm:p-8">
          <h2 className="text-lg font-semibold">Start a review draft</h2>
          {tool === "ra-check" && <p className="mt-2 text-xs text-slate-600">{inputLabel.map((label,index)=><span key={label} className="mr-3">{index+1}. {label}</span>)}</p>}
          {tool === "ra-check" ? <div className="mt-5 grid gap-3 sm:grid-cols-2">{inputLabel.map((label,index)=><label key={label} className="flex min-h-32 cursor-pointer flex-col items-center justify-center border border-dashed border-slate-400 bg-[#fafbf9] px-4 text-center focus-within:ring-2 focus-within:ring-[#0e5549]"><FileUp size={20} className="text-[#0e5549]"/><span className="mt-2 text-sm font-semibold">{label}</span><span className="mt-1 text-xs text-slate-500">XLSX, CSV, TSV · 10 MB max</span><input className="sr-only" type="file" accept={task.accept} onChange={(event)=>{const selected=event.target.files?.[0];if(selected)setFiles((previous)=>{const next=[...previous];next[index]=selected;return next;});}}/></label>)}</div> : <label className="mt-5 flex min-h-36 cursor-pointer flex-col items-center justify-center border border-dashed border-slate-400 bg-[#fafbf9] px-4 text-center focus-within:ring-2 focus-within:ring-[#0e5549]"><FileUp size={23} className="text-[#0e5549]"/><span className="mt-2 text-sm font-semibold">Choose file{task.fileCount>1?"s":""}</span><span className="mt-1 text-xs text-slate-500">10 MB maximum per file</span><input className="sr-only" type="file" accept={task.accept} multiple={task.fileCount>1} onChange={(event)=>{setFiles(Array.from(event.target.files??[]).slice(0,task.fileCount));if(tool==="work-order")setPastedText("");}}/></label>}
          {tool==="work-order"&&<label className="mt-4 block text-xs font-semibold text-slate-600">Or paste work-order text<textarea className="mt-1 min-h-24 w-full border border-slate-300 p-3 text-sm font-normal" maxLength={10000} value={pastedText} onChange={(event)=>{setPastedText(event.target.value);if(event.target.value)setFiles([]);}} placeholder="Paste text from a work order. Text is treated as untrusted source material."/><span className="mt-1 block font-normal">{pastedText.length}/10,000 characters</span></label>}
          {tool.endsWith("photo")&&<label className="mt-4 block text-xs font-semibold text-slate-600">Optional joint or inspection context<textarea className="mt-1 min-h-20 w-full border border-slate-300 p-3 text-sm font-normal" maxLength={500} value={userContext} onChange={(event)=>setUserContext(event.target.value)} placeholder="Up to 500 characters. Context helps orient review; it is not evidence from the image."/><span className="mt-1 block font-normal">{userContext.length}/500 characters</span></label>}
          {files.length>0 && <ul className="mt-3 space-y-1 text-xs text-slate-600">{files.filter(Boolean).map((file,index)=><li key={file.name+index}>{file.name} · {(file.size/1024/1024).toFixed(2)} MB</li>)}</ul>}
          {files.some((file)=>file.size>maxUploadBytes)&&<p role="alert" className="mt-2 text-xs text-red-700">Each file must be {Math.floor(maxUploadBytes/1024/1024)} MB or smaller.</p>}
          {enabled === false ? <p role="status" className="mt-4 border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">This task is temporarily unavailable. Please check back later.</p> : freeJobLimit === 0 ? <p role="status" className="mt-4 border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">Free jobs are temporarily unavailable for this task.</p> : <p className="mt-4 text-xs text-slate-500">Free to try: {freeJobLimit} completed jobs for this task every 30 days.</p>}
          <button type="button" disabled={enabled !== true||freeJobLimit===0||busy||(tool==="ra-check"?(!files[0]||!files[1]):tool==="work-order"?(!files.length&&!pastedText.trim()):files.length===0)||files.some((file)=>file.size>maxUploadBytes)} onClick={submit} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 bg-[#0e5549] px-4 text-sm font-semibold text-white hover:bg-[#0a443a] disabled:cursor-not-allowed disabled:bg-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0e5549] focus-visible:ring-offset-2">
            {busy?<><LoaderCircle size={16} className="animate-spin motion-reduce:animate-none"/> {stage}</>:"Upload and prepare review draft"}
          </button>
          {error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
          {remaining!==null&&<p className="mt-3 text-xs text-slate-600">Remaining free completed jobs for this task: {remaining} of 3 in the rolling 30-day window.</p>}
        </section>
      </div>
      {result&&<section className="mt-8 border border-slate-300 bg-white p-5 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#0e5549]">Draft / human review required</p><h2 className="mt-2 text-2xl font-semibold">{result.title}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{result.summary}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={download} className="inline-flex min-h-11 items-center gap-2 border border-slate-300 px-4 text-sm font-semibold hover:bg-slate-50"><Download size={16}/> Download CSV</button><button type="button" disabled={saving} onClick={saveToWorkspace} className="inline-flex min-h-11 items-center gap-2 bg-[#0e5549] px-4 text-sm font-semibold text-white hover:bg-[#0a443a] disabled:bg-slate-400">{saving?"Saving…":"Save to your EPCX workspace"}</button></div></div>
          {saveMessage&&<p role="status" className="mt-3 text-sm text-slate-700">{saveMessage} {saved&&<Link href="/saved-drafts" className="font-semibold text-[#0e5549] underline">View saved drafts</Link>}</p>}
        {result.fields.length>0&&<div className="mt-6 grid gap-3 sm:grid-cols-2">{result.fields.map((field,index)=><label key={field.key+index} className="text-xs font-semibold text-slate-600">{field.label}<input className="mt-1 min-h-10 w-full border border-slate-300 px-3 text-sm font-normal text-slate-900" value={field.value} onChange={(event)=>{if(!correctionTracked&&jobId){setCorrectionTracked(true);void trackPilotEvent(jobId,"correction").catch(()=>undefined);}setResult({...result,fields:result.fields.map((entry,i)=>i===index?{...entry,value:event.target.value}:entry)});}}/>{field.sourceRef&&<span className="mt-1 block font-normal">Source: {field.sourceRef.fileName}{field.sourceRef.page?", page "+field.sourceRef.page:""}</span>}</label>)}</div>}
        <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[700px] border-collapse text-left text-xs"><thead><tr>{result.columns.map((column)=><th key={column.key} className="border-b border-slate-300 bg-[#f3f6f3] px-3 py-2 font-bold">{column.label}</th>)}</tr></thead><tbody>{rows.map((row,rowIndex)=><tr key={rowIndex}>{result.columns.map((column)=><td key={column.key} className="border-b border-slate-200 px-2 py-1"><input aria-label={column.label+" row "+(rowIndex+1)} className="min-h-9 w-full min-w-24 bg-transparent px-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0e5549]" value={String(row[column.key]??"")} onChange={(event)=>{if(!correctionTracked&&jobId){setCorrectionTracked(true);void trackPilotEvent(jobId,"correction").catch(()=>undefined);}setRows(rows.map((entry,i)=>i===rowIndex?{...entry,[column.key]:event.target.value}:entry));}}/></td>)}</tr>)}</tbody></table></div>
        {result.limitations.length>0&&<ul className="mt-5 list-disc space-y-1 pl-5 text-xs leading-5 text-slate-600">{result.limitations.map((item,index)=><li key={index}>{item}</li>)}</ul>}
        <button type="button" className="mt-5 inline-flex min-h-10 items-center gap-2 text-sm font-medium text-slate-500" onClick={()=>{setResult(null);setFiles([]);setRows([]);}}><RotateCcw size={15}/> Start another task</button>
      </section>}
    </div>
  </main>;
}
