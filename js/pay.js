// Platba: IBAN z českého čísla účtu a QR kód ve formátu SPAYD.
export function czIban(account) {
  const m = String(account || '').replace(/\s/g, '').match(/^(?:(\d{0,6})-)?(\d{2,10})\/(\d{4})$/);
  if (!m) return '';
  const bban = m[3] + (m[1] || '').padStart(6, '0') + m[2].padStart(10, '0');
  const num = bban + '123500'; // CZ00
  let r = 0;
  for (const ch of num) r = (r * 10 + Number(ch)) % 97;
  return 'CZ' + String(98 - r).padStart(2, '0') + bban;
}
const noDia = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 .,\-]/g, '').toUpperCase().slice(0, 60);
export function spayd({ account, amount, vs, msg }) {
  const iban = czIban(account);
  if (!iban || !(amount > 0)) return '';
  let s = `SPD*1.0*ACC:${iban}*AM:${Number(amount).toFixed(2)}*CC:CZK`;
  const v = String(vs || '').replace(/\D/g, '').slice(0, 10);
  if (v) s += `*X-VS:${v}`;
  if (msg) s += `*MSG:${noDia(msg)}`;
  return s;
}
export function qrSvg(text) {
  if (!text || !window.qrcode) return '';
  const q = window.qrcode(0, 'M');
  q.addData(text); q.make();
  return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
}
