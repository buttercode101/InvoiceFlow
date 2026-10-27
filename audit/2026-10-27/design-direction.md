# InvoiceFlow design direction — 27 October 2026

Preserve the existing cream/green, local-first invoicing workspace. The current task requires root fixes, not a visual reset. Keep quote and invoice stages distinct; retain explicit manual acceptance/payment boundaries; prevent mobile navigation label collisions; make secondary explanatory text meet AA contrast on soft cards.

Three current primary references researched via official public documentation (27 October 2026). These are documented capabilities, not authenticated UI observations:

- [Xero mobile invoicing](https://www.xero.com/za/explore/invoice-app/): invoice status, amount owed, quote-to-invoice without re-entering details. Principle: preserve workflow continuity and explicit status.
- [Sage South Africa invoicing](https://www.sage.com/en-za/sage-business-cloud/accounting/features/invoicing/): convert quotes and share professional PDFs or online links. Principle: documents and collection are a connected journey.
- [Zoho Invoice quote acceptance](https://www.zoho.com/ke/invoice/help/estimate/estimate-accept.html): customer portal acceptance updates quote status. Principle: state who performed acceptance. InvoiceFlow records acceptance manually and must not imply portal approval.

No competitor login, purchase, or private interface inspection was performed. Cloud portals and automated collection would require a separate architecture/privacy decision; this pass preserves the product's free local-only model.
