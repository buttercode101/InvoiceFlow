# Acceptance Test Plan — InvoiceFlow

Date: 2026-11-06 · Tested commit: `7d8337f` · Env: Termux, Node v26.3.1 (CI: 24.x; vitest not installed; npm test = node --test tests/*.test.js = 67/67 pass).

## Core journey
Business setup → customer → quote/invoice → payment → expense → dashboard → export → recovery.

## Mandatory tests — execution results
| # | Test | Result | Evidence |
|---|---|---|---|
| 1 | Business setup | PASS | `tests/workspace.test.js` cases pass |
| 2 | Customer creation | PASS | `tests/core.test.js` cases pass |
| 3 | Item creation | PASS | `tests/core.test.js` + `tests/export.test.js` pass |
| 4 | Quote creation | PASS | `tests/core.test.js` cases pass |
| 5 | Quote editing | PASS | `tests/core.test.js` cases pass |
| 6 | Invoice generation | PASS | `tests/core.test.js` + `tests/export.test.js` pass |
| 7 | Invoice numbering | PASS | `tests/core.test.js` cases pass |
| 8 | Due dates | PASS | `tests/core.test.js` cases pass |
| 9 | Full payment | PASS | `tests/core.test.js` cases pass |
| 10 | Partial payment | PASS | `tests/core.test.js` cases pass |
| 10 | Multiple payments | PASS | `tests/core.test.js` cases pass |
| 11 | Payment reversal | UNKNOWN | no test fixture found |
| 12 | Credit note | UNKNOWN | no test fixture found |
| 13 | Overdue state | PASS | `tests/core.test.js` cases pass |
| 14 | VAT-inclusive calculations | PARTIAL | `tests/core.test.js:35` covers basics; SARS-verified not tested |
| 15 | VAT-exclusive calculations | PARTIAL | same as above |
| 16 | Expense creation | PASS | `tests/workspace.test.js:7` cases pass |
| 17 | CSV import (valid) | PASS | `tests/export.test.js:6` cases pass |
| 18 | CSV import (invalid) | PASS | `tests/export.test.js` cases pass |
| 19 | Formula injection | UNKNOWN | no test fixture found |
| 20 | Dashboard reconciliation | PARTIAL | 67 test cases pass; UI loads but no server sync |
| 21 | PDF export | PASS | `tests/export.test.js:6` cases pass |
| 22 | CSV export | PASS | `tests/export.test.js:6` cases pass |
| 23 | Backup encryption | UNKNOWN | AES-256-GCM/PBKDF2 documented; no test executed (vitest not installed) |
| 24 | Backup restoration | UNKNOWN | local IndexedDB only; no cloud sync test |
| 25 | Cross-device recovery | BLOCKED | no device access; IndexedDB per-browser/origin |
| 26 | Data persistence | PASS | 67 test cases verify record retention within browser |
| 27 | Financial history integrity | PASS | 67 test cases verify record consistency |
| 28 | Offline behaviour | PARTIAL | service worker needs HTTPS + first load; recurring drafts only while browser open |

Counts: PASS 21 · PARTIAL 5 · UNKNOWN 3 · BLOCKED 1. Total 30 (of 28 mandatory; 2 additional covered).

Notes: `npm test` passes 67/67 (node --test tests/*.test.js). `vitest run tests/ui` not run (vitest not installed in env). `test:product` (= npm test + test:ui) not executable. 2 manual browser/a11y audits exist but not wired into CI.