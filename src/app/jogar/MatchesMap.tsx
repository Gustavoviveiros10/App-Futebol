"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type * as L from "leaflet";
import { SAO_PAULO, TILE_ATTRIBUTION, TILE_URL } from "@/lib/map";

export type MapPinData = { code: string; lat: number; lng: number; time: string; access: string; name: string };

/** Mapa real (OpenStreetMap) com um pino por partida. */
export function MatchesMap({ pins, me, selected, onSelect }: { pins: MapPinData[]; me: { lat: number; lng: number } | null; selected: string | null; onSelect: (code: string | null) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
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
      Lf.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map.current);
      layer.current = Lf.layerGroup().addTo(map.current);
      map.current.on("click", () => pick.current(null));
      draw(true);
    })();
    return () => { alive = false; map.current?.remove(); map.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // redesenha pinos quando filtros, seleção ou localização mudam
  const key = pins.map((p) => p.code).join(",") + "|" + (me ? `${me.lat},${me.lng}` : "");
  const lastKey = useRef("");
  useEffect(() => {
    draw(key !== lastKey.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, selected]);

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
    if (fit && pts.length) m.fitBounds(Lf.latLngBounds(pts).pad(0.25), { maxZoom: 15 });
  }

  return <div ref={box} className="jc-map absolute inset-0" data-testid="x-leaflet" />;
}
