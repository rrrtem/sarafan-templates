#!/usr/bin/env node
'use strict';
// Refresh existing cards after shared typography changes, preserving each template's canvas.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const deps = process.env.SARAFAN_NODE_MODULES || '/Users/fixed/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium } = require(path.join(deps,'playwright'));
const sharp = require(path.join(deps,'sharp'));
const JSZip = require(path.join(deps,'jszip'));
const root = path.resolve(__dirname,'..');
(async () => {
  const browser = await chromium.launch({headless:true});
  const report = [];
  const errors = [];
  try {
    const page = await browser.newPage({viewport:{width:1080,height:1350},deviceScaleFactor:1});
    page.on('pageerror',e => errors.push(e.message));
    await page.goto(pathToFileURL(path.join(root,'index.html')).href);
    const sources = await page.locator('template').evaluateAll(nodes => nodes.map(t => ({
      id:t.id.replace(/^(template-|reference-)/,''),cards:[...t.content.querySelectorAll('.ig-card')].map(c=>c.outerHTML)
    })).filter(t=>t.cards.length));
    const style = await page.addStyleTag({content:'html,body{margin:0!important;padding:0!important;width:1080px!important;background:transparent!important}.ig-card{position:relative!important;transform:none!important;--card-scale:1!important}'});
    assert(style);
    for (const source of sources) {
      const zip = new JSZip();
      for (let i=0;i<source.cards.length;i++) {
        await page.evaluate(html => {document.body.innerHTML=html;document.querySelectorAll('img').forEach(img=>img.loading='eager');},source.cards[i]);
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all([...document.images].map(img=>img.decode().catch(e=>{throw new Error(img.src+': '+e.message);})));
        });
        const canvas = await page.locator('.ig-card').evaluate(c=>({width:c.offsetWidth,height:c.offsetHeight}));
        assert.equal(canvas.width,1080);
        assert([1350,1920].includes(canvas.height),source.id+': source canvas');
        await page.setViewportSize(canvas);
        const check = await page.locator('.ig-card').evaluate(card => ({
          overflow:[...card.querySelectorAll('p,h2,h3,li,blockquote')].filter(n=>n.clientWidth && n.scrollWidth>n.clientWidth+2).map(n=>({text:n.textContent.slice(0,100),excess:n.scrollWidth-n.clientWidth})),
          fonts:[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family),
          obsolete:[...card.querySelectorAll('*')].filter(n=>/Inter|Sarafan .*Geist/.test(getComputedStyle(n).fontFamily)).map(n=>n.tagName)
        }));
        assert.deepEqual(check.obsolete,[],source.id+': one Geist family');
        const name=`sarafan-${source.id}-${String(i+1).padStart(2,'0')}.png`;
        const file=path.join(root,'exports',name);
        await page.locator('.ig-card').screenshot({path:file});
        const size=await sharp(file).metadata();
        assert.equal(size.width,canvas.width);assert.equal(size.height,canvas.height);
        zip.file(name,fs.readFileSync(file),{date:new Date('2021-01-01T00:00:00Z')});
        report.push({id:source.id,slide:i+1,canvas,...check});
      }
      const archive=path.join(root,`sarafan-${source.id}.zip`);
      if (fs.existsSync(archive)) fs.writeFileSync(archive,await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:9}}));
      console.log(`Exported ${source.id}: ${source.cards.length} cards.`);
    }
    fs.writeFileSync(path.join(root,'preview/unified-typography-layout.json'),JSON.stringify(report,null,2)+'\n');
    assert.deepEqual(errors,[],'No browser errors');
    const overflow=report.filter(r=>r.overflow.length);
    if(overflow.length) console.log('Text metrics to inspect: '+JSON.stringify(overflow.map(r=>({id:r.id,slide:r.slide,overflow:r.overflow}))));
    console.log(`Exported ${report.length} cards across ${sources.length} templates with a single Geist 1.6.`);
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
