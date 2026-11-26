# Defect Register — InvoiceFlow

Date: 2026-11-13 · Starting commit `e286e93` · Phase 1–4 feature set, pre-release hardening pass.

## UI engineering & visual refinement pass — 2026-11-26

Independent, browser-rendered audit at 320–1920 px in light and dark, with new
harnesses `tests/harness/deep-audit.mjs` (empty state, WCAG contrast, touch
targets, long-content stress, runtime-error capture) and `shots.mjs` /
`tall-shots.mjs` (screenshot capture).

### U-001 — Dark-mode status pills, banner and chart series used light-only colours (P2, FIXED 2026-11-26)
- Evidence: `.pill.paid/.sent/.partial/.overdue/.void/.credited/.payment/.credit/.reversal/.followup`, `.demo-banner` and `.bar.expense` set literal light backgrounds (`#e7f2e5`, `#edf0f8`, `#fbe9e5`, `#eee`, `#fdf0cd`, `#c9d6c5`). In dark mode they rendered as bright light chips on the dark surface, inconsistent with `.pill.invoice`/`.pill`, which already used theme variables.
- Fix: added `:root[data-theme=dark]` overrides keeping the same hue family with dark surfaces and AA-contrast text.
- Verified: dark invoices/dashboard screenshots; contrast probe reports 0 issues in both themes.

### U-002 — `.logo-preview` referenced undefined custom properties (P3, FIXED)
- Evidence: `border:1px solid var(--line)` and `background:var(--paper)`, but `--line`/`--paper` are defined nowhere in `style.css`, so both declarations were invalid at computed-value time.
- Fix: `var(--border)` / `var(--soft)`.

### U-003 — Receipt/photo preview had a hard-coded light-only border (P3, FIXED)
- Evidence: inline `border:1px solid #e2e8f0` in the photo-capture dialog markup in `app.js`.
- Fix: `var(--border)`.

### U-004 — Interactive controls under the 44 px target (P3, FIXED)
- Evidence: deep-audit found 32 controls < 44 px at 1440 (base buttons 42 px, icon buttons 40×42, compact buttons 36 px, text links 30 px).
- Fix: base `button` 42→44 px, `.icon-btn` →44×44, `.btn.small`/`.filter` →40 px, `.link-button` →36 px; the invoice-line action grid columns were widened 40→44 px to match. Remaining compact desktop variants (36–40 px) exceed WCAG 2.2 AA §2.5.8 (24 px) and are 44 px on touch.
- Verified: under-44 controls 32 → 15; responsive sweep 0 overflow.

### U-005 — Ageing totals split 4+1 on wide screens (P3, FIXED)
- Evidence: the five ageing buckets rendered as four cards plus a lone card at 1440.
- Fix: `@media(min-width:1440px){.stats:has(> :nth-child(5)){grid-template-columns:repeat(5,minmax(0,1fr))}}`. A first attempt scoped at ≥1201 px clipped the currency figure at 1280 — caught by the responsive sweep and re-scoped to ≥1440.

### U-006 — `templates` route not covered by the visual harness (P3, FIXED)
- Evidence: the sidebar exposes a Templates page, but `PAGES` in `ui-audit.mjs` omitted it.
- Fix: added `templates` to `ui-audit.mjs` and `deep-audit.mjs`.

### U-007 — Service-worker cache key bumped for the changed assets (P3, FIXED)
- Evidence: `style.css` and `app.js` changed, but `sw.js` still precached under `invoiceflow-v049`, so returning clients would serve the old shell (see I-012).
- Fix: cache key `invoiceflow-v049` → `invoiceflow-v050`.

## Resolved in this pass (2026-11-13)

### I-007 — Clicks inside every dialog were silently ignored (P1, FIXED 2026-11-13)
- Evidence: `index.html` places `<dialog id="modal">` as a **sibling** of `<div id="app">`, but the delegated click handler was bound to `#app`. Any `data-*` button inside a dialog never reached it — the template line "Add line" / "Remove line" buttons did nothing, and the failure was invisible (no JS error). The pre-existing "remove line works" check passed only because it asserted a no-op.
- Fix: delegated handler moved to `document`, the single ancestor of both the page and its dialogs. The workspace test's mock DOM was updated to model `document.addEventListener`, which the real DOM has always provided.
- Verified: template add/remove line now change the row count 1→2→1; full UI audit 251 checks / 0 failures.

### I-008 — Opening a second dialog wiped the first (P1, FIXED 2026-11-13)
- Evidence: the reminder dialog opened empty (`dialog.innerHTML.length === 0`) after submitting the previous dialog. `<dialog>.close()` fires its `close` event **asynchronously**; clearing `modal.innerHTML` inside that handler ran *after* `textDialog()` had already populated the replacement dialog, erasing it.
- Fix: clear `modal.innerHTML` at the **start** of `modalForm()` instead of in the close handler. Each new dialog now begins from a clean slate regardless of when the old close event lands.
- Verified: reminder → message dialog renders the full text in a real browser.

### I-009 — Templates were unusable: `createTemplate is not defined` (P1, FIXED 2026-11-13)
- Evidence: browser console on saving a template. The template functions were added to `core.js` but never added to the `app.js` import list.
- Fix: import completed; template create/use/edit/delete verified end-to-end (18/18 browser checks).

### I-010 — Template "Use" inflated every price by 100× (P1, FIXED 2026-11-13)
- Evidence: using a template opened the editor with `price` = `350000.00` for a R3 500 line. The editor draft stores **human units** and multiplies by 100 on load; the template's stored cents were written straight into it.
- Fix: convert with `decimal()` when writing the draft. Verified the editor shows `3500.00` and the resulting invoice carries the correct amount.

### I-011 — Old backups failed validation after branding fields were added (P2, FIXED 2026-11-13)
- Evidence: `parseBackup` threw `Invalid logo…` on backups written before `logo`/`accent` existed. `s.business.logo !== null` is true for `undefined`, and the empty-business comparison used strict `JSON.stringify` equality.
- Fix: normalise with `s.business={...emptyState().business,...s.business}` and use loose `!= null` checks, so pre-branding backups validate and gain `null` defaults.

### I-012 — Service-worker cache key not bumped for new assets (P2, FIXED 2026-11-13)
- Evidence: a real browser kept serving the previous `core.js` from `invoiceflow-v048`, so fixes appeared not to work. `sw.js` precaches `./core.js` and `./app.js` under a name that only changed when someone remembered to change it.
- Fix: cache key bumped to `invoiceflow-v049`; `activate` already deletes every other `invoiceflow-*` cache. Verified the browser then served the new modules.

### I-004 — Second invoice creation crashed: `i.lines is undefined` (P1, FIXED 2026-11-13)
- Evidence: real-browser reproduction. `new-invoice` ran `route={page:'invoice',id:newId}; editLines=[]; clearDraft();` — `clearDraft()` executed *after* `route` was reassigned, so `draftKey()` (which reads the current route) deleted the draft keyed to the saved invoice id instead of the keyed-to-`undefined` draft being edited. The stale draft survived, was reloaded on the next "New invoice", and `pricingFields()` called `breakdown()` on it.
- Fix: `clearDraft()` now runs before `route` is reassigned. Independently, the guard in `pricingFields` was tightened from `i?` to `i?.lines?` so an empty draft cannot reach `breakdown()`.
- Verified: second, third, fourth and fifth invoice creations all succeed with zero JS errors (`tests/harness/stress-audit.mjs`).

### I-005 — Settings page threw `ReferenceError: when is not defined` after any encrypted backup (P1, FIXED 2026-11-13)
- Evidence: control audit stack `backupLabel@app.js:23:314 ← settingsPage ← renderPage ← render`. `backupLabel()` declared `const when` *inside* a `try` block but referenced it in the `return` *outside* that block, so the function threw whenever `state.lastBackupAt` was set — i.e. after any encrypted backup. Reachable from `new-invoice`, which redirects to Settings when the business name is empty.
- Fix: hoisted to `let when=''` before the `try`. Swept the whole codebase for the same `try{const …}` scoping pattern; this was the only offender.
- Verified: `#last-backup` now renders `Last backup: just now (13 Nov 2026)` instead of throwing.

### I-006 — Invoice document showed internal and redundant rows (P2, FIXED 2026-11-13)
- Evidence: rendered document read `Payments recorded R 0,00` and `Credit notes R 0,00` on every unpaid invoice, printed `Value excluding VAT` / `VAT 0%` to non-VAT businesses, and carried the internal note "Draft only — not yet issued." inside the customer-facing document.
- Fix: zero-value rows are now conditional; the VAT breakdown is suppressed for non-VAT businesses; the internal draft note was removed (the title already carries `· DRAFT`). Payment instructions now repeat the due date, matching standard invoice layout.
- Verified by rendering the document and reading it back.

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