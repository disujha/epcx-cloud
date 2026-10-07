"use client";

import React from "react";

export interface EpcxSpinnerProps {
  size?: number | "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  label?: string;
  inline?: boolean;
}

const sizeMap: Record<string, number> = {
  xs: 14,
  sm: 18,
  md: 24,
  lg: 34,
  xl: 44,
};

/**
 * EPCX Branded Favicon Spinner
 * Uses /images/favicon.png with smooth 360-degree rotation animation.
 */
export function EpcxSpinner({
  size = "md",
  className = "",
  label,
  inline = false,
}: EpcxSpinnerProps) {
  const pixelSize = typeof size === "number" ? size : sizeMap[size] ?? 24;

  const spinner = (
    <img
      src="/images/favicon.png"
      alt="Loading…"
      width={pixelSize}
      height={pixelSize}
      className={`epcx-favicon-spin shrink-0 select-none pointer-events-none ${className}`}
      style={{
        width: `${pixelSize}px`,
        height: `${pixelSize}px`,
        objectFit: "contain",
        display: "inline-block",
      }}
    />
  );

  if (inline && !label) {
    return spinner;
  }

  if (label) {
    return (
      <div className={`epcx-spinner-wrap inline-flex items-center gap-2 ${inline ? "" : "py-3 justify-center"}`}>
        {spinner}
        <span className="text-xs font-medium text-[#526269]">{label}</span>
      </div>
    );
  }

  return spinner;
}

/**
 * Full page or full tab loading view with spinning favicon and optional title/subtext
 */
export function EpcxLoadingScreen({
  title = "Loading workspace…",
  subtitle = "Fetching live field execution facts",
  minHeight = "340px",
}: {
  title?: string;
  subtitle?: string;
  minHeight?: string;
}) {
  return (
    <div
      className="epcx-loading-screen flex flex-col items-center justify-center text-center p-8 w-full"
      style={{ minHeight }}
      role="status"
      aria-live="polite"
    >
      <div className="epcx-loading-badge relative mb-4">
        <div
          className="absolute -inset-2 rounded-full border border-[#d6e2d8] opacity-70 animate-pulse"
          style={{ width: "54px", height: "54px", top: "-8px", left: "-8px" }}
        />
        <EpcxSpinner size={38} />
      </div>
      <b className="text-sm font-bold text-[#18272e] tracking-tight mb-1">{title}</b>
      {subtitle && <p className="text-xs text-[#526269] max-w-sm m-0">{subtitle}</p>}
    </div>
  );
}
