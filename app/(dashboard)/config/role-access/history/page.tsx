import { redirect } from 'next/navigation'
import { RoleAccessHistoryClient } from '@/features/roleaccess/RoleAccessHistoryClient'
import { getRoleAccessActor, listRoleAccessAudit, listRoleAccessAuditRoles, listRoleAccessAuditUsers } from '@/features/roleaccess/queries'

export default async function RoleAccessHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ roleId?: string; changedByUserId?: string; fromDate?: string; toDate?: string; page?: string }>
}) {
  const sp = await searchParams
  const actor = await getRoleAccessActor()
  if (!actor) redirect('/dashboard')

  const roleId = sp.roleId ?? ''
  const changedByUserId = sp.changedByUserId ?? ''
  const fromDate = sp.fromDate ?? ''
  const toDate = sp.toDate ?? ''
  const page = Math.max(1, Number(sp.page) || 1)

  const [result, roles, users] = await Promise.all([
    listRoleAccessAudit({ roleId, changedByUserId, fromDate, toDate, page }),
    listRoleAccessAuditRoles(),
    listRoleAccessAuditUsers(),
  ])

  return (
    <RoleAccessHistoryClient
      rows={result.rows}
      total={result.total}
      page={result.page}
      pageCount={result.pageCount}
      roleId={roleId}
      changedByUserId={changedByUserId}
      fromDate={fromDate}
      toDate={toDate}
      roles={roles}
      users={users}
      actor={actor}
    />
  )
}
