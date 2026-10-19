import { prisma } from '@/lib/db/prisma'
import { buildInquiryOwnershipWhere } from '@/lib/access/inquiryOwnership'
import { cleanListValue } from '@/lib/listFormatters'
import { indiaDateRange } from './date'
import { buildTodayFollowupWhere, TODAY_FOLLOWUP_ORDER } from './queryContract'

export interface TodayFilters {
  fromDate: string
  toDate: string
  userId: number | null
  restrictToUserId: number | null
}

export async function listTodayFollowups({ fromDate, toDate, userId, restrictToUserId }: TodayFilters) {
  const { from, to } = indiaDateRange(fromDate, toDate)
  const restrictedInquiryWhere = restrictToUserId
    ? buildInquiryOwnershipWhere(restrictToUserId, 'created-only')
    : null

  const rows = await prisma.followupInquiry.findMany({
    // Legacy role-4 users can only see follow-ups for inquiries they created,
    // regardless of the "Updated By" filter picked in the UI.
    where: buildTodayFollowupWhere({ from, to, userId, restrictedInquiryWhere }),
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
    // Preserve newest activity first and make same-timestamp rows stable.
    orderBy: [...TODAY_FOLLOWUP_ORDER],
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
    website: r.inquiry?.website ?? null,
    customerName: r.inquiry?.customer?.custName ?? r.inquiry?.customerNameLegacy ?? null,
    mobileno: r.inquiry?.mobileno ?? null,
    email: r.inquiry?.email ?? null,
    budgetOfCustomer: r.inquiry?.budgetOfCustomer?.toString() ?? null,
    visitedDateOfCustomer: r.inquiry?.visitedDateOfCustomer ?? null,
    createdDt: r.inquiry?.createdDt ?? null,
    createdByName: r.inquiry?.createdByUser?.displayName ?? r.inquiry?.createdByUser?.userName ?? null,
    carDetails: (r.inquiry?.inquiryCarDetails ?? [])
      .map(c => [
        cleanListValue(c.carVariantMaster?.carMakeMaster?.make) || cleanListValue(c.makeLegacy),
        cleanListValue(c.carVariantMaster?.carModelMaster?.model) || cleanListValue(c.modelLegacy),
        cleanListValue(c.carVariantMaster?.variant) || cleanListValue(c.variantLegacy),
        c.year,
      ].filter(Boolean).join(' '))
      .filter(Boolean)
      .join(', '),
  }))
}

export async function getUsersForFilter(currentRoleId: number | null) {
  if (currentRoleId == null) return []

  return prisma.userTable.findMany({
    where: { roleId: { gte: currentRoleId } },
    select: { userId: true, displayName: true, userName: true },
    orderBy: { userId: 'asc' },
  })
}
