#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const deps = process.env.SARAFAN_NODE_MODULES || '/Users/fixed/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium } = require(path.join(deps, 'playwright'));
const context = {window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'design-system-data.js'),'utf8'),context);
const data = context.window.SARAFAN_DESIGN;
(async () => {
  const directory = path.join(root,'downloads/examples');
  fs.mkdirSync(directory,{recursive:true});
  const browser = await chromium.launch({headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1080,height:1350},deviceScaleFactor:1});
    for (const combo of data.combinations) {
      const file = path.join(directory,`color-${combo.id}.html`);
      const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${combo.name} · сочетание SARAFAN</title><link rel="stylesheet" href="../../cards.css"><style>*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1350px}body{background:${combo.background};color:${combo.color};font-synthesis:none}.demo{width:1080px;height:1350px;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));grid-template-rows:repeat(6,minmax(0,1fr));padding:65px;gap:20px}.demo p{grid-column:1/7;grid-row:2/6;align-self:center;margin:0;text-align:center;font:400 90px/1 Geist,sans-serif}.demo em{font-family:"EB Garamond",serif;font-weight:500;color:${combo.accent}}</style></head><body><main class="demo" aria-label="Пример сочетания цвета фона, текста и курсивного акцента"><p>Почувствовать<br><em>себя<br>как дома</em></p></main></body></html>\n`;
      fs.writeFileSync(file,html);
      await page.goto(pathToFileURL(file).href);
      await page.evaluate(() => document.fonts.ready);
      const check = await page.evaluate(() => ({fonts:document.fonts.check('400 90px Geist') && document.fonts.check('italic 500 90px "EB Garamond"'),fits:document.documentElement.scrollWidth===1080 && document.documentElement.scrollHeight===1350}));
      if (!check.fonts || !check.fits) throw new Error('Invalid example: '+combo.id);
      await page.screenshot({path:file.replace('.html','.png')});
    }
    console.log(`Built ${data.combinations.length} color examples, HTML + PNG, 1080 × 1350.`);
  } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exitCode=1;});
