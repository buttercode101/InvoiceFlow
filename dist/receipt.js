// Receipt photo helpers — deterministic, local-first.
// A photo alone cannot be read without OCR, so this module does two things:
//   1. parses a text blob (from the optional BYOK vision step, or typed text)
//      into a structured expense draft; and
//   2. suggests a category from merchant/description keywords.
// Nothing here guesses a number it did not read: amount/date stay null unless
// the source actually contained them.

export const RECEIPT_CATEGORIES = ['Software', 'Travel', 'Office', 'Marketing', 'Supplies', 'Professional services', 'Other'];

const CATEGORY_KEYWORDS = {
  Software: ['software', 'subscription', 'adobe', 'microsoft', 'google', 'saas', 'hosting', 'domain', 'license', 'cloud', 'github', 'slack', 'zoom', 'dropbox', 'canva'],
  Travel: ['travel', 'flight', 'uber', 'taxi', 'fuel', 'petrol', 'parking', 'toll', 'train', 'bus', 'airbnb', 'hotel', 'accommodation', 'car rental'],
  Office: ['office', 'stationery', 'paper', 'printer', 'ink', 'furniture', 'desk', 'chair', 'stapler', 'notebook', 'toner'],
  Marketing: ['marketing', 'advertising', 'ads', 'facebook', 'instagram', 'banner', 'promo', 'brand', 'printing', 'signage'],
  Supplies: ['supplies', 'material', 'packaging', 'cleaning', 'tools', 'hardware', 'timber', 'fabric', 'ink', 'toner'],
  'Professional services': ['accountant', 'bookkeeping', 'legal', 'audit', 'consulting', 'bank fee', 'interest', 'insurance', 'tax'],
};

export function suggestCategory(text = '') {
  const t = String(text).toLowerCase();
  let best = null, bestScore = 0;
  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const w of words) if (t.includes(w)) score++;
    if (score > bestScore) { bestScore = score; best = cat; }
  }
  return best || 'Other';
}

export function normalizeReceiptDraft(draft = {}) {
  const out = { description: '', amount: 0, date: null, category: 'Other' };
  out.description = String(draft.description ?? draft.vendor ?? draft.merchant ?? '').trim().slice(0, 300);
  const n = Number(draft.amount);
  out.amount = Number.isFinite(n) && n > 0 && Number.isSafeInteger(Math.round(n)) ? Math.round(n) : 0;
  out.date = typeof draft.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(draft.date) ? draft.date : null;
  out.category = RECEIPT_CATEGORIES.includes(draft.category) ? draft.category : 'Other';
  return out;
}

// Parses either a JSON object (preferred, from the BYOK vision step) or a plain
// text receipt into a normalised draft. Unreadable fields stay null/0.
export function parseReceiptText(text) {
  if (typeof text !== 'string' || !text.trim()) throw Error('No receipt text to read.');
  const raw = text.trim();
  if (raw.startsWith('{')) {
    try {
      const j = JSON.parse(raw);
      if (j && typeof j === 'object') {
        return normalizeReceiptDraft({
          description: j.description ?? j.vendor ?? j.merchant ?? j.name ?? '',
          amount: j.amount != null ? Math.round(Number(j.amount) * 100) : 0,
          date: j.date ?? null,
          category: j.category ?? 'Other',
        });
      }
    } catch { /* not JSON — fall through to text parsing */ }
  }
  const out = { description: '', amount: 0, date: null, category: 'Other' };
  const amt = raw.match(/R\s?([\d\s]+[.,]\d{2})\b/i) || raw.match(/\b(\d[\d\s]*[.,]\d{2})\b/);
  if (amt) {
    const n = Number(amt[1].replace(/[\s]/g, '').replace(',', '.'));
    if (Number.isFinite(n) && n > 0) out.amount = Math.round(n * 100);
  }
  const iso = raw.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  const dmy = raw.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](20\d{2})\b/);
  if (iso) out.date = iso[1];
  else if (dmy) {
    const d = Number(dmy[1]), m = Number(dmy[2]);
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12) out.date = `${dmy[3]}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  const lines = raw.split(/\n+/).map(l => l.trim()).filter(Boolean);
  const vendor = lines.find(l => !/^[\d\s.,R:/-]+$/.test(l) && !/total|vat|tax|change|tender|card|receipt|invoice|date|time|cash/i.test(l));
  out.description = (vendor || lines[0] || 'Receipt').slice(0, 300);
  out.category = suggestCategory(raw);
  return out;
}

// Context that makes the one-tap confirmation smarter: the category this
// business uses most, and recent expenses for quick reuse.
export function receiptDraftContext(state = {}) {
  const counts = {};
  for (const e of (state.expenses || [])) counts[e.category] = (counts[e.category] || 0) + 1;
  const usualCategory = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Other';
  const recent = [...(state.expenses || [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10)
    .map(e => ({ description: e.description, category: e.category, amount: e.amount }));
  return { usualCategory, recent };
}
