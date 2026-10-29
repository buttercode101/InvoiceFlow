import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,cents,qty,lineTotal,total,balance,paid,status,createInvoice,issueInvoice,recordPayment,voidInvoice,validateState,cashSummary,expenseCSV,parseCSV,makeCSV,fingerprint,demoState,today,addDays,id,dateOK} from '../dist/core.js'

test('real-world: Invalid customer email format', () => {
  const s = emptyState()
  s.customers = [{ id: id(), name: 'Test Customer', email: 'invalid-email' }]
  assert.throws(() => validateState(s))
})

test('real-world: Negative payment amount', () => {
  const s = emptyState()
  const invoiceId = createInvoice(s, { customerId: id(), date: today(), due: today(), lines: [{ description: 'Design', quantity: 100, price: 9999 }] })
  issueInvoice(s, invoiceId)
  assert.throws(() => recordPayment(s, invoiceId, { amount: -1, date: today(), reference: 'Invalid' }))
})
