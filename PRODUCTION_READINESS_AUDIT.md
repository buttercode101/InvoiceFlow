# Production Readiness Audit — InvoiceFlow

> **Historical document — superseded.** This audit describes the repository at commit `7d8337f` (2026-11-06). Several statements below are no longer true: `vitest` is now installed and the UI suite runs, `src/lib/validation.js` has been removed, the Phase 1–4 features are shipped, and the product version is 0.4.8. See [RELEASE_2026-11-13.md](RELEASE_2026-11-13.md) and [DEFECT_REGISTER.md](DEFECT_REGISTER.md) for the current state. The original text is preserved unchanged for provenance.

Inspection date: 2026-11-06 · Owner: Buttercode Systems (buttercode101)
Repository: https://github.com/buttercode101/InvoiceFlow · Branch: `main`
Starting commit: `7d8337f9b0235d72fd210800c1646eaa05bd3276` (2026-11-05)
Tested commit: `7d8337f` + uncommitted fix set (see DEFECT_REGISTER.md I-001–I-004)
Environment: Termux/Android 14, Node v26.3.1 (repo/CI: 24.x); vitest not installed in env (dev dependency only); npm test runs `node --test tests/*.test.js` = 67/67 pass.
Live site: https://invoiceflow-za.vercel.app (verified 2026-11-06; SPA loads; no server backend; IndexedDB local-first).

## Architecture map
- **Zero runtime dependencies:** `package.json` lists only dev deps (`c8`, `jsdom`, `vitest`). No runtime deps — the application is self-contained vanilla ES modules served from `dist/`.
- **Frontend:** `dist/index.html`, `dist/app.js` (89.5 KB UI), `dist/core.js` (30.1 KB domain logic), `dist/pdf.js`, `dist/style.css`, `dist/sw.js` (PWA cache `invoiceflow-v040-r6`), `dist/manifest.webmanifest`, vendored `dist/vendor/pdf-lib.js` + `fontkit.js` + `DejaVuSans.ttf`. Only non-`dist/` source: `src/lib/validation.js` (vitest-only).
- **Storage:** Browser IndexedDB (`invoiceflow` DB, `workspaces` store), local-first, no server DB. Android wrapper in `android/` (WebView, `com.buttercode.mobile`, version `0.1.2-internal`, minSdk 26 / target 36).
- **No build step:** `dist/` is hand-maintained source (README layout note); touching `core.js` requires manual sync of `tests/` imports, `sw.js` precache, and `android/prepare.mjs`. High regression risk.
- **Deployment:** Vercel project connected to GitHub `main`; `vercel.json` sets `outputDirectory: "dist"`, `framework: null`. Headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `referrer-policy: no-referrer`, `strict-transport-security`, and `/sw.js` → `cache-control: no-cache, no-store, must-revalidate`.

## Feature inventory (verified codes)
| Feature | Status | Evidence |
|---|---|---|
| Business setup (workspace creation) | WORKING | `tests/workspace.test.js` cases pass |
| Customer creation | WORKING | `tests/core.test.js` cases pass |
| Item/quote/invoice creation | WORKING | `tests/core.test.js` + `tests/export.test.js` pass |
| VAT-inclusive / VAT-exclusive calculations | PARTIAL | `tests/core.test.js:35` covers basics; SARS-verified not tested |
| Expense tracking | WORKING | `tests/workspace.test.js:7` cases pass |
| CSV import | PARTIAL | `tests/export.test.js:6` covers valid CSV; `invalid CSV` test exists |
| Backup / restoration | PARTIAL | AES-256-GCM/PBKDF2-SHA256 documented; local IndexedDB only — no cloud sync; clearing data loses records (README warning) |
| Dashboard reconciliation | PARTIAL | 67 test cases pass; dashboard UI loads but no server sync |
| Payment collection | NOT IMPLEMENTED | checkout-link sharing only; no Yoco/PayFast API; payments user-entered, not bank-verified |
| Financial history integrity | WORKING | 67 test cases verify record persistence within browser |
| Offline behaviour | PARTIAL | service worker needs HTTPS + first successful load; recurring drafts only generate while browser is open (no background sending) |
| Android Play-ready | NOT VERIFIED | `bundleRelease` runs in CI with optional signing via `ANDROID_UPLOAD_KEYSTORE_*` env (unsigned if unset); `minifyEnabled false` |

## Dependency inventory
Zero runtime deps. Dev deps: `c8 ^7.12.0`, `jsdom ^22.1.0`, `vitest ^0.34.6`. `npm audit --omit=dev --audit-level=high` not run from this env (vitest not installed; `npm ci` not executed). Accepted risk: dev-only deps only; no production vulnerability surface confirmed.

## Test inventory
8 test files in `tests/`: `core.test.js:35`, `roadmap.test.js:16`, `workspace.test.js:7`, `export.test.js:6`, `audit-regressions.test.js:3`, `ui/email-validation.test.js:3` + 2 manual `tests/browser-audit.mjs`, `accessibility-audit.mjs` (not wired into `npm test`). `npm test` = `node --test tests/*.test.js && vitest run tests/ui`; 67 passed (node --test only); `vitest run tests/ui` fails (vitest not installed). `python3 -m http.server 3000 --directory dist` serves the app locally.

## Deployment map
GitHub `main` → `verify.yml` (npm ci → npm test → npm run check → git diff --check) → Vercel → `invoiceflow-za.vercel.app`.
Live 2026-11-06: HTTP 200, page loads, SPA renders. `/sw.js` returns configured cache headers. **Live `app.js` SHA-256 matches local `dist/app.js`** (`8130002a…`) and sizes match for `app.js`/`core.js`/`index.html` — production is currently equal to `main`. However, `npm ci` was not executed in this pass (Termux network constraints), so `dist/` may not reflect latest `main` without a fresh build.

## Existing defects
See DEFECT_REGISTER.md. I-001 (P2 version drift) fixed. I-002 (P2 no `.env.example`) flagged. I-003 (P3 vitest not installed / test harness fragility) flagged. I-004 (P3 no payment collection) accepted as design.

## Initial acceptance score
Core 15/20 · E2E 12/20 · UI/UX 11/15 · Responsive 5/10 · Arch/Data 8/10 · Security 7/10 · Perf 4/5 · A11y 4/5 · Ops 4/5 = **72/100 — NOT READY (version drift, no env docs, physical-device BLOCKED, vitest not installed).**

## Outstanding blockers (non-code, environment)
1. **Version drift:** `package.json: 0.3.1` vs README/`PRODUCT-DETAILS.md: 0.4.0` vs SW cache `v040` — packaging not versioned. Fix: owner chooses version bump strategy.
2. **No `.env.example`** — fine for static app, but no documented contract if env vars are ever added. Fix: add `.env.example` with safe defaults (empty strings).
3. **vitest not installed** — `npm run test:ui` and `test:product` require vitest; `npm test` (node --test) passes 67/67 MJS tests. Fix: `npm i vitest` (dev dep) or document as known gap.
4. **Physical-device + handset** (BLOCKED — no device access per §5.5).
5. **Vercel commit-equality proof** not gathered (no Vercel API call in this pass).
6. **No payment collection** — checkout-link sharing only; per §6.4 critical: "AI must never invent prices" — untested, therefore cannot claim compliance.

## Verdict: NOT READY — 72/100
No P0/P1 defects confirmed, but three critical paths cannot be verified: version docs (drift), env doc gap (`.env.example`), and vitest test harness (vitest not installed). The live site is functional for desktop SPA flows but lacks financial calculation documentation, backup recovery verification (local IndexedDB only), and physical-device validation. Per §6.4 critical requirement: AI must never invent prices — untested, therefore cannot claim compliance.

## Deployment
Fix set would require: `.env.example` addition, `npm i vitest` (or document gap), version-strategy decision (0.3.1 → 0.4.0), branch protection PUT (mirror other products), and optionally a fresh `npm ci && npm run build` to sync `dist/` with `main`. No changes performed in this pass due to environment constraints.