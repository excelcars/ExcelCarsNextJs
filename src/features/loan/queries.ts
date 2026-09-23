import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'

export const PAYMENT_STATUSES = ['Pending', 'Partial', 'Paid'] as const
export const CAR_TYPES = ['New', 'PreOwned'] as const

export const LOAN_PAGE_SIZES = [25, 50, 100] as const
export type LoanListFilters = { search?: string; registrationNo?: string; customerName?: string; customerMobile?: string; bankName?: string; bankPersonName?: string; paymentStatus?: string; fromDate?: string; toDate?: string; page?: number; pageSize?: number }

function buildLoanWhere(filters: LoanListFilters): Prisma.LoanManagementWhereInput {
  const where: Prisma.LoanManagementWhereInput = { AND: [] }
  const and = where.AND as Prisma.LoanManagementWhereInput[]
  const contains = (value?: string) => value?.trim() ? { contains: value.trim(), mode: 'insensitive' as const } : undefined
  const search = contains(filters.search)
  if (search) and.push({ OR: [{ registrationNo: search }, { bankName: search }, { customerNameLegacy: search }, { customer: { is: { custName: search } } }] })
  const registrationNo = contains(filters.registrationNo); if (registrationNo) and.push({ registrationNo })
  const customerName = contains(filters.customerName); if (customerName) and.push({ OR: [{ customerNameLegacy: customerName }, { customer: { is: { custName: customerName } } }] })
  const customerMobile = contains(filters.customerMobile); if (customerMobile) and.push({ OR: [{ customerMobileLegacy: customerMobile }, { customer: { is: { custMobile: customerMobile } } }] })
  const bankName = contains(filters.bankName); if (bankName) and.push({ bankName })
  const bankPersonName = contains(filters.bankPersonName); if (bankPersonName) and.push({ bankPersonName })
  if (filters.paymentStatus && filters.paymentStatus !== 'All') and.push({ paymentStatus: filters.paymentStatus })
  if (filters.fromDate) and.push({ entryDate: { gte: new Date(filters.fromDate) } })
  if (filters.toDate) { const end = new Date(filters.toDate); end.setUTCHours(23, 59, 59, 999); and.push({ entryDate: { lte: end } }) }
  return where
}

export async function listLoansForExport(filters: LoanListFilters = {}) {
  return prisma.loanManagement.findMany({ where: buildLoanWhere(filters), include: { customer: true, partnerMaster: true }, orderBy: { loanManagementId: 'desc' } })
}

export async function listLoans(filters: LoanListFilters = {}) {
  const pageSize = LOAN_PAGE_SIZES.includes(filters.pageSize as 25 | 50 | 100) ? filters.pageSize! : 25
  const where = buildLoanWhere(filters)
  const total = await prisma.loanManagement.count({ where })
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(Math.max(1, Math.floor(filters.page || 1)), pageCount)
  const rows = await prisma.loanManagement.findMany({
    where,
    include: {
      customer: true,
      partnerMaster: true,
    },
    orderBy: { loanManagementId: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  const userIds = Array.from(new Set(rows.flatMap(row => [row.createdBy, row.updatedBy]).filter((id): id is number => typeof id === 'number')))
  const users = userIds.length
    ? await prisma.userTable.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, userName: true, displayName: true },
      })
    : []

  const userMap = new Map(users.map(user => [user.userId, user]))

  return { rows: rows.map(row => ({
    ...row,
    createdByUser: row.createdBy ? userMap.get(row.createdBy) ?? null : null,
    updatedByUser: row.updatedBy ? userMap.get(row.updatedBy) ?? null : null,
  })), total, page, pageSize, pageCount }
}

export async function getPaymentHistory(loanManagementId: number) {
  const [payments, followups] = await Promise.all([
    prisma.loanPaymentDetails.findMany({
      where: { fkLoanManagementId: loanManagementId },
      orderBy: { createdDt: 'desc' },
    }),
    prisma.loanFollowupDetails.findMany({
      where: { fkLoanManagementId: loanManagementId },
      orderBy: { createdDt: 'desc' },
    }),
  ])
  return {
    payments: payments.map(p => ({
      ...p,
      loanAmount: p.loanAmount ? p.loanAmount.toString() : null,
      payoutAmount: p.payoutAmount ? p.payoutAmount.toString() : null,
      amountPaid: p.amountPaid ? p.amountPaid.toString() : null,
    })),
    followups,
  }
}

export async function getVehicles() {
  return prisma.inventoryManagement.findMany({
    select: {
      inventoryId: true,
      fkVariantId: true,
      registrationNo: true,
      sku: true,
      year: true,
      carVariantMaster: {
        select: { variant: true, carMakeMaster: { select: { make: true } }, carModelMaster: { select: { model: true } } },
      },
    },
    orderBy: { inventoryId: 'desc' },
  })
}
