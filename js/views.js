// Kontakty, ceníky, nastavení.
import { h, kc, matcher, toast, confirmBox, parseNum } from './util.js';
import { S, TYPES, typeLabel, saveContact, deleteContact, savePrice, deletePrice, saveFirma, importSeed, sb, loadAll } from './store.js';

export function contactsView(root) {
  let q = '';
  const body = h('div');
  const draw = () => {
    const m = matcher(q);
    const rows = S.contacts.filter((c) => m(`${c.name} ${c.ico} ${c.address} ${c.contact}`));
    body.replaceChildren(h('div', { class: 'tablewrap' }, h('table', { class: 't' },
      h('thead', null, h('tr', null, ['Jméno / firma', 'Typ', 'IČO', 'DIČ', 'Adresa', 'Kontakt'].map((t) => h('th', null, t)))),
      h('tbody', null, rows.length ? rows.map((c) => h('tr', { class: 'click', onclick: () => edit(c) },
        h('td', null, h('b', null, c.name)), h('td', null, h('span', { class: 'badge ' + (c.kind === 'PO' ? 'blue' : '') }, c.kind)),
        h('td', null, c.ico), h('td', null, c.dic), h('td', null, c.address), h('td', null, c.contact)))
        : h('tr', null, h('td', { colspan: 6, class: 'muted' }, 'Žádné kontakty.'))))));
  };
  const edit = (c0) => {
    const c = { kind: 'FO', name: '', address: '', contact: '', ico: '', dic: '', person: '', note: '', ...c0 };
    const inp = (k) => h('input', { type: 'text', value: c[k], oninput: (e) => { c[k] = e.target.value; } });
    const fld = (l, el, cls) => h('div', { class: cls || '' }, h('label', { class: 'f' }, l), el);
    const po = h('div', { class: 'grid c2 span2' }, fld('IČO', inp('ico')), fld('DIČ', inp('dic')), fld('Kontaktní osoba', inp('person'), 'span2'));
    const showPO = () => { po.style.display = c.kind === 'PO' ? '' : 'none'; };
    const close = () => ov.remove();
    const ov = h('div', { class: 'overlay' }, h('div', { class: 'dialog', style: { maxWidth: '560px' } },
      h('h2', null, c.id ? 'Upravit kontakt' : 'Nový kontakt'),
      h('div', { class: 'grid c2' },
        fld('Typ', h('select', { onchange: (e) => { c.kind = e.target.value; showPO(); } }, h('option', { value: 'FO', selected: c.kind === 'FO' }, 'FO – fyzická osoba'), h('option', { value: 'PO', selected: c.kind === 'PO' }, 'PO – firma')), 'span2'),
        fld('Jméno / firma', inp('name'), 'span2'), fld('Adresa', inp('address'), 'span2'), fld('Telefon / e-mail', inp('contact'), 'span2'), po,
        fld('Poznámka', inp('note'), 'span2')),
      h('div', { class: 'row end', style: { marginTop: '14px' } },
        c.id && h('button', { class: 'btn danger', onclick: async () => { if (await confirmBox('Smazat kontakt?')) { try { await deleteContact(c.id); close(); draw(); } catch (e) { toast(e.message, 'err'); } } } }, 'Smazat'),
        h('div', { class: 'grow' }),
        h('button', { class: 'btn ghost', onclick: close }, 'Zrušit'),
        h('button', { class: 'btn gold', onclick: async () => {
          if (!c.name.trim()) return toast('Vyplňte jméno', 'err');
          try { await saveContact(c); close(); draw(); toast('Uloženo'); } catch (e) { toast(e.message, 'err'); } } }, 'Uložit'))));
    document.body.append(ov); showPO();
  };
  root.replaceChildren(
    h('div', { class: 'pagehead' }, h('h1', null, 'Kontakty'), h('button', { class: 'btn gold', onclick: () => edit({}) }, '+ Nový kontakt')),
    h('div', { class: 'row', style: { marginBottom: '10px' } }, h('input', { type: 'text', class: 'search', placeholder: 'Hledat…', oninput: (e) => { q = e.target.value; draw(); } })),
    body);
  draw();
}

export function pricesView(root) {
  let cat = 'prace', q = '';
  const body = h('div');
  const LIMIT = 100;
  const draw = () => {
    const m = matcher(q);
    const all = S.prices.filter((p) => p.category === cat && (!q || m(`${p.code} ${p.name}`)));
    const rows = all.slice(0, LIMIT);
    const cell = (p, k, cls) => h('td', null, h('input', { type: 'text', class: cls || '', value: p[k] ?? '', onchange: async (e) => {
      p[k] = (k === 'price' || k === 'pack') ? parseNum(e.target.value) : e.target.value;
      try { await savePrice(p); toast('Uloženo'); } catch (er) { toast(er.message, 'err'); } } }));
    body.replaceChildren(
      h('div', { class: 'muted', style: { marginBottom: '6px' } }, `${all.length} položek` + (all.length > LIMIT ? ` (zobrazeno prvních ${LIMIT}, zpřesněte hledání)` : '')),
      h('div', { class: 'tablewrap' }, h('table', { class: 't' },
        h('thead', null, h('tr', null, ['Kód', 'Název', 'MJ', cat === 'mapei' ? 'Balení' : null, 'Cena', ''].filter((x) => x !== null).map((t) => h('th', null, t)))),
        h('tbody', null, rows.map((p) => h('tr', null, cell(p, 'code'), cell(p, 'name'), cell(p, 'unit'), cat === 'mapei' ? cell(p, 'pack', 'num') : null, cell(p, 'price', 'num'),
          h('td', null, h('button', { class: 'del', style: { background: 'none', border: 0, color: 'var(--bad)', fontSize: '18px', cursor: 'pointer' }, onclick: async () => { if (await confirmBox('Smazat položku?')) { await deletePrice(p.id); draw(); } } }, '×'))))))));
  };
  const tabs = h('div', { class: 'row', style: { marginBottom: '10px' } }, TYPES.map((t) => h('button', { class: 'btn small ' + (t.key === cat ? '' : 'ghost'), onclick: (e) => { cat = t.key; [...tabs.children].forEach((b) => b.classList.add('ghost')); e.target.classList.remove('ghost'); draw(); } }, t.label)));
  root.replaceChildren(
    h('div', { class: 'pagehead' }, h('h1', null, 'Ceníky'), h('button', { class: 'btn gold', onclick: async () => { try { await savePrice({ category: cat, name: 'Nová položka', price: 0 }); q = ''; draw(); toast('Položka přidána'); } catch (e) { toast(e.message, 'err'); } } }, '+ Nová položka')),
    tabs, h('div', { class: 'row', style: { marginBottom: '10px' } }, h('input', { type: 'text', class: 'search', placeholder: 'Hledat kód nebo název…', oninput: (e) => { q = e.target.value; draw(); } })),
    body);
  draw();
}

export function settingsView(root) {
  const f = { ...S.firma };
  const inp = (k, type = 'text') => h('input', { type, value: f[k] ?? '', oninput: (e) => { f[k] = type === 'number' ? parseNum(e.target.value) : e.target.value; } });
  const fld = (l, el, cls) => h('div', { class: cls || '' }, h('label', { class: 'f' }, l), el);
  const pw = h('input', { type: 'password', placeholder: 'Nové heslo (min. 8 znaků)' });
  const imp = h('div', { class: 'muted' });
  root.replaceChildren(
    h('div', { class: 'pagehead' }, h('h1', null, 'Nastavení')),
    h('div', { class: 'card' }, h('h2', null, 'Firma (dodavatel)'), h('div', { class: 'grid c2' },
      fld('Jméno / název', inp('name')), fld('IČO', inp('ico')), fld('Adresa', inp('address'), 'span2'),
      fld('Telefon', inp('phone')), fld('E-mail', inp('email')), fld('Číslo účtu', inp('account')), fld('Banka', inp('bank')),
      fld('Instagram (odkaz)', inp('instagram')), fld('YouTube (odkaz)', inp('youtube')), fld('Slogan v záhlaví', inp('tagline'), 'span2'),
      fld('Platnost nabídky (dní)', inp('valid_days', 'number')), fld('Splatnost faktury (dní)', inp('due_days', 'number')),
      fld('Sleva MAPEI (0,28 = 28 %)', inp('mapei_discount', 'number')), fld('Přirážka KABE (0,10 = 10 %)', inp('kabe_markup', 'number')),
      fld('Obchodní podmínky v nabídce', h('textarea', { rows: 4, oninput: (e) => { f.terms = e.target.value; } }, f.terms || ''), 'span2')),
      h('div', { class: 'row end', style: { marginTop: '12px' } }, h('button', { class: 'btn gold', onclick: async () => { try { await saveFirma(f); toast('Uloženo'); } catch (e) { toast(e.message, 'err'); } } }, 'Uložit'))),
    h('div', { class: 'card' }, h('h2', null, 'Heslo'), h('div', { class: 'row' }, h('div', { class: 'grow' }, pw),
      h('button', { class: 'btn', onclick: async () => {
        if (pw.value.length < 8) return toast('Heslo musí mít alespoň 8 znaků', 'err');
        const { error } = await sb.auth.updateUser({ password: pw.value });
        if (error) toast(error.message, 'err'); else { pw.value = ''; toast('Heslo změněno'); } } }, 'Změnit heslo'))),
    h('div', { class: 'card' }, h('h2', null, 'Import ceníků'),
      h('p', { class: 'muted' }, `Načte do databáze výchozí ceníky, firmu a kontakty (stávající položky se nepřepisují). Nyní v databázi: ${S.prices.length} položek.`),
      h('button', { class: 'btn ghost', onclick: async (e) => { e.target.disabled = true; try { const n = await importSeed((a, b) => { imp.textContent = `Importuji ${a}/${b}…`; }); imp.textContent = `Hotovo, přidáno ${n} položek.`; } catch (er) { imp.textContent = 'Chyba: ' + er.message; } e.target.disabled = false; } }, 'Importovat ceníky'), imp),
    h('p', { class: 'muted' }, 'Verze aplikace ' + (window.__ver || '')));
}
