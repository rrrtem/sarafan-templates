# Calm header and complete carousel downloads

Goal: simplify the shared header, identify repository-managed posts as test examples,
and download every slide of a template or example in a single ZIP.

- [x] Use the supplied orange rooster in all four shared headers; reduce navigation
  type and use a quiet underline for the active page. Verify desktop and mobile.
- [x] Rename the public section to «Примеры постов» and explain its test purpose.
  Document that v1 content is added through repository commits, not the editor.
- [x] Test full template and post downloads in a real browser: ordered PNGs,
  valid ZIP CRCs, original dimensions, current cover/crop settings, error recovery.
- [x] Build static ZIPs with a standard-library Node helper, reusing that helper
  in the browser for edited posts. Static links must work when opened from disk.
- [x] Add PNG links for HTML example cards using their adjacent PNG exports.
- [x] Rebuild resources, run download-kit and mobile checks, inspect screenshots.

Constraints: preserve existing uncommitted work and card compositions; no packages
or external assets; all PNGs remain at their original canvas dimensions. ZIP
downloads always include all cards, independently of the active viewer filter.
