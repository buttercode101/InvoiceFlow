const crypto = require('crypto')
const algorithm = 'aes-256-cbc'
const key = crypto.randomBytes(32).toString('hex')
const iv = crypto.randomBytes(16)

export function encrypt(text) {
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv)
  let encrypted = cipher.update(text)
  encrypted = Buffer.concat([encrypted, cipher.final()])
  return Buffer.concat([iv, encrypted]).toString('base64')
}

export function decrypt(text) {
  const buffer = Buffer.from(text, 'base64')
  const iv = buffer.slice(0, 16)
  const encryptedText = buffer.slice(16)
  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), iv)
  let decrypted = decipher.update(encryptedText)
  decrypted = Buffer.concat([decrypted, decipher.final()])
  return decrypted.toString()
}
