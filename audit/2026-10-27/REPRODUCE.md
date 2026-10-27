# Reproduce this audit

Use Node 24 and the repository's normal `npm test` and `npm run check`.

Browser scripts require an existing Playwright installation and a Chromium executable. They add no runtime dependencies to InvoiceFlow. Both host `dist` themselves on port 8742, so run them sequentially. All records are synthetic and stored in a new temporary browser context.

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs CHROMIUM_EXECUTABLE=/absolute/path/to/chromium node tests/browser-audit.mjs
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs CHROMIUM_EXECUTABLE=/absolute/path/to/chromium AXE_SOURCE=/absolute/path/to/axe-core/axe.min.js node tests/accessibility-audit.mjs
```

Optional: `BASELINE_DIST=/absolute/path/to/be32983/dist` enables actual baseline comparison screenshots in the browser script. `ARTIFACT_DIR` changes output location. The PDF text regression uses `pdftotext` when available, and explicitly skips text inspection when absent. The recorded run had it installed and did not skip.

These scripts are browser emulation, not physical Android acceptance. Accessibility results retain automated checks marked incomplete; zero detected violations is not WCAG certification.
