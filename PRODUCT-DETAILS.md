# Workflow and data details

# InvoiceFlow ZA · v0.4.0

A local-first invoicing and cash-collection workspace for South African small businesses. Source recovered from the original Sites repository, rather than rebuilt. No runtime packages, paid API or server database are required.

## Run and verify

Serve `dist/` on a static HTTP server. HTTPS is required for service workers, installability, encrypted backups and modern clipboard/share APIs. `npm test` runs 64 regression tests; `npm run check` checks all application JavaScript syntax.

## Supported workflows

- Customers, reusable items, sequential invoice drafts and locked issued snapshots.
- Non-VAT invoices by default; registered-vendor details, 15% VAT inclusive/exclusive, zero-rated or exempt whole-document treatment. Separate invoices are needed for mixed treatments.
- Fixed rand discounts, requested deposits distinct from payments, three document styles and an unsaved document preview.
- Quotes with manual sharing/acceptance/decline, PDF export and idempotent conversion to an invoice draft.
- Partial payments, correction reversals, payment receipts and immutable credit notes against unpaid balances. Credit-note VAT is allocated cumulatively to avoid cent drift. No refunds or money movement.
- Customer statements and CSV export, cash-date reports, monthly trends, receivables ageing and top customers by actual recorded receipts.
- Monthly recurring schedules with month-end anchors, pause/resume and one due occurrence generated as a draft per click. The browser must be open; no automatic sending.
- Reminder templates, existing Yoco/PayFast checkout-link sharing, and reviewed CSV bank receipts. No API integration, bank verification or automatic reconciliation.
- Local receipt photo/PDF attachment per expense (PNG/JPEG/PDF up to 500 KB), included in JSON/encrypted backups; downloadable original files. Treat attached PDFs as untrusted documents when opening them.
- Expenses, expense CSV import and duplicate skipping, accountant CSV exports.
- JSON backup/restore with an atomic recovery checkpoint, optional AES-256-GCM encrypted backups using PBKDF2-SHA256 (310,000 iterations), password confirmation and authenticated decryption.
- Five separate business workspaces, isolated demo records, light/dark mode and responsive layouts.
- PWA installation guidance, cached offline assets after the first successful HTTPS load, explicit update application, safe cross-tab revision checks and a 10 MB restorable-workspace budget.

## Data and tax boundaries

All business records live in browser IndexedDB, per browser and domain. Device storage itself is not encrypted by this app; only an explicitly encrypted downloaded backup is encrypted. Export a backup for every business. There is no cloud synchronization, automatic backup, user-account service, billing subscription or paid AI assistant. PDF/CSV exports and backups contain customer/financial information; store and share them carefully. Existing version-1 records remain supported without changing historical invoice totals.

VAT numbers are format-checked, not verified with SARS. Fields and calculations follow reviewed SARS invoice requirements, but the app provides no certification or tax advice. Credit notes reduce unpaid balances only. Receipt documents acknowledge user-recorded payments, not bank-verified settlement. Email/share handoff does not establish delivery. Natural-language AI drafting and automatic delivery are deferred until an explicitly configured provider and cost/privacy model exist.
