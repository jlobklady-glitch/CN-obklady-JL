// Odeslání e-mailu s přílohou přes Gmail API z účtu, ke kterému se uživatel přihlásí.
// Vlastní přihlášení (jen oprávnění "odesílat poštu"), aby se nijak nedotklo zálohování na Disk.
import { GOOGLE_CLIENT_ID } from './config.js';

const SCOPE = 'https://www.googleapis.com/auth/gmail.send';
let client = null, token = null, tokenExp = 0;

export const gmailReady = () => !!GOOGLE_CLIENT_ID;

export function loadGsi() {
  if (window.google && window.google.accounts) return Promise.resolve();
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client'; s.onload = res;
    s.onerror = () => rej(new Error('Nepodařilo se načíst přihlášení Google (jste online?)'));
    document.head.append(s);
  });
}

// Musí se volat přímo z kliknutí, jinak prohlížeč okno přihlášení zablokuje.
export async function ensureGmailToken() {
  if (token && Date.now() < tokenExp - 30000) return token;
  await loadGsi();
  return new Promise((res, rej) => {
    client = client || window.google.accounts.oauth2.initTokenClient({ client_id: GOOGLE_CLIENT_ID, scope: SCOPE, callback: () => {} });
    client.callback = (r) => {
      if (r.error) return rej(new Error('Google: ' + (r.error_description || r.error)));
      if (!window.google.accounts.oauth2.hasGrantedAllScopes(r, SCOPE)) return rej(new Error('Nebylo povoleno odesílání e-mailů.'));
      token = r.access_token; tokenExp = Date.now() + Number(r.expires_in || 3600) * 1000; res(token);
    };
    client.error_callback = (e) => rej(new Error('Přihlášení k Googlu bylo zrušeno (' + (e.type || 'chyba') + ')'));
    client.requestAccessToken({ prompt: token ? '' : 'consent' });
  });
}

// ---- sestavení zprávy (MIME) ----
const enc = new TextEncoder();

function bytesToB64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
const wrap76 = (b64) => b64.replace(/(.{76})/g, '$1\r\n');
const b64Text = (str) => wrap76(bytesToB64(enc.encode(str)));
// hlavičky: každé slovo s diakritikou se kóduje zvlášť (RFC 2047), řádek zůstane krátký
export function encodeHeader(str) {
  const s = String(str || '').replace(/[\r\n]+/g, ' ');
  if (/^[\x20-\x7e]*$/.test(s)) return s;
  const parts = [];
  let cur = '';
  for (const ch of s) {
    if (enc.encode(cur + ch).length > 36) { parts.push(cur); cur = ''; }
    cur += ch;
  }
  if (cur) parts.push(cur);
  return parts.map((p) => `=?UTF-8?B?${bytesToB64(enc.encode(p))}?=`).join('\r\n ');
}
const cleanAddr = (a) => String(a || '').replace(/[\r\n<>,;"]+/g, '').trim();
const cleanFileName = (n) => String(n || 'priloha.pdf').replace(/[\r\n"\\/]+/g, ' ');

// to: adresa příjemce, from: { name, email } (jen do hlavičky Reply-To), attachment: { name, bytes (Uint8Array), type }
export function buildMime({ to, subject, text, html, replyTo, attachment, inline }) {
  const b1 = 'jl_mixed_' + Math.random().toString(36).slice(2);
  const b2 = 'jl_alt_' + Math.random().toString(36).slice(2);
  const b3 = 'jl_rel_' + Math.random().toString(36).slice(2);
  const L = [];
  L.push(`To: ${cleanAddr(to)}`);
  if (replyTo) L.push(`Reply-To: ${cleanAddr(replyTo)}`);
  L.push(`Subject: ${encodeHeader(subject)}`);
  L.push('MIME-Version: 1.0');
  L.push(`Content-Type: multipart/mixed; boundary="${b1}"`, '');
  L.push(`--${b1}`, `Content-Type: multipart/alternative; boundary="${b2}"`, '');
  L.push(`--${b2}`, 'Content-Type: text/plain; charset="UTF-8"', 'Content-Transfer-Encoding: base64', '', b64Text(text), '');
  if (inline) {
    // HTML s obrázkem vloženým přímo do zprávy (odkaz cid:)
    L.push(`--${b2}`, `Content-Type: multipart/related; boundary="${b3}"`, '');
    L.push(`--${b3}`, 'Content-Type: text/html; charset="UTF-8"', 'Content-Transfer-Encoding: base64', '', b64Text(html), '');
    L.push(`--${b3}`, `Content-Type: ${inline.type}`, 'Content-Transfer-Encoding: base64', `Content-ID: <${inline.cid}>`,
      `Content-Disposition: inline; filename="${inline.name || 'qr.gif'}"`, '', wrap76(bytesToB64(inline.bytes)), '');
    L.push(`--${b3}--`, '');
  } else {
    L.push(`--${b2}`, 'Content-Type: text/html; charset="UTF-8"', 'Content-Transfer-Encoding: base64', '', b64Text(html), '');
  }
  L.push(`--${b2}--`, '');
  if (attachment) {
    const nm = cleanFileName(attachment.name);
    const star = "UTF-8''" + encodeURIComponent(nm).replace(/['()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
    L.push(`--${b1}`, `Content-Type: ${attachment.type || 'application/pdf'}; name="${encodeHeader(nm)}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${/^[\x20-\x7e]*$/.test(nm) ? nm : 'priloha.pdf'}"; filename*=${star}`, '',
      wrap76(bytesToB64(attachment.bytes)), '');
  }
  L.push(`--${b1}--`, '');
  return L.join('\r\n');
}

export const toBase64Url = (str) => bytesToB64(enc.encode(str)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export async function sendViaGmail(mime) {
  const t = await ensureGmailToken();
  const raw = toBase64Url(mime);
  const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST', headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: JSON.stringify({ raw }) });
  if (!r.ok) {
    let msg = '';
    try { msg = (await r.json()).error.message; } catch (_) { msg = await r.text().catch(() => ''); }
    if (r.status === 403) throw new Error('Gmail odmítl odeslání (403). Zkontrolujte, že je v Google Cloudu zapnuté Gmail API a oprávnění gmail.send. ' + String(msg).slice(0, 160));
    throw new Error('Gmail: ' + r.status + ' ' + String(msg).slice(0, 200));
  }
  return r.json();
}
