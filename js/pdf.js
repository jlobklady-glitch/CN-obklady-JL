// Vytvoření PDF (A4) z dokumentu nabídky / vyúčtování / faktury a uložení na Google Disk.
import { toast } from './util.js';
import { driveReady, uploadToDrive } from './drive.js';

const loaded = {};
function loadScript(src) {
  if (loaded[src]) return loaded[src];
  return (loaded[src] = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = () => { delete loaded[src]; rej(new Error('Nepodařilo se načíst ' + src)); };
    document.head.append(s);
  }));
}

const W = 794; // šířka A4 při 96 dpi
const H = Math.round(W * 297 / 210);

// Vrátí Blob s PDF. Stránky se lámou na hranicích řádků a bloků, aby se text nepřeřízl.
export async function htmlToPdf(html) {
  await Promise.all([loadScript('vendor/html2canvas.min.js'), loadScript('vendor/jspdf.umd.min.js')]);
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${W}px;background:#fff;`;
  host.innerHTML = html;
  document.body.append(host);
  try {
    const imgs = [...host.querySelectorAll('img')];
    await Promise.all(imgs.map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))));
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const doc = host.querySelector('.doc');
    doc.style.width = W + 'px'; doc.style.padding = '38px'; doc.style.boxSizing = 'border-box';
    // části oddělené .pagebreak = vlastní stránky
    const chunks = [];
    let cur = [];
    [...doc.children].forEach((c) => { if (c.classList.contains('pagebreak')) { chunks.push(cur); cur = []; } else cur.push(c); });
    chunks.push(cur);
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
    const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
    let first = true;
    for (const nodes of chunks) {
      if (!nodes.length) continue;
      const part = document.createElement('div');
      part.className = 'doc'; part.style.cssText = `width:${W}px;padding:38px;box-sizing:border-box;background:#fff`;
      nodes.forEach((n) => part.append(n));
      host.innerHTML = ''; host.append(part);
      const top = part.getBoundingClientRect().top;
      const stops = [...part.querySelectorAll('tr, .parties, .boxes, .total, .small, .notebox, .terms, .band, .strip, .foot, .bar, .tag, .stripe, .keep > div')]
        .map((e) => Math.ceil(e.getBoundingClientRect().bottom - top)).sort((a, b) => a - b);
      const total = Math.ceil(part.getBoundingClientRect().height);
      const canvas = await window.html2canvas(part, { scale: 2, backgroundColor: '#fff', useCORS: true, logging: false, width: W, windowWidth: W });
      const k = canvas.width / W; // px canvasu na css px
      let y = 0, pageNo = 0;
      while (y < total - 1) {
        const lim = pageNo ? H - 64 : H; // další stránky mají nahoře i dole okraj
        let end = Math.min(total, y + lim);
        if (end < total) { const cand = stops.filter((s) => s > y + lim * 0.5 && s <= y + lim); if (cand.length) end = cand[cand.length - 1]; }
        const sh = Math.round((end - y) * k);
        const slice = document.createElement('canvas');
        slice.width = canvas.width; slice.height = sh;
        const ctx = slice.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(canvas, 0, Math.round(y * k), canvas.width, sh, 0, 0, canvas.width, sh);
        if (!first) pdf.addPage();
        first = false;
        pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', 0, pageNo ? 24 : 0, pw, (sh / canvas.width) * pw);
        y = end; pageNo++;
      }
    }
    return pdf.output('blob');
  } finally { host.remove(); }
}

const safe = (s) => String(s || '').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
export const pdfName = (number, who) => `${safe(number)}${who ? ' - ' + safe(who) : ''}.pdf`;

export async function savePdfToDrive(html, name, btn) {
  if (!driveReady()) return toast('Google Disk není připojen', 'err');
  if (btn) btn.disabled = true;
  toast('Vytvářím PDF…');
  try {
    const blob = await htmlToPdf(html);
    const r = await uploadToDrive(name, blob, 'JL-OBKLADY PDF');
    toast('Uloženo na Disk: JL-OBKLADY PDF / ' + r.name);
    return r;
  } catch (e) { toast('PDF se nepodařilo uložit: ' + e.message, 'err'); } finally { if (btn) btn.disabled = false; }
}
