// Automatický návrh orientační nabídky z rozměrů místností, které zadal zákazník na webu.
// Používá stejný průvodce skladby a ceníky (práce, MAPEI) jako ruční nabídka: práce i materiál bez obkladu a dlažby.
import { S, sb, newQuote, saveQuote } from './store.js';
import { defaults, parseFormat, triggerRe } from './skladba.js';
import { buildRows } from './pruvodce.js';

const FMT = { '30x60': [30, 60], '60x60': [60, 60], '60x120': [60, 120], '120x120': [120, 120], '120x280': [120, 280], nevim: [60, 60] };
const TYPE_LABEL = { koupelna: 'Koupelna', wc: 'WC', kuchyn: 'Kuchyň', chodba: 'Chodba', jine: 'Místnost' };
const PREP = new Set(['Příprava podkladu', 'Nivelace', 'Penetrace před vyrovnáním', 'Penetrace před lepením', 'Penetrace po vyrovnání', 'Penetrace', 'Vyrovnání stěny', 'Separace', 'Dilatace']);
const HYD = new Set(['Hydroizolace', 'Spádování sprchového koutu', 'Sprchový žlab / vpusť']);

// vybere z ceníku položku pokládky nejbližšího formátu
function tileItem(cat, fmtKey) {
  const want = FMT[fmtKey] || FMT.nevim;
  const wa = Math.min(...want) * Math.max(...want);
  let best = null, bd = Infinity;
  for (const p of S.prices) {
    if (p.category !== cat || p.active === false || !triggerRe.test(p.name || '')) continue;
    const f = parseFormat(p.name); if (!f) continue;
    const d = Math.abs(f[0] * f[1] - wa) + (Math.min(...f) === Math.min(...want) && Math.max(...f) === Math.max(...want) ? -1e6 : 0);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}
const workByCode = (code) => S.prices.find((x) => x.code === code && x.active !== false);
const cz = (x) => String(Math.round(x * 100) / 100).replace('.', ',');
function roomLabel(r, i, rooms) {
  if (r.name) return r.name;
  const same = rooms.filter((x) => x.type === r.type && !x.name);
  return (TYPE_LABEL[r.type] || 'Místnost') + (same.length > 1 ? ' ' + (same.indexOf(r) + 1) : '');
}

// Materiál se zákazníkovi nacení z ceníkové ceny (bez našich slev a příplatků)
function listPriceRow(row) {
  if (row.typ !== 'mapei') return row;
  const it = S.prices.find((x) => x.id === row.item_id);
  if (!it || !(Number(it.price) > 0)) return row;
  const price = row.roll ? Math.round(Number(it.price) / row.roll * 100) / 100 : Math.round(Number(it.price) * 100) / 100;
  return { ...row, price };
}
// Zóny hydroizolace stěn: sprcha (2 stěny, na každou stranu přesah 50 cm) a vana (stěna za vanou a boční stěna,
// délka zaokrouhlená nahoru na 0,5 m kvůli přesahům). Výška hydroizolace min. 2 m.
const up05 = (cm) => Math.ceil(cm / 50 - 1e-9) * 0.5;
function zoneWalls(r) {
  const parts = [];
  if (r.shower && r.showerL > 0) { parts.push([`sprcha – stěna ${r.showerL} cm + přesahy`, (r.showerL + 100) / 100], [`sprcha – stěna ${r.showerW || r.showerL} cm + přesahy`, ((r.showerW || r.showerL) + 100) / 100]); }
  if (r.bath && r.bathL > 0) { parts.push([`vana – stěna za vanou ${r.bathL} cm → ${up05(r.bathL)} m`, up05(r.bathL)], [`vana – boční stěna ${r.bathW || 70} cm → ${up05(r.bathW || 70)} m`, up05(r.bathW || 70)]); }
  return { parts, bm: Math.round(parts.reduce((a, x) => a + x[1], 0) * 100) / 100 };
}
const q2 = (x) => Math.round((Number(x) || 0) * 100) / 100;

// Vrací { items, missing, notes } – skutečné řádky nabídky s množstvím a jednotkou (nejdřív práce, potom materiál).
// Stejné položky z více místností se sčítají. Cena samotného obkladu a dlažby se nepočítá (zákazník ji ještě nevybral).
export function draftFromRooms(rooms) {
  const acc = new Map(); const notes = []; let missing = 0;
  const addRow = (row) => {
    const key = [row.typ, row.item_id || '', row.name, row.unit, row.price].join('|');
    const cur = acc.get(key);
    if (cur) cur.qty = q2(cur.qty + Number(row.qty)); else acc.set(key, { ...row, qty: q2(row.qty), disc: 0 });
  };
  const sections = [];
  const take = (P, sec) => {
    for (const o of buildRows(P)) {
      if (!o.row || (o.l.kind !== 'work' && o.l.kind !== 'mat')) continue;
      if (Number(o.l.qty ?? o.l.need) < 0.05 && /^(m²|bm|kg)$/.test(o.l.unit || o.l.needUnit || '')) continue; // prakticky nulová množství se nezobrazují
      const row = listPriceRow(o.row);
      const bad = !!o.miss || row.price === '' || !(Number(row.qty) > 0) || (/^(m²|bm|kg)$/.test(row.unit || '') && Number(row.qty) < 0.05);
      sec.lines.push({ group: o.l.group, kind: o.l.kind, name: row.name || o.l.name, need: o.l.need ?? o.l.qty, needUnit: o.l.needUnit || o.l.unit, note: o.l.note || '', est: o.l.ok === false, packs: o.packs || '', row: bad ? null : row, miss: o.miss || '' });
      if (bad) { missing++; if (o.miss) notes.push(o.miss); continue; }
      addRow(row);
    }
  };
  rooms = rooms || [];
  rooms.forEach((r, i) => {
    const lab = roomLabel(r, i, rooms);
    let demoA = 0;
    if (r.floor && r.L > 0 && r.W > 0) {
      const item = tileItem('podlaha', r.format);
      if (item) {
        const P = defaults(item, 'podlaha');
        P.A = q2(r.L * r.W); P.perim = Math.round(2 * (r.L + r.W) * 10) / 10;
        P.uneven = !!r.level; P.wet = !!r.waterproof || !!r.shower; P.test = false; P.sokl = !!r.sokl;
        const zw = zoneWalls(r);
        P.wetH = 2;
        if (r.walls && r.wallLen > 0 && r.waterproof) P.wallBm = 0.001; // hydroizolaci stěn počítá obklad stěn, ať se nepočítá dvakrát
        else if (zw.bm > 0) { P.wallBm = zw.bm; P.zoneWalls = true; } else P.wallBm = 0.001;
        if (r.shower) { P.slope = true; P.showerL = r.showerL || 90; P.showerW = r.showerW || r.showerL || 90; P.drain = 'zlab'; } else { P.slope = false; P.drain = 'none'; }
        const sec = { title: `${lab} – podlaha`, inputs: `podlaha ${cz(r.L)} × ${cz(r.W)} m = ${cz(P.A)} m², obvod ${cz(P.perim)} m; formát ${P.fa}×${P.fb} cm${r.format === 'nevim' ? ' (zadáno „nevím“, počítáno jako 60×60)' : ''}; spára ${P.joint} mm; rezerva materiálu ${P.reserve} %; nivelace ${r.level ? 'ano' : 'ne'}; hydroizolace podlahy ${P.wet ? 'ano, celá plocha ' + cz(P.A) + ' m²' : 'ne'}; sprcha ${r.shower ? P.showerL + '×' + P.showerW + ' cm se žlabem' : 'ne'}; vana ${r.bath ? r.bathL + '×' + r.bathW + ' cm' : 'ne'}; sokl ${r.sokl ? 'ano' : 'ne'}`, lines: [] };
        sections.push(sec); take(P, sec); demoA += P.A;
      } else notes.push(`${lab}: v ceníku chybí položka pokládky dlažby`);
    }
    if (r.walls && r.wallLen > 0 && r.wallH > 0) {
      const item = tileItem('stena', r.format);
      if (item) {
        const P = defaults(item, 'stena');
        P.A = q2(r.wallLen * r.wallH);
        const zw = zoneWalls(r);
        P.test = false;
        if (r.waterproof && r.hydroWalls === 'cele') { P.wet = true; P.wallBm = r.wallLen; P.wetH = Math.max(r.wallH, 2); P.fullWalls = true; }
        else if (r.waterproof && zw.bm > 0) { P.wet = true; P.wallBm = zw.bm; P.wetH = 2; P.zoneWalls = true; }
        else { P.wet = false; }
        if (r.niche) { P.niche = true; P.nicheN = Math.max(Number(r.nicheN) || 1, 1); P.nicheW = Number(r.nicheW) || 30; P.nicheH = Number(r.nicheH) || 60; P.nicheD = Number(r.nicheD) || 10; P.nicheEdge = 'lista'; if (r.waterproof) P.wet = true; }
        const sec = { title: `${lab} – stěny`, inputs: `obklad stěn: obvod ${cz(r.wallLen)} m × výška ${cz(r.wallH)} m = ${cz(P.A)} m²; formát ${P.fa}×${P.fb} cm${r.format === 'nevim' ? ' (zadáno „nevím“, počítáno jako 60×60)' : ''}; spára ${P.joint} mm; rezerva materiálu ${P.reserve} %; hydroizolace stěn ${P.wet ? (r.hydroWalls === 'cele' ? 'všechny obkládané stěny, výška ' + cz(P.wetH) + ' m' : 'zóny ' + zw.parts.map((x) => x[0] + ' = ' + cz(x[1]) + ' m').join('; ') + '; výška 2 m') : 'ne'}`, lines: [] };
        sections.push(sec); take(P, sec); demoA += P.A;
      } else notes.push(`${lab}: v ceníku chybí položka pokládky obkladu`);
    }
    if (r.remove && demoA > 0) {
      const dem = workByCode('DEM-006');
      if (dem) {
        const row = { typ: 'prace', item_id: dem.id, name: dem.name, unit: dem.unit, qty: demoA, price: Number(dem.price) || 0 };
        addRow(row);
        sections.push({ title: `${lab} – demontáž`, inputs: `odstranění starého obkladu a dlažby: podlaha + stěny = ${cz(demoA)} m²`, lines: [{ group: 'Demontáž', kind: 'work', name: dem.name, need: demoA, needUnit: dem.unit, note: 'plocha podlahy + obkládaných stěn', est: false, packs: '', row, miss: '' }] });
      }
      else notes.push('V ceníku chybí DEM-006 (demontáž obkladů)');
    }
    if (r.underfloor) notes.push(`${lab}: podlahové topení – v balíčku orientační měření vlhkosti podkladu`);
    if (r.format === 'nevim') notes.push(`${lab}: formát neznámý, počítáno jako 60×60 cm`);
  });
  const items = [...acc.values()];
  items.sort((a, b) => (a.typ === 'prace' ? 0 : 1) - (b.typ === 'prace' ? 0 : 1));
  return { items, missing, notes: [...new Set(notes)], sections };
}

const NOTE = 'Orientační cena práce a materiálu (lepidla, penetrace, hydroizolace, spárovací hmoty apod.) vypočtená z rozměrů, které jste zadali. Materiál je naceněn podle ceníkových cen výrobce. Cena samotného obkladu a dlažby zahrnuta není. Přesný položkový rozpočet s vybraným materiálem a zaměření na místě jsou součástí balíčku (viz poslední strana).';

// Vytvoří rozpracovanou nabídku z poptávky s místnostmi.
export async function createDraftQuote(r) {
  const { items, missing, notes } = draftFromRooms(r.rooms);
  const q = await newQuote();
  q.customer_name = r.name;
  q.customer_contact = [r.phone, r.email].filter(Boolean).join(', ');
  q.customer_address = r.location || '';
  q.project = [r.work_type, r.location].filter(Boolean).join(' – ');
  q.items = items;
  q.note = NOTE;
  q.inquiry_id = r.id; q.package_token = r.token || null; q.show_package = true;
  await saveQuote(q);
  // interní poznámka u poptávky: co zkontrolovat před odesláním
  const chk = [...notes, missing ? `${missing} prací se nepodařilo ocenit (chybí v ceníku), doplňte ručně` : ''].filter(Boolean);
  if (chk.length) { try { await sb.from('inquiries').update({ note: [r.note, 'Ke kontrole návrhu: ' + chk.join('; ')].filter(Boolean).join('\n') }).eq('id', r.id); } catch (_) { /* nepodstatné */ } }
  return { q, missing, notes };
}
