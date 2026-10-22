export const RENAMED_ACCESS_FUNCTIONS = [
  ['Document_CheckList', 'Checklist_Management'],
  ['RTO_Agent_Management', 'RTO_Management'],
  ['FollowUp_Management', 'Followup_Management'],
  ['Outstanding_Payment_Report', 'Outstanding_Payments_Report'],
]

export function planExplicitAccessGrants(roles, functions, roleNames, functionNames) {
  const targets = [...new Set(functionNames)].map(name => {
    const matches = functions.filter(row => row.accessFunctionName === name)
    if (matches.length !== 1) throw new Error(`Expected one permission definition for ${name}; found ${matches.length}.`)
    return { id: matches[0].accessFunctionId, name }
  })
  return [...new Set(roleNames)].flatMap(roleName => {
    const matches = roles.filter(role => role.roleName === roleName)
    if (matches.length !== 1) throw new Error(`Expected one role named ${roleName}; found ${matches.length}.`)
    const role = matches[0]
    const existingIds = new Set(role.accessFunctionRole.map(row => row.accessFunctionId))
    const add = targets.filter(target => !existingIds.has(target.id))
    if (!add.length) return []
    const beforeNames = [...new Set(role.accessFunctionRole.map(row => row.accessFunction.accessFunctionName).filter(Boolean))].sort()
    const afterNames = [...new Set([...beforeNames, ...add.map(grant => grant.name)])].sort()
    return [{ roleId: role.roleId, roleName: role.roleName, add, beforeNames, afterNames }]
  })
}

export function planLegacyAccessMigration(roles, functions) {
  const targets = new Map()
  for (const [, currentName] of RENAMED_ACCESS_FUNCTIONS) {
    const matches = functions.filter(row => row.accessFunctionName === currentName)
    if (matches.length !== 1) throw new Error(`Expected one permission definition for ${currentName}; found ${matches.length}.`)
    targets.set(currentName, matches[0].accessFunctionId)
  }
  const renamed = new Map(RENAMED_ACCESS_FUNCTIONS)
  return roles.flatMap(role => {
    const grants = role.accessFunctionRole.map(row => ({ id: row.accessFunctionId, name: row.accessFunction.accessFunctionName }))
    const remove = grants.filter(grant => renamed.has(grant.name))
    if (!remove.length) return []
    const existingIds = new Set(grants.map(grant => grant.id))
    const addById = new Map()
    for (const grant of remove) {
      const name = renamed.get(grant.name)
      const id = targets.get(name)
      if (!existingIds.has(id)) addById.set(id, { id, name })
    }
    const add = [...addById.values()]
    const beforeNames = [...new Set(grants.map(grant => grant.name).filter(Boolean))].sort()
    const afterNames = [...new Set([...grants.filter(grant => !renamed.has(grant.name)).map(grant => grant.name), ...add.map(grant => grant.name)].filter(Boolean))].sort()
    return [{ roleId: role.roleId, roleName: role.roleName, add, remove, beforeNames, afterNames }]
  })
}
