import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUserIdForRoute } from '@/lib/access/accessControl'
import type { Prisma } from '@prisma/client'

export interface InquiryOwnershipScope {
  userId: number | null
  restrictToUserId: number | null
  restricted: boolean
}

export function buildInquiryOwnershipWhere(userId: number): Prisma.InquiryWhereInput {
  return {
    OR: [
      { createdBy: userId },
      { assignedTo: userId },
    ],
  }
}

export async function getInquiryOwnershipScopeForRoute(route: string): Promise<InquiryOwnershipScope> {
  const userId = await getAuthorizedUserIdForRoute(route)
  if (!userId) {
    return { userId: null, restrictToUserId: null, restricted: false }
  }

  const user = await prisma.userTable.findUnique({
    where: { userId },
    select: { userId: true, roleName: true },
  })

  const restricted = user?.roleName === 'InquiryAssistant'
  return {
    userId,
    restrictToUserId: restricted ? userId : null,
    restricted,
  }
}

export async function canAccessInquiryByOwnership(inquiryId: number, route: string): Promise<boolean> {
  const scope = await getInquiryOwnershipScopeForRoute(route)
  if (!scope.userId) return false
  if (!scope.restrictToUserId) return true

  const inquiry = await prisma.inquiry.findUnique({
    where: { inquiryId },
    select: { createdBy: true, assignedTo: true },
  })

  return inquiry?.createdBy === scope.restrictToUserId || inquiry?.assignedTo === scope.restrictToUserId
}
