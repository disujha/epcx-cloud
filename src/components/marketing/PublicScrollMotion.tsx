"use client";

import { useEffect } from "react";

export function PublicScrollMotion() {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-scroll-reveal]"));
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionPreference.matches || !("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    document.documentElement.classList.add("public-motion-ready");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.02, rootMargin: "60px 0px 60px 0px" });

    elements.forEach((element) => observer.observe(element));

    // Fallback: Ensure no element remains blank if observer doesn't trigger
    const fallbackTimer = window.setTimeout(() => {
      document.querySelectorAll<HTMLElement>("[data-scroll-reveal]:not(.is-visible)").forEach((element) => {
        element.classList.add("is-visible");
      });
    }, 1200);

    return () => {
      window.clearTimeout(fallbackTimer);
      observer.disconnect();
      document.documentElement.classList.remove("public-motion-ready");
    };
  }, []);

  return null;
}
