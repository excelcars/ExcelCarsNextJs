import { prisma } from '@/lib/db/prisma'
import { INQUIRY_SOURCE_MASTER_SEED } from './sourceMaster'

export async function ensureInquirySourceMasterSeed() {
  await prisma.inquirySourceMaster.createMany({
    data: INQUIRY_SOURCE_MASTER_SEED,
    skipDuplicates: true,
  })
}

export async function getActiveInquirySources() {
  await ensureInquirySourceMasterSeed()
  return prisma.inquirySourceMaster.findMany({
    where: { isActive: true },
    select: {
      sourceId: true,
      code: true,
      displayName: true,
      category: true,
      requiresDetail: true,
      isActive: true,
      reportingSort: true,
    },
    orderBy: [{ reportingSort: 'asc' }, { displayName: 'asc' }],
  })
}
