const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { bindPrepositions } = require('./typography.cjs');
const deps = process.env.SARAFAN_NODE_MODULES || '/Users/fixed/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const sharp = require(path.join(deps, 'sharp'));
const { chromium } = require(path.join(deps, 'playwright'));
const JSZip = require(path.join(deps, 'jszip'));
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'posts/salon-november-09-15');
const relative = 'posts/salon-november-09-15/';
const scope = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'photo-crop.js'), 'utf8'), scope);
const escape = s => String(s).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');

(async () => {
  const dayColors = JSON.parse(fs.readFileSync(path.join(dir, 'day-colors.json'), 'utf8'));
  const events = JSON.parse(fs.readFileSync(path.join(dir, 'content.json'), 'utf8')).map(event=>{
    const day=dayColors[event.date];
    assert(day,'Every event date needs a shared color: '+event.date);
    return {...event,title:event.title.split(/(<[^>]*>)/g).map(part=>part.startsWith('<')?part:bindPrepositions(part)).join(''),description:bindPrepositions(event.description),subtitle:event.subtitle?bindPrepositions(event.subtitle):undefined,background:day.background,color:day.color,badgeBackground:day.badgeBackground||'#FF3C00'};
  });
  assert.equal(new Set(Object.values(dayColors).map(day=>day.background)).size,Object.keys(dayColors).length,'Dates in the weekly program have distinct background colors');
  const registry = [], media = {};
  const cover = require('./weekly-cover.cjs').prepare(root, dir);
  fs.mkdirSync(path.join(dir, 'layers'), { recursive: true });
  const slot = { x: 34, y: 260, width: 1012, height: 476 };
  for (const e of events) {
    const n = String(e.number).padStart(2, '0');
    const meta = await sharp(path.join(dir, e.photo)).metadata();
    const g = scope.window.SarafanCrop.geometry(meta.width, meta.height, slot, e.initial);
    const cream = e.background === '#FBEED2';
    const ribbon = cream ? 'club-7225-rectangle71.svg' : 'club-5883-rectangle71.svg';
    const photo = e.illustration ? `<div class="weekly-illustration" role="img" aria-label="Персонаж Chichis и гриб на жёлтом эллипсе"><img class="weekly-illustration-ellipse" src="${e.illustration.ellipse}" alt=""><img class="weekly-illustration-character" src="${e.photo}" alt=""><img class="weekly-illustration-mushroom" src="${e.illustration.mushroom}" alt=""></div>` : `<div class="weekly-photo" style="--photo-matte:${e.matte}"><img src="${e.photo}" alt="${e.graphic ? "Чёрный круг на белом эллипсе" : escape(e.label)+" · фото с сайта Салона"}" style="left:${g.x-slot.x}px;top:${g.y-slot.y}px;width:${g.width}px;height:${g.height}px"></div>`;
    const heading = `<h2 class="club-cinema club-poster-title weekly-title">${e.title}</h2>` + (e.subtitle ? `<p class="club-cinema club-poster-subtitle">${escape(e.subtitle)}</p>` : '');
    const title = `<p class="club-cinema club-poster-date">${e.date}</p><p class="club-poster-time">${e.time}</p><div class="club-poster-copy"><div class="club-poster-heading-zone">${heading}</div><p class="club-poster-description">${escape(e.description)}</p></div>`;
    const branding = `<div class="club-ribbon" aria-hidden="true"><div class="club-ribbon-vertical"><img src="../../assets/${ribbon}" alt=""></div></div><p class="club-ribbon-name">Сарафан</p><p class="club-ribbon-salon">Салон</p><img class="club-mark" src="../../assets/club-5883-group93.svg" alt="">`;
    const price = e.price ? `<div class="club-price-wrap${e.price.length>8?' weekly-free':''}"><p class="club-price">${escape(e.price)}</p></div>` : '';
    const article = `<article class="ig-card club-card club-poster weekly-event${e.illustration?' weekly-event--illustrated':''}${cream?' weekly-event--cream':''}" style="--club-background:${e.background};--club-color:${e.color};--club-badge-background:${e.badgeBackground}" aria-label="${escape(e.label)}">${photo}${title}${branding}${price}</article>`;
    const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=1080"><title>${escape(e.label)}</title><link rel="stylesheet" href="../../cards.css"><link rel="stylesheet" href="../../catalog.css"><link rel="stylesheet" href="../../club.css"><link rel="stylesheet" href="post.css"></head><body>${article}</body></html>`;
    fs.writeFileSync(path.join(dir, n+'.html'), html);
    const imagePath = relative + e.photo;
    const card = { type: 'image', src: relative+n+'.png', alt: e.date+' · '+e.label };
    if(!e.graphic) {
      media[imagePath] = `data:${e.photo.endsWith('.png')?'image/png':'image/jpeg'};base64,` + fs.readFileSync(path.join(dir,e.photo)).toString('base64');
      card.edit = { image: imagePath, overlay: relative+'layers/'+n+'.png', background: e.background, matte: e.matte, slot, initial: e.initial };
    }
    registry.push(card);
  }
  const browser = await chromium.launch({ headless: true });
  const layout = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
    for(const variant of cover.variants) {
      await page.goto('file://' + path.join(dir,variant.html));
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => Promise.all([...document.images].map(image => image.decode())));
      await page.screenshot({path:path.join(dir,variant.png)});
      const backgroundPixel=await sharp(path.join(dir,variant.png)).extract({left:0,top:1349,width:1,height:1}).removeAlpha().raw().toBuffer();
      assert.deepEqual([...backgroundPixel],[251,238,210],'Every weekly cover keeps the brand beige background');
      media[relative+variant.png]='data:image/png;base64,'+fs.readFileSync(path.join(dir,variant.png)).toString('base64');
    }
    for (let i = 1; i <= 11; i++) {
      const n = String(i).padStart(2, '0');
      await page.goto('file://' + dir + '/' + n + '.html');
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => Promise.all([...document.images].map(image => image.decode())));
      const bounds = await page.locator('.ig-card').evaluate(card => [...card.querySelectorAll('h2,p,.club-poster-heading-zone')].map(el=>{const r=el.getBoundingClientRect();return {className:el.className,text:el.textContent,x:r.x,y:r.y,width:r.width,height:r.height,overflow:el.matches('h2,p')&&el.scrollWidth>el.clientWidth+2};}));
      assert(bounds.every(b=>!b.overflow), 'No horizontal text overflow: '+n);
      const brokenBindings = await page.locator('.ig-card').evaluate(card => {
        const walker=document.createTreeWalker(card,NodeFilter.SHOW_TEXT),broken=[];
        let node;
        while(node=walker.nextNode()) {
          for(let j=1;j<node.length-1;j++)if(node.data[j]==='\u00a0') {
            const before=document.createRange(),after=document.createRange();
            before.setStart(node,j-1);before.setEnd(node,j);
            after.setStart(node,j+1);after.setEnd(node,j+2);
            if(Math.abs(before.getBoundingClientRect().top-after.getBoundingClientRect().top)>1)broken.push(node.data);
          }
        }
        return broken;
      });
      assert.deepEqual(brokenBindings,[],'Nonbreaking preposition bindings stay on one rendered line: '+n);
      const description = bounds.find(b=>b.className==='club-poster-description');
      if(description) {
        assert(description.height <= 200, 'Description fits five lines: '+n);
        assert(Math.abs(description.y+description.height-1285)<1,'Description stays at the bottom: '+n);
        const zone=bounds.find(b=>b.className==='club-poster-heading-zone');
        const heading=bounds.filter(b=>/club-poster-title|club-poster-subtitle/.test(b.className));
        const top=Math.min(...heading.map(b=>b.y)),bottom=Math.max(...heading.map(b=>b.y+b.height));
        assert(Math.abs((top+bottom)/2-(zone.y+zone.height/2))<1,'Heading group is centered between photo and description: '+n);
      }
      layout.push({ card: n, bounds });
      await page.screenshot({ path: path.join(dir,n+'.png') });
      if(i>1&&events[i-2].graphic) {
        media[relative+n+'.png']='data:image/png;base64,'+fs.readFileSync(path.join(dir,n+'.png')).toString('base64');
        const pixel=async(x,y)=>[...await sharp(path.join(dir,n+'.png')).extract({left:x,top:y,width:1,height:1}).removeAlpha().raw().toBuffer()];
        assert.deepEqual(await pixel(84,498),[255,217,0],'Chichis retains the original yellow Figma ellipse');
        assert.equal(await page.locator('.weekly-illustration img').count(),3,'Chichis uses all three original Figma illustration layers');
        const geometry=await page.locator('.weekly-illustration img').evaluateAll(images=>images.map(image=>{const r=image.getBoundingClientRect();return [r.x,r.y,r.width,r.height];}));
        const expected=[[34,260,1012,476],[192,92,521,686],[479,386,292.815,295.365]];
        assert(geometry.every((rect,i)=>rect.every((value,j)=>Math.abs(value-expected[i][j])<0.1)),'Original illustration positions and proportions are preserved within browser rounding');
      }
      if (i > 1&&!events[i-2].graphic) {
        await page.addStyleTag({ content: 'html,body,.ig-card{background:transparent!important}.weekly-photo{visibility:hidden}' });
        await page.screenshot({ path: path.join(dir,'layers',n+'.png'), omitBackground: true });
        const key = relative+'layers/'+n+'.png';
        media[key] = 'data:image/png;base64,' + fs.readFileSync(path.join(dir,'layers',n+'.png')).toString('base64');
      }
    }
  } finally { await browser.close(); }
  const tiles = [];
  const zip = new JSZip();
  for(let i=1;i<=11;i++) {
    const n=String(i).padStart(2,'0'); const file=path.join(dir,n+'.png');
    zip.file('sarafan-salon-09-15-'+n+'.png', fs.readFileSync(file));
    tiles.push({ input: await sharp(file).resize(324,405).toBuffer(), left: (i-1)%3*324, top: Math.floor((i-1)/3)*405 });
  }
  await sharp({ create: { width: 972, height: 1620, channels: 3, background: '#f0efeb' } }).composite(tiles).png().toFile(path.join(dir,'contact-sheet.png'));
  fs.writeFileSync(path.join(dir,'salon-week-png.zip'), await zip.generateAsync({ type:'nodebuffer', compression:'DEFLATE' }));
  fs.writeFileSync(path.join(dir,'crop-media.js'), 'window.SARAFAN_CROP_MEDIA = Object.assign(window.SARAFAN_CROP_MEDIA || {}, '+JSON.stringify(media)+');\n');
  fs.writeFileSync(path.join(dir,'layout-check.json'), JSON.stringify(layout,null,2));
  const cards=[{type:'image',src:relative+'01.png',alt:'Сарафан Салон · программа 9–15 ноября',cover:cover.model},...registry];
  const post={id:'salon-november-09-15',title:'Сарафан Салон · 9–15 ноября',description:fs.readFileSync(path.join(dir,'caption.txt'),'utf8'),source:'https://sarafan-buro.com/sarafansalon',cards};
  const context={window:{}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'new-posts-data.js'),'utf8'),context);
  const posts=context.window.SARAFAN_POSTS.filter(p=>p.id!==post.id);
  fs.writeFileSync(path.join(root,'new-posts-data.js'),'// Публикации добавляются агентом по правилам docs/new-posts.md.\nwindow.SARAFAN_POSTS = '+JSON.stringify([post,...posts],null,2)+';\n');
  console.log('Built eleven standalone HTML + PNG cards, nine photo overlays, the original Chichis Figma illustration, embedded offline media, a PNG archive and the new post registry.');
})().catch(error=>{console.error(error);process.exit(1);});
