// Odeslání nabídky e-mailem: profesionální HTML šablona s podpisem, odkazy na sítě a PDF v příloze.
import { h, esc, kc, fmtDate, addDays, toast } from './util.js';
import { S, firmaFor, quoteTotal } from './store.js';
import { quoteDoc } from './doc.js';
import { htmlToPdf, pdfName } from './pdf.js';
import { gmailReady, ensureGmailToken, buildMime, sendViaGmail } from './gmail.js';

const GOLD = '#b8975a', NAVY = '#22303C';
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

// odkazy na sítě: z nastavení firmy, jinak výchozí (stejné jako na webu)
function socials(f) {
  const ig = (f.instagram || 'jl_obklady').replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/$/, '');
  const yt = (f.youtube || '@jl_obklady');
  const ytUrl = /^https?:/i.test(yt) ? yt : 'https://youtube.com/' + (yt.startsWith('@') ? yt : '@' + yt);
  const out = [['Instagram', 'https://www.instagram.com/' + ig], ['YouTube', ytUrl]];
  if (f.facebook) out.push(['Facebook', /^https?:/i.test(f.facebook) ? f.facebook : 'https://facebook.com/' + f.facebook]);
  if (f.web) out.push(['Web', /^https?:/i.test(f.web) ? f.web : 'https://' + f.web]);
  return out;
}

export function defaultSubject(q) {
  return `Cenová nabídka ${q.number}${q.project ? ' – ' + q.project : ''}`;
}

export function defaultMessage(q, f) {
  const validTo = fmtDate(addDays(q.issued_on, q.valid_days || f.valid_days || 30));
  return [
    'Dobrý den,',
    '',
    `děkujeme za Váš zájem o naše služby. V příloze Vám zasíláme cenovou nabídku č. ${q.number}${q.project ? ' na akci „' + q.project + '“' : ''}.`,
    '',
    `Nabídka je platná do ${validTo}. Cena je orientační, konečná cena vychází z finálního vyúčtování skutečně provedených prací.`,
    '',
    'V případě jakýchkoli dotazů nebo úprav nás neváhejte kontaktovat, rádi vše probereme i osobně.',
    '',
    'S pozdravem',
  ].join('\n');
}

// Prostý text pro klienty, které HTML nezobrazují
export function buildText(q, f, message) {
  const sig = [f.name, f.phone && 'tel. ' + f.phone, f.email, f.web, ...socials(f).filter(([n]) => n !== 'Web').map(([n, u]) => `${n}: ${u}`)].filter(Boolean);
  return `${message}\n\n${sig.join('\n')}\n`;
}

// HTML e-mail: tabulkové rozložení a inline styly, aby vypadal stejně v Gmailu, Outlooku i na mobilu
export function buildHtml(q, f, message) {
  const total = quoteTotal((q.items || []).filter((r) => r.name));
  const validTo = fmtDate(addDays(q.issued_on, q.valid_days || f.valid_days || 30));
  const paras = String(message).split(/\n{2,}/).map((p) =>
    `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#2b3640">${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
  const row = (k, v) => `<tr><td style="padding:7px 0;border-bottom:1px solid #e7dfd0;font-size:13px;color:#6b7580;width:42%">${esc(k)}</td><td style="padding:7px 0;border-bottom:1px solid #e7dfd0;font-size:14px;color:${NAVY};font-weight:600;text-align:right">${esc(v)}</td></tr>`;
  const summary = [
    row('Číslo nabídky', q.number),
    q.project ? row('Akce', q.project) : '',
    total > 0 ? row('Orientační cena', kc(total)) : '',
    row('Platnost do', validTo),
  ].join('');
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
<tr><td style="padding:30px 32px 6px">${paras}</td></tr>
<tr><td style="padding:6px 32px 22px">
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf6ee;border-left:3px solid ${GOLD};padding:6px 16px"><tr><td style="padding:6px 16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${summary}</table>
  <div style="font-size:12px;color:#6b7580;padding-top:10px">Podrobný rozpis prací a materiálů najdete v přiložené nabídce (PDF).</div>
 </td></tr></table>
</td></tr>
<tr><td style="padding:0 32px 26px;border-top:1px solid #eee7d8">
 <div style="padding-top:20px;font-size:15px;font-weight:700;color:${NAVY}">${esc(f.name || 'JL-OBKLADY')}</div>
 <div style="font-size:13px;line-height:1.7;color:#4a5560;padding-top:4px">${contact}</div>
 <div style="font-size:13px;padding-top:12px">${links}</div>
</td></tr>
<tr><td style="background:${NAVY};padding:14px 32px;font-size:11px;color:#9fb0bd;letter-spacing:1px">PRECIZNÍ OBKLADY. DOKONALÝ DETAIL.</td></tr>
</table></td></tr></table></body></html>`;
}

const arr = async (blob) => new Uint8Array(await blob.arrayBuffer());

// Dialog pro odeslání nabídky. onSent se zavolá po úspěšném odeslání.
export function openEmailDialog(q, { onSent, beforeOpen } = {}) {
  const f = firmaFor(q);
  const c = S.contacts.find((x) => x.id === q.customer_id);
  const guess = (String(q.customer_contact || '').match(EMAIL_RE) || String((c && c.contact) || '').match(EMAIL_RE) || [''])[0];
  const to = h('input', { type: 'email', value: guess, placeholder: 'zakaznik@example.cz', autocomplete: 'off' });
  const subj = h('input', { type: 'text', value: defaultSubject(q) });
  const msg = h('textarea', { rows: 10, style: { width: '100%' } }, defaultMessage(q, f));
  const pdfLabel = pdfName(q.number, q.customer_name);
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
      const blob = await htmlToPdf(quoteDoc(q));
      status.textContent = 'Odesílám e-mail…';
      const mime = buildMime({
        to: addr, subject: subj.value.trim() || defaultSubject(q), replyTo: /^[^\s@]+@[^\s@]+$/.test(f.email || '') && !/[^\x20-\x7e]/.test(f.email) ? f.email : '',
        text: buildText(q, f, msg.value), html: buildHtml(q, f, msg.value),
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
    fr.srcdoc = buildHtml(q, f, msg.value);
    previewBox.replaceChildren(fr);
  } }, 'Zobrazit náhled e-mailu');

  // záloha pro případ, že Gmail nejde: stáhne PDF a otevře e-mailovou aplikaci s hotovým textem
  const fallback = h('button', { class: 'btn ghost small', onclick: async (e) => {
    e.target.disabled = true;
    try {
      status.textContent = 'Vytvářím PDF…';
      const blob = await htmlToPdf(quoteDoc(q));
      const a = h('a', { href: URL.createObjectURL(blob), download: pdfLabel });
      document.body.append(a); a.click(); a.remove();
      status.textContent = '';
      const body = buildText(q, f, msg.value);
      location.href = `mailto:${encodeURIComponent(to.value.trim())}?subject=${encodeURIComponent(subj.value)}&body=${encodeURIComponent(body)}`;
      toast('PDF je stažené, přiložte ho prosím k e-mailu.');
    } catch (er) { status.textContent = ''; toast(er.message, 'err'); }
    e.target.disabled = false;
  } }, 'Otevřít v e-mailové aplikaci');

  const overlay = h('div', { class: 'overlay', style: { alignItems: 'flex-start', overflowY: 'auto' } },
    h('div', { class: 'dialog', style: { maxWidth: '640px', margin: '12px auto' } },
      h('h2', { style: { marginTop: 0 } }, 'Odeslat nabídku e-mailem'),
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
