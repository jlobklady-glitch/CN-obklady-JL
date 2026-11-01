// Průvodce skladby: po výběru položky „Pokládka dlažby / obkladu“ nabídne doplnění všech navazujících prací a materiálu.
import { h, kc, parseNum, toast } from './util.js';
import { S, priceFor, displayName, displayUnit } from './store.js';
import { MAT, sponaRe, plan, defaults, parseFormat, triggerRe } from './skladba.js';

export const guideApplies = (p) => (p.category === 'podlaha' || p.category === 'stena') && triggerRe.test(p.name || '');

const workItem = (code) => S.prices.find((x) => x.category === 'prace' && x.code === code && x.active !== false);
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
  const re = l.mat ? MAT[l.mat].re : sponaRe(l.joint);
  const spec = l.mat ? MAT[l.mat] : {};
  let c = S.prices.filter((p) => p.category === 'mapei' && p.active !== false && re.test(String(p.name)));
  if (spec.color) { const k = new RegExp('\\s' + P.groutColor + '\\s'); const cc = c.filter((p) => k.test(String(p.name))); c = cc; }
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
      if (it) { const pr = priceFor(it, l.qty); o.row = { typ: 'prace', item_id: it.id, name: it.name, unit: it.unit, qty: l.qty, price: pr, disc: 0 }; }
      else { o.miss = `Položka ${l.code} chybí v ceníku prací – načtěte ceník 2026`; o.row = { typ: 'prace', name: l.name, unit: l.unit, qty: l.qty, price: '', disc: 0 }; }
    } else if (l.kind === 'mat') {
      const r = resolveMat(l, P);
      if (r) { o.row = { typ: 'mapei', item_id: r.p.id, name: displayName(r.p), unit: displayUnit(r.p), qty: r.n, price: priceFor(r.p, r.n), disc: 0 }; o.packs = `${r.n} × ${r.pack} ${r.p.unit || ''}`; o.cost = r.cost; }
      else { o.miss = `${l.name}: v ceníku MAPEI jsem nenašel vhodné balení – doplňte ručně`; o.row = { typ: 'mapei', name: l.name, unit: l.needUnit, qty: Math.ceil(l.need), price: '', disc: 0 }; }
    } else if (l.kind === 'other') {
      o.row = { typ: 'ostatni', name: l.name, unit: l.unit, qty: l.qty, price: '', disc: 0 };
    } else if (l.kind === 'premium') {
      const wk = workItem(l.workCode), wc = workItem('SPAR-002');
      const ker = resolveMat({ mat: 'kerapoxy', need: (lines.find((x) => x.id === 'm_spar') || {}).need || 0 }, P);
      const ult = resolveMat({ mat: 'ultracolor', need: (lines.find((x) => x.id === 'm_spar') || {}).need || 0 }, P);
      if (wk && wc && ker && ult) {
        const price = Math.round(((priceFor(wk, l.qty) - priceFor(wc, l.qty)) * l.qty + ker.cost - ult.cost) / l.qty);
        o.row = { typ: 'ostatni', name: l.name, unit: 'm²', qty: l.qty, price, disc: 0, premium: true };
      } else { o.miss = 'Příplatek za epoxid nelze spočítat (chybí položka v ceníku) – zadejte cenu ručně'; o.row = { typ: 'ostatni', name: l.name, unit: 'm²', qty: l.qty, price: '', disc: 0, premium: true }; }
    }
    o.price = o.row && o.row.price !== '' ? num(o.row.qty) * num(o.row.price) : 0;
    out.push(o);
  }
  return out;
}

export function openGuide({ item, row, onDone }) {
  const mode = item.category === 'podlaha' ? 'podlaha' : 'stena';
  const P = defaults(item, mode);
  P.A = num(row.qty) > 1 ? num(row.qty) : '';
  const fmt = parseFormat(item.name);
  const off = new Set(); const ovr = {};
  const listBox = h('div'); const totalEl = h('b');
  const redraw = () => {
    const rows = buildRows({ ...P, A: num(P.A), perim: num(P.perim) });
    listBox.replaceChildren();
    if (!num(P.A)) { listBox.append(h('p', { class: 'muted' }, 'Zadejte plochu (m²) – návrh se spočítá.')); totalEl.textContent = ''; return; }
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
    h('input', { type: 'text', inputmode: 'decimal', class: 'num', value: P[key] ?? '', placeholder: extra.ph || '', oninput: (e) => { P[key] = e.target.value === '' ? '' : num(e.target.value); redraw(); } }));
  const chk = (key, label, after) => h('label', { class: 'row', style: { gap: '6px', alignItems: 'center' } }, h('input', { type: 'checkbox', style: { width: 'auto' }, checked: !!P[key], onchange: (e) => { P[key] = e.target.checked; if (after) after(); redraw(); } }), label);
  const sel = (key, label, opts) => h('label', { style: { display: 'block' } }, h('span', { class: 'muted', style: { fontSize: '12px' } }, label),
    h('select', { onchange: (e) => { P[key] = e.target.value; redraw(); } }, opts.map(([v, t]) => h('option', { value: v, selected: P[key] === v }, t))));
  const colors = colorOptions();
  if (colors.length && !colors.some(([c]) => c === P.groutColor)) P.groutColor = colors[0][0];
  const wetBox = h('div', { class: 'grid c2', style: { marginTop: '6px' } });
  const drawWet = () => {
    wetBox.replaceChildren();
    if (!P.wet) return;
    wetBox.append(num_('wetWalls', 'Hydroizolace na stěnách (m²)', { ph: 'např. sprchový kout 6' }), num_('slopeA', 'Spádování – plocha sprchy (m²)'), num_('slopeT', 'Spádový potěr – průměrná tl. (cm)'),
      sel('drain', 'Odtok', [['none', 'bez žlabu / vpusti'], ['zlab', 'sprchový žlab'], ['vpust', 'bodová vpusť']]), num_('drainLen', 'Délka žlabu (bm)'),
      num_('corIn', 'Vnitřních rohů (ks)'), num_('corOut', 'Vnějších rohů (ks)'), num_('prost', 'Prostupů potrubí (ks)'), chk('test', 'Zkouška těsnosti (zatopení)'));
  };
  drawWet();
  const dlg = h('div', { class: 'modal-back', style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' } },
    h('div', { class: 'card', style: { maxWidth: '720px', width: '100%', maxHeight: '94vh', overflow: 'auto' } },
      h('h2', null, 'Průvodce skladby: ' + (mode === 'podlaha' ? 'dlažba na podlaze' : 'obklad na stěně')),
      h('p', { class: 'muted' }, `Zvolená položka: ${item.name}. Průvodce navrhne navazující práce a materiál MAPEI podle plochy. Řádky odškrtněte, nebo upravte množství. ⚠ = údaj není z technického listu, jen odhad – zkontrolujte.`),
      h('div', { class: 'grid c3' },
        num_('A', 'Plocha (m²)'), num_('fa', 'Formát – strana A (cm)'), num_('fb', 'Formát – strana B (cm)'),
        num_('thick', 'Tloušťka dlaždice (mm)'), num_('joint', 'Šířka spáry (mm)'), num_('perim', 'Obvod (bm) – prázdné = odhad'),
        num_('bedT', 'Tloušťka lepicího lože (mm)'), num_('penLayers', 'Počet vrstev penetrace'), sel('penType', 'Podklad', [['savy', 'savý (beton, cementový potěr) – Primer G'], ['nesavy', 'nesavý (starý obklad, hladký) – Eco Prim Grip Plus']])),
      h('div', { class: 'grid c2', style: { marginTop: '8px' } },
        mode === 'podlaha' ? chk('uneven', 'Podklad je nerovný – nivelační stěrka', () => { redraw(); }) : null,
        mode === 'podlaha' ? num_('nivT', 'Nivelace – tloušťka (mm, 1–10)') : null,
        mode === 'podlaha' ? chk('separ', 'Separační textilie Mapetex (velký formát)') : null,
        chk('spony', 'Nivelační spony + klínky + křížky'),
        mode === 'podlaha' ? chk('butter', 'Oboustranné lepení (buttering-floating)') : null,
        mode === 'podlaha' ? chk('dilatPasek', 'Okrajový dilatační pásek') : null,
        num_('dilBm', 'Dilatační spáry v ploše (bm)'),
        mode === 'podlaha' ? num_('stripBm', 'Spáry z podkladu k přenesení (bm)') : null,
        chk('sil', 'Silikon v koutech a dilatacích')),
      h('div', { class: 'grid c3', style: { marginTop: '8px' } },
        sel('grout', 'Spárování', [['cement', 'cementová – Ultracolor Plus'], ['epoxid', 'epoxidová – Kerapoxy CQ']]),
        sel('groutColor', 'Odstín spáry', colors.length ? colors.map(([c, n]) => [c, `${c} ${n}`]) : [['113', '113']]),
        h('div', null, chk('epoxPremium', 'Epoxid jako příplatek v PREMIUM'))),
      h('div', { style: { marginTop: '8px' } }, chk('wet', 'Koupelna / sprchový kout (hydroizolace, spád)', () => { drawWet(); }), wetBox),
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
          onDone({ base, prem, area: num(P.A) });
          dlg.remove();
          toast(`Přidáno ${base.length} řádků${prem.length ? ' + ' + prem.length + ' do PREMIUM' : ''}`);
        } }, 'Přidat do nabídky'))));
  document.body.appendChild(dlg);
  redraw();
}
