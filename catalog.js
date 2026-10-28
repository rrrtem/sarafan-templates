(() => {
  const templates = [
    {
      id: 'recommendations', name: 'Рекомендации от человека', example: 'Места, бассейны и сувениры · Варвара Секиароли',
      category: 'journal', categoryName: 'Журнал', exportPrefix: 'sarafan-recommendations', node: '386-13192',
      summary: '3 обложки с автором', defaultView: 'grid', previewIndices: [0, 1, 2],
      labels: ['Места · Из сохраненок Вари', 'Бассейны · Куда ходит Варя', 'Сувениры · Из вишлиста Вари']
    },
    {
      id: 'reels-cover', name: 'Обложка рилса', example: 'Размытая фотография и заголовок · 1080 × 1920',
      category: 'journal', categoryName: 'Журнал', exportPrefix: 'sarafan-reels-cover', node: '385-10072',
      canvas: { width: 1080, height: 1920 }, previewIndices: [0],
      labels: ['21-й округ Парижа']
    },
    {
      id: 'bureau-live', name: 'Бюро · Эфир на тему', example: 'Тема эфира, фотография и имя ведущего · 1080 × 1920',
      category: 'bureau', categoryName: 'Бюро', exportPrefix: 'sarafan-bureau-live', node: '385-10037',
      canvas: { width: 1080, height: 1920 }, previewIndices: [0, 1],
      labels: ['Прямой эфир · Тёмный', 'Прямой эфир · Светлый']
    },
    {
      id: 'bureau-guide', name: 'Бюро · Полезная карусель', example: 'Что изменилось во французской бюрократии?',
      category: 'bureau', categoryName: 'Бюро', exportPrefix: 'sarafan-bureau-guide', node: '381-9177',
      summary: '2 обложки · 6 внутренних слайдов', defaultView: 'grid', previewIndices: [0, 2, 6],
      formats: [['all', 'Все варианты (8)'], ['cover', 'Обложки (2)'], ['text', 'Полезные слайды (4)'], ['accent', 'Важный нюанс (1)'], ['finale', 'Итог (1)']],
      groups: [['cover', 'Обложки'], ['text', 'Полезные слайды'], ['accent', 'Важный нюанс'], ['finale', 'Итог']],
      labels: ['Обложка · Кремовые овалы', 'Обложка · Цветные контуры', 'Что изменилось', 'Кого касается', 'Что делать', 'Документы и сроки', 'Важный нюанс', 'Итог и сохранение']
    },
    {
      id: 'ads-retreat', name: 'Рекламная карусель', example: 'Marrakech Girls Retreat · Galli × Oulena',
      category: 'ads', categoryName: 'Реклама', exportPrefix: 'sarafan-ads-retreat', node: '381-9064',
      defaultView: 'grid', previewIndices: [0, 3, 8],
      labels: ['Обложка · Marrakech Girls Retreat', 'Йога в пустыне Агафай', 'Хаммам и массаж', 'Сад Мажорель и музей Yves Saint Laurent', 'Верблюды и квадроциклы', 'Медина и La Terrasse des Épices', 'Ужины и lounge', 'Бранч у бассейна', 'Стоимость и запись']
    },
    {
      id: 'club-event', name: 'Афиша мероприятия клуба', example: 'Сарафан Салон · шесть событий',
      category: 'club', categoryName: 'Клуб', exportPrefix: 'sarafan-club-event', node: '373-5883',
      defaultView: 'grid', previewIndices: [0, 1, 4],
      labels: ['Ниночка · Кинопоказ', 'Дегустация грузинских вин', 'Вечеринка-открытие Салона', 'Король белых вин', 'Концерт EDVA', 'Воркшоп по бумажному коллажу']
    },
    {
      id: 'proust', name: 'Жизнь замечательных людей', example: 'Марсель Пруст',
      category: 'journal', categoryName: 'Журнал', exportPrefix: 'sarafan-proust', node: '287-45',
      labels: ['Мадленка, постель и Париж', 'Парижская жизнь', 'Роман из постели', 'Прустовская мадленка', 'Книга и мадленка', 'Места Пруста в Париже']
    },
    {
      id: 'places', name: 'Подборка мест', example: 'Грузия в Париже',
      category: 'journal', categoryName: 'Журнал', exportPrefix: 'sarafan-places', node: '329-733',
      summary: '3 обложки · 4 формата', defaultView: 'grid', previewIndices: [0, 5, 6],
      labels: ['Обложка · Хачапури', 'Обложка · Грузинский стол', 'Обложка · Хинкали', 'Горизонтальное фото · Tbilissi', 'Фото на весь слайд · Tbilissi', 'Овальное фото · Tbilissi', 'Без фото · Голубой', 'Без фото · Кремовый', 'Без фото · Розовый', 'Без фото · Оливковый', 'Без фото · Коричневый', 'Без фото · Оранжевый']
    },
    {
      id: 'event', name: 'Афиша события', example: 'Своя обложка или готовая афиша',
      category: 'journal', categoryName: 'Журнал', exportPrefix: 'sarafan-event', node: '351-6288',
      defaultView: 'grid', previewIndices: [0, 1, 2],
      formats: [['all', 'Все варианты'], ['cover', 'Своя обложка — 1 вариант'], ['container', 'Готовая афиша — 3 примера']],
      labels: ['Обложка · Фото', 'Готовая афиша · Концерт', 'Готовая афиша · Стендап', 'Готовая афиша · Розыгрыш']
    },
    {
      id: 'expert', name: 'Пост про эксперта', example: 'Катерина Штефан · коуч ICF / психолог',
      category: 'bureau', categoryName: 'Бюро', exportPrefix: 'sarafan-expert', node: '327-209',
      labels: ['Обложка эксперта', 'Вопросы к читателю', 'Стратегическая сессия', 'Обо мне', 'Контакты']
    }
  ];
  const references = [{
    id: 'club-salon', name: 'Салон — образец стиля', example: 'Вайб клуба и CoFo Cinema1909 · Образец стиля',
    category: 'club', categoryName: 'Клуб', kind: 'reference', source: 'reference-club-salon',
    exportPrefix: 'sarafan-club-salon', node: '373-5535',
    labels: ['Обложка и типографика', 'Приглашение на встречи', 'Партнёр и программа']
  }, {
    id: 'intro', name: 'Интро-пост', example: 'Знакомство с Сарафаном · Образец стиля',
    category: 'general', categoryName: 'Общие', kind: 'reference', source: 'reference-intro',
    exportPrefix: 'sarafan-intro', node: '344-3806',
    labels: ['Сарафан · Жизнь во Франции', 'Журнал · Открывать город', 'Бюро · Справляться с жизнью', 'Клуб · Находить своих', 'Сарафан Салон', 'Рекламная площадка', 'Становитесь частью сообщества']
  }, {
    id: 'transition', name: 'Переходный пост', example: 'Новая глава Сарафана · Образец стиля',
    category: 'general', categoryName: 'Общие', kind: 'reference', source: 'reference-transition',
    exportPrefix: 'sarafan-transition', node: '351-6288',
    description: 'История проекта и новая глава: крупная типографика, портреты и цветовые акценты.',
    labels: ["В Сарафане скоро всё изменится", "История проекта · Варя и Юля", "Юля · Новые направления", "Варя · Новая глава Сарафана", "Часть общей истории", "Спасибо, что вы с нами"]
  }];
  const entries = [...templates, ...references];
  const root = document.getElementById('sarafan-canvas');
  const catalog = document.getElementById('catalog');
  const list = document.getElementById('template-list');
  const viewer = document.getElementById('viewer');
  const cards = document.getElementById('viewer-cards');
  const presentation = root.querySelector('.presentation');
  const pagination = root.querySelector('.pagination');
  const previous = root.querySelector('.arrow--previous');
  const next = root.querySelector('.arrow--next');
  const views = [...root.querySelectorAll('.view-switch button')];
  const download = document.getElementById('download-slide');
  const carouselDownload = document.getElementById('download-carousel');
  root.querySelectorAll('[data-filter]').forEach(button => {
    button.querySelector('span').textContent = button.dataset.filter === 'all'
      ? entries.length
      : entries.filter(entry => entry.category === button.dataset.filter).length;
  });
  const variantPicker = document.getElementById('variant-picker');
  const variantFilter = document.getElementById('variant-filter');
  const placesFormats = [...variantFilter.children].map(option => option.cloneNode(true));
  const states = Object.fromEntries(entries.map(template => [template.id, { selected: 0, view: matchMedia('(max-width: 640px), (hover: none) and (max-width: 1000px)').matches ? 'carousel' : template.defaultView || 'carousel', filter: 'all' }]));
  let active = null;
  let mounted = null;
  let catalogScroll = 0;

  function scaleAll() {
    root.querySelectorAll('.preview-shell, .card-shell').forEach(shell => {
      if (shell.clientWidth > 0) shell.firstElementChild.style.setProperty('--card-scale', shell.clientWidth / 1080);
    });
  }

  for (const template of entries) {
    const entry = document.createElement('article');
    const isReference = template.kind === 'reference';
    entry.className = isReference ? 'template-entry reference-entry' : 'template-entry';
    entry.dataset.category = template.category;
    if (isReference) entry.dataset.reference = template.id;
    else entry.dataset.template = template.id;
    const link = document.createElement('a');
    link.className = 'template-link';
    link.href = '#' + template.id;
    link.setAttribute('aria-label', 'Открыть ' + (isReference ? 'образец' : 'шаблон') + ' «' + template.name + '»');
    const preview = document.createElement('div');
    preview.className = 'template-preview';
    if (template.canvas) {
      preview.style.setProperty('--card-aspect', template.canvas.width + ' / ' + template.canvas.height);
      preview.dataset.vertical = '';
    }
    preview.setAttribute('aria-hidden', 'true');
    const source = document.getElementById(template.source || 'template-' + template.id);
    const sourceCards = [...source.content.querySelectorAll('.ig-card')];
    (template.previewIndices || [0, 1, 2]).forEach(index => {
      const shell = document.createElement('div');
      shell.className = 'preview-shell';
      shell.append(sourceCards[index].cloneNode(true));
      preview.append(shell);
    });
    preview.dataset.count = preview.childElementCount;
    const info = document.createElement('div');
    info.className = 'template-info';
    info.innerHTML = '<div class="template-name-row"><h2></h2><span class="template-open" aria-hidden="true">↗</span></div>';
    info.querySelector('h2').textContent = template.name;
    link.append(preview, info);
    entry.append(link);
    list.append(entry);
  }

  root.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    root.querySelectorAll('[data-filter]').forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
    let visibleCount = 0;
    list.querySelectorAll('.template-entry').forEach(entry => {
      entry.hidden = button.dataset.filter !== 'all' && entry.dataset.category !== button.dataset.filter;
      if (!entry.hidden) visibleCount++;
    });
    document.getElementById('category-empty').hidden = visibleCount > 0;
    list.hidden = visibleCount === 0;
    scaleAll();
  }));

  function visibleIndices() {
    if (!active) return [];
    return [...cards.querySelectorAll('.card-unit')].map((unit, index) => ({unit, index})).filter(({unit}) => states[active.id].filter === 'all' || unit.dataset.variantGroup === states[active.id].filter).map(({index}) => index);
  }

  function render() {
    if (!active) return;
    const state = states[active.id];
    const indices = visibleIndices();
    if (!indices.includes(state.selected)) state.selected = indices[0];
    presentation.dataset.view = state.view;
    const units = [...cards.querySelectorAll('.card-unit')];
    units.forEach((unit, index) => {
      unit.hidden = !indices.includes(index) || (state.view === 'carousel' && index !== state.selected);
      unit.querySelector('.card-shell').hidden = unit.hidden;
    });
    cards.querySelectorAll('.card-group-heading').forEach(heading => {
      heading.hidden = state.view !== 'grid' || !units.some(unit => !unit.hidden && unit.dataset.variantGroup === heading.dataset.variantGroup);
    });
    pagination.querySelectorAll('button').forEach((button, index) => {
      button.hidden = !indices.includes(index);
      button.setAttribute('aria-current', String(index === state.selected));
    });
    if (state.view === 'carousel') {
      const current = pagination.children[state.selected];
      pagination.scrollLeft = current.offsetLeft - pagination.offsetLeft - (pagination.clientWidth - current.offsetWidth) / 2;
    }
    views.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === state.view)));
    previous.disabled = state.selected === indices[0];
    next.disabled = state.selected === indices.at(-1);
    document.getElementById('slide-caption').textContent = active.labels[state.selected];
    const number = String(state.selected + 1).padStart(2, '0');
    document.getElementById('slide-number').textContent = String(indices.indexOf(state.selected) + 1).padStart(2, '0') + ' / ' + String(indices.length).padStart(2, '0');
    download.href = 'exports/' + active.exportPrefix + '-' + number + '.png';
    download.download = active.exportPrefix + '-' + number + '.png';
    download.hidden = state.view === 'grid';
    carouselDownload.href = active.exportPrefix + '.zip';
    carouselDownload.download = active.exportPrefix + '.zip';
    carouselDownload.setAttribute('aria-label', 'Скачать всю карусель: ' + active.name + ' (' + active.labels.length + ' PNG)');
    variantFilter.value = state.filter;
    scaleAll();
  }

  function select(index) {
    if (!active) return;
    states[active.id].selected = Math.min(active.labels.length - 1, Math.max(0, index));
    render();
    history.replaceState(null, '', '#' + active.id + '/' + (states[active.id].selected + 1));
  }

  function move(offset) {
    if (!active) return;
    const indices = visibleIndices();
    const position = indices.indexOf(states[active.id].selected);
    select(indices[Math.min(indices.length - 1, Math.max(0, position + offset))]);
  }

  function route() {
    const previousActive = active;
    let match = location.hash.match(/^#([a-z-]+)(?:\/([1-9]\d*))?$/);
    const legacy = location.hash.match(/^#slide-([1-6])$/);
    if (legacy) match = [legacy[0], 'proust', legacy[1]];
    active = match ? entries.find(template => template.id === match[1]) : null;
    if (!previousActive && active) catalogScroll = window.scrollY;
    catalog.hidden = Boolean(active);
    viewer.hidden = !active;
    variantPicker.hidden = active?.id !== 'places' && !active?.formats;
    if (!active) {
      document.title = 'Сарафан — Каталог шаблонов';
      scaleAll();
      if (previousActive) window.scrollTo(0, catalogScroll);
      return;
    }
    if (mounted !== active.id) {
      cards.style.setProperty('--card-aspect', (active.canvas?.width || 1080) + ' / ' + (active.canvas?.height || 1350));
      cards.style.setProperty('--card-height', (active.canvas?.height || 1350) + 'px');
      variantFilter.replaceChildren(...(active.formats
        ? active.formats.map(([value, label]) => new Option(label, value))
        : placesFormats.map(option => option.cloneNode(true))));
      cards.replaceChildren(document.getElementById(active.source || 'template-' + active.id).content.cloneNode(true));
      cards.querySelectorAll('.card-unit').forEach((unit, index) => {
        const actions = document.createElement('div');
        actions.className = 'card-actions';
        const open = document.createElement('button');
        open.type = 'button';
        open.textContent = 'Открыть ↗';
        open.setAttribute('aria-label', 'Открыть: ' + active.labels[index]);
        open.addEventListener('click', () => {
          states[active.id].view = 'carousel';
          select(index);
          viewer.scrollIntoView({ block: 'start' });
        });
        const png = document.createElement('a');
        const filename = active.exportPrefix + '-' + String(index + 1).padStart(2, '0') + '.png';
        png.href = 'exports/' + filename;
        png.download = filename;
        png.textContent = 'PNG ↓';
        png.setAttribute('aria-label', 'Скачать PNG: ' + active.labels[index]);
        actions.append(open, png);
        unit.append(actions);
      });
      (active.groups || []).forEach(([value, label]) => {
        const firstUnit = [...cards.querySelectorAll('.card-unit')].find(unit => unit.dataset.variantGroup === value);
        if (!firstUnit) return;
        const heading = document.createElement('h2');
        heading.className = 'card-group-heading';
        heading.dataset.variantGroup = value;
        heading.textContent = label;
        heading.hidden = true;
        firstUnit.before(heading);
      });
      pagination.replaceChildren();
      active.labels.forEach((label, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('aria-label', 'Карточка ' + (index + 1) + '. ' + label);
        button.addEventListener('click', () => select(index));
        pagination.append(button);
      });
      mounted = active.id;
    }
    states[active.id].selected = Math.min(active.labels.length - 1, Number(match[2] || 1) - 1);
    states[active.id].filter = 'all';
    document.getElementById('viewer-title').textContent = active.name;
    presentation.setAttribute('aria-label', active.name + ' — ' + active.example);
    document.title = active.name + ' — Сарафан';
    render();
    if (previousActive?.id !== active.id) window.scrollTo(0, 0);
  }

  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  variantFilter.addEventListener('change', () => {
    if (!active) return;
    states[active.id].filter = variantFilter.value;
    select(visibleIndices()[0]);
  });
  views.forEach(button => button.addEventListener('click', () => {
    if (active) { states[active.id].view = button.dataset.view; render(); }
  }));
  document.addEventListener('keydown', event => {
    if (!active || states[active.id].view !== 'carousel' || event.altKey || event.ctrlKey || event.metaKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      if (event.key === 'Home') select(visibleIndices()[0]);
      else if (event.key === 'End') select(visibleIndices().at(-1));
      else move(event.key === 'ArrowRight' ? 1 : -1);
    }
  });
  let touchStart = null;
  cards.addEventListener('touchstart', event => {
    if (event.touches.length !== 1) { touchStart = null; return; }
    touchStart = { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY };
  }, { passive: true });
  cards.addEventListener('touchcancel', () => { touchStart = null; }, { passive: true });
  cards.addEventListener('touchend', event => {
    if (!touchStart || !active || states[active.id].view !== 'carousel') return;
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) move(dx < 0 ? 1 : -1);
    touchStart = null;
  }, { passive: true });
  window.addEventListener('hashchange', route);
  new ResizeObserver(scaleAll).observe(root);
  new ResizeObserver(scaleAll).observe(cards);
  document.fonts.ready.then(scaleAll);
  route();
})();
