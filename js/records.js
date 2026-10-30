// Obecný seznam záznamů s upravitelnými kartami (sklad, hodiny, náklady, zbylo navíc).
import { h, toast, confirmBox, parseNum, matcher } from './util.js';
import { S, loadRecords, addRecord, saveRecord, deleteRecord, displayName } from './store.js';
import { suggestBox } from './items.js';

// fields: [{k,label,type:'text'|'num'|'date'|'select'|'bool'|'product'|'area', options, wide}]
// Vrací { el, redraw }. onChange se volá po každé uložené změně (přepočet souhrnů).
export function recordsList({ kind, fields, defaults = () => ({}), onChange = () => {}, title, addLabel = '+ Přidat', rowInfo, newestFirst = true, search = true }) {
  const box = h('div', { class: 'prlist' });
  const wrap = h('div');
  let q = '';
  const save = async (r) => {
    try { await saveRecord(r); onChange(); } catch (e) { toast('Nepodařilo se uložit: ' + e.message, 'err'); }
  };
  const card = (r) => {
    const info = rowInfo ? h('div', { class: 'muted rowinfo' }) : null;
    const upd = () => { if (info) info.textContent = rowInfo(r) || ''; };
    const fieldEl = (f) => {
      const get = () => (f.k === '_date' ? r.rec_date : r.data[f.k]);
      const set = (v) => { if (f.k === '_date') r.rec_date = v; else r.data[f.k] = v; };
      let el;
      if (f.type === 'select') {
        el = h('select', { onchange: (e) => { set(e.target.value); upd(); save(r); } },
          h('option', { value: '' }, '—'), (typeof f.options === 'function' ? f.options() : f.options).map((o) => h('option', { selected: o === get() }, o)));
      } else if (f.type === 'bool') {
        el = h('select', { onchange: (e) => { set(e.target.value); save(r); } }, h('option', { value: '' }, 'Ne'), h('option', { value: 'ANO', selected: get() === 'ANO' }, 'ANO'));
      } else if (f.type === 'date') {
        el = h('input', { type: 'date', value: get() || '', onchange: (e) => { set(e.target.value); save(r); } });
      } else if (f.type === 'area') {
        el = h('textarea', { rows: 1, onchange: (e) => { set(e.target.value); save(r); } }, get() || '');
      } else if (f.type === 'product') {
        const inp = h('input', { type: 'text', placeholder: 'Začněte psát produkt…', value: (() => { const p = S.prices.find((x) => x.id === get()); return p ? displayName(p) : ''; })() });
        el = suggestBox(inp, (p) => { set(p.id); inp.value = displayName(p); upd(); save(r); }, (p) => p.category === 'mapei');
      } else {
        el = h('input', { type: 'text', inputmode: f.type === 'num' ? 'decimal' : 'text', value: get() ?? '', onchange: (e) => {
          set(f.type === 'num' ? (e.target.value === '' ? '' : parseNum(e.target.value)) : e.target.value); upd(); save(r); } });
      }
      return h('div', { class: 'pf ' + (f.wide ? 'wide' : '') }, h('label', { class: 'f' }, f.label), el);
    };
    const c = h('div', { class: 'rc' }, h('div', { class: 'rc-grid' }, fields.map(fieldEl)), info,
      h('button', { class: 'del', title: 'Smazat záznam', onclick: async () => { if (await confirmBox('Smazat záznam?')) { try { await deleteRecord(r); onChange(); draw(); } catch (e) { toast(e.message, 'err'); } } } }, '×'));
    upd();
    return c;
  };
  const draw = () => {
    const m = matcher(q);
    let rows = (S.rec[kind] || []).slice();
    if (newestFirst) rows.reverse();
    if (q) rows = rows.filter((r) => m(JSON.stringify(r.data) + r.rec_date));
    box.replaceChildren(...rows.slice(0, 80).map(card));
    if (rows.length > 80) box.append(h('p', { class: 'muted' }, `Zobrazeno prvních 80 z ${rows.length} záznamů, použijte hledání.`));
    if (!rows.length) box.append(h('p', { class: 'muted' }, 'Zatím žádné záznamy.'));
  };
  const add = async () => {
    try { await addRecord(kind, defaults()); onChange(); draw(); } catch (e) { toast(e.message, 'err'); }
  };
  wrap.append(h('div', { class: 'row between', style: { margin: '10px 0' } },
    search ? h('input', { type: 'text', class: 'search', placeholder: 'Hledat…', oninput: (e) => { q = e.target.value; draw(); } }) : h('span'),
    h('button', { class: 'btn gold', onclick: add }, addLabel)), box);
  const ready = loadRecords(kind).then(draw);
  return { el: wrap, ready, redraw: draw };
}
