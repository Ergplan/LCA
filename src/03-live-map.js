
/* =====================================================================
   Live map: glass label cards, moving vehicles, inventory, control centre
   ===================================================================== */
const VB = [24, 92, 900, 584]; // must match the iso viewBox
const toPct = ([sx, sy]) => [((sx - VB[0]) / VB[2]) * 100, ((sy - VB[1]) / VB[3]) * 100];
const VEHICLES = [
  { id: 'TRK-14', kind: 'truck', what: 'Diesel to depot', co2: 0.31, unit: 't CO₂e/trip', path: [[26, 29.3], [-4, 29.3]], speed: 1.6 },
  { id: 'TRK-22', kind: 'truck', what: 'Gasoline, site loop', co2: 0.12, unit: 't CO₂e/trip', path: [[12.6, 19.8], [32.6, 19.8], [32.6, 29.3], [12.6, 29.3], [12.6, 19.8]], speed: 1.4, loop: true },
  { id: 'TRK-07', kind: 'truck', what: 'Empty, to loading gantry', co2: 0.09, unit: 't CO₂e/trip', path: [[-4, 29.3], [20.6, 29.3]], speed: 1.5 },
  { id: 'MT-Crude', kind: 'ship', what: 'Crude tanker, inbound', co2: 38, unit: 't CO₂e/day', path: [[53, 1], [45, 9]], speed: 0.35, pingpong: true },
];
const STOCK = [
  { id: 'INV-C', name: 'Crude stock', at: [10, 6.6, 2.2], cap: 620, lvl: (m) => 0.66 + 0.16 * Math.sin(m * 1.3), ef: (y) => yearTotal(CPI['01'], y) / (sum(PRODUCTS.map((p) => p.kt)) * 1000) },
  { id: 'INV-P', name: 'Product stock', at: [28, 20.6, 2.4], cap: 380, lvl: (m) => 0.58 + 0.2 * Math.sin(m * 0.9 + 1), ef: (y) => siteYear(y) / (sum(PRODUCTS.map((p) => p.kt)) * 1000) },
];
const stockNow = (s, m = state.month) => { const lv = clamp(s.lvl(m), 0.1, 0.97); const kt = s.cap * lv; return { lv, kt, co2: kt * 1000 * s.ef(yearOf(m)) }; };


/* pipelines: product flowing through, each labelled with rate and carbon intensity */
const PCOL = { crude: '#8a6d4b', gas: '#e3a64a', h2: '#9085e9', mid: '#a7a7ae', light: '#5fb7e6', mdl: '#c9a227', flare: '#e0663f' };
const pcfOf = (k) => pcf({ year: state.year, alloc: 'subdiv' }).rows.find((p) => p.k === k).val;
const PIPES = [
  { id: 'P-01', name: 'Crude import', col: 'crude', path: [[-4, 2.2], [1, 2.2]], rate: '2,320 t/h', ci: () => `${fmtN(STOCK[0].ef(state.year) * 1000, 0)} kg CO₂e/t upstream`, at: 0.4 },
  { id: 'P-02', name: 'Crude to CDU', col: 'crude', path: [[3.5, 2.2], [4.6, 2.2], [4.6, 8.8], [13.2, 8.8], [13.2, 3.2], [14, 3.2]], rate: '2,280 t/h', ci: () => `${fmtN(STOCK[0].ef(state.year) * 1000, 0)} kg CO₂e/t`, at: 0.55 },
  { id: 'P-03', name: 'Gasoil to hydrocracker', col: 'mid', path: [[20, 4], [22.8, 4]], rate: '610 t/h', ci: () => '+38 kg CO₂e/t at CDU', at: 0.5 },
  { id: 'P-04', name: 'Hydrogen to HCU', col: 'h2', path: [[28.6, 9], [28.6, 7.6], [26.2, 7.6], [26.2, 6.6]], rate: '21 t/h', ci: () => `${fmtN(yearTotal(CPI['07'], state.year) / (21 * 8760), 1)} kg CO₂e/kg H₂`, at: 0.45 },
  { id: 'P-05', name: 'Fuel gas header', col: 'gas', path: [[13.6, 10.3], [7.6, 10.3], [7.6, 13]], rate: '64 t/h', ci: () => '2.75 t CO₂/t burned', at: 0.35 },
  { id: 'P-06', name: 'Gasoline & diesel to tanks', col: 'light', path: [[19.2, 13.8], [19.2, 15.2], [21, 15.2]], rate: '1,390 t/h', ci: () => `${fmtN(pcfOf('gas'), 0)} / ${fmtN(pcfOf('dsl'), 0)} kg CO₂e/t`, at: 0.4 },
  { id: 'P-07', name: 'Diesel export to jetty', col: 'mdl', path: [[29.6, 18.2], [36.4, 18.2]], rate: '820 t/h', ci: () => `${fmtN(pcfOf('dsl'), 0)} kg CO₂e/t`, at: 0.5 },
  { id: 'P-08', name: 'Gasoline to truck gantry', col: 'light', path: [[23, 22.2], [23, 25]], rate: '95 t/h', ci: () => `${fmtN(pcfOf('gas'), 0)} kg CO₂e/t`, at: 0.5 },
  { id: 'P-09', name: 'Flare header', col: 'flare', path: [[31.6, 13.6], [33.6, 13.6]], rate: '0.9 t/h', ci: () => '2.9 t CO₂e/t flared', at: 0.5 },
];
function pipesSVG() {
  return '<g aria-hidden="true">' + PIPES.map((p) => {
    const pts3 = pts(p.path.map(([x, y]) => P(x, y, 0.35)));
    const sup = p.path.map(([x, y]) => { const a = P(x, y, 0), b = P(x, y, 0.35); return `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="var(--iso-edge)" stroke-width="1.2"/>`; }).join('');
    return `<g data-pl="${p.id}">${sup}<polyline class="pipe-body" points="${pts3}"/><polyline class="pipe-flow" points="${pts3}" style="stroke:${PCOL[p.col]}"/></g>`;
  }).join('') + '</g>';
}
function pipeMid(p) {
  const segs = []; let L = 0;
  for (let i = 0; i < p.path.length - 1; i++) { const [a, b] = [p.path[i], p.path[i + 1]]; const len = Math.hypot(b[0] - a[0], b[1] - a[1]); segs.push([a, b, len]); L += len; }
  let d = L * p.at;
  for (const [a, b, len] of segs) { if (d <= len) { const f = d / len; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; } d -= len; }
  return p.path[0];
}

function mapHTML(id, compact = false) {
  return `<div class="map${compact ? ' compact' : ''}" id="${id}">
    <div class="map-ctl seg" role="group" aria-label="Labels">${[['all', 'All labels'], ['units', 'Units'], ['moving', 'Flows & stock'], ['off', 'Off']].map(([k, l]) => `<button data-lab="${k}">${l}</button>`).join('')}</div>
    ${landscapeSVG()}<div class="ov"></div></div>`;
}
function mountMap(root) {
  if (!root) return;
  root.addEventListener('click', (e) => {
    const lab = e.target.closest('[data-lab]'); if (lab) { state.labels = lab.dataset.lab; store.set('labels', state.labels); drawPins(); return; }
    const v = e.target.closest('[data-veh]'); if (v) { const x = VEHICLES.find((q) => q.id === v.dataset.veh); toast(`${x.id} · ${x.what} · ${x.co2} ${x.unit}`); return; }
    const pp = e.target.closest('[data-pipe]'); if (pp) { const x = PIPES.find((q) => q.id === pp.dataset.pipe); if (PIPE_PROD[x.id]) { state.prod = PIPE_PROD[x.id]; state.vcStage = null; goto('products'); return; } toast(`${x.id} ${x.name} · ${x.rate} · ${x.ci()}`); return; }
    const s = e.target.closest('[data-stock]'); if (s) { goto('inventory'); return; }
    const g = e.target.closest('[data-cp]'); if (!g) return;
    if (g.dataset.cp === 'cc') goto('control'); else selectCP(g.dataset.cp);
  });
  ensureAnim();
}
function drawMap(root) {
  const m = state.month, lab = state.labels;
  const mx = Math.max(...LIVE.filter((c) => c.cat !== 'up').map((c) => Math.max(...c.monthly)));
  let lines = '', cards = '';
  CPS.forEach((c) => {
    const [px, py, pz] = ASSETS[c.id].pin;
    const a = P(px, py, pz), b = P(px, py, pz + 2.2);
    lines += `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="var(--ink)" stroke-opacity=".45"/><circle cx="${a[0].toFixed(1)}" cy="${a[1].toFixed(1)}" r="2" fill="var(--ink)"/>`;
    if (lab === 'off' || lab === 'moving') {
      lines += `<circle class="cp-dot" data-cp="${c.id}" cx="${b[0].toFixed(1)}" cy="${b[1].toFixed(1)}" r="5" fill="${pinStyle(c, m).fill}" stroke="var(--ink)" stroke-width="${c.id === state.cp ? 2 : .6}" style="cursor:pointer"/>`;
      return;
    }
    const [l, t] = toPct(b);
    const st = pinStyle(c, m), [k] = status(c.comp[m]);
    const tr = root.id === 'prodMap' ? state.traceCps : null;
    const sel = c.id === state.cp && !tr, dim = (state.layer !== 'all' && !c.scope.startsWith(state.layer)) || (tr && !tr.has(c.id));
    const v = c.monthly[m] || 0, w = c.cat === 'data' ? 0 : Math.sqrt(Math.min(1, v / mx));
    cards += `<button class="gl cp-card${sel ? ' sel' : ''}${dim ? ' dim' : ''}" data-cp="${c.id}" style="left:${l.toFixed(2)}%;top:${t.toFixed(2)}%;z-index:${Math.round(b[1])}" aria-label="CP-${c.id} ${esc(c.name)}">
      <span class="gl-top"><i class="dot" style="background:${st.fill}"></i><b>${c.id}</b>${sel ? `<span class="nm">${esc(c.name.split(' (')[0])}</span>` : ''}${k !== 'ok' ? `<i class="gl-st ${k}"></i>` : ''}</span>
      <span class="v">${c.cat === 'data' ? 'LIMS data' : fmtT(v) + ' CO₂e'}</span>${c.cat === 'data' ? '' : `<span class="gl-bar"><i style="width:${Math.max(6, w * 100)}%;background:${CATS[c.cat].color}"></i></span>`}</button>`;
  });
  if (lab === 'all' || lab === 'moving') {
    STOCK.forEach((s) => {
      const n = stockNow(s, m), [l, t] = toPct(P(...s.at));
      cards += `<button class="gl stock" data-stock="${s.id}" style="left:${l.toFixed(2)}%;top:${t.toFixed(2)}%;z-index:${Math.round(P(...s.at)[1])}"><span class="gl-top"><span class="gl-ico">▤</span><b>${s.name}</b><span class="nm">${pct(n.lv)}</span></span><span class="gl-bar"><i style="width:${n.lv * 100}%;background:var(--ink)"></i></span><span class="v">${fmtN(n.kt)} kt · ${fmtT(n.co2)} CO₂e embodied</span></button>`;
    });
    PIPES.forEach((p) => {
      const [x, y] = pipeMid(p), s = P(x, y, 0.9), [l, t] = toPct(s);
      cards += `<button class="gl pipe" data-pipe="${p.id}" style="left:${l.toFixed(2)}%;top:${t.toFixed(2)}%;z-index:${Math.round(s[1])};--pc:${PCOL[p.col]}"><span class="gl-top"><i class="pipe-sw"></i><b>${p.name}</b></span><span class="v">${p.rate} · ${p.ci()}</span></button>`;
    });
    VEHICLES.forEach((v) => { cards += `<button class="gl veh" data-veh="${v.id}" style="left:0;top:0"><span class="gl-top"><span class="gl-ico">${v.kind === 'ship' ? '⛴' : '⛟'}</span><b>${v.id}</b></span><span class="v">${v.co2} ${v.unit}</span></button>`; });
  }
  const [cl, ct] = toPct(P(9.6, 17.4, 3.6));
  cards += `<button class="gl cc" data-cp="cc" style="left:${cl.toFixed(2)}%;top:${ct.toFixed(2)}%;z-index:2000"><span class="gl-top"><i class="live-dot"></i><b>Command &amp; control</b></span><span class="v">Open live dashboard →</span></button>`;
  root.querySelector('.leaders').innerHTML = lines;
  root.querySelector('.ov').innerHTML = cards;
  if (root.id === 'prodMap' && state.tracePipes) {
    $$('[data-pl]', root).forEach((g) => { g.style.opacity = state.tracePipes.has(g.dataset.pl) ? 1 : 0.12; });
    $$('.gl.pipe', root).forEach((g) => { g.hidden = !state.tracePipes.has(g.dataset.pipe); });
    $$('.gl.cp-card', root).forEach((g) => { g.hidden = !state.traceCps.has(g.dataset.cp); });
    $$('.gl.stock, .gl.cc', root).forEach((g) => { g.hidden = true; });
    $$('.gl.veh', root).forEach((g) => { g.hidden = !(state.traceCps.has('15') || state.traceCps.has('16')); });
    const ctl = root.querySelector('.map-ctl'); if (ctl) ctl.hidden = true;
  }
  $$('.map-ctl button', root).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lab === lab)));
  drawVehicles(animT());
}
function drawPins() {
  const m = state.month;
  $$('.map').forEach(drawMap);
  $$('.asset-pad').forEach((p) => { const on = p.dataset.cp === state.cp; p.setAttribute('stroke', on ? 'var(--ink)' : 'var(--line2)'); p.setAttribute('stroke-width', on ? '1.6' : '.8'); p.setAttribute('stroke-dasharray', on ? '4 3' : ''); p.setAttribute('fill', on ? 'color-mix(in srgb, var(--up) 18%, var(--iso-pad))' : 'var(--iso-pad)'); });
  if ($('.map-pop')) drawPop();
  if (!$('#mbars')) return;
  $$('#mbars i').forEach((i) => { const mm = +i.dataset.m; i.classList.toggle('is-on', mm === m); i.classList.toggle('is-yr', yearOf(mm) === state.year && mm !== m); });
  $('#mlabel').innerHTML = `${monthLabel(m)}<br><span class="muted" style="font-weight:500;font-size:11px">Year ${yearOf(m)} · month ${(m % 12) + 1}</span>`;
  $('#pinLegend').innerHTML = {
    emis: CAT_ORDER.concat(['down', 'data']).map((k) => `<span><i class="dot" style="background:${CATS[k].color}"></i>${CATS[k].short}</span>`).join(''),
    data: '<span><i class="dot" style="background:var(--upbg);box-shadow:inset 0 0 0 1.5px var(--up)"></i>Live ≥ 98%</span><span><i class="dot" style="background:var(--warnbg);box-shadow:inset 0 0 0 1.5px var(--warn)"></i>Partial 90–98%</span><span><i class="dot" style="background:var(--downbg);box-shadow:inset 0 0 0 1.5px var(--down)"></i>Gaps &lt; 90%</span>',
    dq: '<span><i class="dot" style="background:var(--ink)"></i>DQR 1 (best)</span><span><i class="dot" style="background:color-mix(in srgb, var(--ink) 40%, var(--raised))"></i>DQR 2</span><span><i class="dot" style="background:color-mix(in srgb, var(--ink) 10%, var(--raised))"></i>DQR ≥ 3</span>',
  }[state.pinMode];
  $$('#pinMode button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.m === state.pinMode)));
  $$('#layerSeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.l === state.layer)));
  const comp = sum(CPS.map((c) => c.comp[m])) / CPS.length;
  $('#siteTotal').textContent = `Cradle-to-gate ${fmtT(monthTotal(m))} · data completeness ${pct(comp)}`;
}
// selected point summary floating over the dashboard map
function drawPop() {
  const el = $('.map-pop'); if (!el) return;
  const c = CPI[state.cp], m = state.month, y = yearOf(m);
  const [k, l] = status(c.comp[m]);
  const ser = c.monthly.slice((y - 1) * 12, y * 12), smx = Math.max(...ser, 1);
  el.innerHTML = `<div class="flex between"><span class="tag">CP-${c.id}</span><span class="badge ${k}">${l} · ${pct(c.comp[m])}</span></div>
    <b class="pop-t">${esc(c.name)}</b><span class="note">${esc(c.scope)} · ${esc(c.feeds[0][1])}</span>
    <div class="grid g2" style="gap:8px;margin-top:6px">${c.cat === 'data' ? kpi(c.feeds.length, 'feeds') + kpi(pct(c.auto[y - 1]), 'automated') : kpi(fmtT(c.monthly[m]), monthLabel(m)) + kpi(fmtT(yearTotal(c, y)), `${Y0 + y - 1} total`)}</div>
    ${c.cat === 'data' ? '' : `<svg viewBox="0 0 120 26" style="width:100%;height:30px;display:block;margin-top:4px">${ser.map((v, i) => `<rect x="${i * 10 + 1}" y="${26 - (v / smx) * 24}" width="7" height="${(v / smx) * 24}" rx="1.5" fill="${i === m % 12 ? 'var(--ink)' : CATS[c.cat].color}" opacity="${i === m % 12 ? 1 : .7}"/>`).join('')}</svg>`}
    <div class="flex" style="margin-top:6px"><button class="pill" data-goto="site">Site map →</button><button class="pill" data-goto="inventory">Inventory →</button></div>`;
  $$('[data-goto]', el).forEach((b) => b.addEventListener('click', () => goto(b.dataset.goto)));
}

/* vehicles */
const RM = matchMedia('(prefers-reduced-motion: reduce)');
let rafOn = false, lastF = 0;
const animT = () => (RM.matches ? 6 : performance.now() / 1000);
function ensureAnim() { if (rafOn) return; rafOn = true; requestAnimationFrame(tick); }
function tick(now) {
  if (!document.querySelector('.map')) { rafOn = false; return; }
  if (now - lastF > 40 && !RM.matches) { lastF = now; drawVehicles(now / 1000); }
  requestAnimationFrame(tick);
}
function posAt(v, t) {
  const segs = []; let L = 0;
  for (let i = 0; i < v.path.length - 1; i++) { const [a, b] = [v.path[i], v.path[i + 1]]; const len = Math.hypot(b[0] - a[0], b[1] - a[1]); segs.push([a, b, len]); L += len; }
  let d = t * v.speed, rev = false;
  if (v.pingpong) { d %= 2 * L; if (d > L) { d = 2 * L - d; rev = true; } } else d %= L;
  for (const [a, b, len] of segs) {
    if (d <= len) { const f = d / len; let dx = b[0] - a[0], dy = b[1] - a[1]; if (rev) { dx = -dx; dy = -dy; } return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, dx, dy }; }
    d -= len;
  }
  const e = v.path[v.path.length - 1]; return { x: e[0], y: e[1], dx: 1, dy: 0 };
}
const CAB = { top: '#4a4a4d', l: '#38383b', r: '#2c2c2f' };
function vehicleSVG(v, p) {
  if (v.kind === 'ship') return box(p.x - 2.4, p.y - 0.8, -0.7, 4.8, 1.6, 1.1, { top: 'var(--iso-l)' }) + box(p.x + (p.dx > 0 ? 1 : -2), p.y - 0.6, 0.4, 1, 1.2, 1.2) + box(p.x - 1.2, p.y - 0.3, 0.4, 1.8, 0.6, 0.35, { top: 'var(--flame)' });
  const alongX = Math.abs(p.dx) >= Math.abs(p.dy), s = Math.sign(alongX ? p.dx : p.dy) || 1;
  if (alongX) return box(p.x - 1.3, p.y - 0.45, 0, 2.6, 0.9, 0.95) + box(s > 0 ? p.x + 1.35 : p.x - 2.05, p.y - 0.45, 0, 0.7, 0.9, 1.15, CAB);
  return box(p.x - 0.45, p.y - 1.3, 0, 0.9, 2.6, 0.95) + box(p.x - 0.45, s > 0 ? p.y + 1.35 : p.y - 2.05, 0, 0.9, 0.7, 1.15, CAB);
}
function drawVehicles(t) {
  $$('.map').forEach((root) => {
    const pos = VEHICLES.map((v, i) => [v, posAt(v, t + i * 7.3)]);
    root.querySelector('.vehs').innerHTML = pos.sort((a, b) => (a[1].x + a[1].y) - (b[1].x + b[1].y)).map(([v, p]) => vehicleSVG(v, p)).join('');
    pos.forEach(([v, p]) => {
      const el = root.querySelector(`[data-veh="${v.id}"]`); if (!el) return;
      const s = P(p.x, p.y, v.kind === 'ship' ? 2.2 : 2), [l, tp] = toPct(s);
      el.style.left = l.toFixed(2) + '%'; el.style.top = tp.toFixed(2) + '%'; el.style.zIndex = Math.round(s[1]);
    });
  });
}

/* =====================================================================
   Command & control centre
   ===================================================================== */
const HIST = { rate: [], flare: [] };
let ccIv = null;
function liveRates(jit = true) {
  const m = state.month, hrs = daysIn(m) * 24, r = () => (jit ? 1 + (Math.random() - 0.5) * 0.06 : 1);
  return CPS.filter((c) => c.cat !== 'data' && c.cat !== 'down' && c.cat !== 'up').map((c) => [c, (c.monthly[m] / hrs) * r()]);
}
const spark = (arr, color = 'var(--up)') => { if (arr.length < 2) return ''; const mn = Math.min(...arr), mx = Math.max(...arr), rg = mx - mn || 1; return `<svg viewBox="0 0 100 28" preserveAspectRatio="none" class="spark"><polyline fill="none" stroke="${color}" stroke-width="1.6" points="${arr.map((v, i) => `${(i / (arr.length - 1)) * 100},${26 - ((v - mn) / rg) * 22}`).join(' ')}"/></svg>`; };
sec({ id: 'control', group: 'Overview', icon: '◉', title: 'Command & control centre', nav: 'Control centre',
  sub: 'Live operating picture for carbon: emission rate now, flaring, feeds, vehicles and stock. Every tile and row opens the module behind it.',
  actions: ['Acknowledge all', 'Shift handover report'], rfp: ['C4a', 'C4c', 'C2'],
  render: () => `
  <div class="ops">
    <div class="ops-bar"><span class="flex"><i class="live-dot"></i><b>LIVE</b><span class="muted" id="ccClock"></span></span><span class="muted">Shift B · Control room 1 · Feeds <b class="up" id="ccFeeds"></b></span></div>
    <div class="grid ops-tiles" id="ccTiles"></div>
    <div class="grid g-dash" style="margin-top:14px">
      <div class="ops-card" style="padding:8px">${mapHTML('ccMap', true)}</div>
      <div class="ops-card"><div class="ph"><h3>Alarms &amp; events</h3><span class="badge warn" id="ccAlN"></span></div><div class="list" id="ccAlarms"></div></div>
    </div>
    <div class="grid g3" style="margin-top:14px">
      <div class="ops-card"><div class="ph"><h3>Units · now</h3><span class="note">t CO₂e/h</span></div><div id="ccUnits"></div></div>
      <div class="ops-card"><div class="ph"><h3>Vehicles</h3><span class="note">${VEHICLES.length} tracked</span></div><div class="list">${VEHICLES.map((v) => li('ok', `${v.kind === 'ship' ? '⛴' : '⛟'} ${v.id} · ${v.what}`, `${v.co2} ${v.unit} · ${v.kind === 'ship' ? 'GLEC voyage method' : 'telematics fuel × factor'}`)).join('')}</div></div>
      <div class="ops-card"><div class="ph"><h3>Inventory &amp; embodied carbon</h3></div><div id="ccStock"></div></div>
    </div>
  </div>`,
  after: () => {
    mountMap($('#ccMap')); drawPins();
    HIST.rate = []; HIST.flare = [];
    const tick1 = () => {
      if (!$('#ccTiles')) { clearInterval(ccIv); return; }
      const rates = liveRates(), tot = sum(rates.map((x) => x[1])), fl = rates.find(([c]) => c.id === '11')[1];
      HIST.rate.push(tot); HIST.flare.push(fl); if (HIST.rate.length > 40) { HIST.rate.shift(); HIST.flare.shift(); }
      const m = state.month, now = new Date(), day = daysIn(m);
      const hr = now.getHours() + now.getMinutes() / 60;
      $('#ccClock').textContent = `${day} ${MONTHS[m % 12]} ${Y0 + Math.floor(m / 12)} · ${now.toTimeString().slice(0, 8)}`;
      const flags = openFlags();
      const feeds = CONNECTORS.filter((c) => c.health[state.year - 1] >= 0.9).length;
      $('#ccFeeds').textContent = `${feeds}/${CONNECTORS.length} live`;
      const mtd = monthTotal(m), plan = mtd * 1.03;
      const tiles = [
        ['Emission rate now', fmtN(tot, 1), 't CO₂e/h · Scope 1+2', spark(HIST.rate), 'impact'],
        ['Today so far', fmtN(tot * hr, 0), 't CO₂e since 00:00', '', 'impact'],
        ['Month to date', fmtT(mtd), `${sgn(mtd / plan - 1)} vs plan`, '', 'dashboard'],
        ['Flaring now', fmtN(fl, 2), `t CO₂e/h · ${fl > 30 ? 'above' : 'below'} alert 30`, spark(HIST.flare, 'var(--flame)'), 'site:11'],
        ['Data feeds', `${feeds}/${CONNECTORS.length}`, 'connections live', '', 'integrations'],
        ['Open alarms', flags.length + 1, 'events & data gaps', '', 'site'],
      ];
      $('#ccTiles').innerHTML = tiles.map(([a, b, c, sp, go]) => `<button class="ops-tile" data-go="${go}"><span class="eyebrow">${a}</span><b>${b}</b><span class="note">${c}</span>${sp}</button>`).join('');
      $('#ccUnits').innerHTML = rates.sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c, v]) => { const [k] = status(c.comp[m]); return `<div class="hbar" style="cursor:pointer" data-cp="${c.id}"><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><i class="gl-st ${k}" style="position:static;display:inline-block;margin-right:5px"></i>CP-${c.id} ${esc(c.name.split(' (')[0].split(' &')[0])}</span><div class="hbar-track"><i style="width:${(v / rates[0][1]) * 100}%;background:${CATS[c.cat].color}"></i></div><b style="text-align:right;font-weight:600">${fmtN(v, 1)}</b></div>`; }).join('');
      $$('#ccUnits [data-cp]').forEach((r) => r.addEventListener('click', () => { state.cp = r.dataset.cp; goto('site'); }));
      $$('#ccTiles [data-go]').forEach((b) => b.addEventListener('click', () => { const [g, cp] = b.dataset.go.split(':'); if (cp) state.cp = cp; goto(g); }));
    };
    const m = state.month;
    const flags = openFlags();
    $('#ccAlN').textContent = flags.length + 1;
    $('#ccAlarms').innerHTML = [
      ...flags.slice(0, 4).map(([c, [k, l], f]) => `<div class="li" data-cp="${c.id}" style="cursor:pointer"><span class="check ${k === 'ok' ? 'warn' : k}">!</span><div class="li-main"><b>CP-${c.id} ${esc(c.name.split(' (')[0])}</b><p>${l === 'Live' ? `${f} values held by validation` : `${l} data, ${pct(c.comp[m])} complete`}</p></div></div>`),
      `<div class="li" data-cp="11" style="cursor:pointer"><span class="check warn">!</span><div class="li-main"><b>Flare: non-routine event 13:05–13:40</b><p>Logged with cause code; included in month total.</p></div></div>`,
      `<div class="li" data-cp="15" style="cursor:pointer"><span class="check ok">✓</span><div class="li-main"><b>Cargo 29-121 loaded at jetty</b><p>Voyage emissions estimated on departure.</p></div></div>`,
    ].join('');
    $$('#ccAlarms [data-cp]').forEach((r) => r.addEventListener('click', () => { state.cp = r.dataset.cp; goto('site'); }));
    $('#ccStock').innerHTML = [...STOCK.map((s) => [s.name, stockNow(s)]), ...[['Diesel tanks', 'dsl', .64], ['Gasoline tanks', 'gas', .52], ['Jet tanks', 'jet', .71]].map(([n, k, lv]) => { const p = PRODUCTS.find((q) => q.k === k); const kt = p.kt / 26 * lv; return [n, { lv, kt, co2: kt * pcf({ year: state.year, alloc: 'subdiv' }).rows.find((q) => q.k === k).val }]; })]
      .map(([n, s]) => `<div style="padding:7px 0;border-top:1px solid var(--line)"><div class="flex between"><span>${n}</span><b>${fmtT(s.co2)} CO₂e</b></div><div class="flex" style="flex-wrap:nowrap;margin-top:4px"><div class="bar-track thin" style="flex:1"><i style="width:${s.lv * 100}%"></i></div><span class="note">${pct(s.lv)} · ${fmtN(s.kt)} kt</span></div></div>`).join('');
    clearInterval(ccIv);
    tick1();
    ccIv = setInterval(tick1, 1000);
  },
  onYear: () => show(state.sec, false, true),
});
