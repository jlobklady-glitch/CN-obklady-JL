// ═══ ceniky.js — JL-OBKLADY CN v4 ═══
async function pageCeniky() {
  const data = await dbGetAll('ceniky');

  const tableRows = data.length === 0
    ? `<tr><td colspan="5">
        <div class="empty" style="padding:1.5rem">
          <span class="icon">📦</span>
          <p>Žádné položky ceníku.</p>
        </div>
      </td></tr>`
    : data.map(item => `
      <tr>
        <td><strong style="font-size:0.8rem;font-family:monospace">${escHtml(item.kod)}</strong></td>
        <td style="font-size:0.85rem">${escHtml(item.nazev)}</td>
        <td style="white-space:nowrap;font-size:0.82rem;font-weight:600;color:var(--c-terra)">
          ${item.cena} Kč/${item.jednotka}
        </td>
        <td>
          ${item.kategorie
            ? `<span class="badge badge-blue">${escHtml(item.kategorie)}</span>`
            : ''}
        </td>
        <td>
          <button class="btn btn-danger btn-xs" onclick="deleteCenik(${item.id})">🗑️</button>
        </td>
      </tr>`).join('');

  return `
    <div class="header-bar">
      <span class="logo">📦</span>
      <div style="flex:1">
        <h1>Ceník materiálu</h1>
        <div class="subtitle">${data.length} položek</div>
      </div>
    </div>

    <!-- Přidat ručně -->
    <div class="card">
      <div class="card-title">➕ Přidat položku ručně</div>
      <div class="field-row">
        <div class="field"><label>Kód</label>
          <input id="nc_kod" placeholder="KER-001">
        </div>
        <div class="field"><label>Kategorie</label>
          <input id="nc_kat" placeholder="Keramika">
        </div>
      </div>
      <div class="field"><label>Název</label>
        <input id="nc_nazev" placeholder="Dlažba 60×60 šedá mat">
      </div>
      <div class="field-row">
        <div class="field"><label>Jednotka</label>
          <select id="nc_jed">
            <option value="m²">m²</option>
            <option value="ks">ks</option>
            <option value="bal">bal</option>
            <option value="kg">kg</option>
            <option value="bm">bm</option>
          </select>
        </div>
        <div class="field"><label>Balení (ks/bal)</label>
          <input type="number" id="nc_bal" placeholder="4" min="1">
        </div>
        <div class="field"><label>Cena / jedn. (Kč)</label>
          <input type="number" id="nc_cena" placeholder="0">
        </div>
      </div>
      <button class="btn btn-primary" onclick="saveCenik()">💾 Přidat položku</button>
    </div>

    <!-- Import Excel -->
    <div class="card card-info">
      <div class="card-title" style="color:var(--c-blue)">📊 Import z Excelu (.xlsx / .csv)</div>
      <p style="font-size:0.8rem;color:var(--c-ink2);margin-bottom:0.8rem;line-height:1.5">
        Nahraj soubor Excel nebo CSV.<br>
        <strong>Sloupce:</strong> Kód, Název, Jednotka, Balení, Cena, Kategorie
        <br>(první řádek = záhlaví, přeskočí se)
      </p>
      <div style="position:relative;background:var(--c-s2);border:2px dashed var(--c-border);
        border-radius:var(--r-sm);padding:1rem;text-align:center;cursor:pointer"
        onclick="document.getElementById('xlsxFile').click()">
        <span style="font-size:1.3rem">📂</span>
        <span style="font-weight:600;color:var(--c-terra);margin-left:0.5rem;font-size:0.88rem"
          id="xlsxLabel">
          Klikni pro výběr Excel / CSV souboru
        </span>
        <input type="file" id="xlsxFile" accept=".xlsx,.xls,.csv"
          style="position:absolute;opacity:0;width:1px;height:1px;top:0;left:0"
          onchange="importExcel(this)">
      </div>
      <div id="xlsxProgress"
        style="display:none;margin-top:0.6rem;font-size:0.85rem;color:var(--c-ink2);text-align:center">
        ⏳ Načítám…
      </div>
    </div>

    <!-- Import CSV text -->
    <div class="card">
      <div class="card-title">📋 Import — vložit CSV text</div>
      <p style="font-size:0.78rem;color:var(--c-ink2);margin-bottom:0.6rem;line-height:1.5">
        Zkopíruj řádky z Excelu nebo CSV souboru a vlož sem.<br>
        <strong>Formát:</strong> Kód, Název, Jednotka, Balení, Cena, Kategorie
      </p>
      <div class="field">
        <textarea id="csvText" rows="5"
          placeholder="KER-001, Dlažba 60x60 šedá, m², 4, 599, Keramika&#10;LEP-001, Lepidlo Flex C2, kg, 25, 18, Lepidlo"></textarea>
      </div>
      <div style="display:flex;gap:0.4rem">
        <button class="btn btn-primary" onclick="importCSVText()">📥 Importovat</button>
        <button class="btn btn-secondary btn-sm"
          onclick="document.getElementById('csvText').value=csvUkazka()">
          📄 Ukázka
        </button>
      </div>
    </div>

    <!-- Tabulka -->
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.6rem">
        <div class="card-title" style="margin:0">Položky ceníku</div>
        ${data.length > 0 ? `
          <button class="btn btn-danger btn-sm" onclick="smazatVsechnyCeniky()">
            🗑️ Smazat vše
          </button>` : ''}
      </div>
      ${data.length > 5 ? `
        <div style="display:flex;gap:0.4rem;align-items:center;margin-bottom:0.6rem">
          <input id="cenikSearch" placeholder="🔍 Hledat v ceníku…"
            oninput="filterCenik(this.value)"
            style="flex:1;padding:0.52rem 0.8rem;border:1.5px solid var(--c-border);
              border-radius:var(--r-sm);font-family:var(--f-body);font-size:0.88rem;
              background:var(--c-bg);color:var(--c-ink)">
          <span id="cenikFilterCount"
            style="font-size:0.76rem;color:var(--c-terra);font-weight:600;white-space:nowrap">
          </span>
        </div>` : ''}
      <div style="overflow-x:auto">
        <table id="cenikTable">
          <thead>
            <tr>
              <th>Kód</th>
              <th>Název</th>
              <th>Cena</th>
              <th>Kat.</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    </div>
  `;
}

function csvUkazka() {
  return `KER-001, Dlažba 60x60 šedá mat, m², 4, 599, Keramika
KER-002, Dlažba 30x60 bílá lesk, m², 6, 449, Keramika
OBK-001, Obklad metro 10x30 bílý, m², 1, 329, Obklady
OBK-002, Mozaika 30x30 zlatá, m², 1, 890, Obklady
LEP-001, Lepidlo Flex C2 bílé, kg, 25, 18, Lepidlo
LEP-002, Lepidlo Flex C2T šedé, kg, 25, 20, Lepidlo
SPA-001, Spárovačka Mapei 2kg bílá, kg, 2, 22, Spárovačka
SPA-002, Spárovačka epoxidová, kg, 2, 85, Spárovačka`;
}

async function importCSVText() {
  const raw = document.getElementById('csvText')?.value?.trim();
  if (!raw) return toast('Vlož CSV text do pole výše', 'err');
  const rows = raw.split('\n').filter(r => r.trim());
  let count = 0, chyby = 0;
  for (const row of rows) {
    const sep  = row.includes(';') ? ';' : ',';
    const cols = row.split(sep).map(c => c.trim());
    const [kod, nazev, jednotka, baleni, cena, kategorie] = cols;
    if (nazev && cena && !isNaN(parseFloat(cena))) {
      await dbPut('ceniky', {
        kod:       kod || 'N/A',
        nazev,
        jednotka:  jednotka || 'm²',
        baleni:    parseFloat(baleni) || 1,
        cena:      parseFloat(cena),
        kategorie: kategorie || '',
      });
      count++;
    } else { chyby++; }
  }
  if (count > 0) {
    document.getElementById('csvText').value = '';
    toast(`✓ Importováno ${count} položek${chyby ? ', ' + chyby + ' přeskočeno' : ''}`);
    await render();
  } else {
    toast('Žádné platné řádky — zkontroluj formát', 'err');
  }
}

async function importExcel(input) {
  const file = input.files[0];
  if (!file) return;
  document.getElementById('xlsxLabel').textContent    = file.name;
  document.getElementById('xlsxProgress').style.display = 'block';

  if (file.name.toLowerCase().endsWith('.csv')) {
    const text = await file.text();
    document.getElementById('csvText').value = text;
    document.getElementById('xlsxProgress').style.display = 'none';
    await importCSVText();
    return;
  }

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

  let count = 0, chyby = 0;
  for (let i = 1; i < rows.length; i++) {
    const cols  = rows[i].map(c => (c === undefined || c === null) ? '' : String(c).trim());
    const [kod, nazev, jednotka, baleni, cena, kategorie] = cols;
    const cenaNum = parseFloat(String(cena || '0').replace(',', '.'));
    if (nazev && !isNaN(cenaNum) && cenaNum > 0) {
      await dbPut('ceniky', {
        kod:       kod || 'N/A',
        nazev,
        jednotka:  jednotka || 'm²',
        baleni:    parseFloat(String(baleni || '1').replace(',', '.')) || 1,
        cena:      cenaNum,
        kategorie: kategorie || '',
      });
      count++;
    } else if (nazev || cena) { chyby++; }
  }

  document.getElementById('xlsxProgress').style.display = 'none';
  if (count > 0) {
    toast(`✓ Importováno ${count} položek z Excelu${chyby ? ', ' + chyby + ' přeskočeno' : ''}`);
    await render();
  } else {
    toast('Žádné platné řádky — zkontroluj sloupce', 'err');
  }
  input.value = '';
}

async function saveCenik() {
  const item = {
    kod:       v('nc_kod')  || 'N/A',
    nazev:     v('nc_nazev'),
    jednotka:  v('nc_jed')  || 'm²',
    baleni:    parseFloat(v('nc_bal')) || 1,
    cena:      parseFloat(v('nc_cena')) || 0,
    kategorie: v('nc_kat'),
  };
  if (!item.nazev) return toast('Vyplň název položky', 'err');
  if (!item.cena)  return toast('Vyplň cenu', 'err');
  await dbPut('ceniky', item);
  toast('Položka přidána ✓');
  await render();
}

function filterCenik(query) {
  const q    = query.toLowerCase().trim();
  const rows = document.querySelectorAll('#cenikTable tbody tr');
  let visible = 0;
  rows.forEach(row => {
    const match = !q || row.textContent.toLowerCase().includes(q);
    row.style.display = match ? '' : 'none';
    if (match) visible++;
  });
  const el = document.getElementById('cenikFilterCount');
  if (el) el.textContent = q ? `${visible} / ${rows.length}` : '';
}

async function smazatVsechnyCeniky() {
  if (!confirm('Smazat CELÝ ceník?')) return;
  const vse = await dbGetAll('ceniky');
  for (const c of vse) await dbDelete('ceniky', c.id);
  toast('Ceník vymazán');
  await render();
}

async function deleteCenik(id) {
  if (!confirm('Smazat položku?')) return;
  await dbDelete('ceniky', id);
  toast('Smazáno');
  await render();
}
