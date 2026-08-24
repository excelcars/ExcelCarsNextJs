import { prisma } from '@/lib/db/prisma'
import type { Prisma } from '@prisma/client'

export const INQUIRY_STATUSES = ['FollowUp', 'Closed'] as const
export const INQUIRY_CLASSIFICATIONS = ['Hot', 'Warm', 'Cold'] as const
export const PAGE_SIZE = 25
const PREFERRED_INQUIRY_SOURCES = [
  'Walk In',
  'Website',
  'Reference',
  'JustDial',
  'CarDekho',
  'CarWale',
  'CarTrade',
  'OLX',
  'Facebook',
  'Instagram',
  'Google',
  'WhatsApp',
  'Phone',
  'IndiaMart',
  'Other',
] as const

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
}

function buildInquiryWhere({ search, status, classification, source, subStatus, followUpDate, visitedDate, makeId, modelId, variantId }: Pick<ListInquiriesParams, 'search' | 'status' | 'classification' | 'source' | 'subStatus' | 'followUpDate' | 'visitedDate' | 'makeId' | 'modelId' | 'variantId'>) {
  const where: Prisma.InquiryWhereInput = {}
  const andConditions: Prisma.InquiryWhereInput[] = []

  if (status !== 'All') {
    where.status = status
  }
  if (classification !== 'All') {
    where.classification = classification
  }
  if (source !== 'All') {
    where.website = source
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
      { customerNameLegacy: { contains: q, mode: 'insensitive' } },
      { customer: { custName: { contains: q, mode: 'insensitive' } } },
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
    customer: {
      select: {
        custId: true,
        custName: true,
        custMobile: true,
        custEmail: true,
      },
    },
    inquiryCarDetails: {
      take: 1,
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

export async function listInquiries({ search, status, classification, source, subStatus, followUpDate, visitedDate, makeId, modelId, variantId, page }: ListInquiriesParams) {
  const where = buildInquiryWhere({ search, status, classification, source, subStatus, followUpDate, visitedDate, makeId, modelId, variantId })

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

export async function listInquiriesForExport({ search, status, classification, source, subStatus, followUpDate, visitedDate, makeId, modelId, variantId }: Pick<ListInquiriesParams, 'search' | 'status' | 'classification' | 'source' | 'subStatus' | 'followUpDate' | 'visitedDate' | 'makeId' | 'modelId' | 'variantId'>) {
  const where = buildInquiryWhere({ search, status, classification, source, subStatus, followUpDate, visitedDate, makeId, modelId, variantId })
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

export async function getInquirySourceSuggestions() {
  const rows = await prisma.inquiry.findMany({
    distinct: ['website'],
    where: { website: { not: null } },
    select: { website: true },
    orderBy: { website: 'asc' },
    take: 500,
  })

  const preferred: string[] = [...PREFERRED_INQUIRY_SOURCES]
  const seen = new Set(preferred.map(value => value.toLowerCase()))
  const suggestions = [...preferred]

  for (const row of rows) {
    const value = row.website?.trim()
    if (!value) continue
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    suggestions.push(value)
  }

  return suggestions
}
