// ═══ kalendar.js — JL-OBKLADY CN v4 ═══
async function pageKalendar() {
  const [vsechnyH, pracovnici, nabidky] = await Promise.all([
    dbGetAll('hodiny'), dbGetAll('pracovnici'), dbGetAll('nabidky')
  ]);
  const filterPId = state.filterPracovnikId || null;
  const filtH     = filterPId ? vsechnyH.filter(h => h.pracovnikId === filterPId) : vsechnyH;

  // Seskupit dle data
  const hMap = {};
  filtH.forEach(h => {
    if (!hMap[h.datum]) hMap[h.datum] = [];
    hMap[h.datum].push(h);
  });

  const rok  = kalState.rok;
  const mes  = kalState.mesic;
  const prvniDen   = new Date(rok, mes, 1);
  const posledniDen = new Date(rok, mes + 1, 0);
  const startDow   = (prvniDen.getDay() + 6) % 7;
  const dnesStr    = new Date().toISOString().slice(0, 10);

  // ── Generuj buňky kalendáře ──────────────────────────────
  let bunky = '';
  for (let i = 0; i < startDow; i++) bunky += `<div></div>`;
  for (let d = 1; d <= posledniDen.getDate(); d++) {
    const ds  = `${rok}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const zaz = hMap[ds] || [];
    const sel = kalState.vybranyDen === ds;
    const dnes = ds === dnesStr;
    const celk = zaz.reduce((s, h) => s + h.hodiny, 0);
    const teckHtml = [...new Set(zaz.map(h => h.pracovnikBarva || '#3b82f6'))].slice(0, 4)
      .map(b => `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;
        background:${b};margin:0.5px"></span>`).join('');

    bunky += `
      <div onclick="vybratDen('${ds}')"
        style="min-height:3.2rem;padding:0.32rem;border-radius:var(--r-sm);cursor:pointer;
          background:${sel ? 'var(--c-terra)' : dnes ? 'var(--c-s2)' : 'transparent'};
          border:2px solid ${dnes && !sel ? 'var(--c-terra)' : 'transparent'};
          transition:background var(--dur)">
        <div style="font-weight:${dnes ? 700 : 500};font-size:0.85rem;
          color:${sel ? 'white' : dnes ? 'var(--c-terra)' : 'var(--c-ink)'}">
          ${d}
        </div>
        ${zaz.length ? `
          <div>${teckHtml}</div>
          <div style="font-size:0.62rem;font-weight:700;
            color:${sel ? 'rgba(255,255,255,0.85)' : 'var(--c-terra)'};margin-top:1px">
            ${celk}h
          </div>` : ''}
      </div>`;
  }

  // ── Panel vybraného dne ──────────────────────────────────
  let denPanel = '';
  if (kalState.vybranyDen) {
    const zaz     = hMap[kalState.vybranyDen] || [];
    const denNazev = new Date(kalState.vybranyDen + 'T12:00').toLocaleDateString('cs-CZ', {
      weekday: 'long', day: 'numeric', month: 'long'
    });
    const celkH = zaz.reduce((s, h) => s + h.hodiny, 0);

    denPanel = `
      <div class="card" style="margin-top:0.8rem">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.7rem">
          <div>
            <div style="font-weight:700;font-size:0.95rem;text-transform:capitalize">
              ${denNazev}
            </div>
            ${celkH > 0 ? `<div style="font-size:0.78rem;color:var(--c-ink2)">
              Celkem: <strong style="color:var(--c-terra)">${celkH}h</strong>
            </div>` : ''}
          </div>
          <button class="btn btn-primary btn-sm"
            onclick="otevritNoveHodiny('${kalState.vybranyDen}')">
            ➕ Hodiny
          </button>
        </div>
        ${zaz.length === 0 ? `
          <div style="text-align:center;color:var(--c-ink3);font-size:0.85rem;padding:0.8rem 0">
            Žádné záznamy. Klikni ➕ pro přidání.
          </div>` :
          zaz.map(h => `
          <div style="display:flex;align-items:center;gap:0.6rem;padding:0.55rem 0;
            border-bottom:1px solid var(--c-border)">
            <div style="width:10px;height:10px;border-radius:50%;
              background:${h.pracovnikBarva || '#3b82f6'};flex-shrink:0"></div>
            <div style="flex:1">
              <div style="font-weight:600;font-size:0.88rem">${escHtml(h.pracovnikJmeno)}</div>
              <div style="font-size:0.75rem;color:var(--c-ink2)">
                ${h.od}–${h.do} ·
                <strong>${h.hodiny}h</strong>
                ${h.nabidkaNazev ? ' · ' + escHtml(h.nabidkaNazev) : ''}
                ${h.poznamka ? ' · ' + escHtml(h.poznamka) : ''}
              </div>
            </div>
            <button onclick="otevritEditHodiny(${h.id})"
              style="background:none;border:none;cursor:pointer;font-size:0.9rem;
                color:var(--c-ink3);padding:0.2rem">✏️</button>
            <button onclick="deleteHodiny(${h.id})"
              style="background:none;border:none;cursor:pointer;font-size:0.9rem;
                color:var(--c-red);padding:0.2rem">🗑️</button>
          </div>`).join('')}
      </div>`;
  }

  // ── Týdenní souhrn ───────────────────────────────────────
  const dnes2  = new Date();
  const ponOff = (dnes2.getDay() + 6) % 7;
  const tydenH = Array.from({ length: 7 }, (_, i) => {
    const d2 = new Date(dnes2);
    d2.setDate(dnes2.getDate() - ponOff + i);
    const ds = d2.toISOString().slice(0, 10);
    return { ds, h: filtH.filter(x => x.datum === ds).reduce((s, x) => s + x.hodiny, 0) };
  });
  const tydenCelk = tydenH.reduce((s, x) => s + x.h, 0);

  // ── Filter tlačítka ──────────────────────────────────────
  const filterBtn = pracovnici.length > 0 ? `
    <div style="display:flex;gap:0.3rem;flex-wrap:wrap;margin-bottom:0.8rem">
      <button class="btn btn-sm ${!filterPId ? 'btn-primary' : 'btn-secondary'}"
        onclick="navigate('kalendar')" style="font-size:0.72rem">
        Všichni
      </button>
      ${pracovnici.map(p => `
        <button class="btn btn-sm ${filterPId === p.id ? 'btn-primary' : 'btn-secondary'}"
          onclick="navigate('kalendar',{filterPracovnikId:${p.id}})"
          style="font-size:0.72rem;border-left:3px solid ${p.barva}">
          ${escHtml(p.jmeno.split(' ')[0])}
        </button>`).join('')}
    </div>` : '';

  const upozorneni = pracovnici.length === 0 ? `
    <div class="card card-warn">
      <div style="display:flex;align-items:center;gap:0.8rem">
        <span style="font-size:1.8rem">👷</span>
        <div style="flex:1">
          <div style="font-weight:700;margin-bottom:0.3rem">Nejprve přidej pracovníky</div>
          <button class="btn btn-primary btn-sm" onclick="navigate('pracovnici')">
            ➕ Přidat pracovníky
          </button>
        </div>
      </div>
    </div>` : '';

  return `
    <div class="header-bar">
      <span class="logo">📅</span>
      <div style="flex:1">
        <h1>Kalendář</h1>
        <div class="subtitle">Evidence pracovní doby</div>
      </div>
      <div style="display:flex;gap:0.35rem;align-items:center">
        <button class="btn btn-secondary btn-sm" onclick="exportHodinyCSV()"
          style="font-size:0.72rem">📊 CSV</button>
        <button class="btn btn-secondary btn-sm" onclick="navigate('pracovnici')"
          style="font-size:0.72rem">👷 Tým</button>
        <button onclick="spustitHlasoveZadani()"
          style="background:linear-gradient(135deg,#ef4444,#dc2626);color:white;border:none;
            border-radius:var(--r-sm);padding:0.45rem 0.75rem;font-size:1rem;cursor:pointer;
            box-shadow:0 2px 10px rgba(239,68,68,0.4)">🎤</button>
      </div>
    </div>

    ${upozorneni}

    <!-- Navigace měsíce -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.8rem">
      <button onclick="kalPrevMesic()"
        style="background:var(--c-s2);border:none;border-radius:var(--r-sm);
          padding:0.5rem 1rem;font-size:1.1rem;cursor:pointer;color:var(--c-ink)">‹</button>
      <div style="font-family:var(--f-display);font-weight:800;font-size:1.05rem">
        ${MESICE_CS[mes]} ${rok}
      </div>
      <button onclick="kalNextMesic()"
        style="background:var(--c-s2);border:none;border-radius:var(--r-sm);
          padding:0.5rem 1rem;font-size:1.1rem;cursor:pointer;color:var(--c-ink)">›</button>
    </div>

    ${filterBtn}

    <!-- Záhlaví dnů -->
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:3px">
      ${DNY_CS.map((d, i) => `
        <div style="text-align:center;font-size:0.68rem;font-weight:700;
          color:${i >= 5 ? 'var(--c-red)' : 'var(--c-ink3)'};padding:0.18rem">
          ${d}
        </div>`).join('')}
    </div>

    <!-- Buňky kalendáře -->
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px">
      ${bunky}
    </div>

    ${denPanel}

    <!-- Týdenní souhrn -->
    <div class="card" style="margin-top:0.8rem">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.6rem">
        <div class="card-title" style="margin:0">📊 Tento týden</div>
        <span style="font-family:var(--f-display);font-weight:800;font-size:1.1rem;
          color:var(--c-terra)">${tydenCelk}h</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;text-align:center">
        ${tydenH.map(({ h }, i) => `
          <div style="padding:0.38rem 0.1rem;border-radius:var(--r-xs);
            background:${h > 0 ? 'var(--c-s2)' : 'transparent'}">
            <div style="font-size:0.65rem;color:var(--c-ink3)">${DNY_CS[i]}</div>
            <div style="font-weight:700;font-size:0.85rem;
              color:${h > 0 ? 'var(--c-terra)' : 'var(--c-ink3)'}">
              ${h > 0 ? h + 'h' : '–'}
            </div>
          </div>`).join('')}
      </div>
    </div>

    <!-- Modal: ruční zadání hodin -->
    <div id="modal-hodiny"
      style="display:none;position:fixed;inset:0;z-index:999;
        background:rgba(22,20,15,0.6);backdrop-filter:blur(6px)"
      onclick="zavritModalHodiny()">
      <div onclick="event.stopPropagation()" id="modal-hodiny-inner"
        style="position:absolute;bottom:0;left:0;right:0;
          background:var(--c-surface);border-radius:var(--r) var(--r) 0 0;
          padding:1.2rem;max-height:92dvh;overflow-y:auto;
          animation:slideUp 0.25s var(--ease) both">
      </div>
    </div>

    <!-- Overlay: hlasové zadání -->
    <div id="overlay-hlas"
      style="display:none;position:fixed;inset:0;z-index:1000;
        background:rgba(0,0,0,0.88);backdrop-filter:blur(12px);
        flex-direction:column;align-items:center;justify-content:center;gap:1.2rem">
      <div id="hlas-animace"
        style="width:88px;height:88px;border-radius:50%;
          background:radial-gradient(circle,#ef4444,#dc2626);
          display:flex;align-items:center;justify-content:center;font-size:2.4rem;
          box-shadow:0 0 0 0 rgba(239,68,68,0.7);animation:pulse-mic 1.5s infinite">
        🎤
      </div>
      <div style="color:white;font-family:var(--f-display);font-size:1.1rem;font-weight:800">
        Poslouchám…
      </div>
      <div id="hlas-transkript"
        style="color:rgba(255,255,255,0.65);font-size:0.88rem;
          max-width:300px;text-align:center;min-height:2rem;font-style:italic">
      </div>
      <div id="hlas-status" style="color:rgba(255,255,255,0.45);font-size:0.78rem"></div>
      <button onclick="zastavitHlas()"
        style="background:rgba(255,255,255,0.12);color:white;
          border:1.5px solid rgba(255,255,255,0.25);border-radius:var(--r-pill);
          padding:0.6rem 1.5rem;font-size:0.9rem;cursor:pointer;margin-top:0.5rem;
          font-family:var(--f-body)">
        ✕ Zrušit
      </button>
    </div>

    <div style="height:5rem"></div>`;
}

// ── Akce ──────────────────────────────────────────────────
function vybratDen(datum) {
  kalState.vybranyDen = kalState.vybranyDen === datum ? null : datum;
  render();
}
function kalPrevMesic() {
  if (--kalState.mesic < 0) { kalState.mesic = 11; kalState.rok--; }
  kalState.vybranyDen = null;
  render();
}
function kalNextMesic() {
  if (++kalState.mesic > 11) { kalState.mesic = 0; kalState.rok++; }
  kalState.vybranyDen = null;
  render();
}

async function otevritNoveHodiny(datum) {
  const [p, n] = await Promise.all([dbGetAll('pracovnici'), dbGetAll('nabidky')]);
  _otevritModalHodiny(null, datum, p, n);
}
async function otevritEditHodiny(id) {
  const h = await dbGet('hodiny', id);
  if (!h) return;
  const [p, n] = await Promise.all([dbGetAll('pracovnici'), dbGetAll('nabidky')]);
  _otevritModalHodiny(h, h.datum, p, n);
}

function _otevritModalHodiny(editRec, datum, pracovnici, nabidky) {
  let modal = document.getElementById('modal-hodiny');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-hodiny';
    modal.style.cssText = 'display:none;position:fixed;inset:0;z-index:999;background:rgba(22,20,15,0.6);backdrop-filter:blur(6px)';
    modal.onclick = e => { if (e.target === modal) zavritModalHodiny(); };
    const inner = document.createElement('div');
    inner.id = 'modal-hodiny-inner';
    inner.onclick = e => e.stopPropagation();
    inner.style.cssText = 'position:absolute;bottom:0;left:0;right:0;background:var(--c-surface);border-radius:var(--r) var(--r) 0 0;padding:1.2rem;max-height:92dvh;overflow-y:auto';
    modal.appendChild(inner);
    document.body.appendChild(modal);
  }
  const inner = document.getElementById('modal-hodiny-inner');
  if (!inner) return;

  const pracOpt = pracovnici.map(p =>
    `<option value="${p.id}" ${editRec?.pracovnikId === p.id ? 'selected' : ''}>
      ${escHtml(p.jmeno)} (${p.sazba} Kč/h)
    </option>`
  ).join('');
  const nabOpt = `<option value="">— žádná zakázka —</option>` +
    nabidky.map(n =>
      `<option value="${n.id}" ${editRec?.nabidkaId === n.id ? 'selected' : ''}>
        ${escHtml(n.nazev || 'Nabídka #' + n.id)}
      </option>`
    ).join('');

  inner.innerHTML = `
    <div style="width:36px;height:3.5px;background:var(--c-border2);
      border-radius:100px;margin:0 auto 1rem"></div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
      <div style="font-family:var(--f-display);font-weight:800;font-size:1rem">
        ${editRec ? '✏️ Upravit záznam' : '➕ Nový záznam hodin'}
      </div>
      <button onclick="zavritModalHodiny()"
        style="background:var(--c-s2);border:none;border-radius:50%;width:30px;height:30px;
          cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;
          color:var(--c-ink2)">✕</button>
    </div>
    <div class="field"><label>📅 Datum</label>
      <input type="date" id="hod_datum" value="${editRec?.datum || datum}">
    </div>
    <div class="field"><label>👷 Pracovník</label>
      <select id="hod_pracovnik">
        ${pracovnici.length ? pracOpt : '<option>Nejprve přidej pracovníky</option>'}
      </select>
    </div>
    <div class="field-row">
      <div class="field"><label>⏰ Od</label>
        <input type="time" id="hod_od" value="${editRec?.od || '07:00'}"
          oninput="prepocitatHodiny()">
      </div>
      <div class="field"><label>⏰ Do</label>
        <input type="time" id="hod_do" value="${editRec?.do || '15:30'}"
          oninput="prepocitatHodiny()">
      </div>
    </div>
    <div id="hod_vypocet"
      style="background:var(--c-s2);border-radius:var(--r-sm);padding:0.6rem;
        margin-bottom:0.8rem;font-family:var(--f-display);font-weight:800;
        color:var(--c-terra);text-align:center;font-size:1.2rem">
      ⏱️ ${editRec ? editRec.hodiny + ' h' : '8.5 h'}
    </div>
    <div class="field"><label>📋 Zakázka</label>
      <select id="hod_nabidka">${nabOpt}</select>
    </div>
    <div class="field"><label>📝 Poznámka</label>
      <input id="hod_poznamka"
        placeholder="Pokládka obkladů, koupelna…"
        value="${escHtml(editRec?.poznamka || '')}">
    </div>
    <button class="btn btn-primary btn-full" onclick="saveHodiny(${editRec?.id || 'null'})">
      💾 ${editRec ? 'Uložit změny' : 'Přidat záznam'}
    </button>
    ${editRec ? `
      <button class="btn btn-danger btn-full" style="margin-top:0.4rem"
        onclick="deleteHodiny(${editRec.id})">
        🗑️ Smazat
      </button>` : ''}
    <div style="height:1.5rem"></div>`;

  modal.style.display = 'block';
  prepocitatHodiny();
}

function zavritModalHodiny() {
  const m = document.getElementById('modal-hodiny');
  if (m) m.style.display = 'none';
}
function prepocitatHodiny() {
  const h  = vypocitatHodiny(
    document.getElementById('hod_od')?.value,
    document.getElementById('hod_do')?.value
  );
  const el = document.getElementById('hod_vypocet');
  if (el) el.textContent = `⏱️ ${h} h`;
}
