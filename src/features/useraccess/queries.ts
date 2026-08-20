import { prisma } from '@/lib/db/prisma'

export const GENDERS = ['M', 'F'] as const
export const STATUSES = ['Active', 'Inactive'] as const

export async function listUsers() {
  return prisma.userTable.findMany({
    include: { employee: true, role: true },
    orderBy: { userId: 'desc' },
  })
}

export async function getAssignableRoles(currentRoleId: number | null) {
  return prisma.roleMaster.findMany({
    where: currentRoleId != null ? { roleId: { gt: currentRoleId } } : undefined,
    orderBy: { roleId: 'asc' },
  })
}
