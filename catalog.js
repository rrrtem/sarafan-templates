(() => {
  const templates = [
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
      defaultView: 'grid', previewIndices: [0, 2, 3],
      formats: [['all', 'Все варианты'], ['cover', 'Своя обложка — 2 варианта'], ['container', 'Готовая афиша — 3 примера']],
      labels: ['Обложка · Чистый фон', 'Обложка · Фото', 'Готовая афиша · Концерт', 'Готовая афиша · Стендап', 'Готовая афиша · Розыгрыш']
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
  root.querySelectorAll('[data-filter]').forEach(button => {
    button.querySelector('span').textContent = button.dataset.filter === 'all'
      ? entries.length
      : entries.filter(entry => entry.category === button.dataset.filter).length;
  });
  const variantPicker = document.getElementById('variant-picker');
  const variantFilter = document.getElementById('variant-filter');
  const placesFormats = [...variantFilter.children].map(option => option.cloneNode(true));
  const states = Object.fromEntries(entries.map(template => [template.id, { selected: 0, view: template.defaultView || 'carousel', filter: 'all' }]));
  let active = null;
  let mounted = null;

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
    preview.setAttribute('aria-hidden', 'true');
    const source = document.getElementById(template.source || 'template-' + template.id);
    const sourceCards = [...source.content.querySelectorAll('.ig-card')];
    (template.previewIndices || [0, 1, 2]).forEach(index => {
      const shell = document.createElement('div');
      shell.className = 'preview-shell';
      shell.append(sourceCards[index].cloneNode(true));
      preview.append(shell);
    });
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
    pagination.querySelectorAll('button').forEach((button, index) => {
      button.hidden = !indices.includes(index);
      button.setAttribute('aria-current', String(index === state.selected));
    });
    views.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === state.view)));
    previous.disabled = state.selected === indices[0];
    next.disabled = state.selected === indices.at(-1);
    document.getElementById('slide-caption').textContent = active.labels[state.selected];
    const number = String(state.selected + 1).padStart(2, '0');
    document.getElementById('slide-number').textContent = String(indices.indexOf(state.selected) + 1).padStart(2, '0') + ' / ' + String(indices.length).padStart(2, '0');
    download.href = 'exports/' + active.exportPrefix + '-' + number + '.png';
    download.download = active.exportPrefix + '-' + number + '.png';
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
    let match = location.hash.match(/^#([a-z-]+)(?:\/([1-9]\d*))?$/);
    const legacy = location.hash.match(/^#slide-([1-6])$/);
    if (legacy) match = [legacy[0], 'proust', legacy[1]];
    active = match ? entries.find(template => template.id === match[1]) : null;
    catalog.hidden = Boolean(active);
    viewer.hidden = !active;
    variantPicker.hidden = active?.id !== 'places' && !active?.formats;
    if (!active) {
      document.title = 'Сарафан — Каталог шаблонов';
      scaleAll();
      return;
    }
    if (mounted !== active.id) {
      variantFilter.replaceChildren(...(active.formats
        ? active.formats.map(([value, label]) => new Option(label, value))
        : placesFormats.map(option => option.cloneNode(true))));
      cards.replaceChildren(document.getElementById(active.source || 'template-' + active.id).content.cloneNode(true));
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
    touchStart = { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY };
  }, { passive: true });
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
