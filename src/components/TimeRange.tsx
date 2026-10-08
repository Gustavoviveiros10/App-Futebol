"use client";

import { useState } from "react";
import { minutesBetween } from "@/lib/format";

/** Início e término numa linha só, com a duração calculada. */
export function TimeRange({ start, end, required }: { start: string; end: string; required?: boolean }) {
  const [a, setA] = useState(start);
  const [b, setB] = useState(end);
  const dur = /^\d{2}:\d{2}$/.test(a) && /^\d{2}:\d{2}$/.test(b) ? minutesBetween(a, b) : 0;
  const t = "input-time w-[5.6rem] rounded-lg bg-fg/[0.06] px-2 py-2 text-center text-[16px] font-bold text-fg outline-none ring-1 ring-fg/[0.08] focus:ring-2 focus:ring-accent/70";
  return (
    <div>
      <span className="label">Horário</span>
      <div className="flex items-center gap-2 rounded-xl bg-fg/[0.05] px-3 py-2 ring-1 ring-fg/[0.08]">
        <input className={t} id="time" name="time" type="time" aria-label="Início" value={a} onChange={(e) => setA(e.target.value)} required={required} />
        <span className="text-sm text-fg/45">às</span>
        <input className={t} id="endTime" name="endTime" type="time" aria-label="Término" value={b} onChange={(e) => setB(e.target.value)} required={required} />
        {dur > 0 && <span className="ml-auto text-xs font-semibold text-fg/45">{dur >= 60 ? `${Math.floor(dur / 60)}h${dur % 60 ? String(dur % 60).padStart(2, "0") : ""}` : `${dur} min`}</span>}
      </div>
    </div>
  );
}
