// Ziskovost zakázek: tržba − materiál − práce − ostatní náklady (počítá se samo z dat v aplikaci).
import { h, kc, num } from './util.js';
import { S, loadRecords, listQuotes, quoteTotal } from './store.js';
import { avgUnitPrices } from './sklad.js';
import { settlementTotals } from './doc.js';

const n = (v) => Number(v) || 0;
const key = (s) => String(s || '').trim().toLowerCase();

export async function ziskView(root) {
  root.replaceChildren(h('p', { class: 'muted' }, 'Načítám…'));
  const [quotes] = await Promise.all([listQuotes(), loadRecords('hours'), loadRecords('cost'), loadRecords('stock_in'), loadRecords('stock_out')]);
  const rate = (r) => (r.data.rate !== undefined && r.data.rate !== '' ? n(r.data.rate) : n((S.firma.rates || {})[r.data.worker]));
  const avg = avgUnitPrices();
  const rows = quotes.filter((q) => q.status !== 'Zamítnuta').map((q) => {
    const k = key(q.number);
    const revenue = q.settlement && q.settlement.items ? settlementTotals(q).actual : quoteTotal(q.items || []);
    const material = (S.rec.stock_out || []).filter((r) => key(r.data.quote) === k).reduce((t, r) => t + n(r.data.qty) * (avg[r.data.product] || 0), 0);
    const hrs = (S.rec.hours || []).filter((r) => key(r.data.quote) === k);
    const work = hrs.reduce((t, r) => t + n(r.data.hours) * rate(r), 0);
    const hours = hrs.reduce((t, r) => t + n(r.data.hours), 0);
    const other = (S.rec.cost || []).filter((r) => key(r.data.quote) === k).reduce((t, r) => t + n(r.data.amount), 0);
    const costs = material + work + other;
    return { q, revenue, material, work, other, costs, profit: revenue - costs, hours };
  });
  const T = (f) => rows.reduce((t, r) => t + r[f], 0);
  const pct = (a, b) => (b > 0 ? String(Math.round((a / b) * 1000) / 10).replace('.', ',') + ' %' : '—');
  const perHour = (r) => (r.hours > 0 ? kc(r.profit / r.hours) : '—');
  const cols = ['Zakázka', 'Zákazník', 'Stav', 'Tržba', 'Materiál', 'Práce', 'Ostatní', 'Náklady', 'ZISK', 'Marže', 'Hodin', 'Zisk / hod'];
  const tr = (cells, bold) => h('tr', { style: bold ? { fontWeight: 800 } : null }, cells.map((c, i) => h('td', { class: i >= 3 ? 'r' : '' }, c)));
  root.replaceChildren(
    h('div', { class: 'pagehead' }, h('h1', null, 'Ziskovost zakázek')),
    h('p', { class: 'muted' }, 'Počítá se samo: tržba (vyúčtování, jinak nabídka) − materiál (spotřeba ze skladu) − práce (hodiny × sazba) − ostatní náklady. Zakázky se k záznamům přiřazují podle čísla nabídky zadaného ve Skladu, Hodinách a Nákladech. Zamítnuté nabídky se nezapočítávají.'),
    h('div', { class: 'tablewrap' }, h('table', { class: 't' },
      h('thead', null, h('tr', null, cols.map((c, i) => h('th', { class: i >= 3 ? 'r' : '' }, c)))),
      h('tbody', null,
        tr(['CELKEM', '', '', kc(T('revenue')), kc(T('material')), kc(T('work')), kc(T('other')), kc(T('costs')), kc(T('profit')), pct(T('profit'), T('revenue')), num(T('hours')), T('hours') > 0 ? kc(T('profit') / T('hours')) : '—'], true),
        rows.length ? rows.map((r) => tr([h('b', null, r.q.number), r.q.customer_name || '—', r.q.status, kc(r.revenue), kc(r.material), kc(r.work), kc(r.other), kc(r.costs),
          h('b', { style: { color: r.profit < 0 ? 'var(--bad)' : 'inherit' } }, kc(r.profit)), pct(r.profit, r.revenue), num(r.hours), perHour(r)])) : h('tr', null, h('td', { colspan: 12, class: 'muted' }, 'Zatím žádné zakázky.'))))));
}
