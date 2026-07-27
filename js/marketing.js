// ═══ marketing.js — JL-OBKLADY CN v4 ═══
function pageMarketing() {
  return `
    <div class="header-bar">
      <button onclick="navigate('dashboard')"
        style="background:none;border:none;font-size:1.3rem;cursor:pointer;
          color:white;padding:0.2rem">←</button>
      <div>
        <h1>Marketing</h1>
        <div class="subtitle">Texty pro sociální sítě</div>
      </div>
    </div>

    <!-- AI popis z fotky -->
    <div class="card" style="border:2px solid #7c3aed">
      <div class="card-title" style="color:#7c3aed">🤖 AI popis z fotky realizace</div>
      <p style="font-size:0.82rem;color:#6b21a8;margin-bottom:0.8rem;line-height:1.5">
        Nahraj fotku → Claude AI automaticky popíše realizaci → vygeneruje příspěvek pro sítě.
      </p>

      <div style="position:relative;background:var(--c-s2);border:2px dashed #c4b5fd;
        border-radius:var(--r-sm);padding:1rem;text-align:center;cursor:pointer;
        margin-bottom:0.6rem"
        onclick="document.getElementById('aiPhotoInput').click()">
        <div id="ai-photo-preview-wrap" style="display:none;margin-bottom:0.5rem">
          <img id="ai-photo-preview"
            style="max-width:100%;max-height:180px;border-radius:var(--r-xs);object-fit:contain">
        </div>
        <span style="font-size:1.4rem">📷</span>
        <span style="font-weight:600;color:#7c3aed;margin-left:0.5rem;font-size:0.88rem"
          id="ai-photo-label">Vybrat fotku realizace</span>
        <input type="file" id="aiPhotoInput" accept="image/*"
          style="position:absolute;opacity:0;width:1px;height:1px"
          onchange="aiPopisFotky(this)">
      </div>

      <div class="field">
        <label>Typ příspěvku</label>
        <select id="ai_mark_typ">
          <option value="realizace">📸 Hotová realizace</option>
          <option value="postup">🔨 Průběh prací</option>
          <option value="detail">🔍 Detail & řemeslo</option>
          <option value="poptavka">📬 Výzva k poptávce</option>
        </select>
      </div>

      <div id="ai-loading"
        style="display:none;text-align:center;padding:0.8rem;color:#7c3aed;font-weight:600">
        <div class="spinner" style="margin:0 auto 0.5rem;border-top-color:#7c3aed"></div>
        Claude analyzuje fotku…
      </div>

      <div id="ai-result" style="display:none">
        <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;
          letter-spacing:0.08em;color:#7c3aed;margin-bottom:0.4rem">
          AI popis & příspěvek:
        </div>
        <div id="ai-result-text"
          style="background:var(--c-surface);border-radius:var(--r-sm);padding:0.9rem;
            font-size:0.88rem;line-height:1.6;white-space:pre-wrap;
            border:1px solid #e9d5ff;margin-bottom:0.6rem;color:var(--c-ink)">
        </div>
        <div style="display:flex;gap:0.5rem">
          <button class="btn btn-full"
            onclick="kopirovatAIMarketing()"
            style="flex:1;background:#7c3aed;color:white;border:none">
            📋 Kopírovat
          </button>
          <button class="btn btn-secondary" onclick="vložitDoGenetatoru()" style="flex:1">
            ➕ Upravit ručně
          </button>
        </div>
      </div>
    </div>

    <!-- Generátor příspěvků -->
    <div class="card">
      <div class="card-title">📢 Generátor příspěvků pro FB / IG / TikTok</div>
      <p style="font-size:0.82rem;color:var(--c-ink2);margin-bottom:0.8rem;line-height:1.5">
        Zadej co jsi dělal — systém vygeneruje autentický příspěvek optimalizovaný
        pro organický dosah.
      </p>
      <div class="field">
        <label>Co jsi na zakázce dělal?</label>
        <textarea id="mark_input" rows="4"
          placeholder="Pokládka velkoformátu 120x60, kamenický roh (jolly), čisté spáry…">
        </textarea>
      </div>
      <div class="field">
        <label>Typ příspěvku</label>
        <select id="mark_typ">
          <option value="realizace">📸 Hotová realizace</option>
          <option value="postup">🔨 Průběh prací</option>
          <option value="detail">🔍 Detail & řemeslo</option>
          <option value="poptavka">📬 Výzva k poptávce</option>
        </select>
      </div>
      <button class="btn btn-primary btn-full" onclick="generujMarketing()">
        ✨ Vygenerovat příspěvek
      </button>
    </div>

    <div id="mark_result" style="display:none">
      <div class="card" style="border:2px solid #8b5cf6">
        <div class="card-title" style="color:#7c3aed">📋 Příspěvek připravený ke zkopírování</div>
        <div id="mark_text"
          style="background:var(--c-s2);border-radius:var(--r-sm);padding:1rem;
            font-size:0.9rem;line-height:1.6;white-space:pre-wrap;margin-bottom:0.8rem;
            color:var(--c-ink)">
        </div>
        <div style="display:flex;gap:0.5rem">
          <button class="btn btn-primary" onclick="kopirovatMarketing()" style="flex:1">
            📋 Kopírovat
          </button>
          <button class="btn btn-secondary" onclick="generujMarketing()" style="flex:1">
            🔄 Nový
          </button>
        </div>
      </div>
    </div>

    <div style="height:5rem"></div>
  `;
}

// ── Generátor ─────────────────────────────────────────────
function generujMarketing() {
  const popis = document.getElementById('mark_input')?.value?.trim();
  if (!popis) { toast('Napiš nejprve popis práce', 'err'); return; }
  const typ = document.getElementById('mark_typ')?.value || 'realizace';

  const sablony = {
    realizace: `Precizní řemeslo mluví samo za sebe. Máme hotovo! ✅

${popis}

U každé realizace si zakládáme na čistých liniích, milimetrové přesnosti a správných technologických postupech. Žádné odfláknuté spáry, žádné dutiny pod dlažbou.

Plánujete rekonstrukci koupelny nebo pokládku dlažby? Aktuálně přijímáme poptávky na příští sezónu.
📬 Napište nám do zpráv — rádi připravíme nezávaznou cenovou nabídku.

Tým JL-OBKLADY 🏗️

#jlobklady #obkladac #koupelna #rekonstrukce #velkoformat #remeslo #dlazba #stavba #obklady #pokládka`,

    postup: `Zákulisí řemesla — jak to u nás vypadá v průběhu práce 👷

${popis}

Každá fáze musí být provedena správně, protože na tom závisí výsledek. Příprava podkladu, hydroizolace, správná konzistence lepidla — to jsou věci, které zákazník nevidí, ale díky nim výsledek vydrží desítky let.

Tým JL-OBKLADY 🏗️

#jlobklady #obkladac #stavba #remeslo #postup #pokládka #hydroizolace`,

    detail: `Tento detail říká vše 🔍

${popis}

V detailu se pozná skutečný řemeslník. Kamenický roh místo lišty, milimetrové spáry, dokonale rovná plocha. To není náhoda — to je výsledek zkušeností a precizní práce.

Tým JL-OBKLADY 🏗️

#jlobklady #obkladac #detail #kamenickyroh #jolly #remeslo #koupelna`,

    poptavka: `Právě dokončujeme realizaci a v dalším měsíci otevíráme kapacity pro nové zakázky 📅

${popis}

Jsme specializovaní obkladači s důrazem na precizní provedení. Pracujeme s certifikovanými systémy, dodržujeme technologické postupy a po sobě uklidíme.

Pokud plánujete:
✅ Rekonstrukci koupelny
✅ Pokládku dlažby
✅ Obklady v interiéru nebo exteriéru

📬 Napište nám — bezplatná konzultace a cenová nabídka do 48 hodin.

Tým JL-OBKLADY 🏗️

#jlobklady #obkladac #poptavka #rekonstrukce #koupelna #dlazba`,
  };

  const text = sablony[typ] || sablony.realizace;
  document.getElementById('mark_text').textContent    = text;
  document.getElementById('mark_result').style.display = 'block';
  document.getElementById('mark_result').scrollIntoView({ behavior: 'smooth', block: 'start' });
  toast('Příspěvek vygenerován ✓');
}

function kopirovatMarketing() {
  const text = document.getElementById('mark_text')?.textContent;
  if (!text) return;
  navigator.clipboard.writeText(text)
    .then(() => toast('Zkopírováno do schránky ✓'))
    .catch(() => toast('Zkopíruj ručně ze schránky', 'err'));
}

// ── AI popis z fotky — Claude Vision ─────────────────────
let _aiPhotoBase64  = null;
let _aiPhotoMimeType = 'image/jpeg';

async function aiPopisFotky(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    _aiPhotoBase64   = e.target.result.split(',')[1];
    _aiPhotoMimeType = file.type && ['image/jpeg','image/png','image/gif','image/webp'].includes(file.type)
      ? file.type : 'image/jpeg';

    const preview = document.getElementById('ai-photo-preview');
    const wrap    = document.getElementById('ai-photo-preview-wrap');
    const label   = document.getElementById('ai-photo-label');
    if (preview) preview.src = e.target.result;
    if (wrap)    wrap.style.display = 'block';
    if (label)   label.textContent  = file.name;
    _runAIFotoAnalyza();
  };
  reader.onerror = () => toast('Chyba čtení souboru', 'err');
  reader.readAsDataURL(file);
}

async function _runAIFotoAnalyza() {
  if (!_aiPhotoBase64) return;
  const loadEl   = document.getElementById('ai-loading');
  const resultEl = document.getElementById('ai-result');
  const textEl   = document.getElementById('ai-result-text');
  if (loadEl)   loadEl.style.display   = 'block';
  if (resultEl) resultEl.style.display = 'none';

  const typ = document.getElementById('ai_mark_typ')?.value || 'realizace';
  const typPokyny = {
    realizace: 'Hotová realizace — důraz na výsledek, preciznost, estetiku.',
    postup:    'Průběh prací — zákulisí řemesla, příprava, technologie.',
    detail:    'Detail & řemeslo — jeden konkrétní detail, spára, roh, materiál.',
    poptavka:  'Výzva k poptávce — výsledek inspiruje, CTA na konci.',
  };

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            {
              type:   'image',
              source: { type: 'base64', media_type: _aiPhotoMimeType, data: _aiPhotoBase64 },
            },
            {
              type: 'text',
              text: `Jsi expert na marketing pro řemeslníky, obkladače, stavební firmy.
Analyzuj tuto fotku realizace obkladů/dlažby a vytvoř příspěvek pro sociální sítě (Facebook/Instagram).

Typ příspěvku: ${typPokyny[typ]}

Postup:
1. Krátce popiš co vidíš na fotce (materiál, formát, vzor, prostředí)
2. Napiš příspěvek v češtině — autentický, bez klišé, jako by psal zkušený řemeslník
3. Délka: 150–250 slov
4. Na konci přidej relevantní české hashtagy (8–12 kusů)
5. NEPOUŽÍVEJ: "jsme hrdí", "s láskou", "váš spokojený zákazník"

Vrať POUZE finální text příspěvku, bez úvodu nebo vysvětlování.`,
            },
          ],
        }],
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const text = data?.content?.filter(c => c.type === 'text').map(c => c.text).join('') || '';
    if (!text) throw new Error('Prázdná odpověď od AI');

    if (textEl)   textEl.textContent    = text;
    if (resultEl) resultEl.style.display = 'block';
    toast('✓ AI příspěvek vygenerován');
  } catch (e) {
    toast('Chyba AI: ' + (e.message || 'Zkontroluj připojení'), 'err');
  } finally {
    if (loadEl) loadEl.style.display = 'none';
  }
}

function kopirovatAIMarketing() {
  const text = document.getElementById('ai-result-text')?.textContent;
  if (!text) return;
  navigator.clipboard.writeText(text)
    .then(() => toast('Zkopírováno do schránky ✓'))
    .catch(() => toast('Zkopíruj ručně', 'err'));
}

function vložitDoGenetatoru() {
  const text  = document.getElementById('ai-result-text')?.textContent || '';
  const input = document.getElementById('mark_input');
  if (input) {
    input.value = text.split('\n\n')[0] || text.substring(0, 200);
    document.getElementById('mark_result')?.scrollIntoView({ behavior: 'smooth' });
    toast('Přeneseno do generátoru — uprav a vygeneruj znovu');
  }
}

// Alias
const vložitDoGeneratoru = vložitDoGenetatoru;
