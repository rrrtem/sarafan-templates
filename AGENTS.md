# Working with SARAFAN templates

SARAFAN is a static HTML library for Russian social posts. The default card is **1080 × 1350 px**; `reels-cover` and `bureau-live` retain their original **1080 × 1920 px**. Use each template’s manifest `canvas` dimensions. No package installation is needed to use the library. The user's task and explicit choices take precedence over these project defaults.

## Start here

1. Read [the agent guide](docs/agent-guide.md) and [brand rules](docs/design-system.md).
2. Use [agent-manifest.json](agent-manifest.json) for the file catalog, SHA-256 hashes, template selectors, source CSS, documentation, and posts. Paths resolve relative to the manifest's `base` (`./`). Archives are listed separately.
3. Read only the relevant template documentation. Card markup is inside `<template>` elements in [index.html](index.html); locate it with the selector from the manifest. [catalog.js](catalog.js) contains the display registry. Intro, transition, and club-salon are style references.

## Reuse and authoring

- The «Пост про эксперта» template belongs to «Бюро». «Бюро» also includes useful editorial materials about everyday life in France: paperwork, administrative processes, work, and practical household questions. Advertising adaptations belong to «Реклама».
- Copy the selected `.ig-card` and its actual `styles`, local images, masks, and fonts. Preserve relative paths. CSS `url()` paths resolve from the stylesheet; HTML `src` paths resolve from the HTML file.
- Existing cards inherit `--paper`, `--ink`, `--blue`, and a `box-sizing` reset from `catalog.css`. Preserve those dependencies or load [downloads/tokens.css](downloads/tokens.css), which provides `--sarafan-` variables and legacy aliases, with a local reset. Tokens alone do not style a card.
- Use the selected template's type sizes, spacing, line breaks, palette, logos, and masks. Shorten copy or choose another layout when text overflows. Do not invent content or redraw supplied brand assets.
- In every new event poster, bind Russian prepositions to the next word with a nonbreaking space (U+00A0 / `&nbsp;`) in titles, subtitles and body text. Never leave a preposition at the end of a line; do not put a manual line break after one. Use `scripts/typography.cjs` for plain-text fields, preserve HTML markup, then check wrapping and regenerate PNG exports.
- Build new compositions on the 6 × 6 grid: 65 px outer margins, 20 px gutters, and four content-area corner anchors; preserve original templates' exact geometry. See [grid rules](docs/design-system.md#grid).
- In new templates, corner anchors guide composition and alignment; they do not require small running headers, footers, service labels, or slide numbers. Omit those elements. Cover branding is optional and must use an actual supplied asset, never a text imitation. Preserve such elements in original templates when reusing them.
- For «Гостиная» / «Сарафан Салон» event posters, color encodes the calendar date. Every event on the same date must use the same background and text palette. Assign colors per day, never independently per event or topic. Keep the week's date-to-color mapping in one shared configuration. Weekly covers keep the brand beige background `#FBEED2`.
- The ellipse image matte may be adapted per image for a clean visual fit (for example, white for the Dior embroidery photo). Set it through the publication’s `matte` field; the poster background and text still follow the date palette.
- Set `--card-scale: 1` for full-size export, render at the template’s `canvas` size (1080 × 1350 by default; 1080 × 1920 for reels and live broadcasts), and await `document.fonts.ready` and image loading before screenshots. Check actual font loading, overflow, images, and masks visually.
- All templates use one variable `Geist` family from `assets/expert-geist-v1.6.ttf`; preserve this pinned version. Inter is replaced by Geist. CoFo Cinema1909's presence does not grant a license; see [downloads/README.md](downloads/README.md).
- Create publications under `posts/<id>/` and register them in `new-posts-data.js` following [docs/new-posts.md](docs/new-posts.md). Make routine edits within the user's authorized scope. Preserve source templates when creating a publication unless the user requests template changes.

- Ribbon rules: «Журнал» is vertical and orange-red `#FF3C00`; «Бюро» is horizontal, blue `#A9C9DF` or beige `#FBEED2`; «Клуб» is horizontal and bleeds off the left edge, with a square left edge and an original-shaped right edge, in olive `#91945B` or beige `#FBEED2`. Keep each ribbon’s matching text color.

## Download and maintain

Use [scripts/download-kit.py](scripts/download-kit.py) with a deployed static directory URL to reproduce the local layout. It verifies manifest hashes, skips identical files, and refuses to replace different files unless `--overwrite` is supplied. `--include` selects a path or directory prefix; it does not automatically resolve dependencies.

After changing public files, run `node scripts/build-agent-resources.cjs`. Verify with `node scripts/test-agent-resources.cjs` and `python3 scripts/test-download-kit.py`. The agent-resource builder needs no external dependencies. Asset exports use a separate workflow described in [downloads/README.md](downloads/README.md).

Do not read `downloads/manifest.json` as initial context: it is the large curated asset-download registry with inline SVG/PNG data. Use it only when that download payload is needed. The old `sarafan-templates.zip` is stale and excluded from the current file catalog; use the current manifest and downloader for the full library.
