import { prisma } from '@/lib/db/prisma'

export async function searchCustomers(query: string) {
  const q = query.trim()
  if (q.length < 2) return []

  return prisma.customer.findMany({
    where: {
      OR: [
        { custName: { contains: q, mode: 'insensitive' } },
        { custMobile: { contains: q, mode: 'insensitive' } },
        { custEmail: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: { custId: true, custName: true, custMobile: true, custEmail: true },
    orderBy: { custName: 'asc' },
    take: 15,
  })
}
