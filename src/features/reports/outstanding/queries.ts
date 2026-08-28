import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'

export const OUTSTANDING_TYPES = ['All', 'RTO', 'Insurance', 'Loan'] as const
export const OUTSTANDING_PAGE_SIZES = [25, 50, 100] as const

export type OutstandingType = Exclude<(typeof OUTSTANDING_TYPES)[number], 'All'>

export interface OutstandingFilters {
  customerName: string
  customerMobile: string
  registrationNo: string
  type: (typeof OUTSTANDING_TYPES)[number]
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
  totalAmount: number
  percentageOfPayout: number | null
  payoutAmount: number
  amountPaid: number
  balance: number
}

export interface OutstandingListResult {
  rows: OutstandingRow[]
  total: number
  totalBalance: number
  page: number
  pageSize: number
  pageCount: number
}

function normalizeText(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
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
    page: sanitizePage(input.page ?? 1),
    pageSize: sanitizePageSize(input.pageSize ?? 25),
  }
}

interface OutstandingRowRaw {
  key: string
  type: OutstandingType
  registrationNo: string | null
  customerName: string | null
  customerMobile: string | null
  customerEmail: string | null
  paymentStatus: string | null
  totalAmount: Prisma.Decimal | number | null
  percentageOfPayout: Prisma.Decimal | number | null
  payoutAmount: Prisma.Decimal | number | null
  amountPaid: Prisma.Decimal | number | null
  balance: Prisma.Decimal | number | null
}

function containsSql(value: string) {
  return `%${value}%`
}

function rawSql(value: string) {
  return Prisma.raw(value)
}

function buildRtoSelect(filters: OutstandingFilters) {
  const customerNameSql = rawSql(`COALESCE(NULLIF(BTRIM(c.cust_name), ''), NULLIF(BTRIM(r.customer_name_legacy), ''))`)
  const customerMobileSql = rawSql(`COALESCE(NULLIF(BTRIM(c.cust_mobile), ''), NULLIF(BTRIM(r.customer_mob_legacy), ''))`)
  const customerEmailSql = rawSql(`COALESCE(NULLIF(BTRIM(c.cust_email), ''), NULLIF(BTRIM(r.customer_email_legacy), ''))`)
  const registrationSql = rawSql(`NULLIF(BTRIM(r.car_registration_no), '')`)

  const conditions: Prisma.Sql[] = [
    Prisma.sql`(r.transfer_charges IS NOT NULL OR r.amt_paid IS NOT NULL)`,
  ]

  if (filters.customerName) conditions.push(Prisma.sql`${customerNameSql} ILIKE ${containsSql(filters.customerName)}`)
  if (filters.customerMobile) conditions.push(Prisma.sql`${customerMobileSql} ILIKE ${containsSql(filters.customerMobile)}`)
  if (filters.registrationNo) conditions.push(Prisma.sql`${registrationSql} ILIKE ${containsSql(filters.registrationNo)}`)

  return Prisma.sql`
    SELECT
      CONCAT('rto-', r.rto_agent_main_id) AS "key",
      'RTO' AS "type",
      ${registrationSql} AS "registrationNo",
      ${customerNameSql} AS "customerName",
      ${customerMobileSql} AS "customerMobile",
      ${customerEmailSql} AS "customerEmail",
      ${rawSql(`NULLIF(BTRIM(r.payment_status), '')`)} AS "paymentStatus",
      COALESCE(r.transfer_charges, 0) AS "totalAmount",
      NULL::numeric AS "percentageOfPayout",
      COALESCE(r.transfer_charges, 0) AS "payoutAmount",
      COALESCE(r.amt_paid, 0) AS "amountPaid",
      COALESCE(r.transfer_charges, 0) - COALESCE(r.amt_paid, 0) AS "balance"
    FROM rto_agent r
    LEFT JOIN customer c ON c.cust_id = r.customer_id
    WHERE ${Prisma.join(conditions, ' AND ')}
  `
}

function buildInsuranceSelect(filters: OutstandingFilters) {
  const customerNameSql = rawSql(`COALESCE(NULLIF(BTRIM(c.cust_name), ''), NULLIF(BTRIM(i.customer_name_legacy), ''))`)
  const customerMobileSql = rawSql(`COALESCE(NULLIF(BTRIM(c.cust_mobile), ''), NULLIF(BTRIM(i.customer_mobile_legacy), ''))`)
  const customerEmailSql = rawSql(`COALESCE(NULLIF(BTRIM(c.cust_email), ''), NULLIF(BTRIM(i.customer_email_legacy), ''))`)
  const registrationSql = rawSql(`NULLIF(BTRIM(i.car_registration_no), '')`)

  const conditions: Prisma.Sql[] = [
    Prisma.sql`(i.payout_amount IS NOT NULL OR i.total_amount_received IS NOT NULL)`,
  ]

  if (filters.customerName) conditions.push(Prisma.sql`${customerNameSql} ILIKE ${containsSql(filters.customerName)}`)
  if (filters.customerMobile) conditions.push(Prisma.sql`${customerMobileSql} ILIKE ${containsSql(filters.customerMobile)}`)
  if (filters.registrationNo) conditions.push(Prisma.sql`${registrationSql} ILIKE ${containsSql(filters.registrationNo)}`)

  return Prisma.sql`
    SELECT
      CONCAT('insurance-', i.insurance_main_id) AS "key",
      'Insurance' AS "type",
      ${registrationSql} AS "registrationNo",
      ${customerNameSql} AS "customerName",
      ${customerMobileSql} AS "customerMobile",
      ${customerEmailSql} AS "customerEmail",
      ${rawSql(`NULLIF(BTRIM(i.payout_payment_status), '')`)} AS "paymentStatus",
      COALESCE(i.o_d_premium, 0) AS "totalAmount",
      i.payout_percentage_od_premium AS "percentageOfPayout",
      COALESCE(i.payout_amount, 0) AS "payoutAmount",
      COALESCE(i.total_amount_received, 0) AS "amountPaid",
      COALESCE(i.payout_amount, 0) - COALESCE(i.total_amount_received, 0) AS "balance"
    FROM insurance_main i
    LEFT JOIN customer c ON c.cust_id = i.customer_id
    WHERE ${Prisma.join(conditions, ' AND ')}
  `
}

function buildLoanSelect(filters: OutstandingFilters) {
  const customerNameSql = rawSql(`COALESCE(NULLIF(BTRIM(c.cust_name), ''), NULLIF(BTRIM(l.customer_name_legacy), ''))`)
  const customerMobileSql = rawSql(`COALESCE(NULLIF(BTRIM(c.cust_mobile), ''), NULLIF(BTRIM(l.customer_mobile_legacy), ''))`)
  const customerEmailSql = rawSql(`COALESCE(NULLIF(BTRIM(c.cust_email), ''), NULLIF(BTRIM(l.customer_email_legacy), ''))`)
  const registrationSql = rawSql(`NULLIF(BTRIM(l.registration_no), '')`)

  const conditions: Prisma.Sql[] = [
    Prisma.sql`(l.payout_amount IS NOT NULL OR l.total_amount_received IS NOT NULL)`,
  ]

  if (filters.customerName) conditions.push(Prisma.sql`${customerNameSql} ILIKE ${containsSql(filters.customerName)}`)
  if (filters.customerMobile) conditions.push(Prisma.sql`${customerMobileSql} ILIKE ${containsSql(filters.customerMobile)}`)
  if (filters.registrationNo) conditions.push(Prisma.sql`${registrationSql} ILIKE ${containsSql(filters.registrationNo)}`)

  return Prisma.sql`
    SELECT
      CONCAT('loan-', l.loan_management_id) AS "key",
      'Loan' AS "type",
      ${registrationSql} AS "registrationNo",
      ${customerNameSql} AS "customerName",
      ${customerMobileSql} AS "customerMobile",
      ${customerEmailSql} AS "customerEmail",
      ${rawSql(`NULLIF(BTRIM(l.payment_status), '')`)} AS "paymentStatus",
      COALESCE(l.loan_amount, 0) AS "totalAmount",
      l.percentage_payout_amount AS "percentageOfPayout",
      COALESCE(l.payout_amount, 0) AS "payoutAmount",
      COALESCE(l.total_amount_received, 0) AS "amountPaid",
      COALESCE(l.payout_amount, 0) - COALESCE(l.total_amount_received, 0) AS "balance"
    FROM loan_management l
    LEFT JOIN customer c ON c.cust_id = l.customer_id
    WHERE ${Prisma.join(conditions, ' AND ')}
  `
}

function buildUnifiedCte(filters: OutstandingFilters) {
  const selects: Prisma.Sql[] = []

  if (filters.type === 'All' || filters.type === 'RTO') selects.push(buildRtoSelect(filters))
  if (filters.type === 'All' || filters.type === 'Insurance') selects.push(buildInsuranceSelect(filters))
  if (filters.type === 'All' || filters.type === 'Loan') selects.push(buildLoanSelect(filters))

  return Prisma.sql`
    WITH unified AS (
      ${Prisma.join(selects, ' UNION ALL ')}
    )
  `
}

function mapOutstandingRows(rows: OutstandingRowRaw[]): OutstandingRow[] {
  return rows.map(row => ({
    key: row.key,
    type: row.type,
    registrationNo: normalizeText(row.registrationNo),
    customerName: normalizeText(row.customerName),
    customerMobile: normalizeText(row.customerMobile),
    customerEmail: normalizeText(row.customerEmail),
    paymentStatus: normalizeText(row.paymentStatus),
    totalAmount: Number(row.totalAmount ?? 0),
    percentageOfPayout: row.percentageOfPayout === null ? null : Number(row.percentageOfPayout),
    payoutAmount: Number(row.payoutAmount ?? 0),
    amountPaid: Number(row.amountPaid ?? 0),
    balance: Number(row.balance ?? 0),
  }))
}

async function listOutstandingRows(filters: OutstandingFilters, page?: number, pageSize?: number) {
  const withUnified = buildUnifiedCte(filters)
  const pagination = typeof page === 'number' && typeof pageSize === 'number'
    ? Prisma.sql`LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`
    : Prisma.empty

  const rows = await prisma.$queryRaw<OutstandingRowRaw[]>(Prisma.sql`
    ${withUnified}
    SELECT
      "key",
      "type",
      "registrationNo",
      "customerName",
      "customerMobile",
      "customerEmail",
      "paymentStatus",
      "totalAmount",
      "percentageOfPayout",
      "payoutAmount",
      "amountPaid",
      "balance"
    FROM unified
    ORDER BY "balance" DESC, "type" ASC, "registrationNo" ASC NULLS LAST, "customerName" ASC NULLS LAST, "key" ASC
    ${pagination}
  `)

  return mapOutstandingRows(rows)
}

export async function listOutstanding(input: Partial<OutstandingFilters> = {}): Promise<OutstandingListResult> {
  const filters = normalizeOutstandingFilters(input)
  const withUnified = buildUnifiedCte(filters)
  const [{ total, totalBalance }] = await prisma.$queryRaw<Array<{ total: bigint | number; totalBalance: Prisma.Decimal | number | null }>>(Prisma.sql`
    ${withUnified}
    SELECT
      COUNT(*) AS "total",
      COALESCE(SUM("balance"), 0) AS "totalBalance"
    FROM unified
  `)
  const totalCount = Number(total ?? 0)
  const pageCount = Math.max(1, Math.ceil(totalCount / filters.pageSize))
  const page = Math.min(filters.page, pageCount)
  const rows = await listOutstandingRows(filters, page, filters.pageSize)

  return {
    rows,
    total: totalCount,
    totalBalance: Number(totalBalance ?? 0),
    page,
    pageSize: filters.pageSize,
    pageCount,
  }
}

export async function listOutstandingForExport(input: Partial<OutstandingFilters> = {}) {
  const filters = normalizeOutstandingFilters(input)
  return listOutstandingRows(filters)
}
