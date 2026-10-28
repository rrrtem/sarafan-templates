#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const deps = process.env.SARAFAN_NODE_MODULES || '/Users/fixed/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium } = require(path.join(deps, 'playwright'));
const sharp = require(path.join(deps, 'sharp'));
const JSZip = require(path.join(deps, 'jszip'));
const root = path.resolve(__dirname, '..');
const filename = n => `sarafan-recommendations-${String(n).padStart(2, '0')}.png`;

(async () => {
  const server = http.createServer((request, response) => {
    const relative = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const target = path.resolve(root, '.' + relative);
    if (!target.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ttf': 'font/ttf', '.otf': 'font/otf' };
    response.setHeader('Content-Type', mime[path.extname(target)] || 'application/octet-stream');
    fs.createReadStream(target).on('error', () => { response.statusCode = 404; response.end(); }).pipe(response);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port + '/index.html';
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    fs.mkdirSync(path.join(root, 'exports'), { recursive: true });
    fs.mkdirSync(path.join(root, 'preview'), { recursive: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const ready = () => page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.querySelectorAll('.recommendation-card img')].map(image => image.decode()));
    });
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-filter="journal"]').click();
    assert(await page.locator('[data-template="recommendations"]').isVisible(), 'Recommendations are in Journal');
    assert.equal(await page.locator('.template-entry:visible').count(), 5);
    assert.equal(await page.locator('[data-filter="journal"] span').textContent(), '5');
    await ready();
    await page.screenshot({ path: path.join(root, 'preview/recommendations-catalog.png'), fullPage: true });
    await page.locator('a[href="#recommendations"]').click();
    await page.locator('#viewer-cards .recommendation-card').first().waitFor();
    assert.equal(await page.locator('#viewer-cards .recommendation-card').count(), 3);
    await ready();
    await page.screenshot({ path: path.join(root, 'preview/recommendations-desktop.png'), fullPage: true });
    await page.locator('[data-view="carousel"]').click();
    await page.locator('.arrow--next').click();
    assert.equal(await page.locator('#slide-number').textContent(), '02 / 03');
    assert.equal(await page.locator('#download-slide').getAttribute('href'), 'exports/' + filename(2));
    await page.keyboard.press('End');
    assert.equal(await page.locator('#download-slide').getAttribute('download'), filename(3));
    await page.goto(url + '#recommendations/2', { waitUntil: 'domcontentloaded' });
    assert.equal(await page.locator('#download-slide').getAttribute('href'), 'exports/' + filename(2));
    await page.setViewportSize({ width: 390, height: 844 });
    await ready();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Mobile carousel fits');
    await page.screenshot({ path: path.join(root, 'preview/recommendations-mobile.png'), fullPage: true });
    await page.locator('[data-view="grid"]').click();
    assert.equal(await page.locator('#viewer-cards .card-unit:visible').count(), 3);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Mobile grid fits');
    await page.evaluate(() => {
      document.body.replaceChildren(document.getElementById('template-recommendations').content.cloneNode(true));
      const style = document.createElement('style');
      style.textContent = 'body{margin:0}.card-unit{display:block!important}.card-shell{position:relative!important;width:1080px!important;height:1350px!important;overflow:hidden!important}.ig-card{--card-scale:1;transform:none!important}';
      document.head.append(style);
    });
    await page.setViewportSize({ width: 1080, height: 1350 });
    await ready();
    const layout = await page.locator('.recommendation-card').evaluateAll(cards => cards.map(card => {
      const bounds = card.getBoundingClientRect();
      const geometry = node => {
        const r = node.getBoundingClientRect();
        return { left: r.left - bounds.left, top: r.top - bounds.top, width: r.width, height: r.height };
      };
      return { nodeId: card.dataset.nodeId, ...geometry(card), background: getComputedStyle(card).backgroundColor,
        color: getComputedStyle(card).color,
        text: [...card.querySelectorAll('h2,p')].map(node => {
          const range = document.createRange(); range.selectNodeContents(node);
          const rects = [...range.getClientRects()].map(r => ({ left: r.left - bounds.left, top: r.top - bounds.top, right: r.right - bounds.left, bottom: r.bottom - bounds.top }));
          return { class: node.className, text: node.textContent, ...geometry(node), ink: rects,
            overflow: node.scrollWidth > node.clientWidth + 1, font: getComputedStyle(node).font };
        }), images: [...card.querySelectorAll('img')].map(image => ({
          src: image.getAttribute('src'), loaded: image.complete && image.naturalWidth > 0, ...geometry(image)
        })) };
    }));
    const fonts = await page.evaluate(() => [...document.fonts].filter(font => font.status === 'loaded').map(font => ({ family: font.family, style: font.style, weight: font.weight })));
    for (const card of layout) {
      assert.equal(card.width, 1080); assert.equal(card.height, 1350);
      assert(card.images.every(image => image.loaded && image.width > 0 && image.height > 0));
      assert(card.text.every(text => !text.overflow && text.ink.every(r => r.left >= 0 && r.right <= 1080 && r.top >= 0 && r.bottom <= 1350)), 'Text ink fits: ' + card.nodeId);
      const ribbon = card.images.find(image => image.src.endsWith('recommendations-ribbon.svg'));
      assert(Math.abs(ribbon.left - 932.739746) < .1 && ribbon.top === -112 && ribbon.width === 82 && ribbon.height === 606, 'Ribbon aligns with other Journal templates');
      const portrait = card.images.find(image => image.src.endsWith('recommendations-varvara.png'));
      assert(Math.abs(portrait.left - 92.54834) < .1 && Math.abs(portrait.top - 1138.828125) < .1 && Math.abs(portrait.width - 143.382813) < .1, 'Original portrait geometry');
    }
    assert(fonts.some(font => font.family === 'Geist'), 'Original Geist loaded');
    assert(fonts.some(font => font.family === 'Sarafan Recommendations Garamond' && font.weight === '400' && font.style === 'italic'), 'Actual regular italic loaded');
    assert.deepEqual(errors, [], 'No page errors');
    const zip = new JSZip();
    for (let i = 0; i < 3; i++) {
      const output = path.join(root, 'exports', filename(i + 1));
      await page.locator('.recommendation-card').nth(i).screenshot({ path: output });
      const meta = await sharp(output).metadata();
      assert.equal(meta.width, 1080); assert.equal(meta.height, 1350);
      zip.file(filename(i + 1), fs.readFileSync(output), { date: new Date('2021-01-01T00:00:00Z') });
    }
    fs.writeFileSync(path.join(root, 'sarafan-recommendations.zip'), await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
    const tiles = await Promise.all([1, 2, 3].map(async (n, i) => ({ input: await sharp(path.join(root, 'exports', filename(n))).resize(324, 405).toBuffer(), left: i * 324, top: 0 })));
    await sharp({ create: { width: 972, height: 405, channels: 3, background: '#FBEED2' } }).composite(tiles).png().toFile(path.join(root, 'preview/recommendations-contact.png'));
    fs.writeFileSync(path.join(root, 'preview/recommendations-layout.json'), JSON.stringify({ fonts, cards: layout }, null, 2) + '\n');
    console.log('PASS: Journal catalog, navigation, direct link, downloads, mobile grid/carousel, fonts, image geometry and text bounds; 3 PNGs at 1080 × 1350 and ZIP exported.');
  } finally {
    await browser?.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
