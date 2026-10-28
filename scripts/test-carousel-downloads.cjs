#!/usr/bin/env node
'use strict';
// Integration: broken archives, omitted slides, stale edits, failed fetch recovery.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { pathToFileURL } = require('node:url');
const deps = process.env.SARAFAN_NODE_MODULES || '/Users/fixed/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium, webkit } = require(path.join(deps, 'playwright'));
const JSZip = require(path.join(deps, 'jszip'));
const sharp = require(path.join(deps, 'sharp'));
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'agent-manifest.json')));
const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', ({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  });
});
async function archive(download) {
  return JSZip.loadAsync(fs.readFileSync(await download.path()), { checkCRC32: true });
}
async function clickDownload(page, selector) {
  try {
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator(selector).first().click()]);
    return download;
  } catch (error) {
    console.error('Download diagnostics:', page.url(), await page.locator('#post-status').allTextContents());
    throw error;
  }
}
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await (process.env.SARAFAN_BROWSER === 'webkit' ? webkit : chromium).launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const template of manifest.templates) {
      await page.goto(origin + 'index.html#' + template.id);
      const zip = await archive(await clickDownload(page, '#download-carousel'));
      const names = Object.keys(zip.files);
      assert.equal(names.length, template.labels.length, template.id + ': every slide');
      assert.equal(names[0], 'sarafan-' + template.id + '-01.png');
      assert.equal(names.at(-1), 'sarafan-' + template.id + '-' + String(names.length).padStart(2, '0') + '.png');
      const png = await sharp(await zip.files[names[0]].async('nodebuffer')).metadata();
      assert.equal(png.width, template.canvas.width);
      assert.equal(png.height, template.canvas.height);
      await page.locator('button[data-view="grid"]').click();
      assert(await page.locator('#download-carousel').isVisible(), 'ZIP remains accessible in grid view');
    }
    for (const post of manifest.posts.filter(post => !post.cards.some(card => card.edit || card.cover))) {
      await page.goto(origin + 'new-posts.html#' + post.id);
      const zip = await archive(await clickDownload(page, '#download-post'));
      assert.equal(Object.keys(zip.files).length, post.cards.length);
      const single = await clickDownload(page, '.post-card-actions a');
      assert.equal((await sharp(await single.path()).metadata()).format, 'png', 'HTML cards download their PNG');
    }
    await page.goto(origin + 'new-posts.html#salon-november-09-15');
    await page.getByLabel('Цвета кругов обложки').selectOption('blue');
    await page.getByLabel('Круги обложки').selectOption('flow');
    await page.getByRole('button', { name: /^Кадрировать:/ }).first().click();
    await page.locator('#crop-fit').selectOption('contain');
    await page.locator('#crop-save').click();
    await page.waitForFunction(() => !document.querySelector('#photo-editor').open);
    const single = await clickDownload(page, '.post-card-actions button[aria-label^="Скачать PNG"]');
    const expectedCrop = fs.readFileSync(await single.path());
    const cover = await clickDownload(page, '.post-cover-controls a');
    const expectedCover = fs.readFileSync(await cover.path());
    const edited = await archive(await clickDownload(page, '#download-post'));
    assert.equal(Object.keys(edited.files).length, 11);
    assert.deepEqual(await edited.file('salon-november-09-15-01.png').async('nodebuffer'), expectedCover);
    assert.deepEqual(await edited.file('salon-november-09-15-02.png').async('nodebuffer'), expectedCrop);
    // Missing resources must leave a usable retry button, without a partial archive.
    await page.route('**/covers/blue-flow.png', route => route.fulfill({ status: 404 }));
    await page.evaluate(() => { window.SARAFAN_CROP_MEDIA = {}; });
    await page.getByLabel('Круги обложки').selectOption('orbit');
    await page.getByLabel('Круги обложки').selectOption('flow');
    await page.locator('#download-post').click();
    await page.waitForFunction(() => document.querySelector('#post-status').textContent.includes('Не удалось'));
    assert.equal(await page.locator('#download-post').isDisabled(), false);
    await page.unroute('**/covers/blue-flow.png');
    await archive(await clickDownload(page, '#download-post'));
    // Repository-only examples and shared navigation remain usable at narrow widths.
    for (const width of [320, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      for (const file of ['index.html#proust', 'new-posts.html', 'design-system.html', 'agents.html']) {
        await page.goto(origin + file);
        await page.evaluate(() => document.fonts.ready);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, file + ': no horizontal overflow at ' + width);
        assert.equal(await page.locator('.brand-rooster').evaluate(img => img.complete && img.naturalWidth > 0), true);
      }
    }
    await page.goto(pathToFileURL(path.join(root, 'index.html')).href + '#bureau-live');
    assert.equal(Object.keys((await archive(await clickDownload(page, '#download-carousel'))).files).length, 2);
    await page.goto(pathToFileURL(path.join(root, 'new-posts.html')).href + '#french-superlevel');
    assert.equal(Object.keys((await archive(await clickDownload(page, '#download-post'))).files).length, 7);
    await page.goto(pathToFileURL(path.join(root, 'new-posts.html')).href + '#salon-november-09-15');
    assert.equal(Object.keys((await archive(await clickDownload(page, '#download-post'))).files).length, 11, 'Edited-post ZIP also works from disk');
    assert.deepEqual(errors, []);
    for (const [name, url, width] of [['header-desktop','index.html',1280],['header-mobile','index.html',390],['carousel-download','index.html#proust',1280],['examples-download','new-posts.html',1280]]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(origin + url);
      await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(img => img.decode().catch(() => {}))); });
      await page.screenshot({ path: path.join(root, 'preview', name + '.png') });
    }
    console.log('PASS: all template/example ZIPs, ordered PNGs, current edits, retry, local files, responsive headers.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
