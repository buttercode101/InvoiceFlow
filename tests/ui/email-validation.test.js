import { test, expect } from 'vitest'
import { validateEmail, sanitizeInput } from '../../src/lib/validation'

test('real-world: Invalid customer email format', () => {
  const isValid = validateEmail('invalid-email')
  expect(isValid).toBe(false)
})

test('real-world: Valid customer email format', () => {
  const isValid = validateEmail('test@example.com')
  expect(isValid).toBe(true)
})

test('real-world: Sanitize input', () => {
  const input = '<script>alert("xss")</script>'
  const sanitized = sanitizeInput(input)
  expect(sanitized).toBe('scriptalert("xss")/script')
})
