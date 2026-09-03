import { redirect } from 'next/navigation'
import { RoleAccessClient } from '@/features/roleaccess/RoleAccessClient'
import { getRoleAccessActor, listAccessFunctionsForAccess, listRoleAccessMappings, listRolesForAccess } from '@/features/roleaccess/queries'

export default async function RoleAccessPage() {
  const actor = await getRoleAccessActor()
  if (!actor) redirect('/dashboard')

  const [roles, accessFunctions, mappings] = await Promise.all([
    listRolesForAccess(),
    listAccessFunctionsForAccess(),
    listRoleAccessMappings(),
  ])

  return (
    <RoleAccessClient
      roles={roles}
      accessFunctions={accessFunctions}
      mappings={mappings}
      actor={actor}
    />
  )
}
