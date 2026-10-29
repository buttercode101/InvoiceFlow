import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,cents,qty,lineTotal,total,balance,paid,status,createInvoice,issueInvoice,recordPayment,voidInvoice,validateState,cashSummary,expenseCSV,parseCSV,makeCSV,fingerprint,demoState,today,addDays,id,dateOK} from '../dist/core.js'

test('real-world: Invalid customer email format', () => {
  const s = emptyState()
  s.business = { name: 'Test Studio', address: '1 Test Road', email: 'test@example.com' }
  s.customers = [{ id: id(), name: 'Test Customer', email: 'invalid-email' }]
  assert.throws(() => validateState(s))
})
