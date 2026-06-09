// ═══ prace.js — JL-OBKLADY CN v4 ═══
const PRACE_PIN = '1103';
let praceOdemceno = false;

async function pagePrace() {
  if (!praceOdemceno) return renderPracePIN();

  const existujici = await dbGetAll('prace');
  if (existujici.length === 0) {
    for (const p of VYCHOZI_PRACE) await dbPut('prace', p);
  }
  const data    = await dbGetAll('prace');
  const skupiny = [...new Set(data.map(p => p.skupina || 'Ostatní'))];

  return `
    <div class="header-bar">
      <span class="logo">🛠️</span>
      <div style="flex:1">
        <h1>Ceník prací</h1>
        <div class="subtitle">${data.length} položek · 🔓 Odemčeno</div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="zamknutPrace()"
        style="margin-left:auto">🔒 Zamknout</button>
    </div>

    <!-- Přidat vlastní práci -->
    <div class="card">
      <div class="card-title">Přidat vlastní práci</div>
      <div class="field">
        <label>Skupina</label>
        <input id="prace_skupina" list="skupiny_list" placeholder="Příprava podkladu">
        <datalist id="skupiny_list">
          ${skupiny.map(s => `<option value="${escHtml(s)}">`).join('')}
        </datalist>
      </div>
      <div class="field">
        <label>Popis práce</label>
        <input id="prace_popis" placeholder="Popis úkonu…">
      </div>
      <div class="field-row">
        <div class="field"><label>Cena / m² (Kč)</label>
          <input type="number" id="prace_cena" placeholder="0">
        </div>
        <div class="field"><label>Sazba / hod (Kč)</label>
          <input type="number" id="prace_hod" placeholder="0">
        </div>
        <div class="field"><label>Jednotka</label>
          <select id="prace_jedn">
            <option value="m²">m²</option>
            <option value="bm">bm</option>
            <option value="ks">ks</option>
            <option value="hod">hod</option>
          </select>
        </div>
      </div>
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="pridatPraci()">➕ Přidat</button>
        <button class="btn btn-secondary btn-sm" onclick="nacitstVychoziPrace()">
          ↺ Výchozí ceník
        </button>
        <button class="btn btn-danger btn-sm" onclick="smazatVsechnyPrace()"
          style="margin-left:auto">
          🗑️ Smazat vše
        </button>
      </div>

      <!-- Hromadná změna cen -->
      <div style="margin-top:0.9rem;padding-top:0.9rem;border-top:1px solid var(--c-border)">
        <div class="card-title">📈 Hromadná změna cen</div>
        <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap">
          <input type="number" id="hromadna_proc" placeholder="např. 10 nebo -5"
            style="width:140px;padding:0.5rem;border:1.5px solid var(--c-border);
              border-radius:var(--r-sm);font-family:var(--f-body);background:var(--c-bg);
              color:var(--c-ink)">
          <span style="font-size:0.85rem;color:var(--c-ink2)">%</span>
          <button class="btn btn-secondary btn-sm"
            onclick="hromadnaZmenaCen(parseFloat(document.getElementById('hromadna_proc').value))">
            💱 Upravit všechny ceny
          </button>
        </div>
        <p style="font-size:0.72rem;color:var(--c-ink3);margin-top:0.3rem">
          Kladné = zdražení, záporné = zlevnění
        </p>
      </div>
    </div>

    <!-- Skupinový filtr -->
    <div style="display:flex;gap:0.3rem;overflow-x:auto;padding-bottom:0.3rem;
      margin-bottom:0.8rem;scrollbar-width:none">
      <button onclick="filterPrace('')" id="pf_all"
        style="padding:0.3rem 0.7rem;border-radius:var(--r-pill);border:1.5px solid var(--c-terra);
          background:var(--c-terra);color:white;white-space:nowrap;cursor:pointer;
          font-family:var(--f-body);font-size:0.72rem;font-weight:600;flex-shrink:0">
        Vše (${data.length})
      </button>
      ${skupiny.map(s => `
        <button onclick="filterPrace('${escHtml(s).replace(/'/g, "\\'")}')"
          id="pf_${s.replace(/[^a-z0-9]/gi, '_')}"
          style="padding:0.3rem 0.7rem;border-radius:var(--r-pill);
            border:1.5px solid var(--c-border);background:var(--c-s2);
            color:var(--c-ink2);white-space:nowrap;cursor:pointer;font-family:var(--f-body);
            font-size:0.72rem;font-weight:600;flex-shrink:0">
          ${escHtml(s)} (${data.filter(p => (p.skupina || 'Ostatní') === s).length})
        </button>`).join('')}
    </div>

    <!-- Skupiny prací -->
    ${skupiny.map(skupina => {
      const polozky = data.filter(p => (p.skupina || 'Ostatní') === skupina);
      return `
        <div class="card" data-skupina="${escHtml(skupina)}">
          <div class="card-title" style="color:var(--c-terra)">${escHtml(skupina)}</div>
          ${polozky.map(p => `
            <div style="padding:0.6rem 0;border-bottom:1px solid var(--c-s2)">
              <div style="font-weight:600;font-size:0.87rem;line-height:1.3;margin-bottom:0.4rem">
                ${escHtml(p.popis)}
              </div>
              <div style="display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap">
                ${p.jednotka !== 'hod' ? `
                  <input type="number" value="${p.cena || 0}" id="edit_cena_${p.id}"
                    style="width:82px;padding:0.32rem 0.45rem;border:1.5px solid var(--c-border);
                      border-radius:var(--r-xs);font-size:0.85rem;background:var(--c-bg);
                      color:var(--c-ink)">
                  <span style="font-size:0.75rem;color:var(--c-ink2)">Kč/${p.jednotka || 'm²'}</span>
                ` : ''}
                ${(p.hodSazba > 0 || p.jednotka === 'hod') ? `
                  <input type="number" value="${p.hodSazba || 0}" id="edit_hod_${p.id}"
                    style="width:82px;padding:0.32rem 0.45rem;border:1.5px solid var(--c-border);
                      border-radius:var(--r-xs);font-size:0.85rem;background:var(--c-bg);
                      color:var(--c-ink)">
                  <span style="font-size:0.75rem;color:var(--c-ink2)">Kč/hod</span>
                ` : ''}
                <button class="btn btn-success btn-xs"
                  onclick="ulozitCenuPrace(${p.id}, this)" title="Uložit">💾</button>
                <button class="btn btn-danger btn-xs"
                  onclick="deletePrace(${p.id})" title="Smazat">🗑️</button>
              </div>
            </div>`).join('')}
        </div>`;
    }).join('')}
    <div style="height:5rem"></div>
  `;
}

// ── PIN obrazovka ─────────────────────────────────────────
function renderPracePIN() {
  return `
    <div class="header-bar">
      <span class="logo">🔒</span>
      <div><h1>Ceník prací</h1><div class="subtitle">Chráněno PIN kódem</div></div>
    </div>
    <div class="card" style="text-align:center;padding:2rem 1.5rem">
      <div style="font-size:3rem;margin-bottom:1rem">🔐</div>
      <p style="color:var(--c-ink2);margin-bottom:1.5rem;font-size:0.9rem;line-height:1.5">
        Tato sekce je chráněna PIN kódem.<br>Zadej 4místný PIN pro přístup.
      </p>
      <div style="display:flex;justify-content:center;gap:0.7rem;margin-bottom:1.5rem"
        id="pin_dots">
        ${[0,1,2,3].map(() => `<div class="pin-dot"></div>`).join('')}
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.6rem;
        max-width:240px;margin:0 auto">
        ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(n => `
          <button onclick="pinStisk('${n}')"
            style="padding:0.9rem;border-radius:var(--r-sm);border:1.5px solid var(--c-border);
              background:var(--c-s2);color:var(--c-ink);font-size:1.3rem;font-weight:600;
              cursor:pointer;font-family:var(--f-body);transition:background var(--dur)"
            ${n === '' ? 'disabled style="background:transparent;border-color:transparent"' : ''}>
            ${n}
          </button>`).join('')}
      </div>
      <div id="pin_error"
        style="color:var(--c-red);font-size:0.85rem;margin-top:0.9rem;min-height:1.2em">
      </div>
    </div>`;
}

let pinBuffer = '';
function pinStisk(znak) {
  if (znak === '') return;
  if (znak === '⌫') {
    pinBuffer = pinBuffer.slice(0, -1);
  } else if (pinBuffer.length < 4) {
    pinBuffer += znak;
  }

  // Aktualizuj tečky
  const dots = document.querySelectorAll('.pin-dot');
  dots.forEach((d, i) => {
    d.classList.toggle('filled', i < pinBuffer.length);
  });

  if (pinBuffer.length === 4) {
    if (pinBuffer === PRACE_PIN) {
      praceOdemceno = true;
      pinBuffer     = '';
      render();
    } else {
      const errEl = document.getElementById('pin_error');
      if (errEl) errEl.textContent = '❌ Nesprávný PIN, zkus to znovu';
      pinBuffer = '';
      setTimeout(() => {
        document.querySelectorAll('.pin-dot').forEach(d => d.classList.remove('filled'));
        const err = document.getElementById('pin_error');
        if (err) err.textContent = '';
      }, 1200);
    }
  }
}

function zamknutPrace() {
  praceOdemceno = false;
  render();
}

// ── CRUD operace ──────────────────────────────────────────
async function pridatPraci() {
  const popis    = v('prace_popis');
  const cena     = parseFloat(v('prace_cena'))    || 0;
  const hodSazba = parseFloat(v('prace_hod'))     || 0;
  const skupina  = v('prace_skupina')             || 'Ostatní';
  const jednotka = v('prace_jedn')                || 'm²';
  if (!popis)              return toast('Vyplň popis práce', 'err');
  if (!cena && !hodSazba)  return toast('Zadej alespoň jednu cenu', 'err');
  await dbPut('prace', { popis, cena, hodSazba, skupina, jednotka });
  toast('Práce přidána ✓');
  await render();
}

async function deletePrace(id) {
  await dbDelete('prace', id);
  toast('Odstraněno');
  await render();
}

async function ulozitCenuPrace(id, btn) {
  const polozka = await dbGet('prace', id);
  if (!polozka) return toast('Položka nenalezena', 'err');
  const inputCena = document.getElementById('edit_cena_' + id);
  const inputHod  = document.getElementById('edit_hod_'  + id);
  if (inputCena) polozka.cena     = parseFloat(inputCena.value) || 0;
  if (inputHod)  polozka.hodSazba = parseFloat(inputHod.value)  || 0;
  await dbPut('prace', polozka);
  toast('Cena uložena ✓');
  if (btn) {
    const origBg = btn.style.background;
    btn.style.background = 'var(--c-green)';
    setTimeout(() => { btn.style.background = origBg; }, 1200);
  }
}

function filterPrace(skupina) {
  document.querySelectorAll('[id^="pf_"]').forEach(b => {
    b.style.background  = 'var(--c-s2)';
    b.style.color       = 'var(--c-ink2)';
    b.style.borderColor = 'var(--c-border)';
  });
  const activeBtn = skupina
    ? document.getElementById('pf_' + skupina.replace(/[^a-z0-9]/gi, '_'))
    : document.getElementById('pf_all');
  if (activeBtn) {
    activeBtn.style.background  = 'var(--c-terra)';
    activeBtn.style.color       = 'white';
    activeBtn.style.borderColor = 'var(--c-terra)';
  }
  document.querySelectorAll('[data-skupina]').forEach(el => {
    if (!skupina) { el.style.display = ''; return; }
    el.style.display = el.dataset.skupina === skupina ? '' : 'none';
  });
}

async function nacitstVychoziPrace() {
  if (!confirm('Doplnit výchozí ceník (nemaže existující položky)?')) return;
  const existujici  = await dbGetAll('prace');
  const existPopisy = new Set(existujici.map(p => p.popis));
  let count = 0;
  for (const p of VYCHOZI_PRACE) {
    if (!existPopisy.has(p.popis)) { await dbPut('prace', p); count++; }
  }
  toast(count > 0 ? `✓ Doplněno ${count} položek` : 'Výchozí ceník je již kompletní');
  await render();
}

async function smazatVsechnyPrace() {
  if (!confirm('Smazat VŠECHNY práce ze seznamu?')) return;
  const vse = await dbGetAll('prace');
  for (const p of vse) await dbDelete('prace', p.id);
  toast('Ceník prací vymazán');
  await render();
}
