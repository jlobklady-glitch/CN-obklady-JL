// Objednávka materiálu MAPEI: sestaví se z položek typu „Materiál MAPEI“ v nabídce, před odesláním lze vše upravit.
import { h, toast } from './util.js';
import { S, getQuote } from './store.js';
import { orderDoc, printDoc } from './doc.js';
import { savePdfToDrive, pdfName } from './pdf.js';

export async function orderView(root, id) {
  let q;
  try { q = await getQuote(id); } catch (e) { root.replaceChildren(h('div', { class: 'card' }, 'Nabídka nenalezena.')); return; }
  const rows = (q.items || []).filter((r) => r.typ === 'mapei' && r.name).map((r) => {
    const p = S.prices.find((x) => x.id === r.item_id);
    return { code: p ? p.code : '', name: p ? p.name : r.name, qty: r.qty, unit: r.unit || 'bal.', note: p ? `balení ${Number(p.pack) || 1} ${p.unit}` : '' };
  });
  const o = { quote: q, supplier: '', note: '', rows };
  const preview = h('div');
  const draw = () => { preview.replaceChildren(h('div', { class: 'preview-wrap', html: orderDoc(o) })); };
  const list = h('div', { class: 'prlist' });
  const drawList = () => list.replaceChildren(...o.rows.map((r, i) => {
    const f = (k, label, cls) => h('div', { class: 'pf ' + (cls || '') }, h('label', { class: 'f' }, label), h('input', { type: 'text', value: r[k] ?? '', oninput: (e) => { r[k] = e.target.value; draw(); } }));
    return h('div', { class: 'rc' }, h('div', { class: 'rc-grid' }, f('code', 'Kód'), f('name', 'Název produktu', 'wide'), f('qty', 'Množství'), f('unit', 'Jednotka'), f('note', 'Poznámka / balení', 'wide')),
      h('button', { class: 'del', onclick: () => { o.rows.splice(i, 1); drawList(); draw(); } }, '×'));
  }));
  root.replaceChildren(
    h('div', { class: 'pagehead' }, h('a', { href: '#/nabidka/' + q.id, class: 'btn ghost small' }, '← Zpět'), h('h1', null, 'Objednávka materiálu ' + q.number),
      h('button', { class: 'btn ghost small', onclick: (e) => savePdfToDrive(orderDoc(o), pdfName('Objednávka ' + q.number, o.supplier), e.target) }, 'PDF na Disk'),
      h('button', { class: 'btn gold', onclick: () => printDoc(orderDoc(o)) }, 'PDF / Tisk')),
    h('div', { class: 'banner' }, rows.length ? 'Sestaveno z položek „Materiál MAPEI“ v nabídce. Vše lze upravit, změny se do nabídky nepropisují.' : 'V nabídce nejsou žádné položky typu „Materiál MAPEI“. Řádky můžete přidat ručně.'),
    h('div', { class: 'card' }, h('div', { class: 'grid c2' },
      h('div', null, h('label', { class: 'f' }, 'Dodavatel / stavebniny'), h('input', { type: 'text', placeholder: 'Název a adresa dodavatele', oninput: (e) => { o.supplier = e.target.value; draw(); } })),
      h('div', null, h('label', { class: 'f' }, 'Poznámka k objednávce'), h('input', { type: 'text', oninput: (e) => { o.note = e.target.value; draw(); } })))),
    list,
    h('div', { class: 'row', style: { margin: '10px 0' } }, h('button', { class: 'btn ghost', onclick: () => { o.rows.push({ code: '', name: '', qty: '', unit: 'bal.', note: '' }); drawList(); } }, '+ Přidat řádek')),
    preview);
  drawList(); draw();
}
