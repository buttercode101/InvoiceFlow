# Performance Report — InvoiceFlow

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