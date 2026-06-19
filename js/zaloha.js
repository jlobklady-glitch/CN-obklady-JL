// ═══ zaloha.js — JL-OBKLADY CN v4 ═══

async function exportZaloha() {
  try {
    toast('Připravuji zálohu…');
    const stores = ['ceniky','nabidky','prace','zakaznici','nastaveni','fotky','pracovnici','hodiny','sklad'];
    const zaloha = { verze: 2, datum: new Date().toISOString(), data: {} };

    for (const store of stores) {
      try   { zaloha.data[store] = await dbGetAll(store); }
      catch (e) { zaloha.data[store] = []; }
    }

    const json  = JSON.stringify(zaloha, null, 2);
    const blob  = new Blob([json], { type: 'application/json' });
    const url   = URL.createObjectURL(blob);
    const datum = new Date().toISOString().slice(0, 10);
    const a     = document.createElement('a');
    a.href     = url;
    a.download = `jl-obklady-zaloha-${datum}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);

    const pocet = Object.values(zaloha.data).reduce((s, v) => s + (v?.length || 0), 0);
    toast(`✓ Záloha stažena — ${pocet} záznamů`);
  } catch (e) {
    toast('Chyba zálohy: ' + e.message, 'err');
  }
}

async function importZaloha(input) {
  const file = input.files[0];
  if (!file) return;
  if (!file.name.endsWith('.json')) { toast('Vyber .json soubor zálohy', 'err'); return; }

  const potvrdit = confirm(
    'Opravdu importovat zálohu?\n\n' +
    'POZOR: Stávající data budou sloučena.\n' +
    'Záznamy se stejným ID se přepíší, nové se přidají.'
  );
  if (!potvrdit) { input.value = ''; return; }

  try {
    toast('Importuji zálohu…');
    const text  = await file.text();
    const zaloha = JSON.parse(text);

    if (!zaloha.data) { toast('Neplatný soubor zálohy', 'err'); return; }

    const stores    = ['ceniky','nabidky','prace','zakaznici','nastaveni','fotky','pracovnici','hodiny','sklad'];
    let celkem      = 0;
    const zachovejId = (zaloha.verze || 1) >= 2;

    for (const store of stores) {
      const zaznamy = zaloha.data[store] || [];
      for (const zaznam of zaznamy) {
        try {
          if (store === 'nastaveni') {
            await dbPut(store, zaznam);
          } else if (zachovejId) {
            await dbPut(store, zaznam);
          } else {
            const { id, ...bezId } = zaznam;
            await dbPut(store, bezId);
          }
          celkem++;
        } catch (e) { /* přeskočit konflikty */ }
      }
    }

    toast(`✓ Importováno ${celkem} záznamů`);
    input.value = '';
    await render();
  } catch (e) {
    toast('Chyba importu: ' + e.message, 'err');
    input.value = '';
  }
}

async function smazatVsechnaData() {
  const potvrzeni = prompt(
    'Tato akce NEVRATNĚ smaže všechna data!\n\n' +
    'Nejdřív si udělej zálohu!\n\n' +
    'Pro potvrzení napiš: SMAZAT'
  );
  if (potvrzeni !== 'SMAZAT') { toast('Smazání zrušeno'); return; }

  const stores = ['ceniky','nabidky','prace','zakaznici','nastaveni','fotky','pracovnici','hodiny','sklad'];
  for (const store of stores) {
    const vse = await dbGetAll(store);
    const kp  = store === 'nastaveni' ? 'klic' : 'id';
    for (const z of vse) await dbDelete(store, z[kp]);
  }
  toast('Všechna data smazána');
  await render();
}

// ── Vodoznak pro sociální sítě ────────────────────────────
function aplikovatVodoznak(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const cvs = document.getElementById('vodoznakCanvas');
      const ctx = cvs.getContext('2d');
      cvs.width  = img.width;
      cvs.height = img.height;
      ctx.drawImage(img, 0, 0);

      const fontSize = Math.max(28, Math.round(img.width / 18));
      ctx.font = `bold ${fontSize}px Outfit, DM Sans, sans-serif`;
      const text  = 'JL-OBKLADY';
      const textW = ctx.measureText(text).width;
      const x     = img.width  - textW - 20;
      const y     = img.height - 36;

      // Stín
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillText(text, x + 2, y + 2);
      // Hlavní text
      ctx.fillStyle = '#C8502A';
      ctx.fillText(text, x, y);

      const res = document.getElementById('vodoznakVysledek');
      res.src   = cvs.toDataURL('image/jpeg', 0.92);
      res.style.display = 'block';
      document.getElementById('vodoznakStahni').style.display = 'flex';
      toast('Vodoznak aplikován ✓');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function stahnoutVodoznak() {
  const cvs = document.getElementById('vodoznakCanvas');
  if (!cvs) return;
  const a = document.createElement('a');
  a.download = 'jl-obklady-' + new Date().toISOString().slice(0, 10) + '.jpg';
  a.href     = cvs.toDataURL('image/jpeg', 0.92);
  a.click();
  toast('Fotka stažena ✓');
}
