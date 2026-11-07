// Odeslání nabídky e-mailem: profesionální HTML šablona s podpisem, odkazy na sítě a PDF v příloze.
import { h, esc, kc, fmtDate, addDays, toast } from './util.js';
import { S, firmaFor, quoteTotal } from './store.js';
import { quoteDoc, settlementDoc, settlementTotals, splitTotals } from './doc.js';
import { htmlToPdf, pdfName } from './pdf.js';
import { gmailReady, ensureGmailToken, buildMime, sendViaGmail } from './gmail.js';
import { greeting } from './cs.js';
import { czIban, spayd, qrGif, inquiryVs, PACKAGE_FEE, packageUrl } from './pay.js';

const GOLD = '#b8975a', NAVY = '#22303C';
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

// odkazy na sítě: výchozí jsou skutečné odkazy firmy; z nastavení se použije jen úplný odkaz (https://…)
const SOCIAL_DEFAULT = {
  instagram: 'https://www.instagram.com/jl_obklady',
  youtube: 'https://youtube.com/@jl_obklady',
  facebook: 'https://www.facebook.com/share/1KxSvnfTCf/',
};
const fullUrl = (v, d) => { const t = String(v || '').trim(); return /^https:\/\/[^\s"<>]+$/i.test(t) ? t : d; };
function socials(f) {
  const out = [
    ['Instagram', fullUrl(f.instagram, SOCIAL_DEFAULT.instagram)],
    ['YouTube', fullUrl(f.youtube, SOCIAL_DEFAULT.youtube)],
    ['Facebook', fullUrl(f.facebook, SOCIAL_DEFAULT.facebook)],
  ];
  if (f.web) out.push(['Web', /^https?:/i.test(f.web) ? f.web : 'https://' + f.web]);
  return out;
}

export function defaultSubject(q) {
  return `Cenová nabídka ${q.number}${q.project ? ' – ' + q.project : ''}`;
}

export function defaultMessage(q, f) {
  const validTo = fmtDate(addDays(q.issued_on, q.valid_days || f.valid_days || 30));
  return [
    greeting(q.customer_name),
    '',
    `děkujeme za Váš zájem o naše služby. V příloze Vám zasíláme cenovou nabídku č. ${q.number}${q.project ? ' na akci „' + q.project + '“' : ''}.`,
    '',
    `Nabídka je platná do ${validTo}. Cena je orientační, konečná cena vychází z finálního vyúčtování skutečně provedených prací.`,
    '',
    ...(q.show_package ? [`Cena je orientační (práce a základní materiál podle zadaných rozměrů, materiál dle ceníkových cen, bez obkladu a dlažby). Pokud chcete přesný položkový rozpočet s vybraným materiálem, zaměření na místě a rezervaci termínu, můžete si objednat balíček za ${kc(PACKAGE_FEE)}. Celá jeho cena se na konci zakázky odečte z ceny. Podrobnosti jsou na poslední straně nabídky.`, ''] : []),
    'V případě jakýchkoli dotazů nebo úprav nás neváhejte kontaktovat, rádi vše probereme i osobně.',
    '',
    'S pozdravem',
  ].join('\n');
}

// Prostý text pro klienty, které HTML nezobrazují
export function buildText(q, f, message) {
  const sig = [f.name, f.phone && 'tel. ' + f.phone, f.email, f.web, ...socials(f).filter(([n]) => n !== 'Web').map(([n, u]) => `${n}: ${u}`)].filter(Boolean);
  const u = q.show_package ? packageUrl(q.package_token) : '';
  return `${message}\n\n${u ? 'Objednat balíček: ' + u + '\n\n' : ''}${sig.join('\n')}\n`;
}

const paraHtml = (message) => String(message).split(/\n{2,}/).map((p) =>
  `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#2b3640">${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
const rowHtml = (k, v) => `<tr><td style="padding:7px 0;border-bottom:1px solid #e7dfd0;font-size:13px;color:#6b7580;width:42%">${esc(k)}</td><td style="padding:7px 0;border-bottom:1px solid #e7dfd0;font-size:14px;color:${NAVY};font-weight:600;text-align:right">${esc(v)}</td></tr>`;

// Společný rámec e-mailu: záhlaví, obsah, podpis s kontakty a odkazy na sítě, patička.
// Tabulkové rozložení a inline styly, aby vypadal stejně v Gmailu, Outlooku i na mobilu.
function frame(f, middle) {
  const links = socials(f).map(([n, u]) => `<a href="${esc(u)}" style="color:${GOLD};text-decoration:none;font-weight:600">${esc(n)}</a>`).join('<span style="color:#b5bcc3"> &nbsp;·&nbsp; </span>');
  const contact = [
    f.phone ? `Tel.: <a href="tel:${esc(String(f.phone).replace(/[^\d+]/g, ''))}" style="color:${NAVY};text-decoration:none">${esc(f.phone)}</a>` : '',
    f.email ? `E-mail: <a href="mailto:${esc(f.email)}" style="color:${NAVY};text-decoration:none">${esc(f.email)}</a>` : '',
    f.address ? esc(f.address) : '',
  ].filter(Boolean).join('<br>');
  return `<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3efe7">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3efe7"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:6px;overflow:hidden;font-family:Arial,Helvetica,sans-serif">
<tr><td style="background:${NAVY};padding:26px 32px;border-bottom:3px solid ${GOLD}">
 <div style="font-size:24px;letter-spacing:3px;color:#ffffff;font-weight:700">JL-OBKLADY</div>
 <div style="font-size:11px;letter-spacing:2px;color:${GOLD};margin-top:6px">${esc(f.tagline || 'OBKLADY · DLAŽBY · KOUPELNY · DEKORATIVNÍ STĚRKY')}</div>
</td></tr>
${middle}
<tr><td style="padding:0 32px 26px;border-top:1px solid #eee7d8">
 <div style="padding-top:20px;font-size:15px;font-weight:700;color:${NAVY}">${esc(f.name || 'JL-OBKLADY')}</div>
 <div style="font-size:13px;line-height:1.7;color:#4a5560;padding-top:4px">${contact}</div>
 <div style="font-size:13px;padding-top:12px">${links}</div>
</td></tr>
<tr><td style="background:${NAVY};padding:14px 32px;font-size:11px;color:#9fb0bd;letter-spacing:1px">PRECIZNÍ OBKLADY. DOKONALÝ DETAIL.</td></tr>
</table></td></tr></table></body></html>`;
}

const box = (inner) => `<tr><td style="padding:6px 32px 22px">
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf6ee;border-left:3px solid ${GOLD};padding:6px 16px"><tr><td style="padding:6px 16px">${inner}</td></tr></table>
</td></tr>`;

export function buildHtml(q, f, message) {
  const total = quoteTotal((q.items || []).filter((r) => r.name));
  const validTo = fmtDate(addDays(q.issued_on, q.valid_days || f.valid_days || 30));
  const summary = [
    rowHtml('Číslo nabídky', q.number),
    q.project ? rowHtml('Akce', q.project) : '',
    ...(() => {
      const its = (q.items || []).filter((r) => r.name), w = quoteTotal(its.filter((r) => r.typ === 'prace')), m = quoteTotal(its.filter((r) => r.typ !== 'prace'));
      return w > 0 && m > 0 ? [rowHtml('Práce', kc(w)), rowHtml('Materiál (dle ceníkových cen)', kc(m))] : [];
    })(),
    total > 0 ? rowHtml(q.show_package ? 'Orientační cena celkem' : 'Cena', kc(total)) : '',
    rowHtml('Platnost do', validTo),
  ].join('');
  const url = q.show_package ? packageUrl(q.package_token) : '';
  const cta = url ? `<tr><td style="padding:0 32px 24px" align="center"><a href="${esc(url)}" style="display:inline-block;background:${GOLD};color:#17181a;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:3px">Objednat balíček za ${esc(kc(PACKAGE_FEE))}</a><div style="font-size:12px;color:#6b7580;padding-top:8px">Rozpočet s materiálem, zaměření a rezervace termínu. Cena se odečte z konečné ceny.</div></td></tr>` : '';
  return frame(f, `<tr><td style="padding:30px 32px 6px">${paraHtml(message)}</td></tr>` +
    box(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${summary}</table>
  <div style="font-size:12px;color:#6b7580;padding-top:10px">Rozpis cenové nabídky najdete v přiložené nabídce (PDF).</div>`) + cta);
}

// ---- vyúčtování provedených prací ----
const setLabel = (q) => (q.settlement && q.settlement.bez ? '' : q.number);
export function settlementSubject(q) {
  return `Vyúčtování provedených prací${setLabel(q) ? ' k nabídce ' + q.number : ''}${q.project ? ' – ' + q.project : ''}`;
}
export function settlementMessage(q) {
  const t = settlementTotals(q);
  return [
    greeting(q.customer_name),
    '',
    `děkujeme za spolupráci. V příloze Vám zasíláme vyúčtování provedených prací${q.project ? ' na akci „' + q.project + '“' : ''}${setLabel(q) ? ' k nabídce č. ' + q.number : ''}.`,
    '',
    t.due < 0 ? `Uhrazená záloha ${kc(t.advance)} je vyšší než skutečná cena, přeplatek ${kc(-t.due)} Vám vrátíme.` : t.advance ? `Od celkové ceny je již odečtena uhrazená záloha ${kc(t.advance)}, k úhradě zbývá doplatek ${kc(t.due)}.` : `Celková cena k úhradě je ${kc(t.due)}.`,
    'Dodavatel není plátcem DPH, ceny jsou konečné.',
    '',
    'V případě jakýchkoli dotazů se na nás neváhejte obrátit.',
    '',
    'S pozdravem',
  ].join('\n');
}
export function buildSettlementText(q, f, message) {
  const sig = [f.name, f.phone && 'tel. ' + f.phone, f.email, f.web, ...socials(f).filter(([n]) => n !== 'Web').map(([n, u]) => `${n}: ${u}`)].filter(Boolean);
  return `${message}\n\n${sig.join('\n')}\n`;
}
export function buildSettlementHtml(q, f, message) {
  const st = q.settlement || {};
  const items = (st.items || []).filter((r) => r.name);
  const t = settlementTotals(q), sp = splitTotals(items);
  const summary = [
    setLabel(q) ? rowHtml('K nabídce č.', q.number) : '',
    q.project ? rowHtml('Akce', q.project) : '',
    rowHtml('Datum vyúčtování', fmtDate(st.date || new Date().toISOString().slice(0, 10))),
    sp.hasWork && sp.hasMat ? rowHtml('Práce (včetně dopravy)', kc(sp.work)) + rowHtml('Materiál', kc(sp.mat)) : '',
    t.advance ? rowHtml('Uhrazená záloha', kc(-t.advance)) : '',
    t.due < 0 ? rowHtml('Přeplatek k vrácení', kc(-t.due)) : rowHtml(t.advance ? 'Doplatek k úhradě' : 'Celkem k úhradě', kc(t.due)),
  ].join('');
  return frame(f, `<tr><td style="padding:30px 32px 6px">${paraHtml(message)}</td></tr>` +
    box(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${summary}</table>
  <div style="font-size:12px;color:#6b7580;padding-top:10px">Položkový rozpis provedených prací najdete v přiloženém vyúčtování (PDF).</div>`));
}

// ---- platební údaje k objednané nabídce (QR platba) ----
export const PAYMENT_FEE = PACKAGE_FEE;

export function paymentMessage(r, f) {
  return [
    greeting(r.name),
    '',
    'děkujeme za Vaši objednávku cenové nabídky. Níže zasíláme platební údaje.',
    '',
    'Po připsání platby si na dohodnutý termín rezervujeme místo ve svém kalendáři. Zaplacená částka se na konci odečte od konečné ceny zakázky.',
    '',
    'V případě jakýchkoli dotazů nás neváhejte kontaktovat.',
    '',
    'S pozdravem',
  ].join('\n');
}

export function buildPaymentHtml(f, message, { amount, vs, account, iban, hasQr }) {
  const rows = [
    rowHtml('Částka', kc(amount)),
    rowHtml('Číslo účtu', account),
    iban ? rowHtml('IBAN', iban) : '',
    rowHtml('Variabilní symbol', vs),
    rowHtml('Příjemce', f.name || 'JL-OBKLADY'),
  ].join('');
  const qr = hasQr ? `<div style="text-align:center;padding:14px 0 4px"><img src="cid:qrplatba" width="190" height="190" alt="QR platba" style="border:0;display:inline-block"><div style="font-size:12px;color:#6b7580;padding-top:6px">Naskenujte v mobilním bankovnictví</div></div>` : '';
  return frame(f, `<tr><td style="padding:30px 32px 6px">${paraHtml(message)}</td></tr>` +
    box(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>${qr}
  <div style="font-size:12px;color:#6b7580;padding-top:10px">Před odesláním platby prosím zkontrolujte číslo účtu, částku a variabilní symbol.</div>`));
}

export function buildPaymentText(f, message, { amount, vs, account, iban }) {
  const lines = [`Částka: ${kc(amount)}`, `Číslo účtu: ${account}`, iban && `IBAN: ${iban}`, `Variabilní symbol: ${vs}`];
  const sig = [f.name, f.phone && 'tel. ' + f.phone, f.email, ...socials(f).filter(([n]) => n !== 'Web').map(([n, u]) => `${n}: ${u}`)].filter(Boolean);
  return `${message}\n\n${lines.filter(Boolean).join('\n')}\n\n${sig.join('\n')}\n`;
}

const arr = async (blob) => new Uint8Array(await blob.arrayBuffer());

// Dialog pro odeslání nabídky. onSent se zavolá po úspěšném odeslání.
export function openEmailDialog(q, { onSent, beforeOpen, mode } = {}) {
  const f = firmaFor(q);
  const SET = mode === 'settlement';
  const M = SET
    ? { subject: settlementSubject, message: settlementMessage, html: buildSettlementHtml, text: buildSettlementText, doc: settlementDoc, label: pdfName('Vyúčtování ' + setLabel(q), q.customer_name), title: 'Odeslat vyúčtování e-mailem' }
    : { subject: defaultSubject, message: (x) => defaultMessage(x, f), html: buildHtml, text: buildText, doc: quoteDoc, label: pdfName(q.number, q.customer_name), title: 'Odeslat nabídku e-mailem' };
  const c = S.contacts.find((x) => x.id === q.customer_id);
  const guess = (String(q.customer_contact || '').match(EMAIL_RE) || String((c && c.contact) || '').match(EMAIL_RE) || [''])[0];
  const to = h('input', { type: 'email', value: guess, placeholder: 'zakaznik@example.cz', autocomplete: 'off' });
  const subj = h('input', { type: 'text', value: M.subject(q) });
  const msg = h('textarea', { rows: 10, style: { width: '100%' } }, M.message(q));
  const pdfLabel = M.label;
  const status = h('p', { class: 'muted', style: { minHeight: '1.3em' } }, '');
  const previewBox = h('div');
  const close = () => overlay.remove();

  const prepare = async () => {
    const addr = to.value.trim();
    if (!EMAIL_RE.test(addr) || /[\s,;<>]/.test(addr)) { to.focus(); throw new Error('Zadejte platný e-mail příjemce.'); }
    if (/[^\x20-\x7e]/.test(addr)) { to.focus(); throw new Error('E-mail příjemce nesmí obsahovat diakritiku.'); }
    return addr;
  };

  const send = h('button', { class: 'btn gold', onclick: async (e) => {
    let addr;
    try { addr = await prepare(); } catch (er) { return toast(er.message, 'err'); }
    e.target.disabled = true;
    try {
      const tok = ensureGmailToken(); // přihlášení musí začít hned po kliknutí
      tok.catch(() => {});
      if (beforeOpen) await Promise.resolve(beforeOpen()).catch(() => {}); // uloží rozpracované změny
      await tok;
      status.textContent = 'Vytvářím PDF…';
      const blob = await htmlToPdf(M.doc(q));
      status.textContent = 'Odesílám e-mail…';
      const mime = buildMime({
        to: addr, subject: subj.value.trim() || M.subject(q), replyTo: /^[^\s@]+@[^\s@]+$/.test(f.email || '') && !/[^\x20-\x7e]/.test(f.email) ? f.email : '',
        text: M.text(q, f, msg.value), html: M.html(q, f, msg.value),
        attachment: { name: pdfLabel, bytes: await arr(blob), type: 'application/pdf' },
      });
      await sendViaGmail(mime);
      toast('E-mail odeslán na ' + addr);
      close();
      if (onSent) await onSent(addr);
    } catch (er) { status.textContent = ''; toast(er.message, 'err'); e.target.disabled = false; }
  } }, 'Odeslat e-mail');

  const preview = h('button', { class: 'btn ghost small', onclick: () => {
    const fr = h('iframe', { style: { width: '100%', height: '520px', border: '1px solid #ddd', borderRadius: '6px', background: '#fff' } });
    fr.srcdoc = M.html(q, f, msg.value);
    previewBox.replaceChildren(fr);
  } }, 'Zobrazit náhled e-mailu');

  // záloha pro případ, že Gmail nejde: stáhne PDF a otevře e-mailovou aplikaci s hotovým textem
  const fallback = h('button', { class: 'btn ghost small', onclick: async (e) => {
    e.target.disabled = true;
    try {
      status.textContent = 'Vytvářím PDF…';
      const blob = await htmlToPdf(M.doc(q));
      const a = h('a', { href: URL.createObjectURL(blob), download: pdfLabel });
      document.body.append(a); a.click(); a.remove();
      status.textContent = '';
      const body = M.text(q, f, msg.value);
      location.href = `mailto:${encodeURIComponent(to.value.trim())}?subject=${encodeURIComponent(subj.value)}&body=${encodeURIComponent(body)}`;
      toast('PDF je stažené, přiložte ho prosím k e-mailu.');
    } catch (er) { status.textContent = ''; toast(er.message, 'err'); }
    e.target.disabled = false;
  } }, 'Otevřít v e-mailové aplikaci');

  const overlay = h('div', { class: 'overlay', style: { alignItems: 'flex-start', overflowY: 'auto' } },
    h('div', { class: 'dialog', style: { maxWidth: '640px', margin: '12px auto' } },
      h('h2', { style: { marginTop: 0 } }, M.title),
      h('label', { class: 'f' }, 'Komu'), to,
      h('label', { class: 'f' }, 'Předmět'), subj,
      h('label', { class: 'f' }, 'Text e-mailu (podpis, odkazy na sítě a rekapitulaci doplníme automaticky)'), msg,
      h('p', { class: 'muted', style: { margin: '8px 0' } }, 'Příloha: ' + pdfLabel),
      previewBox, status,
      h('div', { class: 'row', style: { justifyContent: 'space-between' } },
        h('div', { class: 'row' }, preview, fallback),
        h('div', { class: 'row end' }, h('button', { class: 'btn ghost', onclick: close }, 'Zrušit'), gmailReady() ? send : null))));
  document.body.append(overlay);
}

// Dialog pro odeslání platebních údajů z poptávky. Údaje dodavatele (účet, podpis) jsou podle přihlášeného profilu.
export function openPaymentDialog(r, { onSent } = {}) {
  const f = S.firma;
  const account = String(f.account || '').trim();
  const iban = czIban(account);
  const vs = inquiryVs(r);
  const to = h('input', { type: 'email', value: (String(r.email || '').match(EMAIL_RE) || [''])[0], placeholder: 'zakaznik@example.cz', autocomplete: 'off' });
  const amt = h('input', { type: 'text', inputmode: 'numeric', value: String(PAYMENT_FEE) });
  const subj = h('input', { type: 'text', value: 'Platební údaje k objednané nabídce' });
  const msg = h('textarea', { rows: 9, style: { width: '100%' } }, paymentMessage(r, f));
  const status = h('p', { class: 'muted', style: { minHeight: '1.3em' } }, '');
  const previewBox = h('div');
  const close = () => overlay.remove();
  const info = () => ({ amount: Number(String(amt.value).replace(/\s/g, '').replace(',', '.')) || 0, vs, account, iban });

  const send = h('button', { class: 'btn gold', onclick: async (e) => {
    const addr = to.value.trim();
    if (!EMAIL_RE.test(addr) || /[\s,;<>]/.test(addr) || /[^\x20-\x7e]/.test(addr)) { to.focus(); return toast('Zadejte platný e-mail příjemce (bez diakritiky).', 'err'); }
    const i = info();
    if (!(i.amount > 0)) return toast('Zadejte částku.', 'err');
    if (!iban) return toast('V Nastavení vyplňte číslo účtu ve tvaru 123456789/0100.', 'err');
    e.target.disabled = true;
    try {
      const tok = ensureGmailToken(); tok.catch(() => {});
      await tok;
      status.textContent = 'Odesílám e-mail…';
      const gif = qrGif(spayd({ account, amount: i.amount, vs, msg: 'Nabidka ' + vs }));
      const mime = buildMime({
        to: addr, subject: subj.value.trim() || 'Platební údaje', replyTo: /^[^\s@]+@[^\s@]+$/.test(f.email || '') && !/[^\x20-\x7e]/.test(f.email) ? f.email : '',
        text: buildPaymentText(f, msg.value, i), html: buildPaymentHtml(f, msg.value, { ...i, hasQr: !!gif }),
        inline: gif ? { cid: 'qrplatba', bytes: gif, type: 'image/gif', name: 'qr-platba.gif' } : null,
      });
      await sendViaGmail(mime);
      toast('Platební údaje odeslány na ' + addr);
      close();
      if (onSent) await onSent(addr, i);
    } catch (er) { status.textContent = ''; toast(er.message, 'err'); e.target.disabled = false; }
  } }, 'Odeslat e-mail');

  const preview = h('button', { class: 'btn ghost small', onclick: () => {
    const i = info();
    const fr = h('iframe', { style: { width: '100%', height: '560px', border: '1px solid #ddd', borderRadius: '6px', background: '#fff' } });
    const gif = qrGif(spayd({ account, amount: i.amount, vs, msg: 'Nabidka ' + vs }));
    let html = buildPaymentHtml(f, msg.value, { ...i, hasQr: !!gif });
    if (gif) { let b = ''; gif.forEach((c) => { b += String.fromCharCode(c); }); html = html.replace('cid:qrplatba', 'data:image/gif;base64,' + btoa(b)); }
    fr.srcdoc = html;
    previewBox.replaceChildren(fr);
  } }, 'Zobrazit náhled e-mailu');

  const overlay = h('div', { class: 'overlay', style: { alignItems: 'flex-start', overflowY: 'auto' } },
    h('div', { class: 'dialog', style: { maxWidth: '640px', margin: '12px auto' } },
      h('h2', { style: { marginTop: 0 } }, 'Poslat platební údaje'),
      iban ? h('p', { class: 'muted' }, `Příjemce platby: ${f.name || ''} · účet ${account} · variabilní symbol ${vs}`)
        : h('p', { class: 'banner' }, 'V Nastavení (profil ' + (S.profile || '') + ') není vyplněné platné číslo účtu, např. 123456789/0100.'),
      h('label', { class: 'f' }, 'Komu'), to,
      h('label', { class: 'f' }, 'Částka (Kč)'), amt,
      h('label', { class: 'f' }, 'Předmět'), subj,
      h('label', { class: 'f' }, 'Text e-mailu (platební údaje, QR kód a podpis doplníme automaticky)'), msg,
      previewBox, status,
      h('div', { class: 'row', style: { justifyContent: 'space-between' } },
        preview,
        h('div', { class: 'row end' }, h('button', { class: 'btn ghost', onclick: close }, 'Zrušit'), gmailReady() ? send : null))));
  document.body.append(overlay);
}
