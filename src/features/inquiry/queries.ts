import { prisma } from '@/lib/db/prisma'
import type { Prisma } from '@prisma/client'
import { buildInquiryOwnershipWhere } from '@/lib/access/inquiryOwnership'
import { getActiveInquirySources } from './sourceMaster.server'

export const INQUIRY_STATUSES = ['Open', 'FollowUp', 'Closed'] as const
export const INQUIRY_CLASSIFICATIONS = ['Hot', 'Warm', 'Cold'] as const
export const PAGE_SIZE = 25
export interface ListInquiriesParams {
  search: string
  status: string
  classification: string
  source: string
  subStatus: string
  followUpDate: string
  visitedDate: string
  makeId: string
  modelId: string
  variantId: string
  page: number
  restrictToUserId?: number | null
}

function buildInquiryWhere({ search, status, classification, source, subStatus, followUpDate, visitedDate, makeId, modelId, variantId, restrictToUserId }: Pick<ListInquiriesParams, 'search' | 'status' | 'classification' | 'source' | 'subStatus' | 'followUpDate' | 'visitedDate' | 'makeId' | 'modelId' | 'variantId' | 'restrictToUserId'>) {
  const where: Prisma.InquiryWhereInput = {}
  const andConditions: Prisma.InquiryWhereInput[] = []

  if (restrictToUserId) {
    andConditions.push(buildInquiryOwnershipWhere(restrictToUserId))
  }

  if (status !== 'All') {
    where.status = status
  }
  if (classification !== 'All') {
    where.classification = classification
  }
  if (source !== 'All') {
    where.source = { code: source }
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
  if (visitedDate) {
    const start = new Date(`${visitedDate}T00:00:00.000`)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    where.visitedDateOfCustomer = {
      gte: start,
      lt: end,
    }
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

export async function listInquiries({ search, status, classification, source, subStatus, followUpDate, visitedDate, makeId, modelId, variantId, page, restrictToUserId = null }: ListInquiriesParams) {
  const where = buildInquiryWhere({ search, status, classification, source, subStatus, followUpDate, visitedDate, makeId, modelId, variantId, restrictToUserId })

  const skip = Math.max(0, (page - 1) * PAGE_SIZE)

  const [rows, total] = await Promise.all([
    prisma.inquiry.findMany({
      where,
      select: inquiryListSelect(),
      orderBy: { inquiryId: 'desc' },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.inquiry.count({ where }),
  ])

  return { rows, total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) }
}

export async function getInquiryById(id: number) {
  return prisma.inquiry.findUnique({
    where: { inquiryId: id },
    include: inquiryDetailInclude(),
  })
}

export async function listInquiriesForExport({ search, status, classification, source, subStatus, followUpDate, visitedDate, makeId, modelId, variantId, restrictToUserId = null }: Pick<ListInquiriesParams, 'search' | 'status' | 'classification' | 'source' | 'subStatus' | 'followUpDate' | 'visitedDate' | 'makeId' | 'modelId' | 'variantId' | 'restrictToUserId'>) {
  const where = buildInquiryWhere({ search, status, classification, source, subStatus, followUpDate, visitedDate, makeId, modelId, variantId, restrictToUserId })
  return prisma.inquiry.findMany({
    where,
    include: inquiryDetailInclude(),
    orderBy: { inquiryId: 'desc' },
  })
}

export async function getMakes() {
  return prisma.carMakeMaster.findMany({
    where: { make: { not: null } },
    orderBy: { make: 'asc' },
  })
}

export const getInquirySources = getActiveInquirySources

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
