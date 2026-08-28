'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Eye, History, ShieldCheck } from 'lucide-react'
import { Btn, Input, LoadingOverlay, Modal, PageHeader, Select, Table } from '@/components/ui'
import { describeFunctionName, ROLE_ACCESS_AUDIT_PAGE_SIZE, summarizeRoleAccessAudit, type RoleAccessActor, type RoleAccessAuditRow, type RoleAccessRoleRow } from './queries'

interface AuditUserOption {
  userId: number
  displayName: string | null
  userName: string | null
}

function formatDateTime(value: Date | string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function userLabel(user: AuditUserOption) {
  return user.displayName?.trim() || user.userName?.trim() || `User #${user.userId}`
}

function roleLabel(role: RoleAccessRoleRow) {
  return role.roleName?.trim() || `Role #${role.roleId}`
}

function ViewSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</div>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <div className="text-sm text-gray-400">None</div>
        ) : items.map(item => (
          <div key={item} className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">{describeFunctionName(item)}</div>
        ))}
      </div>
    </div>
  )
}

export function RoleAccessHistoryClient({
  rows,
  total,
  page,
  pageCount,
  roleId,
  changedByUserId,
  fromDate,
  toDate,
  roles,
  users,
  actor,
}: {
  rows: RoleAccessAuditRow[]
  total: number
  page: number
  pageCount: number
  roleId: string
  changedByUserId: string
  fromDate: string
  toDate: string
  roles: RoleAccessRoleRow[]
  users: AuditUserOption[]
  actor: RoleAccessActor
}) {
  const router = useRouter()
  const [viewRow, setViewRow] = useState<RoleAccessAuditRow | null>(null)
  const [isRoutePending, startRouteTransition] = useTransition()

  const activeFilterCount = useMemo(
    () => [roleId ? 1 : 0, changedByUserId ? 1 : 0, fromDate ? 1 : 0, toDate ? 1 : 0].reduce((sum, value) => sum + value, 0),
    [changedByUserId, fromDate, roleId, toDate],
  )

  const pushQuery = (params: Record<string, string>) => {
    const query = new URLSearchParams({ roleId, changedByUserId, fromDate, toDate, page: '1', ...params })
    for (const [key, value] of [...query.entries()]) {
      if (!value) query.delete(key)
    }
    startRouteTransition(() => {
      router.push(`/config/role-access/history${query.toString() ? `?${query.toString()}` : ''}`)
    })
  }

  return (
    <div>
      <PageHeader
        title="Role Access History"
        subtitle={`${total.toLocaleString('en-IN')} permission change event${total === 1 ? '' : 's'}${pageCount > 1 ? ` · Page ${page} of ${pageCount}` : ''}${actor.grantedFunctionName === 'User_Access_Management' ? ' · bootstrap access via User Access permission' : ''}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Btn variant="outline" onClick={() => router.push('/config/role-access')} disabled={isRoutePending}>
              Back to Role Access
            </Btn>
          </div>
        }
      />

      <div className="relative">
        <LoadingOverlay show={isRoutePending} label="Loading history..." />

        <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Select label="Role" value={roleId} onChange={e => pushQuery({ roleId: e.target.value })} disabled={isRoutePending}>
              <option value="">All Roles</option>
              {roles.map(role => (
                <option key={role.roleId} value={String(role.roleId)}>{roleLabel(role)}</option>
              ))}
            </Select>
            <Select label="Changed By" value={changedByUserId} onChange={e => pushQuery({ changedByUserId: e.target.value })} disabled={isRoutePending}>
              <option value="">All Users</option>
              {users.map(user => (
                <option key={user.userId} value={String(user.userId)}>{userLabel(user)}</option>
              ))}
            </Select>
            <Input label="From Date" type="date" value={fromDate} onChange={e => pushQuery({ fromDate: e.target.value })} disabled={isRoutePending} />
            <Input label="To Date" type="date" value={toDate} onChange={e => pushQuery({ toDate: e.target.value })} disabled={isRoutePending} />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="text-sm text-gray-600">
              {activeFilterCount > 0
                ? `${activeFilterCount} active filter${activeFilterCount === 1 ? '' : 's'} applied${pageCount > 1 ? ` · Page ${page} of ${pageCount}` : ''}`
                : `No filters applied${pageCount > 1 ? ` · Page ${page} of ${pageCount}` : ''}`}
            </div>
            <Btn
              variant="outline"
              size="sm"
              onClick={() => pushQuery({ roleId: '', changedByUserId: '', fromDate: '', toDate: '', page: '1' })}
              disabled={isRoutePending || (!roleId && !changedByUserId && !fromDate && !toDate)}
            >
              Clear filters
            </Btn>
          </div>
        </div>

        <Table
          headers={['Date / Time', 'Role', 'Changed By', 'Summary', 'Actions']}
          empty={rows.length === 0}
          emptyMessage="No role-permission history matches these filters."
        >
          {rows.map(row => (
            <tr key={row.roleAccessAuditId} className="hover:bg-gray-50 transition">
              <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{formatDateTime(row.changedAt)}</td>
              <td className="px-4 py-3">
                <div className="text-sm font-medium text-gray-900">{row.roleNameSnapshot?.trim() || `Role #${row.roleId}`}</div>
                <div className="text-xs text-gray-500">Role ID: {row.roleId}</div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">{row.changedByUserName?.trim() || `User #${row.changedByUserId}`}</td>
              <td className="px-4 py-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-[#1B2A6B]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {summarizeRoleAccessAudit(row)}
                </div>
              </td>
              <td className="px-4 py-3">
                <button onClick={() => setViewRow(row)} className="p-1.5 text-gray-400 hover:text-[#1B2A6B] hover:bg-blue-50 rounded transition" title="View details">
                  <Eye className="w-3.5 h-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </Table>

        {pageCount > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Showing {((page - 1) * ROLE_ACCESS_AUDIT_PAGE_SIZE) + (rows.length ? 1 : 0)}-{((page - 1) * ROLE_ACCESS_AUDIT_PAGE_SIZE) + rows.length} of {total.toLocaleString('en-IN')} · Page {page} of {pageCount}
            </div>
            <div className="flex gap-1.5">
              <Btn variant="outline" size="sm" disabled={isRoutePending || page <= 1} onClick={() => pushQuery({ page: String(page - 1) })}>
                <ChevronLeft className="w-3.5 h-3.5" />Prev
              </Btn>
              <Btn variant="outline" size="sm" disabled={isRoutePending || page >= pageCount} onClick={() => pushQuery({ page: String(page + 1) })}>
                Next<ChevronRight className="w-3.5 h-3.5" />
              </Btn>
            </div>
          </div>
        )}
      </div>

      <Modal
        title={`Role Access Change${viewRow ? ` — ${viewRow.roleNameSnapshot?.trim() || `Role #${viewRow.roleId}`}` : ''}`}
        open={!!viewRow}
        onClose={() => setViewRow(null)}
        width="max-w-5xl"
      >
        {viewRow ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Changed At</div>
                <div className="mt-2 text-sm text-gray-800">{formatDateTime(viewRow.changedAt)}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Role</div>
                <div className="mt-2 text-sm text-gray-800">{viewRow.roleNameSnapshot?.trim() || `Role #${viewRow.roleId}`}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Changed By</div>
                <div className="mt-2 text-sm text-gray-800">{viewRow.changedByUserName?.trim() || `User #${viewRow.changedByUserId}`}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Summary</div>
                <div className="mt-2 text-sm text-gray-800">{summarizeRoleAccessAudit(viewRow)}</div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <ViewSection title="Added Permissions" items={viewRow.addedFunctionNames} />
              <ViewSection title="Removed Permissions" items={viewRow.removedFunctionNames} />
              <ViewSection title="Before Snapshot" items={viewRow.beforeFunctionNames} />
              <ViewSection title="After Snapshot" items={viewRow.afterFunctionNames} />
            </div>

            <div className="flex justify-end">
              <Btn variant="outline" onClick={() => setViewRow(null)}>Close</Btn>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
