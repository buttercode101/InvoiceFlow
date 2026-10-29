import { encrypt, decrypt } from "./crypto"

export function secureStore(key, value) {
  try {
    const encrypted = encrypt(JSON.stringify(value))
    localStorage.setItem(key, encrypted)
    return true
  } catch (e) {
    console.error("Secure storage error:", e)
    return false
  }
}

export function secureRetrieve(key) {
  try {
    const encrypted = localStorage.getItem(key)
    if (!encrypted) return null
    const decrypted = decrypt(encrypted)
    return JSON.parse(decrypted)
  } catch (e) {
    console.error("Secure retrieval error:", e)
    return null
  }
}

export function secureRemove(key) {
  localStorage.removeItem(key)
}
