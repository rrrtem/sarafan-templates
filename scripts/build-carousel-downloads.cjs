#!/usr/bin/env node
'use strict';
// Build complete PNG archives from the checked-in registry; no dependencies.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createZip } = require('../carousel-zip.js');
const root = path.resolve(__dirname, '..');
function buildCarouselDownloads() {
  const catalog = fs.readFileSync(path.join(root, 'catalog.js'), 'utf8');
  const boundary = catalog.indexOf('  const root = document.getElementById(');
  if (boundary < 0) throw new Error('Catalog data boundary changed.');
  const context = { window: {} };
  vm.runInNewContext(catalog.slice(0, boundary) + '\nglobalThis.entries = entries;\n})();', context);
  vm.runInNewContext(fs.readFileSync(path.join(root, 'new-posts-data.js'), 'utf8'), context);
  const number = n => String(n + 1).padStart(2, '0');
  function write(filename, files) {
    const data = Buffer.from(createZip(files.map(file => ({ name: file.name, data: fs.readFileSync(path.join(root, file.src)) }))));
    const destination = path.join(root, filename);
    if (!fs.existsSync(destination) || !fs.readFileSync(destination).equals(data)) fs.writeFileSync(destination, data);
  }
  for (const template of context.entries) {
    write(template.exportPrefix + '.zip', template.labels.map((_, index) => {
      const name = template.exportPrefix + '-' + number(index) + '.png';
      return { name, src: 'exports/' + name };
    }));
  }
  for (const post of context.window.SARAFAN_POSTS) {
    write('posts/' + post.id + '/carousel.zip', post.cards.map((card, index) => ({
      name: post.id + '-' + number(index) + '.png',
      src: card.cover ? card.cover.variants[card.cover.initial.palette + '-' + card.cover.initial.layout]
        : card.type === 'html' ? card.src.replace(/\.html$/, '.png') : card.src
    })));
  }
  console.log(`Built PNG carousel downloads: ${context.entries.length} templates, ${context.window.SARAFAN_POSTS.length} examples.`);
}
module.exports = { buildCarouselDownloads };
if (require.main === module) buildCarouselDownloads();
