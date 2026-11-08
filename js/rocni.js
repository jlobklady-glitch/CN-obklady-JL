// Roční přehled příjmů a výdajů (podklad pro účetní / daňové přiznání – orientační, počítá se z dat v aplikaci).
import { h, kc, isoToday } from './util.js';
import { S, listInvoices, loadRecords, profileList, priceFor } from './store.js';

const n = (v) => Number(v) || 0;
const MONTHS = ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'];

export async function rocniView(root) {
  root.replaceChildren(h('p', { class: 'muted' }, 'Načítám…'));
  const [inv] = await Promise.all([listInvoices(), loadRecords('hours'), loadRecords('cost'), loadRecords('stock_in')]);
  const rate = (r) => (r.data.rate !== undefined && r.data.rate !== '' ? n(r.data.rate) : n((S.firma.rates || {})[r.data.worker]));
  const stockVal = (r) => { const p = S.prices.find((x) => x.id === r.data.product); if (!p) return 0; return n(r.data.packs) * (n(r.data.price_pack) || priceFor(p, 1)); };
  const years = [...new Set([...inv.map((i) => i.issued_on), ...(S.rec.hours || []).map((r) => r.rec_date), ...(S.rec.cost || []).map((r) => r.rec_date), ...(S.rec.stock_in || []).map((r) => r.rec_date), isoToday()].map((d) => String(d || '').slice(0, 4)).filter(Boolean))].sort().reverse();
  let year = years[0], prof = '';
  const body = h('div');
  const compute = () => {
    const ym = (d) => (String(d || '').startsWith(year) ? Number(String(d).slice(5, 7)) - 1 : -1);
    const M = MONTHS.map(() => ({ issued: 0, paid: 0, material: 0, other: 0, work: 0 }));
    for (const i of inv) { if (prof && i.profile !== prof) continue; const m = ym(i.issued_on); if (m >= 0) { M[m].issued += n(i.amount); if (i.paid) M[m].paid += n(i.amount); } }
    for (const r of S.rec.stock_in || []) { const m = ym(r.rec_date); if (m >= 0) M[m].material += stockVal(r); }
    for (const r of S.rec.cost || []) { const m = ym(r.rec_date); if (m >= 0) M[m].other += n(r.data.amount); }
    for (const r of S.rec.hours || []) { const m = ym(r.rec_date); if (m >= 0) M[m].work += n(r.data.hours) * rate(r); }
    return M;
  };
  const draw = () => {
    const M = compute(); const sum = (f) => M.reduce((t, x) => t + x[f], 0);
    const costOf = (x) => x.material + x.other + x.work;
    const row = (cells, bold) => h('tr', { style: bold ? { fontWeight: 800 } : null }, cells.map((c, i) => h('td', { class: i ? 'r' : '' }, c)));
    const cost = sum('material') + sum('other') + sum('work');
    body.replaceChildren(
      h('div', { class: 'card' }, h('div', { class: 'grid c3' },
        h('div', null, h('div', { class: 'muted' }, 'Příjmy – vystavené faktury'), h('h2', null, kc(sum('issued'))), h('div', { class: 'muted' }, 'z toho zaplaceno ' + kc(sum('paid')))),
        h('div', null, h('div', { class: 'muted' }, 'Výdaje celkem'), h('h2', null, kc(cost)), h('div', { class: 'muted' }, `materiál ${kc(sum('material'))}, práce ${kc(sum('work'))}, ostatní ${kc(sum('other'))}`)),
        h('div', null, h('div', { class: 'muted' }, 'Hrubý zisk (vystaveno − výdaje)'), h('h2', { style: { color: sum('issued') - cost < 0 ? 'var(--bad)' : 'inherit' } }, kc(sum('issued') - cost)), h('div', { class: 'muted' }, 'podle zaplacených: ' + kc(sum('paid') - cost))))),
      h('div', { class: 'card' }, h('div', { class: 'tablewrap' }, h('table', { class: 't' },
        h('thead', null, h('tr', null, ['Měsíc', 'Vystaveno', 'Zaplaceno', 'Materiál', 'Práce', 'Ostatní', 'Výdaje', 'Zisk'].map((x, i) => h('th', { class: i ? 'r' : '' }, x)))),
        h('tbody', null, row(['CELÝ ROK ' + year, kc(sum('issued')), kc(sum('paid')), kc(sum('material')), kc(sum('work')), kc(sum('other')), kc(cost), kc(sum('issued') - cost)], true),
          M.map((x, i) => row([MONTHS[i], kc(x.issued), kc(x.paid), kc(x.material), kc(x.work), kc(x.other), kc(costOf(x)), kc(x.issued - costOf(x))])))))),
      h('p', { class: 'muted' }, 'Orientační podklad z dat v aplikaci: příjmy podle data vystavení faktur, materiál podle nákupů ve Skladu (příjem), práce = hodiny × sazba (mzdy pracovníků), ostatní = Ostatní náklady. Do daňového přiznání ho vždy zkontrolujte s účetní. Výdaje se nedělí podle dodavatele (Lukáš / Honza), filtr se týká jen příjmů.'));
  };
  const csv = () => {
    const M = compute(); const q = (v) => '"' + String(v).replace(/"/g, '""') + '"'; const c = (v) => String(Math.round(v * 100) / 100).replace('.', ',');
    const rows = [['Měsíc', 'Vystaveno', 'Zaplaceno', 'Materiál', 'Práce', 'Ostatní', 'Výdaje', 'Zisk'].map(q).join(';')].concat(M.map((x, i) => [MONTHS[i] + ' ' + year, c(x.issued), c(x.paid), c(x.material), c(x.work), c(x.other), c(x.material + x.work + x.other), c(x.issued - x.material - x.work - x.other)].map(q).join(';')));
    const a = h('a', { href: URL.createObjectURL(new Blob(['﻿' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' })), download: `Rocni prehled ${year}.csv` }); document.body.append(a); a.click(); setTimeout(() => a.remove(), 1000);
  };
  root.replaceChildren(
    h('div', { class: 'pagehead' }, h('h1', null, 'Roční přehled')),
    h('div', { class: 'row', style: { gap: '10px', flexWrap: 'wrap', margin: '8px 0' } },
      h('select', { onchange: (e) => { year = e.target.value; draw(); } }, years.map((y) => h('option', { value: y }, y))),
      h('select', { onchange: (e) => { prof = e.target.value; draw(); } }, h('option', { value: '' }, 'Příjmy: všichni dodavatelé'), profileList().map((p) => h('option', { value: p.key }, 'Příjmy: ' + p.label))),
      h('button', { class: 'btn ghost', onclick: csv }, 'Export CSV')),
    body);
  draw();
}
