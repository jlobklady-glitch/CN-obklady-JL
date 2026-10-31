// Sklad materiálu MAPEI: příjem, spotřeba, stav a vyrovnání podle toho, kdo platil.
import { h, kc, num, money, isoToday } from './util.js';
import { S, loadRecords, priceFor, displayName } from './store.js';
import { recordsList } from './records.js';

export const PAYERS = () => (S.firma.workers && S.firma.workers.length ? S.firma.workers : ['Lukáš', 'Honza', 'Firma (JL-OBKLADY)']);
const n = (v) => Number(v) || 0;

// Metoda FIFO: spotřeba se odečítá od nejstarších nákupů daného produktu.
export function stockCalc() {
  const ins = (S.rec.stock_in || []).slice().sort((a, b) => (a.rec_date + a.created_at).localeCompare(b.rec_date + b.created_at));
  const outs = S.rec.stock_out || [];
  const used = {};
  outs.forEach((o) => { if (o.data.product) used[o.data.product] = (used[o.data.product] || 0) + n(o.data.qty); });
  const remain = { ...used };
  const rows = [];
  let missing = 0;
  for (const r of ins) {
    const p = S.prices.find((x) => x.id === r.data.product);
    if (!p) { if (r.data.product || r.data.packs) missing++; continue; }
    const pack = n(p.pack) || 1, packs = n(r.data.packs);
    const delivered = n(r.data.delivered) || packs * pack;
    const pricePack = n(r.data.price_pack) || priceFor(p, 1);
    const value = packs * pricePack;
    const take = Math.min(delivered, Math.max(0, remain[p.id] || 0));
    remain[p.id] = (remain[p.id] || 0) - take;
    const consumedVal = delivered ? take * value / delivered : 0;
    rows.push({ rec: r, p, delivered, value, consumed: take, consumedVal, restVal: value - consumedVal, owed: consumedVal - n(r.data.reimbursed), payer: r.data.payer || '' });
  }
  const products = {};
  for (const r of rows) {
    const x = products[r.p.id] || (products[r.p.id] = { p: r.p, bought: 0, used: used[r.p.id] || 0, value: 0 });
    x.bought += r.delivered; x.value += r.restVal;
  }
  for (const id in used) if (!products[id]) { const p = S.prices.find((x) => x.id === id); if (p) products[id] = { p, bought: 0, used: used[id], value: 0 }; }
  const byPayer = {};
  PAYERS().forEach((k) => { byPayer[k] = { paid: 0, consumed: 0, rest: 0, reimbursed: 0, owed: 0 }; });
  for (const r of rows) {
    const b = byPayer[r.payer] || (byPayer[r.payer] = { paid: 0, consumed: 0, rest: 0, reimbursed: 0, owed: 0 });
    b.paid += r.value; b.consumed += r.consumedVal; b.rest += r.restVal; b.reimbursed += n(r.rec.data.reimbursed); b.owed += r.owed;
  }
  return { rows, products: Object.values(products), byPayer, missing };
}

export async function skladView(root) {
  root.replaceChildren(h('p', { class: 'muted' }, 'Načítám…'));
  await Promise.all([loadRecords('stock_in'), loadRecords('stock_out')]);
  let tab = 'stav';
  const sum = h('div');
  const body = h('div');
  const drawSum = () => {
    const c = stockCalc();
    const prods = c.products.sort((a, b) => displayName(a.p).localeCompare(displayName(b.p), 'cs'));
    sum.replaceChildren(
      c.missing ? h('div', { class: 'banner' }, `${c.missing} příjmů nemá produkt (smazán z ceníku nebo nevybrán) – do skladu a vyrovnání se nezapočítají.`) : null,
      h('div', { class: 'card' }, h('h2', null, 'Platby materiálu podle pracovníků'),
        h('div', { class: 'tablewrap' }, h('table', { class: 't' },
          h('thead', null, h('tr', null, ['Kdo platil', 'Zaplatil celkem', 'Spotřebováno', 'Zbývá ve skladu', 'Již proplaceno', 'K vyplacení'].map((t, i) => h('th', { class: i ? 'r' : '' }, t)))),
          h('tbody', null, Object.entries(c.byPayer).map(([k, b]) => h('tr', null, h('td', null, h('b', null, k)), h('td', { class: 'r' }, kc(b.paid)), h('td', { class: 'r' }, kc(b.consumed)),
            h('td', { class: 'r' }, kc(b.rest)), h('td', { class: 'r' }, kc(b.reimbursed)), h('td', { class: 'r' }, h('b', null, kc(b.owed))))))))),
      h('div', { class: 'card' }, h('h2', null, 'Stav skladu podle produktů'),
        h('div', { class: 'tablewrap' }, h('table', { class: 't' },
          h('thead', null, h('tr', null, ['Produkt', 'MJ', 'Nakoupeno', 'Spotřebováno', 'Skladem', 'Balení', 'Hodnota', 'Stav'].map((t, i) => h('th', { class: i > 1 && i < 7 ? 'r' : '' }, t)))),
          h('tbody', null, prods.length ? prods.map(({ p, bought, used, value }) => { const left = bought - used; return h('tr', null,
            h('td', null, displayName(p)), h('td', null, p.unit), h('td', { class: 'r' }, num(bought)), h('td', { class: 'r' }, num(used)), h('td', { class: 'r' }, num(left)),
            h('td', { class: 'r' }, num(left / (Number(p.pack) || 1))), h('td', { class: 'r' }, kc(value)),
            h('td', null, h('span', { class: 'badge ' + (left < 0 ? 'bad' : left === 0 ? '' : 'ok') }, left < 0 ? 'CHYBÍ' : left === 0 ? 'Vyčerpáno' : 'Skladem'))); })
            : h('tr', null, h('td', { colspan: 8, class: 'muted' }, 'Sklad je prázdný – přidejte příjem.')))))));
  };
  const info = (r) => {
    const p = S.prices.find((x) => x.id === r.data.product);
    if (!p) return '';
    if (r.kind === 'stock_in') { const packs = n(r.data.packs); return `Obsah balení ${num(p.pack)} ${p.unit} · celkem ${num(n(r.data.delivered) || packs * p.pack)} ${p.unit} · hodnota ${kc(packs * (n(r.data.price_pack) || priceFor(p, 1)))}`; }
    return `${p.unit}`;
  };
  const inList = recordsList({ kind: 'stock_in', title: 'Příjem', addLabel: '+ Nový příjem', onChange: drawSum, rowInfo: info, defaults: () => ({}),
    fields: [{ k: '_date', label: 'Datum', type: 'date' }, { k: 'quote', label: 'Zakázka (č. CN)', type: 'text' }, { k: 'product', label: 'Produkt MAPEI', type: 'product', wide: true },
      { k: 'packs', label: 'Počet balení', type: 'num' }, { k: 'delivered', label: 'Skutečně dodáno (MJ)', type: 'num' }, { k: 'price_pack', label: 'Skutečná cena / balení', type: 'num' },
      { k: 'payer', label: 'Kdo zaplatil', type: 'select', options: PAYERS }, { k: 'reimbursed', label: 'Již proplaceno (Kč)', type: 'num' }] });
  const outList = recordsList({ kind: 'stock_out', title: 'Spotřeba', addLabel: '+ Nová spotřeba', onChange: drawSum, rowInfo: info,
    fields: [{ k: '_date', label: 'Datum', type: 'date' }, { k: 'quote', label: 'Zakázka (č. CN)', type: 'text' }, { k: 'product', label: 'Produkt MAPEI', type: 'product', wide: true },
      { k: 'qty', label: 'Spotřebováno (MJ)', type: 'num' }, { k: 'note', label: 'Poznámka', type: 'text' }] });
  const tabs = h('div', { class: 'tabsrow' });
  const show = () => {
    tabs.replaceChildren(...[['stav', 'Stav skladu'], ['in', 'Příjem'], ['out', 'Spotřeba']].map(([k, l]) => h('button', { class: 'btn small ' + (tab === k ? '' : 'ghost'), onclick: () => { tab = k; show(); } }, l)));
    body.replaceChildren(tab === 'in' ? inList.el : tab === 'out' ? outList.el : sum);
    if (tab === 'stav') drawSum();
  };
  root.replaceChildren(h('div', { class: 'pagehead' }, h('h1', null, 'Sklad zásob')), h('p', { class: 'muted' }, 'Spotřeba se odečítá od nejstarších nákupů produktu (FIFO). „K vyplacení“ = hodnota spotřebovaného materiálu − už proplaceno.'), tabs, body);
  show();
  await Promise.all([inList.ready, outList.ready]);
  drawSum();
}
