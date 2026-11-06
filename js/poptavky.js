// Poptávky z veřejného webu: seznam, fotografie, stavy, poznámka, vytvoření nabídky.
// Data zapisuje Edge Function "poptavka"; aplikace je čte jen po přihlášení (pravidla RLS).
import { h, toast, confirmBox, fmtDate } from './util.js';
import { sb, newQuote, saveQuote } from './store.js';
import { openPaymentDialog, PAYMENT_FEE } from './email.js';
import { inquiryVs } from './pay.js';

export const INQ_STATUS = [['nova', 'Nová'], ['kontaktovan', 'Kontaktován'], ['ceka_platba', 'Čeká na platbu'], ['zaplaceno', 'Zaplaceno'], ['nabidka', 'Nabídka'], ['uzavreno', 'Vyřízeno'], ['zamitnuto', 'Zamítnuto']];
const statusLabel = (k) => (INQ_STATUS.find(([x]) => x === k) || [k, k])[1];
const BADGE = { nova: 'gold', kontaktovan: 'blue', ceka_platba: 'gold', zaplaceno: 'ok', nabidka: 'blue', uzavreno: 'ok', zamitnuto: 'bad' };
const FILTERS = [['aktivni', 'Aktivní', ['nova', 'kontaktovan', 'ceka_platba', 'zaplaceno', 'nabidka']], ['nova', 'Nové', ['nova']], ['vyrizene', 'Vyřízené a zamítnuté', ['uzavreno', 'zamitnuto']], ['vse', 'Vše', null]];

const BUCKET = 'inquiry-photos';

function fmtDateTime(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return `${fmtDate(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

async function fetchInquiries() {
  const { data, error } = await sb.from('inquiries').select('*').order('created_at', { ascending: false }).limit(300);
  if (error) throw error;
  return data || [];
}

export async function countNewInquiries() {
  const { count, error } = await sb.from('inquiries').select('id', { count: 'exact', head: true }).eq('status', 'nova');
  if (error) throw error;
  return count || 0;
}

async function patchInquiry(id, patch) {
  const { error } = await sb.from('inquiries').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

// Z poptávky vznikne nová nabídka s vyplněným odběratelem a stavbou.
async function createQuoteFrom(r) {
  const q = await newQuote();
  q.customer_name = r.name;
  q.customer_contact = [r.phone, r.email].filter(Boolean).join(', ');
  q.customer_address = r.location || '';
  q.project = [r.work_type, r.location].filter(Boolean).join(' – ');
  if (r.status === 'zaplaceno') q.note = [q.note, `Zaplaceno za nabídku ${PAYMENT_FEE} Kč (VS ${inquiryVs(r)}), odečte se z konečné ceny.`].filter(Boolean).join('\n');
  await saveQuote(q);
  const note = [r.note, `Nabídka ${q.number}`].filter(Boolean).join('\n');
  await patchInquiry(r.id, { status: 'nabidka', note });
  return q;
}

function photosRow(r) {
  const photos = Array.isArray(r.photos) ? r.photos : [];
  const box = h('div', { class: 'row', style: { gap: '8px', margin: '8px 0' } });
  if (!photos.length) return null;
  sb.storage.from(BUCKET).createSignedUrls(photos.map((p) => p.path), 3600).then(({ data, error }) => {
    if (error || !data) { box.append(h('span', { class: 'muted' }, 'Fotografie se nepodařilo načíst.')); return; }
    const byPath = Object.fromEntries(data.map((d) => [d.path, d.signedUrl]));
    photos.forEach((p) => {
      const url = byPath[p.path];
      if (!url) return;
      if (String(p.type || '').startsWith('image/')) {
        box.append(h('a', { href: url, target: '_blank', rel: 'noopener' },
          h('img', { src: url, alt: p.name || 'Fotografie', loading: 'lazy', style: { width: '96px', height: '96px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--line)' } })));
      } else {
        box.append(h('a', { class: 'btn small ghost', href: url, target: '_blank', rel: 'noopener', style: { textDecoration: 'none' } }, 'Soubor: ' + (p.name || 'příloha')));
      }
    });
  }).catch(() => box.append(h('span', { class: 'muted' }, 'Fotografie se nepodařilo načíst.')));
  return box;
}

export async function inquiriesView(root) {
  root.replaceChildren(h('p', { class: 'muted' }, 'Načítám…'));
  let rows;
  try { rows = await fetchInquiries(); } catch (e) { root.replaceChildren(h('p', { class: 'muted' }, 'Poptávky se nepodařilo načíst: ' + e.message)); return; }
  let filter = rows.some((r) => r.status === 'nova') ? 'nova' : 'aktivni';
  const list = h('div');

  const card = (r) => {
    const tel = String(r.phone || '').replace(/[^\d+]/g, '');
    const badge = h('span', { class: 'badge ' + (BADGE[r.status] || '') }, statusLabel(r.status));
    const sel = h('select', { onchange: async (e) => {
      try { await patchInquiry(r.id, { status: e.target.value }); r.status = e.target.value; badge.className = 'badge ' + (BADGE[r.status] || ''); badge.textContent = statusLabel(r.status); toast('Stav uložen'); } catch (er) { toast(er.message, 'err'); e.target.value = r.status; }
    } }, INQ_STATUS.map(([k, l]) => h('option', { value: k, selected: k === r.status }, l)));
    const note = h('textarea', { rows: 2, placeholder: 'Poznámka (jen pro vás)…', style: { width: '100%', marginTop: '8px' }, onchange: async (e) => {
      try { await patchInquiry(r.id, { note: e.target.value }); r.note = e.target.value; toast('Poznámka uložena'); } catch (er) { toast(er.message, 'err'); }
    } }, r.note || '');
    return h('div', { class: 'card' },
      h('div', { class: 'row between' }, h('b', null, r.name), badge),
      h('div', { class: 'muted' }, [fmtDateTime(r.created_at), r.work_type, r.location, r.timing ? 'termín: ' + r.timing : ''].filter(Boolean).join(' · ')),
      h('div', { class: 'row', style: { margin: '8px 0', gap: '14px' } },
        h('a', { href: 'tel:' + tel }, r.phone), r.email ? h('a', { href: 'mailto:' + r.email }, r.email) : null),
      r.description ? h('p', { style: { whiteSpace: 'pre-wrap', margin: '6px 0' } }, r.description) : null,
      photosRow(r),
      h('div', { class: 'row', style: { marginTop: '8px' } }, sel,
        h('button', { class: 'btn small', onclick: () => openPaymentDialog(r, { onSent: async () => {
          if (r.status === 'nova' || r.status === 'kontaktovan') { await patchInquiry(r.id, { status: 'ceka_platba' }); r.status = 'ceka_platba'; sel.value = r.status; badge.className = 'badge ' + BADGE[r.status]; badge.textContent = statusLabel(r.status); }
        } }) }, 'Platební údaje'),
        h('button', { class: 'btn small gold', onclick: async (e) => {
          if (!(await confirmBox('Vytvořit z této poptávky novou nabídku?'))) return;
          e.target.disabled = true;
          try { const q = await createQuoteFrom(r); location.hash = '#/nabidka/' + q.id; } catch (er) { toast('Nabídku se nepodařilo vytvořit: ' + er.message, 'err'); e.target.disabled = false; }
        } }, 'Vytvořit nabídku'),
        h('button', { class: 'btn small danger', onclick: async () => {
          if (!(await confirmBox('Smazat poptávku včetně fotografií? Nelze vrátit zpět.'))) return;
          try {
            const paths = (Array.isArray(r.photos) ? r.photos : []).map((p) => p.path);
            if (paths.length) { const { error: e1 } = await sb.storage.from(BUCKET).remove(paths); if (e1) throw e1; }
            const { error } = await sb.from('inquiries').delete().eq('id', r.id);
            if (error) throw error;
            rows = rows.filter((x) => x.id !== r.id); draw(); toast('Poptávka smazána');
          } catch (er) { toast('Smazání se nepodařilo: ' + er.message, 'err'); }
        } }, 'Smazat')),
      note);
  };

  const draw = () => {
    const f = FILTERS.find(([k]) => k === filter);
    const shown = rows.filter((r) => !f[2] || f[2].includes(r.status));
    list.replaceChildren(...(shown.length ? shown.map(card) : [h('p', { class: 'muted' }, 'V tomto výběru nejsou žádné poptávky.')]));
  };

  root.replaceChildren(
    h('div', { class: 'pagehead' }, h('h1', null, 'Poptávky z webu'),
      h('select', { onchange: (e) => { filter = e.target.value; draw(); } }, FILTERS.map(([k, l]) => h('option', { value: k, selected: k === filter }, l)))),
    list);
  draw();
}

// Upozornění nad obsahem, když čekají nové poptávky.
export async function inquiriesBanner(main) {
  try {
    if ((location.hash || '').startsWith('#/poptavky')) return;
    const n = await countNewInquiries();
    if (!n) return;
    const el = h('div', { class: 'banner' },
      h('span', null, `Nové poptávky z webu: ${n}. `),
      h('a', { class: 'btn small gold', href: '#/poptavky', style: { textDecoration: 'none' } }, 'Zobrazit'),
      h('button', { class: 'btn small ghost', onclick: () => el.remove() }, '×'));
    main.parentNode.insertBefore(el, main);
  } catch (_) { /* upozornění je jen doplněk */ }
}
