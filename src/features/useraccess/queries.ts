import { prisma } from '@/lib/db/prisma'
import type { Prisma } from '@prisma/client'

export const GENDERS = ['M', 'F'] as const
export const STATUSES = ['Active', 'Inactive'] as const
export const USER_ACCESS_PAGE_SIZE = 25

export interface ListUsersParams {
  search: string
  status: string
  roleId: string
  stateId: string
  page: number
}

export async function listUsers({ search, status, roleId, stateId, page }: ListUsersParams) {
  const where: Prisma.UserTableWhereInput = {}

  if (status !== 'All') {
    where.status = status
  }

  if (roleId) {
    where.roleId = Number(roleId)
  }

  if (stateId) {
    where.employee = { is: { fkStateId: Number(stateId) } }
  }

  if (search.trim()) {
    const q = search.trim()
    where.OR = [
      { userName: { contains: q, mode: 'insensitive' } },
      { emailId: { contains: q, mode: 'insensitive' } },
      { displayName: { contains: q, mode: 'insensitive' } },
      { employee: { is: { empFirstName: { contains: q, mode: 'insensitive' } } } },
      { employee: { is: { empLastName: { contains: q, mode: 'insensitive' } } } },
      { employee: { is: { empEmailId: { contains: q, mode: 'insensitive' } } } },
      { employee: { is: { empMobileNo: { contains: q, mode: 'insensitive' } } } },
      { employee: { is: { empPhoneNo: { contains: q, mode: 'insensitive' } } } },
      { employee: { is: { empCity: { contains: q, mode: 'insensitive' } } } },
      { role: { is: { roleName: { contains: q, mode: 'insensitive' } } } },
    ]
  }

  const safePage = Math.max(1, page || 1)
  const skip = Math.max(0, (safePage - 1) * USER_ACCESS_PAGE_SIZE)

  const [rows, total] = await Promise.all([
    prisma.userTable.findMany({
      where,
      include: {
        employee: { include: { indianStatesMaster: true } },
        role: true,
        createdByUser: { select: { userId: true, userName: true, displayName: true } },
        updatedByUser: { select: { userId: true, userName: true, displayName: true } },
      },
      orderBy: { userId: 'desc' },
      skip,
      take: USER_ACCESS_PAGE_SIZE,
    }),
    prisma.userTable.count({ where }),
  ])

  return {
    rows,
    total,
    page: safePage,
    pageCount: Math.max(1, Math.ceil(total / USER_ACCESS_PAGE_SIZE)),
  }
}

export async function getAssignableRoles(currentRoleId: number | null) {
  return prisma.roleMaster.findMany({
    where: currentRoleId != null ? { roleId: { gt: currentRoleId } } : undefined,
    orderBy: { roleId: 'asc' },
  })
}

export async function listUserAccessRoles() {
  return prisma.roleMaster.findMany({
    orderBy: { roleId: 'asc' },
  })
}

export async function listStates() {
  return prisma.indianStatesMaster.findMany({
    orderBy: { statename: 'asc' },
  })
}
