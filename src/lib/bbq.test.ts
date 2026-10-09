import { test } from "node:test";
import assert from "node:assert/strict";
import { splitBbq } from "./bbq";

const P = (id: string, drinks = true, attending = true) => ({ id, name: id, attending, drinks, paid: false });

test("divide igual entre quem foi e fecha a conta", () => {
  const r = splitBbq([P("a"), P("b"), P("c")], [{ id: "1", amountCents: 9000, payerId: "a", drinksOnly: false }]);
  assert.equal(r.total, 9000);
  assert.deepEqual(r.transfers, [
    { from: "b", to: "a", cents: 3000 },
    { from: "c", to: "a", cents: 3000 },
  ]);
});

test("bebida só entre quem bebe; quem não foi não paga", () => {
  const r = splitBbq(
    [P("a"), P("b", false), P("c"), P("d", true, false)],
    [
      { id: "1", amountCents: 6000, payerId: "a", drinksOnly: false },
      { id: "2", amountCents: 1000, payerId: "c", drinksOnly: true },
    ],
  );
  const by = Object.fromEntries(r.balance.map((b) => [b.id, b]));
  assert.equal(by.b.share, 2000);
  assert.equal(by.a.share, 2500);
  assert.equal(by.c.share, 2500);
  assert.equal(by.d.share, 0);
  const sum = r.balance.reduce((s, b) => s + b.net, 0);
  assert.equal(sum, 0);
  for (const t of r.transfers) assert.ok(t.cents > 0);
});

test("centavos que sobram não somem", () => {
  const r = splitBbq([P("a"), P("b"), P("c")], [{ id: "1", amountCents: 1000, payerId: "a", drinksOnly: false }]);
  assert.equal(r.balance.reduce((s, b) => s + b.share, 0), 1000);
});
