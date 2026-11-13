# Defect Register — InvoiceFlow

Date: 2026-11-13 · Starting commit `e286e93` · Phase 1–4 feature set, pre-release hardening pass.

## Resolved in this pass

### I-001 — Version drift (P2, FIXED 2026-11-13)
- Evidence: `package.json: 0.4.0` vs README/`PRODUCT-DETAILS.md: 0.4.0` vs service-worker cache `invoiceflow-v048-phase4-20261112`. The cache key had been bumped for Phase 4 while the packaged version was not.
- Fix: aligned to **0.4.8** across `package.json`, `README.md`, `PRODUCT-DETAILS.md` and the service-worker cache key (`invoiceflow-v048`). Verified `package.json` parses and `npm run check` passes.

### I-002 — No `.env.example` (P2, FIXED)
- Evidence: file absent at the 2026-11-06 register; `.gitignore` carried an exception for it that nothing satisfied.
- Fix: `.env.example` is now committed and documents that the static app needs no variables, with reserved notes for future server-side features.

### I-003 — vitest not installed / test harness fragility (P3, FIXED)
- Evidence: `npm run test:ui` was not executable at the 2026-11-06 register.
- Fix: `vitest` is a dev dependency and `npm run test:ui` runs 3/3 UI tests; `npm test` now runs 135 domain tests plus those 3.

### V-001 — Cash chart overflowed its container at tablet width (P2, FIXED 2026-11-13)
- Evidence: real-browser measurement at 768 px showed `.cash-chart` scrollWidth 236 px against a 205 px client width, with `table`/`thead`/`tr` elements extending past the viewport. Cause: `.chart-group{flex:1}` had no `min-width:0` and `.bar` was fixed at `13px`, so the six month-groups could not shrink below their content size.
- Fix: `min-width:0` on `.chart-group`; `.bar` changed to `flex:1 1 0; max-width:13px; min-width:2px`. Verified by a 229-check responsive sweep across 11 pages and 10 viewport widths with zero overflow.

### V-002 — Visual verification was not repeatable (P3, FIXED 2026-11-13)
- Evidence: the browser audit existed only in a temporary scratch directory that is pruned after 24 hours, so no one else could re-run the verification.
- Fix: `tests/harness/browser-harness.mjs` and `tests/harness/ui-audit.mjs` added to the repository with `npm run test:visual` (live site) and `npm run test:visual:local` (serves `dist/` itself). The harness covers the responsive sweep, dark mode, the editor draft guard, the expense-photo dialog, detail views, accessibility naming and offline readiness.

## Accepted limitations (not defects)
- Local IndexedDB only — no cloud sync/account/auto-backup; README warns to export per-workspace backups.
- Offline/PWA limits: service worker needs HTTPS + first successful load; recurring drafts only generate while browser is open.
- VAT numbers format-checked only (`^4\d{9}$`), not SARS-verified; no tax advice.
- Android not Play-ready: unsigned if `ANDROID_UPLOAD_KEYSTORE_*` env unset; `minifyEnabled false`.
- CIPC reminder estimates the annual return at the end of the calendar year; the exact anniversary must be confirmed on the CIPC website.
- `src/lib/validation.js` was removed on 2026-11-13. It duplicated email validation already performed by `checkParty` in `dist/core.js` on every save, and its `sanitizeInput` was a naive angle-bracket strip that must never be used as an XSS defence. Production escaping is the `esc()` helper in `dist/app.js`. The vitest UI suite now tests the real `validateState` path instead.