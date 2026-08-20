import { prisma } from '@/lib/db/prisma'

export const PAYOUT_STATUSES = ['Pending', 'Paid'] as const
export const POLICY_STATUSES = ['Pending', 'Received'] as const
export const CAR_TYPES = ['New', 'PreOwned'] as const

export async function listInsurance() {
  return prisma.insuranceMain.findMany({
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
