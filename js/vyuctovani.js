// Finální vyúčtování (k nabídce nebo bez CN) a faktury.
import { h, kc, fmtDate, debounce, toast, confirmBox, parseNum, isoToday, addDays } from './util.js';
import { S, getQuote, saveQuote, listInvoices, getInvoice, createInvoice, saveInvoice, deleteInvoice, quoteTotal } from './store.js';
import { itemsEditor } from './items.js';
import { savePdfToDrive, pdfName } from './pdf.js';
import { settlementDoc, settlementTotals, invoiceDoc, printDoc } from './doc.js';

const put = (root, ...c) => root.replaceChildren(...c.filter(Boolean));
const fld = (l, el, cls) => h('div', { class: cls || '' }, h('label', { class: 'f' }, l), el);

export async function settlementEditor(root, id) {
  let q;
  try { q = await getQuote(id); } catch (e) { root.replaceChildren(h('div', { class: 'card' }, 'Nenalezeno.')); return; }
  const st = q.settlement = q.settlement && q.settlement.items ? q.settlement : { ...(q.settlement || {}), items: JSON.parse(JSON.stringify(q.items || [])), advance: 0, note: '' };
  const bez = !!st.bez;
  const state = h('span', { class: 'savestate' }, 'Uloženo');
  let dirty = false;
  const doSave = async () => { try { await saveQuote(q); dirty = false; state.textContent = 'Uloženo'; state.className = 'savestate'; } catch (e) { toast('Nepodařilo se uložit: ' + e.message, 'err'); } };
  const autosave = debounce(doSave, 800);
  const sums = h('div', { class: 'card' });
  const drawSums = () => {
    const t = settlementTotals(q);
    const line = (l, v, b) => h('div', { class: 'row between', style: { padding: '3px 0', fontWeight: b ? 800 : 400 } }, h('span', null, l), h('span', null, v));
    sums.replaceChildren(!bez && line(`Celkem dle nabídky ${q.number}`, kc(t.offer)), !bez && line('Rozdíl oproti nabídce', kc(t.diff)),
      line('Celkem skutečně', kc(t.actual), true), t.advance ? line('Uhrazená záloha', kc(-t.advance)) : null, line(t.advance ? 'Doplatek k úhradě' : 'Celkem k úhradě', kc(t.due), true));
  };
  const touch = () => { dirty = true; state.textContent = 'Ukládám…'; state.className = 'savestate dirty'; autosave(); drawSums(); };
  window.__flushSave = async () => { if (dirty) await autosave.flush(); };
  const ed = itemsEditor(st.items, touch);
  const bind = (obj, k, num) => (e) => { obj[k] = num ? parseNum(e.target.value) : e.target.value; touch(); };

  let custCard = null;
  if (bez) {
    const nameIn = h('input', { type: 'text', value: q.customer_name, oninput: bind(q, 'customer_name') });
    const addrIn = h('input', { type: 'text', value: q.customer_address, oninput: bind(q, 'customer_address') });
    const contIn = h('input', { type: 'text', value: q.customer_contact, oninput: bind(q, 'customer_contact') });
    const pick = h('select', { onchange: (e) => {
      const c = S.contacts.find((x) => x.id === e.target.value); q.customer_id = c ? c.id : null;
      if (c) { q.customer_name = c.name; q.customer_address = c.address; q.customer_contact = c.contact; nameIn.value = c.name; addrIn.value = c.address; contIn.value = c.contact; }
      touch(); } }, h('option', { value: '' }, '— vybrat z kontaktů / vyplnit ručně —'), S.contacts.map((c) => h('option', { value: c.id, selected: c.id === q.customer_id }, `${c.name} (${c.kind})`)));
    custCard = h('div', { class: 'card' }, h('h2', null, 'Odběratel'), h('div', { class: 'grid c2' }, fld('Z kontaktů', pick, 'span2'), fld('Jméno / firma', nameIn), fld('Adresa', addrIn), fld('Kontakt', contIn),
      fld('Stavba', h('input', { type: 'text', value: q.project, oninput: bind(q, 'project') }))));
  }
  const invBox = h('div', { class: 'card' });
  const drawInv = async () => {
    const list = await listInvoices(q.id);
    invBox.replaceChildren(h('h2', null, 'Faktury'),
      list.length ? h('div', { class: 'tablewrap' }, h('table', { class: 't' }, h('tbody', null, list.map((i) => h('tr', { class: 'click', onclick: () => { location.hash = '#/faktura/' + i.id; } },
        h('td', null, h('b', null, i.number)), h('td', null, fmtDate(i.issued_on)), h('td', { class: 'r' }, kc(i.amount)), h('td', null, h('span', { class: 'badge ' + (i.paid ? 'ok' : 'gold') }, i.paid ? 'Zaplaceno' : 'Nezaplaceno'))))))) : h('p', { class: 'muted' }, 'Zatím žádná faktura.'),
      h('div', { style: { marginTop: '10px' } }, h('button', { class: 'btn gold', onclick: async () => {
        await autosave.flush();
        const t = settlementTotals(q);
        try {
          const inv = await createInvoice({ quote_id: q.id, issued_on: isoToday(), due_on: addDays(isoToday(), S.firma.due_days || 14),
            customer_name: q.customer_name, customer_address: q.customer_address,
            customer_ids: (() => { const c = S.contacts.find((x) => x.id === q.customer_id); return c && c.kind === 'PO' ? [c.ico && 'IČO ' + c.ico, c.dic && 'DIČ ' + c.dic].filter(Boolean).join(', ') : ''; })(),
            description: `${t.advance ? 'Doplatek – ' : ''}${q.project ? q.project : 'Obkladačské práce'}${bez ? '' : ' (dle nabídky ' + q.number + ')'}`, amount: t.due });
          location.hash = '#/faktura/' + inv.id;
        } catch (e) { toast(e.message, 'err'); }
      } }, '+ Vystavit fakturu na ' + kc(settlementTotals(q).due))));
  };
  const preview = h('div');
  put(root,
    h('div', { class: 'pagehead' }, h('a', { href: bez ? '#/nabidky' : '#/nabidka/' + q.id, class: 'btn ghost small' }, '← Zpět'),
      h('h1', null, 'Vyúčtování ' + (bez ? '(bez CN)' : q.number)), state,
      h('button', { class: 'btn ghost small', onclick: () => { preview.replaceChildren(h('div', { class: 'preview-wrap', html: settlementDoc(q) })); preview.scrollIntoView({ behavior: 'smooth' }); } }, 'Náhled'),
      h('button', { class: 'btn ghost small', onclick: async (e) => { await autosave.flush(); savePdfToDrive(settlementDoc(q), pdfName('Vyúčtování ' + (bez ? '' : q.number), q.customer_name), e.target); } }, 'PDF na Disk'),
      h('button', { class: 'btn gold', onclick: async () => { await autosave.flush(); printDoc(settlementDoc(q)); } }, 'PDF / Tisk')),
    bez ? h('div', { class: 'banner' }, 'Vyúčtování bez cenové nabídky – „Celkem dle nabídky“ se nezobrazuje.') : h('div', { class: 'banner' }, 'Vyúčtování je kopie nabídky – úpravy zde se do původní nabídky nepropisují.'),
    custCard,
    h('div', { class: 'card' }, h('div', { class: 'grid c3' },
      fld('Datum vyúčtování', h('input', { type: 'date', value: st.date || isoToday(), oninput: bind(st, 'date') })),
      fld('Uhrazená záloha (Kč)', h('input', { type: 'text', inputmode: 'decimal', value: st.advance || '', oninput: bind(st, 'advance', true) })),
      !bez && h('div', null, h('label', { class: 'f' }, ' '), h('button', { class: 'btn ghost', onclick: async () => { if (await confirmBox('Přepsat položky vyúčtování znovu podle nabídky?')) { st.items.splice(0, st.items.length, ...JSON.parse(JSON.stringify(q.items || []))); ed.redraw(); touch(); } } }, 'Načíst znovu z nabídky')))),
    h('div', { class: 'card' }, h('h2', null, 'Skutečně provedené položky'), ed.box,
      h('div', { class: 'row', style: { marginTop: '10px' } }, h('button', { class: 'btn ghost', onclick: () => ed.add() }, '+ Přidat řádek'))),
    sums,
    h('div', { class: 'card' }, fld('Poznámka', h('textarea', { oninput: bind(st, 'note') }, st.note || ''))),
    invBox, preview);
  drawSums();
  drawInv().catch((e) => toast(e.message, 'err'));
}

export async function invoiceEditor(root, id) {
  let inv;
  try { inv = await getInvoice(id); } catch (e) { root.replaceChildren(h('div', { class: 'card' }, 'Faktura nenalezena.')); return; }
  const state = h('span', { class: 'savestate' }, 'Uloženo');
  let dirty = false;
  const doSave = async () => { try { await saveInvoice(inv); dirty = false; state.textContent = 'Uloženo'; state.className = 'savestate'; } catch (e) { toast('Nepodařilo se uložit: ' + e.message, 'err'); } };
  const autosave = debounce(doSave, 800);
  const preview = h('div');
  const draw = () => { preview.replaceChildren(h('div', { class: 'preview-wrap', html: invoiceDoc(inv) })); };
  const touch = () => { dirty = true; state.textContent = 'Ukládám…'; state.className = 'savestate dirty'; autosave(); draw(); };
  window.__flushSave = async () => { if (dirty) await autosave.flush(); };
  const bind = (k, num) => (e) => { inv[k] = num ? parseNum(e.target.value) : e.target.value; touch(); };
  put(root,
    h('div', { class: 'pagehead' }, h('a', { href: inv.quote_id ? '#/vyuctovani/' + inv.quote_id : '#/nabidky', class: 'btn ghost small' }, '← Zpět'),
      h('h1', null, 'Faktura ' + inv.number), state,
      h('button', { class: 'btn ghost small', onclick: async (e) => { await autosave.flush(); savePdfToDrive(invoiceDoc(inv), pdfName('Faktura ' + inv.number, inv.customer_name), e.target); } }, 'PDF na Disk'),
      h('button', { class: 'btn gold', onclick: async () => { await autosave.flush(); printDoc(invoiceDoc(inv)); } }, 'PDF / Tisk')),
    !S.firma.account ? h('div', { class: 'banner' }, 'Vyplňte číslo účtu v Nastavení – bez něj nelze vytvořit QR platbu.') : null,
    h('div', { class: 'card' }, h('div', { class: 'grid c3' },
      fld('Číslo faktury (= variabilní symbol)', h('input', { type: 'text', value: inv.number, oninput: bind('number') })),
      fld('Datum vystavení', h('input', { type: 'date', value: inv.issued_on, oninput: bind('issued_on') })),
      fld('Splatnost', h('input', { type: 'date', value: inv.due_on || '', oninput: bind('due_on') })),
      fld('Odběratel', h('input', { type: 'text', value: inv.customer_name, oninput: bind('customer_name') })),
      fld('Adresa', h('input', { type: 'text', value: inv.customer_address, oninput: bind('customer_address') })),
      fld('IČO / DIČ', h('input', { type: 'text', value: inv.customer_ids, oninput: bind('customer_ids') })),
      fld('Částka (Kč)', h('input', { type: 'text', inputmode: 'decimal', value: inv.amount, oninput: bind('amount', true) })),
      fld('Stav', h('select', { onchange: (e) => { inv.paid = e.target.value === '1'; touch(); } }, h('option', { value: '0', selected: !inv.paid }, 'Nezaplaceno'), h('option', { value: '1', selected: inv.paid }, 'Zaplaceno'))),
      fld('Popis', h('textarea', { oninput: bind('description') }, inv.description || ''), 'span3'))),
    h('div', { class: 'row end', style: { marginBottom: '12px' } }, h('button', { class: 'btn danger', onclick: async () => { if (await confirmBox('Smazat fakturu ' + inv.number + '?')) { await deleteInvoice(inv.id); location.hash = inv.quote_id ? '#/vyuctovani/' + inv.quote_id : '#/nabidky'; } } }, 'Smazat')),
    preview);
  draw();
}
