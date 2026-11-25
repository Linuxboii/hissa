import { test } from 'node:test';
import assert from 'node:assert/strict';
import { balances, settle, splitCents, encode, decode } from './lib.js';

test('splitCents distributes remainders fairly and sums exactly', () => {
  assert.deepEqual(splitCents(1000, 3), [334, 333, 333]);
  assert.equal(splitCents(1, 4).reduce((a, b) => a + b), 1);
});

test('balances net to zero', () => {
  const b = balances(['Asha', 'Ben', 'Chen'], [
    { payer: 'Asha', amount: 90, among: ['Asha', 'Ben', 'Chen'] },
    { payer: 'Ben', amount: 30, among: ['Ben', 'Chen'] },
  ]);
  assert.equal(b.Asha, 6000);
  assert.equal(b.Ben, -1500);
  assert.equal(b.Chen, -4500);
  assert.equal(Object.values(b).reduce((a, c) => a + c, 0), 0);
});

test('settle produces transfers that clear every balance', () => {
  const b = { A: 5000, B: -2000, C: -3000, D: 0 };
  const t = settle(b);
  const after = { ...b };
  for (const x of t) { after[x.from] += x.cents; after[x.to] -= x.cents; }
  assert.ok(Object.values(after).every((v) => v === 0));
  assert.equal(t.length, 2);
});

test('settle uses at most n-1 transfers', () => {
  const b = { A: 1234, B: -500, C: -400, D: -334, E: 0, F: 0 };
  const t = settle(b);
  assert.ok(t.length <= 3);
});

test('state survives the link round-trip, including unicode names', () => {
  const s = { title: 'Goa trip', currency: 'INR', people: ['Asha', 'Zoë'], expenses: [{ payer: 'Zoë', amount: 1250.5, among: ['Asha', 'Zoë'], what: 'Dinner' }] };
  assert.deepEqual(decode(encode(s)), s);
});

test('decode rejects garbage', () => {
  assert.equal(decode('%%%'), null);
});
