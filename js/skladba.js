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
  bandSA:    { re: /^MAPEBAND\s+SA\s*$/i, label: 'MAPEI Mapeband SA (samolepicí těsnicí páska)' },
  keraflex:  { re: /KERAFLEX\s+MAXI\s+S1\s+ZERO\s+ŠEDÝ/i, label: 'MAPEI Keraflex Maxi S1 (lepidlo, třída S1)' },
  keraflexX: { re: /KERAFLEX\s+EXTRA\s+S1\s+ZERO\s+ŠEDÝ/i, label: 'MAPEI Keraflex Extra S1 (lepidlo, třída S1)' },
  ultralite1:{ re: /ULTRALITE\s+S1\s+FLEX\s+ZERO\s+ŠEDÝ/i, label: 'MAPEI Ultralite S1 Flex (lehké lepidlo, třída S1)' },
  ultralite2:{ re: /ULTRALITE\s+S2\s+FLEX\s+\(LD\)\s+ŠEDÝ/i, label: 'MAPEI Ultralite S2 Flex (lehké lepidlo, třída S2)' },
  smart:     { re: /MAPELASTIC\s+SMART\s+\/A\+B/i, label: 'MAPEI Mapelastic Smart (cementová hydroizolace, 2K)' },
  mapenet:   { re: /MAPENET\s+150/i, label: 'MAPEI Mapenet 150 (skelná síťovina)' },
  wp200:     { re: /MAPEGUARD\s+WP\s+200/i, label: 'MAPEI Mapeguard WP 200 (hydroizolační a separační membrána)' },
  wpadh:     { re: /^MAPEGUARD\s+WP\s+ADHESIVE\s*$/i, label: 'MAPEI Mapeguard WP Adhesive (lepení přesahů)' },
  cleaner:   { re: /KERAPOXY\s+CLEANER\s+SPRAY/i, label: 'MAPEI UltraCare Kerapoxy Cleaner Spray 0,75 l' },
  mapesilLM: { re: /MAPESIL\s+LM/i, label: 'MAPEI Mapesil LM (neutrální silikon)', color: true },
  mapetex:   { re: /^MAPETEX\s+\(1\s*m\s*x\s*50/i, label: 'MAPEI Mapetex (bílá netkaná textilie, systém proti trhlinám)' },
  mapetexSel:{ re: /MAPETEX\s+SEL\s+N/i, label: 'MAPEI Mapetex SEL N (výztuž hydroizolace)' },
  ultracolor:{ re: /ULTRACOLOR\s+PLUS/i, label: 'MAPEI Ultracolor Plus (cementová spárovací hmota)', color: true, minPack: 5 },
  kerapoxy:  { re: /KERAPOXY\s+EASY\s+DESIGN/i, label: 'MAPEI Kerapoxy Easy Design (epoxidová spárovací hmota)', color: true },
  mapesil:   { re: /MAPESIL\s+AC\s+ZERO/i, label: 'MAPEI Mapesil AC Zero (silikon)', color: true },
  klin:      { re: /MAPELEVEL\s+PROWDG\s+\(1bag=100/i, label: 'MAPEI Mapelevel PROWDG klínky' },
  mapegum:   { re: /^MAPEGUM\s+WPS$/i, label: 'MAPEI Mapegum WPS (tekutá hydroizolace)' },
  band:      { re: /MAPEBAND\s+EASY\s+H130\s+role/i, label: 'MAPEI Mapeband Easy H130 (těsnicí páska)' },
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
    uneven: false, nivT: 3, nivCover: false, nivCoverBm: '', nivCrack: false, nivCrackBm: '', nivGrind: false, penLayers: 1, penType: 'beton',
    sep: mode === 'podlaha' && big ? 'mapetex' : 'none', adhesive: 'auto', silType: 'ac', spony: big, butter: mode === 'podlaha' && big, bedT: 4, hydro: 'wp200', hyReinf: 'net', wpAdh: '1k', prostText: '2×32', cornerBm: 0,
    grout: 'cement', groutColor: '113', epoxPremium: true, sil: true, dilBm: 0, stripBm: 0, dilatPasek: mode === 'podlaha',
    drainType: 'zed', wet: false, showerL: 90, showerW: '', wallBm: '', wetH: 2, slope: true, corIn: 4, corOut: 0, prost: 2, drain: 'none', drainLen: 0.8, slopeA: 0, slopeT: 4, test: true,
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
  const penRate = P.penType === 'nesavy' ? 0.25 : P.penType === 'anhydrit' ? 0.2 : 0.07;
  const penNote = P.penType === 'nesavy' ? 'TL: 0,2–0,3 kg/m² na vrstvu (použito 0,25)'
    : P.penType === 'anhydrit' ? 'anhydrit: neředěný, 2 vrstvy; TL uvádějí 0,08–0,2 kg/m² na vrstvu, počítáno raději nahoru (0,2); před penetrací přebrousit a vysát'
    : 'beton / cementový potěr: ředění 1 díl Primeru G : 2 díly vody; TL spotřebu pro ředění neuvádí – odhad ⚠: nanáší se cca 0,2 kg/m² roztoku, tj. cca 0,07 kg/m² koncentrátu';

  // 1) příprava
  add({ id: 'prep', group: 'Příprava podkladu', kind: 'work', code: 'PRAC-004', name: 'Broušení podkladu vč. ořezu dilatačního pásu', unit: 'm²', qty: A, ok: true });
  add({ id: 'vac', group: 'Příprava podkladu', kind: 'work', code: 'UKL-009', name: 'Přípravný úklid – vysátí prachu', unit: 'm²', qty: A, ok: true });
  let penTotal = 0;
  if (floor && P.uneven) {
    // ve sprchovém koutu se nivelace nedělá (řeší to spádový potěr)
    const shL = Number(P.showerL) || 0, shW = Number(P.showerW) || shL;
    const showerA = P.wet && P.slope && shL > 0 ? Math.max((shL * shW) / 10000, 0.64) : 0;
    const An = Math.max(A - showerA, 0);
    const sh = showerA > 0 ? ` (bez sprchového koutu ${r2(showerA)} m² – tam se nivelace nedělá, řeší ji spádový potěr)` : '';
    if (P.nivGrind) {
      add({ id: 'ngr', group: 'Nivelace', kind: 'work', code: 'NIV-007', name: 'Broušení / frézování podkladu před nivelací', unit: 'm²', qty: An, ok: true, note: 'dle potřeby (zaškrtnuto ručně) – množství upravte na skutečně brušenou plochu' });
      add({ id: 'nvac', group: 'Nivelace', kind: 'work', code: 'UKL-009', name: 'Vysátí prachu po broušení před nivelací', unit: 'm²', qty: An, ok: true });
    }
    if (P.nivCrack) {
      const cb = Number(P.nivCrackBm) || 0;
      add({ id: 'ncr', group: 'Nivelace', kind: 'work', code: 'NIV-006', name: 'Sešití trhlin v potěru ocelovými sponami vč. zalití epoxidem', unit: 'bm', qty: cb, ok: cb > 0, note: cb > 0 ? 'frézování příčných drážek, spony, zalití epoxidem; TL Ultraplan: trhliny v podkladu opravit epoxidem Eporip' : 'zadejte délku trhlin (bm)' });
      add({ id: 'm_ncr', group: 'Nivelace', kind: 'mat', mat: 'eporip', need: cb * 0.15, needUnit: 'kg', name: MAT.eporip.label, ok: false, note: `TL Eporip: 1,35 kg na 1 litr vyplňované dutiny; ⚠ odhad 0,15 kg na 1 bm trhliny vč. drážek pro spony (rozsah 0,5–2 kg/m² při lepení); trhlinu nechat před nivelací vytvrdnout (TL: úplné vytvrzení 7 dní)` });
      add({ id: 'm_nsp', group: 'Nivelace', kind: 'mat', mat: 'sponaVln', need: Math.ceil(cb * 3.4), needUnit: 'ks', name: MAT.sponaVln.label, ok: false, note: '⚠ odhad: 1 spona po cca 30 cm trhliny (3–4 ks na bm)' });
    }
    if (P.nivCover) {
      const bm = Number(P.nivCoverBm) || Math.round(A * 1.7 * 10) / 10;
      const est = Number(P.nivCoverBm) ? '' : ' ⚠ odhad: spáry v celé ploše po cca 60 cm (1,7 bm/m²) – zadejte skutečnou délku';
      add({ id: 'ncv', group: 'Nivelace', kind: 'work', code: 'NIV-003', name: 'Přelepení a utěsnění spár v podkladu před litím stěrky', unit: 'bm', qty: bm, ok: true, note: 'spáry v celé ploše – zabrání zatečení stěrky do spár' + est });
      add({ id: 'm_ncv', group: 'Nivelace', kind: 'mat', mat: 'bandSA', need: bm * 1.1, needUnit: 'bm', name: MAT.bandSA.label, ok: false, note: `⚠ materiál zvolen z nabídky MAPEI (samolepicí páska na spáry) – zkontrolujte; ${r2(bm)} bm + 10 % přesah` });
    }
    add({ id: 'pen1', group: 'Nivelace', kind: 'work', code: 'NIV-001', name: 'Penetrace podkladu před litím nivelační stěrky', unit: 'm²', qty: An * pen, ok: true, note: sh ? sh.trim() : undefined });
    add({ id: 'dil', group: 'Nivelace', kind: 'work', code: 'NIV-002', name: 'Obvodový dilatační pásek se zástěrkou', unit: 'bm', qty: perim, ok: true });
    const t = Number(P.nivT) || 3;
    const thickLayer = t > 10;
    add({ id: 'niv', group: 'Nivelace', kind: 'work', code: thickLayer ? 'NIV-005' : 'NIV-004', name: thickLayer ? `Silnovrstvá samonivelační stěrka tl. ${t} mm` : `Samonivelační stěrka tl. ${t} mm`, unit: 'm²', qty: An, ok: true, note: sh ? sh.trim() : undefined });
    penTotal += An * pen;
    const rate = thickLayer ? 1.7 : 1.6;
    const key = thickLayer ? 'ultraplanMaxi' : 'ultraplan';
    add({ id: 'm_niv', group: 'Nivelace', kind: 'mat', mat: key, need: An * t * rate * (1 + rs / 100), needUnit: 'kg', name: MAT[key].label, ok: thickLayer ? t <= 30 : t >= 1, note: `TL: ${String(rate).replace('.', ',')} kg/m² na 1 mm (${thickLayer ? 'vrstva 3–30 mm' : 'vrstva 1–10 mm'}): ${r2(An * t * rate)} kg + rezerva ${rs} %${t > 30 ? ' – POZOR, nad 30 mm je třeba rozdělit do více vrstev' : ''}${thickLayer ? '; nad 10 mm použit Ultraplan Maxi' : ''}` });
  }
  add({ id: 'pen2', group: 'Penetrace před lepením', kind: 'work', code: 'PRAC-005', name: 'Penetrace podkladu před lepením', unit: 'm²', qty: A * pen, ok: true });
  penTotal += A * pen;
  add({ id: 'm_pen', group: 'Penetrace před lepením', kind: 'mat', mat: penKey, need: penTotal * penRate * (1 + rs / 100), needUnit: 'kg', name: MAT[penKey].label, ok: P.penType === 'nesavy' || P.penType === 'anhydrit', note: `${penNote}; celkem ${penTotal} m² penetrace` });

  // 2) hydroizolace + spád (mokrý provoz)
  if (P.wet) {
    const wallBm = Number(P.wallBm) || ((Number(P.showerL) || 0) + (Number(P.showerW) || Number(P.showerL) || 0)) / 100;
    const wetH = Math.max(Number(P.wetH) || 2, 2); // minimum 2 m (přepočet až ve finálním vyúčtování)
    const w = wallBm * wetH; const hm2 = (floor ? A : 0) + w; const wpHydro = P.hydro === 'wp200'; const wpA = wpHydro ? (floor ? A : 0) + w : 0;
    const L = Number(P.showerL) || 0, W = Number(P.showerW) || L;
    const sl = P.slope && L > 0 ? Math.max((L * W) / 10000, 0.64) : 0; // min. sprcha 80×80 cm
    if (sl > 0) {
      const t = Number(P.slopeT) || 4;
      add({ id: 'slope', group: 'Spádování sprchového koutu', kind: 'work', code: 'SPD-001', name: 'Spádování sprchy – spádový potěr Topcem Pronto', unit: 'm²', qty: r2(sl), ok: true, note: `sprcha ${L}×${W} cm = ${r2(sl)} m² (minimum 80×80 cm)` });
      add({ id: 'm_slope', group: 'Spádování sprchového koutu', kind: 'mat', mat: 'topcem', need: sl * t * 20 * (1 + rs / 100), needUnit: 'kg', name: MAT.topcem.label, ok: true, note: `TL: 18–20 kg/m² na 1 cm (použito 20); ${r2(sl)} m² × prům. ${t} cm; před pokládkou počkat 24 h, zbytková vlhkost < 2 % po 4 dnech` });
      add({ id: 'slopeT', group: 'Spádování sprchového koutu', kind: 'work', code: 'SPD-002', name: 'Spádování dlažby ve sprše', unit: 'm²', qty: r2(sl), ok: true, note: 'nařezání dlažby do spádu a klínů kolem žlabu' });
    }
    if (P.drain === 'zlab') {
      add({ id: 'zlab', group: 'Sprchový žlab / vpusť', kind: 'work', code: 'HYDR-024', name: 'Montáž sprchového nerezového žlabu vč. usazení a napojení', unit: 'ks', qty: 1, ok: true, note: 'typ žlabu zatím nemění cenu práce – dejte vědět, jaké jsou přirážky (volně v prostoru / roh / u zdi / ve zdi)' });
      add({ id: 'zlab2', group: 'Sprchový žlab / vpusť', kind: 'work', code: 'HYDR-010', name: 'Napojení a utěsnění příruby žlabu', unit: 'bm', qty: Number(P.drainLen) || 0.8, ok: true });
      add({ id: 'o_zlab', group: 'Sprchový žlab / vpusť', kind: 'other', name: `Sprchový žlab PP Drain Aqua – ${({ prostor: 'volně v prostoru', roh: 'v rohu', zed: 'u zdi', vzed: 'integrovaný ve zdi' })[P.drainType] || 'u zdi'} (s předinstalovanou textilií Mapeguard WP 200)`, unit: 'ks', qty: 1, need: 1, needUnit: 'ks', ok: false, note: 'není v ceníku – doplňte cenu; textilie na přírubě je již z výroby, hydroizolační folie se na ni navazuje přesahem (lepidlo WP Adhesive)' });
    } else if (P.drain === 'vpust') {
      add({ id: 'vp', group: 'Sprchový žlab / vpusť', kind: 'work', code: 'KOMP-006', name: 'Montáž sprchového odtoku / bodové vpusti', unit: 'ks', qty: 1, ok: true });
      add({ id: 'vp2', group: 'Sprchový žlab / vpusť', kind: 'work', code: 'HYDR-026', name: 'Napojení hydroizolace na vpusť (manžeta)', unit: 'ks', qty: 1, ok: true });
    }
    add({ id: 'hpen', group: 'Hydroizolace', kind: 'work', code: 'HYDR-001', name: 'Penetrace pod hydroizolaci', unit: 'm²', qty: hm2, ok: true });
    add({ id: 'm_hpen', group: 'Hydroizolace', kind: 'mat', mat: 'primerG', need: hm2 * penRate * (1 + rs / 100), needUnit: 'kg', name: MAT.primerG.label, ok: true, note: `stejně jako před lepením (${penRate} kg/m² koncentrátu), 1 vrstva pod hydroizolaci` });
    const seams = wpHydro ? wpA * 1.0 : 0; // folie 1 m široká → spoj cca po 1 m
    const cb = Number(P.cornerBm) || 0;
    const tape = perim + cb + seams;
    add({ id: 'band', group: 'Hydroizolace', kind: 'work', code: 'HYDR-005', name: 'Těsnicí páska do koutů, styků a spojů folie', unit: 'bm', qty: tape, ok: true });
    add({ id: 'm_band', group: 'Hydroizolace', kind: 'mat', mat: 'band', need: tape * 1.1, needUnit: 'bm', name: MAT.band.label, ok: false, note: `kouty ${r2(perim)} bm${cb ? ' + svislé kouty ' + cb + ' bm' : ''}${seams ? ' + přebandážování spojů folie po 1 m ≈ ' + r2(seams) + ' bm' : ''}, + 10 % (⚠ přesah v TL není)` });
    if (wpHydro) {
      const kg = tape * 0.4 + wpA * 0.1;
      add({ id: 'm_wpadh_t', group: 'Hydroizolace', kind: 'mat', mat: P.wpAdh === '2k' ? 'wpadh' : 'wpadh1k', need: kg * (1 + rs / 100), needUnit: 'kg', name: (P.wpAdh === '2k' ? MAT.wpadh : MAT.wpadh1k).label + ' – pásky a přesahy', ok: false, note: `TL: ~0,4 kg/bm pro Mapeband Easy (údaj TL u Mapeguard UM 35) a ~0,1 kg/bm přesahu folie → ${r2(kg)} kg (⚠ pro WP 200 přesné číslo nenalezeno)` });
    }
    if (P.corIn > 0) { add({ id: 'ci', group: 'Hydroizolace', kind: 'work', code: 'HYDR-006', name: 'Těsnicí vnitřní rohy', unit: 'ks', qty: P.corIn, ok: true }); add({ id: 'm_ci', group: 'Hydroizolace', kind: 'mat', mat: 'bandIn', need: P.corIn, needUnit: 'ks', name: MAT.bandIn.label, ok: true, note: 'po 1 ks na roh' }); }
    if (P.corOut > 0) { add({ id: 'co', group: 'Hydroizolace', kind: 'work', code: 'HYDR-007', name: 'Těsnicí vnější rohy', unit: 'ks', qty: P.corOut, ok: true }); add({ id: 'm_co', group: 'Hydroizolace', kind: 'mat', mat: 'bandOut', need: P.corOut, needUnit: 'ks', name: MAT.bandOut.label, ok: true, note: 'po 1 ks na roh' }); }
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
    add({ id: 'h1', group: 'Hydroizolace', kind: 'work', code: 'HYDR-002', name: 'Tekutá hydroizolace – 1. vrstva', unit: 'm²', qty: hm2 - wpA, ok: true });
    add({ id: 'h2', group: 'Hydroizolace', kind: 'work', code: 'HYDR-003', name: 'Tekutá hydroizolace – 2. vrstva křížově', unit: 'm²', qty: hm2 - wpA, ok: true });
    const flr = floor ? A : 0;
    if (wpA > 0) {
      add({ id: 'wp', group: 'Hydroizolace', kind: 'work', code: 'HYDR-004', name: 'Vlepení hydroizolační folie Mapeguard WP 200', unit: 'm²', qty: wpA, ok: true });
      add({ id: 'm_wp', group: 'Hydroizolace', kind: 'mat', mat: 'wp200', need: wpA * 1.1, needUnit: 'm²', name: MAT.wp200.label, ok: true, note: `TL: role 1 × 30 m / 5 m, přesahy min. 5 cm; ${r2(wpA)} m² (podlaha + stěny) + 10 % přesahy a odpad` });
      add({ id: 'm_wpl', group: 'Hydroizolace', kind: 'mat', mat: 'ultralite1', need: wpA * 0.8 * 2 * (1 + rs / 100), needUnit: 'kg', name: MAT.ultralite1.label + ' – na vlepení folie', ok: false, note: 'TL Mapeguard WP 200 uvádí Ultralite S1 jako příklad lepidla C2; ⚠ lože 2 mm je předpoklad' });
    } else if (flr > 0 && P.hyReinf === 'sel') {
      add({ id: 'net', group: 'Hydroizolace', kind: 'work', code: 'HYDR-014', name: 'Zapuštění výztužné textilie do 1. vrstvy hydroizolace', unit: 'm²', qty: flr, ok: true });
      add({ id: 'm_net', group: 'Hydroizolace', kind: 'mat', mat: 'mapetexSel', need: flr * 1.1, needUnit: 'm²', name: MAT.mapetexSel.label, ok: false, note: `TL: netkaná polypropylenová textilie pro vyztužení hydroizolace; ⚠ přesah v TL nenalezen, počítáno +10 %` });
    } else if (flr > 0) {
      add({ id: 'net', group: 'Hydroizolace', kind: 'work', code: 'HYDR-014', name: 'Zapuštění sklotextilní síťoviny Mapenet 150 do 1. vrstvy', unit: 'm²', qty: flr, ok: true });
      add({ id: 'm_net', group: 'Hydroizolace', kind: 'mat', mat: 'mapenet', need: flr * 1.1, needUnit: 'bm', name: MAT.mapenet.label, ok: true, note: `TL: role 1 × 50 m, přesah min. 5 cm; ${r2(flr)} m² + 10 % přesahy a odpad` });
    }
    if (flr > 0 && !wpHydro) {
      add({ id: 'm_smart', group: 'Hydroizolace', kind: 'mat', mat: 'smart', need: flr * 1.6 * 2 * (1 + rs / 100), needUnit: 'kg', name: MAT.smart.label, ok: true, note: `podlaha: TL 1,6 kg/m² na 1 mm, min. 2 vrstvy, celkem min. 2 mm → 3,2 kg/m² × ${r2(flr)} m² (sada 30 kg)` });
    }
    if (w > 0 && !wpHydro) add({ id: 'm_h', group: 'Hydroizolace', kind: 'mat', mat: 'mapegum', need: w * 1.5 * (1 + rs / 100), needUnit: 'kg', name: MAT.mapegum.label, ok: true, note: `stěny: 2 vrstvy křížově; TL (CZ) cca 1,5 kg/m² na 1 mm, min. 1 mm → 1,5 kg/m² × ${r2(w)} m²; novější TL uvádí 1,2 kg/m², počítáno vyšší hodnotou` });
    if (P.test) add({ id: 'test', group: 'Hydroizolace', kind: 'work', code: 'HYDR-015', name: 'Zkouška těsnosti hydroizolace (zatopení)', unit: 'kpl', qty: 1, ok: true });
  }

  // 3) separace, dilatace
  const sepOn = floor && !(P.wet && P.hydro === 'wp200');
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
  add({ id: 'o_kriz', group: 'Lepení', kind: 'other', need: Math.ceil(A * 2 / (a * b / 1e6)), needUnit: 'ks', name: `Vymezovací křížky ${P.joint} mm`, unit: 'ks', qty: Math.ceil(A * 2 / (a * b / 1e6)), ok: false, note: '⚠ MAPEI počty neuvádí – odhad 2 ks na křížení spár; nejsou v ceníku, doplňte cenu' });
  if (P.butter) add({ id: 'butter', group: 'Lepení', kind: 'work', code: 'MONT-010', name: 'Příplatek za oboustranné lepení (buttering-floating)', unit: 'm²', qty: A, ok: true });
  const mx = Math.max(Number(P.fa) || 0, Number(P.fb) || 0);
  const ad = !P.adhesive || P.adhesive === 'auto' ? (mx <= 60 ? 'maxi' : mx <= 120 ? 'ul1' : 'ul2') : P.adhesive;
  const adMat = { maxi: 'keraflex', extra: 'keraflexX', ul1: 'ultralite1', ul2: 'ultralite2' }[ad];
  const adKg = ad === 'extra' ? 3 : ad === 'maxi' ? bed * 1.2 : bed * 0.8;
  const adNote = ad === 'extra' ? 'TL: 2,5–3 kg/m² pro standardní formáty (podle zubu hladítka) – použito 3 kg/m²'
    : `TL: ${ad === 'maxi' ? '1,2' : '0,8'} kg/m² na 1 mm lože; lože ${bed} mm (⚠ tloušťka lože je předpoklad)`;
  add({ id: 'm_lep', group: 'Lepení', kind: 'mat', mat: adMat, need: A * adKg * (1 + rs / 100), needUnit: 'kg', name: MAT[adMat].label, ok: true, note: `formát ${P.fa}×${P.fb} cm → ${adNote} → ${r2(A * adKg)} kg + rezerva ${rs} %` });

  // 5) spárování
  const C = Number(P.thick) || 9, D = Number(P.joint) || 3;
  const kgm2 = ((a + b) / (a * b)) * C * D * 1.6;
  const epox = P.grout === 'epoxid';
  const sprWork = epox ? (Math.max(P.fa, P.fb) >= 120 ? 'SPAR-004' : 'SPAR-003') : 'SPAR-002';
  const gk = epox && !P.epoxPremium ? 'kerapoxy' : 'ultracolor';
  add({ id: 'spar', group: 'Spárování', kind: 'work', code: epox && !P.epoxPremium ? sprWork : 'SPAR-002', name: epox && !P.epoxPremium ? 'Spárování epoxidovou hmotou' : 'Spárování cementovou flexibilní hmotou', unit: 'm²', qty: A, ok: true });
  add({ id: 'm_spar', group: 'Spárování', kind: 'mat', mat: gk, need: A * kgm2 * (1 + rs / 100), needUnit: 'kg', name: MAT[gk].label, ok: true, note: `vzorec ((A+B)/(A·B))·C·D·1,6 = ${r2(kgm2)} kg/m² (dlaždice ${a}×${b} mm, tl. ${C}, spára ${D}) → ${r2(A * kgm2)} kg + rezerva ${rs} %${gk === 'kerapoxy' ? ' (u Kerapoxy Easy Design jsem v TL našel jen tabulku, ta s tímto vzorcem sedí)' : ''}` });
  if (epox && !P.epoxPremium) add({ id: 'm_clean', group: 'Spárování', kind: 'mat', mat: 'cleaner', need: Math.ceil(A / 10 * 2), needUnit: 'ks', name: MAT.cleaner.label, ok: true, note: 'dle vaší praxe: 2 × 750 ml na cca 10 m²' });
  if (epox && P.epoxPremium) {
    add({ id: 'prem', group: 'Spárování', kind: 'premium', name: 'PŘÍPLATEK: epoxidová spárovací hmota Kerapoxy Easy Design místo cementové (práce, materiál, čistič)', unit: 'm²', qty: A, ok: true, workCode: sprWork, kgm2, note: 'Cena = rozdíl epoxid − cement na m²; do nabídky jde jako příplatek v PREMIUM' });
  }
  if (P.sil) {
    add({ id: 'sil', group: 'Spárování', kind: 'work', code: 'SPAR-005', name: 'Sanitární silikon v koutech a dilatacích', unit: 'bm', qty: perim + dil, ok: true });
    add({ id: 'm_sil', group: 'Spárování', kind: 'mat', mat: P.silType === 'lm' ? 'mapesilLM' : 'mapesil', need: Math.ceil((perim + dil) / 12.4), needUnit: 'ks', name: (P.silType === 'lm' ? MAT.mapesilLM : MAT.mapesil).label, ok: true, note: 'TL: kartuš 310 ml ≈ 12 bm spáry 5×5 mm' });
  }
  // 6) úklid
  add({ id: 'cl1', group: 'Úklid', kind: 'work', code: 'UKL-001', name: 'Předběžné čištění po spárování', unit: 'm²', qty: A, ok: true });
  add({ id: 'cl2', group: 'Úklid', kind: 'work', code: epox ? 'UKL-002' : 'UKL-004', name: epox ? 'Odstranění epoxidového povlaku speciálním čističem' : 'Odstranění cementového závoje, finální čištění', unit: 'm²', qty: A, ok: true });
  return L.filter((l) => !(l.kind === 'work' && !(Number(l.qty) > 0)));
}
