// Deterministic natural-language draft parser for the AI Co-pilot.
// Additive module: does not touch core.js financial logic. No network, no AI.
// Everything here is pure and reproducible so financial calculations stay deterministic.
import { addDays, today } from './core.js';

const DOC_WORDS = /\b(invoice|invoices|quote|quotes|quotation|bill|billing)\b/i;
const MONEY_RE = /(?<![A-Za-z])R\s*(\d[\d,]*(?:\.\d{1,2})?)|(\d[\d,]*(?:\.\d{1,2})?)\s*(?:ZAR\b|rand(?:s)?\b)/i;
const MONEY_GLOBAL = /(?<![A-Za-z])R\s*(\d[\d, ]*(?:\.\d{1,2})?)|(\d[\d, ]*(?:\.\d{1,2})?)\s*(?:ZAR\b|rand(?:s)?\b)/gi;
const DUE_DAYS = /\bdue(?:\s+in)?\s+(\d{1,4})\s*days?\b/i;
const VALID_DAYS = /\bvalid(?:\s+for)?\s+(\d{1,4})\s*days?\b/i;
const QTY_AT = /(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h|units?|pcs?|pieces?|days?|sessions?|consultations?|retainers?|months?|weeks?)?\s*(?:at|@|×|x)\s*(?:R\s*)?(\d[\d,]*(?:\.\d{1,2})?)/i;
const AT_QTY = /(?:R\s*)?(\d[\d,]*(?:\.\d{1,2})?)\s*(?:x|×)\s*(\d+(?:\.\d+)?)/i;

function toCents(raw) {
  // The app renders money as "R 4 500,00" (space thousands, comma decimals).
  // Accept that as well as "R4,500" and "R4500.00" without guessing wrong.
  let s = String(raw).replace(/\s/g, '');
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > lastDot && /,\d{1,2}$/.test(s)) {
    s = s.slice(0, lastComma).replaceAll(',', '').replaceAll('.', '') + '.' + s.slice(lastComma + 1);
  } else {
    s = s.replaceAll(',', '');
  }
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  const c = Math.round(n * 100);
  return Number.isSafeInteger(c) && c > 0 ? c : null;
}

function normalise(text) {
  return String(text ?? '')
    .replace(/\s+/g, ' ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .trim();
}

// Split a work-description string into segments, one per money amount found.
function splitOnAmounts(text) {
  const amounts = [...text.matchAll(MONEY_GLOBAL)];
  if (!amounts.length) return [{ description: text.trim(), amount: null }];
  const out = [];
  let cursor = 0;
  for (const m of amounts) {
    const start = m.index;
    const end = m.index + m[0].length;
    const description = text.slice(cursor, start);
    cursor = end;
    const raw = m[1] ?? m[2];
    out.push({ description: description.trim(), amount: toCents(raw), raw });
  }
  const tail = text.slice(cursor).trim();
  if (tail && !/^[\s,;.&+-]*$/.test(tail)) out.push({ description: tail, amount: null });
  return out;
}

function cleanDescription(value) {
  return value
    .replace(/^[\s,;:&|+.\-]+/, '')
    .replace(/^(?:and|plus|also|then)\s+/i, '')
    .replace(/[\s,;:&|+.\-]+$/, '')
    .replace(/\b(?:and|plus|also|then)\b\s*$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Remove the leading document-type phrase and a leading for/to so the client
// phrase can be isolated without the verb noise.
function stripDocPrefix(text, type) {
  const re = new RegExp(`^\\s*${type === 'quote' ? 'quote|quotation' : 'invoice|bill'}\\b\\s*`, 'i');
  let out = text.replace(re, '');
  out = out.replace(/^\s*(?:for|to)\s+/i, '');
  return out.trim();
}

function candidateClientPhrases(text, type) {
  const phrases = [];
  const body = stripDocPrefix(text, type);
  const stop = /\s+(?:for|at|due|on|by|worth|totalling|totaling|total)\s+/i;
  const money = /\s+R\s*\d|\s+\d[\d,]*\s*(?:ZAR|rand)/i;
  const firstStop = body.match(stop) || body.match(money);
  if (firstStop) phrases.push(body.slice(0, firstStop.index).trim());
  // Capitalised runs anywhere in the body are also candidates (context match wins).
  for (const m of body.matchAll(/(?<![\w&])([A-Z][A-Za-z0-9&'.-]*(?:\s+[A-Z][A-Za-z0-9&'.-]*){0,3})/g)) {
    phrases.push(m[1].trim());
  }
  return [...new Set(phrases.filter(p => p && p.length > 1))];
}

export function scoreClient(candidate, customers) {
  const c = candidate.toLowerCase().trim();
  if (!c) return { score: 0, id: null };
  let best = { score: 0, id: null };
  for (const customer of customers || []) {
    const name = String(customer.name || '').toLowerCase().trim();
    if (!name) continue;
    let score = 0;
    if (name === c) score = 100;
    else if (name.includes(c) || c.includes(name)) score = 70;
    else {
      const a = c.split(/\s+/).filter(Boolean);
      const b = name.split(/\s+/).filter(Boolean);
      const shared = a.filter(w => b.includes(w)).length;
      if (shared) score = 20 + (shared / Math.max(a.length, b.length)) * 40;
    }
    if (score > best.score) best = { score, id: customer.id };
  }
  return best;
}

function extractClient(text, type, customers) {
  const phrases = candidateClientPhrases(text, type);
  let best = { phrase: '', id: null, score: 0 };
  for (const phrase of phrases) {
    const { score, id } = scoreClient(phrase, customers);
    if (score > best.score) best = { phrase, id, score };
  }
  if (best.score >= 70) return { name: best.phrase, customerId: best.id, matched: true };
  if (best.score >= 20) return { name: best.phrase, customerId: best.id, matched: false };
  // No customer context: fall back to the leading phrase.
  const leading = phrases[0] || '';
  return { name: leading, customerId: null, matched: false };
}

function extractVat(text) {
  if (/\b(?:including|inclusive|incl\.?)\s*VAT\b/i.test(text)) return 'inclusive';
  if (/\bVAT[- ]inclusive\b/i.test(text)) return 'inclusive';
  if (/\b(?:excluding|exclusive|excl\.?)\s*VAT\b/i.test(text)) return 'exclusive';
  if (/\bVAT[- ]exclusive\b/i.test(text)) return 'exclusive';
  if (/\bzero[- ]rated\b/i.test(text)) return 'zero';
  if (/\b(?:no\s+VAT|exempt|not\s+VAT\s+registered|without\s+VAT)\b/i.test(text)) return 'exempt';
  return null;
}

function extractDue(text) {
  const m = text.match(DUE_DAYS) || text.match(VALID_DAYS);
  if (m) {
    const days = Number(m[1]);
    if (Number.isFinite(days) && days >= 0 && days <= 3650) return { days, date: addDays(today(), days) };
  }
  const iso = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso) return { days: null, date: iso[1] };
  return { days: 14, date: addDays(today(), 14) };
}

function extractNotes(text) {
  const m = text.match(/\b(?:note|notes|reference|ref|instructions?)\s*:\s*(.+)$/i);
  return m ? m[1].trim().slice(0, 3000) : '';
}

// Remove the client phrase (and any leading verb) from the work-description area.
function removeClient(text, type, clientName) {
  let out = stripDocPrefix(text, type);
  if (clientName) {
    const escaped = clientName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`^\\s*${escaped}\\s*`, 'i'), '');
    out = out.replace(new RegExp(`\\b(?:for|to)\\s+${escaped}\\b\\s*`, 'i'), '');
  }
  return out.replace(/^\s*(?:for|to)\s+/i, '').trim();
}

function buildLine(segment, items) {
  let description = cleanDescription(segment.description);
  let quantity = 100;
  let price = segment.amount;
  const qtyAt = description.match(QTY_AT);
  const atQty = description.match(AT_QTY);
  // "5 hours at" / "3 at" — quantity at the end of the segment, price in the amount.
  const trailingQty = description.match(/(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|units?|pcs?|pieces?|days?|sessions?|consultations?|retainers?|months?|weeks?)?\s*(?:at|@|×|x)\s*$/i);
  if (qtyAt) {
    const q = Number(qtyAt[1]);
    const p = toCents(qtyAt[2]);
    if (Number.isFinite(q) && q > 0 && p) {
      quantity = Math.round(q * 100);
      price = p;
      description = description.replace(qtyAt[0], '').trim();
    }
  } else if (atQty) {
    const p = toCents(atQty[1]);
    const q = Number(atQty[2]);
    if (p && Number.isFinite(q) && q > 0) {
      price = p;
      quantity = Math.round(q * 100);
      description = description.replace(atQty[0], '').trim();
    }
  } else if (trailingQty && segment.amount) {
    const q = Number(trailingQty[1]);
    if (Number.isFinite(q) && q > 0) {
      quantity = Math.round(q * 100);
      // Keep a unit word ("hours") but drop the bare number and the "at".
      description = description.replace(trailingQty[0], (trailingQty[2] || '').trim()).trim();
    }
  }
  if (!price) {
    // No amount in this segment: try to reuse a saved item price.
    const lower = description.toLowerCase();
    const hit = (items || []).find(i => lower.includes(String(i.name || '').toLowerCase()));
    if (hit && Number.isSafeInteger(hit.price) && hit.price >= 0) price = hit.price;
  }
  const cleanDesc = description
    .replace(QTY_AT, '')
    .replace(AT_QTY, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return {
    description: cleanDesc || description || 'Services',
    quantity,
    price,
    hasAmount: segment.amount !== null
  };
}

/**
 * Parse free text into a structured draft.
 * Returns { type, client, customerId, clientMatched, lines, dueDays, dueDate, vatMode, notes, confidence, warnings }.
 * Never throws on odd input: it degrades with warnings so the user can correct in review.
 */
export function parseDraft(text, state = {}) {
  const raw = normalise(text);
  if (!raw) return { type: 'invoice', client: '', customerId: null, clientMatched: false, lines: [], dueDays: 14, dueDate: addDays(today(), 14), vatMode: null, notes: '', confidence: 'low', warnings: ['Describe the work first.'] };
  if (raw.length > 2000) return { type: 'invoice', client: '', customerId: null, clientMatched: false, lines: [], dueDays: 14, dueDate: addDays(today(), 14), vatMode: null, notes: '', confidence: 'low', warnings: ['That description is too long. Keep it under 2,000 characters.'] };

  const type = /\b(quote|quotation)\b/i.test(raw) ? 'quote' : 'invoice';
  const warnings = [];

  const client = extractClient(raw, type, state.customers || []);
  if (!client.name) warnings.push('No client name was found. Add who this is for.');
  else if (!client.matched && (state.customers || []).length) warnings.push(`"${client.name}" is not one of your saved customers. You can add it when you confirm.`);

  const vatMode = extractVat(raw);
  const due = extractDue(raw);
  const notes = extractNotes(raw);

  const workText = removeClient(raw, type, client.name)
    // "R650 x 3" and "R650 × 3" become "3 at R650" so quantity and price stay together.
    .replace(/(?:R\s*)(\d[\d,]*(?:\.\d{1,2})?)\s*(?:x|×)\s*(\d+(?:\.\d+)?)/gi, (m, price, qty) => `${qty} at R${price}`);
  const segments = splitOnAmounts(workText).filter(s => s.amount !== null || cleanDescription(s.description));
  const lines = segments
    .map(s => buildLine(s, state.items || []))
    .filter(l => l.price > 0);

  if (!lines.length) {
    warnings.push('No amount was found. Include a price, for example R4,500.');
  }
  if (client.name && lines.length && lines.some(l => !l.hasAmount)) {
    warnings.push('Some lines reused a saved item price. Check them before confirming.');
  }

  const confidence = !lines.length ? 'low' : warnings.length ? 'medium' : 'high';
  return {
    type,
    client: client.name,
    customerId: client.customerId,
    clientMatched: client.matched,
    lines,
    dueDays: due.days ?? null,
    dueDate: due.date,
    vatMode,
    notes,
    confidence,
    warnings: [...new Set(warnings)]
  };
}

// Context summary used to steer both the local parser hints and the AI prompt.
export function draftContext(state = {}) {
  const customers = (state.customers || []).slice(0, 20).map(c => ({
    id: c.id, name: c.name, email: c.email || '', address: c.address || '',
    outstanding: (state.invoices || []).filter(i => i.customerId === c.id && i.state === 'issued')
      .reduce((a, i) => a + Math.max(0, i.lines.reduce((s, l) => s + Number((BigInt(l.quantity) * BigInt(l.price) + 50n) / 100n), 0)), 0)
  }));
  const items = (state.items || []).slice(0, 30).map(i => ({ id: i.id, name: i.name, price: i.price }));
  return {
    business: state.business || {},
    nonVat: !state.business || state.business.nonVat !== false,
    customers,
    items,
    recentInvoices: (state.invoices || []).slice(-10).map(i => ({
      number: i.number, customer: i.customer?.name || '', date: i.date, due: i.due,
      lines: i.lines.map(l => ({ description: l.description, quantity: l.quantity, price: l.price }))
    }))
  };
}

// Validate and normalise an AI-supplied draft into exactly the local shape.
export function normaliseDraft(input, state = {}) {
  const warnings = [];
  if (!input || typeof input !== 'object') throw new Error('The AI returned an unreadable draft.');
  const type = input.type === 'quote' ? 'quote' : 'invoice';
  let client = typeof input.client === 'string' ? input.client.trim().slice(0, 200) : '';
  if (!client && input.clientName) client = String(input.clientName).trim().slice(0, 200);
  const match = scoreClient(client, state.customers || []);
  if (!client) { client = 'New client'; warnings.push('The AI did not name a client. Confirm the name before saving.'); }
  const lines = Array.isArray(input.lines) ? input.lines : [];
  const cleanLines = [];
  for (const line of lines) {
    const description = String(line?.description ?? '').trim().slice(0, 300);
    const quantity = Number(line?.quantity);
    const price = Number(line?.price);
    if (!description) { warnings.push('A line had no description and was skipped.'); continue; }
    if (!Number.isFinite(price) || price <= 0) { warnings.push(`"${description}" had no valid price and was skipped.`); continue; }
    cleanLines.push({
      description,
      quantity: Number.isFinite(quantity) && quantity > 0 ? Math.round(quantity * 100) : 100,
      price: Math.round(price * 100)
    });
  }
  if (!cleanLines.length) throw new Error('The AI draft had no usable line items.');
  const dueDate = typeof input.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.dueDate) ? input.dueDate : addDays(today(), 14);
  const vatMode = ['inclusive', 'exclusive', 'zero', 'exempt'].includes(input.vatMode) ? input.vatMode : null;
  return {
    type, client, customerId: match.id, clientMatched: match.score >= 70,
    lines: cleanLines, dueDays: null, dueDate, vatMode,
    notes: (typeof input.notes === 'string' || typeof input.notes === 'number') ? String(input.notes).trim().slice(0, 3000) : '',
    confidence: 'high', warnings
  };
}
