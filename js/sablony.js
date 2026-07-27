// ═══ sablony.js — JL-OBKLADY CN v4 ═══
async function pageSablony() {
  const sablony = await nacistSablony();

  const sekce = await Promise.all(Object.entries(sablony).map(async ([k, s]) => `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
        <div style="font-weight:700;font-size:0.9rem">${s.label}</div>
        <button onclick="resetSablonu('${k}')"
          style="font-size:0.72rem;padding:0.2rem 0.5rem;border-radius:var(--r-xs);
            border:1px solid var(--c-border);background:var(--c-s2);cursor:pointer;
            color:var(--c-ink2)">
          ↺ Výchozí
        </button>
      </div>
      <div style="font-size:0.72rem;color:var(--c-ink3);margin-bottom:0.4rem">
        Proměnné: {jmeno} {nazev} {cislo} {castka} {plocha} {firma} {telefon} {email}
      </div>
      <textarea id="sab_${k}" rows="6"
        style="width:100%;padding:0.62rem;border:1.5px solid var(--c-border);
          border-radius:var(--r-sm);font-family:var(--f-body);font-size:0.82rem;
          resize:vertical;background:var(--c-bg);color:var(--c-ink)">${s.text}</textarea>
    </div>`));

  return `
    <div class="header-bar">
      <button onclick="navigate('dashboard')"
        style="background:none;border:none;font-size:1.3rem;cursor:pointer;
          color:white;padding:0.2rem">←</button>
      <div>
        <h1>Šablony zpráv</h1>
        <div class="subtitle">WhatsApp & e-mail</div>
      </div>
    </div>
    ${sekce.join('')}
    <button class="btn btn-primary btn-full" onclick="ulozitSablony()">
      💾 Uložit všechny šablony
    </button>
    <div style="height:5rem"></div>`;
}

async function ulozitSablony() {
  for (const k of Object.keys(DEFAULT_SABLONY)) {
    const el = document.getElementById('sab_' + k);
    if (el) await dbPut('nastaveni', { klic: 'sablona_' + k, hodnota: el.value });
  }
  toast('Šablony uloženy ✓');
}

async function resetSablonu(k) {
  const el = document.getElementById('sab_' + k);
  if (el) el.value = DEFAULT_SABLONY[k].text;
  await dbPut('nastaveni', { klic: 'sablona_' + k, hodnota: DEFAULT_SABLONY[k].text });
  toast('Šablona obnovena');
}

// ── Výchozí šablony zpráv ─────────────────────────────────
const DEFAULT_SABLONY = {
  prvni: {
    label: '👋 První kontakt',
    text: 'Dobrý den, {jmeno},\n\nrád bych Vám nabídl své služby v oblasti pokládky obkladů a dlažby.\n\nPracuji profesionálně, používám kvalitní materiály a vždy dodržuji dohodnuté termíny.\n\nMůžeme se domluvit na nezávazné prohlídce?\n\nS pozdravem\n{firma}',
  },
  odeslani: {
    label: '📋 Nabídka odeslána',
    text: 'Dobrý den, {jmeno},\n\nzasílám Vám cenovou nabídku č. {cislo} na zakázku „{nazev}".\n\n💰 Celková cena: {castka} Kč\n📐 Plocha: {plocha} m²\n\nNabídka je platná 30 dní. V případě dotazů mě neváhejte kontaktovat.\n\nS pozdravem\n{firma}',
  },
  followup: {
    label: '🔔 Follow-up',
    text: 'Dobrý den, {jmeno},\n\nchci se připomenout ohledně nabídky č. {cislo} na zakázku „{nazev}" (celkem {castka} Kč).\n\nMáte k nabídce nějaké otázky nebo si přejete upravit rozsah prací?\n\nS pozdravem\n{firma}',
  },
  dokonceni: {
    label: '🏁 Dokončení zakázky',
    text: 'Dobrý den, {jmeno},\n\nrád oznamuji, že zakázka „{nazev}" je hotová.\n\nProsím o kontrolu provedených prací a v případě spokojenosti o potvrzení převzetí.\n\nDěkuji za spolupráci!\n\nS pozdravem\n{firma}',
  },
};

async function nacistSablony() {
  const custom = {};
  for (const k of Object.keys(DEFAULT_SABLONY)) {
    try {
      const row = await dbGet('nastaveni', 'sablona_' + k);
      custom[k] = row ? { ...DEFAULT_SABLONY[k], text: row.hodnota } : DEFAULT_SABLONY[k];
    } catch (e) { custom[k] = DEFAULT_SABLONY[k]; }
  }
  return custom;
}

function vyplnitSablonu(text, n, firma) {
  return text
    .replace(/\{jmeno\}/g,   n.zakaznik || 'zákazníku')
    .replace(/\{nazev\}/g,   n.nazev    || '')
    .replace(/\{cislo\}/g,   formatCisloNabidky(n))
    .replace(/\{castka\}/g,  parseInt(n.cenaCelkem || 0).toLocaleString('cs'))
    .replace(/\{plocha\}/g,  n.plocha   || '')
    .replace(/\{firma\}/g,   firma.nazev  || '')
    .replace(/\{telefon\}/g, firma.telefon || '')
    .replace(/\{email\}/g,   firma.email   || '');
}

// ── PIN pro ceník prací ───────────────────────────────────
const PRACE_PIN    = '1103';
let praceOdemceno  = false;

// ── VYCHOZI_PRACE — kompletní ceník 2026 ─────────────────
const VYCHOZI_PRACE = [
  // 1. PROJEKT & PŘÍPRAVA
  { skupina:'Projekt & příprava', popis:'Zaměření a výkaz výměr (plochy, obvody, otvory)', cena:0, hodSazba:800, jednotka:'hod' },
  { skupina:'Projekt & příprava', popis:'Konzultace a návrh — výběr materiálů, barev, vzorů', cena:0, hodSazba:600, jednotka:'hod' },
  { skupina:'Projekt & příprava', popis:'Doprava pracovníků a nářadí na stavbu (do 20 km)', cena:0, hodSazba:600, jednotka:'hod' },
  { skupina:'Projekt & příprava', popis:'Doprava pracovníků a nářadí (nad 20 km — cena za km)', cena:12, hodSazba:0, jednotka:'km' },
  { skupina:'Projekt & příprava', popis:'Ochrana podlah a nábytku před prací (folie, kartony)', cena:35, hodSazba:0, jednotka:'m²' },
  // 2. BOURACÍ PRÁCE
  { skupina:'Bourací práce', popis:'Odstranění starých keramických obkladů — stěna', cena:130, hodSazba:0, jednotka:'m²' },
  { skupina:'Bourací práce', popis:'Odstranění staré dlažby — podlaha (do 30×30 cm)', cena:110, hodSazba:0, jednotka:'m²' },
  { skupina:'Bourací práce', popis:'Odstranění staré dlažby — podlaha (nad 30×30 cm, rektif.)', cena:145, hodSazba:0, jednotka:'m²' },
  { skupina:'Bourací práce', popis:'Odstranění PVC / linolea / koberce + lepidla ze podlahy', cena:85, hodSazba:0, jednotka:'m²' },
  { skupina:'Bourací práce', popis:'Odstranění starého silikonu + stěrkového tmelu', cena:55, hodSazba:0, jednotka:'bm' },
  { skupina:'Bourací práce', popis:'Demontáž SDK příčky / předstěny / podhledu', cena:95, hodSazba:0, jednotka:'m²' },
  { skupina:'Bourací práce', popis:'Odvoz suti vlastní dopravou (do 10 km, do 0,5 t)', cena:1200, hodSazba:0, jednotka:'ks' },
  // 3. PŘÍPRAVA PODKLADU — PODLAHA
  { skupina:'Příprava podkladu — podlaha', popis:'Penetrace podkladu — 1 vrstva (savý podklad)', cena:30, hodSazba:0, jednotka:'m²' },
  { skupina:'Příprava podkladu — podlaha', popis:'Samonivelační stěrka — do 5 mm', cena:110, hodSazba:0, jednotka:'m²' },
  { skupina:'Příprava podkladu — podlaha', popis:'Samonivelační stěrka — 5–20 mm', cena:165, hodSazba:0, jednotka:'m²' },
  { skupina:'Příprava podkladu — podlaha', popis:'Frézování / broušení podkladu (rovinatost)', cena:85, hodSazba:0, jednotka:'m²' },
  { skupina:'Příprava podkladu — podlaha', popis:'Pokládka oddělovací podložky / uncoupling mat (Ditra, Blanke)', cena:130, hodSazba:0, jednotka:'m²' },
  // 4. PŘÍPRAVA PODKLADU — STĚNA
  { skupina:'Příprava podkladu — stěna', popis:'Penetrace stěny — 1 vrstva', cena:28, hodSazba:0, jednotka:'m²' },
  { skupina:'Příprava podkladu — stěna', popis:'Vyrovnávací stěrka — jádrová omítka do 10 mm', cena:175, hodSazba:0, jednotka:'m²' },
  { skupina:'Příprava podkladu — stěna', popis:'Vyrovnávací stěrka — štuková (finální) do 5 mm', cena:140, hodSazba:0, jednotka:'m²' },
  // 5. SÁDROKARTON — PŘÍČKY
  { skupina:'Sádrokarton — příčky', popis:'SDK příčka W111 — 1× opláštění každá strana (75 mm)', cena:580, hodSazba:0, jednotka:'m²' },
  { skupina:'Sádrokarton — příčky', popis:'SDK příčka W112 — 2× opláštění každá strana (100 mm)', cena:680, hodSazba:0, jednotka:'m²' },
  { skupina:'Sádrokarton — příčky', popis:'SDK příčka do vlhkých prostor — GKBI', cena:720, hodSazba:0, jednotka:'m²' },
  { skupina:'Sádrokarton — příčky', popis:'SDK příčka akustická — minerální vlna + 2× opláštění', cena:820, hodSazba:0, jednotka:'m²' },
  // 6. SÁDROKARTON — PŘEDSTĚNY & PODHLED
  { skupina:'Sádrokarton — předstěny & podhled', popis:'SDK předstěna jednoduchá W625 — 1× opláštění', cena:520, hodSazba:0, jednotka:'m²' },
  { skupina:'Sádrokarton — předstěny & podhled', popis:'SDK předstěna vlhkostní — GKBI (koupelna, WC)', cena:620, hodSazba:0, jednotka:'m²' },
  { skupina:'Sádrokarton — předstěny & podhled', popis:'SDK podhled rovný D112 — 1× opláštění', cena:620, hodSazba:0, jednotka:'m²' },
  { skupina:'Sádrokarton — předstěny & podhled', popis:'SDK podhled vlhkostní — GKBI (koupelna, sauna)', cena:720, hodSazba:0, jednotka:'m²' },
  // 7. HYDROIZOLACE
  { skupina:'Hydroizolace', popis:'Hydroizolační stěrka — 1 vrstva (méně namáhané plochy)', cena:90, hodSazba:0, jednotka:'m²' },
  { skupina:'Hydroizolace', popis:'Hydroizolační stěrka — 2 vrstvy (sprchový kout, mokrý provoz)', cena:155, hodSazba:0, jednotka:'m²' },
  { skupina:'Hydroizolace', popis:'Hydroizolační stěrka — 3 vrstvy (bazén, venkovní terasa)', cena:210, hodSazba:0, jednotka:'m²' },
  { skupina:'Hydroizolace', popis:'Těsnicí páska do rohů (vana, sprcha)', cena:55, hodSazba:0, jednotka:'bm' },
  { skupina:'Hydroizolace', popis:'Těsnicí manžeta kolem odpadu / sifonu', cena:190, hodSazba:0, jednotka:'ks' },
  // 8. ELEKTRICKÉ PODLAHOVÉ TOPENÍ
  { skupina:'Elektrické podlahové topení', popis:'Pokládka topné rohože / kabelu do lepidla (do 10 m²)', cena:250, hodSazba:0, jednotka:'m²' },
  { skupina:'Elektrické podlahové topení', popis:'Pokládka topné rohože / kabelu do lepidla (nad 10 m²)', cena:200, hodSazba:0, jednotka:'m²' },
  // 9. POKLÁDKA DLAŽBY — PODLAHA
  { skupina:'Pokládka dlažby — podlaha', popis:'Dlažba do 30×30 cm — malý formát', cena:290, hodSazba:0, jednotka:'m²' },
  { skupina:'Pokládka dlažby — podlaha', popis:'Dlažba 30×60 cm / 45×45 cm — střední formát', cena:340, hodSazba:0, jednotka:'m²' },
  { skupina:'Pokládka dlažby — podlaha', popis:'Dlažba 60×60 cm — velký formát', cena:400, hodSazba:0, jednotka:'m²' },
  { skupina:'Pokládka dlažby — podlaha', popis:'Dlažba 60×120 cm — XXL formát', cena:490, hodSazba:0, jednotka:'m²' },
  { skupina:'Pokládka dlažby — podlaha', popis:'Dlažba 80×160 cm a větší — XXXL (velkoformát)', cena:580, hodSazba:0, jednotka:'m²' },
  { skupina:'Pokládka dlažby — podlaha', popis:'Pokládka do vzoru / šachovnice / úhlopříčně (+příplatek)', cena:130, hodSazba:0, jednotka:'m²' },
  { skupina:'Pokládka dlažby — podlaha', popis:'Schodišťový stupeň — čelo + plošina (1 kompletní ks)', cena:580, hodSazba:0, jednotka:'ks' },
  { skupina:'Pokládka dlažby — podlaha', popis:'Keramický sokl / soklová lišta (lepení + spárování)', cena:110, hodSazba:0, jednotka:'bm' },
  { skupina:'Pokládka dlažby — podlaha', popis:'Rektifikovaná dlažba — minimální spára ≤ 1 mm', cena:550, hodSazba:0, jednotka:'m²' },
  // 10. POKLÁDKA OBKLADŮ — STĚNA
  { skupina:'Pokládka obkladů — stěna', popis:'Obklad stěny do 15×15 cm — metro, mozaika na síťce', cena:370, hodSazba:0, jednotka:'m²' },
  { skupina:'Pokládka obkladů — stěna', popis:'Obklad stěny 20×40 cm / 25×75 cm — střední formát', cena:390, hodSazba:0, jednotka:'m²' },
  { skupina:'Pokládka obkladů — stěna', popis:'Obklad stěny 30×60 cm / 40×80 cm', cena:420, hodSazba:0, jednotka:'m²' },
  { skupina:'Pokládka obkladů — stěna', popis:'Obklad stěny 60×120 cm a větší — velký formát', cena:520, hodSazba:0, jednotka:'m²' },
  { skupina:'Pokládka obkladů — stěna', popis:'Obklad vnějšího rohu — profil aluminium / nerez (lepení)', cena:130, hodSazba:0, jednotka:'bm' },
  { skupina:'Pokládka obkladů — stěna', popis:'Obklad výklenku / niky (do 60×60 cm, všechny plochy)', cena:950, hodSazba:0, jednotka:'ks' },
  // 11. SPECIÁLNÍ TECHNIKY
  { skupina:'Speciální techniky', popis:'Přírodní kámen — mramor, travertin, břidlice (podlaha)', cena:650, hodSazba:0, jednotka:'m²' },
  { skupina:'Speciální techniky', popis:'Mozaika ručně kladená (bez síťky, jednotlivé tesserae)', cena:900, hodSazba:0, jednotka:'m²' },
  { skupina:'Speciální techniky', popis:'Rybí kost / Herringbone pattern (+příplatek k základní ceně)', cena:180, hodSazba:0, jednotka:'m²' },
  { skupina:'Speciální techniky', popis:'Obklad bazénu — keramika / mozaika (podmáčené prostředí)', cena:750, hodSazba:0, jednotka:'m²' },
  // 12. ŘEZÁNÍ & VRTÁNÍ
  { skupina:'Řezání & vrtání', popis:'Tvarový výřez — oblouk, L-tvar, výřez kolem trubky', cena:95, hodSazba:0, jednotka:'ks' },
  { skupina:'Řezání & vrtání', popis:'Vrtání otvoru diamantovou korunkou (pr. 50–100 mm)', cena:130, hodSazba:0, jednotka:'ks' },
  { skupina:'Řezání & vrtání', popis:'Frézování výřezu pro elektroinstalační krabičku Ø68 mm', cena:160, hodSazba:0, jednotka:'ks' },
  // 13. SPÁROVÁNÍ
  { skupina:'Spárování', popis:'Spárování dlažby — standardní spára 2–5 mm', cena:75, hodSazba:0, jednotka:'m²' },
  { skupina:'Spárování', popis:'Spárování obkladu — stěna (standardní spára)', cena:80, hodSazba:0, jednotka:'m²' },
  { skupina:'Spárování', popis:'Epoxidové spárování (chemicky odolné — kuchyně, průmysl)', cena:240, hodSazba:0, jednotka:'m²' },
  { skupina:'Spárování', popis:'Výměna starých spár — odfrézování + nové spárování', cena:180, hodSazba:0, jednotka:'m²' },
  // 14. SILIKONY & DILATACE
  { skupina:'Silikony & dilatace', popis:'Silikonování koupelnového rohu (vana, sprcha)', cena:100, hodSazba:0, jednotka:'bm' },
  { skupina:'Silikony & dilatace', popis:'Silikonování podlahového soklu (přechod podlaha × stěna)', cena:65, hodSazba:0, jednotka:'bm' },
  { skupina:'Silikony & dilatace', popis:'Dilatační profil hliníkový (přechod podlahy, roztažnost)', cena:130, hodSazba:0, jednotka:'bm' },
  { skupina:'Silikony & dilatace', popis:'Odstranění starého silikonu + čištění spáry', cena:90, hodSazba:0, jednotka:'bm' },
  // 15. DOKONČOVACÍ PRÁCE
  { skupina:'Dokončovací práce', popis:'Montáž rohové hliníkové / nerezové lišty (nárožní profil)', cena:95, hodSazba:0, jednotka:'bm' },
  { skupina:'Dokončovací práce', popis:'Montáž lineárního odtoku / sprchového žlabu', cena:650, hodSazba:0, jednotka:'ks' },
  { skupina:'Dokončovací práce', popis:'Montáž podlahové vpusti / sifonu', cena:380, hodSazba:0, jednotka:'ks' },
  { skupina:'Dokončovací práce', popis:'Impregnace povrchu (přírodní kámen, terakota, pórovitý mat.)', cena:65, hodSazba:0, jednotka:'m²' },
  { skupina:'Dokončovací práce', popis:'Čištění hotového povrchu (odmaštění, odmytí zálivky)', cena:45, hodSazba:0, jednotka:'m²' },
  { skupina:'Dokončovací práce', popis:'Kotvení doplňků do obkladu (mýdelník, háček, WC papírník)', cena:220, hodSazba:0, jednotka:'ks' },
  { skupina:'Dokončovací práce', popis:'Oprava / záplata — výměna poškozených dlaždic (do 5 ks)', cena:0, hodSazba:1200, jednotka:'hod' },
  // 16. ÚKLID & ODVOZ
  { skupina:'Úklid & odvoz', popis:'Průběžný úklid staveniště (denní úklid po práci)', cena:0, hodSazba:500, jednotka:'hod' },
  { skupina:'Úklid & odvoz', popis:'Finální stavební úklid po dokončení celého díla', cena:55, hodSazba:0, jednotka:'m²' },
  { skupina:'Úklid & odvoz', popis:'Přistavení + odvoz kontejneru (zprostředkování)', cena:3500, hodSazba:0, jednotka:'ks' },
];
