# Security Policy

## Reporting a vulnerability

If you discover a security issue in InvoiceFlow, please report it
**privately** rather than opening a public issue:

- Email: **security@buttercode101.com**, or
- Open a GitHub private vulnerability report on this repository.

Include steps to reproduce, the impact you believe it has, and any
suggested fix. We acknowledge reports within 48 hours and aim to
resolve confirmed issues promptly. Please do not disclose the issue
publicly until a fix is available.

## What InvoiceFlow stores, and where

InvoiceFlow is **local-first**: records live in the browser's
IndexedDB on the device where the app is used. There is no InvoiceFlow
server that receives your customer, invoice, or payment data, and no
account system. Exported backups are files you save and share
yourself.

Consequences for security and privacy:

- **Your device is the data boundary.** Anyone with access to your
  unlocked browser profile can read app data. Use a device PIN and
  browser-profile protection.
- **Backup files contain your full financial records.** Store them
  like you would financial paper records; a backup shared with the
  wrong person exposes customer and payment details.
- **The web app is static.** There is no server endpoint to attack
  for data exfiltration, but hosting/CDN compromise would affect the
  delivered code — deployment changes go through reviewed, merged
  commits (see GitHub Actions verification).

## Known limitations (not vulnerabilities)

- No end-to-end encryption of backups: backup safety depends on
  where you store the file.
- No multi-device sync: copies on different devices are independent.
- Records are not a tax or accounting system; calculations implement
  VAT display rules but are not a substitute for professional
  accounting advice.

## Scope

In scope: the deployed web app, the Android wrapper, and the
verification workflows in this repository.

Out of scope: third-party hosting platforms (Vercel, GitHub Actions)
except as they deliver this repository's verified artifacts.
