import { prisma } from '@/lib/db/prisma'
import type { Prisma } from '@prisma/client'
import { summarizeVehicleEmailInteractions } from '@/features/vehicleEmailLinks/service'

export { INVENTORY_STATUSES } from './inventoryConstants'

export interface InventoryListParams {
  inventoryIds?: number[]
  search?: string
  status?: string
  make?: string
  model?: string
  fuelType?: string
  inventoryNumber?: string
  sku?: string
  registrationNo?: string
  variant?: string
  colour?: string
  year?: string
  month?: string
  noOfOwners?: string
  tax?: string
  isCarRegistered?: string
  kmsMin?: string
  kmsMax?: string
  insuranceType?: string
  priceMin?: string
  priceMax?: string
  ownedType?: string
  ownedBy?: string
  mobileNoOwnedBy?: string
  emailIdOwnedBy?: string
  customerName?: string
  linkedCustomer?: string
  internalComments?: string
  otherRemarks?: string
  interestedInquiryWhere?: Prisma.InquiryWhereInput
  page?: number
  pageSize?: number
}

function buildInventoryWhere({
  inventoryIds,
  search = '',
  status = 'All',
  make = '',
  model = '',
  fuelType = '',
  inventoryNumber = '',
  sku = '',
  registrationNo = '',
  variant = '',
  colour = '',
  year = '',
  month = '',
  noOfOwners = '',
  tax = '',
  isCarRegistered = '',
  kmsMin = '',
  kmsMax = '',
  insuranceType = '',
  priceMin = '',
  priceMax = '',
  ownedType = '',
  ownedBy = '',
  mobileNoOwnedBy = '',
  emailIdOwnedBy = '',
  customerName = '',
  linkedCustomer = '',
  internalComments = '',
  otherRemarks = '',
}: InventoryListParams) {
  const where: Prisma.InventoryManagementWhereInput = {}
  const andConditions: Prisma.InventoryManagementWhereInput[] = []

  if (inventoryIds?.length) {
    where.inventoryId = { in: inventoryIds }
  }

  if (status !== 'All') {
    where.status = status
  }

  if (fuelType.trim()) {
    andConditions.push({ fuelType: { equals: fuelType.trim(), mode: 'insensitive' } })
  }

  if (make.trim()) {
    andConditions.push({
      OR: [
      { makeLegacy: { equals: make.trim(), mode: 'insensitive' } },
      { carVariantMaster: { carMakeMaster: { make: { equals: make.trim(), mode: 'insensitive' } } } },
      ],
    })
  }

  if (model.trim()) {
    andConditions.push({
      OR: [
        { modelLegacy: { equals: model.trim(), mode: 'insensitive' } },
        { carVariantMaster: { carModelMaster: { model: { equals: model.trim(), mode: 'insensitive' } } } },
      ],
    })
  }

  if (search.trim()) {
    const searchTerms = search.trim().split(/\s+/).filter(Boolean)
    for (const term of searchTerms) {
      andConditions.push({
        OR: [
          { registrationNo: { contains: term, mode: 'insensitive' } },
          { ownedBy: { contains: term, mode: 'insensitive' } },
          { mobileNoOwnedBy: { contains: term, mode: 'insensitive' } },
          { colour: { contains: term, mode: 'insensitive' } },
          { makeLegacy: { contains: term, mode: 'insensitive' } },
          { modelLegacy: { contains: term, mode: 'insensitive' } },
          { variantLegacy: { contains: term, mode: 'insensitive' } },
          { carVariantMaster: { carMakeMaster: { make: { contains: term, mode: 'insensitive' } } } },
          { carVariantMaster: { carModelMaster: { model: { contains: term, mode: 'insensitive' } } } },
        ],
      })
    }
  }

  if (inventoryNumber.trim()) {
    andConditions.push({ inventoryNumber: { contains: inventoryNumber.trim(), mode: 'insensitive' } })
  }

  if (sku.trim()) {
    andConditions.push({ sku: { contains: sku.trim(), mode: 'insensitive' } })
  }

  if (registrationNo.trim()) {
    andConditions.push({ registrationNo: { contains: registrationNo.trim(), mode: 'insensitive' } })
  }

  if (variant.trim()) {
    andConditions.push({
      OR: [
        { variantLegacy: { equals: variant.trim(), mode: 'insensitive' } },
        { carVariantMaster: { variant: { equals: variant.trim(), mode: 'insensitive' } } },
      ],
    })
  }

  if (colour.trim()) {
    andConditions.push({ colour: { equals: colour.trim(), mode: 'insensitive' } })
  }

  if (year.trim()) {
    const parsedYear = Number(year)
    if (Number.isFinite(parsedYear)) andConditions.push({ year: parsedYear })
  }

  if (month.trim()) {
    andConditions.push({ month: { equals: month.trim(), mode: 'insensitive' } })
  }

  if (noOfOwners.trim()) {
    const parsedOwners = Number(noOfOwners)
    if (Number.isFinite(parsedOwners)) andConditions.push({ noOfOwners: parsedOwners })
  }

  if (tax.trim()) {
    andConditions.push({ tax: { equals: tax.trim(), mode: 'insensitive' } })
  }

  if (isCarRegistered === 'yes' || isCarRegistered === 'no') {
    andConditions.push({ isCarRegistered: isCarRegistered === 'yes' })
  }

  if (kmsMin.trim() || kmsMax.trim()) {
    const kmsDriven: Prisma.DecimalNullableFilter<'InventoryManagement'> = {}
    const parsedMin = Number(kmsMin)
    const parsedMax = Number(kmsMax)
    if (kmsMin.trim() && Number.isFinite(parsedMin)) kmsDriven.gte = parsedMin
    if (kmsMax.trim() && Number.isFinite(parsedMax)) kmsDriven.lte = parsedMax
    if (Object.keys(kmsDriven).length > 0) andConditions.push({ kmsDriven })
  }

  if (insuranceType.trim()) {
    andConditions.push({ insuranceType: { equals: insuranceType.trim(), mode: 'insensitive' } })
  }

  if (priceMin.trim() || priceMax.trim()) {
    const price: Prisma.DecimalNullableFilter<'InventoryManagement'> = {}
    const parsedMin = Number(priceMin)
    const parsedMax = Number(priceMax)
    if (priceMin.trim() && Number.isFinite(parsedMin)) price.gte = parsedMin
    if (priceMax.trim() && Number.isFinite(parsedMax)) price.lte = parsedMax
    if (Object.keys(price).length > 0) andConditions.push({ price })
  }

  if (ownedType.trim()) {
    andConditions.push({ ownedType: { equals: ownedType.trim(), mode: 'insensitive' } })
  }

  if (ownedBy.trim()) {
    andConditions.push({ ownedBy: { contains: ownedBy.trim(), mode: 'insensitive' } })
  }

  if (mobileNoOwnedBy.trim()) {
    andConditions.push({ mobileNoOwnedBy: { contains: mobileNoOwnedBy.trim(), mode: 'insensitive' } })
  }

  if (emailIdOwnedBy.trim()) {
    andConditions.push({ emailIdOwnedBy: { contains: emailIdOwnedBy.trim(), mode: 'insensitive' } })
  }

  if (customerName.trim()) {
    andConditions.push({ customerName: { contains: customerName.trim(), mode: 'insensitive' } })
  }

  if (linkedCustomer.trim()) {
    andConditions.push({ customer: { custName: { contains: linkedCustomer.trim(), mode: 'insensitive' } } })
  }

  if (internalComments.trim()) {
    andConditions.push({ internalComments: { contains: internalComments.trim(), mode: 'insensitive' } })
  }

  if (otherRemarks.trim()) {
    andConditions.push({ otherRemarks: { contains: otherRemarks.trim(), mode: 'insensitive' } })
  }

  if (andConditions.length > 0) {
    where.AND = andConditions
  }

  return where
}

function inventoryListInclude() {
  return {
    customer: {
      select: { custId: true, custName: true, custAddress: true, custMobile: true, custEmail: true },
    },
    carVariantMaster: {
      include: { carMakeMaster: true, carModelMaster: true },
    },
    _count: {
      select: { inventoryPhotos: true, inventoryVideos: true, inventoryDocuments: true },
    },
  } satisfies Prisma.InventoryManagementInclude
}

export async function listInventory({
  page = 1,
  pageSize = 25,
  interestedInquiryWhere,
  ...filters
}: InventoryListParams) {
  const where = buildInventoryWhere(filters)
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1
  const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.min(Math.floor(pageSize), 100) : 25

  const [rows, total] = await Promise.all([
    prisma.inventoryManagement.findMany({
      where,
      include: {
        ...inventoryListInclude(),
        inquiryInventoryLinks: {
          where: { isActive: true, inquiry: interestedInquiryWhere ?? {} },
          orderBy: { createdAt: 'desc' },
          take: 100,
          select: {
            inquiryId: true,
            createdAt: true,
            inquiry: {
              select: {
                inquiryNo: true,
                customerNameLegacy: true,
                mobileno: true,
                email: true,
                status: true,
                customer: { select: { custId: true, custName: true, custMobile: true, custEmail: true } },
              },
            },
          },
        },
      },
      orderBy: { inventoryId: 'desc' },
      skip: (safePage - 1) * safePageSize,
      take: safePageSize,
    }),
    prisma.inventoryManagement.count({ where }),
  ])

  return {
    rows,
    total,
    page: safePage,
    pageSize: safePageSize,
    pageCount: Math.max(1, Math.ceil(total / safePageSize)),
  }
}

export async function listInventoryForExport(filters: InventoryListParams) {
  const where = buildInventoryWhere(filters)
  return prisma.inventoryManagement.findMany({
    where,
    include: inventoryListInclude(),
    orderBy: { inventoryId: 'desc' },
  })
}

export async function getInventoryById(id: number) {
  const row = await prisma.inventoryManagement.findUnique({
    where: { inventoryId: id },
    include: {
      customer: {
        select: { custId: true, custName: true, custMobile: true, custEmail: true },
      },
      carVariantMaster: {
        include: { carMakeMaster: true, carModelMaster: true },
      },
      vehicleEmailLinks: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          vehicleEmailLinkId: true,
          recipientEmail: true,
          recipientName: true,
          emailSentAt: true,
          firstRequestedAt: true,
          firstHumanViewAt: true,
          lastRequestedAt: true,
          requestCount: true,
          humanViewCount: true,
          isActive: true,
          interactions: {
            orderBy: { interactionAt: 'desc' },
            take: 50,
            select: {
              interactionAt: true,
              interactionType: true,
            },
          },
        },
      },
      _count: {
        select: { inventoryPhotos: true, inventoryVideos: true, inventoryDocuments: true },
      },
    },
  })

  if (!row) return null

  return {
    ...row,
    vehicleEmailLinks: row.vehicleEmailLinks.map(link => ({
      ...link,
      interactionSummary: summarizeVehicleEmailInteractions(link.interactions),
    })),
  }
}

export async function getMakes() {
  return prisma.carMakeMaster.findMany({
    where: { make: { not: null } },
    orderBy: { make: 'asc' },
  })
}

export async function getInventoryColours() {
  const rows = await prisma.inventoryManagement.findMany({
    where: { colour: { not: null } },
    select: { colour: true },
    orderBy: { colour: 'asc' },
  })

  const colours: string[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    const colour = row.colour?.trim()
    if (!colour) continue
    const key = colour.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    colours.push(colour)
  }
  return colours
}

export async function getModelsByMake(makeId: number, includeIncomplete = false) {
  return prisma.carModelMaster.findMany({
    where: { fkMakeId: makeId, ...(includeIncomplete ? {} : { model: { not: null } }) },
    orderBy: { model: 'asc' },
    include: { carVariantMaster: { where: includeIncomplete ? {} : { variant: { not: null } }, orderBy: { variant: 'asc' }, select: { pkVariantId: true, variant: true, fkMakeId: true, fkModelId: true } } },
  })
}

export async function getVariantsByModel(modelId: number, includeIncomplete = false) {
  return prisma.carVariantMaster.findMany({
    where: { fkModelId: modelId, ...(includeIncomplete ? {} : { variant: { not: null } }) },
    orderBy: { variant: 'asc' },
  })
}

export async function getDealers() {
  return prisma.dealerMaster.findMany({
    select: { dealerId: true, dealerName: true, dealerMobileNo: true, dealerEmail: true },
    orderBy: { dealerName: 'asc' },
  })
}
