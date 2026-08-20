import { prisma } from '@/lib/db/prisma'

export async function listDealers() {
  return prisma.dealerMaster.findMany({
    orderBy: { dealerId: 'desc' },
  })
}
