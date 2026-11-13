# SoloBid → InvoiceFlow reuse map

Source: `buttercode101/solobid` (private), cloned to `~/projects/solobid`.
Read 2026-11-13. Every claim below cites a file and line.

**Stack:** React 19 + Vite + TypeScript + Tailwind, Firestore (client SDK + Admin),
Express server (`server.ts`), Resend for email, `@react-pdf/renderer` for PDFs,
Firebase Storage for logos, Zod for validation.

---

## 1. What SoloBid actually has

| Area | Reality | Evidence |
|---|---|---|
| "Templates" | **Line-item presets**, not visual themes. A template = name + description + a saved set of `{description, qty, unitCost, type, markupPercent}`. Using one spawns a pre-filled quote draft. | `src/pages/Templates.tsx:33-36, 76-89, 109-151` |
| Starter templates | 3 hardcoded starters: "Basic Service Call", "Premium Renovation Bid", "Fixed Monthly Retainer". | `Templates.tsx:157-198` |
| Visual styles | **Two**: `classic` and `modern`. The only difference is header layout — `flexDirection: column` + centred vs `row` + right-aligned. | `src/components/InvoicePDF.tsx:16-38`, selected at `:181` |
| Fonts | `contractor.pdfFont` selects the PDF font family. | `InvoicePDF.tsx:181` |
| Logo | Uploaded to Firebase Storage at `logos/{uid}/{filename}`, stored as `profile.logoUrl`, rendered in the client view and the PDF. | `Settings.tsx:100-111`, `ClientView.tsx:208-210`, `InvoicePDF.tsx:192-194` |
| Accent colour | **None.** "primary" is a hardcoded Tailwind theme token. | `Settings.tsx` (no colour field) |
| Client share link | The document id *is* the link: `/quotes/{id}` renders `ClientView`, which reads `quotes/{id}` from Firestore. Hosted, so the link resolves anywhere. | `ClientView.tsx:24, 42-59` |
| E-sign | Records `status: 'approved'`, `signatureName`, `approvedAt`. Validated with Zod (name ≥2 chars, must tick agree). | `ClientView.tsx:14-17, 82-108` |
| Decline | **Does not exist.** There is no decline path, no comment, no counter-offer. | `ClientView.tsx` (approve is the only action) |
| Status model | `draft → sent → approved → converted` (+ `paid`, `overdue`, `expired`). Expiry computed client-side from `expiresAt`. | `ClientView.tsx:122-124, 181-198` |
| Reminders | **Server cron**, multi-interval: 3 days before due, on the due date, 7 days overdue, 14 days overdue. | `server.ts:356-359` |
| Recurring | Same cron: creates a draft invoice, increments the number, advances `nextIssueDate`. | `server.ts:245-345` |
| Email | Resend, HTML template, PDF attached as base64. | `server.ts:142-227` |
| Cron audit | Every run writes a `cronLogs` doc with sent/generated/error counts. | `server.ts:410-417` |

---

## 2. What is genuinely reusable in InvoiceFlow

### 2.1 Line-item templates — highest value, no new architecture
InvoiceFlow has `template-${esc(i.template||'classic')}` (`dist/app.js`, `invoiceDocument`) but **only the `classic` visual style exists**, and there is no concept of a reusable line-item preset.

SoloBid's model ports directly: a `templates` store (name, description, line items), a "use template" action that spawns a draft. InvoiceFlow already has draft creation, so this is additive.

**Port:** `Templates.tsx:76-89` (shape), `:109-151` (use-template flow), `:157-198` (starter content).
**Note:** SoloBid's template editor only edits name + description — the line items come from the *last edited template* (`editingTemplate.lineItems`), which is a bug-prone design. InvoiceFlow should edit line items explicitly.

### 2.2 Reminder scheduling logic — ports as pure functions
`server.ts:356-359` is the whole insight:
```ts
const diffDays = Math.floor((now - dueDate) / 86400000);
if (diffDays === -3 || diffDays === 0 || diffDays === 7 || diffDays === 14) { /* remind */ }
```
This is provider-independent and belongs in `dist/core.js` as a pure function. InvoiceFlow's local-first constraint means there is no cron — but the *schedule* can still drive an in-app "due reminders" panel and, later, email via BYOK.

### 2.3 E-sign validation shape
`ClientView.tsx:14-17` — Zod schema requiring a name ≥2 chars and an explicit agreement tick. InvoiceFlow has no Zod; the equivalent is a plain validator. The **UI pattern** (name field + agreement checkbox + disabled button until both valid) ports directly: `:374-405`.

### 2.4 Approval status ladder
`draft → sent → approved → converted` with a progress indicator (`ClientView.tsx:306-341`). InvoiceFlow already has `draft/sent/paid/void`; adding `approved` and an `accepted` flag on quotes is a small state extension.

### 2.5 Logo handling — concept only
The *pattern* (file → stored image → URL → header + PDF) is right. SoloBid's implementation depends on Firebase Storage, which InvoiceFlow cannot use (local-first, no server). The portable version is **file → data URL in IndexedDB → `<img>`** in the document header.

### 2.6 Cron audit log
`server.ts:410-417` — every automated run records counts and errors. InvoiceFlow should keep an equivalent local log for any automated reminder run.

---

## 3. What NOT to copy

- **The e-sign is legally thin.** `status + name + timestamp` (`ClientView.tsx:94-98`) has no IP, no user-agent, no document hash, no signer identity proof. It is an approval flag, not a defensible signature. InvoiceFlow should do better: hash the exact document accepted, capture a timestamp, and state plainly what the record does and does not prove.
- **No decline path.** Approve-or-nothing. Any acceptance flow worth building needs decline with a reason.
- **No accent colour.** Branding is logo-only.
- **Visual "styles" are cosmetic.** `classic` vs `modern` is one flex-direction change (`InvoicePDF.tsx:24, 27, 33, 37, 54`). Marketing it as "multiple templates" would be misleading.
- **Template editor is broken by design.** `Templates.tsx:81` keeps the previous template's line items when editing, rather than letting you edit them.
- **Server-side cron is the wrong shape for InvoiceFlow.** It needs Firestore + Express + a host. InvoiceFlow is local-first; the schedule must be client-side.

---

## 4. Architectural fork (unchanged from earlier analysis)

SoloBid resolves the share link because it is **hosted** — Firestore holds the document and `/quotes/{id}` serves it. InvoiceFlow has no server, so a client link requires either:

- **Static self-contained share** — the document serialised into a standalone HTML file or URL the client opens locally. Works offline, no backend, but the client's acceptance cannot push back to your app. You would see it only when they reply or re-upload.
- **Hosted link** — real-time status, real e-sign audit trail, automatic sync — but requires a backend and a secret, breaking the local-first premise.

SoloBid chose hosted. That is the correct choice *for its architecture*, and it is not transferable to InvoiceFlow without a server.

---

## 5. Recommended order

1. **Line-item templates** — self-contained, no new architecture, directly answers "create from a template". Highest value-to-risk ratio.
2. **Reminder schedule as pure functions + an in-app "due reminders" panel** — ports SoloBid's interval logic without needing a cron or email.
3. **Logo + accent colour** — contained branding work; data URL instead of Firebase Storage.
4. **Decide static-vs-hosted before building any acceptance flow** — this is an architecture decision, not a UI one.
