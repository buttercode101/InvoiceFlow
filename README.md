# InvoiceFlow ZA

**Send the invoice. Track what is owed. Spend less time on admin.**

InvoiceFlow is a local-first invoicing workspace for South African freelancers and small businesses. Keep customers, quotes, invoices, payments and expenses together, then export the documents and records you need. Your records live in your browser; no account or server database is required.

[Open InvoiceFlow](https://invoiceflow-za.vercel.app) · [Run locally](#quick-start) · [Workflow details](PRODUCT-DETAILS.md) · [Verification](REPOSITORY-VERIFICATION.md)

## From quote to paid

1. Set up your business and add a customer and reusable items.
2. Create a quote or invoice draft and review its document preview.
3. Issue an invoice snapshot and download its PDF for sharing.
4. Record full or partial payments and see what remains outstanding.
5. Record expenses, review cash-date reports and export an accountant CSV.
6. Download a backup for each business, optionally password encrypted.

## What it handles

| Need | Included workflow |
| --- | --- |
| Professional documents | Quotes, invoices, receipts, credit notes and customer statements |
| Getting paid | Partial payments, ageing, reminder templates and existing checkout-link sharing |
| Repeat work | Monthly recurring schedules that create a draft when you request it |
| South African businesses | Rand amounts, non-VAT defaults and VAT vendor settings |
| Keeping records | Expenses, receipt attachments, PDF/CSV exports and backup/restore |
| Separate businesses | Up to five local workspaces and isolated demo records |

There is no automatic payment collection, bank verification, cloud sync or background invoice sending. Recorded payments are your entries, not proof of bank settlement. Credit notes reduce unpaid balances; they do not issue refunds. Mixed VAT treatments require separate invoices. Read the [workflow and data details](PRODUCT-DETAILS.md) before relying on a specialised accounting workflow.

## Quick start

Use Node.js 24 for the checks and Python 3 for a simple local server. No npm runtime packages or install step are required.

```bash
npm test
npm run check
python3 -m http.server 3000 --directory dist
```

Open http://localhost:3000. Use HTTPS in production for service workers, encrypted backups and modern share APIs. Offline assets are available after a successful load and cache setup. The browser must be open to generate recurring drafts.

## Your records belong on your backup too

Records are stored in IndexedDB per browser and origin. Clearing browser data, changing domain or losing the device can remove access. Export a backup for **every** workspace. Encrypted downloaded backups use AES-256-GCM; the local browser database itself is not encrypted by the app. Restore into the intended workspace and keep the password separately.

## Source and hosting

The complete application is now present in [buttercode101/InvoiceFlow](https://github.com/buttercode101/InvoiceFlow), on `main`. The earlier empty-repository/write-permission note described 23 October and is superseded by the source import. The app is served from `dist/`; this repository includes a static-hosting manifest and a test workflow. Their presence does not prove the connected Vercel production project uses the latest commit. Deployment linkage and production equality must be verified separately.

## Project guide

- [Fresh repository checks and release limits](REPOSITORY-VERIFICATION.md)
- [Detailed features and tax/data boundaries](PRODUCT-DETAILS.md)
- [Previous release evidence](RELEASE_2026-10-23.md) and [validation](VALIDATION.md)
- [Contributing](CONTRIBUTING.md) · [Security reporting](SECURITY.md)

Current source version: **0.4.0**. Tax fields are aids, not SARS verification or tax advice.
