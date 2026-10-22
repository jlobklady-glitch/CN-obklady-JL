// ═══ utils.js — JL-OBKLADY CN v4 ═══

// ── Toast ─────────────────────────────────────────────────
let _toastTimer = null;
function toast(msg, type = 'ok') {
  const t = document.getElementById('toast');
  if (!t) return;
  if (_toastTimer) clearTimeout(_toastTimer);
  const hasPrefix = msg.startsWith('✓') || msg.startsWith('⚠') ||
                    msg.startsWith('❌') || msg.startsWith('📋') ||
                    msg.startsWith('🎤') || msg.startsWith('📍');
  const prefix = type === 'ok' ? '✓ ' : '⚠ ';
  t.textContent = hasPrefix ? msg : prefix + msg;
  t.className   = `toast show toast-${type}`;
  _toastTimer   = setTimeout(() => t.classList.remove('show'), 3200);
}

// ── Formátování ───────────────────────────────────────────
function formatKc(n) {
  return Math.round(n || 0).toLocaleString('cs') + ' Kč';
}

function formatKcShort(n) {
  n = Math.round(n || 0);
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + ' M';
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + ' k';
  return n.toLocaleString('cs');
}

// ── Debounce ──────────────────────────────────────────────
function debounce(fn, ms = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ── Throttle ──────────────────────────────────────────────
function throttle(fn, ms = 150) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= ms) { last = now; fn(...args); }
  };
}

// ── Safe parse ────────────────────────────────────────────
function safeInt(val, fallback = 0)   { const n = parseInt(val);   return isNaN(n) ? fallback : n; }
function safeFloat(val, fallback = 0) { const n = parseFloat(val); return isNaN(n) ? fallback : n; }

// ── Escape HTML ───────────────────────────────────────────
function escHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Datum helpers ─────────────────────────────────────────
function todayISO() { return new Date().toISOString().slice(0, 10); }
function nowISO()   { return new Date().toISOString(); }

function formatDatum(isoDate) {
  if (!isoDate) return '—';
  try { return new Date(isoDate + 'T12:00').toLocaleDateString('cs-CZ'); }
  catch (e) { return isoDate; }
}

function relativeDatum(isoDate) {
  if (!isoDate) return '—';
  const diff = Math.floor((Date.now() - new Date(isoDate)) / 86400000);
  if (diff === 0)  return 'dnes';
  if (diff === 1)  return 'včera';
  if (diff < 7)    return `před ${diff} dny`;
  if (diff < 30)   return `před ${Math.floor(diff / 7)} týdny`;
  if (diff < 365)  return `před ${Math.floor(diff / 30)} měsíci`;
  return `před ${Math.floor(diff / 365)} lety`;
}

// ── Clipboard ─────────────────────────────────────────────
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Zkopírováno ✓');
    return true;
  } catch (e) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      toast('Zkopírováno ✓');
      return true;
    } catch (e2) {
      toast('Kopírování selhalo', 'err');
      return false;
    }
  }
}

// ── Online/offline ────────────────────────────────────────
window.addEventListener('online',  () => toast('📶 Připojení obnoveno'));
window.addEventListener('offline', () => toast('📵 Offline režim', 'err'));

// ── Confirm dialog — custom (lepší než browser confirm) ───
function confirmDialog(msg, onConfirm, onCancel) {
  const existing = document.getElementById('confirm-dialog');
  if (existing) existing.remove();

  const div = document.createElement('div');
  div.id = 'confirm-dialog';
  div.style.cssText = `
    position:fixed;inset:0;z-index:5000;
    background:rgba(22,20,15,0.6);
    backdrop-filter:blur(8px);
    display:flex;align-items:center;justify-content:center;
    padding:1rem;
  `;

  div.innerHTML = `
    <div style="
      background:var(--c-surface);
      border-radius:var(--r);
      padding:1.4rem 1.2rem;
      width:100%;
      max-width:340px;
      box-shadow:var(--sh-lg);
      border:1px solid var(--c-border);
    ">
      <div style="font-family:var(--f-display);font-size:1rem;font-weight:800;
        margin-bottom:0.6rem;line-height:1.3">
        ${escHtml(msg)}
      </div>
      <div style="display:flex;gap:0.5rem;margin-top:1rem">
        <button id="confirm-cancel"
          style="flex:1;padding:0.7rem;border-radius:var(--r-sm);
            border:1.5px solid var(--c-border);background:var(--c-s2);
            font-family:var(--f-body);font-size:0.9rem;font-weight:600;cursor:pointer;
            color:var(--c-ink)">
          Zrušit
        </button>
        <button id="confirm-ok"
          style="flex:1;padding:0.7rem;border-radius:var(--r-sm);
            border:none;background:var(--c-red);color:white;
            font-family:var(--f-body);font-size:0.9rem;font-weight:700;cursor:pointer">
          Potvrdit
        </button>
      </div>
    </div>`;

  document.body.appendChild(div);

  document.getElementById('confirm-cancel').onclick = () => {
    div.remove();
    if (onCancel) onCancel();
  };
  document.getElementById('confirm-ok').onclick = () => {
    div.remove();
    if (onConfirm) onConfirm();
  };
  div.onclick = (e) => { if (e.target === div) { div.remove(); if (onCancel) onCancel(); } };
}

// ── Bottom sheet helper ───────────────────────────────────
function showBottomSheet(title, html, onClose) {
  const existing = document.getElementById('bottom-sheet-host');
  if (existing) existing.remove();

  const host = document.createElement('div');
  host.id = 'bottom-sheet-host';
  host.style.cssText = `
    position:fixed;inset:0;z-index:1500;
    background:rgba(22,20,15,0.55);
    backdrop-filter:blur(6px);
    display:flex;align-items:flex-end;
  `;
  host.onclick = (e) => {
    if (e.target === host) {
      host.remove();
      if (onClose) onClose();
    }
  };
  host.innerHTML = `
    <div style="
      background:var(--c-surface);
      border-radius:var(--r) var(--r) 0 0;
      padding:1.3rem 1.1rem;
      width:100%;
      max-height:88dvh;
      overflow-y:auto;
      animation:slideUp 0.25s var(--ease) both;
    ">
      <div style="width:36px;height:3.5px;background:var(--c-border2);
        border-radius:100px;margin:0 auto 1rem"></div>
      ${title ? `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.9rem">
          <div style="font-family:var(--f-display);font-size:1rem;font-weight:800">${title}</div>
          <button onclick="document.getElementById('bottom-sheet-host').remove()"
            style="background:none;border:none;font-size:1.3rem;cursor:pointer;
              color:var(--c-ink3);padding:0.2rem 0.4rem;line-height:1">✕</button>
        </div>` : ''}
      ${html}
      <div style="height:0.5rem"></div>
    </div>`;
  document.body.appendChild(host);
  return host;
}

function closeBottomSheet() {
  document.getElementById('bottom-sheet-host')?.remove();
}

// ── Skeleton loader helper ────────────────────────────────
function skeletonCard(lines = 3) {
  const lineHtml = Array.from({ length: lines }, (_, i) => `
    <div class="skeleton" style="height:14px;width:${i === 0 ? '60' : i === lines - 1 ? '40' : '80'}%;
      margin-bottom:0.5rem"></div>`).join('');
  return `<div class="card">${lineHtml}</div>`;
}

// ── Vibrate helper ────────────────────────────────────────
function vibrate(pattern = 30) {
  try { navigator.vibrate?.(pattern); } catch (e) {}
}
