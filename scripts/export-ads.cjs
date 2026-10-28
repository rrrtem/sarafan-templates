#!/usr/bin/env node
'use strict';
// Export the nine original advertising compositions and verify their catalog flow.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const deps = process.env.SARAFAN_NODE_MODULES || '/Users/fixed/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium } = require(path.join(deps, 'playwright'));
const sharp = require(path.join(deps, 'sharp'));
const JSZip = require(path.join(deps, 'jszip'));
const root = path.resolve(__dirname, '..');
const output = n => `sarafan-ads-retreat-${String(n).padStart(2, '0')}.png`;

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('file://' + root + '/index.html');
    await page.locator('[data-filter="ads"]').click();
    assert.equal(await page.locator('.template-entry:visible').count(), 2, 'Advertising includes the retreat and expert templates');
    assert.equal(await page.locator('[data-filter="ads"] span').textContent(), '2');
    assert.equal(await page.locator('#category-empty').isVisible(), false);
    await page.screenshot({ path: path.join(root, 'preview/ads-retreat-catalog.png'), fullPage: true });
    await page.locator('a[href="#ads-retreat"]').click();
    await page.locator('#viewer-cards .ad-card').first().waitFor();
    assert.equal(await page.locator('#viewer-cards .ad-card').count(), 9);
    assert.equal(await page.locator('#viewer-cards .card-unit:visible').count(), 9, 'Grid is the default view');
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(img => img.decode())); });
    await page.screenshot({ path: path.join(root, 'preview/ads-retreat-desktop.png'), fullPage: true });
    await page.locator('[data-view="carousel"]').click();
    await page.keyboard.press('End');
    assert.equal(await page.locator('#download-slide').getAttribute('href'), 'exports/' + output(9));
    assert.equal(await page.locator('#slide-number').textContent(), '09 / 09');
    await page.keyboard.press('Home');
    await page.locator('.arrow--next').click();
    assert.equal(await page.locator('#slide-caption').textContent(), 'Йога в пустыне Агафай');
    await page.goto('file://' + root + '/index.html#ads-retreat/3');
    assert.equal(await page.locator('#download-slide').getAttribute('href'), 'exports/' + output(3));
    await page.locator('[data-view="grid"]').click();
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No mobile overflow');
    await page.screenshot({ path: path.join(root, 'preview/ads-retreat-mobile.png'), fullPage: true });
    await page.evaluate(() => {
      document.body.replaceChildren(document.getElementById('template-ads-retreat').content.cloneNode(true));
      const style = document.createElement('style');
      style.textContent = 'body{margin:0}.card-unit{display:block!important}.card-shell{position:relative!important;width:1080px!important;height:1350px!important;overflow:hidden!important}.ig-card{--card-scale:1;transform:none!important}';
      document.head.append(style);
    });
    await page.setViewportSize({ width: 1080, height: 1350 });
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(img => img.decode())); });
    const layout = await page.locator('.ad-card').evaluateAll(cards => cards.map(card => {
      const bounds = card.getBoundingClientRect();
      const text = [...card.querySelectorAll('p,h2')].map(node => {
        const range = document.createRange(); range.selectNodeContents(node);
        const rect = range.getBoundingClientRect();
        const box = node.getBoundingClientRect();
        return { text: node.textContent, left: rect.left - bounds.left, top: rect.top - bounds.top,
          right: rect.right - bounds.left, bottom: rect.bottom - bounds.top,
          boxTop: box.top - bounds.top, boxBottom: box.bottom - bounds.top,
          overflow: node.scrollWidth > node.clientWidth + 2 };
      });
      return { node: card.dataset.nodeId, width: bounds.width, height: bounds.height, text,
        images: [...card.querySelectorAll('img')].map(img => {
          const r = img.getBoundingClientRect();
          return { src: img.getAttribute('src'), loaded: img.complete && img.naturalWidth > 0,
            left: r.left - bounds.left, top: r.top - bounds.top, width: r.width, height: r.height };
        }) };
    }));
    assert(layout.every(card => card.width === 1080 && card.height === 1350), '1080 × 1350 export geometry');
    assert(layout.every(card => card.images.every(img => img.loaded && img.width > 0 && img.height > 0)), 'All original assets load at nonzero dimensions');
    assert.deepEqual(layout.map(card => card.images[0].src), [1, 3, 2, 8, 7, 6, 5, 4, 9].map(i => `assets/ads-retreat-${String(i).padStart(2, '0')}.png`), 'Original assets occupy the correct cards');
    // Garamond's em range extends beyond its visible ink at the original 95% leading.
    // Check vertical line boxes; preserve the source price's y=30 and 190px height.
    const badText = layout.flatMap(card => card.text.filter(t => t.overflow || t.left < -1 || t.boxTop < -1 || t.right > 1081 || t.boxBottom > 1351));
    assert.deepEqual(badText, [], 'No text clipping or horizontal overflow');
    const brand = layout[0].images[1];
    assert.equal(brand.src, 'assets/ads-retreat-brand.svg');
    assert.equal(brand.width, 82); assert.equal(brand.height, 547);
    assert.equal(brand.left, 961); assert.equal(brand.top, -53);
    const fonts = await page.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => ({ family: f.family, weight: f.weight, style: f.style })));
    for (const family of ['Geist', 'EB Garamond']) assert(fonts.some(f => f.family === family), 'Actual font loading: ' + family);
    for (let i = 0; i < 9; i++) {
      const filename = path.join(root, 'exports', output(i + 1));
      await page.locator('.ad-card').nth(i).screenshot({ path: filename });
      const meta = await sharp(filename).metadata();
      assert.equal(meta.width, 1080); assert.equal(meta.height, 1350);
    }
    const tiles = await Promise.all(Array.from({ length: 9 }, async (_, i) => ({
      input: await sharp(path.join(root, 'exports', output(i + 1))).resize(324, 405).toBuffer(),
      left: (i % 3) * 324, top: Math.floor(i / 3) * 405
    })));
    await sharp({ create: { width: 972, height: 1215, channels: 3, background: '#FBEED2' } }).composite(tiles).png().toFile(path.join(root, 'preview/ads-retreat-contact.png'));
    const zip = new JSZip();
    for (let i = 1; i <= 9; i++) zip.file(output(i), fs.readFileSync(path.join(root, 'exports', output(i))), { date: new Date('2021-01-01T00:00:00Z') });
    fs.writeFileSync(path.join(root, 'sarafan-ads-retreat.zip'), await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
    fs.writeFileSync(path.join(root, 'preview/ads-retreat-layout.json'), JSON.stringify({ fonts, cards: layout }, null, 2) + '\n');
    assert.deepEqual(errors, [], 'No browser errors');
    console.log('PASS: advertising filter, nine cards, grid/carousel, navigation, deep link, downloads, mobile width, fonts, local asset slots, text bounds and nine 1080 × 1350 PNGs.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
