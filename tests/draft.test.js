import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDraft, normaliseDraft, draftContext } from '../dist/draft.js';
import { emptyState, id, today, addDays, lineTotal } from '../dist/core.js';

function workspace() {
  const s = emptyState();
  s.business = { ...s.business, name: 'Test Studio', address: '1 Test Road', nonVat: true };
  s.customers = [
    { id: 'c1', name: 'Northline Studio', email: '', address: '2 Test Road' },
    { id: 'c2', name: 'Salt & Stone Café', email: '', address: '3 Test Road' }
  ];
  s.items = [
    { id: 'i1', name: 'Design consultation', price: 65000 },
    { id: 'i2', name: 'Brand identity design', price: 850000 }
  ];
  return s;
}

test('parses the documented quote example with client, description, amount and due days', () => {
  const d = parseDraft('Quote Northline Studio for monthly design retainer R8,000 due in 21 days', workspace());
  assert.equal(d.type, 'quote');
  assert.equal(d.client, 'Northline Studio');
  assert.equal(d.customerId, 'c1');
  assert.equal(d.clientMatched, true);
  assert.deepEqual(d.lines, [{ description: 'monthly design retainer', quantity: 100, price: 800000, hasAmount: true }]);
  assert.equal(d.dueDays, 21);
  assert.equal(d.dueDate, addDays(today(), 21));
  assert.equal(d.confidence, 'high');
});

test('parses the documented invoice example with an explicit for-prefix', () => {
  const d = parseDraft('Invoice for Northline Studio for logo design R4,500', workspace());
  assert.equal(d.type, 'invoice');
  assert.equal(d.client, 'Northline Studio');
  assert.deepEqual(d.lines, [{ description: 'logo design', quantity: 100, price: 450000, hasAmount: true }]);
  assert.equal(d.dueDays, 14);
});

test('parses a client that is not yet saved and flags it for review', () => {
  const d = parseDraft('Invoice Acme Works for website design R12,000', workspace());
  assert.equal(d.client, 'Acme Works');
  assert.equal(d.customerId, null);
  assert.equal(d.clientMatched, false);
  assert.ok(d.warnings.some(w => /not one of your saved customers/.test(w)));
});

test('splits multiple line items on and/plus/semicolon', () => {
  const d = parseDraft('Invoice Salt & Stone Café for logo design R4,500 and business cards R1,200', workspace());
  assert.equal(d.client, 'Salt & Stone Café');
  assert.equal(d.lines.length, 2);
  assert.equal(d.lines[0].description, 'logo design');
  assert.equal(d.lines[0].price, 450000);
  assert.equal(d.lines[1].description, 'business cards');
  assert.equal(d.lines[1].price, 120000);
});

test('parses quantity at a unit rate and amount-times-quantity', () => {
  const a = parseDraft('Invoice Northline Studio for 5 hours at R650', workspace());
  assert.equal(a.lines[0].quantity, 500);
  assert.equal(a.lines[0].price, 65000);
  const b = parseDraft('Invoice Northline Studio for design work R650 x 3', workspace());
  assert.equal(b.lines[0].price, 65000);
  assert.equal(b.lines[0].quantity, 300);
});

test('parses the app’s own money format (space thousands, comma decimals)', () => {
  // The app renders amounts as "R 4 500,00"; the co-pilot example tells users to
  // type exactly that, so the parser must not read it as R4.00.
  const formats = [
    'Invoice Northline Studio for logo design R 4 500,00 due in 14 days',
    'Invoice Northline Studio for logo design R 4 500 due in 14 days',
    'Invoice Northline Studio for logo design R4,500 due in 14 days',
    'Invoice Northline Studio for logo design R4500.00 due in 14 days',
    'Invoice Northline Studio for logo design 4500 ZAR due in 14 days'
  ];
  for (const text of formats) {
    const d = parseDraft(text, workspace());
    assert.equal(d.lines[0].price, 450000, text);
    assert.equal(d.lines[0].quantity, 100, text);
  }
});

test('detects VAT treatment wording without changing deterministic amounts', () => {
  assert.equal(parseDraft('Invoice Northline Studio for work R1,000 including VAT', workspace()).vatMode, 'inclusive');
  assert.equal(parseDraft('Invoice Northline Studio for work R1,000 excluding VAT', workspace()).vatMode, 'exclusive');
  assert.equal(parseDraft('Invoice Northline Studio for work R1,000 zero-rated', workspace()).vatMode, 'zero');
  assert.equal(parseDraft('Invoice Northline Studio for work R1,000 no VAT', workspace()).vatMode, 'exempt');
  assert.equal(parseDraft('Invoice Northline Studio for work R1,000', workspace()).vatMode, null);
});

test('reuses a saved item price when a line has no amount', () => {
  const d = parseDraft('Invoice Northline Studio for design consultation', workspace());
  assert.equal(d.lines.length, 1);
  assert.equal(d.lines[0].price, 65000);
  assert.equal(d.lines[0].hasAmount, false);
  assert.ok(d.warnings.some(w => /reused a saved item price/.test(w)));
});

test('degrades with warnings instead of throwing on empty or unusable input', () => {
  const empty = parseDraft('', workspace());
  assert.equal(empty.lines.length, 0);
  assert.equal(empty.confidence, 'low');
  assert.ok(empty.warnings.length);
  const noAmount = parseDraft('Invoice Northline Studio for mystery work', workspace());
  assert.equal(noAmount.lines.length, 0);
  assert.ok(noAmount.warnings.some(w => /No amount/.test(w)));
  const long = parseDraft('x'.repeat(2100), workspace());
  assert.equal(long.confidence, 'low');
});

test('keeps a trailing note separate from the line items', () => {
  const d = parseDraft('Invoice Northline Studio for logo design R4,500 note: deposit on approval', workspace());
  assert.equal(d.lines.length, 1);
  assert.equal(d.notes, 'deposit on approval');
});

test('normaliseDraft accepts a valid AI draft and fills context', () => {
  const out = normaliseDraft({
    type: 'quote', client: 'Northline Studio',
    lines: [{ description: 'Retainer', quantity: 1, price: 8000 }],
    dueDate: addDays(today(), 21), vatMode: 'exclusive', notes: 'Monthly'
  }, workspace());
  assert.equal(out.type, 'quote');
  assert.equal(out.customerId, 'c1');
  assert.deepEqual(out.lines, [{ description: 'Retainer', quantity: 100, price: 800000 }]);
  assert.equal(out.dueDate, addDays(today(), 21));
  assert.equal(out.vatMode, 'exclusive');
});

test('normaliseDraft rejects a draft with no usable lines', () => {
  assert.throws(() => normaliseDraft({ type: 'invoice', client: 'X', lines: [{ description: '', price: 0 }] }, workspace()), /no usable line/);
  assert.throws(() => normaliseDraft(null, workspace()), /unreadable/);
});

test('normaliseDraft coerces unsafe AI output into the local shape', () => {
  const out = normaliseDraft({
    type: 'invoice', client: 'Salt & Stone Café',
    lines: [{ description: 'Design', quantity: '2', price: '4500.5' }, { description: 'Bad', price: -1 }],
    dueDate: 'not-a-date', vatMode: 'bogus', notes: 42
  }, workspace());
  assert.equal(out.lines.length, 1);
  assert.equal(out.lines[0].quantity, 200);
  assert.equal(out.lines[0].price, 450050);
  assert.equal(out.dueDate, addDays(today(), 14));
  assert.equal(out.vatMode, null);
  assert.equal(out.notes, '42');
  assert.ok(out.warnings.some(w => /no valid price/.test(w)));
});

test('co-pilot review units round-trip without double division', () => {
  // Regression: the review template divided by 100 twice (decimal(l.quantity/100)),
  // so an AI draft of qty 1 / R4500 rendered as 0.01 / R45.00 and saved 100x too small.
  const decimal = n => (n / 100).toFixed(2);
  const out = normaliseDraft({
    type: 'invoice', client: 'Salt & Stone Café',
    lines: [{ description: 'Logo design', quantity: 1, price: 4500 }]
  }, workspace());
  const l = out.lines[0];
  assert.equal(decimal(l.quantity), '1.00', 'quantity must render as 1.00, not 0.01');
  assert.equal(decimal(l.price), '4500.00', 'price must render as 4500.00, not 45.00');
  assert.equal(lineTotal(l), 450000, 'line total must be R4500.00 in cents');
});

test('draftContext summarises customers, items and recent invoice lines', () => {
  const s = workspace();
  s.invoices.push({
    id: 'inv1', number: 'INV-0001', customerId: 'c1', customer: s.customers[0],
    business: s.business, date: today(), due: today(),
    lines: [{ description: 'Brand identity design', quantity: 100, price: 850000 }],
    state: 'issued', payments: []
  });
  const ctx = draftContext(s);
  assert.equal(ctx.customers.length, 2);
  assert.equal(ctx.items.length, 2);
  assert.equal(ctx.recentInvoices.length, 1);
  assert.equal(ctx.recentInvoices[0].lines[0].price, 850000);
});
