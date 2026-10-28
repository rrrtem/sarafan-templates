(() => {
  const data = window.SARAFAN_DESIGN;
  const registry = window.SARAFAN_ASSETS;
  const paletteCSS = ':root {\n' + [...data.colors,...(data.additionalColors||[])].map(c => `  --sarafan-${c.id}: ${c.hex};`).join('\n') + '\n}';
  const status = document.getElementById('copy-status');
  let timer;

  function notify(message) {
    clearTimeout(timer);
    status.textContent = message;
    status.setAttribute('data-visible', '');
    timer = setTimeout(() => status.removeAttribute('data-visible'), 2500);
  }

  async function copy(value, label) {
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
      try { copied = document.execCommand('copy'); } catch { /* Manual fallback below. */ }
      input.remove();
      if (!copied) {
        const dialog = document.getElementById('copy-dialog');
        dialog.querySelector('textarea').value = value;
        dialog.showModal();
        dialog.querySelector('textarea').select();
        return;
      }
    }
    notify(label || 'Скопировано');
  }

  function button(text, value, label, className) {
    const node = document.createElement('button');
    node.type = 'button';
    node.textContent = text;
    if (className) node.className = className;
    node.addEventListener('click', () => copy(value, label));
    return node;
  }

  for (const [target,colors] of [['palette',data.colors],['additional-palette',data.additionalColors||[]]]) for (const color of colors) {
    const entry = document.createElement('div');
    entry.className = 'ds-color';
    const swatch = button('', color.hex, color.hex + ' скопирован', 'ds-swatch');
    swatch.style.setProperty('--swatch', color.hex);
    swatch.style.setProperty('--swatch-ink', ['brown', 'orange'].includes(color.id) ? '#FBEED2' : '#553D3D');
    swatch.setAttribute('aria-label', `${color.name}: скопировать ${color.hex}`);
    const title = document.createElement('h4');
    title.textContent = color.name;
    const rgb = [1, 3, 5].map(i => parseInt(color.hex.slice(i, i + 2), 16)).join(', ');
    const hexButton = button(color.hex, color.hex, color.hex + ' скопирован', 'ds-copy-hex');
    hexButton.setAttribute('aria-label', `Скопировать HEX ${color.hex}`);
    const rgbButton = button('RGB ' + rgb, `rgb(${rgb})`, 'RGB скопирован', 'ds-copy-rgb');
    entry.append(swatch, title, hexButton, rgbButton);
    document.getElementById(target).append(entry);
  }
  document.querySelector('[data-copy="palette"]').addEventListener('click', () => copy(paletteCSS, 'CSS палитры скопирован'));

  data.combinations.forEach((combo, index) => {
    const entry = document.createElement('article');
    entry.className = 'ds-combo';
    entry.style.setProperty('--combo-bg', combo.background);
    entry.style.setProperty('--combo-ink', combo.color);
    entry.style.setProperty('--combo-accent', combo.accent);
    const text = document.createElement('p');
    text.append('Почувствовать', document.createElement('br'));
    const emphasis = document.createElement('em');
    emphasis.textContent = 'себя как дома';
    text.append(emphasis);
    const css = `background: ${combo.background};\ncolor: ${combo.color};\n/* Курсивный акцент */\n--text-accent: ${combo.accent};`;
    const control = button('Копировать ↗', css, 'Сочетание скопировано');
    control.setAttribute('aria-label', `${combo.name}: скопировать CSS сочетания ${index + 1}`);
    entry.append(text, control);
    document.getElementById('combinations').append(entry);
  });

  data.typography.forEach(group => {
    const section = document.createElement('section');
    section.className = 'ds-type-group';
    section.id = 'type-' + group.id;
    section.setAttribute('aria-labelledby', section.id + '-title');
    const heading = document.createElement('h4');
    heading.id = section.id + '-title';
    heading.textContent = group.name;
    section.append(heading);
    group.styles.forEach(type => {
    const entry = document.createElement('article');
    entry.className = 'ds-type';
    const info = document.createElement('div');
    const title = document.createElement('h5');
    title.textContent = type.name;
    const spec = document.createElement('p');
    spec.className = 'ds-spec';
    spec.textContent = `${type.family} · ${type.weight}${type.style ? ' Italic' : ''}\n${type.size} px / ${Math.round(type.line * 100)}%${type.tracking ? ' · трекинг ' + type.tracking + ' px' : ''}`;
    spec.style.whiteSpace = 'pre-line';
    let css = `.sarafan-text {\n  font-family: "${type.family}";\n  font-size: ${type.size}px;\n  line-height: ${type.line};\n  font-weight: ${type.weight};\n  font-style: ${type.style || 'normal'};${type.tracking ? '\n  letter-spacing: ' + type.tracking + 'px;' : ''}\n}`;
    for (const run of type.runs || []) {
      if (!run.tag) continue;
      const declarations = [];
      if (run.family) declarations.push(`font-family: "${run.family}";`);
      if (run.weight) declarations.push(`font-weight: ${run.weight};`);
      if (run.style) declarations.push(`font-style: ${run.style};`);
      if (run.color) declarations.push(`color: ${run.color};`);
      css += `\n\n.sarafan-text ${run.tag} {\n  ${declarations.join('\n  ')}\n}`;
    }
    info.append(title, spec, button('Копировать CSS ↗', css, 'Стиль текста скопирован', 'ds-text-link'));
    const preview = document.createElement('div');
    const sample = document.createElement('p');
    sample.className = 'ds-type-sample';
    sample.style.setProperty('--type-family', `"${type.family}", serif`);
    sample.style.setProperty('--type-weight', type.weight);
    sample.style.setProperty('--type-style', type.style || 'normal');
    sample.style.setProperty('--type-size', type.size * 0.5 + 'px');
    sample.style.setProperty('--type-line', type.line);
    if (type.tracking) sample.style.letterSpacing = type.tracking * 0.5 + 'px';
    if (type.runs) {
      for (const run of type.runs) {
        const part = document.createElement(run.tag || 'span');
        part.textContent = run.text;
        if (run.family) part.style.fontFamily = `"${run.family}", serif`;
        if (run.weight) part.style.fontWeight = run.weight;
        if (run.style) part.style.fontStyle = run.style;
        if (run.color) part.style.color = run.color;
        sample.append(part);
      }
    } else sample.textContent = type.sample;
    const source = document.createElement('a');
    source.className = 'ds-type-source';
    source.href = type.href;
    source.textContent = type.source + ' ↗';
    preview.append(sample, source);
    entry.append(info, preview);
    section.append(entry);
    });
    document.getElementById('typography').append(section);
  });

  if (!registry) {
    document.getElementById('logos').textContent = 'Реестр ассетов не загрузился. Проверьте, что папка downloads находится рядом со страницей.';
    return;
  }
  document.getElementById('logos').replaceChildren();
  for (const asset of registry.assets) {
    const entry = document.createElement('article');
    entry.className = 'ds-asset';
    const preview = document.createElement('div');
    preview.className = 'ds-asset-preview';
    if (/cream|ribbon-bureau|expert-ovals|expert-mask/.test(asset.id)) preview.dataset.tone = 'dark';
    const img = document.createElement('img');
    img.src = asset.formats.SVG || asset.formats.PNG;
    img.alt = asset.title;
    img.loading = 'lazy';
    preview.append(img);
    const title = document.createElement('h4');
    title.textContent = asset.title.replace(' · исходный растр', '');
    const links = document.createElement('div');
    links.className = 'ds-asset-links';
    for (const [format, path] of Object.entries(asset.formats)) {
      const link = document.createElement('a');
      link.href = path;
      link.download = path.split('/').pop();
      link.textContent = format + ' ↓';
      link.setAttribute('aria-label', `Скачать ${asset.title}, ${format}`);
      if (location.protocol === 'file:' && ['SVG', 'PNG'].includes(format)) {
        link.addEventListener('click', event => {
          const contents = format === 'SVG' ? asset.svgText : asset.pngBase64;
          if (!contents) return;
          event.preventDefault();
          const bytes = format === 'SVG' ? contents : Uint8Array.from(atob(contents), c => c.charCodeAt(0));
          const blob = new Blob([bytes], { type: format === 'SVG' ? 'image/svg+xml' : 'image/png' });
          const url = URL.createObjectURL(blob);
          const save = document.createElement('a');
          save.href = url;
          save.download = link.download;
          document.body.append(save);
          save.click();
          save.remove();
          setTimeout(() => URL.revokeObjectURL(url), 10000);
        });
      }
      links.append(link);
    }
    entry.append(preview, title, links);
    document.getElementById(asset.category === 'logo' ? 'logos' : 'elements').append(entry);
  }

  const groups = [
    ['EB Garamond', f => f.id.startsWith('eb-garamond-')],
    ['Geist', f => f.id.startsWith('geist-')],
    ['Geist · эксперт', f => f.id.startsWith('expert-geist')],
    ['CoFo Cinema 1909', f => f.id.startsWith('cofo-')],
    ['Inter · геометка', f => f.id.startsWith('inter-')]
  ];
  groups.forEach(([name, matches]) => {
    const entry = document.createElement('div');
    entry.className = 'ds-font-group';
    const title = document.createElement('h4');
    title.textContent = name;
    const files = document.createElement('div');
    files.className = 'ds-font-files';
    registry.fonts.filter(matches).forEach(font => {
      const link = document.createElement('a');
      link.href = font.path;
      link.download = font.title;
      const face = font.id.replace(/^(eb-garamond-|geist-|cofo-cinema1909-|inter-)/, '').replace('expert-geist-', '').replaceAll('-', ' ');
      link.textContent = `${face} · ${font.format} ↓`;
      link.setAttribute('aria-label', `Скачать ${name}, ${face}, ${font.format}`);
      files.append(link);
    });
    entry.append(title, files);
    document.getElementById('font-downloads').append(entry);
  });
})();
