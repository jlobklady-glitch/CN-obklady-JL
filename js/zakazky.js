// Přehled zakázek: naplánované, probíhající a hotové (včetně zakázek mimo web a nabídky).
import { h, kc, num, fmtDate, toast, askText } from './util.js';
import { S, listQuotes, loadRecords, saveQuote, newBezCN, quoteTotal } from './store.js';
import { settlementTotals } from './doc.js';

const STATES = [['Potvrzena', 'Naplánováno'], ['V realizaci', 'Probíhá'], ['Dokončena', 'Hotovo']];
const key = (s) => String(s || '').trim().toLowerCase();
const n = (v) => Number(v) || 0;

export async function zakazkyView(root) {
  root.replaceChildren(h('p', { class: 'muted' }, 'Načítám…'));
  const [quotes] = await Promise.all([listQuotes(), loadRecords('hours')]);
  let showDone = false, q = '';
  const hoursOf = (r) => (S.rec.hours || []).filter((x) => key(x.data.quote) === key(r.number)).reduce((t, x) => t + n(x.data.hours), 0);
  const source = (r) => (r.settlement && r.settlement.bez ? 'Mimo evidenci' : r.inquiry_id ? 'Web' : 'Nabídka');
  const body = h('div');
  const draw = () => {
    const all = quotes.filter((r) => STATES.some(([k]) => k === r.status) && (!q || (r.number + ' ' + (r.customer_name || '') + ' ' + (r.project || '')).toLowerCase().includes(q.toLowerCase())));
    const blocks = STATES.filter(([k]) => showDone || k !== 'Dokončena').map(([k, label]) => {
      const rows = all.filter((r) => r.status === k).sort((a, b) => String(a.job_from || '9999').localeCompare(String(b.job_from || '9999')) || String(a.number).localeCompare(String(b.number)));
      const tr = (r) => {
        const st = h('select', { onchange: async (e) => { const old = r.status; r.status = e.target.value; try { await saveQuote(r); draw(); } catch (er) { r.status = old; toast(er.message, 'err'); draw(); } } },
          STATES.map(([v, l]) => h('option', { value: v, selected: v === r.status }, l)));
        const dt = h('input', { type: 'date', value: r.job_from || '', onchange: async (e) => { const old = r.job_from; r.job_from = e.target.value || null; try { await saveQuote(r); } catch (er) { r.job_from = old; e.target.value = old || ''; toast(er.message, 'err'); } } });
        const open = () => { location.hash = (r.settlement && r.settlement.bez ? '#/vyuctovani/' : '#/nabidka/') + r.id; };
        const rev = r.settlement && r.settlement.items && r.settlement.items.length ? settlementTotals(r).actual : quoteTotal(r.items || []);
        return h('tr', null, h('td', { class: 'click', onclick: open }, h('b', null, r.number)), h('td', { class: 'click', onclick: open }, r.customer_name || '—'), h('td', null, r.project || ''),
          h('td', null, dt), h('td', null, h('span', { class: 'badge' }, source(r))), h('td', { class: 'r' }, num(hoursOf(r))), h('td', { class: 'r' }, rev ? kc(rev) : '—'), h('td', null, st));
      };
      return h('div', { class: 'card' }, h('h2', null, `${label} (${rows.length})`),
        rows.length ? h('div', { class: 'tablewrap' }, h('table', { class: 't' }, h('thead', null, h('tr', null, ['Zakázka', 'Zákazník', 'Stavba', 'Termín zahájení', 'Zdroj', 'Hodin', 'Částka', 'Stav'].map((t, i) => h('th', { class: i >= 5 && i <= 6 ? 'r' : '' }, t)))), h('tbody', null, rows.map(tr))))
          : h('p', { class: 'muted' }, 'Nic.'));
    });
    body.replaceChildren(...blocks);
  };
  root.replaceChildren(
    h('div', { class: 'pagehead' }, h('h1', null, 'Zakázky'),
      h('button', { class: 'btn gold', onclick: async () => {
        try {
          const code = await askText('Označení nové zakázky mimo evidenci (stejné pak píšete do kalendáře), např. Konzum 2026-1. Prázdné = automatické číslo.', 'Konzum 2026-1');
          if (code === null) return;
          const r = await newBezCN(code); location.hash = '#/vyuctovani/' + r.id;
        } catch (e) { toast(e.message, 'err'); }
      } }, '+ Zakázka mimo evidenci')),
    h('p', { class: 'muted' }, 'Sem se dostane každá potvrzená nabídka a každá zakázka mimo web. Stav a termín zahájení měníte přímo v tabulce. Hodiny se berou z Hodin a nákladů a z kalendáře.'),
    h('div', { class: 'row', style: { gap: '10px', margin: '8px 0', flexWrap: 'wrap', alignItems: 'center' } },
      h('input', { type: 'text', class: 'search', placeholder: 'Hledat…', oninput: (e) => { q = e.target.value; draw(); } }),
      h('label', { class: 'row', style: { gap: '6px', alignItems: 'center' } }, h('input', { type: 'checkbox', style: { width: 'auto' }, onchange: (e) => { showDone = e.target.checked; draw(); } }), 'Zobrazit i hotové')),
    body);
  draw();
}
