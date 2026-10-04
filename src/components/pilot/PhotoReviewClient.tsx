"use client";

import { useState } from "react";
import { PilotTaskClient } from "./PilotTaskClient";

export function PhotoReviewClient() {
  const [kind,setKind]=useState<"fitup-photo"|"welding-photo">("fitup-photo");
  return <div className="mx-auto max-w-5xl px-4 pb-12 pt-28 sm:px-6"><label className="mb-3 block max-w-sm text-sm font-semibold">Photo review context<select value={kind} onChange={(event)=>setKind(event.target.value as typeof kind)} className="mt-1 block min-h-11 w-full rounded border border-slate-300 bg-white px-3 dark:bg-slate-900"><option value="fitup-photo">Fit-up photo</option><option value="welding-photo">Welding photo</option></select><span className="mt-1 block text-xs font-normal text-slate-500">Choose the type of qualified review. Image observations remain draft suggestions and never indicate acceptance.</span></label><PilotTaskClient key={kind} tool={kind}/></div>;
}
