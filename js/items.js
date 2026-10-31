// Editor položek (sdílený nabídkou i vyúčtováním).
import { h, kc, matcher, parseNum } from './util.js';
import { S, TYPES, typeLabel, typeKey, priceFor, displayName, displayUnit, lineTotal, quoteTotal } from './store.js';

export function suggestBox(input, onPick, filter = () => true) {
  const wrap = h('div', { class: 'suggest-wrap' });
  let box = null, sel = -1, list = [];
  const close = () => { box?.remove(); box = null; sel = -1; };
  const show = () => {
    const m = matcher(input.value);
    if (input.value.trim().length < 2) return close();
    list = S.prices.filter((p) => p.active && filter(p) && m(`${p.code} ${p.name}`)).slice(0, 40);
    close();
    if (!list.length) return;
    box = h('div', { class: 'suggest' }, list.map((p, i) => h('div', { onmousedown: (e) => { e.preventDefault(); pick(i); } },
      displayName(p), h('small', null, `${kc(priceFor(p, 1))} / ${displayUnit(p)} · ${typeLabel(p.category)}`))));
    wrap.append(box);
  };
  const pick = (i) => { const p = list[i]; close(); onPick(p); };
  input.addEventListener('input', show);
  input.addEventListener('blur', () => setTimeout(close, 150));
  input.addEventListener('keydown', (e) => {
    if (!box) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length;
      [...box.children].forEach((c, i) => c.classList.toggle('sel', i === sel));
    } else if (e.key === 'Enter' && sel >= 0) { e.preventDefault(); pick(sel); }
    else if (e.key === 'Escape') close();
  });
  wrap.prepend(input);
  return wrap;
}

// items: pole řádků (upravuje se přímo), onTouch: volá se po každé změně
export function itemsEditor(items, onTouch) {
  const box = h('div', { class: 'items' });
  const totalV = h('div', { class: 'v' });
  const recalc = () => { totalV.textContent = kc(quoteTotal(items)); };
  const draw = () => {
    box.replaceChildren(h('div', { class: 'item head' }, ['Typ', 'Položka', 'MJ', 'Množství', 'Cena / MJ', 'Sleva %', 'Celkem', ''].map((t) => h('div', null, t))));
    items.forEach((r, i) => box.append(row(r, i)));
    recalc();
  };
  const row = (r, i) => {
    const tot = h('div', { class: 'tot c-tot', 'data-l': 'Celkem' }, kc(lineTotal(r)));
    const upd = () => { tot.textContent = kc(lineTotal(r)); recalc(); onTouch(); };
    const grow = (ta) => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 2 + 'px'; };
    const nameIn = h('textarea', { rows: 1, class: 'nm', value: r.name, placeholder: 'Začněte psát název položky…', oninput: (e) => { grow(e.target); r.name = e.target.value; r.item_id = null; upd(); },
      onkeydown: (e) => { if (e.key === 'Enter') e.preventDefault(); } });
    requestAnimationFrame(() => grow(nameIn));
    const unitIn = h('input', { type: 'text', value: r.unit, oninput: (e) => { r.unit = e.target.value; onTouch(); } });
    const priceIn = h('input', { type: 'text', inputmode: 'decimal', class: 'num', value: r.price ?? '', oninput: (e) => { r.price = parseNum(e.target.value); upd(); } });
    const typSel = h('select', { onchange: (e) => { r.typ = typeKey(e.target.value); onTouch(); } }, TYPES.map((t) => h('option', { selected: t.key === r.typ }, t.label)));
    const qtyIn = h('input', { type: 'text', inputmode: 'decimal', class: 'num', value: r.qty ?? '', oninput: (e) => {
      r.qty = parseNum(e.target.value);
      const p = r.item_id && S.prices.find((x) => x.id === r.item_id);
      if (p && p.category === 'kabe') { r.price = priceFor(p, r.qty); priceIn.value = r.price; }
      upd(); } });
    const discIn = h('input', { type: 'text', inputmode: 'decimal', class: 'num', value: r.disc ? Math.round(r.disc * 1000) / 10 : '', oninput: (e) => { r.disc = Math.min(Math.max(parseNum(e.target.value), 0), 100) / 100; upd(); } });
    const sug = suggestBox(nameIn, (p) => {
      r.item_id = p.id; r.name = displayName(p); r.unit = displayUnit(p); r.typ = p.category;
      r.qty = r.qty || 1; r.price = priceFor(p, r.qty);
      nameIn.value = r.name; grow(nameIn); unitIn.value = r.unit; priceIn.value = r.price; qtyIn.value = r.qty;
      [...typSel.options].forEach((o) => { o.selected = o.text === typeLabel(r.typ); });
      upd();
    });
    return h('div', { class: 'item' }, h('div', { class: 'c-typ' }, typSel), h('div', { class: 'c-name' }, sug), h('div', { class: 'c-mj', 'data-l': 'MJ' }, unitIn),
      h('div', { class: 'c-qty', 'data-l': 'Množství' }, qtyIn), h('div', { class: 'c-price', 'data-l': 'Cena / MJ' }, priceIn), h('div', { class: 'c-disc', 'data-l': 'Sleva %' }, discIn), tot,
      h('div', { class: 'c-del' }, h('button', { class: 'del', title: 'Smazat řádek', onclick: () => { items.splice(i, 1); draw(); onTouch(); } }, '×')));
  };
  const add = () => { items.push({ typ: 'prace', name: '', unit: '', qty: '', price: '', disc: 0 }); draw(); box.lastChild.querySelector('textarea')?.focus(); };
  draw();
  return { box, totalV, add, redraw: draw };
}
