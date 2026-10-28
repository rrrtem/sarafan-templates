#!/usr/bin/env node
'use strict';
// Integration/export check: tall templates must remain complete in every catalog view.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const deps = process.env.SARAFAN_NODE_MODULES || '/Users/fixed/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium } = require(path.join(deps, 'playwright'));
const sharp = require(path.join(deps, 'sharp'));
const root = path.resolve(__dirname, '..');
const url = 'file://' + root + '/index.html';
const entries = [{ id: 'reels-cover', category: 'journal', count: 1 }, { id: 'bureau-live', category: 'bureau', count: 2 }];
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const ready = () => page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map(img => img.decode().catch(error => { throw new Error(img.src + ': ' + error.message); })));
    });
    await page.goto(url);
    for (const entry of entries) {
      assert.equal(await page.locator(`[data-template="${entry.id}"]`).count(), 1, 'Catalog contains ' + entry.id);
      await page.locator(`[data-filter="${entry.category}"]`).click();
      assert(await page.locator(`[data-template="${entry.id}"]`).isVisible());
      const shells = page.locator(`[data-template="${entry.id}"] .preview-shell`);
      assert.equal(await shells.count(), entry.count);
      for (const shell of await shells.all()) {
        const ratio = await shell.evaluate(node => node.clientWidth / node.clientHeight);
        assert(Math.abs(ratio - 9 / 16) < .01, 'Preview preserves 9:16');
      }
    }
    await page.locator('[data-filter="all"]').click();
    await ready();
    await page.screenshot({ path: path.join(root, 'preview/vertical-catalog.png'), fullPage: true });
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1100 });
      for (const { id, count } of entries) {
        await page.goto(url + '#' + id);
        await page.locator('button[data-view="carousel"]').click();
        await ready();
        assert.equal(await page.locator('#viewer-cards .ig-card').count(), count);
        const shell = page.locator('#viewer-cards .card-shell:visible').first();
        const ratio = await shell.evaluate(node => node.clientWidth / node.clientHeight);
        assert(Math.abs(ratio - 9 / 16) < .005, 'Viewer preserves 9:16 at ' + width);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No page overflow');
        await page.screenshot({ path: path.join(root, `preview/${id}-${width === 390 ? 'mobile' : 'desktop'}.png`), fullPage: true });
        await page.keyboard.press('End');
        assert.equal(await page.locator('#download-slide').getAttribute('href'), `exports/sarafan-${id}-${String(count).padStart(2, '0')}.png`);
        await page.locator('button[data-view="grid"]').click();
        assert.equal(await page.locator('#viewer-cards .card-unit:visible').count(), count);
        const gridRatios = await page.locator('#viewer-cards .card-shell').evaluateAll(nodes => nodes.map(n => n.clientWidth / n.clientHeight));
        assert(gridRatios.every(r => Math.abs(r - 9 / 16) < .005), 'Grid preserves 9:16');
        await page.emulateMedia({ media: 'print' });
        const printed = await shell.boundingBox();
        assert.equal(printed.width, 1080); assert.equal(printed.height, 1920);
        await page.emulateMedia({ media: 'screen' });
      }
      await page.goto(url + '#proust');
      const oldRatio = await page.locator('#viewer-cards .card-shell:visible').first().evaluate(n => n.clientWidth / n.clientHeight);
      assert(Math.abs(oldRatio - 4 / 5) < .005, 'Existing 4:5 template remains intact');
    }
    const report = [];
    const tiles = [];
    for (const { id, count } of entries) {
      // Different document URL: the preceding export replaced the original body.
      await page.goto(url + '?export=' + id + '#' + id + '/' + count);
      assert.equal(await page.locator('#slide-number').textContent(), `${String(count).padStart(2, '0')} / ${String(count).padStart(2, '0')}`);
      await page.evaluate(id => {
        document.body.replaceChildren(document.getElementById('template-' + id).content.cloneNode(true));
        const style = document.createElement('style');
        style.textContent = 'body{margin:0}.card-unit{display:block!important}.card-shell{position:relative!important;width:1080px!important;height:1920px!important;overflow:hidden!important}.ig-card{--card-scale:1;transform:none!important}';
        document.head.append(style);
      }, id);
      await page.setViewportSize({ width: 1080, height: 1920 });
      await ready();
      const cards = await page.locator('.ig-card').evaluateAll(nodes => nodes.map(card => {
        const bounds = card.getBoundingClientRect();
        return { width: bounds.width, height: bounds.height, node: card.dataset.nodeId,
          images: [...card.querySelectorAll('img')].map(img => { const r = img.getBoundingClientRect(); return {
            src: img.getAttribute('src'), loaded: img.complete && img.naturalWidth > 0,
            left: r.left - bounds.left, top: r.top - bounds.top, width: r.width, height: r.height
          }; }),
          text: [...card.querySelectorAll('h2,p')].map(node => { const range = document.createRange(); range.selectNodeContents(node); const r = range.getBoundingClientRect(); return {
            text: node.textContent, font: getComputedStyle(node).fontFamily,
            left: r.left - bounds.left, top: r.top - bounds.top, right: r.right - bounds.left, bottom: r.bottom - bounds.top,
            overflow: node.scrollWidth > node.clientWidth + 2
          }; }) };
      }));
      assert(cards.every(c => c.width === 1080 && c.height === 1920));
      assert(cards.every(c => c.images.every(i => i.loaded && i.width > 0 && i.height > 0)), 'All original assets load');
      assert(cards.every(c => c.text.every(t => !t.overflow && t.left >= 0 && t.right <= 1080 && t.top >= 0 && t.bottom <= 1920)), 'Text stays inside canvas: ' + JSON.stringify(cards.map(c => c.text)));
      const loadedFonts = await page.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family));
      assert(loadedFonts.includes('EB Garamond'));
      if (id === 'bureau-live') assert(loadedFonts.includes('Geist'), 'Actual broadcast font loads');
      if (id === 'reels-cover') assert(loadedFonts.includes('Sarafan Reels Garamond'), 'Full EB Garamond loads for source numerals');
      for (let i = 0; i < count; i++) {
        const filename = path.join(root, `exports/sarafan-${id}-${String(i + 1).padStart(2, '0')}.png`);
        await page.locator('.ig-card').nth(i).screenshot({ path: filename });
        const meta = await sharp(filename).metadata();
        assert.equal(meta.width, 1080); assert.equal(meta.height, 1920);
        tiles.push({ input: await sharp(filename).resize(324, 576).toBuffer(), left: tiles.length * 324, top: 0 });
      }
      report.push({ id, fonts: loadedFonts, cards });
    }
    await sharp({ create: { width: 972, height: 576, channels: 3, background: '#FBEED2' } }).composite(tiles).png().toFile(path.join(root, 'preview/vertical-contact.png'));
    fs.writeFileSync(path.join(root, 'preview/vertical-layout.json'), JSON.stringify(report, null, 2) + '\n');
    assert.deepEqual(errors, [], 'No browser errors');
    console.log('PASS: vertical templates, category filters, 9:16 previews/carousel/grid, existing 4:5 viewer, desktop/mobile, navigation, local assets/fonts, text bounds, three 1080 × 1920 PNGs.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
