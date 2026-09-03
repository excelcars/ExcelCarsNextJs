import { listUsers, getAssignableRoles, listStates, listUserAccessRoles } from '@/features/useraccess/queries'
import { UserAccessClient } from '@/features/useraccess/UserAccessClient'
import { getUserAccessActor } from '@/features/useraccess/permissions'
import { redirect } from 'next/navigation'

export default async function UserAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; roleId?: string; stateId?: string; page?: string }>
}) {
  const sp = await searchParams
  const actor = await getUserAccessActor()
  if (!actor) redirect('/dashboard')

  const search = sp.search ?? ''
  const status = sp.status ?? 'All'
  const roleId = sp.roleId ?? ''
  const stateId = sp.stateId ?? ''
  const page = Math.max(1, Number(sp.page) || 1)

  const [result, roles, filterRoles, states] = await Promise.all([
    listUsers({ search, status, roleId, stateId, page }),
    getAssignableRoles(actor.roleId),
    listUserAccessRoles(),
    listStates(),
  ])

  return (
    <UserAccessClient
      initialData={result.rows}
      total={result.total}
      page={result.page}
      pageCount={result.pageCount}
      search={search}
      status={status}
      roleId={roleId}
      stateId={stateId}
      roles={roles}
      filterRoles={filterRoles}
      states={states}
      actor={actor}
    />
  )
}
