// ═══ nabidky.js — JL-OBKLADY CN v4 ═══
async function pageNabidky() {
  const data = await dbGetAll('nabidky');
  if (data.length === 0) return `
    <div class="header-bar">
      <span class="logo">📋</span>
      <div><h1>Nabídky</h1><div class="subtitle">Žádné nabídky</div></div>
    </div>
    <div class="card">
      <div class="empty">
        <span class="icon">📋</span>
        <p>Zatím žádné nabídky. Vytvoř první!</p>
        <button class="btn btn-primary" style="margin-top:0.8rem"
          onclick="navigate('novaNabidka')">➕ Nová nabídka</button>
      </div>
    </div>`;

  const total = data.reduce((s, n) => s + parseFloat(n.cenaCelkem || 0), 0);

  const filterStav  = sessionStorage.getItem('nabidkyFilter') || 'vse';
  const searchQuery = (sessionStorage.getItem('nabidkySearch') || '').toLowerCase().trim();
  let filteredData  = filterStav === 'vse' ? data : data.filter(n => (n.stav || 'nabidka') === filterStav);
  if (searchQuery) {
    filteredData = filteredData.filter(n =>
      (n.nazev          || '').toLowerCase().includes(searchQuery) ||
      (n.zakaznik       || '').toLowerCase().includes(searchQuery) ||
      (n.cisloNabidky   || '').toLowerCase().includes(searchQuery) ||
      (n.mistoRealizace || '').toLowerCase().includes(searchQuery) ||
      (n.pozn           || '').toLowerCase().includes(searchQuery)
    );
  }

  const filterBtns = [
    { k: 'vse',       l: 'Vše',       cnt: data.length },
    { k: 'nabidka',   l: 'Nabídky',   cnt: data.filter(n => (n.stav || 'nabidka') === 'nabidka').length },
    { k: 'schvaleno', l: 'Schváleno', cnt: data.filter(n => n.stav === 'schvaleno').length },
    { k: 'probiha',   l: 'Probíhá',   cnt: data.filter(n => n.stav === 'probiha').length },
    { k: 'dokonceno', l: 'Hotovo',    cnt: data.filter(n => n.stav === 'dokonceno').length },
    { k: 'zaplaceno', l: 'Zaplaceno', cnt: data.filter(n => n.stav === 'zaplaceno').length },
  ];

  const stavColors = {
    nabidka: '#968E84', schvaleno: '#1A4FAA',
    probiha: '#C8502A', dokonceno: '#1E6B4A', zaplaceno: '#059669'
  };
  const stavLabels = {
    nabidka: 'Nabídka', schvaleno: 'Schváleno',
    probiha: 'Probíhá', dokonceno: 'Dokončeno', zaplaceno: 'Zaplaceno'
  };

  return `
    <div class="header-bar">
      <span class="logo">📋</span>
      <div style="flex:1">
        <h1>Nabídky</h1>
        <div class="subtitle">${data.length} zakázek · ${(total/1000).toFixed(0)} k Kč celkem</div>
      </div>
      <button onclick="openGlobalSearch()"
        style="background:rgba(255,255,255,0.12);border:1.5px solid rgba(255,255,255,0.2);
          color:white;border-radius:var(--r-sm);padding:0.4rem 0.7rem;
          font-size:0.82rem;font-weight:600;cursor:pointer;font-family:var(--f-body)">
        🔍
      </button>
    </div>

    <button class="btn btn-primary btn-full" onclick="navigate('novaNabidka')"
      style="margin-bottom:0.7rem;justify-content:center">
      ➕ Nová nabídka
    </button>

    <!-- Fulltext search -->
    <div style="display:flex;gap:0.4rem;margin-bottom:0.6rem;align-items:center">
      <input type="search" id="nabidky-search"
        placeholder="🔍 Hledat zakázku, zákazníka, číslo…"
        value="${escHtml(searchQuery)}"
        oninput="sessionStorage.setItem('nabidkySearch',this.value);render()"
        style="flex:1;padding:0.55rem 0.85rem;border:1.5px solid var(--c-border);
          border-radius:var(--r-sm);font-family:var(--f-body);font-size:0.88rem;
          background:var(--c-bg);color:var(--c-ink)">
      ${searchQuery ? `
        <button onclick="sessionStorage.removeItem('nabidkySearch');render()"
          style="padding:0.48rem 0.65rem;border-radius:var(--r-sm);
            border:1px solid var(--c-border);background:var(--c-s2);cursor:pointer;
            font-size:0.82rem;color:var(--c-ink2)">✕</button>` : ''}
    </div>

    <!-- Filter chips -->
    <div style="display:flex;gap:0.3rem;overflow-x:auto;padding-bottom:0.3rem;
      margin-bottom:0.8rem;scrollbar-width:none">
      ${filterBtns.filter(f => f.cnt > 0 || f.k === 'vse').map(f => `
        <button onclick="sessionStorage.setItem('nabidkyFilter','${f.k}');render()"
          style="padding:0.32rem 0.7rem;border-radius:var(--r-pill);
            border:1.5px solid ${filterStav === f.k ? 'var(--c-terra)' : 'var(--c-border)'};
            background:${filterStav === f.k ? 'var(--c-terra)' : 'var(--c-s2)'};
            color:${filterStav === f.k ? 'white' : 'var(--c-ink2)'};
            white-space:nowrap;cursor:pointer;font-family:var(--f-body);
            font-size:0.75rem;font-weight:600;flex-shrink:0;
            transition:all var(--dur)">
          ${f.l} ${f.cnt > 0 ? `<span style="opacity:0.75">${f.cnt}</span>` : ''}
        </button>`).join('')}
    </div>

    ${filteredData.length === 0 ? `
    <div class="card">
      <div class="empty">
        <span class="icon">📋</span>
        <p>Žádné nabídky v tomto filtru.</p>
      </div>
    </div>` : ''}

    ${filteredData.slice().reverse().map(n => {
      const stav = n.stav || 'nabidka';
      const stavColor = stavColors[stav] || '#968E84';
      const stavLabel = stavLabels[stav] || 'Nabídka';
      const stariDni = Math.floor((Date.now() - new Date(n.datum)) / 86400000);
      const expiring = stav === 'nabidka' && stariDni >= 25 && stariDni <= 35;
      const expired  = stav === 'nabidka' && stariDni > 35;

      return `
      <div class="card" style="cursor:pointer;
        ${expiring ? 'border-left:3px solid var(--c-amber)' : ''}
        ${expired  ? 'border-left:3px solid var(--c-red);opacity:0.8' : ''}
        ${stav === 'zaplaceno' ? 'border-left:3px solid var(--c-green)' : ''}
        ${stav === 'probiha' ? 'border-left:3px solid var(--c-terra)' : ''}
      ">
        <div style="display:flex;justify-content:space-between;align-items:flex-start"
          onclick="navigate('nabidkaDetail',{editId:${n.id}})">
          <div style="flex:1;min-width:0;padding-right:0.5rem">
            <div style="font-weight:700;font-size:0.9rem;margin-bottom:2px">${escHtml(n.nazev)}</div>
            <div style="font-size:0.68rem;color:var(--c-ink3);font-family:monospace;margin-bottom:2px">
              ${formatCisloNabidky(n)}${n.revize > 1 ? ' rev.' + n.revize : ''}
            </div>
            <div style="font-size:0.75rem;color:var(--c-ink2)">
              ${n.datum}${n.zakaznik ? ' · 👤 ' + escHtml(n.zakaznik) : ''} · ${n.plocha} m²
            </div>
            ${n.pozn ? `
            <div style="font-size:0.73rem;color:var(--c-ink3);margin-top:2px;
              overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:220px">
              📝 ${escHtml(n.pozn)}
            </div>` : ''}
            <div style="display:flex;align-items:center;gap:0.4rem;margin-top:4px;flex-wrap:wrap">
              <span style="font-size:0.62rem;font-weight:700;color:${stavColor};
                text-transform:uppercase;letter-spacing:0.05em">${stavLabel}</span>
              ${expiring ? `<span class="badge badge-amber">${stariDni}d</span>` : ''}
              ${expired  ? `<span class="badge badge-red">Expirováno</span>` : ''}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:0.4rem;flex-shrink:0">
            <span class="badge badge-orange" style="font-size:0.78rem;font-weight:700;white-space:nowrap">
              ${parseInt(n.cenaCelkem || 0).toLocaleString('cs')} Kč
            </span>
            <button class="btn btn-danger btn-icon"
              onclick="event.stopPropagation();deleteNabidkaFromList(${n.id})"
              title="Smazat">🗑️</button>
          </div>
        </div>
      </div>`;
    }).join('')}
  `;
}

// Předdefinované texty nabídky — beze změny (stejné jako v originale)
const TEXTY_NABIDKY = {
  orientacni: {
    label: '⚖️ Orientační cena & právní doložka',
    text: `UPOZORNĚNÍ — ORIENTAČNÍ CENOVÁ NABÍDKA\n\nTato cenová nabídka má informativní charakter a nepředstavuje závaznou nabídku ve smyslu § 1731 a násl. zákona č. 89/2012 Sb., občanského zákoníku. Ceny jsou orientační a mohou se lišit v závislosti na skutečném stavu podkladu, rozsahu prací, zvoleném materiálu a dalších okolnostech zjistitelných až při zahájení prací.\n\nZávazná smlouva o dílo bude uzavřena písemně po vzájemném odsouhlasení podmínek. Dodavatel si vyhrazuje právo nabídku upravit na základě osobní prohlídky místa plnění.\n\nPlatnost nabídky: 30 dní od data vystavení. Po uplynutí této lhůty je třeba ceny ověřit.`
  },
  procNas: {
    label: '🏆 Proč si vybrat CN Obklady',
    text: `PROČ SI VYBRAT CN OBKLADY — I KDYŽ NEJSME NEJLEVNĚJŠÍ\n\nLevná práce se pozná hned. Špatná práce se pozná za rok, když spára popraská, dlažba se zvedne nebo koupelna začne prosakovat.\n\n✔ Garantujeme přesnost — každý spoj, každý roh, každá lišta je provedena s řemeslnou pečlivostí.\n\n✔ Pracujeme s certifikovanými materiály — používáme výhradně ověřené systémy (Mapei, Sopro, Schlüter).\n\n✔ Dodržujeme termíny — váš harmonogram je pro nás závazek, ne přibližné datum.\n\n✔ Po sobě uklidíme — předáváme hotové dílo připravené k bydlení.\n\n✔ Záruka 24 měsíců na provedené práce v souladu s § 2629 občanského zákoníku.`
  },
  platnost: {
    label: '📅 Platnost nabídky & podmínky',
    text: `PLATNOST A PODMÍNKY NABÍDKY\n\nPlatnost nabídky: 30 kalendářních dní od data vystavení.\n\nCena zahrnuje: materiál dle specifikace, pracovní náklady, základní přípravu podkladu a likvidaci stavebního odpadu vzniklého přímo při pokládce.\n\nCena nezahrnuje: bourací práce, rozvody vody a elektřiny, malířské práce, dopravu materiálu nad 10 km od provozovny.\n\nZáloha: 40 % z celkové ceny díla před zahájením prací. Doplatek po předání dokončeného díla.\n\nZpůsob platby: bankovní převod nebo hotovost dle dohody. Na vyžádání vystavujeme daňový doklad.`
  }
};
