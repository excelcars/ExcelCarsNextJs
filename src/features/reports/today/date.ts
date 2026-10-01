export const INDIA_TIME_ZONE = 'Asia/Kolkata'
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function isValidDateKey(value: string) {
  if (!DATE_KEY_PATTERN.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export function indiaDateKey(value: Date | string = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: INDIA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value))
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(entry => entry.type === type)?.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function formatIndiaDate(value: Date | string | null) {
  if (!value) return ''
  const [year, month, day] = indiaDateKey(value).split('-')
  return `${day}/${month}/${year}`
}

export function indiaDateRange(fromDate: string, toDate: string) {
  const error = validateIndiaDateRange(fromDate, toDate)
  if (error) throw new Error(error)

  return {
    from: new Date(`${fromDate}T00:00:00.000+05:30`),
    to: new Date(`${toDate}T23:59:59.999+05:30`),
  }
}

export function validateIndiaDateRange(fromDate: string, toDate: string) {
  if (!isValidDateKey(fromDate) || !isValidDateKey(toDate)) return 'Enter valid From and To dates.'
  if (fromDate > toDate) return 'From date cannot be after To date.'
  return null
}
