export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return true // empty is handled by required check
  const trimmed = email.trim()
  if (trimmed === '') return true
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(trimmed)
}

export function isValidPhone(phone: string | null | undefined): boolean {
  if (!phone) return true // empty is handled by required check
  const trimmed = phone.trim()
  if (trimmed === '') return true
  const regex = /^\d{10}$/
  return regex.test(trimmed)
}

export function isValidYear(year: number | string | null | undefined): boolean {
  if (year === null || year === undefined || year === '') return true
  const val = Number(year)
  if (Number.isNaN(val)) return false
  const currentYear = new Date().getFullYear()
  return val >= 1900 && val <= currentYear + 1
}
