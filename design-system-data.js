/* Обновлять по реальным шаблонам; новые общие правила согласовывать с владельцем. */
window.SARAFAN_DESIGN = {
  layout: {
    columns: 6,
    rows: 6,
    margin: 65,
    gutter: 20,
    anchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right']
  },
  colors: [
    { id: 'cream', name: 'Кремовый', hex: '#FBEED2' },
    { id: 'brown', name: 'Коричневый', hex: '#553D3D' },
    { id: 'blue', name: 'Голубой', hex: '#A9C9DF' },
    { id: 'orange', name: 'Оранжевый', hex: '#FF3C00' },
    { id: 'pink', name: 'Розовый', hex: '#E19A9B' },
    { id: 'olive', name: 'Оливковый', hex: '#91945B' }
  ],
  additionalColors: [
    { id: 'slate', name: 'Серо-синий', hex: '#606D82' },
    { id: 'sand', name: 'Песочный', hex: '#E4D5B6' },
    { id: 'forest', name: 'Тёмно-зелёный', hex: '#014B3E' },
    { id: 'plum', name: 'Сливовый', hex: '#67436F' },
    { id: 'lemon', name: 'Лимонный', hex: '#E8D44D' },
    { id: 'terracotta', name: 'Терракотовый', hex: '#B54F1A' }
  ],
  combinations: [
    { id: 'blue', name: 'Голубой', background: '#A9C9DF', color: '#553D3D', accent: '#FF3C00' },
    { id: 'cream', name: 'Кремовый', background: '#FBEED2', color: '#553D3D', accent: '#91945B' },
    { id: 'pink', name: 'Розовый', background: '#E19A9B', color: '#553D3D', accent: '#FBEED2' },
    { id: 'olive', name: 'Оливковый', background: '#91945B', color: '#553D3D', accent: '#A9C9DF' },
    { id: 'brown', name: 'Коричневый', background: '#553D3D', color: '#FBEED2', accent: '#FF3C00' },
    { id: 'orange', name: 'Оранжевый', background: '#FF3C00', color: '#FBEED2', accent: '#553D3D' }
  ],
  typography: [
    {
      id: 'club', name: 'Клуб · Салон', styles: [
        { name: 'Обложка Салона', family: 'CoFo Cinema 1909', weight: 400, size: 200, line: 0.86, sample: 'Салон', source: 'Салон · образец стиля', href: 'index.html#club-salon/1' },
        { name: 'Заголовок афиши', family: 'CoFo Cinema 1909', weight: 400, size: 110, line: 0.86, sample: 'КОНЦЕРТ ГРУППЫ EDVA', source: 'Клуб · афиша мероприятия', href: 'index.html#club-event/5' },
        { name: 'Дата', family: 'CoFo Cinema 1909', weight: 400, size: 120, line: 0.86, sample: '7/11', source: 'Клуб · дата события', href: 'index.html#club-event/5' },
        { name: 'Описание события', family: 'EB Garamond', weight: 400, size: 40, line: 1, sample: 'Каждый вечер — повод выйти из дома.', source: 'Клуб · текст афиши', href: 'index.html#club-event/1' }
      ]
    },
    {
      id: 'headings', name: 'Заголовки', styles: [
        { name: 'Гротеск', family: 'Geist', weight: 600, size: 80, line: 1, sample: 'Открывать город', source: 'Места · обложка и фото', href: 'index.html#places/4' },
        { name: 'С засечками', family: 'EB Garamond', weight: 600, size: 80, line: 1, sample: 'Места в Париже', source: 'Места · название без фото', href: 'index.html#places/7' },
        { name: 'Рубрика курсивом', family: 'EB Garamond', weight: 500, style: 'italic', size: 100, line: 0.86, tracking: 2, sample: 'Журнал', source: 'Интро · название рубрики', href: 'index.html#intro/2' }
      ]
    },
    {
      id: 'body', name: 'Текст и выделения', styles: [
        { name: 'Крупный', family: 'Geist', weight: 400, size: 90, line: 1, runs: [{ text: 'Почувствовать ' }, { text: 'себя как дома', tag: 'em', family: 'EB Garamond', weight: 500, style: 'italic', color: '#FF3C00' }], source: 'Места · курсив и цветовой акцент', href: 'index.html#places/7' },
        { name: 'Основной', family: 'EB Garamond', weight: 400, size: 55, line: 1.1, runs: [{ text: 'Рассказываем истории, ' }, { text: 'которые хочется передать дальше.', tag: 'strong', weight: 700 }], source: 'Пруст · жирное выделение', href: 'index.html#proust/2' },
        { name: 'Компактный', family: 'Geist', weight: 400, size: 40, line: 1.1, sample: 'Помогаю разобраться в сложных вопросах и найти свой следующий шаг.', source: 'Эксперт · текст «Обо мне»', href: 'index.html#expert/4' }
      ]
    },
    {
      id: 'captions', name: 'Подписи', styles: [
        { name: 'Адрес', family: 'Geist', weight: 400, size: 35, line: 1.1, sample: 'Париж · адрес места', source: 'Места · адрес', href: 'index.html#places/4' },
        { name: 'Подпись', family: 'Geist', weight: 400, size: 25, line: 1.1, sample: 'Имя Фамилия · @контакт', source: 'Эксперт · нижняя подпись', href: 'index.html#expert/4' },
        { name: 'Примечание', family: 'EB Garamond', weight: 500, style: 'italic', size: 40, line: 1.1, sample: 'Кстати, в черновиках вместо мадленки был обычный поджаренный хлеб.', source: 'Пруст · примечание', href: 'index.html#proust/4' }
      ]
    }
  ],
  wordmarks: [
    {id:'sarafan-wordmark-orange',name:'Сарафан'},
    {id:'sarafan-wordmark-since',name:'С depuis 2021'}
  ],
  symbols: [
    {id:'rooster-orange',name:'Петух',use:'Общий символ'},
    {id:'bureau-orange',name:'Кольца',use:'Бюро'},
    {id:'club-horse',name:'Конь',use:'Клуб'},
    {id:'sirin',name:'Сирин',use:'Назначение открыто'}
  ],
  ribbons: [
    {name:'Журнал',orientation:'vertical',options:[{id:'ribbon-journal-vertical',color:'orange',name:'Красная'}]},
    {name:'Бюро',orientation:'horizontal',options:[{id:'ribbon-bureau-blue',color:'blue',name:'Синяя'},{id:'ribbon-bureau-horizontal',color:'cream',name:'Бежевая'}]},
    {name:'Клуб',orientation:'horizontal',use:'На вылет',options:[{id:'ribbon-club-green',color:'olive',name:'Зелёная'},{id:'ribbon-club-horizontal',color:'cream',name:'Бежевая'}]}
  ],
  elements: [
    {id:'ribbon-action-labelled',name:'Плашка действия'},
    {id:'expert-rule',name:'Пунктирная линия',tone:'dark'},
    {id:'expert-mask',name:'Эллипс · маска',tone:'dark'},
    {id:'expert-ovals',name:'Контурные овалы',tone:'dark'},
    {id:'journal-bookmark',name:'Закладка'}
  ],
  specimens: [
    {name:'Крупный текст и курсив',image:'exports/sarafan-places-07.png',href:'index.html#places/7',
      styles:[{name:'Фраза',family:'Geist',weight:400,size:90,line:1},{name:'Акцент',family:'EB Garamond',weight:500,style:'italic',size:90,line:1},{name:'Название',family:'EB Garamond',weight:600,size:80,line:1}],use:'Журнал · текстовая карточка'},
    {name:'Рубрика',image:'exports/sarafan-intro-02.png',href:'index.html#intro/2',
      styles:[{name:'Рубрика',family:'EB Garamond',weight:500,style:'italic',size:100,line:.86,tracking:2},{name:'Основной текст',family:'EB Garamond',weight:500,size:60,line:.95},{name:'Действие',family:'Geist',weight:400,size:50,line:1.01,tracking:-1.5}],use:'Журнал · образец стиля'},
    {name:'Заголовок и адрес',image:'exports/sarafan-places-04.png',href:'index.html#places/4',
      styles:[{name:'Название',family:'Geist',weight:600,size:80,line:1},{name:'Адрес',family:'Geist',weight:400,size:35,line:1.1},{name:'Описание',family:'EB Garamond',weight:400,size:55,line:1.1}],use:'Журнал · подборка мест'},
    {name:'Основной текст',image:'exports/sarafan-proust-02.png',href:'index.html#proust/2',
      styles:[{name:'Рассказ',family:'EB Garamond',weight:400,size:55,line:1.1},{name:'Выделение',family:'EB Garamond',weight:700,size:55,line:1.1}],use:'Журнал · история'},
    {name:'Афиша',image:'exports/sarafan-club-event-05.png',href:'index.html#club-event/5',
      styles:[{name:'Название',family:'CoFo Cinema 1909',weight:400,size:110,line:.86},{name:'Дата',family:'CoFo Cinema 1909',weight:400,size:120,line:.86},{name:'Описание',family:'EB Garamond',weight:400,size:40,line:1}],use:'Клуб · Салон'},
    {name:'Компактный текст',image:'exports/sarafan-expert-04.png',href:'index.html#expert/4',
      styles:[{name:'Цитата',family:'Geist',weight:500,size:80,line:1},{name:'Текст',family:'Geist',weight:400,size:40,line:1.1},{name:'Подпись',family:'Geist',weight:400,size:25,line:1.1}],use:'Реклама · эксперт'},
    {name:'Заголовок Бюро',image:'exports/sarafan-bureau-guide-01.png',href:'index.html#bureau-guide/1',
      styles:[{name:'Заголовок',family:'Geist',weight:500,size:80,line:.92},{name:'Описание',family:'Geist',weight:300,size:40,line:1.1}],use:'Бюро · обложка'},
    {name:'Курсивное примечание',image:'exports/sarafan-proust-04.png',href:'index.html#proust/4',
      styles:[{name:'Крупный текст',family:'EB Garamond',weight:400,size:80,line:1.1},{name:'Примечание',family:'EB Garamond',weight:500,style:'italic',size:40,line:1.1}],use:'Журнал · примечание'},
    {name:'Салон',image:'exports/sarafan-club-salon-01.png',href:'index.html#club-salon/1',
      styles:[{name:'Обложка и даты',family:'CoFo Cinema 1909',weight:400,size:200,line:.86},{name:'Программа',family:'Geist',weight:400,size:45,line:1}],use:'Клуб · недельная обложка'}
  ]
};
