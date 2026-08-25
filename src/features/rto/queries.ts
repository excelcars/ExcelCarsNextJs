import { prisma } from '@/lib/db/prisma'

export const PAYMENT_STATUSES = ['Pending', 'Partially Paid', 'Fully Paid'] as const
export const RC_STATUSES = ['Pending', 'Received'] as const
export const TRANSFER_STATUSES = ['Pending', 'Done'] as const
export const CAR_TYPES = ['New', 'PreOwned'] as const

export async function listRtoAgents() {
  return prisma.rtoAgent.findMany({
    include: {
      customer: true,
      partnerMaster: true,
      createdByUser: { select: { userName: true, displayName: true } },
      updatedByUser: { select: { userName: true, displayName: true } },
    },
    orderBy: { rtoAgentMainId: 'desc' },
  })
}

export async function getPaymentHistory(rtoAgentMainId: number) {
  const [payments, followups] = await Promise.all([
    prisma.rtoPaymentDetails.findMany({
      where: { fkRtoAgentMainId: rtoAgentMainId },
      orderBy: { createdDt: 'desc' },
    }),
    prisma.rtoFollowupDetails.findMany({
      where: { fkRtoAgentMainId: rtoAgentMainId },
      orderBy: { createdDt: 'desc' },
    }),
  ])
  return {
    payments: payments.map(p => ({
      ...p,
      transferCharges: p.transferCharges ? p.transferCharges.toString() : null,
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
