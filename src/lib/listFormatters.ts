// Date inputs require ISO calendar dates. Match the UTC date used by list displays.
export function formatDateInput(value: Date | string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

export function formatListDate(value: Date | string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date)
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
