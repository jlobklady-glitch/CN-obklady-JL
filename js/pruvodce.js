// Průvodce skladby: po výběru položky „Pokládka dlažby / obkladu“ nabídne doplnění všech navazujících prací a materiálu.
import { h, kc, parseNum, toast } from './util.js';
import { S, priceFor, displayName, displayUnit } from './store.js';
import { MAT, sponaRe, plan, defaults, parseFormat, triggerRe, effArea, openings } from './skladba.js';

export const guideApplies = (p) => (p.category === 'podlaha' || p.category === 'stena') && triggerRe.test(p.name || '');

const workItem = (code) => S.prices.find((x) => ['prace', 'stena', 'podlaha', 'ostatni'].includes(x.category) && x.code === code && x.active !== false);
const num = (v, d = 0) => { const n = typeof v === 'number' ? v : parseNum(v); return Number.isFinite(n) ? n : d; };

function colorOptions() {
  const m = new Map();
  for (const p of S.prices) {
    if (p.category !== 'mapei' || p.active === false) continue;
    const x = /ULTRACOLOR\s+PLUS\s+(\d{3})\s+(?:ALU\s+)?(.+)$/i.exec(String(p.name));
    if (x && !m.has(x[1])) m.set(x[1], x[2].trim());
  }
  return [...m].sort();
}

export function resolveMat(l, P) {
  const re = l.re || (l.mat ? MAT[l.mat].re : sponaRe(l.joint));
  const spec = l.mat ? MAT[l.mat] : {};
  let c = S.prices.filter((p) => p.category === 'mapei' && p.active !== false && re.test(String(p.name)));
  if (spec.color) { const k = new RegExp('\\s' + (l.color || P.groutColor) + '\\s'); const cc = c.filter((p) => k.test(String(p.name))); c = cc; }
  if (spec.minPack) c = c.filter((p) => (Number(p.pack) || 1) >= spec.minPack);
  if (!c.length) return null;
  const best = c.map((p) => { const pack = Number(p.pack) || 1; const n = Math.max(1, Math.ceil(l.need / pack - 1e-9)); return { p, n, cost: n * priceFor(p, n), pack }; })
    .sort((x, y) => x.cost - y.cost || y.pack - x.pack)[0];
  return best;
}

// Převede návrh na řádky položek nabídky (+ informace pro zobrazení).
export function buildRows(P) {
  const lines = plan(P);
  const out = [];
  for (const l of lines) {
    const o = { l, row: null, miss: null, price: 0 };
    if (l.kind === 'work') {
      const it = workItem(l.code);
      if (it) { const pr = priceFor(it, l.qty); o.row = { typ: 'prace', item_id: it.id, name: l.label || it.name, unit: it.unit, qty: l.qty, price: pr, disc: 0 }; }
      else { o.miss = `Položka ${l.code} chybí v ceníku prací – načtěte ceník 2026`; o.row = { typ: 'prace', name: l.name, unit: l.unit, qty: l.qty, price: '', disc: 0 }; }
    } else if (l.kind === 'mat') {
      const r = resolveMat(l, P);
      if (r && MAT[l.mat] && MAT[l.mat].roll) {
        // role: zákazníkovi jen spotřebované metry (vč. rezervy), do objednávky a na sklad celé role
        const u = r.p.unit || 'bm', perU = Math.round(priceFor(r.p, 1) / r.pack * 100) / 100;
        o.row = { typ: 'mapei', item_id: r.p.id, name: `${String(r.p.name).trim()} | dle spotřeby`, unit: u, qty: Math.ceil(l.need * 10) / 10, price: perU, disc: 0, roll: r.pack };
        o.packs = `do objednávky ${r.n} × role ${r.pack} ${u} (zákazníkovi jen spotřeba)`; o.cost = r.cost;
      } else if (r) { o.row = { typ: 'mapei', item_id: r.p.id, name: displayName(r.p), unit: displayUnit(r.p), qty: r.n, price: priceFor(r.p, r.n), disc: 0 }; o.packs = `${r.n} × ${r.pack} ${r.p.unit || ''}`; o.cost = r.cost; }
      else { o.miss = `${l.name}: v ceníku MAPEI jsem nenašel vhodné balení – doplňte ručně`; o.row = { typ: 'mapei', name: l.name, unit: l.needUnit, qty: Math.ceil(l.need), price: '', disc: 0 }; }
    } else if (l.kind === 'other') {
      o.row = { typ: 'ostatni', name: l.name, unit: l.unit, qty: l.qty, price: '', disc: 0 };
    } else if (l.kind === 'premium') {
      const wk = workItem(l.workCode), wc = workItem('SPAR-002');
      const need0 = (lines.find((x) => x.id === 'm_spar') || {}).need || 0;
      const ker = resolveMat({ mat: 'kerapoxy', need: need0 }, P);
      const cl = resolveMat({ mat: 'cleaner', need: Math.ceil(l.qty / 10 * 2) }, P);
      const u2 = workItem('UKL-002'), u4 = workItem('UKL-004');
      const ult = resolveMat({ mat: 'ultracolor', need: (lines.find((x) => x.id === 'm_spar') || {}).need || 0 }, P);
      if (wk && wc && ker && ult) {
        const uk = u2 && u4 ? (priceFor(u2, l.qty) - priceFor(u4, l.qty)) * l.qty : 0;
        const price = Math.round(((priceFor(wk, l.qty) - priceFor(wc, l.qty)) * l.qty + uk + ker.cost + (cl ? cl.cost : 0) - ult.cost) / l.qty);
        o.row = { typ: 'ostatni', name: l.name, unit: 'm²', qty: l.qty, price, disc: 0, premium: true };
      } else { o.miss = 'Příplatek za epoxid nelze spočítat (chybí položka v ceníku) – zadejte cenu ručně'; o.row = { typ: 'ostatni', name: l.name, unit: 'm²', qty: l.qty, price: '', disc: 0, premium: true }; }
    }
    o.price = o.row && o.row.price !== '' ? num(o.row.qty) * num(o.row.price) : 0;
    out.push(o);
  }
  return out;
}

export function openGuide({ item, row, onDone, initial }) {
  const mode = item.category === 'podlaha' ? 'podlaha' : 'stena';
  const P = defaults(item, mode);
  P.A = num(row.qty) > 1 ? num(row.qty) : '';
  if (initial && initial.P) Object.assign(P, initial.P);
  const fmt = parseFormat(item.name);
  const off = new Set(initial && initial.off || []); const ovr = { ...(initial && initial.ovr || {}) };
  const listBox = h('div'); const totalEl = h('b');
  const redraw = () => {
    const rows = buildRows({ ...P, A: num(P.A), perim: num(P.perim) });
    listBox.replaceChildren();
    if (mode !== 'podlaha' && num(P.A)) { const o = openings(P); const ea = effArea({ ...P, A: num(P.A) }); if (Math.abs(ea - num(P.A)) > 0.005) listBox.append(h('div', { class: 'muted', style: { fontSize: '13px' } }, `Plocha obkladu po úpravě: ${Math.round(ea * 100) / 100} m² (zadáno ${num(P.A)} − otvory ${Math.round(o.deduct * 100) / 100} + špalety ${Math.round(o.areaSp * 100) / 100} + parapety ${Math.round(o.sillA * 100) / 100})`)); }
    if (!num(P.A)) { listBox.append(h('p', { class: 'muted' }, 'Zadejte plochu (m²) – návrh se spočítá.')); totalEl.textContent = ''; lastRows = []; return; }
    let lastG = '', sum = 0;
    for (const o of rows) {
      const l = o.l;
      if (l.group !== lastG) { listBox.append(h('div', { style: { fontWeight: '700', marginTop: '10px', borderBottom: '1px solid #ddd' } }, l.group)); lastG = l.group; }
      const isOff = off.has(l.id);
      const qv = ovr[l.id] ?? o.row.qty;
      const cb = h('input', { type: 'checkbox', style: { width: 'auto' }, checked: !isOff, onchange: (e) => { e.target.checked ? off.delete(l.id) : off.add(l.id); redraw(); } });
      const qin = h('input', { type: 'text', inputmode: 'decimal', class: 'num', style: { width: '70px' }, value: qv, onchange: (e) => { ovr[l.id] = num(e.target.value); redraw(); } });
      const linePrice = o.row.price !== '' ? num(qv) * num(o.row.price) : null;
      if (!isOff && linePrice) sum += linePrice * (o.row.premium ? 0 : 1);
      listBox.append(h('div', { style: { display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '5px 0', opacity: isOff ? 0.45 : 1 } },
        cb,
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', null, o.row.name, l.ok === false ? h('span', { title: 'neověřený údaj', style: { color: '#a15c00' } }, ' ⚠') : null, l.kind === 'premium' ? h('b', { style: { color: '#7a4a00' } }, ' [PREMIUM]') : null),
          l.note ? h('div', { class: 'muted', style: { fontSize: '12px' } }, l.note.replace(/⚠\s*/g, '')) : null,
          o.packs ? h('div', { class: 'muted', style: { fontSize: '12px' } }, 'Balení: ' + o.packs) : null,
          o.miss ? h('div', { style: { fontSize: '12px', color: '#b00' } }, o.miss) : null),
        qin, h('span', { class: 'muted', style: { width: '34px' } }, o.row.unit),
        h('span', { style: { width: '78px', textAlign: 'right' } }, linePrice === null ? '—' : kc(linePrice))));
    }
    totalEl.textContent = 'Základ nabídky + ' + kc(sum);
    lastRows = rows;
  };
  let lastRows = [];
  const num_ = (key, label, extra = {}) => h('label', { style: { display: 'block' } }, h('span', { class: 'muted', style: { fontSize: '12px' } }, label),
    h('input', { type: 'text', inputmode: 'decimal', class: 'num', 'data-k': key, value: P[key] ?? '', placeholder: extra.ph || '', oninput: (e) => { P[key] = e.target.value === '' ? '' : num(e.target.value); redraw(); } }));
  const txt_ = (key, label) => h('label', { style: { display: 'block' } }, h('span', { class: 'muted', style: { fontSize: '12px' } }, label), h('input', { type: 'text', value: P[key] ?? '', oninput: (e) => { P[key] = e.target.value; redraw(); } }));
  const chk = (key, label, after) => h('label', { class: 'row', style: { gap: '6px', alignItems: 'center' } }, h('input', { type: 'checkbox', style: { width: 'auto' }, checked: !!P[key], onchange: (e) => { P[key] = e.target.checked; if (after) after(); redraw(); } }), label);
  const sel = (key, label, opts, after) => h('label', { style: { display: 'block' } }, h('span', { class: 'muted', style: { fontSize: '12px' } }, label),
    h('select', { onchange: (e) => { P[key] = e.target.value; if (after) after(); redraw(); } }, opts.map(([v, t]) => h('option', { value: v, selected: P[key] === v }, t))));
  const colors = colorOptions();
  if (colors.length && !colors.some(([c]) => c === P.groutColor)) P.groutColor = colors[0][0];
  const wetBox = h('div', { class: 'grid c2', style: { marginTop: '6px' } });
  const drawWet = () => {
    wetBox.replaceChildren();
    if (!P.wet && !(mode === 'podlaha' && P.hydroOn)) return;
    if (mode !== 'podlaha') {
      wetBox.append(num_('wallBm', 'Délka mokrých stěn (bm, prázdné = celá plocha obkladu)'), num_('wetH', 'Výška hydroizolace stěn (m, min. 2)'),
        sel('hydro', 'Hydroizolace', [['wp200', 'folie Mapeguard WP 200'], ['smart', 'cementová Mapegum WPS + pásky do rohů']]), sel('wpAdh', 'Lepidlo na pásky a přesahy folie', [['1k', 'Mapeguard WP Adhesive 1K (4 kg)'], ['2k', 'Mapeguard WP Adhesive (2K, 6,65 kg)']]),
        num_('cornerBm', 'Svislé kouty (bm)'), num_('corIn', 'Vnitřních rohů – tvarovky (ks)'), num_('corOut', 'Vnějších rohů – tvarovky (ks)'), txt_('prostText', 'Prostupy vody: ks × průměr mm (např. 2×32, 1×110)'), chk('test', 'Zkouška těsnosti (zatopení)'));
      return;
    }
    const shower = !!P.wet;
    wetBox.append(...[
      shower ? num_('showerL', 'Sprcha – rozměr A (cm, min. 80)') : null, shower ? num_('showerW', 'Sprcha – rozměr B (cm, prázdné = stejný)') : null,
      num_('wallBm', shower ? 'Délka stěn s hydroizolací (bm, prázdné = L+W)' : 'Hydroizolace stěn – délka (bm, prázdné = jen podlaha + pásek u stěn)'), num_('wetH', 'Výška hydroizolace stěn (m, min. 2)'),
      shower ? chk('slope', 'Spádování sprchy (potěr + dlažba do spádu)') : null, shower ? num_('slopeT', 'Spádový potěr – průměrná tl. (cm)') : null,
      sel('drain', 'Odtok', [['none', 'bez žlabu / vpusti'], ['zlab', 'liniový / sprchový žlab'], ['vpust', 'podlahová vpusť (gula) / bodový odtok']], () => drawWet()),
      P.drain === 'zlab' ? sel('drainType', 'Typ žlabu', [['zed', 'u zdi'], ['roh', 'v rohu'], ['prostor', 'volně v prostoru'], ['vzed', 'integrovaný ve zdi']]) : null, P.drain === 'zlab' ? num_('drainLen', 'Délka žlabu (bm)') : null,
      P.drain === 'vpust' ? num_('drainN', 'Počet vpustí (ks)') : null,
      P.drain === 'vpust' ? num_('drainPlanes', 'Spádové roviny na jednu vpusť (čtvercová = 4)') : null,
      P.drain === 'vpust' ? num_('drainSlopeA', 'Plocha spádování dlažby k vpusti (m², prázdné = celá plocha)') : null,
      sel('hydro', 'Hydroizolace', [['wps', 'tekutá Mapegum WPS – plocha + pásky do koutů'], ['smart', 'cementová Mapelastic Smart (podlaha) + Mapegum WPS (stěny)'], ['wp200', 'PREMIUM: folie Mapeguard WP 200 (podlaha i stěny)']], () => drawWet()),
      P.hydro === 'wp200' ? sel('wpAdh', 'Lepidlo na pásky a přesahy folie', [['1k', 'Mapeguard WP Adhesive 1K (4 kg)'], ['2k', 'Mapeguard WP Adhesive (2K, 6,65 kg)']]) : null,
      P.hydro === 'smart' ? sel('hyReinf', 'Výztuž cementové hydroizolace', [['net', 'síťovina Mapenet 150'], ['sel', 'textilie Mapetex SEL N']]) : null,
      num_('corIn', 'Vnitřních rohů – tvarovky (ks)'), num_('corOut', 'Vnějších rohů – tvarovky (ks)'), txt_('prostText', 'Prostupy: ks × průměr mm (např. 2×32, 1×110)'),
      shower ? num_('cornerBm', 'Svislé kouty ve sprše (bm)') : null, chk('test', 'Zkouška těsnosti (zatopení)')].filter(Boolean));
  };
  drawWet();
  const dlg = h('div', { class: 'modal-back', style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' } },
    h('div', { class: 'card', style: { maxWidth: '720px', width: '100%', maxHeight: '94vh', overflow: 'auto' } },
      h('h2', null, (initial ? 'Úprava skladby: ' : 'Průvodce skladbou: ') + (mode === 'podlaha' ? 'dlažba na podlaze' : 'obklad na stěně')),
      h('p', { class: 'muted' }, `Zvolená položka: ${item.name}. Průvodce navrhne navazující práce a materiál MAPEI podle plochy. U nepotřebných řádků zrušte zaškrtnutí nebo upravte množství. ⚠ = údaj není z technického listu, jen odhad – zkontrolujte.`),
      h('div', { class: 'grid c3' },
        num_('A', 'Plocha (m²)'), num_('fa', 'Formát – strana A (cm)'), num_('fb', 'Formát – strana B (cm)'),
        num_('thick', 'Tloušťka dlaždice (mm)'), num_('joint', 'Šířka spáry (mm)'), num_('perim', 'Obvod (bm) – prázdné = odhad'),
        num_('bedT', 'Tloušťka lepicího lože (mm)'), num_('penLayers', 'Počet vrstev penetrace'), sel('penType', 'Podklad', [['beton', 'beton / cementový potěr – Primer G 1:2'], ['anhydrit', 'anhydrit – Primer G neředěný'], ['nesavy', 'nesavý (starý obklad) – Eco Prim Grip Plus']], () => { P.penLayers = P.penType === 'anhydrit' ? 2 : 1; const i = dlg.querySelector('[data-k="penLayers"]'); if (i) i.value = P.penLayers; })),
      h('div', { class: 'grid c2', style: { marginTop: '8px' } },
        chk('vacOn', 'Vysátí povrchu (přípravný úklid)'),
        mode === 'podlaha' ? chk('grind', 'Broušení podkladu (jen když je potřeba)') : null,
        mode === 'podlaha' ? chk('uneven', 'Podklad je nerovný – nivelační stěrka', () => { redraw(); }) : null,
        mode === 'podlaha' ? num_('nivT', 'Nivelace – tloušťka / výška lití (mm; do 10 = Ultraplan Eco 20, nad 10 = Ultraplan Maxi)') : null,
        mode === 'podlaha' ? chk('nivGrind', 'Před nivelací brousit / frézovat a vysát podklad (dle potřeby)') : null,
        mode === 'podlaha' ? chk('nivCrack', 'Sešití trhlin ocelovými sponami + epoxid (Eporip)', () => { redraw(); }) : null,
        mode === 'podlaha' ? num_('nivCrackBm', 'Trhliny k sešití (bm, jen při zaškrtnutí)') : null,
        mode === 'podlaha' ? sel('sep', 'Separační vrstva (ne v koupelně s folií)', [['none', 'bez separace'], ['mapetex', 'Mapetex (textilie proti trhlinám)'], ['wp200', 'Mapeguard WP 200 (folie)']]) : null,
        sel('adhesive', 'Lepidlo', [['auto', 'automaticky podle formátu'], ['maxi', 'Keraflex Maxi S1'], ['extra', 'Keraflex Extra S1'], ['ul1', 'Ultralite S1 Flex'], ['ul2', 'Ultralite S2 Flex']]),
        sel('silType', 'Silikon', [['ac', 'Mapesil AC (kyselý)'], ['lm', 'Mapesil LM (neutrální)']]),
        chk('spony', 'Nivelační systém (spony + klínky)'),
        chk('kriz', 'Vymezovací křížky'),
        mode === 'podlaha' ? chk('sokl', 'Sokl z dlažby (silikon, fabionek, rohy)') : null,
        mode === 'podlaha' ? num_('soklH', 'Výška soklu (cm)') : null,
        mode === 'podlaha' ? num_('soklBm', 'Obvod soklu (bm, prázdné = obvod místnosti)') : null,
        mode === 'podlaha' ? num_('doorN', 'Dveře – otvory v soklu (ks)') : null,
        mode === 'podlaha' ? num_('doorW', 'Dveře – šířka otvoru (cm)') : null,
        mode === 'podlaha' ? num_('soklIn', 'Vnitřní rohy soklu (ks)') : null,
        mode === 'podlaha' ? num_('soklOut', 'Vnější rohy soklu (ks)') : null,
        mode === 'podlaha' ? chk('butter', 'Oboustranné lepení (buttering-floating)') : null,
        mode === 'podlaha' ? chk('dilatPasek', 'Okrajový dilatační pásek') : null,
        num_('dilBm', 'Dilatační spáry v ploše (bm)'),
        mode === 'podlaha' ? num_('stripBm', 'Spáry z podkladu k přenesení (bm)') : null,
        chk('sil', 'Silikon v koutech a dilatacích')),
      mode !== 'podlaha' ? h('div', { class: 'grid c3', style: { marginTop: '8px' } },
        chk('scrape', 'Oškrabat podklad (kde to jde)'), num_('otvory', 'Otvory v obkladu (krabice, ks)'), h('span'),
        chk('levOn', 'Vyrovnávky (penetrace před i po)'), sel('levType', 'Vyrovnání', [['lepidlo', 'stěrkovým lepidlem (do 5 mm)'], ['malta', 'maltou PCI K01 (více vyrovnávek)']]), num_('levT', 'Tloušťka vyrovnání (mm)'),
        num_('levA', 'Plocha vyrovnání (m², prázdné = celá)'), h('span'), h('span'),
        chk('niche', 'Nika ve stěně'), num_('nicheN', 'Niky (ks)'), chk('nicheLed', 'Zapuštěné osvětlení v nice'),
        num_('nicheW', 'Nika – šířka (cm)'), num_('nicheH', 'Nika – výška (cm)'), num_('nicheD', 'Nika – hloubka (cm)'),
        sel('nicheEdge', 'Okraj niky', [['lista', 'ukončovací lišta po obvodu'], ['jolly', 'kamenické rohy (Jolly)'], ['none', 'bez']]),
        chk('openDeduct', 'Zadaná plocha je hrubá – odečíst dveře a okna'), h('span'), h('span'),
        num_('doorN', 'Dveře (ks)'), num_('doorW', 'Dveře – šířka (cm)'), num_('doorH', 'Dveře – výška (cm)'),
        chk('doorSp', 'Obkládat špalety dveří'), chk('doorTop', 'včetně horní špalety'), num_('doorDepth', 'Dveře – hloubka špalety (cm)'),
        num_('winN', 'Okna (ks)'), num_('winW', 'Okno – šířka (cm)'), num_('winH', 'Okno – výška (cm)'),
        chk('winSp', 'Obkládat špalety oken'), chk('winTop', 'včetně horní špalety'), num_('winDepth', 'Okno – hloubka špalety (cm)'),
        sel('winSill', 'Parapet okna', [['none', 'bez parapetu'], ['obklad', 'obkládaný obkladem'], ['miru', 'vyrobený na míru z dlažby']]), sel('spEdge', 'Vnější roh špalet (do místnosti)', [['lista', 'ukončovací lišta'], ['jolly', 'kamenický roh (Jolly)']]), h('span')) : null,
      h('div', { class: 'grid c3', style: { marginTop: '8px' } },
        sel('grout', 'Spárování', [['cement', 'cementová – Ultracolor Plus'], ['epoxid', 'epoxidová – Kerapoxy Easy Design']]),
        sel('groutColor', 'Odstín spáry', colors.length ? colors.map(([c, n]) => [c, `${c} ${n}`]) : [['113', '113']]),
        h('div', null, chk('epoxPremium', 'Epoxid jako příplatek v PREMIUM'))),
      h('div', { style: { marginTop: '8px' } }, mode === 'podlaha' ? sel('floorHyd', 'Hydroizolace podlahy', [['none', 'bez hydroizolace'], ['koupelna', 'koupelna / sprchový kout (hydroizolace + spád)'], ['jina', 'jen hydroizolace (garáž, technická místnost, vpusť)']], () => { P.wet = P.floorHyd === 'koupelna'; P.hydroOn = P.floorHyd === 'jina'; drawWet(); }) : chk('wet', 'Mokrá zóna – hydroizolace stěn', () => { drawWet(); }), wetBox),
      h('h3', { style: { marginTop: '14px' } }, 'Návrh řádků do nabídky'),
      listBox,
      h('div', { style: { marginTop: '10px' } }, totalEl),
      h('div', { class: 'row', style: { gap: '8px', marginTop: '12px', justifyContent: 'flex-end' } },
        h('button', { class: 'btn ghost', onclick: () => dlg.remove() }, 'Nepřidávat'),
        h('button', { class: 'btn gold', onclick: () => {
          const base = [], prem = [];
          for (const o of lastRows) {
            if (off.has(o.l.id)) continue;
            const r = { ...o.row }; if (ovr[o.l.id] !== undefined) r.qty = ovr[o.l.id];
            if (r.premium) { delete r.premium; prem.push(r); } else base.push(r);
          }
          if (!base.length && !prem.length) return toast('Nic k přidání', 'err');
          onDone({ base, prem, area: Math.round(effArea({ ...P, A: num(P.A) }) * 100) / 100, state: { P: { ...P }, off: [...off], ovr: { ...ovr } }, fmt: [num(P.fa), num(P.fb)] });
          dlg.remove();
          toast(`Přidáno ${base.length} řádků${prem.length ? ' + ' + prem.length + ' do PREMIUM' : ''}`);
        } }, initial ? 'Uložit změny skladby' : 'Přidat do nabídky'))));
  document.body.appendChild(dlg);
  redraw();
}
