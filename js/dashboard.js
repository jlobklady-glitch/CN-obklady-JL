// ═══ dashboard.js — JL-OBKLADY CN v5 — Clean Light ═══

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
  const dnesHodiny = hodiny.filter(h => h.datum === dnesStr);
  const dnesCelkH  = dnesHodiny.reduce((s, h) => s + h.hodiny, 0);

  // ── Termíny tento týden ──────────────────────────────────
  const tydOd = new Date(dnes);
  tydOd.setDate(dnes.getDate() - ((dnes.getDay() + 6) % 7));
  const tydDo = new Date(tydOd); tydDo.setDate(tydOd.getDate() + 6);
  const terminTyden = nabidky.filter(n =>
    n.termin && n.termin >= tydOd.toISOString().slice(0, 10) &&
    n.termin <= tydDo.toISOString().slice(0, 10)
  ).sort((a, b) => a.termin > b.termin ? 1 : -1);

  // ── Expirující ───────────────────────────────────────────
  const expirujici = nabidky.filter(n => {
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

  // ── Konverze + průměr ────────────────────────────────────
  const zapl = nabidky.filter(n => n.stav === 'zaplaceno').length;
  const konverze = nabidky.length ? Math.round((zapl / nabidky.length) * 100) : 0;
  const prumerCelk = nabidky.length
    ? Math.round(nabidky.reduce((s, n) => s + parseFloat(n.cenaCelkem || 0), 0) / nabidky.length)
    : 0;

  // ── Formátovací helper ───────────────────────────────────
  const fmtKc = (n) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + ' M';
    if (n >= 1000)    return (n / 1000).toFixed(0) + ' k';
    return n.toLocaleString('cs');
  };

  // ── Stavové definice ─────────────────────────────────────
  const stavDef = {
    nabidka:   { c: '#64748B', bg: '#F1F5F9', l: 'Nabídka' },
    schvaleno: { c: '#2563EB', bg: '#EFF6FF', l: 'Schváleno' },
    probiha:   { c: '#EA580C', bg: '#FFF7ED', l: 'Probíhá' },
    dokonceno: { c: '#16A34A', bg: '#F0FDF4', l: 'Hotovo' },
    zaplaceno: { c: '#059669', bg: '#ECFDF5', l: 'Zaplaceno' },
  };

  // ── Pipeline bar ─────────────────────────────────────────
  const pipelineSegments = Object.entries(stavyCounts)
    .filter(([, cnt]) => cnt > 0)
    .map(([stav, cnt]) => {
      const pct = Math.max(4, Math.round((cnt / pipelineTotal) * 100));
      const d   = stavDef[stav] || stavDef.nabidka;
      return `<div style="flex:${pct};height:100%;background:${d.c};cursor:pointer;transition:opacity 0.2s"
        onclick="sessionStorage.setItem('nabidkyFilter','${stav}');navigate('nabidky')"
        title="${d.l}: ${cnt}"
        onmouseenter="this.style.opacity='0.75'"
        onmouseleave="this.style.opacity='1'"></div>`;
    }).join('');

  // ── Graf SVG ─────────────────────────────────────────────
  const grafH  = 60;
  const grafW  = 100;
  const barW   = 11;
  const barGap = 5.5;
  const svgBars = mesiceGraf.map((m, i) => {
    const barH  = Math.max(2, Math.round((m.val / maxVal) * grafH));
    const x     = i * (barW + barGap) + 1;
    const isCur = m.key === mesic;
    const yBar  = grafH - barH;
    return `
      <g>
        <rect x="${x}" y="${yBar}" width="${barW}" height="${barH}"
          rx="3" fill="${isCur ? '#C8502A' : '#E2E8F0'}"/>
        <text x="${x + barW / 2}" y="${grafH + 9}" text-anchor="middle"
          font-size="5.5" fill="${isCur ? '#C8502A' : '#94A3B8'}"
          font-weight="${isCur ? '700' : '500'}">${m.label}</text>
        ${isCur && m.val > 0 ? `
          <text x="${x + barW / 2}" y="${yBar - 2}" text-anchor="middle"
            font-size="4.8" fill="#C8502A" font-weight="700">
            ${m.val >= 1000 ? (m.val / 1000).toFixed(0) + 'k' : m.val}
          </text>` : ''}
      </g>`;
  }).join('');

  return `

    <!-- ══ TOP BAR ══ -->
    <div style="
      background:var(--c-surface);
      border-radius:var(--r);
      padding:1rem 1.1rem 0.9rem;
      margin-bottom:0.75rem;
      display:flex;
      justify-content:space-between;
      align-items:center;
      box-shadow:var(--sh-xs);
      border:1px solid var(--c-border);
    ">
      <div>
        <div style="font-size:1.05rem;font-weight:800;color:var(--c-ink);letter-spacing:-0.02em;line-height:1.1">
          Přehled
        </div>
        <div style="font-size:0.72rem;color:var(--c-ink3);margin-top:2px">
          ${dnes.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>
      <div style="display:flex;gap:0.4rem;align-items:center">
        <button onclick="openGlobalSearch()"
          style="background:var(--c-s2);border:1.5px solid var(--c-border);
            color:var(--c-ink2);border-radius:var(--r-sm);padding:0.4rem 0.65rem;
            font-size:0.82rem;cursor:pointer;font-family:var(--f-body)">🔍</button>
        <button onclick="toggleTheme()"
          style="background:var(--c-s2);border:1.5px solid var(--c-border);
            color:var(--c-ink2);border-radius:var(--r-sm);padding:0.4rem 0.6rem;
            font-size:0.85rem;cursor:pointer" title="Přepnout téma">
          <span id="theme-icon">${_getCurrentThemeIcon()}</span>
        </button>
        <div style="
          background:var(--c-terra-soft);
          color:var(--c-terra);
          font-size:0.68rem;font-weight:700;
          padding:0.28rem 0.6rem;
          border-radius:var(--r-pill);
        ">JL-OBKLADY</div>
      </div>
    </div>

    <!-- ══ HERO KARTA — měsíc ══ -->
    <div style="
      background:var(--c-terra);
      border-radius:var(--r);
      padding:1.3rem 1.25rem 1.1rem;
      margin-bottom:0.65rem;
      position:relative;
      overflow:hidden;
    ">
      <!-- dekorativní kruh -->
      <div style="
        position:absolute;top:-30px;right:-30px;
        width:140px;height:140px;
        border-radius:50%;
        background:rgba(255,255,255,0.06);
        pointer-events:none;
      "></div>
      <div style="
        position:absolute;bottom:-50px;left:-20px;
        width:120px;height:120px;
        border-radius:50%;
        background:rgba(255,255,255,0.04);
        pointer-events:none;
      "></div>

      <div style="font-size:0.68rem;font-weight:700;letter-spacing:0.1em;
        text-transform:uppercase;color:rgba(255,255,255,0.6);margin-bottom:0.45rem;
        position:relative;z-index:1">
        Obrat tento měsíc
      </div>

      <!-- Velké číslo -->
      <div style="
        font-family:var(--f-body);
        font-size:2.8rem;
        font-weight:800;
        color:white;
        letter-spacing:-0.04em;
        line-height:1;
        font-variant-numeric:tabular-nums;
        position:relative;z-index:1;
      ">
        ${celkemMesic >= 1000
          ? celkemMesic.toLocaleString('cs')
          : celkemMesic > 0 ? celkemMesic.toLocaleString('cs') : '0'}
        <span style="font-size:1.1rem;font-weight:500;color:rgba(255,255,255,0.55);margin-left:4px">Kč</span>
      </div>
      <div style="font-size:0.72rem;color:rgba(255,255,255,0.55);margin-top:0.35rem;
        position:relative;z-index:1">
        ${mesicNabidky.length} zakázek · ${dnes.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' })}
      </div>

      <!-- Pipeline -->
      ${pipelineTotal > 0 ? `
      <div style="margin-top:1rem;position:relative;z-index:1">
        <div style="display:flex;height:5px;border-radius:3px;overflow:hidden;gap:2px;background:rgba(0,0,0,0.15)">
          ${pipelineSegments}
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:0.6rem;margin-top:0.55rem">
          ${Object.entries(stavyCounts).filter(([, c]) => c > 0).map(([stav, cnt]) => {
            const d = stavDef[stav] || stavDef.nabidka;
            return `<span style="font-size:0.62rem;font-weight:700;color:rgba(255,255,255,0.55);
              display:flex;align-items:center;gap:3px">
              <span style="display:inline-block;width:7px;height:7px;border-radius:50%;
                background:${d.c};flex-shrink:0"></span>
              ${d.l} ${cnt}
            </span>`;
          }).join('')}
        </div>
      </div>` : ''}

      <!-- Dnes hodiny + button -->
      <div style="
        margin-top:0.85rem;padding-top:0.8rem;
        border-top:1px solid rgba(255,255,255,0.12);
        display:flex;align-items:center;justify-content:space-between;
        position:relative;z-index:1;
      ">
        <div style="display:flex;gap:1rem">
          ${dnesCelkH > 0 ? `
          <div>
            <div style="font-size:1.35rem;font-weight:800;color:rgba(255,255,255,0.95);
              font-variant-numeric:tabular-nums;line-height:1">${dnesCelkH}h</div>
            <div style="font-size:0.6rem;color:rgba(255,255,255,0.45);
              text-transform:uppercase;letter-spacing:0.06em;margin-top:1px">Dnes</div>
          </div>` : ''}
          ${stavyCounts.probiha > 0 ? `
          <div>
            <div style="font-size:1.35rem;font-weight:800;color:rgba(255,255,255,0.95);
              font-variant-numeric:tabular-nums;line-height:1">${stavyCounts.probiha}</div>
            <div style="font-size:0.6rem;color:rgba(255,255,255,0.45);
              text-transform:uppercase;letter-spacing:0.06em;margin-top:1px">Probíhá</div>
          </div>` : ''}
          ${!dnesCelkH && !stavyCounts.probiha ? `
          <div style="font-size:0.8rem;color:rgba(255,255,255,0.45)">
            ${nabidky.length} zakázek celkem
          </div>` : ''}
        </div>
        <button onclick="otevritNoveHodiny('${dnesStr}')"
          style="background:rgba(255,255,255,0.18);color:white;border:1.5px solid rgba(255,255,255,0.25);
            border-radius:var(--r-sm);padding:0.5rem 0.85rem;font-size:0.78rem;font-weight:700;
            cursor:pointer;font-family:var(--f-body)">
          ➕ Hodiny
        </button>
      </div>
    </div>

    <!-- ══ STATS — 2 karty + 3 karty ══ -->
    <!-- Řada 1: Rok + Probíhá -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.65rem;margin-bottom:0.65rem">

      <div class="stat-card" onclick="navigate('nabidky')" style="padding:1.1rem 1rem">
        <div class="stat-label" style="margin-bottom:0.4rem">Rok ${rok}</div>
        <div style="
          font-size:1.85rem;
          font-weight:800;
          color:var(--c-ink);
          letter-spacing:-0.03em;
          line-height:1;
          font-variant-numeric:tabular-nums;
        ">${fmtKc(celkemRok)}</div>
        <div style="font-size:0.68rem;color:var(--c-ink3);margin-top:3px">Kč celkem</div>
      </div>

      <div class="stat-card" onclick="sessionStorage.setItem('nabidkyFilter','probiha');navigate('nabidky')"
        style="padding:1.1rem 1rem">
        ${stavyCounts.probiha > 0 ? `<div class="stat-trend up" style="background:var(--c-amber-s);color:var(--c-amber)">↗</div>` : ''}
        <div class="stat-label" style="margin-bottom:0.4rem">Probíhá</div>
        <div style="
          font-size:1.85rem;
          font-weight:800;
          color:var(--c-amber);
          letter-spacing:-0.03em;
          line-height:1;
          font-variant-numeric:tabular-nums;
        ">${stavyCounts.probiha}</div>
        <div style="font-size:0.68rem;color:var(--c-ink3);margin-top:3px">zakázek</div>
      </div>
    </div>

    <!-- Řada 2: 3 malé karty -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.65rem;margin-bottom:0.65rem">

      <div class="stat-card" onclick="sessionStorage.setItem('nabidkyFilter','zaplaceno');navigate('nabidky')"
        style="padding:0.9rem 0.85rem">
        <div class="stat-label" style="margin-bottom:0.35rem;font-size:0.6rem">Zaplaceno</div>
        <div style="
          font-size:1.4rem;
          font-weight:800;
          color:var(--c-green);
          letter-spacing:-0.03em;
          line-height:1;
          font-variant-numeric:tabular-nums;
        ">${fmtKc(zaplaceno)}</div>
        <div style="font-size:0.6rem;color:var(--c-ink3);margin-top:2px">Kč</div>
      </div>

      <div class="stat-card" style="padding:0.9rem 0.85rem">
        <div class="stat-label" style="margin-bottom:0.35rem;font-size:0.6rem">Celkem</div>
        <div style="
          font-size:1.4rem;
          font-weight:800;
          color:var(--c-terra);
          letter-spacing:-0.03em;
          line-height:1;
          font-variant-numeric:tabular-nums;
        ">${nabidky.length}</div>
        <div style="font-size:0.6rem;color:var(--c-ink3);margin-top:2px">zakázek</div>
      </div>

      <div class="stat-card" style="padding:0.9rem 0.85rem">
        <div class="stat-label" style="margin-bottom:0.35rem;font-size:0.6rem">Konverze</div>
        <div style="
          font-size:1.4rem;
          font-weight:800;
          color:var(--c-blue);
          letter-spacing:-0.03em;
          line-height:1;
          font-variant-numeric:tabular-nums;
        ">${konverze} %</div>
        <div style="font-size:0.6rem;color:var(--c-ink3);margin-top:2px">zakázek</div>
      </div>
    </div>

    <!-- ══ QUICK ACTIONS ══ -->
    <div class="card" style="padding:0.85rem;margin-bottom:0.65rem">
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

    <!-- ══ GRAF ══ -->
    ${nabidky.length > 0 ? `
    <div class="card" style="margin-bottom:0.65rem">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.85rem">
        <div style="font-size:0.82rem;font-weight:700;color:var(--c-ink)">Obrat 6 měsíců</div>
        <div style="font-size:0.68rem;color:var(--c-ink3)">${rok}</div>
      </div>
      <svg viewBox="0 0 100 72" preserveAspectRatio="none"
        style="width:100%;height:82px;overflow:visible;display:block">
        <line x1="0" y1="0"  x2="100" y2="0"  stroke="var(--c-border)" stroke-width="0.3" stroke-dasharray="2,2"/>
        <line x1="0" y1="30" x2="100" y2="30" stroke="var(--c-border)" stroke-width="0.3" stroke-dasharray="2,2"/>
        <line x1="0" y1="60" x2="100" y2="60" stroke="var(--c-border)" stroke-width="0.5"/>
        ${svgBars}
      </svg>
    </div>` : ''}

    <!-- ══ UPOZORNĚNÍ ══ -->
    ${expirujici.length > 0 ? `
    <div class="card card-warn" style="margin-bottom:0.65rem">
      <div class="card-title" style="color:var(--c-amber)">⚠️ Nabídky blízko vypršení (${expirujici.length})</div>
      ${expirujici.slice(0, 3).map(n => {
        const dny = Math.floor((dnes - new Date(n.datum)) / 86400000);
        return `<div onclick="navigate('nabidkaDetail',{editId:${n.id}})"
          style="display:flex;justify-content:space-between;align-items:center;
            padding:0.45rem 0;border-bottom:1px solid var(--c-s2);cursor:pointer;font-size:0.85rem">
          <span style="font-weight:600;flex:1;overflow:hidden;text-overflow:ellipsis;
            white-space:nowrap;padding-right:0.5rem">${escHtml(n.nazev)}</span>
          <span class="badge badge-amber">${dny}d</span>
        </div>`;
      }).join('')}
      ${expirujici.length > 3 ? `
        <div style="font-size:0.75rem;color:var(--c-ink3);padding-top:0.4rem">+${expirujici.length - 3} dalších…</div>` : ''}
    </div>` : ''}

    ${bezKontaktu.length > 0 ? `
    <div class="card" style="margin-bottom:0.65rem;border:1px solid var(--c-border2)">
      <div class="card-title">🔔 Bez kontaktu >14 dní (${bezKontaktu.length})</div>
      ${bezKontaktu.slice(0, 3).map(n => `
        <div onclick="navigate('nabidkaDetail',{editId:${n.id}})"
          style="display:flex;justify-content:space-between;align-items:center;
            padding:0.42rem 0;border-bottom:1px solid var(--c-s2);cursor:pointer;font-size:0.82rem">
          <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
            padding-right:0.5rem">${escHtml(n.nazev)}</span>
          <span style="font-size:0.7rem;color:var(--c-ink3);white-space:nowrap">
            ${Math.floor((dnes - new Date(n.datum)) / 86400000)}d
          </span>
        </div>`).join('')}
    </div>` : ''}

    <!-- ══ TERMÍNY ══ -->
    ${terminTyden.length > 0 ? `
    <div class="card card-info" style="margin-bottom:0.65rem">
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
            <div style="font-weight:600;font-size:0.87rem;white-space:nowrap;
              overflow:hidden;text-overflow:ellipsis">${escHtml(n.nazev)}</div>
            <div style="font-size:0.72rem;color:var(--c-ink3)">
              ${n.zakaznik || ''}${n.mistoRealizace ? ' · ' + n.mistoRealizace : ''}
            </div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-size:0.82rem;font-weight:700;color:${urgColor}">${diffLabel}</div>
            <div style="font-size:0.68rem;color:var(--c-ink3)">
              ${dD.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' })}
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>` : ''}

    <!-- ══ TOP ZÁKAZNÍK ══ -->
    ${topZak ? `
    <div class="card" style="margin-bottom:0.65rem">
      <div style="display:flex;align-items:center;gap:0.75rem">
        <div style="
          width:44px;height:44px;border-radius:var(--r-sm);
          background:var(--c-terra-soft);
          display:flex;align-items:center;justify-content:center;
          font-size:1.3rem;flex-shrink:0;
        ">🏆</div>
        <div style="flex:1">
          <div style="font-size:0.62rem;color:var(--c-ink3);font-weight:700;
            text-transform:uppercase;letter-spacing:0.07em">Nejlepší zákazník</div>
          <div style="font-weight:700;font-size:0.95rem;margin-top:1px">${escHtml(topZak[0])}</div>
          <div style="font-size:0.72rem;color:var(--c-ink2)">
            ${topZak[1].count} zakázek · ${(topZak[1].total / 1000).toFixed(0)} k Kč
          </div>
        </div>
        <button onclick="navigate('zakaznici')"
          style="background:var(--c-s2);border:1.5px solid var(--c-border);
            border-radius:var(--r-xs);padding:0.35rem 0.6rem;
            font-size:0.78rem;cursor:pointer;color:var(--c-ink2)">→</button>
      </div>
    </div>` : ''}

    <!-- ══ RYCHLÁ KALKULACE ══ -->
    <div class="card card-accent" style="margin-bottom:0.65rem">
      <div class="card-title">⚡ Rychlá kalkulace</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.55rem">
        <div class="field" style="margin:0">
          <label>Plocha (m²)</label>
          <input type="number" id="rk_plocha" placeholder="12" min="0" step="0.5"
            style="text-align:center;font-weight:700;font-size:1.05rem"
            oninput="rychlaKalkulaceUpdate()">
        </div>
        <div class="field" style="margin:0">
          <label>Marže (%)</label>
          <input type="number" id="rk_marze" value="28" min="0" max="100"
            style="text-align:center;font-weight:700;font-size:1.05rem"
            oninput="rychlaKalkulaceUpdate()">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.35rem;margin-bottom:0.5rem" id="rk-typy">
        ${[
          { id: 'dlazba_std', l: 'Dlažba',     prace: 350, mat: 480 },
          { id: 'obklad_std', l: 'Obklad',      prace: 380, mat: 420 },
          { id: 'velf',       l: 'Velkoformát', prace: 520, mat: 650 },
          { id: 'mozaika',    l: 'Mozaika',     prace: 680, mat: 580 },
          { id: 'exteriér',   l: 'Exteriér',    prace: 440, mat: 520 },
          { id: 'sdk',        l: 'SDK příčka',  prace: 580, mat: 380 },
        ].map(t => `
          <button onclick="rychlaKalkulaceTyp(${t.prace},${t.mat},'${t.l}')"
            id="rk_typ_${t.id}"
            style="padding:0.4rem 0.2rem;border-radius:var(--r-xs);
              border:1.5px solid var(--c-border);background:var(--c-surface);
              cursor:pointer;font-size:0.7rem;font-weight:600;
              font-family:var(--f-body);text-align:center;transition:all var(--dur)">
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
          border-top:1.5px solid var(--c-border);padding-top:0.5rem;margin-top:0.2rem">
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
    <div class="card" style="margin-bottom:0.65rem;overflow:hidden">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.85rem">
        <div style="font-size:0.82rem;font-weight:700;color:var(--c-ink)">Poslední zakázky</div>
        <button onclick="sessionStorage.setItem('nabidkyFilter','vse');navigate('nabidky')"
          style="font-size:0.75rem;color:var(--c-terra);background:none;border:none;
            cursor:pointer;font-weight:600;font-family:var(--f-body)">Všechny →</button>
      </div>
      ${nabidky.slice(-5).reverse().map(n => {
        const stav = n.stav || 'nabidka';
        const sd   = stavDef[stav] || stavDef.nabidka;
        return `
        <div onclick="navigate('nabidkaDetail',{editId:${n.id}})"
          style="display:flex;align-items:center;gap:0.7rem;
            padding:0.65rem 0;border-bottom:1px solid var(--c-s2);cursor:pointer">
          <!-- ikona stav -->
          <div style="
            width:38px;height:38px;border-radius:var(--r-sm);
            background:${sd.bg};
            display:flex;align-items:center;justify-content:center;
            font-size:1rem;flex-shrink:0;
          ">🔲</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:0.88rem;
              white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
              ${escHtml(n.nazev)}
            </div>
            <div style="font-size:0.7rem;color:var(--c-ink3);margin-top:1px">
              ${n.datum}${n.zakaznik ? ' · ' + escHtml(n.zakaznik) : ''}
            </div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="
              font-size:0.9rem;font-weight:800;color:var(--c-ink);
              font-variant-numeric:tabular-nums;letter-spacing:-0.01em;
            ">${parseInt(n.cenaCelkem || 0).toLocaleString('cs')} Kč</div>
            <div style="
              font-size:0.62rem;font-weight:700;color:${sd.c};
              background:${sd.bg};
              padding:2px 6px;border-radius:var(--r-pill);
              display:inline-block;margin-top:2px;
            ">${sd.l}</div>
          </div>
        </div>`;
      }).join('')}
    </div>` : `
    <div class="card" style="border:2px dashed var(--c-border);margin-bottom:0.65rem">
      <div class="empty">
        <span class="icon">📋</span>
        <p>Zatím žádné zakázky.</p>
        <button class="btn btn-primary" style="margin-top:0.8rem"
          onclick="navigate('novaNabidka')">➕ První nabídka</button>
      </div>
    </div>`}

    <!-- ══ PRÁZDNÝ CENÍK ══ -->
    ${ceniky.length === 0 ? `
    <div class="card" style="border:2px dashed var(--c-border);margin-bottom:0.65rem">
      <div class="empty">
        <span class="icon">📦</span>
        <p>Ceník je prázdný.</p>
        <button class="btn btn-secondary btn-sm" style="margin-top:0.8rem"
          onclick="navigate('ceniky')">Přidat ceník →</button>
      </div>
    </div>` : ''}

    <!-- ══ FOOTER ══ -->
    <div style="display:flex;gap:0.5rem;margin-top:0.2rem">
      <button class="btn btn-secondary" style="flex:1;justify-content:center;font-size:0.78rem"
        onclick="exportZaloha()">💾 Záloha</button>
      <button class="btn btn-secondary" style="flex:1;justify-content:center;font-size:0.78rem"
        onclick="navigate('firma')">🏢 Nastavení</button>
      <button class="btn btn-secondary" style="flex:1;justify-content:center;font-size:0.78rem"
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
          <button class="qa-item"
            onclick="${it.action};document.getElementById('more-actions-modal').remove()">
            <span class="qa-icon">${it.icon}</span>
            ${it.label}
          </button>`).join('')}
      </div>
    </div>`;
  document.body.appendChild(div);
}

// ── Rychlá kalkulace ──────────────────────────────────────
let _rkState = { praceSazba: 0, matSazba: 0, typLabel: '' };

function rychlaKalkulaceTyp(praceSazba, matSazba, label) {
  _rkState = { praceSazba, matSazba, typLabel: label };
  document.querySelectorAll('[id^="rk_typ_"]').forEach(b => {
    b.style.background  = 'var(--c-surface)';
    b.style.borderColor = 'var(--c-border)';
    b.style.color       = 'var(--c-ink2)';
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
  const cenaP = Math.round(plocha * praceSazba);
  const cenaM = Math.round(plocha * matSazba * (1 + marze / 100));
  const total = cenaP + cenaM;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('rk_prace',     cenaP.toLocaleString('cs') + ' Kč');
  set('rk_mat',       cenaM.toLocaleString('cs') + ' Kč');
  set('rk_total',     total.toLocaleString('cs') + ' Kč');
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

// ── Theme ─────────────────────────────────────────────────
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

(function initTheme() {
  const stored = localStorage.getItem('cn_theme');
  if (stored) document.documentElement.setAttribute('data-theme', stored);
})();
