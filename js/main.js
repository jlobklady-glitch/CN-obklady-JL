import { h, toast } from './util.js';
import { sb, S, loadAll } from './store.js';
import { APP_VERSION } from './config.js';
import { quotesList, quoteEditor } from './quotes.js';
import { settlementEditor, invoiceEditor } from './vyuctovani.js';
import { prehledView } from './prehled.js';
import { contactsView, pricesView, settingsView } from './views.js';

window.__ver = APP_VERSION;
const app = document.getElementById('app');

// automatická aktualizace: nový service worker = okamžité načtení nové verze
if ('serviceWorker' in navigator) {
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then((r) => { setInterval(() => r.update().catch(() => {}), 5 * 60 * 1000); }).catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) location.reload(); });
}

function loginView(msg) {
  const email = h('input', { type: 'email', placeholder: 'E-mail', autocomplete: 'username', value: 'jlobklady@gmail.com' });
  const pass = h('input', { type: 'password', placeholder: 'Heslo', autocomplete: 'current-password' });
  const err = h('div', { class: 'err' }, msg || '');
  const go = async () => {
    err.textContent = '';
    const { error } = await sb.auth.signInWithPassword({ email: email.value.trim(), password: pass.value });
    if (error) err.textContent = 'Přihlášení se nezdařilo: ' + (error.message.includes('Invalid') ? 'špatný e-mail nebo heslo' : error.message);
    else boot();
  };
  pass.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  app.replaceChildren(h('div', { class: 'login' }, h('div', { class: 'logo' }, 'JL-OBKLADY', h('small', null, 'KALKULAČKA A ZAKÁZKY')),
    h('div', { class: 'card' }, h('div', { class: 'grid' }, email, pass, h('button', { class: 'btn gold', onclick: go }, 'Přihlásit')), err)));
}

const TABS = [['#/prehled', 'Přehled'], ['#/nabidky', 'Nabídky'], ['#/kontakty', 'Kontakty'], ['#/ceniky', 'Ceníky'], ['#/nastaveni', 'Nastavení']];

function stackAll(el) {
  el.querySelectorAll('table.t').forEach((t) => {
    const heads = [...t.querySelectorAll('thead th')].map((x) => x.textContent);
    if (!heads.length) return;
    t.classList.add('stack');
    t.querySelectorAll('tbody tr').forEach((tr) => [...tr.children].forEach((td, i) => { if (heads[i] && !td.dataset.label) td.dataset.label = heads[i]; }));
  });
}
let stackObs;
async function route() {
  if (!S.user) return;
  if (window.__flushSave) { try { await window.__flushSave(); } catch (_) { /* */ } window.__flushSave = null; }
  const hash = location.hash || '#/prehled';
  const main = h('main');
  const isActive = (href) => hash.startsWith(href) || (href === '#/nabidky' && (hash.startsWith('#/nabidka/') || hash.startsWith('#/vyuctovani/') || hash.startsWith('#/faktura/')));
  const close = () => { drawer.classList.remove('open'); scrim.classList.remove('open'); };
  const scrim = h('div', { class: 'scrim', onclick: close });
  const drawer = h('aside', { class: 'drawer' },
    h('div', { class: 'drawer-head' }, h('div', { class: 'brand' }, 'JL-OBKLADY', h('small', null, 'KALKULAČKA · v' + APP_VERSION))),
    h('nav', null, TABS.map(([href, l]) => h('a', { href, class: isActive(href) ? 'active' : '', onclick: close }, l)),
      h('a', { href: '#', class: 'out', onclick: async (e) => { e.preventDefault(); await sb.auth.signOut(); S.user = null; loginView(); } }, 'Odhlásit')));
  const bar = h('div', { class: 'topbar' },
    h('button', { class: 'burger', 'aria-label': 'Menu', onclick: () => { drawer.classList.add('open'); scrim.classList.add('open'); } }, h('span'), h('span'), h('span')),
    h('div', { class: 'brand' }, (TABS.find(([href]) => isActive(href)) || ['', 'JL-OBKLADY'])[1]), h('div', { class: 'grow' }), h('div', { class: 'brand logo' }, 'JL-OBKLADY'));
  app.replaceChildren(h('div', { class: 'shell' }, bar, scrim, drawer, S.offline ? h('div', { class: 'banner' }, 'Offline – zobrazena poslední načtená data, ukládání nebude fungovat.') : null, main));
  stackObs?.disconnect(); stackObs = new MutationObserver(() => stackAll(main)); stackObs.observe(main, { childList: true, subtree: true });
  try {
    if (hash.startsWith('#/nabidka/')) await quoteEditor(main, hash.split('/')[2]);
    else if (hash.startsWith('#/vyuctovani/')) await settlementEditor(main, hash.split('/')[2]);
    else if (hash.startsWith('#/faktura/')) await invoiceEditor(main, hash.split('/')[2]);
    else if (hash.startsWith('#/prehled')) await prehledView(main);
    else if (hash.startsWith('#/kontakty')) contactsView(main);
    else if (hash.startsWith('#/ceniky')) pricesView(main);
    else if (hash.startsWith('#/nastaveni')) settingsView(main);
    else await quotesList(main);
  } catch (e) { main.replaceChildren(h('div', { class: 'card err' }, 'Chyba: ' + (e.message || e))); }
}

async function boot() {
  const { data } = await sb.auth.getSession();
  if (!data.session) return loginView();
  S.user = data.session.user;
  app.replaceChildren(h('p', { class: 'muted', style: { padding: '20px' } }, 'Načítám data…'));
  try { await loadAll(); } catch (e) { return loginView('Data se nepodařilo načíst: ' + e.message); }
  route();
}
window.addEventListener('hashchange', route);
boot();
