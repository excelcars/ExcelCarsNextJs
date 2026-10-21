'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { APP_ACCESS_CATALOG, APP_ACCESS_FUNCTION_NAMES, ROLE_ACCESS_FUNCTION, USER_ACCESS_FUNCTION } from '@/lib/access/accessCatalog'
import { getRoleAccessActor } from './queries'

interface ActionResult {
  success: boolean
  error?: string
}

export interface RoleActionResult extends ActionResult {
  roleId?: number
}

interface RoleAccessAuditEntry {
  roleName: string | null
  actorName: string | null
  addedFunctionNames: string[]
  removedFunctionNames: string[]
  previousFunctionNames: string[]
  nextFunctionNames: string[]
}

function encodeFunctionNames(functionNames: string[]) {
  return [...new Set(functionNames.map(name => name.trim()).filter(Boolean))].sort().join(',')
}

function sanitizeFunctionNames(functionNames: string[]) {
  return [...new Set(functionNames.map(name => name.trim()).filter(name => APP_ACCESS_FUNCTION_NAMES.has(name)))]
}

async function ensureRoleAccessAuditTable(tx: Prisma.TransactionClient) {
  const auditTable = await tx.$queryRaw<Array<{ audit_table: string | null }>>(Prisma.sql`
    SELECT to_regclass('public.role_access_audit') AS audit_table
  `)

  if (auditTable[0]?.audit_table) return

  await tx.$executeRaw(Prisma.sql`
    CREATE TABLE IF NOT EXISTS role_access_audit (
      role_access_audit_id SERIAL PRIMARY KEY,
      role_id INTEGER NOT NULL,
      role_name_snapshot TEXT NULL,
      changed_by_user_id INTEGER NOT NULL,
      changed_by_user_name TEXT NULL,
      changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      added_function_names_csv TEXT NULL,
      removed_function_names_csv TEXT NULL,
      before_function_names_csv TEXT NULL,
      after_function_names_csv TEXT NULL
    )
  `)
  await tx.$executeRaw(Prisma.sql`
    CREATE INDEX IF NOT EXISTS ix_role_access_audit_role_id
      ON role_access_audit (role_id)
  `)
  await tx.$executeRaw(Prisma.sql`
    CREATE INDEX IF NOT EXISTS ix_role_access_audit_changed_by_user_id
      ON role_access_audit (changed_by_user_id)
  `)
  await tx.$executeRaw(Prisma.sql`
    CREATE INDEX IF NOT EXISTS ix_role_access_audit_changed_at
      ON role_access_audit (changed_at DESC)
  `)
}

async function writeRoleAccessAudit(entry: RoleAccessAuditEntry, roleId: number, actorUserId: number) {
  await prisma.$transaction(async tx => {
    await ensureRoleAccessAuditTable(tx)
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO role_access_audit (
        role_id,
        role_name_snapshot,
        changed_by_user_id,
        changed_by_user_name,
        changed_at,
        added_function_names_csv,
        removed_function_names_csv,
        before_function_names_csv,
        after_function_names_csv
      ) VALUES (
        ${roleId},
        ${entry.roleName},
        ${actorUserId},
        ${entry.actorName},
        ${new Date()},
        ${encodeFunctionNames(entry.addedFunctionNames) || null},
        ${encodeFunctionNames(entry.removedFunctionNames) || null},
        ${encodeFunctionNames(entry.previousFunctionNames) || null},
        ${encodeFunctionNames(entry.nextFunctionNames) || null}
      )
    `)
  })
}

async function ensureCriticalPermissionCoverage(roleId: number, selectedFunctionNames: string[]) {
  const currentMappings = await prisma.accessFunctionRole.findMany({
    where: {
      roleId,
      accessFunction: { accessFunctionName: { in: [ROLE_ACCESS_FUNCTION, USER_ACCESS_FUNCTION] } },
    },
    select: {
      accessFunction: { select: { accessFunctionName: true } },
    },
  })

  const currentFunctionNames = new Set(currentMappings.map(row => row.accessFunction.accessFunctionName).filter(Boolean) as string[])
  const selected = new Set(selectedFunctionNames)

  for (const criticalFunctionName of [ROLE_ACCESS_FUNCTION, USER_ACCESS_FUNCTION]) {
    if (!currentFunctionNames.has(criticalFunctionName) || selected.has(criticalFunctionName)) continue

    const otherRoleCount = await prisma.accessFunctionRole.count({
      where: {
        roleId: { not: roleId },
        accessFunction: { accessFunctionName: criticalFunctionName },
      },
    })

    if (otherRoleCount === 0) {
      return criticalFunctionName === ROLE_ACCESS_FUNCTION
        ? 'At least one role must keep Role Access permission.'
        : 'At least one role must keep User Access permission.'
    }
  }

  return null
}

export async function saveRoleAccess(roleId: number, functionNames: string[]): Promise<ActionResult> {
  if (!Number.isInteger(roleId) || roleId <= 0) {
    return { success: false, error: 'Select a valid role.' }
  }

  const actor = await getRoleAccessActor()
  if (!actor) return { success: false, error: 'Not authorized.' }

  const role = await prisma.roleMaster.findUnique({
    where: { roleId },
    select: { roleId: true },
  })

  if (!role) return { success: false, error: 'Selected role no longer exists.' }

  const selectedFunctionNames = sanitizeFunctionNames(functionNames)
  const criticalCoverageError = await ensureCriticalPermissionCoverage(roleId, selectedFunctionNames)
  if (criticalCoverageError) return { success: false, error: criticalCoverageError }

  let auditEntry: RoleAccessAuditEntry | null = null

  try {
    await prisma.$transaction(async tx => {
      const existingFunctions = await tx.accessFunction.findMany({
        where: { accessFunctionName: { in: APP_ACCESS_CATALOG.map(item => item.functionName) } },
        select: { accessFunctionId: true, accessFunctionName: true },
      })

      const functionIdByName = new Map(
        existingFunctions
          .filter(row => row.accessFunctionName)
          .map(row => [row.accessFunctionName as string, row.accessFunctionId]),
      )

      for (const catalogEntry of APP_ACCESS_CATALOG) {
        if (functionIdByName.has(catalogEntry.functionName)) continue
        const created = await tx.accessFunction.create({
          data: {
            accessFunctionName: catalogEntry.functionName,
            createdBy: actor.userId,
            updatedBy: actor.userId,
            createdDate: new Date(),
            updatedDate: new Date(),
          },
          select: { accessFunctionId: true, accessFunctionName: true },
        })
        if (created.accessFunctionName) functionIdByName.set(created.accessFunctionName, created.accessFunctionId)
      }

      const managedAccessFunctionIds = [...functionIdByName.values()]
      const managedFunctionNames = [...functionIdByName.keys()]

      const existingMappings = await tx.accessFunctionRole.findMany({
        where: {
          roleId,
          accessFunctionId: { in: managedAccessFunctionIds },
        },
        select: {
          accessFunction: { select: { accessFunctionName: true } },
        },
      })

      const previousFunctionNames = existingMappings
        .map(row => row.accessFunction.accessFunctionName?.trim())
        .filter((value): value is string => !!value && managedFunctionNames.includes(value))
        .sort()

      await tx.accessFunctionRole.deleteMany({
        where: {
          roleId,
          accessFunctionId: { in: managedAccessFunctionIds },
        },
      })

      const rowsToCreate = selectedFunctionNames
        .map(functionName => {
          const accessFunctionId = functionIdByName.get(functionName)
          return accessFunctionId ? { roleId, accessFunctionId } : null
        })
        .filter((row): row is { roleId: number; accessFunctionId: number } => row !== null)

      if (rowsToCreate.length > 0) {
        await tx.accessFunctionRole.createMany({
          data: rowsToCreate,
          skipDuplicates: true,
        })
      }

      const previousSet = new Set(previousFunctionNames)
      const nextSet = new Set(selectedFunctionNames)
      const addedFunctionNames = selectedFunctionNames.filter(name => !previousSet.has(name))
      const removedFunctionNames = previousFunctionNames.filter(name => !nextSet.has(name))

      if (addedFunctionNames.length > 0 || removedFunctionNames.length > 0) {
        const roleDetails = await tx.roleMaster.findUnique({
          where: { roleId },
          select: { roleName: true },
        })
        const actorDetails = await tx.userTable.findUnique({
          where: { userId: actor.userId },
          select: { userName: true, displayName: true },
        })
        auditEntry = {
          roleName: roleDetails?.roleName ?? null,
          actorName: actorDetails?.displayName?.trim() || actorDetails?.userName?.trim() || null,
          addedFunctionNames,
          removedFunctionNames,
          previousFunctionNames,
          nextFunctionNames: selectedFunctionNames,
        }
      }
    })
  } catch (error) {
    console.error('saveRoleAccess transaction failed', error)
    throw new Error('Role access could not be saved.')
  }

  if (auditEntry) {
    try {
      await writeRoleAccessAudit(auditEntry, roleId, actor.userId)
    } catch (error) {
      console.error('saveRoleAccess audit write failed', error)
    }
  }

  revalidatePath('/config/role-access')
  revalidatePath('/config/role-access/history')
  return { success: true }
}

function normalizeRoleName(roleName: string) {
  return roleName.trim()
}

export async function createRole(roleName: string): Promise<RoleActionResult> {
  const actor = await getRoleAccessActor()
  if (!actor) return { success: false, error: 'Not authorized.' }

  const normalizedRoleName = normalizeRoleName(roleName)
  if (!normalizedRoleName) return { success: false, error: 'Role name is required.' }
  if (normalizedRoleName.length > 100) return { success: false, error: 'Role name must be 100 characters or fewer.' }

  const duplicate = await prisma.roleMaster.findFirst({
    where: { roleName: { equals: normalizedRoleName, mode: 'insensitive' } },
    select: { roleId: true },
  })
  if (duplicate) return { success: false, error: 'A role with this name already exists.' }

  try {
    const now = new Date()
    const created = await prisma.roleMaster.create({
      data: {
        roleName: normalizedRoleName,
        createdBy: actor.userId,
        updatedBy: actor.userId,
        createdDate: now,
        updatedDate: now,
      },
      select: { roleId: true },
    })

    revalidatePath('/config/role-access')
    revalidatePath('/config/role-access/history')
    return { success: true, roleId: created.roleId }
  } catch {
    return { success: false, error: 'Something went wrong creating this role.' }
  }
}

export async function updateRole(roleId: number, roleName: string): Promise<RoleActionResult> {
  if (!Number.isInteger(roleId) || roleId <= 0) return { success: false, error: 'Select a valid role.' }

  const actor = await getRoleAccessActor()
  if (!actor) return { success: false, error: 'Not authorized.' }

  const normalizedRoleName = normalizeRoleName(roleName)
  if (!normalizedRoleName) return { success: false, error: 'Role name is required.' }
  if (normalizedRoleName.length > 100) return { success: false, error: 'Role name must be 100 characters or fewer.' }

  const role = await prisma.roleMaster.findUnique({
    where: { roleId },
    select: { roleId: true },
  })
  if (!role) return { success: false, error: 'Selected role no longer exists.' }

  const duplicate = await prisma.roleMaster.findFirst({
    where: {
      roleName: { equals: normalizedRoleName, mode: 'insensitive' },
      NOT: { roleId },
    },
    select: { roleId: true },
  })
  if (duplicate) return { success: false, error: 'A role with this name already exists.' }

  try {
    await prisma.roleMaster.update({
      where: { roleId },
      data: {
        roleName: normalizedRoleName,
        updatedBy: actor.userId,
        updatedDate: new Date(),
      },
      select: { roleId: true },
    })

    revalidatePath('/config/role-access')
    revalidatePath('/config/role-access/history')
    return { success: true, roleId }
  } catch {
    return { success: false, error: 'Something went wrong updating this role.' }
  }
}

export async function deleteRole(roleId: number): Promise<ActionResult> {
  if (!Number.isInteger(roleId) || roleId <= 0) return { success: false, error: 'Select a valid role.' }

  const actor = await getRoleAccessActor()
  if (!actor) return { success: false, error: 'Not authorized.' }

  const role = await prisma.roleMaster.findUnique({
    where: { roleId },
    select: { roleId: true },
  })
  if (!role) return { success: false, error: 'Selected role no longer exists.' }

  const userCount = await prisma.userTable.count({
    where: { roleId },
  })
  if (userCount > 0) {
    return { success: false, error: 'Role cannot be deleted because it is assigned to one or more users.' }
  }

  const criticalCoverageError = await ensureCriticalPermissionCoverage(roleId, [])
  if (criticalCoverageError) return { success: false, error: criticalCoverageError }

  try {
    await prisma.$transaction(async tx => {
      await tx.accessFunctionRole.deleteMany({
        where: { roleId },
      })
      await tx.roleMaster.delete({
        where: { roleId },
      })
    })

    revalidatePath('/config/role-access')
    revalidatePath('/config/role-access/history')
    return { success: true }
  } catch {
    return { success: false, error: 'Something went wrong deleting this role.' }
  }
}
