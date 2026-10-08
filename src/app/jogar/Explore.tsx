"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { fmtKm, km } from "@/lib/map";
import { MapPin } from "lucide-react";

const MatchesMap = dynamic(() => import("./MatchesMap").then((m) => m.MatchesMap), { ssr: false, loading: () => <div className="absolute inset-0 animate-pulse bg-surface" /> });

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
  lat: number | null;
  lng: number | null;
};

const ACC_LABEL = { aberta: "Aberta", pedido: "Com aprovação", restrita: "Restrita" } as const;
const ACC_CHIP = { aberta: "bg-accent/15 text-accent", pedido: "bg-gold/15 text-gold", restrita: "bg-fg/10 text-fg/75" } as const;
const PIN_BG = { aberta: "bg-accent after:border-t-accent", pedido: "bg-gold after:border-t-gold", restrita: "bg-[#c9ced8] after:border-t-[#c9ced8]" } as const;

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

function Card({ m, tag, dist }: { m: ExploreMatch; tag: string; dist?: number | null }) {
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
        <span className="flex items-center gap-1 truncate text-[13px] text-fg/55"><MapPin size={13} className="shrink-0" /> {m.place}{dist != null && ` · ${fmtKm(dist)}`}</span>
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
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [geoMsg, setGeoMsg] = useState("");
  const cal = useRef<HTMLDivElement>(null);

  const places = useMemo(() => [...new Set(matches.map((m) => m.place))].sort((a, b) => a.localeCompare(b, "pt-BR")), [matches]);
  const current = days.find((d) => d.key === day)!;
  const radius = loc.startsWith("km:") ? +loc.slice(3) : null;
  const dist = (m: ExploreMatch) => (me && m.lat != null && m.lng != null ? km(me, { lat: m.lat, lng: m.lng }) : null);
  const shown = matches
    .filter((m) => m.day === day && (radius != null ? (dist(m) ?? Infinity) <= radius : !loc || m.place === loc) && (!acc || m.access === acc) && (!mod || m.modality === mod) && (!lvl || m.level === lvl))
    .sort((a, b) => (radius != null ? dist(a)! - dist(b)! : 0));
  const onMap = shown.filter((m) => m.lat != null && m.lng != null);

  function chooseLoc(v: string) {
    setPin(null);
    setGeoMsg("");
    if (!v.startsWith("km:") || me) return setLoc(v);
    if (!("geolocation" in navigator)) return setGeoMsg("Seu navegador não informa a localização.");
    setGeoMsg("Pegando sua localização...");
    navigator.geolocation.getCurrentPosition(
      (p) => { setMe({ lat: p.coords.latitude, lng: p.coords.longitude }); setLoc(v); setGeoMsg(""); },
      () => setGeoMsg("Não deu para pegar sua localização. Libere a localização do navegador e tente de novo."),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }
  const picked = shown.find((m) => m.code === pin);

  return (
    <div className="flex flex-col gap-3.5">
      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-fg/70"><MapPin size={14} /> {radius != null ? `Perto de você · até ${radius} km` : loc || "Todos os locais"}</p>
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
        <Select label="Localização" value={loc} onChange={chooseLoc} options={[["", "Todos os locais"], ["km:5", "Até 5 km de mim"], ["km:10", "Até 10 km de mim"], ["km:25", "Até 25 km de mim"], ...places.map((p) => [p, p] as [string, string])]} />
        <Select label="Acesso" value={acc} onChange={(v) => { setAcc(v); setPin(null); }} options={[["", "Todos"], ["aberta", "Aberta"], ["pedido", "Com aprovação"], ["restrita", "Restrita"]]} />
        <Select label="Tipo de jogo" value={mod} onChange={(v) => { setMod(v); setPin(null); }} options={[["", "Todos"], ["SOCIETY", "Society"], ["FUTSAL", "Futsal"], ["FIELD", "Campo"]]} />
        <Select label="Nível" value={lvl} onChange={(v) => { setLvl(v); setPin(null); }} options={[["", "Todos"], ["BEGINNER", "Iniciante"], ["INTERMEDIATE", "Intermediário"], ["ADVANCED", "Avançado"]]} />
      </div>

      {geoMsg && <p className="-mt-1 text-xs text-gold">{geoMsg}</p>}
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-fg/[0.06] p-[3px]" role="tablist" aria-label="Ver como">
        {(["lista", "mapa"] as const).map((v) => (
          <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={`rounded-[9px] p-2 text-[13.5px] font-bold ${view === v ? "bg-surface-2 text-fg" : "text-fg/55"}`}>
            {v === "lista" ? "Lista" : "Mapa"}
          </button>
        ))}
      </div>

      {view === "mapa" ? (
        <div className="relative isolate h-[380px] overflow-hidden rounded-[18px] ring-1 ring-fg/[0.08]" data-testid="x-map">
          <MatchesMap pins={onMap.map((m) => ({ code: m.code, lat: m.lat!, lng: m.lng!, time: m.time, access: m.access, name: m.name }))} me={me} selected={pin} onSelect={setPin} />
          {shown.length > onMap.length && (
            <span className="absolute left-2.5 top-2.5 z-[500] rounded-md bg-bg/80 px-2 py-1 text-[10.5px] font-semibold text-fg/60">
              {shown.length - onMap.length} sem endereço no mapa
            </span>
          )}
          {picked && <div className="absolute inset-x-2.5 bottom-2.5 z-[500] shadow-[0_14px_30px_-12px_rgb(0_0_0/.8)]"><Card m={picked} tag={current.tag} dist={dist(picked)} /></div>}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {shown.map((m) => <Card key={m.code} m={m} tag={current.tag} dist={dist(m)} />)}
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
