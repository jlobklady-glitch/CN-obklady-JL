// Zbylo navíc: příjmy a výdaje zakázek, rozdělení mezi Lukáše a Honzu.
import { h, kc, fmtDate } from './util.js';
import { S, loadRecords } from './store.js';
import { recordsList } from './records.js';
import { stockCalc } from './sklad.js';

const n = (v) => Number(v) || 0;
const got = (r, who) => { const d = r.data; const k = who === 'l' ? 'send_l' : 'send_h'; const e = who === 'l' ? 'exp_l' : 'exp_h';
  if (d[k] !== undefined && d[k] !== '') return n(d[k]); return d.sent === 'ANO' ? n(d[e]) : 0; };

export async function zbyloView(root) {
  root.replaceChildren(h('p', { class: 'muted' }, 'Načítám…'));
  await Promise.all([loadRecords('stock_in'), loadRecords('stock_out')]);
  const sum = h('div');
  const drawSum = () => {
    const L = S.rec.ledger || [];
    const income = L.reduce((t, r) => t + n(r.data.income), 0);
    const eL = L.reduce((t, r) => t + n(r.data.exp_l), 0), eH = L.reduce((t, r) => t + n(r.data.exp_h), 0);
    const gL = L.reduce((t, r) => t + got(r, 'l'), 0), gH = L.reduce((t, r) => t + got(r, 'h'), 0);
    const zbylo = income - eL - eH;
    const tile = (l, v, strong) => h('div', { class: 'card', style: { margin: 0 } }, h('div', { class: 'muted' }, l), h('div', { style: { fontSize: '18px', fontWeight: strong ? 800 : 600, marginTop: '4px' } }, kc(v)));
    const months = {};
    L.forEach((r) => { const m = (r.rec_date || '').slice(0, 7); const x = months[m] || (months[m] = { i: 0, e: 0 }); x.i += n(r.data.income); x.e += n(r.data.exp_l) + n(r.data.exp_h); });
    sum.replaceChildren(
      h('div', { class: 'grid tiles', style: { marginBottom: '14px' } }, tile('Příjem celkem', income), tile('Výdaje Lukáš', eL), tile('Výdaje Honza', eH), tile('Výdaje celkem', eL + eH),
        tile('ZBYLO NAVÍC', zbylo, true), tile('Odesláno Lukášovi a Honzovi', gL + gH), tile('Zůstatek na účtu', income - gL - gH), tile('Vyrovnání (Lukáš − Honza)', eL - eH),
        tile('Čeká na proplacení – Lukáš', eL - gL), tile('Čeká na proplacení – Honza', eH - gH)),
      h('details', { class: 'card' }, h('summary', null, 'Přehled po měsících'), h('div', { class: 'tablewrap', style: { marginTop: '8px' } }, h('table', { class: 't' },
        h('thead', null, h('tr', null, ['Měsíc', 'Příjem', 'Výdaje', 'Zbylo'].map((t, i) => h('th', { class: i ? 'r' : '' }, t)))),
        h('tbody', null, Object.keys(months).sort().reverse().map((m) => h('tr', null, h('td', null, m.slice(5) + '/' + m.slice(0, 4)), h('td', { class: 'r' }, kc(months[m].i)), h('td', { class: 'r' }, kc(months[m].e)), h('td', { class: 'r' }, kc(months[m].i - months[m].e)))))))));
  };
  const list = recordsList({ kind: 'ledger', addLabel: '+ Nový řádek', onChange: drawSum,
    rowInfo: (r) => { const z = n(r.data.income) - n(r.data.exp_l) - n(r.data.exp_h); return `Zbylo z řádku: ${kc(z)}`; },
    fields: [{ k: '_date', label: 'Datum', type: 'date' }, { k: 'desc', label: 'Zakázka / popis', type: 'text', wide: true }, { k: 'income', label: 'Příjem z realizace', type: 'num' },
      { k: 'exp_l', label: 'Výdaje – Lukáš', type: 'num' }, { k: 'exp_h', label: 'Výdaje – Honza', type: 'num' }, { k: 'note', label: 'Poznámka', type: 'text', wide: true },
      { k: 'sent', label: 'Zasláno', type: 'bool' }, { k: 'send_l', label: 'Lukášovi poslat (Kč, nepovinné)', type: 'num' }, { k: 'send_h', label: 'Honzovi poslat (Kč, nepovinné)', type: 'num' }] });
  const mat = stockCalc().byPayer;
  const matInfo = Object.entries(mat).filter(([, b]) => b.owed).map(([k, b]) => `${k}: ${kc(b.owed)}`).join(' · ');
  root.replaceChildren(h('div', { class: 'pagehead' }, h('h1', null, 'Zbylo navíc')), sum,
    matInfo ? h('p', { class: 'muted' }, 'Materiál ze skladu k vyplacení – ' + matInfo) : null, list.el);
  drawSum();
  await list.ready;
  drawSum();
}
