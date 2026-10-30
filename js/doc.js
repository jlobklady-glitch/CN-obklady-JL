// A4 dokument cenové nabídky ve vzhledu Excelu + tisk do PDF.
import { h, esc, kc, num, fmtDate, addDays, parseNum } from './util.js';
import { S, lineTotal, quoteTotal, typeLabel } from './store.js';

export function quoteDoc(q) {
  const f = S.firma;
  const items = (q.items || []).filter((r) => r.name);
  const total = quoteTotal(items);
  const validTo = addDays(q.issued_on, q.valid_days || f.valid_days || 30);
  const c = S.contacts.find((x) => x.id === q.customer_id);
  const isPO = c && c.kind === 'PO';
  const cus = [
    ['Jméno / firma', q.customer_name],
    ['Adresa', q.customer_address],
    ...(isPO ? [['IČO', c.ico], ['DIČ', c.dic]] : []),
    ['Kontakt', q.customer_contact],
    ['Stavba', q.project],
  ].filter((r) => r[1] || r[0] === 'Jméno / firma');
  const rows = items.map((r, i) => `<tr>
    <td class="c">${i + 1}</td><td class="typ">${esc(typeLabel(r.typ))}</td><td>${esc(r.name)}</td>
    <td class="c">${esc(r.unit)}</td><td class="c">${num(r.qty)}</td><td class="r">${kc(r.price)}</td>
    <td class="c">${parseNum(r.disc) ? Math.round(parseNum(r.disc) * 100) + ' %' : ''}</td>
    <td class="tot">${kc(lineTotal(r))}</td></tr>`).join('');
  const html = `<div class="doc">
    <div class="bar"><div class="t1">JL-OBKLADY</div><div class="t2">CENOVÁ NABÍDKA</div></div>
    <div class="tag">${esc(f.tagline)}</div><div class="stripe"></div>
    <div class="parties">
      <div class="sup"><div class="lab">Dodavatel</div><b>${esc(f.name)}</b>
        <div>${esc(f.address)}</div><div>IČO: ${esc(f.ico)}</div>
        <div>${esc(f.phone)}${f.email ? ' · ' + esc(f.email) : ''}</div></div>
      <div class="cus"><div class="lab">Odběratel</div>
        ${cus.map(([l, v]) => `<div class="r"><span>${l}</span><b>${esc(v)}</b></div>`).join('')}</div>
    </div>
    <div class="boxes">
      <div><div class="bl">Číslo nabídky</div><div class="bv">${esc(q.number)}</div></div>
      <div><div class="bl">Datum vystavení</div><div class="bv">${fmtDate(q.issued_on)}</div></div>
      <div><div class="bl">Platnost do</div><div class="bv">${fmtDate(validTo)}</div></div>
    </div>
    <table class="dt"><thead><tr><th>#</th><th class="l">TYP</th><th class="l">POLOŽKA</th><th>MJ</th><th>MNOŽSTVÍ</th><th>CENA / MJ</th><th>SLEVA</th><th>CELKEM</th></tr></thead>
      <tbody>${rows}</tbody></table>
    <div class="keep">
    <div class="total"><div class="l">CELKEM K ÚHRADĚ</div><div class="v">${kc(total)}</div></div>
    <div class="small">Dodavatel není plátcem DPH – ceny jsou konečné.</div>
    <div class="lab" style="margin-top:3mm">Poznámka</div><div class="notebox">${esc(q.note)}</div>
    <div class="terms">${esc(f.terms)}</div>
    <div class="band">SLEDUJTE NÁS – INSTAGRAM @JL_OBKLADY · YOUTUBE @JL-OBKLADY</div>
    <img class="strip" src="assets/strip-cn.jpg" alt="">
    <div class="foot">${esc(f.name)} · ${esc(f.phone)} · ${esc(f.email)}</div></div>
  </div>`;
  return html;
}

export function printDoc(html) {
  const root = document.getElementById('print-root');
  root.innerHTML = html;
  document.body.classList.add('printing');
  const imgs = [...root.querySelectorAll('img')];
  Promise.all(imgs.map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))).then(() => {
    const done = () => { document.body.classList.remove('printing'); root.innerHTML = ''; window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    window.print();
  });
}
