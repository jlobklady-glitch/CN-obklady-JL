// ═══ pdf.js — JL-OBKLADY CN ═══
async function buildNabidkaHTML(n, firma) {
  const f = firma || await loadFirma();

  const selectedTexts = n.vybranéTexty || [];
  const textyHtml = selectedTexts.map(k => {
    const t = TEXTY_NABIDKY?.[k];
    if (!t) return '';
    return `<div class="extra-section">
      <h3>${t.label.replace(/[🏆⚖️📅🔧]/g,'').trim()}</h3>
      <p>${t.text.replace(/\n/g,'<br>')}</p>
    </div>`;
  }).join('');

  const dnes = new Date().toLocaleDateString('cs-CZ');
  const platnostDo = new Date(Date.now() + 30*24*3600*1000).toLocaleDateString('cs-CZ');
  const cisloNabidky = n.cisloNabidky || `N-${String(n.id||1).padStart(4,'0')}${n.revize>1?'-R'+n.revize:''}`;

  const matCelk   = parseInt(n.cenaMatCelk || 0);
  const praceCelk = parseInt(n.cenaPrace   || 0);
  const celkem    = parseInt(n.cenaCelkem  || 0);
  const dphSazba  = n.dphSazba || 0;
  // DPH se počítá z cenaZaklad (základ bez DPH), nikoliv z cenaMatCelk
  const cenaZaklad = parseInt(n.cenaZaklad || celkem);
  const dph21      = n.dphCastka || (dphSazba > 0 ? Math.round(cenaZaklad * dphSazba / 100) : 0);
  const bezDph     = celkem - dph21;   // = cenaZaklad (základ bez DPH)
  const zalohaProc = n.zalohaProc || 40;
  const zalohaCastka = Math.round(celkem * zalohaProc / 100);

  // DPH faktor pro výpočet cen v tabulce
  const dphFaktor = dphSazba > 0 ? (1 + dphSazba / 100) : 1;

  // Materiál: cenaMatCelk je základ bez DPH
  const matBezDph = matCelk;
  const matSDph   = dphSazba > 0 ? Math.round(matCelk * dphFaktor) : matCelk;

  // Práce: cenaPrace je základ bez DPH
  const praceBezDph = praceCelk;
  const praceSDph   = dphSazba > 0 ? Math.round(praceCelk * dphFaktor) : praceCelk;

  // Parsování řádků prací — robustní: lastIndexOf(': ') pro surface breakdown formát
  const praceRows = (n.praceVybrane || [])
    .filter(p => !p.includes('neuvedeno'))  // přeskočit informativní hodinové položky
    .map(p => {
      const lastColon = p.lastIndexOf(': ');
      if (lastColon === -1) return `<tr><td colspan="3">${p}</td></tr>`;
      const label    = p.substring(0, lastColon);
      const cenaBez  = parseInt(p.substring(lastColon + 2)) || 0;
      const cenaS    = dphSazba > 0 ? Math.round(cenaBez * dphFaktor) : cenaBez;
      // Formát popisku: skrátit surface breakdown pro PDF čitelnost
      const displayLabel = label.replace(/\[([^\]]{0,120})[^\]]*\]/g, (_, m) => `[${m}]`);
      return `<tr>
        <td style="font-size:8.5pt">${displayLabel}</td>
        <td style="text-align:right">${cenaBez.toLocaleString('cs')} Kč</td>
        <td style="text-align:right">${dphSazba > 0 ? cenaS.toLocaleString('cs')+' Kč' : '—'}</td>
      </tr>`;
    }).join('');

  return `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width">
  <title>Nabídka ${cisloNabidky} — ${n.nazev}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm 14mm 16mm 14mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-size: 10pt;
      color: #1a1a1a;
      line-height: 1.45;
      background: white;
    }

    /* ── ZÁHLAVÍ ── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 10px;
      margin-bottom: 14px;
      border-bottom: 3px solid #C8502A;
    }
    .company-name {
      font-size: 20pt;
      font-weight: 700;
      color: #C8502A;
      letter-spacing: -0.02em;
      line-height: 1.1;
    }
    .company-sub { font-size: 8.5pt; color: #888; margin-top: 2px; }
    .company-contact { font-size: 8pt; color: #555; margin-top: 6px; line-height: 1.6; }
    .doc-info { text-align: right; }
    .doc-title { font-size: 16pt; font-weight: 700; color: #1a1a1a; letter-spacing: 0.05em; }
    .doc-meta { font-size: 8.5pt; color: #666; margin-top: 4px; line-height: 1.7; }

    /* ── BLOK ZÁKAZNÍK ── */
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
    .box { border: 1px solid #ddd; border-radius: 4px; padding: 10px 12px; }
    .box-title { font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.08em; color: #888; margin-bottom: 6px; font-weight: 600; }
    .box-val { font-size: 10pt; font-weight: 600; }
    .box-sub { font-size: 8.5pt; color: #555; margin-top: 2px; }

    /* ── SEKCE ── */
    .section { margin-bottom: 14px; }
    .section-title {
      font-size: 8pt; text-transform: uppercase; letter-spacing: 0.08em;
      color: #888; font-weight: 600;
      margin-bottom: 6px; padding-bottom: 4px;
      border-bottom: 1px solid #eee;
    }

    /* ── TABULKY ── */
    table { width: 100%; border-collapse: collapse; }
    th {
      background: #f5f5f5;
      font-size: 8pt; text-transform: uppercase; letter-spacing: 0.05em;
      color: #666; font-weight: 600;
      padding: 5px 8px; text-align: left;
      border-bottom: 1.5px solid #ddd;
    }
    th:last-child, td:last-child { text-align: right; }
    td { padding: 5px 8px; border-bottom: 1px solid #f0f0f0; font-size: 9.5pt; }
    tr:last-child td { border-bottom: none; }
    .total-row td {
      font-weight: 700; font-size: 11pt;
      border-top: 2px solid #C8502A;
      color: #C8502A; padding-top: 8px;
    }
    .subtotal-row td { font-weight: 600; color: #333; background: #fafafa; }
    .dph-row td { font-size: 8.5pt; color: #888; }

    /* ── MATERIÁLOVÝ PŘEHLED ── */
    .mat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 8px 0; }
    .mat-item { background: #fafafa; border: 1px solid #eee; border-radius: 4px; padding: 7px 10px; }
    .mat-label { font-size: 7.5pt; color: #888; }
    .mat-value { font-size: 10.5pt; font-weight: 700; color: #1a1a1a; margin-top: 1px; }

    /* ── POZNÁMKA ── */
    .note-box {
      margin: 12px 0;
      padding: 10px 12px;
      background: #fff5f2;
      border-left: 3px solid #C8502A;
      border-radius: 0 4px 4px 0;
      font-size: 9pt;
    }

    /* ── PODPISY ── */
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-top: 28px;
      padding-top: 16px;
      border-top: 1px solid #eee;
    }
    .sig-line { border-bottom: 1.5px solid #333; height: 36px; margin-bottom: 6px; }
    .sig-label { font-size: 8pt; color: #666; }

    /* ── EXTRA TEXTY ── */
    .extra-section {
      margin-top: 16px; padding-top: 12px;
      border-top: 1px solid #ddd;
      page-break-inside: avoid;
    }
    .extra-section h3 {
      font-size: 8pt; text-transform: uppercase; letter-spacing: 0.07em;
      color: #888; margin-bottom: 8px; font-weight: 600;
    }
    .extra-section p { font-size: 9pt; color: #444; line-height: 1.7; }

    /* ── PATIČKA ── */
    .footer {
      margin-top: 20px; padding-top: 10px;
      border-top: 1px solid #eee;
      font-size: 7.5pt; color: #bbb;
      text-align: center; line-height: 1.6;
    }

    /* ── ACCENT BAR ── */
    .accent-bar {
      background: #C8502A; color: white;
      padding: 8px 12px;
      border-radius: 4px;
      margin-bottom: 14px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .accent-bar-title { font-size: 12pt; font-weight: 700; }
    .accent-bar-sub   { font-size: 8.5pt; opacity: 0.85; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
      .page-break { page-break-before: always; }
    }
    @media screen {
      body { max-width: 210mm; margin: 0 auto; padding: 16mm; background: white; box-shadow: 0 2px 20px rgba(0,0,0,0.12); }
    }
  </style>
</head>
<body>

  <!-- ── ZÁHLAVÍ ── -->
  <div class="header">
    <div>
      <div class="company-name">${f.nazev}</div>
      <div class="company-sub">${f.podtitul}</div>
      <div class="company-contact">
        ${f.adresa ? f.adresa+'<br>' : ''}
        ${f.telefon ? '📞 '+f.telefon+'&nbsp;&nbsp;' : ''}${f.email ? '✉ '+f.email : ''}
        ${f.ico ? '<br>IČO: '+f.ico : ''}${f.dic ? '&nbsp;&nbsp;DIČ: '+f.dic : ''}
      </div>
    </div>
    <div class="doc-info">
      <div class="doc-title">CENOVÁ NABÍDKA</div>
      <div class="doc-meta">
        Číslo: <strong>${cisloNabidky}</strong><br>
        Vystaveno: ${n.datum || dnes}<br>
        Platnost do: ${platnostDo}
      </div>
    </div>
  </div>

  <!-- ── NÁZEV NABÍDKY ── -->
  <div class="accent-bar">
    <div>
      <div class="accent-bar-title">${n.nazev}</div>
      <div class="accent-bar-sub">Zákazník: ${n.zakaznik || '—'}</div>
    </div>
    <div style="text-align:right;font-size:18pt;font-weight:800;opacity:0.95">
      ${celkem.toLocaleString('cs')} Kč
    </div>
  </div>

  <!-- ── INFO BLOKY ── -->
  <div class="two-col">
    <div class="box">
      <div class="box-title">Zákazník / odběratel</div>
      <div class="box-val">${n.zakaznik || '—'}</div>
      ${n.zakaznikAdresa ? `<div class="box-sub">${n.zakaznikAdresa}</div>` : ''}
      ${n.zakaznikTel ? `<div class="box-sub">📞 ${n.zakaznikTel}</div>` : ''}
    </div>
    <div class="box">
      <div class="box-title">Místo realizace</div>
      <div class="box-val">${n.mistoRealizace || n.zakaznik || '—'}</div>
      <div class="box-sub">Předpokládaný termín: ${n.termin || '—'}</div>
    </div>
  </div>

  <!-- ── MATERIÁLOVÝ PŘEHLED ── -->
  <div class="section">
    <div class="section-title">Přehled materiálu</div>
    <div class="mat-grid">
      <div class="mat-item">
        <div class="mat-label">Plocha celkem</div>
        <div class="mat-value">${n.plocha} m²</div>
      </div>
      <div class="mat-item">
        <div class="mat-label">Materiál / dlaždice</div>
        <div class="mat-value">${n.material || '—'}</div>
      </div>
      <div class="mat-item">
        <div class="mat-label">Počet kusů</div>
        <div class="mat-value">${n.ks ? n.ks+' ks' : '—'}</div>
      </div>
      <div class="mat-item">
        <div class="mat-label">Lepidlo</div>
        <div class="mat-value">${n.lepidlo ? n.lepidlo+' kg' : '—'}</div>
      </div>
      <div class="mat-item">
        <div class="mat-label">Spárovačka</div>
        <div class="mat-value">${n.sparovka ? n.sparovka+' kg' : '—'}</div>
      </div>
      <div class="mat-item">
        <div class="mat-label">Marže / přirážka</div>
        <div class="mat-value">${n.marze || 28} %</div>
      </div>
    </div>
  </div>

  <!-- ── KALKULACE ── -->
  <div class="section">
    <div class="section-title">Kalkulace ceny</div>
    <table>
      <thead>
        <tr>
          <th>Položka</th>
          <th style="text-align:right">Základ bez DPH</th>
          <th style="text-align:right">${dphSazba > 0 ? 'Cena s DPH '+dphSazba+' %' : 'Cena (neplátce DPH)'}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Materiál — ${n.material || 'dlaždice, lepidlo, spárovačka'}</td>
          <td style="text-align:right">${matBezDph.toLocaleString('cs')} Kč</td>
          <td style="text-align:right">${dphSazba > 0 ? matSDph.toLocaleString('cs')+' Kč' : '—'}</td>
        </tr>
        ${praceRows ? `<tr><td colspan="3" style="padding-top:6px;font-weight:600;color:#555;font-size:8.5pt;background:#fafafa">Práce:</td></tr>${praceRows}` : ''}
        ${praceCelk ? `<tr class="subtotal-row">
          <td>Práce celkem</td>
          <td style="text-align:right">${praceBezDph.toLocaleString('cs')} Kč</td>
          <td style="text-align:right">${dphSazba > 0 ? praceSDph.toLocaleString('cs')+' Kč' : '—'}</td>
        </tr>` : ''}
      </tbody>
      <tfoot>
        ${dphSazba > 0 ? `
        <tr class="dph-row">
          <td>Základ DPH (${dphSazba} %)</td>
          <td colspan="2" style="text-align:right">${bezDph.toLocaleString('cs')} Kč</td>
        </tr>
        <tr class="dph-row">
          <td>DPH ${dphSazba} %</td>
          <td colspan="2" style="text-align:right">${dph21.toLocaleString('cs')} Kč</td>
        </tr>` : `
        <tr class="dph-row">
          <td colspan="3" style="text-align:center;color:#aaa">Neplátce DPH — ceny jsou konečné</td>
        </tr>`}
        <tr class="total-row">
          <td>CELKEM K ÚHRADĚ</td>
          <td colspan="2">${celkem.toLocaleString('cs')} Kč</td>
        </tr>
        ${zalohaProc > 0 ? `
        <tr class="dph-row">
          <td>Záloha ${zalohaProc}% (před zahájením)</td>
          <td colspan="2" style="text-align:right;font-weight:600;color:#C8502A">${zalohaCastka.toLocaleString('cs')} Kč</td>
        </tr>
        <tr class="dph-row">
          <td>Doplatek po dokončení</td>
          <td colspan="2" style="text-align:right">${(celkem-zalohaCastka).toLocaleString('cs')} Kč</td>
        </tr>` : ''}
      </tfoot>
    </table>
  </div>

  ${f.ucet ? `
  <div class="box" style="margin-bottom:14px">
    <div class="box-title">Platební údaje</div>
    <div class="box-sub">Bankovní účet: <strong>${f.ucet}</strong></div>
    <div class="box-sub" style="margin-top:3px">Variabilní symbol: ${cisloNabidky}</div>
  </div>` : ''}

  ${n.pozn ? `<div class="note-box"><strong>Poznámka:</strong><br>${n.pozn.replace(/\n/g,'<br>')}</div>` : ''}

  ${textyHtml}

  <!-- ── PODPISY ── -->
  <div class="signatures">
    <div>
      ${n.podpis ? `
        <img src="${n.podpis}" style="max-width:100%;height:60px;object-fit:contain;display:block;margin-bottom:4px">
        <div class="sig-label" style="color:#059669;font-weight:600">✅ ${n.schvalenoKym || 'Zákazník'} · ${n.schvalenoDatum || ''}</div>
      ` : `
        <div class="sig-line"></div>
        <div class="sig-label">Datum a podpis zákazníka (souhlas s nabídkou)</div>
      `}
    </div>
    <div>
      <div class="sig-line"></div>
      <div class="sig-label">Za zhotovitele — ${f.nazev}</div>
    </div>
  </div>

  <!-- ── PATIČKA ── -->
  <div class="footer">
    ${f.nazev}${f.ico ? ' · IČO: '+f.ico : ''}${f.dic ? ' · DIČ: '+f.dic : ''}
    ${f.adresa ? ' · '+f.adresa : ''}${f.telefon ? ' · '+f.telefon : ''}<br>
    ${f.poznamka || 'Tato nabídka je informativní povahy a platí 30 dní od data vystavení.'}
    <br>Vygenerováno: ${dnes}
  </div>


</body>
</html>`;
}

// ── Export PDF (offline — print dialog) ─────────────────────
async function exportPDF(id) {
  const [n, firma] = await Promise.all([
    dbGet('nabidky', id),
    loadFirma()
  ]);
  if (!n) { toast('Nabídka nenalezena','err'); return; }

  const html = await buildNabidkaHTML(n, firma);
  const win = window.open('', '_blank');
  if (!win) { toast('Povol pop-up okna v prohlížeči','err'); return; }
  win.document.write(html);
  win.document.close();

  // Auto-spustit tisk po načtení
  win.onload = () => {
    setTimeout(() => {
      win.focus();
      win.print();
    }, 300);
  };
  if (win.document.readyState === 'complete') {
    setTimeout(() => { win.focus(); win.print(); }, 400);
  }
  toast('💡 V dialogu tisku zvol "Uložit jako PDF"');
  await logKomunikace(id, 'pdf', 'PDF nabídky exportován / odeslán na tisk');
}

// Zachování zpětné kompatibility printNabidka
async function printNabidka(id) { exportPDF(id); }

// ╔══════════════════════════════════════════════════════════╗
//  SDÍLENÍ NABÍDKY — Web Share, WhatsApp, E-mail
// ╔══════════════════════════════════════════════════════════╝

// Výchozí šablony zpráv
const DEFAULT_SABLONY = {
  prvni: {
    label: '👋 První kontakt',
    text: 'Dobrý den, {jmeno},\n\nrád bych Vám nabídl své služby v oblasti pokládky obkladů a dlažby.\n\nPracuji profesionálně, používám kvalitní materiály a vždy dodržuji dohodnuté termíny.\n\nMůžeme se domluvit na nezávazné prohlídce?\n\nS pozdravem\n{firma}'
  },
  odeslani: {
    label: '📋 Nabídka odeslána',
    text: 'Dobrý den, {jmeno},\n\nzasílám Vám cenovou nabídku č. {cislo} na zakázku „{nazev}".\n\n💰 Celková cena: {castka} Kč\n📐 Plocha: {plocha} m²\n\nNabídka je platná 30 dní. V případě dotazů mě neváhejte kontaktovat.\n\nS pozdravem\n{firma}'
  },
  followup: {
    label: '🔔 Follow-up',
    text: 'Dobrý den, {jmeno},\n\nchci se připomenout ohledně nabídky č. {cislo} na zakázku „{nazev}" (celkem {castka} Kč), kterou jsem Vám zasílal.\n\nMáte k nabídce nějaké otázky nebo si přejete upravit rozsah prací?\n\nS pozdravem\n{firma}'
  },
  dokonceni: {
    label: '🏁 Dokončení zakázky',
    text: 'Dobrý den, {jmeno},\n\nrád oznamuji, že zakázka „{nazev}" je hotová.\n\nProsím o kontrolu provedených prací a v případě spokojenosti o potvrzení převzetí.\n\nDěkuji za spolupráci a těším se na případnou příští zakázku!\n\nS pozdravem\n{firma}'
  },
};

async function nacistSablony() {
  const custom = {};
  for (const k of Object.keys(DEFAULT_SABLONY)) {
    try {
      const row = await dbGet('nastaveni', 'sablona_'+k);
      custom[k] = row ? { ...DEFAULT_SABLONY[k], text: row.hodnota } : DEFAULT_SABLONY[k];
    } catch(e) { custom[k] = DEFAULT_SABLONY[k]; }
  }
  return custom;
}

function vyplnitSablonu(text, n, firma) {
  return text
    .replace(/\{jmeno\}/g,   n.zakaznik || 'zákazníku')
    .replace(/\{nazev\}/g,    n.nazev || '')
    .replace(/\{cislo\}/g,    'N-' + String(n.id||1).padStart(4,'0'))
    .replace(/\{castka\}/g,   parseInt(n.cenaCelkem||0).toLocaleString('cs'))
    .replace(/\{plocha\}/g,   n.plocha || '')
    .replace(/\{firma\}/g,    firma.nazev || '')
    .replace(/\{telefon\}/g,  firma.telefon || '')
    .replace(/\{email\}/g,    firma.email || '');
}

// ── Hlavní funkce sdílení ────────────────────────────────────
async function sdiletNabidku(id, kanal) {
  const [n, firma, sablony] = await Promise.all([
    dbGet('nabidky', id),
    loadFirma(),
    nacistSablony(),
  ]);
  if (!n) return;

  const panel   = document.getElementById('share-msg-panel');
  const textEl  = document.getElementById('share-msg-text');
  const titleEl = document.getElementById('share-msg-title');
  const btnEl   = document.getElementById('share-msg-btn');
  if (!panel || !textEl) return;

  const sablona = sablony.odeslani;
  const zprava  = vyplnitSablonu(sablona.text, n, firma);

  if (kanal === 'share') {
    // Web Share API
    if (navigator.share) {
      try {
        const html = await buildNabidkaHTML(n, firma);
        const blob = new Blob([html], { type: 'text/html' });
        const file = new File([blob], `nabidka-${n.id}.html`, { type: 'text/html' });
        const shareData = {
          title: `Nabídka: ${n.nazev}`,
          text:  `Cenová nabídka č. N-${String(n.id||1).padStart(4,'0')} — ${parseInt(n.cenaCelkem||0).toLocaleString('cs')} Kč`,
          files: navigator.canShare && navigator.canShare({ files: [file] }) ? [file] : undefined,
        };
        if (!shareData.files) delete shareData.files;
        await navigator.share(shareData);
        await logKomunikace(id, 'sdilet', 'Nabídka sdílena přes systém sdílení');
        toast('Nabídka sdílena ✓');
        return;
      } catch(e) {
        if (e.name !== 'AbortError') {
          try {
            await navigator.share({ title: `Nabídka: ${n.nazev}`, text: zprava });
            await logKomunikace(id, 'sdilet', 'Nabídka sdílena jako text');
            return;
          } catch(e2) {}
        } else { return; }
      }
    }
    // Fallback — ukáže panel se zprávou
    titleEl.textContent = '📤 Sdílet — zkopíruj a pošli';
    textEl.value = zprava;
    btnEl.textContent = '📋 Kopírovat';
    btnEl.onclick = kopirovatZpravu;
    panel.style.display = 'block';
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return;
  }

  if (kanal === 'whatsapp') {
    titleEl.textContent = '💬 WhatsApp zpráva';
    textEl.value = zprava;
    btnEl.textContent = '💬 Otevřít WhatsApp';
    btnEl.onclick = () => {
      const tel = n.zakaznikTel ? n.zakaznikTel.replace(/\D/g,'') : '';
      const url = tel
        ? `https://wa.me/${tel}?text=${encodeURIComponent(textEl.value)}`
        : `https://wa.me/?text=${encodeURIComponent(textEl.value)}`;
      window.open(url, '_blank');
    };
    panel.style.display = 'block';
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return;
  }

  if (kanal === 'email') {
    titleEl.textContent = '✉️ E-mailová zpráva';
    textEl.value = zprava;
    btnEl.textContent = '✉️ Otevřít e-mail';
    btnEl.onclick = () => {
      const predmet = encodeURIComponent(`Cenová nabídka N-${String(n.id||1).padStart(4,'0')} — ${n.nazev}`);
      const telo    = encodeURIComponent(textEl.value);
      const email   = n.zakaznikEmail || '';
      window.location.href = `mailto:${email}?subject=${predmet}&body=${telo}`;
    };
    panel.style.display = 'block';
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return;
  }
}

// ── Šablona na požádání ──────────────────────────────────────
async function aplikovatSablonu(nabidkaId, typ) {
  const [n, firma, sablony] = await Promise.all([
    dbGet('nabidky', nabidkaId),
    loadFirma(),
    nacistSablony(),
  ]);
  if (!n) return;
  const sablona = sablony[typ];
  if (!sablona) return;
  const panel   = document.getElementById('share-msg-panel');
  const textEl  = document.getElementById('share-msg-text');
  const titleEl = document.getElementById('share-msg-title');
  const btnEl   = document.getElementById('share-msg-btn');
  if (!panel || !textEl) return;
  titleEl.textContent = sablona.label;
  textEl.value = vyplnitSablonu(sablona.text, n, firma);
  btnEl.textContent = '📋 Kopírovat';
  btnEl.onclick = kopirovatZpravu;
  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function kopirovatZpravu() {
  const textEl = document.getElementById('share-msg-text');
  if (!textEl) return;
  navigator.clipboard.writeText(textEl.value)
    .then(() => toast('Zkopírováno do schránky ✓'))
    .catch(() => {
      textEl.select();
      document.execCommand('copy');
      toast('Zkopírováno ✓');
    });
}

// ── Zákaznický HTML náhled ───────────────────────────────────
async function nahlédNabidku(id) {
  const [n, firma] = await Promise.all([dbGet('nabidky', id), loadFirma()]);
  if (!n) return;
  const html = buildZakaznickyNahled(n, firma);

  // Otevři v novém okně přes document.write — funguje na iOS Safari i Chrome
  // (blob URL na iOS Safari se okamžitě invaliduje)
  const win = window.open('', '_blank');
  if (!win) { toast('Povol pop-up okna v prohlížeči', 'err'); return; }
  win.document.open();
  win.document.write(html);
  win.document.close();

  await logKomunikace(id, 'nahled', 'Zákaznický náhled otevřen');
  window.addEventListener('focus', () => _zkontrolujSchvaleni(id), { once: true });
}

// ── Sledování schválení přes localStorage ───────────────────
async function _zkontrolujSchvaleni(id) {
  const key  = 'cn_schvaleno_' + id;
  const data = localStorage.getItem(key);
  if (!data) return;
  try {
    const { jmeno, datum, akce, podpis } = JSON.parse(data);
    localStorage.removeItem(key);
    const n = await dbGet('nabidky', id);
    if (!n) return;
    if (akce === 'schvaleno') {
      n.stav          = 'schvaleno';
      n.schvalenoKym  = jmeno;
      n.schvalenoDatum = datum;
      if (podpis) n.podpis = podpis;
      if (!n.komunikace) n.komunikace = [];
      n.komunikace.unshift({ id:'k'+Date.now(), typ:'schvaleno', text:`Zákazník přijal nabídku — ${jmeno}`, datum, cas: datum.split(' ')[1]||'', iso: new Date().toISOString() });
      await dbPut('nabidky', n);
      toast(`✅ ${jmeno} schválil/a nabídku!`);
    } else if (akce === 'odmitnuto') {
      n.stavPozn = `Odmítnuto zákazníkem ${jmeno} dne ${datum}`;
      if (!n.komunikace) n.komunikace = [];
      n.komunikace.unshift({ id:'k'+Date.now(), typ:'odmitnuto', text:`Zákazník odmítl nabídku — ${jmeno}`, datum, cas: '', iso: new Date().toISOString() });
      await dbPut('nabidky', n);
      toast(`ℹ️ ${jmeno} odmítl/a nabídku`);
    }
    render();
  } catch(e) { console.error(e); }
}

// ╔══════════════════════════════════════════════════════════╗
//  ZÁKAZNICKÝ NÁHLED — mobilní stránka pro zákazníka
// ╔══════════════════════════════════════════════════════════╝
function buildZakaznickyNahled(n, firma) {
  const cislo    = 'N-' + String(n.id||1).padStart(4,'0');
  const celkem   = parseInt(n.cenaCelkem || 0);
  const matCelk  = parseInt(n.cenaMatCelk || 0);
  const praceCelk= parseInt(n.cenaPrace || 0);
  const storagKey= 'cn_schvaleno_' + n.id;

  const praceList = (n.praceVybrane || []).map(p => {
    const [name, price] = p.split(':');
    return `<div class="item-row"><span>${name}</span><strong>${price ? parseInt(price).toLocaleString('cs')+' Kč' : '—'}</strong></div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <title>${n.nazev} — Nabídka ${cislo}</title>
  <style>
    :root { --accent:#C8502A; --green:#059669; --red:#dc2626; --bg:#f8f6f3; }
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:var(--bg); color:#1a1a1a; min-height:100vh; padding-bottom:4rem; }

    .hero { background:linear-gradient(135deg,#C8502A,#a03d20); color:white; padding:1.8rem 1.2rem 2.2rem; }
    .hero-firma { font-size:0.8rem; opacity:0.8; margin-bottom:0.3rem; }
    .hero-nazev { font-size:1.5rem; font-weight:800; line-height:1.2; margin-bottom:0.5rem; }
    .hero-meta  { font-size:0.82rem; opacity:0.8; }
    .hero-cena  { margin-top:1.2rem; background:rgba(255,255,255,0.15); border-radius:12px; padding:0.9rem 1.1rem; }
    .hero-cena-label { font-size:0.72rem; text-transform:uppercase; letter-spacing:0.08em; opacity:0.8; }
    .hero-cena-val   { font-size:2rem; font-weight:800; line-height:1.1; }

    .section { background:white; border-radius:16px; margin:0.9rem 0.9rem 0; padding:1.1rem; box-shadow:0 1px 3px rgba(0,0,0,0.06); }
    .section-title { font-size:0.7rem; text-transform:uppercase; letter-spacing:0.08em; color:#888; font-weight:700; margin-bottom:0.7rem; }
    .item-row { display:flex; justify-content:space-between; align-items:center; padding:0.45rem 0; border-bottom:1px solid #f0f0f0; font-size:0.9rem; }
    .item-row:last-child { border-bottom:none; }
    .mat-grid { display:grid; grid-template-columns:1fr 1fr; gap:0.6rem; }
    .mat-item { background:#fafaf8; border-radius:10px; padding:0.7rem 0.8rem; }
    .mat-label { font-size:0.7rem; color:#888; }
    .mat-value { font-size:1rem; font-weight:700; margin-top:2px; }
    .note-box { background:#fff5f2; border-left:3px solid var(--accent); border-radius:0 8px 8px 0; padding:0.8rem 1rem; font-size:0.88rem; line-height:1.5; }

    /* ── Schválení ── */
    .action-section { padding:1rem 0.9rem 0; }
    .btn-approve { width:100%; padding:1rem; border-radius:14px; border:none; font-size:1.05rem; font-weight:700; font-family:inherit; cursor:pointer; margin-bottom:0.6rem; transition:transform 0.1s; }
    .btn-approve:active { transform:scale(0.97); }
    .btn-green { background:#059669; color:white; box-shadow:0 3px 12px rgba(5,150,105,0.3); }
    .btn-red   { background:#f9fafb; color:#dc2626; border:2px solid #fecaca !important; border:none; }
    .btn-call  { background:#f9fafb; color:#1a1a1a; border:2px solid #e5e7eb !important; border:none; display:flex; align-items:center; justify-content:center; gap:0.5rem; }

    /* ── Schválení modal ── */
    .modal-bg { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:100; align-items:flex-end; }
    .modal-bg.show { display:flex; }
    .modal { background:white; border-radius:20px 20px 0 0; padding:1.5rem 1.2rem; width:100%; }
    .modal h2 { font-size:1.1rem; margin-bottom:0.3rem; }
    .modal p  { font-size:0.85rem; color:#666; margin-bottom:1rem; }
    .modal input { width:100%; padding:0.8rem 1rem; border:2px solid #e5e7eb; border-radius:10px; font-size:1rem; font-family:inherit; margin-bottom:0.8rem; }
    .modal input:focus { outline:none; border-color:var(--accent); }
    .modal-btn { width:100%; padding:0.9rem; border-radius:12px; border:none; font-size:1rem; font-weight:700; font-family:inherit; cursor:pointer; margin-bottom:0.5rem; }

    .status-bar { position:fixed; bottom:0; left:0; right:0; background:white; padding:0.7rem 1rem; border-top:1px solid #eee; display:flex; align-items:center; gap:0.6rem; font-size:0.78rem; color:#888; box-shadow:0 -2px 10px rgba(0,0,0,0.06); }
    .status-dot { width:8px; height:8px; border-radius:50%; background:#e5e7eb; flex-shrink:0; }
    .rozhodnuto { background:#f0fdf4; border-radius:14px; padding:1.2rem; text-align:center; margin-bottom:0.5rem; }
  </style>
</head>
<body>

  <!-- Hero záhlaví -->
  <div class="hero">
    <div class="hero-firma">${firma.nazev} · ${cislo}</div>
    <div class="hero-nazev">${n.nazev}</div>
    <div class="hero-meta">
      ${n.zakaznik ? '👤 '+n.zakaznik+'  ' : ''}📅 ${n.datum || new Date().toLocaleDateString('cs-CZ')} · platnost 30 dní
    </div>
    <div class="hero-cena">
      <div class="hero-cena-label">Celková cena vč. DPH</div>
      <div class="hero-cena-val">${celkem.toLocaleString('cs')} Kč</div>
    </div>
  </div>

  <!-- Materiál -->
  <div class="section">
    <div class="section-title">📦 Materiál a rozsah</div>
    <div class="mat-grid">
      <div class="mat-item">
        <div class="mat-label">Celková plocha</div>
        <div class="mat-value">${n.plocha} m²</div>
      </div>
      <div class="mat-item">
        <div class="mat-label">Dlaždice / materiál</div>
        <div class="mat-value" style="font-size:0.85rem">${n.material || '—'}</div>
      </div>
      ${n.ks ? `<div class="mat-item"><div class="mat-label">Počet kusů</div><div class="mat-value">${n.ks} ks</div></div>` : ''}
      ${n.lepidlo ? `<div class="mat-item"><div class="mat-label">Lepidlo</div><div class="mat-value">${n.lepidlo} kg</div></div>` : ''}
    </div>
  </div>

  <!-- Cena rozpad -->
  <div class="section">
    <div class="section-title">💰 Přehled ceny</div>
    ${matCelk ? `<div class="item-row"><span>Materiál</span><strong>${matCelk.toLocaleString('cs')} Kč</strong></div>` : ''}
    ${praceList}
    ${praceCelk ? `<div class="item-row"><span>Práce celkem</span><strong>${praceCelk.toLocaleString('cs')} Kč</strong></div>` : ''}
    <div class="item-row" style="margin-top:0.3rem;padding-top:0.6rem;border-top:2px solid var(--accent)">
      <span style="font-weight:700;font-size:1.05rem">CELKEM</span>
      <strong style="font-size:1.1rem;color:var(--accent)">${celkem.toLocaleString('cs')} Kč</strong>
    </div>
  </div>

  ${n.pozn ? `<div class="section"><div class="section-title">📝 Poznámka</div><div class="note-box">${n.pozn.replace(/\n/g,'<br>')}</div></div>` : ''}

  <!-- Kontakt na firmu -->
  <div class="section">
    <div class="section-title">🏢 Zhotovitel</div>
    <div style="font-weight:700;font-size:0.95rem">${firma.nazev}</div>
    ${firma.podtitul ? `<div style="font-size:0.82rem;color:#666;margin-top:1px">${firma.podtitul}</div>` : ''}
    ${firma.adresa ? `<div style="font-size:0.82rem;color:#666;margin-top:4px">📍 ${firma.adresa}</div>` : ''}
    ${firma.ico ? `<div style="font-size:0.78rem;color:#aaa;margin-top:4px">IČO: ${firma.ico}${firma.dic ? ' · DIČ: '+firma.dic : ''}</div>` : ''}
  </div>

  <!-- Akce -->
  <div class="action-section">
    <div id="action-area">
      <button class="btn-approve btn-green" onclick="otevritSchvaleni('schvaleno')">
        ✅ Přijímám tuto nabídku
      </button>
      <button class="btn-approve btn-red" onclick="otevritSchvaleni('odmitnuto')">
        ❌ Mám jiné požadavky / odmítám
      </button>
      ${firma.telefon ? `
      <button class="btn-approve btn-call" onclick="window.location.href='tel:${firma.telefon}'">
        📞 Zavolat ${firma.nazev}
      </button>` : ''}
    </div>
  </div>

  <!-- Status bar -->
  <div class="status-bar">
    <div class="status-dot" id="status-dot"></div>
    <span id="status-text">Nabídka čeká na Vaše rozhodnutí</span>
  </div>

  <!-- Modal schválení + podpis -->
  <div class="modal-bg" id="modal">
    <div class="modal" style="padding-bottom:1.5rem">
      <h2 id="modal-title">Potvrďte prosím</h2>
      <p id="modal-desc" style="margin-bottom:0.8rem">Zadejte jméno a podepište se prstem.</p>

      <input type="text" id="modal-jmeno" placeholder="Jméno a příjmení" autocomplete="name">

      <!-- Podpisové plátno (jen při schvalování) -->
      <div id="sig-wrap" style="display:none;margin-bottom:0.8rem">
        <div style="font-size:0.75rem;color:#888;margin-bottom:0.4rem;font-weight:600">PODPIS:</div>
        <div style="position:relative;background:#fafaf8;border:2px solid #e5e7eb;border-radius:10px;overflow:hidden">
          <canvas id="sig-canvas" style="display:block;width:100%;touch-action:none"></canvas>
          <div style="position:absolute;bottom:10px;left:0;right:0;border-bottom:1px dashed #ccc;pointer-events:none"></div>
          <div style="position:absolute;bottom:4px;left:12px;font-size:0.65rem;color:#ccc;pointer-events:none">Podpis zákazníka</div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:0.4rem">
          <span style="font-size:0.72rem;color:#aaa">Podepište se prstem do pole výše</span>
          <button onclick="smazatPodpis()" style="font-size:0.72rem;padding:0.2rem 0.5rem;border-radius:6px;border:1px solid #e5e7eb;background:white;cursor:pointer;color:#666">Smazat</button>
        </div>
      </div>

      <button class="modal-btn" id="modal-confirm-btn" style="background:var(--green);color:white;margin-bottom:0.5rem">
        Potvrdit
      </button>
      <button class="modal-btn" style="background:#f3f4f6;color:#374151" onclick="zavritModal()">
        Zrušit
      </button>
    </div>
  </div>

${'<'}script>
  let _akce = null;
  let _sigDrawing = false;
  let _sigHasData = false;

  // ── Podpisové plátno ──────────────────────────────────────
  function initSigCanvas() {
    const canvas = document.getElementById('sig-canvas');
    if (!canvas || canvas._init) return;
    canvas._init = true;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width  = rect.width  * dpr;
    canvas.height = 140 * dpr;
    canvas.style.height = '140px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';

    function getPos(e) {
      const r = canvas.getBoundingClientRect();
      const src = e.touches ? e.touches[0] : e;
      return { x: (src.clientX - r.left), y: (src.clientY - r.top) };
    }

    canvas.addEventListener('pointerdown', e => {
      e.preventDefault();
      _sigDrawing = true; _sigHasData = true;
      const p = getPos(e);
      ctx.beginPath(); ctx.moveTo(p.x, p.y);
    }, { passive: false });

    canvas.addEventListener('pointermove', e => {
      if (!_sigDrawing) return;
      e.preventDefault();
      const p = getPos(e);
      ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(p.x, p.y);
    }, { passive: false });

    canvas.addEventListener('pointerup',     () => { _sigDrawing = false; });
    canvas.addEventListener('pointercancel', () => { _sigDrawing = false; });
  }

  function smazatPodpis() {
    const canvas = document.getElementById('sig-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    _sigHasData = false;
  }

  function getPodpisBase64() {
    const canvas = document.getElementById('sig-canvas');
    if (!canvas || !_sigHasData) return null;
    return canvas.toDataURL('image/png');
  }

  // ── Modal ────────────────────────────────────────────────
  function otevritSchvaleni(akce) {
    _akce = akce;
    const modal = document.getElementById('modal');
    const title = document.getElementById('modal-title');
    const desc  = document.getElementById('modal-desc');
    const btn   = document.getElementById('modal-confirm-btn');
    const sigWrap = document.getElementById('sig-wrap');

    if (akce === 'schvaleno') {
      title.textContent = '✅ Přijímám nabídku';
      desc.textContent  = 'Zadejte jméno a podepište se prstem pro souhlas s nabídkou č. ${cislo}.';
      btn.style.background = '#059669';
      btn.textContent = '✅ Potvrdit a podepsat';
      sigWrap.style.display = 'block';
      setTimeout(initSigCanvas, 50);
    } else {
      title.textContent = '❌ Odmítnout nabídku';
      desc.textContent  = 'Zadejte jméno — podnikatel dostane zprávu.';
      btn.style.background = '#dc2626';
      btn.textContent = '❌ Odmítnout';
      sigWrap.style.display = 'none';
    }
    modal.classList.add('show');
    document.getElementById('modal-jmeno').focus();
  }

  function zavritModal() {
    document.getElementById('modal').classList.remove('show');
    document.getElementById('modal-jmeno').value = '';
    smazatPodpis();
  }

  document.getElementById('modal-confirm-btn').addEventListener('click', () => {
    const jmeno = document.getElementById('modal-jmeno').value.trim();
    if (!jmeno) {
      document.getElementById('modal-jmeno').style.borderColor = '#dc2626';
      document.getElementById('modal-jmeno').focus();
      return;
    }
    if (_akce === 'schvaleno' && !_sigHasData) {
      const wrap = document.getElementById('sig-wrap');
      if (wrap) { wrap.style.border = '2px solid #dc2626'; wrap.style.borderRadius = '10px'; }
      setTimeout(() => { if(wrap) wrap.style.border = ''; }, 1500);
      return;
    }

    const datum = new Date().toLocaleDateString('cs-CZ');
    const cas   = new Date().toLocaleTimeString('cs-CZ', {hour:'2-digit', minute:'2-digit'});
    const podpis = _akce === 'schvaleno' ? getPodpisBase64() : null;

    try {
      localStorage.setItem('${storagKey}', JSON.stringify({
        jmeno, datum: datum + ' ' + cas, akce: _akce, podpis
      }));
    } catch(e) {}

    zavritModal();
    zobrazitVysledek(jmeno, datum, cas, podpis);

    const tel    = '${firma.telefon ? firma.telefon.replace(/\D/g,'') : ''}';
    const zprava = _akce === 'schvaleno'
      ? 'Potvrzuji souhlas s nabídkou č. ${cislo} – ${n.nazev} (${celkem.toLocaleString('cs')} Kč). Podepsáno: ' + jmeno + ' dne ' + datum
      : 'Odmítám nabídku č. ${cislo} – ${n.nazev}. Rád bych probral jiné řešení. ' + jmeno;

    setTimeout(() => {
      const url = tel
        ? 'https://wa.me/' + tel + '?text=' + encodeURIComponent(zprava)
        : 'https://wa.me/?text=' + encodeURIComponent(zprava);
      if (confirm('Chcete poslat potvrzení přes WhatsApp?')) window.open(url, '_blank');
    }, 400);
  });

  function zobrazitVysledek(jmeno, datum, cas, podpis) {
    const area = document.getElementById('action-area');
    const dot  = document.getElementById('status-dot');
    const txt  = document.getElementById('status-text');
    const sigImg = podpis ? '<img src="' + podpis + '" style="max-width:200px;margin-top:0.5rem;border:1px solid #d1fae5;border-radius:6px;background:white;padding:4px">' : '';
    if (_akce === 'schvaleno') {
      area.innerHTML =
        '<div class="rozhodnuto" style="background:#f0fdf4;border:2px solid #86efac">' +
        '<div style="font-size:2rem;margin-bottom:0.3rem">✅</div>' +
        '<div style="font-weight:700;font-size:1rem;color:#059669">Nabídka přijata!</div>' +
        '<div style="font-size:0.85rem;color:#16a34a;margin-top:0.3rem">' + jmeno + ' · ' + datum + ' ' + cas + '</div>' +
        sigImg +
        '</div>';
      dot.style.background = '#059669';
      txt.textContent = 'Schváleno a podepsáno: ' + jmeno;
    } else {
      area.innerHTML =
        '<div class="rozhodnuto" style="background:#fef2f2;border:2px solid #fecaca">' +
        '<div style="font-size:2rem;margin-bottom:0.3rem">❌</div>' +
        '<div style="font-weight:700;font-size:1rem;color:#dc2626">Nabídka odmítnuta</div>' +
        '<div style="font-size:0.85rem;color:#ef4444;margin-top:0.3rem">' + jmeno + ' · ' + datum + ' ' + cas + '</div>' +
        '</div>';
      dot.style.background = '#dc2626';
      txt.textContent = 'Odmítnuto: ' + jmeno;
    }
  }

  document.getElementById('modal-jmeno').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('modal-confirm-btn').click();
  });
<\/script>
</body>
</html>`;
}

// ╔══════════════════════════════════════════════════════════╗
//  PODPIS — In-app podpisový modal
// ╔══════════════════════════════════════════════════════════╝
function otevritPodpisModal(nabidkaId) {
  // Odstraň starý modal pokud existuje
  document.getElementById('podpis-modal-host')?.remove();

  const div = document.createElement('div');
  div.id = 'podpis-modal-host';
  div.innerHTML = `
    <div id="podpis-overlay" style="position:fixed;inset:0;z-index:1200;background:rgba(0,0,0,0.6);display:flex;align-items:flex-end" onclick="event.target===this&&zavritPodpisModal()">
      <div style="background:var(--surface);border-radius:20px 20px 0 0;padding:1.3rem;width:100%;max-height:90vh;overflow-y:auto">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.8rem">
          <div style="font-weight:700;font-size:1rem">✍️ Podpis zákazníka</div>
          <button onclick="zavritPodpisModal()" style="background:none;border:none;font-size:1.4rem;cursor:pointer">✕</button>
        </div>
        <p style="font-size:0.82rem;color:var(--text2);margin-bottom:0.8rem">
          Předejte telefon zákazníkovi — podepíše se prstem.
        </p>
        <div class="field"><label>Jméno zákazníka</label>
          <input id="ap-jmeno" placeholder="Jméno a příjmení" style="width:100%;padding:0.7rem;border:1.5px solid var(--border);border-radius:8px;font-family:inherit;font-size:0.95rem">
        </div>
        <div style="font-size:0.78rem;font-weight:600;color:var(--text2);margin-bottom:0.3rem">PODPIS:</div>
        <div style="position:relative;background:#fafaf8;border:2px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:0.7rem">
          <canvas id="ap-canvas" style="display:block;width:100%;touch-action:none"></canvas>
          <div style="position:absolute;bottom:10px;left:0;right:0;border-bottom:1px dashed #ccc;pointer-events:none"></div>
          <div style="position:absolute;bottom:4px;left:12px;font-size:0.65rem;color:#ccc;pointer-events:none">Podpis zákazníka</div>
        </div>
        <div style="display:flex;gap:0.4rem;margin-bottom:0.8rem">
          <button onclick="_apSmazat()" style="flex:1;padding:0.5rem;border-radius:8px;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-size:0.85rem">🗑️ Smazat</button>
          <button onclick="_apUlozit(${nabidkaId})" style="flex:2;padding:0.5rem;border-radius:8px;border:none;background:var(--accent);color:white;font-weight:700;cursor:pointer;font-size:0.85rem">💾 Uložit podpis</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(div);

  // Init canvas
  setTimeout(() => {
    const canvas = document.getElementById('ap-canvas');
    if (!canvas) return;
    const dpr  = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width  = rect.width  * dpr;
    canvas.height = 150 * dpr;
    canvas.style.height = '150px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    canvas._hasData = false;

    function getP(e) {
      const r = canvas.getBoundingClientRect();
      const s = e.touches ? e.touches[0] : e;
      return { x: (s.clientX - r.left), y: (s.clientY - r.top) };
    }
    canvas.addEventListener('pointerdown', e => {
      e.preventDefault(); canvas._drawing = true; canvas._hasData = true;
      const p = getP(e); ctx.beginPath(); ctx.moveTo(p.x, p.y);
    }, { passive: false });
    canvas.addEventListener('pointermove', e => {
      if (!canvas._drawing) return;
      e.preventDefault();
      const p = getP(e); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(p.x, p.y);
    }, { passive: false });
    canvas.addEventListener('pointerup', () => { canvas._drawing = false; });
    canvas.addEventListener('pointercancel', () => { canvas._drawing = false; });
  }, 60);
}

function zavritPodpisModal() {
  document.getElementById('podpis-modal-host')?.remove();
}

function _apSmazat() {
  const canvas = document.getElementById('ap-canvas');
  if (!canvas) return;
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  canvas._hasData = false;
}

async function _apUlozit(nabidkaId) {
  const jmeno  = document.getElementById('ap-jmeno')?.value?.trim();
  const canvas = document.getElementById('ap-canvas');
  if (!jmeno) { document.getElementById('ap-jmeno').style.borderColor='#dc2626'; return; }
  if (!canvas?._hasData) { toast('Nejprve se podepište', 'err'); return; }

  const podpis = canvas.toDataURL('image/png');
  const datum  = new Date().toLocaleDateString('cs-CZ') + ' ' +
                 new Date().toLocaleTimeString('cs-CZ', {hour:'2-digit', minute:'2-digit'});

  const n = await dbGet('nabidky', nabidkaId);
  if (!n) return;
  n.podpis         = podpis;
  n.schvalenoKym   = jmeno;
  n.schvalenoDatum = datum;
  n.stav           = 'schvaleno';
  await dbPut('nabidky', n);
  zavritPodpisModal();
  toast(`✅ Podpis uložen — ${jmeno}`);
  render();
}
// ╔══════════════════════════════════════════════════════════╝
