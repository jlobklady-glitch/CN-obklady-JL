// Předávací protokol: provedené práce, vady a nedodělky, podpisy obou stran na displeji; ukládá se k nabídce (q.settlement.handover).
import { h, toast, confirmBox, makeSaver, isoToday, parseNum } from './util.js';
import { S, getQuote, saveQuote } from './store.js';
import { handoverDoc, printDoc } from './doc.js';
import { savePdfToDrive, pdfName } from './pdf.js';

const put = (root, ...c) => root.replaceChildren(...c.filter(Boolean));
const fld = (l, el, cls) => h('div', { class: cls || '' }, h('label', { class: 'f' }, l), el);

function sigPad(getImg, setImg, label) {
  const cv = h('canvas', { width: 600, height: 220, style: { width: '100%', maxWidth: '420px', height: '150px', border: '1px solid #bbb', borderRadius: '8px', background: '#fff', touchAction: 'none', display: 'block' } });
  const ctx = cv.getContext('2d');
  ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#111';
  const img0 = getImg();
  if (img0) { const im = new Image(); im.onload = () => ctx.drawImage(im, 0, 0, cv.width, cv.height); im.src = img0; }
  let drawing = false, dirty = false;
  const pos = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
  cv.addEventListener('pointerdown', (e) => { drawing = true; cv.setPointerCapture(e.pointerId); const [x, y] = pos(e); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 0.1, y + 0.1); ctx.stroke(); e.preventDefault(); });
  cv.addEventListener('pointermove', (e) => { if (!drawing) return; const [x, y] = pos(e); ctx.lineTo(x, y); ctx.stroke(); dirty = true; e.preventDefault(); });
  const end = () => { if (!drawing) return; drawing = false; setImg(cv.toDataURL('image/png')); };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  return h('div', null, h('label', { class: 'f' }, label), cv,
    h('button', { class: 'btn ghost small', style: { marginTop: '6px' }, onclick: () => { ctx.clearRect(0, 0, cv.width, cv.height); setImg(''); } }, 'Smazat podpis'));
}

export async function handoverView(root, id) {
  let q;
  try { q = await getQuote(id); } catch (e) { root.replaceChildren(h('div', { class: 'card' }, 'Nabídka nenalezena.')); return; }
  q.settlement = q.settlement || {};
  const isNew = !q.settlement.handover;
  if (isNew) {
    const src = (q.settlement.items && q.settlement.items.length ? q.settlement.items : q.items || []).filter((r) => r.name && r.typ !== 'mapei' && r.typ !== 'kabe');
    q.settlement.handover = {
      date: isoToday(), place: '', warranty: 24, noDefects: true, note: '', defects: [], nameC: q.customer_name || '', nameZ: '',
      works: src.map((r) => ({ name: r.name, qty: r.qty, unit: r.unit || '', done: true })), sigC: '', sigZ: '',
    };
  }
  const ho = q.settlement.handover;
  const state = h('span', { class: 'savestate' }, 'Uloženo');
  const saver = makeSaver((f) => saveQuote(q, f), 'Tento protokol', state);
  window.__flushSave = saver.flush; window.__isDirty = saver.isDirty;
  if (isNew) saver.touch();
  const touch = () => saver.touch();
  const bind = (k, num) => (e) => { ho[k] = num ? parseNum(e.target.value) : e.target.value; touch(); };
  const preview = h('div');
  const showPreview = () => { preview.replaceChildren(h('div', { class: 'preview-wrap', html: handoverDoc(q) })); preview.scrollIntoView({ behavior: 'smooth' }); };

  const worksBox = h('div'); const defBox = h('div');
  const noDefCb = h('input', { type: 'checkbox', style: { width: 'auto' }, checked: !!ho.noDefects, onchange: (e) => { ho.noDefects = e.target.checked; touch(); } });
  const setNoDef = (v) => { ho.noDefects = v; noDefCb.checked = v; };
  const drawWorks = () => {
    worksBox.replaceChildren(...ho.works.map((w, i) => h('div', { class: 'row', style: { gap: '6px', alignItems: 'center', marginBottom: '6px' } },
      h('input', { type: 'checkbox', style: { width: 'auto' }, checked: w.done !== false, onchange: (e) => { w.done = e.target.checked; touch(); } }),
      h('input', { type: 'text', value: w.name, style: { flex: 1 }, oninput: (e) => { w.name = e.target.value; touch(); } }),
      h('input', { type: 'text', class: 'num', value: w.qty ?? '', style: { width: '70px' }, oninput: (e) => { w.qty = parseNum(e.target.value); touch(); } }),
      h('input', { type: 'text', value: w.unit || '', style: { width: '50px' }, oninput: (e) => { w.unit = e.target.value; touch(); } }),
      h('button', { class: 'del', onclick: () => { ho.works.splice(i, 1); drawWorks(); touch(); } }, '×'))));
  };
  const drawDef = () => {
    defBox.replaceChildren(...ho.defects.map((d, i) => h('div', { class: 'row', style: { gap: '6px', alignItems: 'center', marginBottom: '6px' } },
      h('input', { type: 'text', value: d.text, placeholder: 'Popis vady / nedodělku', style: { flex: 1 }, oninput: (e) => { d.text = e.target.value; if (d.text) setNoDef(false); touch(); } }),
      h('input', { type: 'date', value: d.due || '', style: { width: '150px' }, oninput: (e) => { d.due = e.target.value; touch(); } }),
      h('button', { class: 'del', onclick: () => { ho.defects.splice(i, 1); drawDef(); touch(); } }, '×'))));
  };
  drawWorks(); drawDef();
  put(root,
    h('div', { class: 'pagehead' }, h('a', { href: '#/nabidka/' + q.id, class: 'btn ghost small' }, '← Zpět'), h('h1', null, 'Předávací protokol ' + q.number), state,
      h('button', { class: 'btn ghost small', onclick: showPreview }, 'Náhled'),
      h('button', { class: 'btn ghost small', onclick: (e) => { savePdfToDrive(handoverDoc(q), pdfName('Předávací protokol ' + q.number, q.customer_name), e.target, saver.flush()); } }, 'PDF na Disk'),
      h('button', { class: 'btn gold', onclick: async () => { await saver.flush(); printDoc(handoverDoc(q)); } }, 'PDF / Tisk')),
    h('div', { class: 'banner' }, 'Protokol se ukládá k nabídce. Podepsat se můžete prstem nebo myší přímo na displeji.'),
    h('div', { class: 'card' }, h('div', { class: 'grid c3' },
      fld('Datum předání', h('input', { type: 'date', value: ho.date || isoToday(), oninput: bind('date') })),
      fld('Místo (např. město)', h('input', { type: 'text', value: ho.place || '', oninput: bind('place') })),
      fld('Záruka (měsíců)', h('input', { type: 'text', inputmode: 'numeric', value: ho.warranty ?? '', oninput: bind('warranty') })))),
    h('div', { class: 'card' }, h('h2', null, 'Provedené práce'), h('p', { class: 'muted' }, 'Sestaveno z vyúčtování, případně nabídky (bez materiálu). U neprovedených prací zrušte zaškrtnutí.'), worksBox,
      h('button', { class: 'btn ghost small', onclick: () => { ho.works.push({ name: '', qty: '', unit: '', done: true }); drawWorks(); touch(); } }, '+ Přidat práci')),
    h('div', { class: 'card' }, h('h2', null, 'Vady a nedodělky'),
      h('label', { class: 'row', style: { gap: '6px', alignItems: 'center', marginBottom: '8px' } }, noDefCb, 'Dílo předáno bez vad a nedodělků'),
      defBox, h('button', { class: 'btn ghost small', onclick: () => { ho.defects.push({ text: '', due: '' }); setNoDef(false); drawDef(); touch(); } }, '+ Přidat vadu'),
      h('div', { style: { marginTop: '10px' } }, fld('Poznámka', h('textarea', { oninput: bind('note') }, ho.note || '')))),
    h('div', { class: 'card' }, h('h2', null, 'Podpisy'), h('div', { class: 'grid c2' },
      h('div', null, fld('Objednatel – jméno', h('input', { type: 'text', value: ho.nameC || '', oninput: bind('nameC') })), sigPad(() => ho.sigC, (v) => { ho.sigC = v; touch(); }, 'Podpis objednatele')),
      h('div', null, fld('Zhotovitel – jméno', h('input', { type: 'text', value: ho.nameZ || '', placeholder: S.firma && S.firma.name || '', oninput: bind('nameZ') })), sigPad(() => ho.sigZ, (v) => { ho.sigZ = v; touch(); }, 'Podpis zhotovitele')))),
    preview);
}
