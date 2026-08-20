import { prisma } from '@/lib/db/prisma'
import type { Prisma } from '@prisma/client'

export const PAGE_SIZE = 25

export interface ExceptionFilters {
  fromDate: string
  toDate: string
  userId: number | null
  page: number
}

export async function listExceptions({ fromDate, toDate, userId, page }: ExceptionFilters) {
  const where: Prisma.ExceptionLoggingWhereInput = {}

  if (fromDate || toDate) {
    where.datetime = {}
    if (fromDate) where.datetime.gte = new Date(fromDate)
    if (toDate) {
      const to = new Date(toDate)
      to.setHours(23, 59, 59, 999)
      where.datetime.lte = to
    }
  }
  if (userId) {
    where.userId = userId
  }

  const skip = Math.max(0, (page - 1) * PAGE_SIZE)

  const [rows, total] = await Promise.all([
    prisma.exceptionLogging.findMany({
      where,
      orderBy: { datetime: 'desc' },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.exceptionLogging.count({ where }),
  ])

  return { rows, total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) }
}

export async function getUsersForFilter() {
  return prisma.userTable.findMany({
    select: { userId: true, displayName: true, userName: true },
    orderBy: { userId: 'asc' },
  })
}
