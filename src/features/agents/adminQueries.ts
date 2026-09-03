import { prisma } from '@/lib/db/prisma'
import type { Prisma } from '@prisma/client'

export const AGENT_TYPES = ['Insurance Agent', 'RTO Agent', 'DSA'] as const
export const PAGE_SIZE = 25

export interface ListAgentsParams {
  search: string
  type: string
  page: number
}

export async function listAgentsPaged({ search, type, page }: ListAgentsParams) {
  const where: Prisma.PartnerMasterWhereInput = {
    partnerType: type === 'All' ? { in: [...AGENT_TYPES] } : type,
  }

  if (search.trim()) {
    const q = search.trim()
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { mobile: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
    ]
  }

  const skip = Math.max(0, (page - 1) * PAGE_SIZE)

  const [rows, total] = await Promise.all([
    prisma.partnerMaster.findMany({ where, orderBy: { partnerId: 'desc' }, skip, take: PAGE_SIZE }),
    prisma.partnerMaster.count({ where }),
  ])

  return { rows, total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) }
}
