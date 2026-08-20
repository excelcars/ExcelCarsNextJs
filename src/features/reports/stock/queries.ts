import { prisma } from '@/lib/db/prisma'
import type { Prisma } from '@prisma/client'

export interface StockFilters {
  search: string
  status: string
}

export async function listStock({ search, status }: StockFilters) {
  const where: Prisma.InventoryManagementWhereInput = {}

  if (status !== 'All') {
    where.status = status
  }

  if (search.trim()) {
    const q = search.trim()
    where.OR = [
      { registrationNo: { contains: q, mode: 'insensitive' } },
      { sku: { contains: q, mode: 'insensitive' } },
      { colour: { contains: q, mode: 'insensitive' } },
      { fuelType: { contains: q, mode: 'insensitive' } },
      { ownedBy: { contains: q, mode: 'insensitive' } },
      { mobileNoOwnedBy: { contains: q, mode: 'insensitive' } },
      { carVariantMaster: { carMakeMaster: { make: { contains: q, mode: 'insensitive' } } } },
      { carVariantMaster: { carModelMaster: { model: { contains: q, mode: 'insensitive' } } } },
    ]
  }

  return prisma.inventoryManagement.findMany({
    where,
    include: {
      carVariantMaster: { include: { carMakeMaster: true, carModelMaster: true } },
      _count: { select: { inventoryPhotos: true } },
    },
    orderBy: { inventoryId: 'desc' },
  })
}

export async function getPhotos(inventoryId: number) {
  return prisma.inventoryPhotos.findMany({ where: { fkInventoryId: inventoryId } })
}
