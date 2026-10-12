import { test } from "node:test";
import assert from "node:assert/strict";
import { readNext } from "../server/queue.js";

const now = Date.now();
const base = { read: 0, priority: 0, word_count: 2000, saved_at: now };

test("skips read articles", () => {
  const out = readNext([{ ...base, id: 1, read: 1 }, { ...base, id: 2 }], 10, now);
  assert.deepEqual(out.map((a) => a.id), [2]);
});

test("higher priority beats newer save", () => {
  const out = readNext([
    { ...base, id: 1, saved_at: now },
    { ...base, id: 2, priority: 2, saved_at: now - 20 * 864e5 },
  ], 10, now);
  assert.equal(out[0].id, 2);
});

test("short reads get a bonus", () => {
  const out = readNext([
    { ...base, id: 1, word_count: 5000 },
    { ...base, id: 2, word_count: 600 },
  ], 10, now);
  assert.equal(out[0].id, 2);
});
