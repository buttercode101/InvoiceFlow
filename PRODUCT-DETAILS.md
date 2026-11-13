# Workflow and data details

# InvoiceFlow ZA · v0.4.8

A local-first invoicing and cash-collection workspace for South African small businesses. Source recovered from the original Sites repository, rather than rebuilt. No runtime packages, paid API or server database are required.

## Run and verify

Serve `dist/` on a static HTTP server. HTTPS is required for service workers, installability, encrypted backups and modern clipboard/share APIs. `npm test` runs 135 domain tests plus 3 UI tests; `npm run check` checks all application JavaScript syntax; `npm run test:visual` audits the live site in a real browser (geckodriver and Firefox required) across 11 pages, 10 viewport widths, dark mode, dialogs, detail views, accessibility naming and offline readiness.

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
- Expenses, expense CSV import and duplicate skipping, accountant CSV exports, and a per-expense VAT portion that feeds the VAT201 draft.
- JSON backup/restore with an atomic recovery checkpoint, optional AES-256-GCM encrypted backups using PBKDF2-SHA256 (310,000 iterations), password confirmation and authenticated decryption.
- Five separate business workspaces, isolated demo records, light/dark mode and responsive layouts.
- PWA installation guidance, cached offline assets after the first successful HTTPS load, explicit update application, safe cross-tab revision checks and a 10 MB restorable-workspace budget.

## AI co-pilot (bring your own key)

The co-pilot turns plain language into a structured draft. It never sends anything and never invents prices: it extracts what you wrote and hands you a draft to review. The API key and endpoint are stored only in this browser's local storage and are sent solely to the endpoint you configure.

- Supported endpoints: any OpenAI-compatible API (OpenAI, OpenRouter, Groq, Gemini, Anthropic).
- Produces invoice drafts, quote drafts and expense drafts; quantities and amounts are parsed deterministically, not guessed.
- Receipt photos can be read by the same endpoint when a key is configured; without a key the dialog still works by manual entry.
- Every AI-produced document is a draft. Nothing is issued, sent or deleted automatically.

## Predictive cash flow

A 13-week forecast built only from your own records: issued invoices, recorded payments, recurring schedules and expenses. It reports a safe-to-spend figure, the week of any projected shortfall, and the assumptions behind both. It is a projection from your data, not a bank balance and not a guarantee.

## Client intelligence

Per-customer reliability scoring from recorded payment history: average days-to-pay, invoice counts and outstanding totals. The smart follow-up writes a tone-adapted draft (friendly or firm) based on that history, records the follow-up attempt on the invoice, and resolves pending follow-ups when a payment is recorded. Follow-up drafts are always copied for you to send yourself.

## Statutory readiness

- **VAT201 working draft** — output VAT from issued invoices and input VAT from expenses with a recorded VAT portion, for a period you choose. Export a CSV and complete eFiling manually. InvoiceFlow never submits to SARS.
- **CIPC annual-return reminder** — derives the incorporation year from the registration number and estimates the next return at the end of the current calendar year. This is an estimate: confirm the exact anniversary date on the CIPC website.

## Data and tax boundaries

All business records live in browser IndexedDB, per browser and domain. Device storage itself is not encrypted by this app; only an explicitly encrypted downloaded backup is encrypted. Export a backup for every business. There is no cloud synchronization, automatic backup, user-account service, billing subscription or paid AI assistant. PDF/CSV exports and backups contain customer/financial information; store and share them carefully. Existing version-1 records remain supported without changing historical invoice totals.

VAT numbers are format-checked, not verified with SARS. Fields and calculations follow reviewed SARS invoice requirements, but the app provides no certification or tax advice. Credit notes reduce unpaid balances only. Receipt documents acknowledge user-recorded payments, not bank-verified settlement. Email/share handoff does not establish delivery. Natural-language AI drafting and automatic delivery are deferred until an explicitly configured provider and cost/privacy model exist.
