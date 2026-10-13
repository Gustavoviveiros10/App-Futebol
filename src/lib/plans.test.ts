import { test } from "node:test";
import assert from "node:assert/strict";
import { PLANS, planPrice, upgradeCostCents, yearlyPerMonth } from "./plans";

const DAY = 86400_000;
const now = new Date("2026-10-12T12:00:00Z");
const at = (days: number) => new Date(now.getTime() + days * DAY);

test("anual dá pelo menos 2 meses grátis", () => {
  for (const p of ["PRO", "PREMIUM"] as const) assert.ok(PLANS[p].yearlyCents <= PLANS[p].priceCents * 10);
  assert.equal(planPrice("PRO", "YEARLY"), 24900);
  assert.equal(planPrice("PREMIUM"), 3999);
  assert.equal(yearlyPerMonth("PRO"), 2075);
});

test("upgrade no mensal cobra a diferença do mês", () => {
  assert.equal(upgradeCostCents("PRO", "PREMIUM", "MONTHLY", at(20), now), 1500);
  assert.equal(upgradeCostCents("PREMIUM", "PRO", "MONTHLY", at(20), now), 0);
});

test("upgrade no anual é proporcional aos dias que faltam", () => {
  // ano inteiro pela frente (+3 dias de folga): diferença cheia
  assert.equal(upgradeCostCents("PRO", "PREMIUM", "YEARLY", at(368), now), 15000);
  // meio ano
  assert.equal(upgradeCostCents("PRO", "PREMIUM", "YEARLY", at(185.5), now), Math.round((15000 * 183) / 365));
  // fim do ano: nunca abaixo do mínimo do Asaas
  assert.equal(upgradeCostCents("PRO", "PREMIUM", "YEARLY", at(4), now), 500);
});
