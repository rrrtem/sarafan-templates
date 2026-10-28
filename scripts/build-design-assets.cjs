#!/usr/bin/env node
'use strict';

// Offline build. Uses only the project's original assets, local fonts and installed tools.
// Node modules: sharp, playwright, pdf-lib, jszip. Outlined type: python3/fontTools + hb-shape.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
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

const designContext = {window:{}};
vm.runInNewContext(read('design-system-data.js'),designContext);
const design = designContext.window.SARAFAN_DESIGN;
const palette = [...design.colors.map(c => ({id:c.id,title:c.name,hex:c.hex})),
  ...design.additionalColors.map(c => ({id:c.id,title:c.name,hex:c.hex,secondary:true}))];

const originalVector = (id, title, source, category = 'logo', note = '') => ({
  id, title, source: `assets/${source}`, category, note, svg: read(`assets/${source}`)
});

function symbolVector(id, title, symbol, color = 'orange') {
  const registry = JSON.parse(read('assets/symbols.json'));
  const source = registry.symbols.find(item => item.id === symbol);
  return { ...originalVector(id, title, `symbol-${symbol}-${color}.svg`),
    figma: { fileKey: registry.fileKey, nodeId: source.nodeId },
    note: 'Оригинальный прозрачный SVG из Figma, страница знаков. Контуры и пропорции сохранены; цветовая версия следует палитре шаблона.' };
}

// Text remains the real local type from the templates; no raster tracing.
function outlinedRuns(runs) {
  return JSON.parse(execFileSync(process.env.SARAFAN_PYTHON || 'python3',
    ['scripts/outline-design-text.py', JSON.stringify(runs)], { cwd: root, encoding: 'utf8' }));
}
function croppedOutline(id, title, runs) {
  const result = outlinedRuns(runs);
  const [x0,y0,x1,y1] = result.bounds;
  return { id, title, category: 'logo', source: ['index.html', ...new Set(runs.map(run => run.font))],
    note: 'Оригинальная типографика интро: EB Garamond Medium 140 px; depuis 2021 — Bold 35 px, исходное смещение (510.334; 24). HarfBuzz и контуры локальных глифов.',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${numeric(x1-x0)}" height="${numeric(y1-y0)}" viewBox="${[x0,y0,x1-x0,y1-y0].map(numeric).join(' ')}">${result.paths}</svg>\n` };
}
function rotateVector(item, id, title, clockwise = true) {
  const width = Number(attribute(item.svg, 'width'));
  const height = Number(attribute(item.svg, 'height'));
  const inner = item.svg.replace(/<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  return { ...item, id, title, category: 'element',
    note: 'Исходные контуры с надписями, поворот целого элемента на 90°. Пропорции сохранены.',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${height}" height="${width}" viewBox="0 0 ${height} ${width}"><g transform="${clockwise ? `translate(${height} 0) rotate(90)` : `translate(0 ${width}) rotate(-90)`}">${inner}</g></svg>\n` };
}
function clubRibbon(label, id) {
  const shape = rotateVector(originalVector('shape', '', 'club-5883-rectangle71.svg', 'element'), 'shape', '', false);
  const type = outlinedRuns([
    {text:'Сарафан',font:'assets/eb-garamond-medium.ttf',size:50,x:135,y:15,color:'#553D3D'},
    {text:label,font:'assets/eb-garamond-medium-italic.ttf',size:50,x:329,y:15,color:'#553D3D'}
  ]);
  return { id, title: `Клуб${label === 'Салон' ? ' · Салон' : ''} · горизонтальная`, category:'element',
    source:['assets/club-5883-rectangle71.svg','club.css','assets/eb-garamond-medium.ttf','assets/eb-garamond-medium-italic.ttf'],
    note:'Клубная лента с прямым левым краем, исходным правым краем и типографикой 50/86%. Надписи — контуры локальных шрифтов.',
    svg:shape.svg.replace('</svg>',type.paths+'</svg>') };
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
  return { id: item.id, title: item.title, category: item.category, source: item.source, figma: item.figma, formats,
    svgText: item.svg, pngBase64: fs.readFileSync(path.join(root, formats.PNG)).toString('base64'),
    dimensions: { width, height }, note: item.note || 'Исходный SVG сохранён без изменения формы. PNG: прозрачный, 4×. PDF: вектор, страница по границам SVG; 1 px = 0.75 pt.' };
}

const readme = `# Сарафан — локальный набор дизайн-ассетов

Источник — существующая библиотека HTML-шаблонов SARAFAN и локальные assets/.
Знаки, иллюстрации и шрифты взяты из локальных исходников. Типографические варианты собраны из оригинальных форм и контуров существующих шрифтов; загрузки из сети нет.

## Происхождение

- Все четыре знака — оригинальные прозрачные SVG из Figma, страница 386:10081:
  петух 391:13811, кольца Бюро 386:12392, конь Клуба 391:14070, сирин 391:14391.
- Исходники: assets/symbol-{rooster,bureau,horse,sirin}-figma.svg. Контуры и viewBox не изменяются.
  assets/symbols.json содержит узлы, SHA-256 исходников, цвета и совместимые имена.
- Палитровые версии отличаются только цветом заливки. Сборка: node scripts/build-symbol-assets.cjs.
- heart-orange / heart-cream, club и salon — совместимые имена новых цельных SVG, без прежних фрагментов и трассировки PNG.
- journal-bookmark: assets/intro-2-rectangle72.svg.
- sarafan-wordmark-orange и sarafan-wordmark-since: реальные контуры EB Garamond Medium 500,
  слово «Сарафан» из intro, кегль 140 px; подпись depuis 2021 — Bold 35 px, исходное положение. HarfBuzz + fontTools. Шрифт не имитирован.
- Журнал — вертикальная красная лента с надписями из ads-retreat-brand.svg.
- Бюро — горизонтальная бежевая или синяя лента; контуры и надписи из bureau-cover-1-brand.svg.
- Клуб и Салон — горизонтальная лента на вылет: бежевая или зелёная, с прямым левым краем и оригинальным правым краем. Форма — club-5883-rectangle71.svg, типографика — локальный EB Garamond 50/86% по club.css.
- ribbon-journal / ribbon-action — исходные формы sarafan-ribbon.svg / intro-2-vector.svg.
- ribbon-action-labelled: оригинальная плашка действия и надпись «Открывать город» из интро, Geist 50 px; текст в контурах.
- downloads/examples/: шесть HTML/PNG-примеров цветовых сочетаний 1080 × 1350 на сетке 6×6. Сборка: node scripts/build-design-examples.cjs.
- expert-ovals / expert-mask / expert-rule: expert-cover-ovals.svg / expert-cover-mask.svg / expert-about-rule.svg.

## Форматы

Для векторных знаков исходный SVG, прозрачный PNG с размером 4× от intrinsic,
векторный PDF со страницей по bounds (1 px = 0.75 pt). В PDF исходные белые геометрические
SVG-маски экспортируются как эквивалентные векторные clipping paths; SVG не меняется.
Все четыре знака экспортируются из оригинальных SVG; PNG и PDF создаются из тех же векторов. Две версии словесного логотипа и четыре знака доступны в красном, бежевом и коричневом; в реестре цветовые версии находятся в variants. Сирину рубрика пока не назначена.
Кремовые элементы рассчитаны на контрастный фон и могут быть почти незаметны на белом.

Шрифты копируются без модификации. Включены только существующие TTF/OTF и имеющийся
expert-geist-OFL.txt. Geist — один вариативный файл expert-geist-v1.6.ttf, веса 100–900. Inter не используется и в набор не включается.
Права и лицензия на CoFo Cinema 1909 данным проектом не установлены.
Наличие файла CoFo в наборе не является предоставлением права использования или распространения.
Для остальных файлов включены только уже имеющиеся сведения; новые лицензии не назначались.

Палитра: cream #FBEED2, brown #553D3D, blue #A9C9DF, orange #FF3C00, pink #E19A9B, olive #91945B.
Дополнительные цвета: slate #606D82, sand #E4D5B6, forest #014B3E, plum #67436F, lemon #E8D44D, terracotta #B54F1A.
Чистые фоны всех двенадцати цветов: backgrounds/{id}-1080x1350.png и backgrounds/{id}-1080x1920.png; подписи присутствуют только на странице.
EB Garamond скачивается одним архивом eb-garamond.zip с оригинальными OTF из репозитория автора.
Источник и хеши: assets/eb-garamond-otf/source.json. Локальные TTF шаблонов сохранены без изменений.
Страницы семейств: https://fonts.google.com/specimen/EB+Garamond и https://vercel.com/font.
На каждой недельной обложке восемь разных цветов кругов; фон всегда #FBEED2.
Пути manifest.json и manifest.js указаны относительно корня исходного проекта.
Для file:// используется window.SARAFAN_ASSETS из manifest.js, fetch не нужен.
Поля svgText и pngBase64 содержат точные байты SVG/PNG для скачивания через Blob,
поскольку Chromium может открывать прямые file:// SVG/PNG вместо сохранения файла.

## Повторная сборка

В исходном проекте: node scripts/build-design-assets.cjs
Нужны локальные sharp, playwright (Chromium), pdf-lib, jszip.
Если они не в обычном node_modules, задайте SARAFAN_NODE_MODULES.
Для контурных надписей нужны hb-shape и python3 с fontTools;
при их отсутствии сборка контурной типографики останавливается. SARAFAN_PYTHON позволяет выбрать Python.
Сборка работает офлайн и не получает зависимости из сети.
`;

async function main() {
  fs.mkdirSync(destination, { recursive: true });
  execFileSync(process.execPath, ['scripts/build-symbol-assets.cjs'], { cwd: root, stdio: 'inherit' });
  const vectors = [
    symbolVector('bureau-orange', 'Бюро · оранжевый знак', 'bureau'),
    symbolVector('bureau-cream', 'Бюро · кремовый знак', 'bureau', 'cream'),
    originalVector('journal-bookmark', 'Закладка Журнала', 'intro-2-rectangle72.svg', 'element'),
    symbolVector('club-horse', 'Конь · Клуб', 'horse'),
    symbolVector('sirin', 'Сирин · назначение открыто', 'sirin'),
    symbolVector('rooster-orange', 'Петух · оранжевый', 'rooster'),
    symbolVector('rooster-cream', 'Петух · кремовый', 'rooster', 'cream'),
    symbolVector('heart-orange', 'Петух · совместимое имя', 'rooster'),
    symbolVector('heart-cream', 'Петух · совместимое имя · кремовый', 'rooster', 'cream'),
    symbolVector('club', 'Конь · совместимое имя', 'horse'),
    symbolVector('salon', 'Сирин · совместимое имя', 'sirin'),
    originalVector('ribbon-journal', 'Лента · Журнал', 'sarafan-ribbon.svg', 'element'),
    originalVector('ribbon-action', 'Плашка действия · Журнал', 'intro-2-vector.svg', 'element'),
    originalVector('expert-ovals', 'Эксперт · контурные овалы', 'expert-cover-ovals.svg', 'element'),
    originalVector('expert-mask', 'Эксперт · овальная маска', 'expert-cover-mask.svg', 'element'),
    originalVector('expert-rule', 'Эксперт · пунктирная линия', 'expert-about-rule.svg', 'element')
  ];
  const wordmarkRuns = [{text:'Сарафан',font:'assets/eb-garamond-medium.ttf',size:140,color:'#FF3C00'}];
  vectors.push(croppedOutline('sarafan-wordmark-orange','Сарафан',wordmarkRuns));
  vectors.push(croppedOutline('sarafan-wordmark-since','Сарафан · depuis 2021',[
    ...wordmarkRuns,{text:'depuis 2021',font:'assets/eb-garamond-bold.ttf',size:35,x:510.334,y:24,color:'#FF3C00'}]));
  const journal = originalVector('ribbon-journal-vertical','Журнал · вертикальная','ads-retreat-brand.svg','element');
  const bureau = originalVector('ribbon-bureau-horizontal','Бюро · горизонтальная','bureau-cover-1-brand.svg','element');
  const club = clubRibbon('Клуб','ribbon-club-horizontal');
  const salon = clubRibbon('Салон','ribbon-salon-horizontal');
  const bureauBlue = { ...bureau, id:'ribbon-bureau-blue', title:'Бюро · синяя',
    svg:bureau.svg.replace(/#FBEED2/gi,'#A9C9DF'),
    note:'Горизонтальная лента Бюро: исходные контуры Figma; синий фон и коричневая надпись.' };
  const greenClub = original => ({ ...original, id:original.id.replace('-horizontal','-green'),
    title:original.title.replace('горизонтальная','зелёная'),
    svg:original.svg.replace(/#FBEED2/gi,'#91945B').replace(/#553D3D/gi,'#FBEED2'),
    note:'Горизонтальная лента с прямым левым краем: оливковый фон и кремовая надпись.' });
  const action = originalVector('ribbon-action-labelled','Плашка действия','intro-2-vector.svg','element');
  const actionType = outlinedRuns([{text:'Открывать город',font:'assets/expert-geist-v1.6.ttf',size:50,line:1.01,tracking:-1.5,x:31,y:24.5,color:'#E4D5B6'}]);
  action.svg = action.svg.replace('</svg>',actionType.paths+'</svg>');
  action.source = ['assets/intro-2-vector.svg','assets/expert-geist-v1.6.ttf','intro.css'];
  action.note = 'Оригинальная форма и текст из интро: Geist Regular 50/101%, трекинг −1.5 px. Надпись в контурах.';
  vectors.push(action);
  vectors.push(journal,bureauBlue,bureau,greenClub(club),club,greenClub(salon),salon);
  for (const obsolete of ['ribbon-journal-horizontal','ribbon-bureau-vertical','ribbon-club-vertical','ribbon-salon-vertical','ribbon-bureau']) {
    for (const extension of ['svg','png','pdf']) fs.rmSync(path.join(destination,'elements',`${obsolete}.${extension}`),{force:true});
  }
  const browser = await chromium.launch({ headless: true });
  const assets = [];
  try {
    const page = await browser.newPage();
    for (const vector of vectors) assets.push(await exportVector(vector, page));
    const colorable = new Set(['sarafan-wordmark-orange','sarafan-wordmark-since','rooster-orange','bureau-orange','club-horse','sirin']);
    for (const vector of vectors.filter(item => colorable.has(item.id))) {
      for (const color of palette.filter(item => !item.secondary && !design.brandColors.some(option => option.id === item.id))) {
        const obsoleteId = vector.id.replace(/-orange$/, '') + '-' + color.id;
        for (const extension of ['svg','png','pdf']) fs.rmSync(path.join(destination,'logos',`${obsoleteId}.${extension}`),{force:true});
      }
      const base = assets.find(item => item.id === vector.id);
      base.variants = {};
      for (const color of palette.filter(item => design.brandColors.some(option => option.id === item.id) && item.id !== 'orange')) {
        const id = vector.id.replace(/-orange$/, '') + '-' + color.id;
        const existing = assets.find(item => item.id === id);
        base.variants[color.id] = existing || await exportVector({ ...vector, id,
          title: vector.title + ' · ' + color.title,
          svg: vector.svg.replace(/#FF3C00/gi, color.hex),
          note: 'Цветовая версия оригинального знака: ' + color.hex + '. Контуры, пропорции и прозрачность сохранены.' }, page);
      }
    }
  } finally { await browser.close(); }
  for (const obsolete of ['geist-regular.ttf','geist-semibold.ttf','geist-bold.ttf','inter-regular.ttf']) {
    fs.rmSync(path.join(destination,'fonts',obsolete),{force:true});
  }
  const fonts = fs.readdirSync(path.join(root, 'assets')).filter(name => /^(?:eb-garamond-.+\.ttf|cofo-cinema1909-regular\.otf|expert-geist-v1\.6\.ttf)$/.test(name)).sort().map(name => {
    const relative = `downloads/fonts/${name}`;
    fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    fs.copyFileSync(path.join(root, 'assets', name), path.join(root, relative));
    return { id: name.replace(/\.[^.]+$/, ''), title: name, source: `assets/${name}`, path: relative, format: path.extname(name).slice(1).toUpperCase() };
  });
  fs.copyFileSync(path.join(root, 'assets/expert-geist-OFL.txt'), path.join(destination, 'fonts/expert-geist-OFL.txt'));
  fs.copyFileSync(path.join(root,'assets/eb-garamond-OFL.txt'),path.join(destination,'fonts/eb-garamond-OFL.txt'));
  const garamond = new JSZip();
  const garamondSource = path.join(root,'assets/eb-garamond-otf');
  for (const name of fs.readdirSync(garamondSource).sort()) {
    garamond.file(name,fs.readFileSync(path.join(garamondSource,name)),{date:new Date('2021-01-01T00:00:00Z')});
  }
  write('downloads/eb-garamond.zip',await garamond.generateAsync({type:'nodebuffer',compression:'DEFLATE'}));
  const backgroundPaths = [];
  fs.mkdirSync(path.join(destination,'backgrounds'),{recursive:true});
  for (const color of palette) for (const height of [1350,1920]) {
    const relative = `downloads/backgrounds/${color.id}-1080x${height}.png`;
    await sharp({create:{width:1080,height,channels:3,background:color.hex}}).png().toFile(path.join(root,relative));
    backgroundPaths.push(relative);
  }

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
    notes: ['Все четыре знака доступны в оригинальном SVG, PNG и PDF; назначение сирина открыто.',
      'Права и лицензия на CoFo Cinema 1909 данным проектом не установлены.',
      'Источник знаков — страница Figma 386:10081; происхождение записано в assets/symbols.json.'] };
  write('downloads/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
  write('downloads/manifest.js', 'window.SARAFAN_ASSETS = ' + JSON.stringify(manifest, null, 2) + ';\n');
  const assetPaths = category => [...new Set(assets.filter(a => a.category === category).flatMap(a => [a,...Object.values(a.variants || {})].flatMap(v => Object.values(v.formats))))];
  const fontPaths = [...fonts.map(f => f.path), 'downloads/fonts/expert-geist-OFL.txt', 'downloads/fonts/eb-garamond-OFL.txt'];
  const sets = {
    logos: assetPaths('logo'), fonts: [...fontPaths,'downloads/eb-garamond.zip'], elements: assetPaths('element'),
    'design-kit': [...assetPaths('logo'), ...assetPaths('element'), ...fontPaths, ...backgroundPaths, 'downloads/eb-garamond.zip',
      'downloads/palette.css', 'downloads/palette.json', 'downloads/manifest.json', 'downloads/manifest.js', 'downloads/README.md',
      ...fs.readdirSync(path.join(destination,'examples')).filter(name => /\.(html|png)$/.test(name)).map(name => 'downloads/examples/'+name)]
  };
  for (const archive of archives) {
    const zip = new JSZip();
    const fixedDate = new Date('2021-01-01T00:00:00Z');
    zip.file('README.md', readme, { date: fixedDate });
    for (const relative of sets[archive.id]) zip.file(archive.id === 'design-kit' ? relative : relative.replace(/^downloads\//, ''),
      fs.readFileSync(path.join(root, relative)), { date: fixedDate });
    write(archive.path, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } }));
  }
  console.log(`Built ${assets.length} assets (${assets.filter(a => a.formats.SVG).length} vector), ${fonts.length} fonts, three colors for logos/symbols and ${archives.length} ZIP archives in downloads/.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
