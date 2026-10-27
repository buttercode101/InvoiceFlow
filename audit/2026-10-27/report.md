# InvoiceFlow ZA — full-product audit progress and verified repair

27 October 2026. Verdict: **NOT YET VERIFIED READY**. This report covers a meaningful local engineering/QA pass, not certification of the whole product or physical Android release.

Mission: help South African small businesses prepare quotes, issue accurate invoices, record receipts/expenses and preserve their records, proven by the actual quote→invoice→partial-payment→PDF journey and returning-user persistence.

## A. Product audit

Source: `buttercode101/InvoiceFlow`, default branch `main`, baseline `be32983ef025ec829fdb5ee7b25f2a8e901d5b5d`. The original local Sites checkout was stale (`38ee590`); it was preserved. Work uses a separate worktree and branch `audit/product-engine-20261027` fetched from actual GitHub main.

Actual architecture: static ES modules in `dist`, Node 24 tests, no runtime npm dependencies, IndexedDB `invoiceflow/workspaces`, five business keys and an isolated demo. No server API/database/auth/accounts/payment processor exists. Payments are user-recorded receipts; checkout links and sharing hand off to other apps. No funds move. Vercel serves `dist`, with CSP and response security headers. Service worker caches local assets. Android wrapper/release gates exist, but physical acceptance remains false.

Confirmed issues and corrections:

| ID | Severity | Reproduction and actual failure | Root cause and correction | Retest |
| --- | --- | --- | --- | --- |
| IF-01 | P2 | Restore a quote numbered `QTE-0NaN`; accepted | Numeric `NaN` bypassed `<`/`>=` comparisons and matched padded canonical string. Require safe integer. | Dedicated restored-backup regression passes. |
| IF-02 | P1 | Add `kind:'credit'` and a forged `creditBreakdown` to a stored invoice; an R8,500 line was accepted as a one-cent total. | Transient PDF/export metadata was trusted by stored-record validation. Reject export-only metadata on persisted invoices/quotes. | Direct baseline reproduction and restored-backup rejection test. |
| IF-03 | P2 | Quote editor calls proposed work completed work and instructs sharing an invoice | Shared editor had invoice-specific strings. Added quote-specific subtitle, work label, review hint and leave confirmation. | Real quote journey and before/after editor screenshots. |
| IF-04 | P2 | At 320px Collections/Expenses labels overlap adjacent targets | Fixed minimum navigation widths were smaller than text; flex shrink compounded it. Use intrinsic width, no shrink, padding and spacing; scroll active target into view. | Browser target/active visibility checks and rendered screenshots. |
| IF-05 | P2 | Overview/Reports helper copy has 4.43:1 text contrast | Shared muted text token too light on soft-card background. Darkened light-theme token `#66736c`→`#5e6c64`. | Axe before/after, all nine routes; representative dark checks. |
| IF-06 | P2 | Wide tables hide amount/status columns on mobile without guidance | Overflow container had no keyboard target or explanation. Add visible sideways-scroll hint and labelled, focusable region only when actual overflow exists. | Actual ArrowRight scroll and screenshot inspection. |

The suspected credit-PDF rounding bug was disproved: core `breakdown` already honors cumulative `creditBreakdown`. No PDF change was retained. Added a rendered-PDF text regression proving the 4-cent/2-cent allocation prints VAT1 cent correctly. This is regression coverage, not a claimed repair.

## B. Feature verification matrix

`feature-matrix.json` distinguishes source/unit evidence, actual browser execution, and missing evidence. Critical executed local journey: business setup→customer→quote→manual share→manual acceptance→convert→issue→partial payment→PDF; expense save→reload→backup; offline reload→existing invoice. Ninety route×viewport combinations had no document horizontal overflow. Tables intentionally scroll inside their containers.

## C. Issue register

The table above is the confirmed register. Original data-validation failures are retained in `baseline-failures.json`; actual baseline contrast findings are in `accessibility-before.json`. Each corrected issue has a dedicated regression or recorded browser check. Existing unknowns are not labelled defects. No destructive tests, charges, data resets, notifications or real customer data were used.

## D. Implementation

Changed `dist/core.js` (stored-data validation), `dist/app.js` (quote copy, overflow enhancement), `dist/style.css` (navigation/contrast/scroll affordance), `dist/sw.js` (cache identity bumped so offline clients can receive changed assets). Added targeted regressions plus reproducible browser/accessibility audit scripts. No schema migration, runtime package, cloud service, paid dependency, product pivot or persistent-data transformation.

## E. Visual evidence

Actual baseline/current screenshots: `overview-before-320.png`, `overview-320.png`, `quote-editor-before-390.png`, `quote-editor-after-390.png`. Representative route screenshots at 320, 768 and 1440px are included (27 route views), alongside the browser trace. The 320px overview confirms intrinsic navigation labels; table hints identify hidden columns.

Initial diagnostic screenshots showed a broken SVG because the temporary HTTP server used the wrong MIME type; the server was corrected and screenshots recaptured. This was a test-harness defect, not an app fix. Screenshots use reduced-motion to capture stable rendered states rather than transient fade opacity.

## F. End-to-end evidence

- Baseline: 64/64 existing Node tests and syntax passed, despite IF-01/02.
- Current: 67/67 Node tests pass, no skips in the recorded environment; JUnit XML and text logs retained. Three added tests cover malformed quote restore, export-only metadata restore and rendered credit-PDF tax allocation.
- Actual Chromium browser, synthetic records, local HTTP: business/customer/quote/invoice/payment/PDF/expense/backup/persistence/offline journeys pass. `browser-results.json` records actual result; `browser-trace.zip` contains screenshots/snapshots/source.
- Viewports: 320×568, 360×800, 375×812, 390×844, 430×932, 768×1024, 1024×768, 1280×800, 1440×900, 1920×1080. Nine main routes checked at each. No page errors recorded.
- Axe checks: nine light-theme routes, three representative dark routes; WCAG 2/2.1/2.2 A/AA tags. Recorded incomplete automated checks remain disclosed. Keyboard modal focus reaches customer-name; Escape dismisses modal. Reduced-motion produces animation-name `none`. These are specific checks, not full screen-reader certification.
- `performance-local.json` records unthrottled navigation/resource timings. It is not field Core Web Vitals or real low-end phone performance. No performance changes were made without measurements.

## G. Production release

Vercel inspection: project `prj_IjqaJaBhwLyVx2FimRRR1WIX2u5d`, production deployment `dpl_6YHej1VSp9eQcLzRgyyM6vD3FQJS`, READY, main `be32983ef025ec829fdb5ee7b25f2a8e901d5b5d`, canonical `https://invoiceflow-za.vercel.app`. This establishes deployment identity, not journey correctness. No production publication of these changes is claimed. Parent reviewer reported automatic approval rejection for publishing source/history remotely; no connector bypass attempted. Final release must re-check branch head, review patch, deploy/merge only within permitted authorization, then run actual production smoke tests. Prior deployment is available as a rollback candidate according to Vercel records. No migration rollback is needed for these local changes.

## H. Remaining work and phase coverage

**Verified complete locally:** confirmed fixes above, listed browser journey, targeted regressions, route/viewport coverage, screenshots/traces and representative automated accessibility checks.

**Implemented, production unverified:** all changes in this branch. No remote push, PR, merge or deployment performed in this agent's scope.

**Partial:** security review of CSP/input/backup/URL boundaries; accessibility and keyboard coverage; performance baseline; external research via official Xero/Sage/Zoho documentation. No authenticated competitor experiences were observed. Local-only architecture has no cross-user server authorization boundary to probe.

**Blocked/unavailable:** physical Android device/emulator, mobile keyboard/system text/device battery/CPU, signed Play release acceptance, current post-change production verification. Play release gates remain false; this pass must not change them to true.

**Not attempted in browser:** every repeated/interrupt/quota/concurrency edge on every feature; all expense attachments, encrypted-backup UI, restore confirmation/recovery UI, bank-match UI, recurring-schedule UI, reversal/credit-note UI, full statement export, every settings/theme combination, all modals at every viewport, manual screen reader and 200% browser zoom. Several of these have meaningful core/unit coverage, explicitly shown in the feature matrix, but that is not equivalent to real user end-to-end proof.

No claim of exhaustive defect discovery, zero bugs, full WCAG compliance, physical-device verification or production readiness is made.
