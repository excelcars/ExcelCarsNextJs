import { prisma } from '@/lib/db/prisma'
import { INQUIRY_LOCATION_MASTER_SEED } from './locationMaster'

export async function ensureInquiryLocationMasterSeed() {
  await prisma.inquiryLocationMaster.createMany({
    data: INQUIRY_LOCATION_MASTER_SEED,
    skipDuplicates: true,
  })
}

export async function getActiveInquiryLocations() {
  await ensureInquiryLocationMasterSeed()
  return prisma.inquiryLocationMaster.findMany({
    where: { isActive: true },
    select: { locationId: true, displayName: true, region: true, isActive: true, reportingSort: true },
    orderBy: [{ reportingSort: 'asc' }, { displayName: 'asc' }],
  })
}
