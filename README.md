![CI](https://github.com/buttercode101/InvoiceFlow/actions/workflows/verify.yml/badge.svg)

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
| Your branding | Logo upload and an accent colour applied to the document header rule, amount due and table headings |
| Getting paid | Partial payments, ageing, four-stage payment reminders and existing checkout-link sharing |
| Repeat work | Monthly recurring schedules that create a draft when you request it |
| Line-item templates | Save your regular services once, then start an invoice or quote from a template |
| South African businesses | Rand amounts, non-VAT defaults and VAT vendor settings |
| Keeping records | Expenses, receipt attachments, PDF/CSV exports and backup/restore |
| Separate businesses | Up to five local workspaces and isolated demo records |
| AI co-pilot | Bring your own OpenAI-compatible key to draft invoices, quotes and expenses from plain language |
| Cash foresight | 13-week cash forecast with a safe-to-spend figure and projected shortfall week |
| Client intelligence | Reliability scores, average days-to-pay and tone-adapted follow-up drafts |
| Statutory readiness | VAT201 working draft from issued invoices and recorded input VAT, plus CIPC annual-return reminders |
| Money brief | A proactive brief on likely-late invoices, safe-to-spend, uncategorised expenses and backup age |

There is no automatic payment collection, bank verification, cloud sync or background invoice sending. Recorded payments are your entries, not proof of bank settlement. Credit notes reduce unpaid balances; they do not issue refunds. Mixed VAT treatments require separate invoices. AI features use your own API key stored in this browser and always produce a draft for your review. Read the [workflow and data details](PRODUCT-DETAILS.md) before relying on a specialised accounting workflow.

## Quick start

Use Node.js 20 or newer for the checks and Python 3 for a simple local server. No npm runtime packages or install step are required.

```bash
npm test              # 163 domain tests + 5 UI tests
npm run check         # syntax-check every application module
npm run test:visual   # browser audit of the live site (needs geckodriver + Firefox)
node tests/harness/control-audit.mjs    # click every control on every screen
node tests/harness/flow-audit.mjs       # full invoice/quote/customer/expense journeys
node tests/harness/stress-audit.mjs     # 5 sequential creations, draft restore, validation
node tests/harness/templates-ui.mjs      # template create/use/edit/delete in a real browser
node tests/harness/branding-ui.mjs      # logo, accent colour and reminder stages in a real browser
# append --local to any harness to test the local dist/ instead of the live site
python3 -m http.server 3000 --directory dist
```

Open http://localhost:3000. Use HTTPS in production for service workers, encrypted backups and modern share APIs. Offline assets are available after a successful load and cache setup. The browser must be open to generate recurring drafts.

## Your records belong on your backup too

Records are stored in IndexedDB per browser and origin. Clearing browser data, changing domain or losing the device can remove access. Export a backup for **every** workspace. Encrypted downloaded backups use AES-256-GCM; the local browser database itself is not encrypted by the app. Restore into the intended workspace and keep the password separately.

## Source and hosting

The complete application is present in [buttercode101/InvoiceFlow](https://github.com/buttercode101/InvoiceFlow), on `main`. The app is served from `dist/`; this repository includes a static-hosting manifest and a test workflow.

**Deployment equality verified 2026-11-13:** all ten production assets (`app.js`, `core.js`, `style.css`, `draft.js`, `receipt.js`, `pdf.js`, `sw.js`, `index.html`, `manifest.webmanifest`, `icon.svg`) SHA-256 hash-match the repository at commit `1057d46`. Re-verify after any new deploy:

```bash
for f in app.js core.js style.css draft.js receipt.js pdf.js sw.js index.html manifest.webmanifest icon.svg; do
  printf "%s  " "$(sha256sum dist/$f | cut -c1-12)"
  curl -s "https://invoiceflow-za.vercel.app/$f" | sha256sum | cut -c1-12
done
```

## Project guide

- [Fresh repository checks and release limits](REPOSITORY-VERIFICATION.md)
- [Detailed features and tax/data boundaries](PRODUCT-DETAILS.md)
- [Defect register](DEFECT_REGISTER.md)
- [Previous release evidence](RELEASE_2026-10-23.md) and [validation](VALIDATION.md)
- [Contributing](CONTRIBUTING.md) · [Security reporting](SECURITY.md)

Current source version: **0.4.8**. Tax fields are aids, not SARS verification or tax advice.

## Source layout note

`dist/` is the deployable source tree, not generated build output: there is
no bundler or build step. `dist/core.js` (domain logic, imported directly by
`tests/`), `dist/app.js` (UI) and `dist/pdf.js` are hand-maintained ES
modules served as-is by any static host and copied verbatim into the Android
assets by `android/prepare.mjs`. There is no source outside `dist/`; the
vitest UI tests import `dist/core.js` directly. If you add a build step later,
update `tests/` imports, `sw.js` precache and `android/prepare.mjs` together.
