import { prisma } from '@/lib/db/prisma'
import type { Prisma } from '@prisma/client'

export const INVENTORY_STATUSES = ['In Stock', 'Booked', 'Loan Process', 'Not Available', 'Sold'] as const

export async function listInventory(search: string, status: string) {
  const where: Prisma.InventoryManagementWhereInput = {}

  if (status !== 'All') {
    where.status = status
  }

  if (search.trim()) {
    const q = search.trim()
    where.OR = [
      { registrationNo: { contains: q, mode: 'insensitive' } },
      { sku: { contains: q, mode: 'insensitive' } },
      { customerName: { contains: q, mode: 'insensitive' } },
      { carVariantMaster: { carMakeMaster: { make: { contains: q, mode: 'insensitive' } } } },
      { carVariantMaster: { carModelMaster: { model: { contains: q, mode: 'insensitive' } } } },
    ]
  }

  return prisma.inventoryManagement.findMany({
    where,
    include: {
      carVariantMaster: {
        include: { carMakeMaster: true, carModelMaster: true },
      },
    },
    orderBy: { inventoryId: 'desc' },
    take: 200,
  })
}

export async function getInventoryById(id: number) {
  return prisma.inventoryManagement.findUnique({
    where: { inventoryId: id },
    include: {
      carVariantMaster: {
        include: { carMakeMaster: true, carModelMaster: true },
      },
    },
  })
}

export async function getMakes() {
  return prisma.carMakeMaster.findMany({
    where: { make: { not: null } },
    orderBy: { make: 'asc' },
  })
}

export async function getModelsByMake(makeId: number) {
  return prisma.carModelMaster.findMany({
    where: { fkMakeId: makeId, model: { not: null } },
    orderBy: { model: 'asc' },
  })
}

export async function getVariantsByModel(modelId: number) {
  return prisma.carVariantMaster.findMany({
    where: { fkModelId: modelId, variant: { not: null } },
    orderBy: { variant: 'asc' },
  })
}

export async function getDealers() {
  return prisma.dealerMaster.findMany({
    select: { dealerId: true, dealerName: true, dealerEmail: true },
    orderBy: { dealerName: 'asc' },
  })
}
