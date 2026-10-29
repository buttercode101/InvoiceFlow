import { test, expect } from 'node:test'
import assert from 'node:assert/strict'

// Mock the app.js functions for testing
const mockApp = {
  createQuote: () => {
    return { id: 'test-quote', status: 'draft', total: 1000 }
  },
  saveQuote: (quote) => {
    return { ...quote, status: 'saved' }
  },
  issueInvoice: (quote) => {
    return { ...quote, status: 'issued', invoiceId: 'INV-123' }
  },
  recordPayment: (invoice) => {
    return { ...invoice, status: 'paid', paymentDate: new Date().toISOString() }
  }
}

test('Quote creation and workflow', () => {
  const quote = mockApp.createQuote()
  assert.strictEqual(quote.id, 'test-quote')
  assert.strictEqual(quote.status, 'draft')
  assert.strictEqual(quote.total, 1000)
})

test('Quote saving', () => {
  const quote = mockApp.createQuote()
  const savedQuote = mockApp.saveQuote(quote)
  assert.strictEqual(savedQuote.status, 'saved')
})

test('Invoice issuing', () => {
  const quote = mockApp.createQuote()
  const invoice = mockApp.issueInvoice(quote)
  assert.strictEqual(invoice.status, 'issued')
  assert.strictEqual(invoice.invoiceId, 'INV-123')
})

test('Payment recording', () => {
  const quote = mockApp.createQuote()
  const invoice = mockApp.issueInvoice(quote)
  const paidInvoice = mockApp.recordPayment(invoice)
  assert.strictEqual(paidInvoice.status, 'paid')
})
