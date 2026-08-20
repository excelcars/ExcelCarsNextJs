import { prisma } from '@/lib/db/prisma'

export async function searchPartners(partnerType: string, query: string) {
  const q = query.trim()
  if (q.length < 1) {
    return prisma.partnerMaster.findMany({
      where: { partnerType },
      orderBy: { name: 'asc' },
      take: 15,
    })
  }
  return prisma.partnerMaster.findMany({
    where: {
      partnerType,
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { mobile: { contains: q, mode: 'insensitive' } },
      ],
    },
    orderBy: { name: 'asc' },
    take: 15,
  })
}
