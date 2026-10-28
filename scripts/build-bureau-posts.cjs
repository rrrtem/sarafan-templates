#!/usr/bin/env node
'use strict';
// Reuse the actual Bureau template markup; author and export two example publications.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { bindPrepositions } = require('./typography.cjs');
const deps = process.env.SARAFAN_NODE_MODULES || '/Users/fixed/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium } = require(path.join(deps, 'playwright'));
const sharp = require(path.join(deps, 'sharp'));
const JSZip = require(path.join(deps, 'jszip'));
const root = path.resolve(__dirname, '..');
const ids = ['french-superlevel', 'retirement-france'];
const posts = ids.map(id => JSON.parse(fs.readFileSync(path.join(root, 'posts', id, 'content.json'), 'utf8')));
const template = /<template id="template-bureau-guide">([\s\S]*?)<\/template>/.exec(fs.readFileSync(path.join(root, 'index.html'), 'utf8'))[1];
const originals = [...template.matchAll(/<article\b[\s\S]*?<\/article>/g)].map(m => m[0]);
assert.equal(originals.length, 8);
const escape = text => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const typeHTML = html => html.split(/(<[^>]+>)/g).map(part => part.startsWith('<') ? part : bindPrepositions(part)).join('');
const number = n => String(n).padStart(2, '0');
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('file://' + root + '/index.html');
    for (const post of posts) {
      const dir = path.join(root, 'posts', post.id);
      fs.writeFileSync(path.join(dir, 'post.css'), '/* Standalone full-size publication; the source template remains unchanged. */\n*,*::before,*::after{box-sizing:border-box}html,body{margin:0;width:1080px;height:1350px;overflow:hidden}.ig-card{--card-scale:1}\n');
      for (let i = 0; i < post.cards.length; i++) {
        const card = post.cards[i];
        const article = await page.evaluate(({ markup, changes, title, id }) => {
          const fragment = document.createElement('template');
          fragment.innerHTML = markup;
          const article = fragment.content.querySelector('article');
          for (const change of changes) {
            const node = article.querySelectorAll(change.selector)[change.index];
            if (!node) throw new Error('Missing template slot: ' + change.selector + ' / ' + change.index);
            node.innerHTML = change.html;
          }
          article.setAttribute('aria-label', title);
          article.dataset.publication = id;
          article.querySelectorAll('img').forEach(img => {
            if (img.getAttribute('src').startsWith('assets/')) img.setAttribute('src', '../../' + img.getAttribute('src'));
          });
          return article.outerHTML;
        }, { markup: originals[card.templateIndex], changes: card.changes.map(c => ({ ...c, html: typeHTML(c.html) })), title: card.title, id: post.id });
        fs.writeFileSync(path.join(dir, number(i + 1) + '.html'), `<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=1080">\n<title>${escape(post.title)} · ${i + 1} — Сарафан</title>\n<link rel="stylesheet" href="../../downloads/tokens.css">\n<link rel="stylesheet" href="../../cards.css">\n<link rel="stylesheet" href="../../bureau.css">\n<link rel="stylesheet" href="post.css">\n</head>\n<body>\n${article}\n</body>\n</html>\n`);
      }
      const sourceText = post.sources.map(s => s.title + '\n' + s.url).join('\n\n');
      fs.writeFileSync(path.join(dir, 'caption.txt'), bindPrepositions(post.caption) + '\n\nИсточники:\n' + sourceText + '\n');
      fs.writeFileSync(path.join(dir, 'README.md'), '# ' + post.title + '\n\nГотовая редакционная публикация на основе «Бюро · Полезная карусель». ' + post.cards.length + ' карточек 1080 × 1350. Выбранная обложка: ' + (post.cards[0].templateIndex + 1) + '. Исходные шаблоны сохраняются.\n\nРедактирование: `content.json`; сборка и проверка: `node scripts/build-bureau-posts.cjs` из корня библиотеки. HTML — самостоятельные карточки; PNG — рядом; `png.zip` — архив; `contact-sheet.png` — контактный лист; `layout-check.json` — проверка геометрии. `caption.txt` содержит описание и ссылки.\n\n' + post.editorialNote + '\n\nПроверено: 28.10.2026.\n\n' + post.sources.map(s => '- [' + s.title + '](' + s.url + ')').join('\n') + '\n');
    }
    const context = { window: {} };
    vm.runInNewContext(fs.readFileSync(path.join(root, 'new-posts-data.js'), 'utf8'), context);
    const records = posts.map(post => ({ id: post.id, title: post.title,
      description: fs.readFileSync(path.join(root, 'posts', post.id, 'caption.txt'), 'utf8').trim(),
      source: post.sources[0].url,
      cards: post.cards.map((card, i) => ({ type: 'html', src: `posts/${post.id}/${number(i + 1)}.html`, alt: card.title })) }));
    const existing = context.window.SARAFAN_POSTS.filter(p => !ids.includes(p.id));
    fs.writeFileSync(path.join(root, 'new-posts-data.js'), '// Примеры для проверки. Состав раздела меняет владелец через коммиты, не редактор v1.\nwindow.SARAFAN_POSTS = ' + JSON.stringify([...records, ...existing], null, 2) + ';\n');
    for (const post of posts) {
      const dir = path.join(root, 'posts', post.id);
      const report = [];
      for (let i = 0; i < post.cards.length; i++) {
        await page.goto('file://' + dir + '/' + number(i + 1) + '.html');
        await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(img => img.decode())); });
        const layout = await page.locator('.ig-card').evaluate(card => {
          const b = card.getBoundingClientRect(), css = getComputedStyle(card);
          const blocks = [...card.querySelectorAll('.bureau-block')].map(node => {
            const r = node.getBoundingClientRect(), range = document.createRange(); range.selectNodeContents(node);
            const ink = range.getBoundingClientRect();
            return { text: node.textContent, left: r.left, top: r.top, right: r.right, bottom: r.bottom,
              inkLeft: ink.left, inkRight: ink.right, inkTop: ink.top, inkBottom: ink.bottom };
          });
          const overlaps = [];
          blocks.forEach((a, index) => blocks.slice(index + 1).forEach(c => {
            if (Math.min(a.inkRight, c.inkRight) - Math.max(a.inkLeft, c.inkLeft) > 2 && Math.min(a.inkBottom, c.inkBottom) - Math.max(a.inkTop, c.inkTop) > 2) overlaps.push([a.text, c.text]);
          }));
          return { width: b.width, height: b.height, variant: card.dataset.bureauVariant,
            grid: card.classList.contains('bureau-grid'), columns: css.gridTemplateColumns.split(' ').length,
            rows: css.gridTemplateRows.split(' ').length, padding: css.padding, gap: css.gap, blocks, overlaps,
            overflow: [...card.querySelectorAll('p,h2,h3,li')].filter(n => n.scrollWidth > n.clientWidth + 2).map(n => n.textContent),
            images: [...card.querySelectorAll('img')].map(img => ({ src: img.getAttribute('src'), loaded: img.complete && img.naturalWidth > 0, width: img.width, height: img.height })),
            fonts: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family) };
        });
        report.push(layout);
        await page.screenshot({ path: path.join(dir, number(i + 1) + '.png') });
      }
      const columns = 4, thumbWidth = 270, thumbHeight = 338;
      const tiles = await Promise.all(post.cards.map(async (_, i) => ({ input: await sharp(path.join(dir, number(i + 1) + '.png')).resize(thumbWidth, thumbHeight).toBuffer(), left: (i % columns) * thumbWidth, top: Math.floor(i / columns) * thumbHeight })));
      await sharp({ create: { width: columns * thumbWidth, height: Math.ceil(post.cards.length / columns) * thumbHeight, channels: 3, background: '#FBEED2' } }).composite(tiles).png().toFile(path.join(dir, 'contact-sheet.png'));
      fs.writeFileSync(path.join(dir, 'layout-check.json'), JSON.stringify(report, null, 2) + '\n');
      assert(report.every(c => c.width === 1080 && c.height === 1350), post.id + ': canvas size');
      assert(report.every(c => !c.overflow.length), post.id + ': overflow ' + JSON.stringify(report.filter(c => c.overflow.length)));
      assert(report.every(c => !c.overlaps.length), post.id + ': overlaps ' + JSON.stringify(report.filter(c => c.overlaps.length)));
      assert(report.every(c => c.images.every(img => img.loaded && img.width > 0 && img.height > 0)), post.id + ': original SVG assets');
      for (const c of report.filter(c => c.grid)) {
        assert(c.columns === 6 && c.rows === 6 && c.padding === '65px' && c.gap === '20px');
        assert(c.blocks.every(b => b.left >= 64 && b.right <= 1016 && b.top >= 64 && b.bottom <= 1286 && b.inkLeft >= 0 && b.inkRight <= 1080 && b.inkTop >= 0 && b.inkBottom <= 1350), post.id + ': text bounds ' + JSON.stringify(c));
      }
      // The accent composition uses Garamond only; verify Geist where it is used.
      assert(report.filter(c => c.variant !== 'nuance').every(c => c.fonts.includes('Geist')), post.id + ': actual Geist load');
      assert(report.some(c => c.fonts.includes('EB Garamond')), post.id + ': actual Garamond load');
      const zip = new JSZip();
      for (let i = 1; i <= post.cards.length; i++) {
        const file = path.join(dir, number(i) + '.png'), meta = await sharp(file).metadata();
        assert.equal(meta.width, 1080); assert.equal(meta.height, 1350);
        zip.file(post.id + '-' + number(i) + '.png', fs.readFileSync(file), { date: new Date('2021-01-01T00:00:00Z') });
      }
      fs.writeFileSync(path.join(dir, 'png.zip'), await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
      await page.setViewportSize({ width: 1440, height: 1100 });
      await page.goto('file://' + root + '/new-posts.html#' + post.id);
      await page.locator('.post-card iframe').last().waitFor();
      assert.equal(await page.locator('#post-title').textContent(), post.title);
      assert.equal(await page.locator('.post-card iframe').count(), post.cards.length);
      assert.equal(await page.locator(`#posts-nav [data-post="${post.id}"]`).getAttribute('aria-current'), 'true');
      assert((await page.locator('#post-description-text').textContent()).includes(post.sources[0].url));
      for (const frame of page.frames().slice(1)) await frame.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(img => img.decode())); });
      await page.screenshot({ path: path.join(root, 'preview', post.id + '-desktop.png'), fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, post.id + ': mobile width');
      await page.screenshot({ path: path.join(root, 'preview', post.id + '-mobile.png'), fullPage: true });
      await page.setViewportSize({ width: 1080, height: 1350 });
    }
    assert.deepEqual(errors, [], 'No browser errors');
    console.log('PASS: two new publications; 7 + 8 standalone HTML cards and PNGs; original assets, loaded fonts, 6×6 layout, text bounds, no overlaps, registry navigation and mobile previews; two PNG archives.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
