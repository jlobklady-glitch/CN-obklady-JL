// Tlačítko „Zpět“ (Android, gesto) nejdřív zavře otevřené okno (dialog, tabulku, náhled), teprve pak jde o krok zpět v aplikaci.
// Každé okno přidané do stránky si založí vlastní záznam v historii; zavření okna jinak (tlačítkem) ten záznam zase odebere.
const stack = [];
let ignore = 0;
const isLayer = (n) => n && n.nodeType === 1 && (n.classList.contains('overlay') || n.classList.contains('modal-back'));

function closeLayer(el) {
  el.__byBack = true;
  // nejdřív kliknout na Zrušit/Zavřít, aby se správně dokončily i dialogy, které čekají na odpověď
  const btn = [...el.querySelectorAll('button')].reverse().find((b) => /^(zrušit|zavřít|storno|zpět|ne)$/i.test((b.textContent || '').trim()));
  if (btn) btn.click();
  if (el.isConnected) el.remove();
}

new MutationObserver((muts) => {
  for (const m of muts) {
    m.addedNodes.forEach((n) => {
      if (isLayer(n) && !stack.includes(n)) { stack.push(n); try { history.pushState({ layer: true }, '', location.href); } catch (_) { /* nic */ } }
    });
    m.removedNodes.forEach((n) => {
      const i = stack.indexOf(n);
      if (i < 0) return;
      stack.splice(i, 1);
      if (!n.__byBack) { ignore++; try { history.back(); } catch (_) { ignore--; } } // okno zavřeno tlačítkem: odebrat jeho záznam z historie
    });
  }
}).observe(document.body, { childList: true });

window.addEventListener('popstate', () => {
  if (ignore > 0) { ignore--; return; }
  const top = stack[stack.length - 1];
  if (!top) return;
  if (top.drawer) top.close(); else closeLayer(top);
});

// Boční menu (mobil): Zpět ho zavře, místo aby se přešlo na předchozí stránku.
function watchDrawer() {
  const d = document.querySelector('.drawer');
  if (!d) return false;
  const scrim = document.querySelector('.scrim');
  const state = { el: d, drawer: true };
  let wasOpen = false;
  new MutationObserver(() => {
    const open = d.classList.contains('open');
    if (open && !wasOpen) { wasOpen = true; stack.push(state); try { history.pushState({ layer: true }, '', location.href); } catch (_) { /* nic */ } }
    else if (!open && wasOpen) {
      wasOpen = false;
      const i = stack.indexOf(state);
      if (i >= 0) { stack.splice(i, 1); if (!state.byBack) { ignore++; try { history.back(); } catch (_) { ignore--; } } }
      state.byBack = false;
    }
  }).observe(d, { attributes: true, attributeFilter: ['class'] });
  state.close = () => { state.byBack = true; d.classList.remove('open'); if (scrim) scrim.classList.remove('open'); };
  return true;
}
const mo = new MutationObserver(() => { if (watchDrawer()) mo.disconnect(); });
if (!watchDrawer()) mo.observe(document.body, { childList: true, subtree: true });

// PC: křížek v rohu okna (zobrazí ho jen CSS u zařízení s myší), klávesa Esc a u informačních oken i klik na pozadí.
function addX(el) {
  const box = el.firstElementChild;
  if (!box || box.querySelector(':scope > .layer-x')) return;
  if (getComputedStyle(box).position === 'static') box.style.position = 'relative';
  const x = document.createElement('button');
  x.type = 'button'; x.className = 'layer-x'; x.textContent = '×'; x.title = 'Zavřít (Esc)'; x.setAttribute('aria-label', 'Zavřít');
  x.addEventListener('click', (e) => { e.stopPropagation(); history.back(); });
  box.prepend(x);
}
new MutationObserver((muts) => muts.forEach((m) => m.addedNodes.forEach((n) => { if (isLayer(n)) addX(n); }))).observe(document.body, { childList: true });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && stack.length && !e.defaultPrevented) { e.preventDefault(); history.back(); } });
document.addEventListener('click', (e) => {
  const t = e.target;
  if (t && t.nodeType === 1 && t.hasAttribute('data-backdrop-close') && stack[stack.length - 1] === t) history.back();
});
