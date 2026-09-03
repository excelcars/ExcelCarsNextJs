import { prisma } from '@/lib/db/prisma'
import { INQUIRY_SOURCE_MASTER_SEED } from './sourceMaster'

export async function ensureInquirySourceMasterSeed() {
  const existingSourceCount = await prisma.inquirySourceMaster.count()
  if (existingSourceCount > 0) return

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

export async function getInquirySourcesForConfiguration() {
  await ensureInquirySourceMasterSeed()
  return prisma.inquirySourceMaster.findMany({
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
