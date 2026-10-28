(() => {
  const posts = window.SARAFAN_POSTS || [];
  const nav = document.getElementById('posts-nav');
  const detail = document.getElementById('post-detail');
  const cards = document.getElementById('post-cards');
  const description = document.getElementById('post-description');
  document.getElementById('post-count').textContent = posts.length;

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
  });

  function route() {
    let id = '';
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { /* Открываем первый пост. */ }
    const post = posts.find(item => item.id === id) || posts[0];
    detail.hidden = !post;
    document.getElementById('posts-empty').hidden = Boolean(post);
    if (!post) return;

    nav.querySelectorAll('a').forEach(link => {
      if (link.dataset.post === post.id) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
    document.getElementById('post-title').textContent = post.title;
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
        window.SarafanWeeklyCover.mount(shell, unit, card, post.id);
        cards.append(unit);
        return;
      }
      if (card.edit) {
        const editor = window.SarafanPhotoEditor.mount(shell, card, post.id + ':' + index);
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
      if (post.cards.some(item => item.edit)) {
        const actions = document.createElement('figcaption'); actions.className = 'post-card-actions';
        const number = document.createElement('span'); number.textContent = String(index + 1).padStart(2, '0');
        const download = document.createElement('a');download.href=preview.src;download.download=post.id+'-'+card.src.split('/').at(-1);download.textContent='PNG ↓';
        actions.append(number,download);unit.append(actions);
      }
      cards.append(unit);
    });
    document.title = post.title + ' — Новые посты — Сарафан';
    scaleCards();
  }

  new ResizeObserver(scaleCards).observe(cards);
  window.addEventListener('hashchange', route);
  route();
})();
