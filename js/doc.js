// A4 dokument cenové nabídky ve vzhledu Excelu + tisk do PDF.
import { h, esc, kc, num, fmtDate, addDays, parseNum, isoToday } from './util.js';
import { S, lineTotal, quoteTotal, typeLabel, DEFAULT_QA, firmaFor } from './store.js';

// Dodavatel aktuálně vykreslovaného dokladu (podle toho, kdo doklad vystavil)
let F = S.firma;
import { czIban, spayd, qrDueDate, qrSvg, PACKAGE_FEE, packageUrl } from './pay.js';

export function quoteDoc(q) {
  F = firmaFor(q);
  const f = F;
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
    <td class="c">${parseNum(r.disc) ? Math.round(parseNum(r.disc) * 1000) / 10 + ' %' : ''}</td>
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
    ${subtotals(items)}
    <div class="total"><div class="l">CELKEM K ÚHRADĚ</div><div class="v">${kc(total)}</div></div>
    <div class="small">Cena je orientační. Dodavatel není plátcem DPH, cena je tedy konečná a žádná další daň se k ní nepřipočítává.</div>
    <div class="lab" style="margin-top:3mm">Poznámka</div><div class="notebox">${esc(q.note)}</div>
    <div class="terms">${esc(f.terms)}</div>
    ${consumerInfo(f)}
    <div class="band">SLEDUJTE NÁS – INSTAGRAM @JL_OBKLADY · YOUTUBE @JL_OBKLADY</div>
    <img class="strip" src="assets/strip-cn.jpg" alt="">
    <div class="foot">${esc(f.name)} · ${esc(f.phone)} · ${esc(f.email)}</div></div>
    ${q.premium ? premiumPage(q, total) : ''}
    ${q.show_package ? packagePage(q) : ''}
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
  const f = F;
  const c = S.contacts.find((x) => x.id === q.customer_id);
  const cus = [['Jméno / firma', q.customer_name], ['Adresa', q.customer_address],
    ...(c && c.kind === 'PO' ? [['IČO', c.ico], ['DIČ', c.dic]] : []), ['Kontakt', q.customer_contact], ['Stavba', q.project]].filter((r) => r[1] || r[0] === 'Jméno / firma');
  return `<div class="parties"><div class="sup"><div class="lab">Dodavatel</div><b>${esc(f.name)}</b><div>${esc(f.address)}</div><div>IČO: ${esc(f.ico)}</div>
    <div>${esc(f.phone)}${f.email ? ' · ' + esc(f.email) : ''}</div></div>
    <div class="cus"><div class="lab">Odběratel</div>${cus.map(([l, v]) => `<div class="r"><span>${l}</span><b>${esc(v)}</b></div>`).join('')}</div></div>`;
}
const headBar = (title) => `<div class="bar"><div class="t1">JL-OBKLADY</div><div class="t2">${title}</div></div><div class="tag">${esc(F.tagline)}</div><div class="stripe"></div>`;
const footer = () => `<div class="band">SLEDUJTE NÁS – INSTAGRAM @JL_OBKLADY · YOUTUBE @JL_OBKLADY</div><img class="strip" src="assets/strip-vy.jpg" alt=""><div class="foot">${esc(F.name)} · ${esc(F.phone)} · ${esc(F.email)}</div>`;

export function settlementTotals(q) {
  const st = q.settlement || {};
  const actual = quoteTotal(st.items || []);
  const offer = Number.isFinite(Number(st.offer)) && st.offer !== undefined && st.offer !== null && st.offer !== '' ? Number(st.offer) : quoteTotal(q.items || []); // částka nabídky v době vzniku vyúčtování
  const advance = parseNum(st.advance);
  return { actual, offer, advance, diff: actual - offer, due: actual - advance, bez: !!st.bez };
}

// Stav vyúčtování: ručně Rozpracované → Zasláno → Schváleno; „Fakturováno“ se pozná samo podle vystavené faktury k zakázce.
export const SET_STATES = [['rozpracovane', 'Rozpracované'], ['zaslano', 'Zasláno zákazníkovi'], ['schvaleno', 'Schváleno zákazníkem']];
export function settlementStatus(q, invoices = []) {
  if (invoices.some((i) => i.quote_id === q.id)) return { key: 'fakturovano', label: 'Fakturováno' };
  const k = (q.settlement && q.settlement.state) || 'rozpracovane';
  return { key: k, label: (SET_STATES.find((x) => x[0] === k) || SET_STATES[0])[1] };
}

export function settlementDoc(q) {
  F = firmaFor(q);
  const st = q.settlement || {};
  const items = (st.items || []).filter((r) => r.name);
  const t = settlementTotals(q);
  const pct = (x) => (x > 0.0005 ? String(Math.round(x * 1000) / 10).replace('.', ',') + ' %' : '');
  const rows = items.map((r, i) => {
    const p = parseNum(r.price), d = Math.min(Math.max(parseNum(r.disc), 0), 1);
    const after = Math.round(p * (1 - d) * 100) / 100;
    const list = p; // ceníková cena = cena řádku; sleva je jen ta, kterou jste dali zákazníkovi (nákupní sleva z Nastavení se v dokladu neukazuje)
    const sl = d;
    return `<tr><td class="c">${i + 1}</td><td class="typ">${esc(typeLabel(r.typ))}</td><td>${esc(r.name)}</td><td class="c">${esc(r.unit)}</td>
    <td class="c">${num(r.qty)}</td><td class="r">${kc(Math.round(list * 100) / 100)}</td><td class="c">${pct(sl)}</td><td class="r">${kc(after)}</td><td class="tot">${kc(lineTotal(r))}</td></tr>`;
  }).join('');
  const sum = [];
  const sp = splitTotals(items);
  if (sp.hasWork || sp.hasMat) sum.push(['Práce celkem (včetně dopravy)', kc(sp.work)], ['Materiál celkem', kc(sp.mat)]);
  if (!t.bez) sum.push(['Celkem dle nabídky ' + esc(q.number), kc(t.offer)], ['Rozdíl oproti nabídce', kc(t.diff)]);
  if (t.advance) sum.push(['Uhrazená záloha', kc(-t.advance)]);
  return `<div class="doc">${headBar('KONEČNÉ VYÚČTOVÁNÍ')}${partiesHtml(q)}
    <div class="boxes"><div><div class="bl">K nabídce č.</div><div class="bv">${t.bez ? 'bez CN' : esc(q.number)}</div></div>
      <div><div class="bl">Datum vyúčtování</div><div class="bv">${fmtDate(st.date || isoToday())}</div></div>
      <div><div class="bl">Stavba</div><div class="bv" style="font-size:10pt">${esc(q.project)}</div></div></div>
    <table class="dt"><thead><tr><th>#</th><th class="l">TYP</th><th class="l">POLOŽKA</th><th>MJ</th><th>MNOŽSTVÍ</th><th>CENÍKOVÁ CENA / MJ</th><th>SLEVA</th><th>CENA PO SLEVĚ / MJ</th><th>CELKEM</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="keep">${sum.map(([l, v]) => `<div class="total" style="background:var(--sand)"><div class="l" style="background:var(--sand);color:var(--ink)">${l}</div><div class="v" style="background:var(--sand);color:var(--ink)">${v}</div></div>`).join('')}
    <div class="total"><div class="l">${t.advance ? 'DOPLATEK K ÚHRADĚ' : 'CELKEM K ÚHRADĚ'}</div><div class="v">${kc(t.due)}</div></div>
    <div class="small">Dodavatel není plátcem DPH – ceny jsou konečné.</div>
    <div class="lab" style="margin-top:3mm">Poznámka</div><div class="notebox">${esc(st.note)}</div>${footer()}</div></div>`;
}

// ---------- faktura ----------
export function invoiceDoc(inv) {
  F = firmaFor(inv);
  const f = F;
  const spd = spayd({ account: f.account, amount: Number(inv.amount), vs: inv.number, msg: 'Faktura ' + inv.number, due: qrDueDate(inv.issued_on, inv.due_on) });
  const qr = qrSvg(spd);
  return `<div class="doc">${headBar('FAKTURA ' + esc(inv.number))}
    <div class="parties"><div class="sup"><div class="lab">Dodavatel</div><b>${esc(f.name)}</b><div>${esc(f.address)}</div><div>IČO: ${esc(f.ico)}</div>
      <div>${esc(f.phone)}${f.email ? ' · ' + esc(f.email) : ''}</div><div class="small" style="font-style:normal">Nejsem plátce DPH.</div></div>
      <div class="cus"><div class="lab">Odběratel</div>${[['Jméno / firma', inv.customer_name], ['Adresa', inv.customer_address], ['IČO / DIČ', inv.customer_ids]].filter((r) => r[1]).map(([l, v]) => `<div class="r"><span>${l}</span><b>${esc(v)}</b></div>`).join('')}</div></div>
    <div class="boxes"><div><div class="bl">Číslo faktury</div><div class="bv">${esc(inv.number)}</div></div>
      <div><div class="bl">Datum vystavení</div><div class="bv">${fmtDate(inv.issued_on)}</div></div>
      <div><div class="bl">Datum zdanitelného plnění</div><div class="bv">${fmtDate(inv.taxable_on || inv.issued_on)}</div></div>
      <div><div class="bl">Splatnost</div><div class="bv">${fmtDate(inv.due_on)}</div></div></div>
    <table class="dt"><thead><tr><th class="l">POPIS</th><th>CELKEM</th></tr></thead><tbody><tr><td style="white-space:pre-wrap">${esc(inv.description)}</td><td class="tot">${kc(inv.amount)}</td></tr></tbody></table>
    <div class="keep"><div class="total"><div class="l">CELKEM K ÚHRADĚ</div><div class="v">${kc(inv.amount)}</div></div>
    <div style="display:flex;gap:6mm;align-items:center;margin-top:5mm">
      <div style="flex:1;font-size:10pt"><div class="lab">Platební údaje</div>
        <div>Příjemce: <b>${esc(f.name)}</b></div>
        <div>Číslo účtu: <b>${esc(f.account)}</b>${f.bank ? ' (' + esc(f.bank) + ')' : ''}</div>
        <div>IBAN: ${esc(czIban(f.account))}</div><div>Variabilní symbol: <b>${esc(inv.number)}</b></div>
        <div>Částka: <b>${kc(inv.amount)}</b> · splatnost: <b>${fmtDate(inv.due_on)}</b></div>
        ${inv.paid ? '<div style="color:var(--ok);font-weight:800;margin-top:2mm">ZAPLACENO</div>' : ''}</div>
      <div style="width:34mm;height:34mm">${qr}</div></div>
    <div style="margin-top:4mm;padding:2.5mm 3mm;border:1.5px solid var(--ink);border-radius:2mm;background:var(--sand);font-weight:800;font-size:10.5pt">Před odesláním platby si prosím zkontrolujte číslo účtu, částku a variabilní symbol.</div>
    <div class="small">Dodavatel není plátcem DPH. Fakturu lze uhradit načtením QR kódu v bankovní aplikaci.</div>${footer()}</div></div>`;
}

// Mezisoučty práce a materiálu (jen když nabídka obsahuje obojí)
// práce = práce, pokládka obkladu/dlažby a doprava; materiál = ostatní řádky
export const isWorkRow = (r) => ['prace', 'stena', 'podlaha'].includes(r.typ) || /doprav/i.test(r.name || '');
export function splitTotals(items) {
  const work = items.filter(isWorkRow), mat = items.filter((r) => !isWorkRow(r));
  return { work: quoteTotal(work), mat: quoteTotal(mat), hasWork: work.length > 0, hasMat: mat.length > 0 };
}
function subtotals(items) {
  const t = splitTotals(items);
  if (!t.hasWork || !t.hasMat) return '';
  const row = (l, v) => `<div style="display:flex;justify-content:space-between;font-size:10pt;padding:1mm 3mm;border-bottom:1px solid #ddd"><span>${l}</span><b>${kc(v)}</b></div>`;
  return `<div style="margin:2mm 0">${row('Práce celkem (včetně dopravy)', t.work)}${row('Materiál celkem (orientační, dle ceníkových cen)', t.mat)}</div>`;
}

function packagePage(q) {
  const url = packageUrl(q.package_token);
  const li = (b, t) => `<div class="keep" style="margin-top:3mm;padding-left:7mm;position:relative"><span style="position:absolute;left:0;top:0;font-weight:800;color:#b8975a">&#10003;</span><div style="font-weight:800;font-size:10.5pt">${b}</div><div style="font-size:9.5pt;margin-top:.6mm">${t}</div></div>`;
  return `<div class="pagebreak"></div>
    <div class="bar"><div class="t1">JL-OBKLADY</div><div class="t2">BALÍČEK: ROZPOČET A ZAMĚŘENÍ</div></div><div class="stripe"></div>
    <div style="font-weight:800;font-size:13pt;margin:4mm 0 2mm">Přesná cena a jistota termínu</div>
    <div style="font-size:9.5pt;color:#374151">Cena v této nabídce je orientační: práce a materiál jsou spočítané z rozměrů, které jste zadali, bez samotného obkladu a dlažby. Chcete-li přesný rozpočet s vybraným materiálem a pevný termín zahájení, objednejte si náš balíček. <b>Celá jeho cena se vám na konci zakázky odečte z konečné ceny.</b></div>
    <div class="total" style="margin-top:4mm"><div class="l">CENA BALÍČKU</div><div class="v">${kc(PACKAGE_FEE)}</div></div>
    <div class="lab" style="margin-top:5mm">Co v balíčku získáte</div>
    ${li('Rezervace termínu', 'Termín zahájení domluvíme podle vaší stavby a její připravenosti. Po zaplacení ho držíme pro vás.')}
    ${li('Položkový rozpočet včetně materiálu', 'Rozpis všech prací i materiálů s cenami, takže předem přesně víte, za co platíte.')}
    ${li('Zaměření a schůzka přímo na místě', 'Probereme rozložení obkladů a dlažby, návaznosti, rohy, niky i sprchový kout a navrhneme řešení.')}
    ${li('Orientační měření vlhkosti podkladu', 'U podlahového topení po provedené nátopové zkoušce zkontrolujeme, zda je podklad připravený na pokládku.')}
    <div class="keep" style="margin-top:7mm;display:flex;gap:8mm;align-items:center">
      ${url ? `<div style="width:30mm;height:30mm;flex:none">${qrSvg(url)}</div>` : ''}
      <div style="font-size:9.5pt"><div style="font-weight:800;font-size:10.5pt">Jak balíček objednat</div>
        ${url ? `Naskenujte QR kód nebo otevřete odkaz a potvrďte objednávku. Pošleme vám platební údaje s QR kódem.<div style="margin-top:1.5mm;word-break:break-all;font-size:8.5pt;color:#555">${esc(url)}</div>` : 'Stačí nám zavolat nebo napsat. Pošleme vám platební údaje s QR kódem.'}
        <div style="margin-top:1.5mm">${esc(F.phone)}${F.email ? ' · ' + esc(F.email) : ''}</div></div></div>
    ${footer()}`;
}

function premiumPage(q, base) {
  const extra = (q.premium_items || []).filter((r) => r.name);
  const sumExtra = quoteTotal(extra);
  const qa = (F.qa && F.qa.length ? F.qa : DEFAULT_QA).filter((x) => x.show && x.q);
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

// ---------- objednávka materiálu pro dodavatele ----------
export function orderDoc(o) {
  F = firmaFor(o.quote || {});
  const f = F;
  const rows = (o.rows || []).filter((r) => r.name).map((r, i) => `<tr><td class="c">${i + 1}</td><td>${esc(r.code)}</td><td>${esc(r.name)}</td><td class="c">${num(r.qty)}</td><td class="c">${esc(r.unit)}</td><td class="typ">${esc(r.note)}</td></tr>`).join('');
  return `<div class="doc">${headBar('OBJEDNÁVKA MATERIÁLU')}
    <div class="parties"><div class="sup"><div class="lab">Dodavatel / stavebniny</div><b>${esc(o.supplier || '')}</b></div>
      <div class="cus"><div class="lab">Odběratel</div><b>${esc(f.name)}</b><div>${esc(f.address)}</div><div>IČO: ${esc(f.ico)}</div><div>${esc(f.email)} · ${esc(f.phone)}</div></div></div>
    <div class="boxes"><div><div class="bl">Zakázka</div><div class="bv" style="font-size:10pt">${esc(o.quote ? o.quote.number : '')}${o.quote && o.quote.customer_name ? ' – ' + esc(o.quote.customer_name) : ''}</div></div>
      <div><div class="bl">Datum</div><div class="bv">${fmtDate(isoToday())}</div></div><div></div></div>
    <table class="dt"><thead><tr><th>#</th><th class="l">KÓD</th><th class="l">NÁZEV PRODUKTU</th><th>MNOŽSTVÍ</th><th>JEDNOTKA</th><th class="l">POZNÁMKA</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="keep"><div class="lab" style="margin-top:3mm">Poznámka k objednávce</div><div class="notebox">${esc(o.note)}</div>${footer()}</div></div>`;
}

// Předávací protokol (data jsou v q.settlement.handover)
export function handoverDoc(q) {
  F = firmaFor(q);
  const f = F; const ho = (q.settlement && q.settlement.handover) || {};
  const works = (ho.works || []).filter((w) => w.name);
  const rows = works.map((w, i) => `<tr><td class="c">${i + 1}</td><td>${esc(w.name)}</td><td class="c">${w.qty !== '' && w.qty != null ? num(w.qty) : ''}</td><td class="c">${esc(w.unit || '')}</td><td class="c">${w.done === false ? 'ne' : 'ano'}</td></tr>`).join('');
  const defects = (ho.defects || []).filter((d) => d.text);
  const defRows = defects.map((d, i) => `<tr><td class="c">${i + 1}</td><td>${esc(d.text)}</td><td class="c">${d.due ? fmtDate(d.due) : ''}</td></tr>`).join('');
  const decl = ho.noDefects || !defects.length
    ? 'Objednatel prohlašuje, že dílo převzal bez zjevných vad a nedodělků.'
    : 'Objednatel dílo převzal s níže uvedenými vadami a nedodělky, které se zhotovitel zavazuje odstranit v uvedených termínech.';
  const sig = (img, who, name) => `<div style="flex:1"><div style="height:26mm;border-bottom:1px solid #222;display:flex;align-items:flex-end;justify-content:center">${img ? `<img src="${img}" style="max-height:24mm;max-width:100%">` : ''}</div><div style="font-size:9pt;margin-top:1mm"><b>${who}</b><br>${esc(name || '')}</div></div>`;
  return `<div class="doc">${headBar('PŘEDÁVACÍ PROTOKOL')}
    <div class="parties"><div class="sup"><div class="lab">Zhotovitel</div><b>${esc(f.name)}</b><div>${esc(f.address)}</div><div>IČO: ${esc(f.ico)}</div><div>${esc(f.email)} · ${esc(f.phone)}</div></div>
      <div class="cus"><div class="lab">Objednatel</div><b>${esc(q.customer_name || '')}</b><div>${esc(q.customer_address || '')}</div><div>${esc(q.customer_contact || '')}</div></div></div>
    <div class="boxes"><div><div class="bl">Zakázka</div><div class="bv" style="font-size:10pt">${esc(q.number)}${q.project ? ' – ' + esc(q.project) : ''}</div></div>
      <div><div class="bl">Datum předání</div><div class="bv">${fmtDate(ho.date || isoToday())}</div></div><div><div class="bl">Záruka</div><div class="bv" style="font-size:10pt">${ho.warranty ? esc(ho.warranty) + ' měs.' : '—'}</div></div></div>
    <div class="lab" style="margin-top:3mm">Provedené práce</div>
    <table class="dt"><thead><tr><th>#</th><th class="l">POPIS PRÁCE</th><th>MNOŽSTVÍ</th><th>MJ</th><th>PROVEDENO</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="keep"><div class="lab" style="margin-top:3mm">Zjištěné vady a nedodělky</div>
    ${defects.length ? `<table class="dt"><thead><tr><th>#</th><th class="l">POPIS</th><th>TERMÍN ODSTRANĚNÍ</th></tr></thead><tbody>${defRows}</tbody></table>` : '<div class="notebox">Žádné.</div>'}
    <div style="margin-top:3mm;font-size:9.5pt">${decl}</div>
    ${ho.note ? `<div class="lab" style="margin-top:3mm">Poznámka</div><div class="notebox">${esc(ho.note)}</div>` : ''}
    ${ho.photoConsent ? `<div style="margin-top:3mm;font-size:9.5pt">Objednatel ${ho.photoConsent === 'ano' ? '<b>souhlasí</b>' : '<b>nesouhlasí</b>'} s použitím fotografií hotového díla bez identifikace osob a adresy na webu a sociálních sítích zhotovitele. Souhlas je dobrovolný a lze jej kdykoli odvolat.</div>` : ''}
    <div style="display:flex;gap:12mm;margin-top:8mm">${sig(ho.sigC, 'Objednatel (převzal)', ho.nameC || q.customer_name)}${sig(ho.sigZ, 'Zhotovitel (předal)', ho.nameZ || f.name)}</div>
    <div style="font-size:8.5pt;margin-top:2mm;color:#555">V ${esc(ho.place || '')} dne ${fmtDate(ho.date || isoToday())}</div>${footer()}</div></div>`;
}


// Informace spotřebiteli podle § 1820 občanského zákoníku (smlouva na dálku / mimo obchodní prostory) a § 14 zákona o ochraně spotřebitele
export function consumerInfo(f) {
  return `<div class="keep" style="margin-top:3mm;font-size:8.3pt;line-height:1.35;color:#374151">
    <div class="lab">Informace pro spotřebitele (§ 1820 občanského zákoníku)</div>
    <div><b>Dodavatel:</b> ${esc(f.name)}, ${esc(f.address)}, IČO ${esc(f.ico)}, tel. ${esc(f.phone)}${f.email ? ', e-mail ' + esc(f.email) : ''}. Obchodní prostory pro styk se zákazníky nemáme, práce provádíme v místě zakázky.</div>
    <div><b>Cena a platba:</b> cena je orientační, konečná cena vyplyne z vyúčtování skutečně provedených prací. Dodavatel není plátcem DPH. Platba bankovním převodem, případnou zálohu a splatnost stanoví smlouva o dílo nebo faktura.</div>
    <div><b>Právo odstoupit od smlouvy:</b> bude-li smlouva uzavřena na dálku (e-mailem, telefonem) nebo mimo obchodní prostory dodavatele (např. v místě vaší nemovitosti), můžete od ní jako spotřebitel odstoupit bez udání důvodu do 14 dnů od jejího uzavření (§ 1829 občanského zákoníku). Stačí jednoznačné prohlášení zaslané na výše uvedenou adresu nebo e-mail dodavatele, můžete využít vzorový formulář, který obdržíte se smlouvou. Požádáte-li o zahájení prací před uplynutím této lhůty, uhradíte při odstoupení poměrnou část ceny za plnění poskytnuté do odstoupení (§ 1834). Právo odstoupit zaniká, jakmile je dílo s vaším výslovným souhlasem v plném rozsahu provedeno a byli jste o tom předem poučeni (§ 1837 písm. a).</div>
    <div><b>Vady a záruka:</b> dílo provádíme s odbornou péčí a odpovídáme za vady podle občanského zákoníku. Délku případné záruky za jakost uvede smlouva o dílo a předávací protokol. Vady oznamte bez zbytečného odkladu e-mailem nebo dopisem, do 15 dnů vám sdělíme, zda reklamaci uznáváme.</div>
    <div><b>Mimosoudní řešení sporů:</b> subjektem mimosoudního řešení spotřebitelských sporů je Česká obchodní inspekce, Štěpánská 567/15, 120 00 Praha 2, www.coi.cz (adr.coi.cz).</div>
    <div><b>Osobní údaje:</b> zpracováváme je jen pro přípravu nabídky a plnění smlouvy a dále je nepředáváme. Podrobnosti najdete v zásadách ochrany osobních údajů na našem webu.</div>
  </div>`;
}


// ---------- Smlouva o dílo (vzor od právníka upravený pro JL-OBKLADY; data v q.settlement.contract) ----------
export function contractDefaults(q) {
  const f = firmaFor(q);
  const names = (q.items || []).filter((r) => r.name && (r.typ === 'prace' || r.typ === 'ostatni')).map((r) => {
    const nm = String(r.name).split('|')[0].trim(); const qy = parseNum(r.qty);
    return qy ? `${nm} – ${String(qy).replace('.', ',')} ${r.unit || ''}`.trim() : nm;
  });
  return { date: isoToday(), place: '', from: '', to: '', advance: '', advanceDue: '', finalDue: 7, warranty: 36, birth: '', bank: '', techC: '', techZ: f.name || '', works: names.join('\n'), overrun: 10, hourly: '', startBefore: false, photoConsent: '' };
}

const worksList = (w) => {
  const t = String(w || '').trim();
  const lines = (t.includes('\n') ? t.split('\n') : t.split(';')).map((x) => x.trim()).filter(Boolean);
  return lines.length ? `<ul style="margin:1mm 0 0;padding-left:5mm">${lines.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ' ………';
};

export function contractDoc(q) {
  F = firmaFor(q);
  const f = F; const c = { ...contractDefaults(q), ...((q.settlement && q.settlement.contract) || {}) };
  const items = (q.items || []).filter((r) => r.name);
  const total = quoteTotal(items);
  const dots = (v, n = 18) => (v ? esc(v) : '.'.repeat(n));
  const d = (v) => (v ? fmtDate(v) : '..........');
  const art = (letter, title, body) => `<div class="keep" style="margin-top:3.5mm"><div style="font-weight:800;font-size:10.5pt">${letter}. ${title}</div><div style="font-size:9.3pt;line-height:1.38">${body}</div></div>`;
  const ol = (arr) => `<ol style="margin:1mm 0 0;padding-left:5mm">${arr.map((x) => `<li style="margin-bottom:.8mm">${x}</li>`).join('')}</ol>`;
  const adv = parseNum(c.advance);
  const pay = [
    adv ? `Objednatel uhradí zálohu ve výši ${kc(adv)} ${c.advanceDue ? 'do ' + esc(String(c.advanceDue)) + ' ' : ''}na základě zálohové faktury zhotovitele.` : 'Záloha se nesjednává.',
    `Po dokončení prací zhotovitel vystaví konečnou fakturu (finální vyúčtování skutečně provedených prací) se zápočtem uhrazené zálohy, se splatností ${esc(String(c.finalDue || 7))} kalendářních dní.`,
    'Platba se provádí bankovním převodem na účet zhotovitele uvedený na faktuře.'];
  const html = `<div class="doc">${headBar('SMLOUVA O DÍLO')}
    <div style="text-align:center;font-size:9pt;margin:1mm 0 2mm">uzavřená podle § 2586 a násl. zákona č. 89/2012 Sb., občanský zákoník</div>
    <div class="parties">
      <div class="cus"><div class="lab">Objednatel</div><b>${esc(q.customer_name || '')}</b>
        <div>Trvalý pobyt / sídlo: ${dots(q.customer_address, 12)}</div><div>Datum narození: ${c.birth ? fmtDate(c.birth) : '..........'}</div>
        <div>Kontakt: ${dots(q.customer_contact, 12)}</div>${c.bank ? `<div>Bankovní spojení: ${esc(c.bank)}</div>` : ''}
        <div style="margin-top:1mm">Za objednatele ve věcech smluvních i technických jedná: ${dots(c.techC || q.customer_name, 12)}</div></div>
      <div class="sup"><div class="lab">Zhotovitel</div><b>${esc(f.name)}</b>
        <div>Adresa: ${esc(f.address)}</div><div>Oprávnění: fyzická osoba zapsaná v živnostenském rejstříku</div>
        <div>IČO: ${esc(f.ico)} · DIČ: není plátcem DPH</div><div>Bankovní spojení: ${esc(f.bank || '')} ${esc(f.account || '')}</div>
        <div style="margin-top:1mm">Za zhotovitele ve věcech smluvních i technických jedná: ${esc(c.techZ || f.name)}</div></div>
    </div>
    <div style="margin-top:2mm;font-size:9.3pt">uzavírají tuto smlouvu o dílo (dále jen „smlouva“):</div>
    <div style="margin-top:2mm;font-size:9.3pt"><b>Název akce a místo plnění:</b> „${esc(q.project || '')}“</div>
    ${art('A', 'Předmět smlouvy', ol([
      `Zhotovitel se zavazuje provést pro objednatele na svůj náklad a nebezpečí dílo: obkladačské a související práce v rozsahu cenové nabídky č. ${esc(q.number)} ze dne ${fmtDate(q.issued_on)}, která tvoří přílohu č. 1 a nedílnou součást této smlouvy. Rozsah prací:${worksList(c.works)}`,
      'Objednatel se zavazuje dílo převzít a zaplatit za ně zhotoviteli cenu sjednanou v čl. C této smlouvy.',
      'Dojde-li při realizaci ke změnám, doplňkům nebo k rozšíření či zúžení rozsahu oproti původnímu zadání ze strany objednatele, zhotovitel provede soupis těchto změn, ocení je podle cen v příloze č. 1 (nebo vyčíslí odpočty) a předloží jej objednateli k odsouhlasení formou dodatku ke smlouvě (stačí textová forma, např. e-mail). Vícepráce a změny ceny se dále řídí čl. C.']))}
    ${art('B', 'Termíny plnění', ol([
      `Zhotovitel se zavazuje provést dílo v termínu od ${d(c.from)} do ${d(c.to)}.`,
      'Termín provádění díla se prodlužuje o dobu trvání překážky: a) z důvodů na straně objednatele, které zhotoviteli znemožňují pokračovat v práci, b) vyšší moci nebo jiných okolností neovlivnitelných zhotovitelem, c) v důsledku objednatelem odsouhlasených změn v rozsahu nebo druhu prací, d) při prodlení objednatele s úhradou faktur delším než 10 kalendářních dní.']))}
    ${art('C', 'Cena, vícepráce a změny ceny', ol([
      `Cena díla je podle přílohy č. 1 orientačně stanovena na ${kc(total)}. Zhotovitel není plátcem DPH, proto se k ceně žádná DPH nepřipočítává.`,
      `Konečná cena se určí finálním vyúčtováním skutečně provedených prací podle jednotkových cen v příloze č. 1. Překročí-li konečná cena orientační cenu o více než ${esc(String(c.overrun || 10))} % z jiného důvodu než odsouhlasených víceprací, zhotovitel to objednateli oznámí bez zbytečného odkladu a rozsah prací nebo cenu s ním odsouhlasí.`,
      'Vícepráce jsou práce, které nejsou obsaženy v příloze č. 1 a vyplynou z požadavku objednatele nebo ze skutečností zjištěných při provádění díla (např. nerovný či nesoudržný podklad, skryté vady stávajících konstrukcí, nutnost dodatečné hydroizolace, odlišné rozměry oproti zadání). Méněpráce, tedy práce z přílohy č. 1, které se neprovedou, se od ceny odečtou.',
      'Zhotovitel provede vícepráce až po jejich odsouhlasení objednatelem v textové formě (e-mail, SMS, zpráva). Odsouhlasení obsahuje popis víceprací, jejich cenu nebo způsob jejího určení a vliv na termín dokončení. Bez odsouhlasení vícepráce neprovádí a nevzniká nárok na jejich úhradu.',
      `Cena víceprací se určí podle jednotkových cen v příloze č. 1. Není-li příslušná položka v příloze č. 1 uvedena, určí se podle ceníku zhotovitele platného v den zadání víceprací${c.hourly ? ' nebo hodinovou sazbou ' + esc(String(c.hourly)) + ' Kč' : ', případně dohodou před jejich provedením'}.`,
      'Neodsouhlasí-li objednatel vícepráce nezbytné k řádnému provedení díla, není zhotovitel povinen v dotčené části pokračovat a postupuje se podle čl. E bodu 6.']))}
    ${art('D', 'Platební podmínky', ol(pay))}
    ${art('E', 'Práva a povinnosti smluvních stran', ol([
      'Zhotovitel provede dílo s odbornou péčí, v požadované kvalitě, včas a v souladu s platnými právními a technickými normami.',
      'Zhotovitel vyzve objednatele ke kontrole prací, které budou v dalším postupu zakryty nebo se stanou nepřístupnými.',
      'Zhotovitel může provádět fotodokumentaci důležitých částí díla pro účely archivace a případného doložení bezvadného provedení prací a tyto fotografie na požádání poskytne.',
      'Objednatel je povinen včas odsouhlasit nebo konkrétně specifikovat rozhodnutí, na která zhotovitel upozorní (výběr materiálu, rozložení obkladu, barvy spár apod.). Neučiní-li tak ve lhůtě, prodlužuje se o dobu trvání této překážky termín dokončení.',
      'Objednatel se dostaví na vyzvání k předání a převzetí díla nebo ke kontrole vybraných částí.',
      'Zjistí-li zhotovitel při provádění díla skryté překážky, které znemožňují provést dílo dohodnutým způsobem, oznámí to bez zbytečného odkladu objednateli a navrhne změnu díla. Do dosažení dohody může provádění přerušit. Nedohodnou-li se strany v přiměřené lhůtě, může kterákoli z nich od smlouvy odstoupit. Zhotovitel má nárok na cenu části díla provedené do doby, než překážku mohl při vynaložení potřebné péče odhalit.',
      'Zhotovitel po dokončení díla prostor vyklidí a provede hrubý úklid.']))}
    ${art('F', 'Předání staveniště a díla', ol([
      'Objednatel předá zhotoviteli místo provádění díla nejpozději v termínu zahájení prací a zajistí funkční přípojky elektřiny a vody.',
      'Zhotovitel vyzve objednatele k předání dokončeného díla nejméně 3 pracovní dny předem. O předání bude sepsán předávací protokol, který podepíší obě strany.',
      'Objednatel nemůže odmítnout převzetí díla pro ojedinělé drobné vady, které samy o sobě ani ve spojení s jinými nebrání užívání díla funkčně ani esteticky a podstatně jej neomezují. Tyto vady uvede do předávacího protokolu a zhotovitel je odstraní v dohodnutém termínu.']))}
    ${art('G', 'Odpovědnost za vady a záruka', ol([
      'Zhotovitel odpovídá za vady, které má dílo v době předání, a za vady zjištěné v záruční době. Práva z vadného plnění se řídí občanským zákoníkem.',
      `Záruční doba na provedené obkladačské práce činí ${esc(String(c.warranty || 36))} měsíců od předání díla. U dodaných výrobků a komponent platí záruční doba uvedená v záručním listu výrobce.`,
      'Zhotovitel neodpovídá za vady způsobené nesprávným užíváním, zanedbáním údržby, běžným opotřebením nebo poškozením zaviněným objednatelem či třetí osobou.',
      'Objednatel oznámí vady písemně (e-mailem nebo dopisem) bez zbytečného odkladu po jejich zjištění a popíše, jak se projevují. Zhotovitel do 15 dnů písemně oznámí, zda reklamaci uznává, případně z jakého důvodu ji neuznává.']))}
    ${art('H', 'Informace pro spotřebitele a právo odstoupit od smlouvy', ol([
      'Je-li objednatel spotřebitelem a smlouva byla uzavřena mimo obchodní prostory zhotovitele (např. v místě nemovitosti objednatele) nebo na dálku, je oprávněn od ní odstoupit bez udání důvodu ve lhůtě 14 dnů ode dne uzavření smlouvy (§ 1829 občanského zákoníku). Odstoupení lze oznámit jednoznačným prohlášením zaslaným na adresu nebo e-mail zhotovitele, lze využít vzorový formulář v příloze č. 2.',
      'Objednatel potvrzuje, že před uzavřením smlouvy obdržel informace podle § 1820 občanského zákoníku (obsažené v cenové nabídce a v této smlouvě) a vzorový formulář pro odstoupení.',
      c.startBefore
        ? '<b>Objednatel výslovně žádá, aby zhotovitel zahájil práce před uplynutím lhůty pro odstoupení.</b> Je si vědom, že při odstoupení uhradí poměrnou část ceny za plnění poskytnuté do odstoupení (§ 1834) a že po úplném provedení díla s jeho souhlasem právo odstoupit zaniká (§ 1837 písm. a).'
        : 'Zhotovitel zahájí práce až po uplynutí lhůty pro odstoupení, pokud o dřívější zahájení objednatel výslovně nepožádá.',
      'Subjektem mimosoudního řešení spotřebitelských sporů je Česká obchodní inspekce, Štěpánská 567/15, 120 00 Praha 2, www.coi.cz (adr.coi.cz).']))}
    ${art('I', 'Další ujednání', ol([
      'Smluvní strany se zavazují chránit informace označené druhou stranou jako důvěrné.',
      'Nastanou-li u některé strany skutečnosti bránící řádnému plnění smlouvy, oznámí to druhé straně bez zbytečného odkladu, nejpozději do tří dnů, a vyvolá jednání.',
      'Zhotovitel zpracovává osobní údaje objednatele jen pro přípravu nabídky, plnění smlouvy a plnění zákonných povinností a nepředává je dalším osobám. Podrobnosti jsou v zásadách ochrany osobních údajů na webu zhotovitele.',
      c.photoConsent === 'ano' ? 'Objednatel souhlasí s použitím fotografií hotového díla bez identifikace osob a adresy na webu a sociálních sítích zhotovitele. Souhlas je dobrovolný a lze jej kdykoli odvolat.' : (c.photoConsent === 'ne' ? 'Objednatel nesouhlasí s použitím fotografií hotového díla na webu a sociálních sítích zhotovitele.' : 'Použití fotografií hotového díla na webu a sociálních sítích je možné jen s dalším souhlasem objednatele.')]))}
    ${art('J', 'Prodlení, smluvní sankce, odstoupení od smlouvy', ol([
      'Je-li objednatel v prodlení s platbou, je zhotovitel oprávněn požadovat smluvní pokutu 0,05 % z dlužné částky za každý den prodlení.',
      'Je-li zhotovitel v prodlení s termínem dokončení prací, je objednatel oprávněn požadovat smluvní pokutu 0,05 % z ceny díla za každý den prodlení.',
      'Nárok na náhradu škody není smluvní pokutou dotčen.',
      'Zhotovitel může od smlouvy odstoupit v případech stanovených právními předpisy, při prodlení objednatele s úhradou ceny déle než 21 dnů, v případě úpadku objednatele a při přerušení díla z viny objednatele delším než 30 dnů.',
      'Objednatel může od smlouvy odstoupit v případech stanovených právními předpisy, při prodlení zhotovitele s prováděním díla o více než 30 dnů a v případě úpadku zhotovitele.',
      'Po odstoupení si strany do 5 dnů předají dosud provedené práce, o čemž sepíšou zápis s popisem rozpracovanosti a oceněním. Zhotoviteli náleží část ceny odpovídající rozsahu provedených prací.']))}
    ${art('K', 'Závěrečná ustanovení', ol([
      'Smlouva je vyhotovena ve dvou stejnopisech, každá strana obdrží jeden.',
      'Smlouva nabývá platnosti a účinnosti dnem podpisu oběma stranami.',
      'Strany prohlašují, že si smlouvu přečetly, že odpovídá jejich svobodné a vážné vůli, že byla uzavřena dobrovolně a nikoli v tísni za nápadně nevýhodných podmínek, a na důkaz souhlasu ji podepisují.',
      `Přílohy: č. 1 cenová nabídka č. ${esc(q.number)} ze dne ${fmtDate(q.issued_on)}; č. 2 poučení a vzorový formulář pro odstoupení od smlouvy.`]))}
    <div class="keep"><div style="font-size:9.3pt;margin-top:4mm">V ${dots(c.place, 12)} dne ${d(c.date)}</div>
    <div style="display:flex;gap:12mm;margin-top:12mm"><div style="flex:1;border-top:1px solid #222;padding-top:1mm;font-size:9pt"><b>Za objednatele</b><br>${esc(q.customer_name || '')}</div><div style="flex:1;border-top:1px solid #222;padding-top:1mm;font-size:9pt"><b>Za zhotovitele</b><br>${esc(f.name)}</div></div></div>
    <div class="pagebreak"></div>
    ${headBar('PŘÍLOHA Č. 2')}
    <div style="font-weight:800;font-size:12pt;margin:4mm 0 2mm">Poučení o právu odstoupit od smlouvy a vzorový formulář</div>
    <div style="font-size:9.5pt;line-height:1.45">Jste-li spotřebitel, máte právo odstoupit od této smlouvy bez udání důvodu ve lhůtě 14 dnů ode dne uzavření smlouvy. K dodržení lhůty stačí, odešlete-li oznámení o odstoupení před jejím uplynutím. Oznámení zašlete na: <b>${esc(f.name)}, ${esc(f.address)}, ${esc(f.email || '')}</b>. Můžete použít formulář níže, není to však povinné.<br><br>Odstoupíte-li od smlouvy, vrátíme vám všechny přijaté platby bez zbytečného odkladu, nejpozději do 14 dnů od oznámení o odstoupení. Pokud jste požádali o zahájení prací před uplynutím lhůty, uhradíte poměrnou část ceny za plnění poskytnuté do okamžiku odstoupení (§ 1834 občanského zákoníku).</div>
    <div class="notebox" style="margin-top:5mm;font-size:9.5pt;line-height:1.7"><b>Oznámení o odstoupení od smlouvy</b><br>Adresát: ${esc(f.name)}, ${esc(f.address)}, ${esc(f.email || '')}<br>Oznamuji, že tímto odstupuji od smlouvy o dílo č. ${esc(q.number)} na akci „${esc(q.project || '')}“.<br>Datum uzavření smlouvy: ............................<br>Jméno a příjmení spotřebitele: ................................................<br>Adresa spotřebitele: ................................................................<br>Podpis spotřebitele (pouze při papírové podobě): ...........................<br>Datum: ............................</div>
    ${footer()}</div>`;
  return html;
}
