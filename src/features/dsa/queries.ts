import { prisma } from '@/lib/db/prisma'

export const PAYMENT_STATUSES = ['Pending', 'Paid'] as const

export async function listDsa() {
  return prisma.dsaManagement.findMany({
    include: {
      customer: true,
      partnerMaster: true,
    },
    orderBy: { dsaMainId: 'desc' },
  })
}

export async function getVehicles() {
  return prisma.inventoryManagement.findMany({
    select: {
      inventoryId: true,
      registrationNo: true,
      sku: true,
      customerId: true,
      customerName: true,
      mobileNoOwnedBy: true,
      emailIdOwnedBy: true,
      fkVariantId: true,
      carVariantMaster: {
        select: { variant: true, carMakeMaster: { select: { make: true } }, carModelMaster: { select: { model: true } } },
      },
    },
    orderBy: { inventoryId: 'desc' },
  })
}
