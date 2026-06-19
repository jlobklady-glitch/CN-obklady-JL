// ═══ pracovnici.js — JL-OBKLADY CN v4 ═══
async function pagePracovnici() {
  const pracovnici = await dbGetAll('pracovnici');
  const editId     = state.editPracovnikId || null;
  const editP      = editId ? pracovnici.find(p => p.id === editId) : null;

  const formHtml = `
    <div class="card card-accent">
      <div class="card-title">${editP ? '✏️ Upravit pracovníka' : '➕ Přidat pracovníka'}</div>
      <div class="field">
        <label>Jméno</label>
        <input id="prac_jmeno" placeholder="Honza Novák"
          value="${editP ? escHtml(editP.jmeno) : ''}">
      </div>
      <div class="field-row">
        <div class="field">
          <label>Hodinová sazba (Kč)</label>
          <input type="number" id="prac_sazba" placeholder="350"
            value="${editP ? editP.sazba : '350'}">
        </div>
        <div class="field">
          <label>Barva v kalendáři</label>
          <input type="color" id="prac_barva"
            value="${editP ? editP.barva : WORKER_COLORS[pracovnici.length % WORKER_COLORS.length]}"
            style="width:100%;height:2.8rem;border-radius:var(--r-sm);
              border:1.5px solid var(--c-border);cursor:pointer;padding:0.2rem">
        </div>
      </div>
      <div class="field-row" style="gap:0.5rem;margin-top:0.3rem">
        <button class="btn btn-primary" style="flex:1"
          onclick="savePracovnik(${editId || 'null'})">
          ${editP ? '💾 Uložit' : '➕ Přidat'}
        </button>
        ${editP ? `<button class="btn btn-secondary" onclick="navigate('pracovnici')">Zrušit</button>` : ''}
      </div>
    </div>`;

  const listHtml = pracovnici.length === 0 ? `
    <div class="card">
      <div class="empty">
        <span class="icon">👷</span>
        <p>Zatím žádní pracovníci. Přidej prvního výše.</p>
      </div>
    </div>` :
    pracovnici.map(p => `
    <div class="card" style="border-left:4px solid ${p.barva || '#3b82f6'}">
      <div style="display:flex;align-items:center;gap:0.8rem">
        <div style="width:2.8rem;height:2.8rem;border-radius:50%;
          background:${p.barva || '#3b82f6'};
          display:flex;align-items:center;justify-content:center;
          font-size:1.2rem;flex-shrink:0;
          box-shadow:0 3px 10px ${p.barva || '#3b82f6'}44">👷</div>
        <div style="flex:1">
          <div style="font-weight:700;font-size:1rem">${escHtml(p.jmeno)}</div>
          <div style="font-size:0.8rem;color:var(--c-ink2)">${p.sazba} Kč/hod</div>
        </div>
        <div style="display:flex;gap:0.4rem">
          <button class="btn btn-secondary btn-sm"
            onclick="navigate('pracovnici',{editPracovnikId:${p.id}})">✏️</button>
          <button class="btn btn-danger btn-sm"
            onclick="deletePracovnik(${p.id})">🗑️</button>
        </div>
      </div>
      <div style="margin-top:0.7rem;display:flex;gap:0.4rem;flex-wrap:wrap">
        <button class="btn btn-secondary btn-sm"
          onclick="navigate('kalendar',{filterPracovnikId:${p.id}})">
          📅 Kalendář
        </button>
        <button class="btn btn-secondary btn-sm"
          onclick="navigate('vyplaty',{pracovnikId:${p.id}})">
          💰 Výplata
        </button>
        <button class="btn btn-secondary btn-sm"
          onclick="printVyplatniPasku(${p.id})">
          🖨️ Páska
        </button>
      </div>
    </div>`).join('');

  return `
    <div class="header-bar">
      <span class="logo">👷</span>
      <div><h1>Pracovníci</h1><div class="subtitle">Tým & hodinové sazby</div></div>
    </div>
    ${formHtml}
    ${listHtml}
    <div style="height:5rem"></div>`;
}

async function savePracovnik(editId) {
  const jmeno = document.getElementById('prac_jmeno')?.value?.trim();
  const sazba = parseFloat(document.getElementById('prac_sazba')?.value) || 350;
  const barva = document.getElementById('prac_barva')?.value || '#3b82f6';
  if (!jmeno) { toast('Zadej jméno pracovníka', 'err'); return; }
  const rec = { jmeno, sazba, barva };
  if (editId) rec.id = editId;
  await dbPut('pracovnici', rec);
  toast(editId ? 'Pracovník upraven ✓' : 'Pracovník přidán ✓');
  await navigate('pracovnici');
}

async function deletePracovnik(id) {
  if (!confirm('Smazat pracovníka? Záznamy hodin zůstanou.')) return;
  await dbDelete('pracovnici', id);
  toast('Pracovník smazán');
  await navigate('pracovnici');
}

function vypocitatHodiny(od, do_) {
  if (!od || !do_) return 0;
  const [oh, om] = od.split(':').map(Number);
  const [dh, dm] = do_.split(':').map(Number);
  return Math.max(0, Math.round(((dh * 60 + dm) - (oh * 60 + om)) / 6) / 10);
}

async function saveHodiny(editId) {
  const pracovnikId = parseInt(document.getElementById('hod_pracovnik')?.value);
  const nabidkaId   = parseInt(document.getElementById('hod_nabidka')?.value) || null;
  const datum       = document.getElementById('hod_datum')?.value;
  const od          = document.getElementById('hod_od')?.value;
  const do_         = document.getElementById('hod_do')?.value;
  const poznamka    = document.getElementById('hod_poznamka')?.value?.trim() || '';

  if (!pracovnikId || !datum || !od || !do_) {
    toast('Vyplň všechna povinná pole', 'err'); return;
  }
  const hodiny = vypocitatHodiny(od, do_);
  if (hodiny <= 0) { toast('Konec musí být po začátku', 'err'); return; }

  const [pracovnici, nabidky] = await Promise.all([
    dbGetAll('pracovnici'), dbGetAll('nabidky')
  ]);
  const p = pracovnici.find(x => x.id === pracovnikId);
  const n = nabidky.find(x => x.id === nabidkaId);

  const rec = {
    pracovnikId,
    pracovnikJmeno: p?.jmeno    || '?',
    pracovnikBarva: p?.barva    || '#3b82f6',
    nabidkaId:      nabidkaId   || null,
    nabidkaNazev:   n?.nazev    || null,
    datum, od, do: do_, hodiny, poznamka,
  };
  if (editId) rec.id = editId;

  await dbPut('hodiny', rec);
  toast(`Uloženo: ${hodiny}h`);
  zavritModalHodiny();
  await render();
}

async function deleteHodiny(id) {
  await dbDelete('hodiny', id);
  toast('Záznam smazán');
  await render();
}

// ── Konstanty ────────────────────────────────────────────
let kalState = {
  rok:       new Date().getFullYear(),
  mesic:     new Date().getMonth(),
  vybranyDen: null,
};
const MESICE_CS = [
  'Leden','Únor','Březen','Duben','Květen','Červen',
  'Červenec','Srpen','Září','Říjen','Listopad','Prosinec',
];
const DNY_CS      = ['Po','Út','St','Čt','Pá','So','Ne'];
const WORKER_COLORS = [
  '#3b82f6','#10b981','#f59e0b','#ef4444',
  '#8b5cf6','#06b6d4','#f97316',
];
