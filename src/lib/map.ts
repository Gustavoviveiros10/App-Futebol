/** Mapa gratuito (OpenStreetMap) e busca de endereço (Nominatim), sem chave de API. */
export const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
export const SAO_PAULO: [number, number] = [-23.5505, -46.6333];

export type Place = { label: string; lat: number; lng: number };

/** Busca endereços no Brasil. Só chamar em ação do usuário (regra de uso do Nominatim: sem autocomplete). */
export async function searchAddress(q: string): Promise<Place[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=br&limit=5&accept-language=pt-BR&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("busca indisponível");
  const rows: { display_name: string; lat: string; lon: string }[] = await res.json();
  return rows.map((r) => ({ label: r.display_name, lat: +r.lat, lng: +r.lon }));
}

/** Distância em km entre dois pontos. */
export function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function fmtKm(d: number) {
  return d < 1 ? `${Math.round(d * 1000)} m` : `${d.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;
}

export function directionsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export type Court = { name: string; address: string; lat: number; lng: number; source: "jogus" | "osm" };

const OVERPASS = "https://overpass-api.de/api/interpreter";

/** Quadras de futebol do OpenStreetMap (campos, society, futsal e centros esportivos), por nome e/ou perto de um ponto. */
export async function searchOsmCourts({ name, near, radiusKm = 30 }: { name?: string; near: { lat: number; lng: number }; radiusKm?: number }): Promise<Court[]> {
  const nm = name?.trim() ? `["name"~"${name.trim().replace(/[\\"^$.*+?()[\]{}|]/g, "").slice(0, 40)}",i]` : `["name"]`;
  const around = `(around:${Math.round(radiusKm * 1000)},${near.lat},${near.lng})`;
  const query = `[out:json][timeout:20];(
nwr["leisure"="pitch"]["sport"~"soccer|futsal|society|football",i]${nm}${around};
nwr["leisure"~"sports_centre|stadium|sports_hall"]${nm}${around};
);out center tags 40;`;
  const res = await fetch(OVERPASS, { method: "POST", body: new URLSearchParams({ data: query }) });
  if (!res.ok) throw new Error("busca indisponível");
  const data: { elements: { lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[] } = await res.json();
  const seen = new Set<string>();
  return data.elements
    .map((e): Court | null => {
      const t = e.tags ?? {};
      const lat = e.lat ?? e.center?.lat, lng = e.lon ?? e.center?.lon;
      const street = [t["addr:street"], t["addr:housenumber"]].filter(Boolean).join(", ");
      const address = [street, t["addr:suburb"], t["addr:city"]].filter(Boolean).join(" - ");
      return lat != null && lng != null && t.name ? { name: t.name, address, lat, lng, source: "osm" } : null;
    })
    .filter((c): c is Court => !!c && !seen.has(c.name.toLowerCase()) && !!seen.add(c.name.toLowerCase()))
    .sort((a, b) => km(near, a) - km(near, b))
    .slice(0, 8);
}
