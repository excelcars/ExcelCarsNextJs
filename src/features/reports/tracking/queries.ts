import { prisma } from '@/lib/db/prisma'
import type { Prisma } from '@prisma/client'

export interface TrackingFilters {
  search: string
  make: string
  model: string
  variant: string
  colour: string
  fuelType: string
}

export const TRACKING_PAGE_SIZES = [25, 50, 100] as const

export function normalizeTrackingFilters(input: Partial<TrackingFilters>): TrackingFilters {
  return {
    search: input.search?.trim() ?? '', make: input.make?.trim() ?? '', model: input.model?.trim() ?? '',
    variant: input.variant?.trim() ?? '', colour: input.colour?.trim() ?? '', fuelType: input.fuelType?.trim() ?? '',
  }
}

export function normalizeTrackingPage(value: number | undefined) { return value !== undefined && Number.isFinite(value) && value > 0 ? Math.floor(value) : 1 }
export function normalizeTrackingPageSize(value: number | undefined) { return value !== undefined && TRACKING_PAGE_SIZES.includes(value as (typeof TRACKING_PAGE_SIZES)[number]) ? value : 25 }
function exact(value: string): Prisma.StringNullableFilter | undefined { return value.trim() ? { equals: value.trim(), mode: 'insensitive' } : undefined }

export function buildTrackingWhere(filters: TrackingFilters): Prisma.InventoryManagementWhereInput {
  const and: Prisma.InventoryManagementWhereInput[] = []
  if (filters.search) and.push({ OR: [
    { registrationNo: { contains: filters.search, mode: 'insensitive' } }, { sku: { contains: filters.search, mode: 'insensitive' } },
    { makeLegacy: { contains: filters.search, mode: 'insensitive' } }, { modelLegacy: { contains: filters.search, mode: 'insensitive' } }, { variantLegacy: { contains: filters.search, mode: 'insensitive' } },
    { carVariantMaster: { carMakeMaster: { make: { contains: filters.search, mode: 'insensitive' } } } }, { carVariantMaster: { carModelMaster: { model: { contains: filters.search, mode: 'insensitive' } } } }, { carVariantMaster: { variant: { contains: filters.search, mode: 'insensitive' } } },
  ] })
  const make = exact(filters.make); if (make) and.push({ OR: [{ makeLegacy: make }, { carVariantMaster: { carMakeMaster: { make } } }] })
  const model = exact(filters.model); if (model) and.push({ OR: [{ modelLegacy: model }, { carVariantMaster: { carModelMaster: { model } } }] })
  const variant = exact(filters.variant); if (variant) and.push({ OR: [{ variantLegacy: variant }, { carVariantMaster: { variant } }] })
  const colour = exact(filters.colour); if (colour) and.push({ colour })
  const fuelType = exact(filters.fuelType); if (fuelType) and.push({ fuelType })
  return and.length ? { AND: and } : {}
}

const trackingInclude = { customer: { select: { custName: true, custMobile: true, custAddress: true, custEmail: true } }, carVariantMaster: { include: { carMakeMaster: true, carModelMaster: true } } } satisfies Prisma.InventoryManagementInclude

export async function listTrackingStock(filters: TrackingFilters, pageInput: number, pageSizeInput: number) {
  const pageSize = normalizeTrackingPageSize(pageSizeInput), requestedPage = normalizeTrackingPage(pageInput), where = buildTrackingWhere(filters)
  const total = await prisma.inventoryManagement.count({ where }); const pageCount = Math.max(1, Math.ceil(total / pageSize)); const page = Math.min(requestedPage, pageCount)
  const rows = await prisma.inventoryManagement.findMany({ where, include: trackingInclude, orderBy: { inventoryId: 'desc' }, skip: (page - 1) * pageSize, take: pageSize })
  return { rows, total, page, pageSize, pageCount }
}

export async function listTrackingExport(filters: TrackingFilters) { return prisma.inventoryManagement.findMany({ where: buildTrackingWhere(filters), include: trackingInclude, orderBy: { inventoryId: 'desc' } }) }

export async function getTrackingMakes() { return prisma.carMakeMaster.findMany({ where: { make: { not: null } }, select: { pkMakeId: true, make: true }, orderBy: { make: 'asc' } }) }

export async function getVehicleDetails(inventoryId: number) {
  const vehicle = await prisma.inventoryManagement.findUnique({ where: { inventoryId }, include: trackingInclude })
  if (!vehicle) return null
  const registrationNo = vehicle.registrationNo
  const byInventoryOrRegistration = registrationNo ? { OR: [{ inventoryId }, { registrationNo }] } : { inventoryId }
  const byInventoryOrCarRegistration = registrationNo ? { OR: [{ inventoryId }, { carRegistrationNo: registrationNo }] } : { inventoryId }
  const [checklist, insurance, rto, loan] = await Promise.all([
    prisma.checkListDocMain.findMany({ where: byInventoryOrRegistration, include: { checklistDocDetails: true }, orderBy: { documentId: 'desc' } }),
    prisma.insuranceMain.findMany({ where: byInventoryOrCarRegistration, include: { partnerMaster: true }, orderBy: { insuranceMainId: 'desc' } }),
    prisma.rtoAgent.findMany({ where: byInventoryOrCarRegistration, include: { partnerMaster: true }, orderBy: { rtoAgentMainId: 'desc' } }),
    prisma.loanManagement.findMany({ where: byInventoryOrRegistration, include: { partnerMaster: true }, orderBy: { loanManagementId: 'desc' } }),
  ])
  return { vehicle, checklist, insurance, rto, loan }
}
