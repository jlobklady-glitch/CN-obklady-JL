// ═══ fotky.js — JL-OBKLADY CN v4 ═══
async function pageFotky() {
  const nabidkaId   = state.nabidkaId || null;
  const nazev       = state.nazevNabidky || 'Všechny fotky';
  let vsechnyFotky  = await dbGetAll('fotky');
  const fotky       = nabidkaId
    ? vsechnyFotky.filter(f => f.nabidkaId === nabidkaId)
    : vsechnyFotky;
  const kategorie   = ['Před zahájením','Průběh prací','Dokončeno','Detail','Ostatní'];

  return `
    <div class="header-bar">
      <span class="logo">📸</span>
      <div style="flex:1">
        <h1>Fotodokumentace</h1>
        <div class="subtitle">${escHtml(nazev)} · ${fotky.length} fotek</div>
      </div>
    </div>

    <!-- Přidat foto -->
    <div class="card">
      <div class="card-title">📷 Přidat foto / video</div>
      ${nabidkaId ? '' : `
        <div class="field">
          <label>Zakázka (volitelné)</label>
          <select id="foto_nabidka"
            style="width:100%;padding:0.6rem;border:1.5px solid var(--c-border);
              border-radius:var(--r-sm);font-family:var(--f-body);font-size:0.9rem;
              background:var(--c-bg);color:var(--c-ink)">
            <option value="">— bez zakázky —</option>
          </select>
        </div>`}
      <div class="field">
        <label>Kategorie</label>
        <select id="foto_kat"
          style="width:100%;padding:0.6rem;border:1.5px solid var(--c-border);
            border-radius:var(--r-sm);font-family:var(--f-body);font-size:0.9rem;
            background:var(--c-bg);color:var(--c-ink)">
          ${kategorie.map(k => `<option>${k}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>Popis (volitelné)</label>
        <input id="foto_popis" placeholder="Např.: Stav podkladu před pokládkou">
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.5rem">
        <label style="display:flex;flex-direction:column;align-items:center;gap:0.3rem;
          background:var(--c-s2);border:2px dashed var(--c-border);border-radius:var(--r-sm);
          padding:1rem;cursor:pointer;text-align:center;transition:border-color var(--dur)"
          onmouseenter="this.style.borderColor='var(--c-terra)'"
          onmouseleave="this.style.borderColor='var(--c-border)'">
          <span style="font-size:1.8rem">📷</span>
          <span style="font-size:0.78rem;font-weight:600;color:var(--c-ink2)">Fotoaparát</span>
          <input type="file" accept="image/*" capture="environment" style="display:none"
            onchange="uložitFotky(this,${nabidkaId || 'null'})">
        </label>
        <label style="display:flex;flex-direction:column;align-items:center;gap:0.3rem;
          background:var(--c-s2);border:2px dashed var(--c-border);border-radius:var(--r-sm);
          padding:1rem;cursor:pointer;text-align:center;transition:border-color var(--dur)"
          onmouseenter="this.style.borderColor='var(--c-terra)'"
          onmouseleave="this.style.borderColor='var(--c-border)'">
          <span style="font-size:1.8rem">🖼️</span>
          <span style="font-size:0.78rem;font-weight:600;color:var(--c-ink2)">Z galerie</span>
          <input type="file" accept="image/*,video/*" multiple style="display:none"
            onchange="uložitFotky(this,${nabidkaId || 'null'})">
        </label>
      </div>
      <div id="fotoProgress"
        style="display:none;text-align:center;font-size:0.85rem;color:var(--c-ink2);padding:0.5rem">
        <div class="spinner" style="margin:0 auto 0.4rem"></div>
        Ukládám…
      </div>
    </div>

    <!-- Vodoznak -->
    <div class="card" style="border:2px solid #8b5cf6">
      <div class="card-title" style="color:#7c3aed">📢 Vodoznak pro sociální sítě</div>
      <p style="font-size:0.82rem;color:var(--c-ink2);margin-bottom:0.8rem;line-height:1.5">
        Nahraj fotku realizace — systém do ní automaticky vypálí logo
        <strong>JL-OBKLADY</strong> pro sociální sítě.
      </p>
      <div style="position:relative;background:var(--c-s2);border:2px dashed #c4b5fd;
        border-radius:var(--r-sm);padding:1rem;text-align:center;cursor:pointer;
        margin-bottom:0.6rem"
        onclick="document.getElementById('vodoznakInput').click()">
        <span style="font-size:1.5rem">🖼️</span>
        <span style="font-weight:600;color:#7c3aed;margin-left:0.5rem;font-size:0.88rem">
          Vybrat fotku pro vodoznak
        </span>
        <input type="file" id="vodoznakInput" accept="image/*"
          style="position:absolute;opacity:0;width:1px;height:1px"
          onchange="aplikovatVodoznak(this)">
      </div>
      <canvas id="vodoznakCanvas" style="display:none"></canvas>
      <img id="vodoznakVysledek"
        style="width:100%;border-radius:var(--r-sm);display:none;margin-bottom:0.6rem" alt="Výsledek">
      <button id="vodoznakStahni" class="btn btn-success"
        style="display:none" onclick="stahnoutVodoznak()">
        ⬇️ Stáhnout fotku s vodoznakem
      </button>
    </div>

    <!-- Galerie -->
    ${fotky.length === 0 ? `
    <div class="card">
      <div class="empty">
        <span class="icon">📸</span>
        <p>Zatím žádné fotky. Vyfot první záběr!</p>
      </div>
    </div>` : `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.7rem">
        <div class="card-title" style="margin:0">Galerie (${fotky.length})</div>
        ${nabidkaId ? `
          <button class="btn btn-secondary btn-sm" onclick="exportFotkyZip(${nabidkaId})">
            📦 Export ZIP
          </button>` : ''}
      </div>
      ${kategorie.map(kat => {
        const katFotky = fotky.filter(f => f.kategorie === kat);
        if (!katFotky.length) return '';
        return `
          <div style="margin-bottom:1rem">
            <div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;
              letter-spacing:0.08em;color:var(--c-ink3);margin-bottom:0.5rem">
              ${kat}
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.35rem">
              ${katFotky.map(f => `
                <div style="position:relative;aspect-ratio:1;overflow:hidden;
                  border-radius:var(--r-xs);border:1px solid var(--c-border);
                  background:var(--c-s2)">
                  ${f.isVideo
                    ? `<div style="width:100%;height:100%;display:flex;flex-direction:column;
                        align-items:center;justify-content:center;gap:0.2rem;padding:0.3rem">
                        <span style="font-size:1.8rem">🎬</span>
                        <span style="font-size:0.58rem;color:var(--c-ink3);text-align:center;
                          word-break:break-all;line-height:1.2">
                          ${escHtml(f.nazevSouboru || 'video')}
                        </span>
                      </div>`
                    : `<img src="${f.dataUrl}"
                        style="width:100%;height:100%;object-fit:cover;cursor:pointer"
                        onclick="zobrazitFoto('${f.id}')" loading="lazy">`
                  }
                  <button onclick="smazatFoto(${f.id})"
                    style="position:absolute;top:3px;right:3px;
                      background:rgba(22,20,15,0.6);color:white;border:none;border-radius:50%;
                      width:20px;height:20px;cursor:pointer;font-size:0.68rem;
                      display:flex;align-items:center;justify-content:center">✕</button>
                </div>`).join('')}
            </div>
          </div>`;
      }).join('')}
    </div>`}

    <!-- Lightbox -->
    <div id="lightbox"
      style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.94);z-index:500;
        align-items:center;justify-content:center;flex-direction:column;
        backdrop-filter:blur(12px)"
      onclick="document.getElementById('lightbox').style.display='none'">
      <img id="lightboxImg"
        style="max-width:96vw;max-height:88dvh;border-radius:var(--r-sm);object-fit:contain">
      <div id="lightboxCaption"
        style="color:rgba(255,255,255,0.6);margin-top:0.8rem;font-size:0.82rem;text-align:center">
      </div>
    </div>

    ${nabidkaId
      ? `<button class="btn btn-secondary btn-full"
           onclick="navigate('nabidkaDetail',{editId:${nabidkaId}})">
           ⬅️ Zpět na zakázku
         </button>`
      : `<button class="btn btn-secondary btn-full" onclick="navigate('dashboard')">
           ⬅️ Zpět na přehled
         </button>`}
  `;
}

// ── Ukládání fotek ────────────────────────────────────────
async function uložitFotky(input, nabidkaId) {
  const files = Array.from(input.files);
  if (!files.length) return;

  const MAX_IMG_SIZE = 8 * 1024 * 1024;
  const MAX_VID_SIZE = 50 * 1024 * 1024;

  const fotoProgress = document.getElementById('fotoProgress');
  if (fotoProgress) fotoProgress.style.display = 'block';

  const kat    = document.getElementById('foto_kat')?.value || 'Ostatní';
  const popis  = document.getElementById('foto_popis')?.value || '';
  const nId    = nabidkaId || (document.getElementById('foto_nabidka')?.value
    ? parseInt(document.getElementById('foto_nabidka').value) : null);

  let ulozeno = 0, preskoceno = 0;

  for (const file of files) {
    const isVideo = file.type.startsWith('video');
    const maxSize = isVideo ? MAX_VID_SIZE : MAX_IMG_SIZE;

    if (file.size > maxSize) {
      preskoceno++;
      toast(`⚠ ${file.name} přeskočeno — ${isVideo ? 'max 50 MB' : 'max 8 MB'}`, 'err');
      continue;
    }

    if (isVideo) {
      await dbPut('fotky', {
        nabidkaId: nId, kategorie: kat, popis,
        dataUrl:   null, isVideo: true,
        videoMeta: { name: file.name, size: file.size, type: file.type },
        datum:     new Date().toISOString().slice(0, 10),
        typ:       'video', nazevSouboru: file.name,
      });
    } else {
      const compressed = await _compressImageEfficient(file);
      if (!compressed) { preskoceno++; continue; }
      await dbPut('fotky', {
        nabidkaId: nId, kategorie: kat, popis,
        dataUrl:   compressed,
        datum:     new Date().toISOString().slice(0, 10),
        typ:       'foto', nazevSouboru: file.name,
      });
    }
    ulozeno++;
  }

  if (fotoProgress) fotoProgress.style.display = 'none';
  if (ulozeno > 0) {
    toast(`✓ Uloženo ${ulozeno} souborů${preskoceno ? ', ' + preskoceno + ' přeskočeno' : ''}`);
  }
  await render();
}

// ── Efektivní komprese obrázku ────────────────────────────
async function _compressImageEfficient(file) {
  try {
    const MAX_DIM = 1100;
    const QUALITY = 0.80;

    if (typeof createImageBitmap !== 'undefined') {
      const bitmap = await createImageBitmap(file);
      const { width, height } = bitmap;
      const scale   = Math.min(1, MAX_DIM / Math.max(width, height));
      const canvas  = document.createElement('canvas');
      canvas.width  = Math.round(width  * scale);
      canvas.height = Math.round(height * scale);
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      return canvas.toDataURL('image/jpeg', QUALITY);
    }

    return new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const scale   = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
          const canvas  = document.createElement('canvas');
          canvas.width  = Math.round(img.width  * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          res(canvas.toDataURL('image/jpeg', QUALITY));
        };
        img.onerror = () => rej(new Error('Načtení obrázku selhalo'));
        img.src = e.target.result;
      };
      reader.onerror = () => rej(new Error('Čtení souboru selhalo'));
      reader.readAsDataURL(file);
    });
  } catch (e) {
    toast('Chyba komprese: ' + e.message, 'err');
    return null;
  }
}

async function smazatFoto(id) {
  if (!confirm('Smazat tuto fotku?')) return;
  await dbDelete('fotky', id);
  toast('Fotka smazána');
  await render();
}

function zobrazitFoto(id) {
  const lb    = document.getElementById('lightbox');
  const imgEl = document.getElementById('lightboxImg');
  const imgSrc = document.querySelector(`img[onclick="zobrazitFoto('${id}')"]`)?.src;
  if (imgSrc) {
    imgEl.src = imgSrc;
    lb.style.display = 'flex';
  }
}

async function exportFotkyZip(nabidkaId) {
  toast('Stahuju každou fotku zvlášť (ZIP vyžaduje doplněk)');
  const vsechnyFotky  = await dbGetAll('fotky');
  const exportFotky   = vsechnyFotky.filter(f => f.nabidkaId === nabidkaId);
  exportFotky.forEach((f, i) => {
    if (!f.dataUrl) return;
    setTimeout(() => {
      const a = document.createElement('a');
      a.href     = f.dataUrl;
      a.download = `foto_${i + 1}_${(f.kategorie || '').replace(/ /g, '_')}.jpg`;
      a.click();
    }, i * 350);
  });
}

// ── Legacy compat ─────────────────────────────────────────
async function compressImage(dataUrl, maxW) {
  if (!dataUrl.startsWith('data:image')) return dataUrl;
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      const scale   = Math.min(1, maxW / img.width);
      const canvas  = document.createElement('canvas');
      canvas.width  = img.width  * scale;
      canvas.height = img.height * scale;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      res(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.src = dataUrl;
  });
}
