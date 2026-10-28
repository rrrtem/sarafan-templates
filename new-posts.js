(() => {
  const posts = window.SARAFAN_POSTS || [];
  const nav = document.getElementById('posts-nav');
  const picker = document.getElementById('post-picker');
  const detail = document.getElementById('post-detail');
  const cards = document.getElementById('post-cards');
  const description = document.getElementById('post-description');
  const downloadPost = document.getElementById('download-post');
  const postStatus = document.getElementById('post-status');
  let currentPost = null;
  let exporters = [];
  let downloading = false;
  document.getElementById('post-count').textContent = posts.length;

  function saveDownload(href, filename) {
    const link = document.createElement('a');
    link.href = href; link.download = filename;
    document.body.append(link); link.click(); link.remove();
  }

  async function imageBytes(source) {
    const response = await fetch(source);
    if (!response.ok) throw new Error('Не удалось загрузить карточку. Повторите скачивание.');
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) throw new Error('Не удалось загрузить изображение карточки.');
    return new Uint8Array(await blob.arrayBuffer());
  }

  downloadPost.addEventListener('click', async () => {
    if (!currentPost || downloading) return;
    const post = currentPost;
    if (!post.cards.some(card => card.edit || card.cover)) {
      saveDownload('posts/' + post.id + '/carousel.zip', post.id + '.zip');
      return;
    }
    // Capture this post's exporters before navigation can mount a different post.
    const slides = exporters.slice();
    downloading = true; downloadPost.disabled = true;
    postStatus.textContent = 'Собираем все карточки…';
    try {
      const files = [];
      for (let index = 0; index < slides.length; index++) {
        files.push({ name: post.id + '-' + String(index + 1).padStart(2, '0') + '.png', data: await slides[index]() });
        if (currentPost === post) postStatus.textContent = 'Собираем карточки: ' + (index + 1) + ' из ' + slides.length;
      }
      const blob = new Blob([window.SarafanZip.createZip(files)], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      saveDownload(url, post.id + '.zip');
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      if (currentPost === post) postStatus.textContent = 'Архив готов: ' + files.length + ' карточек.';
    } catch (error) {
      if (currentPost === post) postStatus.textContent = 'Не удалось скачать весь пост. ' + error.message;
    } finally {
      downloading = false; downloadPost.disabled = false;
    }
  });

  function scaleCards() {
    cards.querySelectorAll('.post-card').forEach(card => {
      card.style.setProperty('--post-card-scale', card.clientWidth / 1080);
    });
  }

  posts.forEach(post => {
    const link = document.createElement('a');
    link.href = '#' + encodeURIComponent(post.id);
    link.textContent = post.title;
    link.dataset.post = post.id;
    nav.append(link);
    picker.add(new Option(post.title, post.id));
  });
  picker.disabled = !posts.length;
  picker.addEventListener('change', () => { location.hash = encodeURIComponent(picker.value); });

  function route() {
    let id = '';
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { /* Открываем первый пост. */ }
    const post = posts.find(item => item.id === id) || posts[0];
    currentPost = post;
    exporters = [];
    detail.hidden = !post;
    document.getElementById('posts-empty').hidden = Boolean(post);
    if (!post) return;
    picker.value = post.id;

    nav.querySelectorAll('a').forEach(link => {
      if (link.dataset.post === post.id) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
    document.getElementById('post-title').textContent = post.title;
    downloadPost.setAttribute('aria-label', 'Скачать весь пост: ' + post.title + ' (' + post.cards.length + ' PNG)');
    document.getElementById('post-edit-hint').hidden = !post.cards.some(card => card.edit);
    document.getElementById('post-status').textContent = '';
    document.getElementById('post-description-text').textContent = post.description || '';
    description.hidden = !post.description;
    cards.replaceChildren();
    post.cards.forEach((card, index) => {
      const unit = document.createElement('figure');
      unit.className = 'post-card-unit';
      const shell = document.createElement('div');
      shell.className = 'post-card';
      if (card.cover) {
        unit.append(shell);
        const cover = window.SarafanWeeklyCover.mount(shell, unit, card, post.id);
        exporters.push(() => imageBytes(cover.source()));
        cards.append(unit);
        return;
      }
      if (card.edit) {
        const editor = window.SarafanPhotoEditor.mount(shell, card, post.id + ':' + index);
        exporters.push(async () => new Uint8Array(await (await editor.exportBlob()).arrayBuffer()));
        const actions = document.createElement('figcaption');
        actions.className = 'post-card-actions';
        const number = document.createElement('span');
        number.textContent = String(index + 1).padStart(2, '0');
        const crop = document.createElement('button');
        crop.type = 'button'; crop.textContent = 'Кадрировать';
        crop.setAttribute('aria-label', 'Кадрировать: ' + card.alt);
        crop.addEventListener('click', () => editor.open(crop));
        const download = document.createElement('button');
        download.type = 'button'; download.textContent = 'PNG ↓';
        download.setAttribute('aria-label', 'Скачать PNG: ' + card.alt);
        download.addEventListener('click', async () => {
          download.disabled = true;
          try { await editor.download(); } catch (error) { document.getElementById('post-status').textContent = error.message; }
          finally { download.disabled = false; }
        });
        actions.append(number, crop, download);
        unit.append(shell, actions); cards.append(unit);
        return;
      }
      const preview = document.createElement(card.type === 'html' ? 'iframe' : 'img');
      const label = card.alt || post.title + ' — карточка ' + (index + 1);
      if (card.type === 'html') {
        preview.title = label;
        preview.setAttribute('sandbox', 'allow-same-origin');
        preview.setAttribute('scrolling', 'no');
      } else preview.alt = label;
      preview.src = card.type === 'html' ? card.src : (window.SARAFAN_CROP_MEDIA?.[card.src] || card.src);
      shell.append(preview);
      unit.append(shell);
      {
        const actions = document.createElement('figcaption'); actions.className = 'post-card-actions';
        const number = document.createElement('span'); number.textContent = String(index + 1).padStart(2, '0');
        const png = card.type === 'html' ? card.src.replace(/\.html$/, '.png') : card.src;
        const source = () => window.SARAFAN_CROP_MEDIA?.[png] || png;
        exporters.push(() => imageBytes(source()));
        const download = document.createElement('a');download.href=source();download.download=post.id+'-'+png.split('/').at(-1);download.textContent='PNG ↓';
        download.setAttribute('aria-label', 'Скачать PNG: ' + label);
        actions.append(number,download);unit.append(actions);
      }
      cards.append(unit);
    });
    document.title = post.title + ' — Примеры постов — Сарафан';
    scaleCards();
  }

  new ResizeObserver(scaleCards).observe(cards);
  window.addEventListener('hashchange', route);
  route();
})();
