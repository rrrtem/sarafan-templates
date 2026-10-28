const fs=require('node:fs');
const path=require('node:path');

exports.prepare=(root,dir)=>{
  const config=JSON.parse(fs.readFileSync(path.join(dir,'cover.json'),'utf8'));
  const baseFile=path.join(dir,'cover-base.html');
  if(!fs.existsSync(baseFile))fs.copyFileSync(path.join(dir,'01.html'),baseFile);
  const base=fs.readFileSync(baseFile,'utf8');
  const circle=fs.readFileSync(path.join(root,'assets/club-5535-ellipse31.svg'),'utf8');
  fs.mkdirSync(path.join(dir,'covers'),{recursive:true});
  const variants=[];
  for(const palette of config.palettes)for(const layout of config.layouts){
    const colors=palette.circles.map(color=>color.toUpperCase());
    if(colors.length!==8||new Set(colors).size!==8)throw Error('Weekly cover must have eight distinct circle colors: '+palette.id);
    if(colors.includes((config.background||'#FBEED2').toUpperCase()))throw Error('Circle colors must differ from the beige background');
    let index=0;
    const body=base.replace(/<img class="club-dot"[^>]*>/g,()=>{
      const color=palette.circles[index],point=layout.positions[index++];
      const file='covers/dot-'+color.replace('#','').toLowerCase()+'.svg';
      fs.writeFileSync(path.join(dir,file),circle.replace(/fill="#[a-f0-9]+"/ig,'fill="'+color+'"'));
      return `<img class="club-dot" src="${file}" alt="" style="left:${point[0]}px;top:${point[1]}px" aria-hidden="true">`;
    }).replace('</head>',`<style>.club-salon-cover{background:${config.background || "#FBEED2"};color:${palette.color}}.club-salon-cover .club-dot{z-index:0}.club-salon-cover .club-cinema,.club-salon-cover .club-address,.club-salon-cover .club-address-photo,.club-salon-cover .club-program-list,.club-salon-cover .club-cta,.club-salon-cover .club-mark{z-index:1}</style></head>`);
    if(index!==8)throw Error('Expected eight original circles');
    const id=palette.id+'-'+layout.id;
    const html='cover-'+id+'.html',png='covers/'+id+'.png';
    fs.writeFileSync(path.join(dir,html),body);
    variants.push({id,html,png});
    if(palette.id===config.initial.palette&&layout.id===config.initial.layout)fs.writeFileSync(path.join(dir,'01.html'),body);
  }
  return {variants,model:{initial:config.initial,palettes:config.palettes.map(({id,name})=>({id,name})),layouts:config.layouts.map(({id,name})=>({id,name})),variants:Object.fromEntries(variants.map(v=>[v.id,'posts/'+path.basename(dir)+'/'+v.png]))}};
};
