"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Upload, FileText, X, CheckCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { cn, formatBytes } from "@/lib/utils";
import { uploadDocument } from "@/lib/firebase/storage";

export default function UploadPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return;
    setError("");
    const selected = Array.from(incoming);
    const invalid = selected.find((file) => file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf"));
    if (invalid) {
      setError(`${invalid.name} is not a PDF. This workspace upload accepts PDF files only.`);
      return;
    }
    const oversized = selected.find((file) => file.size >= 50 * 1024 * 1024);
    if (oversized) {
      setError(`${oversized.name} is 50 MB or larger. Choose a PDF under 50 MB.`);
      return;
    }
    setFiles((prev) => [...prev, ...selected]);
  }, []);

  function remove(name: string) {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  }

  async function handleUpload() {
    if (!files.length || !user) return;
    setUploading(true);

    setError("");
    try {
      for (const file of files) {
        await uploadDocument(file, user.uid, null, ({ progress: value }) => {
          setProgress((prev) => ({ ...prev, [file.name]: value }));
        });
      }
      setDone(true);
      setTimeout(() => router.push("/documents"), 1200);
    } catch {
      setError("One or more files could not be uploaded. Successfully uploaded files remain in your workspace.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Link href="/documents" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Documents
        </Link>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Upload Documents</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Store PDF files in your private account folder. This upload does not analyze or extract the document.</p>
        <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">PDF files up to 50 MB. Files stay in your private account folder until you delete them.</p>
      </motion.div>

      {/* Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200",
          dragging ? "border-accent-500 bg-accent-500/5" : "border-slate-200 dark:border-slate-700 hover:border-accent-500/50 hover:bg-slate-50 dark:hover:bg-slate-900/30"
        )}
      >
        <input ref={inputRef} type="file" accept=".pdf" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
        <Upload className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-4" strokeWidth={1.5} />
        <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Drop PDF files here</p>
        <p className="text-sm text-slate-400">or click to browse — PDF files only</p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-3">
          {files.map((file) => {
            const prog = progress[file.name] ?? 0;
            const isComplete = prog === 100;
            return (
              <div key={file.name} className="bg-white dark:bg-brand-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                    {isComplete && done ? (
                      <CheckCircle className="w-4.5 h-4.5 text-accent-500" />
                    ) : (
                      <FileText className="w-4.5 h-4.5 text-slate-400" strokeWidth={1.5} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{file.name}</div>
                    <div className="text-xs text-slate-400">{formatBytes(file.size)}</div>
                  </div>
                  {!uploading && (
                    <button onClick={() => remove(file.name)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {uploading && (
                  <div className="mt-3">
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent-500 rounded-full transition-all duration-300"
                        style={{ width: `${prog}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-slate-400">{isComplete ? "Complete" : "Uploading..."}</span>
                      <span className="text-[10px] text-slate-400">{prog}%</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</p>}

      {done && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-accent-500/10 border border-accent-500/20">
          <CheckCircle className="w-5 h-5 text-accent-500 flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Upload complete!</div>
            <div className="text-xs text-slate-500">Redirecting to Documents...</div>
          </div>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!files.length || uploading || done}
        className="w-full py-3.5 rounded-xl bg-accent-500 hover:bg-accent-600 text-white font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {uploading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            Upload {files.length > 0 ? `${files.length} file${files.length > 1 ? "s" : ""}` : "Documents"}
          </>
        )}
      </button>
    </div>
  );
}
