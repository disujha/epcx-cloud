"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { getFunctions, httpsCallable } from "firebase/functions";
import app from "@/lib/firebase/config";

type Notice = { message: string; level: string; expiresAtMillis: number };

export function ServiceNoticeBanner() {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let live = true;
    const fetchNotice = httpsCallable<void, { notice: Notice | null }>(getFunctions(app, "us-central1"), "getActiveAdminNotice");
    void fetchNotice().then((response) => {
      if (live && response.data.notice && response.data.notice.expiresAtMillis > Date.now()) setNotice(response.data.notice);
    }).catch(() => undefined);
    return () => { live = false; };
  }, []);

  if (!notice || dismissed) return null;
  const styles = notice.level === "maintenance"
    ? "border-amber-300 bg-amber-50 text-amber-950"
    : notice.level === "warning"
      ? "border-rose-300 bg-rose-50 text-rose-950"
      : "border-emerald-300 bg-emerald-50 text-emerald-950";
  return <aside className={`relative z-[60] flex items-start justify-between gap-4 border-b px-4 py-3 text-sm ${styles}`} role={notice.level === "warning" ? "alert" : "status"}>
    <p className="mx-auto max-w-6xl flex-1 leading-5">{notice.message}</p>
    <button type="button" aria-label="Dismiss service notice" onClick={() => setDismissed(true)} className="rounded p-1 opacity-70 hover:opacity-100"><X size={16}/></button>
  </aside>;
}
