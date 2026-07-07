#!/usr/bin/env node
// Browser smoke test: drives the running dev server (npm run dev) with
// puppeteer-core + installed Chrome. Ticks curriculum steps, checks progress
// persistence and console errors. Screenshots go to SMOKE_OUT (default /tmp).
import puppeteer from 'puppeteer-core';

const OUT = process.env.SMOKE_OUT ?? '/tmp';
const URL = process.env.DEV_URL ?? 'http://localhost:5173';
const CHROME =
  process.env.CHROME_BIN ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--window-size=1440,900'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

const errors = [];
page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
page.on('pageerror', (err) => errors.push(String(err)));

await page.goto(`${URL}/?mode=goal`, { waitUntil: 'networkidle0' });
await page.waitForSelector('.curriculum-check');

const boxes = await page.$$('.curriculum-check');
for (const box of boxes.slice(0, 3)) await box.click();
await new Promise((r) => setTimeout(r, 600));

console.log(
  'sidebar-count after 3 ticks:',
  await page.$eval('.sidebar-count', (el) => el.textContent),
);
console.log(
  'localStorage:',
  await page.evaluate(() => localStorage.getItem('physics-atlas-progress-v1')),
);
await page.screenshot({ path: `${OUT}/goal-3done.png` });

await page.reload({ waitUntil: 'networkidle0' });
await page.waitForSelector('.sidebar-count');
console.log('after reload:', await page.$eval('.sidebar-count', (el) => el.textContent));

await page.goto(`${URL}/?mode=explore`, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 800));
await page.screenshot({ path: `${OUT}/explore-3done.png` });

// --- Search: type, pick via Enter, expect selection + detail panel ---
await page.click('.search-input');
await page.type('.search-input', 'quantum');
await page.waitForSelector('.search-result');
const firstResult = await page.$eval('.search-result', (el) => el.textContent);
console.log('search "quantum" first result:', firstResult?.trim());
await page.keyboard.press('Enter');
await page.waitForSelector('.learned-toggle');
console.log(
  'map card after search:',
  await page.$eval('.map-card-title', (el) => el.textContent?.trim()),
);
await new Promise((r) => setTimeout(r, 500));
await page.screenshot({ path: `${OUT}/explore-search.png` });

// --- Search in goal mode for a topic outside the current goal's subgraph ---
await page.goto(`${URL}/?mode=goal`, { waitUntil: 'networkidle0' });
await page.waitForSelector('.curriculum-check');
// Make Special Relativity the goal, then search for Cosmology (outside it)
await page.click('.goal-chip'); // first chip = Special Relativity
await new Promise((r) => setTimeout(r, 300));
const before = await page.$eval('.sidebar-title', (el) => el.textContent?.trim());
await page.click('.search-input');
await page.type('.search-input', 'cosmo');
await page.waitForSelector('.search-result');
await page.keyboard.press('Enter');
await new Promise((r) => setTimeout(r, 500));
const after = await page.$eval('.sidebar-title', (el) => el.textContent?.trim());
console.log('goal before search:', before, '→ after searching "cosmo":', after);

// --- Content-type filter: the searched topic's detail is already open ---
await page.waitForSelector('.content-filter');
const allCount = await page.$$eval('.content-item', (els) => els.length);
await page.$$eval('.filter-chip', (chips) => {
  chips.find((c) => c.textContent.includes('book'))?.click();
});
await new Promise((r) => setTimeout(r, 200));
const bookCount = await page.$$eval('.content-item', (els) => els.length);
console.log(`content filter: ${allCount} items → ${bookCount} after "book" chip`);
await page.screenshot({ path: `${OUT}/goal-filter.png` });

// --- Home page: galaxy hero, search leads to the full map ---
await page.goto(URL, { waitUntil: 'networkidle0' });
await page.waitForSelector('.home .search-input');
console.log('home hero title:', await page.$eval('.home-title', (el) => el.textContent?.trim()));
await page.click('.home .search-input');
await page.type('.home .search-input', 'general rel');
await page.waitForSelector('.search-result');
await page.keyboard.press('Enter');
await page.waitForSelector('.map-card');
console.log(
  'map card after home search:',
  await page.$eval('.map-card-title', (el) => el.textContent?.trim()),
);
await new Promise((r) => setTimeout(r, 600));
await page.screenshot({ path: `${OUT}/map-focused.png` });

// --- Build curriculum from the map card ---
await page.click('.map-card-goal');
await page.waitForSelector('.curriculum');
console.log(
  'after "Build curriculum":',
  await page.$eval('.sidebar-title', (el) => el.textContent?.trim()),
);

console.log('console errors:', errors.length ? errors : 'none');
await browser.close();
process.exit(errors.length ? 1 : 0);
