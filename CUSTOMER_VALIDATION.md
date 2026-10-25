# InvoiceFlow customer trial and DealDesk discovery

Prepared 21 October 2026. This is a fieldwork plan, not completed customer validation. No users have been recruited, contacted, interviewed or charged. No synthetic response is a customer response.

## Sequence and technical gate

Keep InvoiceFlow free during the initial trial. Do not build another product until this trial produces a clear decision. Complete the remaining technical checks in VALIDATION.md first, especially PDF output, offline reload and physical Android interaction. The current Vercel project is access-protected: resolve tester access before distributing a trial link. Do not send temporary privileged bypass links to a public audience. Browser-local records mean each user/device has an independent workspace.

## Who to recruit

Aim for 5–10 South African solo service-business owners who are not VAT registered and issue at least a few invoices each month. Start with freelance designers, consultants, photographers and independent service providers. Include a mix of spreadsheet/manual-invoice users and existing software users. Prefer people with a real invoice to issue soon. Record the current tool and its actual cost; do not presume every participant uses or dislikes QuickBooks.

Use consent-based introductions or communities whose rules explicitly allow product research. Ask community moderators before posting where permission is required. Avoid mass messaging, scraping personal contact details or implying affiliation with a competitor. Participant identity and business financial records are not required in the research report; use P01–P10. Keep the tracker on your device. Do not request unredacted customer lists, bank statements, banking credentials, account numbers, invoices or backup files. A participant can demonstrate with redacted or sample details.

## Invitation draft — not sent

Hi — I’m testing InvoiceFlow, a small invoicing and expense tool for South African freelancers who aren’t VAT registered. It keeps records in your browser and has no subscription during this early trial. I’m looking for people willing to try creating one invoice and give honest feedback on what works and what gets in the way.

Would you be open to a 20-minute usability session? You can use sample details; I don’t need your customers’ information, banking credentials, or financial documents. There’s no obligation to buy anything. It’s an early version, and I’ll explain its limits before you start.

Do not send until intended recipients/channels are selected and sending is explicitly authorized.

## Before showing the product — 5 minutes

1. Tell me about the last invoice you created. Walk me through what you actually did.
2. What do you use now, what does it cost, and how long have you used it?
3. When did that process last go wrong or take too long? What happened?
4. How do you know what’s unpaid and what to follow up on?
5. Do you need multiple devices, collaboration, VAT, quotes, recurring invoices or bank feeds? Which is a genuine requirement?

Record the distinction between observed behavior, a reported past event, a preference, and a hypothetical answer. Do not count a compliment as a purchase commitment.

## Usability session — 10–15 minutes

Tell participants the task, not which button to press. Record completion time, assistance, errors and comments. Stop and fix any incorrect money, missing record or unsafe recovery result.

- Add a business and a customer using safe example details.
- Create a two-line draft with a fractional quantity. Check expected amounts independently.
- Obtain the invoice PDF and show where it was saved. Share to a draft or test destination only; do not send an invoice to a real customer as part of research without the participant's own intentional action.
- Mark sent, record a partial payment and then the balance. Explain whether 'sent' means delivered or a manual status.
- Correct a deliberately mistaken sample payment. Explain what the correction changed.
- Add an expense and explain the cash summary. Check that unpaid invoices are not treated as received cash.
- Export a backup, restore it in a disposable test workspace, and recover the prior workspace. Never overwrite a participant’s real records for the exercise.
- If the device/browser supports it, reopen cached app files without a connection and verify the record remains accessible.

## Repeat use and payment-cycle evidence

A single assisted session is usability evidence, not retention. Agree a follow-up after the participant’s next invoice/payment event. Ask whether they returned without prompting, what they used instead if not, and whether any client-facing result was useful. Do not demand an immediate paid invoice if payment is naturally due weeks later. Count only events that actually happened; label pending events pending. Do not turn courtesy follow-up replies into active usage.

Suggested lightweight pilot thresholds are management decisions, not market benchmarks:

- Zero unresolved calculation, record-loss or recovery failures.
- At least 4 of the first 5 participants complete a draft, obtain a PDF and understand payment status without step-by-step help.
- At least 3 participants return independently for another real work event.
- At least 2 describe a concrete reason to replace or supplement their current tool.
- At least 2 accept a specific paid-pilot offer after seeing the product, before committing to major paid feature work. Record verbal intent separately from any actual payment. Do not collect money before terms, support and the promised capability are ready.

Small samples give directional evidence, not statistically established conversion rates. Report numerators and denominators, timing and recruitment source.

## Pricing conversation

Do not announce $8–15/month as a validated price. First ask actual current spend and the alternative they would otherwise choose. Ask what the free version must retain, and whether paid sync/recovery or recurring invoicing would solve an observed problem. If testing an offer, show one concrete rand price with clear terms and record acceptance, objection or refusal. A response to 'would you pay?' is weak evidence; distinguish it from agreeing to a dated, specific pilot offer. Avoid promises to build every requested feature.

## Follow-up draft — not sent

Thanks for trying InvoiceFlow. Since our session, did you use it for another invoice, expense or payment? If not, what did you use instead, and why? Did anything feel unclear, unreliable or slower than your existing process? Please describe the issue without sending customer details or financial documents.

## DealDesk discovery — same audience, separate hypothesis

Hypothesis: solo service businesses miss paid work because enquiries and next actions are scattered. The proposed job is 'know whom to follow up with and when', not 'replace HubSpot'. No DealDesk build is authorized by this plan alone; the next decision should follow observed evidence and the user’s instruction.

Ask before showing screens:

1. Tell me about your last three enquiries and what happened to each.
2. Where did each arrive, and where did you record the next step?
3. When did you most recently forget or delay a follow-up? What was the consequence?
4. Show how you decide whom to contact today using redacted examples.
5. Have you tried an existing CRM? Which, and what caused you to keep or leave it?
6. Would another app make this easier or create more updating work? What would you stop using?

Potential v1, only after evidence: contact, enquiry, five stages (New / Discussing / Quoted / Won / Lost), rand value, notes, next action/date, overdue follow-ups, CSV import/export and backups. Start solo. Exclude email sync, bulk messaging, team permissions, AI scoring, advanced forecasting and automatic InvoiceFlow integration.

Build gate: repeated examples from at least 3 independent participants of a similar costly follow-up problem; a clear current workaround; interest in testing the exact next-action workflow; and a credible reason an available simple/free CRM does not fit. If customers only need a reminder beside an invoice, consider a small InvoiceFlow improvement rather than a second app. If no repeated pain appears, stop or revise the hypothesis instead of declaring success.

## Research tracker

Use RESEARCH_TRACKER.csv as an empty template. It contains no customer evidence. Record participant IDs, consent, observed events, assistance and exact next actions. Keep notes redacted. Summarise findings and contradictory evidence after each cohort; include reasons people declined or abandoned the app.
