import assert from 'node:assert/strict'
import test from 'node:test'
import { RENAMED_ACCESS_FUNCTIONS, planLegacyAccessMigration, planExplicitAccessGrants } from '../scripts/lib/legacy-access-grants.mjs'

const functions = RENAMED_ACCESS_FUNCTIONS.flat().map((accessFunctionName, index) => ({ accessFunctionId: index + 1, accessFunctionName }))
const idFor = name => functions.find(row => row.accessFunctionName === name).accessFunctionId
const role = (roleId, names) => ({ roleId, roleName: `Role ${roleId}`, accessFunctionRole: names.map(accessFunctionName => ({ accessFunctionId: functions.find(row => row.accessFunctionName === accessFunctionName)?.accessFunctionId || 99, accessFunction: { accessFunctionName } })) })
function applyPlan(roles, plan) {
  return roles.map(current => {
    const change = plan.find(row => row.roleId === current.roleId)
    if (!change) return current
    return { ...current, accessFunctionRole: [
      ...current.accessFunctionRole.filter(row => !change.remove.some(grant => grant.id === row.accessFunctionId)),
      ...change.add.map(grant => ({ accessFunctionId: grant.id, accessFunction: { accessFunctionName: grant.name } })),
    ] }
  })
}

test('moves only existing legacy grants, keeping unrelated role permissions intact', () => {
  const plan = planLegacyAccessMigration([role(1, ['Document_CheckList', 'User_Access_Management']), role(4, ['FollowUp_Management']), role(5, ['Inventory_Management'])], functions)
  assert.equal(plan.length, 2)
  assert.deepEqual(plan[0].add, [{ id: idFor('Checklist_Management'), name: 'Checklist_Management' }])
  assert.deepEqual(plan[0].afterNames, ['Checklist_Management', 'User_Access_Management'])
  assert.deepEqual(plan[1].afterNames, ['Followup_Management'])
  assert.ok(plan.every(row => !row.afterNames.includes('Vehicle_Master_Management')))
})

test('retires legacy grants without duplicating an existing current grant', () => {
  const [plan] = planLegacyAccessMigration([role(1, ['Document_CheckList', 'Checklist_Management'])], functions)
  assert.deepEqual(plan.add, [])
  assert.equal(plan.remove.length, 1)
  assert.deepEqual(plan.afterNames, ['Checklist_Management'])
})

test('rerunning is a no-op and does not restore an administrator-revoked grant', () => {
  const roles = [role(1, ['Document_CheckList', 'RTO_Agent_Management'])]
  const migrated = applyPlan(roles, planLegacyAccessMigration(roles, functions))
  assert.deepEqual(planLegacyAccessMigration(migrated, functions), [])
  migrated[0].accessFunctionRole = migrated[0].accessFunctionRole.filter(row => row.accessFunction.accessFunctionName !== 'Checklist_Management')
  assert.deepEqual(planLegacyAccessMigration(migrated, functions), [])
})

test('all four renamed permissions are migrated independently of role name or ID', () => {
  for (const [legacy, current] of RENAMED_ACCESS_FUNCTIONS) {
    const [plan] = planLegacyAccessMigration([role(42, [legacy])], functions)
    assert.deepEqual(plan.afterNames, [current])
    assert.equal(plan.remove[0].name, legacy)
  }
})

test('fails safely when a target permission is missing or ambiguous', () => {
  assert.throws(() => planLegacyAccessMigration([], functions.slice(1, -1)), /Expected one permission definition/)
  assert.throws(() => planLegacyAccessMigration([], [...functions, functions[1]]), /found 2/)
})

test('explicit grants affect only the requested roles and permissions', () => {
  const roles = [role(1, ['Document_CheckList']), role(4, ['FollowUp_Management'])]
  const [plan] = planExplicitAccessGrants(roles, functions, ['Role 1'], ['Checklist_Management'])
  assert.equal(plan.roleId, 1)
  assert.deepEqual(plan.add, [{ id: idFor('Checklist_Management'), name: 'Checklist_Management' }])
  assert.deepEqual(plan.afterNames, ['Checklist_Management', 'Document_CheckList'])
})

test('explicit grants skip existing access and deduplicate requested values', () => {
  const roles = [role(1, ['Checklist_Management'])]
  assert.deepEqual(planExplicitAccessGrants(roles, functions, ['Role 1', 'Role 1'], ['Checklist_Management', 'Checklist_Management']), [])
})

test('explicit grants reject missing or ambiguous roles and permissions', () => {
  assert.throws(() => planExplicitAccessGrants([], functions, ['Role 1'], ['Checklist_Management']), /Expected one role/)
  assert.throws(() => planExplicitAccessGrants([role(1, []), { ...role(2, []), roleName: 'Role 1' }], functions, ['Role 1'], ['Checklist_Management']), /found 2/)
  assert.throws(() => planExplicitAccessGrants([role(1, [])], [], ['Role 1'], ['Checklist_Management']), /Expected one permission/)
})
