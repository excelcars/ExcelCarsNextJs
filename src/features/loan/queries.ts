import { prisma } from '@/lib/db/prisma'

export const PAYMENT_STATUSES = ['Pending', 'Paid'] as const
export const CAR_TYPES = ['New', 'PreOwned'] as const

export async function listLoans() {
  return prisma.loanManagement.findMany({
    include: {
      customer: true,
      partnerMaster: true,
    },
    orderBy: { loanManagementId: 'desc' },
  })
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
