"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { SAO_PAULO, directionsUrl, fmtKm, km, type Court } from "@/lib/map";
import { courtsNear, googleMapForThisView } from "@/lib/court-actions";
import { LandPlot, MapPin, Navigation, Plus, Search } from "lucide-react";

const MatchesMap = dynamic(() => import("./MatchesMap").then((m) => m.MatchesMap), { ssr: false, loading: () => <div className="absolute inset-0 animate-pulse bg-surface" /> });
const GoogleMatchesMap = dynamic(() => import("./GoogleMatchesMap").then((m) => m.GoogleMatchesMap), { ssr: false, loading: () => <div className="absolute inset-0 animate-pulse bg-surface" /> });

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
  const [courtsOn, setCourtsOn] = useState(true);
  const [courts, setCourts] = useState<Court[] | null>(null);
  const [court, setCourt] = useState<Court | null>(null);
  const [courtBusy, setCourtBusy] = useState(false);
  const [moved, setMoved] = useState<{ lat: number; lng: number } | null>(null);
  // mapa do Google enquanto houver cota grátis no mês; undefined = ainda decidindo, null = mapa gratuito
  const [gkey, setGkey] = useState<string | null | undefined>(undefined);
  const courtCenter = useRef<{ lat: number; lng: number } | null>(null);
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

  /** Quadras ao redor de um ponto (as das peladas do Jogus e as do OpenStreetMap). */
  async function loadCourts(c: { lat: number; lng: number }) {
    courtCenter.current = c;
    setCourtBusy(true);
    setMoved(null);
    try {
      setCourts(await courtsNear(c.lat, c.lng, 5, !!gkey));
    } catch {
      setCourts([]);
    } finally {
      setCourtBusy(false);
    }
  }
  // ao abrir o mapa: busca em volta de você, ou das partidas do dia, ou do centro de São Paulo
  useEffect(() => {
    if (view !== "mapa" || gkey !== undefined) return;
    googleMapForThisView().then(setGkey, () => setGkey(null));
  }, [view, gkey]);
  // o Google recusou: volta ao mapa gratuito, e as quadras do Google não podem ficar num mapa que não é dele
  function googleFailed() {
    setGkey(null);
    setCourt(null);
    courtCenter.current = null;
    setCourts(null);
  }
  useEffect(() => {
    if (view !== "mapa" || !courtsOn || gkey === undefined) return;
    const first = onMap[0];
    const c = me ?? (first ? { lat: first.lat!, lng: first.lng! } : { lat: SAO_PAULO[0], lng: SAO_PAULO[1] });
    const prev = courtCenter.current;
    if (courts && prev && km(prev, c) < 1) return;
    loadCourts(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, courtsOn, me, gkey]);
  function selectMatch(code: string | null) { setPin(code); setCourt(null); }
  function onMove(c: { lat: number; lng: number }) {
    if (courtsOn && (!courtCenter.current || km(courtCenter.current, c) > 1.5)) setMoved(c);
  }
  const newHere = (c: Court) => `/app/nova?${new URLSearchParams({ local: c.name, endereco: c.address, lat: String(c.lat), lng: String(c.lng) })}`;

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
          {gkey === undefined ? (
            <div className="absolute inset-0 animate-pulse bg-surface" />
          ) : gkey ? (
            <GoogleMatchesMap
              apiKey={gkey}
              onFail={googleFailed}
              pins={onMap.map((m) => ({ code: m.code, lat: m.lat!, lng: m.lng!, time: m.time, access: m.access, name: m.name }))}
              me={me}
              selected={pin}
              onSelect={selectMatch}
              courts={courtsOn ? (courts ?? []) : []}
              court={court}
              onCourt={(c) => { setCourt(c); setPin(null); }}
              onMove={onMove}
            />
          ) : (
            <MatchesMap
              pins={onMap.map((m) => ({ code: m.code, lat: m.lat!, lng: m.lng!, time: m.time, access: m.access, name: m.name }))}
              me={me}
              selected={pin}
              onSelect={selectMatch}
              courts={courtsOn ? (courts ?? []) : []}
              court={court}
              onCourt={(c) => { setCourt(c); setPin(null); }}
              onMove={onMove}
            />
          )}
          <div className="absolute left-2.5 top-2.5 z-[500] flex flex-col items-start gap-1.5">
            <button
              type="button"
              aria-pressed={courtsOn}
              onClick={() => { setCourtsOn(!courtsOn); setCourt(null); setMoved(null); }}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11.5px] font-bold shadow-[0_6px_14px_-6px_rgb(0_0_0/.8)] ${courtsOn ? "bg-surface-2 text-fg ring-1 ring-accent/50" : "bg-bg/80 text-fg/60"}`}
              data-testid="x-courts-toggle"
            >
              <LandPlot size={13} className={courtsOn ? "text-accent" : ""} />
              {courtBusy ? "Buscando quadras..." : courtsOn && courts ? `${courts.length} ${courts.length === 1 ? "quadra" : "quadras"} na região` : "Mostrar quadras"}
            </button>
            {shown.length > onMap.length && (
              <span className="rounded-md bg-bg/80 px-2 py-1 text-[10.5px] font-semibold text-fg/60">
                {shown.length - onMap.length} sem endereço no mapa
              </span>
            )}
          </div>
          {moved && !courtBusy && (
            <button type="button" onClick={() => loadCourts(moved)} className="absolute left-1/2 top-12 z-[500] flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-[12px] font-extrabold text-bg shadow-[0_8px_18px_-8px_rgb(0_0_0/.9)]" data-testid="x-courts-here">
              <Search size={13} /> Buscar quadras aqui
            </button>
          )}
          {picked && <div className="absolute inset-x-2.5 bottom-2.5 z-[500] shadow-[0_14px_30px_-12px_rgb(0_0_0/.8)]"><Card m={picked} tag={current.tag} dist={dist(picked)} /></div>}
          {court && (
            <div className="absolute inset-x-2.5 bottom-2.5 z-[500] rounded-2xl bg-surface p-3.5 ring-1 ring-fg/[0.08] shadow-[0_14px_30px_-12px_rgb(0_0_0/.8)]" data-testid="x-court-card">
              <p className="flex items-center gap-1.5 text-[15px] font-extrabold"><LandPlot size={15} className="shrink-0 text-accent" /> <span className="truncate">{court.name}</span></p>
              <p className="mt-0.5 truncate text-[12.5px] text-fg/55">
                {[court.address, me ? fmtKm(km(me, court)) : null].filter(Boolean).join(" · ") || "Endereço não informado"}
                {court.source === "jogus" && <span className="text-accent"> · já tem pelada no Jogus</span>}
              </p>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <a href={directionsUrl(court.lat, court.lng)} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm"><Navigation size={15} /> Rota</a>
                <Link href={newHere(court)} className="btn-primary btn-sm"><Plus size={15} /> Criar pelada aqui</Link>
              </div>
            </div>
          )}
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
