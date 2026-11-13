import { test, expect } from 'vitest';
import { emptyState, validateState } from '../../dist/core.js';

// These exercise the production validation path that runs on every save
// (commit -> validateState -> checkParty), not a parallel helper.

function stateWithCustomer(overrides = {}) {
  const s = emptyState();
  s.customers.push({
    id: 'cust_1',
    name: 'Test Customer',
    email: 'test@example.com',
    address: '1 Main Road, Cape Town',
    ...overrides
  });
  return s;
}

test('production validation rejects a malformed customer email', () => {
  const s = stateWithCustomer({ email: 'invalid-email' });
  expect(() => validateState(s)).toThrow(/Invalid name or email/);
});

test('production validation rejects an over-length customer email', () => {
  const s = stateWithCustomer({ email: `${'a'.repeat(250)}@example.com` });
  expect(() => validateState(s)).toThrow(/Invalid name or email/);
});

test('production validation accepts a well-formed customer email', () => {
  const s = stateWithCustomer({ email: 'test@example.com' });
  expect(() => validateState(s)).not.toThrow();
});

test('production validation allows a customer with no email at all', () => {
  const s = stateWithCustomer({ email: '' });
  expect(() => validateState(s)).not.toThrow();
});

test('production validation rejects a malformed business email', () => {
  const s = emptyState();
  s.business.name = 'Studio Mokoena';
  s.business.email = 'not-an-email';
  expect(() => validateState(s)).toThrow(/Invalid name or email/);
});
