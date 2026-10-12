"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from "react";
import { SAO_PAULO, type Court } from "@/lib/map";
import type { MapPinData } from "./MatchesMap";

type Pt = { lat: number; lng: number };
declare global { interface Window { google?: any; __jcGmaps?: Promise<any> } }

/** Visual escuro do Jogus para o mapa do Google. */
const DARK = [
  { elementType: "geometry", stylers: [{ color: "#14171d" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a919e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#101318" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#2a2f38" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", stylers: [{ visibility: "on" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#16241a" }] },
  { featureType: "poi.park", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#232831" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1a1e25" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#2e3440" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0b0e13" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4b5260" }] },
];

function loadGoogle(key: string): Promise<any> {
  if (window.google?.maps?.Map) return Promise.resolve(window.google);
  window.__jcGmaps ??= new Promise((ok, fail) => {
    const cb = `__jcGmapsReady${Date.now()}`;
    (window as any)[cb] = () => ok(window.google);
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&language=pt-BR&region=BR&loading=async&callback=${cb}`;
    s.async = true;
    s.onerror = () => { window.__jcGmaps = undefined; fail(new Error("google maps")); };
    document.head.appendChild(s);
  });
  return window.__jcGmaps;
}

/** Marcador com o mesmo HTML/CSS dos pinos do mapa gratuito. */
function htmlMarker(g: any, map: any, pos: Pt, html: string, z: number, title: string, onClick?: () => void) {
  class M extends g.maps.OverlayView {
    el = document.createElement("div");
    onAdd() {
      this.el.style.position = "absolute";
      this.el.style.zIndex = String(1000 + z);
      this.el.innerHTML = html;
      if (onClick) {
        this.el.title = title;
        this.el.tabIndex = 0;
        this.el.setAttribute("role", "button");
        const go = (e: Event) => { e.stopPropagation(); onClick(); };
        this.el.addEventListener("click", go);
        this.el.addEventListener("keydown", (e) => { if ((e as KeyboardEvent).key === "Enter") go(e); });
      }
      this.getPanes().overlayMouseTarget.appendChild(this.el);
    }
    draw() {
      const p = this.getProjection().fromLatLngToDivPixel(new g.maps.LatLng(pos.lat, pos.lng));
      if (p) { this.el.style.left = `${p.x}px`; this.el.style.top = `${p.y}px`; }
    }
    onRemove() { this.el.remove(); }
  }
  const m = new M();
  m.setMap(map);
  return m;
}

/** Mesmo mapa do "Quero jogar", só que do Google (usado enquanto houver cota grátis no mês). */
export function GoogleMatchesMap({ apiKey, pins, me, selected, onSelect, courts = [], court = null, onCourt, onMove, onFail, point = null, onMapClick, focus = null }: {
  apiKey: string;
  pins: MapPinData[];
  me: Pt | null;
  selected: string | null;
  onSelect: (code: string | null) => void;
  courts?: Court[];
  court?: Court | null;
  onCourt?: (c: Court) => void;
  onMove?: (center: Pt) => void;
  /** o Google recusou (chave ou limite diário): volta para o mapa gratuito */
  onFail?: () => void;
  point?: Pt | null;
  onMapClick?: (p: Pt) => void;
  focus?: (Pt & { zoom?: number }) | null;
}) {
  const box = useRef<HTMLDivElement>(null);
  const G = useRef<any>(null);
  const map = useRef<any>(null);
  const pinMk = useRef<any[]>([]);
  const courtMk = useRef<any[]>([]);
  const fitting = useRef(false);
  const cb = useRef({ onSelect, onCourt, onMove, onFail, onMapClick });
  cb.current = { onSelect, onCourt, onMove, onFail, onMapClick };

  useEffect(() => {
    let alive = true;
    // o Google avisa erro de chave/cota por este gancho global
    (window as any).gm_authFailure = () => cb.current.onFail?.();
    loadGoogle(apiKey).then((g) => {
      if (!alive || !box.current || map.current) return;
      G.current = g;
      map.current = new g.maps.Map(box.current, {
        center: { lat: SAO_PAULO[0], lng: SAO_PAULO[1] },
        zoom: 12,
        styles: DARK,
        backgroundColor: "#101318",
        disableDefaultUI: true,
        zoomControl: true,
        clickableIcons: false,
        gestureHandling: "greedy",
      });
      map.current.addListener("click", (e: any) => { cb.current.onSelect(null); if (e.latLng) cb.current.onMapClick?.({ lat: e.latLng.lat(), lng: e.latLng.lng() }); });
      // só conta movimento feito pela pessoa (o enquadramento automático não)
      let byUser = false;
      map.current.addListener("dragstart", () => (byUser = true));
      map.current.addListener("zoom_changed", () => { if (!fitting.current) byUser = true; });
      map.current.addListener("idle", () => {
        fitting.current = false;
        if (!byUser) return;
        byUser = false;
        const c = map.current.getCenter();
        cb.current.onMove?.({ lat: c.lat(), lng: c.lng() });
      });
      draw(true);
      drawCourts();
    }).catch(() => cb.current.onFail?.());
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const key = pins.map((p) => p.code).join(",") + "|" + (me ? `${me.lat},${me.lng}` : "");
  const lastKey = useRef("");
  useEffect(() => {
    draw(key !== lastKey.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, selected, point?.lat, point?.lng]);
  useEffect(() => {
    if (!focus || !map.current) return;
    fitting.current = true;
    map.current.setCenter(focus);
    map.current.setZoom(focus.zoom ?? 16);
  }, [focus]);

  function draw(fit: boolean) {
    const g = G.current, m = map.current;
    if (!g || !m) return;
    lastKey.current = key;
    pinMk.current.forEach((x) => x.setMap(null));
    pinMk.current = [];
    const bounds = new g.maps.LatLngBounds();
    let n = 0;
    if (me) { pinMk.current.push(htmlMarker(g, m, me, '<div class="jc-me" title="Você está aqui"></div>', 0, "Você")); bounds.extend(me); n++; }
    if (point) { pinMk.current.push(htmlMarker(g, m, point, '<div class="jc-dot" title="Local da pelada"></div>', 900, "Local da pelada")); bounds.extend(point); n++; }
    pins.forEach((p) => {
      const on = p.code === selected;
      pinMk.current.push(htmlMarker(g, m, p, `<span class="jc-pin ${p.access}${on ? " on" : ""}">${p.time}</span>`, on ? 600 : 500, `${p.name} às ${p.time}`, () => cb.current.onSelect(p.code)));
      bounds.extend(p); n++;
    });
    if (fit && n) {
      fitting.current = true;
      if (n === 1) { m.setCenter(bounds.getCenter()); m.setZoom(15); }
      else m.fitBounds(bounds, 48);
    }
  }

  const courtKey = courts.map((c) => `${c.lat},${c.lng}`).join("|") + "|" + (court ? `${court.lat},${court.lng}` : "");
  useEffect(() => {
    drawCourts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courtKey]);

  function drawCourts() {
    const g = G.current, m = map.current;
    if (!g || !m) return;
    courtMk.current.forEach((x) => x.setMap(null));
    courtMk.current = courts.map((c) => {
      const on = !!court && court.lat === c.lat && court.lng === c.lng;
      return htmlMarker(g, m, c, `<span class="jc-court${c.source === "jogus" ? " jogus" : ""}${on ? " on" : ""}"></span>`, on ? 400 : 100, c.name, () => cb.current.onCourt?.(c));
    });
  }

  return <div ref={box} className="jc-map absolute inset-0" data-testid="x-gmap" />;
}
