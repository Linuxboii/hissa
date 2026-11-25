import { balances, settle, encode, decode } from './lib.js';
import { $, copy, toast } from './ui.js';

const KEY = 'hissa-group';
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'AED', 'JPY', 'THB', 'IDR', 'LKR', 'NPR', 'MYR', 'PHP', 'ZAR', 'BRL', 'MXN', 'NGN', 'KES'];
const empty = () => ({ title: '', currency: guessCurrency(), people: [], expenses: [] });
function guessCurrency() {
  const r = (navigator.language || '').split('-')[1];
  return { IN: 'INR', US: 'USD', GB: 'GBP', AU: 'AUD', CA: 'CAD', SG: 'SGD', AE: 'AED', JP: 'JPY', TH: 'THB', ID: 'IDR', LK: 'LKR', NP: 'NPR', MY: 'MYR', PH: 'PHP', ZA: 'ZAR', BR: 'BRL', MX: 'MXN', NG: 'NGN', KE: 'KES' }[r] || 'USD';
}

let state = (location.hash.length > 1 && decode(location.hash.slice(1))) || load() || empty();
function load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } }

const money = (cents) => new Intl.NumberFormat(state.currency === 'INR' ? 'en-IN' : undefined, { style: 'currency', currency: state.currency || 'USD' }).format(cents / 100);
function el(tag, props = {}, ...kids) {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...kids);
  return e;
}
let transfers = [];

const cur = $('#currency');
for (const c of CURRENCIES) cur.append(new Option(c, c));

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode */ }
  history.replaceState(null, '', state.people.length ? '#' + encode(state) : location.pathname);
}

function render() {
  save();
  $('#title').value = state.title;
  cur.value = state.currency;

  $('#people').replaceChildren(...state.people.map((p) => {
    const used = state.expenses.some((e) => e.payer === p || e.among.includes(p));
    const rm = el('button', { type: 'button', textContent: 'Remove', disabled: used, title: used ? 'Delete their expenses first' : '' });
    rm.setAttribute('aria-label', `Remove ${p}`);
    rm.onclick = () => { state.people = state.people.filter((x) => x !== p); render(); };
    return el('span', { className: 'chip' }, p, rm);
  }));

  const payer = $('#payer');
  const keep = payer.value;
  payer.replaceChildren(...state.people.map((p) => new Option(p, p)));
  if (state.people.includes(keep)) payer.value = keep;
  const checked = new Set([...document.querySelectorAll('#among input:checked')].map((i) => i.value));
  const fresh = !document.querySelector('#among input');
  $('#among').replaceChildren(...state.people.map((p) => {
    const box = el('input', { type: 'checkbox', value: p, checked: fresh || checked.has(p) || !document.querySelector(`#among input[value="${CSS.escape(p)}"]`) });
    return el('label', {}, box, p);
  }));

  const list = $('#list');
  if (!state.expenses.length) list.replaceChildren(el('p', { className: 'empty', textContent: state.people.length < 2 ? 'Add at least two people, then your first expense.' : 'No expenses yet.' }));
  else list.replaceChildren(...state.expenses.map((e, i) => {
    const del = el('button', { type: 'button', className: 'ghost', textContent: 'Delete' });
    del.onclick = () => { state.expenses.splice(i, 1); render(); };
    const who = e.among.length === state.people.length ? 'everyone' : e.among.join(', ');
    return el('div', { className: 'exp' },
      el('div', {}, el('b', { textContent: e.what || 'Expense' }), el('br'), el('span', { className: 'muted small', textContent: `${e.payer} paid, split with ${who}` })),
      el('b', { textContent: money(Math.round(e.amount * 100)) }),
      del);
  }));

  const bal = balances(state.people, state.expenses);
  $('#balances').replaceChildren(...(state.people.length ? state.people.map((p) => {
    const v = bal[p];
    return el('div', { className: 'row', style: 'justify-content:space-between;padding:4px 0' },
      el('span', { textContent: p }),
      el('b', { className: v > 0 ? 'pos' : v < 0 ? 'neg' : 'muted', textContent: v > 0 ? `gets back ${money(v)}` : v < 0 ? `owes ${money(-v)}` : 'settled' }));
  }) : [el('p', { className: 'empty', textContent: 'Nobody here yet.' })]));

  const t = settle(bal);
  const total = state.expenses.reduce((a, e) => a + Math.round(e.amount * 100), 0);
  $('#settle').replaceChildren(...(t.length
    ? t.map((x) => el('div', { className: 'xfer' }, `${x.from} pays ${x.to} `, el('b', { textContent: money(x.cents) })))
    : [el('p', { className: 'empty', textContent: state.expenses.length ? 'Everyone is square.' : 'Payments to settle will show up here.' })]));
  if (total) $('#settle').append(el('p', { className: 'muted small', textContent: `Total spent ${money(total)} across ${state.expenses.length} expense${state.expenses.length > 1 ? 's' : ''}.` }));
  transfers = t;
}

function addPerson() {
  const name = $('#person').value.trim().replace(/\s+/g, ' ').slice(0, 40);
  if (!name) return;
  if (state.people.some((p) => p.toLowerCase() === name.toLowerCase())) { toast(`${name} is already in the group`); return; }
  state.people.push(name);
  $('#person').value = '';
  render();
  $('#person').focus();
}

$('#addPerson').onclick = addPerson;
$('#person').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addPerson(); } });
$('#title').addEventListener('input', (e) => { state.title = e.target.value.slice(0, 60); save(); });
cur.addEventListener('change', () => { state.currency = cur.value; render(); });

$('#expForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const err = $('#err');
  const amount = Math.round(parseFloat($('#amount').value) * 100) / 100;
  const among = [...document.querySelectorAll('#among input:checked')].map((i) => i.value);
  if (state.people.length < 2) { err.textContent = 'Add at least two people first.'; return; }
  if (!(amount > 0)) { err.textContent = 'Enter an amount above zero.'; return; }
  if (!among.length) { err.textContent = 'Pick at least one person to split with.'; return; }
  err.textContent = '';
  state.expenses.push({ payer: $('#payer').value, amount, among, what: $('#what').value.trim().slice(0, 60) });
  $('#what').value = '';
  $('#amount').value = '';
  render();
  toast('Expense added');
});

$('#share').onclick = () => { save(); copy(location.href, 'Link copied. Anyone with it sees this group.'); };
$('#copySummary').onclick = () => {
  const lines = [`${state.title || 'Our group'}: who pays whom`];
  for (const x of transfers) lines.push(`${x.from} pays ${x.to} ${money(x.cents)}`);
  if (lines.length === 1) lines.push('Everyone is square.');
  save();
  lines.push('', `Details: ${location.href}`);
  copy(lines.join('\n'), 'Summary copied');
};
$('#reset').onclick = () => {
  if (state.expenses.length && !window.confirm('Start a new group? The current one stays only in links you already shared.')) return;
  state = empty();
  render();
};
render();
