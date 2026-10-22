// ═══ hlas.js — JL-OBKLADY CN ═══
// ── Stav nahrávání ───────────────────────────────────────
let _mediaRec    = null;
let _audioChunks = [];
let _audioStream = null;
let _isRecording = false;
let _recTimer    = null;
let _recSecs     = 0;

// ── Vstupní bod — tlačítko 🎤 ────────────────────────────
async function spustitHlasoveZadani() {
  const overlay = document.getElementById('overlay-hlas');
  if (!overlay) { toast('Nejprve otevři Kalendář','err'); return; }

  // Zobrazit overlay ihned
  overlay.style.display = 'flex';
  _nastavitHlasStatus('');
  _nastavitHlasTranskript('');
  _resetujHlasAnimaci();

  const api = window._whisperAPI;

  if (!api) {
    // transformers.js se nenačetlo (offline, CDN nedostupné)
    _zobrazitOfflineChybu();
    return;
  }

  if (!api.isReady) {
    // Model ještě není stažen → nabídni stažení
    _zobrazitStahovaniModelu();
    return;
  }

  // Model je ready → rovnou nahraj
  await _startNahravani();
}

// ── UI: model ještě není stažen ──────────────────────────
function _zobrazitStahovaniModelu() {
  _nastavitHlasStatus('');
  const animEl = document.getElementById('hlas-animace');
  if (animEl) { animEl.style.animation='none'; animEl.textContent='📦'; }

  const statusEl = document.getElementById('hlas-status');
  if (statusEl) statusEl.innerHTML = `
    <div style="text-align:center;max-width:300px">
      <div style="color:white;font-weight:700;font-size:1rem;margin-bottom:0.4rem">
        Hlasový model není stažen
      </div>
      <div style="color:rgba(255,255,255,0.65);font-size:0.82rem;margin-bottom:1rem">
        Whisper AI (~39 MB) — stáhne se jednou,<br>pak funguje <strong style="color:#10b981">plně offline</strong>
      </div>
      <div id="hlas-progress-wrap" style="display:none;margin-bottom:0.8rem">
        <div style="background:rgba(255,255,255,0.15);border-radius:8px;height:8px;overflow:hidden">
          <div id="hlas-progress-bar" style="height:100%;background:#10b981;width:0%;transition:width 0.3s;border-radius:8px"></div>
        </div>
        <div id="hlas-progress-txt" style="color:rgba(255,255,255,0.6);font-size:0.75rem;margin-top:0.3rem">0%</div>
      </div>
      <button id="btn-stahni-model" onclick="_stahnoutModel()"
        style="background:#10b981;color:white;border:none;border-radius:10px;
          padding:0.6rem 1.4rem;font-weight:700;font-size:0.95rem;cursor:pointer">
        ⬇️ Stáhnout model
      </button>
    </div>`;
}

async function _stahnoutModel() {
  const btn = document.getElementById('btn-stahni-model');
  if (btn) btn.disabled = true;

  const progressWrap = document.getElementById('hlas-progress-wrap');
  const progressBar  = document.getElementById('hlas-progress-bar');
  const progressTxt  = document.getElementById('hlas-progress-txt');
  if (progressWrap) progressWrap.style.display = 'block';

  const animEl = document.getElementById('hlas-animace');
  if (animEl) animEl.textContent = '⬇️';

  try {
    await window._whisperAPI.load((progressInfo) => {
      if (progressInfo.status === 'progress' && progressInfo.total) {
        const pct = Math.round((progressInfo.loaded / progressInfo.total) * 100);
        if (progressBar) progressBar.style.width = pct + '%';
        if (progressTxt) progressTxt.textContent = `${pct}% · ${progressInfo.file || ''}`;
      }
      if (progressInfo.status === 'done') {
        if (progressTxt) progressTxt.textContent = `✓ ${progressInfo.file || 'Hotovo'}`;
      }
    });

    if (animEl) { animEl.textContent='🎤'; animEl.style.animation='pulse-mic 1.5s infinite'; }
    _nastavitHlasStatus('Model stažen a uložen ✓');
    const statusEl = document.getElementById('hlas-status');
    if (statusEl) statusEl.innerHTML = `<span style="color:#10b981;font-weight:600">✓ Model připraven — teď funguje offline!</span>`;

    setTimeout(() => _startNahravani(), 800);
  } catch(e) {
    zavritHlasOverlay();
    toast('Stažení modelu selhalo: ' + e.message, 'err');
  }
}

// ── Nahrávání audia ──────────────────────────────────────
async function _startNahravani() {
  try {
    _audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  } catch(e) {
    zavritHlasOverlay();
    toast('Přístup k mikrofonu zamítnut', 'err');
    return;
  }

  _audioChunks = [];
  _isRecording = true;

  // Preferuj webm/opus, fallback na cokoliv dostupného
  const mimeType = ['audio/webm;codecs=opus','audio/webm','audio/ogg','audio/mp4']
    .find(t => MediaRecorder.isTypeSupported(t)) || '';

  _mediaRec = new MediaRecorder(_audioStream, mimeType ? { mimeType } : {});
  _mediaRec.ondataavailable = e => { if (e.data.size > 0) _audioChunks.push(e.data); };
  _mediaRec.onstop = _zpracovatAudio;
  _mediaRec.start(200);

  // UI — nahrávání
  const animEl = document.getElementById('hlas-animace');
  if (animEl) { animEl.textContent='🎤'; animEl.style.animation='pulse-mic 1.2s infinite'; }
  _nastavitHlasTranskript('Mluv teď — tap Stop až skončíš');

  // Timer + stop tlačítko
  _recSecs = 0;
  _recTimer = setInterval(() => {
    _recSecs++;
    _nastavitHlasStatus(`⏱ ${_recSecs}s · max 60s`);
    if (_recSecs >= 60) _zastavitNahravani();
  }, 1000);

  // Přepni zrušit tlačítko na Stop
  const btnZrusit = document.querySelector('#overlay-hlas button[onclick="zastavitHlas()"]');
  if (btnZrusit) {
    btnZrusit.textContent = '⏹ Stop';
    btnZrusit.onclick = _zastavitNahravani;
    btnZrusit.style.background = '#ef4444';
  }
}

function _zastavitNahravani() {
  clearInterval(_recTimer);
  _isRecording = false;
  if (_mediaRec?.state !== 'inactive') _mediaRec.stop();
  _audioStream?.getTracks().forEach(t => t.stop());

  const animEl = document.getElementById('hlas-animace');
  if (animEl) { animEl.style.animation='none'; animEl.textContent='⏳'; }
  _nastavitHlasTranskript('Přepisuji...');
  _nastavitHlasStatus('Whisper AI pracuje lokálně');
}

async function _zpracovatAudio() {
  if (_audioChunks.length === 0) { zavritHlasOverlay(); return; }

  const mimeType = _mediaRec?.mimeType || 'audio/webm';
  const blob = new Blob(_audioChunks, { type: mimeType });

  try {
    const text = await window._whisperAPI.transcribe(blob);
    if (!text) { zavritHlasOverlay(); toast('Nezachytil jsem žádný text','err'); return; }

    _nastavitHlasTranskript(`"${text}"`);
    _nastavitHlasStatus('Parsuju...');

    const [pracovnici, nabidky] = await Promise.all([dbGetAll('pracovnici'), dbGetAll('nabidky')]);
    const parsed = _parsujCzechHlas(text, pracovnici, nabidky);

    zavritHlasOverlay();
    _zobrazitHlasovyVysledek(text, parsed, pracovnici, nabidky);
  } catch(e) {
    zavritHlasOverlay();
    toast('Chyba přepisu: ' + e.message, 'err');
  }
}

// ── Pomocné UI funkce ────────────────────────────────────
function zastavitHlas() {
  clearInterval(_recTimer);
  if (_isRecording) { _mediaRec?.stop(); _audioStream?.getTracks().forEach(t=>t.stop()); _isRecording=false; }
  zavritHlasOverlay();
}
function zavritHlasOverlay()       { const o=document.getElementById('overlay-hlas'); if(o) o.style.display='none'; }
function _nastavitHlasStatus(t)     { const e=document.getElementById('hlas-status');     if(e) e.textContent=t; }
function _nastavitHlasTranskript(t) { const e=document.getElementById('hlas-transkript'); if(e) e.textContent=t; }
function _resetujHlasAnimaci()      { const e=document.getElementById('hlas-animace'); if(e){e.textContent='🎤';e.style.animation='pulse-mic 1.5s infinite';} }
function _zobrazitOfflineChybu() {
  _nastavitHlasStatus('');
  const animEl = document.getElementById('hlas-animace');
  if (animEl) { animEl.style.animation='none'; animEl.textContent='⚠️'; }
  document.getElementById('hlas-transkript').textContent = 'Načítání AI modulu selhalo. Zkontroluj internet a obnov stránku.';
}

// ═══════════════════════════════════════════════════════
//  ČESKÝ PARSER — bez internetu, čistě lokálně
// ═══════════════════════════════════════════════════════

const _CZ_CISLA = {
  'nula':0,'jedna':1,'jednu':1,'jednou':1,'jedné':1,'dvě':2,'dva':2,'dvou':2,
  'tři':3,'čtyři':4,'pět':5,'šest':6,'sedm':7,'osm':8,'devět':9,'deset':10,
  'jedenáct':11,'dvanáct':12,'třináct':13,'čtrnáct':14,'patnáct':15,
  'šestnáct':16,'sedmnáct':17,'osmnáct':18,'devatenáct':19,'dvacet':20,
  'jednadvacet':21,'dvaadvacet':22,'třiadvacet':23,
  // skloňování
  'osmé':8,'osmého':8,'deváté':9,'desáté':10,'jedenácté':11,'dvanácté':12,
  'třináctého':13,'čtrnáctého':14,'patnáctého':15,'šestnáctého':16,
  'sedmnáctého':17,'osmnáctého':18,'devatenáctého':19,'dvacátého':20,
  // skrácené
  'třináctý':13,'čtrnáctý':14,'patnáctý':15,'šestnáctý':16
};

const _CZ_MINUTY = {
  'nula':0,'pět':5,'deset':10,'patnáct':15,'dvacet':20,'pětadvacet':25,
  'třicet':30,'pětatřicet':35,'čtyřicet':40,'pětačtyřicet':45,'padesát':50,'pětapadesát':55
};

const _CZ_DNY = {
  'pondělí':1,'úterý':2,'středy':3,'středu':3,'středa':3,
  'čtvrtku':4,'čtvrtek':4,'pátek':5,'pátku':5,
  'soboty':6,'sobotu':6,'sobota':6,'neděle':0,'nedělí':0,'neděli':0
};

function _normCislo(s) {
  if (!s) return null;
  s = s.toLowerCase();
  if (_CZ_CISLA[s] !== undefined) return _CZ_CISLA[s];
  const n = parseInt(s);
  return isNaN(n) ? null : n;
}

function _fmtCas(h, min) {
  h = Math.max(0, Math.min(23, h));
  min = Math.max(0, Math.min(59, min));
  return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
}

function _parsujJedenCas(s) {
  s = s.trim().toLowerCase();

  // HH:MM nebo H:MM
  let m = s.match(/(\d{1,2}):(\d{2})/);
  if (m) return _fmtCas(+m[1], +m[2]);

  // HH.MM (ne datum — min < 60)
  m = s.match(/(\d{1,2})\.(\d{2})(?!\d)/);
  if (m && +m[2] < 60) return _fmtCas(+m[1], +m[2]);

  // "půl osmé" / "půl čtvrté" → h-1:30
  m = s.match(/půl\s+(\S+)/);
  if (m) { const h = _normCislo(m[1].replace(/[éého]/g,'')); if (h != null) return _fmtCas(h-1, 30); }

  // "čtvrt na X" → X-1:15
  m = s.match(/čtvrt\s+na\s+(\S+)/);
  if (m) { const h = _normCislo(m[1]); if (h != null) return _fmtCas(h-1, 15); }

  // "tři čtvrtě na X" → X-1:45
  m = s.match(/tři\s+čtvrtě\s+na\s+(\S+)/);
  if (m) { const h = _normCislo(m[1]); if (h != null) return _fmtCas(h-1, 45); }

  // "X hodin Y" / "X a půl"
  m = s.match(/(\S+)\s+a\s+půl/);
  if (m) { const h = _normCislo(m[1]); if (h != null) return _fmtCas(h, 30); }

  // "X hodin Y minut"
  m = s.match(/(\S+)\s+hodin[y]?\s+(\S+)/);
  if (m) { const h=_normCislo(m[1]); const min=_normCislo(m[2])??_CZ_MINUTY[m[2].toLowerCase()]??0; if(h!=null) return _fmtCas(h,min); }

  // "X třicet" / "X patnáct"
  m = s.match(/(\S+)\s+(třicet|čtyřicet|padesát|patnáct|pětadvacet|pětatřicet|pětačtyřicet)/);
  if (m) { const h=_normCislo(m[1]); const min=_CZ_MINUTY[m[2]]??0; if(h!=null) return _fmtCas(h,min); }

  // číslo samotné nebo slovní
  m = s.match(/^(\d{1,2})$/);
  if (m) return _fmtCas(+m[1], 0);
  const h = _normCislo(s);
  if (h != null) return _fmtCas(h, 0);

  return null;
}

function _parsujDatum(text) {
  const t = text.toLowerCase();
  const dnes = new Date();

  if (/dnes|dneska/.test(t)) return dnes.toISOString().slice(0,10);

  const vcera = new Date(dnes); vcera.setDate(dnes.getDate()-1);
  if (/včera/.test(t)) return vcera.toISOString().slice(0,10);

  const zitra = new Date(dnes); zitra.setDate(dnes.getDate()+1);
  if (/zítra|zítří|pozítří/.test(t)) return zitra.toISOString().slice(0,10);

  // "v pondělí/v pátek/..."
  for (const [den, dow] of Object.entries(_CZ_DNY)) {
    if (t.includes(den)) {
      const d = new Date(dnes);
      const diff = ((d.getDay() - dow) + 7) % 7 || 7;
      d.setDate(d.getDate() - diff);
      return d.toISOString().slice(0,10);
    }
  }

  // DD.M.YYYY nebo DD.M.
  let m = text.match(/(\d{1,2})\.(\d{1,2})\.?(\d{4})?/);
  if (m) {
    const y = m[3] ? +m[3] : dnes.getFullYear();
    return `${y}-${String(+m[2]).padStart(2,'0')}-${String(+m[1]).padStart(2,'0')}`;
  }

  return dnes.toISOString().slice(0,10);
}

function _parsujCzechHlas(text, pracovnici, nabidky) {
  const t = text.toLowerCase();

  // ── Pracovník — hledáme křestní jméno nebo celé jméno ──
  let pracovnikId = null, pracovnikJmeno = null;
  for (const p of pracovnici) {
    const fname = p.jmeno.toLowerCase().split(/\s+/)[0];
    if (t.includes(fname) || t.includes(p.jmeno.toLowerCase())) {
      pracovnikId  = p.id;
      pracovnikJmeno = p.jmeno;
      break;
    }
  }

  // ── Datum ──
  const datum = _parsujDatum(text);

  // ── Časy — "od X do Y" ──
  let od = null, doCas = null;

  // Vzor "od X do Y" — X a Y mohou být slovní nebo číselné výrazy
  let m = text.match(/od\s+(.{2,25?}?)\s+do\s+(.{2,25}?)(?:\s*[,.]|$)/i);
  if (m) {
    od    = _parsujJedenCas(m[1]);
    doCas = _parsujJedenCas(m[2]);
  }

  // Fallback: hledej dvě číslice/časy za sebou
  if (!od || !doCas) {
    const casPattern = /\b(\d{1,2}:\d{2}|\d{1,2})\b/g;
    const casMatches = [];
    let cm;
    while ((cm = casPattern.exec(text)) !== null) casMatches.push(cm[1]);
    if (casMatches.length >= 2) {
      od    = _parsujJedenCas(casMatches[0]);
      doCas = _parsujJedenCas(casMatches[1]);
    }
  }

  // ── Zakázka — fuzzy match slovem z názvu ──
  let nabidkaId = null;
  for (const n of [...nabidky].reverse()) {  // novější mají prioritu
    if (!n.nazev) continue;
    const slova = n.nazev.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    if (slova.some(w => t.includes(w))) { nabidkaId = n.id; break; }
  }

  // ── Poznámka — co zbyde po odebrání rozpoznaného ──
  let poznamka = text;
  if (pracovnikJmeno) poznamka = poznamka.replace(new RegExp(pracovnikJmeno.split(/\s/)[0], 'gi'), '');
  poznamka = poznamka
    .replace(/od\s+\S+(?:\s+\S+)?\s+do\s+\S+(?:\s+\S+)?/gi, '')
    .replace(/dnes|dneska|včera|zítra|zítří/gi, '')
    .replace(/v\s+(?:pondělí|úterý|středu|čtvrtek|pátek|sobotu|neděli)/gi, '')
    .replace(/\d{1,2}:\d{2}/g, '')
    .replace(/[,;]+/g, ' ')
    .replace(/\s{2,}/g, ' ').trim();

  return {
    pracovnikId, pracovnikJmeno,
    datum, od, do: doCas,
    nabidkaId, poznamka: poznamka || null
  };
}

// ── Zobrazení výsledku před uložením ─────────────────────
function _zobrazitHlasovyVysledek(transkript, parsed, pracovnici, nabidky) {
  const modal = document.getElementById('modal-hodiny');
  const inner = document.getElementById('modal-hodiny-inner');
  if (!modal || !inner) return;

  const pracOpt = pracovnici.map(p =>
    `<option value="${p.id}" ${parsed.pracovnikId===p.id?'selected':''}>${p.jmeno} (${p.sazba} Kč/h)</option>`
  ).join('');
  const nabOpt = `<option value="">— žádná zakázka —</option>` +
    nabidky.map(n =>
      `<option value="${n.id}" ${parsed.nabidkaId===n.id?'selected':''}>${n.nazev||'Nabídka #'+n.id}</option>`
    ).join('');

  const hodiny = vypocitatHodiny(parsed.od, parsed.do);

  // Ukazatel co bylo rozpoznáno
  const chips = [
    parsed.pracovnikJmeno ? `<span style="background:#dcfce7;color:#166534;border-radius:20px;padding:0.2rem 0.6rem;font-size:0.75rem">👷 ${parsed.pracovnikJmeno}</span>` : '',
    parsed.od             ? `<span style="background:#dbeafe;color:#1e40af;border-radius:20px;padding:0.2rem 0.6rem;font-size:0.75rem">⏰ ${parsed.od}–${parsed.do||'?'}</span>` : '',
    parsed.nabidkaId      ? `<span style="background:#fef9c3;color:#854d0e;border-radius:20px;padding:0.2rem 0.6rem;font-size:0.75rem">📋 zakázka</span>` : '',
  ].filter(Boolean).join('');

  inner.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.8rem">
      <div>
        <div style="font-weight:700;font-size:1rem">🎤 Hlasový záznam</div>
        <div style="font-size:0.72rem;color:var(--text2)">Zpracováno lokálně · offline</div>
      </div>
      <button onclick="zavritModalHodiny()" style="background:none;border:none;font-size:1.4rem;cursor:pointer;line-height:1">✕</button>
    </div>

    <div style="background:var(--surface2);border-radius:10px;padding:0.7rem 0.9rem;margin-bottom:0.9rem">
      <div style="font-size:0.72rem;color:var(--text2);margin-bottom:0.3rem">🎙️ Rozpoznaný text</div>
      <div style="font-size:0.88rem;font-style:italic;margin-bottom:0.5rem">"${transkript}"</div>
      <div style="display:flex;flex-wrap:wrap;gap:0.3rem">${chips || '<span style="font-size:0.75rem;color:var(--text2)">Nic nerozpoznáno — uprav ručně ↓</span>'}</div>
    </div>

    <div class="field"><label>📅 Datum</label>
      <input type="date" id="hod_datum" value="${parsed.datum||new Date().toISOString().slice(0,10)}">
    </div>
    <div class="field"><label>👷 Pracovník</label>
      <select id="hod_pracovnik">${pracovnici.length?pracOpt:'<option>Nejprve přidej pracovníky</option>'}</select>
    </div>
    <div class="field-row">
      <div class="field"><label>⏰ Od</label>
        <input type="time" id="hod_od" value="${parsed.od||'07:00'}" oninput="prepocitatHodiny()">
      </div>
      <div class="field"><label>⏰ Do</label>
        <input type="time" id="hod_do" value="${parsed.do||'15:30'}" oninput="prepocitatHodiny()">
      </div>
    </div>
    <div id="hod_vypocet" style="background:var(--surface2);border-radius:8px;padding:0.6rem;
      margin-bottom:0.8rem;font-weight:700;color:var(--accent);text-align:center;font-size:1.1rem">
      ⏱️ ${hodiny} h
    </div>
    <div class="field"><label>📋 Zakázka</label>
      <select id="hod_nabidka">${nabOpt}</select>
    </div>
    <div class="field"><label>📝 Poznámka</label>
      <input id="hod_poznamka" value="${parsed.poznamka||''}" placeholder="Popis práce...">
    </div>
    <div style="display:flex;gap:0.5rem;margin-top:0.3rem">
      <button class="btn btn-primary" style="flex:1" onclick="saveHodiny(null)">💾 Uložit</button>
      <button onclick="spustitHlasoveZadani()" style="background:linear-gradient(135deg,#ef4444,#dc2626);
        color:white;border:none;border-radius:10px;padding:0.6rem 0.9rem;font-size:1.1rem;cursor:pointer"
        title="Znovu nahrát">🎤</button>
    </div>
    <div style="height:1.5rem"></div>`;

  modal.style.display = 'block';
}
