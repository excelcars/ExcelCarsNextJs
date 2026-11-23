import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUserIdForRoute } from '@/lib/access/accessControl'
import type { Prisma } from '@prisma/client'

export type InquiryOwnershipMode = 'assigned-only' | 'created-or-assigned' | 'created-only'

export interface InquiryOwnershipScope {
  userId: number | null
  restrictToUserId: number | null
  restricted: boolean
  ownershipMode: InquiryOwnershipMode
}

export function buildInquiryOwnershipWhere(userId: number, ownershipMode: InquiryOwnershipMode = 'assigned-only'): Prisma.InquiryWhereInput {
  if (ownershipMode === 'assigned-only') return { assignedTo: userId }
  if (ownershipMode === 'created-only') {
    return { createdBy: userId }
  }

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
    return { userId: null, restrictToUserId: null, restricted: false, ownershipMode: 'assigned-only' }
  }

  const user = await prisma.userTable.findUnique({
    where: { userId },
    select: { userId: true, roleId: true, roleName: true },
  })

  const restricted = user?.roleId === 4 || user?.roleName === 'InquiryAssistant'
  return {
    userId,
    restrictToUserId: restricted ? userId : null,
    restricted,
    ownershipMode: 'assigned-only',
  }
}

export async function canAccessInquiryByOwnership(inquiryId: number, route: string): Promise<boolean> {
  const scope = await getInquiryOwnershipScopeForRoute(route)
  if (!scope.userId) return false
  if (!scope.restrictToUserId) return true

  const inquiry = await prisma.inquiry.findFirst({
    where: {
      AND: [
        { inquiryId },
        buildInquiryOwnershipWhere(scope.restrictToUserId, scope.ownershipMode),
      ],
    },
    select: { inquiryId: true },
  })

  return Boolean(inquiry)
}
