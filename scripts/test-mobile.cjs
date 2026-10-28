#!/usr/bin/env node
'use strict';
// Real browser checks for touch access, navigation and editing; no installs needed.
const assert = require('node:assert/strict');
const path = require('node:path');
const http = require('node:http');
const fs = require('node:fs');
const deps = process.env.SARAFAN_NODE_MODULES || '/Users/fixed/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium, webkit } = require(path.join(deps, 'playwright'));
const sharp = require(path.join(deps, 'sharp'));
const root = path.resolve(__dirname, '..');
let origin;
const url = file => origin + '/' + file;

async function touchTargets(page, selector) {
  const small = await page.locator(selector).evaluateAll(nodes => nodes.filter(node => {
    const rect = node.getBoundingClientRect();
    return rect.width && rect.height && (rect.width < 43 || rect.height < 43);
  }).map(node => node.textContent.trim() || node.getAttribute('aria-label')));
  assert.deepEqual(small, [], 'Controls must be large enough to tap: ' + small.join(', '));
}
async function fits(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'Page must not scroll sideways');
}
async function run(engine) {
  const browser = await engine.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    const errors = [];
    page.setDefaultTimeout(10000);
    async function screenshot(name) {
      if (!process.env.SARAFAN_SCREENSHOTS) return;
      await page.evaluate(() => document.fonts.ready);
      fs.mkdirSync(path.join(root, 'preview'), { recursive: true });
      await page.screenshot({ path: path.join(root, 'preview/mobile-' + name + '-' + engine.name() + '.png') });
    }
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url('index.html'));
    await page.evaluate(() => document.fonts.ready);
    await fits(page);
    await touchTargets(page, '.library-nav a, .filters button');
    await screenshot('catalog');
    await page.locator('[data-filter="journal"]').tap();
    assert.equal(await page.locator('.template-entry:visible').count(), 5);
    await page.locator('a[href="#proust"]').tap();
    await page.locator('#viewer').waitFor({ state: 'visible' });
    assert.equal(await page.locator('.arrow--next').isVisible(), true, 'Next card must be reachable without discovering a gesture');
    await touchTargets(page, '.arrow, .view-switch button, #download-slide');
    await page.locator('.arrow--next').tap();
    assert.match(await page.locator('#download-slide').getAttribute('href'), /proust-02\.png$/);
    const downloadEvent = page.waitForEvent('download');
    await page.locator('#download-slide').tap();
    const download = await downloadEvent;
    const png = await sharp(await download.path()).metadata();
    assert.equal(png.width, 1080);
    assert.equal(png.height, 1350);
    async function swipe(dx, dy, cancel = false) {
      const start = { clientX: 200, clientY: 400, identifier: 0 };
      await page.locator('#viewer-cards').dispatchEvent('touchstart', { touches: [start], changedTouches: [start] });
      if (cancel) await page.locator('#viewer-cards').dispatchEvent('touchcancel');
      await page.locator('#viewer-cards').dispatchEvent('touchend', { touches: [], changedTouches: [{ ...start, clientX: 200 + dx, clientY: 400 + dy }] });
    }
    await swipe(-90, 5);
    assert.match(await page.locator('#download-slide').getAttribute('href'), /proust-03\.png$/, 'Horizontal swipe changes the card');
    await swipe(10, -120);
    await swipe(-90, 5, true);
    assert.match(await page.locator('#download-slide').getAttribute('href'), /proust-03\.png$/, 'Scrolling and cancelled gestures do not change the card');
    await screenshot('viewer');
    await page.locator('button[data-view="grid"]').tap();
    await screenshot('overview');
    await page.locator('.card-unit').nth(3).getByRole('button', { name: /Открыть/ }).tap();
    assert.match(await page.locator('#download-slide').getAttribute('href'), /proust-04\.png$/);
    await page.getByRole('link', { name: 'Все шаблоны', exact: true }).tap();
    await page.locator('#catalog').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#catalog').isVisible(), true);
    await page.goto(url('index.html') + '#bureau-guide/8');
    assert.match(await page.locator('#download-slide').getAttribute('href'), /bureau-guide-08\.png$/);
    const lastDot = await page.locator('.pagination [aria-current="true"]').boundingBox();
    assert(lastDot.x >= 0 && lastDot.x + lastDot.width <= 390, 'Selected pagination dot stays in view');
    assert.equal(await page.locator('.arrow--next').isDisabled(), true);
    await page.locator('#variant-filter').selectOption('text');
    assert.match(await page.locator('#download-slide').getAttribute('href'), /bureau-guide-03\.png$/);
    await page.locator('.arrow--next').tap();
    assert.match(await page.locator('#download-slide').getAttribute('href'), /bureau-guide-04\.png$/);
    await page.goto(url('new-posts.html'));
    const picker = page.getByLabel('Выбрать публикацию');
    assert.equal(await picker.isVisible(), true, 'Mobile publication selection is compact and visible');
    await picker.selectOption('salon-november-09-15');
    await page.waitForFunction(() => document.querySelector('.post-card canvas'));
    await touchTargets(page, '.post-cover-controls select, .post-cover-controls a, .post-card-actions button');
    await screenshot('posts');
    await page.getByRole('button', { name: /^Кадрировать:/ }).first().tap();
    assert.equal(await page.locator('#photo-editor').isVisible(), true);
    await screenshot('crop');
    await touchTargets(page, '#crop-close, #crop-reset, .crop-actions button, #crop-fit, .crop-controls input');
    await page.locator('#crop-fit').selectOption('contain');
    await page.locator('#crop-save').tap();
    await page.waitForFunction(() => !document.querySelector('#photo-editor').open);
    assert.match(await page.locator('#post-status').textContent(), /Кадр сохранён|Кадр применён/);
    await page.setViewportSize({ width: 844, height: 390 });
    await page.getByRole('button', { name: /^Кадрировать:/ }).first().tap();
    await fits(page);
    const dialogRect = await page.locator('#photo-editor').boundingBox();
    assert(dialogRect.width <= 844 && dialogRect.height <= 390, 'Landscape crop editor fits the screen');
    await page.locator('#crop-cancel').tap();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(url('design-system.html'));
    await touchTargets(page, '.library-nav a, .ds-sidebar a, .ds-text-link, .ds-primary, .ds-asset-links a');
    await screenshot('design-system');
    const resourceDownloadEvent = page.waitForEvent('download');
    await page.locator('.ds-asset-links a').first().tap();
    assert((await resourceDownloadEvent).suggestedFilename().endsWith('.svg'), 'Original asset download is available on mobile');
    for (const width of [320, 375, 390, 430, 640, 768]) {
      await page.setViewportSize({ width, height: 844 });
      for (const file of ['index.html', 'index.html#bureau-guide', 'new-posts.html#salon-november-09-15', 'design-system.html', 'agents.html']) {
        const [filename, hash] = file.split('#');
        await page.goto(url(filename) + (hash ? '#' + hash : ''));
        await fits(page);
      }
    }
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto(url('new-posts.html') + '#salon-november-09-15');
    await page.getByRole('button', { name: /^Кадрировать:/ }).first().tap();
    await fits(page);
    await page.locator('#crop-reset').tap();
    await page.locator('#crop-cancel').tap();
    await page.goto(url('index.html'));
    await page.locator('[data-filter="general"]').tap();
    const catalogLink = page.locator('a[href="#transition"]');
    await catalogLink.scrollIntoViewIfNeeded();
    const scrolled = await page.evaluate(() => window.scrollY);
    await catalogLink.tap();
    await page.locator('#viewer').waitFor({ state: 'visible' });
    await page.getByRole('link', { name: 'Все шаблоны', exact: true }).tap();
    await page.locator('#catalog').waitFor({ state: 'visible' });
    assert(Math.abs(await page.evaluate(() => window.scrollY) - scrolled) < 2, 'Returning to catalog restores browsing position');
    const desktop = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    await desktop.goto(url('index.html') + '#bureau-guide');
    assert.equal(await desktop.locator('.card-unit:visible').count(), 8, 'Desktop keeps its overview default');
    await desktop.goto(url('new-posts.html'));
    assert.equal(await desktop.locator('#posts-nav').isVisible(), true, 'Desktop keeps its publication sidebar');
    await desktop.close();
    assert.deepEqual(errors, [], 'No browser runtime errors');
    console.log('PASS mobile: ' + engine.name() + ' — 320–768 px, landscape, touch gestures, filtered slides, 1080×1350 PNG, per-card actions, crop controls, asset download, scroll restoration and desktop defaults');
  } finally { await browser.close(); }
}
(async () => {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };
  const server = http.createServer((request, response) => {
    const filename = path.resolve(root, '.' + decodeURIComponent(new URL(request.url, 'http://localhost').pathname));
    if (!filename.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    fs.readFile(filename, (error, bytes) => {
      if (error) { response.writeHead(404).end(); return; }
      response.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream' });
      response.end(bytes);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = 'http://127.0.0.1:' + server.address().port;
  try { await run(process.env.SARAFAN_BROWSER === 'webkit' ? webkit : chromium); }
  finally { await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
