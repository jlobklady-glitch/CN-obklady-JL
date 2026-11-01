import { h, toast, kc, isoToday, addDays } from './util.js';
import { backupToDrive } from './backup.js';
import { sb, S, loadAll, profileList, setProfile, listInvoices } from './store.js';
import { APP_VERSION } from './config.js';
import { quotesList, quoteEditor } from './quotes.js';
import { settlementEditor, invoiceEditor } from './vyuctovani.js';
import { prehledView } from './prehled.js';
import { openBundledPrace } from './cenikimport.js';
import { orderView } from './objednavka.js';
import { ziskView } from './ziskovost.js';
import { skladView } from './sklad.js';
import { hodinyView } from './hodiny.js';
import { zbyloView } from './zbylo.js';
import { contactsView, pricesView, settingsView } from './views.js';

window.__ver = APP_VERSION;
const app = document.getElementById('app');

// automatická aktualizace: nový service worker = okamžité načtení nové verze
if ('serviceWorker' in navigator) {
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then((r) => { setInterval(() => r.update().catch(() => {}), 5 * 60 * 1000); }).catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!had) return;
    // nové verze se nenačítají uprostřed psaní: nejdřív se uloží rozpracované změny
    const go = () => location.reload();
    if (window.__isDirty && window.__isDirty()) { window.__flushSave().then(go, go); } else go();
  });
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

function profilePicker(then) {
  app.replaceChildren(h('div', { class: 'login' }, h('div', { class: 'logo' }, 'Kdo jste?', h('small', null, 'VYBERTE SVŮJ PROFIL')),
    h('div', { class: 'card' }, h('div', { class: 'grid' }, profileList().map((p) => h('button', { class: 'btn gold', style: { fontSize: '18px', padding: '16px' }, onclick: () => { setProfile(p.key); then(); } }, p.label))),
      h('p', { class: 'muted' }, 'Profil mění jen údaje dodavatele v záhlaví nabídek a faktur. Data jsou společná. Profil lze kdykoli změnit v menu.'))));
}

const TABS = [['#/prehled', 'Přehled'], ['#/nabidky', 'Nabídky'], ['#/zisk', 'Ziskovost'], ['#/zbylo', 'Zbylo navíc'], ['#/sklad', 'Sklad'], ['#/hodiny', 'Hodiny a náklady'], ['#/kontakty', 'Kontakty'], ['#/ceniky', 'Ceníky'], ['#/nastaveni', 'Nastavení']];

function stackAll(el) {
  el.querySelectorAll('table.t').forEach((t) => {
    const heads = [...t.querySelectorAll('thead th')].map((x) => x.textContent);
    if (!heads.length) return;
    t.classList.add('stack');
    t.querySelectorAll('tbody tr').forEach((tr) => [...tr.children].forEach((td, i) => { if (heads[i] && !td.dataset.label) td.dataset.label = heads[i]; }));
  });
}
let stackObs, lastHash = '';
async function route() {
  if (!S.user) return;
  if (window.__flushSave) {
    let ok = true;
    try { ok = await window.__flushSave(); } catch (_) { ok = false; }
    if (ok === false) { // uložení selhalo – zůstat na stránce, ať se změny neztratí
      toast('Změny se nepodařilo uložit – zůstáváte na stránce.', 'err');
      if (lastHash && location.hash !== lastHash) history.replaceState(null, '', lastHash);
      return;
    }
    window.__flushSave = null; window.__isDirty = null;
  }
  const hash = location.hash || '#/prehled';
  lastHash = hash;
  const main = h('main');
  const isActive = (href) => hash.startsWith(href) || (href === '#/nabidky' && (hash.startsWith('#/nabidka/') || hash.startsWith('#/objednavka/') || hash.startsWith('#/vyuctovani/') || hash.startsWith('#/faktura/')));
  const close = () => { drawer.classList.remove('open'); scrim.classList.remove('open'); };
  const scrim = h('div', { class: 'scrim', onclick: close });
  const drawer = h('aside', { class: 'drawer' },
    h('div', { class: 'drawer-head' }, h('div', { class: 'brand' }, 'JL-OBKLADY', h('small', null, 'KALKULAČKA · v' + APP_VERSION))),
    h('nav', null, TABS.map(([href, l]) => h('a', { href, class: isActive(href) ? 'active' : '', onclick: close }, l)),
      h('a', { href: '#', onclick: (e) => { e.preventDefault(); close(); profilePicker(() => route()); } }, 'Profil: ' + ((S.firmaBase.profiles || {})[S.profile] || {}).label + ' (změnit)'),
      h('a', { href: '#', class: 'out', onclick: async (e) => { e.preventDefault(); if (window.__flushSave) { try { await window.__flushSave(); } catch (_) { /* */ } window.__flushSave = null; window.__isDirty = null; } await sb.auth.signOut(); S.user = null; loginView(); } }, 'Odhlásit')));
  const bar = h('div', { class: 'topbar' },
    h('button', { class: 'burger', 'aria-label': 'Menu', onclick: () => { drawer.classList.add('open'); scrim.classList.add('open'); } }, h('span'), h('span'), h('span')),
    h('div', { class: 'brand' }, (TABS.find(([href]) => isActive(href)) || ['', 'JL-OBKLADY'])[1]), h('div', { class: 'grow' }), h('div', { class: 'brand logo' }, ((S.firmaBase.profiles || {})[S.profile] || {}).label || 'JL-OBKLADY'));
  const days = S.lastBackup ? Math.floor((Date.now() - new Date(S.lastBackup)) / 864e5) : null;
  const bkBanner = (days === null || days >= 7) && !S.offline ? h('div', { class: 'banner' }, h('span', null, days === null ? 'Data ještě nebyla zálohována. ' : `Poslední záloha byla před ${days} dny. `),
    h('button', { class: 'btn small gold', onclick: async (e) => { e.target.disabled = true; try { const r = await backupToDrive(); toast('Záloha uložena na Disk: ' + r.name); bkBanner.remove(); } catch (er) { toast(er.message, 'err'); e.target.disabled = false; } } }, 'Zálohovat teď')) : null;
  app.replaceChildren(h('div', { class: 'shell' }, bar, scrim, drawer, bkBanner, S.offline ? h('div', { class: 'banner' }, 'Offline – zobrazena poslední načtená data, ukládání nebude fungovat.') : null, main));
  if (!S.offline) { dueBanner(main); priceBanner(main); }
  stackObs?.disconnect(); stackObs = new MutationObserver(() => stackAll(main)); stackObs.observe(main, { childList: true, subtree: true });
  try {
    if (hash.startsWith('#/nabidka/')) await quoteEditor(main, hash.split('/')[2]);
    else if (hash.startsWith('#/vyuctovani/')) await settlementEditor(main, hash.split('/')[2]);
    else if (hash.startsWith('#/faktura/')) await invoiceEditor(main, hash.split('/')[2]);
    else if (hash.startsWith('#/objednavka/')) await orderView(main, hash.split('/')[2]);
    else if (hash.startsWith('#/zisk')) await ziskView(main);
    else if (hash.startsWith('#/sklad')) await skladView(main);
    else if (hash.startsWith('#/hodiny')) await hodinyView(main);
    else if (hash.startsWith('#/zbylo')) await zbyloView(main);
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
  if (!S.profile && profileList().length) return profilePicker(() => route());
  route();
}
window.addEventListener('hashchange', route);
// rozpracovaná úprava se uloží i při přepnutí aplikace / zavření karty
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && window.__flushSave) window.__flushSave().catch(() => {}); });
window.addEventListener('beforeunload', (e) => { if (window.__isDirty && window.__isDirty()) { e.preventDefault(); e.returnValue = ''; } });
window.addEventListener('pagehide', () => { if (window.__flushSave) window.__flushSave().catch(() => {}); });
boot();

// Upozornění na faktury po splatnosti (a blížící se splatnost do 3 dnů) – zobrazí se nad obsahem po každém otevření aplikace.
async function dueBanner(main) {
  try {
    const inv = (await listInvoices()).filter((i) => !i.paid && i.due_on);
    const today = isoToday(), soon = addDays(today, 3);
    const late = inv.filter((i) => i.due_on < today), near = inv.filter((i) => i.due_on >= today && i.due_on <= soon);
    if (!late.length && !near.length) return;
    const sum = (a) => a.reduce((t, i) => t + Number(i.amount || 0), 0);
    const parts = [];
    if (late.length) parts.push(`Po splatnosti: ${late.length} ${late.length === 1 ? 'faktura' : late.length < 5 ? 'faktury' : 'faktur'} (${kc(sum(late))})`);
    if (near.length) parts.push(`Splatnost do 3 dnů: ${near.length} (${kc(sum(near))})`);
    const first = (late[0] || near[0]);
    const el = h('div', { class: 'banner', style: late.length ? { background: '#fde8e8', borderColor: '#d33', color: '#7a1010' } : {} },
      h('span', null, parts.join(' · ') + '. '),
      h('a', { class: 'btn small gold', href: late.length + near.length === 1 ? '#/faktura/' + first.id : '#/prehled', style: { textDecoration: 'none' } }, 'Zobrazit'),
      h('button', { class: 'btn small ghost', onclick: () => el.remove() }, '×'));
    main.parentNode.insertBefore(el, main);
  } catch (_) { /* upozornění je jen doplněk */ }
}

// Nabídka jedním klepnutím načíst nový ceník prací 2026 (dokud v databázi chybí).
function priceBanner(main) {
  try {
    if (S.prices.some((p) => p.code === 'PRI-001') || sessionStorage.getItem('noPriceBanner')) return;
    const el = h('div', { class: 'banner' },
      h('span', null, 'Je připraven nový ceník prací 2026 (550 položek s poznámkami). '),
      h('button', { class: 'btn small gold', onclick: () => openBundledPrace(() => { el.remove(); route(); }) }, 'Načíst'),
      h('button', { class: 'btn small ghost', onclick: () => { try { sessionStorage.setItem('noPriceBanner', '1'); } catch (_) {} el.remove(); } }, '×'));
    main.parentNode.insertBefore(el, main);
  } catch (_) {}
}
