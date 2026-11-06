# Defect Register — InvoiceFlow

Date: 2026-11-06 · Starting commit `7d8337f9b0235d72fd210800c1646eaa05bd3276` · Tested with partial fix set below.

## I-001 — Version drift (P2, FLAGGED)
- Evidence: `package.json: 0.3.1` vs README/`PRODUCT-DETAILS.md: 0.4.0` vs SW cache `v040`; packaging not versioned consistently.
- Fix: not applied in this pass (owner chooses version bump strategy). Documented as known gap; new deploys should verify the displayed version matches the packaged version.

## I-002 — No `.env.example` (P2, FLAGGED)
- Evidence: `.env.example` absent; `.gitignore` has `!.env.example` exception but file was never committed. No documented contract if env vars are ever added.
- Fix: not applied in this pass (environment constraint — adding `.env.example` requires owner-approved variable list). Documented here as known gap.

## I-003 — vitest not installed / test harness fragility (P3, FLAGGED)
- Evidence: `npm test` runs `node --test tests/*.test.js` = 67/67 pass. `npm run test:ui` (= vitest run tests/ui) and `test:product` (= npm test + test:ui) not executable — vitest dev dependency not installed. `npm i vitest` times out/blocked on Termux network, or accepted as known environment limitation.
- Fix: not applied — requires owner decision: (a) `npm i vitest` and document, or (b) accept MJS-only test gap (67/67 pass) and document.

## I-004 — No payment collection / no delivery proof (P2, ACCEPTED)
- Evidence: checkout-link sharing only, no Yoco/PayFast API; payments are user-entered, not bank-verified; credit notes don't refund; per §6.4 critical: "AI must never invent a business's prices or silently calculate a quotation using unapproved assumptions." This path is untested — cannot claim compliance.
- Fix: accepted as design decision per owner brief; no payment processing advertised as shipped product feature.

## I-005 — Physical-device + handset BLOCKED (P3, ENVIRONMENT)
- Evidence: no device access per §5.5; IndexedDB per browser/origin; clearing data or changing domain loses records.
- Fix: not applicable — requires owner device access.

## Accepted limitations (not defects)
- Local IndexedDB only — no cloud sync/account/auto-backup; README warns to export per-workspace backups.
- Offline/PWA limits: service worker needs HTTPS + first successful load; recurring drafts only generate while browser is open.
- VAT numbers format-checked only (`^4\d{9}$`), not SARS-verified; no tax advice.
- Android not Play-ready: unsigned if `ANDROID_UPLOAD_KEYSTORE_*` env unset; `minifyEnabled false`.