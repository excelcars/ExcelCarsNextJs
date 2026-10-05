export function formatListDate(value: Date | string | null | undefined) {
  return value ? new Date(value).toISOString().slice(0, 10) : ''
}

export function formatListMoney(value: string | number | null | undefined) {
  return value ? `₹${Number(value).toLocaleString('en-IN')}` : '—'
}

export function normalizeIntegerInput(value: string) {
  return value.replace(/\D/g, '')
}

export function formatIndianNumberInput(value: string) {
  const digits = normalizeIntegerInput(value)
  return digits ? Number(digits).toLocaleString('en-IN') : ''
}

const JUNK_VALUES = new Set(['null', 'na', 'n/a'])

export function cleanListValue(value: string | null | undefined) {
  return !value || JUNK_VALUES.has(value.trim().toLowerCase()) ? '' : value
}

export function formatListDateTime(value: Date | string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('en-IN', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}
