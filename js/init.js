// ═══ init.js — JL-OBKLADY CN v4 ═══

// ── Hodiny CSV export ─────────────────────────────────────
async function exportHodinyCSV() {
  const hodiny = await dbGetAll('hodiny');
  if (!hodiny.length) { toast('Žádné hodiny k exportu', 'err'); return; }
  const rows = ['Pracovník;Datum;Od;Do;Hodiny;Zakázka;Poznámka'];
  hodiny.sort((a, b) => (a.datum > b.datum ? 1 : -1)).forEach(h => {
    rows.push([
      h.pracovnikJmeno || '',
      h.datum          || '',
      h.od             || '',
      h.do             || '',
      h.hodiny         || '',
      h.nabidkaNazev   || '',
      (h.poznamka || '').replace(/;/g, ','),
    ].join(';'));
  });
  const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'hodiny-' + new Date().toISOString().slice(0, 7) + '.csv';
  a.click();
  toast('CSV staženo ✓');
}

// ── Výplatní páska ────────────────────────────────────────
async function printVyplatniPasku(pracovnikId) {
  const [pracovnici, hodiny] = await Promise.all([
    dbGetAll('pracovnici'), dbGetAll('hodiny')
  ]);
  const p = pracovnici.find(x => x.id === pracovnikId);
  if (!p) return;
  const mesic   = new Date().toISOString().slice(0, 7);
  const hMesic  = hodiny.filter(h => h.pracovnikId === pracovnikId && h.datum?.startsWith(mesic));
  const celkH   = hMesic.reduce((s, h) => s + h.hodiny, 0);
  const castka  = celkH * (p.sazba || 0);

  // Rozpad po zakázkách
  const zakazky = {};
  hMesic.forEach(h => {
    const k = h.nabidkaNazev || 'Bez zakázky';
    if (!zakazky[k]) zakazky[k] = 0;
    zakazky[k] += h.hodiny;
  });
  const zakazkyRows = Object.entries(zakazky).map(([n, h]) =>
    `<div class="row"><span>${n}</span><strong>${h} h</strong></div>`
  ).join('');

  const win = window.open('', '_blank');
  if (!win) { toast('Povol pop-up okna', 'err'); return; }
  win.document.write(`<!DOCTYPE html>
<html lang="cs"><head><meta charset="UTF-8">
<title>Výplatní páska — ${p.jmeno}</title>
<style>
  body { font-family: 'Outfit', Arial, sans-serif; padding: 20mm; max-width: 180mm; margin: 0 auto; color: #16140F; }
  h1 { font-size: 20pt; margin-bottom: 2mm; color: #C8502A; }
  h2 { font-size: 11pt; color: #5C564E; font-weight: 500; margin-bottom: 8mm; }
  .row { display: flex; justify-content: space-between; padding: 3mm 0; border-bottom: 1px solid #EAE6DF; font-size: 11pt; }
  .total { font-size: 15pt; font-weight: 800; color: #C8502A; border-top: 2px solid #C8502A; border-bottom: none; padding-top: 4mm; margin-top: 2mm; }
  .section { margin-top: 6mm; margin-bottom: 4mm; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.1em; color: #968E84; }
  .footer { margin-top: 15mm; font-size: 8pt; color: #968E84; }
  @media print { body { padding: 10mm; } }
</style></head><body>
  <h1>Výplatní páska</h1>
  <h2>${p.jmeno} · ${mesic}</h2>
  <div class="row"><span>Hodinová sazba</span><strong>${p.sazba} Kč/h</strong></div>
  <div class="row"><span>Odpracováno celkem</span><strong>${celkH} h</strong></div>
  ${zakazkyRows ? `<div class="section">Rozpad po zakázkách</div>${zakazkyRows}` : ''}
  <div class="row total"><span>K VÝPLATĚ</span><strong>${castka.toLocaleString('cs')} Kč</strong></div>
  <div class="footer">
    Vygenerováno: ${new Date().toLocaleDateString('cs-CZ')} · JL-OBKLADY CN<br>
    Tato páska slouží jako interní doklad, není daňovým dokladem.
  </div>
</body></html>`);
  win.document.close();
  setTimeout(() => { win.focus(); win.print(); }, 350);
}

// ── Hromadná změna cen prací ──────────────────────────────
async function hromadnaZmenaCen(procenta) {
  if (isNaN(procenta)) { toast('Zadej platné procento', 'err'); return; }
  const items = await dbGetAll('prace');
  let count = 0;
  for (const item of items) {
    if (item.cena     > 0) item.cena     = Math.round(item.cena     * (1 + procenta / 100));
    if (item.hodSazba > 0) item.hodSazba = Math.round(item.hodSazba * (1 + procenta / 100));
    await dbPut('prace', item);
    count++;
  }
  toast(`✓ Upraveno ${count} položek o ${procenta > 0 ? '+' : ''}${procenta} %`);
  await render();
}

// ── Číslování nabídek ─────────────────────────────────────
async function generujCisloNabidky() {
  const rok     = new Date().getFullYear();
  const vsechny = await dbGetAll('nabidky');
  const letos   = vsechny.filter(n => n.datum?.startsWith(rok.toString()));
  const max     = letos.reduce((m, n) => {
    const parts = (n.cisloNabidky || '').split('-');
    return Math.max(m, parseInt(parts[2]) || 0);
  }, 0);
  return `N-${rok}-${String(max + 1).padStart(4, '0')}`;
}

function formatCisloNabidky(n) {
  if (n.cisloNabidky) return n.cisloNabidky;
  return `N-${String(n.id || 1).padStart(4, '0')}`;
}

async function vytvorRevizi(nabidkaId) {
  const n = await dbGet('nabidky', nabidkaId);
  if (!n) return;
  const revize   = (n.revize || 1) + 1;
  const { id: _, komunikace: __, podpis: ___, schvalenoKym: ____, ...rest } = n;
  const noveCislo = await generujCisloNabidky();
  const newId = await dbPut('nabidky', {
    ...rest,
    cisloNabidky: noveCislo, revize,
    revizeZ:      nabidkaId,
    stav:         'nabidka',
    datum:        new Date().toISOString().slice(0, 10),
    komunikace: [{
      id:    'k' + Date.now(),
      typ:   'vytvoreno',
      text:  `Revize ${revize} z ${formatCisloNabidky(n)}`,
      datum: new Date().toLocaleDateString('cs-CZ'),
      cas:   new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }),
      iso:   new Date().toISOString(),
    }],
  });
  toast(`Revize ${revize} vytvořena ✓`);
  await navigate('nabidkaDetail', { editId: newId });
}

// ── Import zákazníků z CSV ────────────────────────────────
async function importZakaznici(input) {
  const file = input.files[0];
  if (!file) return;
  const text = await file.text();
  const rows = text.split('\n').filter(r => r.trim());
  let count = 0;
  for (const row of rows.slice(1)) {
    const sep  = row.includes(';') ? ';' : ',';
    const cols = row.split(sep).map(c => c.trim().replace(/^"|"$/g, ''));
    const [jmeno, tel, email, adresa] = cols;
    if (jmeno) {
      await dbPut('zakaznici', { jmeno, tel: tel || '', email: email || '', adresa: adresa || '' });
      count++;
    }
  }
  toast(`✓ Importováno ${count} zákazníků`);
  input.value = '';
  await render();
}

// ── Service Worker registrace (PWA) ──────────────────────
async function _registerSW() {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('./sw.js', { scope: './' });
  } catch (e) {
    // SW není povinný — ignoruj chybu
  }
}

// ── Startup check — migrace dat ──────────────────────────
async function _checkDataMigration() {
  // Zkontroluj verzi dat v nastavení
  try {
    const ver = await dbGet('nastaveni', 'data_version');
    if (!ver) {
      await dbPut('nastaveni', { klic: 'data_version', hodnota: '4' });
    }
  } catch (e) {
    // Ignoruj — DB může být nová
  }
}

// ── Globální error handler ────────────────────────────────
window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
  // Netišíme uživatele pro každou chybu — jen logujeme
});

window.addEventListener('error', (e) => {
  console.error('Global error:', e.message, e.filename, e.lineno);
});

// ── Přidání vyhledávání do navigace ──────────────────────
// Search se volá z header tlačítka v dashboardu
// Shortcut: "/" klávesa (definováno v search.js)

// ══════════════════════════════════════════════════════════
// INICIALIZACE APLIKACE
// ══════════════════════════════════════════════════════════
(async function init() {
  // 1. Téma — aplikuj okamžitě před renderem (eliminuje flash)
  const storedTheme = localStorage.getItem('cn_theme');
  if (storedTheme) {
    document.documentElement.setAttribute('data-theme', storedTheme);
  }

  // 2. Otevři DB
  await openDB();

  // 3. Migrace dat (async, neblokuje UI)
  _checkDataMigration().catch(console.error);

  // 4. Render hlavní stránky
  await render();

  // 5. Service Worker (neblokuje)
  _registerSW();

  // 6. Auto-save draftu při odchodu
  window.addEventListener('beforeunload', () => {
    if (state.page === 'novaNabidka') {
      try { saveDraftNabidka(); } catch (e) {}
    }
  });

  // 7. Periodické auto-save každých 30s
  setInterval(() => {
    if (state.page === 'novaNabidka') {
      try { saveDraftNabidka(); } catch (e) {}
    }
  }, 30_000);

  // 8. Online/offline banner — inicializace
  if (!navigator.onLine) {
    setTimeout(() => _updateOfflineBanner(false), 200);
  }

  // 9. Keyboard shortcut pro novou nabídku: Ctrl+N / Cmd+N
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      const tag = document.activeElement?.tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        navigate('novaNabidka');
      }
    }
  });
})();
