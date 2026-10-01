export const OUTSTANDING_TYPES = ['All', 'RTO', 'Insurance', 'Loan'] as const
export const OUTSTANDING_PAYMENT_STATUSES = ['All', 'Pending', 'Partial', 'Paid', 'Partially Paid', 'Fully Paid'] as const
export const OUTSTANDING_PAGE_SIZES = [25, 50, 100] as const

export type OutstandingType = Exclude<(typeof OUTSTANDING_TYPES)[number], 'All'>

export interface OutstandingFilters {
  customerName: string
  customerMobile: string
  registrationNo: string
  type: (typeof OUTSTANDING_TYPES)[number]
  paymentStatus: (typeof OUTSTANDING_PAYMENT_STATUSES)[number]
  page: number
  pageSize: number
}

export interface OutstandingRow {
  key: string
  type: OutstandingType
  registrationNo: string | null
  customerName: string | null
  customerMobile: string | null
  customerEmail: string | null
  paymentStatus: string | null
  followupDate: string | null
  remark: string | null
  totalAmount: number
  percentageOfPayout: number | null
  payoutAmount: number
  amountPaid: number
  balance: number
}

function sanitizePage(page: number) {
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1
}

function sanitizePageSize(pageSize: number) {
  if (!Number.isFinite(pageSize) || pageSize <= 0) return 25
  return OUTSTANDING_PAGE_SIZES.includes(pageSize as (typeof OUTSTANDING_PAGE_SIZES)[number]) ? pageSize : 25
}

export function normalizeOutstandingFilters(input: Partial<OutstandingFilters>): OutstandingFilters {
  return {
    customerName: input.customerName?.trim() ?? '',
    customerMobile: input.customerMobile?.trim() ?? '',
    registrationNo: input.registrationNo?.trim() ?? '',
    type: OUTSTANDING_TYPES.includes((input.type ?? 'All') as (typeof OUTSTANDING_TYPES)[number])
      ? (input.type ?? 'All') as (typeof OUTSTANDING_TYPES)[number]
      : 'All',
    paymentStatus: OUTSTANDING_PAYMENT_STATUSES.includes((input.paymentStatus ?? 'All') as (typeof OUTSTANDING_PAYMENT_STATUSES)[number])
      ? (input.paymentStatus ?? 'All') as (typeof OUTSTANDING_PAYMENT_STATUSES)[number]
      : 'All',
    page: sanitizePage(input.page ?? 1),
    pageSize: sanitizePageSize(input.pageSize ?? 25),
  }
}

export function calculateOutstandingBalance(
  payoutAmount: number | { toString(): string } | null | undefined,
  amountPaid: number | { toString(): string } | null | undefined,
) {
  return Number(payoutAmount ?? 0) - Number(amountPaid ?? 0)
}

export function getOutstandingDrillThroughHref(type: OutstandingType, registrationNo: string) {
  const registration = encodeURIComponent(registrationNo)
  if (type === 'RTO') return `/rto?registrationNo=${registration}`
  if (type === 'Insurance') return `/insurance?search=${registration}`
  return `/loan?search=${registration}`
}
