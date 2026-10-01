import type { Prisma } from '@prisma/client'

export const TODAY_FOLLOWUP_ORDER = [
  { updatedDt: 'desc' },
  { pkFollowupId: 'desc' },
] as const

interface TodayFollowupWhereArgs {
  from: Date
  to: Date
  userId: number | null
  restrictedInquiryWhere: Prisma.InquiryWhereInput | null
}

export function buildTodayFollowupWhere({
  from,
  to,
  userId,
  restrictedInquiryWhere,
}: TodayFollowupWhereArgs): Prisma.FollowupInquiryWhereInput {
  return {
    updatedDt: { gte: from, lte: to },
    ...(restrictedInquiryWhere
      ? { inquiry: restrictedInquiryWhere }
      : userId ? { updatedBy: userId } : {}),
  }
}
