import { prisma } from '@/lib/db/prisma'
import type { Prisma } from '@prisma/client'
import { buildInquiryOwnershipWhere, type InquiryOwnershipMode } from '@/lib/access/inquiryOwnership'

export const FOLLOWUP_PAGE_SIZE = 25

export interface FollowupFilters {
  search: string
  classification: string
  contactOutcome: string
  customerName: string
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
  sort?: 'due' | 'activity' | 'inquiry'
  page: number
  restrictToUserId?: number | null
  ownershipMode?: InquiryOwnershipMode
}

const startOfDay = (value: string) => new Date(`${value}T00:00:00.000`)
const endOfDay = (value: string) => new Date(`${value}T23:59:59.999`)

function followupListSelect() {
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
    classification: true,
    status: true,
    subStatus: true,
    followUpDate: true,
    visitedDateOfCustomer: true,
    remark: true,
    createdBy: true,
    assignedTo: true,
    createdByUser: {
      select: {
        userId: true,
        userName: true,
        displayName: true,
      },
    },
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
    followupInquiry: {
      orderBy: [{ createdDt: 'desc' }, { pkFollowupId: 'desc' }],
      take: 1,
      select: {
        pkFollowupId: true,
        createdDt: true,
        followupDate: true,
        contactOutcome: true,
        followupStatus: true,
        followupSubStatus: true,
        followupClassification: true,
        comments: true,
      },
    },
  } satisfies Prisma.InquirySelect
}

function followupExportSelect() {
  return {
    ...followupListSelect(),
    followupInquiry: {
      orderBy: [{ createdDt: 'desc' }, { pkFollowupId: 'desc' }],
      select: {
        pkFollowupId: true,
        createdDt: true,
        followupDate: true,
        contactOutcome: true,
        followupStatus: true,
        followupSubStatus: true,
        followupClassification: true,
        comments: true,
      },
    },
  } satisfies Prisma.InquirySelect
}

function buildFollowupWhere({
  search,
  classification,
  contactOutcome,
  customerName,
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
  restrictToUserId,
  ownershipMode = 'created-or-assigned',
}: Omit<FollowupFilters, 'page'>) {
  const q = search.trim()
  const andConditions: Prisma.InquiryWhereInput[] = []
  const parsedVariantId = Number(variantId)
  const parsedModelId = Number(modelId)
  const parsedMakeId = Number(makeId)
  const parsedUserId = Number(userId)
  const effectiveOwnershipUserId = restrictToUserId ?? (Number.isFinite(parsedUserId) && parsedUserId > 0 ? parsedUserId : null)

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
    ...(andConditions.length || effectiveOwnershipUserId
      ? { AND: [...andConditions, ...(effectiveOwnershipUserId ? [buildInquiryOwnershipWhere(effectiveOwnershipUserId, ownershipMode)] : [])] }
      : {}),
    ...(status !== 'All' ? { status } : {}),
    ...(classification !== 'All' ? { classification } : {}),
    ...(contactOutcome ? { followupInquiry: { some: { contactOutcome } } } : {}),
    ...(customerName
      ? {
          OR: [
            { customerNameLegacy: { contains: customerName, mode: 'insensitive' } },
            { customer: { custName: { contains: customerName, mode: 'insensitive' } } },
          ],
        }
      : {}),
    ...(subStatus ? { subStatus: { contains: subStatus, mode: 'insensitive' } } : {}),
    ...(website ? { source: { code: website } } : {}),
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
            { website: { contains: q, mode: 'insensitive' } },
            { source: { displayName: { contains: q, mode: 'insensitive' } } },
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
          ],
        }
      : {}),
  } satisfies Prisma.InquiryWhereInput
}

export async function listFollowupQueue({
  search,
  classification,
  contactOutcome,
  customerName,
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
  sort,
  page,
  restrictToUserId = null,
  ownershipMode = 'created-or-assigned',
}: FollowupFilters) {
  const where = buildFollowupWhere({
    search,
    classification,
    contactOutcome,
    customerName,
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
    restrictToUserId,
    ownershipMode,
  })
  const safePage = Math.max(1, page || 1)
  const skip = (safePage - 1) * FOLLOWUP_PAGE_SIZE

  const [rows, total] = await Promise.all([
    prisma.inquiry.findMany({
      where,
      select: followupListSelect(),
      orderBy: sort === 'activity'
        ? [{ updatedDt: 'desc' }, { inquiryId: 'desc' }]
        : sort === 'inquiry'
          ? [{ dateOfInquiry: 'desc' }, { inquiryId: 'desc' }]
          : [{ followUpDate: 'asc' }, { inquiryId: 'asc' }],
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
    select: followupExportSelect(),
    orderBy: [{ followUpDate: 'asc' }, { inquiryId: 'asc' }],
  })
}

export async function getRecentFollowups(
  inquiryId: number,
  limit?: number,
  restrictToUserId?: number | null,
  ownershipMode: InquiryOwnershipMode = 'created-or-assigned',
) {
  return prisma.followupInquiry.findMany({
    where: {
      fkInquiryId: inquiryId,
      ...(restrictToUserId ? { inquiry: buildInquiryOwnershipWhere(restrictToUserId, ownershipMode) } : {}),
    },
    orderBy: { createdDt: 'desc' },
    ...(typeof limit === 'number' ? { take: limit } : {}),
  })
}

export async function getUsersForFollowupFilter() {
  return prisma.userTable.findMany({
    where: { status: 'Active' },
    select: {
      userId: true,
      displayName: true,
      userName: true,
      empId: true,
      employee: {
        select: {
          empId: true,
          empFirstName: true,
          empLastName: true,
        },
      },
    },
    orderBy: { userId: 'asc' },
  })
}
