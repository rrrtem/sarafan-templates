# Expert Post Template Implementation Plan

**Goal:** Add the five original 1080 × 1350 expert cards from Figma page 327:209 to the existing Sarafan HTML catalog.

**Architecture:** Keep the existing static HTML/CSS/JavaScript viewer. Add scoped expert styles and a template block; register `expert` in the catalog. Preserve concurrent updates to the places template by editing shared files only through narrow replacements against their current content.

**Tech Stack:** HTML templates, CSS, vanilla JavaScript, local fonts/images, Playwright for rendering and interaction verification.

## Constraints

- Reproduce frames 327:259, 327:210, 327:221, 327:232, 327:249 in that order.
- Preserve source typography, colors #ff3c00 and #fbeed2, image layers, clipping, logos, and dotted footer rules.
- All source assets and fonts must be local. Do not use screenshots as card assets.
- Use the existing carousel, grid, keyboard navigation, category filters, and PNG links.
- Keep existing templates and pending places work intact.

## Tasks

- [x] Download Figma photo/vector assets and source reference screenshots; pin original Geist 1.6 with weights 300–600 for matching Cyrillic.
- [x] Add `expert.css` and five cards inside `template-expert`; use source node IDs to keep asset placements traceable.
- [x] Register `expert` under «Бюро», add category filter, support `#expert/1…5`, and calculate catalog totals from metadata.
- [x] Verify expert filtering, carousel and deep links, five-card grid, local assets, responsive sizes, and absence of JavaScript errors in Playwright.
- [x] Export `sarafan-expert-01…05.png`, compare rendered cards with Figma, update README and the source ZIP, and open the finished template.

## Verification

Run `/private/tmp/sarafan-expert-verify.cjs` against the existing server on 127.0.0.1:4173. Inspect source-vs-render comparison images. Verify all five exports are 1080 × 1350, all image files are nonempty, SVGs retain their root dimensions, and ZIP contains the expert HTML, CSS, fonts, assets, and PNGs.
