// ═══ vyplaty.js — JL-OBKLADY CN v4 ═══
async function pageVyplaty() {
  const [pracovnici, vsechnyHodiny] = await Promise.all([
    dbGetAll('pracovnici'), dbGetAll('hodiny')
  ]);

  const nyni   = new Date();
  const selRok = state.vyplatRok  || nyni.getFullYear();
  const selMes = state.vyplatMes  !== undefined ? state.vyplatMes : nyni.getMonth();
  const selPId = state.pracovnikId || null;

  const mesicStart = `${selRok}-${String(selMes + 1).padStart(2, '0')}-01`;
  const mesicEnd   = `${selRok}-${String(selMes + 1).padStart(2, '0')}-31`;

  const hodinyObdobi  = vsechnyHodiny.filter(h => h.datum >= mesicStart && h.datum <= mesicEnd);
  const hodinyPerP    = {};
  hodinyObdobi.forEach(h => {
    if (!hodinyPerP[h.pracovnikId]) hodinyPerP[h.pracovnikId] = { hodiny: 0, zakazky: {} };
    hodinyPerP[h.pracovnikId].hodiny += h.hodiny;
    if (h.nabidkaNazev) {
      const k = h.nabidkaNazev;
      hodinyPerP[h.pracovnikId].zakazky[k] = (hodinyPerP[h.pracovnikId].zakazky[k] || 0) + h.hodiny;
    }
  });

  const prevMes = selMes === 0  ? 11 : selMes - 1;
  const prevRok = selMes === 0  ? selRok - 1 : selRok;
  const nextMes = selMes === 11 ? 0  : selMes + 1;
  const nextRok = selMes === 11 ? selRok + 1 : selRok;

  const periodBar = `
    <div class="card" style="padding:0.6rem 1rem">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <button onclick="navigate('vyplaty',{vyplatRok:${prevRok},vyplatMes:${prevMes}})"
          style="background:var(--c-s2);border:none;border-radius:var(--r-sm);
            padding:0.42rem 0.9rem;font-size:1rem;cursor:pointer;color:var(--c-ink)">‹</button>
        <div style="font-family:var(--f-display);font-weight:800;font-size:1rem">
          ${MESICE_CS[selMes]} ${selRok}
        </div>
        <button onclick="navigate('vyplaty',{vyplatRok:${nextRok},vyplatMes:${nextMes}})"
          style="background:var(--c-s2);border:none;border-radius:var(--r-sm);
            padding:0.42rem 0.9rem;font-size:1rem;cursor:pointer;color:var(--c-ink)">›</button>
      </div>
    </div>`;

  // ── Karty pracovníků ────────────────────────────────────
  let pracovniciHtml = '';
  if (pracovnici.length > 0) {
    const filtered = selPId ? pracovnici.filter(p => p.id === selPId) : pracovnici;
    pracovniciHtml = filtered.map(p => {
      const pHod   = hodinyPerP[p.id];
      const nacH   = pHod ? Math.round(pHod.hodiny * 10) / 10 : null;
      const zakStr = pHod && Object.keys(pHod.zakazky).length
        ? Object.entries(pHod.zakazky).map(([n, h]) => `${n}: ${h}h`).join(', ')
        : null;
      const prefix = `p${p.id}`;

      return `
        <div class="card" style="border-left:4px solid ${p.barva || '#3b82f6'}">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
            <div style="display:flex;align-items:center;gap:0.6rem">
              <div style="width:32px;height:32px;border-radius:50%;
                background:${p.barva || '#3b82f6'};display:flex;align-items:center;
                justify-content:center;font-size:1rem;flex-shrink:0">👷</div>
              <div>
                <div style="font-weight:700;font-size:0.95rem">${escHtml(p.jmeno)}</div>
                ${nacH !== null ? `
                  <div style="font-size:0.72rem;color:var(--c-terra);font-weight:600">
                    📅 z kalendáře: ${nacH}h
                  </div>` : ''}
              </div>
            </div>
            <div style="display:flex;gap:0.3rem">
              <button class="btn btn-secondary btn-sm"
                onclick="navigate('kalendar',{filterPracovnikId:${p.id}})">📅</button>
              <button class="btn btn-secondary btn-sm"
                onclick="printVyplatniPasku(${p.id})">🖨️</button>
            </div>
          </div>

          ${zakStr ? `
            <div style="font-size:0.76rem;color:var(--c-ink2);margin-bottom:0.6rem;
              padding:0.4rem 0.6rem;background:var(--c-s2);border-radius:var(--r-xs)">
              📋 ${escHtml(zakStr)}
            </div>` : ''}

          <div class="field-row">
            <div class="field"><label>Hodiny</label>
              <input type="number" id="${prefix}_hod"
                value="${nacH ?? ''}" placeholder="0"
                oninput="spocitatVyplatuPrac(${p.id})">
            </div>
            <div class="field"><label>Sazba (Kč/h)</label>
              <input type="number" id="${prefix}_sazba"
                value="${p.sazba}"
                oninput="spocitatVyplatuPrac(${p.id})">
            </div>
          </div>
          <div class="field-row">
            <div class="field"><label>Stravné</label>
              <input type="number" id="${prefix}_strava" placeholder="0"
                oninput="spocitatVyplatuPrac(${p.id})">
            </div>
            <div class="field"><label>Cestovné</label>
              <input type="number" id="${prefix}_cesta" placeholder="0"
                oninput="spocitatVyplatuPrac(${p.id})">
            </div>
          </div>
          <div class="field-row">
            <div class="field"><label>Záloha</label>
              <input type="number" id="${prefix}_zaloha" placeholder="0"
                oninput="spocitatVyplatuPrac(${p.id})">
            </div>
            <div class="field"><label>Ostatní (+/−)</label>
              <input type="number" id="${prefix}_ostatni" placeholder="0"
                oninput="spocitatVyplatuPrac(${p.id})">
            </div>
          </div>
          <div class="field">
            <label>🛒 Materiál (každý řádek = položka = cena Kč)</label>
            <textarea id="${prefix}_material" rows="3"
              placeholder="Lepidlo 3×25kg = 1350 Kč"
              oninput="parseMaterial('${prefix}')"></textarea>
          </div>
          <div id="${prefix}_material_souhrn"
            style="display:none;background:var(--c-s2);border-radius:var(--r-xs);
              padding:0.65rem;margin-bottom:0.5rem;font-size:0.82rem">
          </div>
          <button class="btn btn-primary btn-full"
            onclick="spocitatVyplatuPrac(${p.id})">
            💰 Spočítat výplatu
          </button>
          <div id="vysledek_p${p.id}"></div>
        </div>`;
    }).join('');
  } else {
    pracovniciHtml = `
      <div class="card" style="text-align:center">
        <div style="font-size:2rem;margin-bottom:0.4rem">👷</div>
        <div style="color:var(--c-ink2);margin-bottom:0.6rem;font-size:0.88rem">
          Zatím nejsou přidáni žádní pracovníci.
        </div>
        <button class="btn btn-primary btn-sm" onclick="navigate('pracovnici')">
          ➕ Přidat pracovníky
        </button>
      </div>`;
  }

  // ── Vlastní / brigádník karta ───────────────────────────
  const vlastniKarta = `
    <div class="card" style="border:2px dashed var(--c-border)">
      <div class="card-title" style="color:var(--c-ink2)">➕ Vlastní / brigádník</div>
      <div class="field"><label>Jméno</label>
        <input id="vyp_jmeno" placeholder="Jan Novák">
      </div>
      <div class="field-row">
        <div class="field"><label>Hodiny</label>
          <input type="number" id="vyp_hod" placeholder="0">
        </div>
        <div class="field"><label>Sazba (Kč/h)</label>
          <input type="number" id="vyp_sazba" value="350">
        </div>
      </div>
      <div class="field-row">
        <div class="field"><label>Stravné</label>
          <input type="number" id="vyp_strava" placeholder="0">
        </div>
        <div class="field"><label>Cestovné</label>
          <input type="number" id="vyp_cesta" placeholder="0">
        </div>
      </div>
      <div class="field-row">
        <div class="field"><label>Záloha</label>
          <input type="number" id="vyp_zaloha" placeholder="0">
        </div>
        <div class="field"><label>Ostatní (+/−)</label>
          <input type="number" id="vyp_ostatni" placeholder="0">
        </div>
      </div>
      <div class="field">
        <label>🛒 Materiál</label>
        <textarea id="vyp_material" rows="3"
          placeholder="Lepidlo 25kg = 450 Kč"
          oninput="parseMaterial('vyp')"></textarea>
      </div>
      <div id="vyp_material_souhrn"
        style="display:none;background:var(--c-s2);border-radius:var(--r-xs);
          padding:0.65rem;margin-bottom:0.5rem;font-size:0.82rem">
      </div>
      <button class="btn btn-primary btn-full" onclick="spocitatVyplatuVlastni()">
        💰 Spočítat
      </button>
      <div id="vysledek_vyp"></div>
    </div>`;

  return `
    <div class="header-bar">
      <span class="logo">💰</span>
      <div style="flex:1">
        <h1>Výplaty</h1>
        <div class="subtitle">${MESICE_CS[selMes]} ${selRok}</div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="navigate('pracovnici')"
        style="margin-left:auto">👷 Tým</button>
    </div>
    ${periodBar}
    ${pracovniciHtml}
    ${vlastniKarta}
    <div style="height:5rem"></div>`;
}

// ── Výpočet výplaty pracovníka z DB ──────────────────────
function spocitatVyplatuPrac(pracovnikId) {
  const prefix  = `p${pracovnikId}`;
  const h       = parseFloat(document.getElementById(`${prefix}_hod`)?.value)     || 0;
  const s       = parseFloat(document.getElementById(`${prefix}_sazba`)?.value)   || 0;
  const strava  = parseFloat(document.getElementById(`${prefix}_strava`)?.value)  || 0;
  const cesta   = parseFloat(document.getElementById(`${prefix}_cesta`)?.value)   || 0;
  const zaloha  = parseFloat(document.getElementById(`${prefix}_zaloha`)?.value)  || 0;
  const ostatni = parseFloat(document.getElementById(`${prefix}_ostatni`)?.value) || 0;
  const material = parseMaterial(prefix);
  const hruba   = h * s;
  const doplatek = hruba + strava + cesta + ostatni + material - zaloha;

  const el = document.getElementById(`vysledek_p${pracovnikId}`);
  if (!el) return;

  el.innerHTML = `
    <div class="result-box" style="margin-top:0.8rem">
      <div class="result-row">
        <span>⏱️ Mzda (${h}h × ${s} Kč)</span>
        <span class="val">${hruba.toFixed(0)} Kč</span>
      </div>
      ${strava   ? `<div class="result-row"><span>🍽️ Stravné</span><span class="val">+ ${strava.toLocaleString('cs')} Kč</span></div>` : ''}
      ${cesta    ? `<div class="result-row"><span>🚗 Cestovné</span><span class="val">+ ${cesta.toLocaleString('cs')} Kč</span></div>` : ''}
      ${material ? `<div class="result-row"><span>🛒 Materiál</span><span class="val">+ ${material.toLocaleString('cs')} Kč</span></div>` : ''}
      ${ostatni  ? `<div class="result-row"><span>📎 Ostatní</span><span class="val">${ostatni >= 0 ? '+' : ''} ${ostatni.toLocaleString('cs')} Kč</span></div>` : ''}
      ${zaloha   ? `<div class="result-row"><span>💳 Záloha</span><span class="val">− ${zaloha.toLocaleString('cs')} Kč</span></div>` : ''}
      <div class="result-row">
        <span>💰 K VYPLACENÍ</span>
        <span class="val" style="color:var(--c-green);font-size:1.15rem;font-family:var(--f-display)">
          ${doplatek.toFixed(0)} Kč
        </span>
      </div>
    </div>`;
}

// ── Zpětně kompatibilní funkce pro old-style prefix ──────
function spocitatVyplatu(prefix) {
  const h       = parseFloat(document.getElementById(prefix + '_hod')?.value)     || 0;
  const s       = parseFloat(document.getElementById(prefix + '_sazba')?.value)   || 0;
  const strava  = parseFloat(document.getElementById(prefix + '_strava')?.value)  || 0;
  const cesta   = parseFloat(document.getElementById(prefix + '_cesta')?.value)   || 0;
  const zaloha  = parseFloat(document.getElementById(prefix + '_zaloha')?.value)  || 0;
  const ostatni = parseFloat(document.getElementById(prefix + '_ostatni')?.value) || 0;
  const material = parseMaterial(prefix);
  const hruba   = h * s;
  const doplatek = hruba + strava + cesta + ostatni + material - zaloha;

  const el = document.getElementById('vysledek_' + prefix);
  if (!el) return;

  el.innerHTML = `
    <div class="result-box" style="margin-top:0.8rem">
      <div class="result-row"><span>⏱️ Mzda (${h} hod × ${s} Kč)</span><span class="val">${hruba.toFixed(0)} Kč</span></div>
      ${strava   ? `<div class="result-row"><span>🍽️ Stravné</span><span class="val">+ ${strava.toLocaleString('cs')} Kč</span></div>` : ''}
      ${cesta    ? `<div class="result-row"><span>🚗 Cestovné</span><span class="val">+ ${cesta.toLocaleString('cs')} Kč</span></div>` : ''}
      ${material ? `<div class="result-row"><span>🛒 Materiál</span><span class="val">+ ${material.toLocaleString('cs')} Kč</span></div>` : ''}
      ${ostatni  ? `<div class="result-row"><span>📎 Ostatní</span><span class="val">${ostatni >= 0 ? '+' : ''} ${ostatni.toLocaleString('cs')} Kč</span></div>` : ''}
      ${zaloha   ? `<div class="result-row"><span>💳 Záloha</span><span class="val">− ${zaloha.toLocaleString('cs')} Kč</span></div>` : ''}
      <div class="result-row"><span>💰 K VYPLACENÍ</span><span class="val" style="color:var(--c-green);font-size:1.15rem;font-family:var(--f-display)">${doplatek.toFixed(0)} Kč</span></div>
    </div>`;
}

// ── Parsování materiálu ───────────────────────────────────
function parseMaterial(prefix) {
  const text  = document.getElementById(prefix + '_material')?.value || '';
  const lines = text.split('\n').filter(l => l.trim());
  let total   = 0;
  const parsed = [];

  lines.forEach(line => {
    const match = line.match(/[=:]\s*([\d\s]+(?:[.,]\d+)?)\s*(?:kč|Kč|,-|czk)?$/i)
      || line.match(/([\d\s]+(?:[.,]\d+)?)\s*(?:kč|Kč|,-|czk)\s*$/i);
    if (match) {
      const val = parseFloat(match[1].replace(/\s/g, '').replace(',', '.'));
      if (!isNaN(val) && val > 0) { total += val; parsed.push({ text: line.trim(), val }); }
    }
  });

  const souhrn = document.getElementById(prefix + '_material_souhrn');
  if (souhrn) {
    if (parsed.length > 0) {
      souhrn.style.display = 'block';
      souhrn.innerHTML = parsed.map(p => `
        <div style="display:flex;justify-content:space-between;padding:0.2rem 0;
          border-bottom:1px solid var(--c-border)">
          <span style="color:var(--c-ink2);flex:1;margin-right:0.5rem">
            ${escHtml(p.text.replace(/[=:]\s*[\d.,]+\s*(?:kč|Kč|,-|czk)?$/i, '').trim())}
          </span>
          <span style="font-weight:600;white-space:nowrap">${p.val.toLocaleString('cs')} Kč</span>
        </div>`).join('') +
        `<div style="display:flex;justify-content:space-between;padding:0.35rem 0;
          font-weight:700;color:var(--c-terra)">
          <span>🛒 Materiál celkem</span>
          <span>${total.toLocaleString('cs')} Kč</span>
        </div>`;
    } else {
      souhrn.style.display = 'none';
    }
  }
  return total;
}

// ── Vlastní / brigádník ───────────────────────────────────
function spocitatVyplatuVlastni() {
  const h       = parseFloat(v('vyp_hod'))     || 0;
  const s       = parseFloat(v('vyp_sazba'))   || 0;
  const strava  = parseFloat(v('vyp_strava'))  || 0;
  const cesta   = parseFloat(v('vyp_cesta'))   || 0;
  const zaloha  = parseFloat(v('vyp_zaloha'))  || 0;
  const ostatni = parseFloat(v('vyp_ostatni')) || 0;
  const jmeno   = v('vyp_jmeno') || 'Pracovník';
  const material = parseMaterial('vyp');
  const hruba   = h * s;
  const doplatek = hruba + strava + cesta + ostatni + material - zaloha;

  const el = document.getElementById('vysledek_vyp');
  if (!el) return;

  el.innerHTML = `
    <div class="result-box" style="margin-top:0.8rem">
      <div style="font-family:var(--f-display);font-weight:800;font-size:0.95rem;
        margin-bottom:0.5rem;color:var(--c-ink)">
        ${escHtml(jmeno)}
      </div>
      <div class="result-row"><span>⏱️ Mzda (${h} hod × ${s} Kč)</span><span class="val">${hruba.toFixed(0)} Kč</span></div>
      ${strava   ? `<div class="result-row"><span>🍽️ Stravné</span><span class="val">+ ${strava.toLocaleString('cs')} Kč</span></div>` : ''}
      ${cesta    ? `<div class="result-row"><span>🚗 Cestovné</span><span class="val">+ ${cesta.toLocaleString('cs')} Kč</span></div>` : ''}
      ${material ? `<div class="result-row"><span>🛒 Nakoupený materiál</span><span class="val">+ ${material.toLocaleString('cs')} Kč</span></div>` : ''}
      ${ostatni  ? `<div class="result-row"><span>📎 Ostatní</span><span class="val">${ostatni >= 0 ? '+' : ''} ${ostatni.toLocaleString('cs')} Kč</span></div>` : ''}
      ${zaloha   ? `<div class="result-row"><span>💳 Záloha</span><span class="val">− ${zaloha.toLocaleString('cs')} Kč</span></div>` : ''}
      <div class="result-row">
        <span>💰 K VYPLACENÍ</span>
        <span class="val" style="color:var(--c-green);font-size:1.15rem;font-family:var(--f-display)">
          ${doplatek.toFixed(0)} Kč
        </span>
      </div>
    </div>`;
}
