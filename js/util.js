// Pomocné funkce: vytváření prvků, formátování, vyhledávání.
export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else if (k === 'checked') el.checked = !!v;
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  for (const c of children.flat()) {
    if (c === undefined || c === null || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const nf2 = new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 3 });
export const money = (n) => nf2.format(Number(n) || 0);
export const kc = (n) => `${nf2.format(Number(n) || 0)} Kč`;
export const num = (n) => nf0.format(Number(n) || 0);

export function parseNum(v) {
  if (typeof v === 'number') return v;
  const s = String(v ?? '').replace(/[\s\u00a0\u202f]/g, '').replace('%', '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export function fmtDate(d) {
  if (!d) return '';
  const x = typeof d === 'string' ? new Date(d.length <= 10 ? d + 'T00:00:00' : d) : d;
  if (isNaN(x)) return '';
  return `${String(x.getDate()).padStart(2, '0')}.${String(x.getMonth() + 1).padStart(2, '0')}.${x.getFullYear()}`;
}
export const isoToday = () => new Date().toISOString().slice(0, 10);
export function addDays(iso, days) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + Number(days || 0));
  return d.toISOString().slice(0, 10);
}

// vyhledávání bez ohledu na diakritiku a velikost písmen
export const norm = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function matcher(query) {
  const tokens = norm(query).split(/\s+/).filter(Boolean);
  return (text) => {
    const t = norm(text);
    return tokens.every((k) => t.includes(k));
  };
}

export function debounce(fn, ms = 600) {
  let t;
  const wrapped = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  wrapped.flush = (...a) => { clearTimeout(t); return fn(...a); };
  return wrapped;
}

let toastTimer;
export function toast(msg, kind = 'ok') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'show ' + kind;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = ''; }, kind === 'err' ? 6000 : 2600);
}

export function confirmBox(text) {
  return new Promise((resolve) => {
    const done = (v) => { overlay.remove(); resolve(v); };
    const overlay = h('div', { class: 'overlay' },
      h('div', { class: 'dialog' },
        h('p', null, text),
        h('div', { class: 'row end' },
          h('button', { class: 'btn ghost', onclick: () => done(false) }, 'Zrušit'),
          h('button', { class: 'btn danger', onclick: () => done(true) }, 'Ano'))));
    document.body.append(overlay);
  });
}

export function uid() {
  return (crypto.randomUUID ? crypto.randomUUID() : 'id' + Math.random().toString(36).slice(2) + Date.now().toString(36));
}
