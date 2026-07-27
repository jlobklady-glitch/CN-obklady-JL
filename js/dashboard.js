// ═══ dashboard.js — JL-OBKLADY CN v4 ═══

async function pageDashboard() {
  const [nabidky, ceniky, pracovnici, hodiny] = await Promise.all([
    dbGetAll('nabidky'), dbGetAll('ceniky'),
    dbGetAll('pracovnici'), dbGetAll('hodiny')
  ]);

  const dnes    = new Date();
  const dnesStr = dnes.toISOString().slice(0, 10);
  const mesic   = dnes.toISOString().slice(0, 7);
  const rok     = dnes.getFullYear().toString();

  // ── Statistiky ──────────────────────────────────────────
  const mesicNabidky = nabidky.filter(n => n.datum?.startsWith(mesic));
  const rokNabidky   = nabidky.filter(n => n.datum?.startsWith(rok));
  const celkemMesic  = mesicNabidky.reduce((s, n) => s + parseFloat(n.cenaCelkem || 0), 0);
  const celkemRok    = rokNabidky.reduce((s, n) => s + parseFloat(n.cenaCelkem || 0), 0);
  const zaplaceno    = nabidky.filter(n => n.stav === 'zaplaceno')
                              .reduce((s, n) => s + parseFloat(n.cenaCelkem || 0), 0);

  // ── Pipeline ────────────────────────────────────────────
  const stavyCounts = { nabidka: 0, schvaleno: 0, probiha: 0, dokonceno: 0, zaplaceno: 0 };
  nabidky.forEach(n => {
    const s = n.stav || 'nabidka';
    if (stavyCounts[s] !== undefined) stavyCounts[s]++;
  });
  const pipelineTotal = Object.values(stavyCounts).reduce((a, b) => a + b, 0) || 1;

  // ── Graf — posledních 6 měsíců ──────────────────────────
  const mesiceGraf = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(dnes.getFullYear(), dnes.getMonth() - i, 1);
    const key = d.toISOString().slice(0, 7);
    const val = nabidky.filter(n => n.datum?.startsWith(key))
                       .reduce((s, n) => s + parseFloat(n.cenaCelkem || 0), 0);
    mesiceGraf.push({ label: d.toLocaleDateString('cs-CZ', { month: 'short' }), val, key });
  }
  const maxVal = Math.max(...mesiceGraf.map(m => m.val), 1);

  // ── Dnešní hodiny ────────────────────────────────────────
  const dnesHodiny  = hodiny.filter(h => h.datum === dnesStr);
  const dnesCelkH   = dnesHodiny.reduce((s, h) => s + h.hodiny, 0);
  const dnesWorkers = [...new Set(dnesHodiny.map(h => h.pracovnikJmeno))];

  // ── Termíny tento týden ──────────────────────────────────
  const tydOd = new Date(dnes);
  tydOd.setDate(dnes.getDate() - ((dnes.getDay() + 6) % 7));
  const tydDo = new Date(tydOd); tydDo.setDate(tydOd.getDate() + 6);
  const terminTyden = nabidky.filter(n =>
    n.termin && n.termin >= tydOd.toISOString().slice(0, 10) &&
    n.termin <= tydDo.toISOString().slice(0, 10)
  ).sort((a, b) => a.termin > b.termin ? 1 : -1);

  // ── Expirující / bez kontaktu ────────────────────────────
  const expirujici  = nabidky.filter(n => {
    if (n.stav && n.stav !== 'nabidka') return false;
    return Math.floor((dnes - new Date(n.datum)) / 86400000) >= 25;
  });
  const bezKontaktu = nabidky.filter(n => {
    if (!['nabidka', 'schvaleno'].includes(n.stav || 'nabidka')) return false;
    return Math.floor((dnes - new Date(n.datum)) / 86400000) > 14;
  });

  // ── Top zákazník ─────────────────────────────────────────
  const zakaznikMap = {};
  nabidky.forEach(n => {
    if (!n.zakaznik) return;
    if (!zakaznikMap[n.zakaznik]) zakaznikMap[n.zakaznik] = { count: 0, total: 0 };
    zakaznikMap[n.zakaznik].count++;
    zakaznikMap[n.zakaznik].total += parseFloat(n.cenaCelkem || 0);
  });
  const topZak = Object.entries(zakaznikMap).sort((a, b) => b[1].total - a[1].total)[0];

  // ── Konverzní poměr + průměr ─────────────────────────────
  const zapl = nabidky.filter(n => n.stav === 'zaplaceno').length;
  const konverze = nabidky.length ? Math.round((zapl / nabidky.length) * 100) : 0;
  const prumerCelk = nabidky.length
    ? Math.round(nabidky.reduce((s, n) => s + parseFloat(n.cenaCelkem || 0), 0) / nabidky.length)
    : 0;

  // ── SVG bar chart ────────────────────────────────────────
  const grafH = 72;
  const svgBars = mesiceGraf.map((m, i) => {
    const barH   = Math.max(3, Math.round((m.val / maxVal) * grafH));
    const x      = i * 16.5 + 1;
    const w      = 13;
    const isCur  = m.key === mesic;
    const yBar   = grafH - barH;
    return `
      <g>
        <rect x="${x}" y="${yBar}" width="${w}" height="${barH}"
          rx="3" fill="${isCur ? '#C8502A' : '#D8D3CB'}" opacity="${isCur ? '1' : '0.7'}"/>
        ${barH > 12 && m.val > 0 ? `
          <text x="${x + w/2}" y="${yBar + 8}" text-anchor="middle"
            font-size="5" fill="${isCur ? 'white' : '#968E84'}" font-weight="700">
            ${m.val >= 1000 ? (m.val/1000).toFixed(0)+'k' : m.val}
          </text>` : ''}
        <text x="${x + w/2}" y="${grafH + 10}" text-anchor="middle"
          font-size="5.5" fill="${isCur ? '#C8502A' : '#968E84'}" font-weight="${isCur ? '700' : '400'}">
          ${m.label}
        </text>
      </g>`;
  }).join('');

  // ── Průběh zakázek — barevná lišta ───────────────────────
  const stavColors = {
    nabidka: '#968E84', schvaleno: '#1A4FAA',
    probiha: '#C8502A', dokonceno: '#1E6B4A', zaplaceno: '#059669'
  };
  const pipelineSegments = Object.entries(stavyCounts)
    .filter(([, cnt]) => cnt > 0)
    .map(([stav, cnt]) => {
      const pct = Math.max(4, Math.round((cnt / pipelineTotal) * 100));
      return `<div class="pipeline-segment" style="flex:${pct};background:${stavColors[stav]}"
        onclick="sessionStorage.setItem('nabidkyFilter','${stav}');navigate('nabidky')"
        title="${stav}: ${cnt}">
      </div>`;
    }).join('');

  return `
    <!-- ══ HEADER ══ -->
    <div class="header-bar">
      <span class="logo">🏗️</span>
      <div style="flex:1">
        <h1>JL-OBKLADY</h1>
        <div class="subtitle">${dnes.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
      </div>
      <!-- Search + theme toggle -->
      <div style="display:flex;gap:0.4rem;align-items:center;position:relative;z-index:1">
        <button onclick="openGlobalSearch()"
          style="background:rgba(255,255,255,0.1);border:1.5px solid rgba(255,255,255,0.2);
            color:white;border-radius:var(--r-sm);padding:0.42rem 0.7rem;
            font-size:0.78rem;font-weight:600;cursor:pointer;font-family:var(--f-body)">
          🔍
        </button>
        <button onclick="toggleTheme()"
          style="background:rgba(255,255,255,0.1);border:1.5px solid rgba(255,255,255,0.2);
            color:white;border-radius:var(--r-sm);padding:0.42rem 0.6rem;
            font-size:0.85rem;cursor:pointer" title="Přepnout téma">
          <span id="theme-icon">${_getCurrentThemeIcon()}</span>
        </button>
        <span style="font-size:0.55rem;color:rgba(255,255,255,0.25);align-self:flex-end;padding-bottom:1px">v4</span>
      </div>
    </div>

    <!-- ══ HERO — dnešní přehled ══ -->
    <div class="dash-hero">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.9rem;position:relative;z-index:1">
        <div>
          <div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;
            letter-spacing:0.1em;color:rgba(255,255,255,0.4);margin-bottom:0.3rem">
            Tento měsíc
          </div>
          <div class="dash-metric-big">
            ${celkemMesic >= 1000
              ? (celkemMesic / 1000).toFixed(1) + ' k'
              : celkemMesic.toLocaleString('cs')}
          </div>
          <div class="dash-metric-label">Kč · ${mesicNabidky.length} zakázek</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;
            letter-spacing:0.1em;color:rgba(255,255,255,0.4);margin-bottom:0.3rem">
            Rok ${rok}
          </div>
          <div style="font-family:var(--f-display);font-size:1.5rem;font-weight:800;
            color:rgba(255,255,255,0.9);letter-spacing:-0.02em">
            ${celkemRok >= 1000
              ? (celkemRok / 1000).toFixed(0) + ' k'
              : celkemRok.toLocaleString('cs')}
          </div>
          <div class="dash-metric-label">Kč celkem</div>
        </div>
      </div>

      <!-- Pipeline bar -->
      ${pipelineTotal > 0 ? `
      <div class="pipeline-capsule" style="position:relative;z-index:1">
        ${pipelineSegments}
      </div>
      <div style="display:flex;gap:0.6rem;flex-wrap:wrap;margin-top:0.55rem;position:relative;z-index:1">
        ${Object.entries(stavyCounts).filter(([, c]) => c > 0).map(([stav, cnt]) => {
          const labels = { nabidka: 'Nabídky', schvaleno: 'Schváleno', probiha: 'Probíhá', dokonceno: 'Hotovo', zaplaceno: 'Zaplaceno' };
          return `<span style="font-size:0.62rem;font-weight:700;color:rgba(255,255,255,0.5)">
            <span style="color:${stavColors[stav]};font-size:0.65rem">●</span>
            ${labels[stav]} ${cnt}
          </span>`;
        }).join('')}
      </div>` : ''}

      <!-- Dnes aktivity -->
      <div style="margin-top:0.9rem;padding-top:0.8rem;border-top:1px solid rgba(255,255,255,0.1);
        display:flex;align-items:center;justify-content:space-between;position:relative;z-index:1">
        <div style="display:flex;gap:0.9rem">
          ${dnesCelkH > 0 ? `
          <div>
            <div style="font-size:1.2rem;font-weight:800;color:var(--c-terra2);font-family:var(--f-display)">${dnesCelkH}h</div>
            <div style="font-size:0.62rem;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.04em">dnes</div>
          </div>` : ''}
          ${stavyCounts.probiha > 0 ? `
          <div>
            <div style="font-size:1.2rem;font-weight:800;color:#f59e0b;font-family:var(--f-display)">${stavyCounts.probiha}</div>
            <div style="font-size:0.62rem;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.04em">probíhá</div>
          </div>` : ''}
          ${!dnesCelkH && !stavyCounts.probiha ? `
          <div style="font-size:0.8rem;color:rgba(255,255,255,0.4)">
            📋 ${nabidky.length} zakázek celkem
          </div>` : ''}
        </div>
        <button onclick="otevritNoveHodiny('${dnesStr}')"
          style="background:var(--c-terra);color:white;border:none;border-radius:var(--r-sm);
            padding:0.5rem 0.9rem;font-size:0.8rem;font-weight:700;cursor:pointer;
            font-family:var(--f-body);box-shadow:0 2px 12px rgba(200,80,42,0.4)">
          ➕ Hodiny
        </button>
      </div>
    </div>

    <!-- ══ QUICK ACTIONS ══ -->
    <div class="card" style="padding:0.8rem">
      <div class="qa-grid">
        ${[
          { icon:'➕', label:'Nabídka',    action:"navigate('novaNabidka')" },
          { icon:'📋', label:'Zakázky',    action:"sessionStorage.setItem('nabidkyFilter','vse');navigate('nabidky')" },
          { icon:'👤', label:'Klienti',    action:"navigate('zakaznici')" },
          { icon:'📅', label:'Kalendář',   action:"navigate('kalendar')" },
          { icon:'👷', label:'Pracovníci', action:"navigate('pracovnici')" },
          { icon:'💰', label:'Výplaty',    action:"navigate('vyplaty')" },
          { icon:'📸', label:'Fotky',      action:"navigate('fotky')" },
          { icon:'⋯',  label:'Více',       action:"_showMoreActions()" },
        ].map(qa => `
          <button class="qa-item" onclick="${qa.action}">
            <span class="qa-icon">${qa.icon}</span>
            ${qa.label}
          </button>`).join('')}
      </div>
    </div>

    <!-- ══ STATS 2×2 ══ -->
    <div class="stats-row">
      <div class="stat-card" onclick="sessionStorage.setItem('nabidkyFilter','zaplaceno');navigate('nabidky')">
        ${zaplaceno > 0 ? `<div class="stat-trend up">↑</div>` : ''}
        <div class="stat-val" style="color:var(--c-green)">${zaplaceno > 0 ? (zaplaceno/1000).toFixed(0)+'k' : '0'}</div>
        <div class="stat-label">Zaplaceno (Kč)</div>
      </div>
      <div class="stat-card">
        <div class="stat-val" style="color:var(--c-terra)">${nabidky.length}</div>
        <div class="stat-label">Zakázek celkem</div>
      </div>
      <div class="stat-card">
        <div class="stat-val" style="color:var(--c-blue)">${konverze} %</div>
        <div class="stat-label">Konverzní poměr</div>
      </div>
      <div class="stat-card">
        <div class="stat-val">${prumerCelk > 0 ? (prumerCelk/1000).toFixed(0)+'k' : '—'}</div>
        <div class="stat-label">Průměr / zakázku</div>
      </div>
    </div>

    <!-- ══ GRAF OBRATU ══ -->
    ${nabidky.length > 0 ? `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.7rem">
        <div class="card-title" style="margin:0">📈 Obrat posledních 6 měsíců</div>
        <span style="font-size:0.68rem;color:var(--c-ink3)">
          ${celkemRok > 0 ? (celkemRok/1000).toFixed(0)+' k Kč / '+rok : ''}
        </span>
      </div>
      <svg viewBox="0 0 100 84" preserveAspectRatio="none" style="width:100%;height:90px;overflow:visible;display:block">
        <!-- Grid lines -->
        <line x1="0" y1="0"            x2="100" y2="0"            stroke="var(--c-border)" stroke-width="0.4" stroke-dasharray="2,2"/>
        <line x1="0" y1="${grafH/2}"   x2="100" y2="${grafH/2}"   stroke="var(--c-border)" stroke-width="0.4" stroke-dasharray="2,2"/>
        <line x1="0" y1="${grafH}"     x2="100" y2="${grafH}"     stroke="var(--c-border)" stroke-width="0.6"/>
        ${svgBars}
      </svg>
    </div>` : ''}

    <!-- ══ UPOZORNĚNÍ ══ -->
    ${expirujici.length > 0 ? `
    <div class="card card-warn">
      <div class="card-title" style="color:var(--c-amber)">⚠️ Nabídky blízko vypršení (${expirujici.length})</div>
      ${expirujici.slice(0, 3).map(n => {
        const dny = Math.floor((dnes - new Date(n.datum)) / 86400000);
        return `<div onclick="navigate('nabidkaDetail',{editId:${n.id}})"
          style="display:flex;justify-content:space-between;align-items:center;
            padding:0.45rem 0;border-bottom:1px solid var(--c-s2);cursor:pointer;font-size:0.85rem">
          <span style="font-weight:600;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-right:0.5rem">${n.nazev}</span>
          <span class="badge badge-amber">${dny}d</span>
        </div>`;
      }).join('')}
      ${expirujici.length > 3 ? `<div style="font-size:0.75rem;color:var(--c-ink3);padding-top:0.4rem">+${expirujici.length - 3} dalších…</div>` : ''}
    </div>` : ''}

    ${bezKontaktu.length > 0 ? `
    <div class="card" style="border:1px solid var(--c-border2)">
      <div class="card-title">🔔 Bez kontaktu >14 dní (${bezKontaktu.length})</div>
      ${bezKontaktu.slice(0, 3).map(n => `
        <div onclick="navigate('nabidkaDetail',{editId:${n.id}})"
          style="display:flex;justify-content:space-between;align-items:center;
            padding:0.42rem 0;border-bottom:1px solid var(--c-s2);cursor:pointer;font-size:0.82rem">
          <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-right:0.5rem">${n.nazev}</span>
          <span style="font-size:0.7rem;color:var(--c-ink3);white-space:nowrap">
            ${Math.floor((dnes - new Date(n.datum)) / 86400000)}d
          </span>
        </div>`).join('')}
    </div>` : ''}

    <!-- ══ TERMÍNY TENTO TÝDEN ══ -->
    ${terminTyden.length > 0 ? `
    <div class="card card-info">
      <div class="card-title" style="color:var(--c-blue)">📅 Termíny tento týden (${terminTyden.length})</div>
      ${terminTyden.map(n => {
        const dD = new Date(n.termin);
        const diff = Math.floor((dD - dnes) / 86400000);
        const urgColor = diff <= 1 ? 'var(--c-red)' : diff <= 3 ? 'var(--c-amber)' : 'var(--c-blue)';
        const diffLabel = diff < 0 ? 'Po term.' : diff === 0 ? 'DNES' : diff === 1 ? 'Zítra' : `Za ${diff}d`;
        return `<div onclick="navigate('nabidkaDetail',{editId:${n.id}})"
          style="display:flex;justify-content:space-between;align-items:center;
            padding:0.48rem 0;border-bottom:1px solid var(--c-s2);cursor:pointer">
          <div style="flex:1;min-width:0;padding-right:0.5rem">
            <div style="font-weight:600;font-size:0.87rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${n.nazev}</div>
            <div style="font-size:0.72rem;color:var(--c-ink3)">${n.zakaznik || ''}${n.mistoRealizace ? ' · ' + n.mistoRealizace : ''}</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-size:0.8rem;font-weight:700;color:${urgColor}">${diffLabel}</div>
            <div style="font-size:0.68rem;color:var(--c-ink3)">${dD.toLocaleDateString('cs-CZ',{day:'numeric',month:'short'})}</div>
          </div>
        </div>`;
      }).join('')}
    </div>` : ''}

    <!-- ══ TOP ZÁKAZNÍK ══ -->
    ${topZak ? `
    <div class="card" style="background:var(--c-s2);border:1px solid var(--c-border)">
      <div style="display:flex;align-items:center;gap:0.8rem">
        <div style="width:42px;height:42px;border-radius:50%;
          background:linear-gradient(135deg,var(--c-terra),var(--c-terra-dark));
          display:flex;align-items:center;justify-content:center;font-size:1.2rem;
          flex-shrink:0;box-shadow:0 3px 10px rgba(200,80,42,0.3)">🏆</div>
        <div style="flex:1">
          <div style="font-size:0.62rem;color:var(--c-ink3);font-weight:700;
            text-transform:uppercase;letter-spacing:0.07em">Nejlepší zákazník</div>
          <div style="font-weight:700;font-size:0.95rem">${topZak[0]}</div>
          <div style="font-size:0.72rem;color:var(--c-ink2)">
            ${topZak[1].count} zakázek · ${(topZak[1].total/1000).toFixed(0)} k Kč
          </div>
        </div>
        <button onclick="navigate('zakaznici')"
          style="background:none;border:1.5px solid var(--c-border2);border-radius:var(--r-xs);
            padding:0.35rem 0.6rem;font-size:0.75rem;cursor:pointer;color:var(--c-ink2)">→</button>
      </div>
    </div>` : ''}

    <!-- ══ RYCHLÁ KALKULACE ══ -->
    <div class="card card-accent">
      <div class="card-title">⚡ Rychlá kalkulace</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.55rem">
        <div class="field" style="margin:0">
          <label>Plocha (m²)</label>
          <input type="number" id="rk_plocha" placeholder="12" min="0" step="0.5"
            style="text-align:center;font-weight:700;font-size:1rem"
            oninput="rychlaKalkulaceUpdate()">
        </div>
        <div class="field" style="margin:0">
          <label>Marže (%)</label>
          <input type="number" id="rk_marze" value="28" min="0" max="100"
            style="text-align:center;font-weight:700;font-size:1rem"
            oninput="rychlaKalkulaceUpdate()">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.35rem;margin-bottom:0.5rem" id="rk-typy">
        ${[
          { id: 'dlazba_std',  l: 'Dlažba',      prace: 350, mat: 480 },
          { id: 'obklad_std',  l: 'Obklad',       prace: 380, mat: 420 },
          { id: 'velf',        l: 'Velkoformát',  prace: 520, mat: 650 },
          { id: 'mozaika',     l: 'Mozaika',      prace: 680, mat: 580 },
          { id: 'exteriér',    l: 'Exteriér',     prace: 440, mat: 520 },
          { id: 'sdk',         l: 'SDK příčka',   prace: 580, mat: 380 },
        ].map(t => `
          <button onclick="rychlaKalkulaceTyp(${t.prace},${t.mat},'${t.l}')"
            id="rk_typ_${t.id}"
            style="padding:0.38rem 0.2rem;border-radius:var(--r-xs);
              border:1.5px solid var(--c-border);background:var(--c-surface);
              cursor:pointer;font-size:0.7rem;font-weight:600;
              font-family:var(--f-body);text-align:center;
              transition:all var(--dur)">
            ${t.l}
          </button>`).join('')}
      </div>
      <div id="rk_result" style="display:none;background:var(--c-s2);border-radius:var(--r-sm);
        padding:0.75rem 0.9rem;margin-bottom:0.55rem">
        <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:0.28rem">
          <span style="color:var(--c-ink3)">Práce</span>
          <span id="rk_prace" style="font-weight:600"></span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:0.28rem">
          <span style="color:var(--c-ink3)">Materiál s marží</span>
          <span id="rk_mat" style="font-weight:600"></span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:1rem;font-weight:800;
          border-top:1.5px solid var(--c-border);padding-top:0.5rem;margin-top:0.2rem;
          font-family:var(--f-display)">
          <span>💰 Orientační cena</span>
          <span id="rk_total" style="color:var(--c-terra)"></span>
        </div>
        <div style="font-size:0.67rem;color:var(--c-ink3);margin-top:0.25rem" id="rk_typ_label"></div>
      </div>
      <button class="btn btn-primary btn-full" id="rk_btn_nabidka"
        onclick="rychlaKalkulaceDoNabidky()" style="display:none">
        ➕ Vytvořit nabídku s těmito hodnotami
      </button>
    </div>

    <!-- ══ POSLEDNÍ ZAKÁZKY ══ -->
    ${nabidky.length > 0 ? `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.7rem">
        <div class="card-title" style="margin:0">Poslední zakázky</div>
        <button onclick="sessionStorage.setItem('nabidkyFilter','vse');navigate('nabidky')"
          style="font-size:0.75rem;color:var(--c-terra);background:none;border:none;
            cursor:pointer;font-weight:600;font-family:var(--f-body)">
          Vše →
        </button>
      </div>
      ${nabidky.slice(-5).reverse().map(n => {
        const stav = n.stav || 'nabidka';
        const si = {
          nabidka:   { c: '#968E84', l: 'Nabídka' },
          schvaleno: { c: '#1A4FAA', l: 'Schváleno' },
          probiha:   { c: '#C8502A', l: 'Probíhá' },
          dokonceno: { c: '#1E6B4A', l: 'Dokončeno' },
          zaplaceno: { c: '#059669', l: 'Zaplaceno' },
        }[stav] || { c: '#968E84', l: 'Nabídka' };
        return `
        <div onclick="navigate('nabidkaDetail',{editId:${n.id}})"
          style="display:flex;justify-content:space-between;align-items:center;
            padding:0.58rem 0;border-bottom:1px solid var(--c-s2);cursor:pointer">
          <div style="flex:1;min-width:0;padding-right:0.5rem">
            <div style="font-weight:600;font-size:0.87rem;white-space:nowrap;
              overflow:hidden;text-overflow:ellipsis">${n.nazev}</div>
            <div style="font-size:0.7rem;color:var(--c-ink3)">
              ${n.datum}${n.zakaznik ? ' · ' + n.zakaznik : ''}
            </div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex-shrink:0">
            <span style="font-size:0.82rem;font-weight:700;color:var(--c-terra)">
              ${parseInt(n.cenaCelkem || 0).toLocaleString('cs')} Kč
            </span>
            <span style="font-size:0.6rem;font-weight:700;color:${si.c};
              text-transform:uppercase;letter-spacing:0.05em">${si.l}</span>
          </div>
        </div>`;
      }).join('')}
    </div>` : `
    <div class="card" style="border:2px dashed var(--c-border)">
      <div class="empty">
        <span class="icon">📋</span>
        <p>Zatím žádné zakázky.</p>
        <button class="btn btn-primary" style="margin-top:0.8rem"
          onclick="navigate('novaNabidka')">➕ První nabídka</button>
      </div>
    </div>`}

    <!-- ══ CENÍK PRÁZDNÝ ══ -->
    ${ceniky.length === 0 ? `
    <div class="card" style="border:2px dashed var(--c-border)">
      <div class="empty">
        <span class="icon">📦</span>
        <p>Ceník je prázdný.</p>
        <button class="btn btn-secondary btn-sm" style="margin-top:0.8rem"
          onclick="navigate('ceniky')">Přidat ceník →</button>
      </div>
    </div>` : ''}

    <!-- ══ FOOTER AKCE ══ -->
    <div style="display:flex;gap:0.5rem;margin-top:0.3rem">
      <button class="btn btn-secondary" style="flex:1;justify-content:center;font-size:0.8rem"
        onclick="exportZaloha()">💾 Záloha</button>
      <button class="btn btn-secondary" style="flex:1;justify-content:center;font-size:0.8rem"
        onclick="navigate('firma')">🏢 Nastavení</button>
      <button class="btn btn-secondary" style="flex:1;justify-content:center;font-size:0.8rem"
        onclick="navigate('sklad')">📦 Sklad</button>
    </div>
  `;
}

// ── Rozbalené akce ────────────────────────────────────────
function _showMoreActions() {
  const existing = document.getElementById('more-actions-modal');
  if (existing) { existing.remove(); return; }
  const div = document.createElement('div');
  div.id = 'more-actions-modal';
  div.style.cssText = 'position:fixed;inset:0;z-index:400;background:rgba(22,20,15,0.55);display:flex;align-items:flex-end;backdrop-filter:blur(6px)';
  div.onclick = e => { if (e.target === div) div.remove(); };
  const items = [
    { icon: '✏️', label: 'Půdorys',       action: "navigate('pudorys')" },
    { icon: '🛠️', label: 'Ceník prací',   action: "navigate('prace')" },
    { icon: '📦', label: 'Ceník mat.',    action: "navigate('ceniky')" },
    { icon: '📢', label: 'Marketing',     action: "navigate('marketing')" },
    { icon: '🪚', label: 'Řezný plán',   action: "navigate('reznyPlan')" },
    { icon: '📦', label: 'Sklad',         action: "navigate('sklad')" },
    { icon: '🏢', label: 'Nastavení',     action: "navigate('firma')" },
    { icon: '📋', label: 'Šablony zpráv', action: "navigate('sablony')" },
  ];
  div.innerHTML = `
    <div style="background:var(--c-surface);border-radius:var(--r) var(--r) 0 0;
      padding:1.3rem;width:100%;max-height:80dvh;overflow-y:auto">
      <div style="width:36px;height:3.5px;background:var(--c-border2);border-radius:100px;
        margin:0 auto 1rem"></div>
      <div class="card-title">Všechny sekce</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.5rem">
        ${items.map(it => `
          <button class="qa-item" onclick="${it.action};document.getElementById('more-actions-modal').remove()">
            <span class="qa-icon">${it.icon}</span>
            ${it.label}
          </button>`).join('')}
      </div>
    </div>`;
  document.body.appendChild(div);
}

// ── Rychlá kalkulace helpers ──────────────────────────────
let _rkState = { praceSazba: 0, matSazba: 0, typLabel: '' };

function rychlaKalkulaceTyp(praceSazba, matSazba, label) {
  _rkState = { praceSazba, matSazba, typLabel: label };
  document.querySelectorAll('[id^="rk_typ_"]').forEach(b => {
    b.style.background    = 'var(--c-surface)';
    b.style.borderColor   = 'var(--c-border)';
    b.style.color         = 'var(--c-ink2)';
  });
  document.querySelectorAll('[id^="rk_typ_"]').forEach(b => {
    if (b.textContent.trim() === label) {
      b.style.background  = 'var(--c-terra-soft)';
      b.style.borderColor = 'var(--c-terra)';
      b.style.color       = 'var(--c-terra)';
    }
  });
  rychlaKalkulaceUpdate();
}

function rychlaKalkulaceUpdate() {
  const plocha = parseFloat(document.getElementById('rk_plocha')?.value) || 0;
  const marze  = parseFloat(document.getElementById('rk_marze')?.value)  || 28;
  const { praceSazba, matSazba, typLabel } = _rkState;
  const resEl  = document.getElementById('rk_result');
  const btnEl  = document.getElementById('rk_btn_nabidka');
  if (!plocha || !praceSazba) {
    if (resEl) resEl.style.display = 'none';
    if (btnEl) btnEl.style.display = 'none';
    return;
  }
  const cenaP  = Math.round(plocha * praceSazba);
  const cenaM  = Math.round(plocha * matSazba * (1 + marze / 100));
  const total  = cenaP + cenaM;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('rk_prace', cenaP.toLocaleString('cs') + ' Kč');
  set('rk_mat',   cenaM.toLocaleString('cs') + ' Kč');
  set('rk_total', total.toLocaleString('cs') + ' Kč');
  set('rk_typ_label', `${typLabel} · ${plocha} m² · marže ${marze}% · orientační odhad`);
  if (resEl) resEl.style.display = 'block';
  if (btnEl) btnEl.style.display = 'block';
}

function rychlaKalkulaceDoNabidky() {
  const plocha = document.getElementById('rk_plocha')?.value || '';
  const marze  = document.getElementById('rk_marze')?.value  || '28';
  navigate('novaNabidka').then(() => {
    setTimeout(() => {
      const pEl = document.getElementById('nc_plocha'); if (pEl) pEl.value = plocha;
      const mEl = document.getElementById('nc_marze');  if (mEl) mEl.value = marze;
      switchTab('calc');
    }, 120);
  });
}

// ── Theme toggle ──────────────────────────────────────────
function _getCurrentThemeIcon() {
  const stored = localStorage.getItem('cn_theme');
  if (stored === 'dark')  return '☀️';
  if (stored === 'light') return '🌙';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? '☀️' : '🌙';
}

function toggleTheme() {
  const html    = document.documentElement;
  const current = localStorage.getItem('cn_theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const next    = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('cn_theme', next);
  const icon = document.getElementById('theme-icon');
  if (icon) icon.textContent = next === 'dark' ? '☀️' : '🌙';
  toast(next === 'dark' ? '🌙 Tmavý režim' : '☀️ Světlý režim');
}

// Inicializace tématu při startu
(function initTheme() {
  const stored = localStorage.getItem('cn_theme');
  if (stored) document.documentElement.setAttribute('data-theme', stored);
})();
