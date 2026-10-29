import { test, expect } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'

test('UI: Quote creation workflow', async () => {
  // Mock the app.js functions for testing
  const mockApp = {
    createQuote: () => ({ id: 'test-quote', status: 'draft', total: 1000 }),
    saveQuote: (quote) => ({ ...quote, status: 'saved' }),
    issueInvoice: (quote) => ({ ...quote, status: 'issued', invoiceId: 'INV-123' }),
    recordPayment: (invoice) => ({ ...invoice, status: 'paid', paymentDate: new Date().toISOString() })
  }
  
  // Mock the app.js functions in a DOM environment
  const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="app"></div></body></html>`)
  global.document = dom.window.document
  global.window = dom.window
  global.navigator = { userAgent: 'node.js' }
  
  // Mock the app.js functions in the global scope
  global.app = mockApp
  
  // Import the app.js functions (simulate loading)
  const app = await import('../dist/app.js')
  
  // Test quote creation
  const quote = app.createQuote()
  assert.strictEqual(quote.id, 'test-quote')
  assert.strictEqual(quote.status, 'draft')
  assert.strictEqual(quote.total, 1000)
})
