import { prisma } from '@/lib/db/prisma'
import type { Prisma } from '@prisma/client'

export const FOLLOWUP_PAGE_SIZE = 25

export interface FollowupFilters {
  search: string
  classification: string
  inquiryDateFrom: string
  inquiryDateTo: string
  followUpDateFrom: string
  followUpDateTo: string
  visitedDateFrom: string
  visitedDateTo: string
  status: string
  subStatus: string
  website: string
  customerMobile: string
  userId: string
  makeId: string
  modelId: string
  variantId: string
  page: number
}

const startOfDay = (value: string) => new Date(`${value}T00:00:00.000`)
const endOfDay = (value: string) => new Date(`${value}T23:59:59.999`)

function followupListSelect() {
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
    classification: true,
    status: true,
    subStatus: true,
    followUpDate: true,
    visitedDateOfCustomer: true,
    remark: true,
    createdBy: true,
    createdByUser: {
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
      orderBy: [{ inquiryCarDetailsId: 'asc' }],
      select: {
        inquiryCarDetailsId: true,
        makeLegacy: true,
        modelLegacy: true,
        variantLegacy: true,
        subVariant: true,
        year: true,
        carVariantMaster: {
          select: {
            variant: true,
            carMakeMaster: { select: { make: true } },
            carModelMaster: { select: { model: true } },
          },
        },
      },
    },
  } satisfies Prisma.InquirySelect
}

function buildFollowupWhere({
  search,
  classification,
  inquiryDateFrom,
  inquiryDateTo,
  followUpDateFrom,
  followUpDateTo,
  visitedDateFrom,
  visitedDateTo,
  status,
  subStatus,
  website,
  customerMobile,
  userId,
  makeId,
  modelId,
  variantId,
}: Omit<FollowupFilters, 'page'>) {
  const q = search.trim()
  const andConditions: Prisma.InquiryWhereInput[] = []
  const parsedVariantId = Number(variantId)
  const parsedModelId = Number(modelId)
  const parsedMakeId = Number(makeId)
  const parsedUserId = Number(userId)

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

  return {
    ...(Number.isFinite(parsedUserId) && parsedUserId > 0 ? { createdBy: parsedUserId } : {}),
    ...(status !== 'All' ? { status } : {}),
    ...(classification !== 'All' ? { classification } : {}),
    ...(subStatus ? { subStatus: { contains: subStatus, mode: 'insensitive' } } : {}),
    ...(website ? { website: { contains: website, mode: 'insensitive' } } : {}),
    ...(customerMobile ? { mobileno: { contains: customerMobile, mode: 'insensitive' } } : {}),
    ...((inquiryDateFrom || inquiryDateTo)
      ? {
          dateOfInquiry: {
            ...(inquiryDateFrom ? { gte: startOfDay(inquiryDateFrom) } : {}),
            ...(inquiryDateTo ? { lte: endOfDay(inquiryDateTo) } : {}),
          },
        }
      : {}),
    ...((followUpDateFrom || followUpDateTo)
      ? {
          followUpDate: {
            ...(followUpDateFrom ? { gte: startOfDay(followUpDateFrom) } : {}),
            ...(followUpDateTo ? { lte: endOfDay(followUpDateTo) } : {}),
          },
        }
      : {}),
    ...((visitedDateFrom || visitedDateTo)
      ? {
          visitedDateOfCustomer: {
            ...(visitedDateFrom ? { gte: startOfDay(visitedDateFrom) } : {}),
            ...(visitedDateTo ? { lte: endOfDay(visitedDateTo) } : {}),
          },
        }
      : {}),
    ...(q
      ? {
          OR: [
            { customerNameLegacy: { contains: q, mode: 'insensitive' } },
            { mobileno: { contains: q, mode: 'insensitive' } },
            { inquiryNo: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { customer: { custName: { contains: q, mode: 'insensitive' } } },
          ],
        }
      : {}),
    ...(andConditions.length ? { AND: andConditions } : {}),
  } satisfies Prisma.InquiryWhereInput
}

export async function listFollowupQueue({
  search,
  classification,
  inquiryDateFrom,
  inquiryDateTo,
  followUpDateFrom,
  followUpDateTo,
  visitedDateFrom,
  visitedDateTo,
  status,
  subStatus,
  website,
  customerMobile,
  userId,
  makeId,
  modelId,
  variantId,
  page,
}: FollowupFilters) {
  const where = buildFollowupWhere({
    search,
    classification,
    inquiryDateFrom,
    inquiryDateTo,
    followUpDateFrom,
    followUpDateTo,
    visitedDateFrom,
    visitedDateTo,
    status,
    subStatus,
    website,
    customerMobile,
    userId,
    makeId,
    modelId,
    variantId,
  })
  const safePage = Math.max(1, page || 1)
  const skip = (safePage - 1) * FOLLOWUP_PAGE_SIZE

  const [rows, total] = await Promise.all([
    prisma.inquiry.findMany({
      where,
      select: followupListSelect(),
      orderBy: [{ followUpDate: 'asc' }, { inquiryId: 'asc' }],
      skip,
      take: FOLLOWUP_PAGE_SIZE,
    }),
    prisma.inquiry.count({ where }),
  ])

  return {
    rows,
    total,
    page: safePage,
    pageCount: Math.max(1, Math.ceil(total / FOLLOWUP_PAGE_SIZE)),
  }
}

export async function listFollowupsForExport(filters: Omit<FollowupFilters, 'page'>) {
  const where = buildFollowupWhere(filters)
  return prisma.inquiry.findMany({
    where,
    select: followupListSelect(),
    orderBy: [{ followUpDate: 'asc' }, { inquiryId: 'asc' }],
  })
}

export async function getRecentFollowups(inquiryId: number, limit?: number) {
  return prisma.followupInquiry.findMany({
    where: { fkInquiryId: inquiryId },
    orderBy: { createdDt: 'desc' },
    ...(typeof limit === 'number' ? { take: limit } : {}),
  })
}

export async function getUsersForFollowupFilter() {
  return prisma.userTable.findMany({
    where: { status: 'Active' },
    select: { userId: true, displayName: true, userName: true },
    orderBy: { userId: 'asc' },
  })
}
