"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { Court } from "@/lib/map";

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
