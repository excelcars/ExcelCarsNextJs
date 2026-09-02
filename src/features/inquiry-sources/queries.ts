import { prisma } from '@/lib/db/prisma'
import type { InquirySourceMasterRow } from './types'

export const INQUIRY_SOURCE_PAGE_SIZE = 25

export async function listInquirySources(search: string, requestedPage: number) {
  const normalizedSearch = search.trim()
  const where = normalizedSearch
    ? {
        OR: [
          { code: { contains: normalizedSearch, mode: 'insensitive' as const } },
          { displayName: { contains: normalizedSearch, mode: 'insensitive' as const } },
          { category: { contains: normalizedSearch, mode: 'insensitive' as const } },
        ],
      }
    : undefined

  const total = await prisma.inquirySourceMaster.count({ where })
  const pageCount = Math.max(1, Math.ceil(total / INQUIRY_SOURCE_PAGE_SIZE))
  const page = Math.min(Math.max(1, requestedPage), pageCount)
  const rows = await prisma.inquirySourceMaster.findMany({
    where,
    orderBy: [{ reportingSort: 'asc' }, { displayName: 'asc' }],
    skip: (page - 1) * INQUIRY_SOURCE_PAGE_SIZE,
    take: INQUIRY_SOURCE_PAGE_SIZE,
    select: {
      sourceId: true,
      code: true,
      displayName: true,
      category: true,
      requiresDetail: true,
      isActive: true,
      reportingSort: true,
      _count: { select: { inquiries: true } },
    },
  })

  const data: InquirySourceMasterRow[] = rows.map(row => ({
    sourceId: row.sourceId,
    code: row.code,
    displayName: row.displayName,
    category: row.category,
    requiresDetail: row.requiresDetail,
    isActive: row.isActive,
    reportingSort: row.reportingSort,
    inquiryCount: row._count.inquiries,
  }))

  return { rows: data, total, page, pageCount }
}
