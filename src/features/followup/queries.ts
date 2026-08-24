import { prisma } from '@/lib/db/prisma'

export async function listFollowupQueue() {
  return prisma.inquiry.findMany({
    where: { status: 'FollowUp' },
    include: {
      customer: true,
      inquiryCarDetails: {
        orderBy: [{ updatedDt: 'desc' }, { inquiryCarDetailsId: 'desc' }],
        include: { carVariantMaster: { include: { carMakeMaster: true, carModelMaster: true } } },
      },
    },
    orderBy: [{ followUpDate: 'asc' }, { inquiryId: 'asc' }],
  })
}

export async function getRecentFollowups(inquiryId: number, limit = 5) {
  return prisma.followupInquiry.findMany({
    where: { fkInquiryId: inquiryId },
    orderBy: { createdDt: 'desc' },
    take: limit,
  })
}
