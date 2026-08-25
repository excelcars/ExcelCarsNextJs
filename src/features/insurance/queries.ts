import { prisma } from '@/lib/db/prisma'

export const PAYOUT_STATUSES = ['Pending', 'Paid'] as const
export const POLICY_STATUSES = ['Pending', 'Received'] as const
export const CAR_TYPES = ['New', 'PreOwned'] as const
const INSURANCE_PAGE_SIZE = 25

function buildInsuranceWhere(search: string, fromDate = '', toDate = '') {
  const q = search.trim()
  const where: Record<string, unknown> = {}

  if (fromDate || toDate) {
    where.entryDate = {
      ...(fromDate ? { gte: new Date(fromDate) } : {}),
      ...(toDate ? { lte: new Date(toDate) } : {}),
    }
  }

  if (!q) return where

  return {
    ...where,
    OR: [
      { carRegistrationNo: { contains: q, mode: 'insensitive' as const } },
      { customerNameLegacy: { contains: q, mode: 'insensitive' as const } },
      { customerMobileLegacy: { contains: q, mode: 'insensitive' as const } },
      { customerEmailLegacy: { contains: q, mode: 'insensitive' as const } },
      { agentNameLegacy: { contains: q, mode: 'insensitive' as const } },
      { agentMobileNoLegacy: { contains: q, mode: 'insensitive' as const } },
      { agentEmailIdLegacy: { contains: q, mode: 'insensitive' as const } },
      { carMakeLegacy: { contains: q, mode: 'insensitive' as const } },
      { carModelLegacy: { contains: q, mode: 'insensitive' as const } },
      { carVariantLegacy: { contains: q, mode: 'insensitive' as const } },
      { customer: { custName: { contains: q, mode: 'insensitive' as const } } },
      { customer: { custMobile: { contains: q, mode: 'insensitive' as const } } },
      { customer: { custEmail: { contains: q, mode: 'insensitive' as const } } },
      { partnerMaster: { name: { contains: q, mode: 'insensitive' as const } } },
      { partnerMaster: { mobile: { contains: q, mode: 'insensitive' as const } } },
      { partnerMaster: { email: { contains: q, mode: 'insensitive' as const } } },
    ],
  }
}

export async function listInsurance({ search = '', page = 1, fromDate = '', toDate = '' }: { search?: string; page?: number; fromDate?: string; toDate?: string }) {
  const where = buildInsuranceWhere(search, fromDate, toDate)
  const safePage = Math.max(1, page || 1)

  const [rows, total] = await Promise.all([
    prisma.insuranceMain.findMany({
      where,
      include: {
        customer: true,
        partnerMaster: true,
      },
      orderBy: { insuranceMainId: 'desc' },
      skip: (safePage - 1) * INSURANCE_PAGE_SIZE,
      take: INSURANCE_PAGE_SIZE,
    }),
    prisma.insuranceMain.count({ where }),
  ])

  return {
    rows,
    total,
    page: safePage,
    pageCount: Math.max(1, Math.ceil(total / INSURANCE_PAGE_SIZE)),
    pageSize: INSURANCE_PAGE_SIZE,
  }
}

export async function listInsuranceForExport({ search = '', fromDate = '', toDate = '' }: { search?: string; fromDate?: string; toDate?: string }) {
  const where = buildInsuranceWhere(search, fromDate, toDate)
  return prisma.insuranceMain.findMany({
    where,
    include: {
      customer: true,
      partnerMaster: true,
    },
    orderBy: { insuranceMainId: 'desc' },
  })
}

export async function getPaymentHistory(insuranceMainId: number) {
  const [payments, followups] = await Promise.all([
    prisma.insurancePaymentDetails.findMany({
      where: { fkInsuranceMainId: insuranceMainId },
      orderBy: { createdDt: 'desc' },
    }),
    prisma.insuranceFollowupDetails.findMany({
      where: { fkInsuranceMainId: insuranceMainId },
      orderBy: { createdDt: 'desc' },
    }),
  ])
  return {
    payments: payments.map(p => ({
      ...p,
      amountReceived: p.amountReceived ? p.amountReceived.toString() : null,
      payoutAmount: p.payoutAmount ? p.payoutAmount.toString() : null,
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
