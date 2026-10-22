// ═══ db.js — JL-OBKLADY CN v4 ═══

const DB_NAME = 'jl-obklady-cn';
let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 8);
    req.onupgradeneeded = (e) => {
      const d = e.target.result;
      ['ceniky','nabidky','prace','zakaznici','nastaveni','fotky','sklad'].forEach(name => {
        if (!d.objectStoreNames.contains(name)) {
          const kp    = name === 'nastaveni' ? 'klic' : 'id';
          const store = d.createObjectStore(name, { keyPath: kp, autoIncrement: kp === 'id' });
          if (name === 'fotky') store.createIndex('nabidkaId', 'nabidkaId', { unique: false });
        }
      });
      if (!d.objectStoreNames.contains('pracovnici')) {
        d.createObjectStore('pracovnici', { keyPath: 'id', autoIncrement: true });
      }
      if (!d.objectStoreNames.contains('hodiny')) {
        const hs = d.createObjectStore('hodiny', { keyPath: 'id', autoIncrement: true });
        hs.createIndex('datum',       'datum',       { unique: false });
        hs.createIndex('pracovnikId', 'pracovnikId', { unique: false });
        hs.createIndex('nabidkaId',   'nabidkaId',   { unique: false });
      }
      // v7: store pro perzistenci půdorysového editoru (PS.rooms).
      // keyPath 'klic' — jeden záznam { klic:'PS_rooms', data: [...] }
      // stejný vzor jako 'nastaveni', ať se to chová konzistentně se zálohou.
      if (!d.objectStoreNames.contains('pudorys')) {
        d.createObjectStore('pudorys', { keyPath: 'klic' });
      }
      // v8: store pro ceník dodavatele Mapei (odděleně od obecného 'ceniky',
      // ať se nic nemíchá se stávajícím výběrem dlaždice v nabídce).
      if (!d.objectStoreNames.contains('mapei')) {
        const ms = d.createObjectStore('mapei', { keyPath: 'id', autoIncrement: true });
        ms.createIndex('kod', 'kod', { unique: false });
      }
    };
    req.onsuccess = (e) => { db = e.target.result; resolve(db); };
    req.onerror   = (e) => reject(e.target.error);
  });
}

// ── DB helpers ────────────────────────────────────────────
function dbTx(store, mode = 'readonly') {
  return db.transaction(store, mode).objectStore(store);
}
function dbGetAll(store) {
  return new Promise((r) => {
    const req = dbTx(store).getAll();
    req.onsuccess = () => r(req.result || []);
    req.onerror   = (e) => { console.error('dbGetAll', store, e); r([]); };
  });
}
function dbGet(store, id) {
  return new Promise((r) => {
    const req = dbTx(store).get(id);
    req.onsuccess = () => r(req.result || null);
    req.onerror   = (e) => { console.error('dbGet', store, id, e); r(null); };
  });
}
function dbPut(store, data) {
  return new Promise((r, rej) => {
    const req = dbTx(store, 'readwrite').put(data);
    req.onsuccess = () => r(req.result);
    req.onerror   = (e) => { console.error('dbPut', store, e); rej(e.target.error); };
  });
}
function dbDelete(store, id) {
  return new Promise((r, rej) => {
    const req = dbTx(store, 'readwrite').delete(id);
    req.onsuccess = () => r();
    req.onerror   = (e) => rej(e.target.error);
  });
}

// ── Bulk insert v jediné transakci (řeší N+1 sekvenční awaity) ──
function dbBulkInsert(store, items) {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(store, 'readwrite');
    const os  = tx.objectStore(store);
    let count = 0;
    tx.oncomplete = () => resolve(count);
    tx.onerror    = (e) => reject(e.target.error);
    tx.onabort    = (e) => reject(e.target.error);
    for (const item of items) {
      const req = os.add(item);
      req.onsuccess = () => count++;
    }
  });
}

// ── Pudorys persistence (PS.rooms) ─────────────────────────
// Jeden záznam ve store 'pudorys' s klíčem 'PS_rooms' nesoucí
// celé pole místností. Stejný vzor jako 'nastaveni'.
async function dbPudorysSave(rooms) {
  try {
    await dbPut('pudorys', { klic: 'PS_rooms', data: rooms, ulozeno: new Date().toISOString() });
  } catch (e) {
    console.error('dbPudorysSave selhalo', e);
  }
}
async function dbPudorysLoad() {
  try {
    const row = await dbGet('pudorys', 'PS_rooms');
    return row?.data || [];
  } catch (e) {
    console.error('dbPudorysLoad selhalo', e);
    return [];
  }
}

// ── App state & navigace ──────────────────────────────────
let state = { page: 'dashboard', editId: null };

async function navigate(page, extra) {
  if (state.page === 'novaNabidka' && page !== 'novaNabidka') {
    try { saveDraftNabidka(); } catch (e) {}
  }
  state = { page, ...(extra || {}) };
  await render();
}

// ── Globální helper: hodnota elementu ─────────────────────
function v(id) { return document.getElementById(id)?.value || ''; }

// ── Timestamp helper ──────────────────────────────────────
function _casRazitko() {
  const d = new Date();
  return {
    datum: d.toLocaleDateString('cs-CZ'),
    cas:   d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }),
    iso:   d.toISOString(),
  };
}
