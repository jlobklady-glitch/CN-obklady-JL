// ═══ mapei.js — JL-OBKLADY CN v4 ═══
// Ceník dodavatele Mapei s rabatem. Samostatný store 'mapei' —
// nic nesdílí s obecným ceníkem 'ceniky' (ten pohání výběr dlaždice
// v Nové nabídce a nesmí se na něj sahat).

// ── Nastavení výchozího rabatu ────────────────────────────
async function loadMapeiRabatDefault() {
  const row = await dbGet('nastaveni', 'mapei_rabat_default');
  const n   = parseFloat(row?.hodnota);
  return isNaN(n) ? 28 : n;
}
async function saveMapeiRabatDefault() {
  const val = parseFloat(v('mapei_rabat_default')) || 28;
  await dbPut('nastaveni', { klic: 'mapei_rabat_default', hodnota: val });
  toast(`Výchozí rabat nastaven na ${val} %`);
  await render();
}

// Efektivní rabat položky: ruční výjimka, jinak výchozí
function mapeiEfektivniRabat(item, rabatDefault) {
  return (item.rabatOverride !== null && item.rabatOverride !== undefined && item.rabatOverride !== '')
    ? parseFloat(item.rabatOverride) : rabatDefault;
}

// Moje nákupní cena za jednotku (po rabatu), počítáno z ceny vč. DPH —
// jako neplátce DPH platí Hfdd dodavateli celou částku vč. DPH.
function mapeiNakupniCenaJednotka(item, rabatDefault) {
  const rabat = mapeiEfektivniRabat(item, rabatDefault);
  const cenik = item.cenaJednotkaSDPH || 0;
  return cenik * (1 - rabat / 100);
}

// ── Stránka ────────────────────────────────────────────────
async function pageMapei() {
  const [data, rabatDefault] = await Promise.all([
    dbGetAll('mapei'), loadMapeiRabatDefault()
  ]);

  const tableRows = data.length === 0
    ? `<tr><td colspan="6">
        <div class="empty" style="padding:1.5rem">
          <span class="icon">🧪</span>
          <p>Ceník Mapei je prázdný. Naimportuj Excel níže.</p>
        </div>
      </td></tr>`
    : data.map(item => {
        const rabat    = mapeiEfektivniRabat(item, rabatDefault);
        const nakupni  = mapeiNakupniCenaJednotka(item, rabatDefault);
        const isOverride = item.rabatOverride !== null && item.rabatOverride !== undefined && item.rabatOverride !== '';
        return `
      <tr data-mapei-row="${item.id}">
        <td style="font-size:0.8rem">
          <strong style="display:block">${escHtml(item.nazev)}</strong>
          <span style="font-size:0.72rem;color:var(--c-ink3);font-family:monospace">${escHtml(item.kod || '')}</span>
        </td>
        <td style="white-space:nowrap;font-size:0.82rem">
          ${(item.cenaJednotkaSDPH || 0).toLocaleString('cs')} Kč/${escHtml(item.jednotka || '')}
        </td>
        <td style="white-space:nowrap">
          <select onchange="setMapeiRabat(${item.id}, this.value)"
            style="font-size:0.78rem;padding:0.25rem 0.35rem;border-radius:var(--r-xs);
              border:1.5px solid ${isOverride ? 'var(--c-terra)' : 'var(--c-border)'};
              background:var(--c-bg);color:var(--c-ink)">
            <option value="" ${!isOverride ? 'selected' : ''}>výchozí (${rabatDefault}%)</option>
            <option value="28" ${item.rabatOverride == 28 ? 'selected' : ''}>28 %</option>
            <option value="32" ${item.rabatOverride == 32 ? 'selected' : ''}>32 %</option>
          </select>
        </td>
        <td style="white-space:nowrap;font-size:0.82rem;font-weight:600;color:var(--c-green)">
          ${nakupni.toLocaleString('cs', {maximumFractionDigits:2})} Kč
        </td>
        <td style="font-size:0.75rem;color:var(--c-ink3)">bal. ${item.minObjednaci || 1}×</td>
        <td>
          <button class="btn btn-danger btn-xs" onclick="deleteMapei(${item.id})">🗑️</button>
        </td>
      </tr>`;
      }).join('');

  return `
    <div class="header-bar">
      <span class="logo">🧪</span>
      <div style="flex:1">
        <h1>Ceník Mapei</h1>
        <div class="subtitle">${data.length} položek · rabat se počítá z ceny vč. DPH</div>
      </div>
    </div>

    <!-- Výchozí rabat -->
    <div class="card card-info">
      <div class="card-title" style="color:var(--c-blue)">💶 Můj rabat u dodavatele</div>
      <p style="font-size:0.8rem;color:var(--c-ink2);margin-bottom:0.7rem;line-height:1.5">
        Použije se u všech položek, u kterých nenastavíš výjimku ve sloupci „Rabat“ v tabulce.
      </p>
      <div class="field-row">
        <div class="field"><label>Výchozí rabat (%)</label>
          <select id="mapei_rabat_default">
            <option value="28" ${rabatDefault===28?'selected':''}>28 %</option>
            <option value="32" ${rabatDefault===32?'selected':''}>32 %</option>
          </select>
        </div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="saveMapeiRabatDefault()">💾 Uložit</button>
    </div>

    <!-- Import Excel -->
    <div class="card card-info">
      <div class="card-title" style="color:var(--c-blue)">📊 Import ceníku Mapei (.xlsx)</div>
      <p style="font-size:0.8rem;color:var(--c-ink2);margin-bottom:0.8rem;line-height:1.5">
        Nahraj soubor přesně ve formátu exportu z Mapei
        (<em>Název výrobku, Obj., Kód, Počet jednotek, Jednotka, Min. objednací množství,
        Cena za jednotku bez/vč. DPH, Cena za kus bez/vč. DPH, Cena celkem bez/vč. DPH</em>).
        První řádek je záhlaví a přeskočí se.
      </p>
      <div style="position:relative;background:var(--c-s2);border:2px dashed var(--c-border);
        border-radius:var(--r-sm);padding:1rem;text-align:center;cursor:pointer"
        onclick="document.getElementById('mapeiXlsxFile').click()">
        <span style="font-size:1.3rem">📂</span>
        <span style="font-weight:600;color:var(--c-terra);margin-left:0.5rem;font-size:0.88rem"
          id="mapeiXlsxLabel">
          Klikni pro výběr Excel souboru od Mapei
        </span>
        <input type="file" id="mapeiXlsxFile" accept=".xlsx,.xls"
          style="position:absolute;opacity:0;width:1px;height:1px;top:0;left:0"
          onchange="importMapeiExcel(this)">
      </div>
      <div id="mapeiXlsxProgress"
        style="display:none;margin-top:0.6rem;font-size:0.85rem;color:var(--c-ink2);text-align:center">
        ⏳ Načítám…
      </div>
    </div>

    <!-- Tabulka -->
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.6rem">
        <div class="card-title" style="margin:0">Položky</div>
        ${data.length > 0 ? `
          <button class="btn btn-danger btn-sm" onclick="smazatVsechnyMapei()">
            🗑️ Smazat vše
          </button>` : ''}
      </div>
      ${data.length > 5 ? `
        <div style="display:flex;gap:0.4rem;align-items:center;margin-bottom:0.4rem">
          <input id="mapeiSearch" placeholder="🔍 Hledat podle názvu nebo kódu…"
            oninput="filterMapei(this.value)"
            style="flex:1;padding:0.52rem 0.8rem;border:1.5px solid var(--c-border);
              border-radius:var(--r-sm);font-family:var(--f-body);font-size:0.88rem;
              background:var(--c-bg);color:var(--c-ink)">
          <span id="mapeiFilterCount"
            style="font-size:0.76rem;color:var(--c-terra);font-weight:600;white-space:nowrap"></span>
        </div>
        <div class="field-row" style="margin-bottom:0.6rem">
          <div class="field" style="flex:1">
            <label style="font-size:0.72rem">Hromadně nastavit rabat pro zobrazené (vyfiltrované) položky</label>
            <div style="display:flex;gap:0.4rem">
              <select id="mapeiBulkRabat" style="flex:1">
                <option value="">výchozí</option>
                <option value="28">28 %</option>
                <option value="32">32 %</option>
              </select>
              <button class="btn btn-secondary btn-sm" onclick="bulkSetMapeiRabat()">Nastavit</button>
            </div>
          </div>
        </div>` : ''}
      <div style="overflow-x:auto">
        <table id="mapeiTable">
          <thead>
            <tr>
              <th>Výrobek</th>
              <th>Cena/jedn. vč. DPH</th>
              <th>Rabat</th>
              <th>Moje nákup. cena</th>
              <th>Balení</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    </div>
  `;
}

// ── Import ────────────────────────────────────────────────
async function importMapeiExcel(input) {
  const file = input.files[0];
  if (!file) return;
  document.getElementById('mapeiXlsxLabel').textContent = file.name;
  document.getElementById('mapeiXlsxProgress').style.display = 'block';

  if (!window.XLSX) {
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  const buf  = await file.arrayBuffer();
  const wb   = XLSX.read(buf, { type: 'array' });
  const ws   = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

  const num = (x) => {
    const n = parseFloat(String(x ?? '0').replace(',', '.'));
    return isNaN(n) ? 0 : n;
  };

  // Přesné pořadí sloupců z exportu Mapei (cenik-do-tisku):
  // 0 Název výrobku, 1 Obj., 2 Kód, 3 Počet jednotek, 4 Jednotka,
  // 5 Min. objednací množství, 6 Cena/jedn. bez DPH, 7 Cena/jedn. vč. DPH,
  // 8 Cena/kus bez DPH, 9 Cena/kus vč. DPH, 10 Cena celkem bez DPH, 11 Cena celkem vč. DPH
  const items = [];
  let chyby = 0;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] || [];
    const nazev = (r[0] ?? '').toString().trim();
    if (!nazev) continue;
    const cenaJednotkaSDPH = num(r[7]);
    if (!cenaJednotkaSDPH) { chyby++; continue; }
    items.push({
      nazev,
      kod:                 (r[2] ?? '').toString().trim(),
      pocetJednotek:        num(r[3]) || 1,
      jednotka:             (r[4] ?? '').toString().trim() || 'ks',
      minObjednaci:          num(r[5]) || 1,
      cenaJednotkaBezDPH:    num(r[6]),
      cenaJednotkaSDPH,
      cenaKusBezDPH:         num(r[8]),
      cenaKusSDPH:           num(r[9]),
      cenaCelkemBezDPH:      num(r[10]),
      cenaCelkemSDPH:        num(r[11]),
      rabatOverride:         null,
    });
  }

  document.getElementById('mapeiXlsxProgress').style.display = 'none';
  if (items.length > 0) {
    await dbBulkInsert('mapei', items);
    toast(`✓ Naimportováno ${items.length} položek z Mapei ceníku${chyby ? ', ' + chyby + ' přeskočeno' : ''}`);
    await render();
  } else {
    toast('Žádné platné řádky — zkontroluj, že je to export "cenik-do-tisku"', 'err');
  }
  input.value = '';
}

// ── Rabat per položka ─────────────────────────────────────
async function setMapeiRabat(id, val) {
  const item = await dbGet('mapei', id);
  if (!item) return;
  item.rabatOverride = val === '' ? null : parseFloat(val);
  await dbPut('mapei', item);
  await render();
}

async function bulkSetMapeiRabat() {
  const val  = v('mapeiBulkRabat');
  const rows = document.querySelectorAll('#mapeiTable tbody tr[data-mapei-row]');
  let count = 0;
  for (const row of rows) {
    if (row.style.display === 'none') continue;
    const id = parseInt(row.dataset.mapeiRow);
    const item = await dbGet('mapei', id);
    if (!item) continue;
    item.rabatOverride = val === '' ? null : parseFloat(val);
    await dbPut('mapei', item);
    count++;
  }
  toast(`Rabat nastaven u ${count} zobrazených položek ✓`);
  await render();
}

// ── Filtr / mazání ─────────────────────────────────────────
function filterMapei(query) {
  const q    = query.toLowerCase().trim();
  const rows = document.querySelectorAll('#mapeiTable tbody tr');
  let visible = 0;
  rows.forEach(row => {
    const match = !q || row.textContent.toLowerCase().includes(q);
    row.style.display = match ? '' : 'none';
    if (match) visible++;
  });
  const el = document.getElementById('mapeiFilterCount');
  if (el) el.textContent = q ? `${visible} / ${rows.length}` : '';
}

async function smazatVsechnyMapei() {
  if (!confirm('Smazat CELÝ Mapei ceník?')) return;
  const vse = await dbGetAll('mapei');
  for (const m of vse) await dbDelete('mapei', m.id);
  toast('Mapei ceník vymazán');
  await render();
}

async function deleteMapei(id) {
  if (!confirm('Smazat položku?')) return;
  await dbDelete('mapei', id);
  toast('Smazáno');
  await render();
}

// ── Pro další moduly (výběr do nabídky, viz další krok) ────
// Vrátí položky se spočítanou nákupní cenou a aktuálním rabatem —
// používá se při přidávání položky do nabídky a v objednávkovém formuláři.
async function getMapeiSOcenenim() {
  const [data, rabatDefault] = await Promise.all([
    dbGetAll('mapei'), loadMapeiRabatDefault()
  ]);
  return data.map(item => ({
    ...item,
    rabatEfektivni: mapeiEfektivniRabat(item, rabatDefault),
    nakupniCenaJednotka: mapeiNakupniCenaJednotka(item, rabatDefault),
  }));
}
