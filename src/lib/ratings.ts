import "server-only";
import { db } from "./db";

export const TAGS_GOOD = ["Craque", "Garçom", "Raçudo", "Pontual", "Fair play"] as const;
export const TAGS_BAD = ["Atrasou", "Desrespeitoso"] as const;
export const ALL_TAGS: readonly string[] = [...TAGS_GOOD, ...TAGS_BAD];

export type PeerSummary = { quality: number | null; conduct: number | null; count: number };

/** Médias de qualidade e conduta (1 a 5) dadas pelos colegas, por jogador. */
export async function peerSummaries(playerIds: string[]) {
  const map = new Map<string, PeerSummary>();
  if (!playerIds.length) return map;
  const rows = await db.peerRating.groupBy({
    by: ["ratedId"],
    where: { ratedId: { in: playerIds } },
    _avg: { quality: true, conduct: true },
    _count: { _all: true },
  });
  for (const r of rows) map.set(r.ratedId, { quality: r._avg.quality, conduct: r._avg.conduct, count: r._count._all });
  return map;
}

/** Resumo completo para o perfil, com a contagem de cada tag (um jogador ou vários, ex.: todas as peladas de uma conta). */
export async function peerProfile(playerId: string | string[]) {
  const ids = Array.isArray(playerId) ? playerId : [playerId];
  const rows = ids.length ? await db.peerRating.findMany({ where: { ratedId: { in: ids } }, select: { quality: true, conduct: true, tags: true } }) : [];
  const tags = new Map<string, number>();
  for (const r of rows) for (const t of r.tags) tags.set(t, (tags.get(t) ?? 0) + 1);
  const avg = (k: "quality" | "conduct") => (rows.length ? rows.reduce((s, r) => s + r[k], 0) / rows.length : null);
  return {
    quality: avg("quality"),
    conduct: avg("conduct"),
    count: rows.length,
    tags: ALL_TAGS.filter((t) => tags.has(t)).map((t) => ({ tag: t, count: tags.get(t)!, bad: (TAGS_BAD as readonly string[]).includes(t) })),
  };
}

/** Nota de jogo para o organizador: média dos colegas; sem isso, a nota dada pelo organizador. */
export function gameStars(peer: PeerSummary | undefined, organizerAvg10: number | null | undefined) {
  if (peer?.quality != null) return peer.quality;
  return organizerAvg10 != null ? organizerAvg10 / 2 : null;
}
