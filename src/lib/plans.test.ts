import { test } from "node:test";
import assert from "node:assert/strict";
import { PLANS, planPrice, upgradeCostCents, yearlyPerMonth } from "./plans";

const DAY = 86400_000;
const now = new Date("2026-10-12T12:00:00Z");
const at = (days: number) => new Date(now.getTime() + days * DAY);

test("anual custa 10 mensalidades", () => {
  for (const p of ["PRO", "PREMIUM"] as const) assert.equal(PLANS[p].yearlyCents, PLANS[p].priceCents * 10);
  assert.equal(planPrice("PRO", "YEARLY"), 19900);
  assert.equal(planPrice("PREMIUM"), 2990);
  assert.equal(yearlyPerMonth("PRO"), 1658);
});

test("upgrade no mensal cobra a diferença do mês", () => {
  assert.equal(upgradeCostCents("PRO", "PREMIUM", "MONTHLY", at(20), now), 1000);
  assert.equal(upgradeCostCents("PREMIUM", "PRO", "MONTHLY", at(20), now), 0);
});

test("upgrade no anual é proporcional aos dias que faltam", () => {
  // ano inteiro pela frente (+3 dias de folga): diferença cheia
  assert.equal(upgradeCostCents("PRO", "PREMIUM", "YEARLY", at(368), now), 10000);
  // meio ano
  assert.equal(upgradeCostCents("PRO", "PREMIUM", "YEARLY", at(185.5), now), Math.round((10000 * 183) / 365));
  // fim do ano: nunca abaixo do mínimo do Asaas
  assert.equal(upgradeCostCents("PRO", "PREMIUM", "YEARLY", at(4), now), 500);
});
