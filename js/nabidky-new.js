// ═══ nabidky-new.js — JL-OBKLADY CN v4 ═══

// ── Draft management ──────────────────────────────────────
window._praceSurfaceData = window._praceSurfaceData || {};

function saveDraftNabidka() {
  if (state.page !== 'novaNabidka') return;
  const draft = {
    nazev:        document.getElementById('nc_nazev')?.value    || '',
    pozn:         document.getElementById('nc_pozn')?.value     || '',
    zak:          document.getElementById('nc_zak')?.value      || '',
    plocha:       document.getElementById('nc_plocha')?.value   || '',
    marze:        document.getElementById('nc_marze')?.value    || '28',
    sirka:        document.getElementById('nc_sirka')?.value    || '',
    delka:        document.getElementById('nc_delka')?.value    || '',
    matId:        document.getElementById('nc_material')?.value || '',
    praceChecked: Array.from(document.querySelectorAll('[id^="prace_"]:checked'))
                       .map(el => el.value),
    pudorys:      window.currentPudorysData?.ploch || [],
    timestamp:    Date.now(),
  };
  localStorage.setItem('cn_draft_nabidka', JSON.stringify(draft));
}

function loadDraftNabidka() {
  try {
    const raw = localStorage.getItem('cn_draft_nabidka');
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (Date.now() - (d.timestamp || 0) > 7 * 24 * 3600 * 1000) {
      localStorage.removeItem('cn_draft_nabidka');
      return null;
    }
    return d;
  } catch (e) { return null; }
}

function clearDraftNabidka() {
  localStorage.removeItem('cn_draft_nabidka');
}

function applyDraftToForm(draft) {
  if (!draft) return;
  setTimeout(() => {
    const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
    set('nc_nazev',   draft.nazev);
    set('nc_pozn',    draft.pozn);
    set('nc_zak',     draft.zak);
    set('nc_plocha',  draft.plocha);
    set('nc_marze',   draft.marze);
    set('nc_sirka',   draft.sirka);
    set('nc_delka',   draft.delka);
    set('nc_material',draft.matId);
    if (draft.pudorys?.length) window.currentPudorysData = { ploch: draft.pudorys };
    if (draft.praceChecked?.length) {
      draft.praceChecked.forEach(id => {
        const el = document.getElementById('prace_' + id);
        if (el) el.checked = true;
      });
    }
    toast('✓ Rozpracovaná nabídka obnovena');
  }, 80);
}

let tmpNabidka = null;

// ── Helper: render záložky Práce ──────────────────────────
function _renderPraceSkupiny(prace) {
  const skupiny = [...new Set(prace.map(p => p.skupina || 'Ostatní'))];
  return skupiny.map(skupina => {
    const items = prace.filter(p => (p.skupina || 'Ostatní') === skupina);
    const itemsHtml = items.map(p => {
      const jedn       = p.jednotka || 'm²';
      const defaultQty = jedn === 'm²' ? '{{PLOCHA}}' : jedn === 'hod' ? '1' : '';
      const sazba      = p.hodSazba > 0 ? p.hodSazba : p.cena;
      const jLabel     = p.hodSazba > 0 ? 'hod' : jedn;
      return `
        <div style="padding:0.52rem 0;border-bottom:1px solid var(--c-s2)"
          id="prace-row-${p.id}">
          <div style="display:flex;align-items:flex-start;gap:0.6rem">
            <input type="checkbox" id="prace_${p.id}" value="${p.id}"
              data-cena="${sazba}" data-jedn="${jLabel}"
              style="width:auto;margin-top:3px;flex-shrink:0;accent-color:var(--c-terra)"
              onchange="praceToggle(${p.id},${sazba},'${jLabel}','${defaultQty}')">
            <div style="flex:1;min-width:0">
              <label for="prace_${p.id}"
                style="font-weight:500;font-size:0.85rem;cursor:pointer;display:block;line-height:1.3">
                ${escHtml(p.popis)}
              </label>
              <div style="font-size:0.72rem;color:var(--c-terra);font-weight:600;margin-top:1px">
                ${sazba} Kč/${jLabel}
              </div>
            </div>
          </div>
          <div id="prace-qty-${p.id}"
            style="display:none;margin-top:0.42rem;border-radius:var(--r-sm);
              border:1.5px solid var(--c-terra);overflow:hidden;
              background:rgba(200,80,42,0.04)">
            <div style="display:flex;justify-content:space-between;align-items:center;
              padding:0.28rem 0.5rem;background:rgba(200,80,42,0.07);
              border-bottom:1px solid rgba(200,80,42,0.18)">
              <span id="prace-cena-${p.id}"
                style="font-size:0.8rem;font-weight:700;color:var(--c-terra);min-width:80px">
              </span>
              <button onclick="togglePraceSurfaces(${p.id},${sazba},'${jLabel}')"
                id="prace-mode-btn-${p.id}"
                style="font-size:0.66rem;padding:0.16rem 0.45rem;border-radius:var(--r-xs);
                  border:1.5px solid var(--c-terra);background:white;color:var(--c-terra);
                  cursor:pointer;font-weight:700;white-space:nowrap;font-family:var(--f-body)">
                📐 Plochy
              </button>
            </div>
            <div id="prace-simple-${p.id}"
              style="padding:0.4rem 0.5rem;display:flex;align-items:center;
                gap:0.5rem;flex-wrap:wrap">
              <label style="font-size:0.73rem;color:var(--c-ink2);font-weight:600;
                white-space:nowrap">
                Množství (${jLabel}):
              </label>
              <input type="number" id="qty_${p.id}" min="0" step="0.01"
                style="width:88px;padding:0.28rem 0.45rem;border:1.5px solid var(--c-terra);
                  border-radius:var(--r-xs);font-size:0.88rem;font-weight:700;text-align:center;
                  background:var(--c-bg);color:var(--c-ink)"
                oninput="praceQtyChange(${p.id},${sazba})">
              <span style="font-size:0.7rem;color:var(--c-ink3)">${jLabel}</span>
            </div>
            <div id="prace-surfaces-${p.id}" style="display:none;padding:0.4rem 0.5rem">
              <div id="prace-surface-rows-${p.id}"></div>
              <button onclick="praceAddSurface(${p.id},${sazba},'${jLabel}')"
                style="margin-top:0.3rem;width:100%;padding:0.27rem;border-radius:var(--r-xs);
                  border:1.5px dashed rgba(200,80,42,0.4);background:rgba(200,80,42,0.04);
                  color:var(--c-terra);cursor:pointer;font-size:0.73rem;font-weight:600;
                  font-family:var(--f-body)">
                ➕ Přidat plochu / stěnu
              </button>
            </div>
            <input type="hidden" id="qty_hidden_${p.id}">
          </div>
        </div>`;
    }).join('');

    return `
      <details class="card" style="padding:0;margin-bottom:0.6rem;overflow:hidden" open>
        <summary style="padding:0.75rem 1rem;cursor:pointer;font-weight:700;font-size:0.87rem;
          display:flex;align-items:center;gap:0.5rem;list-style:none;
          background:var(--c-s2);border-bottom:1px solid var(--c-border)">
          <span style="flex:1">${escHtml(skupina)}</span>
          <span style="font-size:0.7rem;color:var(--c-ink3);font-weight:400">
            ${items.length} položek
          </span>
          <span style="font-size:0.78rem">▾</span>
        </summary>
        <div style="padding:0.35rem 0.8rem 0.55rem">${itemsHtml}</div>
      </details>`;
  }).join('');
}

// ── pageNovaNabidka ───────────────────────────────────────
async function pageNovaNabidka() {
  const [materialy, zakaznici, prace] = await Promise.all([
    dbGetAll('ceniky'), dbGetAll('zakaznici'), dbGetAll('prace')
  ]);

  const matOpts = materialy.length === 0
    ? '<option value="">— nejdřív přidej ceník —</option>'
    : `<option value="">— vyber materiál —</option>` +
      materialy.map(m =>
        `<option value="${m.id}" data-cena="${m.cena}" data-jed="${m.jednotka}"
          data-bal="${m.baleni}">${escHtml(m.nazev)} (${m.cena} Kč/${m.jednotka})</option>`
      ).join('');

  const zakOpts = `<option value="">— volitelné —</option>` +
    zakaznici.map(z => `<option value="${z.id}">${escHtml(z.jmeno)}</option>`).join('');

  if (!window.currentPudorysData) window.currentPudorysData = { ploch: [] };

  const plochyHtml = window.currentPudorysData.ploch.map((sec, idx) => {
    const area   = (sec.w * sec.h) / 10000;
    const otvory = (sec.otvory || []).reduce((s, o) => s + ((o.w * o.h) / 10000), 0);
    const clean  = area - otvory;
    return `
      <div style="background:var(--c-s2);padding:0.75rem;border-radius:var(--r-sm);
        margin-bottom:0.5rem;border-left:4px solid var(--c-terra);
        display:flex;justify-content:space-between;align-items:center">
        <div>
          <strong style="display:block;margin-bottom:0.2rem;font-size:0.88rem">
            ${escHtml(sec.name || 'Plocha ' + (idx + 1))}
          </strong>
          <span style="font-size:0.8rem;color:var(--c-ink2)">
            ${sec.w}×${sec.h} cm → ${clean.toFixed(2)} m²
          </span>
          ${sec.otvory?.length ? `
            <div style="font-size:0.75rem;color:var(--c-ink3);margin-top:0.2rem">
              Otvory: ${sec.otvory.map(o => escHtml(o.popis)).join(', ')}
            </div>` : ''}
        </div>
        <div style="display:flex;gap:0.3rem">
          <button class="btn btn-ghost btn-xs" onclick="editPlocha(${idx})">✏️</button>
          <button class="btn btn-danger btn-xs" onclick="deletePlocha(${idx})">🗑️</button>
        </div>
      </div>`;
  }).join('');

  const totalArea = window.currentPudorysData.ploch.reduce((s, x) =>
    s + ((x.w * x.h) / 10000 - (x.otvory || []).reduce((oo, o) => oo + ((o.w * o.h) / 10000), 0)), 0);

  const draft      = loadDraftNabidka();
  const draftBanner = draft && (draft.nazev || draft.plocha || draft.pudorys?.length) ? `
    <div style="background:var(--c-amber-s);border:2px solid var(--c-amber);
      border-radius:var(--r);padding:0.9rem;margin-bottom:1rem;
      display:flex;align-items:center;gap:0.7rem;flex-wrap:wrap">
      <span style="font-size:1.3rem">📝</span>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:0.87rem;color:var(--c-amber)">
          Máš rozdělanou nabídku
        </div>
        <div style="font-size:0.76rem;color:var(--c-amber);margin-top:1px">
          ${draft.nazev ? `"${escHtml(draft.nazev)}"` : 'Bez názvu'} ·
          uloženo ${new Date(draft.timestamp).toLocaleTimeString('cs-CZ',{hour:'2-digit',minute:'2-digit'})}
        </div>
      </div>
      <div style="display:flex;gap:0.4rem">
        <button onclick="obnovitDraft()"
          style="background:var(--c-amber);color:white;border:none;border-radius:var(--r-xs);
            padding:0.38rem 0.75rem;font-weight:700;font-size:0.78rem;cursor:pointer;
            font-family:var(--f-body)">♻️ Obnovit</button>
        <button onclick="zahoditDraft()"
          style="background:var(--c-red-s);color:var(--c-red);border:1.5px solid #fecaca;
            border-radius:var(--r-xs);padding:0.38rem 0.65rem;font-size:0.78rem;
            cursor:pointer;font-family:var(--f-body)">🗑️</button>
      </div>
    </div>` : '';

  return `
    <div class="header-bar">
      <span class="logo">➕</span>
      <div>
        <h1>Nová nabídka</h1>
        <div class="subtitle">Kalkulace & Nákres ploch</div>
      </div>
    </div>

    ${draftBanner}

    <!-- TABs -->
    <div style="display:flex;gap:0.35rem;margin-bottom:1rem;background:var(--c-s2);
      padding:0.38rem;border-radius:var(--r-sm)">
      ${[
        { tab:'info',   icon:'📋', label:'Info' },
        { tab:'pudorys',icon:'✏️', label:'Nákres' },
        { tab:'prace',  icon:'🛠️', label:'Práce' },
        { tab:'calc',   icon:'📊', label:'Výpočet' },
      ].map(t => `
        <button class="tab-btn" data-tab="${t.tab}"
          onclick="switchTab('${t.tab}')"
          style="flex:1;padding:0.48rem 0.2rem;border:none;border-radius:var(--r-xs);
            cursor:pointer;font-weight:600;font-size:0.78rem;font-family:var(--f-body);
            background:transparent;color:var(--c-ink2);transition:all var(--dur)">
          ${t.icon} ${t.label}
        </button>`).join('')}
    </div>

    <!-- ── TAB: INFO ── -->
    <div id="tab-info" class="tab-content">
      <div class="card">
        <div class="card-title">Základní informace</div>
        <div class="field"><label>Název zakázky</label>
          <input id="nc_nazev" placeholder="Koupelna Novákovi – Praha">
        </div>
        <div class="field"><label>Zákazník</label>
          <select id="nc_zak">${zakOpts}</select>
        </div>
        <div class="field-row">
          <div class="field"><label>Místo realizace</label>
            <input id="nc_misto" placeholder="Praha 6, Dejvice">
          </div>
          <div class="field"><label>Termín realizace</label>
            <input type="date" id="nc_termin">
          </div>
        </div>
        <div class="field-row">
          <div class="field"><label>Záloha (%)</label>
            <input type="number" id="nc_zaloha_proc" placeholder="40" min="0" max="100" value="40">
          </div>
          <div class="field"><label>DPH</label>
            <select id="nc_dph">
              <option value="0">Neplátce DPH</option>
              <option value="21">Plátce DPH 21 %</option>
              <option value="12">Plátce DPH 12 %</option>
            </select>
          </div>
        </div>
        <div class="field"><label>Interní poznámka</label>
          <textarea id="nc_pozn" placeholder="Interní poznámky ke zakázce…"></textarea>
        </div>
      </div>
      <button class="btn btn-secondary btn-full" onclick="switchTab('pudorys')">
        ✏️ Nákres ploch →
      </button>
    </div>

    <!-- ── TAB: PUDORYS ── -->
    <div id="tab-pudorys" class="tab-content" style="display:none">
      <div class="card">
        <div class="card-title">✏️ Půdorys a nákres ploch</div>
        <p style="font-size:0.85rem;color:var(--c-ink2);margin-bottom:0.8rem;line-height:1.5">
          Nakresli místnosti v profesionálním editoru. Výsledky se přenesou zpět do nabídky.
        </p>
        ${(() => {
          const psRooms  = PS.rooms.filter(r => r.points?.length >= 3);
          const psTotalM2 = psRooms.reduce((s, r) => s + polygonArea(r.points), 0);
          if (psRooms.length > 0) return `
            <div style="background:var(--c-green-s);border:1.5px solid #4ade80;
              border-radius:var(--r-sm);padding:0.8rem;margin-bottom:0.8rem">
              <div style="font-weight:700;font-size:0.88rem;color:var(--c-green);margin-bottom:0.4rem">
                ✅ ${psRooms.length} místnost${psRooms.length > 1 ? 'í' : ''} · ${psTotalM2.toFixed(2)} m²
              </div>
              ${psRooms.map(r =>
                `<div style="font-size:0.78rem;color:var(--c-green)">
                  📐 ${escHtml(r.name)} — ${polygonArea(r.points).toFixed(2)} m²
                </div>`
              ).join('')}
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.3rem">
              <button class="btn btn-primary" onclick="navigate('pudorys',{fromNabidka:true})"
                style="justify-content:center">✏️ Upravit nákres</button>
              <button class="btn btn-success" onclick="syncPSRoomsToNabidka()"
                style="justify-content:center">📐 Přenést plochy</button>
            </div>`;
          return `
            <button class="btn btn-primary btn-full"
              onclick="navigate('pudorys',{fromNabidka:true})">
              🗺️ Otevřít půdorysový editor
            </button>`;
        })()}
      </div>

      <div class="card">
        <div class="card-title">Nebo zadej plochy ručně</div>
        <div class="field-row">
          <div class="field"><label>Šířka místnosti (cm)</label>
            <input type="number" id="ruc_w" placeholder="400">
          </div>
          <div class="field"><label>Délka místnosti (cm)</label>
            <input type="number" id="ruc_h" placeholder="300">
          </div>
        </div>
        <div class="field"><label>Název</label>
          <input id="ruc_name" placeholder="Koupelna">
        </div>
        <button class="btn btn-secondary" onclick="pridatPlochyRucne()">➕ Přidat plochu</button>
        <div id="rucne_plochy" style="margin-top:0.5rem">${plochyHtml}</div>
        ${totalArea > 0 ? `
          <div style="background:var(--c-s2);padding:0.75rem;border-radius:var(--r-sm);
            margin-top:0.55rem;text-align:center">
            <strong style="color:var(--c-terra);font-family:var(--f-display);font-size:1.1rem">
              Celkem: ${totalArea.toFixed(2)} m²
            </strong>
          </div>` : ''}
      </div>

      <button class="btn btn-secondary btn-full"
        onclick="syncPlochyToCalc();switchTab('calc')">
        ➜ Pokračuj na Výpočet →
      </button>
    </div>

    <!-- ── TAB: PRÁCE ── -->
    <div id="tab-prace" class="tab-content" style="display:none">
      ${prace.length === 0 ? `
      <div class="card" style="text-align:center">
        <div style="font-size:2rem;margin-bottom:0.5rem">🛠️</div>
        <p style="color:var(--c-ink2);margin-bottom:0.8rem;font-size:0.88rem">
          Ceník prací je prázdný.
        </p>
        <button class="btn btn-primary btn-sm" onclick="navigate('prace')">
          ➕ Přidat práce do ceníku
        </button>
      </div>` : `
      <div class="card" style="padding:0.8rem;margin-bottom:0.8rem;background:var(--c-s2);border:none">
        <div style="display:flex;gap:0.4rem;margin-bottom:0.55rem;align-items:center">
          <input type="search" placeholder="🔍 Hledat práci…" id="prace-search-input"
            oninput="filterPraceVNabidce(this.value)"
            style="flex:1;padding:0.48rem 0.7rem;border:1.5px solid var(--c-border);
              border-radius:var(--r-sm);font-family:var(--f-body);font-size:0.87rem;
              background:var(--c-bg);color:var(--c-ink)">
          <button onclick="otevritSablonyModal()"
            style="padding:0.48rem 0.7rem;border-radius:var(--r-sm);
              border:1.5px solid var(--c-terra);background:white;color:var(--c-terra);
              cursor:pointer;font-size:0.76rem;font-weight:700;white-space:nowrap;
              font-family:var(--f-body)">📋 Šablony</button>
          <button onclick="praceZrusitVse()"
            style="font-size:0.68rem;padding:0.38rem 0.5rem;border-radius:var(--r-xs);
              border:1px solid var(--c-border);background:var(--c-surface);cursor:pointer;
              color:var(--c-ink2);font-family:var(--f-body);white-space:nowrap">
            ✕ Vše
          </button>
        </div>
        <div id="prace-live-total"
          style="font-weight:700;font-size:0.95rem;color:var(--c-terra);display:none">
          Práce celkem: <span id="prace-total-val">0</span> Kč
        </div>
      </div>
      ${_renderPraceSkupiny(prace)}
      <button class="btn btn-secondary btn-full" onclick="switchTab('calc')">
        📊 Pokračuj na Výpočet →
      </button>`}
    </div>

    <!-- ── TAB: CALC ── -->
    <div id="tab-calc" class="tab-content" style="display:none">
      <div class="card">
        <div class="card-title">Výpočet materiálu</div>
        <div class="field">
          <label>
            Plocha (m²)
            ${totalArea > 0 ? `<span style="color:var(--c-terra)">← Z nákresu: ${totalArea.toFixed(2)} m²</span>` : ''}
          </label>
          <input type="number" id="nc_plocha" value="${totalArea.toFixed(2)}"
            step="0.01" placeholder="0.00">
        </div>
        <div class="field"><label>Materiál — dlaždice</label>
          <select id="nc_material">${matOpts}</select>
        </div>
        <div class="card-title" style="margin-top:0.8rem">Rozměr dlaždice (cm)</div>
        <div class="field-row">
          <div class="field"><label>Šířka</label>
            <input type="number" id="nc_sirka" placeholder="30">
          </div>
          <div class="field"><label>Délka</label>
            <input type="number" id="nc_delka" placeholder="60">
          </div>
        </div>
        <div class="field">
          <label>Marže na materiál (%)</label>
          <input type="number" id="nc_marze" value="28" min="0" max="100">
        </div>
      </div>

      <div class="card">
        <div class="card-title">Práce</div>
        <p style="font-size:0.82rem;color:var(--c-ink2);margin-bottom:0.5rem;line-height:1.5">
          Vyberte práce v záložce <strong>🛠️ Práce</strong>. Vybrané práce budou automaticky
          zahrnuty do výpočtu.
        </p>
        <button class="btn btn-secondary btn-sm" onclick="switchTab('prace')">
          🛠️ Vybrat práce →
        </button>
      </div>

      <button class="btn btn-primary btn-full" onclick="spocitatNabidku()">
        📊 Spočítat nabídku
      </button>
      <div id="vysledekCN"></div>
    </div>

    <!-- MODAL: Plocha -->
    <div id="plochModal" class="modal-overlay" style="display:none">
      <div class="modal">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
          <h2 style="margin:0">Detaily plochy</h2>
          <button class="btn btn-ghost" onclick="closePlochModal()">✕</button>
        </div>
        <div class="field"><label>Název / místnost</label>
          <input type="text" id="ploch_name" placeholder="Koupelna - stěna">
        </div>
        <div class="field-row">
          <div class="field"><label>Šířka (cm)</label>
            <input type="number" id="ploch_w" placeholder="250">
          </div>
          <div class="field"><label>Délka (cm)</label>
            <input type="number" id="ploch_h" placeholder="200">
          </div>
        </div>
        <div class="field"><label>Typ povrchu</label>
          <select id="ploch_type">
            <option value="obklad">🧱 Obklad (stěna)</option>
            <option value="dlazba">🔲 Dlažba (podlaha)</option>
            <option value="strop">⬜ Obklad (strop)</option>
          </select>
        </div>
        <div id="plochOtvory"></div>
        <button class="btn btn-secondary btn-full" onclick="addOtvResultMD()">➕ Přidat otvor</button>
        <button class="btn btn-primary btn-full" onclick="savePlochaMD()">💾 Uložit plochu</button>
        <button class="btn btn-secondary btn-full" onclick="closePlochModal()"
          style="margin-top:0.4rem">✕ Zavřít bez uložení</button>
      </div>
    </div>
  `;
}

// ── currentPudorysData ────────────────────────────────────
window.currentPudorysData = { ploch: [], editIdx: null };

// ── Tab switching ─────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
  const tabEl = document.getElementById('tab-' + tab);
  if (tabEl) tabEl.style.display = 'block';

  document.querySelectorAll('.tab-btn').forEach(b => {
    b.style.background = 'transparent';
    b.style.color      = 'var(--c-ink2)';
    b.style.boxShadow  = 'none';
  });
  const activeBtn = document.querySelector(`[data-tab="${tab}"]`);
  if (activeBtn) {
    activeBtn.style.background = 'var(--c-surface)';
    activeBtn.style.color      = 'var(--c-terra)';
    activeBtn.style.boxShadow  = 'var(--sh-xs)';
  }
  if (tab === 'prace') setTimeout(praceAutoFillPlocha, 100);
}

// ── Modal helpers ─────────────────────────────────────────
function showPlochForm() { document.getElementById('plochModal').style.display = 'flex'; }
function closePlochModal() {
  document.getElementById('plochModal').style.display = 'none';
  window.currentPudorysData.editIdx = null;
}

// ── Keyboard zkratky ──────────────────────────────────────
let _prevTool = 'pencil';
document.addEventListener('keydown', (e) => {
  const tag     = document.activeElement?.tagName;
  const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

  if (e.key === 'Escape') {
    const modal = document.getElementById('plochModal');
    if (modal?.style.display === 'flex') closePlochModal();
    if (PS.drawing?.active) { PS.drawing.active = false; PS.drawing.points = []; renderRoomCanvas(); }
    if (PS.tool === 'kota') { PS.tool = 'pencil'; PS.kotaDrawing = { active: false, p1: null }; renderRoomCanvas(); }
    document.getElementById('mep-modal-host')?.remove();
  }
  if (inInput) return;
  if (e.code === 'Space' && !e.repeat && state.page === 'pudorys' && !PS.view3d) {
    e.preventDefault();
    if (PS.tool !== 'pan' && !PS.drawing.active) { _prevTool = PS.tool; PS.tool = 'pan'; injectProfiCADButtons(); }
  }
  if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); psUndo(); }
  if (e.code === 'KeyY' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); psRedo(); }
});
document.addEventListener('keyup', (e) => {
  if (e.code === 'Space' && PS.tool === 'pan' && state.page === 'pudorys') {
    PS.tool = _prevTool;
    injectProfiCADButtons();
  }
});

// ── Plochy ────────────────────────────────────────────────
function addOtvResultMD() {
  const container = document.getElementById('plochOtvory');
  const id = 'otv_' + Date.now();
  container.insertAdjacentHTML('beforeend', `
    <div style="background:var(--c-bg);padding:0.6rem;border-radius:var(--r-xs);
      margin:0.5rem 0;border:1px solid var(--c-border)" id="${id}">
      <div style="display:flex;justify-content:space-between;margin-bottom:0.4rem">
        <strong style="font-size:0.85rem">Otvor</strong>
        <button class="btn btn-ghost btn-xs"
          onclick="document.getElementById('${id}').remove()">✕</button>
      </div>
      <div class="field" style="margin-bottom:0.4rem">
        <label>Popis</label>
        <input type="text" class="otv-popis" placeholder="Dveře"
          style="font-size:0.85rem;padding:0.38rem">
      </div>
      <div style="display:flex;gap:0.3rem">
        <input type="number" class="otv-w" placeholder="90"
          style="flex:1;font-size:0.85rem;padding:0.38rem;border:1px solid var(--c-border);
            border-radius:var(--r-xs);background:var(--c-bg);color:var(--c-ink)">
        <span style="padding:0.38rem;color:var(--c-ink2)">×</span>
        <input type="number" class="otv-h" placeholder="210"
          style="flex:1;font-size:0.85rem;padding:0.38rem;border:1px solid var(--c-border);
            border-radius:var(--r-xs);background:var(--c-bg);color:var(--c-ink)">
      </div>
    </div>`);
}

async function savePlochaMD() {
  const name = document.getElementById('ploch_name').value || 'Plocha';
  const w    = parseFloat(document.getElementById('ploch_w').value) || 0;
  const h    = parseFloat(document.getElementById('ploch_h').value) || 0;
  const type = document.getElementById('ploch_type').value;
  if (!w || !h) { toast('Vyplň rozměry!', 'err'); return; }

  const otvory = Array.from(document.querySelectorAll('#plochOtvory > div')).map(div => ({
    popis: div.querySelector('.otv-popis')?.value || '',
    w:     parseFloat(div.querySelector('.otv-w')?.value) || 0,
    h:     parseFloat(div.querySelector('.otv-h')?.value) || 0,
  })).filter(o => o.w && o.h);

  if (window.currentPudorysData.editIdx !== null) {
    window.currentPudorysData.ploch[window.currentPudorysData.editIdx] = { name, w, h, type, otvory };
  } else {
    window.currentPudorysData.ploch.push({ name, w, h, type, otvory });
  }
  closePlochModal();
  await render();
  toast(`Plocha "${name}" uložena`);
  setTimeout(() => switchTab('pudorys'), 50);
}

async function pridatPlochyRucne() {
  const w    = parseFloat(document.getElementById('ruc_w')?.value) || 0;
  const h    = parseFloat(document.getElementById('ruc_h')?.value) || 0;
  const name = document.getElementById('ruc_name')?.value || 'Plocha';
  if (!w || !h) { toast('Zadej šířku a délku', 'err'); return; }
  window.currentPudorysData.ploch.push({ name, w, h, type: 'dlazba', otvory: [] });
  toast('Plocha přidána');
  await render();
  setTimeout(() => switchTab('pudorys'), 50);
}

function syncPlochyToCalc() {
  let totalArea = window.currentPudorysData.ploch.reduce((s, x) =>
    s + ((x.w * x.h) / 10000 - (x.otvory || []).reduce((oo, o) => oo + ((o.w * o.h) / 10000), 0)), 0);
  if (totalArea === 0) {
    const psRooms = PS.rooms.filter(r => r.points?.length >= 3);
    if (psRooms.length > 0) totalArea = psRooms.reduce((s, r) => s + polygonArea(r.points), 0);
  }
  const el = document.getElementById('nc_plocha');
  if (el && totalArea > 0) { el.value = totalArea.toFixed(2); toast('Plocha přenesena: ' + totalArea.toFixed(2) + ' m²'); }
}

function editPlocha(idx) {
  const sec = window.currentPudorysData.ploch[idx];
  document.getElementById('ploch_name').value = sec.name;
  document.getElementById('ploch_w').value    = sec.w;
  document.getElementById('ploch_h').value    = sec.h;
  document.getElementById('ploch_type').value = sec.type;
  document.getElementById('plochOtvory').innerHTML = (sec.otvory || []).map(o => `
    <div style="background:var(--c-bg);padding:0.6rem;border-radius:var(--r-xs);
      margin:0.5rem 0;border:1px solid var(--c-border)">
      <div class="field" style="margin-bottom:0.4rem">
        <label>Popis</label>
        <input type="text" class="otv-popis" value="${escHtml(o.popis)}"
          style="font-size:0.85rem;padding:0.38rem">
      </div>
      <div style="display:flex;gap:0.3rem">
        <input type="number" class="otv-w" value="${o.w}"
          style="flex:1;font-size:0.85rem;padding:0.38rem;border:1px solid var(--c-border);border-radius:var(--r-xs);background:var(--c-bg);color:var(--c-ink)">
        <span style="padding:0.38rem;color:var(--c-ink2)">×</span>
        <input type="number" class="otv-h" value="${o.h}"
          style="flex:1;font-size:0.85rem;padding:0.38rem;border:1px solid var(--c-border);border-radius:var(--r-xs);background:var(--c-bg);color:var(--c-ink)">
      </div>
    </div>`).join('');
  window.currentPudorysData.editIdx = idx;
  showPlochForm();
}

async function deletePlocha(idx) {
  if (confirm('Smazat tuto plochu?')) {
    window.currentPudorysData.ploch.splice(idx, 1);
    await render();
    toast('Plocha smazána');
  }
}

// ── Hlavní výpočet ────────────────────────────────────────
async function spocitatNabidku() {
  const plocha = parseFloat(v('nc_plocha'));
  const matId  = parseInt(v('nc_material'))  || 0;
  const sirka  = parseFloat(v('nc_sirka'))   || 0;
  const delka  = parseFloat(v('nc_delka'))   || 0;
  const marze  = parseFloat(v('nc_marze'))   || 28;

  if (!plocha || isNaN(plocha) || plocha <= 0) return toast('Zadej plochu v m²', 'err');

  let cenaMat = 0, matNazev = '—', matBal = 1, nakupniCenaMat = 0;
  if (matId) {
    const matObj = await dbGet('ceniky', matId);
    if (matObj) {
      nakupniCenaMat = matObj.cena || 0;
      cenaMat        = nakupniCenaMat * (1 + marze / 100);
      matNazev       = matObj.nazev || '—';
      matBal         = matObj.baleni || 1;
    }
  }

  let lepidlo = 3.0, sparovka = 0.5;
  if (sirka && delka) {
    const form = sirka * delka;
    if      (form < 100)   { lepidlo = 2.0; sparovka = 0.8; }
    else if (form < 225)   { lepidlo = 2.5; sparovka = 0.6; }
    else if (form < 900)   { lepidlo = 3.0; sparovka = 0.5; }
    else if (form < 3600)  { lepidlo = 3.5; sparovka = 0.4; }
    else                   { lepidlo = 4.0; sparovka = 0.3; }
  }

  let ks = 0, ksBal = 0;
  if (sirka > 0 && delka > 0 && matId) {
    const plochaDl = (sirka * delka) / 10000;
    if (plochaDl > 0) { ks = Math.ceil((plocha / plochaDl) * 1.10); ksBal = Math.ceil(ks / matBal); }
  }

  const celkLepidlo   = (plocha * lepidlo).toFixed(1);
  const celkSparovka  = (plocha * sparovka).toFixed(1);
  const cenaMatCelk   = matId && cenaMat > 0 ? Math.round(plocha * cenaMat) : 0;
  const nakupniCelkem = matId && nakupniCenaMat > 0 ? Math.round(plocha * nakupniCenaMat) : 0;

  const prace = await dbGetAll('prace');
  let cenaPrace = 0;
  const praceVybrane = [];
  prace.forEach(p => {
    const ch = document.getElementById(`prace_${p.id}`);
    if (!ch?.checked) return;
    const sazba = p.hodSazba > 0 ? p.hodSazba : p.cena;
    const jedn  = p.hodSazba > 0 ? 'hod' : (p.jednotka || 'm²');
    const surfData = window._praceSurfaceData?.[p.id];
    const hasSurfaces = surfData?.length > 0;
    let qty = 0, praceDesc = p.popis;

    if (hasSurfaces) {
      const valid = surfData.filter(r => (parseFloat(r.mnozstvi) || 0) > 0);
      qty = valid.reduce((s, r) => s + (parseFloat(r.mnozstvi) || 0), 0);
      if (valid.length > 0) {
        praceDesc = `${p.popis} [${valid.map(r => `${r.nazev}: ${parseFloat(r.mnozstvi).toFixed(2)} ${jedn}`).join(' | ')}]`;
      }
    } else {
      const qtyEl = document.getElementById(`qty_${p.id}`);
      qty = qtyEl ? (parseFloat(qtyEl.value) || 0) : 0;
      if (!qty && jedn === 'm²') qty = plocha;
    }

    if (qty > 0 && sazba > 0) {
      const cenaPolozky = Math.round(sazba * qty);
      cenaPrace += cenaPolozky;
      praceVybrane.push(`${praceDesc} (${qty.toFixed(2)} ${jedn} × ${sazba} Kč): ${cenaPolozky}`);
    } else if (!hasSurfaces && jedn === 'hod') {
      praceVybrane.push(`${p.popis}: ${sazba} Kč/hod (počet hodin neuvedeno)`);
    }
  });

  const cenaLepidlaCelk  = Math.round(parseFloat(celkLepidlo)  * 18);
  const cenaSparovkaCelk = Math.round(parseFloat(celkSparovka) * 22);
  const celkem    = (cenaMatCelk || 0) + (cenaPrace || 0) + cenaLepidlaCelk + cenaSparovkaCelk;
  const nakladyMat = nakupniCelkem + cenaLepidlaCelk + cenaSparovkaCelk;
  const hrubyZisk  = celkem - nakladyMat;
  const marZePct   = celkem > 0 ? Math.round((hrubyZisk / celkem) * 100) : 0;

  tmpNabidka = {
    plocha, matId, matNazev, ks, ksBal, matBal,
    celkLepidlo, celkSparovka, cenaMatCelk, cenaPrace,
    cenaLepidlaCelk, cenaSparovkaCelk, celkem,
    hrubyZisk, marZePct, marze, sirka, delka, praceVybrane,
  };

  const el = document.getElementById('vysledekCN');
  el.innerHTML = `
    <div class="card card-success" style="margin-top:0.5rem">
      <div class="card-title" style="color:var(--c-green)">📊 Výsledek kalkulace</div>
      <div class="result-box">
        ${matId && ks ? `
          <div class="result-row">
            <span>🪨 Dlaždice (${escHtml(matNazev)})</span>
            <span class="val">${ks} ks / ${ksBal} bal.</span>
          </div>` : ''}
        <div class="result-row"><span>🧱 Lepidlo</span><span class="val">${celkLepidlo} kg</span></div>
        <div class="result-row"><span>🧴 Spárovačka</span><span class="val">${celkSparovka} kg</span></div>
        <hr class="divider">
        ${matId ? `<div class="result-row"><span>Materiál s marží ${marze}%</span><span class="val">${cenaMatCelk.toLocaleString('cs')} Kč</span></div>` : ''}
        <div class="result-row"><span>Lepidlo + spárovačka (odhad)</span><span class="val">${(cenaLepidlaCelk + cenaSparovkaCelk).toLocaleString('cs')} Kč</span></div>
        ${cenaPrace > 0 ? `<div class="result-row"><span>Práce celkem</span><span class="val">${cenaPrace.toLocaleString('cs')} Kč</span></div>` : ''}
        ${praceVybrane.filter(p => !p.includes('neuvedeno')).map(p => {
          const lastColon = p.lastIndexOf(': ');
          const label  = lastColon > -1 ? p.substring(0, lastColon) : p;
          const castka = lastColon > -1 ? parseInt(p.substring(lastColon + 2)) : NaN;
          return `<div class="result-row" style="font-size:0.78rem;padding-left:0.8rem;opacity:0.85">
            <span style="flex:1;padding-right:0.5rem;word-break:break-word">${escHtml(label)}</span>
            <span class="val" style="white-space:nowrap">
              ${isNaN(castka) ? '—' : castka.toLocaleString('cs') + ' Kč'}
            </span>
          </div>`;
        }).join('')}
        <hr class="divider">
        <div class="result-row">
          <span>💰 CELKEM zákazník platí</span>
          <span class="val" style="font-family:var(--f-display);font-size:1.1rem">
            ${celkem.toLocaleString('cs')} Kč
          </span>
        </div>
        <div style="font-size:0.7rem;color:var(--c-ink3);padding:0.2rem 0">
          + DPH dle záložky Info při uložení
        </div>
      </div>

      <!-- Zisk box -->
      <div style="background:${hrubyZisk > 0 ? 'var(--c-green-s)' : 'var(--c-red-s)'};
        border-radius:var(--r-sm);padding:0.8rem;margin-top:0.6rem;
        border:1.5px solid ${hrubyZisk > 0 ? '#86efac' : '#fecaca'}">
        <div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;
          letter-spacing:0.08em;color:${hrubyZisk > 0 ? 'var(--c-green)' : 'var(--c-red)'};
          margin-bottom:0.5rem">
          💹 Odhad zisku
        </div>
        <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:0.28rem">
          <span style="color:var(--c-ink2)">Náklady (materiál nákup)</span>
          <span style="font-weight:600">${nakladyMat.toLocaleString('cs')} Kč</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:0.28rem">
          <span style="color:var(--c-ink2)">Práce (čistý příjem)</span>
          <span style="font-weight:600">${(cenaPrace || 0).toLocaleString('cs')} Kč</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:1rem;font-weight:800;
          border-top:1.5px solid ${hrubyZisk > 0 ? '#86efac' : '#fecaca'};
          padding-top:0.5rem;margin-top:0.3rem;font-family:var(--f-display)">
          <span style="color:${hrubyZisk > 0 ? 'var(--c-green)' : 'var(--c-red)'}">
            💰 Hrubý zisk
          </span>
          <span style="color:${hrubyZisk > 0 ? 'var(--c-green)' : 'var(--c-red)'}">
            ${hrubyZisk.toLocaleString('cs')} Kč (${marZePct} %)
          </span>
        </div>
        <div style="font-size:0.68rem;color:var(--c-ink3);margin-top:0.3rem">
          Bez DPH, bez odvodů. Nezahrnuje mzdy pracovníků.
        </div>
      </div>

      <div style="display:flex;gap:0.5rem;margin-top:0.8rem">
        <button class="btn btn-success" style="flex:2" onclick="ulozitNabidku()">
          💾 Uložit nabídku
        </button>
        <button class="btn btn-secondary" style="flex:1" onclick="ulozitSablonaDialog()">
          📋 Šablona
        </button>
      </div>
    </div>`;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Uložit nabídku ────────────────────────────────────────
async function ulozitNabidku() {
  if (!tmpNabidka) return toast('Nejdřív spočítej nabídku', 'err');
  const nazev      = v('nc_nazev') || 'Bez názvu';
  const pozn       = v('nc_pozn') || '';
  const zakId      = v('nc_zak') ? parseInt(v('nc_zak')) : null;
  const misto      = v('nc_misto') || '';
  const termin     = document.getElementById('nc_termin')?.value || '';
  const zalohaProc = parseFloat(v('nc_zaloha_proc')) || 40;
  const dphSazba   = parseInt(v('nc_dph')) || 0;
  const { datum, cas, iso } = _casRazitko();

  let zakaznikJmeno = null, zakaznikTel = null, zakaznikEmail = null;
  if (zakId) {
    const z = await dbGet('zakaznici', zakId);
    zakaznikJmeno = z?.jmeno || null;
    zakaznikTel   = z?.tel   || null;
    zakaznikEmail = z?.email || null;
  }

  const cisloNabidky = await generujCisloNabidky();
  const cenaZaklad   = parseFloat(tmpNabidka.celkem.toFixed(0));
  const dphCastka    = dphSazba > 0 ? Math.round(cenaZaklad * dphSazba / 100) : 0;
  const cenaCelkem   = cenaZaklad + dphCastka;

  await dbPut('nabidky', {
    cisloNabidky, revize: 1,
    nazev, pozn, zakId,
    zakaznik: zakaznikJmeno, zakaznikTel, zakaznikEmail,
    mistoRealizace: misto, termin, zalohaProc, dphSazba, dphCastka,
    stav:         'nabidka',
    plocha:       tmpNabidka.plocha,
    material:     tmpNabidka.matNazev,
    matId:        tmpNabidka.matId,
    cenaCelkem:   cenaCelkem.toFixed(0),
    cenaZaklad:   cenaZaklad.toFixed(0),
    cenaMatCelk:  tmpNabidka.cenaMatCelk.toFixed(0),
    cenaPrace:    tmpNabidka.cenaPrace.toFixed(0),
    marze:        tmpNabidka.marze,
    sirka:        tmpNabidka.sirka,
    delka:        tmpNabidka.delka,
    ks:           tmpNabidka.ks,
    lepidlo:      tmpNabidka.celkLepidlo,
    sparovka:     tmpNabidka.celkSparovka,
    praceVybrane: tmpNabidka.praceVybrane,
    pudorys:      window.currentPudorysData?.ploch || [],
    datum:        new Date().toISOString().slice(0, 10),
    komunikace: [{
      id: 'k' + Date.now(), typ: 'vytvoreno',
      text: `${cisloNabidky} — ${cenaCelkem.toLocaleString('cs')} Kč, ${tmpNabidka.plocha} m²`,
      datum, cas, iso,
    }],
  });

  toast(`✓ Nabídka ${cisloNabidky} uložena`);
  tmpNabidka = null;
  window._praceSurfaceData  = {};
  clearDraftNabidka();
  window.currentPudorysData = { ploch: [] };
  await navigate('nabidky');
}

function obnovitDraft() {
  const draft = loadDraftNabidka();
  if (!draft) return;
  if (draft.pudorys?.length) window.currentPudorysData = { ploch: draft.pudorys };
  applyDraftToForm(draft);
  render().then(() => applyDraftToForm(draft));
}

function zahoditDraft() {
  clearDraftNabidka();
  window.currentPudorysData = { ploch: [] };
  window._praceSurfaceData  = {};
  render();
}

// ── Práce helpers (beze změny logiky) ────────────────────
function praceToggle(id, sazba, jedn, defaultQty) {
  const ch     = document.getElementById(`prace_${id}`);
  const qtyDiv = document.getElementById(`prace-qty-${id}`);
  const qtyEl  = document.getElementById(`qty_${id}`);
  if (!ch || !qtyDiv || !qtyEl) return;
  if (ch.checked) {
    if (!window._praceSurfaceData[id]) window._praceSurfaceData[id] = [];
    qtyDiv.style.display = 'block';
    if (!qtyEl.value) {
      if (defaultQty === '{{PLOCHA}}') {
        const plocha = parseFloat(document.getElementById('nc_plocha')?.value) || 0;
        qtyEl.value = plocha > 0 ? plocha.toFixed(2) : '';
      } else if (defaultQty) {
        qtyEl.value = defaultQty;
      }
    }
    if (qtyEl.value) praceQtyChange(id, sazba);
    setTimeout(() => qtyEl.focus(), 50);
  } else {
    qtyDiv.style.display = 'none';
    delete window._praceSurfaceData[id];
    const surfDiv   = document.getElementById(`prace-surfaces-${id}`);
    const simpleDiv = document.getElementById(`prace-simple-${id}`);
    const modeBtn   = document.getElementById(`prace-mode-btn-${id}`);
    if (surfDiv)   surfDiv.style.display   = 'none';
    if (simpleDiv) simpleDiv.style.display = 'flex';
    if (modeBtn)   modeBtn.textContent     = '📐 Plochy';
    qtyEl.readOnly = false;
    qtyEl.value    = '';
    const cenaEl = document.getElementById(`prace-cena-${id}`);
    if (cenaEl) cenaEl.textContent = '';
  }
  praceUpdateTotal();
}

function praceQtyChange(id, sazba) {
  const qtyEl  = document.getElementById(`qty_${id}`);
  const cenaEl = document.getElementById(`prace-cena-${id}`);
  if (!qtyEl || !cenaEl) return;
  const qty = parseFloat(qtyEl.value) || 0;
  cenaEl.textContent = qty > 0 && sazba > 0
    ? `= ${Math.round(qty * sazba).toLocaleString('cs')} Kč`
    : '';
  praceUpdateTotal();
}

async function praceUpdateTotal() {
  const prace = await dbGetAll('prace');
  let total = 0, pocet = 0;
  prace.forEach(p => {
    const ch = document.getElementById(`prace_${p.id}`);
    if (!ch?.checked) return;
    const sazba    = p.hodSazba > 0 ? p.hodSazba : p.cena;
    const surfData = window._praceSurfaceData?.[p.id];
    let qty = surfData?.length > 0
      ? surfData.reduce((s, r) => s + (parseFloat(r.mnozstvi) || 0), 0)
      : parseFloat(document.getElementById(`qty_${p.id}`)?.value) || 0;
    if (qty > 0 && sazba > 0) { total += Math.round(qty * sazba); pocet++; }
  });
  const totalDiv = document.getElementById('prace-live-total');
  const totalVal = document.getElementById('prace-total-val');
  if (!totalDiv || !totalVal) return;
  if (pocet > 0) {
    totalDiv.style.display = 'block';
    totalVal.textContent = `${total.toLocaleString('cs')} Kč (${pocet} pol.)`;
  } else {
    totalDiv.style.display = 'none';
  }
}

async function praceZrusitVse() {
  const prace = await dbGetAll('prace');
  prace.forEach(p => {
    const ch = document.getElementById(`prace_${p.id}`);
    if (ch) ch.checked = false;
    const qtyDiv = document.getElementById(`prace-qty-${p.id}`);
    if (qtyDiv) qtyDiv.style.display = 'none';
    const qtyEl = document.getElementById(`qty_${p.id}`);
    if (qtyEl) { qtyEl.value = ''; qtyEl.readOnly = false; }
    const cenaEl = document.getElementById(`prace-cena-${p.id}`);
    if (cenaEl) cenaEl.textContent = '';
    const surfDiv   = document.getElementById(`prace-surfaces-${p.id}`);
    const simpleDiv = document.getElementById(`prace-simple-${p.id}`);
    const modeBtn   = document.getElementById(`prace-mode-btn-${p.id}`);
    if (surfDiv)   surfDiv.style.display   = 'none';
    if (simpleDiv) simpleDiv.style.display = 'flex';
    if (modeBtn)   modeBtn.textContent     = '📐 Plochy';
  });
  window._praceSurfaceData = {};
  const totalDiv = document.getElementById('prace-live-total');
  if (totalDiv) totalDiv.style.display = 'none';
  toast('Výběr prací zrušen');
}

function praceAutoFillPlocha() {
  const plocha = parseFloat(document.getElementById('nc_plocha')?.value) || 0;
  if (!plocha) return;
  document.querySelectorAll('[id^="qty_"]').forEach(el => {
    const id  = el.id.replace('qty_', '');
    const ch  = document.getElementById(`prace_${id}`);
    const hasSurfaces = window._praceSurfaceData?.[id]?.length > 0;
    if (!ch?.checked || el.value || hasSurfaces) return;
    if (ch.dataset.jedn === 'm²') {
      el.value = plocha.toFixed(2);
      praceQtyChange(id, parseFloat(ch.dataset.cena) || 0);
    }
  });
}

// ── Surface breakdown (beze změny logiky) ────────────────
function _surfaceDefaultName(jedn, idx) {
  const names = {
    'm²': ['Podlaha','Stěna A','Stěna B','Stěna C','Stěna D','Strop','Výklenek'],
    'bm': ['Obvod','Roh 1','Roh 2','Přechod','Sokl'],
    'hod':['Příprava','Práce','Dokončení'],
    'ks': ['Ks 1','Ks 2','Ks 3'],
  };
  return (names[jedn] || ['Část'])[idx % (names[jedn] || ['Část']).length];
}
function _praceSurfaceTotal(id) {
  return (window._praceSurfaceData[id] || []).reduce((s, r) => s + (parseFloat(r.mnozstvi) || 0), 0);
}
function togglePraceSurfaces(id, sazba, jedn) {
  const surfDiv   = document.getElementById(`prace-surfaces-${id}`);
  const simpleDiv = document.getElementById(`prace-simple-${id}`);
  const modeBtn   = document.getElementById(`prace-mode-btn-${id}`);
  const qtyEl     = document.getElementById(`qty_${id}`);
  if (!surfDiv || !simpleDiv) return;
  const toSurface = surfDiv.style.display === 'none';
  if (toSurface) {
    if (!window._praceSurfaceData[id]?.length) {
      const qty = parseFloat(qtyEl?.value) || 0;
      window._praceSurfaceData[id] = qty > 0
        ? [{ id: 's' + Date.now(), nazev: _surfaceDefaultName(jedn, 0), mnozstvi: qty }]
        : [];
    }
    surfDiv.style.display   = 'block';
    simpleDiv.style.display = 'none';
    if (modeBtn) modeBtn.textContent = '← Sloučit';
    if (qtyEl)  { qtyEl.readOnly = true; qtyEl.style.opacity = '0.6'; }
    renderPraceSurfaceRows(id, sazba, jedn);
  } else {
    praceSurfaceClose(id, sazba);
  }
}
function praceSurfaceClose(id, sazba) {
  const surfDiv   = document.getElementById(`prace-surfaces-${id}`);
  const simpleDiv = document.getElementById(`prace-simple-${id}`);
  const modeBtn   = document.getElementById(`prace-mode-btn-${id}`);
  const qtyEl     = document.getElementById(`qty_${id}`);
  if (surfDiv)   surfDiv.style.display   = 'none';
  if (simpleDiv) simpleDiv.style.display = 'flex';
  if (modeBtn)   modeBtn.textContent     = '📐 Plochy';
  if (qtyEl) {
    qtyEl.readOnly      = false;
    qtyEl.style.opacity = '1';
    const total = _praceSurfaceTotal(id);
    qtyEl.value = total > 0 ? total.toFixed(2) : (qtyEl.value || '');
  }
  praceQtyChange(id, sazba);
}
function renderPraceSurfaceRows(id, sazba, jedn) {
  const container = document.getElementById(`prace-surface-rows-${id}`);
  if (!container) return;
  const surfaces = window._praceSurfaceData[id] || [];
  const total    = _praceSurfaceTotal(id);
  const totalKc  = Math.round(total * sazba);
  if (surfaces.length === 0) {
    container.innerHTML = `<div style="color:var(--c-ink3);font-size:0.76rem;padding:0.3rem 0;
      text-align:center;font-style:italic">
      Zatím žádné plochy. Klikni ➕ níže.
    </div>`;
  } else {
    container.innerHTML = surfaces.map((row, idx) => {
      const rowKc = Math.round((parseFloat(row.mnozstvi) || 0) * sazba);
      return `<div style="display:grid;grid-template-columns:1fr 76px 28px 66px 22px;
        gap:0.22rem;align-items:center;padding:0.26rem 0;
        border-bottom:1px solid rgba(200,80,42,0.1)">
        <input value="${escHtml(row.nazev || '')}" placeholder="Název plochy…"
          style="padding:0.23rem 0.38rem;border:1px solid var(--c-border);border-radius:4px;
            font-size:0.76rem;font-family:var(--f-body);background:var(--c-bg);color:var(--c-ink);min-width:0"
          oninput="_praceSurfaceEdit(${id},${idx},'nazev',this.value,${sazba},'${jedn}')">
        <input type="number" value="${row.mnozstvi || ''}" min="0" step="0.01" placeholder="0"
          style="padding:0.23rem 0.33rem;border:1.5px solid var(--c-terra);border-radius:4px;
            font-size:0.83rem;font-weight:700;text-align:center;color:var(--c-terra);width:100%;
            background:var(--c-bg)"
          oninput="_praceSurfaceEdit(${id},${idx},'mnozstvi',this.value,${sazba},'${jedn}')">
        <span style="font-size:0.66rem;color:var(--c-ink3);text-align:center">${jedn}</span>
        <span style="font-size:0.7rem;font-weight:600;color:var(--c-green);text-align:right;
          white-space:nowrap">${rowKc > 0 ? rowKc.toLocaleString('cs') + ' Kč' : '—'}</span>
        <button onclick="_praceSurfaceRemove(${id},${idx},${sazba},'${jedn}')"
          style="background:var(--c-red-s);border:none;border-radius:3px;color:var(--c-red);
            cursor:pointer;font-size:0.68rem;padding:0.12rem 0.22rem;line-height:1">✕</button>
      </div>`;
    }).join('') + `
      <div style="display:flex;justify-content:space-between;align-items:center;
        padding:0.32rem 0;font-weight:700;font-size:0.83rem;
        border-top:2px solid rgba(200,80,42,0.3);margin-top:0.1rem">
        <span style="color:var(--c-ink2)">Celkem ${total.toFixed(2)} ${jedn}</span>
        <span style="color:var(--c-terra)">${totalKc.toLocaleString('cs')} Kč</span>
      </div>`;
  }
  const cenaEl = document.getElementById(`prace-cena-${id}`);
  if (cenaEl) cenaEl.textContent = total > 0 ? `= ${totalKc.toLocaleString('cs')} Kč` : '';
  const qtyEl = document.getElementById(`qty_${id}`);
  if (qtyEl) qtyEl.value = total > 0 ? total.toFixed(2) : '0';
  praceUpdateTotal();
}
function _praceSurfaceEdit(id, idx, field, value, sazba, jedn) {
  if (!window._praceSurfaceData[id]?.[idx]) return;
  window._praceSurfaceData[id][idx][field] = field === 'mnozstvi' ? (parseFloat(value) || 0) : value;
  renderPraceSurfaceRows(id, sazba, jedn);
}
function _praceSurfaceRemove(id, idx, sazba, jedn) {
  if (!window._praceSurfaceData[id]) return;
  window._praceSurfaceData[id].splice(idx, 1);
  renderPraceSurfaceRows(id, sazba, jedn);
}
function praceAddSurface(id, sazba, jedn) {
  if (!window._praceSurfaceData[id]) window._praceSurfaceData[id] = [];
  const idx = window._praceSurfaceData[id].length;
  window._praceSurfaceData[id].push({ id: 's' + Date.now(), nazev: _surfaceDefaultName(jedn, idx), mnozstvi: 0 });
  renderPraceSurfaceRows(id, sazba, jedn);
  setTimeout(() => {
    const rows = document.querySelectorAll(`#prace-surface-rows-${id} input[type="number"]`);
    if (rows.length) rows[rows.length - 1].focus();
  }, 30);
}

// ── Šablony nabídek ───────────────────────────────────────
const SABLONY_KEY = 'cn_sablony_nabidek';
function _nacistSablonyNabidek() { try { return JSON.parse(localStorage.getItem(SABLONY_KEY) || '[]'); } catch { return []; } }
function _ulozitSablonyNabidek(list) { localStorage.setItem(SABLONY_KEY, JSON.stringify(list)); }

function ulozitSablonaDialog() {
  if (!tmpNabidka) { toast('Nejdřív spočítej nabídku', 'err'); return; }
  const nazev = prompt('Název šablony:', document.getElementById('nc_nazev')?.value || 'Šablona');
  if (!nazev) return;
  const sablona = {
    id:    's' + Date.now(),
    nazev,
    datum: new Date().toLocaleDateString('cs-CZ'),
    data:  {
      nazev_zakazy: document.getElementById('nc_nazev')?.value    || '',
      plocha:       document.getElementById('nc_plocha')?.value   || '',
      sirka:        document.getElementById('nc_sirka')?.value    || '',
      delka:        document.getElementById('nc_delka')?.value    || '',
      marze:        document.getElementById('nc_marze')?.value    || '28',
      matId:        document.getElementById('nc_material')?.value || '',
      dph:          document.getElementById('nc_dph')?.value      || '0',
      zaloha_proc:  document.getElementById('nc_zaloha_proc')?.value || '40',
      praceChecked: Array.from(document.querySelectorAll('[id^="prace_"]:checked')).map(el => ({
        id:       el.value,
        qty:      document.getElementById(`qty_${el.value}`)?.value || '',
        surfaces: window._praceSurfaceData?.[el.value] || [],
      })),
    },
  };
  const list = _nacistSablonyNabidek();
  list.unshift(sablona);
  if (list.length > 20) list.splice(20);
  _ulozitSablonyNabidek(list);
  toast(`✓ Šablona „${nazev}" uložena`);
}

function otevritSablonyModal() {
  document.getElementById('sablony-modal-host')?.remove();
  const list = _nacistSablonyNabidek();
  showBottomSheet('📋 Šablony nabídek', `
    ${list.length === 0 ? `
      <div style="text-align:center;color:var(--c-ink3);padding:1.5rem;font-size:0.88rem">
        Zatím žádné šablony.<br>Spočítej nabídku a klikni na "Šablona".
      </div>` :
      list.map(s => `
        <div style="display:flex;align-items:center;gap:0.6rem;padding:0.65rem 0;
          border-bottom:1px solid var(--c-border)">
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:0.88rem">${escHtml(s.nazev)}</div>
            <div style="font-size:0.72rem;color:var(--c-ink3)">
              ${s.datum}${s.data.plocha ? ' · ' + s.data.plocha + ' m²' : ''}
            </div>
          </div>
          <button onclick="nacistSablonu('${s.id}')"
            class="btn btn-primary btn-sm">Načíst</button>
          <button onclick="smazatSablonu('${s.id}')"
            class="btn btn-danger btn-xs">✕</button>
        </div>`).join('')}
  `);
}

async function nacistSablonu(sablonaId) {
  const list = _nacistSablonyNabidek();
  const s    = list.find(x => x.id === sablonaId);
  if (!s) return;
  closeBottomSheet();
  const d = s.data;
  setTimeout(async () => {
    const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
    set('nc_nazev',       d.nazev_zakazy);
    set('nc_plocha',      d.plocha);
    set('nc_sirka',       d.sirka);
    set('nc_delka',       d.delka);
    set('nc_marze',       d.marze);
    set('nc_dph',         d.dph);
    set('nc_zaloha_proc', d.zaloha_proc);
    set('nc_material',    d.matId);
    if (d.praceChecked) {
      window._praceSurfaceData = {};
      for (const item of d.praceChecked) {
        const ch = document.getElementById(`prace_${item.id}`);
        if (!ch) continue;
        ch.checked = true;
        const sazba = parseFloat(ch.dataset.cena) || 0;
        const jedn  = ch.dataset.jedn || 'm²';
        if (item.surfaces?.length) window._praceSurfaceData[item.id] = item.surfaces;
        praceToggle(item.id, sazba, jedn, '');
        if (item.qty) {
          const qtyEl = document.getElementById(`qty_${item.id}`);
          if (qtyEl) { qtyEl.value = item.qty; praceQtyChange(item.id, sazba); }
        }
      }
    }
    toast(`✓ Šablona „${s.nazev}" načtena`);
  }, 80);
}

function smazatSablonu(sablonaId) {
  _ulozitSablonyNabidek(_nacistSablonyNabidek().filter(s => s.id !== sablonaId));
  otevritSablonyModal();
}

function filterPraceVNabidce(query) {
  const q = query.toLowerCase().trim();
  document.querySelectorAll('[id^="prace-row-"]').forEach(row => {
    if (!q) { row.style.display = ''; return; }
    const text = row.querySelector('label')?.textContent?.toLowerCase() || '';
    row.style.display = text.includes(q) ? '' : 'none';
  });
  document.querySelectorAll('#tab-prace details').forEach(det => {
    const visible = Array.from(det.querySelectorAll('[id^="prace-row-"]'))
      .some(r => r.style.display !== 'none');
    det.style.display = (q && !visible) ? 'none' : '';
  });
}
