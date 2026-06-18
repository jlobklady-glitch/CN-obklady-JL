// ═══ zakaznici.js — JL-OBKLADY CN v4 ═══
async function pageZakaznici() {
  const data    = await dbGetAll('zakaznici');
  const nabidky = await dbGetAll('nabidky');

  // Spočítat zakázky per zákazník
  const zakNabidky = {};
  nabidky.forEach(n => {
    if (n.zakId) {
      if (!zakNabidky[n.zakId]) zakNabidky[n.zakId] = { count: 0, total: 0, posledni: null };
      zakNabidky[n.zakId].count++;
      zakNabidky[n.zakId].total += parseFloat(n.cenaCelkem || 0);
      if (!zakNabidky[n.zakId].posledni || n.datum > zakNabidky[n.zakId].posledni)
        zakNabidky[n.zakId].posledni = n.datum;
    }
  });

  return `
    <div class="header-bar">
      <span class="logo">👤</span>
      <div style="flex:1">
        <h1>Zákazníci</h1>
        <div class="subtitle">${data.length} zákazníků</div>
      </div>
      <button onclick="openGlobalSearch()"
        style="background:rgba(255,255,255,0.12);border:1.5px solid rgba(255,255,255,0.2);
          color:white;border-radius:var(--r-sm);padding:0.4rem 0.7rem;font-size:0.82rem;
          font-weight:600;cursor:pointer;font-family:var(--f-body)">🔍</button>
    </div>

    <div class="card">
      <div class="card-title">Nový zákazník</div>
      <div class="field">
        <label>Jméno / Firma</label>
        <input id="zak_jmeno" placeholder="Jan Novák">
      </div>
      <div class="field-row">
        <div class="field">
          <label>Telefon</label>
          <input id="zak_tel" type="tel" placeholder="+420 …">
        </div>
        <div class="field">
          <label>Email</label>
          <input id="zak_email" type="email">
        </div>
      </div>
      <div class="field">
        <label>Adresa</label>
        <input id="zak_adresa">
      </div>
      <button class="btn btn-primary" onclick="saveZakaznik()">💾 Uložit</button>

      <div style="margin-top:0.9rem;padding-top:0.9rem;border-top:1px solid var(--c-border)">
        <div class="card-title">📥 Import ze CSV</div>
        <p style="font-size:0.78rem;color:var(--c-ink3);margin-bottom:0.5rem">
          Formát: Jméno, Telefon, Email, Adresa (první řádek = záhlaví)
        </p>
        <div style="position:relative;background:var(--c-s2);border:2px dashed var(--c-border);
          border-radius:var(--r-sm);padding:0.8rem;text-align:center;cursor:pointer"
          onclick="document.getElementById('zakCsvInput').click()">
          <span style="font-weight:600;color:var(--c-terra);font-size:0.88rem">
            📂 Vybrat CSV soubor
          </span>
          <input type="file" id="zakCsvInput" accept=".csv,.txt"
            style="position:absolute;opacity:0;width:1px;height:1px"
            onchange="importZakaznici(this)">
        </div>
      </div>
    </div>

    ${data.length === 0 ? `
    <div class="card">
      <div class="empty">
        <span class="icon">👤</span>
        <p>Žádní zákazníci. Přidej prvního!</p>
      </div>
    </div>` :
    data.map(z => {
      const stats = zakNabidky[z.id];
      return `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div style="flex:1">
            <div style="font-weight:700;font-size:0.95rem">${escHtml(z.jmeno)}</div>
            <div style="display:flex;gap:0.4rem;flex-wrap:wrap;margin-top:0.4rem">
              ${z.tel ? `
                <a href="tel:${z.tel}"
                  style="display:inline-flex;align-items:center;gap:0.2rem;padding:0.22rem 0.5rem;
                    background:var(--c-blue-s);color:var(--c-blue);border-radius:var(--r-pill);
                    text-decoration:none;font-size:0.76rem;font-weight:600">
                  📞 ${escHtml(z.tel)}
                </a>` : ''}
              ${z.email ? `
                <a href="mailto:${z.email}"
                  style="display:inline-flex;align-items:center;gap:0.2rem;padding:0.22rem 0.5rem;
                    background:var(--c-green-s);color:var(--c-green);border-radius:var(--r-pill);
                    text-decoration:none;font-size:0.76rem;font-weight:600">
                  ✉️ ${escHtml(z.email)}
                </a>` : ''}
              ${z.tel ? `
                <a href="https://wa.me/${z.tel.replace(/\D/g, '')}" target="_blank"
                  style="display:inline-flex;align-items:center;gap:0.2rem;padding:0.22rem 0.5rem;
                    background:var(--c-green-s);color:var(--c-green);border-radius:var(--r-pill);
                    text-decoration:none;font-size:0.76rem;font-weight:600">
                  💬 WA
                </a>` : ''}
            </div>
            ${z.adresa ? `
              <div style="font-size:0.76rem;color:var(--c-ink3);margin-top:0.3rem">
                📍 ${escHtml(z.adresa)}
              </div>` : ''}
            ${stats ? `
              <div style="display:flex;gap:0.5rem;margin-top:0.5rem;flex-wrap:wrap">
                <span style="font-size:0.72rem;background:var(--c-s2);padding:0.18rem 0.5rem;
                  border-radius:var(--r-pill);color:var(--c-ink2)">
                  📋 ${stats.count} zakázek
                </span>
                <span style="font-size:0.72rem;background:var(--c-terra-soft);
                  color:var(--c-terra);padding:0.18rem 0.5rem;border-radius:var(--r-pill);
                  font-weight:600">
                  ${stats.total.toLocaleString('cs')} Kč
                </span>
                ${stats.posledni ? `
                  <span style="font-size:0.7rem;color:var(--c-ink3);padding:0.18rem 0.4rem">
                    poslední: ${stats.posledni}
                  </span>` : ''}
              </div>` : ''}
          </div>
          <button class="btn btn-danger btn-sm" onclick="deleteZakaznik(${z.id})"
            style="flex-shrink:0;margin-left:0.5rem">🗑️</button>
        </div>
        <div style="display:flex;gap:0.4rem;margin-top:0.65rem">
          ${stats ? `
            <button class="btn btn-secondary btn-sm"
              onclick="sessionStorage.setItem('nabidkyFilter','vse');navigate('nabidky')"
              style="font-size:0.74rem;flex:1;justify-content:center">📋 Zakázky →</button>` : ''}
          <button class="btn btn-primary btn-sm" onclick="navigate('novaNabidka')"
            style="font-size:0.74rem;flex:1;justify-content:center">➕ Nová nabídka</button>
        </div>
      </div>`;
    }).join('')}
  `;
}

async function saveZakaznik() {
  const jmeno = v('zak_jmeno');
  if (!jmeno) return toast('Zadej jméno', 'err');
  await dbPut('zakaznici', {
    jmeno, tel: v('zak_tel'), email: v('zak_email'), adresa: v('zak_adresa')
  });
  toast('Zákazník uložen ✓');
  await render();
}

async function deleteZakaznik(id) {
  if (!confirm('Smazat zákazníka?')) return;
  await dbDelete('zakaznici', id);
  await render();
}

// ── Symboly pro kreslení půdorysu ─────────────────────────
const SYMBOLS = {
  sprcha:   { label: '🚿 Sprcha',    draw(ctx, x, y, s) { ctx.strokeStyle='#2563eb';ctx.lineWidth=2;ctx.strokeRect(x-s/2,y-s/2,s,s);ctx.beginPath();ctx.arc(x,y,s*0.28,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(x,y-s*0.15);ctx.lineTo(x,y+s*0.38);ctx.stroke(); } },
  vana:     { label: '🛁 Vana',      draw(ctx, x, y, s) { ctx.strokeStyle='#2563eb';ctx.lineWidth=2;ctx.strokeRect(x-s/2,y-s*0.35,s,s*0.7);ctx.beginPath();ctx.arc(x-s*0.3,y-s*0.1,s*0.15,0,Math.PI*2);ctx.stroke(); } },
  zachod:   { label: '🚽 Záchod',    draw(ctx, x, y, s) { ctx.strokeStyle='#2563eb';ctx.lineWidth=2;ctx.strokeRect(x-s*0.3,y-s*0.45,s*0.6,s*0.2);ctx.beginPath();ctx.ellipse(x,y+s*0.05,s*0.38,s*0.38,0,0,Math.PI*2);ctx.stroke(); } },
  umyvadlo: { label: '🪣 Umyvadlo',  draw(ctx, x, y, s) { ctx.strokeStyle='#2563eb';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y,s*0.42,s*0.32,0,0,Math.PI*2);ctx.stroke();ctx.strokeRect(x-s*0.42,y-s*0.45,s*0.84,s*0.18); } },
  dvere:    { label: '🚪 Dveře',     draw(ctx, x, y, s) { ctx.strokeStyle='#1C1917';ctx.lineWidth=2;ctx.strokeRect(x-s/2,y-s*0.05,s*0.08,s*0.9);ctx.beginPath();ctx.arc(x-s/2,y-s*0.05,s*0.9,0,Math.PI/2);ctx.stroke(); } },
  okno:     { label: '🪟 Okno',      draw(ctx, x, y, s) { ctx.strokeStyle='#1C1917';ctx.lineWidth=2;ctx.strokeRect(x-s/2,y-s*0.12,s,s*0.24);ctx.beginPath();ctx.moveTo(x,y-s*0.12);ctx.lineTo(x,y+s*0.12);ctx.stroke(); } },
  radiator: { label: '♨️ Radiátor', draw(ctx, x, y, s) { ctx.strokeStyle='#dc2626';ctx.lineWidth=2;ctx.strokeRect(x-s/2,y-s*0.2,s,s*0.4);for(let i=1;i<5;i++){ctx.beginPath();ctx.moveTo(x-s/2+i*s/5,y-s*0.2);ctx.lineTo(x-s/2+i*s/5,y+s*0.2);ctx.stroke();} } },
  schody:   { label: '🪜 Schody',    draw(ctx, x, y, s) { ctx.strokeStyle='#1C1917';ctx.lineWidth=1.5;const step=s/4;for(let i=0;i<4;i++){ctx.strokeRect(x-s/2+i*step,y-s/2+i*step,s-i*step,step);} } },
  sloup:    { label: '⬛ Sloup',     draw(ctx, x, y, s) { ctx.fillStyle='#1C1917';ctx.fillRect(x-s*0.2,y-s*0.2,s*0.4,s*0.4); } },
  kuchyn:   { label: '🍳 Sporák',    draw(ctx, x, y, s) { ctx.strokeStyle='#555';ctx.lineWidth=1.5;ctx.strokeRect(x-s/2,y-s/2,s,s);for(const[ox,oy] of [[-0.25,-0.25],[0.25,-0.25],[-0.25,0.25],[0.25,0.25]]){ctx.beginPath();ctx.arc(x+ox*s,y+oy*s,s*0.18,0,Math.PI*2);ctx.stroke();} } },
};

// ── Sparořez konstanty ────────────────────────────────────
const SPAROREZ_VZORY = [
  { id:'brick',    label:'Cihla (1/2)',  desc:'Každá řada posunuta o půl dlaždice — nejčastější, minimální odpad' },
  { id:'stack',    label:'Stacking',     desc:'Přímé spáry — moderní look, vhodné pro velkoformát' },
  { id:'third',    label:'1/3 offset',   desc:'Posun o 1/3 — kompromis mezi cihlou a stackingem' },
  { id:'herring',  label:'Rybí kost',    desc:'45° nebo 90° vzor — luxusní efekt, více odpadu ~15%' },
  { id:'diagonal', label:'Diagonála',    desc:'Dlaždice natočené 45° — vizuálně zvětšuje prostor, odpad ~20%' },
  { id:'versaille',label:'Versailles',   desc:'Mix formátů (4:2:1) — historický vzor, náročná pokládka' },
];

// ── MEP typy & kategorie ──────────────────────────────────
const MEP_TYPES = [
  { id:'studena_voda', icon:'💧', label:'Studená voda',     color:'#3b82f6', line:'#93c5fd', cat:'voda'   },
  { id:'tepla_voda',   icon:'🌡️', label:'Teplá voda',      color:'#ef4444', line:'#fca5a5', cat:'voda'   },
  { id:'odpad',        icon:'⬛', label:'Odpad/kanalizace', color:'#78716c', line:'#d6d3d1', cat:'voda'   },
  { id:'elektro_sil',  icon:'⚡', label:'Silnoproud',        color:'#eab308', line:'#fef08a', cat:'elektro'},
  { id:'zasuvka',      icon:'🔌', label:'Zásuvka 230V',      color:'#f97316', line:'#fed7aa', cat:'elektro'},
  { id:'zasuvka_usb',  icon:'🔋', label:'Zásuvka USB',       color:'#f97316', line:'#fed7aa', cat:'elektro'},
  { id:'vypinac',      icon:'🔲', label:'Vypínač',            color:'#94a3b8', line:'#e2e8f0', cat:'elektro'},
  { id:'svetlo',       icon:'💡', label:'Světelný bod',       color:'#fbbf24', line:'#fde68a', cat:'elektro'},
  { id:'spot',         icon:'🔆', label:'Spot / podhled',     color:'#fbbf24', line:'#fde68a', cat:'elektro'},
  { id:'vetrani',      icon:'🌀', label:'Větrání (odvod)',    color:'#06b6d4', line:'#a5f3fc', cat:'vzduchotechnika'},
  { id:'vetrani_priv', icon:'💨', label:'Větrání (přívod)',   color:'#0ea5e9', line:'#bae6fd', cat:'vzduchotechnika'},
  { id:'klimatizace',  icon:'❄️', label:'Klimatizace',        color:'#0284c7', line:'#bae6fd', cat:'vzduchotechnika'},
  { id:'pod_topeni',   icon:'♨️', label:'Podlah. topení',    color:'#dc2626', line:'#fca5a5', cat:'topeni' },
  { id:'radiator_prip',icon:'🔥', label:'Přípojka radiátoru', color:'#ea580c', line:'#fdba74', cat:'topeni' },
  { id:'plyn',         icon:'🟠', label:'Plyn',               color:'#f97316', line:'#fed7aa', cat:'plyn'   },
  { id:'data',         icon:'📡', label:'Datový kabel',        color:'#8b5cf6', line:'#c4b5fd', cat:'data'   },
  { id:'antena',       icon:'📺', label:'TV anténa / SAT',     color:'#7c3aed', line:'#ddd6fe', cat:'data'   },
];

const MEP_CATS = {
  'voda':            { icon:'💧', label:'Voda & kanalizace' },
  'elektro':         { icon:'⚡', label:'Elektroinstalace'  },
  'vzduchotechnika': { icon:'🌀', label:'Vzduchotechnika'   },
  'topeni':          { icon:'♨️', label:'Topení'            },
  'plyn':            { icon:'🟠', label:'Plyn'              },
  'data':            { icon:'📡', label:'Data & signal'      },
};
