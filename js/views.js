// Kontakty, ceníky, nastavení.
import { h, kc, matcher, toast, confirmBox, parseNum } from './util.js';
import { makeBackup, restoreBackup, backupToDrive } from './backup.js';
import { driveReady } from './drive.js';
import { importButtons } from './cenikimport.js';
import { saveFirmaMerged, S, DEFAULT_QA, TYPES, typeLabel, saveContact, deleteContact, savePrice, deletePrice, saveFirma, importSeed, sb, loadAll } from './store.js';

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

// Záložky ceníku prací (podmenu u „Práce“) – pořadí jako v importovaném Excelu
const SHEETS = ['Práce', 'Obklad (stěna)', 'Dlažba (podlaha)', 'Sádrokartony (SDK)', 'Opravy a rekonstrukce', 'Otvory a výřezy', 'WC tlačítka z obkladu', 'Kamenické rohy (Jolly)', 'Výrobky z dlažby', 'Skryté systémy v obkladu', 'Terasy a exteriéry', 'Schody a detail s LED', 'Bazény, wellness a chemie', 'Zdění a příčky', 'Osvětlení a elektro detaily', 'Speciální povrchy a mramor'];
const CORE = { prace: 'Práce', stena: 'Obklad (stěna)', podlaha: 'Dlažba (podlaha)' };
const GTOP = [['prace', 'Práce'], ['mapei', 'Materiál MAPEI'], ['kabe', 'Betonová stěrka KABE'], ['ostatni', 'Ostatní']];
const sheetOf = (p) => {
  const e = p.extra || {};
  if (e.sheet && SHEETS.includes(e.sheet)) return e.sheet;
  const g = String(e.group || ''); const i = g.indexOf(' – ');
  if (i > 0 && SHEETS.includes(g.slice(0, i))) return g.slice(0, i);
  return CORE[p.category] || 'Práce';
};
const groupOf = (p) => { const g = String((p.extra || {}).group || ''); const i = g.indexOf(' – '); return i > 0 && SHEETS.includes(g.slice(0, i)) ? g.slice(i + 3) : g; };
const isWork = (p) => ['prace', 'stena', 'podlaha'].includes(p.category);

export function pricesView(root) {
  let top = 'prace', sub = '', q = '', limit = 60;
  const body = h('div');
  const grow = (ta) => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 2 + 'px'; };
  const subRow = h('div', { class: 'tabsrow' });
  const drawSub = () => {
    subRow.replaceChildren();
    if (top !== 'prace') return;
    const cnt = {}; S.prices.filter(isWork).forEach((p) => { const k = sheetOf(p); cnt[k] = (cnt[k] || 0) + 1; });
    const total = Object.values(cnt).reduce((a, b) => a + b, 0);
    const mk = (key, label, n) => h('button', { class: 'btn small ' + (sub === key ? '' : 'ghost'), onclick: () => { sub = key; limit = 60; drawSub(); draw(); } }, `${label} (${n})`);
    subRow.append(mk('', 'Vše', total), ...SHEETS.filter((n) => cnt[n]).map((n) => mk(n, n, cnt[n])));
  };
  const draw = () => {
    const m = matcher(q);
    let all = S.prices.filter((p) => (top === 'prace' ? isWork(p) && (!sub || sheetOf(p) === sub) : p.category === top) && (!q || m(`${p.code} ${p.name}`)));
    if (top === 'prace') all = all.slice().sort((a, b) => SHEETS.indexOf(sheetOf(a)) - SHEETS.indexOf(sheetOf(b)) || String(groupOf(a)).localeCompare(String(groupOf(b)), 'cs', { numeric: true }) || String(a.code || '~').localeCompare(String(b.code || '~'), 'cs', { numeric: true }));
    const rows = all.slice(0, limit);
    const save = async (p, k, v) => {
      p[k] = (k === 'price' || k === 'pack') ? parseNum(v) : v;
      try { await savePrice(p); toast('Uloženo'); } catch (er) { toast(er.message, 'err'); }
    };
    const small = (p, k, label, cls) => h('div', { class: 'pf ' + (cls || '') }, h('label', { class: 'f' }, label),
      h('input', { type: 'text', inputmode: (k === 'price' || k === 'pack') ? 'decimal' : 'text', value: p[k] ?? '', onchange: (e) => save(p, k, e.target.value) }));
    const card = (p) => {
      const ta = h('textarea', { rows: 1, onchange: (e) => save(p, 'name', e.target.value), oninput: (e) => grow(e.target) }, p.name);
      requestAnimationFrame(() => grow(ta));
      const note = (p.extra || {}).note;
      return h('div', { class: 'pr' },
        h('div', { class: 'pf pn' }, h('label', { class: 'f' }, 'Název'), ta, note ? h('div', { class: 'muted', style: { fontSize: '12px', marginTop: '2px' } }, note) : null),
        h('div', { class: 'pr-small' }, small(p, 'code', 'Kód'), small(p, 'unit', 'MJ'), p.category === 'mapei' ? small(p, 'pack', 'Balení') : null, small(p, 'price', 'Cena (Kč)'),
          h('button', { class: 'del', title: 'Smazat', onclick: async () => { if (await confirmBox('Smazat položku?')) { await deletePrice(p.id); drawSub(); draw(); } } }, '×')));
    };
    const list = []; let lastS = null, lastG = null;
    for (const p of rows) {
      if (top === 'prace') {
        const sh = sheetOf(p), g = groupOf(p);
        if (!sub && sh !== lastS) { list.push(h('h3', { style: { margin: '16px 0 2px', borderBottom: '2px solid #c9a24a' } }, sh)); lastS = sh; lastG = null; }
        if (g !== lastG) { if (g) list.push(h('div', { class: 'muted', style: { fontWeight: '700', margin: '10px 0 2px' } }, g)); lastG = g; }
      }
      list.push(card(p));
    }
    body.replaceChildren(...[
      (top === 'mapei' || top === 'kabe' || top === 'prace') ? h('div', { style: { margin: '0 0 8px' } }, importButtons(top, () => { drawSub(); draw(); })) : null,
      h('div', { class: 'muted', style: { marginBottom: '6px' } }, `${all.length} položek`),
      h('div', { class: 'prlist' }, list),
      all.length > limit ? h('button', { class: 'btn ghost', style: { marginTop: '10px' }, onclick: () => { limit += 100; draw(); } }, `Zobrazit dalších ${Math.min(100, all.length - limit)} (zobrazeno ${limit} z ${all.length})`) : null].filter(Boolean));
  };
  const searchIn = h('input', { type: 'text', class: 'search', placeholder: 'Hledat kód nebo název…', oninput: (e) => { q = e.target.value; limit = 60; draw(); } });
  const tabs = h('div', { class: 'tabsrow' }, GTOP.map(([k, label]) => h('button', { class: 'btn small ' + (k === top ? '' : 'ghost'), onclick: (e) => { top = k; sub = ''; limit = 60; [...tabs.children].forEach((b) => b.classList.add('ghost')); e.target.classList.remove('ghost'); drawSub(); draw(); } }, label)));
  root.replaceChildren(
    h('div', { class: 'pagehead' }, h('h1', null, 'Ceníky'), h('button', { class: 'btn gold', onclick: async () => {
      try {
        const cat = top === 'prace' ? (sub === 'Obklad (stěna)' ? 'stena' : sub === 'Dlažba (podlaha)' ? 'podlaha' : 'prace') : top;
        await savePrice({ category: cat, name: 'Nová položka', price: 0, ...(cat === 'prace' && sub && sub !== 'Práce' ? { extra: { sheet: sub, group: sub } } : {}) });
        q = 'Nová položka'; searchIn.value = q; drawSub(); draw(); toast('Položka přidána');
      } catch (e) { toast(e.message, 'err'); }
    } }, '+ Nová položka')),
    tabs, subRow, h('div', { style: { margin: '10px 0' } }, searchIn),
    body);
  drawSub(); draw();
}

export function settingsView(root) {
  const f = JSON.parse(JSON.stringify(S.firmaBase));
  let orig = JSON.parse(JSON.stringify(S.firmaBase));
  f.profiles = f.profiles || {};
  const P = (f.profiles[S.profile] = f.profiles[S.profile] || {});
  const pinp = (k) => h('input', { type: 'text', value: P[k] ?? '', oninput: (e) => { P[k] = e.target.value; } });
  const inp = (k, type = 'text') => h('input', { type, value: f[k] ?? '', oninput: (e) => { f[k] = type === 'number' ? parseNum(e.target.value) : e.target.value; } });
  const fld = (l, el, cls) => h('div', { class: cls || '' }, h('label', { class: 'f' }, l), el);
  f.workers = f.workers && f.workers.length ? f.workers : ['Lukáš', 'Honza', 'Firma (JL-OBKLADY)'];
  f.rates = f.rates || {};
  f.qa = f.qa && f.qa.length ? f.qa : JSON.parse(JSON.stringify(DEFAULT_QA));
  while (f.qa.length < 10) f.qa.push({ q: '', a: '', show: false });
  const workersBox = h('div', { class: 'grid c3' }, f.workers.map((w, i) => h('div', null,
    h('label', { class: 'f' }, 'Pracovník / plátce ' + (i + 1)),
    h('input', { type: 'text', value: w, oninput: (e) => { const old = f.workers[i]; f.workers[i] = e.target.value; if (f.rates[old] !== undefined) { f.rates[e.target.value] = f.rates[old]; delete f.rates[old]; } } }),
    h('label', { class: 'f', style: { marginTop: '6px' } }, 'Sazba (Kč/hod)'),
    h('input', { type: 'text', inputmode: 'decimal', value: f.rates[w] ?? '', oninput: (e) => { f.rates[f.workers[i]] = parseNum(e.target.value); } }))));
  const saveSettings = async () => {
    for (const k of ['mapei_discount', 'kabe_markup']) { // 28 → 0,28 (zadáno v procentech)
      let x = Number(f[k]) || 0; if (x > 1) x /= 100; f[k] = Math.min(Math.max(x, 0), 1);
    }
    try { await saveFirmaMerged(orig, f); orig = JSON.parse(JSON.stringify(f)); toast('Uloženo'); } catch (e) { toast(e.message, 'err'); }
  };
  const pw = h('input', { type: 'password', placeholder: 'Nové heslo (min. 8 znaků)' });
  const imp = h('div', { class: 'muted' });
  const bk = h('div', { class: 'muted', style: { marginTop: '8px' } });
  root.replaceChildren(
    h('div', { class: 'pagehead' }, h('h1', null, 'Nastavení')),
    h('div', { class: 'card' }, h('h2', null, 'Dodavatel – profil: ' + (P.label || S.profile)), h('div', { class: 'grid c2' },
      fld('Jméno / název', pinp('name')), fld('IČO', pinp('ico')), fld('Adresa', pinp('address'), 'span2'),
      fld('Telefon', pinp('phone')), fld('E-mail', pinp('email')), fld('Číslo účtu', pinp('account')), fld('Banka', pinp('bank')),
      fld('Instagram (odkaz)', inp('instagram')), fld('YouTube (odkaz)', inp('youtube')), fld('Slogan v záhlaví', inp('tagline'), 'span2'),
      fld('Platnost nabídky (dní)', inp('valid_days', 'number')), fld('Splatnost faktury (dní)', inp('due_days', 'number')),
      fld('Sleva MAPEI (0,28 = 28 %)', inp('mapei_discount', 'number')), fld('Přirážka KABE (0,10 = 10 %)', inp('kabe_markup', 'number')),
      fld('Obchodní podmínky v nabídce', h('textarea', { rows: 4, oninput: (e) => { f.terms = e.target.value; } }, f.terms || ''), 'span2')),
      h('div', { class: 'row end', style: { marginTop: '12px' } }, h('button', { class: 'btn gold', onclick: saveSettings }, 'Uložit'))),
    h('div', { class: 'card' }, h('h2', null, 'Pracovníci a hodinové sazby'), workersBox,
      h('div', { class: 'row end', style: { marginTop: '12px' } }, h('button', { class: 'btn gold', onclick: saveSettings }, 'Uložit'))),
    h('div', { class: 'card' }, h('h2', null, 'Premium – otázky a odpovědi (strana 2 nabídky)'),
      h('p', { class: 'muted' }, 'Do nabídky se vypíšou jen řádky se zaškrtnutým „Zobrazit“, v pořadí odshora. Odpověď držte do cca 450 znaků.'),
      f.qa.map((x, i) => h('div', { class: 'rc', style: { marginBottom: '8px' } }, h('div', { class: 'grid' },
        h('div', null, h('label', { class: 'f' }, 'Otázka ' + (i + 1)), h('input', { type: 'text', value: x.q, oninput: (e) => { x.q = e.target.value; } })),
        h('div', null, h('label', { class: 'f' }, 'Odpověď'), h('textarea', { rows: 3, oninput: (e) => { x.a = e.target.value; } }, x.a)),
        h('label', { class: 'row' }, h('input', { type: 'checkbox', style: { width: 'auto' }, checked: !!x.show, onchange: (e) => { x.show = e.target.checked; } }), 'Zobrazit v nabídce')))),
      h('div', { class: 'row end', style: { marginTop: '12px' } }, h('button', { class: 'btn gold', onclick: saveSettings }, 'Uložit'))),
    h('div', { class: 'card' }, h('h2', null, 'Heslo'), h('div', { class: 'row' }, h('div', { class: 'grow' }, pw),
      h('button', { class: 'btn', onclick: async () => {
        if (pw.value.length < 8) return toast('Heslo musí mít alespoň 8 znaků', 'err');
        const { error } = await sb.auth.updateUser({ password: pw.value });
        if (error) toast(error.message, 'err'); else { pw.value = ''; toast('Heslo změněno'); } } }, 'Změnit heslo'))),
    h('div', { class: 'card' }, h('h2', null, 'Záloha dat'),
      h('p', { class: 'muted' }, 'Uloží všechno (nabídky, vyúčtování, faktury, kontakty, ceníky, sklad, hodiny) do jednoho souboru. V telefonu zvolte „Uložit na Disk“, na počítači se soubor stáhne. Doporučeno aspoň jednou týdně.'),
      h('div', { class: 'row' },
        h('button', { class: 'btn gold', onclick: async (e) => { e.target.disabled = true; try { const r = await makeBackup(); if (!r.cancelled) bk.textContent = 'Záloha vytvořena: ' + r.name + ' (' + r.counts + ')'; } catch (er) { bk.textContent = 'Chyba: ' + er.message; } e.target.disabled = false; } }, 'Vytvořit zálohu'),
        h('button', { class: 'btn', onclick: async (e) => {
          if (!driveReady()) { bk.textContent = 'Google Disk ještě není připojen – chybí Client ID (návod pošle Claude).'; return; }
          e.target.disabled = true; bk.textContent = 'Ukládám na Disk…';
          try { const r = await backupToDrive(); bk.textContent = 'Uloženo na Google Disk: složka „JL-OBKLADY zálohy“, soubor ' + r.name + ' (' + r.counts + ')'; }
          catch (er) { bk.textContent = 'Chyba: ' + er.message; } e.target.disabled = false; } }, 'Uložit zálohu na Disk'),
        h('label', { class: 'btn ghost', style: { cursor: 'pointer' } }, 'Obnovit ze zálohy', h('input', { type: 'file', accept: '.json,application/json', style: { display: 'none' }, onchange: async (e) => {
          const file = e.target.files[0]; if (!file) return;
          if (!(await confirmBox('Obnovit data ze zálohy? Záznamy se stejným číslem se přepíšou stavem ze zálohy; ostatní zůstanou.'))) return;
          try { const r = await restoreBackup(file, (m) => { bk.textContent = 'Obnovuji ' + m; }); bk.textContent = 'Obnoveno (' + r + ').'; } catch (er) { bk.textContent = 'Chyba: ' + er.message; } e.target.value = ''; } }))),
      bk),
    h('div', { class: 'card' }, h('h2', null, 'Import ceníků'),
      h('p', { class: 'muted' }, `Načte do databáze výchozí ceníky, firmu a kontakty (stávající položky se nepřepisují). Nyní v databázi: ${S.prices.length} položek.`),
      h('button', { class: 'btn ghost', onclick: async (e) => { e.target.disabled = true; try { const n = await importSeed((a, b) => { imp.textContent = `Importuji ${a}/${b}…`; }); imp.textContent = `Hotovo, přidáno ${n} položek.`; } catch (er) { imp.textContent = 'Chyba: ' + er.message; } e.target.disabled = false; } }, 'Importovat ceníky'), imp),
    h('p', { class: 'muted' }, 'Verze aplikace ' + (window.__ver || '')));
}
