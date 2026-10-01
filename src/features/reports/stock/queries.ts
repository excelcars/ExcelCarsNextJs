import { prisma } from '@/lib/db/prisma'
import type { Prisma } from '@prisma/client'

export interface StockFilters {
  search: string
  status: string
  make: string
  model: string
  variant: string
  colour: string
  fuelType: string
  ownerType: string
  ownerName: string
  ownerMobile: string
  registrationNo: string
}

export const STOCK_REPORT_PAGE_SIZES = [25, 50, 100] as const
export const STOCK_REPORT_SORTS = ['inventoryId_desc', 'registrationNo_asc', 'year_desc', 'kmsDriven_desc', 'price_desc', 'price_asc'] as const
export type StockReportSort = (typeof STOCK_REPORT_SORTS)[number]

export function normalizeStockFilters(input: Partial<StockFilters>): StockFilters {
  return {
    search: input.search?.trim() ?? '',
    status: input.status?.trim() || 'All',
    make: input.make?.trim() ?? '',
    model: input.model?.trim() ?? '',
    variant: input.variant?.trim() ?? '',
    colour: input.colour?.trim() ?? '',
    fuelType: input.fuelType?.trim() ?? '',
    ownerType: input.ownerType?.trim() ?? '',
    ownerName: input.ownerName?.trim() ?? '',
    ownerMobile: input.ownerMobile?.trim() ?? '',
    registrationNo: input.registrationNo?.trim() ?? '',
  }
}

export function normalizeStockPage(value: number | undefined) {
  return value !== undefined && Number.isFinite(value) && value > 0 ? Math.floor(value) : 1
}

export function normalizeStockPageSize(value: number | undefined) {
  return value !== undefined && STOCK_REPORT_PAGE_SIZES.includes(value as (typeof STOCK_REPORT_PAGE_SIZES)[number]) ? value : 25
}

export function normalizeStockSort(value: string | undefined): StockReportSort {
  return STOCK_REPORT_SORTS.includes(value as StockReportSort) ? value as StockReportSort : 'inventoryId_desc'
}

function contains(value: string): Prisma.StringNullableFilter | undefined {
  const trimmed = value.trim()
  return trimmed ? { contains: trimmed, mode: 'insensitive' } : undefined
}

function buildStockWhere({
  search,
  status,
  make,
  model,
  variant,
  colour,
  fuelType,
  ownerType,
  ownerName,
  ownerMobile,
  registrationNo,
}: StockFilters) {
  const where: Prisma.InventoryManagementWhereInput = {}
  const and: Prisma.InventoryManagementWhereInput[] = []

  if (status !== 'All') {
    where.status = status
  }

  if (search.trim()) {
    const q = search.trim()
    and.push({ OR: [
      { registrationNo: { contains: q, mode: 'insensitive' } },
      { sku: { contains: q, mode: 'insensitive' } },
      { colour: { contains: q, mode: 'insensitive' } },
      { fuelType: { contains: q, mode: 'insensitive' } },
      { ownedBy: { contains: q, mode: 'insensitive' } },
      { mobileNoOwnedBy: { contains: q, mode: 'insensitive' } },
      { carVariantMaster: { carMakeMaster: { make: { contains: q, mode: 'insensitive' } } } },
      { carVariantMaster: { carModelMaster: { model: { contains: q, mode: 'insensitive' } } } },
    ] })
  }

  const makeFilter = contains(make)
  if (makeFilter) and.push({ OR: [{ makeLegacy: makeFilter }, { carVariantMaster: { carMakeMaster: { make: makeFilter } } }] })
  const modelFilter = contains(model)
  if (modelFilter) and.push({ OR: [{ modelLegacy: modelFilter }, { carVariantMaster: { carModelMaster: { model: modelFilter } } }] })
  const variantFilter = contains(variant)
  if (variantFilter) and.push({ OR: [{ variantLegacy: variantFilter }, { carVariantMaster: { variant: variantFilter } }] })
  const colourFilter = contains(colour)
  if (colourFilter) and.push({ colour: colourFilter })
  const fuelTypeFilter = contains(fuelType)
  if (fuelTypeFilter) and.push({ fuelType: fuelTypeFilter })
  const ownerTypeFilter = contains(ownerType)
  if (ownerTypeFilter) and.push({ ownedType: ownerTypeFilter })
  const ownerNameFilter = contains(ownerName)
  if (ownerNameFilter) and.push({ ownedBy: ownerNameFilter })
  const ownerMobileFilter = contains(ownerMobile)
  if (ownerMobileFilter) and.push({ mobileNoOwnedBy: ownerMobileFilter })
  const registrationFilter = contains(registrationNo)
  if (registrationFilter) and.push({ registrationNo: registrationFilter })

  if (and.length) where.AND = and

  return where
}

const stockInclude = {
  carVariantMaster: { include: { carMakeMaster: true, carModelMaster: true } },
  _count: { select: { inventoryPhotos: true } },
} satisfies Prisma.InventoryManagementInclude

const STOCK_ORDER_BY: Record<StockReportSort, Prisma.InventoryManagementOrderByWithRelationInput> = {
  inventoryId_desc: { inventoryId: 'desc' },
  registrationNo_asc: { registrationNo: 'asc' },
  year_desc: { year: 'desc' },
  kmsDriven_desc: { kmsDriven: 'desc' },
  price_desc: { price: 'desc' },
  price_asc: { price: 'asc' },
}

export async function listStock(filters: StockFilters) {
  return prisma.inventoryManagement.findMany({
    where: buildStockWhere(filters),
    include: {
      carVariantMaster: { include: { carMakeMaster: true, carModelMaster: true } },
      _count: { select: { inventoryPhotos: true } },
    },
    orderBy: { inventoryId: 'desc' },
  })
}

export async function listStockPage(filters: StockFilters, pageInput: number, pageSizeInput: number, sortInput: string | undefined) {
  const requestedPage = normalizeStockPage(pageInput)
  const pageSize = normalizeStockPageSize(pageSizeInput)
  const sort = normalizeStockSort(sortInput)
  const where = buildStockWhere(filters)
  const [total, valueAggregate, statusGroups] = await Promise.all([
    prisma.inventoryManagement.count({ where }),
    prisma.inventoryManagement.aggregate({ where, _sum: { price: true } }),
    prisma.inventoryManagement.groupBy({ by: ['status'], where, _count: { _all: true } }),
  ])
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(requestedPage, pageCount)
  const rows = await prisma.inventoryManagement.findMany({
    where,
    include: stockInclude,
    orderBy: STOCK_ORDER_BY[sort],
    skip: (page - 1) * pageSize,
    take: pageSize,
  })
  return {
    rows,
    total,
    page,
    pageSize,
    pageCount,
    sort,
    totalValue: valueAggregate._sum.price?.toString() ?? null,
    statusCounts: statusGroups.map(group => ({ status: group.status ?? 'Unspecified', count: group._count._all })),
  }
}

export async function getPhotos(inventoryId: number) {
  return prisma.inventoryPhotos.findMany({ where: { fkInventoryId: inventoryId } })
}
