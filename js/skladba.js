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
  ultraplanMaxi: { re: /^ULTRAPLAN\s+MAXI$/i, label: 'MAPEI Ultraplan Maxi (samonivelační stěrka 3–30 mm)' },
  eporip:    { re: /^EPORIP\s+\(02\)\s+\/A\+B$/i, label: 'MAPEI Eporip (2K epoxid na sešití trhlin), souprava 2 kg' },
  sponaVln:  { re: /^Spona\s+vlnková\s+120\/6/i, label: 'Ocelová spona vlnková 120/6 (sešití trhlin)' },
  keraflex:  { re: /KERAFLEX\s+MAXI\s+S1\s+ZERO\s+ŠEDÝ/i, label: 'MAPEI Keraflex Maxi S1 (lepidlo, třída S1)' },
  keraflexX: { re: /KERAFLEX\s+EXTRA\s+S1\s+ZERO\s+ŠEDÝ/i, label: 'MAPEI Keraflex Extra S1 (lepidlo, třída S1)' },
  ultralite1:{ re: /ULTRALITE\s+S1\s+FLEX\s+ZERO\s+ŠEDÝ/i, label: 'MAPEI Ultralite S1 Flex (lehké lepidlo, třída S1)' },
  ultralite2:{ re: /ULTRALITE\s+S2\s+FLEX\s+\(LD\)\s+ŠEDÝ/i, label: 'MAPEI Ultralite S2 Flex (lehké lepidlo, třída S2)' },
  smart:     { re: /MAPELASTIC\s+SMART\s+\/A\+B/i, label: 'MAPEI Mapelastic Smart (cementová hydroizolace, 2K)' },
  mapenet:   { re: /MAPENET\s+150/i, roll: true, label: 'MAPEI Mapenet 150 (skelná síťovina)' },
  wp200:     { re: /MAPEGUARD\s+WP\s+200/i, roll: true, label: 'MAPEI Mapeguard WP 200 (hydroizolační a separační membrána)' },
  wpadh:     { re: /^MAPEGUARD\s+WP\s+ADHESIVE\s*$/i, label: 'MAPEI Mapeguard WP Adhesive (lepení přesahů)' },
  cleaner:   { re: /KERAPOXY\s+CLEANER\s+SPRAY/i, label: 'MAPEI UltraCare Kerapoxy Cleaner Spray 0,75 l' },
  mapesilLM: { re: /MAPESIL\s+LM/i, label: 'MAPEI Mapesil LM (neutrální silikon)', color: true },
  mapetex:   { re: /^MAPETEX\s+\(1\s*m\s*x\s*50/i, roll: true, label: 'MAPEI Mapetex (bílá netkaná textilie, systém proti trhlinám)' },
  mapetexSel:{ re: /MAPETEX\s+SEL\s+N/i, roll: true, label: 'MAPEI Mapetex SEL N (výztuž hydroizolace)' },
  ultracolor:{ re: /ULTRACOLOR\s+PLUS/i, label: 'MAPEI Ultracolor Plus (cementová spárovací hmota)', color: true, minPack: 5 },
  kerapoxy:  { re: /KERAPOXY\s+EASY\s+DESIGN/i, label: 'MAPEI Kerapoxy Easy Design (epoxidová spárovací hmota)', color: true },
  mapesil:   { re: /MAPESIL\s+AC\s+ZERO/i, label: 'MAPEI Mapesil AC Zero (silikon)', color: true },
  klin:      { re: /MAPELEVEL\s+PROWDG\s+\(1bag=100/i, label: 'MAPEI Mapelevel PROWDG klínky' },
  mapegum:   { re: /^MAPEGUM\s+WPS$/i, label: 'MAPEI Mapegum WPS (tekutá hydroizolace)' },
  band:      { re: /MAPEBAND\s+EASY\s+H130\s+role/i, roll: true, label: 'MAPEI Mapeband Easy H130 (těsnicí páska)' },
  bandIn:    { re: /MAPEBAND\s+EASY\s+VNITŘNÍ\s+ROH/i, label: 'MAPEI Mapeband Easy vnitřní roh 90°' },
  bandOut:   { re: /MAPEBAND\s+EASY\s+VNĚJŠÍ\s+ROH/i, label: 'MAPEI Mapeband Easy vnější roh 270°' },
  wpadh1k:   { re: /WP\s+ADHESIVE\s+1K/i, label: 'MAPEI Mapeguard WP Adhesive 1K (4 kg)' },
  manzeta4:  { re: /MAPEBAND\s+EASY\s+manžeta\s+400/i, label: 'MAPEI Mapeband Easy manžeta 400×400' },
  manzeta:   { re: /MAPEBAND\s+EASY\s+manžeta\s+200/i, label: 'MAPEI Mapeband Easy manžeta 200×200' },
  mapecem:   { re: /^MAPECEM\s+PRONTO$/i, label: 'MAPEI Mapecem Pronto (rychlý spádový potěr)' },
  topcem:    { re: /^TOPCEM\s+PRONTO$/i, label: 'MAPEI Topcem Pronto (spádový potěr)' },
};
// spony PROWDG C podle šířky spáry (v ceníku: 0,5 / 1,0 / 1,5 / 2,0 / 3,0 / 4,0 / 5,0 mm)
export const sponaRe = (joint) => new RegExp('MAPELEVEL\\s+PROWDG\\s+SPONY\\s+C\\s+' + String(joint).replace('.', '[,.]').replace(/^(\d)$/, '$1[,.]0') + '\\s*mm', 'i');

export const PC_SIZES = [[10, 24], [15, 38], [28, 50], [50, 75], [75, 110], [100, 130]];

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
    uneven: false, nivT: 3, nivCrack: false, nivCrackBm: '', nivGrind: false, penLayers: 1, penType: 'beton',
    sep: mode === 'podlaha' && big ? 'mapetex' : 'none', adhesive: 'auto', silType: 'ac', spony: big, kriz: !big, butter: mode === 'podlaha' && big, bedT: mode === 'podlaha' ? 4 : 3, hydro: mode === 'podlaha' ? 'wps' : 'wp200', hyReinf: 'net', wpAdh: '1k', prostText: '2×32', cornerBm: 0,
    grout: 'cement', groutColor: '113', epoxPremium: true, sil: true, dilBm: 0, stripBm: 0, dilatPasek: mode === 'podlaha',
    drainType: 'zed', wet: false, showerL: 90, showerW: '', wallBm: '', wetH: 2, slope: true, corIn: 4, corOut: 0, prost: 2, drain: 'none', drainLen: 0.8, slopeA: 0, slopeT: 4, test: true,
    reserve: 5,
    vacOn: true, grind: false, floorHyd: 'none', hydroOn: false, drainN: 1, drainSlopeA: '', drainPlanes: 4,
    sokl: false, soklH: 8, soklBm: '', soklIn: 4, soklOut: 0,
    scrape: true, levOn: false, levType: 'lepidlo', levA: '', levT: 3, otvory: 0,
    niche: false, nicheN: 1, nicheW: 30, nicheH: 60, nicheD: 10, nicheLed: false, nicheEdge: 'lista',
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
  const penRate = P.penType === 'nesavy' ? 0.25 : P.penType === 'anhydrit' ? 0.2 : 0.07;
  const penNote = P.penType === 'nesavy' ? 'TL: 0,2–0,3 kg/m² na vrstvu (použito 0,25)'
    : P.penType === 'anhydrit' ? 'anhydrit: neředěný, 2 vrstvy; TL uvádějí 0,08–0,2 kg/m² na vrstvu, počítáno raději nahoru (0,2); před penetrací přebrousit a vysát'
    : 'beton / cementový potěr: ředění 1 díl Primeru G : 2 díly vody; TL spotřebu pro ředění neuvádí – odhad ⚠: nanáší se cca 0,2 kg/m² roztoku, tj. cca 0,07 kg/m² koncentrátu';

  // 1) příprava
  if (floor) { if (P.grind) add({ id: 'prep', group: 'Příprava podkladu', kind: 'work', code: 'PRAC-004', name: 'Broušení podkladu vč. ořezu dilatačního pásu', unit: 'm²', qty: A, ok: true }); }
  else if (P.scrape) add({ id: 'prep', group: 'Příprava podkladu', kind: 'work', code: 'PRAC-018', name: 'Oškrabání podkladu (nátěry, tapety, nesoudržné omítky)', unit: 'm²', qty: A, ok: true, note: 'tam, kde to podklad dovoluje' });
  if (P.vacOn !== false) add({ id: 'vac', group: 'Příprava podkladu', kind: 'work', code: 'UKL-009', name: 'Přípravný úklid – vysátí prachu', unit: 'm²', qty: A, ok: true });
  let penTotal = 0;
  if (floor && P.uneven) {
    // ve sprchovém koutu se nivelace nedělá (řeší to spádový potěr)
    const shL = Number(P.showerL) || 0, shW = Number(P.showerW) || shL;
    const showerA = P.wet && P.slope && shL > 0 ? Math.max((shL * shW) / 10000, 0.64) : 0;
    const An = Math.max(A - showerA, 0);
    const sh = showerA > 0 ? ` (bez sprchového koutu ${r2(showerA)} m² – tam se nivelace nedělá, řeší ji spádový potěr)` : '';
    if (P.nivGrind) {
      add({ id: 'ngr', group: 'Nivelace', kind: 'work', code: 'NIV-007', name: 'Broušení / frézování podkladu před nivelací', unit: 'm²', qty: An, ok: true, note: 'dle potřeby (zaškrtnuto ručně) – množství upravte na skutečně broušenou plochu' });
      add({ id: 'nvac', group: 'Nivelace', kind: 'work', code: 'UKL-009', name: 'Vysátí prachu po broušení před nivelací', unit: 'm²', qty: An, ok: true });
    }
    if (P.nivCrack) {
      const cb = Number(P.nivCrackBm) || 0;
      add({ id: 'ncr', group: 'Nivelace', kind: 'work', code: 'NIV-006', name: 'Sešití trhlin v potěru ocelovými sponami vč. zalití epoxidem', unit: 'bm', qty: cb, ok: cb > 0, note: cb > 0 ? 'frézování příčných drážek, spony, zalití epoxidem; TL Ultraplan: trhliny v podkladu opravit epoxidem Eporip' : 'zadejte délku trhlin (bm)' });
      add({ id: 'm_ncr', group: 'Nivelace', kind: 'mat', mat: 'eporip', need: cb * 0.15, needUnit: 'kg', name: MAT.eporip.label, ok: false, note: `TL Eporip: 1,35 kg na 1 litr vyplňované dutiny; ⚠ odhad 0,15 kg na 1 bm trhliny vč. drážek pro spony (rozsah 0,5–2 kg/m² při lepení); trhlinu nechat před nivelací vytvrdnout (TL: úplné vytvrzení 7 dní)` });
      add({ id: 'm_nsp', group: 'Nivelace', kind: 'mat', mat: 'sponaVln', need: Math.ceil(cb * 3.4), needUnit: 'ks', name: MAT.sponaVln.label, ok: false, note: '⚠ odhad: 1 spona po cca 30 cm trhliny (3–4 ks na bm)' });
    }
    add({ id: 'pen1', group: 'Nivelace', kind: 'work', code: 'NIV-001', label: 'Aplikace penetrace před nivelací', name: 'Penetrace podkladu před litím nivelační stěrky', unit: 'm²', qty: An * pen, ok: true, note: sh ? sh.trim() : undefined });
    add({ id: 'dil', group: 'Nivelace', kind: 'work', code: 'NIV-002', name: 'Obvodový dilatační pásek se zástěrkou', unit: 'bm', qty: perim, ok: true });
    add({ id: 'o_dil', group: 'Nivelace', kind: 'other', need: perim, needUnit: 'bm', name: 'Okrajový dilatační pásek – obyčejný betonářský (materiál)', unit: 'bm', qty: perim, ok: false, note: 'není v ceníku MAPEI – doplňte cenu' });
    const t = Number(P.nivT) || 3;
    const thickLayer = t > 10;
    add({ id: 'niv', group: 'Nivelace', kind: 'work', code: thickLayer ? 'NIV-005' : 'NIV-004', name: thickLayer ? `Silnovrstvá samonivelační stěrka tl. ${t} mm` : `Samonivelační stěrka tl. ${t} mm`, unit: 'm²', qty: An, ok: true, note: sh ? sh.trim() : undefined });
    penTotal += An * pen;
    const rate = thickLayer ? 1.7 : 1.6;
    const key = thickLayer ? 'ultraplanMaxi' : 'ultraplan';
    add({ id: 'm_niv', group: 'Nivelace', kind: 'mat', mat: key, need: An * t * rate * (1 + rs / 100), needUnit: 'kg', name: MAT[key].label, ok: thickLayer ? t <= 30 : t >= 1, note: `TL: ${String(rate).replace('.', ',')} kg/m² na 1 mm (${thickLayer ? 'vrstva 3–30 mm' : 'vrstva 1–10 mm'}): ${r2(An * t * rate)} kg + rezerva ${rs} %${t > 30 ? ' – POZOR, nad 30 mm je třeba rozdělit do více vrstev' : ''}${thickLayer ? '; nad 10 mm použit Ultraplan Maxi' : ''}` });
  }
  if (!floor && P.levOn) {
    add({ id: 'pen0', group: 'Penetrace před vyrovnáním', kind: 'work', code: 'PRAC-005', label: 'Aplikace penetrace podkladu', name: 'Penetrace podkladu před vyrovnáním', unit: 'm²', qty: A * pen, ok: true });
    penTotal += A * pen;
    const la = Number(P.levA) || A, lt = Number(P.levT) || 3;
    if (P.levType === 'malta') {
      add({ id: 'wlev', group: 'Vyrovnání stěny', kind: 'work', code: lt <= 10 ? 'ZEDN-005' : 'ZEDN-006', name: lt <= 10 ? 'Vyrovnání stěn jádrovou omítkou / stěrkou do 10 mm' : 'Vyrovnání stěn lokální do 20 mm', unit: 'm²', qty: la, ok: lt <= 20, note: lt > 20 ? 'nad 20 mm už v ceníku není položka – upravte ručně' : undefined });
      add({ id: 'o_wlev', group: 'Vyrovnání stěny', kind: 'other', need: Math.ceil(la * lt * 1.6), needUnit: 'kg', name: 'Vyrovnávací malta PCI K01 (materiál)', unit: 'kg', qty: Math.ceil(la * lt * 1.6), ok: false, note: `není v ceníku – doplňte cenu; množství jen orientační (⚠ 1,6 kg/m² na 1 mm × ${r2(la)} m² × ${lt} mm)` });
    } else {
      add({ id: 'wlev', group: 'Vyrovnání stěny', kind: 'work', code: 'ZDN-043', name: 'Dorovnání podkladu stěrkovým lepidlem (do 5 mm)', unit: 'm²', qty: la, ok: lt <= 5, note: lt > 5 ? 'stěrkovým lepidlem jen do 5 mm – při větší tloušťce zvolte maltu' : undefined });
      add({ id: 'm_wlev', group: 'Vyrovnání stěny', kind: 'mat', mat: 'keraflex', need: la * lt * 1.2 * (1 + rs / 100), needUnit: 'kg', name: MAT.keraflex.label + ' – stěrkově na vyrovnání', ok: true, note: `TL: 1,2 kg/m² na 1 mm; ${r2(la)} m² × ${lt} mm + rezerva ${rs} %` });
    }
  }
  if (floor || P.levOn) add({ id: 'pen2', group: floor ? 'Penetrace před lepením' : 'Penetrace po vyrovnání', kind: 'work', code: 'PRAC-005', label: 'Aplikace penetrace podkladu', name: floor ? 'Penetrace podkladu před lepením' : 'Penetrace podkladu po vyrovnání', unit: 'm²', qty: A * pen, ok: true });
  else add({ id: 'pen2', group: 'Penetrace', kind: 'work', code: 'PRAC-005', label: 'Aplikace penetrace podkladu', name: 'Penetrace podkladu před obkladem', unit: 'm²', qty: A * pen, ok: true });
  penTotal += A * pen;
  add({ id: 'm_pen', group: 'Penetrace před lepením', kind: 'mat', mat: penKey, need: penTotal * penRate * (1 + rs / 100), needUnit: 'kg', name: MAT[penKey].label, ok: P.penType === 'nesavy' || P.penType === 'anhydrit', note: `${penNote}; celkem ${penTotal} m² penetrace` });

  // 2) hydroizolace + spád (mokrý provoz)
  // nika (jen obklad stěny): rozměry v cm
  const nN = !floor && P.niche ? Math.max(Number(P.nicheN) || 1, 1) : 0;
  const nW = Number(P.nicheW) || 0, nH = Number(P.nicheH) || 0, nD = Number(P.nicheD) || 0;
  const nicheA = nN * (nW * nH + 2 * nH * nD + 2 * nW * nD) / 1e4;
  const nicheTape = nN * (2 * (nW + nH) + 4 * nD) / 100;
  const nichePer = nN * 2 * (nW + nH) / 100;
  if (!floor && P.otvory > 0) add({ id: 'otv', group: 'Prostupy a otvory', kind: 'work', code: 'KAM-006', name: 'Výřez otvoru pro elektrokrabice / zásuvky', unit: 'ks', qty: Number(P.otvory), ok: true });
  if (nN > 0) {
    const mxf = Math.max(Number(P.fa) || 0, Number(P.fb) || 0);
    const jol = mxf <= 60 ? ['JOL-002', 'gres do 60×60'] : mxf <= 160 ? ['JOL-003', 'velký formát 60×120 až 80×160'] : ['JOL-004', 'XXL desky'];
    add({ id: 'nika', group: 'Nika', kind: 'work', code: 'MONT-008', name: `Obložení niky ${nW}×${nH}×${nD} cm`, unit: 'ks', qty: nN, ok: true, note: `plocha obkladu v nice ≈ ${r2(nicheA)} m² (zadní stěna + 4 boky)${P.wet ? '; započítáno do hydroizolace' : ''}` });
    if (P.nicheLed) {
      add({ id: 'nled', group: 'Nika', kind: 'work', code: 'KAM-009', name: 'Montáž LED lišty v nice (obvod niky)', unit: 'bm', qty: r2(nichePer), ok: true, note: 'zapuštěné osvětlení; instalaci LED pásku a zapojení provede elektrikář' });
      add({ id: 'nled2', group: 'Nika', kind: 'work', code: 'KAM-022', name: 'Řezání obkladu na míru pro LED lištu v nice', unit: 'bm', qty: r2(nichePer), ok: true, note: 'řezání navíc kolem lišty' });
      add({ id: 'o_nled', group: 'Nika', kind: 'other', need: r2(nichePer * 1.05), needUnit: 'bm', name: 'LED lišta do niky (materiál)', unit: 'bm', qty: r2(nichePer * 1.05), ok: false, note: 'není v ceníku – doplňte cenu (+ 5 % odřezky)' });
    }
    if (P.nicheEdge === 'jolly') add({ id: 'nedge', group: 'Nika', kind: 'work', code: jol[0], name: `Kamenický roh 45° (Jolly) po obvodu niky – ${jol[1]}`, unit: 'bm', qty: r2(nichePer), ok: true, note: 'pro keramiku / přírodní kámen zvolte JOL-001 / JOL-005 ručně' });
    else if (P.nicheEdge === 'lista') {
      add({ id: 'nedge', group: 'Nika', kind: 'work', code: 'KAM-008', name: 'Montáž ukončovací lišty po obvodu niky', unit: 'bm', qty: r2(nichePer), ok: true });
      add({ id: 'o_nedge', group: 'Nika', kind: 'other', need: r2(nichePer * 1.05), needUnit: 'bm', name: 'Ukončovací lišta kolem niky (materiál)', unit: 'bm', qty: r2(nichePer * 1.05), ok: false, note: 'není v ceníku – doplňte cenu (+ 5 % odřezky)' });
    }
  }
  const hyd = !!P.wet || (floor && !!P.hydroOn); // hydroizolace: koupelna, nebo samostatně (garáž, technická místnost s vpustí)
  if (hyd) {
    const wallBm = Number(P.wallBm) || (floor && P.wet ? ((Number(P.showerL) || 0) + (Number(P.showerW) || Number(P.showerL) || 0)) / 100 : 0);
    const wetH = Math.max(Number(P.wetH) || 2, 2); // minimum 2 m (přepočet až ve finálním vyúčtování)
    const w = (wallBm ? wallBm * wetH : floor ? 0 : A) + nicheA; const hm2 = (floor ? A : 0) + w; const wpHydro = P.hydro === 'wp200'; const wps = floor && P.hydro === 'wps'; const wpA = wpHydro ? (floor ? A : 0) + w : 0;
    const L = Number(P.showerL) || 0, W = Number(P.showerW) || L;
    const sl = floor && P.wet && P.slope && L > 0 ? Math.max((L * W) / 10000, 0.64) : 0; // min. sprcha 80×80 cm
    if (sl > 0) {
      const t = Number(P.slopeT) || 4;
      add({ id: 'slope', group: 'Spádování sprchového koutu', kind: 'work', code: 'SPD-001', name: 'Spádování sprchy – spádový potěr Topcem Pronto', unit: 'm²', qty: r2(sl), ok: true, note: `sprcha ${L}×${W} cm = ${r2(sl)} m² (minimum 80×80 cm)` });
      add({ id: 'm_slope', group: 'Spádování sprchového koutu', kind: 'mat', mat: 'topcem', need: sl * t * 20 * (1 + rs / 100), needUnit: 'kg', name: MAT.topcem.label, ok: true, note: `TL: 18–20 kg/m² na 1 cm (použito 20); ${r2(sl)} m² × prům. ${t} cm; před pokládkou počkat 24 h, zbytková vlhkost < 2 % po 4 dnech` });
      add({ id: 'slopeT', group: 'Spádování sprchového koutu', kind: 'work', code: 'SPD-002', name: 'Spádování dlažby ve sprše', unit: 'm²', qty: r2(sl), ok: true, note: 'nařezání dlažby do spádu a klínů kolem žlabu' });
    }
    // podlahová vpusť (gula): dlažba se řeže do klínů a spáduje k vpusti (ve sprše se spádování řeší výše)
    if (floor && P.drain === 'vpust' && !(sl > 0)) {
      const sa = Number(P.drainSlopeA) || A;
      add({ id: 'vpsl', group: 'Sprchový žlab / vpusť', kind: 'work', code: 'SPD-003', name: 'Spádování dlažby k podlahové vpusti – řezání do klínů', unit: 'm²', qty: r2(sa), ok: true, note: 'dlažba se přesně řeže podle skladby spádu: kolem vpusti 4 klínové kusy, dále od ní 2 kusy spádované proti sobě' });
      const pl = Math.max(Math.round(Number(P.drainPlanes) || 4), 1) * Math.max(Number(P.drainN) || 1, 1);
      add({ id: 'vpsl2', group: 'Sprchový žlab / vpusť', kind: 'work', code: 'SPD-004', name: 'Příplatek za spádovou rovinu u podlahové vpusti', unit: 'ks', qty: pl, ok: true, note: `${Math.max(Math.round(Number(P.drainPlanes) || 4), 1)} spádové roviny na vpusť (u čtvercové vpusti 4 – ze 4 rohů) × ${Math.max(Number(P.drainN) || 1, 1)} vpusť` });
    }
    if (floor && P.drain === 'zlab') {
      add({ id: 'zlab', group: 'Sprchový žlab / vpusť', kind: 'work', code: 'HYDR-024', name: 'Montáž sprchového nerezového žlabu vč. usazení a napojení', unit: 'ks', qty: 1, ok: true, note: 'typ žlabu zatím nemění cenu práce – dejte vědět, jaké jsou přirážky (volně v prostoru / roh / u zdi / ve zdi)' });
      add({ id: 'zlab2', group: 'Sprchový žlab / vpusť', kind: 'work', code: 'HYDR-010', name: 'Napojení a utěsnění příruby žlabu', unit: 'bm', qty: Number(P.drainLen) || 0.8, ok: true });
      add({ id: 'o_zlab', group: 'Sprchový žlab / vpusť', kind: 'other', name: `Sprchový žlab PP Drain Aqua – ${({ prostor: 'volně v prostoru', roh: 'v rohu', zed: 'u zdi', vzed: 'integrovaný ve zdi' })[P.drainType] || 'u zdi'} (s předinstalovanou textilií Mapeguard WP 200)`, unit: 'ks', qty: 1, need: 1, needUnit: 'ks', ok: false, note: 'není v ceníku – doplňte cenu; textilie na přírubě je již z výroby, hydroizolační folie se na ni navazuje přesahem (lepidlo WP Adhesive)' });
    } else if (floor && P.drain === 'vpust') {
      add({ id: 'vp', group: 'Sprchový žlab / vpusť', kind: 'work', code: 'KOMP-006', name: 'Montáž podlahové vpusti / sprchového odtoku', unit: 'ks', qty: Math.max(Number(P.drainN) || 1, 1), ok: true });
      add({ id: 'vp2', group: 'Sprchový žlab / vpusť', kind: 'work', code: 'HYDR-026', name: 'Napojení hydroizolace na vpusť (manžeta)', unit: 'ks', qty: Math.max(Number(P.drainN) || 1, 1), ok: true });
    }
    if (floor) add({ id: 'hpen', group: 'Hydroizolace', kind: 'work', code: 'HYDR-001', label: 'Aplikace penetrace pod hydroizolaci', name: 'Penetrace pod hydroizolaci', unit: 'm²', qty: hm2, ok: true });
    if (floor) add({ id: 'm_hpen', group: 'Hydroizolace', kind: 'mat', mat: 'primerG', need: hm2 * penRate * (1 + rs / 100), needUnit: 'kg', name: MAT.primerG.label, ok: true, note: `stejně jako před lepením (${penRate} kg/m² koncentrátu), 1 vrstva pod hydroizolaci` });
    const seams = wpHydro ? wpA * 1.0 : 0; // folie 1 m široká → spoj cca po 1 m
    const cb = Number(P.cornerBm) || 0;
    const tape = (floor ? perim : wallBm) + cb + seams + (P.wet ? nicheTape : 0);
    add({ id: 'band', group: 'Hydroizolace', kind: 'work', code: 'HYDR-005', name: 'Těsnicí páska do koutů, styků a spojů folie', unit: 'bm', qty: tape, ok: true });
    add({ id: 'm_band', group: 'Hydroizolace', kind: 'mat', mat: 'band', need: tape * 1.1, needUnit: 'bm', name: MAT.band.label, ok: false, note: `kouty ${r2(floor ? perim : wallBm)} bm${nicheTape ? ' + kouty niky ' + r2(nicheTape) + ' bm' : ''}${cb ? ' + svislé kouty ' + cb + ' bm' : ''}${seams ? ' + přebandážování spojů folie po 1 m ≈ ' + r2(seams) + ' bm' : ''}, + 10 % (⚠ přesah v TL není)` });
    if (wpHydro) {
      const kg = tape * 0.4 + wpA * 0.1;
      add({ id: 'm_wpadh_t', group: 'Hydroizolace', kind: 'mat', mat: P.wpAdh === '2k' ? 'wpadh' : 'wpadh1k', need: kg * (1 + rs / 100), needUnit: 'kg', name: (P.wpAdh === '2k' ? MAT.wpadh : MAT.wpadh1k).label + ' – pásky a přesahy', ok: false, note: `TL: ~0,4 kg/bm pro Mapeband Easy (údaj TL u Mapeguard UM 35) a ~0,1 kg/bm přesahu folie → ${r2(kg)} kg (⚠ pro WP 200 přesné číslo nenalezeno)` });
    }
    if (P.corIn > 0) { add({ id: 'ci', group: 'Hydroizolace', kind: 'work', code: 'HYDR-006', name: 'Těsnicí vnitřní rohy', unit: 'ks', qty: P.corIn, ok: true }); add({ id: 'm_ci', group: 'Hydroizolace', kind: 'mat', mat: 'bandIn', need: P.corIn, needUnit: 'ks', name: MAT.bandIn.label, ok: true, note: 'po 1 ks na roh' }); }
    if (P.corOut > 0) { add({ id: 'co', group: 'Hydroizolace', kind: 'work', code: 'HYDR-007', name: 'Těsnicí vnější rohy', unit: 'ks', qty: P.corOut, ok: true }); add({ id: 'm_co', group: 'Hydroizolace', kind: 'mat', mat: 'bandOut', need: P.corOut, needUnit: 'ks', name: MAT.bandOut.label, ok: true, note: 'po 1 ks na roh' }); }
    if (nN > 0) {
      add({ id: 'nci', group: 'Hydroizolace', kind: 'work', code: 'HYDR-006', name: 'Těsnicí vnitřní rohy v nice (tvarovky)', unit: 'ks', qty: nN * 4, ok: true });
      add({ id: 'm_nci', group: 'Hydroizolace', kind: 'mat', mat: 'bandIn', need: nN * 4, needUnit: 'ks', name: MAT.bandIn.label + ' – nika', ok: false, note: '⚠ 4 tvarovky na niku (zadní rohy); pásky podél hran jsou v řádku těsnicí pásky' });
    }
    // prostupy: „ks × průměr mm“ → manžeta Mapeguard PC podle rozsahu otvoru v názvu (10-24, 15-38, 28-50, 50-75, 75-110, 100-130 mm)
    const pr = [...String(P.prostText || '').matchAll(/(\d+)\s*[x×*]\s*(\d+)/gi)].map((m) => ({ n: Number(m[1]), d: Number(m[2]) }));
    const bySize = new Map(); let prTotal = 0;
    for (const x of pr) {
      prTotal += x.n;
      const sz = PC_SIZES.filter(([lo, hi]) => x.d >= lo && x.d <= hi).sort((u, v) => u[1] - v[1])[0];
      const key = sz ? sz.join('-') : 'jiny' + x.d;
      const e = bySize.get(key) || { sz, d: x.d, n: 0 }; e.n += x.n; bySize.set(key, e);
    }
    if (prTotal > 0) {
      add({ id: 'pr', group: 'Hydroizolace', kind: 'work', code: 'HYDR-008', name: 'Utěsnění prostupů potrubí manžetou', unit: 'ks', qty: prTotal, ok: true });
      for (const [key, e] of bySize) {
        if (e.sz) add({ id: 'm_pc' + key, group: 'Hydroizolace', kind: 'mat', re: new RegExp('MAPEGUARD\\s+PC\\s+' + e.sz[0] + '-' + e.sz[1] + '\\s*mm', 'i'), need: e.n, needUnit: 'ks', name: `MAPEI Mapeguard PC ${e.sz[0]}–${e.sz[1]} mm (manžeta prostupu)`, ok: true, note: `${e.n} ks pro prostup ø ${e.d} mm – manžeta podle rozsahu otvoru v názvu` });
        else add({ id: 'o_pc' + key, group: 'Hydroizolace', kind: 'other', name: `Manžeta prostupu ø ${e.d} mm – mimo rozsah Mapeguard PC (10–130 mm)`, unit: 'ks', qty: e.n, need: e.n, needUnit: 'ks', ok: false, note: 'zvolte manžetu ručně' });
      }
    }
    if (!floor && prTotal > 0) for (const x of pr) add({ id: 'drl' + x.d, group: 'Prostupy a otvory', kind: 'work', code: x.d <= 35 ? 'KAM-004' : 'KAM-005', name: `Vyvrtání otvoru ø ${x.d} mm v obkladu`, unit: 'ks', qty: x.n, ok: true });
    add({ id: 'h1', group: 'Hydroizolace', kind: 'work', code: 'HYDR-002', name: 'Tekutá hydroizolace – 1. vrstva', unit: 'm²', qty: hm2 - wpA, ok: true });
    add({ id: 'h2', group: 'Hydroizolace', kind: 'work', code: 'HYDR-003', name: 'Tekutá hydroizolace – 2. vrstva křížově', unit: 'm²', qty: hm2 - wpA, ok: true });
    const flr = floor ? A : 0;
    if (wpA > 0) {
      add({ id: 'wp', group: 'Hydroizolace', kind: 'work', code: 'HYDR-004', name: 'Vlepení hydroizolační folie Mapeguard WP 200', unit: 'm²', qty: wpA, ok: true });
      add({ id: 'm_wp', group: 'Hydroizolace', kind: 'mat', mat: 'wp200', need: wpA * 1.1, needUnit: 'm²', name: MAT.wp200.label, ok: true, note: `TL: role 1 × 30 m / 5 m, přesahy min. 5 cm; ${r2(wpA)} m² (podlaha + stěny) + 10 % přesahy a odpad` });
      add({ id: 'm_wpl', group: 'Hydroizolace', kind: 'mat', mat: 'ultralite1', need: wpA * 0.8 * 2 * (1 + rs / 100), needUnit: 'kg', name: MAT.ultralite1.label + ' – na vlepení folie', ok: false, note: 'TL Mapeguard WP 200 uvádí Ultralite S1 jako příklad lepidla C2; ⚠ lože 2 mm je předpoklad' });
    } else if (flr > 0 && wps) {
      // tekutá Mapegum WPS na podlaze: do koutů páska, výztužná síťovina se nepoužívá
    } else if (flr > 0 && P.hyReinf === 'sel') {
      add({ id: 'net', group: 'Hydroizolace', kind: 'work', code: 'HYDR-014', name: 'Zapuštění výztužné textilie do 1. vrstvy hydroizolace', unit: 'm²', qty: flr, ok: true });
      add({ id: 'm_net', group: 'Hydroizolace', kind: 'mat', mat: 'mapetexSel', need: flr * 1.1, needUnit: 'm²', name: MAT.mapetexSel.label, ok: false, note: `TL: netkaná polypropylenová textilie pro vyztužení hydroizolace; ⚠ přesah v TL nenalezen, počítáno +10 %` });
    } else if (flr > 0) {
      add({ id: 'net', group: 'Hydroizolace', kind: 'work', code: 'HYDR-014', name: 'Zapuštění sklotextilní síťoviny Mapenet 150 do 1. vrstvy', unit: 'm²', qty: flr, ok: true });
      add({ id: 'm_net', group: 'Hydroizolace', kind: 'mat', mat: 'mapenet', need: flr * 1.1, needUnit: 'bm', name: MAT.mapenet.label, ok: true, note: `TL: role 1 × 50 m, přesah min. 5 cm; ${r2(flr)} m² + 10 % přesahy a odpad` });
    }
    if (flr > 0 && !wpHydro && !wps) {
      add({ id: 'm_smart', group: 'Hydroizolace', kind: 'mat', mat: 'smart', need: flr * 1.6 * 2 * (1 + rs / 100), needUnit: 'kg', name: MAT.smart.label, ok: true, note: `podlaha: TL 1,6 kg/m² na 1 mm, min. 2 vrstvy, celkem min. 2 mm → 3,2 kg/m² × ${r2(flr)} m² (sada 30 kg)` });
    }
    if ((w > 0 || wps) && !wpHydro) add({ id: 'm_h', group: 'Hydroizolace', kind: 'mat', mat: 'mapegum', need: (w + (wps ? flr : 0)) * 1.5 * (1 + rs / 100), needUnit: 'kg', name: MAT.mapegum.label, ok: true, note: `${wps ? 'podlaha + stěny' : 'stěny'}: 2 vrstvy křížově; TL (CZ) cca 1,5 kg/m² na 1 mm, min. 1 mm → 1,5 kg/m² × ${r2(w + (wps ? flr : 0))} m²; novější TL uvádí 1,2 kg/m², počítáno vyšší hodnotou` });
    if (P.test) add({ id: 'test', group: 'Hydroizolace', kind: 'work', code: 'HYDR-015', name: 'Zkouška těsnosti hydroizolace (zatopení)', unit: 'kpl', qty: 1, ok: true });
  }

  // 3) separace, dilatace
  const sepOn = floor && !(hyd && P.hydro === 'wp200');
  if (sepOn && P.sep === 'mapetex') {
    add({ id: 'sep', group: 'Separace', kind: 'work', code: 'SEP-001', name: 'Lepení separační textilie MAPEI Mapetex', unit: 'm²', qty: A, ok: true });
    add({ id: 'm_sep', group: 'Separace', kind: 'mat', mat: 'mapetex', need: A * 1.1, needUnit: 'm²', name: MAT.mapetex.label, ok: false, note: `${A} m² + 10 % (role 1 × 50 m); textilie přemosťuje trhliny v podkladu, aby nebylo nutné dělat dilatace v dlažbě (Mapetex System: bílá netkaná textilie 1 m × 50 m); ⚠ postup lepení a přesahy v TL nenalezeny` });
  }
  if (sepOn && P.sep === 'wp200') {
    add({ id: 'sep', group: 'Separace', kind: 'work', code: 'HYDR-004', name: 'Vlepení membrány Mapeguard WP 200', unit: 'm²', qty: A, ok: true });
    add({ id: 'm_sep', group: 'Separace', kind: 'mat', mat: 'wp200', need: A * 1.1, needUnit: 'm²', name: MAT.wp200.label, ok: true, note: `TL: role 1 m × 30 m / 5 m, přesahy min. 5 cm; ${A} m² + 10 % přesahy a odpad` });
    add({ id: 'm_wpadh', group: 'Separace', kind: 'mat', mat: 'wpadh', need: A * 0.1, needUnit: 'kg', name: MAT.wpadh.label, ok: true, note: 'TL: cca 100 g na 1 bm přesahu; role 1 m široké ≈ 1 bm přesahu na m²' });
  }
  if (sepOn && P.sep !== 'none') {
    add({ id: 'm_sepad', group: 'Separace', kind: 'mat', mat: 'ultralite1', need: A * 0.8 * 2 * (1 + rs / 100), needUnit: 'kg', name: MAT.ultralite1.label + ' – na vlepení separační vrstvy', ok: false, note: 'TL: 0,8 kg/m² na 1 mm; ⚠ tloušťka 2 mm je předpoklad, schválení pro Mapetex v TL nenalezeno (Mapeguard WP 200: TL uvádí Ultralite S1 jako příklad lepidla C2)' });
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
    const clips = Math.ceil(A * jl * 3.15);
    add({ id: 'lev', group: 'Lepení', kind: 'work', code: 'KAM-021', name: 'Nivelační systém (spony + klínky)', unit: 'm²', qty: A, ok: true });
    add({ id: 'm_spona', group: 'Lepení', kind: 'mat', matRe: 'spona', joint: P.joint, need: clips, needUnit: 'ks', name: 'MAPEI Mapelevel PROWDG spony', ok: true, note: `TL Mapelevel PROWDG (tabulka na 10 m²: 60×60 = 105 ks, 120×60 = 77, 120×120 = 49, 200×200 = 28) → ${r2(clips / A)} ks/m² pro tento formát` });
    add({ id: 'm_klin', group: 'Lepení', kind: 'mat', mat: 'klin', need: clips, needUnit: 'ks', name: MAT.klin.label, ok: true, note: 'TL: tabulka uvádí počty klínků/spon společně – 1 klínek na 1 sponu' });
  }
  if (P.kriz !== false) add({ id: 'o_kriz', group: 'Lepení', kind: 'other', need: Math.ceil(A * 2 / (a * b / 1e6)), needUnit: 'ks', name: `Vymezovací křížky ${P.joint} mm`, unit: 'ks', qty: Math.ceil(A * 2 / (a * b / 1e6)), ok: false, note: '⚠ MAPEI počty neuvádí – odhad 2 ks na křížení spár; nejsou v ceníku, doplňte cenu' });
  if (P.butter) add({ id: 'butter', group: 'Lepení', kind: 'work', code: 'MONT-010', name: 'Příplatek za oboustranné lepení (buttering-floating)', unit: 'm²', qty: A, ok: true });
  const mx = Math.max(Number(P.fa) || 0, Number(P.fb) || 0);
  const ad = !P.adhesive || P.adhesive === 'auto' ? (mx <= 60 ? 'maxi' : mx <= 120 ? 'ul1' : 'ul2') : P.adhesive;
  const adMat = { maxi: 'keraflex', extra: 'keraflexX', ul1: 'ultralite1', ul2: 'ultralite2' }[ad];
  const At = A + (nicheA || 0);
  const adKg = ad === 'extra' ? 3 : ad === 'maxi' ? bed * 1.2 : bed * 0.8;
  const adNote = ad === 'extra' ? 'TL: 2,5–3 kg/m² pro standardní formáty (podle zubu hladítka) – použito 3 kg/m²'
    : `TL: ${ad === 'maxi' ? '1,2' : '0,8'} kg/m² na 1 mm lože; lože ${bed} mm (⚠ tloušťka lože je předpoklad)`;
  add({ id: 'm_lep', group: 'Lepení', kind: 'mat', mat: adMat, need: At * adKg * (1 + rs / 100), needUnit: 'kg', name: MAT[adMat].label, ok: true, note: `formát ${P.fa}×${P.fb} cm → ${adNote} → ${r2(A * adKg)} kg + rezerva ${rs} %` });

  // 5) spárování
  const C = Number(P.thick) || 9, D = Number(P.joint) || 3;
  const kgm2 = ((a + b) / (a * b)) * C * D * 1.6;
  const epox = P.grout === 'epoxid';
  const sprWork = epox ? (Math.max(P.fa, P.fb) >= 120 ? 'SPAR-004' : 'SPAR-003') : 'SPAR-002';
  const gk = epox && !P.epoxPremium ? 'kerapoxy' : 'ultracolor';
  add({ id: 'spar', group: 'Spárování', kind: 'work', code: epox && !P.epoxPremium ? sprWork : 'SPAR-002', name: epox && !P.epoxPremium ? 'Spárování epoxidovou hmotou' : 'Spárování cementovou flexibilní hmotou', unit: 'm²', qty: A, ok: true });
  add({ id: 'm_spar', group: 'Spárování', kind: 'mat', mat: gk, need: At * kgm2 * (1 + rs / 100), needUnit: 'kg', name: MAT[gk].label, ok: true, note: `vzorec ((A+B)/(A·B))·C·D·1,6 = ${r2(kgm2)} kg/m² (dlaždice ${a}×${b} mm, tl. ${C}, spára ${D}) → ${r2(A * kgm2)} kg + rezerva ${rs} %${gk === 'kerapoxy' ? ' (u Kerapoxy Easy Design jsem v TL našel jen tabulku, ta s tímto vzorcem sedí)' : ''}` });
  if (epox && !P.epoxPremium) add({ id: 'm_clean', group: 'Spárování', kind: 'mat', mat: 'cleaner', need: Math.ceil(A / 10 * 2), needUnit: 'ks', name: MAT.cleaner.label, ok: true, note: 'dle vaší praxe: 2 × 750 ml na cca 10 m²' });
  if (epox && P.epoxPremium) {
    add({ id: 'prem', group: 'Spárování', kind: 'premium', name: 'PŘÍPLATEK: epoxidová spárovací hmota Kerapoxy Easy Design místo cementové (práce, materiál, čistič)', unit: 'm²', qty: A, ok: true, workCode: sprWork, kgm2, note: 'Cena = rozdíl epoxid − cement na m²; do nabídky jde jako příplatek v PREMIUM' });
  }
  // sokl z dlažby (jen podlaha): vše v bm, silikon i ve svislých rozích o výšce soklu
  const soklOn = floor && P.sokl;
  const soklBm = soklOn ? (Number(P.soklBm) || perim) : 0;
  const soklH = Number(P.soklH) || 8;
  const sIn = Number(P.soklIn) || 0, sOut = Number(P.soklOut) || 0;
  const silVert = soklOn ? sIn * soklH / 100 : 0;
  if (soklOn) {
    add({ id: 'skl', group: 'Sokl', kind: 'work', code: 'KAM-011', name: `Montáž řezaného soklu z dlažby, výška ${soklH} cm`, unit: 'bm', qty: soklBm, ok: true, note: 'dlažbu na sokl započítejte do materiálu dlažby; horní spára se řeší silikonem níže' });
    if (soklH <= 10) add({ id: 'skl2', group: 'Sokl', kind: 'work', code: 'KAM-022', name: 'Řezání pásů soklu z dlažby na míru', unit: 'bm', qty: soklBm, ok: true });
    if (sIn > 0) add({ id: 'skl_in', group: 'Sokl', kind: 'work', code: 'KAM-013', label: 'Vnitřní roh soklu – spoj na tupo', name: 'Vnitřní roh soklu – spoj na tupo', unit: 'ks', qty: sIn, ok: true });
    if (sOut > 0) add({ id: 'skl_out', group: 'Sokl', kind: 'work', code: 'KAM-014', label: 'Vnější roh soklu – kamenický roh Jolly 45°', name: 'Vnější roh soklu – kamenický roh Jolly 45°', unit: 'ks', qty: sOut, ok: true });
    add({ id: 'fab', group: 'Sokl', kind: 'work', code: 'DLZ-052', name: 'Fabionek ze spárovací hmoty po obvodu soklu', unit: 'bm', qty: soklBm, ok: true, note: 'materiál na fabionek je v samostatném řádku níže (vždy bílá)' });
    add({ id: 'm_fab', group: 'Sokl', kind: 'mat', mat: 'ultracolor', color: '100', need: soklBm * 0.1 * (1 + rs / 100), needUnit: 'kg', name: 'MAPEI Ultracolor Plus 100 bílá – spárovací hmota na fabionek', ok: false, note: `⚠ odhad 0,1 kg na 1 bm fabionku (zaoblený přechod soklu a dlažby) × ${r2(soklBm)} bm + rezerva ${rs} %; vždy bílá, bez ohledu na odstín spár` });
  }
  if (P.sil || soklOn) {
    const silBm = (soklOn ? soklBm : perim) + dil;
    add({ id: 'sil', group: 'Spárování', kind: 'work', code: 'SPAR-005', name: soklOn ? 'Silikon – styk dlažba / sokl (+ dilatace)' : 'Sanitární silikon v koutech a dilatacích', unit: 'bm', qty: silBm, ok: true });
    if (silVert > 0) add({ id: 'silv', group: 'Spárování', kind: 'work', code: 'SPAR-005', name: 'Silikon svisle v rozích po výšce soklu', unit: 'bm', qty: r2(silVert), ok: true, note: `${sIn} vnitřních rohů × výška soklu ${soklH} cm` });
    const silAll = silBm + silVert;
    add({ id: 'm_sil', group: 'Spárování', kind: 'mat', mat: P.silType === 'lm' ? 'mapesilLM' : 'mapesil', need: Math.ceil(silAll / 12.4), needUnit: 'ks', name: (P.silType === 'lm' ? MAT.mapesilLM : MAT.mapesil).label, ok: true, note: `TL: kartuš 310 ml ≈ 12 bm spáry 5×5 mm; celkem ${r2(silAll)} bm` });
  }
  // 6) úklid
  add({ id: 'cl1', group: 'Úklid', kind: 'work', code: 'UKL-001', name: 'Předběžné čištění po spárování', unit: 'm²', qty: A, ok: true });
  add({ id: 'cl2', group: 'Úklid', kind: 'work', code: epox ? 'UKL-002' : 'UKL-004', name: epox ? 'Odstranění epoxidového povlaku speciálním čističem' : 'Odstranění cementového závoje, finální čištění', unit: 'm²', qty: A, ok: true });
  return L.filter((l) => !(l.kind === 'work' && !(Number(l.qty) > 0)));
}
