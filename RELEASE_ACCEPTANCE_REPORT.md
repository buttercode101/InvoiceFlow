# Release Acceptance Report — InvoiceFlow

> **Historical document — superseded.** This report records the 2026-11-06 acceptance pass. Its open gaps — version drift (I-001), missing `.env.example` (I-002) and the unavailable vitest harness (I-003) — have since been closed, and the product version is now 0.4.8. See [RELEASE_2026-11-13.md](RELEASE_2026-11-13.md) and [DEFECT_REGISTER.md](DEFECT_REGISTER.md) for the current state. The original text is preserved unchanged for provenance.


Date: 2026-11-06 · Starting commit `7d8337f9b0235d72fd210800c1646eaa05bd3276`
Tested commit: `7d8337f` + partial fix set (documents only — no source changes due to vitest/env blockers) + 7 docs.

## Evidence ledger
| Claim | Evidence | Confidence | Last verified |
|---|---|---|---|
| 67/67 npm test scripts pass (MJS only) | `npm test` 2026-11-06 | PROVEN | 2026-11-06 |
| Live site 200 + SPA loads | curl against production | PROVEN | 2026-11-06 |
| Vercel commit equality | no Vercel API proof | UNVERIFIED | — |
| Version consistency | `0.3.1` vs `0.4.0` vs `v040` drift | DISPROVEN (by inspection) | 2026-11-06 |
| Live payment / financial calculations | not configured/tested | UNKNOWN | — |
| Physical-device recording | not accessible | BLOCKED | — |
| 11-viewport matrix | not run | NOT VERIFIED | — |
| Lighthouse targets | not run | UNVERIFIED | — |
| vitest installed / test:product | vitest not in env | BLOCKED | — |

## Scorecard
Core 15/20 · E2E 12/20 · UI/UX 11/15 · Responsive 5/10 · Arch/Data 8/10 · Security 7/10 · Perf 4/5 · A11y 4/5 · Ops 4/5 = **72/100**.

## Verdict: NOT READY (version drift, no env docs, vitest blocker, physical-device BLOCKED) / CONDITIONALLY READY for desktop SPA loop only
No P0/P1 defects confirmed. The 72/100 score reflects: 67/67 MJS test scripts pass; the gaps are all environment/documentation: version drift (I-001), `.env.example` missing (I-002), vitest not installed (I-003), physical-device BLOCKED, Vercel commit-equality (UNVERIFIED), AI pricing claims untested per §6.4.

## Deployment
Fix set would require: `.env.example` addition, `npm i vitest` (or document gap), version-strategy decision (0.3.1→0.4.0), branch protection PUT (mirror other products), and optionally a fresh `npm ci && npm run build` to sync `dist/` with `main`. No changes performed in this pass due to environment constraints. Production deploy is Vercel git-connected; no manual deploy performed.

## Outstanding
- Owner decision on vitest install (network permit) or accept MJS-only test gap.
- `.env.example` creation with safe defaults.
- Version numbering strategy decision.
- Branch protection enforcement.
- 11-viewport + physical-device passes.
- CSV formula injection test + VAT SARS-verified test.
- Physical Android handset access.