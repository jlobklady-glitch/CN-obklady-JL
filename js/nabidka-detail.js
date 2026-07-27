// ═══ nabidka-detail.js — JL-OBKLADY CN v4 ═══
async function pageNabidkaDetail() {
  const n = await dbGet('nabidky', state.editId);
  if (!n) return `<div class="card"><p>Nabídka nenalezena.</p></div>`;

  let zakaznikInfo = null;
  if (n.zakId) {
    const z    = await dbGet('zakaznici', n.zakId);
    zakaznikInfo = z || null;
  }

  const selectedTexts = n.vybranéTexty || [];

  const stavColors = {
    nabidka: '#968E84', schvaleno: '#1A4FAA',
    probiha: '#C8502A', dokonceno: '#1E6B4A', zaplaceno: '#059669',
  };
  const stavLabels = {
    nabidka: '📋 Nabídka', schvaleno: '✅ Schváleno', probiha: '🔨 Probíhá',
    dokonceno: '🏁 Dokončeno', zaplaceno: '💶 Zaplaceno',
  };

  return `
    <div class="header-bar">
      <button onclick="navigate('nabidky')"
        style="background:none;border:none;font-size:1.3rem;cursor:pointer;
          color:white;padding:0.2rem">←</button>
      <div style="flex:1;min-width:0">
        <h1 style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:1.15rem">
          ${escHtml(n.nazev)}
        </h1>
        <div class="subtitle">
          ${formatCisloNabidky(n)}${n.revize > 1 ? ' · Rev.' + n.revize : ''} · ${n.datum}
        </div>
      </div>
    </div>

    <!-- ── STAV ── -->
    <div class="card">
      <div class="card-title">Stav zakázky</div>
      <div style="display:flex;gap:0.35rem;flex-wrap:wrap;margin-bottom:0.5rem">
        ${['nabidka','schvaleno','probiha','dokonceno','zaplaceno'].map(s => {
          const active = (n.stav || 'nabidka') === s;
          return `
            <button onclick="zmenitStav(${n.id},'${s}')"
              style="flex:1;min-width:72px;padding:0.42rem 0.3rem;border-radius:var(--r-sm);
                border:2px solid ${active ? stavColors[s] : 'var(--c-border)'};
                background:${active ? stavColors[s] + '18' : 'var(--c-s2)'};
                color:${active ? stavColors[s] : 'var(--c-ink2)'};
                font-weight:${active ? '700' : '400'};font-size:0.7rem;
                cursor:pointer;font-family:var(--f-body);
                transition:all var(--dur)">
              ${stavLabels[s]}
            </button>`;
        }).join('')}
      </div>
      ${(n.stav === 'schvaleno' || n.stav === 'probiha') ? `
        <button class="btn btn-full"
          style="background:var(--c-blue);color:white;margin-top:0.3rem"
          onclick="schvalitNabidku(${n.id})">
          ✅ Schválit nabídku — vytvořit složku projektu
        </button>` : ''}
    </div>

    <!-- ── PODPIS SCHVÁLENÍ ── -->
    ${n.schvalenoKym ? `
    <div class="card card-success" style="background:var(--c-green-s)">
      <div style="display:flex;align-items:center;gap:0.7rem">
        <span style="font-size:2rem">✅</span>
        <div style="flex:1">
          <div style="font-weight:700;color:var(--c-green);font-size:0.95rem">
            Zákazník přijal nabídku
          </div>
          <div style="font-size:0.8rem;color:var(--c-green)">
            👤 ${escHtml(n.schvalenoKym)} · 📅 ${n.schvalenoDatum || ''}
          </div>
        </div>
        <button onclick="otevritPodpisModal(${n.id})"
          style="background:none;border:1.5px solid var(--c-green);border-radius:var(--r-xs);
            padding:0.3rem 0.5rem;cursor:pointer;font-size:0.78rem;color:var(--c-green)">
          ✍️ Znovu
        </button>
      </div>
      ${n.podpis ? `
        <div style="margin-top:0.7rem;padding-top:0.7rem;border-top:1px solid #bbf7d0">
          <div style="font-size:0.68rem;color:var(--c-green);font-weight:700;margin-bottom:0.3rem;
            text-transform:uppercase;letter-spacing:0.06em">Podpis zákazníka:</div>
          <div style="background:white;border-radius:var(--r-xs);padding:0.5rem;
            display:inline-block;border:1px solid #d1fae5">
            <img src="${n.podpis}"
              style="max-width:200px;height:60px;object-fit:contain;display:block">
          </div>
        </div>` : `
        <button onclick="otevritPodpisModal(${n.id})"
          class="btn btn-secondary btn-sm" style="margin-top:0.5rem;border-color:var(--c-green);
            color:var(--c-green)">
          ✍️ Přidat podpis zákazníka
        </button>`}
    </div>` : ''}

    ${n.stavPozn && n.stavPozn.includes('Odmítnuto') ? `
    <div class="card" style="background:var(--c-red-s);border:2px solid #fecaca">
      <div style="display:flex;align-items:center;gap:0.7rem">
        <span style="font-size:2rem">❌</span>
        <div>
          <div style="font-weight:700;color:var(--c-red);font-size:0.95rem">Zákazník odmítl nabídku</div>
          <div style="font-size:0.8rem;color:var(--c-red)">${escHtml(n.stavPozn)}</div>
        </div>
      </div>
    </div>` : ''}

    <!-- ── PŘEHLED ── -->
    <div class="card">
      <div class="card-title">Přehled zakázky</div>
      <div class="result-box">
        <div class="result-row">
          <span>📋 Číslo</span>
          <span class="val" style="font-family:monospace;font-size:0.88rem">
            ${formatCisloNabidky(n)}${n.revize > 1 ? ' rev.' + n.revize : ''}
          </span>
        </div>
        <div class="result-row"><span>📐 Plocha</span><span class="val">${n.plocha} m²</span></div>
        <div class="result-row"><span>🪨 Materiál</span><span class="val">${escHtml(n.material || '—')}</span></div>
        <div class="result-row"><span>📦 Dlaždice</span><span class="val">${n.ks || '—'} ks</span></div>
        <div class="result-row"><span>🧱 Lepidlo</span><span class="val">${n.lepidlo || '—'} kg</span></div>
        <div class="result-row"><span>🧴 Spárovačka</span><span class="val">${n.sparovka || '—'} kg</span></div>
        ${n.termin ? `<div class="result-row"><span>📅 Termín</span><span class="val">${new Date(n.termin).toLocaleDateString('cs-CZ')}</span></div>` : ''}
        ${n.mistoRealizace ? `<div class="result-row"><span>📍 Místo</span><span class="val">${escHtml(n.mistoRealizace)}</span></div>` : ''}
        <hr class="divider">
        <div class="result-row"><span>Materiál</span><span class="val">${parseInt(n.cenaMatCelk || 0).toLocaleString('cs')} Kč</span></div>
        <div class="result-row"><span>Práce</span><span class="val">${parseInt(n.cenaPrace || 0).toLocaleString('cs')} Kč</span></div>
        ${n.dphSazba > 0 ? `
          <div class="result-row"><span>Základ bez DPH</span><span class="val">${parseInt(n.cenaZaklad || n.cenaCelkem || 0).toLocaleString('cs')} Kč</span></div>
          <div class="result-row"><span>DPH ${n.dphSazba} %</span><span class="val">${parseInt(n.dphCastka || 0).toLocaleString('cs')} Kč</span></div>` : ''}
        <div class="result-row">
          <span>💰 CELKEM</span>
          <span class="val" style="font-family:var(--f-display);font-size:1.1rem">
            ${parseInt(n.cenaCelkem).toLocaleString('cs')} Kč
          </span>
        </div>
        ${n.zalohaProc ? `
          <div class="result-row">
            <span>💳 Záloha ${n.zalohaProc}%</span>
            <span class="val">${Math.round(parseInt(n.cenaCelkem) * (n.zalohaProc / 100)).toLocaleString('cs')} Kč</span>
          </div>` : ''}
      </div>
    </div>

    ${n.pozn ? `
    <div class="card">
      <div class="card-title">Poznámka</div>
      <p style="font-size:0.9rem;line-height:1.55">${escHtml(n.pozn)}</p>
    </div>` : ''}

    <!-- ── ZÁKAZNÍK ── -->
    ${zakaznikInfo ? `
    <div class="card" style="background:var(--c-s2)">
      <div class="card-title">👤 Zákazník</div>
      <div style="font-weight:700;font-size:0.95rem">${escHtml(zakaznikInfo.jmeno)}</div>
      <div style="display:flex;gap:0.4rem;flex-wrap:wrap;margin-top:0.5rem">
        ${zakaznikInfo.tel ? `
          <a href="tel:${zakaznikInfo.tel}"
            style="display:inline-flex;align-items:center;gap:0.3rem;padding:0.3rem 0.65rem;
              background:var(--c-blue-s);color:var(--c-blue);border-radius:var(--r-pill);
              text-decoration:none;font-size:0.8rem;font-weight:600">
            📞 ${escHtml(zakaznikInfo.tel)}
          </a>` : ''}
        ${zakaznikInfo.email ? `
          <a href="mailto:${zakaznikInfo.email}"
            style="display:inline-flex;align-items:center;gap:0.3rem;padding:0.3rem 0.65rem;
              background:var(--c-green-s);color:var(--c-green);border-radius:var(--r-pill);
              text-decoration:none;font-size:0.8rem;font-weight:600">
            ✉️ ${escHtml(zakaznikInfo.email)}
          </a>` : ''}
        ${zakaznikInfo.adresa ? `
          <span style="font-size:0.76rem;color:var(--c-ink3);align-self:center">
            📍 ${escHtml(zakaznikInfo.adresa)}
          </span>` : ''}
      </div>
    </div>` : ''}

    <!-- ── FOTODOKUMENTACE ── -->
    <div class="card" style="background:var(--c-s2)">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:600;font-size:0.9rem">📸 Fotodokumentace</div>
          <div style="font-size:0.76rem;color:var(--c-ink3);margin-top:2px">
            Foto a video ke zakázce
          </div>
        </div>
        <button class="btn btn-primary btn-sm"
          onclick="navigate('fotky',{nabidkaId:${n.id},nazevNabidky:${JSON.stringify(n.nazev)}})">
          Otevřít →
        </button>
      </div>
    </div>

    <!-- ── TEXTY DO PDF ── -->
    <div class="card">
      <div class="card-title">📝 Texty do nabídky — vyber co chceš přidat do PDF</div>
      ${Object.entries(TEXTY_NABIDKY).map(([key, t]) => `
        <label style="display:flex;align-items:flex-start;gap:0.7rem;padding:0.65rem 0;
          border-bottom:1px solid var(--c-s2);cursor:pointer">
          <input type="checkbox" id="txt_${key}"
            ${selectedTexts.includes(key) ? 'checked' : ''}
            style="width:auto;margin-top:3px;accent-color:var(--c-terra)">
          <div>
            <div style="font-weight:600;font-size:0.88rem">${t.label}</div>
            <div style="font-size:0.75rem;color:var(--c-ink3);margin-top:2px;line-height:1.4">
              ${escHtml(t.text.split('\n')[0])}
            </div>
          </div>
        </label>`).join('')}
      <button class="btn btn-secondary btn-full" style="margin-top:0.5rem"
        onclick="ulozitVybraneTexty(${n.id})">
        💾 Uložit výběr textů
      </button>
    </div>

    <!-- ── SDÍLENÍ & AKCE ── -->
    <div class="card card-accent">
      <div class="card-title">📤 Sdílet nabídku</div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.4rem;margin-bottom:0.7rem">
        ${[
          { action: `sdiletNabidku(${n.id},'share')`,    icon:'📤', label:'Sdílet', bg:'var(--c-s2)',      color:'var(--c-ink)',   border:'var(--c-border)' },
          { action: `sdiletNabidku(${n.id},'whatsapp')`, icon:'💬', label:'WhatsApp', bg:'var(--c-green-s)', color:'var(--c-green)', border:'#4ade80' },
          { action: `sdiletNabidku(${n.id},'email')`,    icon:'✉️', label:'E-mail', bg:'var(--c-blue-s)',   color:'var(--c-blue)',  border:'#60a5fa' },
        ].map(b => `
          <button onclick="${b.action}"
            style="display:flex;flex-direction:column;align-items:center;gap:0.2rem;
              padding:0.62rem 0.3rem;border-radius:var(--r-sm);
              border:1.5px solid ${b.border};background:${b.bg};cursor:pointer">
            <span style="font-size:1.4rem">${b.icon}</span>
            <span style="font-size:0.68rem;font-weight:600;color:${b.color}">${b.label}</span>
          </button>`).join('')}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.4rem;margin-bottom:0.5rem">
        <button class="btn btn-secondary btn-sm" onclick="exportPDF(${n.id})"
          style="justify-content:center">📄 PDF</button>
        <button class="btn btn-secondary btn-sm" onclick="nahlédNabidku(${n.id})"
          style="justify-content:center">👁 Náhled</button>
        <button class="btn btn-secondary btn-sm" onclick="exportNabidkaXLSX(${n.id})"
          style="justify-content:center">📊 XLSX</button>
      </div>

      <button class="btn btn-secondary btn-full" onclick="otevritPodpisModal(${n.id})"
        style="margin-bottom:0.5rem;${n.podpis ? 'background:var(--c-green-s);border-color:var(--c-green);color:var(--c-green)' : ''}">
        ✍️ ${n.podpis ? 'Podpis uložen — znovu podepsat' : 'Podepsat přímo (předat zákazníkovi)'}
      </button>

      <!-- Šablony zpráv -->
      <div style="margin-top:0.4rem">
        <div style="font-size:0.68rem;color:var(--c-ink3);margin-bottom:0.3rem;
          font-weight:700;text-transform:uppercase;letter-spacing:0.06em">
          Šablony zprávy:
        </div>
        <div style="display:flex;gap:0.3rem;flex-wrap:wrap">
          ${[
            ['prvni',     '👋 První kontakt'],
            ['odeslani',  '📋 Nabídka odeslána'],
            ['followup',  '🔔 Follow-up'],
            ['dokonceni', '🏁 Dokončení'],
          ].map(([typ, label]) => `
            <button onclick="aplikovatSablonu(${n.id},'${typ}')"
              style="font-size:0.7rem;padding:0.25rem 0.5rem;border-radius:var(--r-xs);
                border:1px solid var(--c-border);background:var(--c-s2);cursor:pointer;
                color:var(--c-ink2)">
              ${label}
            </button>`).join('')}
        </div>
      </div>
    </div>

    <!-- ── ZPRÁVA PANEL ── -->
    <div id="share-msg-panel" style="display:none" class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
        <div style="font-weight:600;font-size:0.9rem" id="share-msg-title">Zpráva</div>
        <button onclick="document.getElementById('share-msg-panel').style.display='none'"
          style="background:none;border:none;font-size:1.1rem;cursor:pointer;color:var(--c-ink2)">✕</button>
      </div>
      <textarea id="share-msg-text" rows="6"
        style="width:100%;padding:0.6rem;border:1.5px solid var(--c-border);
          border-radius:var(--r-sm);font-family:var(--f-body);font-size:0.85rem;resize:vertical;
          background:var(--c-bg);color:var(--c-ink)"></textarea>
      <div style="display:flex;gap:0.4rem;margin-top:0.5rem">
        <button id="share-msg-btn" class="btn btn-primary" style="flex:1">Odeslat →</button>
        <button onclick="kopirovatZpravu()" class="btn btn-secondary">📋 Kopírovat</button>
        <button onclick="navigate('sablony')" class="btn btn-secondary"
          style="font-size:0.76rem">✏️</button>
      </div>
    </div>

    <!-- ── KOMUNIKACE TIMELINE ── -->
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.7rem">
        <div class="card-title" style="margin:0">📋 Komunikace</div>
        <button onclick="otevritNovyZaznam(${n.id})"
          class="btn btn-primary btn-sm">+ Přidat</button>
      </div>

      <!-- Rychlé přidání -->
      <div style="display:flex;gap:0.3rem;flex-wrap:wrap;margin-bottom:0.8rem">
        ${[
          ['telefon',    '📞', 'Telefonát'],
          ['schuzka',    '🤝', 'Schůzka'],
          ['email_odes', '✉️', 'E-mail'],
          ['poznamka',   '📝', 'Poznámka'],
          ['platba',     '💰', 'Platba'],
          ['zmena',      '✏️', 'Změna'],
        ].map(([typ, icon, label]) => `
          <button onclick="rychlyZaznam(${n.id},'${typ}','${label}')"
            style="font-size:0.7rem;padding:0.24rem 0.5rem;border-radius:var(--r-xs);
              border:1px solid var(--c-border);background:var(--c-s2);
              cursor:pointer;color:var(--c-ink2)">
            ${icon} ${label}
          </button>`).join('')}
      </div>

      <div id="komunikace-list">
        ${renderKomunikaceTimeline(n.komunikace || [])}
      </div>
    </div>

    <!-- ── AKCE ── -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.4rem;margin-bottom:0.4rem">
      <button class="btn btn-secondary" onclick="otevritEditMeta(${n.id})"
        style="font-size:0.8rem;justify-content:center">✏️ Upravit info</button>
      <button class="btn btn-secondary" onclick="duplicatNabidku(${n.id})"
        style="font-size:0.8rem;justify-content:center">📋 Duplikovat</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.4rem;margin-bottom:0.4rem">
      <button class="btn btn-secondary" onclick="vytvorRevizi(${n.id})"
        style="font-size:0.8rem;justify-content:center">🔄 Nová revize</button>
      <button class="btn btn-secondary" onclick="navigate('firma')"
        style="font-size:0.8rem;justify-content:center">🏢 Údaje firmy</button>
    </div>
    <button class="btn btn-danger btn-full" onclick="deleteNabidka(${n.id})"
      style="margin-bottom:0.5rem">🗑️ Smazat nabídku</button>
    <div style="height:5rem"></div>
  `;
}

// ── Uložit vybrané texty ──────────────────────────────────
async function ulozitVybraneTexty(id) {
  const n = await dbGet('nabidky', id);
  if (!n) return;
  n.vybranéTexty = Object.keys(TEXTY_NABIDKY).filter(k =>
    document.getElementById('txt_' + k)?.checked
  );
  await dbPut('nabidky', n);
  toast('Texty uloženy — nyní exportuj PDF');
}

// ── Změna stavu ───────────────────────────────────────────
async function zmenitStav(id, stav) {
  const n = await dbGet('nabidky', id);
  if (!n) return;
  n.stav = stav;
  await dbPut('nabidky', n);
  const labels = {
    nabidka: 'Nabídka', schvaleno: 'Schváleno',
    probiha: 'Probíhá', dokonceno: 'Dokončeno', zaplaceno: 'Zaplaceno',
  };
  await logKomunikace(id, 'zmena', `Stav změněn na: ${labels[stav]}`);
  toast('Stav: ' + labels[stav]);
  await render();
}

// ── Komunikace typy ───────────────────────────────────────
const KOMUNIKACE_TYPY = {
  vytvoreno:  { icon: '📋', barva: '#6366f1', label: 'Vytvoření'        },
  sdilet:     { icon: '📤', barva: '#8b5cf6', label: 'Sdílení'          },
  nahled:     { icon: '👁',  barva: '#6366f1', label: 'Náhled zákazník'  },
  schvaleno:  { icon: '✅', barva: '#059669', label: 'Schváleno'        },
  odmitnuto:  { icon: '❌', barva: '#dc2626', label: 'Odmítnuto'        },
  telefon:    { icon: '📞', barva: '#0ea5e9', label: 'Telefonát'        },
  schuzka:    { icon: '🤝', barva: '#f59e0b', label: 'Schůzka'          },
  email_odes: { icon: '✉️', barva: '#3b82f6', label: 'E-mail'           },
  poznamka:   { icon: '📝', barva: '#78716c', label: 'Poznámka'         },
  platba:     { icon: '💰', barva: '#059669', label: 'Platba'           },
  zmena:      { icon: '✏️', barva: '#f97316', label: 'Změna'            },
  pdf:        { icon: '📄', barva: '#64748b', label: 'PDF export'       },
};

async function logKomunikace(nabidkaId, typ, text, extra) {
  const n = await dbGet('nabidky', nabidkaId);
  if (!n) return;
  if (!n.komunikace) n.komunikace = [];
  const { datum, cas, iso } = _casRazitko();
  n.komunikace.unshift({ id: 'k' + Date.now(), typ, text, datum, cas, iso, ...(extra || {}) });
  await dbPut('nabidky', n);
}

function renderKomunikaceTimeline(zaznamy) {
  if (!zaznamy || zaznamy.length === 0) {
    return `<div style="text-align:center;color:var(--c-ink3);font-size:0.85rem;padding:0.8rem 0">
      Zatím žádné záznamy. Přidej první tapnutím výše.
    </div>`;
  }
  return zaznamy.map(z => {
    const t = KOMUNIKACE_TYPY[z.typ] || { icon: '📌', barva: '#94a3b8', label: z.typ };
    return `
      <div style="display:flex;gap:0.7rem;padding:0.55rem 0;border-bottom:1px solid var(--c-border)">
        <div style="width:30px;height:30px;border-radius:50%;
          background:${t.barva}22;display:flex;align-items:center;
          justify-content:center;font-size:0.9rem;flex-shrink:0">
          ${t.icon}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:0.85rem">${escHtml(z.text)}</div>
          <div style="font-size:0.7rem;color:var(--c-ink3);margin-top:1px">
            ${t.label} · ${z.datum} ${z.cas}
          </div>
          ${z.poznamka ? `
            <div style="font-size:0.76rem;color:var(--c-ink2);margin-top:2px;font-style:italic">
              ${escHtml(z.poznamka)}
            </div>` : ''}
        </div>
        <button onclick="smazatZaznam(${state.editId},'${z.id}')"
          style="background:none;border:none;cursor:pointer;font-size:0.82rem;
            color:var(--c-ink3);padding:0 0.2rem;align-self:flex-start;line-height:1">✕</button>
      </div>`;
  }).join('');
}

async function rychlyZaznam(nabidkaId, typ, label) {
  const text = prompt(`${KOMUNIKACE_TYPY[typ]?.icon || '📌'} ${label} — krátký popis:`, '');
  if (text === null) return;
  await logKomunikace(nabidkaId, typ, text || label, {});
  await render();
}

function otevritNovyZaznam(nabidkaId) {
  showBottomSheet('📋 Nový záznam komunikace', `
    <div class="field">
      <label>Typ záznamu</label>
      <select id="kom-typ">
        ${Object.entries(KOMUNIKACE_TYPY).map(([k, v]) =>
          `<option value="${k}">${v.icon} ${v.label}</option>`
        ).join('')}
      </select>
    </div>
    <div class="field">
      <label>Popis</label>
      <input id="kom-text" placeholder="Co se stalo / co bylo domluveno…">
    </div>
    <div class="field">
      <label>Podrobnosti (volitelné)</label>
      <textarea id="kom-pozn" rows="3"
        placeholder="Detaily, čísla, domluvený termín…"></textarea>
    </div>
    <div class="field-row">
      <div class="field">
        <label>Datum</label>
        <input type="date" id="kom-datum" value="${new Date().toISOString().slice(0,10)}">
      </div>
      <div class="field">
        <label>Čas</label>
        <input type="time" id="kom-cas"
          value="${new Date().toLocaleTimeString('cs-CZ',{hour:'2-digit',minute:'2-digit'}).replace('.',':')}">
      </div>
    </div>
    <button onclick="_ulozitKomZaznam(${nabidkaId})" class="btn btn-primary btn-full">
      💾 Uložit záznam
    </button>
  `);
  setTimeout(() => document.getElementById('kom-text')?.focus(), 80);
}

async function _ulozitKomZaznam(nabidkaId) {
  const typ      = document.getElementById('kom-typ')?.value || 'poznamka';
  const text     = document.getElementById('kom-text')?.value?.trim();
  const poznamka = document.getElementById('kom-pozn')?.value?.trim();
  const datum    = document.getElementById('kom-datum')?.value;
  const cas      = document.getElementById('kom-cas')?.value;
  if (!text) { toast('Zadej popis záznamu', 'err'); return; }

  const n = await dbGet('nabidky', nabidkaId);
  if (!n) return;
  if (!n.komunikace) n.komunikace = [];
  n.komunikace.unshift({
    id:       'k' + Date.now(),
    typ, text,
    poznamka: poznamka || '',
    datum:    datum ? new Date(datum).toLocaleDateString('cs-CZ') : _casRazitko().datum,
    cas:      cas || _casRazitko().cas,
    iso:      new Date((datum || new Date().toISOString().slice(0,10)) + 'T' + (cas || '12:00')).toISOString(),
  });
  await dbPut('nabidky', n);
  closeBottomSheet();
  toast('Záznam přidán ✓');
  await render();
}

async function smazatZaznam(nabidkaId, zaznamId) {
  const n = await dbGet('nabidky', nabidkaId);
  if (!n?.komunikace) return;
  n.komunikace = n.komunikace.filter(z => z.id !== zaznamId);
  await dbPut('nabidky', n);
  const list = document.getElementById('komunikace-list');
  if (list) list.innerHTML = renderKomunikaceTimeline(n.komunikace);
}

async function schvalitNabidku(id) {
  const n = await dbGet('nabidky', id);
  if (!n) return;
  n.stav = 'schvaleno';
  n.schvalenoDate = new Date().toISOString().slice(0, 10);
  await dbPut('nabidky', n);

  if ('showDirectoryPicker' in window) {
    try {
      toast('Vyber kam uložit složku projektu…');
      const rootDir = await window.showDirectoryPicker({ mode: 'readwrite' });
      const safeName = n.nazev.replace(/[/\\:*?"<>|]/g, '_');
      const cnDir    = await rootDir.getDirectoryHandle('CN', { create: true });
      const projDir  = await cnDir.getDirectoryHandle(safeName, { create: true });
      await projDir.getDirectoryHandle('Foto',    { create: true });
      await projDir.getDirectoryHandle('Video',   { create: true });
      await projDir.getDirectoryHandle('Nabidky', { create: true });
      const infoFile = await projDir.getFileHandle('info.txt', { create: true });
      const writable = await infoFile.createWritable();
      await writable.write(`Zakázka: ${n.nazev}\nDatum schválení: ${n.schvalenoDate}\nPlocha: ${n.plocha} m²\nCelkem: ${n.cenaCelkem} Kč\n`);
      await writable.close();
      n.slozkaVytvorena = true;
      n.slozkaPath      = `CN/${safeName}`;
      await dbPut('nabidky', n);
      toast('✓ Složka CN/' + safeName + ' vytvořena!');
    } catch (e) {
      if (e.name !== 'AbortError') toast('Složku nelze vytvořit: ' + e.message, 'err');
    }
  } else {
    toast('Schváleno! (Tvorba složek vyžaduje Chrome/Edge)', 'ok');
  }
  await render();
}

async function deleteNabidkaFromList(id) {
  if (!confirm('Opravdu smazat tuto nabídku?')) return;
  await dbDelete('nabidky', id);
  toast('Nabídka smazána');
  await render();
}

async function deleteNabidka(id) {
  if (!confirm('Opravdu smazat nabídku?')) return;
  await dbDelete('nabidky', id);
  toast('Nabídka smazána');
  await navigate('nabidky');
}

async function duplicatNabidku(id) {
  const n = await dbGet('nabidky', id);
  if (!n) return;
  const { id: _, komunikace: __, podpis: ___, schvalenoKym: ____, ...rest } = n;
  const newId = await dbPut('nabidky', {
    ...rest,
    nazev: rest.nazev + ' (kopie)',
    stav:  'nabidka',
    datum: new Date().toISOString().slice(0, 10),
    komunikace: [{
      id: 'k' + Date.now(), typ: 'vytvoreno',
      text: 'Duplikováno z nabídky ' + id,
      datum: new Date().toLocaleDateString('cs-CZ'),
      cas:   new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }),
      iso:   new Date().toISOString(),
    }],
  });
  toast('Nabídka duplikována ✓');
  await navigate('nabidkaDetail', { editId: newId });
}

function otevritEditMeta(id) {
  dbGet('nabidky', id).then(async n => {
    if (!n) return;
    const zakaznici = await dbGetAll('zakaznici');
    const zakOpts   = `<option value="">— volitelné —</option>` +
      zakaznici.map(z =>
        `<option value="${z.id}" ${n.zakId === z.id ? 'selected' : ''}>${escHtml(z.jmeno)}</option>`
      ).join('');

    showBottomSheet('✏️ Upravit nabídku', `
      <div class="field">
        <label>Název zakázky</label>
        <input id="em_nazev" value="${escHtml(n.nazev || '')}" placeholder="Koupelna Novákovi">
      </div>
      <div class="field">
        <label>Zákazník</label>
        <select id="em_zak">${zakOpts}</select>
      </div>
      <div class="field">
        <label>Poznámka</label>
        <textarea id="em_pozn" rows="3">${escHtml(n.pozn || '')}</textarea>
      </div>
      <div class="field">
        <label>Datum zakázky</label>
        <input type="date" id="em_datum"
          value="${n.datum || new Date().toISOString().slice(0, 10)}">
      </div>
      <button class="btn btn-primary btn-full" onclick="ulozitEditMeta(${id})">
        💾 Uložit změny
      </button>
    `);
  });
}

async function ulozitEditMeta(id) {
  const n = await dbGet('nabidky', id);
  if (!n) return;
  n.nazev = document.getElementById('em_nazev')?.value?.trim() || n.nazev;
  n.pozn  = document.getElementById('em_pozn')?.value?.trim()  || '';
  n.zakId = document.getElementById('em_zak')?.value
    ? parseInt(document.getElementById('em_zak').value)
    : null;
  n.datum = document.getElementById('em_datum')?.value || n.datum;
  await dbPut('nabidky', n);
  closeBottomSheet();
  toast('Nabídka upravena ✓');
  await render();
}

// ── XLSX export ───────────────────────────────────────────
async function exportNabidkaXLSX(id) {
  const [n, firma] = await Promise.all([dbGet('nabidky', id), loadFirma()]);
  if (!n) return;
  toast('Připravuji XLSX…');

  if (!window.XLSX) {
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  const cislo     = n.cisloNabidky || `N-${String(n.id || 1).padStart(4, '0')}`;
  const dnes      = new Date().toLocaleDateString('cs-CZ');
  const celkem    = parseInt(n.cenaCelkem || 0);
  const dphSazba  = n.dphSazba || 0;
  const dphCastka = n.dphCastka || 0;
  const zaklad    = celkem - dphCastka;
  const zaloha    = Math.round(celkem * ((n.zalohaProc || 40) / 100));

  const souhrn = [
    ['JL-OBKLADY CN', '', '', ''],
    ['', '', '', ''],
    ['CENOVÁ NABÍDKA', '', '', cislo],
    ['Datum:', n.datum || dnes, 'Platnost:', '30 dní'],
    ['', '', '', ''],
    ['ZÁKAZNÍK', '', '', ''],
    ['Jméno:', n.zakaznik || '—', '', ''],
    ['Místo:', n.mistoRealizace || '—', '', ''],
    ['Termín:', n.termin || '—', '', ''],
    ['', '', '', ''],
    ['ZAKÁZKA', '', '', ''],
    ['Materiál:', n.material || '—', '', ''],
    ['Plocha:', n.plocha ? n.plocha + ' m²' : '—', '', ''],
    ['Počet kusů:', n.ks || '—', '', ''],
    ['', '', '', ''],
    ['CENA', '', '', ''],
    ['Materiál:', parseInt(n.cenaMatCelk || 0).toLocaleString('cs') + ' Kč', '', ''],
    ['Práce:', parseInt(n.cenaPrace || 0).toLocaleString('cs') + ' Kč', '', ''],
  ];
  if (dphSazba > 0) {
    souhrn.push(['Základ DPH:', zaklad.toLocaleString('cs') + ' Kč', '', '']);
    souhrn.push([`DPH ${dphSazba} %:`, dphCastka.toLocaleString('cs') + ' Kč', '', '']);
  }
  souhrn.push(['', '', '', '']);
  souhrn.push(['CELKEM K ÚHRADĚ:', celkem.toLocaleString('cs') + ' Kč', '', '']);
  souhrn.push([`Záloha ${n.zalohaProc || 40} %:`, zaloha.toLocaleString('cs') + ' Kč', '', '']);
  souhrn.push(['Doplatek:', (celkem - zaloha).toLocaleString('cs') + ' Kč', '', '']);

  const praceHeader = ['Popis práce', 'Množství', 'Jednotka', 'Sazba (Kč)', 'Celkem (Kč)'];
  const praceData   = (n.praceVybrane || []).filter(p => !p.includes('neuvedeno')).map(p => {
    const lastColon = p.lastIndexOf(': ');
    if (lastColon === -1) return [p, '', '', '', ''];
    const popis = p.substring(0, lastColon);
    const cena  = parseInt(p.substring(lastColon + 2)) || 0;
    const m     = popis.match(/\(([0-9.,]+)\s+(\S+)\s+×\s+([0-9]+)/);
    return [
      popis.replace(/\s*\([^)]*\)\s*$/, '').trim(),
      m ? parseFloat(m[1].replace(',', '.')) : '',
      m ? m[2] : '',
      m ? parseInt(m[3]) : '',
      cena,
    ];
  });

  const wb = XLSX.utils.book_new();
  const wsSouhrn = XLSX.utils.aoa_to_sheet(souhrn);
  wsSouhrn['!cols'] = [{wch:24},{wch:20},{wch:14},{wch:18}];
  XLSX.utils.book_append_sheet(wb, wsSouhrn, 'Souhrn');

  if (praceData.length > 0) {
    const wsPrace = XLSX.utils.aoa_to_sheet([praceHeader, ...praceData]);
    wsPrace['!cols'] = [{wch:50},{wch:12},{wch:12},{wch:14},{wch:14}];
    XLSX.utils.book_append_sheet(wb, wsPrace, 'Práce');
  }

  const safeName = (n.nazev || 'nabidka').replace(/[/\\:*?"<>|]/g, '_');
  XLSX.writeFile(wb, `${cislo}_${safeName}.xlsx`);
  toast('✓ XLSX staženo');
  await logKomunikace(id, 'pdf', 'Export do XLSX');
}
