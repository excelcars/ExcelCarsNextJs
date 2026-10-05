import { prisma } from '@/lib/db/prisma'
import type { Prisma } from '@prisma/client'
import type { ExceptionFilters } from './rules'
import { clampExceptionPage, EXCEPTION_PAGE_SIZE } from './rules'
import { exceptionDateRange } from './date'

export const PAGE_SIZE = EXCEPTION_PAGE_SIZE
export const ACTIVE_EXCEPTION_USER_STATUS = 'Active'

export async function listExceptions({ fromDate, toDate, userId, page }: ExceptionFilters) {
  const where: Prisma.ExceptionLoggingWhereInput = {}

  if (fromDate || toDate) {
    const range = exceptionDateRange(fromDate, toDate)
    where.datetime = {}
    if (range.from) where.datetime.gte = range.from
    if (range.to) where.datetime.lte = range.to
  }
  if (userId !== null) {
    where.userId = userId
  }

  const total = await prisma.exceptionLogging.count({ where })
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const resolvedPage = clampExceptionPage(page, total)
  const skip = (resolvedPage - 1) * PAGE_SIZE
  const rows = await prisma.exceptionLogging.findMany({
    where,
    orderBy: { datetime: 'desc' },
    skip,
    take: PAGE_SIZE,
  })

  return { rows, total, page: resolvedPage, pageCount }
}

export async function getUsersForFilter() {
  return prisma.userTable.findMany({
    where: { status: ACTIVE_EXCEPTION_USER_STATUS },
    select: { userId: true, displayName: true, userName: true },
    orderBy: { userId: 'asc' },
  })
}
