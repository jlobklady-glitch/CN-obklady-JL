// ═══ rezny-plan.js — JL-OBKLADY CN v4 ═══
function pageReznyPlan() {
  return `
    <div class="header-bar">
      <button onclick="navigate('dashboard')"
        style="background:none;border:none;font-size:1.3rem;cursor:pointer;
          color:white;padding:0.2rem">←</button>
      <div>
        <h1>Řezný plán</h1>
        <div class="subtitle">Optimalizace řezání dlaždic</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">🪚 Kalkulátor spotřeby a řezného plánu</div>
      <div class="field-row">
        <div class="field">
          <label>Délka místnosti (cm)</label>
          <input type="number" id="rp_delka" placeholder="400" oninput="spocitatReznyPlan()">
        </div>
        <div class="field">
          <label>Šířka místnosti (cm)</label>
          <input type="number" id="rp_sirka" placeholder="300" oninput="spocitatReznyPlan()">
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>Délka dlaždice (cm)</label>
          <input type="number" id="rp_dl" placeholder="60" oninput="spocitatReznyPlan()">
        </div>
        <div class="field">
          <label>Šířka dlaždice (cm)</label>
          <input type="number" id="rp_dw" placeholder="60" oninput="spocitatReznyPlan()">
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>Šíře spáry (mm)</label>
          <input type="number" id="rp_spara" value="3" oninput="spocitatReznyPlan()">
        </div>
        <div class="field">
          <label>Rezerva na prořez (%)</label>
          <input type="number" id="rp_rezerva" value="10" oninput="spocitatReznyPlan()">
        </div>
      </div>
    </div>

    <div id="rp_result" style="display:none" class="card card-success">
      <div class="card-title" style="color:var(--c-green)">📊 Výsledek kalkulace</div>
      <div id="rp_boxes" class="result-box"></div>
    </div>

    <div style="height:5rem"></div>
  `;
}

function spocitatReznyPlan() {
  const delka   = parseFloat(document.getElementById('rp_delka')?.value)   || 0;
  const sirka   = parseFloat(document.getElementById('rp_sirka')?.value)   || 0;
  const dl      = parseFloat(document.getElementById('rp_dl')?.value)      || 1;
  const dw      = parseFloat(document.getElementById('rp_dw')?.value)      || 1;
  const spara   = parseFloat(document.getElementById('rp_spara')?.value    || 3) / 10;
  const rezerva = parseFloat(document.getElementById('rp_rezerva')?.value  || 10);

  if (!delka || !sirka) return;

  const plocha      = (delka * sirka) / 10000;
  const dlSparou    = dl + spara;
  const dwSparou    = dw + spara;
  const pocetX      = Math.ceil(delka / dlSparou);
  const pocetY      = Math.ceil(sirka  / dwSparou);
  const pocetCelkem = pocetX * pocetY;
  const sRezervou   = Math.ceil(pocetCelkem * (1 + rezerva / 100));
  const plochy      = dl * dw / 10000;
  const m2SRezervou = (sRezervou * plochy).toFixed(2);

  const zbytekX = ((delka % dlSparou) / dl * 100).toFixed(0);
  const zbytekY = ((sirka  % dwSparou) / dw * 100).toFixed(0);

  const lepidloKg  = Math.ceil(plocha * (1 + rezerva / 100) * 4);
  const sparovkaKg = Math.ceil(plocha * (1 + rezerva / 100) * 0.4 * 10) / 10;

  const resEl = document.getElementById('rp_result');
  const boxEl = document.getElementById('rp_boxes');
  if (!resEl || !boxEl) return;

  resEl.style.display = 'block';

  const row = (label, val, warn = false) => `
    <div class="result-row">
      <span>${label}</span>
      <span class="val" style="${warn ? 'color:var(--c-red)' : ''}">${val}</span>
    </div>`;

  boxEl.innerHTML =
    row('📐 Plocha místnosti', plocha.toFixed(2) + ' m²') +
    row('🔲 Dlaždic v řadě X', pocetX + ' ks') +
    row('🔲 Dlaždic v řadě Y', pocetY + ' ks') +
    row('✂️ Krajová dlaždice X',
      zbytekX + '% šíře' + (zbytekX < 20 ? ' (velmi úzká!)' : ''),
      zbytekX < 20) +
    row('✂️ Krajová dlaždice Y',
      zbytekY + '% šíře' + (zbytekY < 20 ? ' (velmi úzká!)' : ''),
      zbytekY < 20) +
    row('📦 Celkem kusů (bez rezervy)', pocetCelkem + ' ks') +
    `<div class="result-row">
      <span>📦 Celkem kusů (+${rezerva}% rezerva)</span>
      <span class="val" style="font-family:var(--f-display);font-size:1.05rem">
        ${sRezervou} ks = ${m2SRezervou} m²
      </span>
    </div>` +
    row('🧱 Lepidlo (4 kg/m²)', `${lepidloKg} kg ≈ ${Math.ceil(lepidloKg / 25)} × 25 kg pytel`) +
    row('🧴 Spárovačka (0.4 kg/m²)', sparovkaKg + ' kg');
}
