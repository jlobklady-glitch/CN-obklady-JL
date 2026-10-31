// Ukládání souborů na Google Disk (přístup jen k souborům, které vytvoří tato aplikace).
import { GOOGLE_CLIENT_ID } from './config.js';

let tokenClient = null, token = null, tokenExp = 0;
const FOLDER = 'JL-OBKLADY zálohy';

export const ensureDriveToken = () => getToken();
export const driveReady = () => !!GOOGLE_CLIENT_ID;

function loadGsi() {
  if (window.google && window.google.accounts) return Promise.resolve();
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client'; s.onload = res; s.onerror = () => rej(new Error('Nepodařilo se načíst přihlášení Google (jste online?)'));
    document.head.append(s);
  });
}

async function getToken() {
  if (token && Date.now() < tokenExp - 30000) return token;
  await loadGsi();
  return new Promise((res, rej) => {
    tokenClient = tokenClient || window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID, scope: 'https://www.googleapis.com/auth/drive.file', callback: () => {} });
    tokenClient.callback = (r) => {
      if (r.error) return rej(new Error('Google: ' + (r.error_description || r.error)));
      token = r.access_token; tokenExp = Date.now() + Number(r.expires_in || 3600) * 1000; res(token);
    };
    tokenClient.error_callback = (e) => rej(new Error('Přihlášení k Googlu bylo zrušeno (' + (e.type || 'chyba') + ')'));
    tokenClient.requestAccessToken({ prompt: token ? '' : 'consent' });
  });
}

async function api(url, opts = {}) {
  const t = await getToken();
  const r = await fetch(url, { ...opts, headers: { Authorization: 'Bearer ' + t, ...(opts.headers || {}) } });
  if (!r.ok) throw new Error('Disk: ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return r.json();
}

async function folderId(name = FOLDER) {
  const q = encodeURIComponent(`name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const f = await api(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`);
  if (f.files.length) return f.files[0].id;
  const c = await api('https://www.googleapis.com/drive/v3/files?fields=id', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder' }) });
  return c.id;
}

export async function uploadToDrive(name, blob, folder) {
  const parent = await folderId(folder);
  const meta = { name, parents: [parent] };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
  form.append('file', blob);
  const t = await getToken();
  const r = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name', { method: 'POST', headers: { Authorization: 'Bearer ' + t }, body: form });
  if (!r.ok) throw new Error('Disk: ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return r.json();
}
