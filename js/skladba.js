// Průvodce skladby – výpočet. Čistá logika bez DOM; ceny a položky se dosazují až v pruvodce.js.
// Spotřeby: ok = z technických listů MAPEI (viz zdroj), odhad = pracovní předpoklad (⚠ ověřit / upravit).
//  - Ultracolor Plus: kg/m² = ((A+B)/(A·B))·C·D·1,6  (A,B rozměr dlaždice mm, C tloušťka mm, D šířka spáry mm) – TL MAPEI
//  - Keraflex Maxi S1: 1,2 kg/m² na 1 mm tloušťky lože – TL MAPEI
//  - Ultraplan Eco 20: 1,6 kg/m² na 1 mm, vrstva 1–10 mm – TL MAPEI
//  - Primer G: 0,05–0,2 kg/m²; Eco Prim Grip Plus: 0,2–0,3 kg/m² – TL MAPEI
//  - Mapesil AC: kartuše 310 ml vystačí na cca 12 bm spáry 5×5 mm – TL MAPEI
//  - Mapegum WPS: cca 1,5 kg/m² na 1 mm, min. 2 vrstvy křížem – TL MAPEI
//  - Mapecem Pronto: cca 20 kg/m² na 1 cm tloušťky – TL MAPEI

export const MAT = {
  primerG:   { re: /^PRIMER G$/i, label: 'MAPEI Primer G (penetrace)' },
  ecoGrip:   { re: /ECO\s+PRIM\s+GRIP\s+PLUS/i, label: 'MAPEI Eco Prim Grip Plus (penetrace nesavých podkladů)' },
  ultraplan: { re: /ULTRAPLAN\s+ECO\s+20/i, label: 'MAPEI Ultraplan Eco 20 (samonivelační stěrka)' },
  keraflex:  { re: /KERAFLEX\s+MAXI\s+S1/i, label: 'MAPEI Keraflex Maxi S1 (lepidlo, třída S1)' },
  mapetex:   { re: /MAPETEX\s+SEL\s+N/i, label: 'MAPEI Mapetex SEL N (separační textilie)' },
  ultracolor:{ re: /ULTRACOLOR\s+PLUS/i, label: 'MAPEI Ultracolor Plus (cementová spárovací hmota)', color: true, minPack: 5 },
  kerapoxy:  { re: /KERAPOXY\s+CQ/i, label: 'MAPEI Kerapoxy CQ (epoxidová spárovací hmota)', color: true },
  mapesil:   { re: /MAPESIL\s+AC\s+ZERO/i, label: 'MAPEI Mapesil AC Zero (silikon)', color: true },
  klin:      { re: /MAPELEVEL\s+PROWDG\s+\(1bag=100/i, label: 'MAPEI Mapelevel PROWDG klínky' },
  mapegum:   { re: /^MAPEGUM\s+WPS$/i, label: 'MAPEI Mapegum WPS (tekutá hydroizolace)' },
  band:      { re: /MAPEBAND\s+EASY\s+H130\s+role/i, label: 'MAPEI Mapeband Easy H130 (těsnicí páska)' },
  bandIn:    { re: /MAPEBAND\s+EASY\s+VNITŘNÍ\s+ROH/i, label: 'MAPEI Mapeband Easy vnitřní roh 90°' },
  bandOut:   { re: /MAPEBAND\s+EASY\s+VNĚJŠÍ\s+ROH/i, label: 'MAPEI Mapeband Easy vnější roh 270°' },
  manzeta:   { re: /MAPEBAND\s+EASY\s+manžeta\s+200/i, label: 'MAPEI Mapeband Easy manžeta 200×200' },
  mapecem:   { re: /^MAPECEM\s+PRONTO$/i, label: 'MAPEI Mapecem Pronto (rychlý spádový potěr)' },
};
// spony PROWDG C podle šířky spáry (v ceníku: 0,5 / 1,0 / 1,5 / 2,0 / 3,0 / 4,0 / 5,0 mm)
export const sponaRe = (joint) => new RegExp('MAPELEVEL\\s+PROWDG\\s+SPONY\\s+C\\s+' + String(joint).replace('.', '[,.]').replace(/^(\d)$/, '$1[,.]0') + '\\s*mm', 'i');

export const parseFormat = (name) => {
  const all = [...String(name || '').matchAll(/(\d{2,3})\s*[x×]\s*(\d{2,3})/gi)].map((m) => [Number(m[1]), Number(m[2])]);
  if (!all.length) return null;
  return all.sort((a, b) => Math.max(...b) - Math.max(...a))[0];
};

export const triggerRe = /^(Pokládka|Lepení)\s+(dlažby|obkladu)/i;

export function defaults(p, mode) {
  const f = parseFormat(p.name) || [60, 60];
  const big = Math.max(...f) >= 60;
  return {
    mode, A: 10, fa: f[0], fb: f[1], thick: Math.max(...f) >= 120 ? 6 : 9, joint: big ? 2 : 3, perim: 0,
    uneven: false, nivT: 3, penLayers: 1, penType: 'savy',
    separ: mode === 'podlaha' && big, spony: big, butter: mode === 'podlaha' && big, bedT: big ? 5 : 3,
    grout: 'cement', groutColor: '113', epoxPremium: true, sil: true, dilBm: 0, stripBm: 0, dilatPasek: mode === 'podlaha',
    wet: false, wetWalls: 0, corIn: 4, corOut: 0, prost: 2, drain: 'none', drainLen: 0.8, slopeA: 0, slopeT: 4, test: true,
    reserve: 5,
  };
}

const up = (x, n = 1) => Math.ceil(x * (1 + n / 100) - 1e-9);
const r2 = (x) => Math.round(x * 100) / 100;

// Vrací řádky návrhu. kind: work (kód z ceníku prací) | mat (materiál MAPEI, need v kg/ml/bm/ks) | other (bez ceny, doplnit)
export function plan(P) {
  const L = []; const A = Number(P.A) || 0;
  if (A <= 0) return L;
  const rs = Number(P.reserve) || 0;
  const perim = Number(P.perim) || Math.round(4 * Math.sqrt(A) * 10) / 10;
  const add = (o) => L.push({ on: true, ...o });
  const floor = P.mode === 'podlaha';
  const pen = Math.max(1, Number(P.penLayers) || 1);
  const penKey = P.penType === 'nesavy' ? 'ecoGrip' : 'primerG';
  const penRate = P.penType === 'nesavy' ? 0.25 : 0.1;
  const penNote = P.penType === 'nesavy' ? 'TL: 0,2–0,3 kg/m² na vrstvu (použito 0,25)' : 'TL: 0,05–0,2 kg/m² na vrstvu (použito 0,1)';

  // 1) příprava
  add({ id: 'prep', group: 'Příprava podkladu', kind: 'work', code: 'PRAC-004', name: 'Broušení, očištění a odmaštění podkladu', unit: 'm²', qty: A, ok: true });
  add({ id: 'vac', group: 'Příprava podkladu', kind: 'work', code: 'UKL-009', name: 'Přípravný úklid – vysátí prachu', unit: 'm²', qty: A, ok: true });
  let penTotal = 0;
  if (floor && P.uneven) {
    add({ id: 'pen1', group: 'Nivelace', kind: 'work', code: 'NIV-001', name: 'Penetrace podkladu před litím nivelační stěrky', unit: 'm²', qty: A * pen, ok: true });
    add({ id: 'dil', group: 'Nivelace', kind: 'work', code: 'NIV-002', name: 'Obvodový dilatační pásek se zástěrkou', unit: 'bm', qty: perim, ok: true });
    add({ id: 'niv', group: 'Nivelace', kind: 'work', code: 'NIV-004', name: `Samonivelační stěrka tl. ${P.nivT} mm`, unit: 'm²', qty: A, ok: true });
    penTotal += A * pen;
    const t = Number(P.nivT) || 3;
    add({ id: 'm_niv', group: 'Nivelace', kind: 'mat', mat: 'ultraplan', need: A * t * 1.6 * (1 + rs / 100), needUnit: 'kg', name: MAT.ultraplan.label, ok: t >= 1 && t <= 10, note: `TL: 1,6 kg/m² na 1 mm (vrstva 1–10 mm): ${r2(A * t * 1.6)} kg + rezerva ${rs} %${t > 10 ? ' – POZOR, tloušťka mimo rozsah 1–10 mm' : ''}` });
  }
  add({ id: 'pen2', group: 'Penetrace před lepením', kind: 'work', code: 'PRAC-005', name: 'Penetrace podkladu před lepením', unit: 'm²', qty: A * pen, ok: true });
  penTotal += A * pen;
  add({ id: 'm_pen', group: 'Penetrace před lepením', kind: 'mat', mat: penKey, need: penTotal * penRate * (1 + rs / 100), needUnit: 'kg', name: MAT[penKey].label, ok: true, note: `${penNote}; celkem ${penTotal} m² penetrace` });

  // 2) hydroizolace + spád (mokrý provoz)
  if (P.wet) {
    const w = Number(P.wetWalls) || 0; const hm2 = (floor ? A : 0) + w;
    const sl = Number(P.slopeA) || 0;
    if (sl > 0) {
      const t = Number(P.slopeT) || 4;
      add({ id: 'slope', group: 'Spádování (sprchový kout)', kind: 'work', code: 'ZEDN-014', name: 'Cementový spádový potěr do žlabu / vpusti', unit: 'm²', qty: sl, ok: true });
      add({ id: 'm_slope', group: 'Spádování (sprchový kout)', kind: 'mat', mat: 'mapecem', need: sl * t * 20 * (1 + rs / 100), needUnit: 'kg', name: MAT.mapecem.label, ok: true, note: `TL: cca 20 kg/m² na 1 cm; ${sl} m² × prům. ${t} cm` });
    }
    if (P.drain === 'zlab') {
      add({ id: 'zlab', group: 'Sprchový žlab / vpusť', kind: 'work', code: 'HYDR-024', name: 'Montáž sprchového nerezového žlabu vč. usazení a napojení', unit: 'ks', qty: 1, ok: true });
      add({ id: 'zlab2', group: 'Sprchový žlab / vpusť', kind: 'work', code: 'HYDR-010', name: 'Napojení a utěsnění příruby žlabu', unit: 'bm', qty: Number(P.drainLen) || 0.8, ok: true });
      add({ id: 'zlab3', group: 'Sprchový žlab / vpusť', kind: 'work', code: 'HYDR-022', name: 'Těsnicí manžeta pod žlab', unit: 'ks', qty: 1, ok: true });
      add({ id: 'spadp', group: 'Sprchový žlab / vpusť', kind: 'work', code: 'MONT-013', name: 'Příplatek za pokládku do spádu', unit: 'm²', qty: sl || A, ok: true });
    } else if (P.drain === 'vpust') {
      add({ id: 'vp', group: 'Sprchový žlab / vpusť', kind: 'work', code: 'KOMP-006', name: 'Montáž sprchového odtoku / bodové vpusti', unit: 'ks', qty: 1, ok: true });
      add({ id: 'vp2', group: 'Sprchový žlab / vpusť', kind: 'work', code: 'HYDR-026', name: 'Napojení hydroizolace na vpusť (manžeta)', unit: 'ks', qty: 1, ok: true });
      add({ id: 'spadp', group: 'Sprchový žlab / vpusť', kind: 'work', code: 'MONT-013', name: 'Příplatek za pokládku do spádu', unit: 'm²', qty: sl || A, ok: true });
    }
    add({ id: 'hpen', group: 'Hydroizolace', kind: 'work', code: 'HYDR-001', name: 'Penetrace pod hydroizolaci', unit: 'm²', qty: hm2, ok: true });
    add({ id: 'm_hpen', group: 'Hydroizolace', kind: 'mat', mat: 'primerG', need: hm2 * 0.1 * (1 + rs / 100), needUnit: 'kg', name: MAT.primerG.label, ok: true, note: 'TL: 0,05–0,2 kg/m² (použito 0,1) – pod hydroizolaci' });
    add({ id: 'band', group: 'Hydroizolace', kind: 'work', code: 'HYDR-005', name: 'Těsnicí páska do koutů a styků stěna–podlaha', unit: 'bm', qty: perim, ok: true });
    add({ id: 'm_band', group: 'Hydroizolace', kind: 'mat', mat: 'band', need: perim * 1.1, needUnit: 'bm', name: MAT.band.label, ok: false, note: `obvod ${perim} bm + 10 % přesahy (⚠ přesah je odhad)` });
    if (P.corIn > 0) { add({ id: 'ci', group: 'Hydroizolace', kind: 'work', code: 'HYDR-006', name: 'Těsnicí vnitřní rohy', unit: 'ks', qty: P.corIn, ok: true }); add({ id: 'm_ci', group: 'Hydroizolace', kind: 'mat', mat: 'bandIn', need: P.corIn, needUnit: 'ks', name: MAT.bandIn.label, ok: true, note: 'po 1 ks na roh' }); }
    if (P.corOut > 0) { add({ id: 'co', group: 'Hydroizolace', kind: 'work', code: 'HYDR-007', name: 'Těsnicí vnější rohy', unit: 'ks', qty: P.corOut, ok: true }); add({ id: 'm_co', group: 'Hydroizolace', kind: 'mat', mat: 'bandOut', need: P.corOut, needUnit: 'ks', name: MAT.bandOut.label, ok: true, note: 'po 1 ks na roh' }); }
    if (P.prost > 0) { add({ id: 'pr', group: 'Hydroizolace', kind: 'work', code: 'HYDR-008', name: 'Utěsnění prostupů potrubí manžetou', unit: 'ks', qty: P.prost, ok: true }); add({ id: 'm_pr', group: 'Hydroizolace', kind: 'mat', mat: 'manzeta', need: P.prost, needUnit: 'ks', name: MAT.manzeta.label, ok: true, note: 'po 1 ks na prostup' }); }
    add({ id: 'h1', group: 'Hydroizolace', kind: 'work', code: 'HYDR-002', name: 'Tekutá hydroizolace – 1. vrstva', unit: 'm²', qty: hm2, ok: true });
    add({ id: 'h2', group: 'Hydroizolace', kind: 'work', code: 'HYDR-003', name: 'Tekutá hydroizolace – 2. vrstva křížově', unit: 'm²', qty: hm2, ok: true });
    add({ id: 'm_h', group: 'Hydroizolace', kind: 'mat', mat: 'mapegum', need: hm2 * 1.5 * 2 * (1 + rs / 100), needUnit: 'kg', name: MAT.mapegum.label, ok: true, note: `TL: cca 1,5 kg/m² na 1 mm, min. tl. 2 mm ve 2 vrstvách → 3 kg/m² × ${r2(hm2)} m²` });
    if (P.test) add({ id: 'test', group: 'Hydroizolace', kind: 'work', code: 'HYDR-015', name: 'Zkouška těsnosti hydroizolace (zatopení)', unit: 'kpl', qty: 1, ok: true });
  }

  // 3) separace, dilatace
  if (floor && P.separ) {
    add({ id: 'sep', group: 'Separace', kind: 'work', code: 'SEP-001', name: 'Lepení separační textilie MAPEI Mapetex', unit: 'm²', qty: A, ok: true });
    add({ id: 'm_sep', group: 'Separace', kind: 'mat', mat: 'mapetex', need: A * 1.1, needUnit: 'm²', name: MAT.mapetex.label, ok: false, note: `${A} m² + 10 % přesahy (⚠ přesah je odhad, role 25 m²)` });
  }
  if (floor && P.dilatPasek) add({ id: 'edge', group: 'Dilatace', kind: 'work', code: 'HYDR-027', name: 'Okrajový dilatační pásek po obvodu', unit: 'bm', qty: perim, ok: true });
  if (floor && P.dilatPasek) add({ id: 'o_edge', group: 'Dilatace', kind: 'other', need: perim, needUnit: 'bm', name: 'Okrajový dilatační pásek (materiál)', unit: 'bm', qty: perim, ok: false, note: 'není v ceníku MAPEI – doplňte cenu' });
  if (floor && Number(P.stripBm) > 0) {
    add({ id: 'strip', group: 'Dilatace', kind: 'work', code: 'SEP-002', name: 'Přenesení dilatačních spár z podkladu (Mapetex Strip)', unit: 'bm', qty: P.stripBm, ok: true });
  }
  const dil = Number(P.dilBm) || 0;
  if (dil > 0) add({ id: 'dilp', group: 'Dilatace', kind: 'work', code: 'SPAR-009', name: 'Dilatační spáry v ploše – pružný tmel', unit: 'bm', qty: dil, ok: true });

  // 4) lepení
  const a = (Number(P.fa) || 60) * 10, b = (Number(P.fb) || 60) * 10;
  const bed = Number(P.bedT) || 3;
  if (P.spony) {
    const jl = 1 / (a / 1000) + 1 / (b / 1000); // bm spár na m²
    const clips = Math.ceil(A * jl / 0.35 * 1.0);
    add({ id: 'lev', group: 'Lepení', kind: 'work', code: 'KAM-021', name: 'Nivelační systém (spony + klínky)', unit: 'm²', qty: A, ok: true });
    add({ id: 'm_spona', group: 'Lepení', kind: 'mat', matRe: 'spona', joint: P.joint, need: clips, needUnit: 'ks', name: 'MAPEI Mapelevel PROWDG spony', ok: false, note: `⚠ odhad: 1 spona na cca 35 cm spáry → ${clips} ks (${r2(jl)} bm spár/m²)` });
    add({ id: 'm_klin', group: 'Lepení', kind: 'mat', mat: 'klin', need: clips, needUnit: 'ks', name: MAT.klin.label, ok: false, note: '⚠ odhad: 1 klínek na 1 sponu' });
  }
  add({ id: 'o_kriz', group: 'Lepení', kind: 'other', need: Math.ceil(A * 12), needUnit: 'ks', name: `Vymezovací křížky ${P.joint} mm`, unit: 'ks', qty: Math.ceil(A * 12), ok: false, note: '⚠ odhad 12 ks/m² – nejsou v ceníku, doplňte cenu' });
  if (P.butter) add({ id: 'butter', group: 'Lepení', kind: 'work', code: 'MONT-010', name: 'Příplatek za oboustranné lepení (buttering-floating)', unit: 'm²', qty: A, ok: true });
  add({ id: 'm_lep', group: 'Lepení', kind: 'mat', mat: 'keraflex', need: A * bed * 1.2 * (1 + rs / 100), needUnit: 'kg', name: MAT.keraflex.label, ok: true, note: `TL: 1,2 kg/m² na 1 mm; lože ${bed} mm (⚠ tloušťka lože je předpoklad) → ${r2(A * bed * 1.2)} kg + rezerva ${rs} %` });

  // 5) spárování
  const C = Number(P.thick) || 9, D = Number(P.joint) || 3;
  const kgm2 = ((a + b) / (a * b)) * C * D * 1.6;
  const epox = P.grout === 'epoxid';
  const sprWork = epox ? (Math.max(P.fa, P.fb) >= 120 ? 'SPAR-004' : 'SPAR-003') : 'SPAR-002';
  const gk = epox && !P.epoxPremium ? 'kerapoxy' : 'ultracolor';
  add({ id: 'spar', group: 'Spárování', kind: 'work', code: epox && !P.epoxPremium ? sprWork : 'SPAR-002', name: epox && !P.epoxPremium ? 'Spárování epoxidovou hmotou' : 'Spárování cementovou flexibilní hmotou', unit: 'm²', qty: A, ok: true });
  add({ id: 'm_spar', group: 'Spárování', kind: 'mat', mat: gk, need: A * kgm2 * (1 + rs / 100), needUnit: 'kg', name: MAT[gk].label, ok: !(gk === 'kerapoxy'), note: `vzorec TL: ((A+B)/(A·B))·C·D·1,6 = ${r2(kgm2)} kg/m² (dlaždice ${a}×${b} mm, tl. ${C}, spára ${D}) → ${r2(A * kgm2)} kg + rezerva ${rs} %${gk === 'kerapoxy' ? ' (⚠ hustota epoxidu 1,6 převzata z cementové hmoty – ověřit v TL Kerapoxy CQ)' : ''}` });
  if (epox && P.epoxPremium) {
    add({ id: 'prem', group: 'Spárování', kind: 'premium', name: 'PŘÍPLATEK: epoxidová spárovací hmota Kerapoxy CQ místo cementové (práce + materiál)', unit: 'm²', qty: A, ok: true, workCode: sprWork, kgm2, note: 'Cena = rozdíl epoxid − cement na m²; do nabídky jde jako příplatek v PREMIUM' });
  }
  if (P.sil) {
    add({ id: 'sil', group: 'Spárování', kind: 'work', code: 'SPAR-005', name: 'Sanitární silikon v koutech a dilatacích', unit: 'bm', qty: perim + dil, ok: true });
    add({ id: 'm_sil', group: 'Spárování', kind: 'mat', mat: 'mapesil', need: Math.ceil((perim + dil) / 12.4), needUnit: 'ks', name: MAT.mapesil.label, ok: true, note: 'TL: kartuš 310 ml ≈ 12 bm spáry 5×5 mm' });
  }
  // 6) úklid
  add({ id: 'cl1', group: 'Úklid', kind: 'work', code: 'UKL-001', name: 'Předběžné čištění po spárování', unit: 'm²', qty: A, ok: true });
  add({ id: 'cl2', group: 'Úklid', kind: 'work', code: epox ? 'UKL-002' : 'UKL-004', name: epox ? 'Odstranění epoxidového povlaku speciálním čističem' : 'Odstranění cementového závoje, finální čištění', unit: 'm²', qty: A, ok: true });
  return L;
}
