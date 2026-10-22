// ═══ ar-scan.js — AR Room Scanner — JL-OBKLADY CN ═══
// WebXR Hit Testing + Plane Detection (ARCore on Android, ARKit on iOS)
// Samsung S25 Ultra: ARCore přes Chrome → plane-detection + hit-test funguje nativně
// Tok: kamera → detekce podlahy → uživatel ťuká rohy → world coords → PS.rooms (cm)

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// STAV AR SESSIONS
// ─────────────────────────────────────────────────────────────────────────────
const AR = {
  session:       null,   // XRSession
  hitTestSource: null,   // XRHitTestSource
  refSpace:      null,   // XRReferenceSpace (local-floor)
  viewerSpace:   null,   // XRReferenceSpace (viewer)
  glCanvas:      null,   // WebGL canvas (povinný pro XR, neviditelný)
  gl:            null,   // WebGLRenderingContext
  rafHandle:     null,   // requestAnimationFrame handle

  lastHitPos:    null,   // { x, y, z } v metrech — aktuální zaměřovač
  lastHitValid:  false,  // má zaměřovač platný hit?
  corners:       [],     // [{ x, y, z }, ...] — naměřené rohy (metry)
  detectedPlanes: 0,     // počet detekovaných rovin (info pro UI)

  roomName:      'Skenovaná místnost',
  wallHeight:    250,    // cm — výška stěny pro novou místnost
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. DETEKCE PODPORY
// ─────────────────────────────────────────────────────────────────────────────
async function arCheckSupport() {
  // WebXR API vůbec existuje?
  if (!('xr' in navigator)) {
    return { ok: false, reason: 'WebXR API není dostupné. Otevři v Chrome 81+.' };
  }
  // HTTPS je povinné (nebo localhost)
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
    return { ok: false, reason: 'AR vyžaduje HTTPS. Přejdi na https:// adresu.' };
  }
  // immersive-ar session support (ARCore / ARKit)
  let arSupported = false;
  try { arSupported = await navigator.xr.isSessionSupported('immersive-ar'); }
  catch(e) { arSupported = false; }

  if (!arSupported) {
    return {
      ok: false,
      reason: 'Zařízení nepodporuje AR. Nainstaluj ARCore z Google Play a zkus znovu.',
      showARCoreLink: true,
    };
  }
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. VSTUPNÍ BOD — volá se z tlačítka v pudorysu
// ─────────────────────────────────────────────────────────────────────────────
async function spustitARSkenování() {
  // Abort pokud session už běží
  if (AR.session) { await _arZavrit(); return; }

  const check = await arCheckSupport();
  if (!check.ok) {
    toast(check.reason, 'err');
    if (check.showARCoreLink) _zobrazARFallback(check.reason);
    return;
  }

  // Výška stěny z PS globálního nastavení
  AR.wallHeight = PS.wallHeight || 250;
  AR.corners    = [];
  AR.roomName   = 'Místnost ' + (_roomCounter);

  _vytvorAROverlay();

  try {
    await _arStartSession();
  } catch (e) {
    console.error('[AR]', e);
    toast('AR chyba: ' + (e.message || e), 'err');
    await _arZavrit();
    _zobrazARFallback('Spuštění AR selhalo: ' + (e.message || ''));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SPUŠTĚNÍ WebXR SESSION
// ─────────────────────────────────────────────────────────────────────────────
async function _arStartSession() {
  // ── WebGL canvas (neviditelný — pouze pro XR base layer) ──
  AR.glCanvas = document.createElement('canvas');
  AR.glCanvas.style.cssText =
    'position:fixed;top:0;left:0;width:100%;height:100%;z-index:1999;pointer-events:none;opacity:0';
  document.body.appendChild(AR.glCanvas);

  AR.gl = AR.glCanvas.getContext('webgl2', { xrCompatible: true })
       || AR.glCanvas.getContext('webgl',  { xrCompatible: true });
  if (!AR.gl) throw new Error('WebGL není podporováno');

  // ── XR Session — optional features: plane-detection, depth-sensing ──
  const overlay = document.getElementById('ar-scan-overlay');
  if (!overlay) throw new Error('AR overlay nenalezen');

  AR.session = await navigator.xr.requestSession('immersive-ar', {
    requiredFeatures: ['hit-test', 'dom-overlay'],
    optionalFeatures: ['plane-detection', 'depth-sensing', 'light-estimation'],
    domOverlay: { root: overlay },
  });

  AR.session.addEventListener('end', _onARSessionEnd);

  // XR kompatibilní GL kontext
  if (AR.gl.makeXRCompatible) await AR.gl.makeXRCompatible();
  const glLayer = new XRWebGLLayer(AR.session, AR.gl);
  await AR.session.updateRenderState({ baseLayer: glLayer });

  // ── Reference spaces ──
  // local-floor: origin = podlaha pod hráčem → Y koordináty jsou výšky od podlahy
  try {
    AR.refSpace = await AR.session.requestReferenceSpace('local-floor');
  } catch {
    // Fallback: local (bez podlahového zarovnání)
    AR.refSpace = await AR.session.requestReferenceSpace('local');
    toast('⚠ Podlahové zarovnání není dostupné — drž telefon rovně', 'err');
  }
  AR.viewerSpace = await AR.session.requestReferenceSpace('viewer');

  // ── Hit test source — střed obrazovky → paprsek na detekované plochy ──
  AR.hitTestSource = await AR.session.requestHitTestSource({
    space: AR.viewerSpace,
    entityTypes: ['plane', 'point'], // plane = velká plocha, point = libovolný bod
  });

  // ── Render loop ──
  AR.rafHandle = AR.session.requestAnimationFrame(_arFrame);

  _arAktualizujUI();
  toast('📷 AR aktivní — namiř na podlahu rohu místnosti');
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. AR RENDER FRAME (60fps)
// ─────────────────────────────────────────────────────────────────────────────
function _arFrame(time, frame) {
  if (!frame || !AR.session) return;

  // Plánuj další frame ihned
  AR.rafHandle = AR.session.requestAnimationFrame(_arFrame);

  // WebGL clear — průhledné, kamera prochází skrz
  const gl = AR.gl;
  const layer = AR.session.renderState.baseLayer;
  gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // ── Hit test — kde přistane paprsek ze středu obrazovky ──
  if (AR.hitTestSource) {
    const results = frame.getHitTestResults(AR.hitTestSource);
    if (results.length > 0) {
      const pose = results[0].getPose(AR.refSpace);
      if (pose) {
        const p = pose.transform.position;
        AR.lastHitPos   = { x: p.x, y: p.y, z: p.z };
        AR.lastHitValid = true;
        _arAktualizujRetikel(true, pose.transform);
      }
    } else {
      AR.lastHitValid = false;
      _arAktualizujRetikel(false, null);
    }
  }

  // ── Plane detection (volitelné — info do UI) ──
  if (frame.detectedPlanes) {
    const count = frame.detectedPlanes.size;
    if (count !== AR.detectedPlanes) {
      AR.detectedPlanes = count;
      const el = document.getElementById('ar-planes-info');
      if (el) {
        el.textContent = count > 0
          ? `✅ ${count} plocha${count > 1 ? 'y' : ''} detekována — ARCore aktivní`
          : '🔍 Hledám plochy — pohybuj pomalu telefonem…';
        el.style.color = count > 0 ? '#10b981' : 'rgba(255,255,255,0.6)';
      }
    }
  }

  // ── Live rozměry při 2+ rozích ──
  if (AR.corners.length >= 2) {
    _arAktualizujLiveDims();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. AKCE UŽIVATELE — přidání rohu
// ─────────────────────────────────────────────────────────────────────────────
function arTapKoroh() {
  if (!AR.lastHitValid || !AR.lastHitPos) {
    // Vizuální shake feedback
    const retikel = document.getElementById('ar-retikel');
    if (retikel) {
      retikel.style.animation = 'ar-shake 0.3s ease';
      setTimeout(() => { if(retikel) retikel.style.animation = ''; }, 350);
    }
    toast('Namiř na roh podlahy — zaměřovač musí být červený', 'err');
    return;
  }

  const pos = { x: AR.lastHitPos.x, y: AR.lastHitPos.y, z: AR.lastHitPos.z };
  AR.corners.push(pos);

  // Samsung haptika ❤️
  if (navigator.vibrate) navigator.vibrate([25, 15, 60]);

  _arAktualizujUI();

  // Auto-hint po 4 rozích
  if (AR.corners.length === 4) {
    setTimeout(() => {
      const stepEl = document.getElementById('ar-step-text');
      if (stepEl) stepEl.textContent = '✅ 4 rohy — zkontroluj a dokonči, nebo přidej více';
    }, 400);
  }
}

function arUndoKoroh() {
  if (AR.corners.length === 0) return;
  AR.corners.pop();
  if (navigator.vibrate) navigator.vibrate(20);
  _arAktualizujUI();
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. DOKONČENÍ — přenos do PS.rooms
// ─────────────────────────────────────────────────────────────────────────────
async function arDokoncitSkenování() {
  if (AR.corners.length < 3) {
    toast('Potřebuješ alespoň 3 rohy místnosti', 'err');
    return;
  }

  const nameEl = document.getElementById('ar-room-name');
  const name   = nameEl?.value?.trim() || AR.roomName;

  // ── Konverze: XR world coords (metry) → PS polygon (cm) ──
  // XR souřadnice: X = vpravo, Y = nahoru, Z = dozadu (right-hand)
  // PS souřadnice: X = vpravo, Y = dolů (2D canvas, cm)
  // Mapujeme: XR.x → PS.x, XR.z → PS.y (ignorujeme Y = výška)

  const rawPoints = AR.corners.map(c => ({
    x: c.x * 100,   // metry → cm
    y: c.z * 100,   // metry → cm (Z → Y v 2D)
  }));

  // Posun tak, aby polygon začínal u [50, 50] (ne na nule)
  const minX = Math.min(...rawPoints.map(p => p.x));
  const minY = Math.min(...rawPoints.map(p => p.y));
  const offsetX = 50 + (PS.rooms.length % 3) * 120;
  const offsetY = 50 + Math.floor(PS.rooms.length / 3) * 120;

  const shiftedPoints = rawPoints.map(p => ({
    x: Math.round((p.x - minX) * 10) / 10 + offsetX,
    y: Math.round((p.y - minY) * 10) / 10 + offsetY,
    h: AR.wallHeight,
  }));

  // Konvexní obal (správné pořadí bodů pro polygon — CCW)
  const hull = _arKonvexniObal(shiftedPoints);

  // ── Push do PS ──
  const colors = ['#C8502A','#2563eb','#2D6A4F','#7c3aed','#059669','#dc2626'];
  const color  = colors[PS.rooms.length % colors.length];

  psSaveUndo();
  PS.rooms.push({
    id:        makeRoomId(),
    name,
    points:    hull,
    wallNotes: [],
    wallHeight: AR.wallHeight,
    wallMep:   {},
    walls:     [],
    tileW: 60, tileH: 60, groutMm: 3, sparorez: 'brick',
    color,
    furniture:  [],
    _arScanned: true,       // badge v UI
    _arCorners: AR.corners.length,
  });
  PS.activeRoom = PS.rooms[PS.rooms.length - 1].id;

  const area = polygonArea(hull).toFixed(2);
  toast(`✅ "${name}" přidána z AR — ${area} m²`);

  _roomCounter++;
  await _arZavrit();

  // Pokud jsme v pudorysu, jen refresh; jinak naviguj tam
  if (state.page === 'pudorys') {
    renderRoomCanvas();
    updateRoomList();
    setTimeout(centerView, 80);
  } else {
    await navigate('pudorys');
    setTimeout(() => { renderRoomCanvas(); updateRoomList(); centerView(); }, 150);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. UI — vytvoření AR overlaye
// ─────────────────────────────────────────────────────────────────────────────
function _vytvorAROverlay() {
  document.getElementById('ar-scan-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'ar-scan-overlay';
  // DOM overlay — celá obrazovka, kamera je pozadí (poskytuje XR session)
  overlay.style.cssText = 'position:fixed;inset:0;z-index:2000;display:flex;flex-direction:column;pointer-events:none';

  overlay.innerHTML = `
    <style>
      @keyframes ar-pulse {
        0%   { transform: translate(-50%,-50%) scale(1);   opacity:1; }
        50%  { transform: translate(-50%,-50%) scale(1.15); opacity:0.7; }
        100% { transform: translate(-50%,-50%) scale(1);   opacity:1; }
      }
      @keyframes ar-shake {
        0%,100% { transform: translate(-50%,-50%) translateX(0); }
        20%     { transform: translate(-50%,-50%) translateX(-8px); }
        40%     { transform: translate(-50%,-50%) translateX(8px); }
        60%     { transform: translate(-50%,-50%) translateX(-5px); }
        80%     { transform: translate(-50%,-50%) translateX(5px); }
      }
      @keyframes ar-corner-in {
        from { transform: scale(0); opacity:0; }
        to   { transform: scale(1); opacity:1; }
      }
      #ar-retikel.valid   { filter: drop-shadow(0 0 8px #C8502A); }
      #ar-retikel.invalid { filter: drop-shadow(0 0 4px rgba(255,255,255,0.3)); }
    </style>

    <!-- ── RETIKEL (zaměřovač na podlaze) ── -->
    <div id="ar-retikel" class="invalid" style="
      position:absolute; top:50%; left:50%;
      transform:translate(-50%,-50%);
      width:72px; height:72px;
      pointer-events:none;
      transition: filter 0.2s, opacity 0.2s;
    ">
      <svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg" id="ar-retikel-svg">
        <!-- Elipsa — perspektivní kruh na podlaze -->
        <ellipse cx="36" cy="36" rx="32" ry="13" stroke="white" stroke-width="1.5" stroke-dasharray="5 4" opacity="0.5"/>
        <ellipse id="ar-retikel-ring" cx="36" cy="36" rx="32" ry="13" stroke="#C8502A" stroke-width="2.5" stroke-dasharray="5 4" opacity="0"/>
        <!-- Střed -->
        <circle cx="36" cy="36" r="4" fill="#C8502A" opacity="0.9"/>
        <circle cx="36" cy="36" r="2" fill="white"/>
        <!-- Zaměřovací čáry -->
        <line x1="36" y1="8"  x2="36" y2="22" stroke="white" stroke-width="1.5" opacity="0.6"/>
        <line x1="36" y1="50" x2="36" y2="64" stroke="white" stroke-width="1.5" opacity="0.6"/>
        <line x1="6"  y1="36" x2="20" y2="36" stroke="white" stroke-width="1.5" opacity="0.6"/>
        <line x1="52" y1="36" x2="66" y2="36" stroke="white" stroke-width="1.5" opacity="0.6"/>
      </svg>
    </div>

    <!-- ── TOP BAR ── -->
    <div style="
      position:absolute; top:0; left:0; right:0;
      padding: env(safe-area-inset-top, 12px) 1rem 1rem;
      padding-top: max(env(safe-area-inset-top, 12px), 12px);
      background: linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, transparent 100%);
      pointer-events: all;
      display: flex; justify-content:space-between; align-items:flex-start; gap:0.8rem;
    ">
      <div style="flex:1">
        <div style="color:white;font-weight:700;font-size:1rem;font-family:DM Sans,sans-serif;
          display:flex;align-items:center;gap:0.5rem">
          <span style="background:#C8502A;border-radius:6px;padding:2px 6px;font-size:0.72rem">AR</span>
          Skenování místnosti
        </div>
        <div id="ar-planes-info" style="color:rgba(255,255,255,0.6);font-size:0.72rem;
          margin-top:3px;font-family:DM Sans,sans-serif">
          🔍 Inicializuji AR — pohybuj pomalu telefonem…
        </div>
      </div>
      <button onclick="zrusitARSkenování()" style="
        background:rgba(255,255,255,0.12);color:white;
        border:1.5px solid rgba(255,255,255,0.25);border-radius:10px;
        padding:0.45rem 0.9rem;font-size:0.82rem;font-weight:600;
        cursor:pointer;font-family:DM Sans,sans-serif;pointer-events:all;
        white-space:nowrap;
      ">✕ Zrušit</button>
    </div>

    <!-- ── STEP INSTRUKCE (střed nahoru) ── -->
    <div style="
      position:absolute; top:42%; left:50%;
      transform:translateX(-50%);
      pointer-events:none; text-align:center; width:85vw; max-width:320px;
    ">
      <div style="
        background:rgba(0,0,0,0.6);color:white;
        border-radius:14px;padding:0.6rem 1rem;
        font-size:0.82rem;font-weight:600;
        font-family:DM Sans,sans-serif;
        backdrop-filter:blur(10px);
        border:1px solid rgba(255,255,255,0.1);
      ">
        <div id="ar-step-text">Namiř na 1. roh podlahy a klepni</div>
      </div>
    </div>

    <!-- ── TAP AREA (celá horní 2/3 obrazovky) ── -->
    <div id="ar-tap-area" onclick="arTapKoroh()" style="
      position:absolute; top:0; left:0; right:0; bottom:38%;
      pointer-events:all; cursor:crosshair;
    "></div>

    <!-- ── BOTTOM PANEL ── -->
    <div style="
      position:absolute; bottom:0; left:0; right:0;
      padding: 1rem 1rem max(env(safe-area-inset-bottom,16px),16px);
      background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%);
      pointer-events:all;
    ">

      <!-- Rohy — vizuální indikátory -->
      <div id="ar-corners-dots" style="
        display:flex; gap:0.5rem; justify-content:center;
        margin-bottom:0.7rem; flex-wrap:wrap;
      "></div>

      <!-- Název místnosti (po 3+ rozích) -->
      <div id="ar-name-wrap" style="display:none;margin-bottom:0.6rem">
        <input id="ar-room-name"
          style="
            width:100%;padding:0.65rem 1rem;
            border:2px solid rgba(200,80,42,0.6);border-radius:10px;
            background:rgba(0,0,0,0.55);color:white;
            font-family:DM Sans,sans-serif;font-size:0.92rem;font-weight:600;
            backdrop-filter:blur(8px);
          "
          placeholder="Název místnosti…">
      </div>

      <!-- Live rozměry -->
      <div id="ar-live-dims" style="
        text-align:center;color:rgba(255,255,255,0.75);
        font-size:0.78rem;font-family:DM Sans,sans-serif;
        margin-bottom:0.6rem;min-height:1.1em;
      "></div>

      <!-- Tlačítka -->
      <div style="display:flex;gap:0.5rem">
        <button id="ar-undo-btn" onclick="arUndoKoroh()" style="
          flex:1;padding:0.75rem;border-radius:12px;
          background:rgba(255,255,255,0.1);color:white;
          border:1.5px solid rgba(255,255,255,0.2);
          font-family:DM Sans,sans-serif;font-size:0.85rem;font-weight:600;
          cursor:pointer;opacity:0.4;transition:opacity 0.2s;
        ">↩ Zpět</button>
        <button id="ar-finish-btn" onclick="arDokoncitSkenování()" style="
          flex:2.5;padding:0.75rem;border-radius:12px;
          background:#C8502A;color:white;border:none;
          font-family:DM Sans,sans-serif;font-size:0.9rem;font-weight:700;
          cursor:pointer;opacity:0.4;transition:opacity 0.2s;
        ">✅ Dokončit místnost</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Název místnosti — výchozí hodnota
  setTimeout(() => {
    const nameEl = document.getElementById('ar-room-name');
    if (nameEl) nameEl.value = AR.roomName;
  }, 50);
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. UI — aktualizace za běhu
// ─────────────────────────────────────────────────────────────────────────────
function _arAktualizujRetikel(valid, transform) {
  const el  = document.getElementById('ar-retikel');
  const ring = document.getElementById('ar-retikel-ring');
  if (!el) return;

  if (valid) {
    el.className = 'valid';
    el.style.animation = 'ar-pulse 1.2s ease-in-out infinite';
    if (ring) { ring.style.opacity = '1'; ring.setAttribute('stroke', '#C8502A'); }
  } else {
    el.className = 'invalid';
    el.style.animation = '';
    if (ring) ring.style.opacity = '0';
  }
}

function _arAktualizujUI() {
  const n = AR.corners.length;

  // ── Step text ──
  const steps = [
    'Namiř na 1. roh podlahy a klepni',
    'Namiř na 2. roh podlahy a klepni',
    'Namiř na 3. roh podlahy a klepni',
    'Namiř na 4. roh podlahy a klepni',
    `${n} rohů — přidej další nebo dokonči`,
  ];
  const stepEl = document.getElementById('ar-step-text');
  if (stepEl) {
    const idx = Math.min(n, steps.length - 1);
    stepEl.textContent = n >= 4 ? steps[4] : steps[n];
  }

  // ── Tečky rohů ──
  const dotsEl = document.getElementById('ar-corners-dots');
  if (dotsEl) {
    const total = Math.max(n, 4);
    dotsEl.innerHTML = Array.from({ length: total }, (_, i) => {
      const filled  = i < n;
      const isLast  = filled && i === n - 1;
      return `<div style="
        width:${isLast ? '40px' : '36px'};
        height:${isLast ? '40px' : '36px'};
        border-radius:50%;
        background:${filled ? '#C8502A' : 'rgba(255,255,255,0.15)'};
        border:2px solid ${filled ? '#C8502A' : 'rgba(255,255,255,0.25)'};
        display:flex;align-items:center;justify-content:center;
        color:white;font-size:0.72rem;font-weight:700;
        font-family:DM Sans,sans-serif;
        transition:all 0.25s;
        ${isLast ? 'animation:ar-corner-in 0.25s ease;' : ''}
      ">${filled ? (i + 1) : ''}</div>`;
    }).join('');
  }

  // ── Buttons ──
  const finBtn  = document.getElementById('ar-finish-btn');
  const undoBtn = document.getElementById('ar-undo-btn');
  if (finBtn)  finBtn.style.opacity  = n >= 3 ? '1' : '0.4';
  if (undoBtn) undoBtn.style.opacity = n > 0  ? '1' : '0.4';

  // ── Název místnosti ──
  const nameWrap = document.getElementById('ar-name-wrap');
  if (nameWrap) nameWrap.style.display = n >= 3 ? 'block' : 'none';
}

function _arAktualizujLiveDims() {
  const el = document.getElementById('ar-live-dims');
  if (!el || AR.corners.length < 2) return;

  const dims = _arVypocitejRozmery(AR.corners);
  if (dims) {
    el.innerHTML =
      `📐 <strong style="color:#C8502A">${dims.w} × ${dims.h} cm</strong>` +
      ` ≈ <strong style="color:#10b981">${dims.area.toFixed(1)} m²</strong>` +
      ` · ${AR.corners.length} rohů`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. VÝPOČTY
// ─────────────────────────────────────────────────────────────────────────────

// Bounding box z XR world koordinátů → cm rozměry
function _arVypocitejRozmery(corners) {
  if (corners.length < 2) return null;
  const xs = corners.map(c => c.x * 100);
  const zs = corners.map(c => c.z * 100);
  const w = Math.round(Math.max(...xs) - Math.min(...xs));
  const h = Math.round(Math.max(...zs) - Math.min(...zs));
  return {
    w:    Math.max(w, 1),
    h:    Math.max(h, 1),
    area: (w * h) / 10000,
  };
}

// Konvexní obal — Graham scan (zajistí správné CCW pořadí bodů pro polygon)
function _arKonvexniObal(pts) {
  if (pts.length <= 3) return pts;

  // Pivot = nejnižší Y, pak nejlevější X
  let pivotIdx = 0;
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].y < pts[pivotIdx].y ||
       (pts[i].y === pts[pivotIdx].y && pts[i].x < pts[pivotIdx].x)) {
      pivotIdx = i;
    }
  }

  const pivot   = pts[pivotIdx];
  const others  = pts.filter((_, i) => i !== pivotIdx);

  // Seřadit podle úhlu od pivotu
  others.sort((a, b) => {
    const angA = Math.atan2(a.y - pivot.y, a.x - pivot.x);
    const angB = Math.atan2(b.y - pivot.y, b.x - pivot.x);
    if (Math.abs(angA - angB) < 1e-9) {
      // Stejný úhel — bližší bod první
      return Math.hypot(a.x - pivot.x, a.y - pivot.y)
           - Math.hypot(b.x - pivot.x, b.y - pivot.y);
    }
    return angA - angB;
  });

  const hull = [pivot, others[0]];
  for (let i = 1; i < others.length; i++) {
    while (hull.length > 1) {
      const n  = hull.length;
      const cross =
        (hull[n-1].x - hull[n-2].x) * (others[i].y - hull[n-2].y) -
        (hull[n-1].y - hull[n-2].y) * (others[i].x - hull[n-2].x);
      if (cross <= 0) hull.pop();
      else break;
    }
    hull.push(others[i]);
  }

  // Zachování h (výška stěny) z prvního bodu
  return hull.map(p => ({ x: p.x, y: p.y, h: pts[0].h || AR.wallHeight }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. ZAVŘENÍ / CLEANUP
// ─────────────────────────────────────────────────────────────────────────────
async function zrusitARSkenování() {
  await _arZavrit();
}

async function _arZavrit() {
  if (AR.rafHandle) { /* XR RAF se zastaví automaticky při end session */ }

  if (AR.hitTestSource) {
    try { AR.hitTestSource.cancel(); } catch(e) {}
    AR.hitTestSource = null;
  }

  if (AR.session) {
    try { await AR.session.end(); } catch(e) {}
    AR.session = null;
  }

  _arCleanupDOM();

  AR.corners      = [];
  AR.lastHitPos   = null;
  AR.lastHitValid = false;
  AR.detectedPlanes = 0;
}

function _onARSessionEnd() {
  // Volá se i při swipe-exit ze systému
  _arCleanupDOM();
  AR.session      = null;
  AR.hitTestSource = null;
}

function _arCleanupDOM() {
  document.getElementById('ar-scan-overlay')?.remove();
  if (AR.glCanvas) {
    AR.glCanvas.remove();
    AR.glCanvas = null;
    AR.gl = null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. FALLBACK — AR není dostupné
// ─────────────────────────────────────────────────────────────────────────────
function _zobrazARFallback(duvod) {
  document.getElementById('ar-fallback-host')?.remove();

  const div = document.createElement('div');
  div.id = 'ar-fallback-host';
  div.innerHTML = `
    <div style="
      position:fixed;inset:0;z-index:1800;
      background:rgba(0,0,0,0.65);
      display:flex;align-items:flex-end;
    " onclick="event.target===this&&document.getElementById('ar-fallback-host').remove()">
      <div style="
        background:var(--surface);border-radius:20px 20px 0 0;
        padding:1.5rem;width:100%;
      ">
        <div style="font-weight:700;font-size:1.05rem;margin-bottom:0.4rem">
          📷 AR skenování není dostupné
        </div>
        <p style="font-size:0.82rem;color:var(--text2);margin-bottom:1.1rem;line-height:1.5">
          ${duvod}<br><br>
          <strong>Co dělat:</strong><br>
          1. Otevři aplikaci v <strong>Chrome</strong> (ne Samsung Internet)<br>
          2. Nainstaluj nebo aktualizuj <strong>ARCore Services</strong><br>
          3. Zkontroluj, že jsi na HTTPS adrese
        </p>
        <div style="display:flex;flex-direction:column;gap:0.5rem">
          <a href="https://play.google.com/store/apps/details?id=com.google.ar.core"
            target="_blank" rel="noopener"
            style="
              display:block;padding:0.85rem;border-radius:12px;
              background:#4285f4;color:white;text-decoration:none;
              text-align:center;font-weight:700;font-size:0.9rem;
            ">
            ⬇️ Nainstalovat / aktualizovat ARCore
          </a>
          <button onclick="document.getElementById('ar-fallback-host').remove()"
            style="
              padding:0.85rem;border-radius:12px;
              border:1.5px solid var(--border);background:var(--surface2);
              font-family:DM Sans,sans-serif;font-size:0.9rem;cursor:pointer;
            ">
            ← Zpět na ruční editor
          </button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(div);
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. VEŘEJNÉ UTILITY — info badge v pudorysu
// ─────────────────────────────────────────────────────────────────────────────

// Vrátí true pokud session právě běží
function arJeAktivní() { return !!AR.session; }

// Badge pro AR-skenované místnosti v renderRoomCard
function arBadge(room) {
  if (!room._arScanned) return '';
  return `<span style="
    font-size:0.62rem;font-weight:700;
    background:#dbeafe;color:#1e40af;
    border-radius:6px;padding:1px 5px;
    margin-left:0.3rem;
  ">📷 AR ${room._arCorners || ''}R</span>`;
}
