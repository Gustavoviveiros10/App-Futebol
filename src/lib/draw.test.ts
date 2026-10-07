import { test } from "node:test";
import assert from "node:assert/strict";
import { drawTeams, teamStrength, type DrawPlayer } from "./draw";

const positions = ["DEFENDER", "MIDFIELDER", "FORWARD", "FULLBACK"] as const;
function makePlayers(n: number, gks = 2): DrawPlayer[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    position: i < gks ? "GOALKEEPER" : positions[i % positions.length],
    strength: 1 + ((i * 7) % 10),
  }));
}

test("todos os jogadores entram exatamente uma vez e tamanhos ficam iguais", () => {
  for (const mode of ["BALANCED", "RANDOM"] as const) {
    const players = makePlayers(17, 3);
    const teams = drawTeams(players, 3, mode);
    const ids = teams.flat().map((p) => p.id).sort();
    assert.deepEqual(ids, players.map((p) => p.id).sort());
    const sizes = teams.map((t) => t.length);
    assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1);
  }
});

test("cada time recebe um goleiro quando há goleiros suficientes", () => {
  const teams = drawTeams(makePlayers(10, 2), 2, "BALANCED");
  for (const t of teams) assert.equal(t.filter((p) => p.position === "GOALKEEPER").length, 1);
});

test("sorteio equilibrado deixa a diferença de força pequena", () => {
  const players = makePlayers(20, 2);
  const teams = drawTeams(players, 2, "BALANCED");
  const [a, b] = teams.map(teamStrength);
  assert.ok(Math.abs(a - b) <= 2, `diferença ${Math.abs(a - b)}`);
});
