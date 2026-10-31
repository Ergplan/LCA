(() => {
'use strict';

/* =====================================================================
   Helpers
   ===================================================================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtN = (v, d = 0) => (Number.isFinite(v) ? v.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d }) : '–');
const fmtT = (v) => {
  const a = Math.abs(v);
  if (!Number.isFinite(v)) return '–';
  if (a >= 1e6) return fmtN(v / 1e6, 2) + ' Mt';
  if (a >= 1e4) return fmtN(v / 1e3, 0) + ' kt';
  if (a >= 1e3) return fmtN(v / 1e3, 1) + ' kt';
  return fmtN(v, 0) + ' t';
};
const pct = (v, d = 0) => fmtN(v * 100, d) + '%';
const sgn = (v, d = 1) => (v > 0 ? '+' : v < 0 ? '−' : '') + fmtN(Math.abs(v * 100), d) + '%';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sum = (a) => a.reduce((s, x) => s + x, 0);
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const store = { get(k) { try { return localStorage.getItem('lcaw:' + k); } catch { return null; } }, set(k, v) { try { localStorage.setItem('lcaw:' + k, v); } catch { /* storage unavailable */ } } };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const Y0 = 2027; // illustrative first contract year
const monthLabel = (m) => `${MONTHS[m % 12]} ${Y0 + Math.floor(m / 12)}`;
const yearOf = (m) => Math.floor(m / 12) + 1;
const daysIn = (m) => new Date(Date.UTC(Y0 + Math.floor(m / 12), (m % 12) + 1, 0)).getUTCDate();
const iso = (y, mo, d = 1) => `${y}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/* =====================================================================
   Domain data (illustrative): ADNOC Refining-type coastal refinery
   ===================================================================== */
const CATS = {
  up:    { label: 'Upstream crude & inputs', short: 'Upstream', scope: 'Scope 3', color: 'var(--c-up)', hex: { light: '#a7a7ae', dark: '#6d6d74' } },
  fire:  { label: 'Fired heaters & cogeneration', short: 'Combustion', scope: 'Scope 1', color: 'var(--c-fire)', hex: { light: '#6f6f75', dark: '#a3a3aa' } },
  proc:  { label: 'Process CO₂ (SMR, FCC, SRU)', short: 'Process', scope: 'Scope 1', color: 'var(--c-proc)', hex: { light: '#a99ff0', dark: '#9085e9' } },
  flare: { label: 'Flaring & fugitives', short: 'Flare/fugitive', scope: 'Scope 1', color: 'var(--c-flare)', hex: { light: '#e3a64a', dark: '#f0b45a' } },
  elec:  { label: 'Purchased electricity', short: 'Electricity', scope: 'Scope 2', color: 'var(--c-elec)', hex: { light: '#5fb7e6', dark: '#5aaee0' } },
  down:  { label: 'Downstream distribution', short: 'Downstream', scope: 'Scope 3', color: 'var(--c-down)', hex: { light: '#d9d9d6', dark: '#3a3a3c' } },
  data:  { label: 'Property data (no emissions)', short: 'Data only', scope: '—', color: 'var(--faint)', hex: { light: '#c4c4c2', dark: '#4a4a49' } },
};
const CAT_ORDER = ['up', 'fire', 'proc', 'flare', 'elec'];

// sys: AVEVA PI historian · SAP S/4HANA · LIMS · CEMS · LDAR · Flare meter · Manual template
const CPS = [
  { id: '01', name: 'Crude receipt & custody metering', cat: 'up', scope: 'Scope 3 · Cat 1', stage: 'Upstream (cradle)', annual: 2400000, trend: [1, .985, .96], season: .02, gases: 'CO₂, CH₄, N₂O',
    feeds: [['FQI-0101', 'AVEVA PI', '1 min', 'Measured', 'Crude receipt flow (custody transfer)'], ['CRD-MIX', 'SAP S/4HANA MM', 'Per cargo', 'Measured', 'Crude grade & supplier mix'], ['CI-UPS', 'Supplier data', 'Annual', 'Calculated', 'Upstream carbon intensity per crude grade']],
    ef: 'Supplier-specific crude carbon intensity; fallback ecoinvent 3.10 crude, Middle East', model: 'Crude supply mix → refinery inlet', ped: [2, 2, 2, 2, 3], c0: .62, ramp: 7, auto: [.55, .8, .92], crit: ['C4', 'C4b'] },
  { id: '02', name: 'Crude tank farm', cat: 'flare', scope: 'Scope 1', stage: 'Core (gate-to-gate)', annual: 18000, trend: [1, .85, .7], season: .08, gases: 'CH₄, VOC',
    feeds: [['LDAR-TF1', 'LDAR survey', 'Quarterly', 'Measured', 'Leak survey, component counts'], ['LT-2xx', 'AVEVA PI', '5 min', 'Measured', 'Tank levels & throughput']],
    ef: 'API compendium tank emission factors, LDAR-adjusted', model: 'Storage losses (crude)', ped: [3, 3, 2, 1, 2], c0: .5, ramp: 10, auto: [.3, .6, .75], crit: ['C4', 'C2'] },
  { id: '03', name: 'Crude & vacuum distillation (CDU/VDU)', cat: 'fire', scope: 'Scope 1', stage: 'Core (gate-to-gate)', annual: 820000, trend: [1, .98, .95], season: .015, gases: 'CO₂, CH₄, N₂O',
    feeds: [['FI-03F1', 'AVEVA PI', '1 min', 'Measured', 'Fuel gas to heaters H-301/302'], ['AI-03C', 'LIMS', 'Daily', 'Measured', 'Fuel gas composition (carbon content)'], ['CEMS-03', 'CEMS', '1 min', 'Measured', 'Stack CO₂ / O₂ check']],
    ef: 'Mass balance on measured fuel carbon (tier 3)', model: 'Atmospheric + vacuum distillation', ped: [1, 1, 1, 1, 1], c0: .82, ramp: 4, auto: [.85, .95, .98], crit: ['C4', 'C3d'] },
  { id: '04', name: 'Hydrocracker', cat: 'fire', scope: 'Scope 1', stage: 'Core (gate-to-gate)', annual: 540000, trend: [1, .99, .96], season: .015, gases: 'CO₂',
    feeds: [['FI-04F1', 'AVEVA PI', '1 min', 'Measured', 'Fuel gas to reactor heaters'], ['FI-04H2', 'AVEVA PI', '1 min', 'Measured', 'Hydrogen make-up (links to CP-07)'], ['JI-04', 'AVEVA PI', '15 min', 'Measured', 'Compressor & pump power']],
    ef: 'Measured fuel carbon; H₂ from internal SMR model', model: 'Hydrocracking (diesel/jet)', ped: [1, 1, 1, 1, 1], c0: .8, ramp: 4, auto: [.8, .95, .98], crit: ['C4'] },
  { id: '05', name: 'Residue FCC & regenerator', cat: 'proc', scope: 'Scope 1', stage: 'Core (gate-to-gate)', annual: 760000, trend: [1, .99, .97], season: .01, gases: 'CO₂, N₂O', ta: [17, .42],
    feeds: [['FI-05AIR', 'AVEVA PI', '1 min', 'Measured', 'Regenerator air rate'], ['AI-05FG', 'CEMS', '1 min', 'Measured', 'Flue gas CO₂/CO/O₂'], ['LIMS-COKE', 'LIMS', 'Daily', 'Calculated', 'Coke burn (carbon on catalyst)']],
    ef: 'Coke burn by flue-gas analysis (tier 3)', model: 'Fluid catalytic cracking (gasoline, LPG)', ped: [1, 1, 1, 1, 2], c0: .75, ramp: 5, auto: [.75, .92, .97], crit: ['C4', 'C5c'] },
  { id: '06', name: 'Naphtha reformer (CCR)', cat: 'fire', scope: 'Scope 1', stage: 'Core (gate-to-gate)', annual: 310000, trend: [1, .99, .97], season: .015, gases: 'CO₂',
    feeds: [['FI-06F1', 'AVEVA PI', '1 min', 'Measured', 'Fuel gas to reformer heaters'], ['FI-06H2', 'AVEVA PI', '1 min', 'Measured', 'Hydrogen by-product (credit)']],
    ef: 'Measured fuel carbon; H₂ co-product by system expansion', model: 'Catalytic reforming (aromatics, H₂)', ped: [1, 1, 1, 1, 1], c0: .8, ramp: 4, auto: [.8, .95, .98], crit: ['C4', 'C5c'] },
  { id: '07', name: 'Hydrogen plant (SMR)', cat: 'proc', scope: 'Scope 1', stage: 'Core (gate-to-gate)', annual: 690000, trend: [1, 1, .97], season: .01, gases: 'CO₂, CH₄',
    feeds: [['FI-07NG', 'AVEVA PI', '1 min', 'Measured', 'Natural gas feed + fuel'], ['AI-07NG', 'LIMS', 'Daily', 'Measured', 'Gas composition'], ['FI-07H2', 'AVEVA PI', '1 min', 'Measured', 'Hydrogen product']],
    ef: 'Feed + fuel carbon balance; process vs combustion CO₂ split', model: 'Steam methane reforming', ped: [1, 1, 1, 1, 1], c0: .85, ramp: 3, auto: [.85, .96, .99], crit: ['C4', 'C5c'] },
  { id: '08', name: 'Sulphur recovery & tail-gas incinerator', cat: 'proc', scope: 'Scope 1', stage: 'Core (gate-to-gate)', annual: 95000, trend: [1, .99, .98], season: .01, gases: 'CO₂, SO₂ (non-GHG)',
    feeds: [['FI-08AG', 'AVEVA PI', '1 min', 'Measured', 'Acid gas feed'], ['CEMS-08', 'CEMS', '1 min', 'Measured', 'Incinerator stack'], ['SAP-S', 'SAP S/4HANA', 'Daily', 'Measured', 'Sulphur production (co-product)']],
    ef: 'Incinerator fuel + acid-gas CO₂ slip', model: 'Claus SRU + TGTU', ped: [2, 1, 1, 1, 2], c0: .7, ramp: 5, auto: [.7, .9, .96], crit: ['C4', 'C2'] },
  { id: '09', name: 'Cogeneration & boilers (power + steam)', cat: 'fire', scope: 'Scope 1', stage: 'Core (gate-to-gate)', annual: 1150000, trend: [1, .97, .93], season: .05, gases: 'CO₂, CH₄, N₂O',
    feeds: [['FI-09GT', 'AVEVA PI', '1 min', 'Measured', 'Gas turbine fuel (GT-1..3)'], ['JI-09', 'AVEVA PI', '15 min', 'Measured', 'Net power generated'], ['FI-09ST', 'AVEVA PI', '1 min', 'Measured', 'HP / MP steam export by header']],
    ef: 'Measured fuel; power/steam split by exergy to consuming units', model: 'Utilities (allocated to units by metered steam & power)', ped: [1, 1, 1, 1, 1], c0: .85, ramp: 3, auto: [.85, .96, .99], crit: ['C4', 'C5c'] },
  { id: '10', name: 'Grid import & on-site solar', cat: 'elec', scope: 'Scope 2', stage: 'Core (gate-to-gate)', annual: 160000, trend: [1, .82, .62], season: .12, gases: 'CO₂e',
    feeds: [['EM-10IN', 'Utility meter', '15 min', 'Measured', 'Grid import (MWh)'], ['EM-10PV', 'SCADA', '15 min', 'Measured', 'Solar PV generation'], ['CEC', 'Certificates', 'Annual', 'Documented', 'Clean energy certificates (market-based)']],
    ef: 'UAE grid location-based factor + market-based instruments', model: 'Purchased electricity', ped: [1, 1, 2, 1, 2], c0: .9, ramp: 2, auto: [.9, .97, .99], crit: ['C4', 'C4b'] },
  { id: '11', name: 'Flare system', cat: 'flare', scope: 'Scope 1', stage: 'Core (gate-to-gate)', annual: 240000, trend: [1, .78, .55], season: .06, gases: 'CO₂, CH₄', ta: [17, 2.1],
    feeds: [['FI-11U', 'Flare meter', '1 min', 'Measured', 'Ultrasonic flare gas flow'], ['AI-11', 'LIMS', 'Weekly', 'Measured', 'Flare gas composition'], ['FGRU', 'AVEVA PI', '1 min', 'Measured', 'Flare gas recovery unit throughput']],
    ef: 'Measured flow × composition; combustion efficiency 98%', model: 'Flaring (routine / non-routine)', ped: [2, 2, 1, 1, 2], c0: .6, ramp: 8, auto: [.6, .85, .95], crit: ['C4', 'C2'] },
  { id: '12', name: 'Seawater cooling & intake pumps', cat: 'elec', scope: 'Scope 2', stage: 'Core (gate-to-gate)', annual: 48000, trend: [1, .84, .65], season: .2, gases: 'CO₂e',
    feeds: [['EM-12', 'Sub-meter', '15 min', 'Measured', 'Pump power'], ['FI-12SW', 'AVEVA PI', '5 min', 'Measured', 'Seawater flow & ΔT (cooling duty allocation)']],
    ef: 'Sub-metered power × grid factor', model: 'Cooling utility (allocated by duty)', ped: [1, 2, 1, 1, 2], c0: .7, ramp: 6, auto: [.6, .85, .95], crit: ['C4'] },
  { id: '13', name: 'Wastewater treatment', cat: 'flare', scope: 'Scope 1', stage: 'Core (gate-to-gate)', annual: 22000, trend: [1, .97, .94], season: .1, gases: 'CH₄, N₂O',
    feeds: [['FI-13', 'AVEVA PI', '15 min', 'Measured', 'Influent flow'], ['LIMS-COD', 'LIMS', 'Daily', 'Measured', 'COD / nitrogen load']],
    ef: 'IPCC 2019 wastewater method (tier 2)', model: 'Effluent treatment', ped: [3, 2, 2, 2, 3], c0: .55, ramp: 9, auto: [.4, .7, .85], crit: ['C4', 'C2'] },
  { id: '14', name: 'Product tank farm', cat: 'flare', scope: 'Scope 1', stage: 'Core (gate-to-gate)', annual: 15000, trend: [1, .86, .72], season: .1, gases: 'CH₄, VOC',
    feeds: [['LDAR-TF2', 'LDAR survey', 'Quarterly', 'Measured', 'Leak survey'], ['TK-INV', 'SAP S/4HANA', 'Daily', 'Measured', 'Product inventory & movements']],
    ef: 'API compendium, LDAR-adjusted', model: 'Storage losses (products)', ped: [3, 3, 2, 1, 2], c0: .5, ramp: 10, auto: [.3, .6, .75], crit: ['C4'] },
  { id: '15', name: 'Marine export jetty', cat: 'down', scope: 'Scope 3 · Cat 9', stage: 'Downstream (gate-to-customer)', annual: 180000, trend: [1, .99, .97], season: .03, gases: 'CO₂, CH₄, VOC',
    feeds: [['SAP-SHIP', 'SAP S/4HANA', 'Per cargo', 'Measured', 'Cargo, destination, vessel IMO'], ['VRU-15', 'AVEVA PI', '1 min', 'Measured', 'Vapour recovery during loading']],
    ef: 'Voyage-based (distance × vessel class); GLEC framework', model: 'Product shipping to first customer port', ped: [2, 2, 2, 3, 2], c0: .7, ramp: 6, auto: [.5, .75, .9], crit: ['C4', 'C4c'] },
  { id: '16', name: 'Truck loading & distribution', cat: 'down', scope: 'Scope 3 · Cat 9', stage: 'Downstream (gate-to-customer)', annual: 60000, trend: [1, .98, .95], season: .03, gases: 'CO₂',
    feeds: [['SAP-TRK', 'SAP S/4HANA', 'Per load', 'Measured', 'Loads, destinations'], ['GATE', 'Terminal system', 'Per load', 'Measured', 'Gantry metered volumes']],
    ef: 'Tonne-km × road freight factor (GLEC)', model: 'Domestic product distribution', ped: [2, 2, 2, 2, 3], c0: .65, ramp: 7, auto: [.5, .75, .9], crit: ['C4'] },
  { id: '17', name: 'Chemicals & catalyst store', cat: 'up', scope: 'Scope 3 · Cat 1', stage: 'Upstream (cradle)', annual: 85000, trend: [1, .99, .98], season: .05, gases: 'CO₂e',
    feeds: [['SAP-MM', 'SAP S/4HANA MM', 'Monthly', 'Measured', 'Purchased catalysts, amines, caustic'], ['EPD-SUP', 'Supplier EPDs', 'Annual', 'Documented', 'Supplier-specific footprints']],
    ef: 'Supplier EPDs where available; ecoinvent 3.10 otherwise', model: 'Ancillary materials', ped: [3, 2, 3, 3, 3], c0: .5, ramp: 12, auto: [.2, .5, .7], crit: ['C4', 'C4b'] },
  { id: '18', name: 'Laboratory (LIMS) — product properties', cat: 'data', scope: 'Allocation driver', stage: 'All stages', annual: 0, trend: [1, 1, 1], season: 0, gases: '—',
    feeds: [['LIMS-LHV', 'LIMS', 'Per batch', 'Measured', 'Heating value (LHV) by product'], ['LIMS-DEN', 'LIMS', 'Per batch', 'Measured', 'Density, sulphur'], ['SAP-PRC', 'SAP S/4HANA', 'Monthly', 'Measured', 'Product prices (economic allocation)']],
    ef: 'Not an emission source: drives energy, mass and economic allocation', model: 'Allocation keys', ped: [1, 1, 1, 1, 1], c0: .8, ramp: 3, auto: [.8, .95, .99], crit: ['C4', 'C5c'] },
];
const CPI = Object.fromEntries(CPS.map((c) => [c.id, c]));

// Monthly emissions & completeness per collection point (36 months)
(function build() {
  CPS.forEach((c, k) => {
    const r = rng(101 + k * 37);
    c.monthly = [];
    c.comp = [];
    c.flags = [];
    for (let m = 0; m < 36; m++) {
      const y = yearOf(m) - 1;
      const yf = c.trend[y] + (c.trend[Math.min(2, y + 1)] - c.trend[y]) * ((m % 12) / 12) * 0.5;
      const seas = 1 + c.season * Math.sin(((m % 12) - 3) / 12 * 2 * Math.PI);
      let v = (c.annual / 12) * yf * seas * (1 + (r() - 0.5) * 0.06) * (daysIn(m) / 30.4);
      if (c.ta && m === c.ta[0]) v *= c.ta[1]; // turnaround month (FCC down, flare up)
      c.monthly.push(v);
      const base = c.c0 + (1 - c.c0) * Math.min(1, m / c.ramp);
      c.comp.push(clamp(base - r() * 0.025 * (m < c.ramp ? 2 : 1) + (m > c.ramp ? 0.012 : 0), 0, 1));
      c.flags.push(Math.max(0, Math.round((1 - base) * 18 + r() * 2.2 - 0.6)));
    }
  });
})();
const LIVE = CPS.filter((c) => c.cat !== 'data');
const monthTotal = (m, filt = (c) => c.cat !== 'down') => sum(LIVE.filter(filt).map((c) => c.monthly[m]));
const yearTotal = (c, y) => sum(c.monthly.slice((y - 1) * 12, y * 12));
const status = (v) => (v >= 0.98 ? ['ok', 'Live'] : v >= 0.9 ? ['warn', 'Partial'] : ['bad', 'Gaps']);
const dqr = (c, y) => { const adj = [0, -0.25, -0.5][y - 1]; return clamp(sum(c.ped) / 5 + adj * (sum(c.ped) / 5 > 1.2 ? 1 : 0), 1, 5); };

// Products (illustrative annual slate)
const PRODUCTS = [
  { k: 'gas', name: 'Gasoline', kt: 4200, lhv: 43.4, price: 780, tbbl: .118, sub: 1.22, use: 3170, mix: { up: .30, fire: .26, proc: .30, flare: .07, elec: .07 } },
  { k: 'jet', name: 'Jet / kerosene', kt: 3600, lhv: 43.2, price: 760, tbbl: .127, sub: .92, use: 3160, mix: { up: .42, fire: .30, proc: .16, flare: .06, elec: .06 } },
  { k: 'dsl', name: 'Diesel (ULSD)', kt: 6800, lhv: 42.8, price: 720, tbbl: .134, sub: 1.08, use: 3190, mix: { up: .36, fire: .30, proc: .23, flare: .05, elec: .06 } },
  { k: 'lpg', name: 'LPG', kt: 1100, lhv: 46.0, price: 520, tbbl: .087, sub: .85, use: 3000, mix: { up: .38, fire: .22, proc: .28, flare: .07, elec: .05 } },
  { k: 'nap', name: 'Naphtha', kt: 2300, lhv: 44.0, price: 600, tbbl: .111, sub: .72, use: 3250, mix: { up: .52, fire: .28, proc: .08, flare: .06, elec: .06 } },
  { k: 'fo', name: 'Fuel oil', kt: 1400, lhv: 40.5, price: 420, tbbl: .155, sub: .78, use: 3150, mix: { up: .55, fire: .27, proc: .07, flare: .06, elec: .05 } },
  { k: 'sul', name: 'Sulphur', kt: 900, lhv: 9.2, price: 120, tbbl: null, sub: .35, use: 0, mix: { up: .10, fire: .20, proc: .55, flare: .05, elec: .10 } },
];
const ALLOC = {
  mass: { label: 'Mass', note: 'Physical: share by tonnes produced' },
  energy: { label: 'Energy (LHV)', note: 'Default for fuels: share by heating value (LIMS)' },
  economic: { label: 'Economic', note: 'Share by product revenue (SAP prices)' },
  subdiv: { label: 'Unit sub-division', note: 'Process-unit level: each unit’s load traced to the products it makes' },
};
const BOUNDS = {
  g2g: { label: 'Gate-to-gate', note: 'Site only (Scope 1 + 2)', inc: (c) => ['fire', 'proc', 'flare', 'elec'].includes(c.cat) },
  c2g: { label: 'Cradle-to-gate', note: 'Default for product carbon footprints (ISO 14067)', inc: (c) => c.cat !== 'down' },
  c2c: { label: 'Cradle-to-customer', note: 'Adds export shipping & distribution', inc: () => true },
  c2gr: { label: 'Cradle-to-grave', note: 'Adds combustion of fuels at use', inc: () => true },
};
const FUNITS = { t: { label: 'per tonne', unit: 'kg CO₂e/t' }, mj: { label: 'per MJ (LHV)', unit: 'g CO₂e/MJ' }, bbl: { label: 'per barrel', unit: 'kg CO₂e/bbl' } };

function pcf({ year = 3, alloc = 'energy', bound = 'c2g', fu = 't', override = null } = {}) {
  const inc = BOUNDS[bound].inc;
  const catTot = {};
  LIVE.forEach((c) => { if (inc(c)) catTot[c.cat] = (catTot[c.cat] || 0) + (override ? override(c, year) : yearTotal(c, year)); });
  const E = sum(Object.values(catTot));
  const w = PRODUCTS.map((p) => (alloc === 'mass' ? p.kt : alloc === 'energy' ? p.kt * p.lhv : alloc === 'economic' ? p.kt * p.price : p.kt * p.sub));
  const W = sum(w);
  return { E, catTot, rows: PRODUCTS.map((p, i) => {
    let kgt = (E * w[i] / W) / p.kt;
    if (bound === 'c2gr') kgt += p.use;
    const val = fu === 't' ? kgt : fu === 'mj' ? (p.k === 'sul' ? NaN : kgt / p.lhv) : p.tbbl ? kgt * p.tbbl : NaN;
    return { ...p, kgt, val };
  }) };
}

/* =====================================================================
   Isometric refinery landscape (SVG)
   ===================================================================== */
const S = 13, CO = 0.8660254, OX = 600, OY = 150;
// K spreads the site: unit centres, roads, pipes and vehicle paths move apart by K; each unit keeps its own size.
const K = 1.6;
let SH = [0, 0];
const P = (x, y, z = 0) => { const X = x + SH[0], Y = y + SH[1]; return [OX + (X - Y) * CO * S, OY + (X + Y) * 0.5 * S - z * S]; };
function withShift(sh, fn) { const s = SH; SH = sh; try { return fn(); } finally { SH = s; } }
const PW = (x, y, z = 0) => withShift([0, 0], () => P(x * K, y * K, z));
const assetShift = (id) => { const a = ASSETS[id].pad; return [(a[0] + a[2] / 2) * (K - 1), (a[1] + a[3] / 2) * (K - 1)]; };
const PA = (id, x, y, z = 0) => withShift(assetShift(id), () => P(x, y, z));
const pts = (a) => a.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ');
const poly = (a, fill, extra = '') => `<polygon points="${pts(a)}" fill="${fill}" stroke="var(--iso-edge)" stroke-width=".6" stroke-linejoin="round" ${extra}/>`;
function box(x, y, z, w, d, h, o = {}) {
  const top = o.top || 'var(--iso-top)', L = o.l || 'var(--iso-l)', R = o.r || 'var(--iso-r)';
  return poly([P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)], L)
    + poly([P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)], R)
    + poly([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)], top);
}
function cyl(x, y, z, r, h, o = {}) {
  const [cx, b] = P(x, y, z), [, t] = P(x, y, z + h);
  const rx = 1.2247 * r * S, ry = 0.7071 * r * S;
  const f = (n) => n.toFixed(1);
  const L = o.l || 'var(--iso-l)', R = o.r || 'var(--iso-r)', T = o.top || 'var(--iso-top)';
  return `<path d="M${f(cx - rx)},${f(t)} L${f(cx - rx)},${f(b)} A${f(rx)},${f(ry)} 0 0 0 ${f(cx)},${f(b + ry)} L${f(cx)},${f(t + ry)} A${f(rx)},${f(ry)} 0 0 1 ${f(cx - rx)},${f(t)} Z" fill="${L}" stroke="var(--iso-edge)" stroke-width=".6"/>`
    + `<path d="M${f(cx)},${f(t + ry)} L${f(cx)},${f(b + ry)} A${f(rx)},${f(ry)} 0 0 0 ${f(cx + rx)},${f(b)} L${f(cx + rx)},${f(t)} A${f(rx)},${f(ry)} 0 0 1 ${f(cx)},${f(t + ry)} Z" fill="${R}" stroke="var(--iso-edge)" stroke-width=".6"/>`
    + `<ellipse cx="${f(cx)}" cy="${f(t)}" rx="${f(rx)}" ry="${f(ry)}" fill="${T}" stroke="var(--iso-edge)" stroke-width=".6"/>`;
}
const pad = (x, y, w, d) => [P(x, y, 0), P(x + w, y, 0), P(x + w, y + d, 0), P(x, y + d, 0)];
const line = (a, cls) => `<polyline class="${cls}" points="${pts(a.map(([x, y]) => P(x, y, 0.12)))}"/>`;

// Each asset: footprint pad, primitives (painter-sorted), pin anchor [x, y, z]
const ASSETS = {
  '01': { pad: [0.6, 0.6, 3.4, 2.8], pin: [1.8, 1.9, 1.3], draw: () => box(1, 1, 0, 2.5, 2, 1.2) + cyl(3.1, 2.6, 1.2, .25, .9) },
  '02': { pad: [4.2, 0.8, 7.6, 7.6], pin: [8, 4.6, 2.3], draw: () => [[6, 2.6], [10, 2.6], [6, 6.6], [10, 6.6]].map(([x, y]) => cyl(x, y, 0, 1.6, 2.2)).join('') },
  '03': { pad: [13.6, 0.8, 6.6, 5.6], pin: [16.6, 3.4, 8.4], draw: () => box(14, 1, 0, 3, 2.5, 2.4) + box(14.6, 4, 0, 2.2, 1.8, 1.2) + cyl(19, 2.2, 0, .75, 8) + cyl(18.8, 5.1, 0, 1, 5.5) },
  '04': { pad: [22.6, 0.8, 5.8, 6.6], pin: [25.4, 3.8, 6.6], draw: () => box(23, 1, 0, 3.6, 2.6, 1.4) + cyl(27.6, 2.4, 0, .6, 6) + cyl(24.2, 5.4, 0, .8, 4.5) + cyl(26.2, 5.6, 0, .8, 4.5) },
  '05': { pad: [13.6, 8.6, 6.6, 5.2], pin: [16.6, 11, 9.6], draw: () => box(14, 9, 0, 3, 3, 5.5) + cyl(18.6, 10.2, 0, 1.3, 6.5) + cyl(15.8, 13, 0, .35, 9) },
  '06': { pad: [20.6, 8.6, 5.6, 5.2], pin: [23.2, 10.6, 4.2], draw: () => box(21, 9, 0, 4, 2, 2.2) + cyl(22, 12.6, 0, .6, 3.4) + cyl(23.6, 12.6, 0, .6, 3.4) + cyl(25.2, 12.6, 0, .6, 3.4) },
  '07': { pad: [26.6, 8.6, 5.6, 5.0], pin: [29, 11, 8.6], draw: () => box(27, 9, 0, 3.4, 4, 3) + cyl(31.2, 10.2, 0, .4, 8) },
  '08': { pad: [30.6, 1.6, 5.2, 4.2], pin: [33, 3.6, 7.8], draw: () => box(31, 2, 0, 3, 3, 2) + cyl(35, 3, 0, .35, 7.5) },
  '09': { pad: [1.6, 10.6, 5.8, 8.2], pin: [4.2, 14.6, 6.8], draw: () => [11, 13.4, 15.8].map((y) => box(2, y, 0, 3, 1.8, 2.2) + cyl(6.3, y + 0.9, 0, .4, 6.5)).join('') },
  '10': { pad: [0.6, 20.6, 12, 8.6], pin: [11, 22, 3.6], draw: () => {
    let s = '';
    for (let y = 21.2; y < 28.6; y += 1.5) for (let x = 1; x < 8.6; x += 2.6) s += poly([P(x, y, .35), P(x + 2.2, y, .35), P(x + 2.2, y + 0.9, .9), P(x, y + 0.9, .9)], 'var(--solar)', 'opacity=".9"');
    return s + box(10, 21, 0, 2, 2, 1.3) + cyl(11.6, 24.2, 0, .12, 3.2) + cyl(10.2, 24.2, 0, .12, 3.2);
  } },
  '11': { pad: [33.2, 12.2, 2, 2], pin: [34.2, 13.2, 14.4], draw: () => box(33.6, 12.6, 0, 1.2, 1.2, .6) + cyl(34.2, 13.2, .6, .28, 11.4)
    + (() => { const [fx, fy] = P(34.2, 13.2, 12.1); return `<ellipse class="flame" cx="${fx.toFixed(1)}" cy="${(fy - 8).toFixed(1)}" rx="5" ry="10" fill="var(--flame)" opacity=".85"/><ellipse class="flame" cx="${fx.toFixed(1)}" cy="${(fy - 5).toFixed(1)}" rx="2.4" ry="5.5" fill="#fff3d6" opacity=".9"/>`; })() },
  '12': { pad: [34.6, 23.6, 3.4, 3.0], pin: [36.2, 25, 2.4], draw: () => box(35.2, 24, 0, 2.2, 2, 1.1) + box(28.4, 23.4, 0, 3, 2, 2.2) },
  '13': { pad: [11.2, 21.4, 7.6, 7.0], pin: [15, 24.6, 1.8], draw: () => cyl(13, 23, 0, 1.5, .6, { top: 'var(--sea2)' }) + cyl(16.6, 23, 0, 1.5, .6, { top: 'var(--sea2)' }) + cyl(13, 26.6, 0, 1.2, .6, { top: 'var(--sea2)' }) + box(16, 26, 0, 2, 1.5, 1) },
  '14': { pad: [19.4, 15.4, 10.2, 6.8], pin: [24.6, 18.8, 2.6], draw: () => [[21, 17], [24.6, 17], [28, 17], [21, 20.6], [24.6, 20.6], [28, 20.6]].map(([x, y]) => cyl(x, y, 0, 1.4, 2.4)).join('') },
  '15': { pad: [36.4, 16.8, 2, 2], pin: [44.2, 20.4, 3.2], draw: () => box(36, 17.4, -0.2, 8.6, 1, .4) + box(41, 19.2, -0.6, 5, 2.4, 1.3, { top: 'var(--iso-l)' }) + box(44.6, 19.5, .7, 1.1, 1.8, 1.5) + cyl(42.4, 18.6, .2, .12, 1.6) },
  '16': { pad: [20.6, 24.6, 6.4, 4.4], pin: [23, 26, 2.6], draw: () => box(21, 25, 0, 4, 2, 1.8) + box(21.4, 27.6, 0, 2.2, .9, .9) + box(24.4, 27.6, 0, 2.2, .9, .9) },
  '17': { pad: [9.6, 11.6, 4.4, 3.8], pin: [11.8, 13.5, 2.4], draw: () => box(10, 12, 0, 3.5, 3, 2) },
  '18': { pad: [14.1, 16.6, 3.4, 2.8], pin: [15.7, 18, 1.9], draw: () => box(14.5, 17, 0, 2.5, 2, 1.5) },
  // command & control centre (not a collection point)
  cc: { pad: [7.6, 15.8, 4.2, 3.6], pin: [9.6, 17.4, 3.4], draw: () => box(8, 16.2, 0, 3.2, 2.8, 2.4, { top: 'var(--iso-top)' })
    + poly([P(8.3, 19, 0.5), P(10.9, 19, 0.5), P(10.9, 19, 1.9), P(8.3, 19, 1.9)], 'var(--cc-glass)', 'opacity=".9"')
    + poly([P(11.2, 16.4, 0.5), P(11.2, 18.8, 0.5), P(11.2, 18.8, 1.9), P(11.2, 16.4, 1.9)], 'var(--cc-glass)', 'opacity=".75"')
    + cyl(10.4, 17, 2.4, .12, 1.6) + (() => { const [a, b] = P(10.4, 17, 4.1); return `<circle class="pulse" cx="${a.toFixed(1)}" cy="${b.toFixed(1)}" r="3" fill="var(--up)"/><circle cx="${a.toFixed(1)}" cy="${b.toFixed(1)}" r="2.2" fill="var(--up)"/>`; })() },
};

function landscapeSVG() {
  const g = [];
  // sea + ground slab
  g.push(`<polygon points="${pts([PW(38, -2, -0.9), PW(52, -2, -0.9), PW(52, 32, -0.9), PW(38, 32, -0.9)])}" fill="var(--sea)"/>`);
  for (let i = 0; i < 9; i++) { const a = PW(40 + i * 1.4, 2 + (i % 3) * 8), b = PW(41 + i * 1.4, 2 + (i % 3) * 8); g.push(`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="var(--sea2)" stroke-width="1.4" stroke-linecap="round"/>`); }
  g.push(poly([PW(0, 30, 0), PW(38, 30, 0), PW(38, 30, -0.9), PW(0, 30, -0.9)], 'var(--iso-l)'));
  g.push(poly([PW(38, 0, 0), PW(38, 30, 0), PW(38, 30, -0.9), PW(38, 0, -0.9)], 'var(--iso-r)'));
  g.push(poly([PW(0, 0, 0), PW(38, 0, 0), PW(38, 30, 0), PW(0, 30, 0)], 'var(--iso-ground)'));
  // roads
  [[[0, 9.6], [38, 9.6]], [[0, 19.8], [38, 19.8]], [[12.6, 0], [12.6, 30]], [[32.6, 0], [32.6, 30]], [[-4, 29.3], [32.6, 29.3]]].forEach((r) => g.push(`<polyline points="${pts(r.map(([x, y]) => PW(x, y)))}" fill="none" stroke="var(--road)" stroke-width="7" stroke-linecap="round"/>`));
  // pads
  Object.entries(ASSETS).forEach(([id, a]) => g.push(`<polygon class="asset-pad" data-cp="${id}" points="${pts(withShift(assetShift(id), () => pad(...a.pad)))}" fill="var(--iso-pad)" stroke="var(--line2)" stroke-width=".8"/>`));
  // flows
  g.push(pipesSVG());
  // labels on the ground
  const lab = (x, y, t) => { const [a, b] = PW(x, y); return `<text class="lbl" paint-order="stroke" stroke="var(--iso-ground)" stroke-width="3" x="${a.toFixed(0)}" y="${b.toFixed(0)}" text-anchor="middle">${t}</text>`; };
  // assets in painter order
  const order = Object.entries(ASSETS).sort((a, b) => (a[1].pad[0] + a[1].pad[2] / 2 + a[1].pad[1] + a[1].pad[3] / 2) - (b[1].pad[0] + b[1].pad[2] / 2 + b[1].pad[1] + b[1].pad[3] / 2));
  order.forEach(([id, a]) => g.push(`<g class="asset" data-cp="${id}">${withShift(assetShift(id), a.draw)}</g>`));
  g.push(lab(-2.6, 3.6, 'From upstream fields'), lab(5.2, 9.2, 'Crude tank farm'), lab(30, 7.4, 'Process units'), lab(1.6, 19.6, 'Utilities'), lab(6, 30.4, 'Solar PV & substation'), lab(30.4, 22.6, 'Product tanks'), lab(46, 27, 'Arabian Gulf'), lab(40.5, 16.2, 'Export jetty'));
  return `<svg class="iso" viewBox="${VB.join(' ')}" role="img" aria-label="Isometric view of the refinery with 18 data collection points">${g.join('')}<g class="leaders"></g><g class="vehs"></g></svg>`;
}
