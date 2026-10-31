
/* =====================================================================
   03 · Goal & scope
   ===================================================================== */
sec({ id: 'scope', group: 'The solution', title: 'Phase 1 · Goal and scope', nav: 'Goal & scope', refs: ['C1 Scope', 'C5 Modelling flexibility', 'ISO 14040/44 · 14067'],
  lead: 'Every footprint starts with four choices: what unit it is per, which life-cycle stages it covers, how a shared refinery’s emissions are split across products, and which impact method converts gases to CO₂e. Change any of them: the footprints below recalculate and the choice is recorded with the study.',
  render: () => `
  <div class="panel">
    <div class="ph"><h3>System boundary</h3><div class="radio-row" id="bound">${Object.entries(BOUNDS).map(([k, b]) => `<button class="opt" data-v="${k}">${b.label}<small>${b.note}</small></button>`).join('')}</div></div>
    <div class="bwrap"><div class="bframe" id="bframe"><span id="bframeLabel"></span></div>
      <div class="boundary" id="bnodes">
        ${[['up', 'Crude extraction', 'Upstream fields · CP-01'], ['up', 'Inputs & transport', 'Chemicals, catalysts, gas · CP-17'], ['site', 'Refinery processes', 'CP-02 … CP-14, CP-18'], ['site', 'Products at gate', '7 co-products, allocated'], ['dist', 'Distribution', 'Jetty & trucks · CP-15, 16'], ['use', 'Use (combustion)', 'Fuel burned by customer']].map(([k, b, s]) => `<div class="bnode" data-k="${k}"><b>${b}</b><span>${s}</span></div>`).join('')}
      </div></div>
  </div>
  <div class="grid g3">
    <div class="panel"><div class="ph"><h3>Functional unit</h3></div><div class="radio-row" id="fu">${Object.entries(FUNITS).map(([k, f]) => `<button class="opt" data-v="${k}">${f.label}<small>${f.unit}</small></button>`).join('')}</div>
      <p class="note" style="margin-top:10px">Per MJ suits fuel comparisons (and customer requests); per tonne suits sulphur and naphtha; per barrel suits trading.</p></div>
    <div class="panel"><div class="ph"><h3>Allocation</h3></div><div class="radio-row" id="alloc">${Object.entries(ALLOC).map(([k, a]) => `<button class="opt" data-v="${k}">${a.label}<small>${a.note}</small></button>`).join('')}</div></div>
    <div class="panel"><div class="ph"><h3>Impact method &amp; rules</h3></div>
      <table class="tbl"><tbody>
        <tr><td class="muted">Climate</td><td><b style="font-weight:600">IPCC AR6 GWP100</b> (CH₄ fossil 29.8, N₂O 273)</td></tr>
        <tr><td class="muted">Also available</td><td>GWP20, EF 3.1, ReCiPe 2016, TRACI 2.1</td></tr>
        <tr><td class="muted">Cut-off</td><td>&lt; 1% of mass, energy or GWP; sum of exclusions &lt; 5%</td></tr>
        <tr><td class="muted">Standards</td><td>ISO 14040/44, ISO 14067, GHG Protocol Product Standard, PACT methodology</td></tr>
        <tr><td class="muted">Reporting year</td><td>Contract year ${state.year} (switch at top)</td></tr>
      </tbody></table></div>
  </div>
  <div class="panel">
    <div class="ph"><h3 id="pcfTitle">Product carbon footprints</h3><span class="note" id="pcfNote"></span></div>
    <div id="pcfBars"></div>
    <p class="note" style="margin-top:8px" id="pcfFoot"></p>
  </div>`,
  after: () => {
    const bind = (id, key) => $$(`#${id} .opt`).forEach((b) => b.addEventListener('click', () => { state[key] = b.dataset.v; drawScope(); }));
    bind('bound', 'bound'); bind('fu', 'fu'); bind('alloc', 'alloc');
    drawScope();
  },
  onYear: () => drawScope(),
});
function drawScopeFoot() {
  $('#pcfFoot').innerHTML = (state.alloc === 'energy' && state.fu === 'mj' && state.bound !== 'c2gr' ? '<b class="ink2">Energy allocation per MJ gives every fuel the same footprint by definition.</b> Switch to unit sub-division to see which products really carry the load. ' : '') + 'Bars split each footprint by source category. Sample data. Changing allocation moves footprint between products; the site total does not change.';
}
function drawScope() {
  setTimeout(drawScopeFoot);
  ['bound', 'fu', 'alloc'].forEach((id) => $$(`#${id} .opt`).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === state[id]))));
  const inc = { g2g: ['site'], c2g: ['up', 'site'], c2c: ['up', 'site', 'dist'], c2gr: ['up', 'site', 'dist', 'use'] }[state.bound];
  const nodes = $$('#bnodes .bnode');
  nodes.forEach((n) => n.classList.toggle('is-out', !inc.includes(n.dataset.k)));
  const ins = nodes.filter((n) => inc.includes(n.dataset.k));
  const wrap = $('#bnodes').getBoundingClientRect();
  const a = ins[0].getBoundingClientRect(), b = ins[ins.length - 1].getBoundingClientRect();
  const fr = $('#bframe');
  if (wrap.width && a.top === b.top) { fr.style.display = ''; fr.style.left = (a.left - wrap.left - 6) + 'px'; fr.style.right = (wrap.right - b.right - 6) + 'px'; } else fr.style.display = 'none';
  $('#bframeLabel').textContent = BOUNDS[state.bound].label;
  const r = pcf({ year: state.year, alloc: state.alloc, bound: state.bound, fu: state.fu });
  const mx = Math.max(...r.rows.map((x) => x.val).filter(Number.isFinite));
  const unit = FUNITS[state.fu].unit;
  $('#pcfTitle').textContent = `Product carbon footprints · Year ${state.year}`;
  $('#pcfNote').textContent = `${BOUNDS[state.bound].label} · ${ALLOC[state.alloc].label} · ${unit} · allocated total ${fmtT(r.E)}`;
  $('#pcfBars').innerHTML = r.rows.map((p) => {
    const ok = Number.isFinite(p.val);
    const upstreamUse = state.bound === 'c2gr' ? p.use / p.kgt : 0;
    const segs = CAT_ORDER.map((k) => `<i style="width:${ok ? (p.val / mx) * (1 - upstreamUse) * p.mix[k] * 100 : 0}%;background:${CATS[k].color}" title="${CATS[k].short}"></i>`).join('')
      + (upstreamUse ? `<i style="width:${(p.val / mx) * upstreamUse * 100}%;background:repeating-linear-gradient(45deg,var(--faint) 0 3px,transparent 3px 6px)" title="Use phase"></i>` : '');
    return `<div class="hbar"><span>${p.name}</span><div class="hbar-track">${segs}</div><b style="text-align:right;font-weight:600">${ok ? fmtN(p.val, state.fu === 'mj' ? 1 : 0) : 'n/a'}</b></div>`;
  }).join('') + `<div class="legend" style="margin-top:8px">${CAT_ORDER.map((k) => `<span><i class="dot" style="background:${CATS[k].color}"></i>${CATS[k].short}</span>`).join('')}${state.bound === 'c2gr' ? '<span><i class="dot" style="background:repeating-linear-gradient(45deg,var(--faint) 0 2px,transparent 2px 4px)"></i>Use phase</span>' : ''}</div>`;
}

/* =====================================================================
   04 · Inventory & data management
   ===================================================================== */
sec({ id: 'inventory', group: 'The solution', title: 'Phase 2 · Inventory and data management', nav: 'Inventory & data', refs: ['C4 Data management', 'C3 Integration', 'C2 HSE'],
  lead: 'How 18 collection points become one auditable inventory: connectors pull from the plant historian, ERP, laboratory and emission monitors; rules check each value; gaps are filled only with a flagged method; every number keeps its source, owner and version.',
  render: () => `
  <div class="panel">
    <div class="ph"><h3>Data pipeline</h3><span class="note">Read-only connections; nothing writes back to plant systems</span></div>
    <div class="pipeline">
      <div class="pipe-col"><span>Sources</span>
        ${[['AVEVA PI historian', '1-min plant tags · 14 points'], ['SAP S/4HANA', 'MM, PM, SD: purchases, cargoes, prices'], ['LIMS', 'Composition, LHV, density'], ['CEMS', 'Stack CO₂ / O₂ / CO'], ['LDAR & flare meters', 'Surveys, ultrasonic flow'], ['Excel templates', 'Supplier data, certificates']].map(([a, b]) => `<div class="pipe-node"><div>${a}<small>${b}</small></div></div>`).join('')}</div>
      <div class="pipe-col"><span>Staging</span>
        ${[['Connector service', 'OPC UA / PI Web API, OData, SFTP'], ['Unit conversion', 'Sm³ → t, MWh → GJ, by tag metadata'], ['Time alignment', 'Hourly → monthly, calendar-correct'], ['Lineage stamp', 'Source, extract time, hash']].map(([a, b]) => `<div class="pipe-node"><div>${a}<small>${b}</small></div><span class="badge ok">on</span></div>`).join('')}</div>
      <div class="pipe-col"><span>Validation</span>
        ${[['Mass balance closure', '± 2% crude in vs products out', 'ok'], ['Carbon balance', 'Fuel carbon vs CEMS ± 5%', 'ok'], ['Range & spike checks', '3σ against 90-day profile', 'ok'], ['Gap filling', 'Flagged; owner must approve', 'warn'], ['Duplicate / unit errors', 'Blocked before the model', 'ok']].map(([a, b, k]) => `<div class="pipe-node"><div>${a}<small>${b}</small></div><span class="badge ${k}">${k === 'ok' ? 'auto' : 'review'}</span></div>`).join('')}</div>
      <div class="pipe-col"><span>Inventory (LCI)</span>
        ${[['Monthly unit inventories', '18 points × 36 months'], ['Annual frozen version', 'Y1, Y2, Y3 snapshots, never edited'], ['Audit trail', 'Who changed what, when, why'], ['Owner sign-off', 'Per unit, per month']].map(([a, b]) => `<div class="pipe-node"><div>${a}<small>${b}</small></div></div>`).join('')}</div>
    </div>
  </div>
  <div class="grid g-side">
    <div class="panel">
      <div class="ph"><h3>Collection matrix · Year <span id="invY">${state.year}</span></h3><span class="note">Click a row to open it on the site landscape</span></div>
      <div class="scroll-x"><table class="tbl" id="invTbl"></table></div>
    </div>
    <div class="stack">
      <div id="compCard" class="st-mount"></div>
      <div class="panel">
        <div class="ph"><h3>Audit trail (sample)</h3></div>
        <div class="list">
          ${li('ok', 'FI-11U flare flow, Mar: 3 spikes removed', 'Rule: spike > 3σ, confirmed by unit owner (Operations, Flare system). v2 → v3.')}
          ${li('warn', 'LDAR-TF1 Q2 survey late', 'Gap filled with Q1 leak rate × 1.1; flagged until survey upload.')}
          ${li('ok', 'Crude grade mix updated, cargo 27-114', 'SAP MM sync; upstream intensity recalculated for 1 month.')}
          ${li('ok', 'Year 1 inventory frozen', 'Hash a91f…c07; used by baseline PCF report and critical review.')}
        </div>
      </div>
    </div>
  </div>`,
  after: () => { drawInv(); mountComp(); },
  onYear: () => { drawInv(); },
});
function drawInv() {
  const y = state.year;
  $('#invY').textContent = y;
  const yc = (c) => sum(c.comp.slice((y - 1) * 12, y * 12)) / 12;
  $('#invTbl').innerHTML = `<thead><tr><th>CP</th><th>Collection point</th><th>Scope</th><th>Main source</th><th class="num">Year ${y} CO₂e</th><th class="num">Complete</th><th class="num">Auto</th><th class="num">DQR</th><th>Status</th></tr></thead><tbody>${CPS.map((c) => {
    const [k, l] = status(yc(c));
    return `<tr class="is-click" data-cp="${c.id}"><td><b style="font-weight:600">${c.id}</b></td><td>${esc(c.name)}</td><td class="muted">${esc(c.scope)}</td><td class="muted">${esc(c.feeds[0][1])}</td><td class="num">${c.cat === 'data' ? '—' : fmtT(yearTotal(c, y))}</td><td class="num">${pct(yc(c))}</td><td class="num">${pct(c.auto[y - 1])}</td><td class="num">${fmtN(dqr(c, y), 1)}</td><td><span class="badge ${k}">${l}</span></td></tr>`;
  }).join('')}</tbody>`;
  $$('#invTbl tr[data-cp]').forEach((r) => r.addEventListener('click', () => { state.cp = r.dataset.cp; goto('site'); }));
}
function mountComp() {
  if (!strataReady()) return;
  const rows = [...Array(36)].map((_, m) => ({ date: iso(Y0 + Math.floor(m / 12), m % 12), comp: sum(CPS.map((c) => c.comp[m])) / CPS.length }));
  Strata.mountCard('#compCard', { data: rows, time: 'date', columns: { comp: 'comp' }, series: [{ key: 'comp', label: 'Completeness' }], kind: 'percent', metric: 'mean', style: 'line', title: 'Site data completeness', label: 'average across 18 points', periods: ['quarter', 'year'], period: 'year', tools: [], icon: false, theme: state.palette, mode: strataMode(), height: 110, domain: [0.5, 1] })
    .then(track).catch(() => {});
}

/* =====================================================================
   05 · Impact & footprints (Strata hero chart)
   ===================================================================== */
sec({ id: 'impact', group: 'The solution', title: 'Phase 3 · Impact assessment and footprints', nav: 'Impact & footprints', refs: ['C4 Reporting & visualisation', 'C1 Scope'],
  lead: 'The inventory converted to CO₂e for all 156 weeks of the contract, stacked by source. Click a bar to select its month, quarter or year (tabs); drag across bars for any range. The cards above follow the selection.',
  render: () => `
  <div class="grid g3 inv" id="impCards"><section id="ic1"></section><section id="ic2"></section><section id="ic3"></section></div>
  <section id="impHero" class="st-mount inv"></section>
  <div class="grid g2">
    <div class="panel">
      <div class="ph"><h3>Hotspots · Year <span class="yy">${state.year}</span></h3><span class="note">Share of cradle-to-gate</span></div>
      <div id="hot"></div>
    </div>
    <div class="panel">
      <div class="ph"><h3>Footprints, Year 1 → Year <span class="yy">${state.year}</span></h3><span class="note">Cradle-to-gate · unit sub-division · g CO₂e/MJ</span></div>
      <div class="scroll-x"><table class="tbl" id="pcfCmp"></table></div>
    </div>
  </div>`,
  after: () => { mountHero(); drawImpact(); },
  onYear: () => drawImpact(),
});
function mountHero() {
  if (!strataReady()) { $('#impHero').innerHTML = '<div class="panel">Strata Charts did not load.</div>'; return; }
  const rows = [];
  const start = Date.UTC(Y0, 0, 4);
  const r = rng(77);
  for (let w = 0; w < 156; w++) {
    const t = start + w * 7 * 864e5, d = new Date(t);
    const m = clamp((d.getUTCFullYear() - Y0) * 12 + d.getUTCMonth(), 0, 35);
    const row = { date: d.toISOString().slice(0, 10) };
    CAT_ORDER.forEach((k) => { row[k] = Math.round(sum(LIVE.filter((c) => c.cat === k).map((c) => c.monthly[m])) * 7 / daysIn(m) * (1 + (r() - 0.5) * 0.05)); });
    rows.push(row);
  }
  const base = sum(rows.slice(0, 52).map((x) => sum(CAT_ORDER.map((k) => x[k])))) / 52;
  rows.forEach((x, w) => { x.target = Math.round(base * (1 - 0.10 * (w / 155))); });
  Strata.mount('#impHero', {
    data: rows, time: 'date', columns: Object.fromEntries([...CAT_ORDER, 'target'].map((k) => [k, k])),
    series: [...CAT_ORDER.map((k) => ({ key: k, label: CATS[k].short, color: catColor(k) })), { key: 'target', label: 'Target pathway (−10%)', type: 'line', dash: '4 4' }],
    primary: 'total', totalLabel: 'Cradle-to-gate', kind: 'number', heroCompact: true, axisUnit: 'tCO₂e / week',
    title: 'Cradle-to-gate emissions · weekly · contract years 1–3 (sample)', heroLabel: 'tCO₂e over three years',
    periods: ['month', 'quarter', 'year'], period: 'quarter', selection: 'latest', tools: ['table'],
    calloutCaption: (s) => `vs the previous ${s.period === 'custom' ? 'period' : s.period}`,
    theme: state.palette, mode: strataMode(), height: 300,
    cards: [
      { el: '#ic1', title: 'Process CO₂', label: 'SMR, FCC, SRU', style: 'bars', periods: [], icon: false, series: [{ key: 'proc', label: 'Process', color: catColor('proc') }] },
      { el: '#ic2', title: 'Flaring & fugitives', label: 'Flare, tanks, wastewater', style: 'line', periods: [], icon: false, series: [{ key: 'flare', label: 'Flare/fugitive', color: catColor('flare') }] },
      { el: '#ic3', title: 'Purchased electricity', label: 'Scope 2, market-based', style: 'area', periods: [], icon: 'grid', series: [{ key: 'elec', label: 'Electricity', color: catColor('elec') }] },
    ],
  }).then((h) => { track(h.chart); h.cards.forEach(track); }).catch((e) => { $('#impHero').textContent = 'Chart failed: ' + e.message; });
}
function drawImpact() {
  const y = state.year;
  $$('.yy').forEach((e) => { e.textContent = y; });
  const items = LIVE.filter((c) => c.cat !== 'down').map((c) => [c, yearTotal(c, y)]).sort((a, b) => b[1] - a[1]);
  const tot = sum(items.map((x) => x[1]));
  $('#hot').innerHTML = items.slice(0, 9).map(([c, v]) => `<div class="hbar"><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(c.name)}">CP-${c.id} ${esc(c.name.split(' (')[0].split(' &')[0])}</span><div class="hbar-track"><i style="width:${(v / items[0][1]) * 100}%;background:${CATS[c.cat].color}"></i></div><b style="text-align:right;font-weight:600">${pct(v / tot, 1)}</b></div>`).join('');
  const a = pcf({ year: 1, fu: 'mj', alloc: 'subdiv' }).rows, b = pcf({ year: y, fu: 'mj', alloc: 'subdiv' }).rows;
  $('#pcfCmp').innerHTML = `<thead><tr><th>Product</th><th class="num">Year 1</th><th class="num">Year ${y}</th><th class="num">Change</th></tr></thead><tbody>${a.map((p, i) => { const d = b[i].val / p.val - 1; return `<tr><td>${p.name}</td><td class="num">${fmtN(p.val, 2)}</td><td class="num"><b style="font-weight:600">${fmtN(b[i].val, 2)}</b></td><td class="num ${d < 0 ? 'up' : d > 0 ? 'down' : ''}">${y === 1 || !Number.isFinite(d) ? '—' : sgn(d)}</td></tr>`; }).join('')}</tbody>`;
}

/* =====================================================================
   06 · Scenarios & interpretation
   ===================================================================== */
const LEVERS = [
  { k: 'grid', label: 'Grid emission factor', unit: 't CO₂e/MWh', min: 0.05, max: 0.45, step: 0.01, cat: 'elec', note: 'Cleaner UAE grid (nuclear + solar) or certificates', f: (v) => v / 0.40 },
  { k: 'flare', label: 'Flare gas recovery', unit: '% less flaring', min: 0, max: 90, step: 5, cat: 'flare', note: 'FGRU capacity and routine-flare elimination', f: (v) => 1 - v / 100, part: (c) => c.id === '11' },
  { k: 'eff', label: 'Furnace & cogen efficiency', unit: '% fuel saved', min: 0, max: 15, step: 1, cat: 'fire', note: 'Heat recovery, O₂ trim, cogen upgrades', f: (v) => 1 - v / 100 },
  { k: 'ccs', label: 'CO₂ capture on hydrogen plant', unit: '% captured', min: 0, max: 90, step: 5, cat: 'proc', note: 'Process CO₂ is ~60% of SMR emissions', f: (v) => 1 - 0.6 * v / 100, part: (c) => c.id === '07' },
  { k: 'ldar', label: 'Methane leak repair (LDAR)', unit: '% fewer leaks', min: 0, max: 80, step: 5, cat: 'flare', note: 'Tanks and wastewater fugitives', f: (v) => 1 - v / 100, part: (c) => ['02', '13', '14'].includes(c.id) },
  { k: 'crude', label: 'Lower-intensity crude slate', unit: '% upstream CI', min: 0, max: 30, step: 1, cat: 'up', note: 'Supplier-specific crude intensities', f: (v) => 1 - v / 100, part: (c) => c.id === '01' },
];
function scenTotal(sc, which = null) {
  return sum(LIVE.filter((c) => c.cat !== 'down').map((c) => {
    let v = yearTotal(c, 1);
    LEVERS.forEach((L) => { if ((which === null || which === L.k) && c.cat === L.cat && (!L.part || L.part(c))) v *= L.f(sc[L.k]); });
    return v;
  }));
}
sec({ id: 'scenarios', group: 'The solution', title: 'Phase 4 · Interpretation and scenarios', nav: 'Scenarios', refs: ['C5 Modelling flexibility', 'C4 Reporting'],
  lead: 'Interpretation turns the footprint into decisions. Move the levers to build a decarbonisation case against the Year 1 baseline; the waterfall, diesel footprint, sensitivity and uncertainty update together. Scenarios are saved as branches of the model, never overwriting measured data.',
  render: () => `
  <div class="grid g-side-l">
    <div class="panel">
      <div class="ph"><h3>Levers</h3><button class="pill" id="scReset">Reset</button></div>
      <div id="levers">${LEVERS.map((L) => `<div class="slider-row"><div class="flex"><b>${L.label}</b><output id="o-${L.k}"></output></div><input type="range" min="${L.min}" max="${L.max}" step="${L.step}" data-k="${L.k}" value="${state.scen[L.k]}" aria-label="${L.label}"><span class="note">${L.note}</span></div>`).join('')}</div>
    </div>
    <div class="stack">
      <div class="grid g3">
        <div class="panel tight" id="sc1"></div><div class="panel tight" id="sc2"></div><div class="panel tight" id="sc3"></div>
      </div>
      <div class="panel"><div class="ph"><h3>Year 1 baseline → scenario</h3><span class="note">Cradle-to-gate, sample site</span></div><div id="wf"></div></div>
      <div class="grid g2">
        <div class="panel"><div class="ph"><h3>Sensitivity (± lever range)</h3></div><div id="tornado"></div></div>
        <div class="panel"><div class="ph"><h3>Uncertainty · 2,000 Monte Carlo runs</h3></div><div id="mc"></div></div>
      </div>
    </div>
  </div>`,
  after: () => {
    $$('#levers input').forEach((i) => i.addEventListener('input', () => { state.scen[i.dataset.k] = +i.value; drawScen(); }));
    $('#scReset').addEventListener('click', () => { state.scen = { grid: 0.40, flare: 0, eff: 0, ccs: 0, ldar: 0, crude: 0 }; $$('#levers input').forEach((i) => { i.value = state.scen[i.dataset.k]; }); drawScen(); });
    drawScen();
  },
});
function drawScen() {
  const sc = state.scen;
  LEVERS.forEach((L) => { $('#o-' + L.k).textContent = `${L.k === 'grid' ? fmtN(sc[L.k], 2) : sc[L.k]} ${L.unit}`; });
  const base = scenTotal({ grid: 0.40, flare: 0, eff: 0, ccs: 0, ldar: 0, crude: 0 });
  const tot = scenTotal(sc);
  const d = tot / base - 1;
  const dsl0 = pcf({ year: 1, fu: 'mj' }).rows[2].val;
  const dsl1 = pcf({ year: 1, fu: 'mj', override: (c) => { let v = yearTotal(c, 1); LEVERS.forEach((L) => { if (c.cat === L.cat && (!L.part || L.part(c))) v *= L.f(sc[L.k]); }); return v; } }).rows[2].val;
  $('#sc1').innerHTML = kpi(fmtT(tot), `Scenario total · <span class="${d < 0 ? 'up' : ''}" style="font-weight:700">${sgn(d)}</span>`);
  $('#sc2').innerHTML = kpi(fmtN(dsl1, 2), `Diesel g CO₂e/MJ (was ${fmtN(dsl0, 2)})`);
  $('#sc3').innerHTML = kpi(d <= -0.10 ? 'On track' : 'Short', `vs −10% target pathway by Year 3`);
  // waterfall
  const steps = LEVERS.map((L) => { const only = { grid: 0.40, flare: 0, eff: 0, ccs: 0, ldar: 0, crude: 0, [L.k]: sc[L.k] }; return [L.label, scenTotal(only) - base]; });
  const W = 640, H = 210, pl = 6, pb = 46, n = steps.length + 2, bw = (W - pl * 2) / n;
  const lo = Math.min(tot, base) * 0.9, hi = base * 1.01;
  const yv = (v) => 10 + (H - pb - 10) * (1 - (v - lo) / (hi - lo));
  let run = base, bars = '';
  const bar = (i, a, b, fill, lab, val) => {
    const x = pl + i * bw + bw * 0.18, w = bw * 0.64;
    bars += `<rect x="${x.toFixed(1)}" y="${Math.min(yv(a), yv(b)).toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(1, Math.abs(yv(a) - yv(b))).toFixed(1)}" rx="2" fill="${fill}"/>`;
    bars += `<text x="${(x + w / 2).toFixed(1)}" y="${(Math.min(yv(a), yv(b)) - 4).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="700" fill="var(--ink)">${val}</text>`;
    bars += `<foreignObject x="${(pl + i * bw).toFixed(1)}" y="${H - pb + 4}" width="${bw.toFixed(1)}" height="${pb}"><div xmlns="http://www.w3.org/1999/xhtml" style="font:500 10px var(--font);color:var(--muted);text-align:center;line-height:1.2">${lab}</div></foreignObject>`;
  };
  bar(0, lo, base, 'var(--barsel)', 'Year 1 baseline', fmtT(base));
  steps.forEach(([lab, dv], i) => { bar(i + 1, run, run + dv, Math.abs(dv) < 1 ? 'var(--faint)' : dv < 0 ? 'var(--up)' : 'var(--down)', lab, dv === 0 ? '0' : '−' + fmtT(-dv)); run += dv; });
  bar(n - 1, lo, tot, 'var(--ink)', 'Scenario', fmtT(tot));
  $('#wf').innerHTML = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block" role="img" aria-label="Waterfall from baseline to scenario">${bars}<line x1="0" x2="${W}" y1="${yv(lo)}" y2="${yv(lo)}" stroke="var(--line2)"/></svg>`;
  // tornado
  const sens = LEVERS.map((L) => { const a = scenTotal({ ...sc, [L.k]: L.min }) - tot, b = scenTotal({ ...sc, [L.k]: L.max }) - tot; return [L.label, Math.min(a, b), Math.max(a, b)]; }).sort((x, y) => (y[2] - y[1]) - (x[2] - x[1]));
  const sm = Math.max(...sens.map((s) => Math.max(Math.abs(s[1]), Math.abs(s[2])))) || 1;
  $('#tornado').innerHTML = sens.map(([l, a, b]) => `<div class="tornado-row"><span>${l}</span><div class="tornado-bar"><i style="left:${50 + (a / sm) * 50}%;width:${((Math.min(0, b) - a) / sm) * 50}%;background:var(--up)"></i><i style="left:50%;width:${(Math.max(0, b) / sm) * 50}%;background:var(--down)"></i></div></div>`).join('') + '<p class="note" style="margin-top:6px">Green: lever at its strongest; red: lever relaxed. Centre line = current scenario.</p>';
  // monte carlo
  const r = rng(5), runs = [];
  const sd = { up: .09, fire: .025, proc: .035, flare: .12, elec: .05 };
  const catT = {}; LIVE.filter((c) => c.cat !== 'down').forEach((c) => { let v = yearTotal(c, 1); LEVERS.forEach((L) => { if (c.cat === L.cat && (!L.part || L.part(c))) v *= L.f(sc[L.k]); }); catT[c.cat] = (catT[c.cat] || 0) + v; });
  for (let i = 0; i < 2000; i++) { let t = 0; CAT_ORDER.forEach((k) => { const z = Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r()); t += catT[k] * (1 + sd[k] * z); }); runs.push(t); }
  runs.sort((a, b) => a - b);
  const p5 = runs[100], p95 = runs[1900], mn = runs[0], mxr = runs[1999];
  const bins = 28, hist = Array(bins).fill(0); runs.forEach((v) => hist[Math.min(bins - 1, Math.floor((v - mn) / (mxr - mn) * bins))]++);
  const hm = Math.max(...hist);
  $('#mc').innerHTML = `<svg viewBox="0 0 300 120" style="width:100%;height:auto;display:block" role="img" aria-label="Histogram of simulated totals">${hist.map((h, i) => { const x0 = mn + (i / bins) * (mxr - mn); const inCI = x0 >= p5 && x0 <= p95; return `<rect x="${(i * 300 / bins + 1).toFixed(1)}" y="${(100 - h / hm * 92).toFixed(1)}" width="${(300 / bins - 2).toFixed(1)}" height="${(h / hm * 92).toFixed(1)}" rx="1.5" fill="${inCI ? 'var(--barsel)' : 'var(--bar)'}"/>`; }).join('')}<line x1="0" x2="300" y1="100" y2="100" stroke="var(--line2)"/><text x="0" y="114" font-size="10" fill="var(--muted)">${fmtT(mn)}</text><text x="300" y="114" font-size="10" fill="var(--muted)" text-anchor="end">${fmtT(mxr)}</text></svg>
    <p class="note" style="margin-top:4px">90% interval <b class="ink2">${fmtT(p5)} – ${fmtT(p95)}</b> (±${pct((p95 - p5) / 2 / tot, 1)}). Spread per category from its data-quality rating; upstream crude and fugitives dominate.</p>`;
}

/* =====================================================================
   07 · Reporting & visualisation
   ===================================================================== */
sec({ id: 'reporting', group: 'The solution', title: 'Reporting and visualisation', nav: 'Reporting', refs: ['C4 Reporting & visualisation', 'C5 Workflow efficiency'],
  lead: 'Every number on every screen can go out as a report, an export or a live feed, each one tied to a frozen inventory version so a figure quoted in Year 1 can be reproduced in Year 3.',
  render: () => {
    const R = [
      ['Product carbon footprint report (ISO 14067)', 'Per product, per study; methods, boundary, allocation, data quality', ['Issued', 'Issued', 'Monthly']],
      ['Critical review pack (ISO 14071)', 'Model, LCI, assumptions and change log for the reviewer', ['Issued', 'Updated', 'Updated']],
      ['Environmental Product Declaration (EPD)', 'Programme-operator format, third-party verified', ['—', 'Issued', 'Renewed']],
      ['Corporate GHG input (Scope 1, 2, 3)', 'Feeds group sustainability reporting', ['Issued', 'Issued', 'Issued']],
      ['Customer PCF requests (PACT format)', 'Signed JSON data exchange per product and delivery', ['Pilot', 'Live', 'Live']],
      ['Decarbonisation scenario book', 'Scenario branches, waterfall, sensitivity, uncertainty', ['—', 'Issued', 'Issued']],
      ['Data quality & completeness report', 'Per collection point, monthly; open flags with owners', ['Monthly', 'Monthly', 'Monthly']],
    ];
    const bd = (s) => `<span class="badge ${s === '—' ? 'mute' : s === 'Pilot' ? 'warn' : 'ok'}">${s}</span>`;
    return `
  <div class="grid g-side">
    <div class="panel">
      <div class="ph"><h3>Report catalogue across the contract</h3></div>
      <div class="scroll-x"><table class="tbl"><thead><tr><th>Report</th><th>Year 1</th><th>Year 2</th><th>Year 3</th></tr></thead><tbody>
        ${R.map(([a, b, s]) => `<tr><td><b style="font-weight:600">${a}</b><div class="note">${b}</div></td>${s.map((x) => `<td>${bd(x)}</td>`).join('')}</tr>`).join('')}
      </tbody></table></div>
      <div class="hr" style="margin:14px 0"></div>
      <div class="eyebrow" style="margin-bottom:8px">Exports &amp; connections</div>
      <div class="flex">${['PDF', 'Word', 'Excel', 'CSV', 'ILCD / EcoSpold2', 'JSON-LD', 'PACT API', 'REST API', 'Power BI connector', 'PNG / SVG charts'].map((x) => `<span class="tag">${x}</span>`).join('')}</div>
    </div>
    <div class="stack">
      <div class="doc-prev" aria-label="Report preview">
        <div class="flex between"><span class="eyebrow">Preview</span><span class="badge ok">v3 · frozen Y${state.year}</span></div>
        <h4>Product carbon footprint: Diesel (ULSD)</h4>
        <div class="note">Cradle-to-gate · 1 MJ (LHV) · energy allocation · IPCC AR6 GWP100</div>
        <div class="kpi" style="margin:6px 0"><b>${fmtN(pcf({ year: state.year, fu: 'mj' }).rows[2].val, 2)} g CO₂e/MJ</b><span>Sample data</span></div>
        <div class="hbar-track" style="height:10px">${CAT_ORDER.map((k) => `<i style="width:${PRODUCTS[2].mix[k] * 100}%;background:${CATS[k].color}"></i>`).join('')}</div>
        <div class="ln" style="width:92%"></div><div class="ln" style="width:80%"></div><div class="ln" style="width:86%"></div><div class="ln" style="width:60%"></div>
        <div class="note">1 Goal &amp; scope · 2 Inventory · 3 Results · 4 Data quality · 5 Interpretation · 6 Review statement</div>
      </div>
      <div class="panel">
        <div class="ph"><h3>Dashboards</h3></div>
        <div class="list">
          ${li('ok', 'Built with Strata charts', 'Hero chart with linked cards, period selection, PNG/SVG/CSV export (see Impact & footprints).')}
          ${li('ok', 'Role views', 'Executive, unit owner, LCA analyst, auditor (read-only with full lineage).')}
          ${li('ok', 'Scheduled delivery', 'Monthly pack by email or Teams; annual reports on inventory freeze.')}
          ${li('ok', 'Arabic & English', 'English interface; Arabic labels optional.')}
        </div>
      </div>
    </div>
  </div>`;
  },
  onYear: () => show(state.sec, false, true),
});

/* =====================================================================
   08 · Databases
   ===================================================================== */
sec({ id: 'databases', group: 'The solution', title: 'Database quality and coverage', nav: 'Databases', refs: ['C4 Database quality & coverage', 'C3 Updates & support'],
  lead: 'Site meters cover the refinery. Everything upstream and downstream comes from background databases, so their coverage of oil and gas, UAE electricity and Gulf shipping decides how good the footprints are. Each dataset is versioned and updated through support & maintenance.',
  render: () => {
    const rows = [['Crude extraction (Middle East)', [2, 1, 1, 0, 2]], ['Crude & product shipping', [2, 2, 0, 0, 1]], ['Natural gas supply', [2, 2, 1, 1, 1]], ['UAE grid electricity', [1, 1, 0, 2, 2]], ['Hydrogen (SMR)', [2, 2, 1, 0, 2]], ['Catalysts & chemicals', [2, 1, 0, 0, 1]], ['Refinery unit operations', [1, 1, 1, 0, 2]], ['Wastewater & waste', [2, 1, 2, 0, 1]], ['Road freight', [2, 2, 0, 0, 1]]];
    const cols = ['ecoinvent 3.10', 'Sphera MLC', 'IPCC EFDB', 'IEA / UAE grid', 'Site-specific'];
    const cell = (v) => `<span class="cov-cell" style="background:${v === 2 ? 'var(--barsel)' : v === 1 ? 'var(--bar)' : 'var(--line)'};color:${v === 2 ? 'var(--page)' : 'var(--ink2)'}">${v === 2 ? 'Full' : v === 1 ? 'Partial' : '—'}</span>`;
    return `
  <div class="grid g4">
    <div class="panel tight">${kpi('21,000+', 'Background datasets (ecoinvent 3.10)')}</div>
    <div class="panel tight">${kpi('5', 'Database families connected')}</div>
    <div class="panel tight">${kpi('94%', 'Of footprint on DQR ≤ 2 data by Year 3')}</div>
    <div class="panel tight">${kpi('Annual', 'Database updates, included in support')}</div>
  </div>
  <div class="grid g-side">
    <div class="panel">
      <div class="ph"><h3>Coverage of what this refinery needs</h3></div>
      <div class="scroll-x"><div class="cov" style="min-width:560px">
        <div class="cov-row"><span></span>${cols.map((c) => `<span class="cov-head">${c}</span>`).join('')}</div>
        ${rows.map(([n, v]) => `<div class="cov-row"><span>${n}</span>${v.map(cell).join('')}</div>`).join('')}
      </div></div>
      <p class="note" style="margin-top:10px">Database licences are listed under Subscription. Adopting a new version needs approver sign-off.</p>
    </div>
    <div class="stack">
      <div class="panel"><div class="ph"><h3>How dataset choice is controlled</h3></div><div class="list">
        ${li('ok', 'Priority order', 'Site-measured → supplier-specific → regional (UAE / Middle East) → global average.')}
        ${li('ok', 'Version pinning', 'Each study pins database versions; an update never silently changes a published footprint.')}
        ${li('ok', 'Update impact report', 'Before adopting a new version: which footprints move, by how much, and why.')}
        ${li('ok', 'Proxy register', 'Every proxy dataset listed with its DQR and a plan to replace it.')}
      </div></div>
      <div class="panel"><div class="ph"><h3>Data quality by year</h3></div>
        ${[1, 2, 3].map((y) => { const sh = [0.71, 0.86, 0.94][y - 1]; return `<div class="hbar"><span>Year ${y}</span><div class="hbar-track"><i style="width:${sh * 100}%;background:var(--barsel)"></i><i style="width:${(1 - sh) * 60}%;background:var(--bar)"></i></div><b style="text-align:right;font-weight:600">${pct(sh)}</b></div>`; }).join('')}
        <p class="note">Share of cradle-to-gate CO₂e resting on data with DQR ≤ 2.</p></div>
    </div>
  </div>`;
  },
});
