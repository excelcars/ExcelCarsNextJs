import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'

export const DEALER_PAGE_SIZE = 25
export const DEALER_SEARCH_FIELDS = ['all', 'name', 'primaryMobile', 'secondaryMobile', 'email', 'company', 'address', 'website'] as const
export const DEALER_SORT_OPTIONS = ['nameAsc', 'nameDesc', 'newest', 'oldest'] as const

export type DealerSearchField = typeof DEALER_SEARCH_FIELDS[number]
export type DealerSortOption = typeof DEALER_SORT_OPTIONS[number]

export function normalizeDealerSearchField(value: string | undefined): DealerSearchField {
  return DEALER_SEARCH_FIELDS.includes(value as DealerSearchField) ? value as DealerSearchField : 'all'
}

export function normalizeDealerSortOption(value: string | undefined): DealerSortOption {
  return DEALER_SORT_OPTIONS.includes(value as DealerSortOption) ? value as DealerSortOption : 'nameAsc'
}

function dealerWhere(search: string, field = 'all'): Prisma.DealerMasterWhereInput {
  const q = search.trim()
  if (!q) return {}

  const contains = { contains: q, mode: 'insensitive' as const }
  const selectedField = normalizeDealerSearchField(field)
  const fieldWhere: Record<Exclude<DealerSearchField, 'all'>, Prisma.DealerMasterWhereInput> = {
    name: { dealerName: contains },
    primaryMobile: { dealerMobileNo: contains },
    secondaryMobile: { dealerMobileNo_2: contains },
    email: { dealerEmail: contains },
    company: { dealerCompanyName: contains },
    address: { dealerAddress: contains },
    website: { dealerWebsite: contains },
  }

  if (selectedField !== 'all') return fieldWhere[selectedField]

  return {
    OR: Object.values(fieldWhere),
  }
}

function dealerOrder(sort = 'nameAsc'): Prisma.DealerMasterOrderByWithRelationInput[] {
  switch (normalizeDealerSortOption(sort)) {
    case 'nameDesc':
      return [{ dealerName: 'desc' }, { dealerId: 'asc' }]
    case 'newest':
      return [{ dealerId: 'desc' }]
    case 'oldest':
      return [{ dealerId: 'asc' }]
    default:
      return [{ dealerName: 'asc' }, { dealerId: 'asc' }]
  }
}

export async function listDealersPaged({ search = '', field = 'all', sort = 'nameAsc', page = 1 }: { search?: string; field?: string; sort?: string; page?: number }) {
  const where = dealerWhere(search, field)
  const total = await prisma.dealerMaster.count({ where })
  const pageCount = Math.max(1, Math.ceil(total / DEALER_PAGE_SIZE))
  const safePage = Math.min(Math.max(1, page || 1), pageCount)

  const rows = await prisma.dealerMaster.findMany({
    where,
    orderBy: dealerOrder(sort),
    skip: (safePage - 1) * DEALER_PAGE_SIZE,
    take: DEALER_PAGE_SIZE,
  })

  return { rows, total, page: safePage, pageCount }
}

export async function listDealersForExport({ search = '', field = 'all', sort = 'nameAsc' }: { search?: string; field?: string; sort?: string }) {
  return prisma.dealerMaster.findMany({
    where: dealerWhere(search, field),
    orderBy: dealerOrder(sort),
  })
}

export async function searchDealerNames(query: string) {
  const q = query.trim()
  if (q.length < 2) return []

  const rows = await prisma.dealerMaster.findMany({
    where: { dealerName: { contains: q, mode: 'insensitive' } },
    select: { dealerName: true },
    distinct: ['dealerName'],
    orderBy: { dealerName: 'asc' },
    take: 10,
  })

  return rows.flatMap(row => row.dealerName ? [row.dealerName] : [])
}

export async function searchDealerMobiles(query: string) {
  const q = query.trim()
  if (q.length < 2) return []

  const rows = await prisma.dealerMaster.findMany({
    where: { dealerMobileNo: { contains: q, mode: 'insensitive' } },
    select: { dealerMobileNo: true },
    distinct: ['dealerMobileNo'],
    orderBy: { dealerMobileNo: 'asc' },
    take: 10,
  })

  return rows.flatMap(row => row.dealerMobileNo ? [row.dealerMobileNo] : [])
}
