import { auth } from '../../../auth'
import { prisma } from '@/lib/db/prisma'
import { APP_ACCESS_CATALOG, getAllowedFunctionNamesForRoute } from './accessCatalog'

export interface AuthorizedActor {
  userId: number
  roleId: number
  grantedFunctionName: string
}

export interface CurrentUserAccessProfile {
  userId: number
  roleId: number
  displayName: string | null
  userName: string | null
  roleName: string | null
  grantedFunctionNames: string[]
}

export async function getCurrentUserAccessProfile(): Promise<CurrentUserAccessProfile | null> {
  const session = await auth()
  const sessionUserId = Number(session?.user?.id)
  if (!Number.isInteger(sessionUserId) || sessionUserId <= 0) return null

  const user = await prisma.userTable.findUnique({
    where: { userId: sessionUserId },
    select: { userId: true, roleId: true, status: true, displayName: true, userName: true, roleName: true },
  })

  if (!user || user.status !== 'Active' || user.roleId == null) return null

  const permissions = await prisma.accessFunctionRole.findMany({
    where: { roleId: user.roleId },
    select: {
      accessFunction: { select: { accessFunctionName: true } },
    },
  })

  const grantedFunctionNames = permissions
    .map(permission => permission.accessFunction.accessFunctionName?.trim())
    .filter((value): value is string => !!value)

  return {
    userId: user.userId,
    roleId: user.roleId,
    displayName: user.displayName,
    userName: user.userName,
    roleName: user.roleName,
    grantedFunctionNames: [...new Set(grantedFunctionNames)],
  }
}

export async function getAuthorizedActorForFunctions(functionNames: string[]): Promise<AuthorizedActor | null> {
  const normalized = [...new Set(functionNames.map(name => name.trim()).filter(Boolean))]
  if (normalized.length === 0) return null

  const profile = await getCurrentUserAccessProfile()
  if (!profile) return null

  const grantedFunctionName = normalized.find(name => profile.grantedFunctionNames.includes(name))
  if (!grantedFunctionName) return null

  return {
    userId: profile.userId,
    roleId: profile.roleId,
    grantedFunctionName,
  }
}

export function getAccessibleRoutesFromFunctionNames(grantedFunctionNames: string[]) {
  return APP_ACCESS_CATALOG
    .filter(item => getAllowedFunctionNamesForRoute(item.route).some(name => grantedFunctionNames.includes(name)))
    .map(item => item.route)
}

export async function canCurrentUserAccessRoute(route: string): Promise<boolean> {
  const requiredFunctionNames = getAllowedFunctionNamesForRoute(route)
  if (requiredFunctionNames.length === 0) return true

  const profile = await getCurrentUserAccessProfile()
  if (!profile) return false

  return requiredFunctionNames.some(functionName => profile.grantedFunctionNames.includes(functionName))
}

export async function canCurrentUserAccessFunction(functionName: string): Promise<boolean> {
  const profile = await getCurrentUserAccessProfile()
  return profile?.grantedFunctionNames.includes(functionName) ?? false
}

export async function getAuthorizedUserIdForRoute(route: string): Promise<number | null> {
  const requiredFunctionNames = getAllowedFunctionNamesForRoute(route)
  if (requiredFunctionNames.length === 0) {
    const profile = await getCurrentUserAccessProfile()
    return profile?.userId ?? null
  }

  const actor = await getAuthorizedActorForFunctions(requiredFunctionNames)
  return actor?.userId ?? null
}
