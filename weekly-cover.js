(() => {
  function mount(shell, unit, card, postId) {
    const model=card.cover,key='sarafan-weekly-cover:v1:'+postId;
    let state={...model.initial};
    try{const value=JSON.parse(localStorage.getItem(key));if(value&&model.variants[value.palette+'-'+value.layout])state=value;}catch{/* Use the configured weekly cover. */}
    const image=document.createElement('img');image.alt=card.alt;shell.append(image);
    const footer=document.createElement('figcaption');footer.className='post-cover-controls';
    const controls={};
    for(const [field,label,options] of [['palette','Цвета кругов',model.palettes],['layout','Круги',model.layouts]]){
      const wrap=document.createElement('label');wrap.textContent=label;
      const select=document.createElement('select');select.setAttribute('aria-label',label+' обложки');
      for(const option of options)select.add(new Option(option.name,option.id));
      select.value=state[field];controls[field]=select;wrap.append(select);footer.append(wrap);
      select.addEventListener('change',()=>{
        state={palette:controls.palette.value,layout:controls.layout.value};
        try{localStorage.setItem(key,JSON.stringify(state));}catch{/* Current selection still applies to the PNG. */}
        update();
      });
    }
    const download=document.createElement('a');download.textContent='PNG ↓';download.download=postId+'-01.png';download.setAttribute('aria-label','Скачать PNG обложки');footer.append(download);
    function update(){
      const src=model.variants[state.palette+'-'+state.layout];
      image.src=window.SARAFAN_CROP_MEDIA?.[src]||src;
      download.href=image.src;
    }
    unit.append(footer);update();
  }
  window.SarafanWeeklyCover={mount};
})();
