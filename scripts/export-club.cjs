// Export and smoke-check the club reference and event poster templates.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const deps = process.env.SARAFAN_NODE_MODULES || '/Users/fixed/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium } = require(path.join(deps, 'playwright'));
const sharp = require(path.join(deps, 'sharp'));
const JSZip = require(path.join(deps, 'jszip'));

(async () => {
  const root = path.resolve(__dirname, '..');
  const url = 'file://' + root + '/index.html';
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url);
    await page.locator('[data-filter="club"]').click();
    assert.equal(await page.locator('.template-entry:visible').count(), 2);
    assert.equal(await page.locator('[data-filter="club"] span').textContent(), '2');
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(root, 'preview/club-catalog.png'), fullPage: true });
    const sets = [
      { id: 'club-salon', source: 'reference-club-salon', count: 3 },
      { id: 'club-event', source: 'template-club-event', count: 6 }
    ];
    const geometry = [];
    for (const set of sets) {
      // Export replaces the document body; use a fresh document for each set.
      await page.goto('about:blank');
      await page.goto(url + '#' + set.id);
      await page.locator('#viewer-cards .club-card').first().waitFor();
      assert.equal(await page.locator('#viewer-cards .club-card').count(), set.count);
      await page.locator('button[data-view="grid"]').click();
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => Promise.all([...document.images].map(img => img.decode())));
      const slots = await page.locator('#viewer-cards .club-card').evaluateAll(cards => cards.map(card => ({
        id: card.dataset.nodeId,
        assets: [...card.querySelectorAll('img')].map(img => ({ src: img.getAttribute('src'), loaded: img.complete && img.naturalWidth > 0, width: img.offsetWidth, height: img.offsetHeight })),
        overflow: [...card.querySelectorAll('p,h2')].filter(el => el.scrollWidth > el.clientWidth + 2).map(el => el.className)
      })));
      assert(slots.every(c => c.assets.every(img => img.loaded && img.width > 0 && img.height > 0)), 'All assets load with nonzero geometry');
      assert(slots.every(c => !c.overflow.length), 'Text fits its fixed width');
      if(set.id==='club-event') {
        const layout=await page.locator('#viewer-cards .club-poster').evaluateAll(cards=>cards.map(card=>{
          const description=card.querySelector('.club-poster-description'),zone=card.querySelector('.club-poster-heading-zone');
          return {bottom:description.offsetTop+description.offsetHeight+description.parentElement.offsetTop,zoneHeight:zone.offsetHeight};
        }));
        assert(layout.every(item=>item.bottom===1285&&item.zoneHeight>0),'Poster descriptions end at the 65 px bottom margin');
      }
      geometry.push(...slots);
      await page.screenshot({ path: path.join(root, `preview/${set.id}-grid.png`), fullPage: true });
      await page.locator('button[data-view="carousel"]').click();
      await page.keyboard.press('End');
      assert.equal(await page.locator('#download-slide').getAttribute('href'), `exports/sarafan-${set.id}-${String(set.count).padStart(2, '0')}.png`);
      await page.keyboard.press('Home');
      assert.equal(await page.locator('#slide-number').textContent(), `01 / ${String(set.count).padStart(2, '0')}`);
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No mobile page overflow');
      await page.screenshot({ path: path.join(root, `preview/${set.id}-mobile.png`), fullPage: true });
      await page.goto(url + '#' + set.id + '/' + set.count);
      assert.equal(await page.locator('#download-slide').getAttribute('href'), `exports/sarafan-${set.id}-${String(set.count).padStart(2, '0')}.png`);
      await page.evaluate(source => {
        document.body.replaceChildren(document.getElementById(source).content.cloneNode(true));
        const style = document.createElement('style');
        style.textContent = 'body{margin:0;background:white}.card-unit{display:block!important}.card-shell{position:relative!important;width:1080px!important;height:1350px!important;overflow:hidden!important}.ig-card{transform:none!important}';
        document.head.append(style);
      }, set.source);
      await page.setViewportSize({ width: 1080, height: 1350 });
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => Promise.all([...document.images].map(img => img.decode())));
      assert(await page.evaluate(() => document.fonts.check('110px "CoFo Cinema 1909"')));
      const zip = new JSZip();
      const tiles = [];
      for (let i = 0; i < set.count; i++) {
        const name = `sarafan-${set.id}-${String(i + 1).padStart(2, '0')}.png`;
        const file = path.join(root, 'exports', name);
        await page.locator('.ig-card').nth(i).screenshot({ path: file });
        const meta = await sharp(file).metadata();
        assert.equal(meta.width, 1080); assert.equal(meta.height, 1350);
        zip.file(name, fs.readFileSync(file));
        tiles.push({ input: await sharp(file).resize(324, 405).toBuffer(), left: (i % 3) * 324, top: Math.floor(i / 3) * 405 });
      }
      fs.writeFileSync(path.join(root, `sarafan-${set.id}.zip`), await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
      await sharp({ create: { width: 972, height: Math.ceil(set.count / 3) * 405, channels: 3, background: '#f0efeb' } }).composite(tiles).png().toFile(path.join(root, `preview/${set.id}-contact.png`));
      await page.setViewportSize({ width: 1440, height: 1100 });
    }
    await page.goto('about:blank');
    await page.goto(url + '#event');
    assert.equal(await page.locator('#viewer-cards .ig-card').count(), 4, 'Existing journal posters remain accessible');
    await page.goto(url + '#places');
    await page.locator('#variant-filter').selectOption('text');
    assert.equal(await page.locator('#viewer-cards .card-unit:visible').count(), 6, 'Existing place filters work');
    await page.goto('file://' + root + '/design-system.html#type-club');
    assert.equal(await page.locator('#type-club .ds-type').count(), 4, 'Club typography is documented');
    await page.evaluate(() => document.fonts.ready);
    assert(await page.evaluate(() => document.fonts.check('100px "CoFo Cinema 1909"')));
    await page.locator('#type-club').screenshot({ path: path.join(root, 'preview/club-typography.png') });
    assert.deepEqual(errors, [], 'No browser errors');
    console.log(JSON.stringify({ verified: 'Two club entries; three style references; six posters; local fonts and image geometry; keyboard navigation; deep links; download links; mobile layout; existing routes; nine 1080×1350 PNGs; two ZIPs', geometry }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
