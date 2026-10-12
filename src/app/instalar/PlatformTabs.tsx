"use client";

import { useEffect, useState } from "react";
import { StepsIllustrated, type Platform } from "@/components/InstallSteps";

/** Abas iPhone / Android; já abre na do celular da pessoa. */
export function PlatformTabs() {
  const [p, setP] = useState<Platform>("ios");
  useEffect(() => {
    if (/Android/.test(navigator.userAgent)) setP("android");
  }, []);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-fg/[0.06] p-[3px]" role="tablist" aria-label="Seu celular">
        {([["ios", "iPhone"], ["android", "Android"]] as const).map(([v, l]) => (
          <button key={v} type="button" role="tab" aria-selected={p === v} onClick={() => setP(v)} className={`rounded-[9px] p-2.5 text-sm font-bold ${p === v ? "bg-surface-2 text-fg" : "text-fg/55"}`}>
            {l}
          </button>
        ))}
      </div>
      <StepsIllustrated platform={p} />
    </div>
  );
}
