(() => {
  'use strict';
  const data = window.SARAFAN_DESIGN;
  const registry = window.SARAFAN_ASSETS;
  const status = document.getElementById('copy-status');
  let timer;
  function notify(message) {
    clearTimeout(timer);
    status.textContent = message;
    status.setAttribute('data-visible','');
    timer = setTimeout(() => status.removeAttribute('data-visible'),2500);
  }
  async function copy(value, label = 'Скопировано') {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(value);
    } catch {
      const input = document.createElement('textarea');
      input.value = value;
      input.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.append(input);
      input.select();
      let copied = false;
      try { copied = document.execCommand('copy'); } catch { /* Show manual copy. */ }
      input.remove();
      if (!copied) {
        const dialog = document.getElementById('copy-dialog');
        dialog.querySelector('textarea').value = value;
        dialog.showModal();
        dialog.querySelector('textarea').select();
        return;
      }
    }
    notify(label);
  }
  function node(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function download(path, text, label) {
    const a = node('a','',text);
    a.href = path;
    a.download = path.split('/').pop();
    if (label) a.setAttribute('aria-label',label);
    return a;
  }
  function image(path, alt) {
    const img = node('img');
    img.src = path;
    img.alt = alt;
    return img;
  }
  const dialog = document.getElementById('specimen-dialog');
  const dialogImage = document.getElementById('specimen-image');
  document.getElementById('specimen-close').addEventListener('click',() => dialog.close());
  dialog.addEventListener('click',event => { if (event.target === dialog) {
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  }});
  function exampleButton(path, title) {
    const button = node('button','ds-example-button');
    button.type = 'button';
    button.dataset.specimen = path;
    button.setAttribute('aria-label',`Открыть пример: ${title}, 1080 × 1350`);
    button.append(image(path,title));
    button.addEventListener('click',() => {
      dialogImage.src = path;
      dialogImage.alt = title;
      document.getElementById('specimen-title').textContent = title;
      const link = document.getElementById('specimen-download');
      link.href = path;
      link.download = path.split('/').pop();
      dialog.showModal();
    });
    return button;
  }
  function palette(target, colors) {
    for (const color of colors) {
      const entry = node('div','ds-color');
      const swatch = node('button','ds-swatch');
      swatch.type = 'button';
      swatch.style.setProperty('--swatch',color.hex);
      // Choose the more legible brand ink by WCAG relative luminance.
      const luminance = hex => [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255)
        .map(c => c <= .04045 ? c/12.92 : ((c+.055)/1.055)**2.4)
        .reduce((sum,c,i) => sum+c*[.2126,.7152,.0722][i],0);
      const light = '#FBEED2', dark = '#553D3D', value = luminance(color.hex);
      const contrast = hex => (Math.max(value,luminance(hex))+.05)/(Math.min(value,luminance(hex))+.05);
      entry.style.setProperty('--swatch-ink',contrast(light)>contrast(dark) ? light : dark);
      const rgb = [1,3,5].map(i => parseInt(color.hex.slice(i,i+2),16)).join(', ');
      swatch.setAttribute('aria-label',`${color.name}: скопировать ${color.hex}`);
      swatch.title = `Скопировать ${color.hex}`;
      swatch.addEventListener('click',() => copy(color.hex,`${color.hex} скопирован`));
      const caption = node('span','ds-color-caption');
      const values = node('span','ds-color-values');
      values.append(node('span','',color.hex),node('span','',`RGB ${rgb}`));
      caption.append(node('span','ds-color-name',color.name),values);
      swatch.append(caption);
      const backgrounds = node('div','ds-background-links');
      for (const height of [1350,1920]) {
        const link = download(`downloads/backgrounds/${color.id}-1080x${height}.png`,`1080 × ${height} ↓`,`Скачать фон ${color.name}, 1080 × ${height}, PNG`);
        if (location.protocol === 'file:') link.addEventListener('click',event => {
          event.preventDefault();
          const canvas = document.createElement('canvas');
          canvas.width = 1080; canvas.height = height;
          const context = canvas.getContext('2d');
          context.fillStyle = color.hex; context.fillRect(0,0,1080,height);
          canvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const save = download(url,''); save.download = link.download;
            document.body.append(save); save.click(); save.remove();
            setTimeout(() => URL.revokeObjectURL(url),10000);
          },'image/png');
        });
        backgrounds.append(link);
      }
      entry.append(swatch,backgrounds);
      document.getElementById(target).append(entry);
    }
  }
  palette('palette',data.colors);
  palette('additional-palette',data.additionalColors);
  for (const combo of data.combinations) {
    const card = node('article','ds-combo');
    const path = `downloads/examples/color-${combo.id}.png`;
    card.append(exampleButton(path,`${combo.name} · сочетание`),node('p','ds-combo-footer',combo.name));
    document.getElementById('combinations').append(card);
  }
  for (const specimen of data.specimens) {
    const card = node('article','ds-specimen');
    const details = node('details');
    details.append(node('summary','',specimen.name));
    const specs = node('dl','ds-type-specs');
    for (const type of specimen.styles) {
      const row = node('div');
      row.append(node('dt','',type.name),node('dd','',`${type.family} · ${type.weight}${type.style ? ' Italic' : ''}\n${type.size} px / ${Math.round(type.line*100)}%${type.tracking !== undefined ? ' · трекинг ' + type.tracking + ' px' : ''}`));
      specs.append(row);
    }
    const links = node('div','ds-specimen-links');
    links.append(download(specimen.image,'PNG ↓',`Скачать ${specimen.name}, 1080 × 1350`));
    details.append(specs,links);
    card.append(exampleButton(specimen.image,specimen.name),details,node('p','ds-specimen-use',specimen.use));
    document.getElementById('typography').append(card);
  }
  for (let i=0; i<36; i++) document.getElementById('grid-modules').append(node('span'));
  if (!registry) {
    document.getElementById('wordmarks').textContent = 'Реестр материалов не загрузился. Проверьте папку downloads.';
    return;
  }
  const assets = new Map(registry.assets.map(asset => [asset.id,asset]));
  function assetLinks(asset) {
    const links = node('div','ds-asset-links');
    for (const [format,path] of Object.entries(asset.formats)) {
      const link = download(path,`${format} ↓`,`Скачать ${asset.title}, ${format}`);
      if (location.protocol === 'file:' && ['SVG','PNG'].includes(format)) {
        link.addEventListener('click',event => {
          const contents = format === 'SVG' ? asset.svgText : asset.pngBase64;
          if (!contents) return;
          event.preventDefault();
          const bytes = format === 'SVG' ? contents : Uint8Array.from(atob(contents),c => c.charCodeAt(0));
          const url = URL.createObjectURL(new Blob([bytes],{type:format==='SVG'?'image/svg+xml':'image/png'}));
          const save = download(url,'');
          save.download = path.split('/').pop();
          document.body.append(save);
          save.click();
          save.remove();
          setTimeout(() => URL.revokeObjectURL(url),10000);
        });
      }
      links.append(link);
    }
    return links;
  }
  const colorCards = [];
  function assetCard(item, target) {
    const asset = assets.get(item.id);
    if (!asset) throw new Error('Missing design asset: '+item.id);
    const card = node('article','ds-asset');
    card.dataset.asset = item.id;
    const preview = node('div','ds-asset-preview');
    if (item.tone) preview.dataset.tone = item.tone;
    preview.append(image(asset.formats.SVG || asset.formats.PNG,item.name));
    if (item.label) preview.append(node('span','ds-action-label',item.label));
    card.append(preview,node('h3','',item.name));
    if (item.use) card.append(node('span','ds-asset-use',item.use));
    card.append(assetLinks(asset));
    document.getElementById(target).append(card);
    if (asset.variants) colorCards.push({card,preview,item,asset});
  }
  data.wordmarks.forEach(item => assetCard(item,'wordmarks'));
  data.symbols.forEach(item => assetCard(item,'symbol-assets'));
  data.elements.forEach(item => assetCard(item,'elements'));
  function selectBrandColor(color) {
    for (const {card,preview,item,asset} of colorCards) {
      const variant = color.id === 'orange' ? asset : asset.variants[color.id];
      if (!variant) throw new Error('Missing asset color: ' + asset.id + ' / ' + color.id);
      const img = preview.querySelector('img');
      img.src = variant.formats.SVG;
      img.alt = item.name + ' · ' + color.name;
      preview.dataset.tone = ['cream','blue','pink'].includes(color.id) ? 'dark' : 'light';
      card.dataset.color = color.id;
      card.querySelector('.ds-asset-links').replaceWith(assetLinks(variant));
    }
    for (const button of document.querySelectorAll('[data-brand-color]')) button.setAttribute('aria-pressed',String(button.dataset.brandColor === color.id));
  }
  for (const color of data.colors) {
    const button = node('button','ds-brand-color');
    button.type = 'button';
    button.dataset.brandColor = color.id;
    button.style.setProperty('--brand-swatch',color.hex);
    button.setAttribute('aria-label',color.name);
    button.title = color.name + ' · ' + color.hex;
    button.addEventListener('click',() => selectBrandColor(color));
    document.getElementById('brand-colors').append(button);
  }
  selectBrandColor(data.colors.find(color => color.id === 'orange'));

  for (const ribbon of data.ribbons) {
    const card = node('article','ds-ribbon');
    card.dataset.ribbon = ribbon.name;
    const preview = node('div','ds-ribbon-preview');
    preview.dataset.orientation = ribbon.orientation;
    const choices = node('div','ds-ribbon-colors');
    choices.setAttribute('role','group');
    choices.setAttribute('aria-label','Цвет ленты · ' + ribbon.name);
    card.append(preview,node('h3','',ribbon.name));
    if (ribbon.use) card.append(node('p','ds-ribbon-use',ribbon.use));
    if (ribbon.options.length > 1) card.append(choices);
    const links = node('div','ds-asset-links');
    card.append(links);
    function choose(option) {
      const asset = assets.get(option.id);
      if (!asset) throw new Error('Missing ribbon: ' + option.id);
      preview.replaceChildren(image(asset.formats.SVG,`${ribbon.name} · ${option.name.toLowerCase()}`));
      preview.dataset.tone = option.color === 'cream' ? 'dark' : 'light';
      card.dataset.color = option.color;
      card.querySelector('.ds-asset-links').replaceWith(assetLinks(asset));
      for (const button of choices.querySelectorAll('button')) button.setAttribute('aria-pressed',String(button.dataset.ribbonColor===option.color));
    }
    if (ribbon.options.length > 1) for (const option of ribbon.options) {
      const color = data.colors.find(c => c.id === option.color);
      const button = node('button','ds-ribbon-color');
      button.type='button';button.dataset.ribbonColor=option.color;
      button.style.setProperty('--ribbon-swatch',color.hex);
      button.setAttribute('aria-label',`${option.name} лента · ${ribbon.name}`);
      button.title=option.name + ' · ' + color.hex;
      button.addEventListener('click',() => choose(option));
      choices.append(button);
    }
    choose(ribbon.options[0]);
    document.getElementById('ribbons').append(card);
  }
  const fontGroups = [
    {name:'EB Garamond',family:'EB Garamond',use:'Редакционный текст и курсив',path:'downloads/eb-garamond.zip',format:'ZIP · OTF',page:'https://fonts.google.com/specimen/EB+Garamond'},
    {name:'Geist',family:'Geist',use:'Заголовки и текст · единая версия 1.6',path:'downloads/fonts/expert-geist-v1.6.ttf',format:'TTF',page:'https://vercel.com/font'},
    {name:'CoFo Cinema1909',family:'CoFo Cinema 1909',use:'Клуб · Салон',path:'downloads/fonts/cofo-cinema1909-regular.otf',format:'OTF'}
  ];
  for (const group of fontGroups) {
    const entry = node('div','ds-font-group');
    const info = node('div');
    const title = node('h3','ds-font-name',group.name);
    title.dataset.font = group.family;
    title.style.fontFamily = `"${group.family}", sans-serif`;
    info.append(title,node('p','',group.use));
    const files = node('div','ds-font-files');
    files.append(download(group.path,`Скачать · ${group.format} ↓`,`Скачать ${group.name} одним файлом`));
    if (group.page) {
      const page = node('a','','Страница шрифта ↗');
      page.href = group.page; page.target = '_blank'; page.rel = 'noopener noreferrer';
      files.append(page);
    }
    entry.append(info,files);
    document.getElementById('font-downloads').append(entry);
  }
})();
