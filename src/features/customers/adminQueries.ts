import { prisma } from '@/lib/db/prisma'
import type { Prisma } from '@prisma/client'

export const CUSTOMER_TYPES = ['Contact', 'Customer'] as const
export const PAGE_SIZE = 25

export interface ListCustomersParams {
  search: string
  type: string
  page: number
}

export async function listCustomersPaged({ search, type, page }: ListCustomersParams) {
  const where: Prisma.CustomerWhereInput = {}

  if (type !== 'All') {
    where.type = type
  }

  if (search.trim()) {
    const q = search.trim()
    where.OR = [
      { custName: { contains: q, mode: 'insensitive' } },
      { custMobile: { contains: q, mode: 'insensitive' } },
      { custEmail: { contains: q, mode: 'insensitive' } },
      { companyName: { contains: q, mode: 'insensitive' } },
      { comments: { contains: q, mode: 'insensitive' } },
    ]
  }

  const skip = Math.max(0, (page - 1) * PAGE_SIZE)

  const [rows, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { custId: 'desc' },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.customer.count({ where }),
  ])

  return { rows, total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) }
}
