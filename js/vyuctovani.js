// Finální vyúčtování (k nabídce nebo bez CN) a faktury.
import { h, kc, fmtDate, toast, confirmBox, askText, makeSaver, parseNum, isoToday, addDays } from './util.js';
import { S, loadRecords, getQuote, saveQuote, listQuotes, newBezCN, listInvoices, getInvoice, createInvoice, saveInvoice, deleteInvoice, quoteTotal } from './store.js';
import { itemsEditor } from './items.js';
import { openEmailDialog } from './email.js';
import { savePdfToDrive, pdfName } from './pdf.js';
import { settlementDoc, settlementTotals, splitTotals, SET_STATES, settlementStatus, invoiceDoc, printDoc } from './doc.js';

// Přehled vyúčtování (rychlý přístup z menu)
export async function settlementsList(root) {
  root.append(h('p', { class: 'muted' }, 'Načítám…'));
  const [allQ, invs] = await Promise.all([listQuotes(), listInvoices()]);
  const all = allQ.filter((r) => r.settlement && r.settlement.items);
  const sorted = all.sort((a, b) => String((b.settlement.date) || b.issued_on).localeCompare(String(a.settlement.date || a.issued_on)));
  root.replaceChildren(
    h('div', { class: 'pagehead' }, h('h1', null, 'Vyúčtování'),
      h('button', { class: 'btn gold', onclick: async () => { try { const code = await askText('Označení zakázky (stejné pak píšete do kalendáře), např. Konzum 2026-1. Prázdné = automatické číslo.', 'Konzum 2026-1'); if (code === null) return; const n = await newBezCN(code); location.hash = '#/vyuctovani/' + n.id; } catch (e) { toast(e.message, 'err'); } } }, '+ Vyúčtování bez CN')),
    h('p', { class: 'muted' }, 'Vyúčtování k nabídkám se vytváří v detailu nabídky tlačítkem „Vyúčtování“. Zde jsou všechna už vytvořená a můžete založit nové bez cenové nabídky.'),
    h('div', { class: 'tablewrap' }, h('table', { class: 't' },
      h('thead', null, h('tr', null, ['Nabídka', 'Datum', 'Odběratel', 'Stavba', 'Stav', 'Částka'].map((t, i) => h('th', { class: i === 5 ? 'r' : '' }, t)))),
      h('tbody', null, sorted.length ? sorted.map((r) => h('tr', { class: 'click', onclick: () => { location.hash = '#/vyuctovani/' + r.id; } },
        h('td', null, h('b', null, r.number), r.settlement.bez ? h('span', { class: 'badge' }, 'bez CN') : null),
        h('td', null, fmtDate(r.settlement.date || r.issued_on)), h('td', null, r.customer_name || '—'), h('td', null, r.project || ''),
        h('td', null, (() => { const s = settlementStatus(r, invs); return h('span', { class: 'badge ' + (s.key === 'fakturovano' || s.key === 'schvaleno' ? 'ok' : s.key === 'zaslano' ? 'gold' : '') }, s.label); })()),
        h('td', { class: 'r' }, kc(settlementTotals(r).actual)))) : h('tr', null, h('td', { colspan: 6, class: 'muted' }, 'Zatím žádné vyúčtování.'))))));
}

const put = (root, ...c) => root.replaceChildren(...c.filter(Boolean));

const fld = (l, el, cls) => h('div', { class: cls || '' }, h('label', { class: 'f' }, l), el);

export async function settlementEditor(root, id) {
  let q;
  try { q = await getQuote(id); } catch (e) { root.replaceChildren(h('div', { class: 'card' }, 'Nenalezeno.')); return; }
  const isNew = !(q.settlement && q.settlement.items);
  const st = q.settlement = q.settlement && q.settlement.items ? q.settlement : { ...(q.settlement || {}), items: JSON.parse(JSON.stringify(q.items || [])), advance: 0, note: '', offer: quoteTotal(q.items || []), date: isoToday() };
  const bez = !!st.bez;
  const state = h('span', { class: 'savestate' }, 'Uloženo');
  const saver = makeSaver((f) => saveQuote(q, f), 'Toto vyúčtování', state);
  if (isNew) saver.touch(); // nové vyúčtování se hned uloží (datum a částka nabídky se tak nemění zpětně)
  const sums = h('div', { class: 'card' });
  const drawSums = () => {
    const t = settlementTotals(q);
    const line = (l, v, b) => h('div', { class: 'row between', style: { padding: '3px 0', fontWeight: b ? 800 : 400 } }, h('span', null, l), h('span', null, v));
    const sp = splitTotals((st.items || []).filter((r) => r.name));
    sums.replaceChildren(...[(sp.hasWork || sp.hasMat) && line('Práce celkem (včetně dopravy)', kc(sp.work)), (sp.hasWork || sp.hasMat) && line('Materiál celkem', kc(sp.mat)), !bez && line(`Celkem dle nabídky ${q.number}`, kc(t.offer)), !bez && line('Rozdíl oproti nabídce', kc(t.diff)),
      t.advance ? line('Uhrazená záloha', kc(-t.advance)) : null, line(t.advance ? 'Doplatek k úhradě' : 'Celkem k úhradě', kc(t.due), true)].filter(Boolean));
  };
  const intBox = h('div', { class: 'card' });
  const n_ = (v) => Number(v) || 0;
  const drawInternal = () => {
    const key = (x) => String(x || '').trim().toLowerCase();
    const mine = (r) => key(r.data.quote) === key(q.number);
    const hrs = (S.rec.hours || []).filter(mine), cst = (S.rec.cost || []).filter(mine);
    const rate = (r) => (r.data.rate !== undefined && r.data.rate !== '' ? n_(r.data.rate) : n_((S.firma.rates || {})[r.data.worker]));
    const by = {};
    for (const r of hrs) { const o = by[r.data.worker || '?'] = by[r.data.worker || '?'] || { h: 0, c: 0, rate: rate(r) }; o.h += n_(r.data.hours); o.c += n_(r.data.hours) * rate(r); if (o.rate !== rate(r)) o.rate = null; }
    const work = Object.values(by).reduce((t, o) => t + o.c, 0), hours = Object.values(by).reduce((t, o) => t + o.h, 0);
    const food = cst.filter((r) => /ob[eě]d|svač|svac/i.test(r.data.desc || '')), foodSum = food.reduce((t, r) => t + n_(r.data.amount), 0);
    const other = cst.filter((r) => !food.includes(r)), otherSum = other.reduce((t, r) => t + n_(r.data.amount), 0);
    const t = settlementTotals(q);
    const line = (l, v, b) => h('div', { class: 'row between', style: { padding: '3px 0', fontWeight: b ? 800 : 400 } }, h('span', null, l), h('span', null, v));
    intBox.replaceChildren(h('h2', null, 'Interní přehled zakázky (v dokladu se neukazuje)'),
      hrs.length || cst.length ? h('div', null,
        ...Object.entries(by).map(([w, o]) => line(`${w}: ${String(Math.round(o.h * 100) / 100).replace('.', ',')} h × ${o.rate === null ? 'různé sazby' : kc(o.rate) + '/h'}`, kc(o.c))),
        line(`Práce celkem (${String(Math.round(hours * 100) / 100).replace('.', ',')} h)`, kc(work), true),
        line(`Obědy a svačiny (${food.length}×)`, kc(foodSum)),
        otherSum ? line('Ostatní náklady', kc(otherSum)) : null,
        line('Vyúčtováno zákazníkovi', kc(t.actual)),
        line('Po odečtení práce a jídla' + (otherSum ? ' i ostatních nákladů' : ''), kc(t.actual - work - foodSum - otherSum), true),
        h('p', { class: 'muted' }, 'Rychlý přehled bez materiálu ze skladu. Celkový zisk najdete v Ziskovosti. Hodiny a obědy se sem načítají z Hodin a nákladů (ručně i z kalendáře) podle označení zakázky.'))
        : h('p', { class: 'muted' }, `K označení „${q.number}“ zatím nejsou zapsané žádné hodiny ani náklady. Napište ho do nadpisu události v kalendáři a v Hodinách klikněte na „Načíst z kalendáře“.`));
  };
  Promise.all([loadRecords('hours'), loadRecords('cost')]).then(drawInternal).catch(() => {});
  const touch = () => { saver.touch(); drawSums(); drawInternal(); };
  window.__flushSave = saver.flush; window.__isDirty = saver.isDirty;
  // Materiál MAPEI: ceníková cena + sleva pro zákazníka (volí se zde). Interní nákupní sleva z Nastavení se v dokladu nikdy neukazuje.
  const listOf = (r) => { const p = r.typ === 'mapei' && r.item_id ? S.prices.find((x) => x.id === r.item_id) : null; return p && Number(p.price) > 0 ? Number(p.price) / (Number(r.roll) || 1) : null; };
  const hints = [];
  const hintFor = (r) => {
    const el = h('div', { class: 'small muted' });
    const upd = () => { const l = listOf(r); const d = Math.min(Math.max(Number(r.disc) || 0, 0), 1); el.textContent = l ? `Ceníková cena ${kc(l)} / ${r.unit || 'MJ'}${d ? ` · po slevě ${Math.round(d * 1000) / 10} % = ${kc(Math.round(l * (1 - d) * 100) / 100)}` : ' · sleva nezadána'}` : ''; };
    upd(); hints.push(upd); return el;
  };
  const ed = itemsEditor(st.items, () => { hints.forEach((f) => f()); touch(); }, null, hintFor, { listMapei: true, discFor: () => Number(st.mapei_disc) || 0 });
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
        h('td', null, h('b', null, i.number)), h('td', null, fmtDate(i.issued_on)), h('td', { class: 'r' }, kc(i.amount)), h('td', null, h('span', { class: 'badge ' + (i.paid ? 'ok' : 'gold') }, i.paid ? 'Zaplaceno' : 'Nezaplaceno'), i.sent_at ? h('span', { class: 'badge', style: { marginLeft: '4px' } }, 'Zasláno ' + fmtDate(i.sent_at)) : null)))))) : h('p', { class: 'muted' }, 'Zatím žádná faktura.'),
      h('div', { style: { marginTop: '10px' } }, h('button', { class: 'btn gold', onclick: async () => {
        await saver.flush();
        const t = settlementTotals(q);
        try {
          const inv = await createInvoice({ quote_id: q.id, profile: q.profile || S.profile, issued_on: isoToday(), taxable_on: (q.settlement && q.settlement.date) || isoToday(), due_on: addDays(isoToday(), S.firma.due_days || 14),
            customer_name: q.customer_name, customer_address: q.customer_address,
            customer_ids: (() => { const c = S.contacts.find((x) => x.id === q.customer_id); return c && c.kind === 'PO' ? [c.ico && 'IČO ' + c.ico, c.dic && 'DIČ ' + c.dic].filter(Boolean).join(', ') : ''; })(),
            description: `${t.advance ? 'Doplatek – ' : ''}${q.project ? q.project : 'Obkladačské práce'}${bez ? '' : ' (dle nabídky ' + q.number + ')'}`, amount: t.due });
          location.hash = '#/faktura/' + inv.id;
        } catch (e) { toast(e.message, 'err'); }
      } }, '+ Vystavit fakturu na ' + kc(settlementTotals(q).due))));
  };
  const stateSel = h('select', { onchange: (e) => { q.settlement.state = e.target.value; if (e.target.value === 'zaslano' && !q.settlement.sent_at) q.settlement.sent_at = isoToday(); touch(); } },
    SET_STATES.map(([k, l]) => h('option', { value: k, selected: k === ((q.settlement && q.settlement.state) || 'rozpracovane') }, l)));
  const preview = h('div');
  put(root,
    h('div', { class: 'pagehead' }, h('a', { href: bez ? '#/vyuctovani' : '#/nabidka/' + q.id, class: 'btn ghost small' }, '← Zpět'),
      h('h1', null, 'Vyúčtování ' + q.number + (bez ? ' (bez CN)' : '')), state,
      h('button', { class: 'btn ghost small', onclick: () => { preview.replaceChildren(h('div', { class: 'preview-wrap', html: settlementDoc(q) })); preview.scrollIntoView({ behavior: 'smooth' }); } }, 'Náhled'),
      h('button', { class: 'btn ghost small', onclick: (e) => { savePdfToDrive(settlementDoc(q), pdfName('Vyúčtování ' + (bez ? '' : q.number), q.customer_name), e.target, saver.flush()); } }, 'PDF na Disk'),
      h('button', { class: 'btn ghost small', onclick: () => openEmailDialog(q, { mode: 'settlement', beforeOpen: () => saver.flush(), onSent: async () => { if (!q.settlement.state || q.settlement.state === 'rozpracovane') { q.settlement.state = 'zaslano'; q.settlement.sent_at = isoToday(); stateSel.value = 'zaslano'; touch(); await saver.flush(); } } }) }, 'Poslat e-mailem'),
      h('button', { class: 'btn gold', onclick: async () => { await saver.flush(); printDoc(settlementDoc(q)); } }, 'PDF / Tisk')),
    bez ? h('div', { class: 'banner' }, 'Vyúčtování bez cenové nabídky – „Celkem dle nabídky“ se nezobrazuje. Označení zakázky pro kalendář: ', h('b', null, q.number), ' ', h('input', { type: 'text', value: q.number, style: { width: '170px', marginLeft: '6px' }, onchange: (e) => { const v = e.target.value.trim(); if (v) { q.number = v; touch(); } } })) : h('div', { class: 'banner' }, 'Vyúčtování je kopie nabídky – úpravy zde se do původní nabídky nepropisují.'),
    custCard,
    h('div', { class: 'card' }, h('div', { class: 'grid c3' }, fld('Stav vyúčtování', stateSel, ''), h('div', { class: 'muted', style: { alignSelf: 'end', paddingBottom: '8px' } }, 'Po vystavení faktury se stav změní na „Fakturováno“ sám.'))),
    h('div', { class: 'card' }, h('div', { class: 'grid c3' },
      fld('Datum vyúčtování', h('input', { type: 'date', value: st.date || isoToday(), oninput: bind(st, 'date') })),
      fld('Uhrazená záloha (Kč)', h('input', { type: 'text', inputmode: 'decimal', value: st.advance || '', oninput: bind(st, 'advance', true) })),
      !bez && h('div', null, h('label', { class: 'f' }, ' '), h('button', { class: 'btn ghost', onclick: async () => { if (await confirmBox('Přepsat položky vyúčtování znovu podle nabídky?')) { st.items.splice(0, st.items.length, ...JSON.parse(JSON.stringify(q.items || []))); st.offer = quoteTotal(q.items || []); ed.redraw(); touch(); } } }, 'Načíst znovu z nabídky')))),
    h('div', { class: 'card' }, h('h2', null, 'Materiál MAPEI – cena pro zákazníka'),
      h('p', { class: 'muted' }, 'Materiál se vkládá za ceníkovou cenu MAPEI. Zde zvolíte slevu, kterou dáte zákazníkovi; do dokladu se píše ceníková cena, sleva a cena po slevě. Vaše nákupní sleva z Nastavení se v dokladu neukazuje.'),
      h('div', { class: 'row', style: { gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' } },
        fld('Sleva zákazníkovi (%)', h('input', { type: 'text', inputmode: 'decimal', class: 'num', style: { width: '90px' }, value: st.mapei_disc ? Math.round(st.mapei_disc * 1000) / 10 : '', oninput: (e) => { st.mapei_disc = Math.min(Math.max(parseNum(e.target.value), 0), 100) / 100; saver.touch(); } })),
        h('button', { class: 'btn ghost', onclick: () => {
          const rows = st.items.filter((r) => listOf(r));
          if (!rows.length) return toast('Ve vyúčtování není žádný materiál MAPEI z ceníku.', 'err');
          for (const r of rows) { r.price = Math.round(listOf(r) * 100) / 100; r.disc = Number(st.mapei_disc) || 0; }
          hints.length = 0; ed.redraw(); touch(); toast(`Přepočteno: ${rows.length} řádků na ceníkovou cenu se slevou ${Math.round((Number(st.mapei_disc) || 0) * 1000) / 10} %`);
        } }, 'Použít na všechen materiál MAPEI'))),
    h('div', { class: 'card' }, h('h2', null, 'Skutečně provedené položky'), ed.box,
      h('div', { class: 'row', style: { marginTop: '10px' } }, h('button', { class: 'btn ghost', onclick: () => ed.add() }, '+ Přidat řádek'))),
    sums, intBox,
    h('div', { class: 'card' }, fld('Poznámka', h('textarea', { oninput: bind(st, 'note') }, st.note || ''))),
    invBox, preview);
  drawSums();
  drawInv().catch((e) => toast(e.message, 'err'));
}

export async function invoiceEditor(root, id) {
  let inv;
  try { inv = await getInvoice(id); } catch (e) { root.replaceChildren(h('div', { class: 'card' }, 'Faktura nenalezena.')); return; }
  const state = h('span', { class: 'savestate' }, 'Uloženo');
  const isaver = makeSaver((f) => saveInvoice(inv, f), 'Tuto fakturu', state);
  const preview = h('div');
  const draw = () => { preview.replaceChildren(h('div', { class: 'preview-wrap', html: invoiceDoc(inv) })); };
  const touch = () => { isaver.touch(); draw(); };
  const sentIn = h('input', { type: 'date', value: inv.sent_at || '', oninput: (e) => { inv.sent_at = e.target.value || null; touch(); } });
  window.__flushSave = isaver.flush; window.__isDirty = isaver.isDirty;
  const bind = (k, num) => (e) => { inv[k] = num ? parseNum(e.target.value) : e.target.value; touch(); };
  put(root,
    h('div', { class: 'pagehead' }, h('a', { href: inv.quote_id ? '#/vyuctovani/' + inv.quote_id : '#/nabidky', class: 'btn ghost small' }, '← Zpět'),
      h('h1', null, 'Faktura ' + inv.number), state,
      h('button', { class: 'btn ghost small', onclick: (e) => { savePdfToDrive(invoiceDoc(inv), pdfName('Faktura ' + inv.number, inv.customer_name), e.target, isaver.flush()); } }, 'PDF na Disk'),
      h('button', { class: 'btn ghost small', onclick: () => openEmailDialog(inv, { mode: 'invoice', beforeOpen: () => isaver.flush(), onSent: async () => { inv.sent_at = isoToday(); sentIn.value = inv.sent_at; touch(); await isaver.flush(); } }) }, 'Poslat e-mailem'),
      h('button', { class: 'btn gold', onclick: async () => { await isaver.flush(); printDoc(invoiceDoc(inv)); } }, 'PDF / Tisk')),
    !S.firma.account ? h('div', { class: 'banner' }, 'Vyplňte číslo účtu v Nastavení – bez něj nelze vytvořit QR platbu.') : null,
    h('div', { class: 'card' }, h('div', { class: 'grid c3' },
      fld('Číslo faktury (= variabilní symbol)', h('input', { type: 'text', value: inv.number, oninput: bind('number') })),
      fld('Datum vystavení', h('input', { type: 'date', value: inv.issued_on, oninput: bind('issued_on') })),
      fld('Datum zdanitelného plnění', h('input', { type: 'date', value: inv.taxable_on || inv.issued_on, oninput: bind('taxable_on') })),
      fld('Splatnost', h('input', { type: 'date', value: inv.due_on || '', oninput: bind('due_on') })),
      fld('Odběratel', h('input', { type: 'text', value: inv.customer_name, oninput: bind('customer_name') })),
      fld('Adresa', h('input', { type: 'text', value: inv.customer_address, oninput: bind('customer_address') })),
      fld('IČO / DIČ', h('input', { type: 'text', value: inv.customer_ids, oninput: bind('customer_ids') })),
      fld('Částka (Kč)', h('input', { type: 'text', inputmode: 'decimal', value: inv.amount, oninput: bind('amount', true) })),
      fld('Zasláno zákazníkovi', sentIn),
      fld('Stav', h('select', { onchange: (e) => { inv.paid = e.target.value === '1'; touch(); } }, h('option', { value: '0', selected: !inv.paid }, 'Nezaplaceno'), h('option', { value: '1', selected: inv.paid }, 'Zaplaceno'))),
      fld('Popis', h('textarea', { oninput: bind('description') }, inv.description || ''), 'span3'))),
    h('div', { class: 'row end', style: { marginBottom: '12px' } }, h('button', { class: 'btn danger', onclick: async () => { if (await confirmBox('Smazat fakturu ' + inv.number + '?')) { try { await deleteInvoice(inv.id); } catch (e) { return toast(e.message, 'err'); } isaver.stop(); window.__flushSave = null; window.__isDirty = null; location.hash = inv.quote_id ? '#/vyuctovani/' + inv.quote_id : '#/nabidky'; } } }, 'Smazat')),
    preview);
  draw();
}
