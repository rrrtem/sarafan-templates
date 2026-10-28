#!/usr/bin/env node
'use strict';

// Offline build. Uses only the project's original assets, local fonts and installed tools.
// Node modules: sharp, playwright, pdf-lib, jszip. Optional wordmark: python3/fontTools + hb-shape.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const destination = path.join(root, 'downloads');
const runtimeModules = process.env.SARAFAN_NODE_MODULES ||
  '/Users/fixed/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const dependency = name => require(require.resolve(name, { paths: [root, runtimeModules] }));
const sharp = dependency('sharp');
const { chromium } = dependency('playwright');
const { PDFDocument } = dependency('pdf-lib');
const JSZip = dependency('jszip');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const write = (relative, contents) => {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
};
const numeric = value => Number(Number(value).toFixed(9));
const attribute = (svg, name) => new RegExp(`\\b${name}="([^"]+)"`).exec(svg)?.[1];

const palette = [
  { id: 'cream', title: 'Кремовый', hex: '#FBEED2' },
  { id: 'brown', title: 'Коричневый', hex: '#553D3D' },
  { id: 'blue', title: 'Голубой', hex: '#A9C9DF' },
  { id: 'orange', title: 'Оранжевый', hex: '#FF3C00' },
  { id: 'pink', title: 'Розовый', hex: '#E19A9B' },
  { id: 'olive', title: 'Оливковый', hex: '#91945B' },
  { id: 'slate', title: 'Серо-синий', hex: '#606D82', secondary: true },
  { id: 'sand', title: 'Песочный', hex: '#E4D5B6', secondary: true },
  { id: 'forest', title: 'Тёмно-зелёный', hex: '#014B3E', secondary: true },
  { id: 'dusty-rose', title: 'Пыльно-розовый', hex: '#C98384', secondary: true },
  { id: 'terracotta', title: 'Терракотовый', hex: '#B54F1A', secondary: true }
];

const originalVector = (id, title, source, category = 'logo', note = '') => ({
  id, title, source: `assets/${source}`, category, note, svg: read(`assets/${source}`)
});

function composedHeart(variant) {
  const html = read('index.html');
  const className = variant === 'orange' ? 'intro-cover' : 'intro-finale';
  const article = new RegExp(`<article[^>]*class="[^"]*\\b${className}\\b[^"]*"[\\s\\S]*?<\\/article>`).exec(html)?.[0];
  if (!article) throw new Error(`Original ${className} article not found`);
  const original = /\.intro-original\{[^}]*width:([\d.]+)px;height:([\d.]+)px;transform:scale\(([\d.]+)\)/.exec(read('intro.css'));
  if (!original) throw new Error('Original introduction coordinate system not found');
  const [, originalWidth, originalHeight, factor] = original.map(Number);
  const pieces = [...article.matchAll(/<div class="intro-logo-piece" style="inset:([^"]+)"[^>]*><img src="(assets\/[^\"]+)"[^>]*><\/div>/g)].map(match => {
    const [top, , , left] = match[1].split(/\s+/).map(parseFloat);
    const svg = read(match[2]);
    return { source: match[2], svg, x: originalWidth * left / 100,
      y: originalHeight * top / 100, width: Number(attribute(svg, 'width')),
      height: Number(attribute(svg, 'height')) };
  });
  if (pieces.length !== 11) throw new Error(`Expected 11 original pieces for ${variant}, got ${pieces.length}`);
  const x0 = Math.min(...pieces.map(p => p.x));
  const y0 = Math.min(...pieces.map(p => p.y));
  const width = numeric((Math.max(...pieces.map(p => p.x + p.width)) - x0) * factor);
  const height = numeric((Math.max(...pieces.map(p => p.y + p.height)) - y0) * factor);
  // Nest each untouched source SVG. Only its original position and the existing parent scale apply.
  const content = pieces.map(piece => piece.svg.replace('<svg ',
    `<svg x="${numeric((piece.x - x0) * factor)}" y="${numeric((piece.y - y0) * factor)}" `)
    .replace(/\bwidth="[^"]+"/, `width="${numeric(piece.width * factor)}"`)
    .replace(/\bheight="[^"]+"/, `height="${numeric(piece.height * factor)}"`)).join('\n');
  return { id: `heart-${variant}`, title: variant === 'orange' ? 'Сердце · оранжевое' : 'Сердце · кремовое',
    category: 'logo', source: pieces.map(p => p.source),
    note: '11 исходных SVG-фрагментов, позиции из index.html / intro-logo-piece; общий crop и исходный масштаб intro-original. Контуры не изменены.',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n${content}\n</svg>\n` };
}

function outlinedWordmark() {
  // HarfBuzz supplies real OpenType positioning; fontTools extracts original glyph outlines.
  // If either installed tool is unavailable, omit the optional mark instead of approximating it.
  try {
    const python = String.raw`
import json, subprocess
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
font = TTFont('assets/eb-garamond-medium.ttf')
glyphs = font.getGlyphSet()
run = json.loads(subprocess.check_output(['hb-shape', 'assets/eb-garamond-medium.ttf', 'Сарафан', '--output-format=json'], text=True))
size = 140
scale = size / font['head'].unitsPerEm
outline = SVGPathPen(glyphs)
bounds = BoundsPen(glyphs)
x = y = 0
for item in run:
    glyph = glyphs[item['g']]
    transform = (scale, 0, 0, -scale, (x + item['dx']) * scale, -(y + item['dy']) * scale)
    glyph.draw(TransformPen(outline, transform))
    glyph.draw(TransformPen(bounds, transform))
    x += item['ax']
    y += item['ay']
x0, y0, x1, y1 = bounds.bounds
print(json.dumps({'width': x1-x0, 'height': y1-y0, 'viewBox': [x0,y0,x1-x0,y1-y0], 'path': outline.getCommands()}))
`;
    const result = JSON.parse(execFileSync(process.env.SARAFAN_PYTHON || 'python3', ['-c', python],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
    return { id: 'sarafan-wordmark-orange', title: 'Сарафан · словесный знак', category: 'logo',
      source: 'assets/eb-garamond-medium.ttf',
      note: 'Текст «Сарафан» из intro, EB Garamond Medium 500, 140 px. Настоящие контуры глифов; OpenType-позиционирование HarfBuzz. Crop по контурам.',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${numeric(result.width)}" height="${numeric(result.height)}" viewBox="${result.viewBox.map(numeric).join(' ')}"><path fill="#FF3C00" d="${result.path}"/></svg>\n` };
  } catch (error) {
    console.warn('Optional outlined wordmark omitted: local hb-shape or Python fontTools is unavailable.');
    return null;
  }
}

function clippingVersion(svg) {
  // The originals use white, hard-edge geometry masks. Equivalent clipping keeps PDF fully vector.
  // Original downloadable SVG files are copied byte-for-byte, without this export-only adaptation.
  return svg.replace(/<mask\b([^>]*)>/g, (_, attrs) => `<clipPath${attrs.replace(/\sfill="[^"]*"/g, '')}>`)
    .replace(/<\/mask>/g, '</clipPath>').replace(/\bmask="url\(/g, 'clip-path="url(');
}

async function exportVector(item, page) {
  const width = Number(attribute(item.svg, 'width'));
  const height = Number(attribute(item.svg, 'height'));
  if (!(width > 0 && height > 0)) throw new Error(`Invalid bounds: ${item.id}`);
  const directory = item.category === 'logo' ? 'logos' : 'elements';
  const stem = `downloads/${directory}/${item.id}`;
  const formats = { SVG: `${stem}.svg`, PNG: `${stem}.png`, PDF: `${stem}.pdf` };
  write(formats.SVG, item.svg);
  await sharp(Buffer.from(item.svg), { density: 288 }).resize(Math.round(width * 4), Math.round(height * 4))
    .ensureAlpha().png().toFile(path.join(root, formats.PNG));
  const svg = clippingVersion(item.svg).replace(/<svg\b/, '<svg class="export-root"');
  await page.setContent(`<!doctype html><html><head><style>@page{size:${width}px ${height}px;margin:0}html,body{margin:0;padding:0;width:${width}px;height:${height}px;overflow:hidden}svg.export-root{display:block;width:${width}px;height:${height}px}</style></head><body>${svg}</body></html>`);
  const pdfBytes = await page.pdf({ width: `${width}px`, height: `${height}px`, margin: { top: 0, right: 0, bottom: 0, left: 0 },
    printBackground: true, preferCSSPageSize: true, tagged: false, outline: false });
  const pdf = await PDFDocument.load(pdfBytes);
  if (pdf.getPageCount() !== 1) throw new Error(`Unexpected PDF page count for ${item.id}`);
  pdf.getPage(0).setMediaBox(0, 0, width * .75, height * .75);
  pdf.getPage(0).setCropBox(0, 0, width * .75, height * .75);
  pdf.setTitle(item.title); pdf.setAuthor('Сарафан'); pdf.setCreator('SARAFAN local design-assets build');
  pdf.setCreationDate(new Date('2021-01-01T00:00:00Z')); pdf.setModificationDate(new Date('2021-01-01T00:00:00Z'));
  write(formats.PDF, await pdf.save({ useObjectStreams: false }));
  return { id: item.id, title: item.title, category: item.category, source: item.source, formats,
    svgText: item.svg, pngBase64: fs.readFileSync(path.join(root, formats.PNG)).toString('base64'),
    dimensions: { width, height }, note: item.note || 'Исходный SVG сохранён без изменения формы. PNG: прозрачный, 4×. PDF: вектор, страница по границам SVG; 1 px = 0.75 pt.' };
}

async function exportRaster(id, title, source) {
  const relative = `downloads/logos/${id}.png`;
  fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
  fs.copyFileSync(path.join(root, source), path.join(root, relative));
  const metadata = await sharp(path.join(root, relative)).metadata();
  return { id, title, category: 'logo', source, formats: { PNG: relative },
    pngBase64: fs.readFileSync(path.join(root, relative)).toString('base64'),
    dimensions: { width: metadata.width, height: metadata.height },
    note: 'Исходный растровый PNG без увеличения и трассировки. Векторного исходника в проекте нет.' };
}

const readme = `# Сарафан — локальный набор дизайн-ассетов

Источник — существующая библиотека HTML-шаблонов SARAFAN и локальные assets/.
Новые знаки, иллюстрации и шрифты не создавались и из сети не загружались.

## Происхождение

- bureau-orange: assets/expert-about-logo.svg; bureau-cream: assets/expert-contact-logo.svg.
- journal-bookmark: assets/intro-2-rectangle72.svg.
- heart-orange / heart-cream: 11 исходных фрагментов intro-1-group*.svg / intro-7-group*.svg;
  координаты взяты из index.html (.intro-logo-piece), родительский масштаб — intro.css (.intro-original).
  Выполнен только общий crop. Форма каждого фрагмента сохранена.
- club: assets/intro-4910-logo.png; salon: assets/intro-3826-logo.png — только исходный PNG.
- sarafan-wordmark-orange, если присутствует: реальные контуры EB Garamond Medium 500,
  слово «Сарафан» из intro, кегль 140 px; HarfBuzz + fontTools. Шрифт не имитирован.
- ribbon-journal / ribbon-bureau / ribbon-action: sarafan-ribbon.svg / expert-ribbon.svg / intro-2-vector.svg.
- expert-ovals / expert-mask / expert-rule: expert-cover-ovals.svg / expert-cover-mask.svg / expert-about-rule.svg.

## Форматы

Для векторных знаков исходный SVG, прозрачный PNG с размером 4× от intrinsic,
векторный PDF со страницей по bounds (1 px = 0.75 pt). В PDF исходные белые геометрические
SVG-маски экспортируются как эквивалентные векторные clipping paths; SVG не меняется.
PNG-only знаки не являются векторными: SVG/PDF для них не создаются.
Кремовые элементы рассчитаны на контрастный фон и могут быть почти незаметны на белом.

Шрифты копируются без модификации. Включены только существующие TTF/OTF и имеющийся
expert-geist-OFL.txt. Geist Medium не включается, если его файла нет в assets/.
Права и лицензия на CoFo Cinema 1909 данным проектом не установлены.
Наличие файла CoFo в наборе не является предоставлением права использования или распространения.
Для остальных файлов включены только уже имеющиеся сведения; новые лицензии не назначались.

Палитра: cream #FBEED2, brown #553D3D, blue #A9C9DF, orange #FF3C00, pink #E19A9B, olive #91945B.
Дополнительные цвета кругов из исходных макетов: slate #606D82, sand #E4D5B6, forest #014B3E, dusty-rose #C98384, terracotta #B54F1A.
На каждой недельной обложке восемь разных цветов кругов; фон всегда #FBEED2.
Пути manifest.json и manifest.js указаны относительно корня исходного проекта.
Для file:// используется window.SARAFAN_ASSETS из manifest.js, fetch не нужен.
Поля svgText и pngBase64 содержат точные байты SVG/PNG для скачивания через Blob,
поскольку Chromium может открывать прямые file:// SVG/PNG вместо сохранения файла.

## Повторная сборка

В исходном проекте: node scripts/build-design-assets.cjs
Нужны локальные sharp, playwright (Chromium), pdf-lib, jszip.
Если они не в обычном node_modules, задайте SARAFAN_NODE_MODULES.
Для необязательного контурного словесного знака нужны hb-shape и python3 с fontTools;
при их отсутствии он исключается. SARAFAN_PYTHON позволяет выбрать Python.
Сборка работает офлайн и не получает зависимости из сети.
`;

async function main() {
  fs.mkdirSync(destination, { recursive: true });
  const vectors = [
    originalVector('bureau-orange', 'Бюро · оранжевый знак', 'expert-about-logo.svg'),
    originalVector('bureau-cream', 'Бюро · кремовый знак', 'expert-contact-logo.svg'),
    originalVector('journal-bookmark', 'Журнал · закладка', 'intro-2-rectangle72.svg'),
    composedHeart('orange'), composedHeart('cream'),
    originalVector('ribbon-journal', 'Лента · Журнал', 'sarafan-ribbon.svg', 'element'),
    originalVector('ribbon-bureau', 'Лента · Бюро', 'expert-ribbon.svg', 'element'),
    originalVector('ribbon-action', 'Плашка действия · Журнал', 'intro-2-vector.svg', 'element'),
    originalVector('expert-ovals', 'Эксперт · контурные овалы', 'expert-cover-ovals.svg', 'element'),
    originalVector('expert-mask', 'Эксперт · овальная маска', 'expert-cover-mask.svg', 'element'),
    originalVector('expert-rule', 'Эксперт · пунктирная линия', 'expert-about-rule.svg', 'element')
  ];
  const wordmark = outlinedWordmark();
  if (wordmark) vectors.splice(5, 0, wordmark);
  const browser = await chromium.launch({ headless: true });
  const assets = [];
  try {
    const page = await browser.newPage();
    for (const vector of vectors) assets.push(await exportVector(vector, page));
  } finally { await browser.close(); }
  assets.splice(wordmark ? 6 : 5, 0,
    await exportRaster('club', 'Клуб · исходный растр', 'assets/intro-4910-logo.png'),
    await exportRaster('salon', 'Салон · исходный растр', 'assets/intro-3826-logo.png'));
  const fonts = fs.readdirSync(path.join(root, 'assets')).filter(name => /\.(ttf|otf)$/i.test(name)).sort().map(name => {
    const relative = `downloads/fonts/${name}`;
    fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    fs.copyFileSync(path.join(root, 'assets', name), path.join(root, relative));
    return { id: name.replace(/\.[^.]+$/, ''), title: name, source: `assets/${name}`, path: relative, format: path.extname(name).slice(1).toUpperCase() };
  });
  fs.copyFileSync(path.join(root, 'assets/expert-geist-OFL.txt'), path.join(destination, 'fonts/expert-geist-OFL.txt'));
  write('downloads/palette.json', JSON.stringify(palette, null, 2) + '\n');
  write('downloads/palette.css', ':root {\n' + palette.map(c => `  --sarafan-${c.id}: ${c.hex};`).join('\n') + '\n}\n');
  write('downloads/README.md', readme);
  const archives = [
    { id: 'logos', title: 'Логотипы и знаки', path: 'downloads/sarafan-logos.zip' },
    { id: 'fonts', title: 'Локальные шрифты', path: 'downloads/sarafan-fonts.zip' },
    { id: 'elements', title: 'Графические элементы', path: 'downloads/sarafan-elements.zip' },
    { id: 'design-kit', title: 'Полный дизайн-набор', path: 'downloads/sarafan-design-kit.zip' }
  ];
  const manifest = { version: 1, assets, palette, fonts, archives,
    notes: ['Исходные растровые знаки Клуба и Салона доступны только в PNG.',
      'Права и лицензия на CoFo Cinema 1909 данным проектом не установлены.',
      ...(!wordmark ? ['Контурный словесный знак исключён: локальные инструменты контурного экспорта недоступны.'] : [])] };
  write('downloads/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
  write('downloads/manifest.js', 'window.SARAFAN_ASSETS = ' + JSON.stringify(manifest, null, 2) + ';\n');
  const assetPaths = category => assets.filter(a => a.category === category).flatMap(a => Object.values(a.formats));
  const fontPaths = [...fonts.map(f => f.path), 'downloads/fonts/expert-geist-OFL.txt'];
  const sets = {
    logos: assetPaths('logo'), fonts: fontPaths, elements: assetPaths('element'),
    'design-kit': [...assetPaths('logo'), ...assetPaths('element'), ...fontPaths,
      'downloads/palette.css', 'downloads/palette.json', 'downloads/manifest.json', 'downloads/manifest.js', 'downloads/README.md']
  };
  for (const archive of archives) {
    const zip = new JSZip();
    const fixedDate = new Date('2021-01-01T00:00:00Z');
    zip.file('README.md', readme, { date: fixedDate });
    for (const relative of sets[archive.id]) zip.file(archive.id === 'design-kit' ? relative : relative.replace(/^downloads\//, ''),
      fs.readFileSync(path.join(root, relative)), { date: fixedDate });
    write(archive.path, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } }));
  }
  console.log(`Built ${assets.length} assets (${assets.filter(a => a.formats.SVG).length} vector), ${fonts.length} fonts and ${archives.length} ZIP archives in downloads/.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
