import { prisma } from '@/lib/db/prisma'

export interface TodayFilters {
  fromDate: string
  toDate: string
  userId: number | null
  restrictToUserId: number | null
}

export async function listTodayFollowups({ fromDate, toDate, userId, restrictToUserId }: TodayFilters) {
  const from = new Date(fromDate)
  const to = new Date(toDate)
  to.setHours(23, 59, 59, 999)

  const rows = await prisma.followupInquiry.findMany({
    where: {
      updatedDt: { gte: from, lte: to },
      // an InquiryAssistant-role user is always restricted to inquiries they created,
      // regardless of the "Updated By" filter picked in the UI (matches legacy row-security rule)
      ...(restrictToUserId
        ? { inquiry: { createdBy: restrictToUserId } }
        : userId ? { updatedBy: userId } : {}),
    },
    include: {
      inquiry: {
        include: {
          customer: true,
          inquiryCarDetails: {
            orderBy: [{ updatedDt: 'desc' }, { inquiryCarDetailsId: 'desc' }],
            include: { carVariantMaster: { include: { carMakeMaster: true, carModelMaster: true } } },
          },
          createdByUser: true,
        },
      },
      updatedByUser: true,
    },
    orderBy: { updatedDt: 'desc' },
  })

  return rows.map(r => ({
    pkFollowupId: r.pkFollowupId,
    followupDate: r.followupDate,
    followupStatus: r.followupStatus,
    followupSubStatus: r.followupSubStatus,
    followupClassification: r.followupClassification,
    comments: r.comments,
    updatedDt: r.updatedDt,
    updatedByName: r.updatedByUser?.displayName ?? r.updatedByUser?.userName ?? null,
    inquiryNo: r.inquiry?.inquiryNo ?? null,
    dateOfInquiry: r.inquiry?.dateOfInquiry ?? null,
    customerName: r.inquiry?.customer?.custName ?? r.inquiry?.customerNameLegacy ?? null,
    mobileno: r.inquiry?.mobileno ?? null,
    email: r.inquiry?.email ?? null,
    budgetOfCustomer: r.inquiry?.budgetOfCustomer?.toString() ?? null,
    createdByName: r.inquiry?.createdByUser?.displayName ?? r.inquiry?.createdByUser?.userName ?? null,
    carDetails: (r.inquiry?.inquiryCarDetails ?? [])
      .map(c => [c.carVariantMaster?.carMakeMaster?.make, c.carVariantMaster?.carModelMaster?.model, c.carVariantMaster?.variant, c.year].filter(Boolean).join(' '))
      .filter(Boolean)
      .join(', '),
  }))
}

export async function getUsersForFilter() {
  return prisma.userTable.findMany({
    where: { status: 'Active' },
    select: { userId: true, displayName: true, userName: true },
    orderBy: { userId: 'asc' },
  })
}
