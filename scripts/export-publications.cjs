#!/usr/bin/env node
'use strict';
// Re-render existing publication HTML without rewriting copy, ordering or photo crops.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const deps=process.env.SARAFAN_NODE_MODULES || '/Users/fixed/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {chromium}=require(path.join(deps,'playwright'));
const sharp=require(path.join(deps,'sharp'));
const JSZip=require(path.join(deps,'jszip'));
const root=path.resolve(__dirname,'..');
const context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'new-posts-data.js'),'utf8'),context);
const requested=process.argv.find(arg=>arg.startsWith('--post='))?.slice('--post='.length);
const posts=requested ? context.window.SARAFAN_POSTS.filter(post=>post.id===requested) : context.window.SARAFAN_POSTS;
if(requested&&!posts.length)throw new Error('Unknown publication: '+requested);
const ready=page=>page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});
(async()=>{
  const browser=await chromium.launch({headless:true});
  const report=[];
  const changed=new Set();
  try{
    const page=await browser.newPage({viewport:{width:1080,height:1350},deviceScaleFactor:1});
    for(const post of posts){
      const relative='posts/'+post.id,dir=path.join(root,relative);
      const numbered=fs.readdirSync(dir).filter(n=>/^\d\d\.html$/.test(n)).sort();
      const covers=fs.readdirSync(dir).filter(n=>/^cover-(?!base).+\.html$/.test(n));
      for(const file of [...numbered,...covers]){
        const target=file.startsWith('cover-')?'covers/'+file.slice(6).replace('.html','.png'):file.replace('.html','.png');
        await page.goto(pathToFileURL(path.join(dir,file)).href);
        await ready(page);
        assert.equal(await page.locator('.ig-card').count(),1,'One publication card: '+file);
        const symbols=await page.locator('.expert-logo,.club-mark,.brand-symbol,.live-mark').evaluateAll(images=>images.map(i=>{const r=i.getBoundingClientRect();return {src:i.getAttribute('src'),x:r.x,y:r.y,width:r.width,height:r.height,loaded:i.complete&&i.naturalWidth>0};}));
        assert(symbols.every(i=>i.loaded&&i.width>0&&i.height>0&&i.x>=0&&i.y>=0&&i.x+i.width<=1081&&i.y+i.height<=1351),'Symbol slots remain inside canvas: '+relative+'/'+file);
        await page.screenshot({path:path.join(dir,target)});
        changed.add(relative+'/'+target);
        const layer=path.join(dir,'layers',target);
        if(!file.startsWith('cover-')&&fs.existsSync(layer)&&await page.locator('.weekly-photo').count()){
          const style=await page.addStyleTag({content:'html,body,.ig-card{background:transparent!important}.weekly-photo{visibility:hidden!important}'});
          await page.screenshot({path:layer,omitBackground:true});
          await style.evaluate(el=>el.remove());
          changed.add(relative+'/layers/'+target);
        }
        report.push({post:post.id,file,output:target,symbols});
      }
      for(const filename of fs.readdirSync(dir).filter(n=>n.endsWith('.zip'))){
        const file=path.join(dir,filename);
        const zip=await JSZip.loadAsync(fs.readFileSync(file));
        if(filename==='ingrid-post-orange.zip'){
          // Keep the saved orange palette while updating its original SVG symbols.
          for(const html of numbered){
            await page.goto(pathToFileURL(path.join(dir,html)).href);
            await page.addStyleTag({content:'.expert-card{background:#FBEED2;color:#FF3C00}.expert-card.expert-cover,.expert-card.expert-contact{background:#FF3C00;color:#FBEED2}.expert-cover-meta{color:#FBEED2}.expert-card.expert-session{background:#FBEED2;color:#FBEED2}.post-accent{color:#FF3C00}.expert-about-portrait{background:#9a1616}'});
            await page.evaluate(()=>{
              const card=document.querySelector('.ig-card');
              const source='../../assets/';
              const symbol=card.querySelector('.expert-logo');
              if(symbol)symbol.src=source+'symbol-bureau-'+(card.matches('.expert-contact,.expert-session')?'cream':'orange')+'.svg';
              const pairs=[['.expert-cover-ovals','expert-cover-ovals.svg'],['.expert-ribbon>img','expert-ribbon.svg'],['.expert-cover-rule','expert-cover-rule.svg']];
              const role=card.matches('.expert-contact')?'contact':card.matches('.expert-session')?'session':card.matches('.expert-about')?'about':'questions';
              pairs.push(['.expert-footer-rule',`expert-${role}-rule.svg`]);
              for(const [selector,file]of pairs){const img=card.querySelector(selector);if(img)img.src=source+file;}
            });
            await ready(page);
            zip.file(html.replace('.html','.png'),await page.screenshot());
          }
        }else{
          for(const entry of Object.values(zip.files)){
            if(entry.dir||!entry.name.endsWith('.png'))continue;
            const n=/(\d\d)\.png$/.exec(entry.name)?.[1];
            if(n&&fs.existsSync(path.join(dir,n+'.png')))zip.file(entry.name,fs.readFileSync(path.join(dir,n+'.png')),{date:entry.date});
          }
        }
        fs.writeFileSync(file,await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:9}}));
      }
      const sheet=path.join(dir,'contact-sheet.png');
      if(fs.existsSync(sheet)){
        const old=await sharp(sheet).metadata();
        const columns=[1,2,3,4,5,6].find(c=>Math.abs(old.height-Math.ceil(numbered.length/c)*(old.width/c)*1.25)<2)||3;
        const width=Math.round(old.width/columns),height=Math.round(width*1.25);
        const tiles=await Promise.all(numbered.map(async(file,i)=>({input:await sharp(path.join(dir,file.replace('.html','.png'))).resize(width,height).toBuffer(),left:i%columns*width,top:Math.floor(i/columns)*height})));
        await sharp({create:{width:width*columns,height:Math.ceil(numbered.length/columns)*height,channels:3,background:'#f0efeb'}}).composite(tiles).png().toFile(sheet);
      }
      const cache=path.join(dir,'crop-media.js');
      if(fs.existsSync(cache)){
        const c={window:{}};vm.runInNewContext(fs.readFileSync(cache,'utf8'),c);
        let count=0;
        for(const key of Object.keys(c.window.SARAFAN_CROP_MEDIA))if(changed.has(key)){
          c.window.SARAFAN_CROP_MEDIA[key]='data:image/png;base64,'+fs.readFileSync(path.join(root,key)).toString('base64');count++;
        }
        fs.writeFileSync(cache,'window.SARAFAN_CROP_MEDIA = Object.assign(window.SARAFAN_CROP_MEDIA || {}, '+JSON.stringify(c.window.SARAFAN_CROP_MEDIA)+');\n');
        console.log(`Refreshed ${count} embedded PNGs in ${post.id}.`);
      }
      console.log(`Exported ${post.id}: ${numbered.length} cards and ${covers.length} covers; existing archives and contact sheet updated.`);
    }
    fs.writeFileSync(path.join(root,'preview/publication-symbols-layout.json'),JSON.stringify(report,null,2)+'\n');
    console.log(`PASS: ${report.length} publication renders, symbol geometry and images checked; publication HTML, registry order and photo crops preserved.`);
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
