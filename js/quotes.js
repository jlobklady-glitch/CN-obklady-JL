// Nabídky: seznam a editor.
import { h, kc, fmtDate, matcher, debounce, toast, confirmBox, parseNum, num, isoToday } from './util.js';
import { S, TYPES, STAV, PLATBA, typeLabel, typeKey, priceFor, displayName, displayUnit, lineTotal, quoteTotal,
  listQuotes, getQuote, newQuote, saveQuote, deleteQuote, duplicateQuote } from './store.js';
import { quoteDoc, printDoc } from './doc.js';

const stavCls = { 'Dokončena': 'ok', 'Zamítnuta': 'bad', 'Potvrzena': 'blue', 'V realizaci': 'blue', 'Nabídka zaslána': 'gold' };

export async function quotesList(root) {
  root.append(h('p', { class: 'muted' }, 'Načítám…'));
  let all = await listQuotes();
  let q = '', st = '';
  const body = h('div');
  const draw = () => {
    const m = matcher(q);
    const rows = all.filter((r) => (!st || r.status === st) && m(`${r.number} ${r.customer_name} ${r.project}`));
    body.replaceChildren(h('div', { class: 'tablewrap' }, h('table', { class: 't' },
      h('thead', null, h('tr', null, ['Číslo', 'Datum', 'Odběratel', 'Stavba', 'Stav', 'Platba', 'Celkem'].map((t, i) => h('th', { class: i === 6 ? 'r' : '' }, t)))),
      h('tbody', null, rows.length ? rows.map((r) => h('tr', { class: 'click', onclick: () => { location.hash = '#/nabidka/' + r.id; } },
        h('td', null, h('b', null, r.number)), h('td', null, fmtDate(r.issued_on)), h('td', null, r.customer_name || '—'),
        h('td', null, r.project), h('td', null, h('span', { class: 'badge ' + (stavCls[r.status] || '') }, r.status)),
        h('td', null, h('span', { class: 'badge ' + (r.payment_status === 'Zaplaceno' ? 'ok' : r.payment_status === 'Nezaplaceno' ? '' : 'gold') }, r.payment_status)),
        h('td', { class: 'r' }, kc(quoteTotal(r.items || []))))) : h('tr', null, h('td', { colspan: 7, class: 'muted' }, 'Žádné nabídky.'))))));
  };
  root.replaceChildren(
    h('div', { class: 'pagehead' }, h('h1', null, 'Nabídky a zakázky'),
      h('button', { class: 'btn gold', onclick: async () => { try { const n = await newQuote(); location.hash = '#/nabidka/' + n.id; } catch (e) { toast(e.message, 'err'); } } }, '+ Nová nabídka')),
    h('div', { class: 'row', style: { marginBottom: '10px' } },
      h('input', { type: 'text', class: 'search', placeholder: 'Hledat číslo, odběratele, stavbu…', oninput: (e) => { q = e.target.value; draw(); } }),
      h('select', { style: { width: 'auto' }, onchange: (e) => { st = e.target.value; draw(); } }, h('option', { value: '' }, 'Všechny stavy'), STAV.map((s) => h('option', null, s)))),
    body);
  draw();
}

function suggestBox(input, onPick) {
  const wrap = h('div', { class: 'suggest-wrap' });
  let box = null, sel = -1, list = [];
  const close = () => { box?.remove(); box = null; sel = -1; };
  const show = () => {
    const m = matcher(input.value);
    if (input.value.trim().length < 2) return close();
    list = S.prices.filter((p) => p.active && m(`${p.code} ${p.name}`)).slice(0, 40);
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

export async function quoteEditor(root, id) {
  let q;
  try { q = await getQuote(id); } catch (e) { root.replaceChildren(h('div', { class: 'card' }, 'Nabídka nenalezena.')); return; }
  q.items = q.items || [];
  const state = h('span', { class: 'savestate' }, 'Uloženo');
  let dirty = false;
  const doSave = async () => {
    try { const r = await saveQuote(q); q.updated_at = r.updated_at; dirty = false; state.textContent = 'Uloženo'; state.className = 'savestate'; }
    catch (e) { state.textContent = 'Chyba ukládání'; toast('Nepodařilo se uložit: ' + e.message, 'err'); }
  };
  const autosave = debounce(doSave, 800);
  const touch = () => { dirty = true; state.textContent = 'Ukládám…'; state.className = 'savestate dirty'; autosave(); };
  window.__flushSave = async () => { if (dirty) await autosave.flush(); };

  const bind = (key, type = 'text') => (e) => { q[key] = type === 'num' ? parseNum(e.target.value) : e.target.value; touch(); };
  const field = (label, el, cls = '') => h('div', { class: cls }, h('label', { class: 'f' }, label), el);

  // --- odběratel
  const nameIn = h('input', { type: 'text', value: q.customer_name, oninput: bind('customer_name') });
  const addrIn = h('input', { type: 'text', value: q.customer_address, oninput: bind('customer_address') });
  const contIn = h('input', { type: 'text', value: q.customer_contact, oninput: bind('customer_contact') });
  const idsInfo = h('div', { class: 'muted' });
  const showIds = () => { const c = S.contacts.find((x) => x.id === q.customer_id); idsInfo.textContent = c && c.kind === 'PO' ? `PO · IČO ${c.ico || '—'} · DIČ ${c.dic || '—'}` : c ? 'Fyzická osoba' : ''; };
  const pick = h('select', { onchange: (e) => {
    const c = S.contacts.find((x) => x.id === e.target.value);
    q.customer_id = c ? c.id : null;
    if (c) { q.customer_name = c.name; q.customer_address = c.address; q.customer_contact = c.contact; nameIn.value = c.name; addrIn.value = c.address; contIn.value = c.contact; }
    showIds(); touch();
  } }, h('option', { value: '' }, '— vybrat z kontaktů / vyplnit ručně —'), S.contacts.map((c) => h('option', { value: c.id, selected: c.id === q.customer_id }, `${c.name} (${c.kind})`)));
  showIds();

  // --- položky
  const itemsBox = h('div', { class: 'items' });
  const totalV = h('div', { class: 'v' });
  const recalc = () => { totalV.textContent = kc(quoteTotal(q.items)); };
  const drawItems = () => {
    itemsBox.replaceChildren(h('div', { class: 'item head' }, ['Typ', 'Položka', 'MJ', 'Množství', 'Cena / MJ', 'Sleva %', 'Celkem', ''].map((t) => h('div', null, t))));
    q.items.forEach((r, i) => itemsBox.append(itemRow(r, i)));
    recalc();
  };
  const itemRow = (r, i) => {
    const tot = h('div', { class: 'tot c-tot' }, kc(lineTotal(r)));
    const upd = () => { tot.textContent = kc(lineTotal(r)); recalc(); touch(); };
    const nameIn2 = h('input', { type: 'text', value: r.name, placeholder: 'Začněte psát název položky…', oninput: (e) => { r.name = e.target.value; r.item_id = null; upd(); } });
    const unitIn = h('input', { type: 'text', value: r.unit, oninput: (e) => { r.unit = e.target.value; touch(); } });
    const priceIn = h('input', { type: 'text', inputmode: 'decimal', class: 'num', value: r.price ?? '', oninput: (e) => { r.price = parseNum(e.target.value); upd(); } });
    const typSel = h('select', { onchange: (e) => { r.typ = typeKey(e.target.value); touch(); } }, TYPES.map((t) => h('option', { selected: t.key === r.typ }, t.label)));
    const qtyIn = h('input', { type: 'text', inputmode: 'decimal', class: 'num', value: r.qty ?? '', oninput: (e) => {
      r.qty = parseNum(e.target.value);
      const p = r.item_id && S.prices.find((x) => x.id === r.item_id);
      if (p && p.category === 'kabe') { r.price = priceFor(p, r.qty); priceIn.value = r.price; }
      upd(); } });
    const discIn = h('input', { type: 'text', inputmode: 'decimal', class: 'num', value: r.disc ? Math.round(r.disc * 1000) / 10 : '', oninput: (e) => { r.disc = parseNum(e.target.value) / 100; upd(); } });
    const sug = suggestBox(nameIn2, (p) => {
      r.item_id = p.id; r.name = displayName(p); r.unit = displayUnit(p); r.typ = p.category;
      r.qty = r.qty || 1; r.price = priceFor(p, r.qty);
      nameIn2.value = r.name; unitIn.value = r.unit; priceIn.value = r.price; qtyIn.value = r.qty;
      [...typSel.options].forEach((o) => { o.selected = o.text === typeLabel(r.typ); });
      upd();
    });
    return h('div', { class: 'item' }, h('div', { class: 'c-typ' }, typSel), h('div', { class: 'c-name' }, sug), h('div', { class: 'c-mj' }, unitIn),
      h('div', { class: 'c-qty' }, qtyIn), h('div', { class: 'c-price' }, priceIn), h('div', { class: 'c-disc' }, discIn), tot,
      h('div', { class: 'c-del' }, h('button', { class: 'del', title: 'Smazat řádek', onclick: () => { q.items.splice(i, 1); drawItems(); touch(); } }, '×')));
  };
  const addRow = (typ = 'prace') => { q.items.push({ typ, name: '', unit: '', qty: '', price: '', disc: 0 }); drawItems(); itemsBox.lastChild.querySelector('input[type=text]:not([inputmode])')?.focus(); };
  drawItems();

  const preview = h('div');
  const showPreview = () => { preview.replaceChildren(h('div', { class: 'preview-wrap', html: quoteDoc(q) })); preview.scrollIntoView({ behavior: 'smooth' }); };

  root.replaceChildren(
    h('div', { class: 'pagehead' },
      h('a', { href: '#/nabidky', class: 'btn ghost small' }, '← Zpět'),
      h('h1', null, q.number), state,
      h('button', { class: 'btn ghost small', onclick: showPreview }, 'Náhled'),
      h('button', { class: 'btn gold', onclick: async () => { await autosave.flush(); printDoc(quoteDoc(q)); } }, 'PDF / Tisk')),
    h('div', { class: 'card' }, h('div', { class: 'grid c4' },
      field('Číslo nabídky', h('input', { type: 'text', value: q.number, oninput: bind('number') })),
      field('Datum vystavení', h('input', { type: 'date', value: q.issued_on, oninput: bind('issued_on') })),
      field('Platnost (dní)', h('input', { type: 'number', value: q.valid_days, oninput: bind('valid_days', 'num') })),
      field('Stav', h('select', { onchange: bind('status') }, STAV.map((s) => h('option', { selected: s === q.status }, s)))))),
    h('div', { class: 'card' }, h('h2', null, 'Odběratel'), h('div', { class: 'grid c2' },
      field('Vybrat z kontaktů', pick, 'span2'), field('Jméno / firma', nameIn), field('Adresa', addrIn), field('Kontakt (tel., e-mail)', contIn),
      field('Stavba / místo realizace', h('input', { type: 'text', value: q.project, oninput: bind('project') })), idsInfo)),
    h('div', { class: 'card' }, h('h2', null, 'Položky'), itemsBox,
      h('div', { class: 'row', style: { marginTop: '10px' } },
        h('button', { class: 'btn ghost', onclick: () => addRow('prace') }, '+ Přidat řádek'),
        h('span', { class: 'muted' }, 'Cenu i text můžete kdykoli přepsat ručně.')),
      h('div', { class: 'totalbar' }, h('div', { class: 'l' }, 'CELKEM K ÚHRADĚ'), totalV)),
    h('div', { class: 'card' }, h('div', { class: 'grid c2' },
      field('Poznámka k nabídce', h('textarea', { oninput: bind('note') }, q.note || ''), 'span2'),
      field('Stav platby', h('select', { onchange: bind('payment_status') }, PLATBA.map((s) => h('option', { selected: s === q.payment_status }, s)))))),
    h('div', { class: 'row end' },
      h('button', { class: 'btn ghost', onclick: async () => { const n = await duplicateQuote(q); toast('Zkopírováno jako ' + n.number); location.hash = '#/nabidka/' + n.id; } }, 'Duplikovat'),
      h('button', { class: 'btn danger', onclick: async () => { if (await confirmBox(`Smazat nabídku ${q.number}?`)) { await deleteQuote(q.id); location.hash = '#/nabidky'; } } }, 'Smazat')),
    preview);
}
