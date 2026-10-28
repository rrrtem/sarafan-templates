# Reels and live broadcast templates

**Goal:** Add the supplied Figma reels cover to Journal and a live broadcast template with both source variants to Bureau.

**Approved format:** 1080 × 1920, as confirmed by the user. Source page `385:10037`; broadcast frames `385:10038`, `385:10055`; reels frame `385:10072`.

**Architecture:** Existing static HTML templates and catalog registry. A shared `vertical.css` holds source geometry. Catalog entries carry optional canvas dimensions; previews and viewer shells inherit the matching aspect ratio. Existing cards keep 1080 × 1350. Manifest exposes canvas dimensions per template for portable export.

## Work

- [ ] Add an integration/export script exercising category filters, vertical shell proportions, existing card proportions, navigation, local images/fonts, text bounds and PNG dimensions. Run before implementation to confirm missing templates fail.
- [ ] Download original Figma photos, ribbons, mark and ellipse. Use each in its original slot; preserve editable text and blur effects in CSS.
- [ ] Add `reels-cover` (one card) and `bureau-live` (two variants) to `index.html` and `catalog.js`. Preserve original geometry and copy; bind Russian prepositions using `scripts/typography.cjs`.
- [ ] Support optional canvas dimensions in previews, viewer, print and agent manifest. Document the 9:16 exception and both template sources/dependencies.
- [ ] Export the three PNGs, inspect full renders and desktop/mobile previews, fix mismatches, run resource builder and required checks.

## Validation

`node scripts/export-vertical.cjs` verifies the real catalog at desktop and 390 px, existing 4:5 cards, both new templates, loaded fonts/images, clipping, direct links, downloads and three 1080 × 1920 PNG files. Inspect contact sheet and the source screenshots visually. Then run `node scripts/build-agent-resources.cjs`, `node scripts/test-agent-resources.cjs`, `python3 scripts/test-download-kit.py` and `node scripts/test-mobile.cjs`.

Work in the supplied directory to preserve the user's current uncommitted library additions. Do not commit or publish unrelated changes.
