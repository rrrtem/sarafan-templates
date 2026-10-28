#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const deps = process.env.SARAFAN_NODE_MODULES || '/Users/fixed/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium } = require(path.join(deps, 'playwright'));
const sharp = require(path.join(deps, 'sharp'));
const JSZip = require(path.join(deps, 'jszip'));
const root = path.resolve(__dirname, '..');
const output = n => `sarafan-bureau-guide-${String(n).padStart(2, '0')}.png`;
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const ready = () => page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(img => img.decode())); });
    await page.goto('file://' + root + '/index.html');
    await page.locator('[data-filter="ads"]').click();
    assert.equal(await page.locator('.template-entry:visible').count(), 1);
    assert.equal(await page.locator('[data-template="expert"]').isVisible(), false, 'Expert template belongs to Bureau');
    await page.locator('[data-filter="bureau"]').click();
    await page.locator('a[href="#expert"]').click();
    await page.locator('#viewer-cards .expert-card').first().waitFor();
    assert.equal(await page.locator('#viewer-cards .expert-card').count(), 5, 'Expert source cards remain intact');
    await page.goto('file://' + root + '/index.html');
    await page.locator('[data-filter="bureau"]').click();
    assert.equal(await page.locator('.template-entry:visible').count(), 3);
    assert.equal(await page.locator('[data-template="expert"]').isVisible(), true);
    assert.equal(await page.locator('[data-filter="bureau"] span').textContent(), '3');
    await ready();
    await page.screenshot({ path: path.join(root, 'preview/bureau-catalog.png'), fullPage: true });
    await page.locator('a[href="#bureau-guide"]').click();
    await page.locator('#viewer-cards .bureau-card').first().waitFor();
    assert.equal(await page.locator('#viewer-cards .bureau-card').count(), 8);
    for (const [role, count] of [['cover', 2], ['text', 4], ['accent', 1], ['finale', 1]]) {
      await page.locator('#variant-filter').selectOption(role);
      assert.equal(await page.locator('#viewer-cards .card-unit:visible').count(), count, role + ' layouts');
    }
    await page.locator('#variant-filter').selectOption('all');
    await ready();
    await page.screenshot({ path: path.join(root, 'preview/bureau-desktop.png'), fullPage: true });
    await page.locator('[data-view="carousel"]').click();
    await page.keyboard.press('End');
    assert.equal(await page.locator('#download-slide').getAttribute('href'), 'exports/' + output(8));
    await page.keyboard.press('Home');
    await page.locator('.arrow--next').click();
    assert.equal(await page.locator('#slide-number').textContent(), '02 / 08');
    await page.goto('file://' + root + '/index.html#bureau-guide/5');
    assert.equal(await page.locator('#download-slide').getAttribute('href'), 'exports/' + output(5));
    await page.locator('[data-view="grid"]').click();
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Mobile width');
    await ready();
    await page.screenshot({ path: path.join(root, 'preview/bureau-mobile.png'), fullPage: true });
    await page.evaluate(() => {
      document.body.replaceChildren(document.getElementById('template-bureau-guide').content.cloneNode(true));
      const style = document.createElement('style');
      style.textContent = 'body{margin:0}.card-unit{display:block!important}.card-shell{position:relative!important;width:1080px!important;height:1350px!important;overflow:hidden!important}.ig-card{--card-scale:1;transform:none!important}';
      document.head.append(style);
    });
    await page.setViewportSize({ width: 1080, height: 1350 });
    await ready();
    const layout = await page.locator('.bureau-card').evaluateAll(cards => cards.map(card => {
      const bounds = card.getBoundingClientRect();
      const css = getComputedStyle(card);
      const blocks = [...card.querySelectorAll('.bureau-block')].map(node => {
        const r = node.getBoundingClientRect();
        const range = document.createRange(); range.selectNodeContents(node);
        const ink = range.getBoundingClientRect();
        return { text: node.textContent, left: r.left - bounds.left, right: r.right - bounds.left,
          top: r.top - bounds.top, bottom: r.bottom - bounds.top,
          inkLeft: ink.left - bounds.left, inkRight: ink.right - bounds.left,
          inkTop: ink.top - bounds.top, inkBottom: ink.bottom - bounds.top };
      });
      const overlaps = [];
      blocks.forEach((a, i) => blocks.slice(i + 1).forEach(b => {
        if (Math.min(a.inkRight, b.inkRight) - Math.max(a.inkLeft, b.inkLeft) > 2 && Math.min(a.inkBottom, b.inkBottom) - Math.max(a.inkTop, b.inkTop) > 2) overlaps.push([a.text, b.text]);
      }));
      return { variant: card.dataset.bureauVariant, width: bounds.width, height: bounds.height,
        grid: card.classList.contains('bureau-grid'), columns: css.gridTemplateColumns.split(' ').length,
        rows: css.gridTemplateRows.split(' ').length, gap: css.gap, padding: css.padding, blocks, overlaps,
        overflow: [...card.querySelectorAll('p,h2,h3,li')].filter(n => n.scrollWidth > n.clientWidth + 2).map(n => n.textContent),
        images: [...card.querySelectorAll('img')].map(img => { const r = img.getBoundingClientRect(); return {
          src: img.getAttribute('src'), loaded: img.complete && img.naturalWidth > 0,
          left: r.left - bounds.left, top: r.top - bounds.top, width: r.width, height: r.height
        }; }) };
    }));
    const fonts = await page.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => ({ family: f.family, weight: f.weight, style: f.style })));
    for (let i = 0; i < 8; i++) await page.locator('.bureau-card').nth(i).screenshot({ path: path.join(root, 'exports', output(i + 1)) });
    const tiles = await Promise.all(Array.from({ length: 8 }, async (_, i) => ({
      input: await sharp(path.join(root, 'exports', output(i + 1))).resize(324, 405).toBuffer(),
      left: (i % 4) * 324, top: Math.floor(i / 4) * 405
    })));
    await sharp({ create: { width: 1296, height: 810, channels: 3, background: '#FBEED2' } }).composite(tiles).png().toFile(path.join(root, 'preview/bureau-contact.png'));
    fs.writeFileSync(path.join(root, 'preview/bureau-layout.json'), JSON.stringify({ fonts, cards: layout }, null, 2) + '\n');
    assert(layout.every(c => c.width === 1080 && c.height === 1350));
    assert(layout.every(c => !c.overflow.length), 'No horizontal text overflow: ' + JSON.stringify(layout.filter(c => c.overflow.length)));
    assert(layout.every(c => c.images.every(img => img.loaded && img.width > 0 && img.height > 0)), 'Every original SVG loads');
    for (const c of layout.slice(0, 2)) {
      const oval = c.images.find(i => i.src.includes('-ovals.svg'));
      assert(Math.abs(oval.left - 133.48) < .1 && Math.abs(oval.top - 251.526) < .1);
      assert(Math.abs(oval.width - 813.04) < .1 && Math.abs(oval.height - 732.55) < .1);
      const brand = c.images.find(i => i.src.includes('-brand.svg'));
      assert.equal(brand.left, 0); assert(Math.abs(brand.top - 64.8008) < .1); assert.equal(brand.height, 82);
    }
    for (const c of layout.slice(2)) {
      assert(c.grid && c.columns === 6 && c.rows === 6 && c.gap === '20px' && c.padding === '65px', '6×6 grid: ' + c.variant);
      assert(!c.overlaps.length, 'Overlapping blocks: ' + JSON.stringify(c));
      assert(c.blocks.every(b => b.left >= 64 && b.right <= 1016 && b.top >= 64 && b.bottom <= 1286 && b.inkTop >= 0 && b.inkBottom <= 1350), 'Content bounds: ' + JSON.stringify(c));
    }
    for (const family of ['Geist', 'EB Garamond']) assert(fonts.some(f => f.family === family), 'Loaded font: ' + family);
    const zip = new JSZip();
    for (let i = 1; i <= 8; i++) {
      const filename = path.join(root, 'exports', output(i));
      const meta = await sharp(filename).metadata();
      assert.equal(meta.width, 1080); assert.equal(meta.height, 1350);
      zip.file(output(i), fs.readFileSync(filename), { date: new Date('2021-01-01T00:00:00Z') });
    }
    fs.writeFileSync(path.join(root, 'sarafan-bureau-guide.zip'), await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
    assert.deepEqual(errors, [], 'No browser errors');
    console.log('PASS: expert in Bureau; Bureau has two original covers and six grid layouts; role filters, navigation, deep links, mobile, fonts, SVG geometry, text bounds, no overlaps, eight 1080 × 1350 PNGs and ZIP.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
