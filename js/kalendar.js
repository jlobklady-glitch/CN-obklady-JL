// Načítání hodin a obědů z Google Kalendáře do evidence hodin a nákladů.
import { h, kc, num, toast } from './util.js';
import { S, listQuotes, addRecord, saveRecord, loadRecords } from './store.js';
import { GOOGLE_CLIENT_ID } from './config.js';
import { loadGsi } from './gmail.js';
import { PAYERS } from './sklad.js';

const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
const API = 'https://www.googleapis.com/calendar/v3';
let client = null, token = null, tokenExp = 0;
const ls = {
  get: (k, d) => { try { return localStorage.getItem('gcal_' + k) ?? d; } catch (_) { return d; } },
  set: (k, v) => { try { localStorage.setItem('gcal_' + k, v); } catch (_) { /* nic */ } },
};
export const calendarReady = () => !!GOOGLE_CLIENT_ID;
const n = (v) => Number(v) || 0;
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const alnum = (s) => norm(s).replace(/[^a-z0-9]/g, '');
const pragueDate = (d) => new Date(d).toLocaleDateString('sv-SE', { timeZone: 'Europe/Prague' });

// Musí se volat přímo z kliknutí (okno přihlášení).
export async function ensureCalToken() {
  if (token && Date.now() < tokenExp - 30000) return token;
  await loadGsi();
  return new Promise((res, rej) => {
    client = client || window.google.accounts.oauth2.initTokenClient({ client_id: GOOGLE_CLIENT_ID, scope: SCOPE, callback: () => {} });
    client.callback = (r) => {
      if (r.error) return rej(new Error('Google: ' + (r.error_description || r.error)));
      if (!window.google.accounts.oauth2.hasGrantedAllScopes(r, SCOPE)) return rej(new Error('Nebylo povoleno čtení kalendáře.'));
      token = r.access_token; tokenExp = Date.now() + Number(r.expires_in || 3600) * 1000; res(token);
    };
    client.requestAccessToken({ prompt: token === null && !ls.get('granted', '') ? 'consent' : '' });
  }).then((t) => { ls.set('granted', '1'); return t; });
}
const api = async (path) => {
  const r = await fetch(API + path, { headers: { Authorization: 'Bearer ' + token } });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error('Kalendář: ' + ((e.error && e.error.message) || r.status)); }
  return r.json();
};
export async function listCalendars() {
  const d = await api('/users/me/calendarList?minAccessRole=reader&maxResults=100');
  return (d.items || []).map((c) => ({ id: c.id, name: c.summaryOverride || c.summary, primary: !!c.primary }));
}

// ---- rozbor události (čistá logika, lze testovat) ----
export function workersIn(title, all) {
  const t = norm(title);
  const hit = all.filter((w) => { const k = norm(w).replace(/[^a-z0-9]/g, ''); const st = k.length > 3 ? k.slice(0, -1) : k; return k && new RegExp('(^|[^a-z0-9])' + st + '[a-z]{0,4}($|[^a-z0-9])').test(t); });
  return hit.length === 1 ? hit : all.slice(); // jedno jméno = jen on, žádné nebo obě = všichni
}
export function findQuote(title, quotes) {
  const t = alnum(title);
  const hit = quotes.filter((q) => q.number && alnum(q.number).length >= 4 && t.includes(alnum(q.number)));
  hit.sort((a, b) => alnum(b.number).length - alnum(a.number).length);
  return hit[0] || null;
}
export function parseLunch(title) {
  const t = norm(title);
  const kind = /\bobed/.test(t) ? 'Oběd' : /svacin/.test(t) ? 'Svačina' : null;
  if (!kind) return null;
  const m = t.match(/(\d[\d\s]*(?:[.,]\d+)?)\s*(?:kc|czk)?\s*$/) || t.match(/(\d+(?:[.,]\d+)?)/);
  return { kind, amount: m ? Number(String(m[1]).replace(/\s/g, '').replace(',', '.')) || 0 : 0 };
}
export function eventHours(ev) {
  if (!ev.start || !ev.start.dateTime || !ev.end || !ev.end.dateTime) return null; // celodenní
  let mins = (new Date(ev.end.dateTime) - new Date(ev.start.dateTime)) / 60000;
  if (mins <= 0 || mins > 16 * 60) return null;
  return Math.round((mins / 60) * 4) / 4;
}

// Načte události a vrací { created, updated, queue }. Co nejde přiřadit jednoznačně, jde do fronty.
export async function syncCalendar({ calendarId, days = 45 }) {
  const quotes = await listQuotes();
  const workers = PAYERS();
  await Promise.all([loadRecords('hours'), loadRecords('cost'), loadRecords('gcal_skip')]);
  const known = new Map();
  for (const k of ['hours', 'cost']) for (const r of S.rec[k] || []) if (r.data && r.data.gcal_id) known.set(r.data.gcal_id, r);
  const skipped = new Set((S.rec.gcal_skip || []).map((r) => r.data.gcal_id));
  const now = new Date();
  const from = new Date(now.getTime() - days * 86400000).toISOString();
  const evs = [];
  let pageToken = '';
  do {
    const d = await api(`/calendars/${encodeURIComponent(calendarId)}/events?singleEvents=true&orderBy=startTime&showDeleted=false&maxResults=250&timeMin=${encodeURIComponent(from)}&timeMax=${encodeURIComponent(now.toISOString())}${pageToken ? '&pageToken=' + pageToken : ''}`);
    evs.push(...(d.items || []));
    pageToken = d.nextPageToken || '';
  } while (pageToken);

  const res = { created: 0, updated: 0, queue: [] };
  const dayQuote = {}; // `${datum}|${pracovník}` -> číslo zakázky z hodin toho dne
  for (const r of S.rec.hours || []) if (r.data && r.data.quote) dayQuote[r.rec_date + '|' + r.data.worker] = r.data.quote;
  const lunches = [];
  for (const ev of evs) {
    if (ev.status === 'cancelled' || !ev.summary) continue;
    const title = ev.summary;
    const date = ev.start && (ev.start.dateTime ? pragueDate(ev.start.dateTime) : ev.start.date);
    const lunch = parseLunch(title);
    if (lunch) { lunches.push({ ev, title, date, amount: lunch.amount, what: lunch.kind }); continue; }
    const who = workersIn(title, workers);
    const quote = findQuote(title, quotes);
    const hrs = eventHours(ev);
    if (!quote || hrs === null) {
      if (!skipped.has(ev.id) && !who.every((w) => known.has(ev.id + ':' + w))) {
        const allDay = !!(ev.start && ev.start.date);
        const why = [!quote && 'v nadpisu nebylo nalezeno číslo ani označení žádné zakázky', hrs === null && (allDay ? 'celodenní událost – doplňte hodiny (předvyplněno 8)' : 'nelze určit délku události')].filter(Boolean).join('; ');
        res.queue.push({ ev, id: ev.id, title, date, who, all: who.length === workers.length && workers.length > 1, hours: hrs === null && allDay ? 8 : hrs, quote: quote ? quote.number : '', kind: 'hours', note: why });
      }
      continue;
    }
    for (const w of who) {
      const gid = ev.id + ':' + w;
      const ex = known.get(gid);
      if (!ex) {
        const r = await addRecord('hours', { quote: quote.number, worker: w, hours: hrs, gcal_id: gid, gcal_hours: hrs, gcal_upd: ev.updated }, date);
        known.set(gid, r); dayQuote[date + '|' + w] = quote.number; res.created++;
      } else if (ex.data.gcal_upd !== ev.updated && n(ex.data.hours) === n(ex.data.gcal_hours) && ex.data.quote === quote.number) {
        ex.data.hours = hrs; ex.data.gcal_hours = hrs; ex.data.gcal_upd = ev.updated; ex.rec_date = date; await saveRecord(ex); res.updated++;
      }
    }
  }
  for (const L of lunches) {
    const who = workersIn(L.title, workers);
    for (const w of who.length === workers.length && workers.length > 1 ? [] : who) {
      const gid = L.ev.id + ':' + w;
      if (known.has(gid) || skipped.has(L.ev.id)) continue;
      const q = dayQuote[L.date + '|' + w];
      if (q && L.amount > 0) {
        const r = await addRecord('cost', { quote: q, desc: L.what, payer: w, amount: L.amount, gcal_id: gid, gcal_upd: L.ev.updated }, L.date);
        known.set(gid, r); res.created++;
      } else res.queue.push({ ev: L.ev, id: L.ev.id, title: L.title, date: L.date, who: [w], amount: L.amount, quote: q || '', kind: 'lunch', what: L.what });
    }
    if (who.length === workers.length && workers.length > 1) res.queue.push({ ev: L.ev, id: L.ev.id, title: L.title, date: L.date, who: [], amount: L.amount, quote: '', kind: 'lunch', what: L.what, note: 'V nadpisu oběda chybí jméno (Lukáš / Honza).' });
  }
  ls.set('last', new Date().toISOString());
  return res;
}

// ---- panel v Hodinách ----
export function calendarPanel(onChange) {
  const box = h('div', { class: 'card' });
  const status = h('p', { class: 'muted', style: { minHeight: '1.3em' } }, '');
  const queueBox = h('div');
  const calSel = h('select', { onchange: (e) => ls.set('cal', e.target.value) });
  const last = () => { const v = ls.get('last', ''); return v ? 'Naposledy načteno ' + new Date(v).toLocaleString('cs-CZ') : 'Zatím nenačteno.'; };
  status.textContent = last();

  const drawQueue = (queue, quotes) => {
    if (!queue.length) { queueBox.replaceChildren(); return; }
    const dl = h('datalist', { id: 'gcalq' }, quotes.map((q) => h('option', { value: q.number }, q.customer_name || '')));
    const rows = queue.map((it) => {
      const qIn = h('input', { type: 'text', list: 'gcalq', value: it.quote, placeholder: 'č. nabídky', style: { width: '120px' } });
      const hIn = h('input', { type: 'text', inputmode: 'decimal', value: it.kind === 'lunch' ? it.amount || '' : it.hours ?? '', placeholder: it.kind === 'lunch' ? 'Kč' : 'hodin', style: { width: '70px' } });
      const wSel = it.kind === 'lunch' ? h('select', null, h('option', { value: '' }, 'kdo?'), PAYERS().map((w) => h('option', { selected: it.who[0] === w }, w)))
        : h('select', null, ...(PAYERS().length > 1 ? [h('option', { value: '*', selected: !!it.all }, 'Oba')] : []), PAYERS().map((w) => h('option', { value: w, selected: !it.all && it.who[0] === w }, w)));
      const tr = h('tr', null,
        h('td', null, it.date), h('td', null, it.title, it.note ? h('div', { class: 'muted' }, it.note) : null), h('td', null, wSel), h('td', null, qIn), h('td', null, hIn),
        h('td', null, h('button', { class: 'btn small gold', onclick: async (e) => {
          const qn = qIn.value.trim(), v = Number(String(hIn.value).replace(',', '.')) || 0;
          if (!qn) return toast('Chybí označení zakázky – napište ho do pole Zakázka (např. Konzum 2026-1).', 'err');
          if (!(v > 0)) return toast(it.kind === 'lunch' ? 'Chybí částka.' : 'Chybí počet hodin.', 'err');
          if (!quotes.some((x) => String(x.number).trim().toLowerCase() === qn.toLowerCase())) return toast('Zakázka „' + qn + '“ v aplikaci neexistuje. Založte ji v záložce Zakázky, nebo vyberte z nabídky.', 'err');
          e.target.disabled = true;
          try {
            if (it.kind === 'lunch') {
              const w = wSel.value; if (!w) { e.target.disabled = false; return toast('Vyberte, kdo měl oběd.', 'err'); }
              await addRecord('cost', { quote: qn, desc: it.what || 'Oběd', payer: w, amount: v, gcal_id: it.id + ':' + w, gcal_upd: it.ev.updated }, it.date);
            } else for (const w of (wSel.value === '*' ? PAYERS() : [wSel.value])) await addRecord('hours', { quote: qn, worker: w, hours: v, gcal_id: it.id + ':' + w, gcal_hours: v, gcal_upd: it.ev.updated }, it.date);
            tr.remove(); onChange();
          } catch (er) { toast(er.message, 'err'); e.target.disabled = false; }
        } }, 'Zapsat'), ' ', h('button', { class: 'btn small ghost', title: 'Tuto událost už nenabízet', onclick: async () => { try { await addRecord('gcal_skip', { gcal_id: it.id }, it.date); tr.remove(); } catch (er) { toast(er.message, 'err'); } } }, 'Ignorovat')));
      return tr;
    });
    queueBox.replaceChildren(h('h3', null, `K přiřazení (${queue.length})`), h('p', { class: 'muted' }, 'Tyto události aplikace nedokázala jednoznačně přiřadit. U každé je napsáno proč.'),
      h('div', { class: 'tablewrap' }, h('table', { class: 't' }, h('thead', null, h('tr', null, ['Datum', 'Událost', 'Kdo', 'Zakázka', 'Hodin / Kč', ''].map((x) => h('th', null, x)))), h('tbody', null, rows))), dl);
  };

  const go = h('button', { class: 'btn gold', onclick: async (e) => {
    e.target.disabled = true;
    try {
      const tok = ensureCalToken(); tok.catch(() => {});
      await tok;
      status.textContent = 'Načítám kalendáře…';
      if (!calSel.options.length || calSel.options.length === 1) {
        const cals = await listCalendars();
        const cur = ls.get('cal', '');
        calSel.replaceChildren(...cals.map((c) => h('option', { value: c.id, selected: cur ? c.id === cur : c.primary }, c.name)));
        if (!cur) ls.set('cal', calSel.value);
        if (cals.length > 1) { status.textContent = 'Vyberte kalendář a klikněte znovu.'; e.target.disabled = false; return; }
      }
      status.textContent = 'Načítám události…';
      const quotes = await listQuotes();
      const r = await syncCalendar({ calendarId: calSel.value || ls.get('cal', 'primary') });
      status.textContent = `Nově zapsáno ${r.created}, aktualizováno ${r.updated}, ke kontrole ${r.queue.length}. ` + last();
      drawQueue(r.queue, quotes); onChange();
    } catch (er) { status.textContent = ''; toast(er.message, 'err'); }
    e.target.disabled = false;
  } }, 'Načíst z kalendáře');

  box.append(h('h2', null, 'Google Kalendář'),
    h('p', { class: 'muted' }, 'V nadpisu události uveďte číslo nabídky (např. „Lukáš Honza 2026-014“). Bez jména se hodiny zapíšou oběma, s jedním jménem jen tomu. Hodiny se berou z času začátku a konce, bez odečtu pauz. Oběd nebo svačina: „Lukáš oběd 400“ (zapíše se k zakázce, na které ten den měl hodiny).'),
    h('div', { class: 'row', style: { gap: '10px', alignItems: 'end', flexWrap: 'wrap' } }, h('div', null, h('label', { class: 'f' }, 'Kalendář'), calSel), go),
    status, queueBox);
  return box;
}
