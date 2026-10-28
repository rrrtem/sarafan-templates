#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const normalize = svg => svg.replace(/#[0-9a-f]{6}/gi,'#COLOR').trim();
for (const [symbol,files] of [
  ['bureau',['assets/expert-about-logo.svg','assets/expert-contact-logo.svg','assets/expert-questions-logo.svg','assets/expert-session-logo.svg','assets/intro-3-group82.svg','assets/bureau-live-dark-mark.svg','assets/bureau-live-light-mark.svg','posts/ingrid-aromatherapy/marks/mark-olive.svg','posts/ingrid-aromatherapy/marks/mark-blue.svg','posts/ingrid-aromatherapy/marks/mark-cream.svg']],
  ['horse',fs.readdirSync(path.join(root,'assets')).filter(f=>/^club-\d+-group93\.svg$/.test(f)).map(f=>'assets/'+f)]
]) {
  const original=read(`assets/symbol-${symbol}-figma.svg`);
  assert(!original.includes('<image')&&!original.includes('#1E1E1E'),'Real transparent vector: '+symbol);
  for(const file of files) assert(normalize(read(file))===normalize(original),'Updated original contours: '+file);
}
const source=read('index.html');
assert(!/class="(?:intro-logo-piece|transition-heart-piece)"/.test(source),'One complete SVG replaces obsolete fragments');
assert(!/src="assets\/intro-(?:3826|4910)-logo\.png"/.test(source),'Templates use SVG horse and sirin');
const manifest=JSON.parse(read('downloads/manifest.json'));
for (const id of ['rooster-orange','bureau-orange','club-horse','sirin']) {
  const asset=manifest.assets.find(a=>a.id===id);
  assert(asset?.formats.SVG && asset.formats.PNG && asset.formats.PDF,'Every updated mark is downloadable as SVG/PNG/PDF: '+id);
  for (const file of Object.values(asset.formats)) assert(fs.statSync(path.join(root,file)).size>0,'Nonempty download: '+file);
}
console.log('PASS symbols: original transparent Figma contours, all legacy aliases and publication variants, no fragmented/raster marks in templates, four vector downloads.');
