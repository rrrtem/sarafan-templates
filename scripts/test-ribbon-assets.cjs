#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const deps=process.env.SARAFAN_NODE_MODULES || '/Users/fixed/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const sharp=require(path.join(deps,'sharp'));
const JSZip=require(path.join(deps,'jszip'));
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const assets=JSON.parse(read('downloads/manifest.json')).assets;
const specs=[
  ['ribbon-journal-vertical','vertical','#FF3C00'],
  ['ribbon-bureau-blue','horizontal','#A9C9DF'],
  ['ribbon-bureau-horizontal','horizontal','#FBEED2'],
  ['ribbon-club-green','horizontal','#91945B'],
  ['ribbon-club-horizontal','horizontal','#FBEED2']
];
(async()=>{
  const archive=await JSZip.loadAsync(fs.readFileSync(path.join(root,'downloads/sarafan-elements.zip')));
  for(const [id,direction,color] of specs){
    const asset=assets.find(a=>a.id===id);assert(asset,'Missing ribbon '+id);
    const svg=read(asset.formats.SVG);
    const rootTag=/<svg\b[^>]*>/.exec(svg)[0];
    const dimension=name=>Number(new RegExp('\\b'+name+'="([0-9.]+)"').exec(rootTag)[1]);
    assert(direction==='vertical'?dimension('height')>dimension('width'):dimension('width')>dimension('height'),'Orientation: '+id);
    assert(svg.toUpperCase().includes(color),'Ribbon color: '+id);
    for(const file of Object.values(asset.formats))assert(archive.file(file.replace(/^downloads\//,'')),'In ZIP: '+file);
    if(id.startsWith('ribbon-club-')){
      const corner=await sharp(Buffer.from(svg)).extract({left:1,top:1,width:1,height:1}).ensureAlpha().raw().toBuffer();
      assert.equal(corner[3],255,'Club ribbon has a square left edge: '+id);
    }
  }
  for(const id of ['ribbon-journal-horizontal','ribbon-bureau-vertical','ribbon-club-vertical','ribbon-salon-vertical']){
    assert(!assets.some(a=>a.id===id),'Disallowed orientation is not offered: '+id);
    assert(!archive.file('elements/'+id+'.svg'),'Disallowed orientation is not in ZIP: '+id);
  }
  assert(read('assets/bureau-live-light-ribbon.svg').includes('#A9C9DF'),'Light live template uses a blue Bureau ribbon');
  const context={window:{}};vm.runInNewContext(read('design-system-data.js'),context);
  const ribbons=context.window.SARAFAN_DESIGN.ribbons;
  assert.equal(ribbons.length,3);for(const ribbon of ribbons)for(const option of ribbon.options)assert(assets.some(a=>a.id===option.id));
  console.log('PASS ribbon rules: correct orientations and colors, square left edge, full SVG/PNG/PDF downloads, clean archive and blue live template.');
})().catch(error=>{console.error(error);process.exitCode=1});
