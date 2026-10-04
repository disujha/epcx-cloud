"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { ChevronLeft, ChevronRight, LoaderCircle, Minus, Plus } from "lucide-react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from "pdfjs-dist/types/src/display/api";
import type { JointEvent, JointRecord } from "@/lib/field-progress/core";

type PdfJs = typeof import("pdfjs-dist");
type Props = {
  source: string;
  drawingNumber: string;
  revision: string;
  joints: JointRecord[];
  latest: Map<string, JointEvent>;
  selectedPage?: number;
  pinMode: boolean;
  onSelect: (joint: JointRecord) => void;
  onPin: (x: number, y: number, page: number) => void;
};

export function PdfDrawingViewer({ source, drawingNumber, revision, joints, latest, selectedPage, pinMode, onSelect, onPin }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [baseScale, setBaseScale] = useState(1);
  const [pageSize, setPageSize] = useState({ width: 900, height: 650 });
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const scale = baseScale * zoom;
  const canvasSize = { width: Math.max(1, Math.round(pageSize.width * scale)), height: Math.max(1, Math.round(pageSize.height * scale)) };

  useEffect(() => {
    let cancelled = false;
    let loadingTask: PDFDocumentLoadingTask | undefined;
    const timer = setTimeout(() => {
      setDocument(null); setPage(1); setError(""); setLoading(true);
      void import("pdfjs-dist").then(async (pdfjs: PdfJs) => {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        loadingTask = pdfjs.getDocument({ url: source });
        const result = await loadingTask.promise;
        if (cancelled) { await loadingTask.destroy(); return; }
        setDocument(result); setLoading(false);
      }).catch((reason: unknown) => {
        if (!cancelled) { setError(reason instanceof Error ? reason.message : "PDF drawing could not be rendered."); setLoading(false); }
      });
    }, 0);
    return () => { cancelled = true; clearTimeout(timer); void loadingTask?.destroy(); };
  }, [source]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !document) return;
    let active = true;
    const updatePage = () => {
      void document.getPage(page).then((pdfPage) => {
        if (!active) return;
        const viewport = pdfPage.getViewport({ scale: 1 });
        setPageSize({ width: viewport.width, height: viewport.height });
        setBaseScale(Math.min(1.5, Math.max(.25, (container.clientWidth - 24) / viewport.width)));
      });
    };
    const observer = new ResizeObserver(updatePage);
    observer.observe(container);
    return () => { active = false; observer.disconnect(); };
  }, [document, page]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !document) return;
    let active = true;
    let renderTask: RenderTask | undefined;
    void document.getPage(page).then((pdfPage) => {
      if (!active) return;
      const viewport = pdfPage.getViewport({ scale });
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.ceil(viewport.width * dpr); canvas.height = Math.ceil(viewport.height * dpr);
      canvas.style.width = `${viewport.width}px`; canvas.style.height = `${viewport.height}px`;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderTask = pdfPage.render({ canvas, canvasContext: context, viewport });
      return renderTask.promise;
    }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "PDF page could not be displayed."); });
    return () => { active = false; renderTask?.cancel(); };
  }, [document, page, scale]);

  useEffect(() => {
    if (!document || !selectedPage || selectedPage === page) return;
    const timer = setTimeout(() => { if (selectedPage <= document.numPages) setPage(selectedPage); }, 0);
    return () => clearTimeout(timer);
  }, [document, page, selectedPage]);

  const pageJoints = joints.filter((joint) => (joint.drawingPage ?? 1) === page && joint.x !== undefined && joint.y !== undefined);
  function handlePageClick(event: MouseEvent<HTMLDivElement>) {
    if (!pinMode) return;
    const rect = event.currentTarget.getBoundingClientRect();
    onPin(Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)), page);
  }

  return <section className="overflow-hidden bg-slate-100" aria-label={`Drawing ${drawingNumber} revision ${revision}`}>
    <div className="flex min-h-11 flex-wrap items-center justify-between gap-2 border-b bg-white px-3 py-2 text-xs dark:bg-brand-900">
      <span className="font-semibold">{drawingNumber} · Rev {revision} · Page {page}{document ? ` / ${document.numPages}` : ""}</span>
      <div className="flex items-center gap-1">
        <button disabled={!document || page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} aria-label="Previous drawing page" className="grid h-9 w-9 place-items-center rounded border disabled:opacity-40"><ChevronLeft size={16}/></button>
        <button disabled={!document || page >= document.numPages} onClick={() => setPage((value) => Math.min(document?.numPages ?? value, value + 1))} aria-label="Next drawing page" className="grid h-9 w-9 place-items-center rounded border disabled:opacity-40"><ChevronRight size={16}/></button>
        <button disabled={zoom <= .6} onClick={() => setZoom((value) => Math.max(.6, Number((value - .2).toFixed(1))))} aria-label="Zoom out" className="grid h-9 w-9 place-items-center rounded border disabled:opacity-40"><Minus size={15}/></button><span className="w-10 text-center">{Math.round(zoom * 100)}%</span>
        <button disabled={zoom >= 3} onClick={() => setZoom((value) => Math.min(3, Number((value + .2).toFixed(1))))} aria-label="Zoom in" className="grid h-9 w-9 place-items-center rounded border disabled:opacity-40"><Plus size={15}/></button>
        <button onClick={() => { setZoom(1); scrollRef.current?.scrollTo({ top: 0, left: 0, behavior: "smooth" }); }} className="min-h-9 rounded border px-2">Fit</button>
      </div>
    </div>
    <div ref={scrollRef} className="relative max-h-[70vh] min-h-[440px] overflow-auto p-3" style={{ touchAction: "pan-x pan-y" }}>
      {(loading || !document) && !error ? <div className="flex min-h-[420px] items-center justify-center gap-2 text-sm text-slate-600"><LoaderCircle className="animate-spin" size={18}/>Loading drawing securely…</div> : error ? <div role="alert" className="p-6 text-sm text-red-800">PDF preview is unavailable in this browser. Use the searchable register and normalized coordinate fields below. <span className="block pt-1 text-xs">{error}</span></div> : <div className="relative mx-auto shadow-lg" style={{ width: canvasSize.width, height: canvasSize.height }} onClick={handlePageClick}>
        <canvas ref={canvasRef} aria-label={`Drawing page ${page}`}/>
        {pageJoints.map((joint) => { const key = joint.jointId ?? joint.id; const stage = latest.get(key)?.stage ?? "Needs review"; return <button key={joint.id} title={`${key}: ${stage}`} aria-label={`Select joint ${key}, ${stage}`} onClick={(event) => { event.stopPropagation(); onSelect(joint); }} className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white px-1.5 py-1 text-[9px] font-bold shadow ${stage === "Accepted" || stage === "Released" ? "bg-emerald-700 text-white" : stage === "Needs review" ? "bg-slate-700 text-white" : "bg-amber-500 text-slate-950"}`} style={{ left: `${joint.x! * 100}%`, top: `${joint.y! * 100}%` }}>{key}</button>; })}
        {pinMode && <div aria-hidden="true" className="pointer-events-none absolute inset-0 border-2 border-dashed border-emerald-700/50 bg-emerald-900/5"/>}
      </div>}
    </div>
    {pinMode && <div className="border-t bg-emerald-50 px-3 py-2 text-xs text-emerald-900">Tap the page to pin the selected joint. Pins stay attached to page coordinates as you zoom or pan.</div>}
  </section>;
}
