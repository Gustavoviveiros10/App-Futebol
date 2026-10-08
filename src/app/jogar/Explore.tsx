"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";

export type ExploreDay = { key: string; short: string; num: number; label: string; tag: string };
export type ExploreMatch = {
  code: string;
  day: string;
  time: string;
  end: string;
  name: string;
  place: string;
  access: "aberta" | "pedido" | "restrita";
  modality: string;
  modalityLabel: string;
  level: string;
  levelLabel: string;
  feeCents: number;
  confirmed: number;
  max: number | null;
};

const ACC_LABEL = { aberta: "Aberta", pedido: "Com aprovação", restrita: "Restrita" } as const;
const ACC_CHIP = { aberta: "bg-accent/15 text-accent", pedido: "bg-gold/15 text-gold", restrita: "bg-fg/10 text-fg/75" } as const;
const PIN_BG = { aberta: "bg-accent after:border-t-accent", pedido: "bg-gold after:border-t-gold", restrita: "bg-[#c9ced8] after:border-t-[#c9ced8]" } as const;

/** Posição estável no mapa ilustrativo a partir do nome do local (ainda não guardamos coordenadas). */
function spot(place: string, i: number) {
  let h = 2166136261;
  for (const c of place.toLowerCase()) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const x = 12 + ((h >>> 0) % 76), y = 14 + ((h >>> 8) % 70);
  return { x: Math.min(90, x + (i % 3) * 6), y: Math.min(92, y + Math.floor(i / 3) * 7) };
}

const sel = "w-full cursor-pointer appearance-none border-0 bg-transparent p-0 pr-5 text-[14.5px] font-bold text-fg outline-none";
const selBg = {
  backgroundImage: "linear-gradient(45deg, transparent 50%, currentColor 50%), linear-gradient(135deg, currentColor 50%, transparent 50%)",
  backgroundPosition: "calc(100% - 7px) 55%, calc(100% - 2px) 55%",
  backgroundSize: "5px 5px",
  backgroundRepeat: "no-repeat",
};

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="flex min-w-0 flex-col gap-0.5 rounded-xl bg-surface px-3 py-2 ring-1 ring-fg/[0.08] focus-within:ring-2 focus-within:ring-accent">
      <small className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-fg/45">{label}</small>
      <select className={sel} style={selBg} value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        {options.map(([v, l]) => <option key={v} value={v} className="bg-surface">{l}</option>)}
      </select>
    </label>
  );
}

function Card({ m, tag }: { m: ExploreMatch; tag: string }) {
  const spots = m.max ? m.max - m.confirmed : null;
  const fill = m.max ? Math.round((m.confirmed / m.max) * 100) : 0;
  const href = m.access === "restrita" ? `/j/${m.code}` : `/jogar/${m.code}`;
  return (
    <Link href={href} className="flex gap-3.5 rounded-2xl bg-surface p-3.5 ring-1 ring-fg/[0.07] transition hover:bg-surface-2" data-testid="x-card">
      <span className="flex min-w-[62px] flex-col items-center justify-center rounded-xl bg-accent/10 px-1 py-2">
        <b className="font-display text-2xl leading-none text-accent">{m.time}</b>
        <span className="mt-0.5 whitespace-nowrap text-[11px] font-bold text-fg/80">até {m.end}</span>
        <small className="mt-0.5 text-[11px] font-bold text-fg/60">{tag}</small>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2 text-[15px] font-extrabold">
          {m.name}
          <em className={`rounded-md px-1.5 py-0.5 text-[10.5px] font-extrabold not-italic ${ACC_CHIP[m.access]}`}>{ACC_LABEL[m.access]}</em>
        </span>
        <span className="flex items-center gap-1 truncate text-[13px] text-fg/55"><MapPin size={13} className="shrink-0" /> {m.place}</span>
        <span className="flex flex-wrap gap-1.5 text-[11.5px] font-semibold text-fg/70">
          <i className="rounded-md bg-fg/[0.06] px-1.5 py-0.5 not-italic">{m.modalityLabel}</i>
          <i className="rounded-md bg-fg/[0.06] px-1.5 py-0.5 not-italic">{m.levelLabel}</i>
        </span>
        <span className="mt-0.5 flex items-center justify-between text-[13px]">
          <b>{m.feeCents > 0 ? `R$ ${(m.feeCents / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}` : "Grátis"}</b>
          <span className="flex items-center gap-2 font-semibold text-fg/70">
            {m.max && <span className="h-1.5 w-12 overflow-hidden rounded-full bg-fg/10"><span className="block h-full rounded-full bg-accent" style={{ width: `${fill}%` }} /></span>}
            {spots != null ? `${spots} vaga${spots === 1 ? "" : "s"}` : "Vagas livres"}
          </span>
        </span>
      </span>
    </Link>
  );
}

export function Explore({ days, matches }: { days: ExploreDay[]; matches: ExploreMatch[] }) {
  const withGames = useMemo(() => new Set(matches.map((m) => m.day)), [matches]);
  const [day, setDay] = useState(() => days.find((d) => withGames.has(d.key))?.key ?? days[0].key);
  const [loc, setLoc] = useState("");
  const [acc, setAcc] = useState("");
  const [mod, setMod] = useState("");
  const [lvl, setLvl] = useState("");
  const [view, setView] = useState<"lista" | "mapa">("lista");
  const [pin, setPin] = useState<string | null>(null);
  const cal = useRef<HTMLDivElement>(null);

  const places = useMemo(() => [...new Set(matches.map((m) => m.place))].sort((a, b) => a.localeCompare(b, "pt-BR")), [matches]);
  const current = days.find((d) => d.key === day)!;
  const shown = matches.filter((m) => m.day === day && (!loc || m.place === loc) && (!acc || m.access === acc) && (!mod || m.modality === mod) && (!lvl || m.level === lvl));
  const picked = shown.find((m) => m.code === pin);

  return (
    <div className="flex flex-col gap-3.5">
      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-fg/70"><MapPin size={14} /> {loc || "Todos os locais"}</p>
      <div>
        <h1 className="text-5xl">Quero jogar <span className="text-accent">{current.label}</span></h1>
        <p className="mt-1 text-sm text-fg/55" data-testid="x-count">{shown.length} {shown.length === 1 ? "partida" : "partidas"} com vaga</p>
      </div>

      <div
        ref={cal}
        className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [mask-image:linear-gradient(90deg,#000_85%,transparent)]"
        role="listbox"
        aria-label="Escolha o dia"
        onWheel={(e) => { if (cal.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) cal.current.scrollLeft += e.deltaY; }}
      >
        {days.map((d) => {
          const on = d.key === day;
          return (
            <button
              key={d.key}
              type="button"
              aria-pressed={on}
              onClick={() => { setDay(d.key); setPin(null); }}
              className={`flex w-[52px] shrink-0 flex-col items-center gap-0.5 rounded-[14px] pb-[7px] pt-2 ring-1 ${on ? "bg-accent text-bg ring-accent" : "bg-surface text-fg ring-fg/[0.08]"}`}
            >
              <small className={`text-[11px] font-bold ${on ? "text-bg" : "text-fg/55"}`}>{d.short}</small>
              <b className="font-display text-[22px] leading-none">{d.num}</b>
              <i className={`h-[5px] w-[5px] rounded-full ${withGames.has(d.key) ? (on ? "bg-bg" : "bg-accent") : "bg-transparent"}`} />
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Select label="Localização" value={loc} onChange={(v) => { setLoc(v); setPin(null); }} options={[["", "Todos os locais"], ...places.map((p) => [p, p] as [string, string])]} />
        <Select label="Acesso" value={acc} onChange={(v) => { setAcc(v); setPin(null); }} options={[["", "Todos"], ["aberta", "Aberta"], ["pedido", "Com aprovação"], ["restrita", "Restrita"]]} />
        <Select label="Tipo de jogo" value={mod} onChange={(v) => { setMod(v); setPin(null); }} options={[["", "Todos"], ["SOCIETY", "Society"], ["FUTSAL", "Futsal"], ["FIELD", "Campo"]]} />
        <Select label="Nível" value={lvl} onChange={(v) => { setLvl(v); setPin(null); }} options={[["", "Todos"], ["BEGINNER", "Iniciante"], ["INTERMEDIATE", "Intermediário"], ["ADVANCED", "Avançado"]]} />
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-fg/[0.06] p-[3px]" role="tablist" aria-label="Ver como">
        {(["lista", "mapa"] as const).map((v) => (
          <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={`rounded-[9px] p-2 text-[13.5px] font-bold ${view === v ? "bg-surface-2 text-fg" : "text-fg/55"}`}>
            {v === "lista" ? "Lista" : "Mapa"}
          </button>
        ))}
      </div>

      {view === "mapa" ? (
        <div className="relative h-[380px] overflow-hidden rounded-[18px] ring-1 ring-fg/[0.08]" data-testid="x-map">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" className="absolute inset-0 h-full w-full">
            <rect width="100" height="100" fill="#101318" />
            <path d="M60 40 Q70 52 66 66 Q62 78 70 92 L82 92 Q74 78 78 64 Q82 48 70 38 Z" fill="#14281d" />
            <path d="M0 88 C20 80 30 70 38 56 C46 40 60 30 100 22" stroke="#16314a" strokeWidth="5" fill="none" />
            <g stroke="#1d2129" strokeWidth="1.6" fill="none">
              <path d="M0 40 L100 34" /><path d="M0 62 L100 70" /><path d="M30 0 L36 100" /><path d="M58 0 L52 100" /><path d="M78 0 L86 100" /><path d="M0 14 L100 8" /><path d="M12 0 L4 100" />
            </g>
            <g stroke="#181b22" strokeWidth=".8" fill="none">
              <path d="M0 26 L100 20" /><path d="M0 50 L100 52" /><path d="M0 78 L100 84" /><path d="M44 0 L44 100" /><path d="M68 0 L64 100" /><path d="M20 0 L22 100" /><path d="M92 0 L96 100" />
            </g>
          </svg>
          <span className="absolute left-2.5 top-2.5 rounded-md bg-bg/70 px-2 py-1 text-[10.5px] font-semibold text-fg/55">Mapa ilustrativo</span>
          {(() => {
            const seen: Record<string, number> = {};
            return shown.map((m) => {
              const i = (seen[m.place] = (seen[m.place] ?? -1) + 1);
              const { x, y } = spot(m.place, i);
              return (
                <button
                  key={m.code}
                  type="button"
                  aria-pressed={pin === m.code}
                  aria-label={`${m.name} às ${m.time}`}
                  onClick={() => setPin(m.code)}
                  style={{ left: `${x}%`, top: `${y}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-full rounded-[9px] px-2 py-1 font-display text-sm font-bold text-bg shadow-[0_6px_14px_-6px_rgb(0_0_0/.8)] after:absolute after:-bottom-[5px] after:left-1/2 after:-ml-[5px] after:border-[5px] after:border-b-0 after:border-transparent after:content-[''] aria-pressed:z-10 aria-pressed:outline-2 aria-pressed:outline-white ${PIN_BG[m.access]}`}
                >
                  {m.time}
                </button>
              );
            });
          })()}
          {picked && <div className="absolute inset-x-2.5 bottom-2.5 shadow-[0_14px_30px_-12px_rgb(0_0_0/.8)]"><Card m={picked} tag={current.tag} /></div>}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {shown.map((m) => <Card key={m.code} m={m} tag={current.tag} />)}
        </div>
      )}
      {shown.length === 0 && <p className="py-4 text-center text-sm text-fg/50">Nenhuma partida com vaga nesse dia e filtros. Tente outro dia ou mude a localização.</p>}

      <div className="card mt-2 flex flex-col gap-2">
        <p className="font-extrabold">Organiza uma pelada e falta gente?</p>
        <p className="text-sm text-fg/55">Deixe sua partida aberta ao público ou por solicitação e complete o time com jogadores da região. Partidas restritas só aparecem para quem é da pelada.</p>
        <Link href="/cadastro" className="btn-ghost">Sou organizador</Link>
      </div>
    </div>
  );
}
