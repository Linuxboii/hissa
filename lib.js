// Shared-expense math in integer cents. Pure functions.

/** Split total cents into n parts that differ by at most one cent. */
export function splitCents(total, n) {
  const base = Math.floor(total / n);
  let extra = total - base * n;
  return Array.from({ length: n }, () => base + (extra-- > 0 ? 1 : 0));
}

/** Net balance per person in cents. Positive means they are owed money. */
export function balances(people, expenses) {
  const b = Object.fromEntries(people.map((p) => [p, 0]));
  for (const e of expenses) {
    const among = (e.among || []).filter((p) => p in b);
    if (!(e.payer in b) || !among.length) continue;
    const cents = Math.round(e.amount * 100);
    b[e.payer] += cents;
    splitCents(cents, among.length).forEach((share, i) => { b[among[i]] -= share; });
  }
  return b;
}

/** Greedy settle-up: biggest debtor pays biggest creditor. At most n-1 transfers. */
export function settle(bal) {
  const cred = [], debt = [];
  for (const [p, v] of Object.entries(bal)) {
    if (v > 0) cred.push([p, v]);
    else if (v < 0) debt.push([p, -v]);
  }
  const out = [];
  const byAmount = (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]);
  while (cred.length && debt.length) {
    cred.sort(byAmount);
    debt.sort(byAmount);
    const c = cred[0], d = debt[0];
    const x = Math.min(c[1], d[1]);
    out.push({ from: d[0], to: c[0], cents: x });
    c[1] -= x; d[1] -= x;
    if (!c[1]) cred.shift();
    if (!d[1]) debt.shift();
  }
  return out;
}

const toB64 = (s) => {
  let bin = '';
  for (const b of new TextEncoder().encode(s)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64 = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)));

/** Compact state for the share link: people referenced by index. */
export function encode(s) {
  const idx = new Map(s.people.map((p, i) => [p, i]));
  const compact = [1, s.title || '', s.currency || '', s.people, s.expenses.map((e) => [idx.get(e.payer), e.amount, e.among.map((p) => idx.get(p)), e.what || ''])];
  return toB64(JSON.stringify(compact));
}

export function decode(str) {
  try {
    const [v, title, currency, people, ex] = JSON.parse(fromB64(str));
    if (v !== 1 || !Array.isArray(people) || !Array.isArray(ex)) return null;
    const expenses = ex.map(([p, amount, among, what]) => ({ payer: people[p], amount: +amount, among: among.map((i) => people[i]).filter(Boolean), what: String(what || '') }))
      .filter((e) => e.payer && e.amount > 0);
    return { title: String(title), currency: String(currency), people: people.map(String), expenses };
  } catch {
    return null;
  }
}
