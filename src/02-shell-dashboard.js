
/* =====================================================================
   State, Strata instances, shell
   ===================================================================== */
const state = {
  sec: 0, year: 3, month: 35, cp: '07', pinMode: 'emis', layer: 'all',
  alloc: 'energy', bound: 'c2g', fu: 't', prod: 'dsl',
  palette: store.get('pal') || 'mono', mode: store.get('mode') || 'auto',
  rfp: store.get('rfp') === '1',
  tab9: 0, auditF: 'all', labels: store.get('labels') || 'all',
  scen: { grid: 0.40, flare: 45, eff: 6, ccs: 0, ldar: 50, crude: 5 },
};
const ST = []; // live Strata charts / cards (re-themed together, destroyed on navigation)
const strataMode = () => (state.mode === 'auto' ? 'auto' : state.mode);
function track(x) { ST.push(x); return x; }
function destroyStrata() { while (ST.length) { const x = ST.pop(); try { x.destroy(); } catch { /* already gone */ } } }
function themeStrata() { ST.forEach((x) => { try { x.setTheme(state.palette, strataMode()); } catch { /* ignore */ } }); }
const strataReady = () => typeof window.Strata !== 'undefined';
const catColor = (k) => ({ light: CATS[k].hex.light, dark: CATS[k].hex.dark });
let toastT = null;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('is-on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('is-on'), 2600); }

// RFP technical evaluation criteria (Appendix 1), shown only with the "RFP map" toggle
const CRIT = {
  C1: { n: 1, name: 'Compliance with Scope of Services', sec: 'products' },
  C2: { n: 2, name: 'Compliance with ADNOC Refining HSE policy', sec: 'site' },
  C3: { n: 3, name: 'Technical software requirements', sec: 'security' },
  C4: { n: 4, name: 'Functional software requirements', sec: 'inventory' },
  C5: { n: 5, name: 'Usability and user experience', sec: 'scope' },
  C6: { n: 6, name: 'References', sec: 'subscription' },
  C7: { n: 7, name: 'Deployment and schedule', sec: 'subscription' },
};
const SUBCRIT = { C3a: 'Security & privacy', C3b: 'Updates & support', C3c: 'Platform compatibility', C3d: 'Integration', C3e: 'Scalability', C4a: 'Data management', C4b: 'Database quality & coverage', C4c: 'Reporting & visualisation', C5a: 'Workflow efficiency', C5b: 'Learning curve', C5c: 'Modelling flexibility' };
const critLabel = (c) => (SUBCRIT[c] ? `C${c[1]} · ${SUBCRIT[c]}` : `C${c[1]} · ${CRIT[c].name.replace('Compliance with ', '')}`);
const critChips = (arr) => arr.map((c) => `<button class="tag" data-goto="${CRIT[c.slice(0, 2)].sec}" style="cursor:pointer;border:0">${esc(critLabel(c))}</button>`).join(' ');

const SECTIONS = [];
const sec = (o) => SECTIONS.push(o);
const goto = (id) => { const i = SECTIONS.findIndex((s) => s.id === id); if (i >= 0) show(i); };

function shell() {
  const groups = [];
  SECTIONS.forEach((s, i) => { let g = groups.find((x) => x.name === s.group); if (!g) groups.push(g = { name: s.group, items: [] }); g.items.push([s, i]); });
  $('#nav').innerHTML = groups.map((g) => `<div class="nav-group"><span>${esc(g.name)}</span>${g.items.map(([s, i]) => `<button data-i="${i}"><span class="nav-n">${s.icon || '·'}</span><span>${esc(s.nav || s.title)}</span>${s.badge ? `<span class="badge ${s.badge[0]}" style="padding:1px 6px">${s.badge[1]}</span>` : '<i></i>'}</button>`).join('')}</div>`).join('');
  $('#nav').addEventListener('click', (e) => { const b = e.target.closest('button[data-i]'); if (b) { show(+b.dataset.i); $('#app').classList.remove('nav-open'); } });
  $('#menu').addEventListener('click', () => $('#app').classList.toggle('nav-open'));
  $('#yearSeg').addEventListener('click', (e) => { const b = e.target.closest('button[data-year]'); if (b) setYear(+b.dataset.year); });
  $('#palSeg').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-pal]'); if (!b) return;
    state.palette = b.dataset.pal; store.set('pal', state.palette); applyChrome(); themeStrata();
  });
  $('#modeBtn').addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    state.mode = dark ? 'light' : 'dark'; store.set('mode', state.mode); applyChrome(); themeStrata();
  });
  $('#rfpToggle').checked = state.rfp;
  $('#rfpToggle').addEventListener('change', (e) => { state.rfp = e.target.checked; store.set('rfp', state.rfp ? '1' : '0'); show(state.sec, false, true); });
  $('#bell').addEventListener('click', () => goto('dashboard'));
  // search: modules, collection points, products
  const targets = [
    ...SECTIONS.map((s) => [s.nav || s.title, () => goto(s.id)]),
    ...CPS.map((c) => [`CP-${c.id} ${c.name}`, () => { state.cp = c.id; goto('site'); }]),
    ...PRODUCTS.map((p) => [`Product: ${p.name}`, () => { state.prod = p.k; goto('products'); }]),
  ];
  $('#searchList').innerHTML = targets.map(([t]) => `<option value="${esc(t)}">`).join('');
  $('#search').addEventListener('change', (e) => {
    const q = e.target.value.trim().toLowerCase(); if (!q) return;
    const hit = targets.find(([t]) => t.toLowerCase() === q) || targets.find(([t]) => t.toLowerCase().includes(q));
    if (hit) { hit[1](); e.target.value = ''; } else toast('No match for “' + e.target.value + '”');
  });
  addEventListener('hashchange', () => { const i = SECTIONS.findIndex((s) => '#' + s.id === location.hash); if (i >= 0 && i !== state.sec) show(i, false); });
  applyChrome();
}
function applyChrome() {
  const r = document.documentElement;
  if (state.mode === 'auto') delete r.dataset.theme; else r.dataset.theme = state.mode;
  if (state.palette === 'mono') delete r.dataset.palette; else r.dataset.palette = state.palette;
  $$('#palSeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pal === state.palette)));
  const dark = r.dataset.theme ? r.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  $('#modeBtn').setAttribute('aria-pressed', String(dark));
  $('#modeBtn').textContent = dark ? '◑ Light' : '◐ Dark';
  $$('#yearSeg button').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.year === state.year)));
  const mo = state.year * 12;
  $('#subLabel').textContent = `Subscription month ${mo} of 36 · ${Y0 + state.year - 1}`;
  $('#prog').style.width = `${(mo / 36) * 100}%`;
  const nf = openFlags().length; $('#bellN').textContent = nf; $('#bellN').hidden = !nf;
}
function setYear(y, fromScrub = false) {
  state.year = y;
  if (!fromScrub && yearOf(state.month) !== y) state.month = y * 12 - 1;
  applyChrome();
  const s = SECTIONS[state.sec];
  if (s.onYear) s.onYear(); else if (!fromScrub) show(state.sec, false, true);
}
function show(i, push = true, keepScroll = false) {
  destroyStrata();
  state.sec = i;
  const s = SECTIONS[i];
  $('#view').innerHTML = `
    <div class="page-head">
      <div><div class="crumb2">${esc(s.group)} / ${esc(s.nav || s.title)}</div><h1>${esc(s.title)}</h1>${s.sub ? `<p class="sub">${s.sub}</p>` : ''}
        ${s.status && s.status.length ? `<div class="rfp-row">${s.status.map(([c, t]) => `<span class="badge ${c}">${t}</span>`).join('')}</div>` : ''}
        ${state.rfp && (s.rfp || (s.reqs && s.reqs.length)) ? `<div class="rfp-row">${s.rfp ? `<span class="eyebrow" style="align-self:center">Tender</span>${critChips(s.rfp)}` : ''}${s.reqs && s.reqs.length ? `<span class="eyebrow" style="align-self:center;margin-left:6px">Requirements</span>${reqChips(s.reqs)}` : ''}</div>` : ''}</div>
      ${s.actions ? `<div class="actions">${s.actions.map((a, k) => `<button class="pill${k === s.actions.length - 1 ? ' is-ink' : ''}" data-act="${esc(a)}">${esc(a)}</button>`).join('')}</div>` : ''}
    </div>
    ${s.render()}`;
  $$('[data-act]', $('#view')).forEach((b) => b.addEventListener('click', () => toast(`${b.dataset.act}: demo action`)));
  $$('[data-goto]', $('#view')).forEach((b) => b.addEventListener('click', () => goto(b.dataset.goto)));
  $$('[data-reqgo]', $('#view')).forEach((b) => b.addEventListener('click', () => { state.reqHi = b.dataset.reqgo; state.tabs.req = 'cov'; state.reqG = 'All'; state.reqF = 'All'; goto('requirements'); }));
  $$('#nav button').forEach((b) => { if (+b.dataset.i === i) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  if (push && location.hash !== '#' + s.id) history.replaceState(null, '', '#' + s.id);
  if (!keepScroll) { scrollTo({ top: 0 }); $('#view').focus({ preventScroll: true }); }
  applyChrome();
  if (s.after) s.after();
}

/* small shared renderers */
const kpi = (v, l, cls = '') => `<div class="kpi ${cls}"><b>${v}</b><span>${l}</span></div>`;
const li = (mark, title, body, right = '') => `<div class="li"><span class="check ${mark}">${{ ok: '✓', warn: '!', bad: '×', mute: '–' }[mark] || mark}</span><div class="li-main"><b>${title}</b>${body ? `<p>${body}</p>` : ''}</div>${right}</div>`;
const refs = () => '';
const lastMonth = () => state.year * 12 - 1;
function openFlags() {
  const m = Math.min(state.month, lastMonth());
  return CPS.map((c) => [c, status(c.comp[m]), c.flags[m]]).filter(([, [k], f]) => k !== 'ok' || f > 1).sort((a, b) => b[2] - a[2]);
}
const siteYear = (y) => sum(LIVE.filter((c) => c.cat !== 'down').map((c) => yearTotal(c, y)));
const crudeBbl = sum(PRODUCTS.map((p) => p.kt)) * 1000 / 0.136; // illustrative crude barrels per year

/* =====================================================================
   Dashboard
   ===================================================================== */
sec({ id: 'dashboard', group: 'Overview', icon: '◧', title: 'Dashboard', nav: 'Dashboard',
  sub: 'Cradle-to-gate carbon for the site and its products, data health and this month’s close.',
  actions: ['Export pack', 'New study'], rfp: ['C4c', 'C5a'],
  render: () => {
    const y = state.year, t = siteYear(y), d = y > 1 ? t / siteYear(y - 1) - 1 : null;
    const m = lastMonth();
    const comp = sum(CPS.map((c) => c.comp[m])) / CPS.length;
    const flags = openFlags();
    const step = [3, 5, 6][y - 1];
    return `
  <div class="grid g5">
    <div class="panel tight">${kpi(fmtT(t), `Cradle-to-gate CO₂e ${Y0 + y - 1}${d != null ? ` · <em class="up" style="font-style:normal;font-weight:700">${sgn(d)}</em>` : ''}`)}</div>
    <div class="panel tight">${kpi(fmtN(t * 1000 / crudeBbl, 1), 'kg CO₂e per barrel processed')}</div>
    <div class="panel tight">${kpi(pct(comp), `Data completeness · ${monthLabel(m)}`)}</div>
    <div class="panel tight">${kpi(flags.length, 'Open data flags')}</div>
    <div class="panel tight">${kpi(`${y === 1 ? 7 : 9}`, y === 1 ? 'Product footprints issued' : 'Footprints + EPDs current')}</div>
  </div>
  <div class="panel map-panel">
    <div class="ph"><h3>Live site · ${monthLabel(m)}</h3><div class="flex"><div class="legend">${CAT_ORDER.map((k) => `<span><i class="dot" style="background:${CATS[k].color}"></i>${CATS[k].short}</span>`).join('')}</div><button class="pill" data-goto="control">Control centre →</button><button class="pill" data-goto="site">Site map →</button></div></div>
    <div style="position:relative">${mapHTML('dashMap')}<div class="map-pop"></div></div>
    <p class="note" style="margin-top:6px">Glass labels show this month’s CO₂e for each collection point, embodied carbon in stock and per-trip emissions of vehicles on site. Click any label.</p>
  </div>
  <div class="grid g-dash">
    <section id="dashHero" class="st-mount inv"></section>
    <div class="stack">
      <div class="panel"><div class="ph"><h3>Needs attention</h3><span class="badge ${flags.length ? 'warn' : 'ok'}">${flags.length}</span></div>
        <div class="list">${flags.slice(0, 5).map(([c, [k, l], f]) => `<div class="li" data-cp="${c.id}" style="cursor:pointer"><span class="check ${k === 'ok' ? 'warn' : k}">${k === 'bad' ? '×' : '!'}</span><div class="li-main"><b>CP-${c.id} ${esc(c.name.split(' (')[0])}</b><p>${l === 'Live' ? `${f} value${f === 1 ? '' : 's'} held by validation` : `${l} data · ${pct(c.comp[m])} complete`}${f && l !== 'Live' ? ` · ${f} flags` : ''}</p></div></div>`).join('') || li('ok', 'All clear', 'No open flags this month.')}</div>
      </div>
      <div class="panel"><div class="ph"><h3>Monthly close · ${monthLabel(m)}</h3><span class="note">Step ${step} of 7</span></div>
        <div class="close-steps">${['Data pulled from sources', 'Validation rules run', 'Gaps filled & flagged', 'Unit owners signed off', 'Footprints recalculated', 'Changes reviewed', 'Published'].map((n, i) => `<div class="close-step"><span class="check ${i < step ? 'ok' : i === step ? 'warn' : 'mute'}">${i < step ? '✓' : i === step ? '…' : '–'}</span><span>${n}</span><span class="note">${i < step ? 'done' : i === step ? 'in progress' : ''}</span></div>`).join('')}</div>
      </div>
    </div>
  </div>
  <div class="grid g3">
    <div class="panel"><div class="ph"><h3>Product footprints</h3><button class="tag" data-goto="products" style="cursor:pointer;border:0">Open →</button></div><div id="dashPcf"></div><p class="note">g CO₂e/MJ · cradle-to-gate · unit sub-division (sulphur per tonne in Products)</p></div>
    <div class="panel"><div class="ph"><h3>By source · ${Y0 + y - 1}</h3><button class="tag" data-goto="impact" style="cursor:pointer;border:0">Analyse →</button></div><div id="dashCat"></div></div>
    <div class="panel"><div class="ph"><h3>Data sources</h3><button class="tag" data-goto="integrations" style="cursor:pointer;border:0">Manage →</button></div>
      <div class="list">${CONNECTORS.slice(0, 6).map((c) => { const v = c.health[y - 1]; const k = v >= .98 ? 'ok' : v >= .9 ? 'warn' : 'bad'; return `<div class="li"><span class="check ${k}">${k === 'ok' ? '✓' : '!'}</span><div class="li-main"><b>${c.name}</b><p>Last sync ${c.sync} · ${pct(v)} on time</p></div></div>`; }).join('')}</div></div>
  </div>
  <div class="grid g2">
    <div class="panel"><div class="ph"><h3>Recent activity</h3><button class="tag" data-goto="audit" style="cursor:pointer;border:0">Audit log →</button></div><div class="list">${AUDIT.slice(0, 5).map((a) => li(a.k === 'Access' ? 'mute' : 'ok', `${esc(a.what)}`, `${esc(a.who)} · ${esc(a.when)}`)).join('')}</div></div>
    <div class="panel"><div class="ph"><h3>Coming up</h3></div><div class="list">
      ${li('mute', `Release v${['4.4', '4.8', '5.2'][y - 1]}`, 'Quarterly release; test window opens 10 days before.')}
      ${li('mute', 'Background database update', 'Annual update; impact report sent to approvers before adoption.')}
      ${li('mute', y === 1 ? 'Critical review of baseline footprints' : y === 2 ? 'EPD verification visit (remote)' : 'Annual re-verification', 'External reviewer gets read-only access with full lineage.')}
      ${li('mute', `Year ${y} inventory freeze`, `31 Dec ${Y0 + y - 1}: the year’s data becomes read-only.`)}
    </div></div>
  </div>`;
  },
  after: () => {
    $$('.li[data-cp]', $('#view')).forEach((b) => b.addEventListener('click', () => { state.cp = b.dataset.cp; goto('site'); }));
    mountMap($('#dashMap')); drawPins();
    const y = state.year;
    const rows = pcf({ year: y, fu: 'mj', alloc: 'subdiv' }).rows.filter((p) => Number.isFinite(p.val));
    const mx = Math.max(...rows.map((p) => p.val));
    $('#dashPcf').innerHTML = rows.map((p) => `<div class="hbar"><span>${p.name}</span><div class="hbar-track"><i style="width:${(p.val / mx) * 100}%;background:var(--barsel)"></i></div><b style="text-align:right;font-weight:600">${fmtN(p.val, 2)}</b></div>`).join('');
    const ct = {}; LIVE.filter((c) => c.cat !== 'down').forEach((c) => { ct[c.cat] = (ct[c.cat] || 0) + yearTotal(c, y); });
    const tot = sum(Object.values(ct));
    $('#dashCat').innerHTML = `<div class="hbar-track" style="height:16px;margin:4px 0 12px">${CAT_ORDER.map((k) => `<i style="width:${(ct[k] / tot) * 100}%;background:${CATS[k].color}"></i>`).join('')}</div>` + CAT_ORDER.map((k) => `<div class="ycard-row" style="padding:5px 0;border-top:1px solid var(--line)"><span style="display:inline-flex;gap:7px;align-items:center;color:var(--ink2)"><i class="dot" style="background:${CATS[k].color}"></i>${CATS[k].label} <span class="muted">${CATS[k].scope}</span></span><b>${fmtT(ct[k])}</b></div>`).join('');
    if (!strataReady()) return;
    const rws = [...Array(36)].map((_, m) => { const r = { date: iso(Y0 + Math.floor(m / 12), m % 12) }; CAT_ORDER.forEach((k) => { r[k] = Math.round(sum(LIVE.filter((c) => c.cat === k).map((c) => c.monthly[m]))); }); return r; });
    Strata.mount('#dashHero', {
      data: rws, time: 'date', columns: Object.fromEntries(CAT_ORDER.map((k) => [k, k])),
      series: CAT_ORDER.map((k) => ({ key: k, label: CATS[k].short, color: catColor(k) })),
      primary: 'total', totalLabel: 'Cradle-to-gate', kind: 'number', heroCompact: true, axisUnit: 'tCO₂e / month',
      title: 'Cradle-to-gate emissions · monthly', heroLabel: 'tCO₂e since subscription start', hero: 'total',
      periods: ['month', 'quarter', 'year'], period: 'year', selection: [iso(Y0 + y - 1, 0), iso(Y0 + y, 0), 'year'], tools: ['table', 'expand'],
      calloutCaption: (s) => `vs the previous ${s.period === 'custom' ? 'period' : s.period}`,
      theme: state.palette, mode: strataMode(), height: 250, maxBarWidth: 12, barWidth: 0.6,
    }).then((h) => track(h.chart)).catch((e) => { $('#dashHero').textContent = 'Chart failed: ' + e.message; });
  },
});
