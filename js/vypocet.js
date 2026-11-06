// Interní přehled výpočtu návrhu nabídky: co zákazník zadal a jak se co počítalo (spotřeby, balení, ceny).
// Zákazník ho nevidí, slouží ke kontrole před odesláním nabídky.
import { h, kc } from './util.js';
import { draftFromRooms } from './odhad.js';

const f2 = (x) => String(Math.round((Number(x) || 0) * 100) / 100).replace('.', ',');
const TH = { textAlign: 'left', padding: '4px 6px', borderBottom: '1px solid #999', fontSize: '12px', whiteSpace: 'nowrap' };
const TD = { padding: '4px 6px', borderBottom: '1px solid #ddd', fontSize: '12px', verticalAlign: 'top' };

function csvEscape(v) { return '"' + String(v ?? '').replace(/"/g, '""') + '"'; }

export function calcRows(rooms) {
  const { sections, items, notes, missing } = draftFromRooms(rooms);
  const total = (typ) => items.filter((r) => (typ === 'prace' ? r.typ === 'prace' : r.typ !== 'prace')).reduce((a, r) => a + (Number(r.qty) || 0) * (Number(r.price) || 0), 0);
  return { sections, items, notes, missing, work: total('prace'), mat: total('mat') };
}

export function openCalcView(r) {
  const c = calcRows(r.rooms);
  const close = () => overlay.remove();
  const body = [];
  c.sections.forEach((sec) => {
    const rows = sec.lines.map((l) => {
      const row = l.row; const tot = row ? (Number(row.qty) || 0) * (Number(row.price) || 0) : 0;
      return h('tr', null,
        h('td', { style: TD }, l.group), h('td', { style: TD }, l.kind === 'work' ? 'práce' : 'materiál'),
        h('td', { style: { ...TD, minWidth: '170px' } }, (l.est ? '⚠ ' : '') + l.name),
        h('td', { style: { ...TD, textAlign: 'right', whiteSpace: 'nowrap' } }, `${f2(l.need)} ${l.needUnit || ''}`),
        h('td', { style: { ...TD, minWidth: '220px' } }, l.miss || l.note),
        h('td', { style: TD }, row ? `${f2(row.qty)} ${row.unit || ''}${l.packs ? ' (' + l.packs + ')' : ''}` : 'nenačteno'),
        h('td', { style: { ...TD, textAlign: 'right' } }, row ? f2(row.price) : ''),
        h('td', { style: { ...TD, textAlign: 'right', fontWeight: '700' } }, row ? kc(tot) : ''));
    });
    body.push(h('h3', { style: { margin: '14px 0 2px' } }, sec.title), h('p', { class: 'muted', style: { margin: '0 0 6px', fontSize: '13px' } }, 'Zadání: ' + sec.inputs),
      h('div', { style: { overflowX: 'auto' } }, h('table', { style: { borderCollapse: 'collapse', width: '100%' } },
        h('thead', null, h('tr', null, ...['Skupina', 'Druh', 'Položka', 'Potřeba', 'Jak se počítalo', 'Do nabídky', 'Cena / jedn.', 'Celkem'].map((t) => h('th', { style: TH }, t)))),
        h('tbody', null, ...rows))));
  });
  const csv = () => {
    const out = [['Část', 'Skupina', 'Druh', 'Položka', 'Potřeba', 'Jednotka potřeby', 'Jak se počítalo', 'Do nabídky množství', 'Jednotka', 'Balení', 'Cena za jednotku', 'Celkem'].map(csvEscape).join(';')];
    c.sections.forEach((sec) => sec.lines.forEach((l) => {
      const row = l.row;
      out.push([sec.title, l.group, l.kind === 'work' ? 'práce' : 'materiál', l.name, f2(l.need), l.needUnit || '', l.miss || l.note, row ? f2(row.qty) : '', row ? row.unit : '', l.packs, row ? f2(row.price) : '', row ? f2((Number(row.qty) || 0) * (Number(row.price) || 0)) : ''].map(csvEscape).join(';'));
    }));
    const a = h('a', { href: URL.createObjectURL(new Blob(['﻿' + out.join('\r\n')], { type: 'text/csv;charset=utf-8' })), download: 'vypocet-' + String(r.name || 'poptavka').replace(/[^\w-]+/g, '_') + '.csv' });
    document.body.append(a); a.click(); a.remove();
  };
  const overlay = h('div', { class: 'overlay', 'data-backdrop-close': '1', style: { alignItems: 'flex-start', overflowY: 'auto' } },
    h('div', { class: 'dialog', style: { maxWidth: '1100px', width: '96%', margin: '12px auto' } },
      h('h2', { style: { marginTop: 0 } }, 'Výpočet návrhu (interně)'),
      h('p', { class: 'muted' }, `${r.name}. ⚠ = odhad, který nevychází přímo z technického listu. Materiál je naceněn ceníkovou cenou. Cena obkladu a dlažby v součtu není.`),
      ...body,
      h('div', { style: { margin: '14px 0 6px', fontWeight: '700' } }, `Práce ${kc(c.work)} · Materiál ${kc(c.mat)} · Celkem ${kc(c.work + c.mat)}`),
      c.notes.length ? h('div', { class: 'muted', style: { fontSize: '13px' } }, 'Ke kontrole: ' + c.notes.join('; ')) : null,
      h('div', { class: 'row end', style: { marginTop: '12px' } }, h('button', { class: 'btn ghost', onclick: csv }, 'Stáhnout tabulku (CSV)'), h('button', { class: 'btn', onclick: close }, 'Zavřít'))));
  document.body.append(overlay);
}
