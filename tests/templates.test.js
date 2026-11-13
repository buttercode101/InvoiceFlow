import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState, createTemplate, templateToLines, templateTotals, reminderSchedule, today, addDays} from '../dist/core.js';

function workspace(){
  const s=emptyState();
  s.business={...s.business,name:'Test Studio',address:'1 Test Road'};
  return s;
}

// Quantities and prices are stored in cents, matching invoice lines.

// createTemplate returns the new id, matching createInvoice/saveQuote.

test('createTemplate stores a validated template with a generated id', () => {
  const s = workspace();
  const id = createTemplate(s, {
    name: 'Basic Service Call',
    description: 'Diagnostic and call-out',
    lines: [{description: 'Diagnostic & trip fee', quantity: 1, price: 450}]
  });
  assert.equal(s.templates.length, 1);
  assert.equal(typeof id, 'string');
  assert.ok(id.length > 0);
  assert.equal(s.templates[0].id, id);
  assert.equal(s.templates[0].name, 'Basic Service Call');
  assert.equal(s.templates[0].lines.length, 1);
});

test('createTemplate converts human units to the stored cents representation', () => {
  const s = workspace();
  const id = createTemplate(s, {
    name: 'Retainer',
    lines: [{description: 'Monthly retainer', quantity: 1, price: 3500}]
  });
  assert.equal(s.templates[0].lines[0].quantity, 100);
  assert.equal(s.templates[0].lines[0].price, 350000);
});

test('createTemplate rejects an empty name', () => {
  const s = workspace();
  assert.throws(() => createTemplate(s, {name: '   ', lines: [{description: 'x', quantity: 1, price: 100}]}), /name/i);
});

test('createTemplate rejects a template with no lines', () => {
  const s = workspace();
  assert.throws(() => createTemplate(s, {name: 'Empty', lines: []}), /line/i);
});

test('createTemplate rejects an invalid line', () => {
  const s = workspace();
  assert.throws(() => createTemplate(s, {name: 'Bad', lines: [{description: '', quantity: 1, price: 100}]}), /description|line/i);
  assert.throws(() => createTemplate(s, {name: 'Bad', lines: [{description: 'x', quantity: 0, price: 100}]}), /quantity/i);
  assert.throws(() => createTemplate(s, {name: 'Bad', lines: [{description: 'x', quantity: 1, price: -1}]}), /price|amount/i);
});

test('createTemplate updates an existing template in place', () => {
  const s = workspace();
  const id = createTemplate(s, {name: 'First', lines: [{description: 'a', quantity: 1, price: 100}]});
  createTemplate(s, {id, name: 'Second', lines: [{description: 'b', quantity: 2, price: 200}]});
  assert.equal(s.templates.length, 1);
  assert.equal(s.templates[0].name, 'Second');
  assert.equal(s.templates[0].id, id);
});

test('templateToLines converts template lines into invoice lines', () => {
  const s = workspace();
  const id = createTemplate(s, {
    name: 'Retainer',
    lines: [
      {description: 'Monthly retainer', quantity: 1, price: 3500},
      {description: 'Extra hours', quantity: 2, price: 750}
    ]
  });
  assert.deepEqual(templateToLines(s.templates.find(t => t.id === id)), [
    {description: 'Monthly retainer', quantity: 100, price: 350000},
    {description: 'Extra hours', quantity: 200, price: 75000}
  ]);
});

test('templateTotals sums the template lines', () => {
  const s = workspace();
  const id = createTemplate(s, {
    name: 'Retainer',
    lines: [
      {description: 'Monthly retainer', quantity: 1, price: 3500},
      {description: 'Extra hours', quantity: 2, price: 750}
    ]
  });
  assert.equal(templateTotals(s, s.templates.find(t => t.id === id)).subtotal, 500000);
});

test('reminderSchedule reports the solo-bid reminder points for an unpaid issued invoice', () => {
  const base = {
    id: 'inv-1', number: 'INV-0001',
    customer: {id: 'c1', name: 'Client', email: '', address: ''},
    date: addDays(today(), -20), due: addDays(today(), 3),
    lines: [{description: 'Work', quantity: 100, price: 100000}],
    payments: [], credits: [], state: 'issued'
  };
  assert.equal(reminderSchedule(base, today()), 'soon');
  assert.equal(reminderSchedule(base, addDays(today(), 3)), 'today');
  assert.equal(reminderSchedule(base, addDays(today(), 10)), 'overdue7');
  assert.equal(reminderSchedule(base, addDays(today(), 17)), 'overdue14');
});

test('reminderSchedule returns null for a paid, draft or void invoice', () => {
  const base = {
    id: 'inv-1', number: 'INV-0001',
    customer: {id: 'c1', name: 'Client', email: '', address: ''},
    date: addDays(today(), -20), due: addDays(today(), 3),
    lines: [{description: 'Work', quantity: 100, price: 100000}],
    payments: [], credits: [], state: 'issued'
  };
  assert.equal(reminderSchedule({...base, state: 'draft'}, today()), null);
  assert.equal(reminderSchedule({...base, state: 'void'}, today()), null);
  assert.equal(reminderSchedule({...base, payments: [{id: 'p1', date: today(), amount: 100000}]}, today()), null);
});

test('reminderSchedule returns null on non-reminder days', () => {
  const base = {
    id: 'inv-1', number: 'INV-0001',
    customer: {id: 'c1', name: 'Client', email: '', address: ''},
    date: addDays(today(), -20), due: addDays(today(), 3),
    lines: [{description: 'Work', quantity: 100, price: 100000}],
    payments: [], credits: [], state: 'issued'
  };
  assert.equal(reminderSchedule(base, addDays(today(), 1)), null);
  assert.equal(reminderSchedule(base, addDays(today(), 5)), null);
});
