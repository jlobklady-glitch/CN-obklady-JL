// A4 dokument cenové nabídky ve vzhledu Excelu + tisk do PDF.
import { h, esc, kc, num, fmtDate, addDays, parseNum, isoToday } from './util.js';
import { S, lineTotal, quoteTotal, typeLabel, DEFAULT_QA } from './store.js';
import { czIban, spayd, qrSvg } from './pay.js';

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
    <div class="small">Cena je orientační. Dodavatel není plátcem DPH – DPH se nepřičítá.</div>
    <div class="lab" style="margin-top:3mm">Poznámka</div><div class="notebox">${esc(q.note)}</div>
    <div class="terms">${esc(f.terms)}</div>
    <div class="band">SLEDUJTE NÁS – INSTAGRAM @JL_OBKLADY · YOUTUBE @JL-OBKLADY</div>
    <img class="strip" src="assets/strip-cn.jpg" alt="">
    <div class="foot">${esc(f.name)} · ${esc(f.phone)} · ${esc(f.email)}</div></div>
    ${q.premium ? premiumPage(q, total) : ''}
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

// ---------- finální vyúčtování ----------
function partiesHtml(q) {
  const f = S.firma;
  const c = S.contacts.find((x) => x.id === q.customer_id);
  const cus = [['Jméno / firma', q.customer_name], ['Adresa', q.customer_address],
    ...(c && c.kind === 'PO' ? [['IČO', c.ico], ['DIČ', c.dic]] : []), ['Kontakt', q.customer_contact], ['Stavba', q.project]].filter((r) => r[1] || r[0] === 'Jméno / firma');
  return `<div class="parties"><div class="sup"><div class="lab">Dodavatel</div><b>${esc(f.name)}</b><div>${esc(f.address)}</div><div>IČO: ${esc(f.ico)}</div>
    <div>${esc(f.phone)}${f.email ? ' · ' + esc(f.email) : ''}</div></div>
    <div class="cus"><div class="lab">Odběratel</div>${cus.map(([l, v]) => `<div class="r"><span>${l}</span><b>${esc(v)}</b></div>`).join('')}</div></div>`;
}
const headBar = (title) => `<div class="bar"><div class="t1">JL-OBKLADY</div><div class="t2">${title}</div></div><div class="tag">${esc(S.firma.tagline)}</div><div class="stripe"></div>`;
const footer = () => `<div class="band">SLEDUJTE NÁS – INSTAGRAM @JL_OBKLADY · YOUTUBE @JL-OBKLADY</div><img class="strip" src="assets/strip-vy.jpg" alt=""><div class="foot">${esc(S.firma.name)} · ${esc(S.firma.phone)} · ${esc(S.firma.email)}</div>`;

export function settlementTotals(q) {
  const st = q.settlement || {};
  const actual = quoteTotal(st.items || []);
  const offer = quoteTotal(q.items || []);
  const advance = parseNum(st.advance);
  return { actual, offer, advance, diff: actual - offer, due: actual - advance, bez: !!st.bez };
}

export function settlementDoc(q) {
  const st = q.settlement || {};
  const items = (st.items || []).filter((r) => r.name);
  const t = settlementTotals(q);
  const rows = items.map((r, i) => `<tr><td class="c">${i + 1}</td><td class="typ">${esc(typeLabel(r.typ))}</td><td>${esc(r.name)}</td><td class="c">${esc(r.unit)}</td>
    <td class="c">${num(r.qty)}</td><td class="r">${kc(r.price)}</td><td class="c">${parseNum(r.disc) ? Math.round(parseNum(r.disc) * 100) + ' %' : ''}</td><td class="tot">${kc(lineTotal(r))}</td></tr>`).join('');
  const sum = [];
  if (!t.bez) sum.push(['Celkem dle nabídky ' + esc(q.number), kc(t.offer)], ['Rozdíl oproti nabídce', kc(t.diff)]);
  if (t.advance) sum.push(['Uhrazená záloha', kc(-t.advance)]);
  return `<div class="doc">${headBar('FINÁLNÍ VYÚČTOVÁNÍ')}${partiesHtml(q)}
    <div class="boxes"><div><div class="bl">K nabídce č.</div><div class="bv">${t.bez ? 'bez CN' : esc(q.number)}</div></div>
      <div><div class="bl">Datum vyúčtování</div><div class="bv">${fmtDate(st.date || isoToday())}</div></div>
      <div><div class="bl">Stavba</div><div class="bv" style="font-size:10pt">${esc(q.project)}</div></div></div>
    <table class="dt"><thead><tr><th>#</th><th class="l">TYP</th><th class="l">POLOŽKA</th><th>MJ</th><th>MNOŽSTVÍ</th><th>CENA / MJ</th><th>SLEVA</th><th>CELKEM</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="keep">${sum.map(([l, v]) => `<div class="total" style="background:var(--sand)"><div class="l" style="background:var(--sand);color:var(--ink)">${l}</div><div class="v" style="background:var(--sand);color:var(--ink)">${v}</div></div>`).join('')}
    <div class="total"><div class="l">${t.advance ? 'DOPLATEK K ÚHRADĚ' : 'CELKEM K ÚHRADĚ'}</div><div class="v">${kc(t.due)}</div></div>
    <div class="small">Dodavatel není plátcem DPH – ceny jsou konečné.</div>
    <div class="lab" style="margin-top:3mm">Poznámka</div><div class="notebox">${esc(st.note)}</div>${footer()}</div></div>`;
}

// ---------- faktura ----------
export function invoiceDoc(inv) {
  const f = S.firma;
  const spd = spayd({ account: f.account, amount: Number(inv.amount), vs: inv.number, msg: 'Faktura ' + inv.number });
  const qr = qrSvg(spd);
  return `<div class="doc">${headBar('FAKTURA ' + esc(inv.number))}
    <div class="parties"><div class="sup"><div class="lab">Dodavatel</div><b>${esc(f.name)}</b><div>${esc(f.address)}</div><div>IČO: ${esc(f.ico)}</div>
      <div>${esc(f.phone)}${f.email ? ' · ' + esc(f.email) : ''}</div><div class="small" style="font-style:normal">Nejsem plátce DPH.</div></div>
      <div class="cus"><div class="lab">Odběratel</div>${[['Jméno / firma', inv.customer_name], ['Adresa', inv.customer_address], ['IČO / DIČ', inv.customer_ids]].filter((r) => r[1]).map(([l, v]) => `<div class="r"><span>${l}</span><b>${esc(v)}</b></div>`).join('')}</div></div>
    <div class="boxes"><div><div class="bl">Číslo faktury</div><div class="bv">${esc(inv.number)}</div></div>
      <div><div class="bl">Datum vystavení</div><div class="bv">${fmtDate(inv.issued_on)}</div></div>
      <div><div class="bl">Splatnost</div><div class="bv">${fmtDate(inv.due_on)}</div></div></div>
    <table class="dt"><thead><tr><th class="l">POPIS</th><th>CELKEM</th></tr></thead><tbody><tr><td style="white-space:pre-wrap">${esc(inv.description)}</td><td class="tot">${kc(inv.amount)}</td></tr></tbody></table>
    <div class="keep"><div class="total"><div class="l">CELKEM K ÚHRADĚ</div><div class="v">${kc(inv.amount)}</div></div>
    <div style="display:flex;gap:6mm;align-items:center;margin-top:5mm">
      <div style="flex:1;font-size:10pt"><div class="lab">Platební údaje</div>
        <div>Číslo účtu: <b>${esc(f.account)}</b>${f.bank ? ' (' + esc(f.bank) + ')' : ''}</div>
        <div>IBAN: ${esc(czIban(f.account))}</div><div>Variabilní symbol: <b>${esc(inv.number)}</b></div>
        <div>Částka: <b>${kc(inv.amount)}</b></div>
        ${inv.paid ? '<div style="color:var(--ok);font-weight:800;margin-top:2mm">ZAPLACENO</div>' : ''}</div>
      <div style="width:34mm;height:34mm">${qr}</div></div>
    <div class="small">Dodavatel není plátcem DPH. Fakturu lze uhradit načtením QR kódu v bankovní aplikaci.</div>${footer()}</div></div>`;
}

function premiumPage(q, base) {
  const extra = (q.premium_items || []).filter((r) => r.name);
  const sumExtra = quoteTotal(extra);
  const qa = (S.firma.qa && S.firma.qa.length ? S.firma.qa : DEFAULT_QA).filter((x) => x.show && x.q);
  const rows = extra.map((r) => `<tr><td colspan="2">${esc(r.name)}</td><td class="c">${esc(r.unit)}</td><td class="c">${num(r.qty)}</td><td class="r">${kc(r.price)}</td><td class="tot">${kc(lineTotal(r))}</td></tr>`).join('');
  return `<div class="pagebreak"></div>
    <div class="bar"><div class="t1">JL-OBKLADY</div><div class="t2">VARIANTA PREMIUM</div></div><div class="stripe"></div>
    <div style="font-weight:800;font-size:13pt;margin:4mm 0 2mm">Varianta PREMIUM · proč se vyplatí</div>
    <div style="font-size:9.5pt;color:#374151">Vedle standardního provedení nabízíme variantu PREMIUM – řešení, která prodlužují životnost, zlepšují hygienu a vzhled koupelny. Vybrat si můžete jednotlivé příplatky, nebo celý Premium balíček.</div>
    <div class="lab" style="margin-top:4mm">Příplatky za Premium</div>
    <table class="dt"><thead><tr><th class="l" colspan="2">POLOŽKA PREMIUM</th><th>MJ</th><th>MNOŽSTVÍ</th><th>CENA / MJ</th><th>CELKEM</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="total" style="background:var(--sand)"><div class="l" style="background:var(--sand);color:var(--ink)">Příplatky za Premium celkem</div><div class="v" style="background:var(--sand);color:var(--ink)">${kc(sumExtra)}</div></div>
    <div class="total"><div class="l">CENA – VARIANTA PREMIUM</div><div class="v">${kc(base + sumExtra)}</div></div>
    <div class="band" style="margin-top:6mm">NEJČASTĚJŠÍ OTÁZKY – PROČ SE PREMIUM VYPLATÍ</div>
    ${qa.map((x) => `<div class="keep" style="margin-top:3mm"><div style="font-weight:800;font-size:10pt">${esc(x.q)}</div><div style="font-size:9pt;margin-top:.8mm">${esc(x.a)}</div></div>`).join('')}`;
}
