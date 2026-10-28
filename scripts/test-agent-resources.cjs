#!/usr/bin/env node
'use strict';

// Integration contract: a consumer can find every published dependency and verify its bytes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
assert.ok(fs.existsSync(path.join(root, 'agent-manifest.json')),
  'Agent manifest must exist so a remote consumer can discover source files');
const manifest = JSON.parse(read('agent-manifest.json'));
assert.equal(manifest.schemaVersion, 1);
assert.equal(manifest.base, './');
const entries = [...manifest.files, ...manifest.archives];
const files = new Map(entries.map(entry => [entry.path, entry]));
assert.equal(files.size, entries.length, 'Each published path is unique');
for (const entry of entries) {
  assert(!entry.path.startsWith('/') && !entry.path.includes('..') && !entry.path.includes('\\'));
  assert(!entry.path.split('/').some(part => part.startsWith('.')));
  assert(!entry.path.includes('superpowers/'), 'Internal plans are not bootstrap resources');
  assert(!/^sarafan-templates.*\.zip$/.test(entry.path), 'Do not advertise stale full archives');
  const bytes = fs.readFileSync(path.join(root, entry.path));
  assert.equal(bytes.length, entry.bytes, `Byte count: ${entry.path}`);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), entry.sha256,
    `Consumer integrity check: ${entry.path}`);
  assert(entry.mediaType.includes('/'), `MIME type: ${entry.path}`);
}
for (const required of [
  'index.html', 'catalog.js', 'cards.css', 'expert.css', 'club.css',
  'design-system.html', 'new-posts.html', 'new-posts-data.js',
  'agents.html', 'AGENTS.md', 'llms.txt', 'docs/agent-guide.md',
  'docs/design-system.md', 'scripts/download-kit.py', 'scripts/build-agent-resources.cjs',
  'scripts/test-agent-resources.cjs', 'scripts/test-download-kit.py',
  'downloads/tokens.json', 'downloads/tokens.css', 'downloads/fonts.css',
  'assets/expert-geist-v1.6.ttf', 'assets/cofo-cinema1909-regular.otf',
  'assets/expert-cover-mask.svg', 'posts/salon-november-09-15/02.html'
]) assert(files.has(required), `Bootstrap dependency is discoverable: ${required}`);

// Dependencies resolve from the containing HTML/CSS file, including nested post styles.
for (const entry of manifest.files.filter(file => /\.(html|css)$/.test(file.path))) {
  const content = read(entry.path);
  const refs = [...content.matchAll(/(?:\bsrc=["']([^"']+)["']|url\(["']?([^)'"\s]+)["']?\))/g)]
    .map(match => match[1] || match[2]);
  for (const link of content.matchAll(/<link\b[^>]+>/g)) {
    if (/\brel=["']stylesheet["']/.test(link[0])) {
      const href = /\bhref=["']([^"']+)["']/.exec(link[0]);
      if (href) refs.push(href[1]);
    }
  }
  for (const ref of refs) {
    if (/^(?:data:|https?:|#)/.test(ref)) continue;
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(entry.path), ref.split(/[?#]/)[0]));
    assert(files.has(resolved), `Downloadable dependency: ${entry.path} -> ${resolved}`);
  }
}
const context = { window: {} };
vm.runInNewContext(read('design-system-data.js'), context);
const design = JSON.parse(JSON.stringify(context.window.SARAFAN_DESIGN));
const tokens = JSON.parse(read('downloads/tokens.json'));
assert.deepEqual(tokens.canvas, { width: 1080, height: 1350, unit: 'px' });
assert.deepEqual(tokens.colors.filter(color => !color.secondary), design.colors);
assert.deepEqual(tokens.combinations, design.combinations);
assert.deepEqual(tokens.typography, design.typography);
const css = read('downloads/tokens.css');
for (const color of tokens.colors) assert(css.includes(`--sarafan-${color.id}: ${color.hex};`));
const fonts = read('downloads/fonts.css');
for (const font of tokens.fonts) {
  assert(files.has(font.path), `Downloadable font: ${font.family}`);
  assert(fonts.includes(`../${font.path}`));
}
assert(tokens.fonts.some(font => font.family === 'Sarafan Expert Geist' && font.path === 'assets/expert-geist-v1.6.ttf'));
const sourceTemplates = [...read('index.html').matchAll(/<template\b[^>]*\bid="([^"]+)"/g)];
assert.equal(manifest.templates.length, sourceTemplates.length, 'Every source template is registered');
for (const template of manifest.templates) {
  assert(read(template.source.path).includes(`id="${template.source.selector.slice(1)}"`));
  template.styles.forEach(style => assert(files.has(style)));
  assert(files.has(template.documentation));
}
vm.runInNewContext(read('new-posts-data.js'), context);
assert.deepEqual(manifest.posts, JSON.parse(JSON.stringify(context.window.SARAFAN_POSTS)));
function checkPostPaths(value) {
  if (typeof value === 'string' && /^(?:posts|assets)\//.test(value)) {
    assert(files.has(value), `Publication dependency is downloadable: ${value}`);
  } else if (Array.isArray(value)) value.forEach(checkPostPaths);
  else if (value && typeof value === 'object') Object.values(value).forEach(checkPostPaths);
}
manifest.posts.forEach(checkPostPaths);
console.log(`PASS: ${manifest.files.length} files and ${manifest.archives.length} archives have current hashes; HTML/CSS dependencies, ${manifest.templates.length} templates, posts, tokens and fonts are downloadable.`);
