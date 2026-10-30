// Data: klient Supabase, načítání a ukládání, výpočty cen.
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';
import { isoToday, parseNum } from './util.js';

export const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

export const TYPES = [
  { key: 'prace', label: 'Práce' },
  { key: 'stena', label: 'Obklad (stěna)' },
  { key: 'podlaha', label: 'Dlažba (podlaha)' },
  { key: 'mapei', label: 'Materiál MAPEI' },
  { key: 'kabe', label: 'Betonová stěrka KABE' },
  { key: 'ostatni', label: 'Ostatní' },
];
export const typeLabel = (k) => (TYPES.find((t) => t.key === k) || {}).label || k;
export const typeKey = (label) => (TYPES.find((t) => t.label === label) || {}).key || 'ostatni';

export const STAV = ['Rozpracovaná', 'Nabídka zaslána', 'Potvrzena', 'V realizaci', 'Dokončena', 'Zamítnuta'];
export const PLATBA = ['Nezaplaceno', 'Záloha uhrazena', 'Zaplaceno'];

export const DEFAULT_FIRMA = {
  name: '', ico: '', address: '', email: '', phone: '', web: '', account: '', bank: '',
  instagram: '', youtube: '', valid_days: 30, due_days: 14, terms: '',
  mapei_discount: 0.28, kabe_markup: 0,
  tagline: 'OBKLADY  ·  DLAŽBY  ·  KOUPELNY  ·  DEKORATIVNÍ STĚRKY',
};

export const DEFAULT_QA = [
  { q: 'Spárovka: cementová, nebo epoxidová?', a: 'Cementová spára je běžné řešení pro standardní plochy – je levnější, snáze se zpracovává a po hodinách je pochůzná. Epoxidová spára je dvousložková, nenasákavá a velmi odolná mechanicky i chemicky, hladká a bez plísní, takže ve sprchovém koutě a na namáhaných místech zůstává dlouhodobě čistá a v jednotném odstínu. Je dražší a vyžaduje přesné míchání a zkušenost při zpracování, proto je součástí Premium.', show: true },
  { q: 'Hydroizolace: proč Mapeguard WP 200 a odtokový žlab?', a: 'Standardní provedení zahrnuje stěrkovou hydroizolaci. V Premium ji nahrazuje systém Mapei Mapeguard WP 200 – hydroizolační membrána s vrstvou rouna, která se lepí na podklad a do které se obkládá. Pásky, tvarovky do rohů a manžety kolem odtoků dotvoří souvislou vodotěsnou vrstvu i v rozích a prostupech. V kombinaci s odtokovým žlabem voda spolehlivě odteče a nezatéká do konstrukce.', show: true },
  { q: 'Jolly rohy, nebo lišty?', a: 'Jolly roh vzniká přesným řezem obkladu pod úhlem 45°, takže roh je ze stejného materiálu a se stejnou kresbou jako plocha. Odpadá plastová nebo kovová lišta, která se časem může poškodit, změnit barvu nebo zůstat viditelná. Výsledek je čistší a hodnotnější, vyžaduje ale přesné řezání a víc práce.', show: true },
  { q: 'Proč WC tlačítko z obkladu, ne klasické?', a: 'Tlačítko zhotovené z obkladu splyne se stěnou – žádný plastový prvek, který ruší celkový vzhled, jednotný povrch a snadné čištění. Přístup k technice zůstává zajištěn. Je to zakázková práce na míru, proto patří do Premium.', show: true },
  { q: 'Proč zvolit Premium?', a: 'Premium nestojí za vzhledem prvního dne, ale za tím, jak bude koupelna vypadat a fungovat za několik let. Hygiena, odolnost proti vlhkosti a bezchybné detaily snižují riziko oprav a nutnost zásahu do hotových povrchů.', show: true },
];

export const S = { user: null, firma: { ...DEFAULT_FIRMA }, firmaBase: { ...DEFAULT_FIRMA }, profile: null, contacts: [], prices: [], loaded: false };

// Profil = kdo je právě přihlášený (Lukáš / Honza). Mění jen údaje dodavatele v záhlaví dokumentů, data jsou společná.
const PROFILE_KEY = 'jl-profile';
export const profileList = () => Object.entries(S.firmaBase.profiles || {}).map(([key, p]) => ({ key, label: p.label || key }));
export function applyProfile() {
  const b = S.firmaBase;
  S.firma = { ...b, ...((b.profiles || {})[S.profile] || {}) };
}
export function readProfile() {
  let k = null;
  try { k = localStorage.getItem(PROFILE_KEY); } catch (_) { /* nic */ }
  S.profile = k && (S.firmaBase.profiles || {})[k] ? k : null;
  applyProfile();
  return S.profile;
}
export function setProfile(k) {
  S.profile = k;
  try { localStorage.setItem(PROFILE_KEY, k); } catch (_) { /* nic */ }
  applyProfile();
}

const CACHE_KEY = 'jl-cache-v1';

async function fetchAll(table, order) {
  const out = [];
  const step = 1000;
  for (let from = 0; ; from += step) {
    let q = sb.from(table).select('*').range(from, from + step - 1);
    if (order) q = q.order(order);
    const { data, error } = await q;
    if (error) throw error;
    out.push(...data);
    if (data.length < step) break;
  }
  return out;
}

export async function loadAll() {
  try {
    const [settings, contacts, prices] = await Promise.all([
      fetchAll('settings'), fetchAll('contacts', 'name'), fetchAll('price_items', 'name'),
    ]);
    const f = settings.find((r) => r.key === 'firma');
    const bk = settings.find((r) => r.key === 'backup');
    S.lastBackup = bk && bk.value ? bk.value.last || null : null;
    S.firmaBase = { ...DEFAULT_FIRMA, ...(f ? f.value : {}) };
    readProfile();
    S.contacts = contacts;
    S.prices = prices;
    S.loaded = true;
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ firma: S.firmaBase, contacts, prices })); } catch (_) { /* plná paměť */ }
    return true;
  } catch (e) {
    // offline: poslední načtená data
    try {
      const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (c) { S.firmaBase = c.firma; readProfile(); S.contacts = c.contacts; S.prices = c.prices; S.loaded = true; S.offline = true; return true; }
    } catch (_) { /* nic */ }
    throw e;
  }
}

// Datum poslední zálohy je sdílené mezi oběma uživateli (nejen v jednom telefonu)
export async function markBackupDone() {
  const last = new Date().toISOString();
  S.lastBackup = last;
  const { error } = await sb.from('settings').upsert({ key: 'backup', value: { last } });
  if (error) throw error;
}

export async function saveFirma(value) {
  const { error } = await sb.from('settings').upsert({ key: 'firma', value });
  if (error) throw error;
  S.firmaBase = { ...DEFAULT_FIRMA, ...value };
  applyProfile();
}

// ---------- kontakty ----------
export async function saveContact(c) {
  const row = { name: c.name.trim(), kind: c.kind, address: c.address, contact: c.contact, ico: c.ico, dic: c.dic, person: c.person, note: c.note };
  let res;
  if (c.id) res = await sb.from('contacts').update(row).eq('id', c.id).select().single();
  else res = await sb.from('contacts').insert(row).select().single();
  if (res.error) throw res.error;
  const i = S.contacts.findIndex((x) => x.id === res.data.id);
  if (i >= 0) S.contacts[i] = res.data; else S.contacts.push(res.data);
  S.contacts.sort((a, b) => a.name.localeCompare(b.name, 'cs'));
  return res.data;
}
export async function deleteContact(id) {
  const { error } = await sb.from('contacts').delete().eq('id', id);
  if (error) throw error;
  S.contacts = S.contacts.filter((x) => x.id !== id);
}

// ---------- ceníky ----------
export async function savePrice(p) {
  const row = { category: p.category, code: p.code || '', name: p.name, unit: p.unit || '', price: parseNum(p.price), pack: parseNum(p.pack) || 1, extra: p.extra || {}, active: p.active !== false };
  let res;
  if (p.id) res = await sb.from('price_items').update(row).eq('id', p.id).select().single();
  else res = await sb.from('price_items').insert(row).select().single();
  if (res.error) throw res.error;
  const i = S.prices.findIndex((x) => x.id === res.data.id);
  if (i >= 0) S.prices[i] = res.data; else S.prices.push(res.data);
  return res.data;
}
export async function deletePrice(id) {
  const { error } = await sb.from('price_items').delete().eq('id', id);
  if (error) throw error;
  S.prices = S.prices.filter((x) => x.id !== id);
}

// ---------- výpočet cen ----------
export function kabeTier(item, qty) {
  const tiers = (item.extra && item.extra.tiers) || [];
  if (!tiers.length) return item.price;
  const idx = Math.min(tiers.length, Math.max(1, Math.ceil((Number(qty) || 0) / 5))) - 1;
  return tiers[idx];
}

export function priceFor(item, qty) {
  const f = S.firma;
  if (item.category === 'mapei') return Math.round(item.price * (1 - (Number(f.mapei_discount) || 0)) * 100) / 100;
  if (item.category === 'kabe') return Math.round(kabeTier(item, qty) * (1 + (Number(f.kabe_markup) || 0)));
  return Number(item.price) || 0;
}

export function displayName(item) {
  if (item.category === 'mapei') {
    const code = String(item.name).trim();
    return `${code} | bal. ${Number(item.pack) || 1}${item.unit ? ' ' + item.unit : ''}`;
  }
  return item.name;
}
export function displayUnit(item) {
  if (item.category === 'mapei') return 'bal.';
  return item.unit || '';
}

export const lineTotal = (r) => {
  const q = parseNum(r.qty), p = parseNum(r.price), d = parseNum(r.disc);
  if (!r.name || !q || !Number.isFinite(p)) return 0;
  return Math.round(q * p * (1 - d) * 100) / 100;
};
export const quoteTotal = (items) => items.reduce((s, r) => s + lineTotal(r), 0);

// ---------- nabídky ----------
export async function listQuotes() {
  const { data, error } = await sb.from('quotes').select('*').order('issued_on', { ascending: false }).order('number', { ascending: false });
  if (error) throw error;
  return data;
}
export async function getQuote(id) {
  const { data, error } = await sb.from('quotes').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}
export async function nextQuoteNumber() {
  const yr = new Date().getFullYear();
  const { data, error } = await sb.from('quotes').select('number').like('number', `CN-${yr}-%`);
  if (error) throw error;
  let mx = 0;
  for (const r of data) { const n = parseInt(r.number.split('-')[2], 10); if (n > mx) mx = n; }
  return `CN-${yr}-${String(mx + 1).padStart(3, '0')}`;
}
export async function newQuote() {
  for (let i = 0; ; i++) {
    const number = await nextQuoteNumber();
    const row = { number, issued_on: isoToday(), valid_days: S.firma.valid_days || 30, items: [], note: '' };
    const { data, error } = await sb.from('quotes').insert(row).select().single();
    if (!error) return data;
    if (error.code !== '23505' || i >= 3) throw error; // číslo mezitím zabral druhý uživatel
  }
}
// Optimistické zamykání: uložení projde jen tehdy, když se záznam od načtení nezměnil (updated_at).
export class ConflictError extends Error { constructor() { super('Záznam mezitím upravil někdo jiný.'); this.conflict = true; } }

async function guardedUpdate(table, row, id, stamp, force) {
  if (force) {
    const { data: cur, error: e0 } = await sb.from(table).select('updated_at').eq('id', id).maybeSingle();
    if (e0) throw e0;
    if (!cur) throw new Error('Záznam byl mezitím smazán.');
    stamp = cur.updated_at;
  }
  let q = sb.from(table).update(row).eq('id', id);
  if (stamp) q = q.eq('updated_at', stamp);
  const { data, error } = await q.select().maybeSingle();
  if (error) throw error;
  if (!data) throw new ConflictError();
  return data;
}

export async function saveQuote(q, force = false) {
  const row = {
    number: q.number, issued_on: q.issued_on, valid_days: q.valid_days, customer_id: q.customer_id || null,
    customer_name: q.customer_name, customer_address: q.customer_address, customer_contact: q.customer_contact,
    project: q.project, note: q.note, premium: !!q.premium, items: q.items, status: q.status, payment_status: q.payment_status, settlement: q.settlement || {}, premium_items: q.premium_items || [],
  };
  const data = await guardedUpdate('quotes', row, q.id, q.updated_at, force);
  q.updated_at = data.updated_at;
  return data;
}
export async function newBezCN() {
  const q = await newQuote();
  q.settlement = { bez: true, items: [], advance: 0, note: '' };
  return saveQuote(q);
}
export async function deleteQuote(id) {
  const { error } = await sb.from('quotes').delete().eq('id', id);
  if (error) throw error;
}
export async function duplicateQuote(q) {
  for (let i = 0; ; i++) {
    const number = await nextQuoteNumber();
    const row = { ...q, number, issued_on: isoToday(), status: 'Rozpracovaná', payment_status: 'Nezaplaceno' };
    delete row.id; delete row.created_at; delete row.updated_at;
    const { data, error } = await sb.from('quotes').insert(row).select().single();
    if (!error) return data;
    if (error.code !== '23505' || i >= 3) throw error;
  }
}

// ---------- import ceníků ze seed.json ----------
export async function importSeed(onProgress) {
  const r = await fetch('data/seed.json', { cache: 'no-store' });
  const seed = await r.json();
  if (seed.settings && seed.settings.firma) await saveFirma({ ...DEFAULT_FIRMA, ...seed.settings.firma });
  for (const c of seed.contacts || []) {
    if (!S.contacts.some((x) => x.name.toLowerCase() === c.name.toLowerCase())) await saveContact(c);
  }
  const have = new Set(S.prices.map((p) => p.category + '|' + p.name));
  const todo = seed.items.filter((i) => !have.has(i.category + '|' + i.name));
  const step = 200;
  for (let i = 0; i < todo.length; i += step) {
    const chunk = todo.slice(i, i + step);
    const { error } = await sb.from('price_items').insert(chunk);
    if (error) throw error;
    if (onProgress) onProgress(Math.min(todo.length, i + step), todo.length);
  }
  await loadAll();
  return todo.length;
}

// ---------- faktury ----------
export async function listInvoices(quoteId) {
  let q = sb.from('invoices').select('*').order('issued_on', { ascending: false }).order('number', { ascending: false });
  if (quoteId) q = q.eq('quote_id', quoteId);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}
export async function getInvoice(id) {
  const { data, error } = await sb.from('invoices').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}
export async function createInvoice(row) {
  const yr = new Date().getFullYear();
  const { data: ex, error: e1 } = await sb.from('invoices').select('number').like('number', `${yr}%`);
  if (e1) throw e1;
  let mx = 0;
  for (const r of ex) { const n = parseInt(r.number.slice(4), 10); if (n > mx) mx = n; }
  for (let i = 0; ; i++) {
    const number = `${yr}${String(mx + 1 + i).padStart(3, '0')}`;
    const { data, error } = await sb.from('invoices').insert({ ...row, number }).select().single();
    if (!error) return data;
    if (error.code !== '23505' || i >= 3) throw error;
  }
}
export async function saveInvoice(i, force = false) {
  const row = { number: i.number, issued_on: i.issued_on, due_on: i.due_on || null, customer_name: i.customer_name, customer_address: i.customer_address,
    customer_ids: i.customer_ids, description: i.description, amount: parseNum(i.amount), paid: !!i.paid };
  const data = await guardedUpdate('invoices', row, i.id, i.updated_at, force);
  i.updated_at = data.updated_at;
  return data;
}
export async function deleteInvoice(id) {
  const { error } = await sb.from('invoices').delete().eq('id', id);
  if (error) throw error;
}

// ---------- záznamy (sklad, hodiny, náklady, zbylo navíc) ----------
S.rec = {};
export async function loadRecords(kind) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('records').select('*').eq('kind', kind).order('rec_date').order('created_at').range(from, from + 999);
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000) break;
  }
  S.rec[kind] = out;
  return out;
}
export async function addRecord(kind, data = {}, date = isoToday()) {
  const { data: r, error } = await sb.from('records').insert({ kind, rec_date: date, data }).select().single();
  if (error) throw error;
  (S.rec[kind] = S.rec[kind] || []).push(r);
  return r;
}
export async function saveRecord(r) {
  const { error } = await sb.from('records').update({ rec_date: r.rec_date, data: r.data }).eq('id', r.id);
  if (error) throw error;
}
export async function deleteRecord(r) {
  const { error } = await sb.from('records').delete().eq('id', r.id);
  if (error) throw error;
  S.rec[r.kind] = (S.rec[r.kind] || []).filter((x) => x.id !== r.id);
}
