import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'
import { getAuthorizedActorForFunctions } from '@/lib/access/accessControl'
import { APP_ACCESS_CATALOG, ROLE_ACCESS_FUNCTION, USER_ACCESS_FUNCTION, getAccessDefinition } from '@/lib/access/accessCatalog'

export const ROLE_ACCESS_ALLOWED_FUNCTIONS = [ROLE_ACCESS_FUNCTION, USER_ACCESS_FUNCTION] as const
export const ROLE_ACCESS_AUDIT_PAGE_SIZE = 20

export interface RoleAccessActor {
  userId: number
  roleId: number
  grantedFunctionName: string
}

export interface RoleAccessRoleRow {
  roleId: number
  roleName: string | null
}

export interface RoleAccessFunctionRow {
  accessFunctionId: number
  accessFunctionName: string | null
}

export interface RoleAccessMappingRow {
  roleId: number
  accessFunctionId: number
  accessFunctionName: string | null
}

export interface RoleAccessAuditRow {
  roleAccessAuditId: number
  roleId: number
  roleNameSnapshot: string | null
  changedByUserId: number
  changedByUserName: string | null
  changedAt: Date
  addedFunctionNames: string[]
  removedFunctionNames: string[]
  beforeFunctionNames: string[]
  afterFunctionNames: string[]
}

function decodeFunctionNames(value: string | null | undefined) {
  if (!value?.trim()) return []
  return [...new Set(value.split(',').map(item => item.trim()).filter(Boolean))]
}

export async function getRoleAccessActor(): Promise<RoleAccessActor | null> {
  const actor = await getAuthorizedActorForFunctions([...ROLE_ACCESS_ALLOWED_FUNCTIONS])
  return actor ? { userId: actor.userId, roleId: actor.roleId, grantedFunctionName: actor.grantedFunctionName } : null
}

export async function listRolesForAccess() {
  return prisma.roleMaster.findMany({
    orderBy: { roleId: 'asc' },
    select: { roleId: true, roleName: true },
  })
}

export async function listAccessFunctionsForAccess() {
  return prisma.accessFunction.findMany({
    where: {
      OR: [
        { accessFunctionName: { in: APP_ACCESS_CATALOG.map(item => item.functionName) } },
        { accessFunctionName: { not: null } },
      ],
    },
    orderBy: { accessFunctionName: 'asc' },
    select: { accessFunctionId: true, accessFunctionName: true },
  })
}

export async function listRoleAccessMappings() {
  return prisma.accessFunctionRole.findMany({
    select: {
      roleId: true,
      accessFunctionId: true,
      accessFunction: { select: { accessFunctionName: true } },
    },
  }).then(rows => rows.map(row => ({
    roleId: row.roleId,
    accessFunctionId: row.accessFunctionId,
    accessFunctionName: row.accessFunction.accessFunctionName,
  })))
}

export async function listRoleAccessAudit({
  roleId,
  changedByUserId,
  fromDate,
  toDate,
  page,
}: {
  roleId?: string
  changedByUserId?: string
  fromDate?: string
  toDate?: string
  page: number
}) {
  const conditions: Prisma.Sql[] = []
  const parsedRoleId = Number(roleId)
  if (Number.isInteger(parsedRoleId) && parsedRoleId > 0) {
    conditions.push(Prisma.sql`role_id = ${parsedRoleId}`)
  }

  const parsedChangedByUserId = Number(changedByUserId)
  if (Number.isInteger(parsedChangedByUserId) && parsedChangedByUserId > 0) {
    conditions.push(Prisma.sql`changed_by_user_id = ${parsedChangedByUserId}`)
  }

  if (fromDate) {
    const parsed = new Date(`${fromDate}T00:00:00`)
    if (!Number.isNaN(parsed.getTime())) conditions.push(Prisma.sql`changed_at >= ${parsed}`)
  }
  if (toDate) {
    const parsed = new Date(`${toDate}T23:59:59.999`)
    if (!Number.isNaN(parsed.getTime())) conditions.push(Prisma.sql`changed_at <= ${parsed}`)
  }

  const whereClause = conditions.length > 0
    ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
    : Prisma.sql``

  const skip = (page - 1) * ROLE_ACCESS_AUDIT_PAGE_SIZE
  const [rows, total] = await Promise.all([
    prisma.$queryRaw<Array<{
      role_access_audit_id: number
      role_id: number
      role_name_snapshot: string | null
      changed_by_user_id: number
      changed_by_user_name: string | null
      changed_at: Date
      added_function_names_csv: string | null
      removed_function_names_csv: string | null
      before_function_names_csv: string | null
      after_function_names_csv: string | null
    }>>(Prisma.sql`
      SELECT
        role_access_audit_id,
        role_id,
        role_name_snapshot,
        changed_by_user_id,
        changed_by_user_name,
        changed_at,
        added_function_names_csv,
        removed_function_names_csv,
        before_function_names_csv,
        after_function_names_csv
      FROM role_access_audit
      ${whereClause}
      ORDER BY changed_at DESC, role_access_audit_id DESC
      OFFSET ${skip}
      LIMIT ${ROLE_ACCESS_AUDIT_PAGE_SIZE}
    `),
    prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM role_access_audit
      ${whereClause}
    `),
  ])

  const totalCount = Number(total[0]?.count ?? BigInt(0))

  return {
    rows: rows.map(row => ({
      roleAccessAuditId: row.role_access_audit_id,
      roleId: row.role_id,
      roleNameSnapshot: row.role_name_snapshot,
      changedByUserId: row.changed_by_user_id,
      changedByUserName: row.changed_by_user_name,
      changedAt: row.changed_at,
      addedFunctionNames: decodeFunctionNames(row.added_function_names_csv),
      removedFunctionNames: decodeFunctionNames(row.removed_function_names_csv),
      beforeFunctionNames: decodeFunctionNames(row.before_function_names_csv),
      afterFunctionNames: decodeFunctionNames(row.after_function_names_csv),
    })),
    total: totalCount,
    page,
    pageCount: Math.max(1, Math.ceil(totalCount / ROLE_ACCESS_AUDIT_PAGE_SIZE)),
  }
}

export async function listRoleAccessAuditRoles() {
  return prisma.roleMaster.findMany({
    orderBy: { roleName: 'asc' },
    select: { roleId: true, roleName: true },
  })
}

export async function listRoleAccessAuditUsers() {
  return prisma.userTable.findMany({
    where: { status: 'Active' },
    orderBy: [{ displayName: 'asc' }, { userName: 'asc' }],
    select: { userId: true, displayName: true, userName: true },
  })
}

export function summarizeRoleAccessAudit(row: RoleAccessAuditRow) {
  const added = row.addedFunctionNames.length
  const removed = row.removedFunctionNames.length
  if (!added && !removed) return 'No permission changes'
  if (added && removed) return `Added ${added}, removed ${removed}`
  if (added) return `Added ${added} permission${added === 1 ? '' : 's'}`
  return `Removed ${removed} permission${removed === 1 ? '' : 's'}`
}

export function describeFunctionName(functionName: string) {
  const definition = getAccessDefinition(functionName)
  if (!definition) return functionName
  return `${definition.label} (${definition.functionName})`
}
