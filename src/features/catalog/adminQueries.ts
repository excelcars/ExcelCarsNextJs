import { prisma } from '@/lib/db/prisma'
import type { Prisma } from '@prisma/client'

export const PAGE_SIZE = 25

export async function listCatalogSummary(search: string, page: number) {
  const q = search.trim()
  const where: Prisma.CarMakeMasterWhereInput = q ? { OR: [
    { make: { contains: q, mode: 'insensitive' } },
    { carModelMaster: { some: { model: { contains: q, mode: 'insensitive' } } } },
    { carVariantMaster: { some: { variant: { contains: q, mode: 'insensitive' } } } },
  ] } : {}
  const skip = Math.max(0, (page - 1) * PAGE_SIZE)
  const [rows, total] = await Promise.all([
    prisma.carMakeMaster.findMany({ where, orderBy: { make: 'asc' }, skip, take: PAGE_SIZE, include: {
      _count: { select: { carModelMaster: true, carVariantMaster: true } },
      carModelMaster: { orderBy: { model: 'asc' }, include: {
        _count: { select: { carVariantMaster: true } },
        carVariantMaster: { orderBy: { variant: 'asc' }, select: { pkVariantId: true, variant: true } },
      } },
    } }),
    prisma.carMakeMaster.count({ where }),
  ])
  return { rows, total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) }
}

export async function getCatalogMakes() {
  return prisma.carMakeMaster.findMany({ where: { make: { not: null } }, orderBy: { make: 'asc' } })
}
