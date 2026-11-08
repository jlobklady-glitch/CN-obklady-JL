// Přehled všech faktur: filtry, stažení PDF, hromadná záloha (ZIP) a export přehledu do CSV.
import { h, kc, fmtDate, isoToday, toast } from './util.js';
import { S, listInvoices, profileList } from './store.js';
import { invoiceDoc } from './doc.js';
import { htmlToPdf, pdfName } from './pdf.js';
import { makeZip } from './zip.js';

const download = (blob, name) => {
  const a = h('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
};
const num = (v) => Number(v) || 0;
const profLabel = (k) => (profileList().find((p) => p.key === k) || {}).label || k || '';

export async function invoicesView(root) {
  root.replaceChildren(h('p', { class: 'muted' }, 'Načítám…'));
  const all = await listInvoices();
  const st = { profile: '', year: '', state: '', q: '' };
  const today = isoToday();
  const overdue = (i) => !i.paid && i.due_on && i.due_on < today;
  const years = [...new Set(all.map((i) => String(i.issued_on || '').slice(0, 4)).filter(Boolean))].sort().reverse();
  const filtered = () => all.filter((i) => (!st.profile || i.profile === st.profile) && (!st.year || String(i.issued_on || '').startsWith(st.year))
    && (!st.state || (st.state === 'paid' ? i.paid : st.state === 'unpaid' ? !i.paid : overdue(i)))
    && (!st.q || (i.number + ' ' + (i.customer_name || '') + ' ' + (i.description || '')).toLowerCase().includes(st.q.toLowerCase())));

  const listBox = h('div'); const sumBox = h('p', { class: 'muted' });
  const one = async (i, btn) => {
    if (btn) btn.disabled = true;
    try { toast('Vytvářím PDF…'); download(await htmlToPdf(invoiceDoc(i)), pdfName('Faktura ' + i.number, i.customer_name)); }
    catch (e) { toast('PDF se nepodařilo vytvořit: ' + e.message, 'err'); } finally { if (btn) btn.disabled = false; }
  };
  const zipAll = async (btn) => {
    const list = filtered(); if (!list.length) return toast('Není co stáhnout.', 'err');
    btn.disabled = true; const txt = btn.textContent;
    try {
      const files = []; const used = new Set();
      for (let k = 0; k < list.length; k++) {
        btn.textContent = `PDF ${k + 1} / ${list.length}…`;
        const i = list[k];
        let name = pdfName('Faktura ' + i.number, i.customer_name); if (used.has(name)) name = name.replace(/\.pdf$/, ` (${k + 1}).pdf`); used.add(name);
        const folder = profLabel(i.profile).replace(/[\\/:*?"<>|]/g, '') || 'faktury';
        files.push({ name: folder + '/' + name, bytes: new Uint8Array(await (await htmlToPdf(invoiceDoc(i))).arrayBuffer()) });
      }
      download(makeZip(files), `Faktury ${st.year || 'vsechny'}${st.profile ? ' ' + profLabel(st.profile) : ''} ${today}.zip`);
      toast(`Staženo ${files.length} faktur v ZIP.`);
    } catch (e) { toast('Záloha se nepodařila: ' + e.message, 'err'); } finally { btn.disabled = false; btn.textContent = txt; }
  };
  const csv = () => {
    const list = filtered(); const q = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const rows = [['Číslo', 'Dodavatel', 'Vystaveno', 'Zdanitelné plnění', 'Splatnost', 'Odběratel', 'Popis', 'Částka', 'Zaplaceno', 'Zasláno'].map(q).join(';')]
      .concat(list.map((i) => [i.number, profLabel(i.profile), i.issued_on, i.taxable_on || i.issued_on, i.due_on, i.customer_name, String(i.description || '').split('\n')[0], String(num(i.amount)).replace('.', ','), i.paid ? 'ano' : 'ne', i.sent_at || ''].map(q).join(';')));
    download(new Blob(['﻿' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' }), `Prehled faktur ${today}.csv`);
  };
  const draw = () => {
    const list = filtered(); const total = list.reduce((t, i) => t + num(i.amount), 0), open = list.filter((i) => !i.paid).reduce((t, i) => t + num(i.amount), 0);
    sumBox.textContent = `${list.length} faktur, celkem ${kc(total)}, z toho neuhrazeno ${kc(open)}.`;
    listBox.replaceChildren(list.length ? h('div', { class: 'tablewrap' }, h('table', { class: 't' },
      h('thead', null, h('tr', null, ['Číslo', 'Dodavatel', 'Vystaveno', 'Splatnost', 'Odběratel', 'Částka', 'Stav', ''].map((x, i) => h('th', { class: i === 5 ? 'r' : '' }, x)))),
      h('tbody', null, list.map((i) => h('tr', null,
        h('td', { class: 'click', onclick: () => { location.hash = '#/faktura/' + i.id; } }, h('b', null, i.number)), h('td', null, profLabel(i.profile)), h('td', null, fmtDate(i.issued_on)), h('td', null, fmtDate(i.due_on)),
        h('td', { class: 'click', onclick: () => { location.hash = '#/faktura/' + i.id; } }, i.customer_name || '—'), h('td', { class: 'r' }, kc(num(i.amount))),
        h('td', null, h('span', { class: 'badge ' + (i.paid ? 'ok' : 'gold'), style: overdue(i) ? { background: '#b00020', color: '#fff' } : {} }, i.paid ? 'Zaplaceno' : overdue(i) ? 'Po splatnosti' : 'Nezaplaceno'), i.sent_at ? h('span', { class: 'badge', style: { marginLeft: '4px' } }, 'Zasláno ' + fmtDate(i.sent_at)) : null),
        h('td', null, h('button', { class: 'btn small ghost', onclick: (e) => one(i, e.target) }, 'PDF'))))))) : h('p', { class: 'muted' }, 'Žádné faktury.'));
  };
  const sel = (key, opts) => h('select', { onchange: (e) => { st[key] = e.target.value; draw(); } }, opts.map(([v, l]) => h('option', { value: v }, l)));
  root.replaceChildren(
    h('div', { class: 'pagehead' }, h('h1', null, 'Faktury')),
    h('div', { class: 'card' },
      h('div', { class: 'row', style: { gap: '10px', flexWrap: 'wrap', alignItems: 'center' } },
        h('input', { type: 'text', class: 'search', placeholder: 'Hledat číslo, odběratele…', oninput: (e) => { st.q = e.target.value; draw(); } }),
        sel('profile', [['', 'Všichni dodavatelé'], ...profileList().map((p) => [p.key, p.label])]),
        sel('year', [['', 'Všechny roky'], ...years.map((y) => [y, y])]),
        sel('state', [['', 'Všechny stavy'], ['unpaid', 'Nezaplacené'], ['overdue', 'Po splatnosti'], ['paid', 'Zaplacené']])),
      h('div', { class: 'row', style: { gap: '8px', marginTop: '10px', flexWrap: 'wrap' } },
        h('button', { class: 'btn gold', onclick: (e) => zipAll(e.target) }, 'Stáhnout PDF (ZIP) – podle filtru'),
        h('button', { class: 'btn ghost', onclick: csv }, 'Přehled do CSV (Excel)')),
      sumBox),
    h('div', { class: 'card' }, listBox));
  draw();
}
