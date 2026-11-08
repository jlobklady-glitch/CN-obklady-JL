// Fotky zakázky (před / průběh / po / vada) – ukládají se do soukromého úložiště job-photos, v nabídce jen odkazy.
import { h, toast, confirmBox, fmtDate, isoToday } from './util.js';
import { sb } from './store.js';

const BUCKET = 'job-photos';
const LABELS = ['Před', 'Průběh', 'Po', 'Vada / reklamace', 'Jiné'];

// zmenšení na max 1800 px (JPEG) – fotky z telefonu mají 5–10 MB
async function shrink(file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Fotku se nepodařilo zmenšit.'))), 'image/jpeg', 0.82));
}

export function photosCard(q, touch) {
  q.photos = Array.isArray(q.photos) ? q.photos : [];
  const grid = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: '10px', marginTop: '10px' } });
  const status = h('span', { class: 'muted' });
  let label = LABELS[0];
  const urls = {};
  const draw = () => {
    grid.replaceChildren(...q.photos.map((p, i) => h('div', { style: { border: '1px solid var(--line, #ddd)', borderRadius: '8px', overflow: 'hidden' } },
      h('img', { src: urls[p.path] || '', alt: p.label, style: { width: '100%', height: '110px', objectFit: 'cover', display: 'block', cursor: 'pointer', background: '#eee' }, onclick: () => urls[p.path] && window.open(urls[p.path], '_blank') }),
      h('div', { style: { padding: '4px 6px', fontSize: '12px' } }, h('b', null, p.label), ' · ', fmtDate(p.at)),
      h('button', { class: 'btn small ghost', style: { width: '100%' }, onclick: async () => {
        if (!(await confirmBox('Smazat fotku?'))) return;
        try { const { error } = await sb.storage.from(BUCKET).remove([p.path]); if (error) throw error; q.photos.splice(i, 1); touch(); draw(); } catch (e) { toast(e.message, 'err'); }
      } }, 'Smazat'))));
    if (!q.photos.length) grid.replaceChildren(h('p', { class: 'muted' }, 'Zatím žádné fotky.'));
  };
  const loadUrls = async () => {
    if (!q.photos.length) return;
    const { data } = await sb.storage.from(BUCKET).createSignedUrls(q.photos.map((p) => p.path), 3600);
    (data || []).forEach((d) => { if (d.signedUrl) urls[d.path] = d.signedUrl; });
    draw();
  };
  const file = h('input', { type: 'file', accept: 'image/*', multiple: true, style: { display: 'none' }, onchange: async (e) => {
    const files = [...e.target.files]; e.target.value = ''; if (!files.length) return;
    let done = 0;
    for (const f of files) {
      status.textContent = `Nahrávám ${done + 1} / ${files.length}…`;
      try {
        const blob = await shrink(f);
        const path = `${q.id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
        const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg' });
        if (error) throw error;
        q.photos.push({ path, label, at: isoToday(), name: f.name || '' }); done++;
      } catch (er) { toast('Fotku se nepodařilo nahrát: ' + er.message, 'err'); }
    }
    status.textContent = done ? `Nahráno ${done}.` : '';
    if (done) { touch(); await loadUrls(); }
  } });
  const sel = h('select', { onchange: (e) => { label = e.target.value; } }, LABELS.map((l) => h('option', null, l)));
  const box = h('div', { class: 'card' }, h('h2', null, 'Fotky zakázky'),
    h('div', { class: 'row', style: { gap: '8px', flexWrap: 'wrap', alignItems: 'center' } }, sel, h('button', { class: 'btn gold', onclick: () => file.click() }, '+ Přidat fotky'), file, status),
    h('p', { class: 'muted' }, 'Fotky se zmenší a uloží do soukromého úložiště. Vidí je jen přihlášení uživatelé aplikace. Na telefonu jde fotit přímo.'), grid);
  draw(); loadUrls().catch(() => {});
  return box;
}
