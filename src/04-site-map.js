let playTimer = null;
sec({ id: 'site', group: 'The solution', title: 'Site landscape: every data collection point', nav: 'Site landscape', refs: ['App 1 · C1 Scope', 'C4 Data management', 'Three-year term'],
  lead: 'The refinery as the software sees it. Each numbered pin is a collection point where data enters the LCA model. Click a pin to see what it measures, which system feeds it, what it contributes and how its data has matured across the three contract years. Move the month bar or press play to run all 36 months.',
  render: () => `
  <div class="land-wrap">
    <div class="panel land">
      <div class="land-bar">
        <div class="seg" role="group" aria-label="Pin colour" id="pinMode">
          <button data-m="emis">Emissions</button><button data-m="data">Data status</button><button data-m="dq">Data quality</button>
        </div>
        <div class="seg" role="group" aria-label="Scope filter" id="layerSeg">
          <button data-l="all">All</button><button data-l="Scope 1">Scope 1</button><button data-l="Scope 2">Scope 2</button><button data-l="Scope 3">Scope 3</button>
        </div>
      </div>
      ${mapHTML('siteMap')}
      <div class="flex between" style="padding:2px 6px"><div class="legend" id="pinLegend"></div><span class="note" id="siteTotal"></span></div>
      <div class="scrub">
        <button class="scrub-play" id="play" aria-label="Play 36 months">▶</button>
        <div class="months"><div class="months-bars" id="mbars"></div><div class="months-yrs"><span>Year 1 · ${Y0}</span><span>Year 2 · ${Y0 + 1}</span><span>Year 3 · ${Y0 + 2}</span></div></div>
        <div class="scrub-label" id="mlabel"></div>
      </div>
    </div>
    <aside class="panel raised detail" id="detail" aria-live="polite">
      <div id="dHead"></div>
      <div id="dCard" class="st-mount"></div>
      <div id="dRest" class="stack"></div>
    </aside>
  </div>
  <div class="ph" style="margin:6px 0 -4px"><h3>Subscription years at a glance</h3><span class="note">Click a year to move the site map there</span></div>
  <div class="year-cards" id="yearCards"></div>`,
  after: () => {
    $$('#pinMode button').forEach((b) => b.addEventListener('click', () => { state.pinMode = b.dataset.m; drawPins(); }));
    $$('#layerSeg button').forEach((b) => b.addEventListener('click', () => { state.layer = b.dataset.l; drawPins(); }));
    const mb = $('#mbars');
    const mt = [...Array(36)].map((_, m) => monthTotal(m));
    const mx = Math.max(...mt);
    mb.innerHTML = mt.map((v, m) => `<i data-m="${m}" title="${monthLabel(m)} · ${fmtT(v)}" style="height:${(v / mx) * 100}%"></i>`).join('');
    mb.addEventListener('click', (e) => { const i = e.target.closest('i'); if (i) setMonth(+i.dataset.m); });
    $('#play').addEventListener('click', togglePlay);
    mountMap($('#siteMap'));
    drawPins(); drawDetail(true); drawYearCards();
  },
  onYear: () => { drawPins(); drawDetail(false); drawYearCards(); },
});
function setMonth(m) {
  state.month = m;
  const y = yearOf(m);
  if (y !== state.year) { state.year = y; applyChrome(); drawYearCards(); drawDetail(false); }
  drawPins(); drawDetailHead();
}
function togglePlay() {
  const btn = $('#play');
  if (playTimer) { clearInterval(playTimer); playTimer = null; btn.textContent = '▶'; return; }
  if (state.month >= 35) setMonth(0);
  btn.textContent = '❚❚';
  playTimer = setInterval(() => {
    if (!$('#play')) { clearInterval(playTimer); playTimer = null; return; }
    if (state.month >= 35) { togglePlay(); return; }
    setMonth(state.month + 1);
  }, 420);
}
function pinStyle(c, m) {
  if (state.pinMode === 'data') { const [k] = status(c.comp[m]); return { fill: `var(--${k === 'ok' ? 'upbg' : k === 'warn' ? 'warnbg' : 'downbg'})`, stroke: `var(--${k === 'ok' ? 'up' : k === 'warn' ? 'warn' : 'down'})` }; }
  if (state.pinMode === 'dq') { const d = dqr(c, yearOf(m)); const t = clamp((d - 1) / 2.2, 0, 1); return { fill: `color-mix(in srgb, var(--ink) ${Math.round(80 - t * 70)}%, var(--raised))`, stroke: 'var(--line2)', text: t < 0.45 ? 'var(--page)' : 'var(--ink)' }; }
  return { fill: CATS[c.cat].color, stroke: 'var(--line2)' };
}
function selectCP(id) { state.cp = id; drawPins(); if ($('#dHead')) drawDetail(true); if ($('.map-pop')) drawPop(); }
function drawDetailHead() {
  const c = CPI[state.cp], m = state.month, y = yearOf(m);
  const [k, l] = status(c.comp[m]);
  const yt = yearTotal(c, y);
  const site = sum(LIVE.filter((x) => x.cat !== 'down').map((x) => yearTotal(x, y)));
  $('#dHead').innerHTML = `<div class="detail-head">
    <div class="flex"><span class="tag">CP-${c.id}</span><span class="tag" style="background:transparent;box-shadow:inset 0 0 0 1px var(--line2)"><i class="dot" style="background:${CATS[c.cat].color}"></i>${esc(CATS[c.cat].short)}</span><span class="badge ${k}">${l}</span></div>
    <h3>${esc(c.name)}</h3>
    <div class="note">${esc(c.scope)} · ${esc(c.stage)} · ${esc(c.gases)}</div>
    <div class="grid g2" style="margin-top:6px;gap:10px">
      ${c.cat === 'data' ? kpi(pct(c.comp[m]), `Data completeness · ${monthLabel(m)}`) + kpi(`${c.feeds.length} feeds`, 'Allocation keys for every product') : kpi(fmtT(c.monthly[m]), `CO₂e · ${monthLabel(m)}`) + kpi(fmtT(yt), `Year ${y} · ${c.cat === 'down' ? 'outside cradle-to-gate' : pct(yt / site, 1) + ' of cradle-to-gate'}`)}
    </div></div>`;
}
function drawDetail(remountCard) {
  drawDetailHead();
  const c = CPI[state.cp], y = state.year;
  if (remountCard) {
    ST.splice(0).forEach((x) => { try { x.destroy(); } catch { /* gone */ } });
    const el = $('#dCard'); el.innerHTML = ''; el.classList.toggle('inv', c.cat !== 'data');
    if (strataReady()) {
      const isData = c.cat === 'data';
      const rows = [...Array(36)].map((_, m) => ({ date: iso(Y0 + Math.floor(m / 12), m % 12), v: isData ? c.comp[m] : c.monthly[m], comp: c.comp[m] }));
      Strata.mountCard(el, { data: rows, time: 'date', columns: { v: 'v' }, series: [{ key: 'v', label: isData ? 'Completeness' : 'tCO₂e', color: isData ? undefined : catColor(c.cat === 'data' ? 'up' : c.cat) }],
        kind: isData ? 'percent' : 'number', metric: isData ? 'mean' : 'sum', style: isData ? 'line' : 'bars', title: isData ? 'Data completeness by month' : 'Monthly emissions · 36 months', label: isData ? 'Average' : 'tCO₂e in period',
        periods: ['quarter', 'year'], period: 'year', tools: [], icon: false, theme: state.palette, mode: strataMode(), height: 96, panel: true })
        .then(track).catch((e) => { el.textContent = 'Chart unavailable: ' + e.message; });
    }
  }
  const auto = c.auto[y - 1];
  const yc = (yy) => sum(c.comp.slice((yy - 1) * 12, yy * 12)) / 12;
  const flags = (yy) => sum(c.flags.slice((yy - 1) * 12, yy * 12));
  const ped = c.ped.map((p) => clamp(Math.round(p - (y - 1) * (p > 1 ? 0.5 : 0)), 1, 5));
  $('#dRest').innerHTML = `
    <div><div class="eyebrow" style="margin-bottom:6px">Data maturity at this point, by year</div>
      <div class="yr3">${[1, 2, 3].map((yy) => `<div class="${yy === y ? 'is-cur' : ''}"><em>YEAR ${yy}</em><b>${pct(yc(yy))}</b><span class="note">complete · ${pct(c.auto[yy - 1])} automated · ${flags(yy)} flags</span></div>`).join('')}</div></div>
    <div><div class="eyebrow" style="margin-bottom:4px">Data feeds into the model</div>
      <div class="scroll-x"><table class="tbl feeds"><thead><tr><th>Tag</th><th>Source</th><th>Freq.</th><th>Method</th></tr></thead><tbody>
      ${c.feeds.map((f) => `<tr><td><b style="font-weight:600">${f[0]}</b><div class="note">${esc(f[4])}</div></td><td>${esc(f[1])}</td><td>${f[2]}</td><td>${f[3]}</td></tr>`).join('')}
      </tbody></table></div></div>
    <div><div class="eyebrow" style="margin-bottom:6px">Data quality (pedigree, 1 = best) · Year ${y}</div>
      <div class="pedigree">${['Reliability', 'Completeness', 'Temporal', 'Geographical', 'Technological'].map((n, i) => `<div class="ped-row"><span>${n}</span><span class="ped-dots">${[1, 2, 3, 4, 5].map((d) => `<i class="${d <= 6 - ped[i] ? 'on' : ''}"></i>`).join('')}</span><b>${ped[i]}</b></div>`).join('')}</div>
      <p class="note" style="margin-top:6px">DQR ${fmtN(dqr(c, y), 1)} · automation ${pct(auto)} · ${auto > .9 ? 'feeds stream from source systems' : auto > .6 ? 'mix of streamed and uploaded data' : 'mostly templates and surveys, owner sign-off required'}</p></div>
    <div><div class="eyebrow" style="margin-bottom:4px">In the LCA model</div>
      <table class="tbl"><tbody>
        <tr><td class="muted">Process</td><td>${esc(c.model)}</td></tr>
        <tr><td class="muted">Factor / method</td><td>${esc(c.ef)}</td></tr>
        <tr><td class="muted">Boundary</td><td>${c.cat === 'down' ? 'Cradle-to-customer and cradle-to-grave only' : c.cat === 'up' ? 'Cradle-to-gate and wider' : c.cat === 'data' ? 'Allocation in every boundary' : 'Every boundary (gate-to-gate and wider)'}</td></tr>
      </tbody></table></div>
    ${state.rfp ? `<div class="flex"><span class="eyebrow">RFP</span>${critChips(c.crit)}</div>` : ''}`;
  $$('#dRest [data-goto]').forEach((b) => b.addEventListener('click', () => goto(b.dataset.goto)));
}
function drawYearCards() {
  const el = $('#yearCards'); if (!el) return;
  const site = (y) => sum(LIVE.filter((c) => c.cat !== 'down').map((c) => yearTotal(c, y)));
  const comp = (y) => sum(CPS.map((c) => sum(c.comp.slice((y - 1) * 12, y * 12)) / 12)) / CPS.length;
  const auto = (y) => sum(CPS.map((c) => c.auto[y - 1])) / CPS.length;
  const D = {
    1: { close: '45 days', pcf: '7 baseline PCFs', users: '24 trained', review: 'ISO 14071 critical review of baseline', rel: 'v4.1 → v4.4' },
    2: { close: '18 days', pcf: '7 PCFs + 2 EPDs', users: '41 trained', review: 'EPDs third-party verified', rel: 'v4.5 → v4.8' },
    3: { close: '6 days', pcf: 'Monthly PCFs (84)', users: '58 trained', review: 'Annual re-verification', rel: 'v4.9 → v5.2' },
  };
  el.innerHTML = [1, 2, 3].map((y) => {
    const t = site(y), d = y > 1 ? t / site(1) - 1 : null;
    return `<button class="panel year-card" data-y="${y}" aria-pressed="${y === state.year}" style="text-align:left;font:inherit;color:inherit">
      <div class="flex between"><span class="eyebrow">Contract year ${y} · ${Y0 + y - 1}</span>${y === 1 ? '<span class="badge mute">Baseline</span>' : `<span class="badge ok">${sgn(d)} vs Y1</span>`}</div>
      <div class="kpi" style="margin-top:8px"><b>${fmtT(t)}</b><span>Cradle-to-gate CO₂e (sample site)</span></div>
      <div class="ycard-rows">
        <div class="ycard-row"><span>Data completeness</span><b>${pct(comp(y))}</b></div>
        <div class="bar-track thin"><i style="width:${comp(y) * 100}%"></i></div>
        <div class="ycard-row"><span>Automated feeds</span><b>${pct(auto(y))}</b></div>
        <div class="bar-track thin"><i style="width:${auto(y) * 100}%"></i></div>
        <div class="ycard-row"><span>Annual inventory close</span><b>${D[y].close}</b></div>
        <div class="ycard-row"><span>Footprints issued</span><b>${D[y].pcf}</b></div>
        <div class="ycard-row"><span>Users</span><b>${D[y].users}</b></div>
        <div class="ycard-row"><span>Assurance</span><b style="text-align:right">${D[y].review}</b></div>
        <div class="ycard-row"><span>Releases (support &amp; maintenance)</span><b>${D[y].rel}</b></div>
      </div></button>`;
  }).join('');
  $$('.year-card', el).forEach((b) => b.addEventListener('click', () => setYear(+b.dataset.y)));
}
