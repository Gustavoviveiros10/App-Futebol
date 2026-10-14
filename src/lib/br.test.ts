import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanCep, cleanPhone } from "./br";

test("cleanCep", () => {
  assert.equal(cleanCep("01310-100"), "01310100");
  assert.equal(cleanCep("1310-100"), null);
  assert.equal(cleanCep("00000-000"), null);
});

test("cleanPhone", () => {
  assert.equal(cleanPhone("(11) 98765-4321"), "11987654321");
  assert.equal(cleanPhone("+55 11 98765-4321"), "11987654321");
  assert.equal(cleanPhone("11 3333-4444"), "1133334444");
  assert.equal(cleanPhone("98765-4321"), null);
  assert.equal(cleanPhone("(01) 98765-4321"), null);
});
