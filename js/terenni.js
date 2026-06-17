// ═══ terenni.js — JL-OBKLADY CN v4 — Terénní nástroje ═══

// ── GPS lokace ────────────────────────────────────────────
async function ziskatGPSAdresu() {
  if (!navigator.geolocation) { toast('GPS není dostupná', 'err'); return null; }
  return new Promise((resolve) => {
    toast('📍 Zjišťuji polohu…');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=cs`,
            { headers: { 'User-Agent': 'JL-OBKLADY-CN/4.0' } }
          );
          const data = await resp.json();
          const addr = data.address;
          const adresa = [
            addr.road ? addr.road + (addr.house_number ? ' ' + addr.house_number : '') : '',
            addr.city || addr.town || addr.village || '',
            addr.postcode || '',
          ].filter(Boolean).join(', ');
          toast('📍 ' + adresa);
          resolve({ lat, lon, adresa, raw: data });
        } catch (e) {
          const adresa = `GPS: ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
          toast('📍 ' + adresa);
          resolve({ lat, lon, adresa, raw: null });
        }
      },
      (err) => { toast('GPS chyba: ' + err.message, 'err'); resolve(null); },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  });
}

// ── Rychlé hodiny (modal) ─────────────────────────────────
function rychleHodiny() {
  const existing = document.getElementById('rychle-hodiny-modal');
  if (existing) { existing.remove(); return; }

  const dnes = new Date().toISOString().slice(0, 10);
  const cas  = new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });

  const div = document.createElement('div');
  div.id = 'rychle-hodiny-modal';
  div.style.cssText = `
    position:fixed;inset:0;z-index:2000;
    background:rgba(22,20,15,0.65);backdrop-filter:blur(8px);
    display:flex;align-items:flex-end;
  `;
  div.onclick = (e) => { if (e.target === div) div.remove(); };

  div.innerHTML = `
    <div style="
      background:var(--c-surface);
      border-radius:var(--r) var(--r) 0 0;
      padding:1.3rem 1.1rem;
      width:100%;
      max-height:88dvh;
      overflow-y:auto;
      animation:slideUp 0.25s var(--ease) both;
    ">
      <div style="width:36px;height:3.5px;background:var(--c-border2);
        border-radius:100px;margin:0 auto 1rem"></div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
        <div>
          <div style="font-family:var(--f-display);font-weight:800;font-size:1.05rem">⚡ Rychlé hodiny</div>
          <div style="font-size:0.72rem;color:var(--c-ink3)">${dnes} · ${cas}</div>
        </div>
        <button onclick="document.getElementById('rychle-hodiny-modal').remove()"
          style="background:var(--c-s2);border:none;border-radius:50%;width:32px;height:32px;
            cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;
            color:var(--c-ink2)">✕</button>
      </div>
      <div id="rychle-hodiny-form">
        <div style="font-size:0.82rem;color:var(--c-ink3);padding:1rem;text-align:center">
          <div class="spinner" style="margin:0 auto 0.5rem"></div>
          Načítám pracovníky…
        </div>
      </div>
    </div>`;

  document.body.appendChild(div);

  Promise.all([dbGetAll('pracovnici'), dbGetAll('nabidky')]).then(([pracovnici, nabidky]) => {
    const form = document.getElementById('rychle-hodiny-form');
    if (!form) return;

    if (pracovnici.length === 0) {
      form.innerHTML = `
        <div style="text-align:center;padding:1rem">
          <div style="font-size:2rem;margin-bottom:0.5rem">👷</div>
          <p style="color:var(--c-ink3);margin-bottom:0.8rem;font-size:0.88rem">
            Nejsou přidáni pracovníci.
          </p>
          <button class="btn btn-primary btn-sm"
            onclick="navigate('pracovnici')">➕ Přidat pracovníky</button>
        </div>`;
      return;
    }

    const pracOpt = pracovnici.map(p =>
      `<option value="${p.id}">${p.jmeno} (${p.sazba} Kč/h)</option>`
    ).join('');
    const nabOpt  = `<option value="">— žádná zakázka —</option>` +
      nabidky.slice(-20).reverse().map(n =>
        `<option value="${n.id}">${escHtml(n.nazev || 'Nabídka #' + n.id)}</option>`
      ).join('');
    const odCas = new Date().toTimeString().slice(0, 5);

    form.innerHTML = `
      <div class="field">
        <label>👷 Pracovník</label>
        <select id="rh_pracovnik">${pracOpt}</select>
      </div>
      <div class="field-row">
        <div class="field">
          <label>⏰ Od</label>
          <input type="time" id="rh_od" value="${odCas}" oninput="rhPrepocitat()">
        </div>
        <div class="field">
          <label>⏰ Do</label>
          <input type="time" id="rh_do" placeholder="—" oninput="rhPrepocitat()">
        </div>
      </div>
      <div id="rh_vypocet" style="background:var(--c-s2);border-radius:var(--r-sm);
        padding:0.6rem;margin-bottom:0.8rem;font-weight:700;color:var(--c-terra);
        text-align:center;font-size:1.1rem;font-family:var(--f-display);display:none">
        ⏱️ 0 h
      </div>
      <div class="field">
        <label>📋 Zakázka (volitelné)</label>
        <select id="rh_nabidka">${nabOpt}</select>
      </div>
      <div class="field">
        <label>📝 Poznámka</label>
        <input id="rh_poznamka" placeholder="Stručný popis práce…">
      </div>
      <button class="btn btn-primary btn-full" onclick="rhUlozit('${dnes}')">
        💾 Uložit hodiny
      </button>
      <div style="height:0.5rem"></div>`;
  });
}

function rhPrepocitat() {
  const od    = document.getElementById('rh_od')?.value;
  const doCas = document.getElementById('rh_do')?.value;
  const el    = document.getElementById('rh_vypocet');
  if (!el) return;
  if (!od || !doCas) { el.style.display = 'none'; return; }
  const h = vypocitatHodiny(od, doCas);
  if (h > 0) { el.style.display = 'block'; el.textContent = `⏱️ ${h} h`; }
  else        { el.style.display = 'none'; }
}

async function rhUlozit(datum) {
  const pracovnikId = parseInt(document.getElementById('rh_pracovnik')?.value);
  const nabidkaId   = parseInt(document.getElementById('rh_nabidka')?.value) || null;
  const od          = document.getElementById('rh_od')?.value;
  const doCas       = document.getElementById('rh_do')?.value;
  const poznamka    = document.getElementById('rh_poznamka')?.value?.trim() || '';

  if (!pracovnikId) { toast('Vyber pracovníka', 'err'); return; }
  if (!od)          { toast('Zadej čas od', 'err');     return; }

  const hodiny    = doCas ? vypocitatHodiny(od, doCas) : 0;
  const [pracovnici, nabidky] = await Promise.all([dbGetAll('pracovnici'), dbGetAll('nabidky')]);
  const p = pracovnici.find(x => x.id === pracovnikId);
  const n = nabidky.find(x => x.id === nabidkaId);

  await dbPut('hodiny', {
    pracovnikId,
    pracovnikJmeno: p?.jmeno || '?',
    pracovnikBarva: p?.barva || '#3b82f6',
    nabidkaId:      nabidkaId || null,
    nabidkaNazev:   n?.nazev || null,
    datum, od,
    do:     doCas || od,
    hodiny: hodiny || 0,
    poznamka,
  });

  document.getElementById('rychle-hodiny-modal')?.remove();
  toast(`✓ Uloženo: ${hodiny}h — ${p?.jmeno || ''}`);
  if (state.page === 'kalendar' || state.page === 'dashboard') await render();
}

// ── Rychlá kalkulačka (modal) ─────────────────────────────
function rychlaKalkulacka() {
  const existing = document.getElementById('teren-kalk-modal');
  if (existing) { existing.remove(); return; }

  const div = document.createElement('div');
  div.id = 'teren-kalk-modal';
  div.style.cssText = `
    position:fixed;inset:0;z-index:2000;
    background:rgba(22,20,15,0.65);backdrop-filter:blur(8px);
    display:flex;align-items:flex-end;
  `;
  div.onclick = (e) => { if (e.target === div) div.remove(); };

  div.innerHTML = `
    <div style="
      background:var(--c-surface);
      border-radius:var(--r) var(--r) 0 0;
      padding:1.3rem 1.1rem;
      width:100%;
      animation:slideUp 0.25s var(--ease) both;
    ">
      <div style="width:36px;height:3.5px;background:var(--c-border2);
        border-radius:100px;margin:0 auto 1rem"></div>
      <div style="font-family:var(--f-display);font-weight:800;font-size:1.05rem;margin-bottom:0.9rem">
        🧮 Terénní kalkulačka
      </div>

      <!-- Výpočet plochy -->
      <div style="background:var(--c-s2);border-radius:var(--r-sm);padding:0.9rem;margin-bottom:0.8rem">
        <div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;
          letter-spacing:0.09em;color:var(--c-ink3);margin-bottom:0.6rem">
          📐 Výpočet plochy místnosti
        </div>
        <div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.5rem">
          <input type="number" id="tk_sirka" placeholder="Šířka (cm)" min="0"
            style="flex:1;padding:0.6rem;border:1.5px solid var(--c-border);
              border-radius:var(--r-sm);font-family:var(--f-body);font-size:1rem;text-align:center;
              background:var(--c-bg);color:var(--c-ink)"
            oninput="tkPrepocitat()">
          <span style="font-weight:600;color:var(--c-ink3)">×</span>
          <input type="number" id="tk_delka" placeholder="Délka (cm)" min="0"
            style="flex:1;padding:0.6rem;border:1.5px solid var(--c-border);
              border-radius:var(--r-sm);font-family:var(--f-body);font-size:1rem;text-align:center;
              background:var(--c-bg);color:var(--c-ink)"
            oninput="tkPrepocitat()">
        </div>
        <div id="tk_plocha" style="font-family:var(--f-display);font-weight:800;
          font-size:1.6rem;color:var(--c-terra);text-align:center;padding:0.3rem">
          0.00 m²
        </div>
      </div>

      <!-- Materiál orientačně -->
      <div style="background:var(--c-s2);border-radius:var(--r-sm);padding:0.9rem;margin-bottom:0.8rem">
        <div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;
          letter-spacing:0.09em;color:var(--c-ink3);margin-bottom:0.6rem">
          🧱 Orientační materiál (na m²)
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.4rem">
          ${[
            { id: 'tk_lepidlo',   label: 'Lepidlo 4 kg/m²',       color: '#1A4FAA' },
            { id: 'tk_sparovka',  label: 'Spárovačka 0.4 kg/m²',  color: '#1E6B4A' },
            { id: 'tk_hydro',     label: 'Hydroizolace 2 kg/m²',   color: '#7c3aed' },
            { id: 'tk_penetrace', label: 'Penetrace 0.15 L/m²',    color: '#C8502A' },
          ].map(item => `
            <div style="background:var(--c-surface);border-radius:var(--r-xs);
              padding:0.5rem 0.65rem;border:1px solid var(--c-border)">
              <div style="font-size:0.65rem;color:var(--c-ink3);margin-bottom:2px">${item.label}</div>
              <div id="${item.id}" style="font-weight:700;font-size:0.95rem;color:${item.color}">0</div>
            </div>`).join('')}
        </div>
      </div>

      <button class="btn btn-primary btn-full" onclick="tkPrevestDoNabidky()">
        📋 Přenést plochu do nové nabídky
      </button>
      <button onclick="document.getElementById('teren-kalk-modal').remove()"
        class="btn btn-secondary btn-full" style="margin-top:0.4rem">
        Zavřít
      </button>
    </div>`;

  document.body.appendChild(div);
  setTimeout(() => document.getElementById('tk_sirka')?.focus(), 100);
}

function tkPrepocitat() {
  const s  = parseFloat(document.getElementById('tk_sirka')?.value)  || 0;
  const d  = parseFloat(document.getElementById('tk_delka')?.value)  || 0;
  const m2 = (s * d) / 10000;

  const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setTxt('tk_plocha',    m2.toFixed(2) + ' m²');
  setTxt('tk_lepidlo',   Math.ceil(m2 * 4) + ' kg');
  setTxt('tk_sparovka',  (m2 * 0.4).toFixed(1) + ' kg');
  setTxt('tk_hydro',     Math.ceil(m2 * 2) + ' kg');
  setTxt('tk_penetrace', (m2 * 0.15).toFixed(2) + ' L');
}

function tkPrevestDoNabidky() {
  const s  = parseFloat(document.getElementById('tk_sirka')?.value)  || 0;
  const d  = parseFloat(document.getElementById('tk_delka')?.value)  || 0;
  const m2 = ((s * d) / 10000).toFixed(2);
  document.getElementById('teren-kalk-modal')?.remove();
  if (parseFloat(m2) > 0) {
    navigate('novaNabidka').then(() => {
      setTimeout(() => {
        const el = document.getElementById('nc_plocha');
        if (el) el.value = m2;
        switchTab('calc');
      }, 100);
    });
  }
}

// ── Rychlá poznámka ───────────────────────────────────────
async function rychlaPoznamka(nabidkaId) {
  const n = nabidkaId ? await dbGet('nabidky', nabidkaId) : null;
  showBottomSheet('📝 Rychlá poznámka', `
    ${n ? `<div style="font-size:0.78rem;color:var(--c-terra);font-weight:600;margin-bottom:0.6rem">📋 ${escHtml(n.nazev)}</div>` : ''}
    <textarea id="rp_text" rows="4" autofocus
      style="width:100%;padding:0.7rem;border:1.5px solid var(--c-border);border-radius:var(--r-sm);
        font-family:var(--f-body);font-size:0.95rem;resize:none;background:var(--c-bg);
        color:var(--c-ink)"
      placeholder="Zapiš poznámku, domluvený postup, problém…"></textarea>
    <button onclick="rpUlozit(${nabidkaId || 'null'})"
      class="btn btn-primary btn-full" style="margin-top:0.6rem">💾 Uložit poznámku</button>
  `);
  setTimeout(() => document.getElementById('rp_text')?.focus(), 100);
}

async function rpUlozit(nabidkaId) {
  const text = document.getElementById('rp_text')?.value?.trim();
  if (!text) { toast('Zadej text poznámky', 'err'); return; }

  if (nabidkaId) {
    const n = await dbGet('nabidky', nabidkaId);
    if (n) {
      if (!n.komunikace) n.komunikace = [];
      const { datum, cas, iso } = _casRazitko();
      n.komunikace.unshift({ id: 'k' + Date.now(), typ: 'poznamka', text, datum, cas, iso });
      await dbPut('nabidky', n);
      toast('Poznámka přidána k zakázce ✓');
    }
  } else {
    const poznamky = JSON.parse(localStorage.getItem('cn_rychle_poznamky') || '[]');
    poznamky.unshift({ id: Date.now(), text, datum: new Date().toLocaleDateString('cs-CZ'), iso: new Date().toISOString() });
    if (poznamky.length > 50) poznamky.splice(50);
    localStorage.setItem('cn_rychle_poznamky', JSON.stringify(poznamky));
    toast('Poznámka uložena ✓');
  }

  closeBottomSheet();
  if (state.page === 'nabidkaDetail' || state.page === 'dashboard') await render();
}

// ── Denní přehled ─────────────────────────────────────────
async function zobrazitDenniPrehled() {
  const dnes = new Date().toISOString().slice(0, 10);
  const [hodiny, pracovnici] = await Promise.all([dbGetAll('hodiny'), dbGetAll('pracovnici')]);
  const dnesHodiny = hodiny.filter(h => h.datum === dnes);
  const celkH      = dnesHodiny.reduce((s, h) => s + h.hodiny, 0);

  const byPrac = {};
  dnesHodiny.forEach(h => {
    if (!byPrac[h.pracovnikId]) {
      byPrac[h.pracovnikId] = {
        jmeno:  h.pracovnikJmeno,
        hodiny: 0,
        barva:  h.pracovnikBarva || '#3b82f6',
        zakazky: new Set(),
      };
    }
    byPrac[h.pracovnikId].hodiny += h.hodiny;
    if (h.nabidkaNazev) byPrac[h.pracovnikId].zakazky.add(h.nabidkaNazev);
  });

  const rows = Object.values(byPrac).map(p => `
    <div style="display:flex;align-items:center;gap:0.7rem;padding:0.6rem 0;
      border-bottom:1px solid var(--c-border)">
      <div style="width:36px;height:36px;border-radius:50%;background:${p.barva};
        display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0">👷</div>
      <div style="flex:1">
        <div style="font-weight:600;font-size:0.9rem">${escHtml(p.jmeno)}</div>
        ${p.zakazky.size ? `<div style="font-size:0.72rem;color:var(--c-ink3)">${[...p.zakazky].join(', ')}</div>` : ''}
      </div>
      <div style="font-family:var(--f-display);font-weight:800;font-size:1.1rem;color:var(--c-terra)">
        ${p.hodiny}h
      </div>
    </div>`).join('');

  showBottomSheet('📅 Dnešní přehled', `
    <div style="font-size:0.72rem;color:var(--c-ink3);margin-bottom:0.8rem">
      ${new Date().toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' })}
    </div>
    ${rows || `<div style="text-align:center;color:var(--c-ink3);padding:1.2rem 0;font-size:0.88rem">Dnes zatím žádné hodiny.</div>`}
    <div style="display:flex;justify-content:space-between;align-items:center;
      padding:0.7rem 0;margin-top:0.3rem;border-top:2px solid var(--c-terra)">
      <span style="font-weight:700">Celkem dnes:</span>
      <span style="font-family:var(--f-display);font-weight:800;font-size:1.25rem;color:var(--c-terra)">${celkH}h</span>
    </div>
    <div style="display:flex;gap:0.4rem;margin-top:0.4rem">
      <button onclick="navigate('kalendar');closeBottomSheet()"
        class="btn btn-secondary" style="flex:1;justify-content:center">📅 Kalendář</button>
      <button onclick="closeBottomSheet();setTimeout(rychleHodiny,100)"
        class="btn btn-primary" style="flex:1;justify-content:center">➕ Hodiny</button>
    </div>
  `);
}

// ── FAB (Floating Action Button) ──────────────────────────
function renderFAB() {
  document.getElementById('fab-container')?.remove();

  const fabPages = ['dashboard', 'nabidky', 'kalendar'];
  if (!fabPages.includes(state.page)) return;

  const fab = document.createElement('div');
  fab.id = 'fab-container';

  const menuItems = [
    { icon: '⏱️', label: 'Rychlé hodiny',  action: "rychleHodiny();toggleFAB()" },
    { icon: '📅', label: 'Denní přehled',  action: "zobrazitDenniPrehled();toggleFAB()" },
    { icon: '🧮', label: 'Kalkulačka',     action: "rychlaKalkulacka();toggleFAB()" },
    { icon: '📝', label: 'Rychlá poznámka',action: "rychlaPoznamka(null);toggleFAB()" },
    { icon: '➕', label: 'Nová nabídka',   action: "navigate('novaNabidka');toggleFAB()", primary: true },
  ];

  fab.innerHTML = `
    <div id="fab-menu" style="display:none;flex-direction:column;align-items:flex-end;
      gap:0.4rem;margin-bottom:0.4rem">
      ${menuItems.map(item => `
        <button onclick="${item.action}" class="fab-item"
          style="${item.primary ? 'background:var(--c-terra);color:white;border-color:var(--c-terra);font-weight:700;box-shadow:0 2px 12px rgba(200,80,42,0.4)' : ''}">
          ${item.icon} ${item.label}
        </button>`).join('')}
    </div>
    <button id="fab-main" onclick="toggleFAB()">⚡</button>`;

  document.body.appendChild(fab);
}

let _fabOpen = false;
function toggleFAB() {
  _fabOpen = !_fabOpen;
  const menu = document.getElementById('fab-menu');
  const btn  = document.getElementById('fab-main');
  if (menu) menu.style.display = _fabOpen ? 'flex' : 'none';
  if (btn) {
    btn.style.transform  = _fabOpen ? 'rotate(45deg) scale(1.05)' : 'rotate(0) scale(1)';
    btn.style.background = _fabOpen ? 'var(--c-ink)' : 'var(--c-terra)';
    btn.textContent      = _fabOpen ? '✕' : '⚡';
  }
}

// ── GPS do nabídky ────────────────────────────────────────
async function pridatGPSDoNabidky(nabidkaId) {
  const gps = await ziskatGPSAdresu();
  if (!gps) return;
  const n = await dbGet('nabidky', nabidkaId);
  if (!n) return;
  if (!n.mistoRealizace && gps.adresa) {
    n.mistoRealizace = gps.adresa;
    await dbPut('nabidky', n);
    toast('📍 Adresa doplněna z GPS');
    await render();
  } else {
    toast('📍 ' + gps.adresa + ' (již vyplněno)');
  }
}

// ── Offline banner ────────────────────────────────────────
let _offlineBanner = null;
function _updateOfflineBanner(isOnline) {
  if (!isOnline) {
    if (_offlineBanner) return;
    _offlineBanner = document.createElement('div');
    _offlineBanner.id = 'offline-banner';
    _offlineBanner.innerHTML = `<span>📵</span><span>Offline režim — data se ukládají lokálně</span>`;
    document.body.prepend(_offlineBanner);
    const app = document.getElementById('app');
    if (app) app.style.paddingTop = '2.2rem';
  } else {
    if (_offlineBanner) {
      _offlineBanner.remove();
      _offlineBanner = null;
      const app = document.getElementById('app');
      if (app) app.style.paddingTop = '';
    }
  }
}

window.addEventListener('online',  () => _updateOfflineBanner(true));
window.addEventListener('offline', () => _updateOfflineBanner(false));
if (!navigator.onLine) _updateOfflineBanner(false);

// ── FAB re-init po každém renderu ─────────────────────────
document.addEventListener('page-rendered', () => {
  _fabOpen = false;
  renderFAB();
});
