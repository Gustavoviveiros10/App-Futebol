"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type * as L from "leaflet";
import { TILE_ATTRIBUTION, TILE_URL } from "@/lib/map";

/** Mapinha só de leitura com o ponto do local. */
export function PlaceMap({ lat, lng, className = "h-44" }: { lat: number; lng: number; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let map: L.Map | null = null, alive = true;
    (async () => {
      const Lf = await import("leaflet");
      if (!alive || !box.current) return;
      map = Lf.map(box.current, { zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false, boxZoom: false, keyboard: false }).setView([lat, lng], 15);
      Lf.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
      Lf.marker([lat, lng], { icon: Lf.divIcon({ className: "", html: '<div class="jc-dot"></div>', iconSize: [0, 0] }), interactive: false }).addTo(map);
    })();
    return () => { alive = false; map?.remove(); };
  }, [lat, lng]);
  return <div ref={box} className={`jc-map isolate overflow-hidden rounded-xl ring-1 ring-fg/[0.08] ${className}`} />;
}
