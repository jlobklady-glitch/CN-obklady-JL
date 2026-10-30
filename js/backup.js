// Záloha a obnova všech dat do jednoho souboru (JSON). Soubor lze uložit na Google Disk přes „Sdílet / Uložit“ v telefonu.
import { sb, loadAll, markBackupDone } from './store.js';
import { driveReady, uploadToDrive } from './drive.js';

const TABLES = [['settings', 'key'], ['contacts', 'id'], ['price_items', 'id'], ['quotes', 'id'], ['invoices', 'id'], ['records', 'id']];

async function all(table) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select('*').range(from, from + 999);
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

export async function buildBackup() {
  const data = { app: 'jl-obklady', created: new Date().toISOString(), tables: {} };
  for (const [t] of TABLES) data.tables[t] = await all(t);
  const name = `JL-OBKLADY-zaloha-${data.created.slice(0, 10)}.json`;
  return { data, name, blob: new Blob([JSON.stringify(data)], { type: 'application/json' }), counts: counts(data) };
}

export async function makeBackup() {
  const data = { app: 'jl-obklady', created: new Date().toISOString(), tables: {} };
  for (const [t] of TABLES) data.tables[t] = await all(t);
  const name = `JL-OBKLADY-zaloha-${data.created.slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); await markBackupDone().catch(() => {}); return { name, shared: true, counts: counts(data) }; } catch (e) { if (e.name === 'AbortError') return { name, cancelled: true }; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  await markBackupDone().catch(() => {});
  return { name, counts: counts(data) };
}
const counts = (d) => Object.entries(d.tables).map(([k, v]) => `${k}: ${v.length}`).join(', ');

export async function restoreBackup(file, onProgress) {
  const data = JSON.parse(await file.text());
  if (data.app !== 'jl-obklady' || !data.tables) throw new Error('Toto není záloha aplikace JL-OBKLADY.');
  for (const [t, key] of TABLES) {
    const rows = data.tables[t] || [];
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await sb.from(t).upsert(rows.slice(i, i + 200), { onConflict: key });
      if (error) throw new Error(`${t}: ${error.message}`);
      onProgress && onProgress(`${t}: ${Math.min(rows.length, i + 200)}/${rows.length}`);
    }
  }
  await loadAll();
  return counts(data);
}

// Záloha na Google Disk (a zapsání data poslední zálohy)
export async function backupToDrive() {
  if (!driveReady()) throw new Error('Google Disk není připojen.');
  const b = await buildBackup();
  const r = await uploadToDrive(b.name, b.blob);
  await markBackupDone().catch(() => {});
  return { name: r.name, counts: b.counts };
}
