// Automatický návrh orientační nabídky z rozměrů místností, které zadal zákazník na webu.
// Používá stejný průvodce skladby a ceník prací 2026 jako ruční nabídka. Počítá jen práci (bez materiálu).
import { S, sb, newQuote, saveQuote } from './store.js';
import { defaults, parseFormat, triggerRe } from './skladba.js';
import { buildRows } from './pruvodce.js';

const FMT = { '30x60': [30, 60], '60x60': [60, 60], '60x120': [60, 120], '120x120': [120, 120], '120x280': [120, 280], nevim: [60, 60] };
const TYPE_LABEL = { koupelna: 'Koupelna', wc: 'WC', kuchyn: 'Kuchyň', chodba: 'Chodba', jine: 'Místnost' };
const PREP = new Set(['Příprava podkladu', 'Nivelace', 'Penetrace před vyrovnáním', 'Penetrace před lepením', 'Penetrace po vyrovnání', 'Penetrace', 'Vyrovnání stěny', 'Separace', 'Dilatace']);
const HYD = new Set(['Hydroizolace', 'Spádování sprchového koutu', 'Sprchový žlab / vpusť']);
const r0 = (x) => Math.round(x);

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

function sumWork(rows) {
  const g = { prep: 0, hyd: 0, lay: 0 }; let missing = 0;
  for (const o of rows) {
    if (!o.row || o.l.kind !== 'work') continue;
    if (o.miss) { missing++; continue; }
    const k = PREP.has(o.l.group) ? 'prep' : HYD.has(o.l.group) ? 'hyd' : 'lay';
    g[k] += o.price;
  }
  return { g, missing };
}

// Vrací { items, missing, notes } – položky nabídky (jen práce) a upozornění pro kontrolu.
export function draftFromRooms(rooms) {
  const items = []; const notes = []; let missing = 0;
  const add = (name, price) => { if (price > 0) items.push({ typ: 'prace', name, unit: 'kpl', qty: 1, price: r0(price), disc: 0 }); };
  rooms = rooms || [];
  rooms.forEach((r, i) => {
    const lab = roomLabel(r, i, rooms);
    const fmtTxt = r.format && r.format !== 'nevim' ? ` ${FMT[r.format][0]}×${FMT[r.format][1]} cm` : '';
    let demoA = 0;
    if (r.floor && r.L > 0 && r.W > 0) {
      const item = tileItem('podlaha', r.format);
      if (item) {
        const P = defaults(item, 'podlaha');
        P.A = Math.round(r.L * r.W * 100) / 100; P.perim = Math.round(2 * (r.L + r.W) * 10) / 10;
        P.uneven = !!r.level; P.wet = !!r.waterproof || !!r.shower; P.test = false; P.sokl = !!r.sokl;
        if (r.shower) { P.slope = true; P.showerL = r.showerL || 90; P.showerW = r.showerW || r.showerL || 90; P.drain = 'zlab'; } else { P.slope = false; P.drain = 'none'; }
        const { g, missing: m } = sumWork(buildRows(P)); missing += m; demoA += P.A;
        add(`${lab} – podlaha: příprava podkladu${r.level ? ' a nivelace' : ''}`, g.prep);
        add(`${lab} – podlaha: hydroizolace${r.shower ? ' a spádování sprchy' : ''}`, g.hyd);
        add(`${lab} – podlaha: pokládka dlažby${fmtTxt} včetně spárování a úklidu (${cz(P.A)} m²)`, g.lay);
      } else notes.push(`${lab}: v ceníku chybí položka pokládky dlažby`);
    }
    if (r.walls && r.wallLen > 0 && r.wallH > 0) {
      const item = tileItem('stena', r.format);
      if (item) {
        const P = defaults(item, 'stena');
        P.A = Math.round(r.wallLen * r.wallH * 100) / 100;
        P.wet = !!r.waterproof; P.test = false; P.wallBm = r.wallLen; P.wetH = r.wallH;
        const { g, missing: m } = sumWork(buildRows(P)); missing += m; demoA += P.A;
        add(`${lab} – stěny: příprava podkladu`, g.prep);
        add(`${lab} – stěny: hydroizolace`, g.hyd);
        add(`${lab} – stěny: obklad${fmtTxt} včetně spárování a úklidu (${cz(P.A)} m²)`, g.lay);
      } else notes.push(`${lab}: v ceníku chybí položka pokládky obkladu`);
    }
    if (r.remove && demoA > 0) {
      const dem = workByCode('DEM-006');
      if (dem) add(`${lab}: demontáž starého obkladu a dlažby (${cz(demoA)} m²)`, demoA * (Number(dem.price) || 0));
      else notes.push('V ceníku chybí DEM-006 (demontáž obkladů)');
    }
    if (r.underfloor) notes.push(`${lab}: podlahové topení – v balíčku orientační měření vlhkosti podkladu`);
    if (r.format === 'nevim') notes.push(`${lab}: formát neznámý, počítáno jako 60×60 cm`);
  });
  return { items, missing, notes };
}

const NOTE = 'Orientační cena za práci, bez materiálu. Vychází z rozměrů, které jste zadali. Přesný položkový rozpočet včetně ceny materiálu a zaměření na místě je součástí balíčku (viz poslední strana).';

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
