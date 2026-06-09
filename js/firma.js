// ═══ firma.js — JL-OBKLADY CN v4 ═══

async function loadFirma() {
  const keys  = ['nazev','podtitul','adresa','telefon','email','ico','dic','ucet','poznamka'];
  const firma = {};
  await Promise.all(keys.map(async k => {
    try {
      const row  = await dbGet('nastaveni', 'firma_' + k);
      firma[k]   = row?.hodnota || '';
    } catch (e) { firma[k] = ''; }
  }));
  firma.nazev    = firma.nazev    || 'Název firmy';
  firma.podtitul = firma.podtitul || 'Pokládka obkladů a dlažby';
  return firma;
}

async function saveFirma() {
  const keys = ['nazev','podtitul','adresa','telefon','email','ico','dic','ucet','poznamka'];
  await Promise.all(keys.map(k => {
    const el = document.getElementById('firma_' + k);
    if (!el) return;
    return dbPut('nastaveni', { klic: 'firma_' + k, hodnota: el.value.trim() });
  }));
  toast('Nastavení firmy uloženo ✓');
  navigate('firma');
}

async function pageFirmaSettings() {
  const firma = await loadFirma();

  const field = (id, label, placeholder, val, type = 'text') => `
    <div class="field">
      <label>${label}</label>
      <input type="${type}" id="firma_${id}" placeholder="${escHtml(placeholder)}"
        value="${escHtml(val || '')}">
    </div>`;

  return `
    <div class="header-bar">
      <button onclick="navigate('dashboard')"
        style="background:none;border:none;font-size:1.3rem;cursor:pointer;
          color:white;padding:0.2rem">←</button>
      <div>
        <h1>Nastavení firmy</h1>
        <div class="subtitle">Údaje v PDF nabídkách</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">🏢 Identifikace</div>
      ${field('nazev',    'Název firmy',    'CN Obklady s.r.o.',         firma.nazev)}
      ${field('podtitul', 'Podtitul / obor','Pokládka obkladů a dlažby', firma.podtitul)}
      ${field('ico',      'IČO',            '12345678',                  firma.ico)}
      ${field('dic',      'DIČ',            'CZ12345678',                firma.dic)}
    </div>

    <div class="card">
      <div class="card-title">📍 Kontakt</div>
      ${field('adresa',  'Adresa',          'Ulice 123, 123 45 Město',   firma.adresa)}
      ${field('telefon', 'Telefon',         '+420 777 123 456',          firma.telefon)}
      ${field('email',   'E-mail',          'info@firma.cz',             firma.email, 'email')}
      ${field('ucet',    'Bankovní účet',   '123456789/0800',            firma.ucet)}
    </div>

    <div class="card">
      <div class="card-title">📝 Text v patičce PDF</div>
      <div class="field">
        <label>Vlastní text patičky</label>
        <textarea id="firma_poznamka" rows="3"
          placeholder="Platba do 14 dní na účet…">${escHtml(firma.poznamka || '')}</textarea>
      </div>
    </div>

    <button class="btn btn-primary btn-full" onclick="saveFirma()">
      💾 Uložit nastavení
    </button>

    <!-- Téma -->
    <div class="card" style="margin-top:0.5rem">
      <div class="card-title">🎨 Vzhled aplikace</div>
      <div style="display:flex;gap:0.5rem">
        ${[
          { theme: 'light', icon: '☀️', label: 'Světlý' },
          { theme: 'dark',  icon: '🌙', label: 'Tmavý'  },
          { theme: 'auto',  icon: '🖥️', label: 'Systém' },
        ].map(t => {
          const cur = localStorage.getItem('cn_theme') || 'auto';
          const active = cur === t.theme || (t.theme === 'auto' && !localStorage.getItem('cn_theme'));
          return `<button onclick="_setThemeDirect('${t.theme}')"
            style="flex:1;padding:0.6rem;border-radius:var(--r-sm);
              border:2px solid ${active ? 'var(--c-terra)' : 'var(--c-border)'};
              background:${active ? 'var(--c-terra-soft)' : 'var(--c-s2)'};
              color:${active ? 'var(--c-terra)' : 'var(--c-ink2)'};
              cursor:pointer;font-family:var(--f-body);font-size:0.8rem;font-weight:600">
            ${t.icon} ${t.label}
          </button>`;
        }).join('')}
      </div>
    </div>

    <!-- Záloha -->
    <div class="card card-success" style="margin-top:0.5rem">
      <div class="card-title" style="color:var(--c-green)">💾 Záloha dat</div>
      <p style="font-size:0.82rem;color:var(--c-ink2);margin-bottom:0.8rem;line-height:1.5">
        Stáhni zálohu všech dat do souboru. Uchovej ho v Stažení nebo na SD kartě.
        Při výměně telefonu ji nahraj zpět.
      </p>
      <button class="btn btn-success btn-full" onclick="exportZaloha()">
        ⬇️ Stáhnout zálohu (.json)
      </button>
      <div style="margin-top:0.6rem;background:var(--c-s2);border-radius:var(--r-sm);
        padding:0.8rem;display:flex;align-items:center;gap:0.7rem;cursor:pointer"
        onclick="document.getElementById('importFile').click()">
        <span style="font-size:1.4rem">📂</span>
        <div>
          <div style="font-weight:600;font-size:0.88rem">Obnovit ze zálohy</div>
          <div style="font-size:0.75rem;color:var(--c-ink3)">Vyber .json soubor zálohy</div>
        </div>
        <input type="file" id="importFile" accept=".json"
          style="position:absolute;opacity:0;width:1px;height:1px"
          onchange="importZaloha(this)">
      </div>
    </div>

    <!-- Nebezpečná zóna -->
    <div class="card" style="margin-top:0.5rem;border:2px solid var(--c-red-s)">
      <div class="card-title" style="color:var(--c-red)">⚠️ Nebezpečná zóna</div>
      <button class="btn btn-danger btn-full" onclick="smazatVsechnaData()">
        🗑️ Smazat všechna data
      </button>
    </div>

    <div style="height:5rem"></div>`;
}

// ── Theme setter z nastavení ──────────────────────────────
function _setThemeDirect(theme) {
  const html = document.documentElement;
  if (theme === 'auto') {
    html.removeAttribute('data-theme');
    localStorage.removeItem('cn_theme');
    toast('Systémové téma ✓');
  } else {
    html.setAttribute('data-theme', theme);
    localStorage.setItem('cn_theme', theme);
    toast(theme === 'dark' ? '🌙 Tmavý režim ✓' : '☀️ Světlý režim ✓');
  }
  // Re-render pro aktualizaci tlačítek
  render();
}
