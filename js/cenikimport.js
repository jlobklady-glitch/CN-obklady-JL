// Import a export ceníků MAPEI a KABE ze souboru (.xlsx / .csv). Nic se nemaže – jen přepisují ceny, přidávají nové položky.
import { h, toast, parseNum } from './util.js';
import { S, sb } from './store.js';

let xlsxP;
function loadXlsx() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  return xlsxP || (xlsxP = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = 'vendor/xlsx.core.min.js';
    s.onload = () => res(window.XLSX); s.onerror = () => { xlsxP = null; rej(new Error('Nepodařilo se načíst knihovnu pro Excel.')); };
    document.head.appendChild(s);
  }));
}
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const clean = (s) => String(s ?? '').trim();

async function readRows(file) {
  const X = await loadXlsx();
  const wb = X.read(await file.arrayBuffer(), { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return X.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
}
function findHeader(rows, test) {
  for (let i = 0; i < Math.min(rows.length, 15); i++) { const hd = rows[i].map(norm); if (test(hd)) return i; }
  return -1;
}

// ---- MAPEI ----
export function parseMapei(rows) {
  const hi = findHeader(rows, (hd) => hd.some((x) => x.startsWith('nazev')) && hd.some((x) => x === 'kod'));
  if (hi < 0) throw new Error('Nenašel jsem hlavičku (Název výrobku, Kód, …). Je to ceník MAPEI „CenikRealizace“?');
  const hd = rows[hi].map(norm);
  const col = (f) => hd.findIndex(f);
  const cName = col((x) => x.startsWith('nazev')), cCode = col((x) => x === 'kod'), cCnt = col((x) => x.startsWith('pocet jednotek')),
    cUnit = col((x) => x === 'jednotka'), cPiece = col((x) => x.startsWith('cena za kus') && x.includes('vc'));
  if ([cName, cCode, cCnt, cPiece].some((c) => c < 0)) throw new Error('V souboru chybí sloupec (Název, Kód, Počet jednotek nebo „Cena za kus (vč. DPH)“).');
  const out = [];
  for (const r of rows.slice(hi + 1)) {
    const name = clean(r[cName]); if (!name) continue;
    const price = parseNum(r[cPiece]); if (!(price > 0)) continue;
    out.push({ category: 'mapei', code: clean(r[cCode]), name, unit: cUnit >= 0 ? clean(r[cUnit]) : '', pack: parseNum(r[cCnt]) || 1, price });
  }
  return out;
}
const mKey = (p) => `${clean(p.name)}|${clean(p.code)}|${Number(p.pack) || 1}`;

// ---- KABE ----
export const KABE_TIERS = 20;
export function kabeTemplateRows() {
  const head = ['Název', 'Jednotka', 'Poznámka', ...Array.from({ length: KABE_TIERS }, (_, i) => `do ${(i + 1) * 5} m²`)];
  const items = S.prices.filter((p) => p.category === 'kabe').map((p) => [p.name, p.unit || 'm²', (p.extra && p.extra.note) || '', ...Array.from({ length: KABE_TIERS }, (_, i) => ((p.extra && p.extra.tiers) || [])[i] ?? '')]);
  return [head, ...items];
}
export function parseKabe(rows) {
  const hi = findHeader(rows, (hd) => hd[0] === 'nazev' || hd[0].startsWith('nazev'));
  if (hi < 0) throw new Error('Nenašel jsem hlavičku. První sloupec má být „Název“. Nejlepší je stáhnout šablonu a upravit ji.');
  const out = [];
  for (const r of rows.slice(hi + 1)) {
    const name = clean(r[0]); if (!name) continue;
    const tiers = []; for (let i = 0; i < KABE_TIERS; i++) { const v = r[3 + i]; if (v === '' || v == null) break; tiers.push(parseNum(v)); }
    if (!tiers.length || tiers.some((t) => !(t > 0))) throw new Error(`Řádek „${name}“: ceny pásem musí být kladná čísla (od 1. pásma bez mezer).`);
    out.push({ category: 'kabe', code: '', name, unit: clean(r[1]) || 'm²', pack: 1, price: tiers[0], note: clean(r[2]), tiers });
  }
  return out;
}
const kKey = (p) => norm(p.name);

// ---- plán změn ----
export function plan(cat, incoming) {
  const keyOf = cat === 'mapei' ? mKey : kKey;
  const cur = new Map(); S.prices.filter((p) => p.category === cat).forEach((p) => cur.set(keyOf(p), p));
  const seen = new Set(), upd = [], add = [], same = [];
  for (const n of incoming) {
    const k = keyOf(n); if (seen.has(k)) continue; seen.add(k);
    const o = cur.get(k);
    if (!o) { add.push(n); continue; }
    const diff = cat === 'mapei' ? Math.abs(Number(o.price) - n.price) > 0.0049 : JSON.stringify((o.extra && o.extra.tiers) || []) !== JSON.stringify(n.tiers);
    (diff ? upd : same).push({ o, n });
  }
  const missing = [...cur.entries()].filter(([k]) => !seen.has(k)).map(([, p]) => p);
  return { upd, add, same, missing };
}
async function apply(cat, pl) {
  const rowOf = (n, o) => cat === 'mapei'
    ? { category: 'mapei', code: n.code, name: n.name, unit: n.unit, price: n.price, pack: n.pack, extra: (o && o.extra) || {}, active: true }
    : { category: 'kabe', code: '', name: o ? o.name : n.name, unit: n.unit, price: n.price, pack: 1, extra: { ...((o && o.extra) || {}), note: n.note || ((o && o.extra && o.extra.note) || ''), tiers: n.tiers }, active: true };
  const ups = pl.upd.map(({ o, n }) => ({ id: o.id, ...rowOf(n, o) }));
  for (let i = 0; i < ups.length; i += 200) {
    const { error } = await sb.from('price_items').upsert(ups.slice(i, i + 200), { onConflict: 'id' }); if (error) throw error;
  }
  const ins = pl.add.map((n) => rowOf(n, null));
  for (let i = 0; i < ins.length; i += 200) {
    const { error } = await sb.from('price_items').insert(ins.slice(i, i + 200)); if (error) throw error;
  }
  const { data, error } = await sb.from('price_items').select('*').order('name'); if (error) throw error;
  S.prices = data;
}

function showPlan(cat, pl, done) {
  const lab = cat === 'mapei' ? 'MAPEI' : 'KABE';
  const ex = (arr, f) => arr.slice(0, 8).map((x) => h('div', { class: 'muted', style: { fontSize: '12px' } }, f(x)));
  const dlg = h('div', { class: 'modal-back', style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' } },
    h('div', { class: 'card', style: { maxWidth: '560px', width: '100%', maxHeight: '90vh', overflow: 'auto' } },
      h('h2', null, `Import ceníku ${lab}`),
      h('p', null, `Beze změny: ${pl.same.length} · Změna ceny: `, h('b', null, String(pl.upd.length)), ' · Nové položky: ', h('b', null, String(pl.add.length)), ` · V aplikaci navíc (zůstanou): ${pl.missing.length}`),
      pl.upd.length ? h('div', null, h('b', null, 'Příklady změn cen'), ...ex(pl.upd, ({ o, n }) => cat === 'mapei' ? `${n.name}: ${o.price} → ${n.price} Kč` : `${o.name}: od ${((o.extra && o.extra.tiers) || [])[0] ?? o.price} → ${n.tiers[0]} Kč/m²`)) : null,
      pl.add.length ? h('div', { style: { marginTop: '6px' } }, h('b', null, 'Příklady nových'), ...ex(pl.add, (n) => `${n.name} (${n.price} Kč)`)) : null,
      h('p', { class: 'muted', style: { marginTop: '8px' } }, 'Nic se nemaže. Přepíšou se jen ceny a doplní se nové položky. Staré nabídky se nemění.'),
      h('div', { class: 'row', style: { gap: '8px', marginTop: '10px' } },
        h('button', { class: 'btn ghost', onclick: () => dlg.remove() }, 'Zrušit'),
        h('button', { class: 'btn gold', disabled: !pl.upd.length && !pl.add.length, onclick: async (e) => {
          e.target.disabled = true; e.target.textContent = 'Ukládám…';
          try { await apply(cat, pl); dlg.remove(); toast(`Hotovo: ${pl.upd.length} změn, ${pl.add.length} nových`); done(); } catch (er) { e.target.disabled = false; e.target.textContent = 'Provést import'; toast(er.message || String(er), 'err'); }
        } }, 'Provést import'))));
  document.body.appendChild(dlg);
}

// ---- PRÁCE (všechny listy: práce, obklad, dlažba, ostatní) ----
const PRACE_CATS = ['prace', 'stena', 'podlaha', 'ostatni'];
const SHEET_CAT = (name) => { const n = norm(name); if (n.startsWith('obklad')) return 'stena'; if (n.startsWith('dlazba')) return 'podlaha'; if (n === 'ostatni') return 'ostatni'; return 'prace'; };
const CAT_SHEET = { prace: 'Práce', stena: 'Obklad (stěna)', podlaha: 'Dlažba (podlaha)', ostatni: 'Ostatní' };
const NO_PREFIX = new Set(['prace', 'ostatni', 'obklad (stena)', 'dlazba (podlaha)']);

async function readWorkbook(file) {
  const X = await loadXlsx();
  const wb = X.read(await file.arrayBuffer(), { type: 'array' });
  return wb.SheetNames.map((n) => ({ name: n, rows: X.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: '' }) }));
}
export function parsePrace(sheets) {
  const out = [];
  for (const sh of sheets) {
    const hi = findHeader(sh.rows, (hd) => hd.includes('kod') && hd.some((x) => x.startsWith('nazev')) && hd.some((x) => x.startsWith('cena')));
    if (hi < 0) continue; // list bez hlavičky přeskočíme
    const hd = sh.rows[hi].map(norm), col = (f) => hd.findIndex(f);
    const cG = col((x) => x === 'skupina'), cC = col((x) => x === 'kod'), cN = col((x) => x.startsWith('nazev')), cU = col((x) => x === 'mj'),
      cP = col((x) => x.startsWith('cena')), cNote = col((x) => x === 'poznamka'), cEd = col((x) => x.startsWith('vase uprava'));
    const cat = SHEET_CAT(sh.name);
    for (const r of sh.rows.slice(hi + 1)) {
      const code = clean(r[cC]), name = clean(r[cN]); if (!name) continue;
      const price = parseNum(r[cP]); if (!(price >= 0)) continue;
      const ed = cEd >= 0 ? clean(r[cEd]) : '';
      const group = clean(r[cG]);
      out.push({ category: cat, code, name, unit: clean(r[cU]), price, pack: 1, group: NO_PREFIX.has(norm(sh.name)) || !group ? group : `${sh.name} – ${group}`, note: cNote >= 0 ? clean(r[cNote]) : '',
        del: /^smazat/i.test(ed), newPrice: ed && !/^smazat/i.test(ed) && Number.isFinite(parseNum(ed)) && parseNum(ed) > 0 ? parseNum(ed) : null, sheet: sh.name });
    }
  }
  return out;
}
const toks = (s) => new Set(norm(s).replace(/[^a-z0-9 ]/g, ' ').split(' ').filter((w) => w.length > 1));
export function similar(a, b) {
  const A = toks(a), B = toks(b); if (!A.size || !B.size) return false;
  let i = 0; A.forEach((w) => { if (B.has(w)) i++; });
  return i / (A.size + B.size - i) >= 0.45;
}
export function planPrace(incoming) {
  const cur = S.prices.filter((p) => PRACE_CATS.includes(p.category));
  const byCode = new Map(); cur.forEach((p) => { if (p.code) { if (!byCode.has(p.code)) byCode.set(p.code, []); byCode.get(p.code).push(p); } });
  const used = new Set(cur.map((p) => p.code).filter(Boolean)); incoming.forEach((n) => used.add(n.code));
  const nextCode = (code) => { const m = String(code).match(/^(.*?)(\d+)$/); if (!m) return code + '-2'; let n = Number(m[2]); const w = m[2].length; let c; do { n++; c = m[1] + String(n).padStart(w, '0'); } while (used.has(c)); used.add(c); return c; };
  const upd = [], add = [], same = [], del = [], renames = [], seen = new Set();
  for (const n of incoming) {
    const cands = n.code ? (byCode.get(n.code) || []) : [];
    let o = cands.find((p) => similar(p.name, n.name)) || null;
    if (!o && n.code) {
      // stejný kód, ale jiná položka → původní dostane nový kód, nová se přidá
      cands.forEach((p) => { if (!seen.has(p.id)) { renames.push({ o: p, code: nextCode(p.code) }); seen.add(p.id); } });
    }
    if (!o) { // bez kódu: zkus shodu přesným názvem
      o = !n.code ? cur.find((p) => norm(p.name) === norm(n.name) && p.category === n.category) || null : null;
    }
    if (n.del) { if (o) del.push(o); continue; }
    const price = n.newPrice ?? n.price;
    if (!o) { add.push({ ...n, price }); continue; }
    seen.add(o.id);
    const e = o.extra || {};
    const diff = Math.abs(Number(o.price) - price) > 0.0049 || clean(o.name) !== n.name || clean(o.unit) !== n.unit || (e.note || '') !== n.note || (e.group || '') !== n.group || o.category !== n.category;
    (diff ? upd : same).push({ o, n: { ...n, price } });
  }
  const touched = new Set([...upd, ...same].map((x) => x.o.id)); del.forEach((p) => touched.add(p.id)); renames.forEach((r) => touched.add(r.o.id));
  const missing = cur.filter((p) => !touched.has(p.id));
  return { upd, add, same, del, renames, missing };
}
async function applyPrace(pl) {
  const rowOf = (n, o) => ({ category: n.category, code: n.code, name: n.name, unit: n.unit, price: n.price, pack: 1, extra: { ...((o && o.extra) || {}), group: n.group, note: n.note }, active: true });
  const ups = [...pl.upd.map(({ o, n }) => ({ id: o.id, ...rowOf(n, o) })), ...pl.renames.filter((r) => !pl.upd.some((u) => u.o.id === r.o.id)).map((r) => ({ id: r.o.id, category: r.o.category, code: r.code, name: r.o.name, unit: r.o.unit || '', price: r.o.price, pack: r.o.pack || 1, extra: r.o.extra || {}, active: r.o.active !== false }))];
  // přejmenování kódu musí proběhnout dřív než vložení nových položek (kvůli čitelnosti, jedinečnost kódu DB nevyžaduje)
  for (let i = 0; i < ups.length; i += 200) { const { error } = await sb.from('price_items').upsert(ups.slice(i, i + 200), { onConflict: 'id' }); if (error) throw error; }
  const ins = pl.add.map((n) => rowOf(n, null));
  for (let i = 0; i < ins.length; i += 200) { const { error } = await sb.from('price_items').insert(ins.slice(i, i + 200)); if (error) throw error; }
  if (pl.del.length) { const { error } = await sb.from('price_items').delete().in('id', pl.del.map((p) => p.id)); if (error) throw error; }
  const { data, error } = await sb.from('price_items').select('*').order('name'); if (error) throw error;
  S.prices = data;
}
export function praceExportRows() {
  const out = {};
  for (const c of PRACE_CATS) {
    out[c] = [['Skupina', 'Kód', 'Název', 'MJ', 'Cena (Kč)', 'Poznámka', 'Pozn. k ceně', 'Vaše úprava / SMAZAT'],
      ...S.prices.filter((p) => p.category === c).map((p) => [(p.extra && p.extra.group) || '', p.code || '', p.name, p.unit || '', Number(p.price) || 0, (p.extra && p.extra.note) || '', '', ''])];
  }
  return out;
}
function showPracePlan(pl, done) {
  const ex = (arr, f) => arr.slice(0, 6).map((x) => h('div', { class: 'muted', style: { fontSize: '12px' } }, f(x)));
  const dlg = h('div', { class: 'modal-back', style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' } },
    h('div', { class: 'card', style: { maxWidth: '600px', width: '100%', maxHeight: '90vh', overflow: 'auto' } },
      h('h2', null, 'Import ceníku prací'),
      h('p', null, `Beze změny: ${pl.same.length} · Upraveno: `, h('b', null, String(pl.upd.length)), ' · Nové: ', h('b', null, String(pl.add.length)), ' · Ke smazání: ', h('b', null, String(pl.del.length)), ` · V aplikaci navíc (zůstanou): ${pl.missing.length}`),
      pl.renames.length ? h('p', { style: { color: '#a15c00' } }, `Pozor: ${pl.renames.length} položek má stejný kód jako jiná položka v souboru. Původní položky se nemažou, jen dostanou nový kód: `, pl.renames.slice(0, 6).map((r) => `${r.o.code} → ${r.code}`).join(', '), pl.renames.length > 6 ? '…' : '') : null,
      pl.upd.length ? h('div', null, h('b', null, 'Příklady úprav'), ...ex(pl.upd, ({ o, n }) => `${n.code} ${n.name}: ${o.price} → ${n.price} Kč`)) : null,
      pl.add.length ? h('div', { style: { marginTop: '6px' } }, h('b', null, 'Příklady nových'), ...ex(pl.add, (n) => `${n.code} ${n.name} (${n.price} Kč)`)) : null,
      pl.del.length ? h('div', { style: { marginTop: '6px' } }, h('b', null, 'Smazáno bude'), ...ex(pl.del, (p) => `${p.code} ${p.name}`)) : null,
      h('p', { class: 'muted', style: { marginTop: '8px' } }, 'Položky se párují podle kódu. Smaže se jen to, co máte ve sloupci „Vaše úprava / SMAZAT“ označeno slovem SMAZAT. Staré nabídky se nemění.'),
      h('div', { class: 'row', style: { gap: '8px', marginTop: '10px' } },
        h('button', { class: 'btn ghost', onclick: () => dlg.remove() }, 'Zrušit'),
        h('button', { class: 'btn gold', disabled: !pl.upd.length && !pl.add.length && !pl.del.length && !pl.renames.length, onclick: async (e) => {
          e.target.disabled = true; e.target.textContent = 'Ukládám…';
          try { await applyPrace(pl); dlg.remove(); toast(`Hotovo: ${pl.upd.length} upraveno, ${pl.add.length} nových, ${pl.del.length} smazáno`); done(); } catch (er) { e.target.disabled = false; e.target.textContent = 'Provést import'; toast(er.message || String(er), 'err'); }
        } }, 'Provést import'))));
  document.body.appendChild(dlg);
}

export function importButtons(cat, done) {
  if (cat === 'prace') {
    const file = h('input', { type: 'file', accept: '.xlsx,.xls', style: { display: 'none' }, onchange: async (e) => {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return;
      try {
        toast('Čtu soubor…');
        const inc = parsePrace(await readWorkbook(f));
        if (!inc.length) throw new Error('Nenašel jsem žádné řádky. Soubor má mít sloupce Skupina, Kód, Název, MJ, Cena (Kč).');
        showPracePlan(planPrace(inc), done);
      } catch (er) { toast(er.message || String(er), 'err'); }
    } });
    return h('span', { style: { display: 'inline-flex', gap: '6px', flexWrap: 'wrap' } },
      h('button', { class: 'btn ghost small', onclick: () => file.click() }, 'Import ze souboru'),
      h('button', { class: 'btn ghost small', onclick: async () => {
        const X = await loadXlsx(); const wb = X.utils.book_new(); const ex = praceExportRows();
        for (const c of PRACE_CATS) { const ws = X.utils.aoa_to_sheet(ex[c]); ws['!cols'] = [{ wch: 34 }, { wch: 10 }, { wch: 70 }, { wch: 8 }, { wch: 11 }, { wch: 40 }, { wch: 16 }, { wch: 24 }]; X.utils.book_append_sheet(wb, ws, CAT_SHEET[c]); }
        X.writeFile(wb, 'Cenik-praci.xlsx');
      } }, 'Stáhnout ceník (Excel)'), file);
  }
  const file = h('input', { type: 'file', accept: '.xlsx,.xls,.csv', style: { display: 'none' }, onchange: async (e) => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try {
      toast('Čtu soubor…');
      const rows = await readRows(f);
      const inc = cat === 'mapei' ? parseMapei(rows) : parseKabe(rows);
      if (!inc.length) throw new Error('V souboru nejsou žádné použitelné řádky.');
      showPlan(cat, plan(cat, inc), done);
    } catch (er) { toast(er.message || String(er), 'err'); }
  } });
  const btns = [h('button', { class: 'btn ghost small', onclick: () => file.click() }, 'Import ze souboru')];
  if (cat === 'kabe') btns.push(h('button', { class: 'btn ghost small', onclick: async () => {
    const X = await loadXlsx(); const ws = X.utils.aoa_to_sheet(kabeTemplateRows()); const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, ws, 'KABE');
    X.writeFile(wb, 'KABE-cenik-sablona.xlsx');
  } }, 'Stáhnout šablonu'));
  return h('span', { style: { display: 'inline-flex', gap: '6px', flexWrap: 'wrap' } }, ...btns, file);
}
