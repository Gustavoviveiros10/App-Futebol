import { test } from "node:test";
import assert from "node:assert/strict";
import { trialNotice, trialState } from "./trial";

const DAY = 86400_000;
const now = new Date("2026-10-12T12:00:00Z");
const at = (days: number) => new Date(now.getTime() + days * DAY);
const sub = (o: Record<string, unknown> = {}) => ({
  status: "TRIALING" as const,
  currentPeriodEnd: at(10),
  externalId: "sub_1",
  lastPaymentId: null,
  trialReminderAt: null,
  trialEndedAt: null,
  ...o,
});

test("lembra 3 dias antes da primeira cobrança, uma vez só", () => {
  // acesso até +10, cobrança em +7: cedo demais
  assert.equal(trialNotice(sub(), now), null);
  // acesso até +6, cobrança em +3
  assert.equal(trialNotice(sub({ currentPeriodEnd: at(6) }), now), "reminder");
  assert.deepEqual(trialState(sub({ currentPeriodEnd: at(6) }), now), { kind: "ending", end: at(3), days: 3, card: true });
  assert.equal(trialNotice(sub({ currentPeriodEnd: at(6), trialReminderAt: now }), now), null);
});

test("sem cartão (teste cancelado) não recebe lembrete de cobrança", () => {
  assert.equal(trialNotice(sub({ externalId: null, currentPeriodEnd: at(2) }), now), null);
  assert.deepEqual(trialState(sub({ externalId: null, currentPeriodEnd: at(2) }), now), { kind: "ending", end: at(2), days: 2, card: false });
});

test("avisa que o teste acabou, uma vez e só nos primeiros dias", () => {
  assert.equal(trialNotice(sub({ currentPeriodEnd: at(-1) }), now), "ended");
  assert.equal(trialNotice(sub({ currentPeriodEnd: at(-1), trialEndedAt: now }), now), null);
  assert.equal(trialNotice(sub({ currentPeriodEnd: at(-30) }), now), null);
  assert.deepEqual(trialState(sub({ currentPeriodEnd: at(-30) }), now), { kind: "ended" });
});

test("quem pagou não recebe aviso de teste", () => {
  const paid = sub({ status: "ACTIVE", lastPaymentId: "pay_1", currentPeriodEnd: at(1) });
  assert.equal(trialNotice(paid, now), null);
  assert.equal(trialState(paid, now), null);
});
