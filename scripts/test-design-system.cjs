#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const deps = process.env.SARAFAN_NODE_MODULES || '/Users/fixed/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium } = require(path.join(deps, 'playwright'));
const sharp = require(path.join(deps, 'sharp'));
const root = path.resolve(__dirname, '..');
(async () => {
  const server = http.createServer((req, res) => {
    const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
    fs.readFile(file, (error, bytes) => {
      if (error) return res.writeHead(404).end();
      res.setHeader('Content-Type', ({ '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.svg':'image/svg+xml', '.png':'image/png', '.ttf':'font/ttf', '.otf':'font/otf' })[path.extname(file)] || 'application/octet-stream');
      res.end(bytes);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless:true });
  const failures = [];
  try {
    const page = await browser.newPage({ viewport:{width:1440,height:1000}, acceptDownloads:true });
    page.setDefaultTimeout(5000);
    page.on('pageerror', e => failures.push(e.message));
    page.on('response', r => { if (r.status() >= 400 && !r.url().endsWith('favicon.ico')) failures.push(`${r.status()} ${r.url()}`); });
    const origin = 'http://127.0.0.1:' + server.address().port;
    await page.goto(origin + '/design-system.html');
    await page.evaluate(async () => { await document.fonts.ready; document.querySelectorAll('img').forEach(i => i.loading='eager'); await Promise.all([...document.images].filter(i => i.getAttribute('src')).map(i => i.decode().catch(e => { throw new Error(i.src+': '+e.message); }))); });
    // Every palette color is usable as a clean full-size background.
    const colors = await page.evaluate(() => [...SARAFAN_DESIGN.colors, ...SARAFAN_DESIGN.additionalColors]);
    assert.equal(colors.length, 12);
    assert.equal(new Set(colors.map(color => color.hex)).size, 12);
    assert(!colors.some(color => color.id === 'dusty-rose'));
    for (const color of colors) {
      for (const height of [1350, 1920]) {
        const link = page.locator(`#colors a[download][href$="${color.id}-1080x${height}.png"]`);
        assert.equal(await link.count(), 1);
        const response = await page.request.get(origin + '/' + await link.getAttribute('href'));
        assert(response.ok());
        const background = sharp(await response.body());
        const metadata = await background.metadata();
        assert.equal(metadata.width, 1080);
        assert.equal(metadata.height, height);
        const channels = (await background.stats()).channels;
        const rgb = [1,3,5].map(i => parseInt(color.hex.slice(i,i+2),16));
        rgb.forEach((value,i) => {
          assert.equal(channels[i].min, value, 'Solid background without labels');
          assert.equal(channels[i].max, value, 'Solid background without labels');
        });
      }
    }
    const backgroundEvent = page.waitForEvent('download');
    await page.locator('.ds-background-links a').first().click();
    assert.equal((await sharp(await (await backgroundEvent).path()).metadata()).width, 1080);
    assert.equal(await page.locator('#font-downloads .ds-font-files a[download]').count(), 3, 'One download per family');
    assert.equal(await page.locator('#font-downloads a[href="https://fonts.google.com/specimen/EB+Garamond"]').count(), 1);
    assert.equal(await page.locator('#font-downloads a[href="https://vercel.com/font"]').count(), 1);
    assert.equal(await page.locator('#wordmarks [data-asset="sarafan-wordmark-since"]').count(), 0);
    assert.equal(await page.locator('#logos #wordmarks, #logos #symbol-assets, #logos #brand-colors').count(), 3, 'One section contains logos, symbols and their shared color choice');
    // A single color choice changes the preview and the actual downloadable vectors.
    assert.equal(await page.locator('[data-brand-color]').count(), 3, 'One compact selector offers three brand colors');
    await page.locator('[data-brand-color="brown"]').click();
    assert.equal(await page.locator('[data-brand-color="brown"]').getAttribute('aria-pressed'), 'true');
    const colorDownloadEvent = page.waitForEvent('download');
    await page.locator('#wordmarks .ds-asset-links a').first().click();
    const colorDownload = await colorDownloadEvent;
    assert((await fs.promises.readFile(await colorDownload.path(), 'utf8')).includes('#553D3D'), 'Downloaded wordmark uses the selected color');
    assert.equal(await page.locator('#symbol-assets .ds-asset[data-color="brown"]').count(), 4, 'All four symbols follow the shared choice');
    await page.locator('[data-brand-color="cream"]').click();
    assert(await page.locator('#wordmarks .ds-asset-preview').evaluateAll(nodes => nodes.length === 2 && nodes.every(node => getComputedStyle(node).backgroundColor === 'rgba(0, 0, 0, 0)')), 'Logo previews have no backing panels');
    await page.locator('[data-brand-color="orange"]').click();
    // A designer can inspect a real card, then download its full-size image.
    const specimen = page.locator('[data-specimen]').first();
    assert(await specimen.count(), 'Full-size typography examples must be available');
    await specimen.click();
    assert(await page.locator('#specimen-dialog').isVisible(), 'Example opens without leaving the library');
    const downloadEvent = page.waitForEvent('download');
    await page.locator('#specimen-download').click();
    const download = await downloadEvent;
    const dimensions = await sharp(await download.path()).metadata();
    assert.equal(dimensions.width, 1080);
    assert.equal(dimensions.height, 1350);
    await page.locator('#specimen-close').click();
    await page.locator('.ds-specimen details summary').first().click();
    assert(await page.locator('.ds-specimen details[open]').count(), 'Typography parameters can be revealed');
    await page.locator('.ds-specimen details summary').first().click();
    const paths = await page.locator('a[download]').evaluateAll(nodes => [...new Set(nodes.map(n => n.getAttribute('href')))].filter(Boolean));
    for (const href of paths) assert((await page.request.get(origin + '/' + href)).ok(), 'Available download: ' + href);
    const vectorEvent = page.waitForEvent('download');
    await page.locator('.ds-asset-links a').first().click();
    const vector = await vectorEvent;
    assert((await fs.promises.readFile(await vector.path(), 'utf8')).includes('<svg'), 'SVG download contains vector artwork');
    for (const width of [1440, 1000, 768, 390, 320]) {
      await page.setViewportSize({width,height:900});
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      if (overflow) console.log(await page.locator('body *').evaluateAll(nodes => nodes.filter(n=>n.getBoundingClientRect().right>innerWidth+1).map(n=>({tag:n.tagName,cls:n.className,text:n.textContent.slice(0,55),right:n.getBoundingClientRect().right})).slice(-25)));
      assert.equal(overflow, false, 'Fits width ' + width);
    }
    await page.setViewportSize({width:1440,height:1100});
    await page.evaluate(() => scrollTo(0,0));
    await page.screenshot({path:path.join(root,'preview/design-system-visual-desktop.png'),fullPage:true});
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:path.join(root,'preview/design-system-visual-mobile.png'),fullPage:true});
    await page.goto('file://' + path.join(root,'design-system.html'));
    await page.evaluate(() => document.fonts.ready);
    assert(await page.locator('[data-specimen]').count(), 'Local file viewing works');
    const localBackgroundEvent = page.waitForEvent('download');
    await page.locator('.ds-background-links a').nth(1).click();
    const localBackground = await sharp(await (await localBackgroundEvent).path()).metadata();
    assert.equal(localBackground.width,1080); assert.equal(localBackground.height,1920);
    await page.locator('[data-brand-color="brown"]').click();
    const localDownloadEvent = page.waitForEvent('download');
    await page.locator('#symbol-assets .ds-asset-links a').first().click();
    const localDownload = await localDownloadEvent;
    assert((await fs.promises.readFile(await localDownload.path(), 'utf8')).includes('#553D3D'), 'Selected SVG color downloads through file://');

    assert.deepEqual(failures, [], 'No missing resources or browser errors');
    console.log(`PASS design system: full-size image inspection/download, SVG download, ${paths.length} download targets, file://, 320–1440 px, no browser errors.`);
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode=1; });
