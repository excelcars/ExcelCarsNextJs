import { prisma } from '@/lib/db/prisma'
import type { Prisma } from '@prisma/client'
import { buildInquiryOwnershipWhere } from '@/lib/access/inquiryOwnership'
import { getActiveInquirySources } from './sourceMaster.server'
import { getActiveInquiryLocations } from './locationMaster.server'

// Keep `FollowUp` as the saved value so existing follow-up queues and reports
// continue to work, while presenting the friendlier "Followup" label in the UI.
export const INQUIRY_STATUSES = ['Open', 'FollowUp', 'Booked', 'Closed', 'Converted'] as const
export const INQUIRY_LEAD_SUB_STATUS_OPTIONS = [
  'Appointment Fixed',
  'Busy',
  'Call Later',
  'Customer Has Called',
  'Desired Car Not In Stock',
  'Deal Done',
  'Expecting Lesser Price',
  'Lost',
  'Number Not Available',
  'Ringing',
  'Showroom Visit',
  'Unreachable',
  'Other',
  'Outstanding Lead',
] as const

export function inquiryStatusLabel(status: string) {
  return status === 'FollowUp' ? 'Followup' : status
}
export const INQUIRY_CLASSIFICATIONS = ['Hot', 'Warm', 'Cold'] as const
export const PAGE_SIZE = 25
export const INQUIRY_QUICK_FILTERS = ['active', 'overdue', 'today', 'upcoming', 'activity', 'all'] as const
export type InquiryQuickFilter = (typeof INQUIRY_QUICK_FILTERS)[number]
export interface ListInquiriesParams {
  search: string
  status: string
  classification: string
  source: string
  locationId: string
  location: string
  region?: string
  regionPeriod?: string
  subStatus: string
  followUpDate: string
  inquiryDate: string
  inquiryDateFrom?: string
  inquiryDateTo?: string
  visitedDate: string
  budgetMin: string
  budgetMax: string
  makeId: string
  modelId: string
  variantId: string
  quickFilter: InquiryQuickFilter
  page: number
  restrictToUserId?: number | null
}

function buildInquiryWhere({ search, status, classification, source, locationId, location, region = '', regionPeriod = '', subStatus, followUpDate, inquiryDate, inquiryDateFrom = '', inquiryDateTo = '', visitedDate, budgetMin, budgetMax, makeId, modelId, variantId, quickFilter, restrictToUserId }: Pick<ListInquiriesParams, 'search' | 'status' | 'classification' | 'source' | 'locationId' | 'location' | 'region' | 'regionPeriod' | 'subStatus' | 'followUpDate' | 'inquiryDate' | 'inquiryDateFrom' | 'inquiryDateTo' | 'visitedDate' | 'budgetMin' | 'budgetMax' | 'makeId' | 'modelId' | 'variantId' | 'quickFilter' | 'restrictToUserId'>) {
  const where: Prisma.InquiryWhereInput = {}
  const andConditions: Prisma.InquiryWhereInput[] = []

  if (restrictToUserId) {
    andConditions.push(buildInquiryOwnershipWhere(restrictToUserId))
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (quickFilter === 'active' || quickFilter === 'overdue' || quickFilter === 'today' || quickFilter === 'upcoming') {
    where.status = 'FollowUp'
    if (quickFilter === 'overdue') where.followUpDate = { lt: today }
    if (quickFilter === 'today') where.followUpDate = { gte: today, lt: tomorrow }
    if (quickFilter === 'upcoming') where.followUpDate = { gte: tomorrow }
  } else if (status !== 'All') {
    where.status = status
  }
  if (classification !== 'All') {
    where.classification = classification
  }
  if (source !== 'All') {
    where.source = { code: source }
  }
  const parsedLocationId = Number(locationId)
  if (Number.isFinite(parsedLocationId) && parsedLocationId > 0) {
    where.locationId = parsedLocationId
  }
  if (location.trim()) {
    where.location = { contains: location.trim(), mode: 'insensitive' }
  }
  if (region.trim()) {
    where.reportingLocation = { region: region.trim() }
    const now = new Date()
    const start = regionPeriod === 'year'
      ? new Date(now.getFullYear(), 0, 1)
      : regionPeriod === 'quarter'
        ? new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
        : new Date(now.getFullYear(), now.getMonth(), 1)
    where.dateOfInquiry = { gte: start, lt: now }
  }
  if (subStatus !== 'All') {
    where.subStatus = subStatus
  }
  if (followUpDate) {
    const start = new Date(`${followUpDate}T00:00:00.000`)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    where.followUpDate = {
      gte: start,
      lt: end,
    }
  }
  if (inquiryDateFrom || inquiryDateTo) {
    const range: Prisma.DateTimeNullableFilter<'Inquiry'> = {}
    if (inquiryDateFrom) range.gte = new Date(`${inquiryDateFrom}T00:00:00.000`)
    if (inquiryDateTo) { const end = new Date(`${inquiryDateTo}T00:00:00.000`); end.setDate(end.getDate() + 1); range.lt = end }
    where.dateOfInquiry = range
  } else if (inquiryDate) {
    const start = new Date(`${inquiryDate}T00:00:00.000`)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    where.dateOfInquiry = { gte: start, lt: end }
  }
  if (visitedDate) {
    const start = new Date(`${visitedDate}T00:00:00.000`)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    where.visitedDateOfCustomer = {
      gte: start,
      lt: end,
    }
  }

  if (budgetMin.trim() || budgetMax.trim()) {
    const budgetOfCustomer: Prisma.DecimalNullableFilter<'Inquiry'> = {}
    const parsedMin = Number(budgetMin)
    const parsedMax = Number(budgetMax)
    if (budgetMin.trim() && Number.isFinite(parsedMin)) budgetOfCustomer.gte = parsedMin
    if (budgetMax.trim() && Number.isFinite(parsedMax)) budgetOfCustomer.lte = parsedMax
    if (Object.keys(budgetOfCustomer).length > 0) andConditions.push({ budgetOfCustomer })
  }

  const parsedVariantId = Number(variantId)
  const parsedModelId = Number(modelId)
  const parsedMakeId = Number(makeId)
  if (Number.isFinite(parsedVariantId) && parsedVariantId > 0) {
    andConditions.push({
      inquiryCarDetails: {
        some: { fkVariantId: parsedVariantId },
      },
    })
  } else if (Number.isFinite(parsedModelId) && parsedModelId > 0) {
    andConditions.push({
      inquiryCarDetails: {
        some: {
          carVariantMaster: { fkModelId: parsedModelId },
        },
      },
    })
  } else if (Number.isFinite(parsedMakeId) && parsedMakeId > 0) {
    andConditions.push({
      inquiryCarDetails: {
        some: {
          carVariantMaster: { fkMakeId: parsedMakeId },
        },
      },
    })
  }

  if (search.trim()) {
    const q = search.trim()
    where.OR = [
      { inquiryNo: { contains: q, mode: 'insensitive' } },
      { mobileno: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { website: { contains: q, mode: 'insensitive' } },
      { sourceDetail: { contains: q, mode: 'insensitive' } },
      { remark: { contains: q, mode: 'insensitive' } },
      { location: { contains: q, mode: 'insensitive' } },
      { reportingLocation: { displayName: { contains: q, mode: 'insensitive' } } },
      { source: { displayName: { contains: q, mode: 'insensitive' } } },
      { customerNameLegacy: { contains: q, mode: 'insensitive' } },
      { customer: { custName: { contains: q, mode: 'insensitive' } } },
      {
        inquiryCarDetails: {
          some: {
            OR: [
              { makeLegacy: { contains: q, mode: 'insensitive' } },
              { modelLegacy: { contains: q, mode: 'insensitive' } },
              { variantLegacy: { contains: q, mode: 'insensitive' } },
              { subVariant: { contains: q, mode: 'insensitive' } },
              { carVariantMaster: { variant: { contains: q, mode: 'insensitive' } } },
              { carVariantMaster: { carMakeMaster: { make: { contains: q, mode: 'insensitive' } } } },
              { carVariantMaster: { carModelMaster: { model: { contains: q, mode: 'insensitive' } } } },
            ],
          },
        },
      },
    ]
  }

  if (andConditions.length > 0) {
    where.AND = andConditions
  }

  return where
}

function inquiryDetailInclude() {
  return {
    customer: true,
    source: true,
    assignedToUser: {
      select: {
        userId: true,
        userName: true,
        displayName: true,
      },
    },
    inquiryCarDetails: {
      orderBy: [{ updatedDt: 'desc' }, { inquiryCarDetailsId: 'desc' }],
      include: { carVariantMaster: { include: { carMakeMaster: true, carModelMaster: true } } },
    },
  } satisfies Prisma.InquiryInclude
}

function inquiryListSelect() {
  return {
    inquiryId: true,
    inquiryNo: true,
    dateOfInquiry: true,
    website: true,
    sourceId: true,
    sourceDetail: true,
    locationId: true,
    location: true,
    reportingLocation: { select: { displayName: true, region: true } },
    source: {
      select: {
        code: true,
        displayName: true,
        requiresDetail: true,
      },
    },
    customerId: true,
    customerNameLegacy: true,
    mobileno: true,
    email: true,
    budgetOfCustomer: true,
    visitedDateOfCustomer: true,
    classification: true,
    status: true,
    subStatus: true,
    followUpDate: true,
    remark: true,
    assignedTo: true,
    assignedToUser: {
      select: {
        userId: true,
        userName: true,
        displayName: true,
      },
    },
    customer: {
      select: {
        custId: true,
        custName: true,
        custMobile: true,
        custEmail: true,
      },
    },
    inquiryCarDetails: {
      orderBy: [{ updatedDt: 'desc' }, { inquiryCarDetailsId: 'desc' }],
      select: {
        fkVariantId: true,
        inquiryCarDetailsId: true,
        makeLegacy: true,
        modelLegacy: true,
        variantLegacy: true,
        subVariant: true,
        year: true,
        noOfOwners: true,
        carVariantMaster: {
          select: {
            variant: true,
            carMakeMaster: {
              select: {
                pkMakeId: true,
                make: true,
              },
            },
            carModelMaster: {
              select: {
                pkModelId: true,
                model: true,
              },
            },
          },
        },
      },
    },
  } satisfies Prisma.InquirySelect
}

function inquiryOrderBy(quickFilter: InquiryQuickFilter): Prisma.InquiryOrderByWithRelationInput[] {
  if (quickFilter === 'active' || quickFilter === 'overdue' || quickFilter === 'today' || quickFilter === 'upcoming') {
    return [{ followUpDate: { sort: 'asc', nulls: 'last' } }, { inquiryId: 'desc' }]
  }

  if (quickFilter === 'activity') return [{ updatedDt: { sort: 'desc', nulls: 'last' } }, { inquiryId: 'desc' }]
  return [{ dateOfInquiry: { sort: 'desc', nulls: 'last' } }, { inquiryId: 'desc' }]
}

export async function listInquiries({ search, status, classification, source, locationId, location, region = '', regionPeriod = '', subStatus, followUpDate, inquiryDate, visitedDate, budgetMin, budgetMax, makeId, modelId, variantId, quickFilter, page, restrictToUserId = null }: ListInquiriesParams) {
  const where = buildInquiryWhere({ search, status, classification, source, locationId, location, region, regionPeriod, subStatus, followUpDate, inquiryDate, visitedDate, budgetMin, budgetMax, makeId, modelId, variantId, quickFilter, restrictToUserId })

  const skip = Math.max(0, (page - 1) * PAGE_SIZE)

  const [rows, total] = await Promise.all([
    prisma.inquiry.findMany({
      where,
      select: inquiryListSelect(),
      orderBy: inquiryOrderBy(quickFilter),
      skip,
      take: PAGE_SIZE,
    }),
    prisma.inquiry.count({ where }),
  ])

  const partnerPayloads = rows.length ? await prisma.partnerWebhookPayload.findMany({
    where: { inquiryId: { in: rows.map(row => row.inquiryId) } },
    distinct: ['inquiryId', 'partner'], select: { inquiryId: true, partner: true },
  }) : []
  const partnerInquiryIds = new Set(partnerPayloads.map(row => row.inquiryId))
  const cardekhoInquiryIds = new Set(partnerPayloads.filter(row => row.partner === 'CARDEKHO').map(row => row.inquiryId))
  return { rows: rows.map(row => ({ ...row, hasPartnerPayload: partnerInquiryIds.has(row.inquiryId), hasCardekhoPayload: cardekhoInquiryIds.has(row.inquiryId) })), total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) }
}

export async function getInquiryById(id: number) {
  return prisma.inquiry.findUnique({
    where: { inquiryId: id },
    include: inquiryDetailInclude(),
  })
}

export async function listInquiriesForExport({ search, status, classification, source, locationId, location, region = '', regionPeriod = '', subStatus, followUpDate, inquiryDate, inquiryDateFrom = '', inquiryDateTo = '', visitedDate, budgetMin, budgetMax, makeId, modelId, variantId, quickFilter, restrictToUserId = null }: Pick<ListInquiriesParams, 'search' | 'status' | 'classification' | 'source' | 'locationId' | 'location' | 'region' | 'regionPeriod' | 'subStatus' | 'followUpDate' | 'inquiryDate' | 'inquiryDateFrom' | 'inquiryDateTo' | 'visitedDate' | 'budgetMin' | 'budgetMax' | 'makeId' | 'modelId' | 'variantId' | 'quickFilter' | 'restrictToUserId'>) {
  const where = buildInquiryWhere({ search, status, classification, source, locationId, location, region, regionPeriod, subStatus, followUpDate, inquiryDate, inquiryDateFrom, inquiryDateTo, visitedDate, budgetMin, budgetMax, makeId, modelId, variantId, quickFilter, restrictToUserId })
  return prisma.inquiry.findMany({
    where,
    include: inquiryDetailInclude(),
    orderBy: inquiryOrderBy(quickFilter),
    take: 5001,
  })
}

export async function getMakes() {
  return prisma.carMakeMaster.findMany({
    where: { make: { not: null } },
    orderBy: { make: 'asc' },
  })
}

export const getInquirySources = getActiveInquirySources
export const getInquiryLocations = getActiveInquiryLocations

export async function getInquirySubStatusSuggestions() {
  const rows = await prisma.inquiry.findMany({
    distinct: ['subStatus'],
    where: { subStatus: { not: null } },
    select: { subStatus: true },
    orderBy: { subStatus: 'asc' },
    take: 1000,
  })

  const seen = new Set<string>()
  const suggestions: string[] = []

  for (const value of INQUIRY_LEAD_SUB_STATUS_OPTIONS) {
    seen.add(value.toLowerCase())
    suggestions.push(value)
  }

  for (const row of rows) {
    const value = row.subStatus?.trim()
    if (!value) continue
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    suggestions.push(value)
  }

  return suggestions
}

export async function getInquiryAssistants() {
  return prisma.userTable.findMany({
    where: {
      status: 'Active',
      roleName: 'InquiryAssistant',
      empId: { not: null },
    },
    select: {
      userId: true,
      userName: true,
      displayName: true,
      employee: {
        select: {
          empId: true,
          empFirstName: true,
          empLastName: true,
          empMobileNo: true,
          empEmailId: true,
        },
      },
    },
    orderBy: [
      { displayName: 'asc' },
      { userName: 'asc' },
      { userId: 'asc' },
    ],
  })
}
