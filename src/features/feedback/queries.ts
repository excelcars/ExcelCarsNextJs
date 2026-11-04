import { prisma } from '@/lib/db/prisma'
import type { Prisma } from '@prisma/client'

import { FEEDBACK_PAGE_SIZES, FEEDBACK_SORT_FIELDS } from './constants'
export { QUESTIONS, FEEDBACK_PAGE_SIZES, FEEDBACK_SORT_FIELDS } from './constants'

export interface FeedbackListParams {
  search?: string
  page?: number
  pageSize?: number
  sort?: string
  dir?: string
}

function feedbackWhere(search = ''): Prisma.CustomerFeedbackWhereInput {
  const q = search.trim()
  if (!q) return {}
  return {
    OR: [
      { customerName: { contains: q, mode: 'insensitive' } },
      { customerMob: { contains: q, mode: 'insensitive' } },
      { customerEmail: { contains: q, mode: 'insensitive' } },
      { carRegistrationNo: { contains: q, mode: 'insensitive' } },
    ],
  }
}

function listOrder(sort = '', dir = ''): Prisma.CustomerFeedbackOrderByWithRelationInput {
  const field = FEEDBACK_SORT_FIELDS.includes(sort as (typeof FEEDBACK_SORT_FIELDS)[number]) ? sort : 'feedbackId'
  const direction = dir === 'asc' ? 'asc' : 'desc'
  return { [field]: direction }
}

export async function listFeedback({ search = '', page = 1, pageSize = 10, sort = '', dir = '' }: FeedbackListParams = {}) {
  const where = feedbackWhere(search)
  const safePageSize = FEEDBACK_PAGE_SIZES.includes(pageSize as (typeof FEEDBACK_PAGE_SIZES)[number]) ? pageSize : 10
  const total = await prisma.customerFeedback.count({ where })
  const pageCount = Math.max(1, Math.ceil(total / safePageSize))
  const currentPage = Math.min(Math.max(1, page), pageCount)
  const rows = await prisma.customerFeedback.findMany({
    where,
    select: {
      feedbackId: true, customerName: true, customerMob: true, customerEmail: true,
      carMakeLegacy: true, carModelLegacy: true, carVariantLegacy: true, carRegistrationNo: true,
      answer_1: true, answer_2: true, answer_4: true, submittedAt: true,
    },
    orderBy: listOrder(sort, dir),
    skip: (currentPage - 1) * safePageSize,
    take: safePageSize,
  })
  return { rows, total, pageCount, page: currentPage, pageSize: safePageSize, sort: FEEDBACK_SORT_FIELDS.includes(sort as (typeof FEEDBACK_SORT_FIELDS)[number]) ? sort : 'feedbackId', dir: dir === 'asc' ? 'asc' : 'desc' }
}

export async function getFeedbackDetail(feedbackId: number) {
  return prisma.customerFeedback.findUnique({ where: { feedbackId } })
}

export async function getVehicles({ query = '', customerId }: { query?: string; customerId?: number | null } = {}) {
  const q = query.trim()
  return prisma.inventoryManagement.findMany({
    where: {
      ...(customerId ? { customerId } : {}),
      ...(q ? { OR: [
        { registrationNo: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
        { carVariantMaster: { is: { variant: { contains: q, mode: 'insensitive' } } } },
      ] } : {}),
    },
    select: {
      inventoryId: true, customerId: true, registrationNo: true, sku: true, year: true, fkVariantId: true,
      carVariantMaster: { select: { variant: true, carMakeMaster: { select: { make: true } }, carModelMaster: { select: { model: true } } } },
    },
    orderBy: { inventoryId: 'desc' },
    take: 20,
  })
}

export async function listFeedbackForExport({ search = '' }: Pick<FeedbackListParams, 'search'> = {}) {
  return prisma.customerFeedback.findMany({
    where: feedbackWhere(search),
    orderBy: { feedbackId: 'desc' },
  })
}
