"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Download, X, WifiOff, Wifi } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [onlineAlert, setOnlineAlert] = useState(false);

  useEffect(() => {
    // Register Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          registration.addEventListener("updatefound", () => {
            const installing = registration.installing;
            if (installing) {
              installing.addEventListener("statechange", () => {
                if (installing.state === "installed" && navigator.serviceWorker.controller) {
                  // New content available
                }
              });
            }
          });
        })
        .catch((err) => {
          console.warn("PWA ServiceWorker registration failed:", err);
        });
    }

    // Check if running in standalone mode (already installed)
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes("android-app://");
      setIsStandalone(isStandaloneMode);
    };
    checkStandalone();

    // Listen for beforeinstallprompt (Chrome / Android)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);

      // Check if user previously dismissed the prompt recently
      const dismissedUntil = localStorage.getItem("epcx_pwa_dismissed");
      if (!dismissedUntil || Date.now() > Number(dismissedUntil)) {
        setShowInstallPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Online / Offline listeners for field supervisors
    const handleOnline = () => {
      setIsOffline(false);
      setOnlineAlert(true);
      setTimeout(() => setOnlineAlert(false), 3000);
    };
    const handleOffline = () => {
      setIsOffline(true);
      setOnlineAlert(false);
    };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOffline(true);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setShowInstallPrompt(false);
      }
    } catch (err) {
      console.error("Install prompt error:", err);
    } finally {
      setDeferredPrompt(null);
    }
  }

  function dismissPrompt() {
    setShowInstallPrompt(false);
    // Dismiss for 7 days
    localStorage.setItem("epcx_pwa_dismissed", String(Date.now() + 7 * 24 * 60 * 60 * 1000));
  }

  return (
    <>
      {children}

      {/* Connectivity Banner for Field Conditions */}
      {isOffline && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed top-0 left-0 right-0 z-[100] bg-amber-600 text-white text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2 shadow-md animate-in slide-in-from-top"
        >
          <WifiOff size={14} className="flex-shrink-0 animate-pulse" />
          <span>Field Offline Mode — viewing cached records. Reconnect to upload new photos and sync DPR.</span>
        </aside>
      )}

      {onlineAlert && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed top-0 left-0 right-0 z-[100] bg-emerald-600 text-white text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2 shadow-md animate-in slide-in-from-top"
        >
          <Wifi size={14} className="flex-shrink-0" />
          <span>Connected — live field synchronization active.</span>
        </aside>
      )}

      {/* Install App Prompt for Mobile Site Supervisors */}
      {showInstallPrompt && !isStandalone && (
        <aside
          role="region"
          aria-label="Install App"
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm z-[99] bg-[#142721] text-white p-3.5 rounded-2xl border border-[#2b4c3e] shadow-2xl flex items-center gap-3 backdrop-blur-md"
        >
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-black/40 flex-shrink-0 border border-white/10 flex items-center justify-center">
            <Image src="/icons/icon-192x192.png" alt="EPCX Icon" width={32} height={32} className="object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-bold text-white tracking-tight leading-tight">Install EPCX Cloud App</h3>
            <p className="text-[11px] text-[#9db7a9] leading-tight mt-0.5 truncate">
              Quick access for site photos, DPR &amp; drawings
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={handleInstallClick}
              className="inline-flex items-center gap-1 bg-[#24764a] hover:bg-[#1f643e] active:scale-95 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
            >
              <Download size={13} />
              Install
            </button>
            <button
              onClick={dismissPrompt}
              className="text-[#9db7a9] hover:text-white p-1 rounded-md transition-colors"
              aria-label="Dismiss install prompt"
            >
              <X size={15} />
            </button>
          </div>
        </aside>
      )}
    </>
  );
}
