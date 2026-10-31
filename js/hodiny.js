// Hodiny, ostatní náklady a vyrovnání s pracovníky.
import { h, kc, num } from './util.js';
import { S, loadRecords } from './store.js';
import { recordsList } from './records.js';
import { PAYERS, stockCalc } from './sklad.js';

const n = (v) => Number(v) || 0;
const rateOf = (name) => n((S.firma.rates || {})[name]);

export async function hodinyView(root) {
  root.replaceChildren(h('p', { class: 'muted' }, 'Načítám…'));
  await Promise.all([loadRecords('hours'), loadRecords('cost'), loadRecords('stock_in'), loadRecords('stock_out')]);
  let tab = 'vyr';
  const body = h('div');
  const sum = h('div');
  const rowRate = (r) => (r.data.rate !== undefined && r.data.rate !== '' ? n(r.data.rate) : rateOf(r.data.worker));
  const drawSum = () => {
    const stock = stockCalc().byPayer;
    const names = [...new Set([...PAYERS(), ...(S.rec.hours || []).map((r) => r.data.worker), ...(S.rec.cost || []).map((r) => r.data.payer), ...Object.keys(stock)].filter(Boolean))];
    const rows = names.map((w) => {
      const hrs = (S.rec.hours || []).filter((r) => r.data.worker === w);
      const h_ = hrs.reduce((t, r) => t + n(r.data.hours), 0);
      const mzda = hrs.reduce((t, r) => t + n(r.data.hours) * rowRate(r), 0);
      const vyp = hrs.reduce((t, r) => t + n(r.data.paid), 0);
      const co = (S.rec.cost || []).filter((r) => r.data.payer === w);
      const vlast = co.reduce((t, r) => t + n(r.data.amount), 0);
      const prop = co.reduce((t, r) => t + n(r.data.reimbursed), 0);
      const mat = stock[w] ? stock[w].owed : 0;
      return { w, h_, mzda, vyp, vlast, prop, mat, total: mzda - vyp + vlast - prop + mat };
    });
    const T = (k) => rows.reduce((t, r) => t + r[k], 0);
    const cols = [['Pracovník', null], ['Hodin', 'h_'], ['Mzda', 'mzda'], ['Vyplaceno', 'vyp'], ['Zaplatil z vlastního', 'vlast'], ['Proplaceno', 'prop'], ['Materiál ze skladu', 'mat'], ['K vyplacení', 'total']];
    sum.replaceChildren(h('div', { class: 'card' }, h('h2', null, 'Vyrovnání s pracovníky'),
      h('div', { class: 'tablewrap' }, h('table', { class: 't' },
        h('thead', null, h('tr', null, cols.map(([t], i) => h('th', { class: i ? 'r' : '' }, t)))),
        h('tbody', null, rows.map((r) => h('tr', null, h('td', null, h('b', null, r.w)), cols.slice(1).map(([, k]) => h('td', { class: 'r' }, k === 'h_' ? num(r[k]) : k === 'total' ? h('b', null, kc(r[k])) : kc(r[k]))))),
          h('tr', null, h('td', null, h('b', null, 'CELKEM')), cols.slice(1).map(([, k]) => h('td', { class: 'r' }, h('b', null, k === 'h_' ? num(T(k)) : kc(T(k)))))))),
      ), h('p', { class: 'muted' }, 'K vyplacení = mzda − vyplaceno + zaplatil z vlastního − proplaceno + materiál ze skladu. Sazby za hodinu nastavíte v Nastavení.')));
  };
  const hInfo = (r) => `Náklad práce: ${kc(n(r.data.hours) * rowRate(r))} (sazba ${num(rowRate(r))} Kč/hod)`;
  const hours = recordsList({ kind: 'hours', addLabel: '+ Nové hodiny', onChange: drawSum, rowInfo: hInfo,
    fields: [{ k: '_date', label: 'Datum', type: 'date' }, { k: 'quote', label: 'Zakázka (č. CN)', type: 'text' }, { k: 'worker', label: 'Pracovník', type: 'select', options: PAYERS },
      { k: 'hours', label: 'Hodin', type: 'num' }, { k: 'rate', label: 'Sazba (jen když se liší)', type: 'num' }, { k: 'paid', label: 'Vyplaceno (Kč)', type: 'num' }] });
  const costs = recordsList({ kind: 'cost', addLabel: '+ Nový náklad', onChange: drawSum,
    fields: [{ k: '_date', label: 'Datum', type: 'date' }, { k: 'quote', label: 'Zakázka (č. CN) – nebo prázdné', type: 'text' }, { k: 'desc', label: 'Popis (oběd, doprava, nářadí…)', type: 'text', wide: true },
      { k: 'payer', label: 'Kdo platil', type: 'select', options: PAYERS }, { k: 'amount', label: 'Částka (Kč)', type: 'num' }, { k: 'reimbursed', label: 'Proplaceno (Kč)', type: 'num' }] });
  const tabs = h('div', { class: 'tabsrow' });
  const show = () => {
    tabs.replaceChildren(...[['vyr', 'Vyrovnání'], ['h', 'Hodiny'], ['c', 'Ostatní náklady']].map(([k, l]) => h('button', { class: 'btn small ' + (tab === k ? '' : 'ghost'), onclick: () => { tab = k; show(); } }, l)));
    body.replaceChildren(tab === 'h' ? hours.el : tab === 'c' ? costs.el : sum);
    if (tab === 'vyr') drawSum();
  };
  root.replaceChildren(h('div', { class: 'pagehead' }, h('h1', null, 'Hodiny a náklady')), tabs, body);
  show();
  await Promise.all([hours.ready, costs.ready]);
  drawSum();
}
