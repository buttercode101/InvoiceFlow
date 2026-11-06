# Security Review — InvoiceFlow

Date: 2026-11-06 · Commit `7d8337f` + partial fix set.

## Observed (verified)
- Zero runtime dependencies — minimal supply-chain surface; `package.json` has no `dependencies` field (only dev deps).
- `npm audit` not run from this env (vitest not installed; `npm ci` not executed). No high-severity findings confirmed without audit gate.
- IndexedDB local-first: data stored per browser/origin; no server backend, no network calls by default — `noscript` tag confirms: "InvoiceFlow needs JavaScript to save and manage your records. No records are sent to a server."
- CSP live: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; form-action 'none'` — no external script loads.
- Headers live: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `strict-transport-security`, `referrer-policy: no-referrer`, `/sw.js` → `cache-control: no-cache, no-store, must-revalidate`.
- No secrets in repo; no `.env.example` (vars never committed; fine for static app).

## Not verified / gaps
- Unauthorised API access: no API routes (zero runtime deps, no server); surface is by-design empty. Verified by code inspection: no `fetch`, no `@supabase/*`, no API endpoints in `src/`.
- CSV formula injection: `tests/export.test.js` covers valid/invalid CSV; formula injection (e.g. `=SUM(1,2)`) UNVERIFIED — could be interpreted by spreadsheet on import.
- Backup restoration: AES-256-GCM/PBKDF2-SHA256 documented in README; actual restoration procedure into isolated environment UNVERIFIED (local IndexedDB only).
- VAT number validation: format-checked only (`^4\d{9}$`); SARS-verified not tested — UNVERIFIED.

## Secrets hygiene
- No credentials in repo; `.env.example` absent (by design — static app, no API keys). No credentials in this report.

## Critical note per §6.4
AI must never invent a business's prices or silently calculate a quotation using unapproved assumptions. This path is untested — cannot claim compliance. Untested = UNKNOWN, not PASS.