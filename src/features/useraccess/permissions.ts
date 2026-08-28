import { prisma } from '@/lib/db/prisma'
import { getAuthorizedActorForFunctions } from '@/lib/access/accessControl'
import { USER_ACCESS_FUNCTION } from '@/lib/access/accessCatalog'

export interface UserAccessActor {
  userId: number
  roleId: number
}

/**
 * Resolves an active session to an active account that holds the User Access
 * function through access_function_role. Server actions must use this guard;
 * UI visibility is not an authorization boundary.
 */
export async function getUserAccessActor(): Promise<UserAccessActor | null> {
  const actor = await getAuthorizedActorForFunctions([USER_ACCESS_FUNCTION])
  return actor ? { userId: actor.userId, roleId: actor.roleId } : null
}

/**
 * Role ids are ordered from more privileged (smaller) to less privileged
 * (larger), matching the legacy role-picker rule.
 */
export async function canManageUserAccessTarget(actor: UserAccessActor, targetUserId: number): Promise<boolean> {
  if (!Number.isInteger(targetUserId) || targetUserId <= 0 || targetUserId === actor.userId) return false

  const target = await prisma.userTable.findUnique({
    where: { userId: targetUserId },
    select: { roleId: true },
  })

  return target?.roleId != null && target.roleId > actor.roleId
}
