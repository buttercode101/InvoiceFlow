# Product decision and verification · 21 October 2026

## Decision

Build InvoiceFlow first. This is an execution/budget judgement, not evidence that customers will pay. The basic invoicing category is crowded; the original broad pitch overstates its advantage.

| Dimension | InvoiceFlow / SimpleBooks | ScreenNote / AsyncLink |
|---|---|---|
| Existing competition | Strong free tools: Zoho Invoice; Invoice Ninja | Loom plus privacy/open-source alternatives Cap and Screenity |
| Smallest useful outcome | Customer → invoice → recorded payment, plus expenses and cash summary | Capture → recoverable upload → stable share link → playback and replies |
| Zero-budget feasibility | Browser-local records and static assets avoid recurring data-service costs | Local capture can be cheap; shared videos require storage, delivery, abuse controls and lifecycle management |
| Trust burden | Correct amounts, dates, immutable invoice details, recoverable data | Recording reliability, permissions, media compatibility, interrupted uploads, privacy and playback |
| Defensible initial hypothesis | Non-VAT SA freelancers who want a quick device-local invoice/EFT/expense workflow | Needs a specific underserved capture or feedback workflow; 'simpler Loom' is already occupied |
| Verdict | Better first small build, conditional commercial case | Defer; not a weak category, but less suitable for this budget |

## Current-source evidence

Checked official product pages and documentation, not hands-on competitor usability testing:

- Zoho Invoice pricing lists free invoicing, up to two users, three projects and 500 invoices/year. Its product includes expenses, reminders and customer portals. A cheap subscription and fewer buttons alone are weak differentiation. https://www.zoho.com/invoice/pricing/ and https://www.zoho.com/invoice/
- Invoice Ninja's free plan includes five clients and unlimited invoices. Pro is listed at $14/month or $140/year. https://invoiceninja.com/pricing-plans/
- Wave's Help Center states availability for US/Canadian businesses, and describes limits on invoice/reminder sending for users elsewhere. That makes Wave a less direct South African acquisition target than the original prompt assumes. https://support.waveapps.com/hc/en-us/articles/32449161224852-Create-a-Wave-account and https://support.waveapps.com/hc/en-us/articles/27277914806804-Changes-for-Wave-users-outside-the-United-States-and-Canada
- Loom Starter lists 25 videos and five-minute screen recordings. Those are real constraints, but do not establish willingness to switch. https://www.loom.com/pricing
- Screenity offers a free open-source extension with no recording limits. Cap already positions itself as an open-source Loom alternative with local editing, links, self-hosting and storage options. https://screenity.io/extension and https://cap.so/
- MDN states screen capture needs a secure context, has limited browser availability and requires fresh user activation/permission. 'One click' cannot mean suppressing the browser's source picker. https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia
- SARS documents distinct tax invoice particulars. This release deliberately supports non-VAT ordinary invoices and does not label the cash summary a formal P&L or promise SARS compliance. https://www.sars.gov.za/businesses-and-employers/government/tax-invoices/

Prices, limits and product coverage can change. The prior QuickBooks range was not needed for the decision and is not reused as a verified fact. Vendor security statements are not independent security audits. No conversion, revenue, churn, adoption or willingness-to-pay measurements have been obtained.

## REA assessment

The official REA repository confirms `npx rea-agents setup` and supports binary, JavaScript/Electron and runtime inspection. https://github.com/morluto/rea

The proposed prompts sensibly demand evidence and unknowns. Improve them by requiring exact target version/platform/hash, only using capabilities actually present in that installed version, separating static inference from runtime observation, listing what is server-side or unseen, and testing observable inputs/outputs. Extracting a client cannot establish unseen server-side balance logic or media storage behavior. A placeholder path is not executable evidence, and an evidence prompt does not guarantee correct analysis.

REA is not required for ordinary invoice mathematics or this original implementation. No proprietary app was installed, extracted, reverse-engineered or copied. The implementation was built from explicit behavior requirements and official documentation. A true separated clean-room process was not performed and is not claimed.

## Implemented commercial hypothesis

Primary audience: South African non-VAT freelance service businesses, beginning with designers, consultants and small service providers. Working promise: 'Create a rand invoice, include EFT details, record payment, and see cash in/out without creating another cloud account.' This remains a hypothesis; local-only data can be a disadvantage for people who need device sync or recovery.

Do not introduce a paywall until basic use and retention are observed. Potential later paid value: reliable optional sync/backup, recurring invoices, controlled reminders, or accountant handoff. All need further scoping and cost checks; none are promised or sold in this release. Initial commercial gate: have 5–10 target users complete a real invoice and payment cycle, identify what they currently use and why they'd switch, observe repeat use, and ask for an actual paid commitment before building a larger product. No price has been validated.

## Verification record

Final automated checks: **23 domain tests pass**, plus JavaScript syntax checks. Cases cover strict currency parsing, fractional quantity rounding, invalid dates, invoice transitions, overdue/remaining balance, payment-date reporting, overpayment rejection, immutable snapshots, sequence non-reuse, voiding, future-dated sending, CSV quoting/BOM/newlines and malformed rows, CSV formula escaping, duplicate fingerprints, backup validation/round-trip, unsafe IDs, secure ID fallback, and unchanged invoice content when marked sent.

Observed through the browser at the internal static preview:

1. Empty real workspace, no seeded production records.
2. Business setup saved and persisted across preview reloads.
3. Customer created via modal.
4. Invoice created with 1.50 × R999.99 = R1,499.99.
5. Draft marked sent with an explicit no-email-sending confirmation.
6. R500 payment → R999.99 remaining, part-paid state.
7. R999.99 final payment → R0 remaining, paid state.
8. R149.99 manual Software expense saved.
9. Report shows R1,499.99 receipts − R149.99 expenses = R1,350.00 net cash.
10. Desktop overview inspected visually. No live customer data was used.

Found and fixed during browser QA: the HTTP preview does not provide crypto.randomUUID. Added a crypto.getRandomValues fallback, retested record creation successfully, and added a regression test. Source review additionally prevented unsafe imported record IDs and preserved draft invoice details unchanged when marked sent.

## Verification limits / release status

This is a private first working release, **not a fully assured commercial launch**.

The browser session stopped responding during the backup download event test; subsequent state and reset calls timed out. Consequently browser backup download/restore, browser CSV upload/export, PDF output, native sharing, light/dark switching, cross-tab conflicts, complete sample-workspace interaction, offline reload and real-device responsive checks remain unverified end to end. Their relevant core logic is tested where stated above; that is not a substitute for UI tests.

Offline caching requires HTTPS and was unavailable in the HTTP preview. Responsive CSS is implemented but desktop browser testing does not certify Android, iPad, Safari, printing or every viewport. Deployment success confirms hosting, not these missing checks. Before use as a business system of record, complete those checks and add payment-correction/reversal handling. Keep independent backups and retain original payment evidence.

## Release follow-up · version 0.2.1

This section supersedes earlier statements where it records a newly completed check. It does not turn unverified checks into passes.

### Changes

- Mistaken payment entries can now be reversed with a required reason. The original entry and timestamp remain in workspace history. Active receipts, balances and historical cash summaries exclude reversed entries. This corrects a recording error; it does not refund money. Customer invoice documents show active payments only.
- Restore preserves the highest invoice-number sequence in the target workspace, preventing an older backup from reusing later invoice numbers.
- Restore now saves a recovery copy of the prior workspace in the same IndexedDB transaction. Settings can recover that copy; recovery makes the current workspace the new checkpoint. Both live and demo checkpoints remain separate.
- JSON backup export includes a readable/copyable fallback. Restore accepts a file or pasted JSON. Expense import accepts a file or pasted CSV, with the same validation and review step.
- Offline status now accurately reports an unavailable cache instead of leaving a misleading 'pending' message. Added 192px and 512px PNG install icons; kept service-worker versioning explicit.
- Improved long currency/text wrapping on narrow layouts. The responsive QA harness is retained in tests/ui and is excluded from deployment output.

### Newly observed browser results

- Demo workspace loaded separately from the saved real test workspace.
- An R3,200 example payment was reversed with a reason; its overdue invoice reopened at R3,200, and the original payment remained visible in audit history.
- Backup content exposed all five demo invoices. Paste restoration returned the original R4,700 cash receipts, and recovering the prior checkpoint returned R1,500 receipts and the reversed-entry state.
- Invalid negative-amount CSV was rejected before any records were saved. Pasted CSV with a quoted comma and one duplicate produced a review of two fresh expenses totalling R105.50; confirmation added exactly two records, increasing expenses from R1,729.00 to R1,834.50.
- A bounded download event test succeeded. The actual downloaded JSON file was inspected: 8,925 bytes, five invoices, five expenses, and retained reversal history. This verifies the backup download itself. The subsequent file-picker restore attempt stalled the browser infrastructure; completion of that file route is unknown. Paste restoration and recovery were verified separately.
- Dark mode toggled through the UI and its phone-width settings screen was visually inspected.
- 64 responsive document-overflow checks passed: Overview, Invoices, Expenses, Reports, Customers, Items, Settings and the Invoice editor at iframe widths of 360, 390, 480, 768, 834, 1024, 1440 and 1920 CSS pixels. The browser used conventional scrollbars, so some document client widths were 15px narrower. Tables scroll inside their containers. Screenshots of the narrow overview and dark settings were inspected internally. These are desktop Chromium viewport simulations, not physical mobile/tablet tests or proof that every element is perfectly positioned.

### Current automated result and remaining gate

30 domain tests pass, including seven new reversal/backup cases; JavaScript syntax checks pass. No real customers were used in QA. No users have been recruited or interviewed, and no willingness-to-pay evidence has been collected.

Still unverified end to end: file-picker JSON restore and CSV upload, CSV download content, actual print/PDF output, external email/native-share handoff, offline HTTPS reload, cross-tab conflict handling, and physical Android/iPad/Safari use. Invoice detail/modal layouts were exercised in desktop testing but are not part of the eight-page responsive matrix above.

Vercel's current sign-in protection also prevents an unrestricted public trial. It remains enabled; no team protection was weakened. This is an updated working build with a documented release gate, not a claim of full public launch readiness. The customer-validation plan is prepared in CUSTOMER_VALIDATION.md, with an empty tracker. No outreach was sent.

## Release follow-up · version 0.3.0

This section supersedes earlier open items only where a completed check is recorded.

- Added direct, selectable-text A4 PDF downloads with locally bundled PDF/font assets. Accented text is supported where the embedded font has glyphs; unsupported characters produce an explicit error and retain the browser-print fallback. Long invoices paginate, and reversed payments are excluded.
- 36 automated tests pass, plus syntax checks. New coverage includes PDF generation/pagination and service-worker cache installation, simulated network-failure navigation/module/font responses, non-GET/third-party exclusion and cache cleanup.
- PDF fixtures were rendered and inspected. An 80-item, seven-page invoice contains each line exactly once; its independently calculated total is R13,949.20, deposit R100.00 and balance R13,849.20. Accented customer names render correctly. This fixture check is separate from the deployed browser download check.
- Live Vercel browser QA completed file-picker JSON restoration (five invoices, three customers, three expenses), CSV file import (one R12.34 expense), and CSV download. Inspection of the actual downloaded CSV found four rows and the correct imported amount/description.
- Live two-tab testing rejected an outdated tab's write with a conflict message. Reload retained the newer tab's item and excluded the rejected stale item.
- The invoice email-link fields were inspected without sending a message. Clipboard handler completion was observed, but automation clipboard readback did not confirm the copied text; clipboard/native-app handoff remains unverified.
- The deployed browser reported its offline cache ready. Cache readiness and simulated network failure tests do not establish successful disconnected reload on a physical device.

Remaining checks: deployed direct PDF download (record outcome below), disconnected browser reload, native email/share/clipboard handoff and physical Android/iPad/Safari behavior. No customer interviews, retained usage or paid commitments have been obtained. Vercel protection settings remain unchanged.

### Production deployment outcome

Vercel deployment dpl_F756WiASH251rrKxPDG6RNVbHYLo reached READY and the production alias serves v0.3.0. Authenticated fetches confirmed the deployed app, PDF module and versioned service worker. The browser displayed the new Download PDF control. Its download action timed out at the browser-tool boundary after 300 seconds, and a subsequent browser-state request also timed out. Therefore the deployed PDF download is **not verified end to end**; this is not recorded as either an application pass or an application failure. Generated PDF fixture inspection and the 36 automated passes remain valid. Protection was not changed.


## Full audit follow-up · version 0.3.1 · 22 October 2026

See AUDIT_2026-10-22.md for the complete audit. 48 automated tests and syntax checks pass. Fresh browser checks covered first-use business/customer/invoice creation, partial payment, overpayment rejection, correction and settlement, expense entry, cash reports, persistence, invalid/valid backup restoration, recovery and demo isolation. 72 responsive measurements passed at eight widths across nine screens. The production direct PDF download was captured, extracted and rendered successfully, closing the prior timeout gap. Native clipboard/email/share, print-dialog output, disconnected reload and physical-device tests remain explicitly limited as described in the audit.
