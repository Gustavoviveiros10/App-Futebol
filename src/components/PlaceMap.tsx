"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type * as L from "leaflet";
import { TILE_OPTIONS, TILE_URL } from "@/lib/map";
import { googleMapForThisView } from "@/lib/court-actions";

const GoogleMap = dynamic(() => import("@/app/jogar/GoogleMatchesMap").then((m) => m.GoogleMatchesMap), { ssr: false });

/** Mapinha com o ponto do local: do Google enquanto houver cota grátis no mês, senão o gratuito. */
export function PlaceMap({ lat, lng, className = "h-44" }: { lat: number; lng: number; className?: string }) {
  const [gkey, setGkey] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    googleMapForThisView().then(setGkey, () => setGkey(null));
  }, []);
  const frame = `jc-map relative isolate overflow-hidden rounded-xl ring-1 ring-fg/[0.08] ${className}`;
  if (gkey === undefined) return <div className={`${frame} animate-pulse`} />;
  if (gkey) {
    return (
      <div className={frame}>
        <GoogleMap apiKey={gkey} onFail={() => setGkey(null)} pins={[]} me={null} selected={null} onSelect={() => {}} point={{ lat, lng }} />
      </div>
    );
  }
  return <FreePlaceMap lat={lat} lng={lng} className={frame} />;
}

function FreePlaceMap({ lat, lng, className }: { lat: number; lng: number; className: string }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let map: L.Map | null = null, alive = true;
    (async () => {
      const Lf = await import("leaflet");
      if (!alive || !box.current) return;
      map = Lf.map(box.current, { zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false, boxZoom: false, keyboard: false }).setView([lat, lng], 15);
      Lf.tileLayer(TILE_URL, TILE_OPTIONS).addTo(map);
      Lf.marker([lat, lng], { icon: Lf.divIcon({ className: "", html: '<div class="jc-dot"></div>', iconSize: [0, 0] }), interactive: false }).addTo(map);
    })();
    return () => { alive = false; map?.remove(); };
  }, [lat, lng]);
  return <div ref={box} className={className} data-testid="x-leaflet" />;
}
