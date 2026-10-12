"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { km, searchOsmCourts, type Court } from "@/lib/map";
import { googleCourts, googleMapKey, reserve } from "@/lib/google";

/** Chave do mapa do Google para esta abertura de mapa, ou null para usar o mapa gratuito (sem chave ou cota grátis do mês no fim). */
export async function googleMapForThisView(): Promise<string | null> {
  const key = googleMapKey();
  if (!key) return null;
  return (await reserve("map").catch(() => false)) ? key : null;
}

/** Quadras que outras peladas do Jogus já cadastraram com ponto no mapa. */
export async function searchJogusCourts(q: string): Promise<Court[]> {
  if (!(await getCurrentUser())) return [];
  const term = q.trim().slice(0, 60);
  if (term.length < 2) return [];
  const where = { lat: { not: null }, lng: { not: null }, OR: [{ location: { contains: term, mode: "insensitive" as const } }, { address: { contains: term, mode: "insensitive" as const } }] };
  const [groups, matches] = await Promise.all([
    db.group.findMany({ where, select: { location: true, address: true, lat: true, lng: true }, take: 20 }),
    db.match.findMany({ where, select: { location: true, address: true, lat: true, lng: true }, orderBy: { date: "desc" }, take: 20 }),
  ]);
  const seen = new Set<string>();
  const out: Court[] = [];
  for (const r of [...groups, ...matches]) {
    const name = r.location || r.address || "";
    const key = `${name.toLowerCase()}|${r.lat!.toFixed(4)},${r.lng!.toFixed(4)}`;
    if (!name || seen.has(key)) continue;
    seen.add(key);
    out.push({ name, address: r.address ?? "", lat: r.lat!, lng: r.lng!, source: "jogus" });
  }
  return out.slice(0, 5);
}

/**
 * Quadras perto de um ponto: as que peladas públicas do Jogus já usam + as do Google (só quando o mapa
 * na tela é do Google, regra de uso deles) ou, sem o Google, as do OpenStreetMap.
 */
export async function courtsNear(lat: number, lng: number, radiusKm = 5, onGoogleMap = false): Promise<Court[]> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return [];
  const r = Math.min(Math.max(radiusKm, 1), 15);
  const dLat = r / 111, dLng = r / (111 * Math.cos((lat * Math.PI) / 180));
  const box = { lat: { gte: lat - dLat, lte: lat + dLat }, lng: { gte: lng - dLng, lte: lng + dLng } };
  const [mine, others] = await Promise.all([
    db.match.findMany({
      where: { ...box, access: { not: "RESTRICTED" } },
      select: { location: true, address: true, lat: true, lng: true },
      orderBy: { date: "desc" },
      take: 60,
    }),
    (async () => (onGoogleMap ? await googleCourts(lat, lng, r).catch(() => null) : null) ?? (await searchOsmCourts({ near: { lat, lng }, radiusKm: r, limit: 40 }).catch(() => [] as Court[])))(),
  ]);
  const out: Court[] = [];
  const near = (a: Court) => out.some((c) => km(a, c) < 0.08 || c.name.toLowerCase() === a.name.toLowerCase());
  for (const m of mine) {
    const c: Court = { name: m.location || m.address || "", address: m.address ?? "", lat: m.lat!, lng: m.lng!, source: "jogus" };
    if (c.name && !near(c)) out.push(c);
  }
  for (const c of others) if (!near(c)) out.push(c);
  return out.sort((a, b) => km({ lat, lng }, a) - km({ lat, lng }, b)).slice(0, 50);
}
