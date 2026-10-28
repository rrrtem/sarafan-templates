(() => {
  const crop = window.SarafanCrop;
  const dialog = document.getElementById('photo-editor');
  const preview = document.getElementById('crop-preview');
  const status = document.getElementById('crop-status');
  const controls = Object.fromEntries(['x','y','zoom','fit'].map(key=>[key,document.getElementById('crop-'+key)]));
  const saved = new Map();
  let editing = null, draft = null, drag = null, opener = null;
  const storageKey = key => 'sarafan-photo-crop:v1:' + key;
  function read(key, initial) {
    if(saved.has(key)) return saved.get(key);
    let value = initial;
    try { const raw=localStorage.getItem(storageKey(key)); if(raw) value=Object.assign({},initial,JSON.parse(raw)); } catch { /* Use original composition when browser storage is unavailable. */ }
    const state=crop.normalize(value); saved.set(key,state); return state;
  }
  function render(canvas, edit, state) {
    canvas.cropRevision=state;
    return crop.paint(canvas,edit,state);
  }
  function update() {
    if(!editing) return;
    draft=crop.normalize(draft);
    for(const key of ['x','y','zoom']) {
      const value=key==='zoom'?draft[key]:Math.round(draft[key]*100);
      controls[key].value=value;
      document.getElementById('crop-'+key+'-value').textContent=Math.round(key==='zoom'?value*100:value)+'%';
    }
    controls.fit.value=draft.fit;
    render(preview,editing.card.edit,draft).catch(error=>{status.textContent=error.message;});
  }
  function open(item, button) {
    editing=item; opener=button; draft={...item.state};
    status.textContent='';
    document.getElementById('crop-card-name').textContent=item.card.alt;
    dialog.showModal(); update();
  }
  for(const key of ['x','y','zoom']) controls[key].addEventListener('input',()=> {
    draft={...draft,[key]:Number(controls[key].value)/(key==='zoom'?1:100)};update();
  });
  controls.fit.addEventListener('change',()=>{draft={...draft,fit:controls.fit.value};update();});
  document.getElementById('crop-reset').addEventListener('click',()=>{draft={...editing.card.edit.initial};update();});
  for(const id of ['crop-close','crop-cancel']) document.getElementById(id).addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{editing=null;draft=null;drag=null;opener?.focus();});
  document.getElementById('crop-save').addEventListener('click',async()=>{
    if(!editing)return;
    const item=editing, state=crop.normalize(draft);
    try { await render(item.canvas,item.card.edit,state); }
    catch(error) { status.textContent=error.message; return; }
    item.state=state;saved.set(item.key,state);
    let persisted=true;
    try { localStorage.setItem(storageKey(item.key),JSON.stringify(state)); } catch { persisted=false; }
    dialog.close();
    document.getElementById('post-status').textContent=persisted?'Кадр сохранён. PNG будет скачан с этим кадром.':'Кадр применён. Браузер не разрешил сохранить его после закрытия страницы — скачайте PNG сейчас.';
  });
  preview.addEventListener('pointerdown',async event=>{
    if(!editing)return;
    const rect=preview.getBoundingClientRect(),s=editing.card.edit.slot;
    const x=(event.clientX-rect.left)*1080/rect.width,y=(event.clientY-rect.top)*1350/rect.height;
    if(((x-s.x-s.width/2)/(s.width/2))**2+((y-s.y-s.height/2)/(s.height/2))**2>1)return;
    event.preventDefault();preview.focus();preview.setPointerCapture(event.pointerId);
    const image=await crop.loadImage(editing.card.edit.image);
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,state:{...draft},image,ratio:1080/rect.width};
  });
  preview.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.id||!editing)return;
    const s=editing.card.edit.slot,g=crop.geometry(drag.image.naturalWidth,drag.image.naturalHeight,s,drag.state);
    const dx=(event.clientX-drag.x)*drag.ratio,dy=(event.clientY-drag.y)*drag.ratio;
    draft={...drag.state,x:Math.abs(s.width-g.width)>1?drag.state.x+dx/(s.width-g.width):drag.state.x,y:Math.abs(s.height-g.height)>1?drag.state.y+dy/(s.height-g.height):drag.state.y};update();
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])preview.addEventListener(type,()=>{drag=null;});
  preview.addEventListener('keydown',async event=>{
    if(!editing||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
    event.preventDefault();const item=editing;
    const image=await crop.loadImage(item.card.edit.image);if(editing!==item)return;
    const s=item.card.edit.slot,g=crop.geometry(image.naturalWidth,image.naturalHeight,s,draft),step=event.shiftKey ? 50 : 10;
    const dx=event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0,dy=event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0;
    draft={...draft,x:draft.x+(Math.abs(s.width-g.width)>1?dx/(s.width-g.width):0),y:draft.y+(Math.abs(s.height-g.height)>1?dy/(s.height-g.height):0)};update();
  });
  function mount(shell, card, key) {
    const canvas=document.createElement('canvas');
    canvas.width=1080;canvas.height=1350;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',card.alt);
    shell.append(canvas);
    const item={canvas,card,key,state:read(key,card.edit.initial)};
    item.ready=render(canvas,card.edit,item.state);
    item.ready.catch(error=>{document.getElementById('post-status').textContent=error.message;});
    async function exportBlob() {
      await render(canvas,card.edit,item.state);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
      if(!blob)throw new Error('Не удалось создать PNG.');
      return blob;
    }
    return {
      open:button=>open(item,button),
      exportBlob,
      download:async()=>{
        const blob=await exportBlob();
        const url=URL.createObjectURL(blob),link=document.createElement('a');
        link.href=url;link.download=card.src.split('/').at(-1);link.click();
        setTimeout(()=>URL.revokeObjectURL(url),10000);
      }
    };
  }
  window.SarafanPhotoEditor={mount};
})();
