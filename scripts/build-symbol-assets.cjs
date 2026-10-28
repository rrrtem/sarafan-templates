#!/usr/bin/env node
'use strict';
// Original transparent Figma exports are authoritative. Only palette substitutions are derived.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const vm=require('node:vm');
const deps=process.env.SARAFAN_NODE_MODULES || '/Users/fixed/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const sharp=require(path.join(deps,'sharp'));
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const write=(p,bytes)=>fs.writeFileSync(path.join(root,p),bytes);
const context={window:{}};
vm.runInNewContext(read('design-system-data.js'),context);
const colors=Object.fromEntries(context.window.SARAFAN_DESIGN.colors.map(c=>[c.id,c.hex]));
const symbols=[
  {id:'rooster',name:'Петух',nodeId:'391:13811',variants:Object.keys(colors)},
  {id:'bureau',name:'Кольца Бюро',nodeId:'386:12392',variants:Object.keys(colors)},
  {id:'horse',name:'Конь Клуба',nodeId:'391:14070',variants:Object.keys(colors)},
  {id:'sirin',name:'Сирин',nodeId:'391:14391',variants:Object.keys(colors)}
];
const aliases=[
  ...['about','questions','session'].map(part=>({path:`assets/expert-${part}-logo.svg`,symbol:'bureau',color:'orange'})),
  {path:'assets/expert-contact-logo.svg',symbol:'bureau',color:'cream'},
  {path:'assets/intro-3-group82.svg',symbol:'bureau',color:'orange'},
  ...['dark','light'].map(part=>({path:`assets/bureau-live-${part}-mark.svg`,symbol:'bureau',color:'orange'})),
  ...fs.readdirSync(path.join(root,'assets')).filter(p=>/^club-\d+-group93\.svg$/.test(p)).map(p=>({path:'assets/'+p,symbol:'horse',color:'orange'})),
  ...['olive','cream','blue'].map(color=>({path:`posts/ingrid-aromatherapy/marks/mark-${color}.svg`,symbol:'bureau',color}))
];
(async()=>{
  for(const symbol of symbols){
    symbol.source=`assets/symbol-${symbol.id}-figma.svg`;
    const svg=read(symbol.source);
    if(!svg.startsWith('<svg')||svg.includes('<image')||svg.includes('#1E1E1E'))throw Error('Expected a transparent original vector: '+symbol.id);
    symbol.sha256=crypto.createHash('sha256').update(svg).digest('hex');
    symbol.files={};
    for(const color of symbol.variants){
      const file=`assets/symbol-${symbol.id}-${color}.svg`;
      write(file,svg.replace(/#FF3C00/gi,colors[color]));
      symbol.files[color]=file;
    }
  }
  for(const alias of aliases)write(alias.path,read(`assets/symbol-${alias.symbol}-${alias.color}.svg`));
  // Legacy raster URLs remain available, but contain a render of the current vectors.
  for(const [symbol,file]of [['horse','assets/intro-4910-logo.png'],['sirin','assets/intro-3826-logo.png']]){
    const old=await sharp(path.join(root,file)).metadata();
    const bytes=await sharp(Buffer.from(read(`assets/symbol-${symbol}-orange.svg`))).resize(old.width,old.height,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
    write(file,bytes);
  }
  write('assets/symbols.json',JSON.stringify({fileKey:'oEldVQIQ9PsRezkqg1rdzy',pageId:'386:10081',updated:'2026-10-28',colors,symbols,aliases},null,2)+'\n');
  console.log(`Built ${symbols.length} original symbols, ${symbols.reduce((n,s)=>n+s.variants.length,0)} palette variants, ${aliases.length} compatible SVG aliases and two PNG aliases.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
