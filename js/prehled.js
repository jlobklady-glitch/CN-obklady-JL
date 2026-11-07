// Přehled: souhrn zakázek, nezaplacené faktury, rychlé přepnutí stavů.
import { h, kc, fmtDate, toast, isoToday } from './util.js';
import { STAV, listQuotes, listInvoices, saveQuote, quoteTotal, profileList } from './store.js';
import { settlementTotals, settlementStatus } from './doc.js';
import { countNewInquiries } from './poptavky.js';

export async function prehledView(root) {
  root.replaceChildren(h('p', { class: 'muted' }, 'Načítám…'));
  const [quotes, invoices, newInq] = await Promise.all([listQuotes(), listInvoices(), countNewInquiries().catch(() => null)]);
  const amount = (q) => (q.settlement && q.settlement.items ? settlementTotals(q).actual : quoteTotal(q.items || []));
  const by = (s) => quotes.filter((q) => q.status === s);
  const sum = (a) => a.reduce((t, q) => t + amount(q), 0);
  const unpaid = invoices.filter((i) => !i.paid);
  const today = isoToday();
  const overdue = unpaid.filter((i) => i.due_on && i.due_on < today);
  const unpaidSum = unpaid.reduce((t, i) => t + Number(i.amount), 0);
  // vyúčtování: zaslaná, schválená, fakturovaná
  const setts = quotes.filter((q) => q.settlement && q.settlement.items).map((q) => ({ q, st: settlementStatus(q, invoices), due: settlementTotals(q).due }));
  const sByKey = (k) => setts.filter((x) => x.st.key === k);
  const sSum = (a) => a.reduce((t, x) => t + x.due, 0);
  const invoiced = invoices.filter((i) => i.quote_id);
  const year = String(new Date().getFullYear());
  const profInv = profileList().map((p) => {
    const mine = invoices.filter((i) => i.profile === p.key && String(i.issued_on || '').startsWith(year));
    const tot = mine.reduce((t, i) => t + Number(i.amount || 0), 0), open = mine.filter((i) => !i.paid).reduce((t, i) => t + Number(i.amount || 0), 0);
    return { ...p, n: mine.length, tot, open };
  });
  const tile = (label, value, sub, href) => h('a', { href, class: 'card', style: { textDecoration: 'none', color: 'inherit', margin: 0 } },
    h('div', { class: 'muted' }, label), h('div', { style: { fontSize: '22px', fontWeight: 800, margin: '4px 0' } }, value), h('div', { class: 'muted' }, sub));
  const active = quotes.filter((q) => ['Potvrzena', 'V realizaci'].includes(q.status));
  const row = (q) => h('tr', null,
    h('td', { class: 'click', onclick: () => { location.hash = (q.settlement && q.settlement.bez ? '#/vyuctovani/' : '#/nabidka/') + q.id; }, style: { cursor: 'pointer' } }, h('b', null, q.number)),
    h('td', null, q.customer_name || '—'), h('td', null, q.project),
    h('td', null, h('select', { onchange: async (e) => { q.status = e.target.value; try { await saveQuote(q); toast('Stav uložen'); prehledView(root); } catch (er) { toast(er.conflict ? 'Zakázku mezitím upravil někdo jiný – načítám novou verzi.' : er.message, 'err'); if (er.conflict) prehledView(root); } } },
      STAV.map((s) => h('option', { selected: s === q.status }, s)))),
    h('td', { class: 'r' }, kc(amount(q))));
  const table = (rows) => h('div', { class: 'tablewrap' }, h('table', { class: 't' },
    h('thead', null, h('tr', null, ['Číslo', 'Odběratel', 'Stavba', 'Stav', 'Částka'].map((t, i) => h('th', { class: i === 4 ? 'r' : '' }, t)))),
    h('tbody', null, rows.length ? rows.map(row) : h('tr', null, h('td', { colspan: 5, class: 'muted' }, 'Nic k zobrazení.')))));
  root.replaceChildren(
    h('div', { class: 'pagehead' }, h('h1', null, 'Přehled')),
    h('div', { class: 'grid tiles', style: { marginBottom: '14px' } },
      newInq === null ? null : tile('Nové poptávky z webu', String(newInq), newInq ? 'čekají na vyřízení' : 'nic nového', '#/poptavky'),
      tile('Čeká na odpověď', String(by('Nabídka zaslána').length), kc(sum(by('Nabídka zaslána'))), '#/nabidky'),
      tile('Potvrzené / v realizaci', String(active.length), kc(sum(active)), '#/nabidky'),
      tile('Nezaplacené faktury', String(unpaid.length), kc(unpaidSum) + (overdue.length ? ` · po splatnosti: ${overdue.length}` : ''), '#/nabidky'),
      tile('Rozpracované', String(by('Rozpracovaná').length), kc(sum(by('Rozpracovaná'))), '#/nabidky')),
    h('h2', null, 'Vyúčtování a fakturace'),
    h('div', { class: 'grid tiles', style: { marginBottom: '14px' } },
      tile('Vyúčtování zaslaná', String(sByKey('zaslano').length), kc(sSum(sByKey('zaslano'))) + ' · čeká na schválení', '#/vyuctovani'),
      tile('Schválená, k fakturaci', String(sByKey('schvaleno').length), kc(sSum(sByKey('schvaleno'))) + ' · čeká na fakturu', '#/vyuctovani'),
      tile('Následně fakturováno', String(sByKey('fakturovano').length), kc(invoiced.reduce((t, i) => t + Number(i.amount || 0), 0)) + ' · faktury k vyúčtování', '#/vyuctovani'),
      ...profInv.map((p) => tile('Faktury ' + p.label + ' (' + year + ')', kc(p.tot), `${p.n} ${p.n === 1 ? 'faktura' : p.n >= 2 && p.n <= 4 ? 'faktury' : 'faktur'}` + (p.open ? ` · nezaplaceno ${kc(p.open)}` : ' · vše zaplaceno'), '#/vyuctovani')),
      tile('Faktury celkem (' + year + ')', kc(profInv.reduce((t, p) => t + p.tot, 0)), 'součet Lukáš + Honza', '#/vyuctovani')),
    h('h2', null, 'Probíhající zakázky'), table(active),
    h('h2', { style: { marginTop: '16px' } }, 'Nabídky čekající na odpověď'), table(by('Nabídka zaslána')),
    unpaid.length ? h('div', null, h('h2', { style: { marginTop: '16px' } }, 'Nezaplacené faktury'),
      h('div', { class: 'tablewrap' }, h('table', { class: 't' }, h('tbody', null, unpaid.map((i) => h('tr', { style: { cursor: 'pointer' }, onclick: () => { location.hash = '#/faktura/' + i.id; } },
        h('td', null, h('b', null, i.number)), h('td', null, i.customer_name), h('td', null, 'splatnost ' + fmtDate(i.due_on) + ' ', i.due_on && i.due_on < today ? h('span', { class: 'badge bad' }, 'po splatnosti') : null), h('td', { class: 'r' }, kc(i.amount)))))))) : null);
}
