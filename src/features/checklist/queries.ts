import { prisma } from '@/lib/db/prisma'

export async function listChecklists() {
  return prisma.checkListDocMain.findMany({
    include: {
      customer: true,
      checklistDocDetails: true,
    },
    orderBy: { documentId: 'desc' },
  })
}

export async function getVehicles() {
  return prisma.inventoryManagement.findMany({
    select: {
      inventoryId: true,
      registrationNo: true,
      sku: true,
      colour: true,
      year: true,
      fuelType: true,
      carVariantMaster: {
        select: { variant: true, carMakeMaster: { select: { make: true } }, carModelMaster: { select: { model: true } } },
      },
    },
    orderBy: { inventoryId: 'desc' },
  })
}
