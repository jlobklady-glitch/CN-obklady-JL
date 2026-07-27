// ═══ search.js — JL-OBKLADY CN — Globální vyhledávání ═══

// ── Otevřít / zavřít ──────────────────────────────────────
function openGlobalSearch() {
  const bar = document.getElementById('global-search-bar');
  if (!bar) return;
  bar.classList.add('show');
  setTimeout(() => document.getElementById('global-search-input')?.focus(), 80);
  document.addEventListener('keydown', _searchEscHandler);
}

function closeGlobalSearch() {
  const bar = document.getElementById('global-search-bar');
  if (!bar) return;
  bar.classList.remove('show');
  const inp = document.getElementById('global-search-input');
  if (inp) inp.value = '';
  const res = document.getElementById('global-search-results');
  if (res) res.innerHTML = '';
  document.removeEventListener('keydown', _searchEscHandler);
}

function _searchEscHandler(e) {
  if (e.key === 'Escape') closeGlobalSearch();
}

// ── Debounced search ──────────────────────────────────────
let _searchTimer = null;
function globalSearch(query) {
  clearTimeout(_searchTimer);
  _searchTimer = setTimeout(() => _runGlobalSearch(query), 180);
}

async function _runGlobalSearch(query) {
  const q = query.trim().toLowerCase();
  const res = document.getElementById('global-search-results');
  if (!res) return;

  if (q.length < 2) {
    res.innerHTML = `<div style="padding:1.5rem;text-align:center;color:var(--c-ink3);font-size:0.85rem">
      Zadej alespoň 2 znaky
    </div>`;
    return;
  }

  // Paralelní načtení všech dat
  const [nabidky, zakaznici, ceniky, prace] = await Promise.all([
    dbGetAll('nabidky'),
    dbGetAll('zakaznici'),
    dbGetAll('ceniky'),
    dbGetAll('prace'),
  ]);

  const results = [];

  // Nabídky
  nabidky.forEach(n => {
    const score = _matchScore(q, [
      n.nazev, n.zakaznik, n.cisloNabidky,
      n.mistoRealizace, n.pozn, n.material
    ]);
    if (score > 0) results.push({
      type: 'nabidka', score,
      id: n.id, nazev: n.nazev,
      sub: `${formatCisloNabidky(n)} · ${n.datum} · ${parseInt(n.cenaCelkem||0).toLocaleString('cs')} Kč`,
      icon: '📋',
      action: () => { closeGlobalSearch(); navigate('nabidkaDetail', { editId: n.id }); }
    });
  });

  // Zákazníci
  zakaznici.forEach(z => {
    const score = _matchScore(q, [z.jmeno, z.tel, z.email, z.adresa]);
    if (score > 0) results.push({
      type: 'zakaznik', score,
      id: z.id, nazev: z.jmeno,
      sub: [z.tel, z.email].filter(Boolean).join(' · ') || 'Zákazník',
      icon: '👤',
      action: () => { closeGlobalSearch(); navigate('zakaznici'); }
    });
  });

  // Materiál / ceník
  ceniky.forEach(c => {
    const score = _matchScore(q, [c.nazev, c.kod, c.kategorie]);
    if (score > 0) results.push({
      type: 'cenik', score,
      id: c.id, nazev: c.nazev,
      sub: `${c.cena} Kč/${c.jednotka} · ${c.kategorie || 'Ceník'}`,
      icon: '📦',
      action: () => { closeGlobalSearch(); navigate('ceniky'); }
    });
  });

  // Práce / ceník prací
  prace.forEach(p => {
    const score = _matchScore(q, [p.popis, p.skupina]);
    if (score > 0) results.push({
      type: 'prace', score,
      id: p.id, nazev: p.popis,
      sub: `${p.cena || p.hodSazba} Kč · ${p.skupina || 'Práce'}`,
      icon: '🛠️',
      action: () => { closeGlobalSearch(); navigate('prace'); }
    });
  });

  // Seřadit podle skóre
  results.sort((a, b) => b.score - a.score);

  if (results.length === 0) {
    res.innerHTML = `<div style="padding:1.5rem;text-align:center;color:var(--c-ink3);font-size:0.85rem">
      Nic nenalezeno pro „${escHtml(query)}"
    </div>`;
    return;
  }

  const typeLabels = {
    nabidka: 'Nabídky', zakaznik: 'Zákazníci',
    cenik: 'Ceník materiálu', prace: 'Ceník prací'
  };

  // Seskupit po typech
  const grouped = {};
  results.forEach(r => {
    if (!grouped[r.type]) grouped[r.type] = [];
    grouped[r.type].push(r);
  });

  let html = `<div style="padding:0.5rem 0.8rem;font-size:0.68rem;font-weight:700;color:var(--c-ink3);
    text-transform:uppercase;letter-spacing:0.08em;border-bottom:1px solid var(--c-border)">
    ${results.length} výsledků pro „${escHtml(query)}"
  </div>`;

  Object.entries(grouped).forEach(([type, items]) => {
    html += `<div style="padding:0.5rem 0.8rem 0.2rem;font-size:0.65rem;font-weight:700;
      color:var(--c-terra);text-transform:uppercase;letter-spacing:0.08em">
      ${typeLabels[type] || type}
    </div>`;
    items.slice(0, 6).forEach((item, idx) => {
      html += `<div onclick="window._searchResults[${results.indexOf(item)}].action()"
        style="display:flex;align-items:center;gap:0.7rem;padding:0.65rem 0.9rem;
          cursor:pointer;border-bottom:1px solid var(--c-s2);
          transition:background 0.12s;active:background:var(--c-s2)"
        onmousedown="this.style.background='var(--c-s2)'"
        ontouchstart="this.style.background='var(--c-s2)'"
        ontouchend="this.style.background=''"
        onmouseup="this.style.background=''">
        <span style="font-size:1.25rem;flex-shrink:0">${item.icon}</span>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:0.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            ${_highlightMatch(escHtml(item.nazev || ''), q)}
          </div>
          <div style="font-size:0.72rem;color:var(--c-ink3);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            ${escHtml(item.sub || '')}
          </div>
        </div>
        <span style="font-size:0.8rem;color:var(--c-ink3);flex-shrink:0">›</span>
      </div>`;
    });
  });

  res.innerHTML = html;
  window._searchResults = results;
}

// ── Scoring — váhy pro různá pole ─────────────────────────
function _matchScore(query, fields) {
  let score = 0;
  fields.forEach((field, idx) => {
    if (!field) return;
    const f = field.toString().toLowerCase();
    if (f === query) score += 100;                     // přesná shoda
    else if (f.startsWith(query)) score += 60;         // začíná dotazem
    else if (f.includes(query)) score += 30;           // obsahuje dotaz
    // Bonifikace pro první pole (název)
    if (idx === 0 && f.includes(query)) score += 20;
  });
  return score;
}

// ── Zvýraznění shody ──────────────────────────────────────
function _highlightMatch(text, query) {
  if (!query || !text) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return text.slice(0, idx) +
    `<mark style="background:rgba(200,80,42,0.2);color:var(--c-terra);border-radius:2px;padding:0 1px">${text.slice(idx, idx + query.length)}</mark>` +
    text.slice(idx + query.length);
}

// ── Keyboard shortcut: / pro otevření searche ─────────────
document.addEventListener('keydown', (e) => {
  const tag = document.activeElement?.tagName;
  const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  if (e.key === '/' && !inInput) {
    e.preventDefault();
    openGlobalSearch();
  }
});
