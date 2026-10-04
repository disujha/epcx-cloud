"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";
import { readImportedTable, suggestColumn, type ImportedTable } from "@/lib/billcheck/imports";

export interface ImportMappingField {
  key: string;
  label: string;
  required?: boolean;
  keywords: string[];
}

export function ImportPanel({
  title,
  description,
  fields,
  onImport,
}: {
  title: string;
  description: string;
  fields: ImportMappingField[];
  onImport: (file: File, table: ImportedTable, mapping: Record<string, string>) => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [table, setTable] = useState<ImportedTable | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleFile(selected: File | undefined) {
    if (!selected) return;
    setReading(true);
    setError("");
    setSuccess("");
    setFile(selected);
    try {
      const imported = await readImportedTable(selected);
      setTable(imported);
      setMapping(Object.fromEntries(fields.map((field) => [field.key, suggestColumn(imported.headers, field.keywords)])));
    } catch (reason) {
      setTable(null);
      setError(reason instanceof Error ? reason.message : "This file could not be read.");
    } finally {
      setReading(false);
    }
  }

  async function submit() {
    if (!file || !table) return;
    const missing = fields.filter((field) => field.required && !mapping[field.key]);
    if (missing.length) {
      setError(`Choose a column for ${missing.map((field) => field.label.toLowerCase()).join(" and ")}.`);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onImport(file, table, mapping);
      setSuccess(`Imported ${table.rows.length} rows from ${file.name}.`);
      setFile(null);
      setTable(null);
      setMapping({});
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The import could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="bg-white dark:bg-brand-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card p-5 space-y-4">
      <div>
        <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{description}</p>
      </div>
      <aside className="border-l-2 border-amber-500 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
        <p><strong>Import requirements:</strong> sign in with an organization account that has BillCheck editor access. XLSX, CSV, and TSV files are supported, up to 10 MB each.</p>
        <p className="mt-1">Imported files remain with your organization until its records policy removes them. Read the <Link href="/privacy" className="font-semibold underline underline-offset-2">file handling details</Link>.</p>
      </aside>
      <label className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4 cursor-pointer hover:border-accent-500/70 transition-colors">
        <FileSpreadsheet className="w-5 h-5 text-accent-500" />
        <span className="flex-1 text-sm text-slate-600 dark:text-slate-300">
          {reading ? "Reading spreadsheet…" : file?.name ?? "Choose an Excel or CSV file"}
          <span className="block text-xs text-slate-400 mt-0.5">XLSX, CSV or TSV · up to 10 MB</span>
        </span>
        <Upload className="w-4 h-4 text-slate-400" />
        <input type="file" accept=".xlsx,.csv,.tsv" className="sr-only" disabled={reading || saving} onChange={(event) => void handleFile(event.target.files?.[0])} />
      </label>

      {table && (
        <>
          <div className="grid sm:grid-cols-2 gap-3">
            {fields.map((field) => (
              <label key={field.key} className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {field.label}{field.required ? " *" : " (optional)"}
                <select
                  value={mapping[field.key] ?? ""}
                  onChange={(event) => setMapping((previous) => ({ ...previous, [field.key]: event.target.value }))}
                  className="mt-1 block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm px-3 py-2 text-slate-900 dark:text-white"
                >
                  <option value="">Do not import</option>
                  {table.headers.map((header, index) => <option key={`${header}-${index}`} value={header}>{header}</option>)}
                </select>
              </label>
            ))}
          </div>
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500">
                <tr>{table.headers.slice(0, 8).map((header, index) => <th key={`${header}-${index}`} className="px-3 py-2 text-left font-semibold whitespace-nowrap">{header}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {table.rows.slice(0, 5).map((row) => <tr key={row.sourceRow}>
                  {table.headers.slice(0, 8).map((_, index) => <td key={index} className="px-3 py-2 text-slate-600 dark:text-slate-300 whitespace-nowrap max-w-48 truncate">{row.values[index]}</td>)}
                </tr>)}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-400">Previewing 5 of {table.rows.length} rows · original row numbers retained</span>
            <button type="button" onClick={() => void submit()} disabled={saving || reading} className="inline-flex items-center gap-2 rounded-lg bg-accent-500 hover:bg-accent-600 disabled:opacity-60 px-4 py-2 text-sm font-semibold text-white">
              <Upload className="w-4 h-4" /> {saving ? "Importing…" : `Import ${table.rows.length} rows`}
            </button>
          </div>
        </>
      )}

      {error && <p role="alert" className="flex items-start gap-2 text-sm text-red-500"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}</p>}
      {success && <p role="status" className="flex items-start gap-2 text-sm text-accent-600 dark:text-accent-400"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />{success}</p>}
    </section>
  );
}
