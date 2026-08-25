import { prisma } from '@/lib/db/prisma'

export const PAYMENT_STATUSES = ['Pending', 'Paid'] as const
export const CAR_TYPES = ['New', 'PreOwned'] as const

export async function listLoans() {
  const rows = await prisma.loanManagement.findMany({
    include: {
      customer: true,
      partnerMaster: true,
    },
    orderBy: { loanManagementId: 'desc' },
  })

  const userIds = Array.from(new Set(rows.flatMap(row => [row.createdBy, row.updatedBy]).filter((id): id is number => typeof id === 'number')))
  const users = userIds.length
    ? await prisma.userTable.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, userName: true, displayName: true },
      })
    : []

  const userMap = new Map(users.map(user => [user.userId, user]))

  return rows.map(row => ({
    ...row,
    createdByUser: row.createdBy ? userMap.get(row.createdBy) ?? null : null,
    updatedByUser: row.updatedBy ? userMap.get(row.updatedBy) ?? null : null,
  }))
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
