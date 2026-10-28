#!/usr/bin/env node
'use strict';

// Publish portable resources using only Node's standard library. No rendering or network.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
require('./build-carousel-downloads.cjs').buildCarouselDownloads();
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const write = (name, text) => fs.writeFileSync(path.join(root, name), text);
const json = value => JSON.stringify(value, null, 2) + '\n';
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const rootNames = fs.readdirSync(root).sort();

function browserData(filename, key) {
  const context = { window: {} };
  vm.runInNewContext(read(filename), context, { filename, timeout: 1000 });
  if (!context.window[key]) throw new Error(`Missing ${key} in ${filename}`);
  return JSON.parse(JSON.stringify(context.window[key]));
}

function fontFaces() {
  const fonts = new Map();
  for (const filename of rootNames.filter(name => name.endsWith('.css'))) {
    for (const match of read(filename).matchAll(/@font-face\s*\{([^}]+)\}/g)) {
      const body = match[1];
      const field = name => new RegExp(`${name}:\\s*([^;]+)`).exec(body)?.[1].trim().replace(/^["']|["']$/g, '');
      const source = /url\(["']?([^)'"\s]+)["']?\)\s*format\(["']([^"']+)["']\)/.exec(body);
      if (!source) throw new Error(`Unrecognized font source in ${filename}`);
      if (!fs.existsSync(path.join(root, source[1]))) throw new Error(`Missing font file: ${filename} -> ${source[1]}`);
      const font = { family: field('font-family'), style: field('font-style') || 'normal',
        weight: field('font-weight') || '400', path: source[1], format: source[2] };
      fonts.set(`${font.family}:${font.weight}:${font.style}`, font);
    }
  }
  return [...fonts.values()];
}

const design = browserData('design-system-data.js', 'SARAFAN_DESIGN');
const fonts = fontFaces();
const colors = [...design.colors, ...design.additionalColors.map(color => ({ ...color, secondary: true }))];
const tokens = { schemaVersion: 1, canvas: { width: 1080, height: 1350, unit: 'px' },
  layout: design.layout, colors, combinations: design.combinations, typography: design.typography, fonts };
write('downloads/tokens.json', json(tokens));
const properties = [
  '  --sarafan-card-width: 1080px;', '  --sarafan-card-height: 1350px;',
  `  --sarafan-grid-columns: ${design.layout.columns};`,
  `  --sarafan-grid-rows: ${design.layout.rows};`,
  `  --sarafan-grid-margin: ${design.layout.margin}px;`,
  `  --sarafan-grid-gutter: ${design.layout.gutter}px;`,
  ...colors.map(color => `  --sarafan-${color.id}: ${color.hex};`),
  '  --paper: var(--sarafan-cream);', '  --ink: var(--sarafan-brown);',
  '  --blue: var(--sarafan-blue);', '  --ui-accent: var(--sarafan-orange);',
  '  --card-scale: 1;'
];
for (const group of design.typography) {
  group.styles.forEach((style, index) => {
    const prefix = `--sarafan-type-${group.id}-${index + 1}`;
    properties.push(`  ${prefix}-family: ${JSON.stringify(style.family)};`,
      `  ${prefix}-size: ${style.size}px;`, `  ${prefix}-line: ${style.line};`,
      `  ${prefix}-weight: ${style.weight};`, `  ${prefix}-style: ${style.style || 'normal'};`);
    if (style.tracking !== undefined) properties.push(`  ${prefix}-tracking: ${style.tracking}px;`);
  });
}
write('downloads/tokens.css', '/* Generated from design-system-data.js. Sizes refer to a 1080 × 1350 card. */\n:root {\n' + properties.join('\n') + '\n}\n');
write('downloads/fonts.css', '/* Generated from existing CSS; URLs resolve relative to this file. */\n' + fonts.map(font =>
  `@font-face { font-family: ${JSON.stringify(font.family)}; font-style: ${font.style}; font-weight: ${font.weight}; font-display: block; src: url("../${font.path}") format("${font.format}"); }`).join('\n') + '\n');

// Reuse catalog metadata, stopping before its DOM code. The catalog stays usable as file://.
const catalog = read('catalog.js');
const boundary = catalog.indexOf('  const root = document.getElementById(');
if (boundary < 0) throw new Error('Catalog data boundary changed; update the agent exporter.');
const catalogContext = {};
vm.runInNewContext(catalog.slice(0, boundary) + '\n globalThis.entries = entries;\n})();',
  catalogContext, { timeout: 1000 });
const profiles = {
  recommendations: ['recommendations.css', 'docs/recommendations-template.md'],
  'reels-cover': ['vertical.css', 'docs/vertical-templates.md'],
  'bureau-live': ['vertical.css', 'docs/vertical-templates.md'],
  'bureau-guide': ['bureau.css', 'docs/bureau-template.md'],
  'ads-retreat': ['ads.css', 'docs/ads-template.md'],
  'club-event': ['club.css', 'docs/club-templates.md'],
  'club-salon': ['club.css', 'docs/club-templates.md'],
  proust: [null, 'docs/design-system.md'], places: [null, 'docs/design-system.md'],
  event: ['event.css', 'docs/event-template.md'], expert: ['expert.css', 'docs/expert-template.md'],
  intro: ['intro.css', 'docs/intro-reference.md'], transition: ['transition.css', 'docs/transition-reference.md']
};
const templates = JSON.parse(JSON.stringify(catalogContext.entries)).map(entry => {
  const profile = profiles[entry.id];
  if (!profile) throw new Error(`Add an agent source profile for template ${entry.id}`);
  return { id: entry.id, title: entry.name, category: entry.category, kind: entry.kind || 'template',
    href: `index.html#${entry.id}`, canvas: entry.canvas || { width: 1080, height: 1350 }, source: { path: 'index.html',
      selector: '#' + (entry.source || 'template-' + entry.id), cardSelector: '.ig-card' },
    styles: ['downloads/tokens.css', 'downloads/fonts.css', 'cards.css', ...(profile[0] ? [profile[0]] : [])],
    documentation: profile[1], labels: entry.labels };
});

const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.cjs': 'text/javascript',
  '.json': 'application/json', '.md': 'text/markdown', '.txt': 'text/plain', '.py': 'text/plain',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.pdf': 'application/pdf',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2', '.zip': 'application/zip' };
const publicFiles = rootNames.filter(name => /\.(?:html|css|js|zip)$/.test(name) && !/^sarafan-templates.*\.zip$/.test(name));
publicFiles.push('README.md', 'AGENTS.md', 'llms.txt');
publicFiles.push(...fs.readdirSync(path.join(root, 'scripts')).sort()
  .filter(name => /\.(?:cjs|py)$/.test(name)).map(name => `scripts/${name}`));
function walk(directory) {
  for (const entry of fs.readdirSync(path.join(root, directory), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    if (entry.name.startsWith('.') || entry.name === 'superpowers') continue;
    const relative = `${directory}/${entry.name}`;
    if (entry.isSymbolicLink()) throw new Error(`Public resources cannot be symbolic links: ${relative}`);
    if (entry.isDirectory()) walk(relative);
    else if (entry.isFile()) publicFiles.push(relative);
  }
}
for (const directory of ['assets', 'downloads', 'posts', 'exports', 'docs']) walk(directory);
const records = [...new Set(publicFiles)].sort().map(filename => {
  const full = path.join(root, filename);
  if (!fs.lstatSync(full).isFile()) throw new Error(`Not a regular public file: ${filename}`);
  const data = fs.readFileSync(full);
  const mediaType = mime[path.extname(filename).toLowerCase()];
  if (!mediaType) throw new Error(`Unknown media type: ${filename}`);
  return { path: filename, mediaType, bytes: data.length, sha256: digest(data) };
});
const manifest = { schemaVersion: 1, base: './',
  description: 'Current SARAFAN sources and design resources. Resolve each path relative to this manifest URL.',
  resources: { instructions: 'AGENTS.md', guide: 'docs/agent-guide.md', entry: 'agents.html',
    tokens: 'downloads/tokens.json', tokenStyles: 'downloads/tokens.css', fonts: 'downloads/fonts.css',
    rules: 'docs/design-system.md', curatedAssets: 'downloads/manifest.json', downloader: 'scripts/download-kit.py' },
  templates, posts: browserData('new-posts-data.js', 'SARAFAN_POSTS'),
  files: records.filter(record => record.mediaType !== 'application/zip'),
  archives: records.filter(record => record.mediaType === 'application/zip') };
write('agent-manifest.json', json(manifest));
console.log(`Published ${manifest.files.length} files, ${manifest.archives.length} archives, ${templates.length} template sources and ${fonts.length} font faces.`);
