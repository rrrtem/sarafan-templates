# Agent Access Implementation Plan

> **For agentic workers:** Use independent implementation tasks in this session, followed by code review. Steps use checkbox syntax for tracking.

**Goal:** Let an agent discover and download current site sources and design resources from a static deployment.

**Architecture:** Static Markdown and HTML discovery points lead to a generated file manifest and design tokens. A Python downloader preserves paths and verifies bytes without dependencies.

**Tech Stack:** Node.js standard library, Python 3 standard library, existing HTML/CSS/JS.

## Global Constraints

- Card dimensions remain 1080 × 1350 px.
- Paths resolve relative to the manifest directory, including deployments below a URL prefix.
- No external runtime packages are required for the new builder or downloader.
- Keep existing design and template behavior.
- Exclude `.git`, environment files and generated full ZIPs from the public file catalog.

## Task 1: Current resources and portable tokens

Files: `scripts/build-agent-resources.cjs`, `scripts/test-agent-resources.cjs`,
`agent-manifest.json`, `downloads/tokens.json`, `downloads/tokens.css`, `downloads/fonts.css`.

- [x] Add a failing integration check: manifest exists, contains each source dependency, and all size/SHA-256 values match real files.
- [x] Run `node scripts/test-agent-resources.cjs` and confirm the missing-feature failure.
- [x] Implement the standard-library builder; read `window.SARAFAN_DESIGN` through Node vm, extract existing font faces, list explicit public directories, and hash files.
- [x] Run `node scripts/build-agent-resources.cjs` and the integration check; run the builder twice and compare output bytes.

Contract: `schemaVersion: 1`, `base: "./"`, `files: [{path, mediaType, bytes, sha256}]`,
`archives` as separate records, and `templates` with source selectors/styles/docs.

## Task 2: Local download workflow

Files: `scripts/download-kit.py`, `scripts/test-download-kit.py`.

- [x] Write tests against an actual local HTTP server for download below a prefix, hash failure and path escape.
- [x] Confirm they fail before implementing the downloader.
- [x] Implement `python3 scripts/download-kit.py SITE_URL --dest DIRECTORY [--include PATH_OR_PREFIX]`.
- [x] Run `python3 scripts/test-download-kit.py`; check repeated downloads reuse matching files and changed files require explicit overwrite.

## Task 3: Discoverable documentation

Files: `AGENTS.md`, `llms.txt`, `docs/agent-guide.md`, `agents.html`, `README.md`,
`index.html`, `design-system.html`, `new-posts.html`, `catalog.css` if needed.

- [x] Add visible static links and `rel="describedby"` / Markdown alternatives to each main page.
- [x] Document source selection, fonts, styles, exact downloader commands and template-local paths.
- [x] Make the agent page fully readable with JavaScript disabled.

## Task 4: Integration and Git

- [x] Rebuild resources after all authored files settle.
- [x] Run Node and Python tests, validate HTTP file access, and inspect browser behavior.
- [x] Review the implementation with an independent agent; fix actionable findings.
- [x] Stage intended source files, verify the staged file list excludes full ZIPs, and commit.

## Verification evidence

- `node scripts/test-agent-resources.cjs`: 427 current files, 13 optional archives; hashes, HTML/CSS dependencies, template sources, post resources, tokens and fonts pass.
- `python3 scripts/test-download-kit.py`: 20 integration tests passed.
- Actual prefixed localhost deployment: downloaded all 427 files and independently checked size/SHA-256.
- Chromium: no-JavaScript discovery on three main pages, agent-page links HTTP 200, desktop/mobile layout, copied templates/design-system/11-card publication work locally without JS errors.
- Downloaded source kit rebuilds and passes its resource check; adding a third publication also passes.
- Manifest, tokens JSON/CSS and fonts CSS regenerate byte-for-byte identically.
- Independent code review approved after fixing omitted maintenance scripts, stylesheet dependency checks and a fixed post count.

The final manifest and full HTTP/browser check were rerun after concurrent Chichis publication updates; those edits were preserved.
