export interface ExceptionFilters {
  fromDate: string
  toDate: string
  userId: number | null
  page: number
}

export interface ExceptionFilterInput {
  fromDate?: string
  toDate?: string
  userId?: string
  page?: string
}

export interface NormalizedExceptionFilters {
  filters: ExceptionFilters
  error: string | null
}

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const POSITIVE_INTEGER_PATTERN = /^[1-9]\d*$/
export const EXCEPTION_PAGE_SIZE = 25

export function isValidExceptionDate(value: string) {
  if (!DATE_KEY_PATTERN.test(value)) return false

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function normalizeOptionalDate(value: string | undefined) {
  const normalized = value?.trim() ?? ''
  return normalized && !isValidExceptionDate(normalized) ? null : normalized
}

function normalizePage(value: string | undefined) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

export function clampExceptionPage(page: number, total: number) {
  const pageCount = Math.max(1, Math.ceil(total / EXCEPTION_PAGE_SIZE))
  return Math.min(Math.max(1, page), pageCount)
}

export function normalizeExceptionFilters(input: ExceptionFilterInput): NormalizedExceptionFilters {
  const fromDate = normalizeOptionalDate(input.fromDate)
  const toDate = normalizeOptionalDate(input.toDate)
  const page = normalizePage(input.page)

  if (fromDate === null || toDate === null) {
    return { filters: { fromDate: '', toDate: '', userId: null, page }, error: 'Enter valid From and To dates.' }
  }
  if (fromDate && toDate && fromDate > toDate) {
    return { filters: { fromDate, toDate, userId: null, page }, error: 'From date cannot be after To date.' }
  }

  const rawUserId = input.userId?.trim() ?? ''
  if (rawUserId && !POSITIVE_INTEGER_PATTERN.test(rawUserId)) {
    return { filters: { fromDate, toDate, userId: null, page }, error: 'Select a valid user.' }
  }

  return {
    filters: { fromDate, toDate, userId: rawUserId ? Number(rawUserId) : null, page },
    error: null,
  }
}
