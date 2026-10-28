# Сарафан — локальный набор дизайн-ассетов

Источник — существующая библиотека HTML-шаблонов SARAFAN и локальные assets/.
Новые знаки, иллюстрации и шрифты не создавались и из сети не загружались.

## Происхождение

- bureau-orange: assets/expert-about-logo.svg; bureau-cream: assets/expert-contact-logo.svg.
- journal-bookmark: assets/intro-2-rectangle72.svg.
- heart-orange / heart-cream: 11 исходных фрагментов intro-1-group*.svg / intro-7-group*.svg;
  координаты взяты из index.html (.intro-logo-piece), родительский масштаб — intro.css (.intro-original).
  Выполнен только общий crop. Форма каждого фрагмента сохранена.
- club: assets/intro-4910-logo.png; salon: assets/intro-3826-logo.png — только исходный PNG.
- sarafan-wordmark-orange, если присутствует: реальные контуры EB Garamond Medium 500,
  слово «Сарафан» из intro, кегль 140 px; HarfBuzz + fontTools. Шрифт не имитирован.
- ribbon-journal / ribbon-bureau / ribbon-action: sarafan-ribbon.svg / expert-ribbon.svg / intro-2-vector.svg.
- expert-ovals / expert-mask / expert-rule: expert-cover-ovals.svg / expert-cover-mask.svg / expert-about-rule.svg.

## Форматы

Для векторных знаков исходный SVG, прозрачный PNG с размером 4× от intrinsic,
векторный PDF со страницей по bounds (1 px = 0.75 pt). В PDF исходные белые геометрические
SVG-маски экспортируются как эквивалентные векторные clipping paths; SVG не меняется.
PNG-only знаки не являются векторными: SVG/PDF для них не создаются.
Кремовые элементы рассчитаны на контрастный фон и могут быть почти незаметны на белом.

Шрифты копируются без модификации. Включены только существующие TTF/OTF и имеющийся
expert-geist-OFL.txt. Geist Medium не включается, если его файла нет в assets/.
Права и лицензия на CoFo Cinema 1909 данным проектом не установлены.
Наличие файла CoFo в наборе не является предоставлением права использования или распространения.
Для остальных файлов включены только уже имеющиеся сведения; новые лицензии не назначались.

Палитра: cream #FBEED2, brown #553D3D, blue #A9C9DF, orange #FF3C00, pink #E19A9B, olive #91945B.
Дополнительные цвета кругов из исходных макетов: slate #606D82, sand #E4D5B6, forest #014B3E, dusty-rose #C98384, terracotta #B54F1A.
На каждой недельной обложке восемь разных цветов кругов; фон всегда #FBEED2.
Пути manifest.json и manifest.js указаны относительно корня исходного проекта.
Для file:// используется window.SARAFAN_ASSETS из manifest.js, fetch не нужен.
Поля svgText и pngBase64 содержат точные байты SVG/PNG для скачивания через Blob,
поскольку Chromium может открывать прямые file:// SVG/PNG вместо сохранения файла.

## Повторная сборка

В исходном проекте: node scripts/build-design-assets.cjs
Нужны локальные sharp, playwright (Chromium), pdf-lib, jszip.
Если они не в обычном node_modules, задайте SARAFAN_NODE_MODULES.
Для необязательного контурного словесного знака нужны hb-shape и python3 с fontTools;
при их отсутствии он исключается. SARAFAN_PYTHON позволяет выбрать Python.
Сборка работает офлайн и не получает зависимости из сети.
