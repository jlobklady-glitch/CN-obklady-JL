// ═══ sklad.js — JL-OBKLADY CN v4 ═══
async function pageSklad() {
  const items  = await dbGetAll('sklad');
  const skupiny = ['Lepidlo','Spárovačka','Hydroizolace','Penetrace','Dlaždice/Obklady','Nářadí','Ostatní'];
  const total   = items.length;
  const dochazi = items.filter(i => i.mnozstvi <= (i.minMnozstvi || 0)).length;

  return `
    <div class="header-bar">
      <button onclick="navigate('dashboard')"
        style="background:none;border:none;font-size:1.3rem;cursor:pointer;color:white;padding:0.2rem">←</button>
      <div style="flex:1">
        <h1>Sklad</h1>
        <div class="subtitle">
          ${total} položek${dochazi > 0 ? ' · ⚠️ ' + dochazi + ' dochází' : ''}
        </div>
      </div>
      <button onclick="exportSkladCSV()"
        style="background:rgba(255,255,255,0.12);color:white;border:1.5px solid rgba(255,255,255,0.2);
          border-radius:var(--r-sm);padding:0.4rem 0.7rem;font-size:0.78rem;font-weight:600;cursor:pointer;
          font-family:var(--f-body)">
        📊 CSV
      </button>
    </div>

    <div class="card">
      <div class="card-title">➕ Přidat položku skladu</div>
      <div class="field">
        <label>Název materiálu</label>
        <input id="sk_nazev" placeholder="Mapei Keraflex Maxi S1 šedé">
      </div>
      <div class="field-row">
        <div class="field">
          <label>Kategorie</label>
          <select id="sk_skupina">
            ${skupiny.map(s => `<option value="${s}">${s}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Jednotka</label>
          <select id="sk_jednotka">
            <option value="ks">ks</option>
            <option value="kg">kg</option>
            <option value="pytel">pytel</option>
            <option value="m²">m²</option>
            <option value="bal">bal</option>
          </select>
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>Množství skladem</label>
          <input type="number" id="sk_mnozstvi" placeholder="12" min="0">
        </div>
        <div class="field">
          <label>Min. upozornění (při ≤)</label>
          <input type="number" id="sk_min" placeholder="3" min="0">
        </div>
      </div>
      <button class="btn btn-primary btn-full" onclick="ulozitSkladItem()">
        💾 Přidat na sklad
      </button>
    </div>

    ${items.length === 0 ? `
    <div class="card">
      <div class="empty">
        <span class="icon">📦</span>
        <p>Sklad je prázdný. Přidej první položku.</p>
      </div>
    </div>` :
    skupiny.map(skupina => {
      const polozky = items.filter(i => i.skupina === skupina);
      if (!polozky.length) return '';
      return `
      <div class="card">
        <div class="card-title">${skupina}</div>
        ${polozky.map(item => {
          const dochazi = item.mnozstvi <= (item.minMnozstvi || 0);
          return `
          <div style="display:flex;align-items:center;gap:0.5rem;padding:0.6rem 0;
            border-bottom:1px solid var(--c-s2)">
            <div style="flex:1">
              <div style="font-weight:600;font-size:0.9rem;
                ${dochazi ? 'color:var(--c-red)' : ''}">
                ${escHtml(item.nazev)}${dochazi ? ' ⚠️' : ''}
              </div>
              <div style="font-size:0.72rem;color:var(--c-ink3)">${item.skupina}</div>
            </div>
            <div style="display:flex;align-items:center;gap:0.3rem">
              <button onclick="upravitSkladMnozstvi(${item.id},-1)"
                style="width:28px;height:28px;border-radius:var(--r-xs);
                  border:1.5px solid var(--c-border);background:var(--c-surface);
                  cursor:pointer;font-size:1rem;display:flex;align-items:center;
                  justify-content:center;color:var(--c-ink)">−</button>
              <span data-sklad-mnozstvi="${item.id}"
                style="font-weight:700;min-width:44px;text-align:center;
                  color:${dochazi ? 'var(--c-red)' : 'var(--c-terra)'}">
                ${item.mnozstvi} ${item.jednotka}
              </span>
              <button onclick="upravitSkladMnozstvi(${item.id},1)"
                style="width:28px;height:28px;border-radius:var(--r-xs);
                  border:1.5px solid var(--c-border);background:var(--c-surface);
                  cursor:pointer;font-size:1rem;display:flex;align-items:center;
                  justify-content:center;color:var(--c-ink)">+</button>
              <button onclick="navysitZasobu(${item.id})"
                style="width:28px;height:28px;border-radius:var(--r-xs);
                  border:1.5px solid var(--c-green);background:var(--c-green-s);
                  color:var(--c-green);cursor:pointer;font-size:0.78rem;font-weight:700">+</button>
              <button onclick="smazatSkladItem(${item.id})"
                style="width:28px;height:28px;border-radius:var(--r-xs);
                  border:none;background:var(--c-red-s);color:var(--c-red);cursor:pointer;
                  font-size:0.82rem">🗑️</button>
            </div>
          </div>`;
        }).join('')}
      </div>`;
    }).join('')}
    <div style="height:5rem"></div>
  `;
}

async function ulozitSkladItem() {
  const nazev     = document.getElementById('sk_nazev')?.value?.trim();
  const skupina   = document.getElementById('sk_skupina')?.value || 'Ostatní';
  const jednotka  = document.getElementById('sk_jednotka')?.value || 'ks';
  const mnozstvi  = parseFloat(document.getElementById('sk_mnozstvi')?.value) || 0;
  const minMnozstvi = parseFloat(document.getElementById('sk_min')?.value)    || 0;
  if (!nazev) { toast('Zadej název materiálu', 'err'); return; }
  await dbPut('sklad', { nazev, skupina, jednotka, mnozstvi, minMnozstvi });
  toast('Položka přidána na sklad ✓');
  await render();
}

async function upravitSkladMnozstvi(id, delta) {
  const item = await dbGet('sklad', id);
  if (!item) return;
  item.mnozstvi = Math.max(0, (item.mnozstvi || 0) + delta);
  await dbPut('sklad', item);

  const el = document.querySelector(`[data-sklad-mnozstvi="${id}"]`);
  if (el) {
    el.textContent = `${item.mnozstvi} ${item.jednotka || 'ks'}`;
    const d = item.mnozstvi <= (item.minMnozstvi || 0);
    el.style.color = d ? 'var(--c-red)' : 'var(--c-terra)';
    const subtitle = document.querySelector('.header-bar .subtitle');
    if (subtitle && state.page === 'sklad') {
      const all = await dbGetAll('sklad');
      const doc = all.filter(i => i.mnozstvi <= (i.minMnozstvi || 0)).length;
      subtitle.textContent = `${all.length} položek${doc > 0 ? ' · ⚠️ ' + doc + ' dochází' : ''}`;
    }
  } else {
    await render();
  }
}

async function smazatSkladItem(id) {
  await dbDelete('sklad', id);
  toast('Položka smazána');
  await render();
}

async function exportSkladCSV() {
  const items = await dbGetAll('sklad');
  if (!items.length) { toast('Sklad je prázdný', 'err'); return; }
  const rows = ['Název;Kategorie;Množství;Jednotka;Min.upozornění;Stav'];
  items.forEach(i => {
    const stav = i.mnozstvi <= (i.minMnozstvi || 0) ? 'DOCHÁZÍ' : 'OK';
    rows.push([i.nazev, i.skupina, i.mnozstvi, i.jednotka, i.minMnozstvi || 0, stav].join(';'));
  });
  const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'sklad-' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
  toast('Sklad exportován ✓');
}

async function navysitZasobu(id) {
  const item = await dbGet('sklad', id);
  if (!item) return;

  showBottomSheet(`📦 Navýšit zásobu — ${escHtml(item.nazev)}`, `
    <div style="font-size:0.82rem;color:var(--c-ink3);margin-bottom:0.7rem">
      Aktuální zásoba: <strong>${item.mnozstvi} ${item.jednotka}</strong>
    </div>
    <div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.8rem">
      <input type="number" id="navys_mnozstvi" placeholder="Kolik přidat?" min="0"
        style="flex:1;padding:0.7rem;border:1.5px solid var(--c-terra);
          border-radius:var(--r-sm);font-size:1.15rem;font-weight:700;text-align:center;
          font-family:var(--f-body);background:var(--c-bg);color:var(--c-ink)">
      <span style="font-size:0.9rem;color:var(--c-ink3)">${item.jednotka}</span>
    </div>
    <button onclick="navysitZasobuUlozit(${id})" class="btn btn-primary btn-full">
      ✅ Přidat na sklad
    </button>
  `);
  setTimeout(() => document.getElementById('navys_mnozstvi')?.focus(), 80);
}

async function navysitZasobuUlozit(id) {
  const pridat = parseFloat(document.getElementById('navys_mnozstvi')?.value) || 0;
  if (pridat <= 0) { toast('Zadej kladné množství', 'err'); return; }
  const item = await dbGet('sklad', id);
  if (!item) return;
  item.mnozstvi = Math.round((item.mnozstvi + pridat) * 100) / 100;
  await dbPut('sklad', item);
  closeBottomSheet();
  toast(`✓ Přidáno ${pridat} ${item.jednotka} — celkem ${item.mnozstvi} ${item.jednotka}`);
  await render();
}
