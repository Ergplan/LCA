// Smoke tests for the LCA Workbench mock (Playwright, headless Chromium).
// Usage: node tests/smoke.mjs [path/to/index.html] [path/to/previous/index.html]
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const target = 'file://' + resolve(process.argv[2] || 'index.html');
const baseline = process.argv[3] ? 'file://' + resolve(process.argv[3]) : null;
const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok: !!ok, detail });

// Pairs of collection-point cards on the dashboard map whose boxes overlap
async function cardOverlaps(page, url) {
  await page.goto(url); await page.waitForTimeout(900);
  return page.evaluate(() => {
    const r = [...document.querySelectorAll('#dashMap .gl.cp-card')].map((e) => e.getBoundingClientRect());
    let n = 0;
    for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) {
      const a = r[i], b = r[j];
      if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) n++;
    }
    return { cards: r.length, overlaps: n };
  });
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

// 1. Every building on the dashboard map opens its history card with a 36-month line
await page.goto(target); await page.waitForTimeout(900);
const ids = await page.evaluate(() => [...new Set([...document.querySelectorAll('#dashMap .asset[data-cp]')].map((g) => g.dataset.cp))].filter((id) => id !== 'cc'));
let okB = 0; const bad = [];
for (const id of ids) {
  await page.dispatchEvent(`#dashMap .asset[data-cp="${id}"]`, "click"); await page.waitForTimeout(120);
  const r = await page.evaluate((id) => {
    const pop = document.querySelector('#dashMap .bld-pop');
    const line = pop && pop.querySelector('.bld-line');
    return { open: !!pop, cp: pop ? pop.textContent.includes('CP-' + id) : false, pts: line ? line.getAttribute('points').trim().split(/\s+/).length : 0 };
  }, id);
  if (r.open && r.cp && r.pts === 36) okB++; else bad.push(`${id}:${JSON.stringify(r)}`);
}
check(`Building click → history card with 36-month line (${okB}/${ids.length})`, okB === ids.length && ids.length === 18, bad.join(' '));
await page.click('#dashMap [data-popx]'); await page.waitForTimeout(100);
check('History card closes', !(await page.$('#dashMap .bld-pop')));
await page.dispatchEvent("#dashMap .asset[data-cp=\"cc\"]", "click"); await page.waitForTimeout(500);
check('Control-centre building opens the control centre', (await page.evaluate(() => location.hash)) === '#control');

// 2. Full screen on and off
await page.goto(target); await page.waitForTimeout(800);
await page.click('#dashMap [data-full]'); await page.waitForTimeout(250);
const full = await page.evaluate(() => { const m = document.querySelector('#dashMap'); const r = m.getBoundingClientRect(); return m.classList.contains('is-full') && r.width >= innerWidth - 1 && r.height >= innerHeight - 1; });
check('Full screen fills the viewport', full);
await page.keyboard.press('Escape'); await page.waitForTimeout(150);
check('Esc leaves full screen', !(await page.evaluate(() => document.querySelector('#dashMap').classList.contains('is-full'))));

// 3. Vehicles move
const pos = async () => page.evaluate(() => document.querySelector('#dashMap [data-veh="TRK-14"]')?.style.left);
const p0 = await pos(); await page.waitForTimeout(1200); const p1 = await pos();
check('Vehicles move along the roads', p0 && p1 && p0 !== p1, `${p0} → ${p1}`);

// 4. Every module renders without errors or sideways scroll, desktop and phone
const secs = await page.evaluate(() => [...document.querySelectorAll('#nav button')].length);
let overflowD = [];
for (let i = 0; i < secs; i++) {
  await page.click(`#nav button[data-i="${i}"]`); await page.waitForTimeout(200);
  const ow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (ow > 0) overflowD.push(`${i}:${ow}px`);
}
check(`All ${secs} modules render at 1440 px without sideways scroll`, overflowD.length === 0, overflowD.join(' '));
const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
phone.on('pageerror', (e) => errors.push('phone: ' + e.message));
const hashes = await page.evaluate(() => [...document.querySelectorAll('#nav button')].map((b) => b.textContent));
let overflowM = [];
await phone.goto(target); await phone.waitForTimeout(600);
const phoneIds = ['dashboard', 'control', 'site', 'products', 'exchange', 'requirements'];
for (const h of phoneIds) {
  await phone.goto(target + '#' + h); await phone.waitForTimeout(450);
  const ow = await phone.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (ow > 0) overflowM.push(`${h}:${ow}px`);
}
check(`Key modules render at 390 px without sideways scroll (${phoneIds.length})`, overflowM.length === 0, overflowM.join(' '));

// 5. Guided tour runs to the end
await page.goto(target); await page.waitForTimeout(700);
await page.click('#tourBtn'); await page.waitForTimeout(500);
let steps = 0;
while (steps < 60 && await page.evaluate(() => !document.getElementById('tourPop').hidden)) { await page.click('#tourNext'); await page.waitForTimeout(420); steps++; }
check(`Guided tour completes (${steps} steps)`, steps > 10 && steps < 60);

// 6. Clutter: overlapping collection-point cards on the dashboard map
const now = await cardOverlaps(page, target);
let detail = `${now.overlaps} overlapping pairs of ${now.cards} cards`;
let ok = true;
if (baseline) { const before = await cardOverlaps(page, baseline); detail += ` (previous version: ${before.overlaps})`; ok = now.overlaps < before.overlaps; }
check('Map labels overlap less than before', ok, detail);

check('No script errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();

const w = Math.max(...results.map((r) => r.name.length));
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name.padEnd(w)}  ${r.detail}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
