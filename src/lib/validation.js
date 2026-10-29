
export function validateEmail(email) {
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.([a-zA-Z]{2,})$/;
  return re.test(email)
}

export function sanitizeInput(input) {
  return input.replace(/[<>]/g, '')
}
