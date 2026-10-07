import type { PositionKey } from "./format";

export type DrawPlayer = { id: string; position: PositionKey; strength: number };
export type DrawMode = "BALANCED" | "RANDOM";

export const TEAM_PRESETS = [
  { name: "Time Azul", color: "blue" },
  { name: "Time Amarelo", color: "yellow" },
  { name: "Time Vermelho", color: "red" },
  { name: "Time Verde", color: "green" },
  { name: "Time Preto", color: "black" },
  { name: "Time Branco", color: "white" },
] as const;

/** Força usada no sorteio: nota do organizador + média das notas + aproveitamento. */
export function playerStrength(skill: number, avgRating: number | null, ratedGames: number, winRate: number | null, games: number) {
  let s = skill;
  if (avgRating != null && ratedGames >= 3) s = 0.5 * skill + 0.5 * avgRating;
  if (winRate != null && games >= 5) s += (winRate - 0.5) * 1.5;
  return Math.max(1, Math.min(10, s));
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function targetSizes(n: number, k: number) {
  return Array.from({ length: k }, (_, i) => Math.floor(n / k) + (i < n % k ? 1 : 0));
}

const LINE_GROUP: Record<PositionKey, "gk" | "def" | "mid" | "att"> = {
  GOALKEEPER: "gk",
  DEFENDER: "def",
  FULLBACK: "def",
  MIDFIELDER: "mid",
  FORWARD: "att",
};

function cost(teams: DrawPlayer[][]) {
  const totals = teams.map((t) => t.reduce((s, p) => s + p.strength, 0));
  const mean = totals.reduce((a, b) => a + b, 0) / teams.length;
  let c = totals.reduce((s, t) => s + (t - mean) ** 2, 0);
  for (const g of ["def", "mid", "att"] as const) {
    const counts = teams.map((t) => t.filter((p) => LINE_GROUP[p.position] === g).length);
    c += 0.6 * (Math.max(...counts) - Math.min(...counts)) ** 2;
  }
  return c;
}

/**
 * Distribui jogadores em `k` times. Goleiros são espalhados primeiro (um por
 * time). No modo equilibrado, faz um "draft" pela força e depois melhora com
 * trocas que reduzem a diferença de força e de posições entre os times.
 */
export function drawTeams(players: DrawPlayer[], k: number, mode: DrawMode, rand: () => number = Math.random): DrawPlayer[][] {
  k = Math.max(2, Math.min(k, players.length || 2));
  const teams: DrawPlayer[][] = Array.from({ length: k }, () => []);
  const sizes = targetSizes(players.length, k);

  const jitter = (p: DrawPlayer) => ({ p, s: p.strength + (rand() - 0.5) * 0.6 });
  const gks = players.filter((p) => p.position === "GOALKEEPER");
  const order = mode === "BALANCED"
    ? (list: DrawPlayer[]) => list.map(jitter).sort((a, b) => b.s - a.s).map((x) => x.p)
    : (list: DrawPlayer[]) => shuffle(list, rand);

  const keepers = order(gks).slice(0, k);
  const keeperIds = new Set(keepers.map((p) => p.id));
  const field = order(players.filter((p) => !keeperIds.has(p.id)));

  // goleiros: o melhor goleiro vai para o time que receberá menos força depois
  keepers.forEach((gk, i) => teams[(k - 1 - i) % k].push(gk));

  const total = (t: DrawPlayer[]) => t.reduce((s, p) => s + p.strength, 0);
  field.forEach((p, i) => {
    const open = teams.map((t, idx) => ({ t, idx })).filter(({ t, idx }) => t.length < sizes[idx]);
    const pick = mode === "BALANCED"
      ? open.sort((a, b) => total(a.t) - total(b.t) || a.t.length - b.t.length)[0]
      : open.sort((a, b) => a.t.length - b.t.length || ((i + a.idx) % k) - ((i + b.idx) % k))[0];
    pick.t.push(p);
  });

  if (mode === "BALANCED") {
    let best = cost(teams);
    for (let iter = 0; iter < 300; iter++) {
      let improved = false;
      for (let a = 0; a < k; a++)
        for (let b = a + 1; b < k; b++)
          for (let i = 0; i < teams[a].length; i++)
            for (let j = 0; j < teams[b].length; j++) {
              const pa = teams[a][i];
              const pb = teams[b][j];
              if ((pa.position === "GOALKEEPER") !== (pb.position === "GOALKEEPER")) continue;
              teams[a][i] = pb;
              teams[b][j] = pa;
              const c = cost(teams);
              if (c < best - 1e-9) {
                best = c;
                improved = true;
              } else {
                teams[a][i] = pa;
                teams[b][j] = pb;
              }
            }
      if (!improved) break;
    }
  }
  return teams;
}

export function teamStrength(team: { strength: number }[]) {
  return team.reduce((s, p) => s + p.strength, 0);
}
