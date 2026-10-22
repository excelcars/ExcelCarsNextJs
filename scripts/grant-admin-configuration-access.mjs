import { readFileSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'
import { planExplicitAccessGrants } from './lib/legacy-access-grants.mjs'

// Explicitly approved in this task. Other roles and capabilities are excluded.
const roleNames = ['SystemAdmin', 'SuperAdmin', 'Admin']
const functionNames = ['Vehicle_Master_Management', 'Inquiry_Source_Master_Management', 'Portal_Assignment_Management', 'Message_Template_Management']
const envFile = process.argv.find(arg => arg.startsWith('--env-file='))?.slice('--env-file='.length)
if (!envFile) throw new Error('Select an environment explicitly with --env-file=...')
for (const rawLine of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
  const line = rawLine.trim()
  const separator = line.indexOf('=')
  if (!line || line.startsWith('#') || separator < 1) continue
  process.env[line.slice(0, separator).trim()] = line.slice(separator + 1).trim().replace(/^(["'])(.*)\1$/, '$2')
}
const apply = process.argv.includes('--apply')
if (apply && !process.argv.includes('--confirm-production')) throw new Error('Applying requires --confirm-production. Omit --apply for a read-only preview.')
const actorUserId = Number(process.argv.find(arg => arg.startsWith('--actor-user-id='))?.slice('--actor-user-id='.length))
if (apply && (!Number.isInteger(actorUserId) || actorUserId < 1)) throw new Error('Applying requires --actor-user-id=<authorized administrator>.')
const prisma = new PrismaClient()

async function grant(db) {
  const [roles, functions] = await Promise.all([
    db.roleMaster.findMany({ select: { roleId: true, roleName: true, accessFunctionRole: { select: { accessFunctionId: true, accessFunction: { select: { accessFunctionName: true } } } } } }),
    db.accessFunction.findMany({ where: { accessFunctionName: { in: functionNames } }, select: { accessFunctionId: true, accessFunctionName: true } }),
  ])
  const plan = planExplicitAccessGrants(roles, functions, roleNames, functionNames)
  const summary = { mode: apply ? 'apply' : 'preview', roles: plan.map(role => ({ roleId: role.roleId, roleName: role.roleName, add: role.add.map(grant => grant.name) })), additions: plan.reduce((sum, role) => sum + role.add.length, 0) }
  if (!apply || !plan.length) return summary
  const actor = await db.userTable.findUnique({ where: { userId: actorUserId }, select: { status: true, roleId: true, displayName: true, userName: true } })
  const actorRole = roles.find(role => role.roleId === actor?.roleId)
  const actorAllowed = actorRole?.accessFunctionRole.some(row => ['Role_Access_Management', 'User_Access_Management'].includes(row.accessFunction.accessFunctionName))
  if (actor?.status !== 'Active' || !actorAllowed) throw new Error('Audit actor must be an active Role Access administrator.')
  await db.accessFunctionRole.createMany({ data: plan.flatMap(role => role.add.map(grant => ({ roleId: role.roleId, accessFunctionId: grant.id }))) })
  await db.roleAccessAudit.createMany({
    data: plan.map(role => ({
      roleId: role.roleId,
      roleNameSnapshot: role.roleName,
      changedByUserId: actorUserId,
      changedByUserName: actor.displayName || actor.userName,
      addedFunctionNamesCsv: role.add.map(grant => grant.name).sort().join(','),
      beforeFunctionNamesCsv: role.beforeNames.join(',') || null,
      afterFunctionNamesCsv: role.afterNames.join(','),
    })),
  })
  return { ...summary, auditEvents: plan.length }
}

try {
  const summary = apply ? await prisma.$transaction(grant, { isolationLevel: 'Serializable', timeout: 20_000, maxWait: 10_000 }) : await grant(prisma)
  console.log(JSON.stringify(summary, null, 2))
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
