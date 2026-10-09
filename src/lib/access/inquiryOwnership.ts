import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUserIdForRoute } from '@/lib/access/accessControl'
import type { Prisma } from '@prisma/client'

export type InquiryOwnershipMode = 'created-or-assigned' | 'created-only'

export interface InquiryOwnershipScope {
  userId: number | null
  restrictToUserId: number | null
  restricted: boolean
  ownershipMode: InquiryOwnershipMode
}

export function buildInquiryOwnershipWhere(userId: number, ownershipMode: InquiryOwnershipMode = 'created-or-assigned'): Prisma.InquiryWhereInput {
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

function resolveOwnershipMode(route: string, restricted: boolean): InquiryOwnershipMode {
  void route
  void restricted
  return 'created-or-assigned'
}

export async function getInquiryOwnershipScopeForRoute(route: string): Promise<InquiryOwnershipScope> {
  const userId = await getAuthorizedUserIdForRoute(route)
  if (!userId) {
    return { userId: null, restrictToUserId: null, restricted: false, ownershipMode: 'created-or-assigned' }
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
    ownershipMode: resolveOwnershipMode(route, restricted),
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
