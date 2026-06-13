// ═══ pudorys.js — JL-OBKLADY CN ═══
let _prusrezState = {
  active: false,
  axis: 'h',
  pos: 0.5,
};

let PS = {
  mode: 'room',        // room | draw | wall
  rooms: [],
  activeRoom: null,
  activeWall: null,
  drawing: {
    active: false,
    points: [],
    snapPoint: null,
  },
  pencil: {
    active: false,
    strokes: [],
    currentStroke: null,
    snapLine: null,
  },
  drag: { active: false, roomId: null, ptIdx: null, startX: 0, startY: 0 },
  viewOffset: { x: 40, y: 40 },
  scale: 2,
  gridSize: 10,
  snapDist: 12,
  showGrid: true,
  showDim: true,
  showTiles: false,
  history: [],
  redoStack: [],
  tool: 'pencil',
  drawColor: '#C8502A',
  drawSize: 3,
  symbol: null,
  drawHistory: [],
  drawRedoStack: [],
  drawSnapshot: null,
  drawStartX: 0, drawStartY: 0, drawDrawing: false,
  ruler: { active: false, p1: null, p2: null },
  selectedFurniture: null,
  furnitureDrag: { active: false, roomId: null, fId: null, startFx: 0, startFy: 0, startPx: 0, startPy: 0 },
  view3d: false,
  wallHeight: 250,
  cam3d: { rotX: 28, rotY: -35, zoom: 1 },
  // Cotování (kóty) — rozměrové čáry
  koty: [],
  kotaDrawing: { active: false, p1: null },
};

let _roomCounter = 1;
const WALL_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function makeRoomId() { return 'r' + Date.now() + (Math.random()*1000|0); }

// ── pagePudorys ──
function pagePudorys() {
  const colorPalette = ['#1C1917','#C8502A','#2D6A4F','#2563eb','#7c3aed','#dc2626','#f59e0b','#ffffff'];
  const toolBtns = [
    { t:'pencil', icon:'✏️', tip:'Tužka' },
    { t:'line',   icon:'╱', tip:'Přímka' },
    { t:'rect',   icon:'▭', tip:'Obdélník' },
    { t:'circle', icon:'○', tip:'Elipsa' },
    { t:'text',   icon:'T', tip:'Text' },
    { t:'eraser', icon:'⬜', tip:'Guma' },
    { t:'symbol', icon:'🚿', tip:'Symboly' },
  ];

  return `
    <div class="header-bar">
      <span class="logo">✏️</span>
      <div>
        <h1>Půdorys</h1>
        <div class="subtitle">${state.fromNabidka ? '← Nová nabídka · Nákres' : 'Vektorový editor místností'}</div>
      </div>
      ${state.fromNabidka ? `
        <button onclick="ulozitPudorysDoNabidky()" style="margin-left:auto;background:var(--green);color:white;border:none;border-radius:10px;padding:0.5rem 0.8rem;font-family:inherit;font-size:0.8rem;font-weight:700;cursor:pointer;white-space:nowrap">
          ✅ Uložit & zpět
        </button>` : ''}
    </div>

    <!-- TABs -->
    <div style="display:flex;gap:0;margin-bottom:0.8rem;background:var(--surface2);border-radius:12px;padding:3px">
      <button onclick="setPudorysTab('room')" id="ptab_room"
        style="flex:1;padding:0.55rem;border:none;border-radius:9px;cursor:pointer;font-weight:600;font-size:0.85rem;font-family:inherit;
        background:${PS.mode==='room'||PS.mode==='wall'?'white':'transparent'};
        color:${PS.mode==='room'||PS.mode==='wall'?'var(--accent)':'var(--text2)'};
        box-shadow:${PS.mode==='room'||PS.mode==='wall'?'0 1px 4px rgba(0,0,0,0.1)':'none'}">
        🏠 Místnosti
      </button>
      <button onclick="setPudorysTab('draw')" id="ptab_draw"
        style="flex:1;padding:0.55rem;border:none;border-radius:9px;cursor:pointer;font-weight:600;font-size:0.85rem;font-family:inherit;
        background:${PS.mode==='draw'?'white':'transparent'};
        color:${PS.mode==='draw'?'var(--accent)':'var(--text2)'};
        box-shadow:${PS.mode==='draw'?'0 1px 4px rgba(0,0,0,0.1)':'none'}">
        🖊️ Kreslení
      </button>
    </div>

    <!-- PANEL: Místnosti -->
    <div id="panel_room" style="display:${PS.mode==='room'||PS.mode==='wall'?'block':'none'}">
      <div class="card" style="padding:0.7rem">
        <!-- Toolbar místnosti -->
        <div style="display:flex;gap:0.35rem;flex-wrap:wrap;margin-bottom:0.5rem;align-items:center">
          <button onclick="addRoomRect()" style="padding:0.45rem 0.7rem;border-radius:8px;border:1.5px solid var(--accent);background:#fff5f2;color:var(--accent);cursor:pointer;font-size:0.8rem;font-weight:600">➕ Nová místnost</button>
          <button onclick="startDrawRoom()" id="btnDrawRoom" style="padding:0.45rem 0.7rem;border-radius:8px;border:1.5px solid var(--border);background:var(--surface);cursor:pointer;font-size:0.8rem;font-weight:600;color:var(--text2)">✏️ Kreslit polygon</button>
          <button onclick="toggleRuler()" id="btnRuler" style="padding:0.45rem 0.7rem;border-radius:8px;border:1.5px solid var(--border);background:var(--surface);cursor:pointer;font-size:0.8rem;font-weight:600;color:var(--text2)" title="Pravítko — měření vzdálenosti">📏 Pravítko</button>
          <div style="flex:1"></div>
          <!-- 2D / 3D přepínač -->
          <div style="display:flex;background:var(--surface2);border-radius:8px;padding:2px;gap:2px">
            <button onclick="setView2D()" id="btn2d"
              style="padding:0.3rem 0.55rem;border-radius:6px;border:none;cursor:pointer;font-size:0.78rem;font-weight:700;font-family:inherit;
              background:${!PS.view3d?'white':'transparent'};color:${!PS.view3d?'var(--accent)':'var(--text2)'};
              box-shadow:${!PS.view3d?'0 1px 4px rgba(0,0,0,0.1)':'none'}">2D</button>
            <button onclick="setView3D()" id="btn3d"
              style="padding:0.3rem 0.55rem;border-radius:6px;border:none;cursor:pointer;font-size:0.78rem;font-weight:700;font-family:inherit;
              background:${PS.view3d?'white':'transparent'};color:${PS.view3d?'var(--accent)':'var(--text2)'};
              box-shadow:${PS.view3d?'0 1px 4px rgba(0,0,0,0.1)':'none'}">3D</button>
            <button onclick="togglePrusrez()" id="btn-prusrez-main"
              style="padding:0.3rem 0.55rem;border-radius:6px;border:none;cursor:pointer;font-size:0.78rem;font-weight:700;font-family:inherit;
              background:${_prusrezState?.active?'#ef4444':'transparent'};color:${_prusrezState?.active?'white':'var(--text2)'}">✂️</button>
          </div>
          <button onclick="toggleGrid()" style="padding:0.45rem 0.5rem;border-radius:8px;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-size:0.8rem" title="Mřížka">${PS.showGrid?'⊞':'⊡'}</button>
          <button onclick="toggleDim()" style="padding:0.45rem 0.5rem;border-radius:8px;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-size:0.8rem" title="Kóty">📐</button>
          <button onclick="toggleTiles()" style="padding:0.45rem 0.5rem;border-radius:8px;border:1px solid var(--border);background:${PS.showTiles?'#fff5f2':'var(--surface)'};cursor:pointer;font-size:0.8rem" title="Náhled obkladu">🔲</button>
          <button onclick="psUndo()" style="padding:0.45rem 0.5rem;border-radius:8px;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-size:0.85rem">↩️</button>
          <button onclick="psRedo()" style="padding:0.45rem 0.5rem;border-radius:8px;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-size:0.85rem">↪️</button>
          <button onclick="savePudorysImg()" style="padding:0.45rem 0.5rem;border-radius:8px;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-size:0.85rem">💾</button>
        </div>

        <!-- ── Profi CAD toolbar (Kóta + extra nástroje) ── -->
        <div id="cad-toolbar-extra" style="display:flex;gap:0.4rem;flex-wrap:wrap;margin-bottom:0.5rem;padding:0.35rem 0.4rem;background:var(--surface2);border-radius:8px;align-items:center">
          <span style="font-size:0.7rem;color:var(--text2);font-weight:600;margin-right:0.2rem">CAD:</span>
          <!-- Buttons injected by injectProfiCADButtons() -->
        </div>

        <!-- Měřítko -->
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;font-size:0.78rem;color:var(--text2)">
          <span>Měřítko:</span>
          <button onclick="changeScale(-0.5)" style="width:24px;height:24px;border-radius:6px;border:1px solid var(--border);background:var(--surface);cursor:pointer">−</button>
          <span id="scaleLabel" style="font-weight:600;color:var(--text);min-width:40px;text-align:center">${PS.scale} px/cm</span>
          <button onclick="changeScale(0.5)" style="width:24px;height:24px;border-radius:6px;border:1px solid var(--border);background:var(--surface);cursor:pointer">+</button>
          <span style="margin-left:0.5rem">1 cm = ${PS.scale}px · grid ${PS.gridSize}cm</span>
        </div>

        <!-- Výška stěny (pro 3D) -->
        <div id="wallHeightRow" style="display:${PS.view3d?'flex':'none'};align-items:center;gap:0.5rem;margin-bottom:0.5rem;background:#fff5f2;border-radius:8px;padding:0.5rem 0.7rem;font-size:0.82rem">
          <span style="font-weight:600;color:var(--accent)">📏 Výška stěny:</span>
          <input type="number" id="wallHeightInput" value="${PS.wallHeight}" min="100" max="400" step="5"
            style="width:72px;padding:0.3rem 0.5rem;border:1.5px solid var(--accent);border-radius:6px;font-family:inherit;font-size:0.9rem;font-weight:600;text-align:center"
            onchange="PS.wallHeight=parseInt(this.value)||250;renderRoomCanvas()">
          <span style="color:var(--text2)">cm</span>
          <span style="margin-left:auto;font-size:0.75rem;color:var(--text2)">💡 Podrž prst na stěně = přidat otvor</span>
        </div>

        <!-- Hlavní canvas (sdílený pro 2D i 3D) -->
        <canvas id="roomCanvas" height="480"
          style="border:1.5px solid var(--border);border-radius:10px 10px 0 0;width:100%;background:#fafaf9;display:block;touch-action:none;cursor:${PS.view3d?'grab':PS.tool==='pan'?'grab':'crosshair'}"></canvas>

        <!-- Průřez slider (zobrazí se po aktivaci průřezu) -->
        <div id="prusrez-ctrl" style="display:none;align-items:center;gap:0.5rem;padding:0.5rem 0.8rem;
          background:#fef2f2;border:1.5px solid #fecaca;border-radius:0 0 10px 10px;font-size:0.82rem">
          <span style="color:#ef4444;font-weight:700;font-size:0.85rem">✂️ Průřez</span>
          <button onclick="_prusrezState.axis='h';renderRoomCanvas();setTimeout(_cadPostRender,20)"
            style="padding:0.2rem 0.5rem;border-radius:6px;border:1px solid var(--border);cursor:pointer;font-size:0.75rem;background:var(--surface)">— Vodorovný</button>
          <button onclick="_prusrezState.axis='v';renderRoomCanvas();setTimeout(_cadPostRender,20)"
            style="padding:0.2rem 0.5rem;border-radius:6px;border:1px solid var(--border);cursor:pointer;font-size:0.75rem;background:var(--surface)">| Svislý</button>
          <input type="range" min="0" max="100" value="50" style="flex:1"
            oninput="_prusrezState.pos=this.value/100;renderRoomCanvas();setTimeout(_cadPostRender,20)">
          <button onclick="togglePrusrez()" style="color:#ef4444;background:none;border:none;cursor:pointer;font-size:1rem;line-height:1">✕</button>
        </div>

        <div id="roomInfo" style="margin-top:0.4rem;font-size:0.75rem;color:var(--text2);min-height:1.2em;text-align:center">
          ${PS.view3d
            ? '💡 <strong>Taž</strong> pro otočení · <strong>Pinch</strong> pro zoom · <strong>Podrž prst na stěně</strong> = přidat MEP'
            : PS.tool==='kota'
              ? '↔ <strong>Kótování:</strong> Klikni na první bod → pak na druhý bod. Vzdálenost se zobrazí jako kóta.'
              : '💡 <strong>1× klik</strong> = vybrat · <strong>2× klik</strong> = upravit · <strong>Podrž prst</strong> = přesunout'}
        </div>

        <!-- Kreslení polygonu - hint -->
        <div id="polyHint" style="display:none;background:#fff7ed;border-radius:8px;padding:0.5rem 0.7rem;margin-top:0.5rem;font-size:0.8rem;color:#92400e">
          <strong>Kreslení polygonu:</strong> Klikej na rohy místnosti. Zavři tvar kliknutím blízko prvního bodu nebo tlačítkem.
          <button onclick="closePolygon()" style="margin-left:0.5rem;padding:0.25rem 0.5rem;border-radius:6px;border:1.5px solid #92400e;background:#fef3c7;cursor:pointer;font-size:0.78rem;font-weight:600">✓ Zavřít tvar</button>
          <button onclick="cancelDrawRoom()" style="margin-left:0.3rem;padding:0.25rem 0.5rem;border-radius:6px;border:1px solid #ccc;background:white;cursor:pointer;font-size:0.78rem">Zrušit</button>
        </div>
      </div>

      <!-- Místnosti - seznam + editace -->
      <div id="roomListContainer">
        ${PS.rooms.map(room => renderRoomCard(room)).join('')}
      </div>
    </div>

    <!-- PANEL: Kreslení -->
    <div id="panel_draw" style="display:${PS.mode==='draw'?'block':'none'}">
      <div class="card" style="padding:0.7rem">
        <div style="display:flex;gap:0.35rem;margin-bottom:0.5rem;flex-wrap:wrap;align-items:center">
          ${toolBtns.map(b => `
            <button id="toolBtn_${b.t}" title="${b.tip}" onclick="setTool('${b.t}')"
              style="padding:0.5rem 0.6rem;border-radius:8px;border:2px solid ${PS.tool===b.t?'var(--accent)':'var(--border)'};
              background:${PS.tool===b.t?'#fff5f2':'var(--surface)'};cursor:pointer;font-size:0.95rem;min-width:36px;text-align:center">
              ${b.icon}</button>
          `).join('')}
          <div style="width:1px;height:28px;background:var(--border);margin:0 2px"></div>
          <button onclick="undoDraw()" style="padding:0.5rem 0.6rem;border-radius:8px;border:1px solid var(--border);background:var(--surface);cursor:pointer">↩️</button>
          <button onclick="redoDraw()" style="padding:0.5rem 0.6rem;border-radius:8px;border:1px solid var(--border);background:var(--surface);cursor:pointer">↪️</button>
          <button onclick="clearDraw()" style="padding:0.5rem 0.6rem;border-radius:8px;border:1px solid var(--border);background:var(--surface);cursor:pointer">🗑️</button>
          <button onclick="savePudorysImg('drawCanvas')" style="padding:0.5rem 0.6rem;border-radius:8px;border:1px solid var(--border);background:var(--surface);cursor:pointer">💾</button>
        </div>
        <div style="display:flex;gap:0.3rem;align-items:center;margin-bottom:0.5rem;flex-wrap:wrap">
          ${colorPalette.map(c => `
            <div onclick="setColor('${c}')"
              style="width:22px;height:22px;border-radius:50%;background:${c};border:2px solid ${PS.drawColor===c?'var(--accent)':'#ccc'};cursor:pointer;flex-shrink:0"></div>
          `).join('')}
          <input type="color" value="${PS.drawColor}" onchange="setColor(this.value)"
            style="width:24px;height:24px;border:none;border-radius:50%;cursor:pointer;padding:0">
          <div style="width:1px;height:18px;background:var(--border);margin:0 3px"></div>
          ${[1,2,4,7,12].map(s => `
            <div onclick="setSize(${s})"
              style="width:${Math.max(14,s*2+6)}px;height:${Math.max(14,s*2+6)}px;border-radius:50%;
              background:${PS.drawSize===s?'var(--accent)':'var(--border)'};cursor:pointer;
              display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <div style="width:${s}px;height:${s}px;border-radius:50%;background:${PS.drawSize===s?'white':'var(--text2)'}"></div>
            </div>
          `).join('')}
        </div>
        <!-- Symbol panel -->
        <div id="symbolPanel" style="display:${PS.tool==='symbol'?'flex':'none'};gap:0.3rem;flex-wrap:wrap;margin-bottom:0.5rem;padding:0.5rem;background:var(--surface2);border-radius:8px">
          ${Object.entries(SYMBOLS).map(([k,s]) => `
            <button onclick="setSymbol('${k}')" id="sym_${k}"
              style="padding:0.3rem 0.45rem;border-radius:6px;border:2px solid ${PS.symbol===k?'var(--accent)':'var(--border)'};
              background:${PS.symbol===k?'#fff5f2':'white'};cursor:pointer;font-size:0.7rem;font-weight:600">
              ${s.label}</button>
          `).join('')}
        </div>
        <canvas id="drawCanvas" height="460"
          style="border:1.5px solid var(--border);border-radius:10px;width:100%;background:#fff;display:block;touch-action:none;cursor:crosshair"></canvas>
      </div>
    </div>

    ${state.fromNabidka ? `
    <!-- Akční lišta — zpět do nabídky -->
    <div class="card" style="border:2px solid var(--green);background:#f0fdf4;padding:1rem">
      <div style="font-size:0.85rem;font-weight:600;color:#16a34a;margin-bottom:0.7rem">
        📐 ${PS.rooms.filter(r=>r.points&&r.points.length>=3).length} místnost${PS.rooms.filter(r=>r.points&&r.points.length>=3).length===1?'':PS.rooms.filter(r=>r.points&&r.points.length>=3).length<5?'i':'í'} · 
        ${PS.rooms.filter(r=>r.points&&r.points.length>=3).reduce((s,r)=>s+polygonArea(r.points),0).toFixed(2)} m² celkem
      </div>
      <button class="btn btn-success btn-full" onclick="ulozitPudorysDoNabidky()" style="font-size:1rem;padding:0.85rem">
        ✅ Uložit nákres a zpět do nabídky
      </button>
      <button class="btn btn-secondary btn-full" onclick="navigate('novaNabidka')" style="margin-top:0.4rem">
        ⬅️ Zpět do nabídky bez uložení
      </button>
    </div>` : `
    <button class="btn btn-secondary btn-full" onclick="navigate('dashboard')">⬅️ Zpět na přehled</button>
    `}
  `;
}

function renderRoomCard(room) {
  const pts = room.points;
  if (!pts || pts.length < 2) return '';
  const area = polygonArea(pts);
  const perim = polygonPerimeter(pts);
  const walls = getWalls(room);

  return `
    <div class="card" style="border-left:4px solid ${room.color||'var(--accent)'}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.6rem">
        <div>
          <div style="font-weight:700;font-size:1rem">${room.name}</div>
          <div style="font-size:0.75rem;color:var(--text2)">
            📐 ${area.toFixed(2)} m² podlaha · stěny ~${getRoomWallAreaM2(room).toFixed(2)} m² (výška ${room.wallHeight||PS.wallHeight} cm) · obvod ${(perim/100).toFixed(1)} m · ${pts.length} rohů
          </div>
          ${getMepSummary(room) ? `<div style="margin-top:0.2rem;display:flex;gap:0.2rem;flex-wrap:wrap">${getMepSummary(room)}</div>` : ''}
        </div>
        <div style="display:flex;gap:0.3rem">
          <button onclick="renameRoom('${room.id}')" style="padding:0.3rem 0.4rem;border-radius:6px;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-size:0.75rem">✏️</button>
          <button onclick="deleteRoom('${room.id}')" style="padding:0.3rem 0.4rem;border-radius:6px;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-size:0.75rem">🗑️</button>
        </div>
      </div>

      <!-- Stěny -->
      <div style="margin-bottom:0.7rem">
        <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;color:var(--text2);letter-spacing:0.06em;margin-bottom:0.35rem">Stěny</div>
        <!-- Výška místnosti (per-room default) -->
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.4rem;background:#fff5f2;border-radius:8px;padding:0.4rem 0.6rem;font-size:0.8rem">
          <span style="font-weight:600;color:var(--accent)">📏 Výška místnosti:</span>
          <input type="number" value="${room.wallHeight||PS.wallHeight}" min="100" max="500" step="5"
            style="width:68px;padding:0.25rem 0.4rem;border:1.5px solid var(--accent);border-radius:6px;font-family:inherit;font-size:0.88rem;font-weight:600;text-align:center"
            onchange="setRoomHeight('${room.id}',this.value)">
          <span style="color:var(--text2)">cm</span>
          <span data-height-m="${room.id}" style="margin-left:auto;color:var(--text2);font-size:0.72rem">= ${((room.wallHeight||PS.wallHeight)/100).toFixed(2)} m</span>
        </div>

        <!-- Výška per-roh (šikmé stropy / půdní vestavba) -->
        <details style="margin-bottom:0.5rem">
          <summary style="font-size:0.76rem;font-weight:600;cursor:pointer;color:#7c3aed;padding:0.25rem 0.4rem;background:#f5f3ff;border-radius:6px">
            🏠 Výška per-roh — šikmé stropy / půdní vestavba
          </summary>
          <div style="margin-top:0.5rem;padding:0.5rem;background:#faf5ff;border-radius:8px;border:1px solid #e9d5ff">
            <div style="font-size:0.72rem;color:#7c3aed;margin-bottom:0.4rem">
              Každý roh místnosti může mít jinou výšku. Ideální pro šikmé střechy, mansardy a půdní vestavby.
            </div>
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:0.35rem">
              ${room.points.map((pt, pi) => `
                <div style="display:flex;align-items:center;gap:0.3rem;background:white;border-radius:6px;padding:0.3rem 0.45rem;border:1px solid #e9d5ff">
                  <div style="width:20px;height:20px;border-radius:5px;background:#7c3aed;color:white;font-size:0.65rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">R${pi+1}</div>
                  <input type="number" value="${pt.h || room.wallHeight || PS.wallHeight}" min="50" max="600" step="5"
                    style="width:56px;padding:0.2rem 0.3rem;border:1px solid #c4b5fd;border-radius:5px;font-size:0.82rem;font-weight:600;text-align:center"
                    onchange="setVertexHeight('${room.id}',${pi},this.value)">
                  <span style="font-size:0.7rem;color:var(--text2)">cm</span>
                </div>
              `).join('')}
            </div>
            <div style="display:flex;gap:0.3rem;margin-top:0.5rem;flex-wrap:wrap">
              <button onclick="setAllVertexHeights('${room.id}', ${room.wallHeight||PS.wallHeight})"
                style="font-size:0.72rem;padding:0.25rem 0.5rem;border-radius:5px;border:1px solid #c4b5fd;background:white;cursor:pointer;color:#7c3aed">
                ↺ Srovnat na ${room.wallHeight||PS.wallHeight} cm
              </button>
              <button onclick="setRoofProfile('${room.id}','pulkruh')"
                style="font-size:0.72rem;padding:0.25rem 0.5rem;border-radius:5px;border:1px solid #c4b5fd;background:white;cursor:pointer;color:#7c3aed">
                🏠 Sedlová střecha
              </button>
              <button onclick="setRoofProfile('${room.id}','mansarda')"
                style="font-size:0.72rem;padding:0.25rem 0.5rem;border-radius:5px;border:1px solid #c4b5fd;background:white;cursor:pointer;color:#7c3aed">
                🏛 Mansarda
              </button>
            </div>
          </div>
        </details>
        <div style="display:flex;flex-direction:column;gap:0.3rem">
          ${walls.map((w, i) => `
            <div style="display:flex;align-items:center;gap:0.4rem;background:var(--surface2);border-radius:8px;padding:0.35rem 0.5rem">
              <div style="width:22px;height:22px;border-radius:6px;background:${room.color||'var(--accent)'};color:white;font-weight:700;font-size:0.75rem;display:flex;align-items:center;justify-content:center;flex-shrink:0">${w.label}</div>
              <input value="${w.length_cm} cm" id="wall_${room.id}_${i}"
                style="flex:1;padding:0.3rem 0.4rem;border:1px solid var(--border);border-radius:6px;font-size:0.82rem;font-family:inherit"
                onchange="editWallLength('${room.id}',${i},this.value)">
              <input placeholder="Poznámka…" value="${w.note||''}"
                style="flex:2;padding:0.3rem 0.4rem;border:1px solid var(--border);border-radius:6px;font-size:0.78rem;font-family:inherit;color:var(--text2)"
                onchange="editWallNote('${room.id}',${i},this.value)">
              <button onclick="addPointAfter('${room.id}',${i})" title="Přidat roh za touto stěnou" style="padding:0.25rem 0.35rem;border-radius:5px;border:1px solid var(--border);background:white;cursor:pointer;font-size:0.7rem">+⌐</button>
              <button onclick="openWallOpeningsModal('${room.id}',${i})" title="Otvory v stěně" style="padding:0.25rem 0.35rem;border-radius:5px;border:1px solid var(--border);background:${(w.openings&&w.openings.length)?'#fff5f2':'white'};cursor:pointer;font-size:0.7rem">${(w.openings&&w.openings.length)?'🪟'+w.openings.length:'🪟'}</button>
              <button onclick="openMepModal('${room.id}',${i})" title="Rozvody v stěně"
                style="padding:0.25rem 0.35rem;border-radius:5px;border:1px solid var(--border);
                background:${(room.wallMep&&room.wallMep[i]&&room.wallMep[i].length)?'#eff6ff':'white'};
                cursor:pointer;font-size:0.7rem">
                ${(room.wallMep&&room.wallMep[i]&&room.wallMep[i].length)?'⚡'+room.wallMep[i].length:'⚡'}
              </button>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Obklad + sparořez -->
      <details style="margin-bottom:0.5rem">
        <summary style="font-size:0.78rem;font-weight:600;cursor:pointer;color:var(--accent);padding:0.3rem 0">🔲 Obklad & sparořez</summary>
        <div style="margin-top:0.5rem">
          <div style="display:flex;gap:0.5rem;margin-bottom:0.5rem;flex-wrap:wrap">
            <div style="flex:1;min-width:100px">
              <label style="font-size:0.72rem;color:var(--text2);display:block;margin-bottom:2px">Formát dlaždice (cm)</label>
              <div style="display:flex;gap:0.3rem">
                <input type="number" value="${room.tileW||60}" id="tw_${room.id}" placeholder="60"
                  style="width:55px;padding:0.3rem;border:1px solid var(--border);border-radius:6px;font-size:0.82rem"
                  onchange="updateTile('${room.id}')">
                <span style="align-self:center;color:var(--text2)">×</span>
                <input type="number" value="${room.tileH||60}" id="th_${room.id}" placeholder="60"
                  style="width:55px;padding:0.3rem;border:1px solid var(--border);border-radius:6px;font-size:0.82rem"
                  onchange="updateTile('${room.id}')">
              </div>
            </div>
            <div style="flex:1;min-width:120px">
              <label style="font-size:0.72rem;color:var(--text2);display:block;margin-bottom:2px">Spára (mm)</label>
              <input type="number" value="${room.groutMm||3}" id="grout_${room.id}" min="1" max="20" placeholder="3"
                style="width:70px;padding:0.3rem;border:1px solid var(--border);border-radius:6px;font-size:0.82rem"
                onchange="updateTile('${room.id}')">
            </div>
          </div>
          <div style="font-size:0.72rem;color:var(--text2);margin-bottom:0.4rem;font-weight:600">Vzor sparořezu:</div>
          <div style="display:flex;flex-direction:column;gap:0.3rem">
            ${SPAROREZ_VZORY.map(v => `
              <label style="display:flex;align-items:flex-start;gap:0.5rem;padding:0.4rem 0.5rem;border-radius:8px;border:1.5px solid ${room.sparorez===v.id?'var(--accent)':'var(--border)'};background:${room.sparorez===v.id?'#fff5f2':'white'};cursor:pointer">
                <input type="radio" name="spar_${room.id}" value="${v.id}" ${room.sparorez===v.id||(!room.sparorez&&v.id==='brick')?'checked':''} onchange="setSparorez('${room.id}','${v.id}')" style="width:auto;margin-top:2px;accent-color:var(--accent)">
                <div>
                  <div style="font-weight:600;font-size:0.82rem">${v.label}</div>
                  <div style="font-size:0.72rem;color:var(--text2)">${v.desc}</div>
                </div>
              </label>
            `).join('')}
          </div>
          <button onclick="PS.showTiles=true;renderRoomCanvas()" style="margin-top:0.5rem;padding:0.35rem 0.7rem;border-radius:8px;border:1.5px solid var(--accent);background:#fff5f2;color:var(--accent);cursor:pointer;font-size:0.78rem;font-weight:600">👁 Náhled sparořezu</button>
        </div>
      </details>

      <!-- Vybavení -->
      <details style="margin-bottom:0.3rem">
        <summary style="font-size:0.78rem;font-weight:600;cursor:pointer;color:#2563eb;padding:0.3rem 0">🚿 Vybavení místnosti ${room.furniture&&room.furniture.length?'('+room.furniture.length+')':''}</summary>
        <div style="margin-top:0.5rem">
          ${(room.furniture||[]).length === 0 ? '<div style="font-size:0.8rem;color:var(--text2);padding:0.3rem 0">Žádné vybavení. Přidej níže.</div>' :
            (room.furniture||[]).map(f => `
              <div style="display:flex;align-items:center;gap:0.4rem;background:var(--surface2);border-radius:8px;padding:0.35rem 0.5rem;margin-bottom:0.3rem">
                <span style="font-size:1rem;flex-shrink:0">${f.label?.split(' ')[0]||'📦'}</span>
                <span style="flex:1;font-size:0.82rem;font-weight:600">${f.label||f.type}</span>
                <button onclick="rotateFurniture('${room.id}','${f.id}')" style="padding:0.25rem 0.4rem;border-radius:6px;border:1px solid var(--border);background:white;cursor:pointer;font-size:0.75rem" title="Otočit">↻</button>
                <button onclick="removeFurniture('${room.id}','${f.id}')" style="padding:0.25rem 0.4rem;border-radius:6px;border:1px solid #fecaca;background:#fef2f2;color:#dc2626;cursor:pointer;font-size:0.75rem">✕</button>
              </div>
            `).join('')
          }
          <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;color:var(--text2);letter-spacing:0.06em;margin:0.5rem 0 0.3rem">Přidat vybavení:</div>
          <div style="display:flex;flex-wrap:wrap;gap:0.3rem">
            ${Object.entries(SYMBOLS).map(([k,s]) => `
              <button onclick="addFurnitureToRoom('${room.id}','${k}')"
                style="padding:0.3rem 0.5rem;border-radius:8px;border:1px solid var(--border);background:white;cursor:pointer;font-size:0.75rem;font-weight:600">
                ${s.label}
              </button>
            `).join('')}
          </div>
        </div>
      </details>
    </div>
  `;
}

// ── Geometrické helpery ──
function polygonArea(pts) {
  // Shoelace formula, vrátí m²
  let a = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const j = (i+1) % n;
    a += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return Math.abs(a) / 2 / 10000; // cm² → m²
}

function polygonPerimeter(pts) {
  let p = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i+1) % pts.length;
    const dx = pts[j].x - pts[i].x, dy = pts[j].y - pts[i].y;
    p += Math.sqrt(dx*dx + dy*dy);
  }
  return p; // v cm
}

function dist(a, b) { return Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2); }

function getWalls(room) {
  const pts = room.points;
  const walls = [];
  for (let i = 0; i < pts.length; i++) {
    const j = (i+1) % pts.length;
    const dx = pts[j].x - pts[i].x, dy = pts[j].y - pts[i].y;
    const len = Math.round(Math.sqrt(dx*dx + dy*dy));
    walls.push({
      idx: i,
      label: WALL_LABELS[i % WALL_LABELS.length],
      length_cm: len,
      note: room.wallNotes?.[i] || '',
      openings: room.walls?.[i]?.openings || [],
      mep: room.wallMep?.[i] || [],
    });
  }
  return walls;
}

// ── Snap helpers ──
function snapToGrid(val) {
  const g = PS.gridSize * PS.scale;
  return Math.round(val / g) * g;
}

function snapPoint(px, py) {
  // Přichytit k existujícím rohům
  for (const room of PS.rooms) {
    for (const pt of room.points) {
      const sx = pt.x * PS.scale + PS.viewOffset.x;
      const sy = pt.y * PS.scale + PS.viewOffset.y;
      if (Math.hypot(px-sx, py-sy) < PS.snapDist) return { x: sx, y: sy, snapped: true };
    }
  }
  // Drawing points
  for (const pt of PS.drawing.points) {
    if (Math.hypot(px-pt.px, py-pt.py) < PS.snapDist) return { x: pt.px, y: pt.py, snapped: true };
  }
  // Mřížka
  return { x: snapToGrid(px - PS.viewOffset.x) + PS.viewOffset.x, y: snapToGrid(py - PS.viewOffset.y) + PS.viewOffset.y, snapped: false };
}

function snapAngle(x1, y1, x2, y2) {
  // Zarovnat na 0°, 45°, 90°, 135° atd.
  const dx = x2-x1, dy = y2-y1;
  const angle = Math.atan2(dy, dx);
  const snap = Math.PI / 4; // 45°
  const snapped = Math.round(angle / snap) * snap;
  const len = Math.hypot(dx, dy);
  return { x: x1 + Math.cos(snapped)*len, y: y1 + Math.sin(snapped)*len };
}

// ── Canvas → world coords ──
function canvasToWorld(px, py) {
  return { x: (px - PS.viewOffset.x) / PS.scale, y: (py - PS.viewOffset.y) / PS.scale };
}
function worldToCanvas(wx, wy) {
  return { x: wx * PS.scale + PS.viewOffset.x, y: wy * PS.scale + PS.viewOffset.y };
}

// ── Render hlavního canvasu ──
function renderRoomCanvas() {
  if (PS.view3d) { render3D(); return; }
  const c = document.getElementById('roomCanvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  if (!c.width || c.width < 10) c.width = c.clientWidth || 380;
  if (c._lastClientW !== c.clientWidth && c.clientWidth > 10) {
    c.width = c.clientWidth;
    c._lastClientW = c.clientWidth;
  }
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#fafaf9'; ctx.fillRect(0,0,c.width,c.height);

  // Grid
  if (PS.showGrid) {
    const g = PS.gridSize * PS.scale;
    ctx.strokeStyle = '#e8e5e0'; ctx.lineWidth = 0.5;
    const ox = ((PS.viewOffset.x % g) + g) % g;
    const oy = ((PS.viewOffset.y % g) + g) % g;
    for (let x = ox; x < c.width; x += g) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,c.height); ctx.stroke(); }
    for (let y = oy; y < c.height; y += g) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(c.width,y); ctx.stroke(); }
    // Major grid (50cm)
    const gm = 50 * PS.scale;
    ctx.strokeStyle = '#d4cfc8'; ctx.lineWidth = 0.8;
    const omx = ((PS.viewOffset.x % gm) + gm) % gm;
    const omy = ((PS.viewOffset.y % gm) + gm) % gm;
    for (let x = omx; x < c.width; x += gm) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,c.height); ctx.stroke(); }
    for (let y = omy; y < c.height; y += gm) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(c.width,y); ctx.stroke(); }
  }

  // Místnosti
  for (const room of PS.rooms) {
    drawRoomOnCanvas(ctx, room, room.id === PS.activeRoom);
  }

  // Drawing preview
  if (PS.drawing.active && PS.drawing.points.length > 0) {
    ctx.save();
    ctx.strokeStyle = '#C8502A'; ctx.lineWidth = 2; ctx.setLineDash([6,3]);
    ctx.beginPath();
    PS.drawing.points.forEach((p,i) => i===0 ? ctx.moveTo(p.px,p.py) : ctx.lineTo(p.px,p.py));
    if (PS.drawing.snapPoint) ctx.lineTo(PS.drawing.snapPoint.x, PS.drawing.snapPoint.y);
    ctx.stroke();
    ctx.restore();
    // Vertices
    PS.drawing.points.forEach((p, i) => {
      ctx.beginPath(); ctx.arc(p.px, p.py, 5, 0, Math.PI*2);
      ctx.fillStyle = i===0 ? '#2D6A4F' : '#C8502A'; ctx.fill();
      ctx.strokeStyle = 'white'; ctx.lineWidth = 1.5; ctx.stroke();
    });
  }

  // Legenda měřítka
  drawScale(ctx, c.width, c.height);
  const sl = document.getElementById('scaleLabel');
  if (sl) sl.textContent = PS.scale.toFixed(1) + ' px/cm';
}

function drawRoomOnCanvas(ctx, room, active) {
  const pts = room.points;
  if (!pts || pts.length < 2) return;

  const canvasPts = pts.map(p => worldToCanvas(p.x, p.y));

  // Dlaždice náhled
  if (PS.showTiles && pts.length >= 3) {
    drawTilePreview(ctx, room, canvasPts);
  }

  // Fill
  ctx.beginPath();
  canvasPts.forEach((p,i) => i===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y));
  ctx.closePath();
  if (!PS.showTiles) {
    ctx.fillStyle = active ? 'rgba(200,80,42,0.08)' : 'rgba(240,237,232,0.7)';
    ctx.fill();
  }

  // Outline
  ctx.strokeStyle = active ? '#C8502A' : '#1C1917';
  ctx.lineWidth = active ? 2.5 : 2;
  ctx.setLineDash([]);
  ctx.beginPath();
  canvasPts.forEach((p,i) => i===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y));
  ctx.closePath(); ctx.stroke();

  // Stěny — popisky + kóty
  const walls = getWalls(room);
  walls.forEach((w, i) => {
    const p1 = canvasPts[i];
    const p2 = canvasPts[(i+1) % canvasPts.length];
    const mx = (p1.x+p2.x)/2, my = (p1.y+p2.y)/2;
    const ang = Math.atan2(p2.y-p1.y, p2.x-p1.x);
    const perp = ang - Math.PI/2;
    const offset = 14;

    // Štítek stěny
    ctx.save();
    ctx.translate(mx + Math.cos(perp)*offset, my + Math.sin(perp)*offset);
    ctx.fillStyle = room.color || '#C8502A';
    ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2);
    ctx.fillStyle = room.color || '#C8502A'; ctx.fill();
    ctx.fillStyle = 'white'; ctx.fillText(w.label, 0, 0);
    ctx.restore();

    // Kóta délky
    if (PS.showDim) {
      const lenPx = dist(p1, p2);
      if (lenPx > 30) {
        ctx.save();
        ctx.translate(mx, my);
        ctx.rotate(ang);
        ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillStyle = '#555';
        ctx.fillText(w.length_cm + ' cm', 0, -3);
        ctx.restore();
      }
    }
  });

  // Rohy — editovatelné body
  if (active) {
    canvasPts.forEach((p, i) => {
      ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI*2);
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.strokeStyle = '#C8502A'; ctx.lineWidth = 2; ctx.stroke();
      ctx.font = 'bold 8px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle = '#C8502A'; ctx.fillText(i+1, p.x, p.y);
    });
  }

  // Furniture items
  if (room.furniture && room.furniture.length > 0) {
    const origin = worldToCanvas(room.points[0].x, room.points[0].y);
    for (const f of room.furniture) {
      const fCanvasX = origin.x + f.x * PS.scale;
      const fCanvasY = origin.y + f.y * PS.scale;
      const fW = f.w * PS.scale, fH = f.h * PS.scale;
      const selected = PS.selectedFurniture === f.id;
      ctx.save();
      ctx.translate(fCanvasX + fW/2, fCanvasY + fH/2);
      ctx.rotate((f.rot || 0) * Math.PI / 180);
      if (SYMBOLS[f.type]) {
        SYMBOLS[f.type].draw(ctx, 0, 0, Math.min(fW, fH));
      } else {
        ctx.strokeStyle = selected ? '#C8502A' : '#2563eb'; ctx.lineWidth = 1.5;
        ctx.strokeRect(-fW/2, -fH/2, fW, fH);
        ctx.font = `${Math.min(fW,fH)*0.35}px sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillStyle = selected ? '#C8502A' : '#2563eb';
        ctx.fillText(f.label?.split(' ')[0] || '?', 0, 0);
      }
      if (selected) {
        ctx.strokeStyle = '#C8502A'; ctx.lineWidth = 2; ctx.setLineDash([3,2]);
        ctx.strokeRect(-fW/2-3, -fH/2-3, fW+6, fH+6); ctx.setLineDash([]);
      }
      ctx.restore();
    }
  }
  const cx = canvasPts.reduce((s,p)=>s+p.x,0)/canvasPts.length;
  const cy = canvasPts.reduce((s,p)=>s+p.y,0)/canvasPts.length;
  ctx.font = 'bold 12px DM Sans, sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillStyle = active ? '#C8502A' : '#1C1917';
  ctx.fillText(room.name, cx, cy);
  const areaM2 = polygonArea(pts);
  ctx.font = '10px sans-serif'; ctx.fillStyle = '#888';
  ctx.fillText(areaM2.toFixed(2) + ' m²', cx, cy+14);
}

function drawTilePreview(ctx, room, canvasPts) {
  const tw = (room.tileW || 60) * PS.scale;
  const th = (room.tileH || 60) * PS.scale;
  const grout = ((room.groutMm || 3) / 10) * PS.scale;
  const spar = room.sparorez || 'brick';

  // Clip to room polygon
  ctx.save();
  ctx.beginPath();
  canvasPts.forEach((p,i) => i===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y));
  ctx.closePath(); ctx.clip();

  const bb = {
    minX: Math.min(...canvasPts.map(p=>p.x)),
    minY: Math.min(...canvasPts.map(p=>p.y)),
    maxX: Math.max(...canvasPts.map(p=>p.x)),
    maxY: Math.max(...canvasPts.map(p=>p.y)),
  };

  ctx.fillStyle = 'rgba(240,237,230,0.5)';
  ctx.fillRect(bb.minX, bb.minY, bb.maxX-bb.minX, bb.maxY-bb.minY);

  ctx.strokeStyle = 'rgba(160,140,120,0.6)'; ctx.lineWidth = Math.max(0.5, grout);
  ctx.fillStyle = 'rgba(255,253,248,0.85)';

  const drawTile = (x, y, w, h) => {
    ctx.fillRect(x+grout/2, y+grout/2, w-grout, h-grout);
    ctx.strokeRect(x+grout/2, y+grout/2, w-grout, h-grout);
  };

  if (spar === 'stack') {
    for (let y = bb.minY - th; y < bb.maxY + th; y += th) {
      for (let x = bb.minX - tw; x < bb.maxX + tw; x += tw) drawTile(x, y, tw, th);
    }
  } else if (spar === 'brick') {
    let row = 0;
    for (let y = bb.minY - th; y < bb.maxY + th; y += th, row++) {
      const offset = (row % 2) * tw / 2;
      for (let x = bb.minX - tw - offset; x < bb.maxX + tw; x += tw) drawTile(x, y, tw, th);
    }
  } else if (spar === 'third') {
    let row = 0;
    for (let y = bb.minY - th; y < bb.maxY + th; y += th, row++) {
      const offset = (row % 3) * tw / 3;
      for (let x = bb.minX - tw - offset; x < bb.maxX + tw; x += tw) drawTile(x, y, tw, th);
    }
  } else if (spar === 'herring') {
    // 90° herringbone — alternating horizontal/vertical
    const size = (tw + th) / 2;
    let row = 0, col = 0;
    for (let y = bb.minY - size; y < bb.maxY + size; y += th, row++) {
      col = 0;
      for (let x = bb.minX - size; x < bb.maxX + size; x += tw, col++) {
        if ((row + col) % 2 === 0) drawTile(x, y, tw, th);
        else drawTile(x, y, th, tw);
      }
    }
  } else if (spar === 'diagonal') {
    ctx.save(); ctx.translate(bb.minX, bb.minY); ctx.rotate(Math.PI/4);
    const dw = Math.sqrt(tw*tw + th*th) * 0.8;
    for (let y = -dw*2; y < (bb.maxY-bb.minY+bb.maxX-bb.minX)*1.5; y += th) {
      for (let x = -dw*2; x < (bb.maxX-bb.minX+bb.maxY-bb.minY)*1.5; x += tw) drawTile(x, y, tw, th);
    }
    ctx.restore();
  } else if (spar === 'versaille') {
    // Versailles pattern: 2×2 large + 1×1 small + 2×1 medium
    const L = tw, S = tw/2;
    for (let y = bb.minY - L*2; y < bb.maxY + L*2; y += L*2) {
      for (let x = bb.minX - L*2; x < bb.maxX + L*2; x += L*2) {
        drawTile(x, y, L, L);               // velká
        drawTile(x+L, y, S, S);             // malá
        drawTile(x+L, y+S, S, S);           // malá
        drawTile(x, y+L, S*1.5, S);         // střední vodorovná
        drawTile(x+S*1.5, y+L, S, S*1.5);  // střední svislá
      }
    }
  }

  ctx.restore();
}

function drawScale(ctx, w, h) {
  const barW = 50 * PS.scale; // 50cm
  const x = 15, y = h - 20;
  ctx.strokeStyle = '#555'; ctx.lineWidth = 2; ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(x, y-4); ctx.lineTo(x, y+4); ctx.moveTo(x, y); ctx.lineTo(x+barW, y); ctx.moveTo(x+barW, y-4); ctx.lineTo(x+barW, y+4); ctx.stroke();
  ctx.font = 'bold 9px sans-serif'; ctx.fillStyle = '#555'; ctx.textAlign='center';
  ctx.fillText('50 cm', x+barW/2, y-7);
}

// ── Akce: Místnosti ──
function setPudorysTab(tab) {
  PS.mode = tab;
  renderRoomCanvas();
  const app = document.getElementById('app');
  // Re-render stránky (cheaply: just toggle panels)
  document.getElementById('panel_room').style.display = (tab==='room'||tab==='wall') ? 'block' : 'none';
  document.getElementById('panel_draw').style.display = tab==='draw' ? 'block' : 'none';
  ['ptab_room','ptab_draw'].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    const active = (id==='ptab_room' && (tab==='room'||tab==='wall')) || (id==='ptab_draw' && tab==='draw');
    btn.style.background = active ? 'white' : 'transparent';
    btn.style.color = active ? 'var(--accent)' : 'var(--text2)';
    btn.style.boxShadow = active ? '0 1px 4px rgba(0,0,0,0.1)' : 'none';
  });
  if (tab === 'draw') setTimeout(() => initDrawCanvas(), 50);
}

// 20 předdefinovaných místností
const PREDEFINED_ROOMS = [
  { name: 'Koupelna', w: 250, h: 200, icon: '🚿', furniture: [
    { type: 'sprcha', label: '🚿 Sprcha', x: 10, y: 10, w: 90, h: 90, rot: 0 },
    { type: 'umyvadlo', label: '🪣 Umyvadlo', x: 10, y: 120, w: 60, h: 50, rot: 0 },
  ]},
  { name: 'WC', w: 120, h: 200, icon: '🚽', furniture: [
    { type: 'zachod', label: '🚽 Záchod', x: 20, y: 20, w: 40, h: 70, rot: 0 },
    { type: 'umyvadlo', label: '🪣 Umyvadlo', x: 20, y: 130, w: 60, h: 50, rot: 0 },
  ]},
  { name: 'Koupelna + WC', w: 300, h: 220, icon: '🛁', furniture: [
    { type: 'vana', label: '🛁 Vana', x: 10, y: 10, w: 170, h: 75, rot: 0 },
    { type: 'zachod', label: '🚽 Záchod', x: 200, y: 10, w: 40, h: 70, rot: 0 },
    { type: 'umyvadlo', label: '🪣 Umyvadlo', x: 10, y: 120, w: 60, h: 50, rot: 0 },
  ]},
  { name: 'Obývací pokoj', w: 600, h: 450, icon: '🛋️', furniture: [] },
  { name: 'Ložnice', w: 450, h: 380, icon: '🛏️', furniture: [] },
  { name: 'Dětský pokoj', w: 380, h: 320, icon: '🧸', furniture: [] },
  { name: 'Kuchyně', w: 500, h: 350, icon: '🍳', furniture: [] },
  { name: 'Obývací pokoj + kuchyně', w: 800, h: 450, icon: '🏠', furniture: [] },
  { name: 'Chodba', w: 400, h: 150, icon: '🚶', furniture: [
    { type: 'schody', label: '🪜 Schody', x: 10, y: 10, w: 120, h: 120, rot: 0 },
  ]},
  { name: 'Předsíň', w: 250, h: 250, icon: '🚪', furniture: [] },
  { name: 'Spíž', w: 180, h: 150, icon: '📦', furniture: [] },
  { name: 'Technická místnost', w: 250, h: 200, icon: '⚙️', furniture: [] },
  { name: 'Prádelna', w: 220, h: 200, icon: '🧺', furniture: [] },
  { name: 'Garáž', w: 600, h: 500, icon: '🚗', furniture: [] },
  { name: 'Terasa', w: 500, h: 300, icon: '🌿', furniture: [] },
  { name: 'Balkon', w: 300, h: 150, icon: '🌅', furniture: [] },
  { name: 'Sklep / sklípek', w: 400, h: 300, icon: '🪣', furniture: [] },
  { name: 'Pracovna', w: 350, h: 300, icon: '💼', furniture: [] },
  { name: 'Šatna', w: 280, h: 200, icon: '👗', furniture: [] },
  { name: 'Vlastní místnost', w: 400, h: 300, icon: '✏️', custom: true, furniture: [] },
];

function addRoomRect() {
  const existing = document.getElementById('roomPickerModal');
  if (existing) existing.remove();

  const html = `
    <div id="roomPickerModal" style="position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:400;display:flex;align-items:flex-end;touch-action:none">
      <div style="background:var(--surface);border-radius:16px 16px 0 0;padding:1.2rem;width:100%;max-height:88vh;overflow-y:auto">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.8rem">
          <div style="font-family:'DM Serif Display',serif;font-size:1.2rem">Vybrat místnost</div>
          <button onclick="document.getElementById('roomPickerModal').remove()" style="background:transparent;border:none;cursor:pointer;font-size:1.4rem;color:var(--text2);padding:0.2rem 0.4rem">✕</button>
        </div>
        <div style="margin-bottom:0.8rem">
          <input id="roomPickerName" placeholder="Název místnosti (volitelné)" style="width:100%;padding:0.6rem 0.8rem;border:1.5px solid var(--border);border-radius:10px;font-family:inherit;font-size:0.9rem;background:var(--bg)">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.45rem">
          ${PREDEFINED_ROOMS.map((r,i) => `
            <button onclick="pickRoom(${i})"
              style="display:flex;align-items:center;gap:0.5rem;padding:0.65rem 0.75rem;border-radius:10px;border:1.5px solid var(--border);background:var(--surface);cursor:pointer;text-align:left;font-family:inherit;transition:border-color 0.15s"
              onmouseenter="this.style.borderColor='var(--accent)'" onmouseleave="this.style.borderColor='var(--border)'">
              <span style="font-size:1.2rem;flex-shrink:0">${r.icon}</span>
              <div>
                <div style="font-weight:600;font-size:0.78rem;color:var(--text);line-height:1.2">${r.name}</div>
                <div style="font-size:0.68rem;color:var(--text2)">${r.custom ? 'vlastní rozměry' : r.w + '×' + r.h + ' cm'}</div>
              </div>
            </button>
          `).join('')}
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  // Focus name input
  setTimeout(() => document.getElementById('roomPickerName')?.focus(), 100);
}

function pickRoom(idx) {
  const tmpl = PREDEFINED_ROOMS[idx];
  // Get name from input field (if filled), otherwise use template name
  const nameInput = document.getElementById('roomPickerName');
  let name = (nameInput?.value?.trim()) || tmpl.name;
  let w = tmpl.w, h = tmpl.h;

  if (tmpl.custom) {
    // For custom: show size inputs in the modal instead of prompt
    if (nameInput && !nameInput.value.trim()) name = 'Místnost ' + _roomCounter;
    // Use default sizes, user can edit walls afterwards
    w = 400; h = 300;
  }

  // Remove modal
  document.getElementById('roomPickerModal')?.remove();

  _roomCounter++;
  psSaveUndo();
  const colors = ['#C8502A','#2563eb','#2D6A4F','#7c3aed','#059669','#dc2626'];
  const color = colors[PS.rooms.length % colors.length];
  // Place new room offset from existing ones
  const ox = (40 + (PS.rooms.length % 3) * (w + 20)) / PS.scale;
  const oy = (40 + Math.floor(PS.rooms.length / 3) * (h + 20)) / PS.scale;

  // Default furniture for certain room types
  const furniture = tmpl.furniture ? tmpl.furniture.map((f,i) => ({
    ...f, id: 'f' + Date.now() + i,
    // position relative to room top-left in cm
  })) : [];

  PS.rooms.push({
    id: makeRoomId(), name,
    points: [{x:ox,y:oy},{x:ox+w,y:oy},{x:ox+w,y:oy+h},{x:ox,y:oy+h}],
    wallNotes: [],
    wallHeight: PS.wallHeight,   // per-room výška stěny (cm)
    wallMep: {},                 // wallMep[wallIdx] = [{id,type,posX,posY,horiz,label}]
    tileW: 60, tileH: 60, groutMm: 3, sparorez: 'brick', color,
    furniture,
  });
  PS.activeRoom = PS.rooms[PS.rooms.length-1].id;
  // Don't call full render() — just re-render the canvas and update room list
  renderRoomCanvas();
  updateRoomList();
  toast(`✓ ${name} přidána`);
}

// Aktualizuje seznam místností pod canvasem bez plného re-renderu stránky
function updateRoomList() {
  const container = document.getElementById('roomListContainer');
  if (!container) return;
  container.innerHTML = PS.rooms.map(room => renderRoomCard(room)).join('');
}

// Furniture management
function addFurnitureToRoom(roomId, symType) {
  const room = PS.rooms.find(r => r.id === roomId);
  if (!room) return;
  if (!room.furniture) room.furniture = [];
  const sym = SYMBOLS[symType];
  // Place in center of room (approximate)
  const pts = room.points;
  const cx = pts.reduce((s,p)=>s+p.x,0)/pts.length;
  const cy = pts.reduce((s,p)=>s+p.y,0)/pts.length;
  const ox = room.points[0].x;
  const oy = room.points[0].y;
  room.furniture.push({
    id: 'f' + Date.now(),
    type: symType,
    label: sym.label,
    x: Math.max(0, cx - ox - 30),
    y: Math.max(0, cy - oy - 30),
    w: 60, h: 60,
    rot: 0,
  });
  renderRoomCanvas();
  updateRoomList();
  toast(sym.label + ' přidáno');
}

function removeFurniture(roomId, fId) {
  const room = PS.rooms.find(r => r.id === roomId);
  if (!room || !room.furniture) return;
  room.furniture = room.furniture.filter(f => f.id !== fId);
  if (PS.selectedFurniture === fId) PS.selectedFurniture = null;
  renderRoomCanvas();
  updateRoomList();
}

function rotateFurniture(roomId, fId) {
  const room = PS.rooms.find(r => r.id === roomId);
  if (!room || !room.furniture) return;
  const f = room.furniture.find(f => f.id === fId);
  if (!f) return;
  f.rot = ((f.rot || 0) + 90) % 360;
  // Swap w and h for 90° rotations
  if (f.rot % 180 !== 0) { const tmp = f.w; f.w = f.h; f.h = tmp; }
  renderRoomCanvas();
}
function startDrawRoom() {
  // Disable ruler if active
  if (PS.ruler.active) { PS.ruler.active = false; PS.ruler.p1 = null; PS.ruler.p2 = null; }
  PS.drawing.active = true;
  PS.drawing.points = [];
  PS.drawing.snapPoint = null;
  const hint = document.getElementById('polyHint');
  if (hint) hint.style.display = 'block';
  const btn = document.getElementById('btnDrawRoom');
  if (btn) { btn.style.background = '#fff5f2'; btn.style.borderColor = 'var(--accent)'; btn.style.color = 'var(--accent)'; }
  toast('Klikej na rohy místnosti, zavři tvar kliknutím na první bod');
}

function cancelDrawRoom() {
  PS.drawing.active = false; PS.drawing.points = []; PS.drawing.snapPoint = null;
  const hint = document.getElementById('polyHint');
  if (hint) hint.style.display = 'none';
  renderRoomCanvas();
}

function closePolygon() {
  if (PS.drawing.points.length < 3) { toast('Potřebuješ alespoň 3 body', 'err'); return; }
  finishPolygon();
}

function finishPolygon() {
  const nameRaw = prompt('Název místnosti:', 'Místnost ' + _roomCounter++);
  const name = (nameRaw !== null ? nameRaw.trim() : '') || ('Místnost ' + (_roomCounter - 1));
  psSaveUndo();
  const colors = ['#C8502A','#2563eb','#2D6A4F','#7c3aed','#059669','#dc2626'];
  const color = colors[PS.rooms.length % colors.length];
  const pts = PS.drawing.points.map(p => {
    const w = canvasToWorld(p.px, p.py);
    w.h = PS.wallHeight; // per-vertex výška (šikmé stropy)
    return w;
  });
  PS.rooms.push({ id: makeRoomId(), name: name||'Místnost', points: pts, wallNotes: [], tileW:60, tileH:60, groutMm:3, sparorez:'brick', color });
  PS.activeRoom = PS.rooms[PS.rooms.length-1].id;
  // Clear drawing state BEFORE render so no ghost lines appear
  PS.drawing.active = false;
  PS.drawing.points = [];
  PS.drawing.snapPoint = null;
  render();
}

function renameRoom(id) {
  openRoomEditModal(id);
}

function deleteRoom(id) {
  // Potvrzovací overlay (confirm() je blokovano na mobilu)
  const existing = document.getElementById('confirmDeleteOverlay');
  if (existing) existing.remove();
  const ov = document.createElement('div');
  ov.id = 'confirmDeleteOverlay';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:700;display:flex;align-items:flex-end';
  ov.innerHTML = `<div style="background:white;border-radius:16px 16px 0 0;padding:1.4rem;width:100%">
    <div style="font-weight:700;font-size:1rem;margin-bottom:0.5rem">🗑️ Smazat místnost?</div>
    <div style="color:#78716C;font-size:0.85rem;margin-bottom:1.2rem">Tato akce je nevratná.</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem">
      <button onclick="document.getElementById('confirmDeleteOverlay').remove()"
        style="padding:0.75rem;border-radius:10px;border:1.5px solid #E7E2DC;background:#F0EDE8;font-family:inherit;font-size:0.9rem;font-weight:600;cursor:pointer">
        ✕ Zrušit
      </button>
      <button onclick="confirmDeleteRoom('${id}')"
        style="padding:0.75rem;border-radius:10px;border:none;background:#dc2626;color:white;font-family:inherit;font-size:0.9rem;font-weight:600;cursor:pointer">
        🗑️ Smazat
      </button>
    </div>
  </div>`;
  document.body.appendChild(ov);
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
}

function confirmDeleteRoom(id) {
  document.getElementById('confirmDeleteOverlay')?.remove();
  hideRoomDeleteBtn();
  document.getElementById('roomEditModal')?.remove();
  psSaveUndo();
  PS.rooms = PS.rooms.filter(r => r.id !== id);
  if (PS.activeRoom === id) PS.activeRoom = PS.rooms[0]?.id || null;
  // Refresh without full render — just update canvas and room list
  renderRoomCanvas();
  updateRoomList();
  toast('Místnost smazána');
}

function editWallLength(roomId, wallIdx, val) {
  const room = PS.rooms.find(r=>r.id===roomId);
  if (!room) return;
  const newLen = parseFloat(val);
  if (isNaN(newLen) || newLen <= 0) return;
  psSaveUndo();
  // Přepočítat pozici bodu
  const i = wallIdx, j = (i+1) % room.points.length;
  const p1 = room.points[i], p2 = room.points[j];
  const dx = p2.x - p1.x, dy = p2.y - p1.y;
  const oldLen = Math.hypot(dx, dy);
  if (oldLen === 0) return;
  const ratio = newLen / oldLen;
  room.points[j] = { x: p1.x + dx*ratio, y: p1.y + dy*ratio };
  renderRoomCanvas();
  updateRoomList();
}

function editWallNote(roomId, wallIdx, val) {
  const room = PS.rooms.find(r=>r.id===roomId);
  if (!room) return;
  if (!room.wallNotes) room.wallNotes = [];
  room.wallNotes[wallIdx] = val;
}

function addPointAfter(roomId, wallIdx) {
  const room = PS.rooms.find(r=>r.id===roomId);
  if (!room) return;
  psSaveUndo();
  const i = wallIdx, j = (i+1) % room.points.length;
  const mid = { x: (room.points[i].x + room.points[j].x)/2, y: (room.points[i].y + room.points[j].y)/2 };
  room.points.splice(j, 0, mid);
  render();
}

function updateTile(roomId) {
  const room = PS.rooms.find(r=>r.id===roomId);
  if (!room) return;
  room.tileW = parseFloat(document.getElementById('tw_'+roomId)?.value) || 60;
  room.tileH = parseFloat(document.getElementById('th_'+roomId)?.value) || 60;
  room.groutMm = parseFloat(document.getElementById('grout_'+roomId)?.value) || 3;
  renderRoomCanvas();
}

function setSparorez(roomId, vzor) {
  const room = PS.rooms.find(r=>r.id===roomId);
  if (!room) return;
  room.sparorez = vzor;
  PS.showTiles = true;
  renderRoomCanvas();
}

function toggleGrid() { PS.showGrid = !PS.showGrid; renderRoomCanvas(); }
function toggleDim() { PS.showDim = !PS.showDim; renderRoomCanvas(); }
function toggleTiles() { PS.showTiles = !PS.showTiles; renderRoomCanvas();
  // Update button color
  const btn = document.querySelector('[onclick="toggleTiles()"]');
  if (btn) btn.style.background = PS.showTiles ? '#fff5f2' : 'var(--surface)';
}
function toggleRuler() {
  PS.ruler.active = !PS.ruler.active;
  PS.ruler.p1 = null; PS.ruler.p2 = null;
  const btn = document.getElementById('btnRuler');
  if (btn) {
    btn.style.background = PS.ruler.active ? '#fff5f2' : 'var(--surface)';
    btn.style.borderColor = PS.ruler.active ? 'var(--accent)' : 'var(--border)';
    btn.style.color = PS.ruler.active ? 'var(--accent)' : 'var(--text2)';
  }
  if (PS.ruler.active) {
    toast('Pravítko: klikni na první bod, pak na druhý bod pro měření vzdálenosti');
  } else {
    renderRoomCanvas();
  }
}
function changeScale(delta) {
  PS.scale = Math.max(0.5, Math.min(6, PS.scale + delta));
  renderRoomCanvas();
  const lbl = document.getElementById('scaleLabel');
  if (lbl) lbl.textContent = PS.scale + ' px/cm';
}

function psSaveUndo() {
  PS.history.push(JSON.stringify(PS.rooms));
  if (PS.history.length > 40) PS.history.shift();
  PS.redoStack = [];
}
function psUndo() {
  // Pokud probíhá kreslení místnosti — smaž poslední bod
  if (PS.drawing.active && PS.drawing.points.length > 0) {
    PS.drawing.points.pop();
    renderRoomCanvas();
    toast('Bod odstraněn');
    return;
  }
  if (!PS.history.length) { toast('Nic k vrácení', 'err'); return; }
  PS.redoStack.push(JSON.stringify(PS.rooms));
  PS.rooms = JSON.parse(PS.history.pop());
  renderRoomCanvas();
  updateRoomList();
  toast('Vráceno');
}
function psRedo() {
  if (!PS.redoStack.length) { toast('Nic k opakování', 'err'); return; }
  PS.history.push(JSON.stringify(PS.rooms));
  PS.rooms = JSON.parse(PS.redoStack.pop());
  renderRoomCanvas();
  updateRoomList();
  toast('Opakováno');
}

// ── Canvas eventy ──
function initRoomCanvas() {
  const c = document.getElementById('roomCanvas');
  if (!c) return;
  if (c._psInit) return;
  c._psInit = true;

  // Delegovat na 3D init pokud je 3D mode
  if (PS.view3d) { init3DInteraction(); render3D(); return; }

  const getCPos = (e) => {
    const r = c.getBoundingClientRect();
    const scaleX = c.width / r.width, scaleY = c.height / r.height;
    const src = (e.touches && e.touches.length > 0) ? e.touches[0] : e;
    return { px: (src.clientX - r.left) * scaleX, py: (src.clientY - r.top) * scaleY };
  };

  // ── Pinch zoom + two-finger PAN ──
  let lastPinchDist = 0, pinchActive = false;
  let lastMidX = 0, lastMidY = 0;

  c.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      pinchActive = true;
      longPressClear();
      lastPinchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY);
      lastMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      lastMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      e.preventDefault();
    }
  }, { passive: false });

  c.addEventListener('touchmove', (e) => {
    if (!pinchActive || e.touches.length !== 2) return;
    const rect = c.getBoundingClientRect();
    const scX = c.width / rect.width, scY = c.height / rect.height;

    const d = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY);
    const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

    // Pan — pohyb středu obou prstů
    const panDx = (midX - lastMidX) * scX;
    const panDy = (midY - lastMidY) * scY;
    PS.viewOffset.x += panDx;
    PS.viewOffset.y += panDy;

    // Zoom — změna vzdálenosti prstů
    if (lastPinchDist > 0) {
      const ratio = d / lastPinchDist;
      const mx = (midX - rect.left) * scX;
      const my = (midY - rect.top)  * scY;
      const old = PS.scale;
      PS.scale = Math.max(0.3, Math.min(8, PS.scale * ratio));
      PS.viewOffset.x = mx - (mx - PS.viewOffset.x) * (PS.scale / old);
      PS.viewOffset.y = my - (my - PS.viewOffset.y) * (PS.scale / old);
      const lbl = document.getElementById('scaleLabel');
      if (lbl) lbl.textContent = PS.scale.toFixed(1) + ' px/cm';
    }

    lastPinchDist = d;
    lastMidX = midX; lastMidY = midY;
    renderRoomCanvas();
    e.preventDefault();
  }, { passive: false });

  c.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) { pinchActive = false; lastPinchDist = 0; }
  });

  // ── Mouse wheel zoom ──
  c.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = c.getBoundingClientRect();
    const mx = (e.clientX - r.left) * (c.width / r.width);
    const my = (e.clientY - r.top) * (c.height / r.height);
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    const old = PS.scale;
    PS.scale = Math.max(0.3, Math.min(8, PS.scale * factor));
    PS.viewOffset.x = mx - (mx - PS.viewOffset.x) * (PS.scale / old);
    PS.viewOffset.y = my - (my - PS.viewOffset.y) * (PS.scale / old);
    const lbl = document.getElementById('scaleLabel');
    if (lbl) lbl.textContent = PS.scale.toFixed(1) + ' px/cm';
    renderRoomCanvas();
  }, { passive: false });

  // ── Drag state ──
  // type: 'corner' | 'room' | 'furniture'
  let drag = null;
  let lpTimer = null;
  let downPx = 0, downPy = 0, moved = false;
  let tapTimer = null, tapCount = 0;

  function longPressClear() { if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; } }

  c.addEventListener('pointerdown', (e) => {
    if (pinchActive) return;
    const {px, py} = getCPos(e);
    const snapped = snapPoint(px, py);
    downPx = px; downPy = py; moved = false;
    c.setPointerCapture(e.pointerId);

    // ── Pan tool nebo střední tlačítko myši ──
    if (PS.tool === 'pan' || e.button === 1) {
      drag = { type: 'pan', startOffX: PS.viewOffset.x, startOffY: PS.viewOffset.y, startPx: px, startPy: py };
      c.style.cursor = 'grabbing';
      e.preventDefault();
      return;
    }

    // ── Kóta (Cotování) ──
    if (PS.tool === 'kota') {
      const w = canvasToWorld(snapped.x, snapped.y);
      if (handleKotaClick(w.x, w.y)) { e.preventDefault(); return; }
    }

    // ── Ruler ──
    if (PS.ruler.active) {
      if (!PS.ruler.p1) {
        PS.ruler.p1 = canvasToWorld(snapped.x, snapped.y);
        toast('Klikni na druhý bod');
      } else {
        PS.ruler.p2 = canvasToWorld(snapped.x, snapped.y);
        const dx = PS.ruler.p2.x - PS.ruler.p1.x, dy = PS.ruler.p2.y - PS.ruler.p1.y;
        const distCm = Math.round(Math.hypot(dx, dy));
        renderRoomCanvas();
        const ctx2 = c.getContext('2d');
        const cp1 = worldToCanvas(PS.ruler.p1.x, PS.ruler.p1.y);
        const cp2 = worldToCanvas(PS.ruler.p2.x, PS.ruler.p2.y);
        ctx2.save();
        ctx2.strokeStyle = '#2563eb'; ctx2.lineWidth = 2; ctx2.setLineDash([5,3]);
        ctx2.beginPath(); ctx2.moveTo(cp1.x, cp1.y); ctx2.lineTo(cp2.x, cp2.y); ctx2.stroke();
        ctx2.setLineDash([]);
        const mx2 = (cp1.x+cp2.x)/2, my2 = (cp1.y+cp2.y)/2;
        ctx2.fillStyle = 'rgba(255,255,255,0.95)';
        ctx2.beginPath();
        if (ctx2.roundRect) ctx2.roundRect(mx2-46, my2-13, 92, 22, 4);
        else ctx2.rect(mx2-46, my2-13, 92, 22);
        ctx2.fill();
        ctx2.fillStyle = '#2563eb'; ctx2.font = 'bold 11px sans-serif';
        ctx2.textAlign = 'center'; ctx2.textBaseline = 'middle';
        ctx2.fillText(distCm + ' cm (' + (distCm/100).toFixed(2) + ' m)', mx2, my2);
        ctx2.restore();
        toast('📏 ' + distCm + ' cm = ' + (distCm/100).toFixed(2) + ' m');
        PS.ruler.p1 = null; PS.ruler.p2 = null;
      }
      e.preventDefault(); return;
    }

    // ── Kreslení polygonu ──
    if (PS.drawing.active) {
      if (PS.drawing.points.length >= 3) {
        const fp = PS.drawing.points[0];
        if (Math.hypot(px - fp.px, py - fp.py) < PS.snapDist * 1.5) { finishPolygon(); return; }
      }
      PS.drawing.points.push({ px: snapped.x, py: snapped.y });
      renderRoomCanvas(); return;
    }

    // ── Roh aktivní místnosti ──
    if (PS.activeRoom) {
      const ar = PS.rooms.find(r => r.id === PS.activeRoom);
      if (ar) {
        const cpts = ar.points.map(p => worldToCanvas(p.x, p.y));
        for (let i = 0; i < cpts.length; i++) {
          if (Math.hypot(px - cpts[i].x, py - cpts[i].y) < 14) {
            drag = { type: 'corner', roomId: ar.id, ptIdx: i };
            e.preventDefault(); return;
          }
        }
        // ── Nábytek aktivní místnosti ──
        if (ar.furniture) {
          const origin = worldToCanvas(ar.points[0].x, ar.points[0].y);
          for (const f of ar.furniture) {
            const fx = origin.x + f.x * PS.scale;
            const fy = origin.y + f.y * PS.scale;
            if (px >= fx && px <= fx + f.w * PS.scale && py >= fy && py <= fy + f.h * PS.scale) {
              PS.selectedFurniture = f.id;
              drag = { type: 'furniture', roomId: ar.id, fId: f.id, startFx: f.x, startFy: f.y };
              renderRoomCanvas();
              e.preventDefault(); return;
            }
          }
        }
      }
    }

    // ── Klik do místnosti ──
    for (const room of PS.rooms) {
      const cpts = room.points.map(p => worldToCanvas(p.x, p.y));
      if (pointInPolygon({ x: px, y: py }, cpts)) {
        PS.selectedFurniture = null;

        // Long-press → přesun celé místnosti
        const capturedRoom = room;
        lpTimer = setTimeout(() => {
          lpTimer = null;
          if (!moved) {
            drag = { type: 'room', roomId: capturedRoom.id,
              startPx: downPx, startPy: downPy,
              startPts: capturedRoom.points.map(p => ({...p})) };
            c.style.cursor = 'grabbing';
            if (navigator.vibrate) navigator.vibrate(30);
            toast('Přesouvej místnost — zvedni prst pro uložení');
          }
        }, 500);

        // Výběr (tap) — detekce double-tap
        tapCount++;
        if (tapTimer) { clearTimeout(tapTimer); tapTimer = null; }
        if (tapCount >= 2) {
          tapCount = 0;
          PS.activeRoom = room.id;
          openRoomEditModal(room.id);
        } else {
          tapTimer = setTimeout(() => {
            tapCount = 0;
            PS.activeRoom = room.id;
            renderRoomCanvas();
            showRoomDeleteBtn(room.id, c);
          }, 280);
        }

        e.preventDefault(); return;
      }
    }

    // Klik mimo místnosti — zkus klik na stěnu (přidat bod)
    const edge = getClickedWallEdge(px, py);
    if (edge) {
      psSaveUndo();
      const { room, idx } = edge;
      const p1 = room.points[idx], p2 = room.points[(idx+1)%room.points.length];
      const wPt = canvasToWorld(snapped.x, snapped.y);
      // Vložit nový bod mezi idx a idx+1
      room.points.splice(idx+1, 0, wPt);
      PS.activeRoom = room.id;
      renderRoomCanvas();
      updateRoomList();
      toast('✓ Přidán nový bod stěny — táhni rohový bod pro úpravu');
      e.preventDefault(); return;
    }

    PS.activeRoom = null;
    PS.selectedFurniture = null;
    hideRoomDeleteBtn();
    renderRoomCanvas();
    e.preventDefault();
  });

  c.addEventListener('pointermove', (e) => {
    if (pinchActive) return;
    const {px, py} = getCPos(e);
    const snapped = snapPoint(px, py);

    if (Math.hypot(px - downPx, py - downPy) > 8) { moved = true; longPressClear(); }

    if (PS.drawing.active) { PS.drawing.snapPoint = snapped; renderRoomCanvas(); return; }

    if (!drag) return;

    // ── Pan ──
    if (drag.type === 'pan') {
      PS.viewOffset.x = drag.startOffX + (px - drag.startPx);
      PS.viewOffset.y = drag.startOffY + (py - drag.startPy);
      renderRoomCanvas();
      e.preventDefault();
      return;
    }

    if (drag.type === 'corner') {
      const room = PS.rooms.find(r => r.id === drag.roomId);
      if (room) { room.points[drag.ptIdx] = canvasToWorld(snapped.x, snapped.y); renderRoomCanvas(); }

    } else if (drag.type === 'room') {
      const room = PS.rooms.find(r => r.id === drag.roomId);
      if (room && drag.startPts) {
        const dxCm = (px - drag.startPx) / PS.scale;
        const dyCm = (py - drag.startPy) / PS.scale;
        room.points = drag.startPts.map(p => ({ x: p.x + dxCm, y: p.y + dyCm }));
        renderRoomCanvas();
      }

    } else if (drag.type === 'furniture') {
      const room = PS.rooms.find(r => r.id === drag.roomId);
      if (room) {
        const f = room.furniture && room.furniture.find(f => f.id === drag.fId);
        if (f) {
          f.x = Math.max(0, drag.startFx + (px - downPx) / PS.scale);
          f.y = Math.max(0, drag.startFy + (py - downPy) / PS.scale);
          renderRoomCanvas();
        }
      }
    }
    e.preventDefault();
  });

  c.addEventListener('pointerup', () => {
    longPressClear();
    if (drag) {
      if (drag.type === 'room' || drag.type === 'corner') {
        psSaveUndo();
        updateRoomList();
      }
      drag = null;
      c.style.cursor = PS.tool === 'pan' ? 'grab' : 'default';
    }
    moved = false;
  });

  renderRoomCanvas();
}

function pointInPolygon(pt, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length-1; i < polygon.length; j=i++) {
    const xi=polygon[i].x, yi=polygon[i].y, xj=polygon[j].x, yj=polygon[j].y;
    if (((yi>pt.y)!==(yj>pt.y)) && (pt.x<(xj-xi)*(pt.y-yi)/(yj-yi)+xi)) inside=!inside;
  }
  return inside;
}

// ── Tlačítko smazat na klik ──
function showRoomDeleteBtn(roomId, canvas) {
  hideRoomDeleteBtn();
  const rect = canvas.getBoundingClientRect();
  const btn = document.createElement('div');
  btn.id = 'roomDeleteFloatBtn';
  btn.style.cssText = `position:fixed;z-index:600;top:${Math.round(rect.top + 8)}px;right:${Math.round(window.innerWidth - rect.right + 8)}px;display:flex;gap:0.4rem`;
  btn.innerHTML = `
    <button onclick="openRoomEditModal('${roomId}')"
      style="background:#2563eb;color:white;border:none;border-radius:8px;padding:0.45rem 0.7rem;font-size:0.8rem;font-weight:700;cursor:pointer;font-family:inherit;box-shadow:0 3px 10px rgba(0,0,0,0.2)">
      ✏️ Upravit
    </button>
    <button onclick="deleteRoom('${roomId}')"
      style="background:#dc2626;color:white;border:none;border-radius:8px;padding:0.45rem 0.7rem;font-size:0.8rem;font-weight:700;cursor:pointer;font-family:inherit;box-shadow:0 3px 10px rgba(0,0,0,0.2)">
      🗑️ Smazat
    </button>`;
  document.body.appendChild(btn);
}

function hideRoomDeleteBtn() {
  document.getElementById('roomDeleteFloatBtn')?.remove();
}

// ── Modal pro editaci rozměrů místnosti (double-click) ──
function openRoomEditModal(roomId) {
  const room = PS.rooms.find(r => r.id === roomId);
  if (!room) return;
  hideRoomDeleteBtn();

  // Spočítej bounding box místnosti v cm
  const xs = room.points.map(p => p.x), ys = room.points.map(p => p.y);
  const wCm = Math.round(Math.max(...xs) - Math.min(...xs));
  const hCm = Math.round(Math.max(...ys) - Math.min(...ys));

  const existing = document.getElementById('roomEditModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'roomEditModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:500;display:flex;align-items:flex-end';
  modal.innerHTML = `
    <div style="background:var(--surface);border-radius:16px 16px 0 0;padding:1.4rem;width:100%;max-height:80vh;overflow-y:auto">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
        <div style="font-family:'DM Serif Display',serif;font-size:1.2rem">✏️ Upravit místnost</div>
        <button id="roomEditClose" style="background:transparent;border:none;cursor:pointer;font-size:1.5rem;color:var(--text2);padding:0.2rem 0.5rem;line-height:1">✕</button>
      </div>
      <div style="margin-bottom:0.8rem">
        <label style="font-size:0.78rem;font-weight:600;color:var(--text2);display:block;margin-bottom:0.3rem">Název</label>
        <input id="redit_name" value="${room.name}" style="width:100%;padding:0.65rem 0.9rem;border:1.5px solid var(--border);border-radius:10px;font-family:inherit;font-size:0.95rem;background:var(--bg)">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;margin-bottom:1rem">
        <div>
          <label style="font-size:0.78rem;font-weight:600;color:var(--text2);display:block;margin-bottom:0.3rem">Šířka (cm)</label>
          <input id="redit_w" type="number" value="${wCm}" min="10" style="width:100%;padding:0.65rem 0.9rem;border:1.5px solid var(--border);border-radius:10px;font-family:inherit;font-size:0.95rem;background:var(--bg)">
        </div>
        <div>
          <label style="font-size:0.78rem;font-weight:600;color:var(--text2);display:block;margin-bottom:0.3rem">Délka (cm)</label>
          <input id="redit_h" type="number" value="${hCm}" min="10" style="width:100%;padding:0.65rem 0.9rem;border:1.5px solid var(--border);border-radius:10px;font-family:inherit;font-size:0.95rem;background:var(--bg)">
        </div>
      </div>
      <div style="background:var(--surface2);border-radius:10px;padding:0.7rem;margin-bottom:1rem;font-size:0.82rem;color:var(--text2)">
        📐 Plocha: <strong id="redit_area" style="color:var(--accent)"></strong>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem">
        <button id="roomEditCancel" style="padding:0.75rem;border-radius:10px;border:1.5px solid var(--border);background:var(--surface2);color:var(--text);font-family:inherit;font-size:0.9rem;font-weight:600;cursor:pointer">✕ Zavřít</button>
        <button id="roomEditSave" style="padding:0.75rem;border-radius:10px;border:none;background:var(--accent);color:white;font-family:inherit;font-size:0.9rem;font-weight:600;cursor:pointer">✓ Uložit</button>
      </div>
    </div>`;

  document.body.appendChild(modal);

  // Live náhled plochy
  const updateArea = () => {
    const w = parseFloat(document.getElementById('redit_w')?.value) || 0;
    const h = parseFloat(document.getElementById('redit_h')?.value) || 0;
    const aEl = document.getElementById('redit_area');
    if (aEl) aEl.textContent = ((w * h) / 10000).toFixed(2) + ' m²';
  };
  document.getElementById('redit_w').addEventListener('input', updateArea);
  document.getElementById('redit_h').addEventListener('input', updateArea);
  updateArea();

  const close = () => { document.getElementById('roomEditModal')?.remove(); };

  document.getElementById('roomEditClose').onclick = close;
  document.getElementById('roomEditCancel').onclick = close;
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  document.getElementById('roomEditSave').onclick = () => {
    const name = document.getElementById('redit_name').value.trim() || room.name;
    const w = parseFloat(document.getElementById('redit_w').value);
    const h = parseFloat(document.getElementById('redit_h').value);
    if (!w || !h || w < 10 || h < 10) { 
      document.getElementById('redit_w').style.borderColor = '#dc2626';
      document.getElementById('redit_h').style.borderColor = '#dc2626';
      return; 
    }
    saveRoomEdit(roomId, name, w, h);
    close();
  };

  // Enter = uložit
  modal.addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('roomEditSave')?.click(); if (e.key === 'Escape') close(); });
  setTimeout(() => document.getElementById('redit_name')?.focus(), 100);
}

function saveRoomEdit(roomId, name, wCm, hCm) {
  const room = PS.rooms.find(r => r.id === roomId);
  if (!room) return;
  psSaveUndo();
  // Zachovat levý horní roh, přepočítat ostatní body
  const ox = room.points[0].x;
  const oy = room.points[0].y;
  room.name = name;
  // Přepsat na obdélník se zadanými rozměry
  room.points = [
    { x: ox, y: oy },
    { x: ox + wCm, y: oy },
    { x: ox + wCm, y: oy + hCm },
    { x: ox, y: oy + hCm },
  ];
  renderRoomCanvas();
  updateRoomList();
  toast(`✓ ${name} upraven: ${wCm}×${hCm} cm`);
}

// ═══════════════════════════════════════════
// 2D / 3D PŘEPÍNÁNÍ
// ═══════════════════════════════════════════
function setView2D() {
  PS.view3d = false;
  const c = document.getElementById('roomCanvas');
  if (c) { c._psInit = false; c._3dInit = false; }
  render();
}
function setView3D() {
  if (PS.rooms.length === 0) { toast('Nejprve nakresli alespoň jednu místnost', 'err'); return; }
  PS.view3d = true;
  PS.drawing.active = false;
  const c = document.getElementById('roomCanvas');
  if (c) { c._psInit = false; c._3dInit = false; }
  render();
}

// ═══════════════════════════════════════════
// 3D VIZUALIZACE — per-room výška + sparořez
// ═══════════════════════════════════════════
// ── 3D render throttle (smooth 60fps) ──
let _raf3d = null;
function render3D() {
  if (_raf3d) return; // skip if frame already queued
  _raf3d = requestAnimationFrame(_render3DFrame);
}

function _render3DFrame() {
  _raf3d = null;
  const c = document.getElementById('roomCanvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  if (!c.width || c.width < 10) c.width = c.clientWidth || 380;

  // ── Vymazat canvas (OPRAVA: chybělo → ghost walls) ──
  ctx.clearRect(0, 0, c.width, c.height);

  // Tmavé pozadí 3D scény
  const bg = ctx.createLinearGradient(0, 0, 0, c.height);
  bg.addColorStop(0, '#1a1a2e');
  bg.addColorStop(1, '#16213e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);

  if (PS.rooms.length === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '16px DM Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Nakresli místnost v záložce 2D', c.width/2, c.height/2);
    return;
  }

  const rotX = PS.cam3d.rotX * Math.PI / 180;
  const rotY = PS.cam3d.rotY * Math.PI / 180;
  const zoom = PS.cam3d.zoom * Math.min(c.width, c.height) / 700;

  // Střed scény — používáme globální průměrnou výšku pro pozici kamery
  let allX = [], allY = [];
  PS.rooms.forEach(r => r.points.forEach(p => { allX.push(p.x); allY.push(p.y); }));
  const sceneCx = (Math.min(...allX) + Math.max(...allX)) / 2;
  const sceneCy = (Math.min(...allY) + Math.max(...allY)) / 2;
  // sceneCz = 0 → podlaha (Z=0) je pevný referenční bod, strop jde nahoru
  // Tím se zajistí: podlaha vždy dole, větší výška = strop jde k hornímu okraji
  const sceneCz = 0;

  // Projekce 3D bodu na 2D canvas
  // sy = c.height*0.78 - rz*scale  →  kladný rz (strop) jde NAHORU na canvasu
  // c.height*0.78 = podlaha (Z=0) kotví poblíž spodního okraje
  function project(wx, wy, wz) {
    const dx = (wx - sceneCx), dy = (wy - sceneCy), dz = wz; // dz = wz - 0
    const rx  = dx * Math.cos(rotY) + dy * Math.sin(rotY);
    const ry2 = -dx * Math.sin(rotY) + dy * Math.cos(rotY);
    const rz  = ry2 * Math.sin(rotX) + dz * Math.cos(rotX);
    const scale = zoom * 1.8;
    return {
      sx: c.width / 2 + rx * scale,
      sy: c.height * 0.78 - rz * scale   // ← klíčová oprava: mínus, ne plus
    };
  }

  const wallHitAreas = [];

  // Painter's algorithm — vzdálenější místnosti první
  const roomsWithDist = PS.rooms.map(room => {
    const mid = room.points.reduce((a,p) => ({x:a.x+p.x, y:a.y+p.y}), {x:0,y:0});
    return { room, dist: mid.x + mid.y };
  }).sort((a,b) => b.dist - a.dist);

  roomsWithDist.forEach(({ room }) => {
    const pts = room.points;
    if (!pts || pts.length < 3) return;
    const col = room.color || '#C8502A';

    // ── Per-room výška stěny (OPRAVA: bylo globální PS.wallHeight) ──
    const hCm = room.wallHeight || PS.wallHeight || 250;

    // Podlaha
    const floorPts = pts.map(p => project(p.x, p.y, 0));
    ctx.beginPath();
    floorPts.forEach((p,i) => i===0 ? ctx.moveTo(p.sx,p.sy) : ctx.lineTo(p.sx,p.sy));
    ctx.closePath();
    ctx.fillStyle = 'rgba(240,237,232,0.18)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1; ctx.stroke();

    // Stěny — výška top-left a top-right z per-vertex h (šikmé stropy)
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i], p2 = pts[(i+1)%pts.length];
      const h1 = p1.h || hCm;  // výška rohu p1
      const h2 = p2.h || hCm;  // výška rohu p2
      const bl = project(p1.x, p1.y, 0);
      const br = project(p2.x, p2.y, 0);
      const tl = project(p1.x, p1.y, h1);   // per-vertex výška!
      const tr = project(p2.x, p2.y, h2);

      // Viditelnost stěny (normála)
      const nx = (p2.y - p1.y);
      const ny = -(p2.x - p1.x);
      const facing = nx * Math.sin(rotY) - ny * Math.cos(rotY);
      if (facing > 0) continue;

      const angle     = Math.atan2(p2.y-p1.y, p2.x-p1.x);
      const lightness = 0.45 + 0.25 * Math.abs(Math.cos(angle - rotY));

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(bl.sx,bl.sy); ctx.lineTo(br.sx,br.sy);
      ctx.lineTo(tr.sx,tr.sy); ctx.lineTo(tl.sx,tl.sy);
      ctx.closePath();
      ctx.clip();

      // Základní fill — obkladová barva
      const wallGrad = ctx.createLinearGradient(tl.sx, tl.sy, bl.sx, bl.sy);
      wallGrad.addColorStop(0, `rgba(200,200,195,${lightness})`);
      wallGrad.addColorStop(1, `rgba(185,182,178,${lightness * 0.75})`);
      ctx.fillStyle = wallGrad;
      ctx.beginPath();
      ctx.moveTo(bl.sx,bl.sy); ctx.lineTo(br.sx,br.sy);
      ctx.lineTo(tr.sx,tr.sy); ctx.lineTo(tl.sx,tl.sy);
      ctx.closePath(); ctx.fill();

      // Spárořez — obkladová mřížka (opravená — rovnoměrná i při šikmém stropě)
      const tileW   = room.tileW || 60;
      const tileH_  = room.tileH || 60;
      const wallLen = Math.hypot(p2.x-p1.x, p2.y-p1.y);
      const maxH    = Math.max(h1, h2);
      const cols = Math.ceil(wallLen / tileW);
      const rows = Math.ceil(maxH / tileH_);
      ctx.strokeStyle = `rgba(255,255,255,0.28)`;
      ctx.lineWidth = 0.6;

      // SVISLÉ čáry — interpolace podél stěny, výška dle skutečného rohu
      for (let col2 = 0; col2 <= cols; col2++) {
        const t = col2 / cols;
        const wx = p1.x + (p2.x - p1.x) * t;
        const wy = p1.y + (p2.y - p1.y) * t;
        const vertH = h1 + (h2 - h1) * t; // výška v tomto bodě stěny
        const pb = project(wx, wy, 0);
        const pt = project(wx, wy, vertH);
        ctx.beginPath();
        ctx.moveTo(pb.sx, pb.sy);
        ctx.lineTo(pt.sx, pt.sy);
        ctx.stroke();
      }

      // VODOROVNÉ čáry — pevná výška od podlahy pomocí project()
      // → nedeformují se při šikmém stropě (sedlová střecha, mansarda)
      for (let row = 0; row <= rows; row++) {
        const z = row * tileH_;
        if (z > maxH) break;
        const pl = project(p1.x, p1.y, z);
        const pr = project(p2.x, p2.y, z);
        ctx.beginPath();
        ctx.moveTo(pl.sx, pl.sy);
        ctx.lineTo(pr.sx, pr.sy);
        ctx.stroke();
      }

      // Otvory ve stěně (okna, dveře, MEP…)
      const wallOpenings = (room.walls?.[i]?.openings) || [];
      wallOpenings.forEach(op => {
        const wLenCm = Math.hypot(p2.x-p1.x, p2.y-p1.y);
        const wallH  = (h1 + h2) / 2;  // průměrná výška stěny pro otvory
        const posT   = (op.posX || 50) / 100;
        const opW    = (op.width  || 80)  / wLenCm;
        const opH    = (op.height || 200) / wallH;
        const opY0   = (op.posY   || 0)   / wallH;

        const t0 = posT - opW/2, t1 = posT + opW/2;
        const v0 = 1 - opY0 - opH, v1 = 1 - opY0;

        const corners = [
          {th:t0,v:v0},{th:t1,v:v0},{th:t1,v:v1},{th:t0,v:v1}
        ].map(({th,v}) => ({
          sx: bl.sx+(br.sx-bl.sx)*th+(tl.sx-bl.sx)*v,
          sy: bl.sy+(br.sy-bl.sy)*th+(tl.sy-bl.sy)*v
        }));

        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        corners.forEach((p,idx) => idx===0 ? ctx.moveTo(p.sx,p.sy) : ctx.lineTo(p.sx,p.sy));
        ctx.closePath(); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';

        ctx.strokeStyle = col; ctx.lineWidth = 1.5;
        ctx.beginPath();
        corners.forEach((p,idx) => idx===0 ? ctx.moveTo(p.sx,p.sy) : ctx.lineTo(p.sx,p.sy));
        ctx.closePath(); ctx.stroke();

        const mcx = (corners[0].sx+corners[2].sx)/2;
        const mcy = (corners[0].sy+corners[2].sy)/2;
        const icons = {okno:'🪟',dvere:'🚪',voda:'💧',odpad:'🔵',elektrika:'⚡',vetrani:'🌀'};
        ctx.fillStyle='rgba(255,255,255,0.7)';
        ctx.font='12px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(icons[op.type]||'⬜', mcx, mcy);
      });

      ctx.restore();

      // Outline stěny
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(bl.sx,bl.sy); ctx.lineTo(br.sx,br.sy);
      ctx.lineTo(tr.sx,tr.sy); ctx.lineTo(tl.sx,tl.sy);
      ctx.closePath(); ctx.stroke();

      // ── Označení stěny — písmeno + délka ──────────────────
      const wallLabel = WALL_LABELS[i % WALL_LABELS.length];
      const wallLenCm = Math.round(Math.hypot(
        pts[(i+1)%pts.length].x - pts[i].x,
        pts[(i+1)%pts.length].y - pts[i].y
      ));
      // Střed stěny — průměr spodní a vrchní hrany
      const midBx = (bl.sx+br.sx)/2, midBy = (bl.sy+br.sy)/2;
      const midTx = (tl.sx+tr.sx)/2, midTy = (tl.sy+tr.sy)/2;
      const midX3 = (midBx+midTx)/2, midY3 = (midBy+midTy)/2;

      // Badge s písmenem stěny
      const col = room.color || '#C8502A';
      const badgeR = 10;
      ctx.save();
      ctx.globalAlpha = 0.92;
      // Kruh pozadí
      ctx.beginPath();
      ctx.arc(midX3, midY3 - 8, badgeR, 0, Math.PI*2);
      ctx.fillStyle = col;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // Písmeno
      ctx.fillStyle = 'white';
      ctx.font = 'bold 11px DM Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(wallLabel, midX3, midY3 - 8);
      // Délka stěny pod odznakem
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      const labelTxt = wallLenCm >= 100 ? (wallLenCm/100).toFixed(1)+'m' : wallLenCm+'cm';
      const tw = ctx.measureText(labelTxt).width + 8;
      if (ctx.roundRect) ctx.roundRect(midX3-tw/2, midY3+4, tw, 13, 3);
      else ctx.rect(midX3-tw/2, midY3+4, tw, 13);
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.font = 'bold 9px DM Sans, sans-serif';
      ctx.fillText(labelTxt, midX3, midY3+11);
      ctx.restore();

      // Výška stěny — label pokud se liší od globální
      if ((room.wallHeight || 0) !== 0 && room.wallHeight !== PS.wallHeight) {
        const hLabelX = (tl.sx+tr.sx)/2, hLabelY = (tl.sy+tr.sy)/2 - 6;
        ctx.fillStyle = 'rgba(255,220,100,0.85)';
        ctx.font = 'bold 9px DM Sans,sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText(`${hCm}cm`, hLabelX, hLabelY);
      }

      wallHitAreas.push({
        roomId: room.id, wallIdx: i,
        poly: [bl,br,tr,tl].map(p => ({x:p.sx,y:p.sy}))
      });
    }

    // Strop — každý vrchol na své per-vertex výšce (šikmé stropy!)
    const ceilPts = pts.map(p => project(p.x, p.y, p.h || hCm));
    ctx.beginPath();
    ceilPts.forEach((p,i) => i===0 ? ctx.moveTo(p.sx,p.sy) : ctx.lineTo(p.sx,p.sy));
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth=1.2; ctx.stroke();
    // Výplň stropu (poloprůhledná)
    ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fill();

    // Štítek místnosti — umístěn nad průměrnou výškou
    const avgVertH = pts.reduce((s,p) => s + (p.h || hCm), 0) / pts.length;
    const labPt = project(
      pts.reduce((s,p)=>s+p.x,0)/pts.length,
      pts.reduce((s,p)=>s+p.y,0)/pts.length,
      avgVertH + 14
    );
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 11px DM Sans,sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    const hasCustomH = pts.some(p => p._customH);
    ctx.fillText(`${room.name} · ${polygonArea(pts).toFixed(1)}m²${hasCustomH ? ' · 🏠šikmý' : ' · '+hCm+'cm'}`, labPt.sx, labPt.sy);
  });

  // HUD — kamera info
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = '10px DM Sans,sans-serif'; ctx.textAlign='left'; ctx.textBaseline='top';
  ctx.fillText(`↕${PS.cam3d.rotX}°  ↔${-PS.cam3d.rotY}°  ×${PS.cam3d.zoom.toFixed(1)}`, 8, 6);

  c._wallHitAreas3d = wallHitAreas;
}

// ── Init 3D interakce (drag pro rotaci) ──
function init3DInteraction() {
  const c = document.getElementById('roomCanvas');
  if (!c) return;
  // Reset flag pokud canvas nemá rozměry (= nový element po re-renderu stránky)
  if (c._3dInit && c._3dInitSize === `${c.width}x${c.height}`) return;
  c._3dInit = true;
  c._3dInitSize = `${c.width}x${c.height}`;

  let drag3 = null, lpTimer3 = null;

  const getP3 = (e) => {
    const r = c.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - r.left, y: src.clientY - r.top };
  };

  // Pinch zoom
  let lastPinch3 = 0, pinch3Active = false;
  c.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      pinch3Active = true;
      lastPinch3 = Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY);
      if (lpTimer3) { clearTimeout(lpTimer3); lpTimer3 = null; }
      e.preventDefault();
    }
  }, { passive: false });
  c.addEventListener('touchmove', (e) => {
    if (!pinch3Active || e.touches.length !== 2) return;
    const d = Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY);
    if (lastPinch3 > 0) PS.cam3d.zoom = Math.max(0.3, Math.min(4, PS.cam3d.zoom * (d/lastPinch3)));
    lastPinch3 = d;
    render3D();
    e.preventDefault();
  }, { passive: false });
  c.addEventListener('touchend', (e) => { if (e.touches.length < 2) { pinch3Active = false; lastPinch3 = 0; } });

  c.addEventListener('wheel', (e) => {
    e.preventDefault();
    PS.cam3d.zoom = Math.max(0.3, Math.min(4, PS.cam3d.zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
    render3D();
  }, { passive: false });

  c.addEventListener('pointerdown', (e) => {
    if (pinch3Active) return;
    const {x, y} = getP3(e);
    drag3 = { sx: x, sy: y, rx: PS.cam3d.rotX, ry: PS.cam3d.rotY };
    c.setPointerCapture(e.pointerId);

    // Long-press → otevřít menu otvoru na stěně
    lpTimer3 = setTimeout(() => {
      lpTimer3 = null;
      if (!drag3 || (Math.hypot(x - drag3.sx, y - drag3.sy) < 10)) {
        // Najít stěnu pod prstem
        const areas = c._wallHitAreas3d || [];
        for (const area of areas) {
          if (pointInPolygon({x, y}, area.poly)) {
            if (navigator.vibrate) navigator.vibrate([30,50,30]);
            openWallOpeningsModal(area.roomId, area.wallIdx);
            drag3 = null;
            return;
          }
        }
      }
    }, 600);

    e.preventDefault();
  });

  c.addEventListener('pointermove', (e) => {
    if (!drag3 || pinch3Active) return;
    const {x, y} = getP3(e);
    const dx = x - drag3.sx, dy = y - drag3.sy;
    if (Math.hypot(dx, dy) > 5 && lpTimer3) { clearTimeout(lpTimer3); lpTimer3 = null; }
    PS.cam3d.rotY = drag3.ry + dx * 0.4;
    PS.cam3d.rotX = Math.max(5, Math.min(75, drag3.rx - dy * 0.3));
    render3D();
    e.preventDefault();
  });

  c.addEventListener('pointerup', () => {
    if (lpTimer3) { clearTimeout(lpTimer3); lpTimer3 = null; }
    drag3 = null;
  });
}

// ═══════════════════════════════════════════
// MODAL — Otvory ve stěně
// ═══════════════════════════════════════════
const OPENING_TYPES = [
  { id:'okno',      icon:'🪟', label:'Okno',     defW:90,  defH:120, defY:90  },
  { id:'dvere',     icon:'🚪', label:'Dveře',    defW:80,  defH:200, defY:0   },
  { id:'voda',      icon:'💧', label:'Voda',     defW:10,  defH:10,  defY:50  },
  { id:'odpad',     icon:'🔵', label:'Odpad',    defW:10,  defH:10,  defY:0   },
  { id:'elektrika', icon:'⚡', label:'Elektrika',defW:8,   defH:8,   defY:130 },
  { id:'vetrani',   icon:'🌀', label:'Větrání',  defW:20,  defH:20,  defY:220 },
];

function openWallOpeningsModal(roomId, wallIdx) {
  const room = PS.rooms.find(r => r.id === roomId);
  if (!room) return;
  if (!room.walls) room.walls = [];
  if (!room.walls[wallIdx]) room.walls[wallIdx] = {};
  if (!room.walls[wallIdx].openings) room.walls[wallIdx].openings = [];

  const openings = room.walls[wallIdx].openings;
  const wallName = WALL_LABELS[wallIdx] || wallIdx;
  const wallLen = Math.round(Math.hypot(
    (room.points[(wallIdx+1)%room.points.length].x - room.points[wallIdx].x),
    (room.points[(wallIdx+1)%room.points.length].y - room.points[wallIdx].y)
  ));

  document.getElementById('wallOpeningsModal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'wallOpeningsModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:600;display:flex;align-items:flex-end;padding:0';
  modal.innerHTML = `
    <div style="background:var(--surface);border-radius:20px 20px 0 0;padding:1.2rem;width:100%;max-height:88vh;overflow-y:auto">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
        <div>
          <div style="font-family:'DM Serif Display',serif;font-size:1.2rem">🪟 Stěna ${wallName}</div>
          <div style="font-size:0.75rem;color:var(--text2)">délka ${wallLen} cm · výška ${PS.wallHeight} cm</div>
        </div>
        <button onclick="document.getElementById('wallOpeningsModal').remove()" style="background:var(--surface2);border:none;border-radius:50%;width:34px;height:34px;font-size:1.2rem;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>
      </div>

      <!-- Přidat nový otvor -->
      <div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--text2);margin-bottom:0.5rem">Přidat otvor</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.4rem;margin-bottom:1rem">
        ${OPENING_TYPES.map(t => `
          <button onclick="addOpening('${roomId}',${wallIdx},'${t.id}')"
            style="display:flex;flex-direction:column;align-items:center;gap:0.2rem;padding:0.7rem 0.4rem;border-radius:10px;border:1.5px solid var(--border);background:var(--surface2);cursor:pointer;font-family:inherit">
            <span style="font-size:1.5rem">${t.icon}</span>
            <span style="font-size:0.72rem;font-weight:600;color:var(--text)">${t.label}</span>
          </button>
        `).join('')}
      </div>

      <!-- Seznam stávajících otvorů -->
      <div id="openingsList_${roomId}_${wallIdx}">
        ${renderOpeningsList(roomId, wallIdx)}
      </div>
    </div>`;

  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

function renderOpeningsList(roomId, wallIdx) {
  const room = PS.rooms.find(r => r.id === roomId);
  const openings = room?.walls?.[wallIdx]?.openings || [];
  if (openings.length === 0) return `<div style="text-align:center;color:var(--text2);font-size:0.85rem;padding:1rem">Žádné otvory</div>`;

  return openings.map((op, idx) => {
    const t = OPENING_TYPES.find(t=>t.id===op.type) || OPENING_TYPES[0];
    return `
      <div style="background:var(--surface2);border-radius:10px;padding:0.8rem;margin-bottom:0.5rem">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.6rem">
          <div style="font-weight:700">${t.icon} ${t.label}</div>
          <button onclick="deleteOpening('${roomId}',${wallIdx},${idx})"
            style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca;border-radius:6px;padding:0.2rem 0.5rem;cursor:pointer;font-size:0.75rem">🗑️</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.4rem;font-size:0.78rem">
          <div>
            <label style="color:var(--text2);display:block;margin-bottom:2px">Šířka (cm)</label>
            <input type="number" value="${op.width||80}" min="5" max="500"
              style="width:100%;padding:0.3rem;border:1px solid var(--border);border-radius:6px;font-family:inherit"
              onchange="updateOpening('${roomId}',${wallIdx},${idx},'width',this.value)">
          </div>
          <div>
            <label style="color:var(--text2);display:block;margin-bottom:2px">Výška (cm)</label>
            <input type="number" value="${op.height||120}" min="5" max="${PS.wallHeight}"
              style="width:100%;padding:0.3rem;border:1px solid var(--border);border-radius:6px;font-family:inherit"
              onchange="updateOpening('${roomId}',${wallIdx},${idx},'height',this.value)">
          </div>
          <div>
            <label style="color:var(--text2);display:block;margin-bottom:2px">Spodní okraj (cm)</label>
            <input type="number" value="${op.posY||0}" min="0" max="${PS.wallHeight}"
              style="width:100%;padding:0.3rem;border:1px solid var(--border);border-radius:6px;font-family:inherit"
              onchange="updateOpening('${roomId}',${wallIdx},${idx},'posY',this.value)">
          </div>
          <div style="grid-column:span 3">
            <label style="color:var(--text2);display:block;margin-bottom:2px">Poloha na stěně (%) — střed</label>
            <input type="range" value="${op.posX||50}" min="5" max="95"
              style="width:100%"
              oninput="updateOpening('${roomId}',${wallIdx},${idx},'posX',this.value);this.nextElementSibling.textContent=this.value+'%'"
            ><span style="font-size:0.75rem;color:var(--text2)">${op.posX||50}%</span>
          </div>
        </div>
      </div>`;
  }).join('');
}

function addOpening(roomId, wallIdx, type) {
  const room = PS.rooms.find(r => r.id === roomId);
  if (!room) return;
  if (!room.walls) room.walls = [];
  if (!room.walls[wallIdx]) room.walls[wallIdx] = {};
  if (!room.walls[wallIdx].openings) room.walls[wallIdx].openings = [];

  const t = OPENING_TYPES.find(t=>t.id===type) || OPENING_TYPES[0];
  room.walls[wallIdx].openings.push({ type, width:t.defW, height:t.defH, posX:50, posY:t.defY });

  const el = document.getElementById(`openingsList_${roomId}_${wallIdx}`);
  if (el) el.innerHTML = renderOpeningsList(roomId, wallIdx);
  if (PS.view3d) render3D();
  updateRoomList();
  toast(`${t.icon} ${t.label} přidán${type==='elektrika'?'a':''}`);
}

function updateOpening(roomId, wallIdx, opIdx, field, val) {
  const room = PS.rooms.find(r => r.id === roomId);
  if (!room?.walls?.[wallIdx]?.openings?.[opIdx]) return;
  room.walls[wallIdx].openings[opIdx][field] = parseFloat(val);
  if (PS.view3d) render3D();
}

function deleteOpening(roomId, wallIdx, opIdx) {
  const room = PS.rooms.find(r => r.id === roomId);
  if (!room?.walls?.[wallIdx]?.openings) return;
  room.walls[wallIdx].openings.splice(opIdx, 1);
  const el = document.getElementById(`openingsList_${roomId}_${wallIdx}`);
  if (el) el.innerHTML = renderOpeningsList(roomId, wallIdx);
  if (PS.view3d) render3D();
  updateRoomList();
}

// ── Přidat bod na stěnu (klik na úsečku stěny) ──
function getClickedWallEdge(px, py) {
  for (const room of PS.rooms) {
    const pts = room.points;
    for (let i = 0; i < pts.length; i++) {
      const p1 = worldToCanvas(pts[i].x, pts[i].y);
      const p2 = worldToCanvas(pts[(i+1)%pts.length].x, pts[(i+1)%pts.length].y);
      const d = distPointSegment(px, py, p1.x, p1.y, p2.x, p2.y);
      if (d < 10) return { room, idx: i };
    }
  }
  return null;
}

function distPointSegment(px, py, ax, ay, bx, by) {
  const dx = bx-ax, dy = by-ay;
  const len2 = dx*dx+dy*dy;
  if (len2 === 0) return Math.hypot(px-ax, py-ay);
  const t = Math.max(0, Math.min(1, ((px-ax)*dx+(py-ay)*dy)/len2));
  return Math.hypot(px-(ax+t*dx), py-(ay+t*dy));
}

// Výpočet ploch stěn s odečtením otvorů (pro nabídku)
function getRoomWallAreaM2(room) {
  const walls = getWalls(room);
  const hM = PS.wallHeight / 100;
  let total = 0;
  walls.forEach((w, i) => {
    const wallArea = (w.length_cm / 100) * hM;
    const openings = room.walls?.[i]?.openings || [];
    const openArea = openings.reduce((s, op) => s + (op.width/100)*(op.height/100), 0);
    total += Math.max(0, wallArea - openArea);
  });
  return total;
}

// ── Tužka s auto-snap linií ──
function initDrawCanvas() {
  const c = document.getElementById('drawCanvas');
  if (!c) return;
  if (c._initialized) return;
  c._initialized = true;
  c.width = c.clientWidth || 360;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,c.width,c.height);
  drawGrid(ctx, c.width, c.height);

  const getP = (e) => {
    const r = c.getBoundingClientRect();
    const sx = c.width/r.width, sy = c.height/r.height;
    const src = e.touches ? e.touches[0] : e;
    return { x: (src.clientX-r.left)*sx, y: (src.clientY-r.top)*sy };
  };

  // Pencil buffer pro smooth snap
  let pencilPoints = [];
  const SNAP_THRESH = 10; // px, úhel snap

  c.addEventListener('pointerdown', (e) => {
    const pos = getP(e);
    PS.drawDrawing = true;
    PS.drawStartX = pos.x; PS.drawStartY = pos.y;
    PS.drawSnapshot = ctx.getImageData(0,0,c.width,c.height);
    pencilPoints = [{x:pos.x, y:pos.y}];

    if (PS.tool === 'text') {
      const txt = prompt('Text:');
      if (txt) {
        drawSaveUndo(c);
        ctx.font = `bold ${PS.drawSize*4+10}px DM Sans, sans-serif`;
        ctx.fillStyle = PS.drawColor; ctx.textAlign='left';
        ctx.fillText(txt, pos.x, pos.y);
      }
      PS.drawDrawing = false; return;
    }
    if (PS.tool === 'symbol' && PS.symbol) {
      drawSaveUndo(c);
      const sym = SYMBOLS[PS.symbol];
      if (sym) sym.draw(ctx, pos.x, pos.y, PS.drawSize*5+15);
      PS.drawDrawing = false; return;
    }
    if (PS.tool === 'pencil' || PS.tool === 'eraser') {
      drawSaveUndo(c);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
    e.preventDefault();
  });

  c.addEventListener('pointermove', (e) => {
    if (!PS.drawDrawing) return;
    const pos = getP(e);
    const t = PS.tool;

    if (t === 'pencil') {
      pencilPoints.push({x:pos.x,y:pos.y});
      // Snap to horizontal/vertical if nearly straight
      const dx = pos.x - PS.drawStartX, dy = pos.y - PS.drawStartY;
      let drawX = pos.x, drawY = pos.y;
      if (e.shiftKey || Math.abs(dy) < SNAP_THRESH) { drawY = PS.drawStartY; }
      else if (Math.abs(dx) < SNAP_THRESH) { drawX = PS.drawStartX; }
      ctx.strokeStyle = PS.drawColor; ctx.lineWidth = PS.drawSize;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.lineTo(drawX, drawY); ctx.stroke();
    } else if (t === 'eraser') {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = PS.drawSize*6;
      ctx.lineCap='round'; ctx.lineJoin='round';
      ctx.lineTo(pos.x, pos.y); ctx.stroke();
    } else if (t==='line'||t==='rect'||t==='circle') {
      ctx.putImageData(PS.drawSnapshot, 0, 0);
      ctx.strokeStyle = PS.drawColor; ctx.lineWidth = PS.drawSize; ctx.setLineDash([]);
      // Angle snap on Shift
      let ex = pos.x, ey = pos.y;
      if (e.shiftKey && t==='line') { const r = snapAngle(PS.drawStartX,PS.drawStartY,pos.x,pos.y); ex=r.x; ey=r.y; }
      if (e.shiftKey && t==='rect') { const s=Math.max(Math.abs(ex-PS.drawStartX),Math.abs(ey-PS.drawStartY)); ex=PS.drawStartX+(ex>PS.drawStartX?s:-s); ey=PS.drawStartY+(ey>PS.drawStartY?s:-s); }
      if (t==='line') {
        ctx.beginPath(); ctx.moveTo(PS.drawStartX,PS.drawStartY); ctx.lineTo(ex,ey); ctx.stroke();
        const dl = Math.round(Math.hypot(ex-PS.drawStartX,ey-PS.drawStartY));
        ctx.font='10px sans-serif'; ctx.fillStyle='#888'; ctx.textAlign='center';
        ctx.fillText(dl+'px',  (PS.drawStartX+ex)/2, (PS.drawStartY+ey)/2-6);
      } else if (t==='rect') {
        ctx.fillStyle='rgba(200,80,42,0.05)';
        ctx.fillRect(PS.drawStartX,PS.drawStartY,ex-PS.drawStartX,ey-PS.drawStartY);
        ctx.strokeRect(PS.drawStartX,PS.drawStartY,ex-PS.drawStartX,ey-PS.drawStartY);
      } else if (t==='circle') {
        const rx=Math.abs(ex-PS.drawStartX)/2,ry=Math.abs(ey-PS.drawStartY)/2;
        const ccx=(PS.drawStartX+ex)/2, ccy=(PS.drawStartY+ey)/2;
        ctx.fillStyle='rgba(200,80,42,0.05)';
        ctx.beginPath(); ctx.ellipse(ccx,ccy,rx,ry,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
      }
    }
    e.preventDefault();
  });

  c.addEventListener('pointerup', () => {
    if (!PS.drawDrawing) return;
    PS.drawDrawing = false;

    // Auto-close: pokud tužka — zkontroluj jestli uzavírá plochu
    if (PS.tool === 'pencil' && pencilPoints.length > 10) {
      const first = pencilPoints[0], last = pencilPoints[pencilPoints.length-1];
      if (Math.hypot(last.x-first.x, last.y-first.y) < 20) {
        // Uzavřít: doplnit čáru k prvnímu bodu
        ctx.lineTo(first.x, first.y); ctx.stroke();
        ctx.fillStyle = 'rgba(200,80,42,0.07)';
        ctx.beginPath();
        pencilPoints.forEach((p,i) => i===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y));
        ctx.closePath(); ctx.fill();
        toast('✓ Uzavřená plocha — kresba sjednocena');
      }
    }
    if (PS.tool==='line'||PS.tool==='rect'||PS.tool==='circle') drawSaveUndo(c);
    pencilPoints = [];
  });
  c.addEventListener('pointerleave', () => { PS.drawDrawing = false; pencilPoints=[]; });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey||e.metaKey) && e.key==='z') { e.preventDefault(); undoDraw(); }
    if ((e.ctrlKey||e.metaKey) && e.key==='y') { e.preventDefault(); redoDraw(); }
  });
}

function drawSaveUndo(c) {
  PS.drawHistory.push(c.getContext('2d').getImageData(0,0,c.width,c.height));
  if (PS.drawHistory.length > 30) PS.drawHistory.shift();
  PS.drawRedoStack = [];
}
function undoDraw() {
  const c = document.getElementById('drawCanvas'); if (!c||!PS.drawHistory.length) return;
  PS.drawRedoStack.push(c.getContext('2d').getImageData(0,0,c.width,c.height));
  c.getContext('2d').putImageData(PS.drawHistory.pop(),0,0);
}
function redoDraw() {
  const c = document.getElementById('drawCanvas'); if (!c||!PS.drawRedoStack.length) return;
  PS.drawHistory.push(c.getContext('2d').getImageData(0,0,c.width,c.height));
  c.getContext('2d').putImageData(PS.drawRedoStack.pop(),0,0);
}
function clearDraw() {
  const c = document.getElementById('drawCanvas'); if (!c) return;
  drawSaveUndo(c);
  const ctx = c.getContext('2d');
  ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,c.width,c.height);
  drawGrid(ctx,c.width,c.height);
}
function drawGrid(ctx, w, h) {
  ctx.strokeStyle='#f0ede8'; ctx.lineWidth=0.5;
  for (let x=0;x<=w;x+=20){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
  for (let y=0;y<=h;y+=20){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
}
function setTool(t) {
  PS.tool = t;
  document.querySelectorAll('[id^="toolBtn_"]').forEach(b => {
    const a = b.id==='toolBtn_'+t;
    b.style.border='2px solid '+(a?'var(--accent)':'var(--border)');
    b.style.background=a?'#fff5f2':'var(--surface)';
  });
  const sym = document.getElementById('symbolPanel');
  if (sym) sym.style.display = t==='symbol'?'flex':'none';
}
function setColor(c) { PS.drawColor=c; }
function setSize(s) { PS.drawSize=s; }
function setSymbol(k) { PS.symbol=k; PS.tool='symbol'; }
function savePudorysImg(canvasId) {
  const c = document.getElementById(canvasId||'roomCanvas'); if (!c) return;
  const a = document.createElement('a');
  a.download='pudorys_'+new Date().toISOString().slice(0,10)+'.png';
  a.href = c.toDataURL('image/png'); a.click();
  toast('Uloženo jako PNG');
}
function drawRoomGuide() {}
function drawRoom() {}
// ╔══════════════════════════════════════════════════════════╗
//  OPRAVY & CHYBĚJÍCÍ FUNKCE — v13
// ╔══════════════════════════════════════════════════════════╝

// ── 1. Výška stěny per-místnost (CHYBĚLO) ──────────────────
function setRoomHeight(roomId, value) {
  const room = PS.rooms.find(r => r.id === roomId);
  if (!room) return;
  const h = Math.max(100, Math.min(600, parseInt(value) || 250));
  room.wallHeight = h;
  // Synchronizuj všechny rohy na novou výšku pokud nebyly individuálně nastaveny
  room.points.forEach(pt => { if (!pt._customH) pt.h = h; });
  const mEl = document.querySelector(`[data-height-m="${roomId}"]`);
  if (mEl) mEl.textContent = `= ${(h/100).toFixed(2)} m`;
  PS.view3d ? (_raf3d=null, render3D()) : renderRoomCanvas();
}

// ── Per-vertex výška (šikmé stropy) ───────────────────────
function setVertexHeight(roomId, ptIdx, value) {
  const room = PS.rooms.find(r => r.id === roomId);
  if (!room || !room.points[ptIdx]) return;
  const h = Math.max(50, Math.min(600, parseInt(value) || 250));
  room.points[ptIdx].h = h;
  room.points[ptIdx]._customH = true;
  // Okamžitý re-render — zruš čekající frame aby se nehromadily
  _raf3d = null;
  if (PS.view3d) render3D(); else renderRoomCanvas();
}

function setAllVertexHeights(roomId, height) {
  const room = PS.rooms.find(r => r.id === roomId);
  if (!room) return;
  const h = Math.max(50, Math.min(600, parseInt(height) || 250));
  room.points.forEach(pt => { pt.h = h; pt._customH = false; });
  PS.view3d ? (_raf3d=null, render3D()) : renderRoomCanvas();
  render(); // refresh panel
}

function setRoofProfile(roomId, type) {
  const room = PS.rooms.find(r => r.id === roomId);
  if (!room) return;
  const baseH = room.wallHeight || PS.wallHeight || 250;
  const pts = room.points;
  const n = pts.length;

  if (type === 'pulkruh') {
    // Sedlová střecha — první a poslední bod nízké, prostřední bod vysoké
    pts.forEach((pt, i) => {
      const t = i / (n - 1); // 0..1
      const sinus = Math.sin(t * Math.PI); // 0→1→0
      pt.h = Math.round(baseH * 0.6 + baseH * 0.6 * sinus);
      pt._customH = true;
    });
  } else if (type === 'mansarda') {
    // Mansarda — krajní body nízké, střed vyšší a plochý
    pts.forEach((pt, i) => {
      const t = i / (n - 1);
      if (t < 0.2 || t > 0.8) pt.h = Math.round(baseH * 0.55); // nízké stěny
      else pt.h = baseH;                                          // plná výška
      pt._customH = true;
    });
  }
  PS.view3d ? (_raf3d=null, render3D()) : renderRoomCanvas();
  render();
}

// ── 2. MEP Modal — Rozvody ve stěně (CHYBĚLO) ──────────────
function openMepModal(roomId, wallIdx) {
  const room = PS.rooms.find(r => r.id === roomId);
  if (!room) return;
  if (!room.wallMep) room.wallMep = {};
  if (!room.wallMep[wallIdx]) room.wallMep[wallIdx] = [];

  const walls = getWalls(room);
  const wall  = walls[wallIdx];
  const meps  = room.wallMep[wallIdx];

  // Skupiny MEP typů
  const catHtml = Object.entries(MEP_CATS).map(([catId, cat]) => {
    const typy = MEP_TYPES.filter(t => t.cat === catId);
    return `<div style="margin-bottom:0.7rem">
      <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;
        color:var(--text2);margin-bottom:0.3rem">${cat.icon} ${cat.label}</div>
      <div style="display:flex;flex-wrap:wrap;gap:0.3rem">
        ${typy.map(t => `
          <button onclick="mepPridatDoSteny('${roomId}',${wallIdx},'${t.id}')"
            style="padding:0.3rem 0.55rem;border-radius:8px;border:2px solid ${t.color};
              background:white;color:${t.color};cursor:pointer;font-size:0.78rem;font-weight:600">
            ${t.icon} ${t.label}
          </button>`).join('')}
      </div>
    </div>`;
  }).join('');

  const mepListHtml = meps.length === 0
    ? `<div style="color:var(--text2);font-size:0.82rem;text-align:center;padding:0.5rem">Žádné rozvody. Přidej níže.</div>`
    : meps.map((m, mi) => {
        const typ = MEP_TYPES.find(t => t.id === m.type) || MEP_TYPES[0];
        return `<div style="display:flex;align-items:center;gap:0.5rem;padding:0.45rem 0.6rem;
          border-radius:8px;background:${typ.color}18;border:1.5px solid ${typ.color}44;margin-bottom:0.3rem">
          <span style="font-size:1rem">${typ.icon}</span>
          <div style="flex:1">
            <div style="font-weight:600;font-size:0.82rem;color:${typ.color}">${typ.label}</div>
            <div style="font-size:0.72rem;color:var(--text2)">
              Pos: ${m.posX||50}% · Výška: ${m.posY||100} cm
              ${m.horiz?'· vodorovný':''}${m.vert?'· svislý přívod':''}
              ${m.label?'· '+m.label:''}
            </div>
          </div>
          <button onclick="mepEditovat('${roomId}',${wallIdx},${mi})"
            style="padding:0.2rem 0.4rem;border:1px solid var(--border);border-radius:6px;background:white;cursor:pointer;font-size:0.75rem">✏️</button>
          <button onclick="mepSmazat('${roomId}',${wallIdx},${mi})"
            style="padding:0.2rem 0.4rem;border:1px solid #fecaca;border-radius:6px;background:#fef2f2;color:#dc2626;cursor:pointer;font-size:0.75rem">✕</button>
        </div>`;
      }).join('');

  const html = `
    <div style="position:fixed;inset:0;z-index:1200;background:rgba(0,0,0,0.5)" id="mep-overlay" onclick="event.target===this&&closeMepModal()">
      <div style="position:absolute;bottom:0;left:0;right:0;background:var(--surface);border-radius:20px 20px 0 0;
        padding:1.2rem;max-height:88vh;overflow-y:auto">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.9rem">
          <div>
            <div style="font-weight:700;font-size:1rem">⚡ Rozvody ve stěně ${wall?.label||wallIdx+1}</div>
            <div style="font-size:0.75rem;color:var(--text2)">${room.name} · délka ${wall?.length_cm||'?'} cm</div>
          </div>
          <button onclick="closeMepModal()" style="background:none;border:none;font-size:1.4rem;cursor:pointer;line-height:1">✕</button>
        </div>

        <!-- Existující rozvody -->
        <div style="margin-bottom:0.9rem">
          <div style="font-size:0.78rem;font-weight:600;color:var(--accent);margin-bottom:0.4rem">
            📋 Aktuální rozvody (${meps.length})
          </div>
          ${mepListHtml}
        </div>

        <!-- Přidat nový -->
        <div style="font-size:0.78rem;font-weight:600;color:var(--text2);margin-bottom:0.4rem">➕ Přidat rozvod do stěny:</div>
        ${catHtml}

        <!-- Editor nového MEP -->
        <div id="mep-editor" style="display:none;background:var(--surface2);border-radius:12px;padding:0.9rem;margin-top:0.5rem">
          <div id="mep-editor-title" style="font-weight:700;margin-bottom:0.7rem;color:var(--accent)"></div>
          <div class="field-row">
            <div class="field"><label>Poloha vodorovně (%)</label>
              <input type="range" id="mep_posX" min="5" max="95" value="50" style="width:100%" oninput="document.getElementById('mep_posX_v').textContent=this.value+'%'">
              <span id="mep_posX_v" style="font-size:0.78rem;color:var(--accent)">50%</span>
            </div>
            <div class="field"><label>Výška od podlahy (cm)</label>
              <input type="number" id="mep_posY" value="100" min="0" max="300" style="width:100%">
            </div>
          </div>
          <div class="field"><label>Popisek (volitelný)</label>
            <input id="mep_label" placeholder="Přívod vody do WC...">
          </div>
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.5rem">
            <label style="display:flex;align-items:center;gap:0.3rem;font-size:0.82rem;cursor:pointer">
              <input type="checkbox" id="mep_horiz"> Vodorovný rozvod (celá délka)
            </label>
            <label style="display:flex;align-items:center;gap:0.3rem;font-size:0.82rem;cursor:pointer">
              <input type="checkbox" id="mep_vert"> Svislý přívod (od podlahy)
            </label>
          </div>
          <div style="display:flex;gap:0.5rem">
            <button class="btn btn-primary" style="flex:1" id="mep-save-btn" onclick="mepUlozit()">💾 Přidat</button>
            <button class="btn btn-secondary" onclick="document.getElementById('mep-editor').style.display='none'">Zrušit</button>
          </div>
        </div>

        <div style="height:1rem"></div>
      </div>
    </div>`;

  const div = document.createElement('div');
  div.id = 'mep-modal-host';
  div.innerHTML = html;
  document.body.appendChild(div);

  // State pro aktuální edit
  window._mepCtx = { roomId, wallIdx, editIdx: null, typId: null };
}

function closeMepModal() {
  document.getElementById('mep-modal-host')?.remove();
  renderRoomCanvas();
}

function mepPridatDoSteny(roomId, wallIdx, typId) {
  window._mepCtx = { roomId, wallIdx, editIdx: null, typId };
  const typ = MEP_TYPES.find(t => t.id === typId);
  const ed = document.getElementById('mep-editor');
  const title = document.getElementById('mep-editor-title');
  if (!ed || !title) return;
  title.textContent = `${typ.icon} ${typ.label}`;
  title.style.color = typ.color;
  ed.style.display = 'block';
  document.getElementById('mep_posX').value = 50;
  document.getElementById('mep_posX_v').textContent = '50%';
  document.getElementById('mep_posY').value = 100;
  document.getElementById('mep_label').value = '';
  document.getElementById('mep_horiz').checked = false;
  document.getElementById('mep_vert').checked = true;
  document.getElementById('mep-save-btn').textContent = '💾 Přidat';
  ed.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function mepEditovat(roomId, wallIdx, idx) {
  const room = PS.rooms.find(r => r.id === roomId);
  const m = room?.wallMep?.[wallIdx]?.[idx];
  if (!m) return;
  window._mepCtx = { roomId, wallIdx, editIdx: idx, typId: m.type };
  const typ = MEP_TYPES.find(t => t.id === m.type);
  const ed = document.getElementById('mep-editor');
  if (!ed) return;
  document.getElementById('mep-editor-title').textContent = `${typ.icon} ${typ.label} — Editace`;
  document.getElementById('mep_posX').value = m.posX ?? 50;
  document.getElementById('mep_posX_v').textContent = (m.posX ?? 50) + '%';
  document.getElementById('mep_posY').value = m.posY ?? 100;
  document.getElementById('mep_label').value = m.label || '';
  document.getElementById('mep_horiz').checked = !!m.horiz;
  document.getElementById('mep_vert').checked = !!m.vert;
  document.getElementById('mep-save-btn').textContent = '💾 Uložit změny';
  ed.style.display = 'block';
}

function mepUlozit() {
  const ctx = window._mepCtx;
  if (!ctx?.typId) return;
  const room = PS.rooms.find(r => r.id === ctx.roomId);
  if (!room) return;
  if (!room.wallMep) room.wallMep = {};
  if (!room.wallMep[ctx.wallIdx]) room.wallMep[ctx.wallIdx] = [];

  const item = {
    type:  ctx.typId,
    posX:  parseInt(document.getElementById('mep_posX')?.value) || 50,
    posY:  parseInt(document.getElementById('mep_posY')?.value) || 100,
    label: document.getElementById('mep_label')?.value?.trim() || '',
    horiz: document.getElementById('mep_horiz')?.checked || false,
    vert:  document.getElementById('mep_vert')?.checked || false,
  };

  if (ctx.editIdx !== null) {
    room.wallMep[ctx.wallIdx][ctx.editIdx] = item;
    toast('Rozvod upraven');
  } else {
    room.wallMep[ctx.wallIdx].push(item);
    toast('Rozvod přidán');
  }

  closeMepModal();
  openMepModal(ctx.roomId, ctx.wallIdx); // znovu otevřít se zaktualizovaným listem
}

function mepSmazat(roomId, wallIdx, idx) {
  const room = PS.rooms.find(r => r.id === roomId);
  if (!room?.wallMep?.[wallIdx]) return;
  room.wallMep[wallIdx].splice(idx, 1);
  closeMepModal();
  openMepModal(roomId, wallIdx);
}

// ── 3. MEP na podlaze — rozvody skrze místnost ─────────────
// Každá místnost má pole floorMep: [{type, x, y, rotation, label}]
function addFloorMep(roomId, typId, x, y) {
  const room = PS.rooms.find(r => r.id === roomId);
  if (!room) return;
  if (!room.floorMep) room.floorMep = [];
  room.floorMep.push({ type: typId, x, y, rotation: 0, label: '', id: 'fm'+Date.now() });
  renderRoomCanvas();
}

// ── 4. COTOVÁNÍ — rozměrové kóty ───────────────────────────
// Kóty jsou uloženy v PS.koty = [{id, p1:{x,y}, p2:{x,y}, offset:30, text:null}]

function toggleKotaTool() {
  if (PS.tool === 'kota') {
    PS.tool = 'polygon';
    PS.kotaDrawing = { active: false, p1: null };
  } else {
    PS.tool = 'kota';
    PS.kotaDrawing = { active: false, p1: null };
    toast('Klikni na první bod kóty');
  }
  renderRoomCanvas();
}

function smazatKotu(id) {
  PS.koty = PS.koty.filter(k => k.id !== id);
  renderRoomCanvas();
}

function drawKoty2D(ctx) {
  if (!PS.showDim || !PS.koty || !PS.koty.length) return;
  PS.koty.forEach(k => {
    const p1s = worldToCanvas(k.p1.x, k.p1.y);
    const p2s = worldToCanvas(k.p2.x, k.p2.y);
    const dx = p2s.x - p1s.x, dy = p2s.y - p1s.y;
    const len = Math.sqrt(dx*dx + dy*dy);
    if (len < 5) return;

    const nx = -dy/len, ny = dx/len; // kolmice
    const off = k.offset || 25; // px offset

    // Pomocné čáry (extenze)
    const ext = 8;
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1; ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(p1s.x + nx*(off-ext), p1s.y + ny*(off-ext));
    ctx.lineTo(p1s.x + nx*(off+ext), p1s.y + ny*(off+ext));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p2s.x + nx*(off-ext), p2s.y + ny*(off-ext));
    ctx.lineTo(p2s.x + nx*(off+ext), p2s.y + ny*(off+ext));
    ctx.stroke();

    // Kótová čára s šipkami
    const x1 = p1s.x + nx*off, y1 = p1s.y + ny*off;
    const x2 = p2s.x + nx*off, y2 = p2s.y + ny*off;
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();

    // Šipky
    const ux = dx/len, uy = dy/len;
    const arw = 6;
    [[x1,y1,ux,uy],[x2,y2,-ux,-uy]].forEach(([ax,ay,avx,avy]) => {
      ctx.beginPath();
      ctx.moveTo(ax,ay);
      ctx.lineTo(ax + avx*arw - avy*arw*0.35, ay + avy*arw + avx*arw*0.35);
      ctx.moveTo(ax,ay);
      ctx.lineTo(ax + avx*arw + avy*arw*0.35, ay + avy*arw - avx*arw*0.35);
      ctx.stroke();
    });

    // Text s hodnotou
    const distCm = Math.round(Math.sqrt((k.p2.x-k.p1.x)**2+(k.p2.y-k.p1.y)**2));
    const label = k.text || (distCm < 100 ? distCm+'cm' : (distCm/100).toFixed(2)+'m');
    const mx = (x1+x2)/2, my = (y1+y2)/2;
    const angle = Math.atan2(dy, dx);
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(angle);
    ctx.fillStyle = 'white'; ctx.strokeStyle = '#475569'; ctx.lineWidth = 0.5;
    ctx.font = 'bold 10px DM Sans,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    const tw = ctx.measureText(label).width + 6;
    ctx.fillRect(-tw/2, -13, tw, 12);
    ctx.strokeRect(-tw/2, -13, tw, 12);
    ctx.fillStyle = '#1e293b';
    ctx.fillText(label, 0, -2);
    ctx.restore();
  });
}

// ── 5. PRŮŘEZ (Cross-section) ───────────────────────────────

function togglePrusrez() {
  _prusrezState.active = !_prusrezState.active;
  renderRoomCanvas();
  const btn = document.getElementById('btn-prusrez');
  if (btn) btn.style.background = _prusrezState.active ? 'var(--accent)' : '';
}

function renderPrusrez(c, ctx) {
  // Najdi všechny místnosti
  const rooms = PS.rooms.filter(r => r.points && r.points.length >= 3);
  if (!rooms.length) return;

  // Bounding box všech místností (v cm)
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  rooms.forEach(r => r.points.forEach(p => {
    minX=Math.min(minX,p.x); maxX=Math.max(maxX,p.x);
    minY=Math.min(minY,p.y); maxY=Math.max(maxY,p.y);
  }));

  const W = c.width, H = c.height;
  const margin = 40;
  const drawW = W - 2*margin, drawH = H - 2*margin - 40;

  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#f8fafc'; ctx.fillRect(0,0,W,H);

  // Záhlaví
  ctx.fillStyle='#1e293b'; ctx.font='bold 13px DM Sans,sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='top';
  ctx.fillText(`Průřez — ${_prusrezState.axis==='h'?'vodorovný':'svislý'} řez`, W/2, 10);
  ctx.font='10px DM Sans,sans-serif'; ctx.fillStyle='#64748b';
  ctx.fillText('Klikni na Průřez znovu pro vypnutí', W/2, 26);

  const totalH = maxX - minX; // šíře budovy (cm) pro vodorovný řez
  const maxRoomH = Math.max(...rooms.map(r => r.wallHeight || PS.wallHeight || 250));

  // Měřítko
  const scaleX = drawW / (totalH || 1);
  const scaleY = drawH / (maxRoomH || 1);
  const scale = Math.min(scaleX, scaleY, 0.8); // max 0.8px/cm pro přehlednost

  const offX = margin + (drawW - totalH*scale)/2;
  const offY = margin + 40 + (drawH - maxRoomH*scale)/2;

  // Půdní výzva
  ctx.fillStyle='#f1f5f9';
  ctx.fillRect(offX, offY, totalH*scale, maxRoomH*scale);
  ctx.strokeStyle='#cbd5e1'; ctx.lineWidth=1;
  ctx.strokeRect(offX, offY, totalH*scale, maxRoomH*scale);

  // Řezem prochází poloha (horizontální řez = na Y pozici)
  const cutVal = _prusrezState.axis==='h'
    ? minY + (maxY-minY) * _prusrezState.pos
    : minX + (maxX-minX) * _prusrezState.pos;

  rooms.forEach(room => {
    const pts = room.points;
    const h = room.wallHeight || PS.wallHeight || 250;
    const col = room.color || '#C8502A';

    // Vodorovný průřez: pro každou místnost zjisti průnik
    // Zjednodušení: bbox místnosti, interpoluj
    const rxMin = Math.min(...pts.map(p=>p.x));
    const rxMax = Math.max(...pts.map(p=>p.x));
    const ryMin = Math.min(...pts.map(p=>p.y));
    const ryMax = Math.max(...pts.map(p=>p.y));

    const inSection = _prusrezState.axis==='h'
      ? (cutVal >= ryMin && cutVal <= ryMax)
      : (cutVal >= rxMin && cutVal <= rxMax);

    if (!inSection) return;

    // Nakresli průřez místnosti (obdélník odpovídající šíři místnosti)
    const rX = offX + (rxMin-minX)*scale;
    const rW = (rxMax-rxMin)*scale;
    const rY = offY; // od podlahy
    const rH = h * scale;

    // Podlaha
    ctx.fillStyle = col+'22';
    ctx.fillRect(rX, rY + (maxRoomH-h)*scale, rW, rH);
    ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.strokeRect(rX, rY + (maxRoomH-h)*scale, rW, rH);

    // Název + výška
    ctx.fillStyle = col; ctx.font='bold 10px DM Sans,sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(room.name, rX+rW/2, rY+(maxRoomH-h)*scale+14);
    ctx.font='9px DM Sans,sans-serif'; ctx.fillStyle='#475569';
    ctx.fillText(`${h}cm`, rX+rW/2, rY+(maxRoomH-h)*scale+26);

    // Sparořez — naznač obklady na stěnách
    const tileH = room.tileH || 60;
    const grout = room.groutMm || 3;
    ctx.strokeStyle='rgba(255,255,255,0.5)'; ctx.lineWidth=0.7;
    const tileHpx = tileH*scale;
    for (let ty=rY+(maxRoomH-h)*scale; ty<rY+maxRoomH*scale; ty+=tileHpx) {
      ctx.beginPath();
      ctx.moveTo(rX, ty);
      ctx.lineTo(rX+rW, ty);
      ctx.stroke();
    }

    // MEP v průřezu
    if (room.floorMep) {
      room.floorMep.forEach(fm => {
        const typ = MEP_TYPES.find(t=>t.id===fm.type);
        if (!typ) return;
        const fxPct = (fm.x - rxMin)/(rxMax-rxMin||1);
        const fpx = rX + fxPct*rW;
        const fpy = rY + (maxRoomH-h)*scale + rH - 8;
        ctx.fillStyle = typ.color;
        ctx.beginPath(); ctx.arc(fpx, fpy, 5, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle='white'; ctx.font='8px sans-serif'; ctx.textAlign='center';
        ctx.fillText(typ.icon, fpx, fpy+1);
      });
    }
  });

  // Čára řezu
  ctx.setLineDash([6,4]); ctx.strokeStyle='#ef4444'; ctx.lineWidth=1.5;
  ctx.beginPath();
  ctx.moveTo(margin, offY-10);
  ctx.lineTo(W-margin, offY-10);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle='#ef4444'; ctx.font='10px DM Sans,sans-serif'; ctx.textAlign='left';
  ctx.fillText('▼ Řez', margin, offY-12);

  // Legenda
  const maxH_label = `Max. výška: ${maxRoomH} cm`;
  ctx.fillStyle='#64748b'; ctx.font='9px DM Sans,sans-serif'; ctx.textAlign='right';
  ctx.fillText(maxH_label, W-margin, offY + maxRoomH*scale + 14);

  // Slider pro polohu řezu
  const ctrl = document.getElementById('prusrez-ctrl');
  if (ctrl) ctrl.style.display = 'flex';
}

// ── 6. Post-render hook — kóty a průřez ────────────────────
// Volá se z afterRender() po každém renderRoomCanvas()
function _cadPostRender() {
  if (PS.view3d) return;
  const c = document.getElementById('roomCanvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  if (_prusrezState.active) {
    renderPrusrez(c, ctx);
  } else {
    drawKoty2D(ctx);
    // Náhled kóty při kreslení
    if (PS.tool === 'kota' && PS.kotaDrawing?.p1) {
      const p1s = worldToCanvas(PS.kotaDrawing.p1.x, PS.kotaDrawing.p1.y);
      ctx.strokeStyle='#ef4444'; ctx.lineWidth=1; ctx.setLineDash([4,3]);
      ctx.beginPath(); ctx.arc(p1s.x, p1s.y, 6, 0, Math.PI*2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle='#ef4444'; ctx.font='10px DM Sans,sans-serif';
      ctx.textAlign='center';
      ctx.fillText('Bod 1 ✓', p1s.x, p1s.y - 10);
    }
  }
}

// ── 7. Přidání tlačítek do UI při afterRender ───────────────
function injectProfiCADButtons() {
  const toolbar = document.querySelector('#cad-toolbar-extra');
  if (!toolbar) return;
  // Detekce WebXR AR podpory (async, výsledek cachujeme do PS._arSupported)
  if (PS._arSupported === undefined) {
    PS._arSupported = null; // pending
    (async () => {
      try {
        PS._arSupported = !!(navigator.xr &&
          location.protocol === 'https:' &&
          await navigator.xr.isSessionSupported('immersive-ar'));
      } catch { PS._arSupported = false; }
      // Re-inject po zjištění
      injectProfiCADButtons();
    })();
  }

  const arActive  = arJeAktivní?.() ?? false;
  const arSupport = PS._arSupported;   // true | false | null (loading)
  const arLabel   = arActive ? '⏹ Stop AR' : '📷 AR Scan';
  const arTitle   = arActive
    ? 'Zastavit AR skenování'
    : arSupport === false
      ? 'AR není podporováno — nainstaluj ARCore'
      : 'Skenovat místnost kamerou (ARCore)';
  const arBg = arActive
    ? '#ef4444'
    : arSupport === true
      ? 'linear-gradient(135deg,#1e40af,#2563eb)'
      : 'var(--surface)';
  const arColor = (arActive || arSupport === true) ? 'white' : 'var(--text2)';

  toolbar.innerHTML = `
    <button onclick="setPanTool()" title="Posun plochy — taž 1 prstem"
      style="padding:0.35rem 0.6rem;border-radius:8px;border:1.5px solid var(--border);cursor:pointer;font-size:0.82rem;font-weight:600;font-family:inherit;
        background:${PS.tool==='pan'?'var(--accent)':'var(--surface)'};color:${PS.tool==='pan'?'white':'var(--text)'}">
      🖐 Pan
    </button>
    <button onclick="toggleKotaTool()" title="Cotování — klikni 2 body"
      style="padding:0.35rem 0.6rem;border-radius:8px;border:1.5px solid var(--border);cursor:pointer;font-size:0.82rem;font-weight:600;font-family:inherit;
        background:${PS.tool==='kota'?'var(--accent)':'var(--surface)'};color:${PS.tool==='kota'?'white':'var(--text)'}">
      ↔ Kóta
    </button>
    <button onclick="togglePrusrez()" title="Průřez budovou"
      style="padding:0.35rem 0.6rem;border-radius:8px;border:1.5px solid var(--border);cursor:pointer;font-size:0.82rem;font-weight:600;font-family:inherit;
        background:${_prusrezState&&_prusrezState.active?'#ef4444':'var(--surface)'};color:${_prusrezState&&_prusrezState.active?'white':'var(--text)'}">
      ✂ Průřez
    </button>
    <button onclick="centerView()" title="Vystředit pohled"
      style="padding:0.35rem 0.6rem;border-radius:8px;border:1.5px solid var(--border);cursor:pointer;font-size:0.82rem;font-weight:600;font-family:inherit;background:var(--surface)">
      ⌖
    </button>
    <button onclick="spustitARSkenování()" title="${arTitle}"
      style="padding:0.35rem 0.7rem;border-radius:8px;
        border:1.5px solid ${arActive?'#ef4444':arSupport===true?'#2563eb':'var(--border)'};
        cursor:pointer;font-size:0.82rem;font-weight:700;font-family:inherit;
        background:${arBg};color:${arColor};
        ${arSupport===null?'opacity:0.6':''}
        ${arSupport===true?'box-shadow:0 2px 8px rgba(37,99,235,0.35)':''}">
      ${arLabel}${arSupport===null?' ⌛':''}
    </button>`;
  const prusCtrl = document.getElementById('prusrez-ctrl');
  if (prusCtrl) prusCtrl.style.display = _prusrezState&&_prusrezState.active ? 'flex' : 'none';
}

function setPanTool() {
  PS.tool = PS.tool === 'pan' ? 'pencil' : 'pan';
  const c = document.getElementById('roomCanvas');
  if (c) c.style.cursor = PS.tool === 'pan' ? 'grab' : 'crosshair';
  injectProfiCADButtons();
}

function centerView() {
  if (!PS.rooms.length) { PS.viewOffset = { x: 40, y: 40 }; renderRoomCanvas(); return; }
  const allX = PS.rooms.flatMap(r => r.points.map(p => p.x));
  const allY = PS.rooms.flatMap(r => r.points.map(p => p.y));
  const cx = (Math.min(...allX) + Math.max(...allX)) / 2;
  const cy = (Math.min(...allY) + Math.max(...allY)) / 2;
  const c = document.getElementById('roomCanvas');
  const W = c ? c.width : 380, H = c ? c.height : 480;
  PS.viewOffset.x = W/2 - cx * PS.scale;
  PS.viewOffset.y = H/2 - cy * PS.scale;
  renderRoomCanvas();
}

// ── 8. Ošetření canvas klik pro kótu ─────────────────────────
// Patch canvas click handler pro kótovací nástroj
function handleKotaClick(worldX, worldY) {
  if (PS.tool !== 'kota') return false;
  if (!PS.kotaDrawing.p1) {
    PS.kotaDrawing.p1 = { x: worldX, y: worldY };
    toast('Klikni na druhý bod kóty');
  } else {
    PS.koty.push({
      id: 'k'+Date.now(),
      p1: PS.kotaDrawing.p1,
      p2: { x: worldX, y: worldY },
      offset: 25,
      text: null,
    });
    PS.kotaDrawing.p1 = null;
    toast('Kóta přidána ✓');
    renderRoomCanvas();
  }
  return true;
}

// ── 10. MEP přehled v místnosti (summary badge) ──────────────
function getMepSummary(room) {
  const total = Object.values(room.wallMep||{}).reduce((s, arr) => s+(arr?.length||0), 0)
              + (room.floorMep?.length || 0);
  if (!total) return '';
  const byType = {};
  Object.values(room.wallMep||{}).flat().concat(room.floorMep||[]).forEach(m => {
    byType[m.type] = (byType[m.type]||0)+1;
  });
  return Object.entries(byType).slice(0,5).map(([tid, cnt]) => {
    const typ = MEP_TYPES.find(t=>t.id===tid);
    return `<span title="${typ?.label||tid}" style="font-size:0.85rem">${typ?.icon||'⚡'}${cnt>1?cnt:''}</span>`;
  }).join(' ');
}

// Cleanup legacy aliases
function saveSnapshot() {}
function saveUndo() {}

// ── Přenos dat z PS.rooms do nabídky ──
function psRoomsToPloch() {
  return PS.rooms
    .filter(r => r.points && r.points.length >= 3)
    .map(room => {
      const areaM2 = polygonArea(room.points);
      // Uložit jako obdélník se správnou plochou (w*h/10000 = areaM2)
      const wCm = Math.max(1, Math.round(Math.sqrt(areaM2 * 10000)));
      const hCm = Math.max(1, Math.round(areaM2 * 10000 / wCm));
      return { name: room.name, w: wCm, h: hCm, type: 'dlazba', otvory: [] };
    });
}

async function ulozitPudorysDoNabidky() {
  const rooms = PS.rooms.filter(r => r.points && r.points.length >= 3);
  if (rooms.length === 0) {
    if (!confirm('Nemáš nakreslené žádné místnosti. Vrátit se zpět bez dat?')) return;
    await navigate('novaNabidka');
    setTimeout(() => switchTab('pudorys'), 50);
    return;
  }
  window.currentPudorysData.ploch = psRoomsToPloch();
  const totalM2 = rooms.reduce((s, r) => s + polygonArea(r.points), 0);
  await navigate('novaNabidka');
  setTimeout(() => switchTab('pudorys'), 50);
  toast(`✓ Přeneseno ${rooms.length} místností · ${totalM2.toFixed(2)} m²`);
}

function syncPSRoomsToNabidka() {
  // Přenést plochy z PS editoru do výpočtu bez opuštění stránky
  const rooms = PS.rooms.filter(r => r.points && r.points.length >= 3);
  if (rooms.length === 0) { toast('Žádné místnosti k přenesení', 'err'); return; }
  window.currentPudorysData.ploch = psRoomsToPloch();
  const totalM2 = rooms.reduce((s, r) => s + polygonArea(r.points), 0);
  const el = document.getElementById('nc_plocha');
  if (el) el.value = totalM2.toFixed(2);
  toast(`✓ Přeneseno ${rooms.length} místností · ${totalM2.toFixed(2)} m²`);
  switchTab('calc');
}




const WORKER_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316'];
