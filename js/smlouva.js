// Smlouva o dílo: údaje se ukládají k nabídce (q.settlement.contract), text je v doc.js (contractDoc).
import { h, toast, makeSaver, isoToday, parseNum } from './util.js';
import { getQuote, saveQuote } from './store.js';
import { contractDoc, contractDefaults, printDoc } from './doc.js';
import { savePdfToDrive, pdfName } from './pdf.js';

const fld = (l, el, cls) => h('div', { class: cls || '' }, h('label', { class: 'f' }, l), el);

export async function contractView(root, id) {
  let q;
  try { q = await getQuote(id); } catch (e) { root.replaceChildren(h('div', { class: 'card' }, 'Nabídka nenalezena.')); return; }
  q.settlement = q.settlement || {};
  const isNew = !q.settlement.contract;
  if (isNew) q.settlement.contract = contractDefaults(q);
  const c = q.settlement.contract;
  const state = h('span', { class: 'savestate' }, 'Uloženo');
  const saver = makeSaver((f) => saveQuote(q, f), 'Tuto smlouvu', state);
  window.__flushSave = saver.flush; window.__isDirty = saver.isDirty;
  if (isNew) saver.touch();
  const bind = (k, num) => (e) => { c[k] = num ? parseNum(e.target.value) : e.target.value; saver.touch(); };
  const preview = h('div');
  const showPreview = () => { preview.replaceChildren(h('div', { class: 'preview-wrap', html: contractDoc(q) })); preview.scrollIntoView({ behavior: 'smooth' }); };
  const txt = (k, ph) => h('input', { type: 'text', value: c[k] ?? '', placeholder: ph || '', oninput: bind(k) });
  root.replaceChildren(
    h('div', { class: 'pagehead' }, h('a', { href: '#/nabidka/' + q.id, class: 'btn ghost small' }, '← Zpět'), h('h1', null, 'Smlouva o dílo ' + q.number), state,
      h('button', { class: 'btn ghost small', onclick: showPreview }, 'Náhled'),
      h('button', { class: 'btn ghost small', onclick: (e) => { savePdfToDrive(contractDoc(q), pdfName('Smlouva o dílo ' + q.number, q.customer_name), e.target, saver.flush()); } }, 'PDF na Disk'),
      h('button', { class: 'btn gold', onclick: async () => { await saver.flush(); printDoc(contractDoc(q)); } }, 'PDF / Tisk')),
    h('div', { class: 'banner' }, 'Údaje o objednateli a zhotoviteli, cena a rozsah se berou z nabídky. Zde doplníte termíny, zálohu a záruku. Text smlouvy vychází ze vzoru od právníka. Smlouvu vždy předejte na papíře a podepište oběma stranami.'),
    h('div', { class: 'card' }, h('h2', null, 'Smluvní údaje'), h('div', { class: 'grid c3' },
      fld('Datum podpisu', h('input', { type: 'date', value: c.date || isoToday(), oninput: bind('date') })),
      fld('Místo podpisu', txt('place', 'např. Brandýs nad Orlicí')),
      fld('Záruka (měsíců)', h('input', { type: 'text', inputmode: 'numeric', value: c.warranty ?? '', oninput: bind('warranty') })),
      fld('Zahájení prací', h('input', { type: 'date', value: c.from || '', oninput: bind('from') })),
      fld('Dokončení prací', h('input', { type: 'date', value: c.to || '', oninput: bind('to') })),
      fld('Splatnost konečné faktury (dní)', h('input', { type: 'text', inputmode: 'numeric', value: c.finalDue ?? '', oninput: bind('finalDue') })),
      fld('Záloha (Kč, prázdné = bez zálohy)', h('input', { type: 'text', inputmode: 'decimal', value: c.advance ?? '', oninput: bind('advance') })),
      fld('Záloha splatná do (např. 5 dnů od vystavení)', txt('advanceDue')),
      fld('Datum narození objednatele', h('input', { type: 'date', value: c.birth || '', oninput: bind('birth') })),
      fld('Bankovní spojení objednatele (nepovinné)', txt('bank')),
      fld('Za objednatele jedná (pokud jiná osoba)', txt('techC')),
      fld('Za zhotovitele jedná', txt('techZ')))),
    h('div', { class: 'card' }, h('h2', null, 'Rozsah prací'), h('p', { class: 'muted' }, 'Stručný výčet do čl. A. Předvyplněno z položek nabídky, upravte podle potřeby. Podrobný rozpis je v příloze č. 1 (nabídce).'),
      h('textarea', { rows: 4, oninput: bind('works') }, c.works || '')),
    h('div', { class: 'card' }, h('h2', null, 'Spotřebitel a fotografie'),
      h('label', { class: 'row', style: { gap: '6px', alignItems: 'center', marginBottom: '8px' } }, h('input', { type: 'checkbox', style: { width: 'auto' }, checked: !!c.startBefore, onchange: (e) => { c.startBefore = e.target.checked; saver.touch(); } }), 'Zákazník výslovně žádá o zahájení prací před uplynutím 14 dnů na odstoupení (jen u spotřebitele)'),
      fld('Souhlas s použitím fotografií na webu a sociálních sítích', h('select', { onchange: bind('photoConsent') }, [['', 'Nezvoleno'], ['ano', 'Souhlasí'], ['ne', 'Nesouhlasí']].map(([v, l]) => h('option', { value: v, selected: (c.photoConsent || '') === v }, l))))),
    preview);
}
