
/* =====================================================================
   Shared product data
   ===================================================================== */
const CONNECTORS = [
  { name: 'AVEVA PI historian', type: 'PI Web API · read-only', items: '2,940 tags', sync: '2 min ago', health: [.82, .97, .99], cps: 14 },
  { name: 'SAP S/4HANA', type: 'OData · MM, SD, PM', items: '6 entities', sync: '1 h ago', health: [.7, .93, .98], cps: 6 },
  { name: 'LIMS', type: 'REST · batch results', items: '11 methods', sync: '20 min ago', health: [.75, .95, .99], cps: 6 },
  { name: 'CEMS', type: 'OPC UA', items: '9 stacks', sync: '1 min ago', health: [.8, .96, .99], cps: 3 },
  { name: 'LDAR surveys', type: 'SFTP file drop', items: 'Quarterly', sync: '18 days ago', health: [.55, .85, .95], cps: 2 },
  { name: 'Flare meters', type: 'OPC UA', items: '4 meters', sync: '1 min ago', health: [.6, .9, .97], cps: 1 },
  { name: 'Solar SCADA & utility meters', type: 'Modbus gateway', items: '12 meters', sync: '15 min ago', health: [.9, .97, .99], cps: 2 },
  { name: 'Supplier data portal', type: 'Excel / EPD upload', items: '38 suppliers', sync: '6 days ago', health: [.4, .7, .86], cps: 2 },
  { name: 'Power BI', type: 'Certified connector (out)', items: '4 datasets', sync: '1 h ago', health: [.95, .99, .99], cps: 0 },
  { name: 'Customer PCF exchange', type: 'PACT API (out)', items: '7 products', sync: '3 days ago', health: [.8, .97, .99], cps: 0 },
];
const AUDIT = [
  { when: 'Today 09:42', who: 'A. Rahman · LCA analyst', k: 'Model', what: 'Recalculated December footprints (7 products)', ver: 'Study PCF-2029 v12' },
  { when: 'Today 08:15', who: 'System', k: 'Data', what: 'FI-11U flare flow: 3 spikes held for review', ver: 'Inventory 2029-12 v2' },
  { when: 'Yesterday 16:30', who: 'K. Al Ali · Unit owner (Utilities)', k: 'Data', what: 'Signed off CP-09 cogeneration, November', ver: 'Inventory 2029-11 v4' },
  { when: 'Yesterday 11:05', who: 'S. Menon · Approver', k: 'Report', what: 'Approved diesel footprint report for customer request', ver: 'Report R-2029-118' },
  { when: '2 days ago', who: 'External verifier', k: 'Access', what: 'Read-only session, lineage export (CP-01 to CP-17)', ver: '—' },
  { when: '3 days ago', who: 'System', k: 'Data', what: 'Crude grade mix synced from SAP, cargo 29-114', ver: 'Inventory 2029-12 v1' },
  { when: '4 days ago', who: 'J. Chen · LCA analyst', k: 'Model', what: 'Created scenario branch “FGRU phase 2 + CCS”', ver: 'Scenario S-31' },
  { when: '5 days ago', who: 'L. Ortiz · Admin', k: 'Access', what: 'Added 2 unit owners, role scoped to Hydrocracker', ver: '—' },
  { when: '1 week ago', who: 'N. Farouk · Unit owner (Tanks)', k: 'Data', what: 'Uploaded LDAR Q4 survey, replaced gap-filled values', ver: 'Inventory 2029-10 v3' },
  { when: '1 week ago', who: 'System', k: 'Model', what: 'Applied release v5.2 (no change to published footprints)', ver: 'Platform v5.2' },
  { when: '2 weeks ago', who: 'A. Rahman · LCA analyst', k: 'Model', what: 'Switched study allocation energy → unit sub-division (draft)', ver: 'Study PCF-2029 v11' },
  { when: '3 weeks ago', who: 'S. Menon · Approver', k: 'Report', what: 'Published Q3 corporate GHG input', ver: 'Report R-2029-097' },
  { when: '1 month ago', who: 'L. Ortiz · Admin', k: 'Access', what: 'Rotated API key for Power BI connector', ver: '—' },
  { when: '1 month ago', who: 'System', k: 'Data', what: 'Database update impact report: 0.4% max change', ver: 'ecoinvent 3.10 → 3.11 (pending)' },
];

/* =====================================================================
   Products
   ===================================================================== */
sec({ id: 'products', group: 'Footprints', icon: '◆', title: 'Products', nav: 'Products',
  sub: 'Carbon footprint of each product leaving the refinery, with its method, data quality and the units that drive it.',
  actions: ['Download report', 'Share with customer'], rfp: ['C1', 'C4c'],
  render: () => `
  <div class="grid g-side-l">
    <div class="panel tight"><div class="eyebrow" style="padding:4px 6px 8px">Products · ${Y0 + state.year - 1}</div><div class="prod-list" id="prodList"></div></div>
    <div class="stack" id="prodDetail"></div>
  </div>`,
  after: () => drawProducts(),
  onYear: () => drawProducts(),
});
function drawProducts() {
  const y = state.year;
  const per = (fu, yy = y) => pcf({ year: yy, fu, alloc: 'subdiv' }).rows;
  const rt = per('t'), rm = per('mj'), r1 = per('t', 1);
  $('#prodList').innerHTML = rt.map((p, i) => `<button class="prod-item" data-k="${p.k}" aria-pressed="${p.k === state.prod}"><b>${p.name}</b><b style="text-align:right">${Number.isFinite(rm[i].val) ? fmtN(rm[i].val, 2) : fmtN(p.val, 0)}</b><span>${fmtN(p.kt)} kt/yr</span><span style="text-align:right">${Number.isFinite(rm[i].val) ? 'g CO₂e/MJ' : 'kg CO₂e/t'}</span></button>`).join('');
  $$('#prodList .prod-item').forEach((b) => b.addEventListener('click', () => { state.prod = b.dataset.k; state.vcStage = null; drawProducts(); }));
  const i = PRODUCTS.findIndex((p) => p.k === state.prod), p = rt[i];
  const ch = y > 1 ? p.val / r1[i].val - 1 : null;
  const bbl = p.tbbl ? p.val * p.tbbl : null;
  // contributions by collection point
  const inc = BOUNDS.c2g.inc;
  const catT = {}; LIVE.filter(inc).forEach((c) => { catT[c.cat] = (catT[c.cat] || 0) + yearTotal(c, y); });
  const contrib = LIVE.filter(inc).map((c) => [c, p.val * p.mix[c.cat] * (yearTotal(c, y) / catT[c.cat])]).sort((a, b) => b[1] - a[1]);
  const cmx = contrib[0][1];
  const dq = sum(LIVE.filter(inc).map((c) => dqr(c, y) * yearTotal(c, y))) / sum(LIVE.filter(inc).map((c) => yearTotal(c, y)));
  const lo = p.val * 0.78, hi = p.val * 1.35, sc = (v) => ((v - lo * 0.9) / (hi * 1.05 - lo * 0.9)) * 100;
  $('#prodDetail').innerHTML = `
    <div class="panel raised">
      <div class="flex between"><div><span class="eyebrow">Cradle-to-gate · ${Y0 + y - 1}</span><h2 style="font-size:24px;margin-top:4px">${p.name}</h2></div><div class="flex"><span class="badge ok">${y === 1 ? 'Critically reviewed' : 'Verified'}</span><span class="badge mute">Study PCF-${Y0 + y - 1} v12</span></div></div>
      <div class="grid g4" style="margin-top:14px">
        ${kpi(fmtN(p.val, 0), 'kg CO₂e per tonne')}
        ${kpi(Number.isFinite(rm[i].val) ? fmtN(rm[i].val, 2) : 'n/a', 'g CO₂e per MJ (LHV)')}
        ${kpi(bbl ? fmtN(bbl, 1) : 'n/a', 'kg CO₂e per barrel')}
        ${kpi(ch == null ? 'Baseline' : sgn(ch), ch == null ? 'First reporting year' : 'vs 2027 baseline')}
      </div>
    </div>
    ${vcHTML()}
    ${cargoHTML(i)}
    <div class="grid g2">
      <div id="prodCard" class="st-mount inv"></div>
      <div class="panel"><div class="ph"><h3>Where it comes from</h3><span class="note">kg CO₂e/t by collection point</span></div>
        ${contrib.slice(0, 8).map(([c, v]) => `<div class="hbar" style="cursor:pointer" data-cp="${c.id}"><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(c.name)}">CP-${c.id} ${esc(c.name.split(' (')[0].split(' &')[0])}</span><div class="hbar-track"><i style="width:${(v / cmx) * 100}%;background:${CATS[c.cat].color}"></i></div><b style="text-align:right;font-weight:600">${fmtN(v, 0)}</b></div>`).join('')}
      </div>
    </div>
    <div class="grid g2">
      <div class="panel"><div class="ph"><h3>Method declaration</h3></div><table class="tbl"><tbody>
        <tr><td class="muted">Standard</td><td>ISO 14067, PACT methodology</td></tr>
        <tr><td class="muted">Boundary</td><td>Cradle-to-gate (crude extraction to refinery gate)</td></tr>
        <tr><td class="muted">Allocation</td><td>Unit sub-division; energy (LHV) inside shared units</td></tr>
        <tr><td class="muted">Impact method</td><td>IPCC AR6 GWP100</td></tr>
        <tr><td class="muted">Inventory</td><td>${Y0 + y - 1}, frozen 31 Dec · 17 collection points</td></tr>
        <tr><td class="muted">Data quality</td><td>DQR ${fmtN(dq, 1)} (emission-weighted) · primary data share ${pct([0.68, 0.79, 0.86][y - 1])}</td></tr>
      </tbody></table></div>
      <div class="panel"><div class="ph"><h3>Uncertainty &amp; context</h3></div>
        <div class="note">90% interval</div>
        <div class="range"><span class="rail"></span><span class="band" style="left:${sc(p.val * 0.94)}%;width:${sc(p.val * 1.06) - sc(p.val * 0.94)}%"></span><span class="mark" style="left:${sc(p.val)}%"></span></div>
        <div class="flex between note"><span>${fmtN(p.val * 0.94, 0)}</span><b class="ink2">${fmtN(p.val, 0)} kg/t</b><span>${fmtN(p.val * 1.06, 0)}</span></div>
        <div class="hr" style="margin:12px 0"></div>
        <div class="note">Use-phase combustion (for cradle-to-grave studies)</div>
        <div class="kpi" style="margin-top:4px"><b>${p.use ? fmtN(p.use, 0) : '—'}</b><span>kg CO₂e per tonne burned · ${p.use ? Math.round(p.use / (p.use + p.val) * 100) + '% of cradle-to-grave' : 'not a fuel'}</span></div>
      </div>
    </div>`;
  $$('#prodDetail .hbar[data-cp]').forEach((b) => b.addEventListener('click', () => { state.cp = b.dataset.cp; goto('site'); }));
  $$('#vcBound button').forEach((b) => b.addEventListener('click', () => { state.vcBound = b.dataset.b; state.vcStage = null; drawVC(); }));
  $$('#vcView button').forEach((b) => b.addEventListener('click', () => { state.vcView = b.dataset.v; drawVC(); }));
  mountMap($('#prodMap'));
  drawVC();
  ST.splice(0).forEach((x) => { try { x.destroy(); } catch { /* gone */ } });
  if (!strataReady()) return;
  const rows = [...Array(36)].map((_, m) => {
    const E = sum(LIVE.filter(inc).map((c) => c.monthly[m]));
    const w = PRODUCTS.map((q) => q.kt * q.sub), W = sum(w);
    return { date: iso(Y0 + Math.floor(m / 12), m % 12), v: Math.round((E * w[i] / W) / (PRODUCTS[i].kt / 12)) };
  });
  Strata.mountCard('#prodCard', { data: rows, time: 'date', columns: { v: 'v' }, series: [{ key: 'v', label: 'kg CO₂e/t' }], kind: 'number', metric: 'mean', style: 'line', title: 'Monthly footprint', label: 'kg CO₂e/t, average', periods: ['quarter', 'year'], period: 'year', tools: [], icon: false, theme: state.palette, mode: strataMode(), height: 140 })
    .then(track).catch(() => {});
}


/* =====================================================================
   Tabs helper
   ===================================================================== */
state.tabs = {};
function tabbed(id, tabs) {
  const cur = state.tabs[id] && tabs.some((t) => t[0] === state.tabs[id]) ? state.tabs[id] : tabs[0][0];
  return `<div class="tabs" role="tablist" data-tabs="${id}">${tabs.map(([k, l]) => `<button role="tab" data-tab="${k}" aria-selected="${k === cur}">${l}</button>`).join('')}</div><div class="tab-body" id="tb-${id}">${tabs.find((t) => t[0] === cur)[2]()}</div>`;
}
function bindTabs(id, tabs, after) {
  const run = (k) => { $$('[data-goto]', $('#tb-' + id)).forEach((b) => b.addEventListener('click', () => goto(b.dataset.goto))); if (after) after(k); };
  $$(`[data-tabs="${id}"] [data-tab]`).forEach((b) => b.addEventListener('click', () => {
    state.tabs[id] = b.dataset.tab;
    $$(`[data-tabs="${id}"] [data-tab]`).forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    $('#tb-' + id).innerHTML = tabs.find((t) => t[0] === b.dataset.tab)[2]();
    run(b.dataset.tab);
  }));
  run(state.tabs[id] || tabs[0][0]);
}

/* =====================================================================
   Integrations (tabbed)
   ===================================================================== */
const TAGS = [
  ['FI-0101.PV', 'CP-01', 'crude_receipt', 'm³/h → t/month', 'AVEVA PI', 'ok'], ['FI-03F1.PV', 'CP-03', 'fuel_gas_H301', 'Sm³/h → t/month', 'AVEVA PI', 'ok'], ['AI-03C', 'CP-03', 'carbon_content_FG', 'mol% → kg C/kg', 'LIMS', 'ok'],
  ['FI-04F1.PV', 'CP-04', 'fuel_gas_HCU', 'Sm³/h → t/month', 'AVEVA PI', 'ok'], ['FI-04H2.PV', 'CP-04', 'h2_makeup', 'kg/h → t/month', 'AVEVA PI', 'ok'], ['AI-05FG', 'CP-05', 'flue_gas_CO2', '% v/v', 'CEMS', 'ok'],
  ['LIMS-COKE', 'CP-05', 'coke_burn', 'wt% → t/month', 'LIMS', 'ok'], ['FI-07NG.PV', 'CP-07', 'ng_feed_SMR', 'Sm³/h → t/month', 'AVEVA PI', 'ok'], ['FI-07H2.PV', 'CP-07', 'h2_product', 'kg/h → t/month', 'AVEVA PI', 'ok'],
  ['CEMS-08', 'CP-08', 'incinerator_CO2', 'mg/Nm³ → t/month', 'CEMS', 'ok'], ['FI-09GT.PV', 'CP-09', 'gt_fuel', 'Sm³/h → t/month', 'AVEVA PI', 'ok'], ['JI-09.NET', 'CP-09', 'power_export', 'MW → MWh/month', 'AVEVA PI', 'ok'],
  ['EM-10IN', 'CP-10', 'grid_import', 'kWh → MWh/month', 'Utility meter', 'ok'], ['FI-11U.PV', 'CP-11', 'flare_flow', 'm³/h → t/month', 'Flare meter', 'warn'], ['LDAR-TF1', 'CP-02', 'leak_count', 'count → kg CH₄', 'LDAR file', 'warn'],
  ['SAP-SHIP', 'CP-15', 'cargo_tkm', 't × nm → t-km', 'SAP S/4HANA', 'ok'], ['SAP-MM', 'CP-17', 'chem_purchases', 'kg → kg', 'SAP S/4HANA', 'ok'], ['LIMS-LHV', 'CP-18', 'lhv_by_product', 'MJ/kg', 'LIMS', 'ok'],
];
const CATALOG = [
  ['AVEVA PI historian', 'Process historian', 'Connected'], ['SAP S/4HANA', 'ERP: MM, SD, PM', 'Connected'], ['LIMS', 'Laboratory results', 'Connected'], ['CEMS', 'Stack monitoring', 'Connected'],
  ['LDAR surveys', 'Leak detection files', 'Connected'], ['Flare meters', 'Ultrasonic flow', 'Connected'], ['Solar SCADA', 'Generation meters', 'Connected'], ['Supplier portal', 'EPDs, supplier data', 'Connected'],
  ['Power BI', 'Dashboards (outbound)', 'Connected'], ['PACT exchange', 'Customer PCFs (outbound)', 'Connected'], ['AVEVA PI AF', 'Asset framework', 'Available'], ['Honeywell PHD', 'Process historian', 'Available'],
  ['Yokogawa Exaquantum', 'Process historian', 'Available'], ['IBM Maximo', 'Maintenance events', 'Available'], ['Azure Data Lake', 'Data platform', 'Available'], ['Snowflake', 'Data platform', 'Available'],
  ['SharePoint', 'Documents & templates', 'Available'], ['Microsoft Teams', 'Alerts & approvals', 'Available'],
];
const RUNS = [['10:42', 'AVEVA PI historian', '184,220', 0, '38 s', 'ok'], ['10:40', 'CEMS', '5,184', 0, '6 s', 'ok'], ['10:30', 'LIMS', '412', 0, '4 s', 'ok'], ['10:00', 'SAP S/4HANA', '1,906', 2, '22 s', 'warn'], ['09:42', 'AVEVA PI historian', '183,960', 0, '37 s', 'ok'], ['09:41', 'Flare meters', '960', 3, '3 s', 'warn'], ['09:15', 'Solar SCADA', '1,152', 0, '5 s', 'ok'], ['09:00', 'Power BI', '4 datasets', 0, '51 s', 'ok'], ['08:30', 'Supplier portal', '3 files', 1, '9 s', 'warn'], ['08:00', 'PACT exchange', '2 responses', 0, '2 s', 'ok'], ['06:00', 'LDAR surveys', '0 (no new file)', 0, '1 s', 'mute'], ['00:00', 'SAP S/4HANA', '24,310', 0, '3 min', 'ok']];
const INT_TABS = [
  ['overview', 'Overview', () => {
    const y = state.year;
    return `<div class="grid g4" style="margin-top:14px">
      <div class="panel tight">${kpi(CONNECTORS.length, 'Active connections')}</div>
      <div class="panel tight">${kpi(pct(sum(CONNECTORS.map((c) => c.health[y - 1])) / CONNECTORS.length), `On-time syncs · ${Y0 + y - 1}`)}</div>
      <div class="panel tight">${kpi(pct(sum(CPS.map((c) => c.auto[y - 1])) / CPS.length), 'Collection points automated')}</div>
      <div class="panel tight">${kpi(['1.8M', '2.4M', '2.6M'][y - 1], 'Values ingested per day')}</div></div>
    <div class="panel" style="margin-top:16px"><div class="scroll-x"><table class="tbl"><thead><tr><th>System</th><th>Method</th><th>Scope</th><th class="num">Feeds CPs</th><th>Last sync</th><th style="min-width:140px">On time</th><th>Status</th></tr></thead><tbody>
      ${CONNECTORS.map((c) => { const v = c.health[y - 1], k = v >= .98 ? 'ok' : v >= .9 ? 'warn' : 'bad'; return `<tr><td><b style="font-weight:600">${c.name}</b></td><td class="muted">${c.type}</td><td>${c.items}</td><td class="num">${c.cps || 'out'}</td><td class="muted">${c.sync}</td><td><div class="flex" style="flex-wrap:nowrap"><div class="bar-track thin" style="flex:1"><i style="width:${v * 100}%"></i></div><b style="font-weight:600;font-size:12px">${pct(v)}</b></div></td><td><span class="badge ${k}">${k === 'ok' ? 'Healthy' : k === 'warn' ? 'Degraded' : 'Attention'}</span></td></tr>`; }).join('')}
    </tbody></table></div></div>`;
  }],
  ['catalog', 'Connector catalogue', () => `<div class="cat-grid" style="margin-top:14px">${CATALOG.map(([n, d, s]) => `<div class="panel tight cat"><div class="flex between"><b>${n}</b><span class="badge ${s === 'Connected' ? 'ok' : 'mute'}">${s}</span></div><span class="note">${d}</span><button class="pill" data-act="${s === 'Connected' ? 'Configure ' : 'Connect '}${n}">${s === 'Connected' ? 'Configure' : 'Connect'}</button></div>`).join('')}</div>`],
  ['tags', 'Tag mapping', () => `<div class="flex between" style="margin:14px 0 10px"><div class="search" style="max-width:300px"><span>⌕</span><input id="tagQ" placeholder="Filter tags, units, variables"></div><span class="note">${TAGS.length} mapped · 2 need a check</span></div>
    <div class="panel"><div class="scroll-x"><table class="tbl" id="tagTbl"></table></div></div>`],
  ['runs', 'Sync runs', () => `<div class="panel" style="margin-top:14px"><div class="ph"><h3>Today</h3><span class="note">Rejected records go to the validation queue, never into the model</span></div><div class="scroll-x"><table class="tbl"><thead><tr><th>Time</th><th>Connector</th><th class="num">Records</th><th class="num">Rejected</th><th class="num">Duration</th><th>Result</th></tr></thead><tbody>
    ${RUNS.map((r) => `<tr><td class="muted">${r[0]}</td><td><b style="font-weight:600">${r[1]}</b></td><td class="num">${r[2]}</td><td class="num">${r[3] || '—'}</td><td class="num">${r[4]}</td><td><span class="badge ${r[5]}">${r[5] === 'ok' ? 'Success' : r[5] === 'warn' ? 'With rejects' : 'Skipped'}</span></td></tr>`).join('')}
  </tbody></table></div></div>`],
  ['api', 'API & webhooks', () => `<div class="grid g2" style="margin-top:14px">
    <div class="panel"><div class="ph"><h3>REST endpoints</h3><span class="badge ok">v1</span></div><div class="list">
      ${[['GET', '/v1/footprints/{product}?year=', 'Footprint with method and data quality'], ['GET', '/v1/inventory/{month}', 'Validated monthly inventory'], ['GET', '/v1/lineage/{valueId}', 'From a result back to meter tags'], ['POST', '/v1/uploads', 'Templates and supplier files'], ['GET', '/v1/scenarios/{id}', 'Scenario branch results'], ['POST', '/pact/2/footprints', 'PACT-conformant exchange']].map(([m, p, d]) => `<div class="li"><span class="tag" style="min-width:42px;justify-content:center">${m}</span><div class="li-main"><b style="font-family:ui-monospace,Menlo,monospace;font-size:12.5px">${p}</b><p>${d}</p></div></div>`).join('')}</div></div>
    <div class="stack"><div class="panel"><div class="ph"><h3>Webhooks</h3></div><div class="list">${[['footprint.published', 'Teams + customer portal'], ['inventory.frozen', 'Group reporting'], ['flag.raised', 'Unit owner by email'], ['connector.degraded', 'Support desk']].map(([e, t]) => li('ok', e, t)).join('')}</div></div>
    <div class="panel"><div class="ph"><h3>Keys</h3></div><div class="list">${[['Power BI', 'read · rotated 32 days ago'], ['Customer portal', 'read footprints · rotated 12 days ago'], ['Data platform', 'read inventory · rotated 61 days ago']].map(([n, d]) => li('mute', n, d)).join('')}</div></div></div></div>`],
];
sec({ id: 'integrations', group: 'Data', icon: '⇄', title: 'Data connectors', nav: 'Data connectors',
  sub: 'Connections that feed the inventory and send results out. Plant connections are read-only: nothing writes back to control or ERP systems.',
  actions: ['Test all', 'Add connection'], rfp: ['C3d', 'C4a'],
  render: () => tabbed('int', INT_TABS),
  after: () => bindTabs('int', INT_TABS, (k) => {
    $$('#tb-int [data-act]').forEach((b) => b.addEventListener('click', () => toast(`${b.dataset.act}: demo action`)));
    if (k !== 'tags') return;
    const draw = () => { const q = ($('#tagQ').value || '').toLowerCase(); $('#tagTbl').innerHTML = `<thead><tr><th>Tag</th><th>CP</th><th>Model variable</th><th>Conversion</th><th>Source</th><th></th></tr></thead><tbody>${TAGS.filter((t) => t.join(' ').toLowerCase().includes(q)).map((t) => `<tr><td><b style="font-weight:600">${t[0]}</b></td><td>${t[1]}</td><td><code style="font-size:11.5px">${t[2]}</code></td><td class="muted">${t[3]}</td><td>${t[4]}</td><td><span class="badge ${t[5]}">${t[5] === 'ok' ? 'mapped' : 'check'}</span></td></tr>`).join('')}</tbody>`; };
    $('#tagQ').addEventListener('input', draw); draw();
  }),
  onYear: () => show(state.sec, false, true),
});

/* =====================================================================
   Users & access (tabbed RBAC)
   ===================================================================== */
const USERS = [['A. Rahman', 'LCA analyst', 'Today'], ['J. Chen', 'LCA analyst', 'Today'], ['S. Menon', 'Approver', 'Yesterday'], ['K. Al Ali', 'Unit owner', 'Yesterday'], ['N. Farouk', 'Unit owner', '1 week ago'], ['R. Haddad', 'Unit owner', '2 days ago'], ['L. Ortiz', 'Admin', '5 days ago'], ['External verifier', 'Auditor', '2 days ago'], ['Sustainability team (12)', 'Viewer', 'This week']];
const ROLES = ['Viewer', 'Unit owner', 'LCA analyst', 'Approver', 'Auditor', 'Admin'];
const PERMS = [
  ['View dashboards & footprints', [1, 1, 1, 1, 1, 1]], ['View inventory & lineage', [0, 1, 1, 1, 1, 1]], ['Edit data for own units', [0, 1, 1, 0, 0, 0]], ['Edit any inventory data', [0, 0, 1, 0, 0, 0]],
  ['Sign off monthly unit data', [0, 1, 0, 0, 0, 0]], ['Edit models & carbon formulas', [0, 0, 1, 0, 0, 0]], ['Approve formula & method changes', [0, 0, 0, 1, 0, 0]], ['Run and save scenarios', [0, 0, 1, 1, 0, 0]],
  ['Publish reports', [0, 0, 0, 1, 0, 0]], ['Share footprints with customers', [0, 0, 0, 1, 0, 0]], ['Export data', [0, 0, 1, 1, 1, 0]], ['Manage connectors', [0, 0, 0, 0, 0, 1]],
  ['Manage users & roles', [0, 0, 0, 0, 0, 1]], ['View audit log', [0, 0, 0, 1, 1, 1]],
];
const UNITGRP = ['Distillation', 'Conversion', 'Hydrogen', 'Utilities', 'Tanks & terminal', 'Flare & environment', 'Purchasing'];
const SCOPES = { 'A. Rahman': 'EEEEEEE', 'J. Chen': 'EEEEEEE', 'S. Menon': 'AAAAAAA', 'K. Al Ali': 'VVVEVVV', 'N. Farouk': 'VVVVEVV', 'R. Haddad': 'VEVVVVV', 'External verifier': 'RRRRRRR', 'L. Ortiz': '-------' };
const SEC_TABS = [
  ['users', 'Users', () => `<div class="grid g4" style="margin-top:14px">
      <div class="panel tight">${kpi([24, 41, 58][state.year - 1], 'Active users')}</div><div class="panel tight">${kpi('100%', 'Sign-ins via SSO with MFA')}</div>
      <div class="panel tight">${kpi('UAE', 'Data region (hosted)')}</div><div class="panel tight">${kpi('0', 'Open security findings')}</div></div>
    <div class="panel" style="margin-top:16px"><div class="scroll-x"><table class="tbl"><thead><tr><th>Name</th><th>Role</th><th>Last active</th><th>MFA</th><th></th></tr></thead><tbody>
      ${USERS.map((u) => `<tr><td><div class="flex" style="flex-wrap:nowrap"><span class="ava" style="width:26px;height:26px;font-size:10px">${u[0].split(/[ .()0-9]+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2)}</span><b style="font-weight:600">${u[0]}</b></div></td><td>${u[1]}</td><td class="muted">${u[2]}</td><td><span class="badge ok">on</span></td><td><button class="tag" data-tabjump="scopes" style="cursor:pointer;border:0">scopes →</button></td></tr>`).join('')}
    </tbody></table></div></div>`],
  ['roles', 'Roles & permissions', () => `<div class="panel" style="margin-top:14px"><div class="ph"><h3>Permission matrix</h3><span class="note">Changes are drafts until an approver signs them off</span></div>
    <div class="scroll-x"><table class="tbl rbac" id="rbac"><thead><tr><th>Permission</th>${ROLES.map((r) => `<th class="num">${r}</th>`).join('')}</tr></thead><tbody>
      ${PERMS.map(([p, v], i) => `<tr><td>${p}</td>${v.map((on, j) => `<td class="num"><input type="checkbox" data-p="${i}" data-r="${j}" ${on ? 'checked' : ''} aria-label="${p} · ${ROLES[j]}"></td>`).join('')}</tr>`).join('')}
    </tbody></table></div><div id="sod" style="margin-top:12px"></div></div>`],
  ['scopes', 'Unit scopes', () => `<div class="panel" style="margin-top:14px"><div class="ph"><h3>Who can touch which units</h3><div class="legend"><span><span class="sc E">E</span>Edit</span><span><span class="sc A">A</span>Approve</span><span><span class="sc V">V</span>View</span><span><span class="sc R">R</span>Read + lineage</span></div></div>
    <div class="scroll-x"><table class="tbl"><thead><tr><th>User</th>${UNITGRP.map((g) => `<th class="num">${g}</th>`).join('')}</tr></thead><tbody>
      ${Object.entries(SCOPES).map(([u, s]) => `<tr><td><b style="font-weight:600">${u}</b></td>${[...s].map((c) => `<td class="num">${c === '-' ? '<span class="muted">—</span>' : `<span class="sc ${c}">${c}</span>`}</td>`).join('')}</tr>`).join('')}
    </tbody></table></div><p class="note" style="margin-top:8px">Admins manage the workspace but cannot see or edit unit data unless granted a scope.</p></div>`],
  ['signin', 'Sign-in & MFA', () => `<div class="grid g2" style="margin-top:14px"><div class="panel"><div class="list">
      ${li('ok', 'Single sign-on (SAML 2.0)', 'Company identity provider; no local passwords. Users and groups provisioned with SCIM.')}
      ${li('ok', 'MFA enforced', 'Through the identity provider’s conditional access policies.')}
      ${li('ok', 'Session policy', '30-minute idle timeout, 12-hour maximum; re-authentication for approvals.')}
      ${li('ok', 'Admin actions', 'Allowed only from the company network IP ranges.')}</div></div>
    <div class="panel"><div class="ph"><h3>Sign-ins · last 30 days</h3></div><table class="tbl"><tbody><tr><td class="muted">Successful</td><td class="num">3,412</td></tr><tr><td class="muted">Blocked (policy)</td><td class="num">6</td></tr><tr><td class="muted">From outside allowed regions</td><td class="num">0</td></tr><tr><td class="muted">Service accounts</td><td class="num">3 (API keys)</td></tr></tbody></table></div></div>`],
  ['data', 'Data protection', () => `<div class="grid g2" style="margin-top:14px"><div class="panel"><div class="list">
      ${li('ok', 'Encryption', 'AES-256 at rest with customer-managed keys; TLS 1.2+ in transit.')}
      ${li('ok', 'Residency', 'Hosted in a UAE cloud region; on-premises deployment also supported.')}
      ${li('ok', 'Retention', 'Frozen inventories and published footprints kept 10 years.')}
      ${li('ok', 'Logs to SIEM', 'Sign-ins, exports and approvals streamed to the company SIEM.')}</div></div>
    <div class="panel"><div class="list">
      ${li('ok', 'ISO/IEC 27001 · SOC 2 Type II', 'Vendor certifications, renewed annually.')}
      ${li('ok', 'Penetration test', 'Annual, third party; report available to admins.')}
      ${li('ok', 'Browsers & devices', 'Current Edge and Chrome; read-only views on tablet and phone.')}
      ${li('ok', 'Capacity', 'Unlimited viewers, studies and versions; tested at 12,000 tags at 1-minute resolution.')}</div></div></div>`],
  ['reviews', 'Access reviews', () => `<div class="panel" style="margin-top:14px"><div class="ph"><h3>Quarterly access reviews</h3><span class="note">Each user’s role and scopes confirmed by their manager</span></div><div class="scroll-x"><table class="tbl"><thead><tr><th>Quarter</th><th>Reviewer</th><th class="num">Users reviewed</th><th class="num">Access removed</th><th>Status</th></tr></thead><tbody>
    ${[...Array(state.year * 4)].map((_, i) => `<tr><td>Q${(i % 4) + 1} ${Y0 + Math.floor(i / 4)}</td><td>S. Menon</td><td class="num">${[12, 18, 22, 24, 30, 35, 38, 41, 47, 52, 55, 58][i]}</td><td class="num">${[0, 1, 0, 2, 1, 0, 3, 1, 0, 2, 1, 0][i]}</td><td><span class="badge ${i === state.year * 4 - 1 ? 'warn' : 'ok'}">${i === state.year * 4 - 1 ? 'In progress' : 'Complete'}</span></td></tr>`).reverse().join('')}
  </tbody></table></div></div>`],
];
function checkSod() {
  const el = $('#sod'); if (!el) return;
  const bad = ROLES.filter((r, j) => PERMS[5][1][j] && PERMS[6][1][j]);
  const self = ROLES.filter((r, j) => PERMS[2][1][j] && PERMS[4][1][j] && PERMS[3][1][j]);
  el.innerHTML = bad.length || self.length ? `<div class="callout warn"><b>Segregation of duties:</b> ${bad.length ? `${bad.join(', ')} can both edit and approve formulas. ` : ''}${self.length ? `${self.join(', ')} can edit any data and sign it off.` : ''} Save is blocked until resolved.</div>` : '<div class="callout"><b>Segregation of duties:</b> no role can both change a formula and approve it, or edit data and sign it off.</div>';
}
sec({ id: 'security', group: 'Administration', icon: '⚿', title: 'Users & access', nav: 'Users & access',
  sub: 'Role-based access control: who can see and change what, by unit, plus sign-in and data protection.',
  actions: ['Download access report', 'Invite user'], rfp: ['C3a', 'C3c', 'C3e'],
  render: () => tabbed('sec', SEC_TABS),
  after: () => bindTabs('sec', SEC_TABS, (k) => {
    $$('#tb-sec [data-tabjump]').forEach((b) => b.addEventListener('click', () => $(`[data-tabs="sec"] [data-tab="${b.dataset.tabjump}"]`).click()));
    if (k !== 'roles') return;
    $$('#rbac input').forEach((i) => i.addEventListener('change', () => { PERMS[+i.dataset.p][1][+i.dataset.r] = i.checked ? 1 : 0; checkSod(); toast(`Draft: ${PERMS[+i.dataset.p][0]} ${i.checked ? 'granted to' : 'removed from'} ${ROLES[+i.dataset.r]}`); }));
    checkSod();
  }),
  onYear: () => show(state.sec, false, true),
});

/* =====================================================================
   Carbon formulas
   ===================================================================== */
const GWP = { AR6: { CO2: 1, CH4: 29.8, N2O: 273 }, AR5: { CO2: 1, CH4: 28, N2O: 265 } };
state.gwp = 'AR6';
const FORMULAS = [
  { k: 'comb', tab: 'Combustion', name: 'Fuel combustion by carbon balance', eq: 'CO₂ = Σ<sub>i</sub> m<sub>i</sub> × C<sub>i</sub> × <sup>44</sup>⁄<sub>12</sub> × OF', cps: ['03', '04', '06', '09'], std: 'API Compendium (2021) §4 · IPCC 2006 Vol 2 Tier 3', ver: 'v3 · approved by S. Menon',
    inputs: [['m', 'Fuel gas burned', 't', 24000, 'FI-03F1 × density'], ['C', 'Carbon content', 'kg C / kg', 0.72, 'AI-03C (LIMS)'], ['OF', 'Oxidation factor', '–', 1, 'default']], out: (x) => [['CO₂', x.m * x.C * 44 / 12 * x.OF, 't']] },
  { k: 'fcc', tab: 'FCC coke burn', name: 'Catalyst regeneration (coke burn)', eq: 'CO₂ = Coke × CF × <sup>44</sup>⁄<sub>12</sub>,  Coke = f(air, flue O₂, CO₂, CO)', cps: ['05'], std: 'API Compendium §5.1 · EU MRR Annex IV', ver: 'v2 · approved by S. Menon',
    inputs: [['coke', 'Coke burned', 't', 17800, 'LIMS-COKE + FI-05AIR'], ['CF', 'Carbon fraction of coke', '–', 0.93, 'lab, quarterly']], out: (x) => [['CO₂', x.coke * x.CF * 44 / 12, 't']] },
  { k: 'smr', tab: 'Hydrogen (SMR)', name: 'Steam methane reforming', eq: 'CO₂<sub>process</sub> = m<sub>feed</sub> × C<sub>feed</sub> × <sup>44</sup>⁄<sub>12</sub> − m<sub>CO₂ captured</sub>', cps: ['07'], std: 'IPCC 2006 Vol 3 §3.11 · ISO 14067 (H₂ as co-product)', ver: 'v2 · approved by S. Menon',
    inputs: [['feed', 'Natural gas feed', 't', 12500, 'FI-07NG'], ['C', 'Carbon fraction', '–', 0.73, 'AI-07NG'], ['cap', 'CO₂ captured', 't', 0, 'scenario only']], out: (x) => [['Process CO₂', x.feed * x.C * 44 / 12 - x.cap, 't']] },
  { k: 'flare', tab: 'Flaring', name: 'Flaring (measured flow)', eq: 'CO₂ = m × C × CE × <sup>44</sup>⁄<sub>12</sub>,  CH₄ = m × w<sub>CH₄</sub> × (1 − CE),  CO₂e = CO₂ + CH₄ × GWP<sub>CH₄</sub>', cps: ['11'], std: 'API Compendium §5.6 · OGMP 2.0 Level 4', ver: 'v4 · approved by S. Menon',
    inputs: [['m', 'Gas flared', 't', 3800, 'FI-11U × density'], ['C', 'Carbon content', 'kg C / kg', 0.78, 'AI-11 (weekly)'], ['CE', 'Combustion efficiency', '–', 0.98, 'default, reviewed'], ['w', 'CH₄ mass fraction', '–', 0.35, 'AI-11']], out: (x, g) => { const co2 = x.m * x.C * x.CE * 44 / 12, ch4 = x.m * x.w * (1 - x.CE); return [['CO₂', co2, 't'], ['CH₄', ch4, 't'], ['CO₂e', co2 + ch4 * g.CH4, 't']]; } },
  { k: 'fug', tab: 'Fugitives', name: 'Leaks from components (LDAR)', eq: 'CH₄ = Σ<sub>c</sub> n<sub>c</sub> × EF<sub>c</sub> × h,  CO₂e = CH₄ × GWP<sub>CH₄</sub>', cps: ['02', '13', '14'], std: 'API Compendium §6 · EPA correlation equations', ver: 'v2 · approved by S. Menon',
    inputs: [['n', 'Leaking components', 'count', 42, 'LDAR-TF1'], ['EF', 'Leak rate per component', 'kg CH₄/h', 0.12, 'survey'], ['h', 'Hours in period', 'h', 744, 'calendar']], out: (x, g) => { const ch4 = x.n * x.EF * x.h / 1000; return [['CH₄', ch4, 't'], ['CO₂e', ch4 * g.CH4, 't']]; } },
  { k: 'elec', tab: 'Electricity', name: 'Purchased electricity (Scope 2)', eq: 'Location = E × EF<sub>grid</sub>,  Market = (E − E<sub>certified</sub>) × EF<sub>residual</sub>', cps: ['10', '12'], std: 'GHG Protocol Scope 2 Guidance', ver: 'v2 · approved by S. Menon',
    inputs: [['E', 'Grid import', 'MWh', 33000, 'EM-10IN'], ['EFg', 'Grid factor', 't CO₂e/MWh', 0.4, 'UAE grid, annual'], ['Ec', 'Certified clean MWh', 'MWh', 9000, 'certificates'], ['EFr', 'Residual mix factor', 't CO₂e/MWh', 0.45, 'annual']], out: (x) => [['Location-based', x.E * x.EFg, 't CO₂e'], ['Market-based', Math.max(0, x.E - x.Ec) * x.EFr, 't CO₂e']] },
  { k: 'trans', tab: 'Transport', name: 'Product transport (GLEC)', eq: 'CO₂e = m × d × EF<sub>mode</sub> / 10⁶', cps: ['15', '16'], std: 'GLEC Framework v3 · ISO 14083', ver: 'v1 · approved by S. Menon',
    inputs: [['m', 'Cargo', 't', 85000, 'SAP-SHIP'], ['d', 'Distance', 'km', 6400, 'voyage plan'], ['EF', 'Tanker factor', 'g CO₂e/t-km', 5.6, 'GLEC default']], out: (x) => [['CO₂e', x.m * x.d * x.EF / 1e6, 't']] },
  { k: 'alloc', tab: 'Allocation', name: 'Energy allocation to co-products', eq: 'share<sub>p</sub> = <sup>m<sub>p</sub> × LHV<sub>p</sub></sup>⁄<sub>Σ m × LHV</sub>,  PCF<sub>p</sub> = <sup>E × share<sub>p</sub></sup>⁄<sub>m<sub>p</sub></sub>', cps: ['18'], std: 'ISO 14044 §4.3.4 · ISO 14067 §6.4.6', ver: 'v3 · approved by S. Menon',
    inputs: [['E', 'Site cradle-to-gate CO₂e', 't', 0, 'inventory'], ['m', 'Diesel produced', 'kt', 6800, 'SAP'], ['LHV', 'Diesel LHV', 'MJ/kg', 42.8, 'LIMS-LHV']], out: (x) => { const W = sum(PRODUCTS.map((p) => p.kt * p.lhv)) - 6800 * 42.8 + x.m * x.LHV; const sh = (x.m * x.LHV) / W; return [['Diesel share', sh * 100, '%'], ['Diesel PCF', (x.E * sh) / x.m, 'kg CO₂e/t']]; } },
];
FORMULAS.find((f) => f.k === 'alloc').inputs[0][3] = Math.round(siteYear(3));
const FORM_TABS = FORMULAS.map((f) => [f.k, f.tab, () => `
  <div class="grid g-side" style="margin-top:14px">
    <div class="stack">
      <div class="panel raised"><div class="flex between"><span class="eyebrow">${f.name}</span><span class="badge ok">${f.ver}</span></div>
        <div class="eq">${f.eq}</div>
        <div class="flex"><span class="note">Used by</span>${f.cps.map((c) => `<button class="tag" data-cpgo="${c}" style="cursor:pointer;border:0">CP-${c}</button>`).join('')}</div>
        <p class="note" style="margin-top:8px">Basis: ${f.std}</p></div>
      <div class="panel"><div class="ph"><h3>Variables and where they come from</h3></div><table class="tbl"><thead><tr><th>Symbol</th><th>Meaning</th><th>Unit</th><th>Source</th></tr></thead><tbody>
        ${f.inputs.map(([k, n, u, , s]) => `<tr><td><b style="font-weight:700">${k}</b></td><td>${n}</td><td class="muted">${u}</td><td>${s}</td></tr>`).join('')}
        ${/GWP/.test(f.eq) ? `<tr><td><b>GWP</b></td><td>Global warming potential, CH₄</td><td class="muted">–</td><td>${state.gwp} (${GWP[state.gwp].CH4})</td></tr>` : ''}
      </tbody></table></div>
      <div class="panel tight"><div class="flex between"><span class="eyebrow">Tests &amp; history</span><span class="badge ok">14 / 14 tests pass</span></div><p class="note" style="margin-top:6px">Each version is kept; results show which version produced them. Editing needs the analyst role, approving needs the approver role.</p></div>
    </div>
    <div class="panel calc" data-f="${f.k}"><div class="ph"><h3>Try it</h3><span class="note">Sample month values</span></div>
      ${f.inputs.map(([k, n, u, v]) => `<div class="field" style="margin-bottom:8px"><label>${n} (${k}) · ${u}</label><input type="number" step="any" data-k="${k}" value="${v}"></div>`).join('')}
      <div class="calc-out"></div></div>
  </div>`]);
FORM_TABS.push(['gwp', 'GWP factors', () => `<div class="grid g2" style="margin-top:14px"><div class="panel"><div class="ph"><h3>Global warming potentials (100-year)</h3><div class="seg" id="gwpSeg"><button data-g="AR6">IPCC AR6</button><button data-g="AR5">IPCC AR5</button></div></div>
  <table class="tbl"><thead><tr><th>Gas</th><th class="num">AR6</th><th class="num">AR5</th></tr></thead><tbody><tr><td>CO₂</td><td class="num">1</td><td class="num">1</td></tr><tr><td>CH₄ (fossil)</td><td class="num">29.8</td><td class="num">28</td></tr><tr><td>N₂O</td><td class="num">273</td><td class="num">265</td></tr></tbody></table>
  <p class="note" style="margin-top:8px">The study default is AR6. Switching here changes the CH₄ factor used in the flaring and fugitives calculators on this page only; a study change needs approval.</p></div>
  <div class="panel"><div class="ph"><h3>Factor library</h3></div><div class="list">${[['Natural gas, Middle East supply', 'ecoinvent 3.10', 'DQR 2'], ['UAE grid electricity', 'Annual national factor', 'DQR 1'], ['Crude oil, by grade', 'Supplier-specific', 'DQR 2'], ['Tanker, crude & products', 'GLEC v3', 'DQR 2'], ['Amines, caustic, catalysts', 'Supplier EPDs / ecoinvent', 'DQR 3']].map(([a, b, c]) => li('ok', a, `${b} · ${c}`)).join('')}</div></div></div>`]);
function runCalc() {
  $$('.calc').forEach((el) => {
    const f = FORMULAS.find((q) => q.k === el.dataset.f), x = {};
    $$('input[data-k]', el).forEach((i) => { x[i.dataset.k] = parseFloat(i.value) || 0; });
    el.querySelector('.calc-out').innerHTML = f.out(x, GWP[state.gwp]).map(([n, v, u]) => `<div class="calc-row"><span>${n}</span><b>${fmtN(v, Math.abs(v) < 100 ? 2 : 0)} <small>${u}</small></b></div>`).join('');
  });
}
sec({ id: 'formulas', group: 'Footprints', icon: 'ƒ', title: 'Carbon formulas', nav: 'Carbon formulas',
  sub: 'Every calculation behind the numbers, in the open: equation, inputs mapped to plant tags, method basis, tests and approval.',
  actions: ['Version history', 'Propose change'], rfp: ['C5c', 'C4a', 'C1'],
  render: () => tabbed('form', FORM_TABS),
  after: () => bindTabs('form', FORM_TABS, () => {
    $$('#tb-form [data-cpgo]').forEach((b) => b.addEventListener('click', () => { state.cp = b.dataset.cpgo; goto('site'); }));
    $$('#tb-form .calc input').forEach((i) => i.addEventListener('input', runCalc));
    $$('#gwpSeg button').forEach((b) => { b.setAttribute('aria-pressed', String(b.dataset.g === state.gwp)); b.addEventListener('click', () => { state.gwp = b.dataset.g; $$('#gwpSeg button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); toast(`CH₄ GWP set to ${GWP[state.gwp].CH4} for the calculators`); }); });
    runCalc();
  }),
});

/* =====================================================================
   Guided tour
   ===================================================================== */
const TOUR = [
  ['dashboard', '.page-head', 'Welcome to LCA Workbench', 'This is the carbon life-cycle software for the refinery, licensed for three years. The tour takes about two minutes. Use the year switch at the top to move between 2027, 2028 and 2029.'],
  ['dashboard', '.grid.g5', 'Headline figures', 'Cradle-to-gate CO₂e for the year, intensity per barrel, data completeness, open data flags and the number of current product footprints.'],
  ['dashboard', '#dashMap', 'The live site', 'Each glass card is a data collection point with this month’s CO₂e. Pipelines carry flowing product with its carbon intensity; trucks and the tanker show per-trip emissions; tank farms show embodied carbon in stock.'],
  ['dashboard', '.map-ctl', 'Label filter', 'Show all labels, units only, flows and stock, or none.'],
  ['control', '#ccTiles', 'Command & control centre', 'A live operating picture: emission rate now, flaring, feeds and alarms. Every tile opens the screen behind it. You can also reach it by clicking the control building on the map.'],
  ['site', '.scrub', '36 months on one bar', 'Press play to run the whole subscription month by month, or click any month.'],
  ['site', '#detail', 'Inside a collection point', 'Feeds and tags, the monthly chart, data quality on five criteria, how the data matured each year, and where the point sits in the model.'],
  ['products', '#vchain', 'Trace the value chain', 'Pick a product and follow its carbon from the crude well, through every refinery stage, to the customer and combustion. Switch to Sankey or Contribution tree to see the same chain as flows or as a drill-down to meter tags.'],
  ['studies', '#stDet', 'Study library', 'Every study with scope, version and status. Approved versions are locked; stale results are flagged until recalculated. Try Submit, Approve or Copy.'],
  ['scope', '#bound', 'Study setup', 'Change boundary, functional unit and allocation; footprints recalculate and the choice is saved as a study version.'],
  ['model', '#net', 'Model workspace', 'Processes joined by typed flows (material, energy, product, elementary, loops), with checks that run before any calculation.'],
  ['formulas', '[data-tabs="form"]', 'Carbon formulas', 'Every equation in the open, inputs mapped to plant tags, with a calculator to check it and an approval trail.'],
  ['runs', '[data-tabs="runs"]', 'Calculation runs', 'Each run keeps its snapshot, datasets and engine version. Failed runs never show results; any run can be reproduced and traced to the meter.'],
  ['inventory', '#invTbl', 'Inventory', 'Validated monthly data for all 18 points: completeness, automation, data quality and status.'],
  ['integrations', '[data-tabs="int"]', 'Data connectors', 'Historian, ERP, laboratory, stack monitors, leak surveys and more, with a catalogue, tag mapping, sync runs and the API.'],
  ['security', '[data-tabs="sec"]', 'Users & access', 'Role-based access: a permission matrix with segregation-of-duties checks, unit scopes, sign-in and quarterly access reviews.'],
  ['import', '#impSteps', 'Data import', 'Templates, mapping, row-level validation and an explicit commit policy: missing values never become zero.'],
  ['operations', '[data-tabs="ops"]', 'Operations', 'Performance and capacity against targets, backup and restore drills, documentation, change management and personal data.'],
  ['contract', '[data-tabs="ctr"]', 'Licence & exit', 'Entitlements, training plan, validation against a reference model, and what happens at renewal or exit, including the export package.'],
  ['requirements', '[data-tabs="req"]', 'Requirements & acceptance', 'The requirements baseline traced to these screens, with acceptance tests and the open decisions still needed.'],
  ['exchange', '[data-tabs="x"]', 'Footprint exchange', 'Customers request footprints and suppliers send theirs in a standard, signed format, answered only from approved studies.'],
  ['subscription', '#gantt', 'Three years of service', 'Delivery timeline from award, quarterly releases, service levels, training and tickets.'],
  ['dashboard', '.rfp-toggle', 'Check against the tender', 'Tick “Requirements map” to tag every screen with the tender criteria and requirement IDs it covers. That’s the tour.'],
];
let tourI = -1;
function tourStart() { tourI = 0; tourStep(); }
function tourEnd() { tourI = -1; $('#tourRing').hidden = true; $('#tourPop').hidden = true; }
function tourStep() {
  const [secId, sel, title, body] = TOUR[tourI];
  if (SECTIONS[state.sec].id !== secId) goto(secId);
  setTimeout(() => {
    const el = $(sel);
    const vis = el && el.getBoundingClientRect().width > 0;
    if (vis) el.scrollIntoView({ block: 'center', behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' });
    const pop = $('#tourPop'), ring = $('#tourRing');
    pop.innerHTML = `<div class="flex between"><span class="eyebrow">Step ${tourI + 1} of ${TOUR.length}</span><button class="tour-x" aria-label="End tour">×</button></div><b>${title}</b><p>${body}</p>
      <div class="tour-dots">${TOUR.map((_, i) => `<i class="${i === tourI ? 'on' : ''}"></i>`).join('')}</div>
      <div class="flex between"><button class="pill" id="tourBack" ${tourI ? '' : 'disabled'}>← Back</button><button class="pill is-ink" id="tourNext">${tourI === TOUR.length - 1 ? 'Finish' : 'Next →'}</button></div>`;
    pop.hidden = false;
    $('#tourBack').onclick = () => { if (tourI > 0) { tourI--; tourStep(); } };
    $('#tourNext').onclick = () => { if (tourI < TOUR.length - 1) { tourI++; tourStep(); } else tourEnd(); };
    pop.querySelector('.tour-x').onclick = tourEnd;
    requestAnimationFrame(() => tourPlace(vis ? el : null));
    $('#tourNext').focus({ preventScroll: true });
  }, SECTIONS[state.sec].id === secId ? 60 : 450);
}
function tourPlace(el) {
  const pop = $('#tourPop'), ring = $('#tourRing');
  if (!el) { ring.hidden = false; ring.style.cssText = `left:50%;top:50%;width:0;height:0`; pop.style.left = `${(innerWidth - pop.offsetWidth) / 2}px`; pop.style.top = `${(innerHeight - pop.offsetHeight) / 2}px`; return; }
  const r = el.getBoundingClientRect(), pad = 8;
  ring.hidden = false;
  ring.style.cssText = `left:${r.left - pad}px;top:${r.top - pad}px;width:${r.width + pad * 2}px;height:${Math.min(r.height, innerHeight - 40) + pad * 2}px`;
  const pw = pop.offsetWidth, ph = pop.offsetHeight;
  let top = r.bottom + pad + 12;
  if (top + ph > innerHeight - 10) top = r.top - pad - 12 - ph;
  if (top < 10) top = Math.max(10, innerHeight - ph - 16);
  pop.style.top = `${top}px`;
  pop.style.left = `${clamp(r.left + r.width / 2 - pw / 2, 12, innerWidth - pw - 12)}px`;
}
addEventListener('resize', () => { if (tourI >= 0) tourPlace($(TOUR[tourI][1])); });
addEventListener('keydown', (e) => { if (tourI < 0) return; if (e.key === 'Escape') tourEnd(); if (e.key === 'ArrowRight') $('#tourNext')?.click(); if (e.key === 'ArrowLeft') $('#tourBack')?.click(); });

/* =====================================================================
   Audit log
   ===================================================================== */
sec({ id: 'audit', group: 'Administration', icon: '☰', title: 'Audit log', nav: 'Audit log',
  sub: 'Every change to data, models, reports and access, with who, when and which version. Entries cannot be edited or deleted.',
  actions: ['Export CSV'], rfp: ['C3a', 'C4a'],
  render: () => `
  <div class="panel">
    <div class="ph"><div class="filter-row" id="af">${['all', 'Data', 'Model', 'Report', 'Access'].map((k) => `<button class="pill" data-f="${k}">${k === 'all' ? 'All' : k}</button>`).join('')}</div><span class="note" id="aCount"></span></div>
    <div class="scroll-x"><table class="tbl" id="aTbl"></table></div>
  </div>`,
  after: () => {
    const draw = () => {
      $$('#af .pill').forEach((b) => b.classList.toggle('is-ink', b.dataset.f === state.auditF));
      const rows = AUDIT.filter((a) => state.auditF === 'all' || a.k === state.auditF);
      $('#aCount').textContent = `${rows.length} entries`;
      $('#aTbl').innerHTML = `<thead><tr><th>When</th><th>Who</th><th>Type</th><th>What</th><th>Version</th></tr></thead><tbody>${rows.map((a) => `<tr><td class="muted" style="white-space:nowrap">${a.when}</td><td>${esc(a.who)}</td><td><span class="tag">${a.k}</span></td><td>${esc(a.what)}</td><td class="muted">${esc(a.ver)}</td></tr>`).join('')}</tbody>`;
    };
    $$('#af .pill').forEach((b) => b.addEventListener('click', () => { state.auditF = b.dataset.f; draw(); }));
    draw();
  },
});

/* =====================================================================
   Subscription & support (3-year term)
   ===================================================================== */
const GANTT = [
  ['Kick-off & mobilisation', 0, 0.75], ['Hosting, SSO, security review', 0.25, 2], ['Integrations: PI, SAP, LIMS, CEMS', 1, 4.5],
  ['Baseline inventory & site model', 1.5, 5.5], ['Training wave 1', 3, 5], ['Go-live', 5.5, 5.5, 'm'], ['First product footprints', 5.5, 7.5],
  ['Critical review (ISO 14071)', 7.5, 9.5], ['2027 inventory freeze', 12, 12, 'm'], ['Automation uplift (flare, LDAR)', 12, 16], ['Scenario & roadmap studies', 14, 18],
  ['EPD preparation & verification', 16, 21], ['Training wave 2', 13, 14], ['2028 inventory freeze', 24, 24, 'm'], ['Monthly footprints, customer exchange', 24, 33],
  ['2029 inventory freeze', 36, 36, 'm'], ['Renewal / data handover', 33, 36], ['Support & maintenance', 0, 36, 's'],
];
const RELEASES = [['4.1', 'Refinery template library, PI connector'], ['4.2', 'Owner sign-off workflow'], ['4.3', 'Monte Carlo uncertainty'], ['4.4', 'ISO 14071 review pack'], ['4.5', 'LDAR file drop'], ['4.6', 'Scenario branches'], ['4.7', 'EPD templates'], ['4.8', 'Power BI connector'], ['4.9', 'PACT exchange'], ['5.0', 'Monthly footprints'], ['5.1', 'Arabic labels'], ['5.2', 'Faster recalculation']];
sec({ id: 'subscription', group: 'Administration', icon: '◷', title: 'Subscription & support', nav: 'Subscription & support',
  sub: 'Three-year licence with support and maintenance: plan, delivery timeline, releases, service levels and training.',
  actions: ['Contact success manager', 'Open ticket'], rfp: ['C3b', 'C5b', 'C7', 'C6'],
  render: () => {
    const y = state.year, mo = y * 12;
    return `
  <div class="grid g4">
    <div class="panel tight">${kpi(`${mo} / 36`, 'Months of subscription used')}<div class="bar-track thin" style="margin-top:8px"><i style="width:${(mo / 36) * 100}%"></i></div></div>
    <div class="panel tight">${kpi(`${[24, 41, 58][y - 1]} / 75`, 'Analyst & owner seats in use')}</div>
    <div class="panel tight">${kpi(['99.92%', '99.95%', '99.97%'][y - 1], 'Uptime this year (target 99.5%)')}</div>
    <div class="panel tight">${kpi([4, 2, 1][y - 1], 'Open support tickets')}</div>
  </div>
  <div class="panel"><div class="ph"><h3>Delivery timeline</h3><span class="note">Months from contract award · dashed line: end of ${Y0 + y - 1}</span></div><div class="scroll-x"><div id="gantt" style="min-width:760px"></div></div></div>
  <div class="grid g3">
    <div class="panel"><div class="ph"><h3>Releases</h3><span class="note">${4 * y} of 12 delivered</span></div><div class="list">
      ${RELEASES.map(([v, n], i) => i < 4 * y ? li('ok', `v${v}`, n) : li('mute', `v${v}`, n)).slice(Math.max(0, 4 * y - 4), 4 * y + 2).join('')}
    </div></div>
    <div class="panel"><div class="ph"><h3>Service levels · ${Y0 + y - 1}</h3></div><table class="tbl"><thead><tr><th>Priority</th><th>Response</th><th>Fix</th><th class="num">Met</th></tr></thead><tbody>
      ${[['P1 outage', '1 h · 24/7', '4 h workaround', '100%'], ['P2 major', '4 h', '1 day', ['96%', '100%', '100%'][y - 1]], ['P3 minor', '1 day', '5 days', ['94%', '98%', '99%'][y - 1]], ['Request', '2 days', 'planned', ['97%', '99%', '99%'][y - 1]]].map((r) => `<tr><td><b style="font-weight:600">${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td><td class="num">${r[3]}</td></tr>`).join('')}
    </tbody></table><p class="note" style="margin-top:8px">Named customer success manager; monthly service review, quarterly steering. Background database updates included.</p></div>
    <div class="panel"><div class="ph"><h3>Training &amp; academy</h3></div>
      ${[['LCA analysts', '3 days + certification', [.6, 1, 1]], ['Unit owners', '½ day', [.5, .9, 1]], ['Approvers & managers', '1 day', [.7, 1, 1]], ['Viewers', '1 h e-learning', [.4, .8, .95]]].map(([n, t, v]) => `<div style="padding:7px 0;border-top:1px solid var(--line)"><div class="flex between"><span>${n} <span class="muted">· ${t}</span></span><b>${pct(v[y - 1])}</b></div><div class="bar-track thin" style="margin-top:5px"><i style="width:${v[y - 1] * 100}%"></i></div></div>`).join('')}
      <p class="note" style="margin-top:8px">In-app guides on every screen and a sandbox copy of the site model for practice.</p></div>
  </div>
  <div class="grid g2">
    <div class="panel"><div class="ph"><h3>Plan</h3></div><table class="tbl"><tbody>
      <tr><td class="muted">Term</td><td>36 months from award, ${Y0}–${Y0 + 2}</td></tr>
      <tr><td class="muted">Modules</td><td>Inventory, footprints, scenarios, reporting, integrations, PACT exchange</td></tr>
      <tr><td class="muted">Background data</td><td>ecoinvent, IPCC EFDB, UAE grid factors (annual updates)</td></tr>
      <tr><td class="muted">Deployment</td><td>SaaS, UAE region (on-premises option)</td></tr>
      <tr><td class="muted">Support</td><td>UAE business hours, P1 24/7, follow-the-sun desk</td></tr>
    </tbody></table></div>
    <div class="panel"><div class="ph"><h3>Tickets</h3></div><div class="list">
      ${[['#2291', 'LDAR file drop rejects new column', 'P3', 'warn', 'In progress'], ['#2284', 'Power BI refresh delayed 40 min', 'P3', 'ok', 'Resolved'], ['#2270', 'Add tag mapping for new heater H-305', 'Request', 'ok', 'Resolved'], ['#2251', 'Export of scenario book to Word', 'Request', 'ok', 'Resolved']].slice(0, 2 + y).map(([n, t, p, k, s]) => li(k, `${n} ${t}`, `${p} · ${s}`)).join('')}
    </div></div>
  </div>`;
  },
  after: () => drawGantt(),
  onYear: () => show(state.sec, false, true),
});
function drawGantt() {
  const W = 1000, rowH = 24, top = 44, left = 250, n = GANTT.length, H = top + n * rowH + 10;
  const x = (m) => left + (m / 36) * (W - left - 52);
  let s = `<svg class="gantt" viewBox="0 0 ${W} ${H}" role="img" aria-label="Delivery timeline">`;
  for (let y = 0; y < 3; y++) s += `<rect x="${x(y * 12)}" y="${top - 6}" width="${x(12) - x(0)}" height="${n * rowH + 6}" fill="${y % 2 ? 'transparent' : 'var(--line)'}" opacity=".5"/><text x="${x(y * 12) + 6}" y="12" font-size="11" font-weight="700" fill="var(--muted)">${Y0 + y}</text>`;
  for (let m = 0; m <= 36; m += 3) s += `<line x1="${x(m)}" x2="${x(m)}" y1="${top - 6}" y2="${H - 4}" stroke="var(--grid)"/><text x="${x(m)}" y="${top - 12}" font-size="9" fill="var(--muted)" text-anchor="middle">${m}</text>`;
  GANTT.forEach(([lab, a, b, tag], i) => {
    const yy = top + i * rowH, done = b <= state.year * 12;
    s += `<text x="0" y="${yy + 14}" font-size="11.5" fill="var(--ink2)">${lab}</text>`;
    if (tag === 'm') s += `<path d="M${x(a)} ${yy + 3} l7 7 -7 7 -7 -7z" fill="${done ? 'var(--ink)' : 'var(--faint)'}"/>`;
    else s += `<rect x="${x(a)}" y="${yy + 5}" width="${Math.max(4, x(b) - x(a))}" height="${tag === 's' ? 6 : 12}" rx="3" fill="${tag === 's' ? 'var(--up)' : done ? 'var(--barsel)' : 'var(--bar)'}"/>`;
  });
  for (let q = 3; q <= 36; q += 3) s += `<circle cx="${x(q)}" cy="${top + (n - 1) * rowH + 8}" r="3" fill="var(--up)"/>`;
  s += `<line x1="${x(state.year * 12)}" x2="${x(state.year * 12)}" y1="${top - 6}" y2="${H - 4}" stroke="var(--ink)" stroke-dasharray="4 3"/></svg>`;
  $('#gantt').innerHTML = s;
}


/* =====================================================================
   Requirements baseline v0.1 (30 Oct 2026): IDs, labels, where shown
   coverage: 'shown' demonstrated in this mock · 'part' partly · 'none' not in this demo
   ===================================================================== */
const OPT = new Set(['FR-018', 'FR-029', 'FR-048', 'FR-054', 'FR-055', 'FR-063', 'FR-068', 'FR-069', 'FR-070', 'INT-04', 'INT-05']);
const REQS = [
  ['FR-001', 'Create, search, filter, copy, version and archive studies', 'studies', 'shown'], ['FR-002', 'Study identity: ID, title, owner, product, geography, period, objective, status', 'studies', 'shown'],
  ['FR-003', 'Functional unit and reference flow', 'scope', 'shown'], ['FR-004', 'Boundary, stages, exclusions, assumptions, limitations, intended use', 'studies', 'shown'],
  ['FR-005', 'Agreed boundary types, not one boundary for every study', 'scope', 'shown'], ['FR-006', 'Methodology, impact method, factor version, time horizon, allocation', 'scope', 'shown'],
  ['FR-007', 'Preserve study versions; show which version each run and report uses', 'studies', 'shown'], ['FR-008', 'Mark results stale when inputs change after calculation', 'studies', 'shown'],
  ['FR-009', 'Processes connected by typed flows', 'model', 'shown'], ['FR-010', 'Technosphere vs elementary flows', 'model', 'shown'], ['FR-011', 'Reusable process templates and libraries', 'model', 'shown'],
  ['FR-012', 'Parameters and formulas with units, values, dependencies', 'model', 'shown'], ['FR-013', 'Detect missing references, bad connections, unresolved parameters', 'model', 'shown'],
  ['FR-014', 'Solve valid loops; flag unsolvable models', 'model', 'shown'], ['FR-015', 'Multi-output allocation with documented inputs', 'formulas', 'shown'], ['FR-016', 'Adapt reference processes locally, keep provenance', 'model', 'shown'],
  ['FR-017', 'Navigable process network', 'model', 'shown'], ['FR-018', 'Consequential, input-output or hybrid LCA', 'model', 'none'],
  ['FR-019', 'Enter activity data with units, periods, sources, evidence', 'inventory', 'shown'], ['FR-020', 'Measured, calculated, estimated and reference data distinguished', 'site', 'shown'],
  ['FR-021', 'Import CSV / spreadsheet templates with column and unit mapping', 'import', 'shown'], ['FR-022', 'Preview and validate before commit', 'import', 'shown'],
  ['FR-023', 'Atomic or partial import; no silent data loss', 'import', 'shown'], ['FR-024', 'Duplicate detection by business key; update or reject', 'import', 'shown'],
  ['FR-025', 'Validate fields, types, units, periods, references, plausibility', 'import', 'shown'], ['FR-026', 'Blocking errors vs warnings, with corrective action', 'import', 'shown'],
  ['FR-027', 'Explanations for accepted warnings and estimates', 'import', 'shown'], ['FR-028', 'Mass / energy balance check with tolerance', 'inventory', 'shown'], ['FR-029', 'Supplier data collection portal', 'integrations', 'part'],
  ['FR-030', 'Search and filter datasets', 'databases', 'part'], ['FR-031', 'Dataset description, applicability, quality, limitations', 'databases', 'part'], ['FR-032', 'Licensed packages and custom datasets kept apart', 'databases', 'shown'],
  ['FR-033', 'Dataset editions pinned to historical runs', 'runs', 'shown'], ['FR-034', 'Custom factors with owner, validity, review status', 'formulas', 'shown'], ['FR-035', 'Representativeness and uncertainty recorded', 'site', 'shown'],
  ['FR-036', 'Flag missing, outdated or poorly matched data', 'databases', 'shown'], ['FR-037', 'Preview affected studies before a database update', 'databases', 'shown'], ['FR-038', 'Respect licensed-data export restrictions', 'security', 'part'],
  ['FR-039', 'Calculate LCI and carbon results', 'runs', 'shown'], ['FR-040', 'Unit conversions; block incompatible dimensions', 'runs', 'shown'], ['FR-041', 'Agreed characterisation factors, CO₂e unit', 'formulas', 'shown'],
  ['FR-042', 'Biogenic carbon, removals, credits, negative flows', 'formulas', 'part'], ['FR-043', 'Run snapshot: inputs, datasets, engine, method, warnings, outputs', 'runs', 'shown'],
  ['FR-044', 'Failed runs never shown as results', 'runs', 'shown'], ['FR-045', 'Reproduce unchanged runs within tolerance', 'runs', 'shown'], ['FR-046', 'Trace results to processes, flows and factors', 'runs', 'shown'],
  ['FR-047', 'No double counting; documented conventions', 'model', 'part'], ['FR-048', 'Other impact categories', 'scope', 'part'],
  ['FR-049', 'Scenarios from a preserved baseline', 'scenarios', 'shown'], ['FR-050', 'Absolute and % differences; zero baseline handled', 'runs', 'shown'], ['FR-051', 'Flag incompatible comparisons', 'runs', 'shown'],
  ['FR-052', 'Contribution breakdowns and value-chain trace', 'products', 'shown'], ['FR-053', 'Sensitivity analysis', 'scenarios', 'shown'], ['FR-054', 'Probabilistic uncertainty (Monte Carlo)', 'scenarios', 'shown'], ['FR-055', 'Life cycle costing / techno-economics', 'scenarios', 'none'],
  ['FR-056', 'Totals, intensity, contribution charts, tables', 'impact', 'shown'], ['FR-057', 'Drill down without losing study / version context', 'products', 'shown'], ['FR-058', 'Report with goal, scope, methods, data, assumptions, limitations, IDs', 'reporting', 'shown'],
  ['FR-059', 'Export in agreed formats', 'reporting', 'shown'], ['FR-060', 'Exports reconcile with the selected run', 'runs', 'shown'], ['FR-061', 'Draft / stale / approved labels on results', 'studies', 'shown'],
  ['FR-062', 'Protect confidential and licensed data in outputs', 'security', 'part'], ['FR-063', 'Report templates and portfolio dashboards', 'dashboard', 'shown'],
  ['FR-064', 'Authorised access for read, edit, configure, calculate, export', 'security', 'shown'], ['FR-065', 'Audit of changes and calculations', 'audit', 'shown'], ['FR-066', 'Locking / conflict handling for shared work', 'studies', 'shown'],
  ['FR-067', 'Guidance, templates, clear messages', 'dashboard', 'shown'], ['FR-068', 'Review comments and resolution', 'studies', 'shown'], ['FR-069', 'Draft → review → approval workflow', 'studies', 'shown'], ['FR-070', 'SSO and automated provisioning', 'security', 'shown'],
  ['INT-01', 'Versioned file import / export templates', 'import', 'shown'], ['INT-02', 'Export customer-created studies and results', 'reporting', 'shown'], ['INT-03', 'Model exchange formats (EcoSpold, ILCD)', 'integrations', 'part'],
  ['INT-04', 'Excel / SQL sources with mapping and refresh', 'integrations', 'part'], ['INT-05', 'ERP, historian, LIMS, supplier, BI integrations', 'integrations', 'shown'], ['INT-06', 'Authenticated, validated, retry-safe interfaces', 'integrations', 'shown'], ['INT-07', 'Interface direction, frequency, ownership, schema', 'integrations', 'part'],
  ['NFR-01', 'Least privilege; access lifecycle', 'security', 'shown'], ['NFR-02', 'Authentication and session protection', 'security', 'shown'], ['NFR-03', 'Encryption in transit and at rest', 'security', 'shown'], ['NFR-04', 'Personal data documented', 'operations', 'shown'],
  ['NFR-05', 'Protected logs, no credentials in logs', 'audit', 'part'], ['NFR-06', 'Hosting and residency', 'security', 'part'], ['NFR-07', 'Supported platforms published', 'security', 'part'], ['NFR-08', 'Performance targets', 'operations', 'shown'],
  ['NFR-09', 'Capacity targets', 'operations', 'shown'], ['NFR-10', 'Failed runs never corrupt work', 'operations', 'shown'], ['NFR-11', 'Backup and recovery', 'operations', 'shown'], ['NFR-12', 'Availability (hosted only)', 'subscription', 'part'],
  ['NFR-13', 'Update process and calculation-affecting changes', 'operations', 'shown'], ['NFR-14', 'Usability: units, labels, help, errors', 'dashboard', 'shown'], ['NFR-15', 'Accessibility and language', 'reporting', 'part'], ['NFR-16', 'HSE and internal policies assessed', 'site', 'part'],
  ['NFR-17', 'Maintainability documented', 'operations', 'shown'], ['NFR-18', 'Portability and exit', 'subscription', 'part'],
  ['SVC-01', 'Licence type, users, modules, term', 'subscription', 'part'], ['SVC-02', 'Database subscriptions itemised', 'databases', 'part'], ['SVC-03', 'Coverage aligned to the 3-year term', 'subscription', 'shown'], ['SVC-04', 'Implementation plan with gates', 'subscription', 'shown'],
  ['SVC-05', 'Configure units, templates, datasets, access, reports', 'scope', 'shown'], ['SVC-06', 'Validate with a reference LCA model', 'requirements', 'part'], ['SVC-07', 'Practical training', 'subscription', 'shown'], ['SVC-08', 'Training days, participants, evidence', 'subscription', 'part'],
  ['SVC-09', 'Documentation set', 'operations', 'shown'], ['SVC-10', 'Support channels, severities, targets', 'subscription', 'shown'], ['SVC-11', 'Upgrades, patches, database updates', 'subscription', 'shown'], ['SVC-12', 'Warranty, renewal, expiry, exit', 'subscription', 'part'],
];
const ATS = [
  ['AT-01', 'FR-001–008', 'Create and copy a study; scope fields and version stay complete', 'studies'], ['AT-02', 'FR-009–017', 'Multi-process model; missing connections found; loop and allocation handled', 'model'],
  ['AT-03', 'FR-019–028', 'Import with missing values, bad units, duplicates: row-level diagnostics, no silent loss', 'import'], ['AT-04', 'FR-030–038', 'Dataset provenance; update does not overwrite history', 'databases'],
  ['AT-05', 'FR-039–047', 'Reference case reconciles within tolerance', 'runs'], ['AT-06', 'FR-043–046', 'Reproduce a run; trace an output to inventory and datasets', 'runs'],
  ['AT-07', 'FR-049–053', 'Scenario change gives expected difference; baseline kept', 'scenarios'], ['AT-08', 'FR-051', 'Incompatible comparison flagged', 'runs'],
  ['AT-09', 'FR-056–062', 'Report totals match the run; scope and IDs present', 'reporting'], ['AT-10', 'FR-064–066', 'Unauthorised edits blocked; conflicts not silently overwritten', 'security'],
  ['AT-11', 'FR-068–070', 'Comments, approval locking, identity integration', 'studies'], ['AT-12', 'INT-01–07', 'Mapping, validation, retries for each agreed interface', 'import'],
  ['AT-13', 'NFR-08–12', 'Performance, capacity and restore within agreed targets', 'operations'], ['AT-14', 'SVC-01–12', 'Entitlements, databases, documentation, training, support', 'subscription'],
];
const ODS = [
  ['OD-01', 'Annexure 4 Scope of Services, schedules and clarifications'], ['OD-02', 'Target products, facilities, processes, periods, boundaries'], ['OD-03', 'Carbon only, or water / other impacts / costing'],
  ['OD-04', 'Standards, factor sets, time horizons, allocation, cut-off, carbon rules'], ['OD-05', 'Reference databases, editions, licence rights'], ['OD-06', 'User counts, concurrency, roles, access boundaries'],
  ['OD-07', 'Deployment, platform, residency, network, offline access'], ['OD-08', 'Data sources, study migration, formats, automated interfaces'], ['OD-09', 'Optional review, approval, supplier, dashboard features'],
  ['OD-10', 'Report templates, export formats, sharing, assurance'], ['OD-11', 'Performance, availability, backup, recovery, retention targets'], ['OD-12', 'Training, milestones, warranty, service levels, contract dates'],
  ['OD-13', 'HSE, IT, security, privacy, accessibility policies'], ['OD-14', 'Reference models, expected results, tolerances, owners'], ['OD-15', 'Model ownership, database retention, exit and export'],
];
const TCS = [['TC-01', 'Three-year duration', 'subscription'], ['TC-02', 'Purchase, support and maintenance', 'subscription'], ['TC-03', 'Data management', 'inventory'], ['TC-04', 'Database quality and coverage', 'databases'], ['TC-05', 'Reporting and visualisation', 'reporting'], ['TC-06', 'Usability: workflow, learning curve, modelling', 'model'], ['TC-07', 'Security and privacy', 'security'], ['TC-08', 'Updates and support', 'subscription'], ['TC-09', 'Platform compatibility', 'security'], ['TC-10', 'Integration', 'integrations'], ['TC-11', 'Scalability', 'security'], ['TC-12', 'HSE (policy not supplied)', 'site'], ['TC-13', 'Deployment and schedule', 'subscription']];
const reqLabel = (id) => (OPT.has(id) ? ['warn', 'Optional'] : ['mute', 'Proposed core']);
const COV = { shown: ['ok', 'Shown'], part: ['warn', 'Partly'], none: ['bad', 'Not in demo'] };
const reqChips = (ids) => ids.map((r) => `<button class="tag" data-reqgo="${r}" style="cursor:pointer;border:0">${r}</button>`).join(' ');

/* =====================================================================
   Study library (FR-001–008, FR-061, FR-066, FR-068–069)
   ===================================================================== */
const STUDIES = [
  { id: 'ST-0118', title: 'Diesel (ULSD) cradle-to-gate', product: 'Diesel', owner: 'A. Rahman', geo: 'UAE', period: '2029', fu: '1 MJ (LHV)', bound: 'Cradle-to-gate', method: 'IPCC AR6 GWP100', alloc: 'Unit sub-division', ver: 12, status: 'Approved', calc: 'Current', run: 'RUN-0412', use: 'Customer PCF requests (PACT)', excl: 'Capital goods; employee commuting', lim: 'Upstream crude intensity is supplier-declared for 2 of 6 grades' },
  { id: 'ST-0119', title: 'Gasoline cradle-to-gate', product: 'Gasoline', owner: 'A. Rahman', geo: 'UAE', period: '2029', fu: '1 MJ (LHV)', bound: 'Cradle-to-gate', method: 'IPCC AR6 GWP100', alloc: 'Unit sub-division', ver: 9, status: 'In review', calc: 'Current', run: 'RUN-0411', use: 'Internal decarbonisation tracking', excl: 'Capital goods', lim: 'FCC coke carbon fraction from quarterly lab samples' },
  { id: 'ST-0121', title: 'Jet A-1 cradle-to-gate', product: 'Jet', owner: 'J. Chen', geo: 'UAE', period: '2029', fu: '1 MJ (LHV)', bound: 'Cradle-to-gate', method: 'IPCC AR6 GWP100', alloc: 'Energy (LHV)', ver: 4, status: 'Changes requested', calc: 'Stale', run: 'RUN-0398', use: 'Airline customer request', excl: 'Capital goods', lim: 'Hydrogen allocation pending approver comment', comments: [['S. Menon', 'Please justify energy allocation over sub-division for the hydrocracker; results differ by 9%.', 'Open'], ['J. Chen', 'Agreed, switching and recalculating.', 'Reply']] },
  { id: 'ST-0124', title: 'Hydrogen (SMR) gate-to-gate', product: 'Hydrogen', owner: 'J. Chen', geo: 'UAE', period: '2029', fu: '1 kg H₂', bound: 'Gate-to-gate', method: 'IPCC AR6 GWP100', alloc: 'System expansion (steam)', ver: 2, status: 'Draft', calc: 'Not calculated', run: '—', use: 'CCS feasibility screening', excl: 'Upstream gas supply', lim: 'Steam credit uses cogeneration average' },
  { id: 'ST-0103', title: 'Refinery product slate baseline', product: 'All 7 products', owner: 'A. Rahman', geo: 'UAE', period: '2027', fu: '1 t product', bound: 'Cradle-to-gate', method: 'IPCC AR6 GWP100', alloc: 'Energy (LHV)', ver: 6, status: 'Approved', calc: 'Current', run: 'RUN-0102', use: 'Baseline; ISO 14071 critical review', excl: 'Capital goods', lim: 'Year 1 data completeness 88%' },
  { id: 'ST-0087', title: 'Sulphur co-product (pilot)', product: 'Sulphur', owner: 'J. Chen', geo: 'UAE', period: '2027', fu: '1 t sulphur', bound: 'Cradle-to-gate', method: 'IPCC AR5 GWP100', alloc: 'Mass', ver: 3, status: 'Archived', calc: 'Current', run: 'RUN-0055', use: 'Superseded by ST-0103', excl: '—', lim: 'Mass allocation not used for later studies' },
];
const NEXT = { Draft: [['Submit for review', 'In review']], 'In review': [['Request changes', 'Changes requested'], ['Approve', 'Approved']], 'Changes requested': [['Resubmit', 'In review']], Approved: [['New draft version', 'Draft*'], ['Archive', 'Archived']], Archived: [] };
const STB = { Draft: 'mute', 'In review': 'warn', 'Changes requested': 'bad', Approved: 'ok', Archived: 'mute' };
const CALB = { Current: 'ok', Stale: 'warn', 'Not calculated': 'mute' };
state.study = 'ST-0121'; state.stF = 'All';
sec({ id: 'studies', group: 'Footprints', icon: '▣', title: 'Study library', nav: 'Study library',
  sub: 'Every LCA study with its scope, version, review status and whether its results are current. Approved versions are locked; changing one opens a new draft.',
  actions: ['Import study', 'New study'], rfp: ['C4a', 'C5a'], req: ['FR-001', 'FR-007', 'FR-008', 'FR-069'],
  render: () => `<div class="grid g-side"><div class="panel">
      <div class="ph"><div class="filter-row" id="stF">${['All', 'Draft', 'In review', 'Changes requested', 'Approved', 'Archived'].map((k) => `<button class="pill" data-f="${k}">${k}</button>`).join('')}</div><div class="search" style="max-width:220px"><span>⌕</span><input id="stQ" placeholder="Search studies"></div></div>
      <div class="scroll-x"><table class="tbl" id="stTbl"></table></div></div>
    <div class="panel raised" id="stDet"></div></div>`,
  after: () => {
    const draw = () => {
      $$('#stF .pill').forEach((b) => b.classList.toggle('is-ink', b.dataset.f === state.stF));
      const q = ($('#stQ').value || '').toLowerCase();
      const rows = STUDIES.filter((s) => (state.stF === 'All' || s.status === state.stF) && `${s.id} ${s.title} ${s.owner} ${s.product}`.toLowerCase().includes(q));
      $('#stTbl').innerHTML = `<thead><tr><th>ID</th><th>Study</th><th>Owner</th><th>Ver.</th><th>Status</th><th>Results</th></tr></thead><tbody>${rows.map((s) => `<tr class="is-click${s.id === state.study ? ' is-sel' : ''}" data-st="${s.id}"><td><b style="font-weight:600">${s.id}</b></td><td>${esc(s.title)}<div class="note">${s.bound} · ${s.fu} · ${s.period}</div></td><td class="muted">${s.owner}</td><td>v${s.ver}</td><td><span class="badge ${STB[s.status]}">${s.status}</span></td><td><span class="badge ${CALB[s.calc]}">${s.calc}</span></td></tr>`).join('') || '<tr><td colspan="6" class="muted">No studies match.</td></tr>'}</tbody>`;
      $$('#stTbl tr[data-st]').forEach((r) => r.addEventListener('click', () => { state.study = r.dataset.st; draw(); }));
      det();
    };
    const det = () => {
      const s = STUDIES.find((x) => x.id === state.study) || STUDIES[0];
      const locked = s.status === 'Approved' || s.status === 'Archived';
      $('#stDet').innerHTML = `<div class="flex between"><span class="tag">${s.id} · v${s.ver}</span><div class="flex"><span class="badge ${STB[s.status]}">${s.status}</span>${locked ? '<span class="badge mute">🔒 locked</span>' : '<span class="badge mute">Editing: A. Rahman</span>'}</div></div>
        <h3 style="font-size:19px;font-weight:600;margin:8px 0 2px">${esc(s.title)}</h3>
        ${s.calc === 'Stale' ? `<div class="callout warn" style="margin:8px 0"><b>Results are stale.</b> Inputs changed after ${s.run}; figures from that run are shown greyed until recalculated. <button class="pill" id="stRecalc" style="margin-top:6px">Recalculate</button></div>` : ''}
        <table class="tbl" style="margin-top:6px"><tbody>
          ${[['Product / process', s.product], ['Owner', s.owner], ['Geography · period', `${s.geo} · ${s.period}`], ['Intended use', s.use], ['Functional unit', s.fu], ['Boundary', s.bound], ['Method', s.method], ['Allocation', s.alloc], ['Exclusions', s.excl], ['Limitations', s.lim], ['Latest run', s.run]].map(([a, b]) => `<tr><td class="muted">${a}</td><td>${esc(b)}</td></tr>`).join('')}
        </tbody></table>
        ${s.comments ? `<div class="eyebrow" style="margin:10px 0 4px">Review comments</div><div class="list">${s.comments.map(([w, t, st]) => li(st === 'Open' ? 'warn' : 'mute', w, esc(t))).join('')}</div>` : ''}
        <div class="eyebrow" style="margin:10px 0 4px">Versions</div><div class="flex">${[...Array(Math.min(s.ver, 4))].map((_, i) => `<span class="tag">v${s.ver - i}${i === 0 ? ' · current' : ''}</span>`).join('')}</div>
        <div class="flex" style="margin-top:14px">${(NEXT[s.status] || []).map(([l, to]) => `<button class="pill${to === 'Approved' || to === 'In review' ? ' is-ink' : ''}" data-to="${to}">${l}</button>`).join('')}<button class="pill" id="stCopy">Copy study</button></div>`;
      $$('#stDet [data-to]').forEach((b) => b.addEventListener('click', () => {
        const to = b.dataset.to;
        if (to === 'Draft*') { s.ver += 1; s.status = 'Draft'; s.calc = 'Stale'; toast(`${s.id} v${s.ver} opened as a draft; v${s.ver - 1} stays approved and locked`); }
        else { s.status = to; toast(`${s.id} v${s.ver}: ${to}`); }
        AUDIT.unshift({ when: 'Just now', who: 'SM · Sustainability manager', k: 'Model', what: `${s.id} v${s.ver} → ${s.status}`, ver: `Study ${s.id} v${s.ver}` });
        draw();
      }));
      $('#stCopy').addEventListener('click', () => { const n = { ...s, id: 'ST-0' + (130 + STUDIES.length), title: 'Copy of ' + s.title, ver: 1, status: 'Draft', calc: 'Not calculated', run: '—', comments: null }; STUDIES.unshift(n); state.study = n.id; state.stF = 'All'; toast(`${n.id} created from ${s.id} v${s.ver}`); draw(); });
      $('#stRecalc')?.addEventListener('click', () => { s.calc = 'Current'; s.run = 'RUN-04' + (13 + Math.floor(Math.random() * 80)); toast(`${s.id}: recalculated as ${s.run}`); draw(); });
    };
    $$('#stF .pill').forEach((b) => b.addEventListener('click', () => { state.stF = b.dataset.f; draw(); }));
    $('#stQ').addEventListener('input', draw);
    draw();
  },
});

/* =====================================================================
   Model workspace (FR-009–017)
   ===================================================================== */
const NODES = [
  ['crude', 'Crude supply', 'dataset', 0, 1, 'Supplier CI by grade · v2029.2'], ['ng', 'Natural gas supply', 'dataset', 0, 3, 'ecoinvent 3.10 (ME) · adapted'], ['grid', 'Grid electricity', 'dataset', 0, 4.4, 'UAE 2029 factor'],
  ['cdu', 'CDU / VDU', 'process', 1, 1, 'Template: atmospheric + vacuum'], ['hcu', 'Hydrocracker', 'process', 2, 0.3, 'Template: hydrocracking'], ['fcc', 'Residue FCC', 'process', 2, 1.6, 'Template: FCC'],
  ['smr', 'Hydrogen (SMR)', 'process', 1, 3, 'Template: SMR'], ['cog', 'Cogeneration', 'process', 1, 4.4, 'Template: GT + HRSG'], ['ccr', 'Reformer (CCR)', 'process', 2, 2.9, 'Template: CCR'],
  ['tank', 'Product blending & tanks', 'process', 3, 1.6, 'Local'], ['prod', 'Products (7)', 'product', 4, 1.6, 'Allocation: unit sub-division'], ['air', 'Emissions to air', 'elementary', 4, 4, 'CO₂, CH₄, N₂O'],
];
const EDGES = [['crude', 'cdu', 'mat'], ['cdu', 'hcu', 'mat'], ['cdu', 'fcc', 'mat'], ['cdu', 'ccr', 'mat'], ['ng', 'smr', 'mat'], ['smr', 'hcu', 'mat'], ['ccr', 'hcu', 'mat'], ['hcu', 'tank', 'prod'], ['fcc', 'tank', 'prod'], ['ccr', 'tank', 'prod'], ['tank', 'prod', 'prod'], ['grid', 'cog', 'en'], ['cog', 'cdu', 'en'], ['cog', 'hcu', 'en'], ['fcc', 'cog', 'loop'], ['cdu', 'air', 'em'], ['fcc', 'air', 'em'], ['smr', 'air', 'em'], ['cog', 'air', 'em']];
const NODE_IO = {
  smr: { cp: '07', ins: [['Natural gas (feed + fuel)', 'material', '12,500 t', 'FI-07NG'], ['Steam', 'energy', '41 GWh', 'from Cogeneration'], ['Electricity', 'energy', '9 GWh', 'EM-07']], outs: [['Hydrogen', 'product', '1,560 t', 'FI-07H2'], ['CO₂ (process + combustion)', 'elementary', '57.6 kt', 'formula smr v2'], ['CH₄ (slip)', 'elementary', '4 t', 'default']], params: [['steam_to_carbon', '3.0', '–', 'design'], ['C_feed', '0.73', 'kg C/kg', 'AI-07NG']] },
};
state.node = 'smr';
sec({ id: 'model', group: 'Footprints', icon: '⧉', title: 'Model workspace', nav: 'Model workspace',
  sub: 'The process model behind every footprint: processes joined by typed flows, parameters with units, and checks that run before any calculation.',
  actions: ['Template library', 'Validate model'], rfp: ['C5c'], req: ['FR-009', 'FR-013', 'FR-014', 'FR-017'],
  render: () => `<div class="grid g-side"><div class="panel">
      <div class="ph"><h3>Process network · ST-0118 v12</h3><div class="legend"><span><i class="ln mat"></i>Material</span><span><i class="ln en"></i>Energy</span><span><i class="ln prod"></i>Product</span><span><i class="ln em"></i>Elementary</span><span><i class="ln loop"></i>Loop</span></div></div>
      <div class="scroll-x"><svg id="net" viewBox="0 0 1010 390" style="min-width:640px;width:100%;display:block"></svg></div></div>
    <div class="stack"><div class="panel raised" id="nodeDet"></div>
      <div class="panel"><div class="ph"><h3>Model checks</h3><span class="badge warn">1 warning</span></div><div class="list">
        ${li('ok', 'References', 'All 42 flows connected; no dangling inputs or outputs.')}
        ${li('ok', 'Units', 'All conversions dimensionally valid (148 checked).')}
        ${li('ok', 'Loop solved', 'FCC fuel gas → Cogeneration → CDU solved by matrix inversion; converged.')}
        ${li('warn', 'Parameter without source', 'P_ccr_h2_yield uses a design value; add a measured source or accept with a note.')}
        ${li('ok', 'Double counting', 'Steam counted at Cogeneration only; consumers carry allocated share.')}
      </div></div></div></div>`,
  after: () => {
    const X = (c) => 30 + c * 205, Y = (r) => 30 + r * 70, W = 150, H = 40;
    const N = Object.fromEntries(NODES.map((n) => [n[0], n]));
    const col = { mat: 'var(--ink)', en: 'var(--c-flare)', prod: 'var(--up)', em: 'var(--muted)', loop: 'var(--c-proc)' };
    const dash = { mat: '', en: '5 4', prod: '', em: '2 4', loop: '6 3' };
    const draw = () => {
      let s = `<defs>${Object.entries(col).map(([k, c]) => `<marker id="ar-${k}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" fill="${c}"/></marker>`).join('')}</defs>`;
      EDGES.forEach(([a, b, t]) => {
        const A = N[a], B = N[b]; let x1 = X(A[3]) + W, y1 = Y(A[4]) + H / 2, x2 = X(B[3]), y2 = Y(B[4]) + H / 2;
        if (t === 'loop') { x1 = X(A[3]) + W / 2; y1 = Y(A[4]) + H; x2 = X(B[3]) + W / 2; y2 = Y(B[4]); s += `<path d="M${x1} ${y1} C ${x1} ${y1 + 120}, ${x2 + 60} ${y2 - 60}, ${x2} ${y2}" fill="none" stroke="${col[t]}" stroke-width="1.6" stroke-dasharray="${dash[t]}" marker-end="url(#ar-${t})"/>`; return; }
        if (B[3] <= A[3]) { x1 = X(A[3]); x2 = X(B[3]) + W; }
        const mx = (x1 + x2) / 2;
        s += `<path d="M${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}" fill="none" stroke="${col[t]}" stroke-width="1.6" stroke-dasharray="${dash[t]}" marker-end="url(#ar-${t})"/>`;
      });
      NODES.forEach(([id, name, type, c, r, note]) => {
        const sel = id === state.node;
        const fill = type === 'dataset' ? 'var(--panel)' : type === 'elementary' ? 'var(--line)' : type === 'product' ? 'var(--upbg)' : 'var(--raised)';
        s += `<g class="nd" data-n="${id}" style="cursor:pointer"><rect x="${X(c)}" y="${Y(r)}" width="${W}" height="${H}" rx="10" fill="${sel ? 'var(--ink)' : fill}" stroke="${sel ? 'var(--ink)' : 'var(--line2)'}" ${type === 'dataset' ? 'stroke-dasharray="4 3"' : ''}/><text x="${X(c) + 10}" y="${Y(r) + 17}" font-size="12" font-weight="600" fill="${sel ? 'var(--page)' : 'var(--ink)'}" font-family="var(--font)">${name}</text><text x="${X(c) + 10}" y="${Y(r) + 31}" font-size="9.5" fill="${sel ? 'var(--page)' : 'var(--muted)'}" font-family="var(--font)">${type === 'dataset' ? 'Background dataset' : type === 'elementary' ? 'Environment' : type === 'product' ? 'Reference flows' : 'Process'}</text></g>`;
      });
      $('#net').innerHTML = s;
      $$('#net .nd').forEach((g) => g.addEventListener('click', () => { state.node = g.dataset.n; draw(); }));
      const n = N[state.node], io = NODE_IO[state.node];
      $('#nodeDet').innerHTML = `<div class="flex between"><span class="eyebrow">${n[2] === 'dataset' ? 'Background dataset' : n[2] === 'elementary' ? 'Elementary flows' : 'Process'}</span><span class="badge mute">${n[5]}</span></div><h3 style="font-size:18px;font-weight:600;margin:6px 0">${n[1]}</h3>
        ${io ? `<table class="tbl"><thead><tr><th>Flow</th><th>Type</th><th class="num">Amount</th><th>Source</th></tr></thead><tbody>${[...io.ins.map((x) => ['in', ...x]), ...io.outs.map((x) => ['out', ...x])].map(([d, a, t, q, src]) => `<tr><td>${d === 'in' ? '→ ' : '← '}${a}</td><td><span class="tag">${t}</span></td><td class="num">${q}</td><td class="muted">${src}</td></tr>`).join('')}</tbody></table>
          <div class="eyebrow" style="margin:10px 0 4px">Parameters</div><table class="tbl"><tbody>${io.params.map((p) => `<tr><td><code>${p[0]}</code></td><td class="num">${p[1]}</td><td class="muted">${p[2]}</td><td class="muted">${p[3]}</td></tr>`).join('')}</tbody></table>
          <button class="tag" data-cpgo="${io.cp}" style="cursor:pointer;border:0;margin-top:8px">Collection point CP-${io.cp} →</button>`
        : `<p class="note">Select the hydrogen plant to see a full inventory example. Each node lists its typed inputs and outputs, parameters with units, and the source of every value.</p>`}`;
      $$('#nodeDet [data-cpgo]').forEach((b) => b.addEventListener('click', () => { state.cp = b.dataset.cpgo; goto('site'); }));
    };
    draw();
  },
});

/* =====================================================================
   Data import (FR-021–027, INT-01)
   ===================================================================== */
const IMP_ROWS = [
  ['1', 'TK-201', '2029-12', '0.31', 'kg CH4/h', 'ok', ''], ['2', 'TK-202', '2029-12', '0.28', 'kg CH4/h', 'ok', ''], ['3', 'TK-203', '2029-12', '', 'kg CH4/h', 'err', 'Missing value: not treated as zero. Enter a value or mark “not surveyed”.'],
  ['4', 'TK-204', '2029-12', '4.9', 'kg CH4/h', 'warn', 'Above plausibility limit (2.0). Accept with explanation or correct.'], ['5', 'TK-205', '2029-12', '0.22', 'lb/h', 'err', 'Unit “lb/h” not in template v3. Map it or correct the file.'],
  ['6', 'TK-201', '2029-12', '0.31', 'kg CH4/h', 'dup', 'Duplicate of row 1 (key: tank + month).'], ['7', 'TK-206', '2029-11', '0.19', 'kg CH4/h', 'dup', 'Already in inventory 2029-11 v3 with 0.21.'], ['8', 'TK-207', '2029-12', '0.26', 'kg CH4/h', 'ok', ''],
];
state.imp = { step: 1, policy: 'partial', dup: { 6: 'reject', 7: 'update' }, why: '' };
sec({ id: 'import', group: 'Data', icon: '⇪', title: 'Data import', nav: 'Data import',
  sub: 'Templates, column and unit mapping, a full preview with row-level checks, and an explicit commit policy. Nothing changes until you commit, and nothing is dropped silently.',
  actions: ['Download template v3'], rfp: ['C4a'], req: ['FR-021', 'FR-023', 'FR-026', 'INT-01'],
  render: () => `<div class="panel"><div class="wiz" id="impSteps" style="grid-template-columns:repeat(4,minmax(0,1fr))"></div></div><div id="impBody"></div>`,
  after: () => {
    const I = state.imp;
    const draw = () => {
      $('#impSteps').innerHTML = ['Upload', 'Map columns', 'Preview & validate', 'Commit'].map((n, i) => `<div class="${i + 1 < I.step ? 'done' : i + 1 === I.step ? 'cur' : ''}" style="cursor:pointer" data-s="${i + 1}"><b>${i + 1}. ${n}</b></div>`).join('');
      $$('#impSteps [data-s]').forEach((d) => d.addEventListener('click', () => { if (+d.dataset.s <= I.step) { I.step = +d.dataset.s; draw(); } }));
      const cnt = (k) => IMP_ROWS.filter((r) => r[5] === k).length;
      let h = '';
      if (I.step === 1) h = `<div class="grid g2"><div class="panel"><div class="ph"><h3>File</h3></div><div class="li"><span class="check ok">✓</span><div class="li-main"><b>LDAR_tank_farm_Q4_2029.csv</b><p>8 rows · 5 columns · uploaded by N. Farouk</p></div></div><div class="field" style="margin-top:8px"><label>Template</label><select><option>LDAR survey · v3 (current)</option><option>LDAR survey · v2 (retired)</option></select></div><div class="field" style="margin-top:8px"><label>Target</label><select><option>Inventory 2029-12 · CP-02 Crude tank farm</option></select></div></div>
        <div class="panel"><div class="ph"><h3>Rules for this import</h3></div><div class="list">${li('ok', 'Missing values are never zero', 'They block the row until filled or marked.')}${li('ok', 'Units must be in the template', 'Unknown units block the row.')}${li('ok', 'Duplicates need a decision', 'Business key: tank + month.')}${li('ok', 'Warnings need an explanation', 'Kept with the value for reviewers.')}</div></div></div>`;
      if (I.step === 2) h = `<div class="panel"><div class="ph"><h3>Column mapping</h3><span class="badge ok">5 of 5 mapped</span></div><table class="tbl"><thead><tr><th>File column</th><th>Field</th><th>Type</th><th>Unit handling</th></tr></thead><tbody>${[['tank_id', 'Source (tank)', 'text', '—'], ['month', 'Period', 'YYYY-MM', '—'], ['leak_rate', 'Quantity', 'number', 'from column “unit”'], ['unit', 'Unit', 'unit', 'allowed: kg CH4/h, g CH4/h'], ['survey_ref', 'Evidence reference', 'text', '—']].map((r) => `<tr><td><code>${r[0]}</code></td><td>${r[1]}</td><td class="muted">${r[2]}</td><td class="muted">${r[3]}</td></tr>`).join('')}</tbody></table></div>`;
      if (I.step === 3) h = `<div class="grid g4" style="margin-bottom:16px"><div class="panel tight">${kpi(cnt('ok'), 'Valid rows')}</div><div class="panel tight">${kpi(cnt('warn'), 'Warnings (need explanation)')}</div><div class="panel tight">${kpi(cnt('err'), 'Blocking errors')}</div><div class="panel tight">${kpi(cnt('dup'), 'Possible duplicates')}</div></div>
        <div class="panel"><div class="scroll-x"><table class="tbl"><thead><tr><th>Row</th><th>Tank</th><th>Month</th><th class="num">Value</th><th>Unit</th><th>Check</th><th>What to do</th></tr></thead><tbody>${IMP_ROWS.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td class="num">${r[3] || '<span class="down">blank</span>'}</td><td>${r[4]}</td><td><span class="badge ${{ ok: 'ok', warn: 'warn', err: 'bad', dup: 'mute' }[r[5]]}">${{ ok: 'Valid', warn: 'Warning', err: 'Error', dup: 'Duplicate' }[r[5]]}</span></td><td class="note">${r[6]}${r[5] === 'dup' ? `<select data-dup="${r[0]}" style="margin-left:6px"><option value="reject" ${I.dup[r[0]] === 'reject' ? 'selected' : ''}>Reject</option><option value="update" ${I.dup[r[0]] === 'update' ? 'selected' : ''}>Update existing</option></select>` : ''}</td></tr>`).join('')}</tbody></table></div>
        <div class="field" style="margin-top:12px"><label>Explanation for row 4 (required to accept the warning)</label><input id="impWhy" value="${esc(I.why)}" placeholder="e.g. Confirmed by re-survey on 14 Dec; seal replaced 15 Dec"></div>
        <div class="flex" style="margin-top:12px"><span class="eyebrow">Commit policy</span><div class="radio-row"><button class="opt" data-pol="atomic">Atomic<small>Reject the whole file while any error remains</small></button><button class="opt" data-pol="partial">Partial<small>Commit valid rows; list every rejected row</small></button></div></div></div>`;
      if (I.step === 4) {
        const errs = cnt('err'), warnOk = !!I.why.trim();
        const atomicFail = I.policy === 'atomic' && errs > 0;
        const acc = atomicFail ? 0 : cnt('ok') + (warnOk ? cnt('warn') : 0) + Object.values(I.dup).filter((v) => v === 'update').length;
        const rej = IMP_ROWS.length - acc;
        h = `<div class="panel raised"><div class="ph"><h3>${atomicFail ? 'Nothing committed' : 'Committed to inventory 2029-12 v4'}</h3><span class="badge ${atomicFail ? 'bad' : 'ok'}">${I.policy === 'atomic' ? 'Atomic' : 'Partial'} policy</span></div>
          ${atomicFail ? `<div class="callout warn">${errs} blocking errors remain, so the atomic policy rejected the whole file. Fix rows 3 and 5 or switch to partial.</div>` : ''}
          <div class="grid g3" style="margin-top:10px">${kpi(acc, 'Rows accepted')}${kpi(rej, 'Rows rejected (listed below)')}${kpi(warnOk ? 'With note' : 'Rejected', 'Row 4 warning')}</div>
          <div class="list" style="margin-top:10px">${IMP_ROWS.filter((r) => atomicFail || r[5] === 'err' || (r[5] === 'warn' && !warnOk) || (r[5] === 'dup' && I.dup[r[0]] === 'reject')).map((r) => li('bad', `Row ${r[0]} · ${r[1]}`, r[5] === 'dup' ? 'Duplicate rejected' : r[6] || 'Rejected with the file')).join('')}</div>
          <p class="note" style="margin-top:10px">Rejected rows are saved to a correction file for the data owner. The import is in the audit log with file hash and template version.</p></div>`;
      }
      h += `<div class="flex between" style="margin-top:14px">${I.step > 1 ? '<button class="pill" id="impBack">← Back</button>' : '<span></span>'}${I.step < 4 ? `<button class="pill is-ink" id="impNext">${I.step === 3 ? 'Commit' : 'Next →'}</button>` : '<button class="pill is-ink" id="impAgain">New import</button>'}</div>`;
      $('#impBody').innerHTML = h;
      $('#impBack')?.addEventListener('click', () => { I.step--; draw(); });
      $('#impNext')?.addEventListener('click', () => { I.step++; draw(); if (I.step === 4) AUDIT.unshift({ when: 'Just now', who: 'N. Farouk · Unit owner (Tanks)', k: 'Data', what: `Imported LDAR_tank_farm_Q4_2029.csv (${I.policy})`, ver: 'Inventory 2029-12 v4' }); });
      $('#impAgain')?.addEventListener('click', () => { I.step = 1; draw(); });
      $$('[data-dup]').forEach((s) => s.addEventListener('change', () => { I.dup[s.dataset.dup] = s.value; }));
      $('#impWhy')?.addEventListener('input', (e) => { I.why = e.target.value; });
      $$('[data-pol]').forEach((b) => { b.setAttribute('aria-pressed', String(b.dataset.pol === I.policy)); b.addEventListener('click', () => { I.policy = b.dataset.pol; $$('[data-pol]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }); });
    };
    draw();
  },
});

/* =====================================================================
   Calculation runs (FR-033, FR-039–047, FR-050–051, FR-060, NFR-10)
   ===================================================================== */
const RUNS2 = [
  { id: 'RUN-0412', study: 'ST-0118 v12', scen: 'Baseline', method: 'IPCC AR6 GWP100', db: 'ecoinvent 3.10 · UAE grid 2029', eng: '5.2.0', when: 'Today 09:42', dur: '3 min 51 s', status: 'Succeeded', warn: 1, out: 376.2, bound: 'Cradle-to-gate', hash: '9c1e…a07f' },
  { id: 'RUN-0411', study: 'ST-0119 v9', scen: 'Baseline', method: 'IPCC AR6 GWP100', db: 'ecoinvent 3.10 · UAE grid 2029', eng: '5.2.0', when: 'Today 09:38', dur: '3 min 44 s', status: 'Succeeded', warn: 0, out: 425.4, bound: 'Cradle-to-gate', hash: '41bd…e2c9' },
  { id: 'RUN-0409', study: 'ST-0118 v12', scen: 'FGRU phase 2 + CCS', method: 'IPCC AR6 GWP100', db: 'ecoinvent 3.10 · UAE grid 2029', eng: '5.2.0', when: 'Yesterday', dur: '4 min 02 s', status: 'Succeeded', warn: 0, out: 341.8, bound: 'Cradle-to-gate', hash: '7a20…19dd' },
  { id: 'RUN-0408', study: 'ST-0124 v2', scen: 'Baseline', method: 'IPCC AR6 GWP100', db: 'ecoinvent 3.10', eng: '5.2.0', when: 'Yesterday', dur: '6 s', status: 'Failed', warn: 0, out: null, bound: 'Gate-to-gate', hash: 'b3f4…0c11', diag: 'Blocked before calculation: FI-07NG is in Sm³/h and no density is mapped for the natural-gas stream. No results were written; the study is unchanged.' },
  { id: 'RUN-0398', study: 'ST-0121 v4', scen: 'Baseline', method: 'IPCC AR6 GWP100', db: 'ecoinvent 3.10 · UAE grid 2029', eng: '5.1.0', when: '6 days ago', dur: '3 min 40 s', status: 'Stale', warn: 2, out: 352.9, bound: 'Cradle-to-gate', hash: 'e88a…5b30' },
  { id: 'RUN-0102', study: 'ST-0103 v6', scen: 'Baseline', method: 'IPCC AR6 GWP100', db: 'ecoinvent 3.9.1 · UAE grid 2027', eng: '4.4.0', when: 'Mar 2028', dur: '5 min 12 s', status: 'Succeeded', warn: 3, out: 397.6, bound: 'Cradle-to-gate', hash: '2d6c…f871' },
];
const RSB = { Succeeded: 'ok', Failed: 'bad', Stale: 'warn' };
state.run = 'RUN-0412'; state.cmp = ['RUN-0102', 'RUN-0412'];
const RUN_TABS = [
  ['list', 'Runs', () => `<div class="grid g-side" style="margin-top:14px"><div class="panel"><div class="scroll-x"><table class="tbl" id="runTbl"><thead><tr><th>Run</th><th>Study · scenario</th><th>Datasets · engine</th><th>When</th><th>Status</th></tr></thead><tbody>
      ${RUNS2.map((r) => `<tr class="is-click${r.id === state.run ? ' is-sel' : ''}" data-run="${r.id}"><td><b style="font-weight:600">${r.id}</b></td><td>${r.study}<div class="note">${r.scen}</div></td><td class="muted">${r.db}<div class="note">engine ${r.eng}</div></td><td class="muted">${r.when}</td><td><span class="badge ${RSB[r.status]}">${r.status}</span></td></tr>`).join('')}
    </tbody></table></div></div><div class="panel raised" id="runDet"></div></div>`],
  ['trace', 'Trace a result', () => {
    const p = pcf({ year: 3, alloc: 'subdiv' }).rows.find((q) => q.k === 'dsl');
    return `<div class="panel" style="margin-top:14px"><div class="ph"><h3>Diesel 376 kg CO₂e/t · RUN-0412</h3><span class="note">Click any step to open it</span></div>
      <div class="trace">${[['Result', `Diesel ${fmtN(p.val, 0)} kg CO₂e/t`, 'products'], ['Largest contributor', 'Crude supply 131 kg CO₂e/t (35%)', 'model'], ['Inventory record', 'CP-01 crude receipt, Dec 2029: 2.31 Mt', 'inventory'], ['Meter tag', 'FQI-0101 (AVEVA PI), custody transfer', 'integrations'], ['Factor', 'Supplier CI by grade v2029.2 · DQR 2', 'databases'], ['Formula', 'Allocation: unit sub-division v3', 'formulas']].map(([a, b, g], i) => `<button class="trace-step" data-goto="${g}"><span class="eyebrow">${i + 1} · ${a}</span><b>${b}</b></button>`).join('<span class="trace-ar">→</span>')}</div></div>`;
  }],
  ['compare', 'Compare runs', () => `<div class="panel" style="margin-top:14px"><div class="ph"><h3>Compare</h3><div class="flex">${[0, 1].map((i) => `<select data-cmp="${i}">${RUNS2.map((r) => `<option ${state.cmp[i] === r.id ? 'selected' : ''}>${r.id}</option>`).join('')}</select>`).join('<span class="muted">vs</span>')}</div></div><div id="cmpOut"></div></div>`],
];
sec({ id: 'runs', group: 'Footprints', icon: '▶', title: 'Calculation runs', nav: 'Calculation runs',
  sub: 'Each run keeps its input snapshot, dataset editions, method and engine version. Failed runs never produce results; any run can be reproduced and traced back to the meter.',
  actions: ['Run study'], rfp: ['C4a', 'C4c'], req: ['FR-043', 'FR-044', 'FR-045', 'FR-046'],
  render: () => tabbed('runs', RUN_TABS),
  after: () => bindTabs('runs', RUN_TABS, (k) => {
    if (k === 'list') {
      const det = () => {
        const r = RUNS2.find((x) => x.id === state.run);
        $$('#runTbl tr').forEach((t) => t.classList.toggle('is-sel', t.dataset.run === r.id));
        $('#runDet').innerHTML = `<div class="flex between"><span class="tag">${r.id}</span><span class="badge ${RSB[r.status]}">${r.status}</span></div><h3 style="font-size:18px;font-weight:600;margin:6px 0">${r.study} · ${r.scen}</h3>
          ${r.status === 'Failed' ? `<div class="callout warn"><b>No results.</b> ${r.diag}</div>` : `<div class="kpi" style="${r.status === 'Stale' ? 'opacity:.45' : ''}"><b>${fmtN(r.out, 1)} kg CO₂e/t</b><span>${r.status === 'Stale' ? 'Stale: inputs changed after this run' : 'Headline output'}</span></div>`}
          <table class="tbl" style="margin-top:8px"><tbody>${[['Input snapshot', r.hash], ['Datasets', r.db], ['Method', r.method], ['Boundary', r.bound], ['Engine', r.eng], ['Duration', r.dur], ['Warnings', r.warn || 'none']].map(([a, b]) => `<tr><td class="muted">${a}</td><td>${b}</td></tr>`).join('')}</tbody></table>
          <div class="flex" style="margin-top:10px">${r.status !== 'Failed' ? '<button class="pill is-ink" id="repro">Reproduce</button><button class="pill" data-act="Export run with results">Export</button>' : '<button class="pill" data-goto="integrations">Fix mapping →</button>'}</div><div id="reproOut" style="margin-top:8px"></div>`;
        $('#repro')?.addEventListener('click', () => { $('#reproOut').innerHTML = `<div class="callout"><b>Reproduced.</b> Same snapshot ${r.hash}, datasets and engine ${r.eng}: difference 0.0000% (tolerance 0.01%). Export totals reconcile with this run.</div>`; });
        $$('#runDet [data-goto]').forEach((b) => b.addEventListener('click', () => goto(b.dataset.goto)));
        $$('#runDet [data-act]').forEach((b) => b.addEventListener('click', () => toast(`${b.dataset.act}: demo action`)));
      };
      $$('#runTbl tr[data-run]').forEach((t) => t.addEventListener('click', () => { state.run = t.dataset.run; det(); }));
      det();
    }
    if (k === 'compare') {
      const draw = () => {
        const [a, b] = state.cmp.map((id) => RUNS2.find((r) => r.id === id));
        const issues = [];
        if (a.bound !== b.bound) issues.push(`Boundaries differ (${a.bound} vs ${b.bound})`);
        if (a.method !== b.method) issues.push('Impact methods differ');
        if (a.db !== b.db) issues.push(`Dataset editions differ (${a.db} vs ${b.db})`);
        if (a.status === 'Failed' || b.status === 'Failed') issues.push('A failed run has no results to compare');
        const ok = a.out != null && b.out != null;
        const d = ok ? b.out - a.out : null;
        $('#cmpOut').innerHTML = `${issues.length ? `<div class="callout warn" style="margin-bottom:10px"><b>Check before concluding:</b> ${issues.join('; ')}.</div>` : ''}
          <div class="grid g4">${kpi(a.out != null ? fmtN(a.out, 1) : '—', `${a.id} · ${a.study}`)}${kpi(b.out != null ? fmtN(b.out, 1) : '—', `${b.id} · ${b.study}`)}${kpi(ok ? (d > 0 ? '+' : '') + fmtN(d, 1) : '—', 'Absolute difference, kg CO₂e/t')}${kpi(ok ? (a.out === 0 ? 'n/a (zero baseline)' : sgn(b.out / a.out - 1)) : '—', 'Change')}</div>`;
      };
      $$('[data-cmp]').forEach((s) => s.addEventListener('change', () => { state.cmp[+s.dataset.cmp] = s.value; draw(); }));
      draw();
    }
  }),
});

/* =====================================================================
   Requirements & acceptance (baseline v0.1)
   ===================================================================== */
state.reqF = 'All'; state.reqG = 'All';
const REQ_TABS = [
  ['cov', 'Requirements', () => {
    const groups = ['FR', 'INT', 'NFR', 'SVC'];
    const bar = (g) => { const rs = REQS.filter((r) => r[0].startsWith(g + '-')); const c = (k) => rs.filter((r) => r[3] === k).length; return `<div class="panel tight"><div class="flex between"><span class="eyebrow">${g}</span><b>${c('shown')}/${rs.length}</b></div><div class="hbar-track" style="height:8px;margin-top:8px"><i style="width:${(c('shown') / rs.length) * 100}%;background:var(--up)"></i><i style="width:${(c('part') / rs.length) * 100}%;background:var(--warn)"></i><i style="width:${(c('none') / rs.length) * 100}%;background:var(--down)"></i></div><span class="note">${c('shown')} shown · ${c('part')} partly · ${c('none')} not in demo</span></div>`; };
    return `<div class="grid g4" style="margin-top:14px">${groups.map(bar).join('')}</div>
      <div class="panel" style="margin-top:16px"><div class="ph"><div class="filter-row" id="rqG">${['All', 'FR', 'INT', 'NFR', 'SVC'].map((k) => `<button class="pill" data-g="${k}">${k}</button>`).join('')}</div><div class="filter-row" id="rqF">${[['All', 'All'], ['shown', 'Shown'], ['part', 'Partly'], ['none', 'Not in demo'], ['opt', 'Optional']].map(([k, l]) => `<button class="pill" data-f="${k}">${l}</button>`).join('')}</div></div>
      <div class="scroll-x"><table class="tbl" id="rqTbl"></table></div></div>`;
  }],
  ['at', 'Acceptance tests', () => `<div class="panel" style="margin-top:14px"><div class="ph"><h3>Acceptance criteria (Section 11)</h3><span class="note">Demo path shows the behaviour; passing needs agreed data, tolerances and owners (OD-14)</span></div><div class="scroll-x"><table class="tbl"><thead><tr><th>ID</th><th>Covers</th><th>Criterion</th><th>Demo path</th><th>Status</th></tr></thead><tbody>
    ${ATS.map(([id, cov, c, s]) => `<tr><td><b style="font-weight:700">${id}</b></td><td class="muted">${cov}</td><td>${c}</td><td><button class="tag" data-goto="${s}" style="cursor:pointer;border:0">${esc(SECTIONS.find((x) => x.id === s)?.nav || s)} →</button></td><td><span class="badge ${['AT-13', 'AT-14'].includes(id) ? 'warn' : 'ok'}">${id === 'AT-13' ? 'Targets proposed' : id === 'AT-14' ? 'Terms proposed' : 'Demoable'}</span></td></tr>`).join('')}
  </tbody></table></div></div>`],
  ['od', 'Open decisions', () => `<div class="panel" style="margin-top:14px"><div class="ph"><h3>Decisions needed before baselining (Section 13)</h3><span class="badge warn">${ODS.length} open</span></div><div class="list">${ODS.map(([id, t]) => li('warn', `${id} · ${t}`, '')).join('')}</div>
    <div class="callout" style="margin-top:12px"><b>Clarification to send:</b> Please provide the Scope of Services referenced in Appendix 1, including software modules, licence quantities and type, required databases, assessment methods, target products and boundaries, deployment requirements, integrations, training, and three-year support deliverables.</div></div>`],
  ['tc', 'Tender categories', () => `<div class="panel" style="margin-top:14px"><div class="ph"><h3>Confirmed tender categories (Appendix 1)</h3><span class="note">Category only: detailed obligations are in the missing Annexure 4</span></div><div class="scroll-x"><table class="tbl"><thead><tr><th>ID</th><th>Category</th><th>Where to see it</th></tr></thead><tbody>
    ${TCS.map(([id, t, s]) => `<tr><td><b style="font-weight:700">${id}</b></td><td>${t}</td><td><button class="tag" data-goto="${s}" style="cursor:pointer;border:0">${esc(SECTIONS.find((x) => x.id === s)?.nav || s)} →</button></td></tr>`).join('')}
  </tbody></table></div><p class="note" style="margin-top:8px">Supplier references, the 70% cut-off, bid submission, pricing, ICV and contractual declarations are procurement matters, not application features.</p></div>`],
];
sec({ id: 'requirements', group: 'Administration', icon: '☑', title: 'Requirements & acceptance', nav: 'Requirements',
  sub: 'Requirements baseline v0.1 (draft, 30 Oct 2026) traced to the screens of this demo. Proposed core and optional items are proposals, not confirmed tender obligations.',
  actions: ['Export traceability'], req: ['SVC-06'],
  render: () => tabbed('req', REQ_TABS),
  after: () => bindTabs('req', REQ_TABS, (k) => {
    if (k !== 'cov') return;
    const draw = () => {
      $$('#rqG .pill').forEach((b) => b.classList.toggle('is-ink', b.dataset.g === state.reqG));
      $$('#rqF .pill').forEach((b) => b.classList.toggle('is-ink', b.dataset.f === state.reqF));
      const rows = REQS.filter((r) => (state.reqG === 'All' || r[0].startsWith(state.reqG + '-')) && (state.reqF === 'All' || (state.reqF === 'opt' ? OPT.has(r[0]) : r[3] === state.reqF)));
      $('#rqTbl').innerHTML = `<thead><tr><th>ID</th><th>Requirement</th><th>Label</th><th>Where</th><th>In this demo</th></tr></thead><tbody>${rows.map(([id, t, s, c]) => { const [lc, ll] = reqLabel(id); return `<tr id="rq-${id}"><td><b style="font-weight:700">${id}</b></td><td>${esc(t)}</td><td><span class="badge ${lc}">${ll}</span></td><td><button class="tag" data-goto="${s}" style="cursor:pointer;border:0">${esc(SECTIONS.find((x) => x.id === s)?.nav || s)} →</button></td><td><span class="badge ${COV[c][0]}">${COV[c][1]}</span></td></tr>`; }).join('')}</tbody>`;
      $$('#rqTbl [data-goto]').forEach((b) => b.addEventListener('click', () => goto(b.dataset.goto)));
      if (state.reqHi) { const tr = $('#rq-' + state.reqHi); if (tr) { tr.classList.add('is-sel'); tr.scrollIntoView({ block: 'center' }); } state.reqHi = null; }
    };
    $$('#rqG .pill').forEach((b) => b.addEventListener('click', () => { state.reqG = b.dataset.g; draw(); }));
    $$('#rqF .pill').forEach((b) => b.addEventListener('click', () => { state.reqF = b.dataset.f; draw(); }));
    draw();
  }),
});


/* =====================================================================
   Product value chain: carbon from crude well to customer
   ===================================================================== */
state.vcBound = 'cust'; state.vcStage = null; state.traceCps = null;
const PIPE_PROD = { 'P-06': 'dsl', 'P-07': 'dsl', 'P-08': 'gas' };
const chainPipes = (k) => ['P-01', 'P-02', 'P-05', 'P-06', ...(['dsl', 'jet'].includes(k) ? ['P-03', 'P-04', 'P-07'] : []), ...(['gas', 'lpg', 'nap'].includes(k) ? ['P-08'] : []), ...(k === 'sul' ? ['P-09'] : [])];
function valueChain(i, y) {
  const p = pcf({ year: y, alloc: 'subdiv' }).rows[i];
  const inc = BOUNDS.c2g.inc;
  const catT = {}; LIVE.filter(inc).forEach((c) => { catT[c.cat] = (catT[c.cat] || 0) + yearTotal(c, y); });
  const con = {}; LIVE.filter(inc).forEach((c) => { con[c.id] = p.val * p.mix[c.cat] * (yearTotal(c, y) / catT[c.cat]); });
  const S = (ids, f = 1) => sum(ids.map((id) => con[id] || 0)) * f;
  const dist = (yearTotal(CPI['15'], y) + yearTotal(CPI['16'], y)) / sum(PRODUCTS.map((q) => q.kt));
  const st = [
    ['ext', 'Crude extraction', 'Upstream fields', ['01'], S(['01'], 0.88), 'up', 'databases'],
    ['ctr', 'Crude transport', 'Pipeline & tanker to site', ['01'], S(['01'], 0.12), 'up', 'site'],
    ['inp', 'Purchased inputs', 'Chemicals, catalysts', ['17'], S(['17']), 'up', 'site'],
    ['stor', 'Crude tankage', 'Receipt & storage', ['02'], S(['02']), 'flare', 'site'],
    ['dist', 'Distillation', 'CDU / VDU', ['03'], S(['03']), 'fire', 'site'],
    ['conv', 'Conversion', 'Hydrocracker, FCC, reformer', ['04', '05', '06'], S(['04', '05', '06']), 'proc', 'model'],
    ['h2', 'Hydrogen', 'SMR', ['07'], S(['07']), 'proc', 'site'],
    ['util', 'Steam & power', 'Cogeneration, grid, cooling', ['09', '10', '12'], S(['09', '10', '12']), 'elec', 'site'],
    ['env', 'Sulphur, flare, effluent', 'SRU, flare, wastewater', ['08', '11', '13'], S(['08', '11', '13']), 'flare', 'site'],
    ['blend', 'Blending & tanks', 'Product storage', ['14', '18'], S(['14']), 'flare', 'site'],
    ['gate', 'Refinery gate', 'Cradle-to-gate footprint', [], 0, null, 'products'],
    ['distr', 'Distribution', 'Jetty & trucks to customer', ['15', '16'], p.k === 'sul' ? dist * 0.6 : dist, 'down', 'site'],
    ['cust', 'At customer', 'Cradle-to-customer', [], 0, null, 'products'],
    ['use', 'Use (combustion)', p.use ? 'Burned by the customer' : 'Not a fuel', [], p.use, 'up', 'formulas'],
    ['grave', 'End of life', 'Cradle-to-grave', [], 0, null, 'products'],
  ];
  return { p, st };
}
const VCB = { gate: ['gate', 'Cradle-to-gate'], cust: ['cust', 'Cradle-to-customer'], grave: ['grave', 'Cradle-to-grave'] };
function vcHTML() {
  return `<div class="panel" id="vchain"><div class="ph"><h3>Value chain trace</h3><div class="seg" id="vcBound">${Object.entries(VCB).map(([k, [, l]]) => `<button data-b="${k}">${l}</button>`).join('')}</div></div>
    <div class="vc-flow" id="vcFlow"></div>
    <div class="flex between" style="margin-top:14px"><span class="eyebrow" id="vcVizT"></span><div class="seg" id="vcView"><button data-v="build">Build-up</button><button data-v="sankey">Sankey</button><button data-v="tree">Contribution tree</button></div></div>
    <div class="grid g2 vc-grid" id="vcGrid" style="margin-top:8px;align-items:start"><div id="vcWf"></div><div id="vcSel"></div></div>
    <div class="eyebrow" style="margin:14px 0 6px">Where it happens on site · units and pipelines in this chain</div><div style="position:relative">${mapHTML('prodMap')}</div></div>`;
}
function drawVC() {
  const i = PRODUCTS.findIndex((q) => q.k === state.prod), y = state.year;
  const { p, st } = valueChain(i, y);
  const endIdx = st.findIndex((s) => s[0] === state.vcBound);
  let cum = 0;
  const rows = st.map((s, k) => { const inB = k <= endIdx; if (s[6] !== undefined && s[3].length + s[4] > 0 && inB) cum += s[4]; return { s, k, inB, cum }; });
  const total = rows[endIdx].cum;
  $$('#vcBound button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.b === state.vcBound)));
  $('#vcFlow').innerHTML = rows.map(({ s, k, inB, cum: c }) => {
    const [key, name, sub, cps, v, cat] = s;
    if (!cat) return `<div class="vc-mark${inB ? '' : ' out'}"><span class="eyebrow">${name}</span><b>${fmtN(c, 0)}</b><span class="note">${sub}</span></div>`;
    return `<button class="vc-node${inB ? '' : ' out'}${state.vcStage === key ? ' sel' : ''}" data-st="${key}"><span class="vc-n">${k + 1}</span><b>${name}</b><span class="note">${sub}</span><span class="vc-v" style="--c:${CATS[cat].color}">+${fmtN(v, v < 10 ? 1 : 0)}</span><span class="vc-bar"><i style="width:${Math.max(3, (v / Math.max(...st.map((x) => x[4]).filter((x, j) => j <= endIdx))) * 100)}%;background:${CATS[cat].color}"></i></span></button>`;
  }).join('<span class="vc-ar">→</span>');
  // cumulative waterfall
  const vis = rows.filter((r) => r.inB);
  const W = 560, H = 190, bw = W / vis.length, mxv = total * 1.08 || 1, yv = (v) => 12 + (H - 40) * (1 - v / mxv);
  let svg = '', prev = 0;
  vis.forEach(({ s, cum: c }, j) => {
    const [key, name, , , v, cat] = s, x = j * bw + bw * 0.16, w = bw * 0.68;
    if (!cat) svg += `<rect x="${x}" y="${yv(c)}" width="${w}" height="${yv(0) - yv(c)}" rx="2" fill="var(--ink)"/>`;
    else { svg += `<rect x="${x}" y="${yv(prev + v)}" width="${w}" height="${Math.max(1, yv(prev) - yv(prev + v))}" rx="2" fill="${CATS[cat].color}" opacity="${state.vcStage && state.vcStage !== key ? .35 : 1}" data-st="${key}" style="cursor:pointer"/>`; prev += v; }
    svg += `<text x="${x + w / 2}" y="${H - 14}" font-size="8.5" fill="var(--muted)" text-anchor="middle">${!cat ? name.split(' ').pop() : j + 1}</text>`;
  });
  $('#vcWf').innerHTML = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block" role="img" aria-label="Cumulative carbon along the value chain">${svg}<line x1="0" x2="${W}" y1="${yv(0)}" y2="${yv(0)}" stroke="var(--line2)"/></svg>`;
  const sel = st.find((s) => s[0] === state.vcStage);
  $('#vcSel').innerHTML = sel ? `<div class="callout"><b>${sel[1]}</b> adds ${fmtN(sel[4], 1)} kg CO₂e/t to ${p.name} (${pct(sel[4] / total, 1)} of ${VCB[state.vcBound][1].toLowerCase()}). ${sel[3].length ? `Collection points: ${sel[3].map((c) => `<button class="tag" data-cpgo="${c}" style="cursor:pointer;border:0">CP-${c}</button>`).join(' ')}` : ''} <button class="tag" data-goto="${sel[6]}" style="cursor:pointer;border:0">Open ${esc(SECTIONS.find((x) => x.id === sel[6])?.nav || '')} →</button></div>`
    : `<div class="kpi"><b>${fmtN(total, 0)} kg CO₂e/t</b><span>${p.name} · ${VCB[state.vcBound][1].toLowerCase()} · ${Y0 + y - 1}</span></div>
      <div style="margin-top:8px">${st.filter((s, k) => k <= endIdx && s[5]).sort((a2, b2) => b2[4] - a2[4]).slice(0, 5).map((s) => `<div class="hbar" style="cursor:pointer" data-st="${s[0]}"><span>${s[1]}</span><div class="hbar-track"><i style="width:${(s[4] / total) * 100}%;background:${CATS[s[5]].color}"></i></div><b style="text-align:right;font-weight:600">${pct(s[4] / total, 0)}</b></div>`).join('')}</div>
      <p class="note" style="margin-top:6px">Largest stages. Click a stage to light up its units and pipes on the map.</p>`;
  state.traceCps = new Set(sel ? sel[3] : st.filter((s, k) => k <= endIdx).flatMap((s) => s[3]));
  state.tracePipes = new Set(sel ? (sel[0] === 'distr' ? ['P-07', 'P-08'] : sel[0] === 'ext' || sel[0] === 'ctr' ? ['P-01', 'P-02'] : []) : chainPipes(p.k));
  drawVcAlt(p, st, endIdx, total);
  $$('#vcFlow [data-st], #vcWf [data-st], #vcSel [data-st]').forEach((n) => n.addEventListener('click', () => { state.vcStage = state.vcStage === n.dataset.st ? null : n.dataset.st; drawVC(); }));
  $$('#vcSel [data-cpgo]').forEach((b) => b.addEventListener('click', () => { state.cp = b.dataset.cpgo; goto('site'); }));
  $$('#vcSel [data-goto]').forEach((b) => b.addEventListener('click', () => goto(b.dataset.goto)));
  drawPins();
}


/* =====================================================================
   Operations: performance, capacity, backup, documentation, privacy, change
   ===================================================================== */
const PERF = [
  ['Open a study (42 processes)', '< 2 s', '1.1 s', 'ok'], ['Load dashboard', '< 3 s', '1.8 s', 'ok'], ['Import 10,000 rows with validation', '< 30 s', '19 s', 'ok'],
  ['Monthly ingest (2,940 tags, 1-min)', '< 10 min', '6 min 40 s', 'ok'], ['Full recalculation, 7 products', '< 5 min', '3 min 51 s', 'ok'], ['Monte Carlo, 10,000 runs', '< 3 min', '1 min 30 s', 'ok'],
  ['Generate PCF report (PDF)', '< 60 s', '22 s', 'ok'], ['Lineage trace, result → meter', '< 2 s', '0.6 s', 'ok'], ['Database update impact preview', '< 15 min', '17 min', 'warn'],
];
const CAPY = [['Named users', 58, 75, 'seats'], ['Concurrent users (peak)', 31, 250, 'tested'], ['Plant tags mapped', 2940, 12000, 'tested'], ['Studies', 136, 2000, 'tested'], ['Processes per model', 42, 500, 'tested'], ['Retained versions', 412, 10000, 'tested'], ['Storage', 412, 2000, 'GB']];
const DOCS = [
  ['User guide', 'Analysts, owners, viewers', '5.2', '2 weeks ago', 'PDF · in-app'], ['Administrator guide', 'Admins', '5.2', '2 weeks ago', 'PDF'], ['Methodology & configuration guide', 'LCA analysts, reviewers', '3.1', '1 month ago', 'PDF · Word'],
  ['Carbon formula handbook', 'Analysts, auditors', '3.0', '1 month ago', 'PDF · in-app'], ['Data dictionary', 'Data owners, IT', '2.4', '3 weeks ago', 'Excel'], ['Integration specifications', 'IT', '2.2', '2 months ago', 'PDF · OpenAPI'],
  ['API reference', 'IT', 'v1', '1 week ago', 'OpenAPI 3'], ['Backup & disaster recovery runbook', 'IT, vendor ops', '1.6', '1 month ago', 'PDF'], ['Security whitepaper', 'IT security', '2.0', '4 months ago', 'PDF'],
  ['Release notes', 'All', '5.2', '1 week ago', 'In-app · PDF'], ['Training materials', 'All roles', '2029.2', '2 months ago', 'Video · slides'], ['Exit & data export guide', 'IT, procurement', '1.0', '6 months ago', 'PDF'],
];
const BACKUPS = [['Today 10:45', 'Transaction log', 'UAE region A', '0.3 GB', 'ok'], ['Today 02:00', 'Full (database + files)', 'UAE region A', '412 GB', 'ok'], ['Sun 03:00', 'Weekly copy', 'UAE region B', '412 GB', 'ok'], ['1 Dec', 'Monthly archive', 'UAE region B (immutable)', '398 GB', 'ok']];
const DRILLS = [['Q4 2029', 'Full restore to sandbox', '2 h 41 min', '9 min', 'RUN-0412 reproduced exactly', 'ok'], ['Q3 2029', 'Single study (ST-0119 v7)', '14 min', '4 min', 'Checksums matched', 'ok'], ['Q2 2029', 'Full restore, region B', '3 h 52 min', '12 min', 'RUN-0388 reproduced', 'ok'], ['Q1 2029', 'Files only (evidence)', '38 min', '0 min', '2 missing thumbnails regenerated', 'warn']];
const PRIV = [['Name, work email', 'Sign-in, audit trail, approvals', 'Admins, auditors', 'Account life + 1 year', 'Anonymised in audit after retention'], ['Role & unit scope', 'Access control', 'Admins', 'Account life', 'Deleted with account'], ['Sign-in times, IP', 'Security monitoring', 'Admins, SIEM', '1 year', 'Rolling deletion'], ['Comments on studies', 'Review workflow', 'Study members', 'Study retention (10 years)', 'Kept with study version'], ['Telematics vehicle IDs', 'Transport emissions', 'Analysts', '3 years', 'No driver data stored']];
const OPS_TABS = [
  ['perf', 'Performance & capacity', () => `<div class="callout warn" style="margin-top:14px">Targets are <b>proposed</b> on a representative workload (open decision OD-11). Measured values are p95 from the vendor lab and this workspace.</div>
    <div class="grid g-side" style="margin-top:14px"><div class="panel"><div class="ph"><h3>Response-time targets</h3><span class="note">p95, last 30 days</span></div><div class="scroll-x"><table class="tbl"><thead><tr><th>Operation</th><th class="num">Target</th><th class="num">Measured</th><th>Status</th></tr></thead><tbody>
      ${PERF.map(([o, t, m, k]) => `<tr><td>${o}</td><td class="num">${t}</td><td class="num"><b style="font-weight:600">${m}</b></td><td><span class="badge ${k}">${k === 'ok' ? 'Met' : 'Missed · fix in v5.3'}</span></td></tr>`).join('')}
    </tbody></table></div>
    <div class="eyebrow" style="margin:14px 0 6px">Full recalculation time by release</div><div id="perfTrend"></div></div>
    <div class="panel"><div class="ph"><h3>Capacity in use</h3></div>${CAPY.map(([n, u, c, l]) => `<div style="padding:7px 0;border-top:1px solid var(--line)"><div class="flex between"><span>${n}</span><b>${fmtN(u)} <span class="muted" style="font-weight:500">/ ${fmtN(c)} ${l}</span></b></div><div class="bar-track thin" style="margin-top:5px"><i style="width:${Math.max(1, (u / c) * 100)}%"></i></div></div>`).join('')}</div></div>`],
  ['backup', 'Backup & recovery', () => `<div class="grid g4" style="margin-top:14px"><div class="panel tight">${kpi('15 min', 'Recovery point objective (proposed)')}</div><div class="panel tight">${kpi('4 h', 'Recovery time objective (proposed)')}</div><div class="panel tight">${kpi('2 regions', 'Copies inside the UAE')}</div><div class="panel tight">${kpi('Quarterly', 'Restore drills, verified')}</div></div>
    <div class="grid g2" style="margin-top:16px"><div class="panel"><div class="ph"><h3>Recent backups</h3><span class="badge ok">All healthy</span></div><table class="tbl"><thead><tr><th>When</th><th>Type</th><th>Location</th><th class="num">Size</th></tr></thead><tbody>${BACKUPS.map((b) => `<tr><td class="muted">${b[0]}</td><td>${b[1]}</td><td>${b[2]}</td><td class="num">${b[3]}</td></tr>`).join('')}</tbody></table>
      <div class="eyebrow" style="margin:14px 0 6px">Schedule & retention</div><div class="list">${li('ok', 'Transaction logs every 15 minutes', 'Kept 35 days')}${li('ok', 'Full backup nightly', 'Kept 35 days')}${li('ok', 'Weekly copy to second UAE region', 'Kept 13 weeks')}${li('ok', 'Monthly immutable archive', 'Kept 7 years; frozen inventories kept 10 years')}</div></div>
    <div class="panel"><div class="ph"><h3>Restore drills</h3><button class="pill is-ink" id="drillBtn">Run restore test (sandbox)</button></div><div id="drillOut"></div>
      <div class="scroll-x"><table class="tbl"><thead><tr><th>Quarter</th><th>Scope</th><th class="num">Restore time</th><th class="num">Data lost</th><th>Verification</th></tr></thead><tbody>${DRILLS.map((d) => `<tr><td><b style="font-weight:600">${d[0]}</b></td><td>${d[1]}</td><td class="num">${d[2]}</td><td class="num">${d[3]}</td><td><span class="badge ${d[5]}" style="white-space:normal">${d[4]}</span></td></tr>`).join('')}</tbody></table></div>
      <p class="note" style="margin-top:8px">A restore passes only when a reference run reproduces within tolerance. Failed runs or partial writes never overwrite committed work (NFR-10). For on-premises deployment the company runs backups using the runbook; the vendor verifies the drills.</p></div></div>`],
  ['docs', 'Documentation', () => `<div class="panel" style="margin-top:14px"><div class="ph"><h3>Document library</h3><div class="search" style="max-width:240px"><span>⌕</span><input id="docQ" placeholder="Filter documents"></div></div><div class="scroll-x"><table class="tbl" id="docTbl"></table></div></div>
    <div class="grid g2" style="margin-top:16px"><div class="panel"><div class="ph"><h3>Maintainability</h3></div><div class="list">
      ${li('ok', 'Configuration as versioned data', 'Templates, formulas, mappings and roles are exported and diffed like code.')}
      ${li('ok', 'Supported extension points', 'Formula editor, template library, API and webhooks only; no custom code in the core.')}
      ${li('ok', 'Software bill of materials', 'Third-party components and licences listed per release.')}
      ${li('ok', 'Responsibilities', 'Vendor: platform, updates, database feeds. Company: data ownership, mappings, approvals.')}</div></div>
    <div class="panel"><div class="ph"><h3>Contextual help</h3></div><div class="list">${li('ok', 'In-app guides on every screen', 'The ▶ Tour button runs the product walkthrough.')}${li('ok', 'Field-level help', 'Every input explains its unit, source and validation rule.')}${li('ok', 'Searchable help centre', 'Linked from error messages to the fix.')}</div></div></div>`],
  ['change', 'Change management', () => `<div class="grid g2" style="margin-top:14px"><div class="panel"><div class="ph"><h3>How an update reaches production</h3></div><div class="close-steps">${['Release notes published (10 days before)', 'Sandbox upgraded for your testing', 'Regression suite: 24 reference studies recalculated', 'Calculation-affecting changes listed, with size of change', 'Approver accepts or defers', 'Production upgrade in maintenance window', 'Rollback point kept for 30 days'].map((n, i) => `<div class="close-step"><span class="check ok">${i + 1}</span><span>${n}</span><span></span></div>`).join('')}</div></div>
    <div class="panel"><div class="ph"><h3>Last release: v5.2</h3><span class="badge ok">No calculation change</span></div><table class="tbl"><tbody><tr><td class="muted">Reference studies recalculated</td><td class="num">24</td></tr><tr><td class="muted">Largest difference</td><td class="num">0.000%</td></tr><tr><td class="muted">Maintenance window</td><td class="num">Fri 02:00–04:00 GST</td></tr><tr><td class="muted">Rollback point</td><td class="num">until 9 Jan 2030</td></tr></tbody></table>
      <p class="note" style="margin-top:8px">If a release changes results (for example a new GWP set), published footprints keep their old version; restating them is a new study version.</p></div></div>`],
  ['privacy', 'Personal data', () => `<div class="panel" style="margin-top:14px"><div class="ph"><h3>What personal data the system holds</h3><span class="note">LCA data is operational; personal data is limited to users and reviewers</span></div><div class="scroll-x"><table class="tbl"><thead><tr><th>Data</th><th>Purpose</th><th>Who can see it</th><th>Retention</th><th>Deletion</th></tr></thead><tbody>
    ${PRIV.map((r) => `<tr>${r.map((c, i) => `<td${i ? ' class="muted"' : ' style="font-weight:600"'}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`],
];
sec({ id: 'operations', group: 'Administration', icon: '⚙', title: 'Operations', nav: 'Operations',
  sub: 'How the service is run: response times and capacity, backup and recovery, documentation, change management and personal data.',
  actions: ['Download runbook'], rfp: ['C3b', 'C3e'],
  render: () => tabbed('ops', OPS_TABS),
  after: () => bindTabs('ops', OPS_TABS, (k) => {
    if (k === 'perf') {
      const v = [[4.1, '4.1'], [5.2, '4.4'], [4.6, '4.8'], [4.2, '5.0'], [3.85, '5.2']], W = 420, H = 110, mx = 6;
      $('#perfTrend').innerHTML = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:520px;display:block"><line x1="0" x2="${W}" y1="${H - 20 - (5 / mx) * (H - 30)}" y2="${H - 20 - (5 / mx) * (H - 30)}" stroke="var(--down)" stroke-dasharray="4 3"/><text x="${W}" y="${H - 24 - (5 / mx) * (H - 30)}" font-size="9" fill="var(--down)" text-anchor="end">target 5 min</text>${v.map(([m, r], i) => { const x = 20 + i * 90, h = (m / mx) * (H - 30); return `<rect x="${x}" y="${H - 20 - h}" width="40" height="${h}" rx="3" fill="${m > 5 ? 'var(--down)' : 'var(--barsel)'}"/><text x="${x + 20}" y="${H - 6}" font-size="9" fill="var(--muted)" text-anchor="middle">v${r}</text><text x="${x + 20}" y="${H - 24 - h}" font-size="9" fill="var(--ink)" text-anchor="middle">${m} m</text>`; }).join('')}</svg>`;
    }
    if (k === 'backup') $('#drillBtn').addEventListener('click', () => {
      const steps = ['Snapshot selected (today 02:00 + logs to 10:45)', 'Restored to isolated sandbox', 'Integrity checksums verified', 'Reference run RUN-0412 reproduced: 0.0000% difference', 'Sandbox destroyed; result logged to audit'];
      let n = 0; $('#drillBtn').disabled = true;
      const t = setInterval(() => { n++; $('#drillOut') && ($('#drillOut').innerHTML = `<div class="close-steps" style="margin-bottom:10px">${steps.map((s, i) => `<div class="close-step"><span class="check ${i < n ? 'ok' : i === n ? 'warn' : 'mute'}">${i < n ? '✓' : i === n ? '…' : '–'}</span><span>${s}</span><span></span></div>`).join('')}</div>`); if (n >= steps.length || !$('#drillOut')) { clearInterval(t); if ($('#drillBtn')) $('#drillBtn').disabled = false; } }, 600);
    });
    if (k === 'docs') { const draw = () => { const q = ($('#docQ').value || '').toLowerCase(); $('#docTbl').innerHTML = `<thead><tr><th>Document</th><th>Audience</th><th class="num">Version</th><th>Updated</th><th>Format</th><th></th></tr></thead><tbody>${DOCS.filter((d) => d.join(' ').toLowerCase().includes(q)).map((d) => `<tr><td><b style="font-weight:600">${d[0]}</b></td><td class="muted">${d[1]}</td><td class="num">${d[2]}</td><td class="muted">${d[3]}</td><td>${d[4]}</td><td><button class="tag" data-doc="${esc(d[0])}" style="cursor:pointer;border:0">Open</button></td></tr>`).join('')}</tbody>`; $$('[data-doc]').forEach((b) => b.addEventListener('click', () => toast(`${b.dataset.doc}: demo document`))); }; $('#docQ').addEventListener('input', draw); draw(); }
  }),
});


/* =====================================================================
   Remaining partly-covered requirements
   ===================================================================== */
const runSteps = (el, steps, done) => { let n = 0; const t = setInterval(() => { n++; if (!document.body.contains(el)) { clearInterval(t); return; } el.innerHTML = `<div class="close-steps">${steps.map((s, i) => `<div class="close-step"><span class="check ${i < n ? 'ok' : i === n ? 'warn' : 'mute'}">${i < n ? '✓' : i === n ? '…' : '–'}</span><span>${s}</span><span></span></div>`).join('')}</div>${n >= steps.length && done ? done : ''}`; if (n >= steps.length) clearInterval(t); }, 550); };

/* ---- Databases: dataset library, licences, update impact (FR-030–038, SVC-02) ---- */
const DATASETS = [
  ['DS-0101', 'Crude oil, at production', 'ecoinvent 3.10', 'Middle East', '2021', 'kg', 'Conventional onshore', 2, 'Licensed', '', 'Average Middle East crude production incl. flaring and venting.', 'Replaced by supplier-specific CI where available.'],
  ['DS-0102', 'Crude oil, supplier CI by grade', 'Supplier-specific', 'UAE', '2029', 'kg', 'By grade (6)', 2, 'Company', '', 'Supplier-declared carbon intensity per crude grade.', '2 of 6 grades self-declared, not verified.'],
  ['DS-0103', 'Natural gas, high pressure', 'ecoinvent 3.10', 'Middle East', '2021', 'm³', 'Pipeline supply', 2, 'Licensed', 'proxy', 'Gas supply incl. processing and transmission.', 'Regional proxy for UAE supply.'],
  ['DS-0104', 'Electricity, grid mix', 'National factor', 'UAE', '2029', 'kWh', 'Grid incl. nuclear, solar', 1, 'Public', '', 'Annual location-based grid factor.', 'Updated annually; market-based uses residual mix.'],
  ['DS-0105', 'Transport, tanker, crude & products', 'GLEC v3', 'Global', '2023', 't-km', 'Aframax / LR2', 2, 'Public', '', 'Well-to-wake tanker factors.', 'Vessel-specific data preferred where available.'],
  ['DS-0106', 'Transport, road tanker', 'GLEC v3', 'Global', '2023', 't-km', 'Diesel truck 40 t', 2, 'Public', '', 'Well-to-wheel road freight factor.', 'Telematics fuel data used when available.'],
  ['DS-0107', 'Hydrogen, SMR', 'ecoinvent 3.10', 'Global', '2020', 'kg', 'Steam methane reforming', 3, 'Licensed', 'proxy', 'Background SMR hydrogen.', 'Only used for scenarios; site SMR is measured.'],
  ['DS-0108', 'Monoethanolamine (MEA)', 'ecoinvent 3.10', 'Global', '2018', 'kg', 'Chemical production', 3, 'Licensed', 'outdated', 'Amine for gas treating.', 'Older than 5 years; supplier EPD requested.'],
  ['DS-0109', 'Sodium hydroxide, 50%', 'Supplier EPD', 'Europe', '2027', 'kg', 'Membrane cell', 2, 'Company', 'proxy', 'Supplier EPD for caustic.', 'European production; shipped to UAE.'],
  ['DS-0110', 'Hydroprocessing catalyst', 'ecoinvent 3.10', 'Global', '2016', 'kg', 'NiMo / CoMo', 4, 'Licensed', 'outdated', 'Proxy catalyst production.', 'Low quality; small share of footprint (<0.5%).'],
  ['DS-0111', 'Wastewater treatment, industrial', 'IPCC 2019', 'Global', '2019', 'kg COD', 'Aerobic', 2, 'Public', '', 'CH₄ and N₂O emission factors.', '—'],
  ['DS-0112', 'Diesel, combustion', 'IPCC 2006', 'Global', '2006', 'kg', 'Combustion', 1, 'Public', '', 'Use-phase combustion factor.', 'Cradle-to-grave studies only.'],
];
state.ds = 'DS-0108'; state.dsF = { src: 'All', geo: 'All', q: '' };
const LICS = [['ecoinvent', '3.10 (3.11 pending)', '75 seats, 1 site', 'Internal LCA; publish aggregated results', 'No raw dataset export or redistribution', 'Annual, within the 3-year term'], ['GLEC factors', 'v3', 'Unlimited', 'Any', 'None (public)', 'Free updates'], ['UAE grid factor', '2029', 'Unlimited', 'Any', 'None (public)', 'Annual'], ['Supplier EPDs (38)', 'Per supplier', 'Workspace', 'Internal LCA; customer PCFs', 'Supplier consent needed to share values', 'Per EPD validity']];
const UPD = [['ST-0118 Diesel', '376.2', '375.1', 'ok'], ['ST-0119 Gasoline', '425.4', '424.0', 'ok'], ['ST-0121 Jet', '352.9', '351.8', 'ok'], ['ST-0103 Baseline 2027', '397.6', '396.0', 'ok'], ['ST-0124 Hydrogen', '9.41 kg/kg', '9.28 kg/kg', 'warn']];
(() => {
  const s = SECTIONS.find((x) => x.id === 'databases');
  const cov = s.render;
  const TABS = [
    ['cov', 'Coverage', () => `<div style="margin-top:14px" class="stack">${cov()}</div>`],
    ['lib', 'Dataset library', () => `<div class="grid g-side" style="margin-top:14px"><div class="panel"><div class="flex" style="margin-bottom:10px"><div class="search" style="max-width:220px"><span>⌕</span><input id="dsQ" placeholder="Search datasets" value="${esc(state.dsF.q)}"></div>
      <select id="dsSrc" class="sel">${['All', ...new Set(DATASETS.map((d) => d[2]))].map((v) => `<option ${v === state.dsF.src ? 'selected' : ''}>${v}</option>`).join('')}</select><select id="dsGeo" class="sel">${['All', ...new Set(DATASETS.map((d) => d[3]))].map((v) => `<option ${v === state.dsF.geo ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      <div class="scroll-x"><table class="tbl" id="dsTbl"></table></div></div><div class="panel raised" id="dsDet"></div></div>`],
    ['lic', 'Licences & rights', () => `<div class="panel" style="margin-top:14px"><div class="ph"><h3>Database subscriptions, itemised</h3><span class="note">Separate from software licences (SVC-02)</span></div><div class="scroll-x"><table class="tbl"><thead><tr><th>Package</th><th>Edition</th><th>Entitlement</th><th>Permitted use</th><th>Export restriction</th><th>Updates</th></tr></thead><tbody>${LICS.map((r) => `<tr><td><b style="font-weight:600">${r[0]}</b></td>${r.slice(1).map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <div class="callout" style="margin-top:12px"><b>Enforced in the product:</b> raw values from licensed datasets are masked in exports and the API; results and contributions can be shared. Historical runs keep their dataset edition for as long as the licence allows (FR-033, FR-038).</div></div>`],
    ['upd', 'Update impact', () => `<div class="panel" style="margin-top:14px"><div class="ph"><h3>Preview: ecoinvent 3.10 → 3.11</h3><span class="badge warn">Awaiting approver</span></div><p class="note">Studies are recalculated in a sandbox; nothing published changes until each study is adopted as a new version (FR-037).</p>
      <div class="scroll-x"><table class="tbl" style="margin-top:8px"><thead><tr><th>Study</th><th class="num">Now (kg CO₂e/t)</th><th class="num">With 3.11</th><th class="num">Change</th><th>Decision</th></tr></thead><tbody>${UPD.map(([n, a, b, k], i) => { const d = parseFloat(b) / parseFloat(a) - 1; return `<tr><td><b style="font-weight:600">${n}</b></td><td class="num">${a}</td><td class="num">${b}</td><td class="num"><span class="badge ${k}">${sgn(d, 2)}</span></td><td><select data-upd="${i}" class="sel"><option>Pending</option><option>Adopt as new version</option><option>Defer</option></select></td></tr>`; }).join('')}</tbody></table></div></div>`],
  ];
  s.render = () => tabbed('db', TABS);
  s.after = () => bindTabs('db', TABS, (k) => {
    $$('#tb-db [data-upd]').forEach((x) => x.addEventListener('change', () => toast(`${UPD[+x.dataset.upd][0]}: ${x.value}`)));
    if (k !== 'lib') return;
    const draw = () => {
      const f = state.dsF;
      const rows = DATASETS.filter((d) => (f.src === 'All' || d[2] === f.src) && (f.geo === 'All' || d[3] === f.geo) && d.join(' ').toLowerCase().includes(f.q.toLowerCase()));
      $('#dsTbl').innerHTML = `<thead><tr><th>Dataset</th><th>Source</th><th>Geo</th><th>Year</th><th class="num">DQR</th><th>Flag</th></tr></thead><tbody>${rows.map((d) => `<tr class="is-click${d[0] === state.ds ? ' is-sel' : ''}" data-ds="${d[0]}"><td><b style="font-weight:600">${d[1]}</b><div class="note">${d[0]} · per ${d[5]}</div></td><td>${d[2]}</td><td>${d[3]}</td><td>${d[4]}</td><td class="num">${d[7]}</td><td>${d[9] ? `<span class="badge warn">${d[9] === 'outdated' ? 'Outdated' : 'Proxy'}</span>` : ''}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">No datasets match.</td></tr>'}</tbody>`;
      $$('#dsTbl [data-ds]').forEach((r) => r.addEventListener('click', () => { state.ds = r.dataset.ds; draw(); }));
      const d = DATASETS.find((x) => x[0] === state.ds) || DATASETS[0];
      $('#dsDet').innerHTML = `<div class="flex between"><span class="tag">${d[0]}</span><span class="badge ${d[8] === 'Licensed' ? 'mute' : 'ok'}">${d[8]}</span></div><h3 style="font-size:18px;font-weight:600;margin:6px 0">${d[1]}</h3><p class="note">${d[10]}</p>
        <table class="tbl" style="margin-top:8px"><tbody>${[['Source · edition', d[2]], ['Geography', d[3]], ['Reference year', d[4]], ['Unit', d[5]], ['Technology', d[6]], ['Data quality (DQR)', d[7]], ['Limitations', d[11]], ['Used in', `${(d[0].charCodeAt(6) % 5) + 1} studies`]].map(([a, b]) => `<tr><td class="muted">${a}</td><td>${b}</td></tr>`).join('')}</tbody></table>
        ${d[9] ? `<div class="callout warn" style="margin-top:10px">${d[9] === 'outdated' ? 'Older than 5 years for this sector: flagged until replaced or accepted with a note.' : 'Geography does not match the site: flagged as a proxy.'}</div>` : ''}
        <div class="flex" style="margin-top:10px"><button class="pill" data-act="Create local copy of ${d[0]}">Adapt locally</button><button class="pill is-ink" data-act="Use ${d[0]} in study">Use in study</button></div>`;
      $$('#dsDet [data-act]').forEach((b) => b.addEventListener('click', () => toast(`${b.dataset.act}: demo action`)));
    };
    $('#dsQ').addEventListener('input', (e) => { state.dsF.q = e.target.value; draw(); });
    $('#dsSrc').addEventListener('change', (e) => { state.dsF.src = e.target.value; draw(); });
    $('#dsGeo').addEventListener('change', (e) => { state.dsF.geo = e.target.value; draw(); });
    draw();
  });
})();

/* ---- Carbon formulas: accounting rules (FR-042, FR-047), other impacts (FR-048) ---- */
FORM_TABS.push(['rules', 'Accounting rules', () => `<div class="grid g2" style="margin-top:14px">
  <div class="panel"><div class="ph"><h3>Carbon treatment</h3><span class="badge ok">Rule set v2 · approved</span></div><table class="tbl"><thead><tr><th>Topic</th><th>Rule</th><th>Reported as</th></tr></thead><tbody>
    ${[['Biogenic carbon', 'Co-processed bio-feed tracked separately; biogenic CO₂ uptake and release reported, not netted', 'Separate line'], ['CO₂ capture & storage', 'Captured CO₂ deducted only with storage evidence; leakage added back', 'Separate line + net'], ['Removals', 'Not netted into product footprints', 'Separate line'], ['Offsets & credits', 'Never deducted from a product footprint', 'Excluded'], ['Exported power & steam', 'System expansion: avoided grid power shown as a credit, separately', 'Separate line'], ['Negative flows', 'Allowed only for credits above; validation blocks others', 'Blocked']].map((r) => `<tr><td><b style="font-weight:600">${r[0]}</b></td><td>${r[1]}</td><td><span class="tag">${r[2]}</span></td></tr>`).join('')}
  </tbody></table></div>
  <div class="panel"><div class="ph"><h3>Double-counting checks</h3><span class="badge ok">All pass · RUN-0412</span></div><div class="list">
    ${li('ok', 'Steam & power', 'Counted once at Cogeneration (CP-09); consumers carry an allocated share, not their own emissions.')}
    ${li('ok', 'Internal hydrogen', 'SMR emissions allocated to hydrogen users; never also counted in the hydrocracker.')}
    ${li('ok', 'Fuel gas', 'Burned fuel gas counted at the burner; the producing unit carries none.')}
    ${li('ok', 'Grid vs on-site solar', 'Solar output reduces grid import; certificates not claimed twice.')}
    ${li('ok', 'Upstream crude', 'Supplier CI includes transport to the export terminal; site import pipeline added separately.')}
  </div></div></div>`]);
FORM_TABS.push(['impacts', 'Other impacts', () => `<div class="panel" style="margin-top:14px"><div class="ph"><h3>Other impact categories</h3><span class="badge warn">Optional module (FR-048) · OD-03</span></div><p class="note">Carbon is the default. These categories use EF 3.1 and need their own method approval and dataset licences before use.</p>
  <div class="scroll-x"><table class="tbl" style="margin-top:8px"><thead><tr><th>Category</th><th>Indicator</th><th class="num">Diesel, per t (preview)</th><th>Status</th></tr></thead><tbody>
    ${[['Acidification', 'mol H⁺ eq', '1.9'], ['Eutrophication, freshwater', 'kg P eq', '0.004'], ['Photochemical ozone', 'kg NMVOC eq', '1.2'], ['Particulate matter', 'disease incidence', '2.1e-5'], ['Water scarcity', 'm³ world eq', '38'], ['Resource use, fossils', 'MJ', '46,900']].map((r) => `<tr><td><b style="font-weight:600">${r[0]}</b></td><td class="muted">${r[1]}</td><td class="num">${r[2]}</td><td><span class="badge mute">Not enabled</span></td></tr>`).join('')}
  </tbody></table></div></div>`]);

/* ---- Supplier data portal (FR-029, optional) ---- */
const SUPS = [['Crude supplier A', 'Crude CI, grade A & B', 'kg CO₂e/bbl + method', 'Accepted', 'ok', 2], ['Crude supplier B', 'Crude CI, grade C', 'kg CO₂e/bbl + method', 'In review', 'warn', 2], ['Crude supplier C', 'Crude CI, grades D–F', 'kg CO₂e/bbl + method', 'Overdue 6 days', 'bad', null], ['Amine supplier', 'MEA product footprint', 'EPD or PCF', 'Submitted', 'warn', 3], ['Caustic supplier', 'NaOH 50% footprint', 'EPD', 'Accepted', 'ok', 2], ['Catalyst supplier', 'NiMo catalyst footprint', 'PCF', 'Requested', 'mute', null], ['Shipping line', 'Voyage fuel by cargo', 'Fuel t per voyage', 'Accepted', 'ok', 1]];
sec({ id: 'suppliers', group: 'Data', icon: '✉', title: 'Supplier data', nav: 'Supplier data',
  sub: 'Request footprints and activity data from suppliers through managed forms, check them on arrival, and replace generic datasets with supplier-specific ones.',
  actions: ['New request'], rfp: ['C4a'], status: [['mute', 'Optional capability (FR-029)']],
  render: () => `<div class="grid g4">${[kpi(SUPS.length, 'Requests this year'), kpi(SUPS.filter((s) => s[4] === 'ok').length, 'Accepted'), kpi(SUPS.filter((s) => s[4] === 'bad').length, 'Overdue'), kpi('63%', 'Upstream footprint on supplier data')].map((k) => `<div class="panel tight">${k}</div>`).join('')}</div>
    <div class="grid g-side"><div class="panel"><div class="ph"><h3>Requests</h3><span class="note">Reminders at 7 and 2 days before due</span></div><div class="scroll-x"><table class="tbl"><thead><tr><th>Supplier</th><th>Asked for</th><th>Format</th><th class="num">DQR</th><th>Status</th></tr></thead><tbody>
      ${SUPS.map((s) => `<tr><td><b style="font-weight:600">${s[0]}</b></td><td>${s[1]}</td><td class="muted">${s[2]}</td><td class="num">${s[5] ?? '—'}</td><td><span class="badge ${s[4]}">${s[3]}</span></td></tr>`).join('')}</tbody></table></div></div>
    <div class="panel raised"><div class="ph"><h3>What the supplier sees</h3><span class="badge mute">Form preview</span></div>
      ${[['Product / grade', 'Crude grade C'], ['Carbon intensity', '— kg CO₂e/bbl'], ['Boundary', 'Well to export terminal'], ['Method & standard', 'e.g. OPGEE, ISO 14067'], ['Reference period', '2029'], ['Evidence', 'Upload verification statement']].map(([a, b]) => `<div class="field" style="margin-bottom:8px"><label>${a}</label><input value="" placeholder="${b}" disabled></div>`).join('')}
      <p class="note">Submissions are checked for units, boundary and period before an analyst reviews them. Accepted values become a supplier dataset with its own DQR.</p></div></div>`,
});

/* ---- Data connectors: interface specs, file & SQL sources, model exchange (INT-03, 04, 07) ---- */
INT_TABS.push(['specs', 'Interface specs', () => `<div class="panel" style="margin-top:14px"><div class="ph"><h3>Agreed interfaces</h3><span class="note">One row per interface (INT-07)</span></div><div class="scroll-x"><table class="tbl"><thead><tr><th>Interface</th><th>Direction</th><th>Frequency</th><th>Owner</th><th>Schema</th><th>Credentials</th><th>Reconciliation</th></tr></thead><tbody>
  ${[['AVEVA PI', 'In', 'Hourly pull', 'Process Control', 'tag map v14', 'Service account, read-only', 'Monthly totals vs PI report ±0.5%'], ['SAP S/4HANA', 'In', 'Nightly', 'Finance IT', 'OData v4 · v3', 'OAuth client, read-only', 'Crude receipts vs custody ±0.1%'], ['LIMS', 'In', 'Every 30 min', 'Laboratory', 'REST · v2', 'API key', 'Sample count vs LIMS'], ['CEMS', 'In', '1 min', 'Environment', 'OPC UA · v1', 'Certificate', 'Stack CO₂ vs fuel carbon ±5%'], ['Power BI', 'Out', 'Hourly', 'Group Sustainability', 'dataset v4', 'Service principal', 'Row counts'], ['PACT exchange', 'Out', 'On request', 'Commercial', 'PACT 2.x', 'OAuth client', 'Signed response hash']].map((r) => `<tr><td><b style="font-weight:600">${r[0]}</b></td>${r.slice(1).map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}
</tbody></table></div><p class="note" style="margin-top:8px">Every interface authenticates, validates payloads, logs failures and retries safely with idempotency keys, so a retry never creates duplicates (INT-06).</p></div>`]);
INT_TABS.push(['sources', 'Files & SQL sources', () => `<div class="panel" style="margin-top:14px"><div class="ph"><h3>Excel and SQL sources</h3><span class="badge mute">Optional (INT-04)</span></div><div class="scroll-x"><table class="tbl"><thead><tr><th>Source</th><th>Type</th><th>Maps to</th><th>Refresh</th><th>Validation</th><th>Last refresh</th></tr></thead><tbody>
  ${[['Utilities_monthly.xlsx', 'Excel (SharePoint)', 'CP-09, 10, 12', 'Monthly, manual', 'Template v2 rules', '3 Dec', 'ok'], ['ENV_DW.flare_events', 'SQL view', 'CP-11 events', 'Daily 02:00', 'Range + duplicate key', 'Today', 'ok'], ['Shipping_voyages.csv', 'CSV drop', 'CP-15', 'Per cargo', 'Units + period', '2 days ago', 'ok'], ['Catalyst_changeouts.xlsx', 'Excel', 'CP-17', 'Quarterly', 'Template v1', '41 days ago', 'warn']].map((r) => `<tr><td><b style="font-weight:600">${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td class="muted">${r[4]}</td><td><span class="badge ${r[6]}">${r[5]}</span></td></tr>`).join('')}
</tbody></table></div></div>`]);
INT_TABS.push(['exchange', 'Model exchange', () => `<div class="grid g2" style="margin-top:14px"><div class="panel"><div class="ph"><h3>Formats</h3><span class="badge warn">Required formats: OD-08</span></div><table class="tbl"><thead><tr><th>Format</th><th>Import</th><th>Export</th><th>Round-trip limits</th></tr></thead><tbody>
  ${[['EcoSpold2', '✓', '✓', 'Parameters exported as values'], ['ILCD', '✓', '✓', 'Uncertainty kept; comments dropped'], ['JSON-LD (openLCA)', '✓', '✓', 'Full fidelity'], ['Excel study workbook', '✓', '✓', 'Full fidelity for own studies'], ['PACT JSON', '—', '✓', 'Results only']].map((r) => `<tr><td><b style="font-weight:600">${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td><td class="muted">${r[3]}</td></tr>`).join('')}
</tbody></table><p class="note" style="margin-top:8px">Licensed background datasets are referenced, not exported (FR-038).</p></div>
<div class="panel"><div class="ph"><h3>Test a round trip</h3><button class="pill is-ink" id="rtBtn">Export ST-0118 v12 → re-import</button></div><div id="rtOut"><p class="note">Exports the study as JSON-LD, imports it into a sandbox and compares results.</p></div></div></div>`]);
const intSec = SECTIONS.find((x) => x.id === 'integrations');
const intAfter = intSec.after;
intSec.after = () => { intAfter(); const hook = () => { const b = $('#rtBtn'); if (b && !b.dataset.on) { b.dataset.on = 1; b.addEventListener('click', () => runSteps($('#rtOut'), ['Exported 42 processes, 148 flows, 31 parameters', 'Background datasets exported as references', 'Imported into sandbox workspace', 'Recalculated: 376.2 → 376.2 kg CO₂e/t (0.000%)'], '<div class="callout" style="margin-top:8px"><b>Round trip passed.</b> No loss in the study model.</div>')); } }; hook(); $$('[data-tabs="int"] [data-tab]').forEach((t) => t.addEventListener('click', () => setTimeout(hook))); };

/* ---- Users & access: export controls, log protection, hosting & platforms (FR-038, FR-062, NFR-05–07) ---- */
SEC_TABS.push(['export', 'Export & sharing', () => `<div class="grid g2" style="margin-top:14px"><div class="panel"><div class="ph"><h3>What can leave the system</h3></div><table class="tbl"><thead><tr><th>Content</th><th>Internal export</th><th>Customer sharing</th></tr></thead><tbody>
  ${[['Product footprint & method', '✓', '✓ (approved versions only)'], ['Contribution by stage', '✓', '✓ aggregated'], ['Collection-point values', '✓ (analyst, approver)', '✕'], ['Licensed dataset raw values', '✕ masked', '✕'], ['Supplier-provided values', '✓ (with consent flag)', 'Only with supplier consent'], ['Draft or stale results', 'Watermarked', '✕ blocked']].map((r) => `<tr><td><b style="font-weight:600">${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}
</tbody></table></div>
<div class="panel raised"><div class="ph"><h3>Export preview</h3><span class="badge warn">Contains licensed data</span></div><table class="tbl"><tbody><tr><td>Diesel PCF</td><td class="num">376.2 kg CO₂e/t</td></tr><tr><td>DS-0101 crude, raw factor</td><td class="num"><span class="mask">masked (ecoinvent licence)</span></td></tr><tr><td>Supplier B crude CI</td><td class="num"><span class="mask">masked (no consent)</span></td></tr><tr><td>Classification</td><td class="num">Confidential · watermark on</td></tr></tbody></table>
<p class="note" style="margin-top:8px">Every export is logged with who, what, version and destination.</p></div></div>`]);
SEC_TABS.push(['logs', 'Log protection', () => `<div class="grid g2" style="margin-top:14px"><div class="panel"><div class="list">
  ${li('ok', 'Append-only, hash-chained', 'Each audit entry carries the hash of the previous one; any change breaks the chain.')}
  ${li('ok', 'Immutable storage copy', 'Daily copy to write-once storage in the second UAE region.')}
  ${li('ok', 'No secrets in logs', 'Passwords, tokens and API keys are scrubbed before writing; checked in every release.')}
  ${li('ok', 'Who can read logs', 'Approvers, auditors and admins; nobody can edit or delete entries.')}
  ${li('ok', 'Retention', 'Audit log 10 years; operational logs 1 year.')}</div></div>
  <div class="panel"><div class="ph"><h3>Verify the chain</h3><button class="pill is-ink" id="chainBtn">Verify now</button></div><div id="chainOut"><p class="note">Recomputes every hash from the first entry.</p></div></div></div>`]);
SEC_TABS.push(['hosting', 'Hosting & platforms', () => `<div class="panel" style="margin-top:14px"><div class="ph"><h3>Deployment options</h3><span class="badge warn">Choice pending: OD-07</span></div><div class="scroll-x"><table class="tbl"><thead><tr><th></th><th>SaaS (base)</th><th>Private cloud</th><th>On-premises</th></tr></thead><tbody>
  ${[['Data location', 'UAE region A + B', 'Company tenant, UAE', 'Company data centre'], ['Backups', 'Vendor, 2 UAE regions', 'Vendor or company', 'Company (runbook)'], ['Vendor access', 'Support only, logged, time-boxed', 'Approved sessions', 'On request, escorted'], ['Updates', 'Quarterly by vendor', 'Quarterly, scheduled', 'Company applies packages'], ['Availability target', '99.5%', '99.5%', 'Company responsibility']].map((r) => `<tr><td class="muted">${r[0]}</td>${r.slice(1).map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}
</tbody></table></div></div>
<div class="panel" style="margin-top:16px"><div class="ph"><h3>Supported platforms</h3></div><div class="scroll-x"><table class="tbl"><tbody>
  ${[['Browsers', 'Edge and Chrome, current and previous major version'], ['Desktop OS', 'Windows 10/11, macOS 13+ (browser only; no install)'], ['Mobile', 'iOS 16+, Android 12+, read-only views'], ['Screen', '1280 × 720 minimum; phone layouts from 360 px'], ['Network', 'HTTPS 443 outbound only; IP allow-list optional'], ['On-premises stack', 'Kubernetes 1.28+, PostgreSQL 15, 16 vCPU / 64 GB RAM, 2 TB storage']].map((r) => `<tr><td class="muted">${r[0]}</td><td>${r[1]}</td></tr>`).join('')}
</tbody></table></div></div>`]);
const secSec = SECTIONS.find((x) => x.id === 'security');
const secAfter = secSec.after;
secSec.after = () => { secAfter(); const hook = () => { const b = $('#chainBtn'); if (b && !b.dataset.on) { b.dataset.on = 1; b.addEventListener('click', () => runSteps($('#chainOut'), ['Read 48,213 entries since 2027-01-04', 'Recomputed hash chain', 'Compared with write-once copy (region B)'], '<div class="callout" style="margin-top:8px"><b>Chain intact.</b> No entry changed or removed.</div>')); } }; hook(); $$('[data-tabs="sec"] [data-tab]').forEach((t) => t.addEventListener('click', () => setTimeout(hook))); };

/* ---- Operations: availability, accessibility & language (NFR-12, NFR-15) ---- */
OPS_TABS.push(['avail', 'Availability', () => {
  const up = [99.98, 99.95, 100, 99.91, 99.97, 99.99, 99.62, 99.96, 100, 99.98, 99.94, 99.97];
  const W = 600, H = 150, lo = 99.3, yv = (v) => 10 + (H - 40) * (1 - (v - lo) / (100 - lo));
  return `<div class="grid g-side" style="margin-top:14px"><div class="panel"><div class="ph"><h3>Monthly availability · ${Y0 + state.year - 1}</h3><span class="badge mute">Hosted service only</span></div>
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;display:block">${up.map((v, i) => `<rect x="${12 + i * 49}" y="${yv(v)}" width="32" height="${yv(lo) - yv(v)}" rx="3" fill="${v < 99.7 ? 'var(--warn)' : 'var(--barsel)'}"/><text x="${28 + i * 49}" y="${H - 14}" font-size="9" fill="var(--muted)" text-anchor="middle">${MONTHS[i]}</text><text x="${28 + i * 49}" y="${yv(v) - 4}" font-size="8.5" fill="var(--ink)" text-anchor="middle">${v}</text>`).join('')}<line x1="0" x2="${W}" y1="${yv(99.5)}" y2="${yv(99.5)}" stroke="var(--down)" stroke-dasharray="4 3"/><text x="${W}" y="${yv(99.5) - 4}" font-size="9" fill="var(--down)" text-anchor="end">target 99.5%</text></svg>
    <p class="note">Planned maintenance is excluded and announced 10 days ahead. For an on-premises deployment, availability is the company’s responsibility and no hosted service level applies.</p></div>
    <div class="panel"><div class="ph"><h3>Incidents</h3></div><div class="list">${li('warn', 'Jul · 2 h 45 min degraded', 'Database failover after storage fault; no data lost (RPO met).')}${li('ok', 'Apr · 39 min', 'Identity provider outage upstream; sign-in unavailable.')}${li('mute', 'Maintenance window', 'Fridays 02:00–04:00 GST, about once per quarter')}</div></div></div>`;
}]);
OPS_TABS.push(['a11y', 'Accessibility & language', () => `<div class="grid g2" style="margin-top:14px"><div class="panel"><div class="ph"><h3>Accessibility</h3><span class="badge warn">Standard to confirm: OD-13</span></div><div class="list">
  ${li('ok', 'Keyboard', 'Every action reachable by keyboard; visible focus; tour uses ← → and Esc.')}
  ${li('ok', 'Contrast', 'Text meets WCAG 2.2 AA contrast in light and dark modes.')}
  ${li('ok', 'Reduced motion', 'Animations stop when the system asks for reduced motion.')}
  ${li('ok', 'Screen readers', 'Charts have text alternatives and data tables.')}
  ${li('warn', 'Formal audit', 'Third-party WCAG 2.2 AA audit planned before go-live.')}</div></div>
  <div class="panel"><div class="ph"><h3>Language</h3><div class="seg" id="langSeg"><button data-l="en" aria-pressed="true">English</button><button data-l="ar">العربية</button></div></div>
  <div class="lang-card" id="langCard"></div><p class="note" style="margin-top:8px">UI and report languages are to be confirmed; English correspondence in the tender does not set the UI language (NFR-15).</p></div></div>`]);
const opsSec = SECTIONS.find((x) => x.id === 'operations');
const opsAfter = opsSec.after;
const LANG = { en: { dir: 'ltr', t: 'Diesel (ULSD)', a: 'Cradle-to-gate footprint', b: 'kg CO₂e per tonne', c: 'Approved · study ST-0118 v12' }, ar: { dir: 'rtl', t: 'الديزل (منخفض الكبريت)', a: 'البصمة من المهد إلى البوابة', b: 'كجم مكافئ ثاني أكسيد الكربون لكل طن', c: 'معتمد · الدراسة ST-0118 الإصدار 12' } };
opsSec.after = () => { opsAfter(); const hook = () => { const seg = $('#langSeg'); if (!seg || seg.dataset.on) return; seg.dataset.on = 1; const draw = (l) => { const L = LANG[l]; $('#langCard').innerHTML = `<div dir="${L.dir}" class="panel raised" style="padding:16px"><span class="eyebrow">${L.a}</span><h3 style="font-size:20px;font-weight:600;margin:4px 0">${L.t}</h3><div class="kpi"><b>376</b><span>${L.b}</span></div><span class="badge ok" style="margin-top:6px">${L.c}</span></div>`; $$('#langSeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.l === l))); }; $$('#langSeg button').forEach((b) => b.addEventListener('click', () => draw(b.dataset.l))); draw('en'); }; hook(); $$('[data-tabs="ops"] [data-tab]').forEach((t) => t.addEventListener('click', () => setTimeout(hook))); };

/* ---- HSE & policy compliance (NFR-16) ---- */
const POLS = [['ADNOC Refining HSE policy', 'Not supplied', 'bad', 'OD-13'], ['Company IT & cyber security standard', 'Not supplied', 'bad', 'OD-13'], ['Privacy / personal data policy', 'Not supplied', 'bad', 'OD-13'], ['Accessibility standard', 'Not specified', 'warn', 'OD-13'], ['Vendor HSE management system', 'ISO 45001 certificate', 'ok', '—'], ['Vendor information security', 'ISO/IEC 27001 certificate', 'ok', '—']];
sec({ id: 'hse', group: 'Administration', icon: '⛑', title: 'HSE & policy compliance', nav: 'HSE & policies',
  sub: 'Each company policy assessed clause by clause, with evidence and gaps. Policies not yet received are shown as such, never assumed.',
  actions: ['Export compliance register'], rfp: ['C2'], status: [['warn', 'Company policies not supplied (OD-13)']],
  render: () => {
    const y = state.year, fl = yearTotal(CPI['11'], y), f1 = yearTotal(CPI['11'], 1), fu = sum(['02', '13', '14'].map((id) => yearTotal(CPI[id], y))), fu1 = sum(['02', '13', '14'].map((id) => yearTotal(CPI[id], 1)));
    return `<div class="grid g-side"><div class="panel"><div class="ph"><h3>Policy register</h3></div><div class="scroll-x"><table class="tbl"><thead><tr><th>Policy</th><th>Status</th><th>Decision</th></tr></thead><tbody>${POLS.map((p) => `<tr><td><b style="font-weight:600">${p[0]}</b></td><td><span class="badge ${p[2]}">${p[1]}</span></td><td class="muted">${p[3]}</td></tr>`).join('')}</tbody></table></div>
      <div class="eyebrow" style="margin:14px 0 6px">Clause mapping template (filled when the policy arrives)</div><div class="scroll-x"><table class="tbl"><thead><tr><th>Clause</th><th>Requirement</th><th>How we comply</th><th>Evidence</th><th>Status</th></tr></thead><tbody>
        ${[['—', 'Contractor HSE plan', 'Submitted at mobilisation', 'HSE plan v1', 'ok'], ['—', 'Site access & induction', 'Inducted, escorted, permit-to-work', 'Training records', 'ok'], ['—', 'Incident reporting', 'Within 24 h to company HSE', 'Procedure HSE-07', 'ok'], ['—', 'Environmental objectives', 'Flaring and methane tracked monthly', 'Site map, control centre', 'ok'], ['—', 'Policy-specific clauses', 'Awaiting ADNOC Refining HSE policy', '—', 'bad']].map((r) => `<tr><td class="muted">${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td class="muted">${r[3]}</td><td><span class="badge ${r[4]}">${r[4] === 'ok' ? 'Evidence ready' : 'Gap'}</span></td></tr>`).join('')}</tbody></table></div></div>
    <div class="stack"><div class="panel"><div class="ph"><h3>HSE-relevant indicators · ${Y0 + y - 1}</h3></div>${kpi(fmtT(fl), `Flaring CO₂e${y > 1 ? ` · ${sgn(fl / f1 - 1)} vs 2027` : ''}`)}<div class="hr" style="margin:10px 0"></div>${kpi(fmtT(fu), `Fugitive & effluent CO₂e${y > 1 ? ` · ${sgn(fu / fu1 - 1)} vs 2027` : ''}`)}<div class="hr" style="margin:10px 0"></div>${kpi('0', 'Delivery-team HSE incidents')}</div>
      <div class="panel"><div class="ph"><h3>Delivering safely</h3></div><div class="list">${li('ok', 'Remote-first', 'Most work done remotely, cutting site exposure.')}${li('ok', 'No control-system access', 'Read-only plant connections; no process-safety interface.')}</div></div></div></div>`;
  },
  onYear: () => show(state.sec, false, true),
});

/* ---- Licence, training, validation, exit (SVC-01, 06, 08, 12, NFR-18) ---- */
const CONTRACT_TABS = [
  ['ent', 'Entitlements', () => `<div class="callout warn" style="margin-top:14px">Quantities and terms are <b>proposals</b> until the Scope of Services is received (OD-01, OD-06).</div><div class="grid g2" style="margin-top:14px"><div class="panel"><div class="ph"><h3>Software licence</h3></div><table class="tbl"><tbody>
    ${[['Licence type', 'Subscription, 36 months'], ['Users', '75 named analyst / owner / approver seats; unlimited viewers'], ['Concurrency', 'No concurrent-user limit'], ['Environments', 'Production, sandbox, training'], ['Modules', 'Inventory, modelling, footprints, scenarios, reporting, integrations'], ['Optional modules', 'Supplier portal, other impact categories, Monte Carlo'], ['Activation', 'At contract award (T0)'], ['Transfer', 'Within the ADNOC Group with notice']].map(([a, b]) => `<tr><td class="muted">${a}</td><td>${b}</td></tr>`).join('')}</tbody></table></div>
    <div class="panel"><div class="ph"><h3>Coverage across the term</h3></div><div class="list">${li('ok', 'Software, support and maintenance', 'Same 36 months, aligned to T0.')}${li('ok', 'Database subscriptions', 'Itemised separately; see Databases → Licences & rights.')}${li('ok', 'Upgrades and patches', 'All releases in the term included.')}${li('ok', 'Help after result-changing updates', 'Analyst support to restate affected studies.')}</div></div></div>`],
  ['train', 'Training plan', () => `<div class="panel" style="margin-top:14px"><div class="ph"><h3>Training plan</h3><span class="badge warn">Days and numbers to agree: OD-12</span></div><div class="scroll-x"><table class="tbl"><thead><tr><th>Course</th><th>Audience</th><th class="num">Days</th><th class="num">Participants</th><th>Format</th><th>Evidence</th><th>Status</th></tr></thead><tbody>
    ${[['LCA analyst certification', 'Analysts', '3', '8', 'Classroom, Abu Dhabi', 'Exam + model built', 'ok'], ['Unit data owner', 'Owners', '0.5', '20', 'Virtual', 'Sign-off exercise', 'ok'], ['Approver & reviewer', 'Approvers', '1', '6', 'Virtual', 'Review exercise', 'ok'], ['Administrator', 'IT', '1', '4', 'Virtual', 'Checklist', 'ok'], ['Viewer e-learning', 'All', '1 h', 'Unlimited', 'Self-paced', 'Completion record', 'ok'], ['Refresher (Years 2, 3)', 'All roles', '1', '20', 'Virtual', 'Attendance', 'warn']].map((r) => `<tr><td><b style="font-weight:600">${r[0]}</b></td><td>${r[1]}</td><td class="num">${r[2]}</td><td class="num">${r[3]}</td><td>${r[4]}</td><td class="muted">${r[5]}</td><td><span class="badge ${r[6]}">${r[6] === 'ok' ? 'Planned' : 'To schedule'}</span></td></tr>`).join('')}
  </tbody></table></div><p class="note" style="margin-top:8px">Materials: course slides, recorded videos, exercise workbook and a sandbox copy of the site model.</p></div>`],
  ['valid', 'Reference validation', () => `<div class="panel" style="margin-top:14px"><div class="ph"><h3>Validation against the reference model</h3><button class="pill is-ink" id="valBtn">Run validation</button></div><p class="note">The agreed reference study (to be supplied under OD-14) is calculated and compared with its expected results. Shown here with the 2027 baseline as a stand-in.</p>
    <div class="scroll-x"><table class="tbl" style="margin-top:8px" id="valTbl"><thead><tr><th>Product</th><th class="num">Expected</th><th class="num">Calculated</th><th class="num">Difference</th><th>Tolerance ±0.5%</th></tr></thead><tbody>
    ${pcf({ year: 1, alloc: 'energy' }).rows.map((p, i) => { const calc = p.val * (1 + [0.0004, -0.0011, 0.0002, 0.0009, -0.0003, 0.0006, -0.0018][i]); return `<tr><td>${p.name}</td><td class="num">${fmtN(p.val, 1)}</td><td class="num">${fmtN(calc, 1)}</td><td class="num">${sgn(calc / p.val - 1, 2)}</td><td><span class="badge ok">Pass</span></td></tr>`; }).join('')}
    </tbody></table></div><div id="valOut"></div></div>`],
  ['exit', 'Renewal & exit', () => `<div class="grid g2" style="margin-top:14px"><div class="panel"><div class="ph"><h3>Warranty, renewal, expiry</h3></div><div class="close-steps">
    ${[['Warranty', 'Defects fixed at no cost for the full term'], ['Renewal decision', 'Options presented at month 30'], ['Notice', '90 days before expiry'], ['After expiry', '90 days read-only access to all studies and reports'], ['Export package', 'Delivered within 10 working days of request'], ['Data removal', 'Certificate of deletion within 30 days of confirmation']].map(([a, b], i) => `<div class="close-step"><span class="check ok">${i + 1}</span><span><b style="font-weight:600">${a}</b> · <span class="muted">${b}</span></span><span></span></div>`).join('')}</div>
    <p class="note" style="margin-top:8px">The company owns its studies, models, inventories and results. Third-party database contents remain under their own licences and are exported as references.</p></div>
  <div class="panel"><div class="ph"><h3>Exit package</h3><button class="pill is-ink" id="exitBtn">Generate (sandbox)</button></div><div class="list">
    ${[['Studies and models', 'JSON-LD + Excel workbooks'], ['Inventories by month', 'CSV with lineage columns'], ['Calculation runs', 'Snapshots + results, CSV/JSON'], ['Reports', 'PDF + Word'], ['Audit log', 'CSV + hash-chain proof'], ['Configuration', 'Formulas, mappings, roles as JSON']].map(([a, b]) => li('ok', a, b)).join('')}
  </div><div id="exitOut" style="margin-top:8px"></div></div></div>`],
];
sec({ id: 'contract', group: 'Administration', icon: '§', title: 'Licence & exit', nav: 'Licence & exit',
  sub: 'What is licensed, how people are trained, how the system is validated against a reference model, and what happens at renewal or exit.',
  actions: ['Download entitlement summary'], rfp: ['C3b', 'C7'], status: [['warn', 'Proposals pending Scope of Services (OD-01, OD-06, OD-12, OD-15)']],
  render: () => tabbed('ctr', CONTRACT_TABS),
  after: () => bindTabs('ctr', CONTRACT_TABS, (k) => {
    if (k === 'valid') $('#valBtn').addEventListener('click', () => runSteps($('#valOut'), ['Loaded reference study and expected results', 'Calculated 7 products', 'Compared within ±0.5% tolerance'], '<div class="callout" style="margin-top:8px"><b>7 of 7 products pass.</b> Largest difference −0.18% (sulphur).</div>'));
    if (k === 'exit') $('#exitBtn').addEventListener('click', () => runSteps($('#exitOut'), ['Exported 136 studies and 412 versions', 'Exported 36 monthly inventories', 'Exported 518 calculation runs', 'Packaged reports and audit proof', 'Checksum manifest signed'], '<div class="callout" style="margin-top:8px"><b>Exit package ready</b> (sandbox): 7.4 GB, manifest signed.</div>'));
  }),
});

/* ---- update requirement coverage ---- */
[['FR-029', 'suppliers'], ['FR-030', 'databases'], ['FR-031', 'databases'], ['FR-038', 'security'], ['FR-042', 'formulas'], ['FR-047', 'formulas'], ['FR-048', 'formulas'], ['FR-062', 'security'], ['INT-03', 'integrations'], ['INT-04', 'integrations'], ['INT-07', 'integrations'],
  ['NFR-05', 'security'], ['NFR-06', 'security'], ['NFR-07', 'security'], ['NFR-12', 'operations'], ['NFR-15', 'operations'], ['NFR-16', 'hse'], ['NFR-18', 'contract'], ['SVC-01', 'contract'], ['SVC-02', 'databases'], ['SVC-06', 'contract'], ['SVC-08', 'contract'], ['SVC-12', 'contract']]
  .forEach(([id, where]) => { const r = REQS.find((x) => x[0] === id); r[2] = where; r[3] = 'shown'; });
TCS.forEach((t) => { if (t[0] === 'TC-12') t[2] = 'hse'; });
ATS.forEach((a) => { if (a[0] === 'AT-14') a[3] = 'contract'; });


/* =====================================================================
   Market-leader capabilities: Sankey, contribution tree, cargo PCFs,
   PCF exchange (PACT-style), market benchmark
   ===================================================================== */
state.vcView = 'build';
function sankeySVG(p, st, endIdx) {
  const inB = (key) => st.findIndex((s) => s[0] === key) <= endIdx;
  const stg = st.filter((s, k) => k < st.findIndex((x) => x[0] === 'gate') && s[5]);
  const up = stg.filter((s) => ['ext', 'ctr', 'inp'].includes(s[0])), site = stg.filter((s) => !['ext', 'ctr', 'inp'].includes(s[0]));
  const V = (a) => sum(a.map((s) => s[4]));
  const gate = V(stg), distr = st.find((s) => s[0] === 'distr')[4], use = st.find((s) => s[0] === 'use')[4];
  const cust = gate + (inB('distr') ? distr : 0), grave = cust + (inB('use') ? use : 0);
  const total = inB('use') ? grave : inB('distr') ? cust : gate;
  const H = 360, gap = 6, k = (H - 20 - gap * (stg.length - 1)) / total * (inB('use') ? 1 : 1);
  const W = 900, cx = [170, 380, 560, 700, 840], nw = 12;
  const nodes = {}, links = [];
  let y = 10;
  stg.forEach((s) => { const h = Math.max(1.5, s[4] * k); nodes[s[0]] = { x: cx[0], y, h, v: s[4], label: s[1], col: CATS[s[5]].color, st: s[0] }; y += h + gap; });
  const gy = 10;
  nodes.up = { x: cx[1], y: gy, h: Math.max(1.5, V(up) * k), v: V(up), label: 'Upstream (Scope 3)', col: CATS.up.color };
  nodes.site = { x: cx[1], y: gy + nodes.up.h + 24, h: Math.max(1.5, V(site) * k), v: V(site), label: 'Refinery site (Scope 1+2)', col: CATS.fire.color };
  nodes.gate = { x: cx[2], y: gy, h: gate * k, v: gate, label: 'At refinery gate', col: 'var(--ink)' };
  if (inB('distr')) { nodes.distr = { x: cx[2], y: gy + gate * k + 30, h: Math.max(2, distr * k), v: distr, label: 'Distribution', col: CATS.down.color, st: 'distr' }; nodes.cust = { x: cx[3], y: gy, h: cust * k, v: cust, label: 'At customer', col: 'var(--ink)' }; }
  if (inB('use')) { nodes.use = { x: cx[3], y: gy + cust * k + 30, h: Math.max(2, use * k), v: use, label: 'Use (combustion)', col: CATS.up.color, st: 'use' }; nodes.grave = { x: cx[4], y: gy, h: grave * k, v: grave, label: 'End of life', col: 'var(--ink)' }; }
  up.forEach((s) => links.push([s[0], 'up', s[4]])); site.forEach((s) => links.push([s[0], 'site', s[4]]));
  links.push(['up', 'gate', V(up)], ['site', 'gate', V(site)]);
  if (nodes.cust) links.push(['gate', 'cust', gate], ['distr', 'cust', distr]);
  if (nodes.grave) links.push(['cust', 'grave', cust], ['use', 'grave', use]);
  const outOff = {}, inOff = {};
  let svg = '';
  links.forEach(([a, b, v]) => {
    const A = nodes[a], B = nodes[b], w = v * k;
    const y0 = A.y + (outOff[a] || 0) + w / 2, y1 = B.y + (inOff[b] || 0) + w / 2;
    outOff[a] = (outOff[a] || 0) + w; inOff[b] = (inOff[b] || 0) + w;
    const x0 = A.x + nw, x1 = B.x, mx = (x0 + x1) / 2;
    const dim = state.vcStage && A.st && A.st !== state.vcStage;
    svg += `<path d="M${x0} ${y0} C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}" fill="none" stroke="${A.col}" stroke-opacity="${dim ? .08 : .38}" stroke-width="${Math.max(0.8, w)}"/>`;
  });
  Object.entries(nodes).forEach(([id, n]) => {
    const left = n.x === cx[0];
    svg += `<g ${n.st ? `data-st="${n.st}" style="cursor:pointer"` : ''}><rect x="${n.x}" y="${n.y}" width="${nw}" height="${Math.max(1.5, n.h)}" rx="2" fill="${n.col}"/>
      <text x="${left ? n.x - 6 : n.x + nw + 6}" y="${n.y + Math.max(1.5, n.h) / 2 + 3.5}" font-size="10.5" fill="var(--ink2)" text-anchor="${left ? 'end' : 'start'}" font-family="var(--font)">${n.label} <tspan font-weight="700" fill="var(--ink)">${fmtN(n.v, n.v < 10 ? 1 : 0)}</tspan></text></g>`;
  });
  const hMax = Math.max(...Object.values(nodes).map((n) => n.y + n.h)) + 12;
  return `<svg viewBox="0 0 ${W} ${hMax}" style="width:100%;min-width:640px;height:auto;display:block" role="img" aria-label="Sankey diagram of carbon along the value chain">${svg}</svg>`;
}
function treeHTML(p, st, endIdx, total) {
  const i = PRODUCTS.findIndex((q) => q.k === p.k), y = state.year;
  const inc = BOUNDS.c2g.inc, catT = {};
  LIVE.filter(inc).forEach((c) => { catT[c.cat] = (catT[c.cat] || 0) + yearTotal(c, y); });
  const con = (id) => { const c = CPI[id]; return c && inc(c) && catT[c.cat] ? p.val * p.mix[c.cat] * (yearTotal(c, y) / catT[c.cat]) : 0; };
  const row = (n, v, depth, extra = '') => `<span class="tr-row" style="--d:${depth}"><span class="tr-n">${n}</span><span class="tr-bar"><i style="width:${Math.min(100, (v / total) * 100)}%"></i></span><b>${fmtN(v, v < 10 ? 1 : 0)}</b><span class="note" style="width:46px;text-align:right">${pct(v / total, 1)}</span>${extra}</span>`;
  const stages = st.filter((s, k) => k <= endIdx && s[5]).sort((a, b) => b[4] - a[4]);
  return `<div class="tree"><details open><summary>${row(`<b>${p.name}</b> · ${VCB[state.vcBound][1]}`, total, 0)}</summary>
    ${stages.map((s) => `<details${s[0] === state.vcStage ? ' open' : ''}><summary>${row(s[1], s[4], 1)}</summary>
      ${s[3].filter((id) => CPI[id] && CPI[id].cat !== 'data').map((id) => { const c = CPI[id], v = s[3].length === 1 ? s[4] : con(id); return `<details><summary>${row(`CP-${id} ${esc(c.name.split(' (')[0])}`, v, 2)}</summary>${c.feeds.map((f) => `<div class="tr-leaf" style="--d:3"><code>${f[0]}</code> ${esc(f[4])} <span class="muted">· ${esc(f[1])} · ${f[3]}</span></div>`).join('')}<div class="tr-leaf" style="--d:3"><span class="muted">Factor / method:</span> ${esc(c.ef)}</div></details>`; }).join('')}
      ${!s[3].length ? `<div class="tr-leaf" style="--d:2"><span class="muted">${s[0] === 'use' ? `Combustion factor DS-0112 (IPCC 2006), ${fmtN(p.use, 0)} kg CO₂e/t` : 'No site collection point'}</span></div>` : ''}</details>`).join('')}
  </details></div>`;
}
// called at the end of drawVC
function drawVcAlt(p, st, endIdx, total) {
  $$('#vcView button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === state.vcView)));
  $('#vcGrid').classList.toggle('one', state.vcView !== 'build');
  $('#vcVizT').textContent = { build: 'Carbon building up along the chain · kg CO₂e/t', sankey: 'Sankey: where the carbon comes from and where it goes · kg CO₂e/t', tree: 'Contribution tree: stage → collection point → meter tag and factor' }[state.vcView];
  if (state.vcView === 'sankey') { $('#vcWf').innerHTML = `<div class="scroll-x">${sankeySVG(p, st, endIdx)}</div>`; }
  if (state.vcView === 'tree') { $('#vcWf').innerHTML = treeHTML(p, st, endIdx, total); }
  $$('#vcWf [data-st]').forEach((n) => n.addEventListener('click', () => { state.vcStage = state.vcStage === n.dataset.st ? null : n.dataset.st; drawVC(); }));
}

/* cargo-level (dynamic) footprints from plant data */
const DEST = ['Asia (Singapore)', 'East Africa', 'Europe (Rotterdam)', 'Domestic', 'Asia (Japan)', 'South Asia', 'Domestic', 'Asia (Korea)'];
function cargoHTML(i) {
  const p = PRODUCTS[i], y = state.year, r = rng(900 + i * 7 + y);
  const ann = pcf({ year: y, alloc: 'subdiv' }).rows[i].val;
  const rows = [...Array(8)].map((_, k) => {
    const m = y * 12 - 1 - Math.floor(k * 1.4), mt = monthTotal(m) * 12 / sum(LIVE.filter((c) => c.cat !== 'down').map((c) => yearTotal(c, y)));
    const v = ann * mt * (1 + (r() - 0.5) * 0.03);
    const id = `${p.k.toUpperCase()}-${String(Y0 + y - 1).slice(2)}${String(140 - k * 3).padStart(3, '0')}`;
    return [id, `${daysIn(m) - Math.floor(r() * 25)} ${MONTHS[m % 12]}`, DEST[(k + i) % DEST.length], fmtN(p.kt / 52 * (0.6 + r() * 0.8), 1), v, v / ann - 1, k < 3 ? ['ok', 'Shared (PACT)'] : k < 6 ? ['mute', 'Issued'] : ['warn', 'Requested']];
  });
  return `<div class="panel"><div class="ph"><h3>Shipment footprints · ${p.name}</h3><span class="note">Each cargo gets the footprint of the period it was produced, from plant data</span></div><div class="scroll-x"><table class="tbl"><thead><tr><th>Cargo / load</th><th>Loaded</th><th>Destination</th><th class="num">kt</th><th class="num">kg CO₂e/t</th><th class="num">vs annual</th><th>Certificate</th></tr></thead><tbody>
    ${rows.map((x) => `<tr><td><b style="font-weight:600">${x[0]}</b></td><td class="muted">${x[1]}</td><td>${x[2]}</td><td class="num">${x[3]}</td><td class="num"><b style="font-weight:600">${fmtN(x[4], 0)}</b></td><td class="num ${x[5] < 0 ? 'up' : 'down'}">${sgn(x[5])}</td><td><span class="badge ${x[6][0]}">${x[6][1]}</span></td></tr>`).join('')}
  </tbody></table></div><p class="note" style="margin-top:8px">Annual average ${fmtN(ann, 0)} kg CO₂e/t. Turnarounds, flaring events and crude slate move individual cargoes; customers receive the cargo value with the same method and data-quality fields.</p></div>`;
}

/* ---- PCF exchange (PACT-style) ---- */
const XREQ = [['Customer A · airline', 'Jet A-1', 'Q4 2029', '2 days', 'Answered', 'ok'], ['Customer B · trader', 'Diesel (ULSD)', 'Cargo DSL-29140', '4 h', 'Answered', 'ok'], ['Customer C · utility', 'Fuel oil', '2029', '—', 'Awaiting approval', 'warn'], ['Customer D · petrochemicals', 'Naphtha', 'Q4 2029', '—', 'New', 'mute'], ['Customer E · fertiliser', 'Sulphur', '2029', '1 day', 'Answered', 'ok']];
const XIN = [['Crude supplier A', 'Crude grade A', 'PACT API', 'Verified (third party)', 'ok'], ['Shipping line', 'Voyage fuel', 'PACT API', 'Self-declared', 'warn'], ['Caustic supplier', 'NaOH 50%', 'File (PACT JSON)', 'Verified (EPD)', 'ok'], ['Crude supplier B', 'Crude grade C', 'Portal form', 'In review', 'warn']];
function pactJSON() {
  const p = pcf({ year: state.year, alloc: 'subdiv' }).rows.find((q) => q.k === 'dsl');
  const yy = Y0 + state.year - 1;
  return JSON.stringify({ id: 'b1f3…-dsl-' + yy, specVersion: '2.x', version: 3, status: 'Active', companyName: 'Coastal Refinery (sample)', productNameCompany: 'Diesel (ULSD)', productCategoryCpc: '33360', pcf: { declaredUnit: 'kilogram', unitaryProductAmount: '1', pCfExcludingBiogenic: (p.val / 1000).toFixed(4), fossilGhgEmissions: (p.val / 1000).toFixed(4), biogenicCarbonContent: '0', characterizationFactors: 'AR6', crossSectoralStandardsUsed: ['ISO Standard 14067', 'GHG Protocol Product standard'], boundaryProcessesDescription: 'Cradle-to-gate: crude extraction and transport, refinery processes, utilities; unit sub-division allocation', referencePeriodStart: `${yy}-01-01T00:00:00Z`, referencePeriodEnd: `${yy + 1}-01-01T00:00:00Z`, geographyCountry: 'AE', primaryDataShare: [68, 79, 86][state.year - 1], assurance: { assurance: true, coverage: 'product line', level: 'limited', boundary: 'Cradle-to-Gate' } } }, null, 2);
}
const X_TABS = [
  ['out', 'Customer requests', () => `<div class="grid g4" style="margin-top:14px">${[kpi(XREQ.length, 'Requests this quarter'), kpi('1.2 days', 'Median response'), kpi('100%', 'Answered from approved studies'), kpi(XREQ.filter((x) => x[5] === 'ok').length, 'Shared with signature')].map((x) => `<div class="panel tight">${x}</div>`).join('')}</div>
    <div class="panel" style="margin-top:16px"><div class="scroll-x"><table class="tbl" id="xOut"><thead><tr><th>Requester</th><th>Product</th><th>Scope</th><th class="num">Response time</th><th>Status</th><th></th></tr></thead><tbody>
    ${XREQ.map((x, i) => `<tr><td><b style="font-weight:600">${x[0]}</b></td><td>${x[1]}</td><td class="muted">${x[2]}</td><td class="num">${x[3]}</td><td><span class="badge ${x[5]}">${x[4]}</span></td><td>${x[5] !== 'ok' ? `<button class="pill" data-ans="${i}" style="padding:4px 10px;font-size:12px">${x[5] === 'warn' ? 'Approve & send' : 'Prepare answer'}</button>` : ''}</td></tr>`).join('')}
    </tbody></table></div><p class="note" style="margin-top:8px">Answers come only from approved study versions; draft or stale results cannot be shared (FR-061).</p></div>`],
  ['in', 'Supplier footprints', () => `<div class="panel" style="margin-top:14px"><div class="ph"><h3>Footprints received</h3><button class="tag" data-goto="suppliers" style="cursor:pointer;border:0">Supplier data →</button></div><div class="scroll-x"><table class="tbl"><thead><tr><th>Supplier</th><th>Product</th><th>Channel</th><th>Assurance</th></tr></thead><tbody>${XIN.map((x) => `<tr><td><b style="font-weight:600">${x[0]}</b></td><td>${x[1]}</td><td>${x[2]}</td><td><span class="badge ${x[4]}">${x[3]}</span></td></tr>`).join('')}</tbody></table></div></div>`],
  ['model', 'Data model', () => `<div class="grid g-side" style="margin-top:14px"><div class="panel"><div class="ph"><h3>Footprint as exchanged · Diesel ${Y0 + state.year - 1}</h3><span class="badge mute">PACT v2-style, illustrative</span></div><pre class="json">${esc(pactJSON())}</pre></div>
    <div class="panel"><div class="ph"><h3>Signing &amp; verification</h3></div><div class="list">${li('ok', 'Digitally signed responses', 'Recipients can check the footprint has not been altered.')}${li('ok', 'Version history', 'A restated footprint gets a new version; the old one stays retrievable.')}${li('ok', 'Same data-quality fields', 'Primary data share and assurance travel with every value.')}</div></div></div>`],
  ['conf', 'Networks & conformance', () => `<div class="grid g2" style="margin-top:14px"><div class="panel"><div class="ph"><h3>PACT conformance</h3><span class="badge warn">Testing planned</span></div><p class="note">PACT conformance confirms that platforms can exchange footprints with each other; it does not validate the calculation method. Status is listed in the PACT Online Catalog.</p>
    <div class="close-steps" style="margin-top:10px">${['API implemented (Action ListFootprints, GetFootprint, Events)', 'Self-test against the PACT test suite', 'Conformance test with two other conformant solutions', 'Listing in the PACT Online Catalog'].map((s, i) => `<div class="close-step"><span class="check ${i < 2 ? 'ok' : 'mute'}">${i < 2 ? '✓' : i + 1}</span><span>${s}</span><span></span></div>`).join('')}</div></div>
    <div class="panel"><div class="ph"><h3>Connected networks</h3></div><div class="list">${li('ok', 'Direct API with customers', '3 customers connected')}${li('mute', 'Industry data spaces', 'Optional, by customer request')}${li('mute', 'ERP-based exchange', 'Via the SAP connector if the company uses it')}</div></div></div>`],
];
sec({ id: 'exchange', group: 'Outputs', icon: '⇆', title: 'Footprint exchange', nav: 'Footprint exchange',
  sub: 'Answer customer footprint requests and receive supplier footprints in a standard format, signed and versioned, straight from approved studies.',
  actions: ['Share footprint'], rfp: ['C4c', 'C3d'], status: [['mute', 'Optional: customer and supplier exchange (INT-05)']],
  render: () => tabbed('x', X_TABS),
  after: () => bindTabs('x', X_TABS, () => {
    $$('[data-ans]').forEach((b) => b.addEventListener('click', () => { const x = XREQ[+b.dataset.ans]; x[4] = x[5] === 'warn' ? 'Answered' : 'Awaiting approval'; x[5] = x[5] === 'warn' ? 'ok' : 'warn'; if (x[5] === 'ok') x[3] = 'today'; toast(`${x[0]}: ${x[4]}`); $('[data-tabs="x"] [data-tab="out"]').click(); }));
  }),
});

/* ---- Market benchmark (Requirements tab) ---- */
const LEADERS = [
  ['SimaPro (PRé, now part of One Click LCA)', 'Expert process LCA', 'Process-based modelling with integrated inventory databases; parameters for scenarios; Monte Carlo analysis', 'Model workspace · Scenarios (Monte Carlo)', 'https://www.capterra.com/p/10033268/SimaPro/'],
  ['Sphera LCA for Experts (formerly GaBi)', 'Expert LCA + content', 'Large managed LCA database (20,000+ datasets); scenario modelling', 'Databases · Scenarios', 'https://sphera.com/product-sustainability-software/'],
  ['openLCA (GreenDelta)', 'Open-source LCA', 'Sankey diagram and contribution tree for hotspots; regionalised LCA; Monte Carlo', 'Products → value chain Sankey & contribution tree', 'https://manuals.openlca.org/openlca/res_analysis/analysis.html'],
  ['One Click LCA', 'LCA & EPD platform', 'Construction-focused LCA and EPDs; acquired SimaPro', 'Reports (EPDs)', 'https://dcycle.io/blog/alternatives-simapro-software/'],
  ['Makersite (acquired SiGREEN from Siemens)', 'Product & supply-chain twins', 'Product and supply-chain digital twins across 140+ data sources; supply-chain PCF exchange', 'Supplier data · Footprint exchange (no AI-generated inventory, per scope)', 'https://www.esgtoday.com/makersite-acquires-product-carbon-footprint-platform-sigreen-from-siemens/'],
  ['SAP Sustainability Footprint Management', 'ERP-based PCF', 'Product and corporate footprints from actual ERP data; integration with S/4HANA', 'Data connectors (SAP S/4HANA)', 'https://bearingpoint.services/emissions-calculator/en/services/co2-software-implementation/sap-sustainability-footprint-management/'],
  ['Yokogawa OpreX Carbon Footprint Tracer', 'Plant-data PCF for process industries', 'Footprints from DCS/SCADA and instrument data; refining and petrochemicals; SAP SFM integration; PACT Pathfinder', 'Control centre · Shipment footprints', 'https://www.hydrocarbonengineering.com/product-news/26022024/yokogawa-releases-oprex-carbon-footprint-tracer/'],
  ['Ecochain, Dassault 3DEXPERIENCE, SAP SDX', 'PACT-conformant exchange', 'Listed as PACT conformant for footprint data exchange', 'Footprint exchange', 'https://wbcsd.github.io/tr/2025/PACT_whitepaper_scope3_issue3.pdf'],
];
REQ_TABS.push(['market', 'Market benchmark', () => `<div class="panel" style="margin-top:14px"><div class="ph"><h3>What global leaders offer, and where this product answers it</h3><span class="note">Researched 31 Oct 2026; vendor claims, not tested</span></div><div class="scroll-x"><table class="tbl"><thead><tr><th>Leader</th><th>Category</th><th>Known for</th><th>In this product</th><th>Source</th></tr></thead><tbody>
  ${LEADERS.map((l) => `<tr><td><b style="font-weight:600">${l[0]}</b></td><td class="muted">${l[1]}</td><td>${l[2]}</td><td>${l[3]}</td><td><a href="${l[4]}" target="_blank" rel="noopener" class="tag" style="text-decoration:none">link ↗</a></td></tr>`).join('')}
  </tbody></table></div>
  <div class="callout" style="margin-top:12px"><b>Where this product aims to differ for a refinery:</b> footprints built from the refinery’s own meters per unit, an inspectable value chain from crude well to customer, cargo-level footprints, and full lineage from any result back to a meter tag.</div></div>`]);

/* =====================================================================
   Product metadata for the reused screens, module order, init
   ===================================================================== */
const META = {
  site: { group: 'Overview', icon: '◇', title: 'Site map', nav: 'Site map', sub: 'Every data collection point on the refinery. Click a pin for its feeds, emissions and data quality; play the month bar to move through the subscription.', actions: ['Export view'], rfp: ['C1', 'C2', 'C4a'] },
  scope: { group: 'Footprints', icon: '◎', title: 'Study setup', nav: 'Study setup', sub: 'Study PCF-' + (Y0 + 2) + ': functional unit, boundary, allocation and impact method. Changes are saved as a new study version.', actions: ['Compare versions', 'Save version'], rfp: ['C1', 'C5c'] },
  impact: { group: 'Footprints', icon: '▥', title: 'Emissions analysis', nav: 'Emissions analysis', sub: 'Weekly cradle-to-gate emissions by source. Click a bar to select a month, quarter or year; drag for any range.', actions: ['Export CSV'], rfp: ['C4c'] },
  scenarios: { group: 'Footprints', icon: '⑂', title: 'Scenarios', nav: 'Scenarios', sub: 'Decarbonisation what-ifs against the 2027 baseline. Scenario branches never overwrite measured data.', actions: ['Save as branch'], rfp: ['C5c', 'C4c'] },
  inventory: { group: 'Data', icon: '▤', title: 'Inventory', nav: 'Inventory', sub: 'Validated monthly data from all 18 collection points, with lineage, owner sign-off and frozen yearly versions.', actions: ['Upload template', 'Run validation'], rfp: ['C4a', 'C2'] },
  databases: { group: 'Data', icon: '⛁', title: 'Background databases', nav: 'Databases', sub: 'Datasets for everything outside the meters: crude, gas, grid, shipping, chemicals. Versions are pinned per study.', actions: ['Preview update impact'], rfp: ['C4b'] },
  reporting: { group: 'Outputs', icon: '▦', title: 'Reports', nav: 'Reports', sub: 'Footprint reports, EPDs, corporate GHG input and customer data exchange, each tied to a frozen inventory version.', actions: ['Schedule', 'New report'], rfp: ['C4c', 'C5a'] },
};
SECTIONS.forEach((s) => { if (META[s.id]) { Object.assign(s, META[s.id]); delete s.lead; } });
const ORDER = ['dashboard', 'control', 'site', 'products', 'studies', 'scope', 'model', 'formulas', 'runs', 'impact', 'scenarios', 'inventory', 'import', 'suppliers', 'integrations', 'databases', 'reporting', 'exchange', 'security', 'audit', 'operations', 'hse', 'contract', 'requirements', 'subscription'];
const STATUS = {
  control: [['mute', 'Optional: needs automated plant feeds (INT-05)']],
  site: [['mute', 'Live plant feeds optional (INT-05)'], ['warn', 'HSE policy not supplied (OD-13)']],
  products: [['warn', 'Product list to confirm (OD-02)']],
  studies: [['mute', 'Review & approval workflow optional (FR-068–069)']],
  scenarios: [['mute', 'Monte Carlo optional (FR-054)']],
  integrations: [['ink', 'Core: file import / export (INT-01–02)'], ['mute', 'Optional: automated interfaces (INT-04–05)'], ['warn', 'Target systems: OD-08']],
  databases: [['warn', 'Open decision OD-05: databases, editions, licence rights']],
  security: [['mute', 'SSO optional (FR-070)'], ['warn', 'Deployment and residency: OD-07']],
  operations: [['warn', 'Targets proposed; agree workloads and objectives (OD-11)']],
  subscription: [['warn', 'Licence, service levels and training are proposals (OD-06, OD-11, OD-12)']],
  formulas: [['warn', 'Methods and factor sets to agree (OD-04)']],
};
SECTIONS.forEach((s) => { if (STATUS[s.id]) s.status = STATUS[s.id]; s.reqs = REQS.filter((r) => r[2] === s.id).map((r) => r[0]); });
SECTIONS.sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
SECTIONS.splice(ORDER.length);

shell();
$('#tourBtn').addEventListener('click', tourStart);
addEventListener('scroll', () => { if (tourI >= 0) tourPlace($(TOUR[tourI][1])); }, { passive: true });
const start = SECTIONS.findIndex((s) => '#' + s.id === location.hash);
show(start >= 0 ? start : 0);
addEventListener('resize', () => { if (SECTIONS[state.sec].id === 'scope') drawScope(); });
})();
