export const EXCEPTION_REPORT_TIME_ZONE = 'Asia/Kolkata'

export function exceptionDateRange(fromDate: string, toDate: string) {
  return {
    ...(fromDate ? { from: new Date(`${fromDate}T00:00:00.000+05:30`) } : {}),
    ...(toDate ? { to: new Date(`${toDate}T23:59:59.999+05:30`) } : {}),
  }
}

export function formatExceptionDateTime(value: Date | string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: EXCEPTION_REPORT_TIME_ZONE,
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(value))
}
