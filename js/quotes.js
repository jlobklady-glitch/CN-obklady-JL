// Nabídky: seznam a editor.
import { h, kc, fmtDate, matcher, toast, confirmBox, makeSaver, parseNum, num, isoToday } from './util.js';
import { S, TYPES, STAV, PLATBA, typeLabel, typeKey, priceFor, displayName, displayUnit, lineTotal, quoteTotal,
  listQuotes, getQuote, newQuote, newBezCN, saveQuote, deleteQuote, duplicateQuote } from './store.js';
import { quoteDoc, printDoc } from './doc.js';
import { itemsEditor } from './items.js';
import { guideApplies, openGuide } from './pruvodce.js';
import { savePdfToDrive, pdfName } from './pdf.js';

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
      h('tbody', null, rows.length ? rows.map((r) => h('tr', { class: 'click', onclick: () => { location.hash = (r.settlement && r.settlement.bez ? '#/vyuctovani/' : '#/nabidka/') + r.id; } },
        h('td', null, h('b', null, r.number), r.settlement && r.settlement.bez ? h('span', { class: 'badge' }, 'bez CN') : null), h('td', null, fmtDate(r.issued_on)), h('td', null, r.customer_name || '—'),
        h('td', null, r.project), h('td', null, h('span', { class: 'badge ' + (stavCls[r.status] || '') }, r.status)),
        h('td', null, h('span', { class: 'badge ' + (r.payment_status === 'Zaplaceno' ? 'ok' : r.payment_status === 'Nezaplaceno' ? '' : 'gold') }, r.payment_status)),
        h('td', { class: 'r' }, kc(quoteTotal(r.items || []))))) : h('tr', null, h('td', { colspan: 7, class: 'muted' }, 'Žádné nabídky.'))))));
  };
  root.replaceChildren(
    h('div', { class: 'pagehead' }, h('h1', null, 'Nabídky a zakázky'),
      h('button', { class: 'btn ghost', onclick: async () => { try { const n = await newBezCN(); location.hash = '#/vyuctovani/' + n.id; } catch (e) { toast(e.message, 'err'); } } }, '+ Vyúčtování bez CN'),
      h('button', { class: 'btn gold', onclick: async () => { try { const n = await newQuote(); location.hash = '#/nabidka/' + n.id; } catch (e) { toast(e.message, 'err'); } } }, '+ Nová nabídka')),
    h('div', { class: 'row', style: { marginBottom: '10px' } },
      h('input', { type: 'text', class: 'search', placeholder: 'Hledat číslo, odběratele, stavbu…', oninput: (e) => { q = e.target.value; draw(); } }),
      h('select', { style: { width: 'auto' }, onchange: (e) => { st = e.target.value; draw(); } }, h('option', { value: '' }, 'Všechny stavy'), STAV.map((s) => h('option', null, s)))),
    body);
  draw();
}

export async function quoteEditor(root, id) {
  let q;
  try { q = await getQuote(id); } catch (e) { root.replaceChildren(h('div', { class: 'card' }, 'Nabídka nenalezena.')); return; }
  q.items = q.items || [];
  const state = h('span', { class: 'savestate' }, 'Uloženo');
  const saver = makeSaver((f) => saveQuote(q, f), 'Tuto nabídku', state);
  const touch = saver.touch;
  window.__flushSave = saver.flush; window.__isDirty = saver.isDirty;

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

  const ed = itemsEditor(q.items, touch, (p, r) => {
    if (!guideApplies(p)) return;
    openGuide({ item: p, row: r, onDone: ({ base, prem, area }) => {
      if (!(parseNum(r.qty) > 1)) r.qty = area;
      const at = q.items.indexOf(r) + 1; q.items.splice(at, 0, ...base);
      if (prem.length) { q.premium = true; q.premium_items = q.premium_items || []; q.premium_items.push(...prem); }
      ed.redraw(); touch(); drawPremium();
    } });
  });
  const itemsBox = ed.box, totalV = ed.totalV;

  // --- varianta Premium
  q.premium_items = q.premium_items || [];
  const pedBox = h('div');
  const premiumCard = h('div', { class: 'card' });
  const drawPremium = () => {
    pedBox.replaceChildren();
    if (!q.premium) { premiumCard.replaceChildren(h('label', { class: 'row' }, h('input', { type: 'checkbox', style: { width: 'auto' }, onchange: (e) => { q.premium = e.target.checked; touch(); drawPremium(); } }), h('b', null, 'Nabídnout variantu PREMIUM (strana 2 s příplatky a Q&A)'))); return; }
    const ped = itemsEditor(q.premium_items, touch);
    const total = () => kc(quoteTotal(q.items) + quoteTotal(q.premium_items));
    premiumCard.replaceChildren(
      h('label', { class: 'row' }, h('input', { type: 'checkbox', checked: true, style: { width: 'auto' }, onchange: (e) => { q.premium = e.target.checked; touch(); drawPremium(); } }), h('b', null, 'Varianta PREMIUM – příplatky (strana 2 nabídky)')),
      h('p', { class: 'muted' }, 'Zadejte množství a cenu příplatků. Cena Premium = nabídka + příplatky. Texty Q&A upravíte v Nastavení.'),
      ped.box,
      h('div', { class: 'row', style: { marginTop: '10px' } },
        h('button', { class: 'btn ghost', onclick: () => { const have = new Set(q.premium_items.map((r) => r.name)); S.prices.filter((p) => p.category === 'ostatni' && /^PREMIUM/i.test(p.name) && !have.has(p.name)).forEach((p) => q.premium_items.push({ typ: 'ostatni', item_id: p.id, name: p.name, unit: p.unit, qty: '', price: p.price, disc: 0 })); ped.redraw(); touch(); } }, '+ Načíst položky PREMIUM z ceníku'),
        h('button', { class: 'btn ghost', onclick: () => ped.add() }, '+ Přidat řádek'),
        h('button', { class: 'btn gold', onclick: async () => {
          const pick = q.premium_items.filter((r) => r.name && parseNum(r.qty) > 0);
          if (!pick.length) return toast('Žádný příplatek nemá množství', 'err');
          if (!(await confirmBox(`Přidat ${pick.length} položek Premium do tabulky nabídky? Strana Premium se pak v PDF nezobrazí.`))) return;
          q.items.push(...pick); q.premium_items = []; q.premium = false; ed.redraw(); touch(); drawPremium(); toast('Položky Premium přidány do nabídky');
        } }, 'Zákazník zvolil PREMIUM')));
  };
  drawPremium();
  const preview = h('div');
  const showPreview = () => { preview.replaceChildren(h('div', { class: 'preview-wrap', html: quoteDoc(q) })); preview.scrollIntoView({ behavior: 'smooth' }); };

  root.replaceChildren(
    h('div', { class: 'pagehead' },
      h('a', { href: '#/nabidky', class: 'btn ghost small' }, '← Zpět'),
      h('h1', null, q.number), state,
      h('button', { class: 'btn ghost small', onclick: showPreview }, 'Náhled'),
      h('a', { href: '#/objednavka/' + q.id, class: 'btn ghost small', style: { textDecoration: 'none' } }, 'Objednávka'),
      h('a', { href: '#/vyuctovani/' + q.id, class: 'btn ghost small', style: { textDecoration: 'none' } }, 'Vyúčtování'),
      h('button', { class: 'btn ghost small', onclick: async (e) => { await saver.flush(); savePdfToDrive(quoteDoc(q), pdfName(q.number, q.customer_name), e.target); } }, 'PDF na Disk'),
      h('button', { class: 'btn gold', onclick: async () => { await saver.flush(); printDoc(quoteDoc(q)); } }, 'PDF / Tisk')),
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
        h('button', { class: 'btn ghost', onclick: () => ed.add() }, '+ Přidat řádek'),
        h('span', { class: 'muted' }, 'Cenu i text můžete kdykoli přepsat ručně.')),
      h('div', { class: 'totalbar' }, h('div', { class: 'l' }, 'CELKEM K ÚHRADĚ'), totalV)),
    premiumCard,
    h('div', { class: 'card' }, h('div', { class: 'grid c2' },
      field('Poznámka k nabídce', h('textarea', { oninput: bind('note') }, q.note || ''), 'span2'),
      field('Stav platby', h('select', { onchange: bind('payment_status') }, PLATBA.map((s) => h('option', { selected: s === q.payment_status }, s)))))),
    h('div', { class: 'row end' },
      h('button', { class: 'btn ghost', onclick: async () => { const n = await duplicateQuote(q); toast('Zkopírováno jako ' + n.number); location.hash = '#/nabidka/' + n.id; } }, 'Duplikovat'),
      h('button', { class: 'btn danger', onclick: async () => { if (await confirmBox(`Smazat nabídku ${q.number}?`)) { saver.stop(); window.__flushSave = null; window.__isDirty = null; await deleteQuote(q.id); location.hash = '#/nabidky'; } } }, 'Smazat')),
    preview);
}
