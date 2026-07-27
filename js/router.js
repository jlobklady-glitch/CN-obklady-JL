// ═══ router.js — JL-OBKLADY CN v4 ═══

const _SCROLL_PRESERVE_PAGES = new Set([
  'nabidky','zakaznici','prace','ceniky','sklad','kalendar','pracovnici','fotky'
]);

let _lastRenderedPage  = null;
let _renderInProgress  = false;

async function render() {
  if (_renderInProgress) return;
  _renderInProgress = true;

  const app = document.getElementById('app');

  const samePage    = (_lastRenderedPage === state.page);
  const savedScrollY = samePage && _SCROLL_PRESERVE_PAGES.has(state.page)
    ? window.scrollY : 0;

  let html = '';
  try {
    switch (state.page) {
      case 'dashboard':     html = await pageDashboard();       break;
      case 'ceniky':        html = await pageCeniky();          break;
      case 'nabidky':       html = await pageNabidky();         break;
      case 'novaNabidka':   html = await pageNovaNabidka();     break;
      case 'nabidkaDetail': html = await pageNabidkaDetail();   break;
      case 'prace':         html = await pagePrace();           break;
      case 'zakaznici':     html = await pageZakaznici();       break;
      case 'pudorys':       html = pagePudorys();               break;
      case 'vyplaty':       html = await pageVyplaty();         break;
      case 'fotky':         html = await pageFotky();           break;
      case 'kalendar':      html = await pageKalendar();        break;
      case 'pracovnici':    html = await pagePracovnici();      break;
      case 'firma':         html = await pageFirmaSettings();   break;
      case 'sablony':       html = await pageSablony();         break;
      case 'marketing':     html = pageMarketing();             break;
      case 'reznyPlan':     html = pageReznyPlan();             break;
      case 'sklad':         html = await pageSklad();           break;
      default:              html = await pageDashboard();
    }
  } catch (e) {
    console.error('Render error:', e);
    html = `
      <div class="card" style="border:2px solid var(--c-red)">
        <div class="card-title" style="color:var(--c-red)">⚠️ Chyba načítání</div>
        <p style="font-size:0.85rem;color:var(--c-ink2);margin-bottom:0.8rem">
          ${e.message}
        </p>
        <button class="btn btn-primary" onclick="navigate('dashboard')">← Zpět na přehled</button>
      </div>`;
  } finally {
    _renderInProgress = false;
  }

  _lastRenderedPage = state.page;
  app.innerHTML = html + renderNav();

  afterRender();

  if (savedScrollY > 0) {
    requestAnimationFrame(() => window.scrollTo({ top: savedScrollY, behavior: 'instant' }));
  }
}

// ── Post-render hook ──────────────────────────────────────
function afterRender() {
  // Téma — re-apply po každém renderu
  const storedTheme = localStorage.getItem('cn_theme');
  if (storedTheme) document.documentElement.setAttribute('data-theme', storedTheme);

  // Pudorys
  if (state.page === 'pudorys') {
    setTimeout(() => {
      const c = document.getElementById('roomCanvas');
      if (c) { c.width = c.clientWidth || 380; }
      initRoomCanvas();
      renderRoomCanvas();
      setTimeout(_cadPostRender, 20);
      injectProfiCADButtons();
      if (PS.mode === 'draw') {
        const dc = document.getElementById('drawCanvas');
        if (dc) { dc.width = dc.clientWidth || 380; }
        initDrawCanvas();
      }
    }, 60);
  }

  // Fotky — naplnit select zakázek
  if (state.page === 'fotky') {
    setTimeout(async () => {
      const sel = document.getElementById('foto_nabidka');
      if (!sel) return;
      const nabidky = await dbGetAll('nabidky');
      nabidky.forEach(n => {
        const opt = document.createElement('option');
        opt.value = n.id;
        opt.textContent = n.nazev;
        sel.appendChild(opt);
      });
    }, 50);
  }

  // Dashboard — reinit rychlá kalkulace state
  if (state.page === 'dashboard') {
    if (!window._rkState) window._rkState = { praceSazba: 0, matSazba: 0, typLabel: '' };
  }

  // Scroll to top pro nové stránky
  if (!_SCROLL_PRESERVE_PAGES.has(state.page)) {
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  }

  // FAB + terénní nástroje
  setTimeout(() => document.dispatchEvent(new Event('page-rendered')), 80);
}

// ── Bottom navigation ─────────────────────────────────────
function renderNav() {
  const pages = [
    { id: 'dashboard', icon: '🏠', label: 'Přehled' },
    { id: 'nabidky',   icon: '📋', label: 'Nabídky' },
    { id: 'ceniky',    icon: '📦', label: 'Ceník' },
    { id: 'kalendar',  icon: '📅', label: 'Plán' },
    { id: 'zakaznici', icon: '👤', label: 'Klienti' },
    { id: 'vyplaty',   icon: '💰', label: 'Výplaty' },
  ];

  return `<nav class="bottom-nav">${pages.map(p => `
    <button class="nav-item ${state.page === p.id ? 'active' : ''}"
      onclick="navigate('${p.id}')">
      <span class="icon">${p.icon}</span>${p.label}
    </button>`).join('')}</nav>`;
}
