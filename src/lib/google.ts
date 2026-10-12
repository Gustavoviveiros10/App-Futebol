import "server-only";
import { db } from "@/lib/db";
import { km, type Court } from "@/lib/map";

/**
 * Google Maps sem custo: cada serviço tem uma cota grátis por mês. Paramos em 90% dela
 * e o app volta para o mapa gratuito (CARTO + OpenStreetMap). Os limites diários no
 * Google Cloud são a segunda trava.
 */
export const FREE_CAP = {
  map: 9_000, // Maps JavaScript: 10.000 carregamentos grátis/mês
  places: 4_500, // Places Text Search Pro: 5.000 buscas grátis/mês
} as const;
type Sku = keyof typeof FREE_CAP;

const month = () => new Date().toISOString().slice(0, 7);

/** Reserva um uso do serviço; devolve false quando a cota grátis do mês acabou. */
export async function reserve(sku: Sku): Promise<boolean> {
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "ApiUsage" ("month", "sku", "count") VALUES (${month()}, ${sku}, 1)
    ON CONFLICT ("month", "sku") DO UPDATE SET "count" = "ApiUsage"."count" + 1
    WHERE "ApiUsage"."count" < ${FREE_CAP[sku]}
    RETURNING "count"`;
  return rows.length > 0;
}

export function googleMapKey() {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || null;
}

const CELL = 0.02; // ~2 km
const TTL_MS = 30 * 24 * 3600 * 1000;

/** Quadras do Google perto de um ponto, com cache por região. null = Google indisponível (sem chave ou sem cota). */
export async function googleCourts(lat: number, lng: number, radiusKm: number): Promise<Court[] | null> {
  const key = process.env.GOOGLE_PLACES_KEY;
  if (!key) return null;
  const cLat = Math.round(lat / CELL) * CELL, cLng = Math.round(lng / CELL) * CELL;
  const cell = `${cLat.toFixed(2)},${cLng.toFixed(2)}`;
  const hit = await db.courtCache.findUnique({ where: { cell } });
  let list: Court[] | null = hit && Date.now() - hit.createdAt.getTime() < TTL_MS ? (hit.data as Court[]) : null;
  if (!list) {
    if (!(await reserve("places"))) return null;
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        // só os campos do nível "Pro" (mais caro que isso não entra)
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location",
      },
      body: JSON.stringify({
        textQuery: "quadra de futebol society",
        languageCode: "pt-BR",
        regionCode: "BR",
        pageSize: 20,
        locationBias: { circle: { center: { latitude: cLat, longitude: cLng }, radius: Math.min(radiusKm, 50) * 1000 } },
      }),
    }).catch(() => null);
    if (!res?.ok) return null;
    const data: { places?: { id: string; displayName?: { text: string }; formattedAddress?: string; location?: { latitude: number; longitude: number } }[] } = await res.json();
    list = (data.places ?? [])
      .filter((p) => p.displayName?.text && p.location)
      .map((p) => ({ name: p.displayName!.text, address: (p.formattedAddress ?? "").replace(/, Brasil$/, ""), lat: p.location!.latitude, lng: p.location!.longitude, source: "google" as const }));
    await db.courtCache.upsert({ where: { cell }, create: { cell, data: list }, update: { data: list, createdAt: new Date() } });
  }
  return list.filter((c) => km({ lat, lng }, c) <= radiusKm * 1.5);
}
