import "server-only";
import type { Player } from "@prisma/client";
import { db } from "./db";
import { DEFAULT_TZ, monthKey } from "./format";
import { monthRange } from "./finance";

export type Period = "semana" | "mes" | "temporada" | "sempre";

export const PERIODS: { key: Period; label: string }[] = [
  { key: "semana", label: "Semana" },
  { key: "mes", label: "Mês" },
  { key: "temporada", label: "Temporada" },
  { key: "sempre", label: "Sempre" },
];

export type PlayerStats = {
  player: Pick<Player, "id" | "name" | "nickname" | "photo" | "position">;
  games: number;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
  saves: number;
  wins: number;
  draws: number;
  losses: number;
  ratingSum: number;
  ratingCount: number;
  avgRating: number | null;
  mvps: number;
  points: number; // pontos do ranking geral
};

type TeamLite = { id: string; score: number | null };

/** "W" | "D" | "L" para um time, comparando com os demais da partida. */
export function teamOutcome(teams: TeamLite[], teamId: string | null): "W" | "D" | "L" | null {
  if (!teamId || teams.length < 2 || teams.some((t) => t.score == null)) return null;
  const mine = teams.find((t) => t.id === teamId);
  if (!mine) return null;
  const best = Math.max(...teams.map((t) => t.score!));
  if (mine.score! < best) return "L";
  return teams.filter((t) => t.score === best).length > 1 ? "D" : "W";
}

export async function periodFilter(groupId: string, period: Period, tz = DEFAULT_TZ) {
  if (period === "semana") return { date: { gte: new Date(Date.now() - 7 * 86400_000) } };
  if (period === "mes") return { date: { gte: monthRange(monthKey(new Date(), tz), tz).start } };
  if (period === "temporada") {
    const season = await db.season.findFirst({ where: { groupId, active: true }, orderBy: { startsAt: "desc" } });
    return season ? { seasonId: season.id } : {};
  }
  return {};
}

/** Agrega estatísticas das partidas finalizadas. */
export async function groupStats(groupId: string, period: Period = "sempre", playerId?: string) {
  const where = { groupId, status: "FINISHED" as const, ...(await periodFilter(groupId, period)) };
  const matches = await db.match.findMany({
    where,
    select: {
      mvpPlayerId: true,
      teams: { select: { id: true, score: true } },
      players: {
        where: { played: true, ...(playerId ? { playerId } : {}) },
        select: {
          playerId: true,
          teamId: true,
          goals: true,
          assists: true,
          yellowCards: true,
          redCards: true,
          saves: true,
          rating: true,
          player: { select: { id: true, name: true, nickname: true, photo: true, position: true } },
        },
      },
    },
  });

  const map = new Map<string, PlayerStats>();
  for (const m of matches) {
    for (const mp of m.players) {
      let s = map.get(mp.playerId);
      if (!s) {
        s = { player: mp.player, games: 0, goals: 0, assists: 0, yellow: 0, red: 0, saves: 0, wins: 0, draws: 0, losses: 0, ratingSum: 0, ratingCount: 0, avgRating: null, mvps: 0, points: 0 };
        map.set(mp.playerId, s);
      }
      s.games++;
      s.goals += mp.goals;
      s.assists += mp.assists;
      s.yellow += mp.yellowCards;
      s.red += mp.redCards;
      s.saves += mp.saves;
      if (mp.rating != null) {
        s.ratingSum += mp.rating;
        s.ratingCount++;
      }
      const o = teamOutcome(m.teams, mp.teamId);
      if (o === "W") s.wins++;
      else if (o === "D") s.draws++;
      else if (o === "L") s.losses++;
      if (m.mvpPlayerId === mp.playerId) s.mvps++;
    }
  }
  for (const s of map.values()) {
    s.avgRating = s.ratingCount ? s.ratingSum / s.ratingCount : null;
    // ranking geral: vitória 3, empate 1, gol 1, assistência 0,5, craque 3
    s.points = s.wins * 3 + s.draws + s.goals + s.assists * 0.5 + s.mvps * 3;
  }
  return [...map.values()];
}

export const RANKINGS = [
  { key: "geral", icon: "🏆", label: "Geral", value: (s: PlayerStats) => s.points, fmt: (v: number) => `${v.toLocaleString("pt-BR")} pts`, hint: "Vitória 3 · Empate 1 · Gol 1 · Assistência 0,5 · Craque 3" },
  { key: "artilharia", icon: "⚽", label: "Artilharia", value: (s: PlayerStats) => s.goals, fmt: (v: number) => `${v} gols` },
  { key: "assistencias", icon: "🎯", label: "Assistências", value: (s: PlayerStats) => s.assists, fmt: (v: number) => `${v}` },
  { key: "media", icon: "⭐", label: "Melhor média", value: (s: PlayerStats) => (s.ratingCount >= 1 ? (s.avgRating ?? 0) / 2 : 0), fmt: (v: number) => `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ★` },
  { key: "vitorias", icon: "🔥", label: "Vitórias", value: (s: PlayerStats) => s.wins, fmt: (v: number) => `${v}` },
  { key: "goleiro", icon: "🧤", label: "Goleiros", value: (s: PlayerStats) => (s.player.position === "GOALKEEPER" ? s.saves + s.wins * 2 : 0), fmt: (v: number) => `${v} pts`, hint: "Defesas + 2 por vitória" },
  { key: "partidas", icon: "🏅", label: "Mais partidas", value: (s: PlayerStats) => s.games, fmt: (v: number) => `${v} jogos` },
  { key: "craques", icon: "👑", label: "Craques", value: (s: PlayerStats) => s.mvps, fmt: (v: number) => `${v}x` },
] as const;

export type RankingKey = (typeof RANKINGS)[number]["key"];
