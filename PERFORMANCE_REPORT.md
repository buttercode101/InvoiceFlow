# Performance Report — InvoiceFlow

> **Historical document — superseded.** This report records the 2026-11-06 state, when `vitest` was not installed and `npm test` ran 67 domain tests. The UI suite now runs and the total is 135 domain tests plus 5 UI tests. See [RELEASE_2026-11-13.md](RELEASE_2026-11-13.md) and [DEFECT_REGISTER.md](DEFECT_REGISTER.md) for the current state. The original text is preserved unchanged for provenance.


Date: 2026-11-06 · Env: Termux, Node v26.3.1 (repo/CI: 24.x).

## Observed
- Live `https://invoiceflow-za.vercel.app/`: HTTP 200 in 0.80s (single curl, warm Vercel edge).
- `npm test` runtime: 6.2s (67 tests, node --test). `vitest run tests/ui` not run (vitest not installed).
- No Lighthouse run in this pass — no scores claimed.

## Targets (not yet measured)
- Lighthouse Performance 90+ / Accessibility 95+ / Best Practices 95+ / SEO 90+; INP ≤200ms; LCP ≤2.5s; CLS ≤0.1.
- Bundle size: `app.js` 89.5 KB, `core.js` 30.1 KB — observed sizes; minification verified by build pipeline.
- Service worker cold start: PARTIAL (needs HTTPS + first successful load).

## Notes
- Zero runtime deps → fast initial load by construction. No external scripts, no third-party trackers.
- CSV import size: UNVERIFIED (no load test with realistic file sizes).
- Export (PDF/CSV) performance: UNVERIFIED (no load test).