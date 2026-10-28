// Export and verify the event poster template. Uses the same dependencies as export-transition.cjs.
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const deps = process.env.SARAFAN_NODE_MODULES || '/Users/fixed/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium } = require(path.join(deps, 'playwright'));
const sharp = require(path.join(deps, 'sharp'));

(async () => {
  const root = path.resolve(__dirname, '..');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('file://' + root + '/index.html');
    await page.evaluate(() => document.fonts.ready);
    await page.locator('[data-filter="journal"]').click();
    assert.equal(await page.locator('.template-entry:visible').count(), 3, 'Three journal templates');
    await page.locator('a[href="#event"]').click();
    await page.locator('#viewer-cards .event-card').first().waitFor();
    assert.equal(await page.locator('#viewer-title').textContent(), 'Афиша события');
    assert.equal(await page.locator('#viewer-cards .ig-card').count(), 5);
    await page.locator('[data-view="carousel"]').click();
    await page.locator('#variant-filter').selectOption('container');
    assert.equal(await page.locator('#slide-number').textContent(), '01 / 03');
    await page.keyboard.press('Tab');
    await page.keyboard.press('End');
    assert.equal(await page.locator('#download-slide').getAttribute('href'), 'exports/sarafan-event-05.png');
    await page.locator('#variant-filter').selectOption('cover');
    await page.locator('[data-view="grid"]').click();
    assert.equal(await page.locator('#viewer-cards .card-unit:visible').count(), 2);
    await page.locator('#variant-filter').selectOption('all');
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => Promise.all([...document.images].map(img => img.decode())));
    const geometry = await page.locator('#viewer-cards .ig-card').evaluateAll(cards => cards.map(card => ({
      name: card.getAttribute('aria-label'),
      images: [...card.querySelectorAll('img')].map(img => ({ src: img.getAttribute('src'), loaded: img.complete && img.naturalWidth > 0, width: img.offsetWidth, height: img.offsetHeight })),
      overflow: [...card.querySelectorAll('p')].filter(p => p.scrollWidth > p.clientWidth + 2).map(p => p.textContent)
    })));
    assert(geometry.every(card => card.images.every(img => img.loaded && img.width > 0 && img.height > 0)), 'Every local asset loads at nonzero dimensions');
    assert(geometry.every(card => !card.overflow.length), 'No horizontal text overflow');
    await page.screenshot({ path: path.join(root, 'preview/event-grid.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No mobile page overflow');
    await page.screenshot({ path: path.join(root, 'preview/event-mobile.png'), fullPage: true });
    await page.goto('file://' + root + '/index.html#event/4');
    assert.equal(await page.locator('#download-slide').getAttribute('href'), 'exports/sarafan-event-04.png', 'Deep link selects the standup card');
    await page.goto('file://' + root + '/index.html#places');
    await page.locator('#variant-filter').selectOption('text');
    assert.equal(await page.locator('#viewer-cards .card-unit:visible').count(), 6, 'Places formats still work');
    await page.goto('file://' + root + '/index.html#event');
    await page.evaluate(() => {
      document.body.replaceChildren(document.getElementById('template-event').content.cloneNode(true));
      const style = document.createElement('style');
      style.textContent = 'body{margin:0;background:white}.card-unit{display:block!important}.card-shell{position:relative!important;width:1080px!important;height:1350px!important;overflow:hidden!important}.ig-card{transform:none!important}';
      document.head.append(style);
    });
    await page.setViewportSize({ width: 1080, height: 1350 });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => Promise.all([...document.images].map(img => img.decode())));
    for (let i = 0; i < 5; i++) await page.locator('.ig-card').nth(i).screenshot({ path: path.join(root, `exports/sarafan-event-${String(i + 1).padStart(2, '0')}.png`) });
    const tiles = await Promise.all(Array.from({ length: 5 }, async (_, i) => ({
      input: await sharp(path.join(root, `exports/sarafan-event-${String(i + 1).padStart(2, '0')}.png`)).resize(324, 405).toBuffer(),
      left: (i % 3) * 324, top: Math.floor(i / 3) * 405
    })));
    await sharp({ create: { width: 972, height: 810, channels: 3, background: '#f0efeb' } }).composite(tiles).png().toFile(path.join(root, 'preview/event-contact.png'));
    for (let i = 1; i <= 5; i++) assert(fs.statSync(path.join(root, `exports/sarafan-event-${String(i).padStart(2, '0')}.png`)).size > 0);
    assert.deepEqual(errors, [], 'No browser errors');
    console.log(JSON.stringify({ verified: 'Journal category, five cards, cover/container filters, keyboard navigation, download links, deep link, places regression, mobile width, local images, five 1080×1350 PNG exports', geometry }, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
