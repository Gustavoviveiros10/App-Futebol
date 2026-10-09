"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { LocateFixed, MapPin, Search } from "lucide-react";
import type * as L from "leaflet";
import { SAO_PAULO, TILE_ATTRIBUTION, TILE_URL, fmtKm, km, searchAddress, searchOsmCourts, type Court, type Place } from "@/lib/map";
import { searchJogusCourts } from "@/lib/court-actions";

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
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);

  // cria o mapa quando já existe um ponto
  useEffect(() => {
    if (!pos || !box.current) return;
    let alive = true;
    (async () => {
      const Lf = await import("leaflet");
      if (!alive || !box.current) return;
      const icon = Lf.divIcon({ className: "", html: '<div class="jc-dot"></div>', iconSize: [0, 0] });
      if (!map.current) {
        map.current = Lf.map(box.current, { zoomControl: true, attributionControl: true }).setView([pos.lat, pos.lng], 16);
        Lf.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map.current);
        marker.current = Lf.marker([pos.lat, pos.lng], { icon, draggable: true }).addTo(map.current);
        marker.current.on("dragend", () => { const p = marker.current!.getLatLng(); setPos({ lat: p.lat, lng: p.lng }); });
        map.current.on("click", (e: L.LeafletMouseEvent) => { marker.current!.setLatLng(e.latlng); setPos({ lat: e.latlng.lat, lng: e.latlng.lng }); });
      } else {
        const cur = marker.current!.getLatLng();
        if (cur.lat !== pos.lat || cur.lng !== pos.lng) { marker.current!.setLatLng([pos.lat, pos.lng]); map.current.setView([pos.lat, pos.lng], 16); }
      }
    })();
    return () => { alive = false; };
  }, [pos]);

  useEffect(() => () => { map.current?.remove(); map.current = null; }, []);

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
  }

  function pick(p: Place) {
    setResults(null);
    setPos({ lat: p.lat, lng: p.lng });
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
        {pos ? (
          <>
            <div ref={box} className="jc-map isolate mt-2 h-48 overflow-hidden rounded-xl ring-1 ring-fg/[0.08]" data-testid="place-map" />
            <p className="mt-1 flex items-center justify-between text-xs text-fg/45">
              Toque no mapa ou arraste o ponto para ajustar.
              <button type="button" className="font-semibold text-fg/60 underline" onClick={() => { map.current?.remove(); map.current = null; setPos(null); }}>Tirar do mapa</button>
            </p>
          </>
        ) : (
          <p className="mt-1 text-xs text-fg/45">Com o endereço no mapa, sua partida aberta aparece no &quot;Quero jogar&quot; para quem está perto.</p>
        )}
      </div>
    </>
  );
}
