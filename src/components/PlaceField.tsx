"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { LandPlot, LocateFixed, MapPin, Search } from "lucide-react";
import { SAO_PAULO, fmtKm, km, searchAddress, searchOsmCourts, type Court, type Place } from "@/lib/map";
import { courtsNear, googleMapForThisView, searchJogusCourts } from "@/lib/court-actions";

const loadingMap = () => <div className="absolute inset-0 animate-pulse bg-surface" />;
const FreeMap = dynamic(() => import("@/app/jogar/MatchesMap").then((m) => m.MatchesMap), { ssr: false, loading: loadingMap });
const GoogleMap = dynamic(() => import("@/app/jogar/GoogleMatchesMap").then((m) => m.GoogleMatchesMap), { ssr: false, loading: loadingMap });
type Pt = { lat: number; lng: number };

type V = { location?: string | null; address?: string | null; lat?: number | null; lng?: number | null };

/** Nome do local + endereço com o ponto no mapa (para aparecer no "Quero jogar"). */
export function PlaceField({ v = {} }: { v?: V }) {
  const [name, setName] = useState(v.location ?? "");
  const [address, setAddress] = useState(v.address ?? "");
  const [courts, setCourts] = useState<Court[] | null>(null);
  const [courtBusy, setCourtBusy] = useState(false);
  const [courtMsg, setCourtMsg] = useState("");
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(v.lat != null && v.lng != null ? { lat: v.lat, lng: v.lng } : null);
  const [results, setResults] = useState<Place[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  // mapa sempre visível: do Google enquanto houver cota grátis no mês, senão o gratuito
  const [gkey, setGkey] = useState<string | null | undefined>(undefined);
  const [focus, setFocus] = useState<(Pt & { zoom?: number }) | null>(null);
  const [near, setNear] = useState<Court[]>([]);
  const [nearBusy, setNearBusy] = useState(false);
  const [moved, setMoved] = useState<Pt | null>(null);
  const nearCenter = useRef<Pt | null>(null);

  useEffect(() => {
    googleMapForThisView().then(setGkey, () => setGkey(null));
  }, []);
  // quadras em volta do ponto escolhido (ou de São Paulo), com o mapa já decidido
  useEffect(() => {
    if (gkey === undefined) return;
    loadNear(pos ?? me ?? { lat: SAO_PAULO[0], lng: SAO_PAULO[1] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gkey]);

  async function loadNear(c: Pt) {
    nearCenter.current = c;
    setMoved(null);
    setNearBusy(true);
    try { setNear(await courtsNear(c.lat, c.lng, 5, !!gkey)); } catch { setNear([]); } finally { setNearBusy(false); }
  }
  // o Google recusou: volta ao mapa gratuito (o efeito acima busca as quadras de novo, sem o Google)
  function googleFailed() {
    setNear([]);
    setGkey(null);
  }
  // toque numa quadra não pode virar também um toque no mapa
  const courtTap = useRef(0);
  function goTo(c: Pt, zoom = 16) {
    setFocus({ lat: c.lat, lng: c.lng, zoom });
    if (!nearCenter.current || km(nearCenter.current, c) > 1.5) loadNear(c);
  }

  async function find() {
    const q = address.trim();
    if (q.length < 4) return setMsg("Escreva rua, número e bairro.");
    setBusy(true); setMsg(""); setResults(null);
    try {
      const r = await searchAddress(q);
      if (r.length === 0) setMsg("Não achei esse endereço. Tente com rua, número e cidade.");
      else if (r.length === 1) pick(r[0]);
      else setResults(r);
    } catch {
      setMsg("A busca de endereço não respondeu. Tente de novo em instantes.");
    } finally {
      setBusy(false);
    }
  }
  function locate(): Promise<{ lat: number; lng: number } | null> {
    if (me) return Promise.resolve(me);
    if (!("geolocation" in navigator)) return Promise.resolve(null);
    return new Promise((ok) =>
      navigator.geolocation.getCurrentPosition(
        (p) => { const c = { lat: p.coords.latitude, lng: p.coords.longitude }; setMe(c); ok(c); },
        () => ok(null),
        { timeout: 10000, maximumAge: 300000 },
      ),
    );
  }

  /** Busca quadras já cadastradas no Jogus e no OpenStreetMap (por nome, ou só as de perto). */
  async function findCourts(nearOnly: boolean) {
    const q = name.trim();
    if (!nearOnly && q.length < 2) return setCourtMsg("Escreva parte do nome da quadra.");
    setCourtBusy(true); setCourtMsg(nearOnly ? "Pegando sua localização..." : ""); setCourts(null);
    try {
      const here = nearOnly ? await locate() : me ?? pos ?? (await locate());
      if (nearOnly && !here) return setCourtMsg("Não deu para pegar sua localização. Libere a localização do navegador ou busque pelo nome.");
      setCourtMsg("");
      if (nearOnly && here) goTo(here, 14);
      const near = here ?? { lat: SAO_PAULO[0], lng: SAO_PAULO[1] };
      const [mine, osm] = await Promise.all([
        nearOnly ? Promise.resolve([] as Court[]) : searchJogusCourts(q).catch(() => [] as Court[]),
        searchOsmCourts({ name: nearOnly ? undefined : q, near, radiusKm: nearOnly ? 5 : 40 }).catch(() => null),
      ]);
      const all = [...mine, ...(osm ?? []).filter((o) => !mine.some((m) => m.name.toLowerCase() === o.name.toLowerCase()))];
      if (all.length === 0) setCourtMsg(osm === null ? "A busca de quadras não respondeu. Tente de novo em instantes." : "Não achei quadra com esse nome. Escreva o nome e o endereço abaixo.");
      else setCourts(all);
    } finally {
      setCourtBusy(false);
    }
  }
  function pickCourt(c: Court) {
    setCourts(null);
    setName(c.name);
    if (c.address) setAddress(c.address);
    setPos({ lat: c.lat, lng: c.lng });
    goTo(c);
  }

  function pick(p: Place) {
    setResults(null);
    setPos({ lat: p.lat, lng: p.lng });
    goTo(p);
    setMsg("");
  }

  return (
    <>
      <div>
        <label className="label" htmlFor="location">Local</label>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            id="location"
            name="location"
            placeholder="Nome da quadra"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); findCourts(false); } }}
          />
          <button type="button" className="btn-ghost shrink-0 px-3.5" onClick={() => findCourts(false)} disabled={courtBusy} aria-label="Buscar quadra">
            <Search size={17} /> {courtBusy ? "..." : "Buscar"}
          </button>
        </div>
        <button type="button" onClick={() => findCourts(true)} disabled={courtBusy} className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-accent">
          <LocateFixed size={13} /> Quadras perto de mim
        </button>
        {courts && (
          <ul className="mt-2 flex max-h-72 flex-col gap-1 overflow-y-auto rounded-xl bg-surface p-1.5 ring-1 ring-fg/[0.08]" data-testid="courts">
            {courts.map((c) => {
              const d = me ? km(me, c) : null;
              return (
                <li key={`${c.source}${c.lat},${c.lng}`}>
                  <button type="button" onClick={() => pickCourt(c)} className="flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-surface-2">
                    <MapPin size={14} className="mt-1 shrink-0 text-accent" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <b className="text-sm">{c.name}</b>
                      <small className="text-xs text-fg/50">{[c.address || "Endereço no mapa", d != null && fmtKm(d)].filter(Boolean).join(" · ")}</small>
                    </span>
                    {c.source === "jogus" && <span className="chip shrink-0 bg-accent/15 text-accent">No Jogus</span>}
                  </button>
                </li>
              );
            })}
            <li className="px-2.5 py-1.5 text-[11px] text-fg/40">Não achou? Escreva o nome e busque o endereço abaixo.</li>
          </ul>
        )}
        {courtMsg && <p className="mt-1.5 text-xs text-gold">{courtMsg}</p>}
      </div>
      <div>
        <label className="label" htmlFor="address">Endereço</label>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            id="address"
            name="address"
            placeholder="Rua, número, bairro, cidade"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); find(); } }}
          />
          <button type="button" className="btn-ghost shrink-0 px-3.5" onClick={find} disabled={busy} aria-label="Achar no mapa">
            <Search size={17} /> {busy ? "..." : "Mapa"}
          </button>
        </div>
        <input type="hidden" name="lat" value={pos?.lat ?? ""} />
        <input type="hidden" name="lng" value={pos?.lng ?? ""} />
        {results && (
          <ul className="mt-2 flex flex-col gap-1 rounded-xl bg-surface p-1.5 ring-1 ring-fg/[0.08]">
            {results.map((r) => (
              <li key={`${r.lat},${r.lng}`}>
                <button type="button" onClick={() => pick(r)} className="flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-surface-2">
                  <MapPin size={14} className="mt-0.5 shrink-0 text-accent" /> {r.label}
                </button>
              </li>
            ))}
          </ul>
        )}
        {msg && <p className="mt-1.5 text-xs text-gold">{msg}</p>}
        <div className="relative isolate mt-2 h-60 overflow-hidden rounded-xl ring-1 ring-fg/[0.08]" data-testid="place-map">
          {gkey === undefined ? loadingMap() : gkey ? (
            <GoogleMap
              apiKey={gkey}
              onFail={googleFailed}
              pins={[]}
              me={me}
              selected={null}
              onSelect={() => {}}
              courts={near}
              court={pos ? near.find((c) => c.lat === pos.lat && c.lng === pos.lng) ?? null : null}
              onCourt={(c) => { courtTap.current = Date.now(); setName(c.name); if (c.address) setAddress(c.address); setPos({ lat: c.lat, lng: c.lng }); setCourts(null); }}
              onMove={(c) => { if (!nearCenter.current || km(nearCenter.current, c) > 1.5) setMoved(c); }}
              point={pos}
              onMapClick={(c) => { if (Date.now() - courtTap.current > 400) setPos(c); }}
              focus={focus}
            />
          ) : (
            <FreeMap
              pins={[]}
              me={me}
              selected={null}
              onSelect={() => {}}
              courts={near}
              court={pos ? near.find((c) => c.lat === pos.lat && c.lng === pos.lng) ?? null : null}
              onCourt={(c) => { setName(c.name); if (c.address) setAddress(c.address); setPos({ lat: c.lat, lng: c.lng }); setCourts(null); }}
              onMove={(c) => { if (!nearCenter.current || km(nearCenter.current, c) > 1.5) setMoved(c); }}
              point={pos}
              onMapClick={(c) => { if (Date.now() - courtTap.current > 400) setPos(c); }}
              focus={focus}
            />
          )}
          <span className="pointer-events-none absolute left-2 top-2 z-[500] flex items-center gap-1.5 rounded-full bg-bg/80 px-2.5 py-1 text-[11px] font-bold text-fg/75">
            <LandPlot size={12} className="text-accent" />
            {nearBusy ? "Buscando quadras..." : `${near.length} ${near.length === 1 ? "quadra" : "quadras"} na região`}
          </span>
          {moved && !nearBusy && (
            <button type="button" onClick={() => loadNear(moved)} className="absolute left-1/2 top-10 z-[500] flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-[12px] font-extrabold text-bg" data-testid="place-courts-here">
              <Search size={13} /> Buscar quadras aqui
            </button>
          )}
        </div>
        <p className="mt-1 flex items-start justify-between gap-3 text-xs text-fg/45">
          {pos ? "Toque numa quadra para escolher, ou no mapa para marcar o ponto exato." : "Toque numa quadra ou no mapa para marcar o local. Com o ponto no mapa, sua partida aberta aparece no \"Quero jogar\"."}
          {pos && <button type="button" className="shrink-0 font-semibold text-fg/60 underline" onClick={() => setPos(null)}>Tirar do mapa</button>}
        </p>
      </div>
    </>
  );
}
