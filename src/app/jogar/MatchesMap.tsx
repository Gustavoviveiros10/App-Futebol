"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type * as L from "leaflet";
import { SAO_PAULO, TILE_OPTIONS, TILE_URL, type Court } from "@/lib/map";

export type MapPinData = { code: string; lat: number; lng: number; time: string; access: string; name: string };

type Pt = { lat: number; lng: number };

/** Mapa com um pino por partida e, por baixo, as quadras da região. */
export function MatchesMap({ pins, me, selected, onSelect, courts = [], court = null, onCourt, onMove, point = null, onMapClick, focus = null }: {
  pins: MapPinData[];
  me: Pt | null;
  selected: string | null;
  onSelect: (code: string | null) => void;
  courts?: Court[];
  court?: Court | null;
  onCourt?: (c: Court) => void;
  /** centro do mapa depois que a pessoa arrasta ou dá zoom */
  onMove?: (center: Pt) => void;
  /** ponto escolhido (local da pelada) e toque no mapa para escolher */
  point?: Pt | null;
  onMapClick?: (p: Pt) => void;
  /** quando muda, o mapa vai até esse ponto */
  focus?: (Pt & { zoom?: number }) | null;
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const courtLayer = useRef<L.LayerGroup | null>(null);
  const cb = useRef({ onCourt, onMove, onMapClick });
  cb.current = { onCourt, onMove, onMapClick };
  const Lref = useRef<typeof L | null>(null);
  const pick = useRef(onSelect);
  pick.current = onSelect;

  useEffect(() => {
    let alive = true;
    (async () => {
      const Lf = await import("leaflet");
      if (!alive || !box.current || map.current) return;
      Lref.current = Lf;
      map.current = Lf.map(box.current, { zoomControl: false }).setView(SAO_PAULO, 12);
      Lf.control.zoom({ position: "topright" }).addTo(map.current);
      Lf.tileLayer(TILE_URL, TILE_OPTIONS).addTo(map.current);
      courtLayer.current = Lf.layerGroup().addTo(map.current);
      layer.current = Lf.layerGroup().addTo(map.current);
      map.current.on("click", (e: L.LeafletMouseEvent) => { pick.current(null); cb.current.onMapClick?.({ lat: e.latlng.lat, lng: e.latlng.lng }); });
      // só conta movimento feito pela pessoa (o enquadramento automático não)
      map.current.on("dragend zoomend", () => { if (!fitting.current) { const c = map.current!.getCenter(); cb.current.onMove?.({ lat: c.lat, lng: c.lng }); } });
      draw(true);
      drawCourts();
    })();
    return () => { alive = false; map.current?.remove(); map.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // redesenha pinos quando filtros, seleção ou localização mudam
  const key = pins.map((p) => p.code).join(",") + "|" + (me ? `${me.lat},${me.lng}` : "");
  const lastKey = useRef("");
  const fitting = useRef(false);
  useEffect(() => {
    draw(key !== lastKey.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, selected, point?.lat, point?.lng]);
  useEffect(() => {
    if (!focus || !map.current) return;
    fitting.current = true;
    map.current.setView([focus.lat, focus.lng], focus.zoom ?? 16);
    setTimeout(() => (fitting.current = false), 400);
  }, [focus]);

  function draw(fit: boolean) {
    const Lf = Lref.current, m = map.current, g = layer.current;
    if (!Lf || !m || !g) return;
    lastKey.current = key;
    g.clearLayers();
    const pts: [number, number][] = [];
    if (me) {
      Lf.marker([me.lat, me.lng], { icon: Lf.divIcon({ className: "", html: '<div class="jc-me" title="Você está aqui"></div>', iconSize: [0, 0] }), interactive: false }).addTo(g);
      pts.push([me.lat, me.lng]);
    }
    if (point) {
      Lf.marker([point.lat, point.lng], { icon: Lf.divIcon({ className: "", html: '<div class="jc-dot" title="Local da pelada"></div>', iconSize: [0, 0] }), interactive: false, zIndexOffset: 2000 }).addTo(g);
      pts.push([point.lat, point.lng]);
    }
    pins.forEach((p) => {
      const cls = `jc-pin ${p.access}${p.code === selected ? " on" : ""}`;
      const mk = Lf.marker([p.lat, p.lng], {
        icon: Lf.divIcon({ className: "", html: `<span class="${cls}" aria-label="${p.name.replace(/"/g, "")} às ${p.time}">${p.time}</span>`, iconSize: [0, 0] }),
        zIndexOffset: p.code === selected ? 1000 : 0,
        keyboard: true,
        title: `${p.name} às ${p.time}`,
      }).addTo(g);
      mk.on("click", (e) => { Lf.DomEvent.stopPropagation(e); pick.current(p.code); });
      pts.push([p.lat, p.lng]);
    });
    if (fit && pts.length) {
      fitting.current = true;
      m.fitBounds(Lf.latLngBounds(pts).pad(0.25), { maxZoom: 15 });
      setTimeout(() => (fitting.current = false), 400);
    }
  }

  const courtKey = courts.map((c) => `${c.lat},${c.lng}`).join("|") + "|" + (court ? `${court.lat},${court.lng}` : "");
  useEffect(() => {
    drawCourts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courtKey]);

  function drawCourts() {
    const Lf = Lref.current, g = courtLayer.current;
    if (!Lf || !g) return;
    g.clearLayers();
    courts.forEach((c) => {
      const on = court && court.lat === c.lat && court.lng === c.lng;
      const mk = Lf.marker([c.lat, c.lng], {
        icon: Lf.divIcon({ className: "", html: `<span class="jc-court${c.source === "jogus" ? " jogus" : ""}${on ? " on" : ""}"></span>`, iconSize: [0, 0] }),
        keyboard: true,
        title: c.name,
        zIndexOffset: on ? 900 : -100,
      }).addTo(g);
      mk.on("click", (e) => { Lf.DomEvent.stopPropagation(e); cb.current.onCourt?.(c); });
    });
  }

  return <div ref={box} className="jc-map absolute inset-0" data-testid="x-leaflet" />;
}
