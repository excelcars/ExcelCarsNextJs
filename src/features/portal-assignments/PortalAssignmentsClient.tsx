'use client'

import { useState, useTransition } from 'react'
import { Btn, Select, Table } from '@/components/ui'
import { savePortalAssignment } from './actions'

type Source = {
  sourceId: number
  code: string
  displayName: string
  category: string
  portalAssignment: { assignedToUserId: number; isActive: boolean; updatedAt: Date } | null
}

type User = { userId: number; displayName: string | null; userName: string | null }

function userLabel(user: User) {
  return user.displayName?.trim() || user.userName?.trim() || `User #${user.userId}`
}

export function PortalAssignmentsClient({ initialSources, users }: { initialSources: Source[]; users: User[] }) {
  const [values, setValues] = useState<Record<number, string>>(() => Object.fromEntries(initialSources.map(source => [source.sourceId, source.portalAssignment?.assignedToUserId ? String(source.portalAssignment.assignedToUserId) : ''])))
  const [message, setMessage] = useState('')
  const [pendingSourceId, setPendingSourceId] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  const save = (sourceId: number) => {
    setMessage('')
    setPendingSourceId(sourceId)
    startTransition(async () => {
      const value = values[sourceId] ?? ''
      const result = await savePortalAssignment(sourceId, value ? Number(value) : null)
      setMessage(result.success ? 'Portal assignment saved.' : (result.error ?? 'Could not save portal assignment.'))
      setPendingSourceId(null)
    })
  }

  return (
    <div className="min-w-0 [overflow-wrap:anywhere] [&_select]:min-h-11 [&_select]:min-w-0 [&_select]:max-w-full [&_select]:text-base sm:[&_select]:text-sm">
      <header className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Portal Assignments</h1>
        <p className="mt-0.5 text-sm text-gray-500">Assign each incoming portal source to the InquiryAssistant who owns new enquiries.</p>
      </header>
      {message ? <div role="status" aria-live="polite" className={`mb-4 rounded-lg border px-4 py-3 text-sm ${message === 'Portal assignment saved.' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{message}</div> : null}
      <div className="space-y-3 lg:hidden">
        {initialSources.length === 0 ? <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">No active portal sources are available.</div> : initialSources.map(source => {
          const isSaving = isPending && pendingSourceId === source.sourceId
          return (
            <article key={source.sourceId} className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm" aria-busy={isSaving}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="min-w-0 flex-1 font-semibold text-gray-900">{source.displayName}</h2>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-[#1B2A6B]">{source.category}</span>
              </div>
              <p className="mt-1 font-mono text-sm text-gray-500">{source.code}</p>
              <div className="mt-4">
                <Select label="Assigned Employee" aria-label={`Assign ${source.displayName}`} value={values[source.sourceId] ?? ''} onChange={event => setValues(current => ({ ...current, [source.sourceId]: event.target.value }))} disabled={isPending}>
                  <option value="">Unassigned</option>
                  {users.map(user => <option key={user.userId} value={user.userId}>{userLabel(user)}</option>)}
                </Select>
              </div>
              <Btn className="mt-3 min-h-11 w-full justify-center" onClick={() => save(source.sourceId)} disabled={isPending}>{isSaving ? 'Saving...' : 'Save'}</Btn>
            </article>
          )
        })}
      </div>
      <div className="hidden lg:block">
      <Table headers={['Portal', 'Category', 'Assigned Employee', 'Action']} minWidthClass="min-w-[760px]" empty={initialSources.length === 0} emptyMessage="No active portal sources are available.">
        {initialSources.map(source => {
          const isSaving = isPending && pendingSourceId === source.sourceId
          return <tr key={source.sourceId} className="hover:bg-gray-50">
            <td className="px-4 py-3"><div className="font-medium text-gray-900">{source.displayName}</div><div className="mt-1 font-mono text-sm text-gray-500">{source.code}</div></td>
            <td className="px-4 py-3 text-sm text-gray-700">{source.category}</td>
            <td className="px-4 py-3"><Select aria-label={`Assign ${source.displayName}`} value={values[source.sourceId] ?? ''} onChange={event => setValues(current => ({ ...current, [source.sourceId]: event.target.value }))} disabled={isPending}><option value="">Unassigned</option>{users.map(user => <option key={user.userId} value={user.userId}>{userLabel(user)}</option>)}</Select></td>
            <td className="px-4 py-3"><Btn className="min-h-11 justify-center" size="sm" onClick={() => save(source.sourceId)} disabled={isPending}>{isSaving ? 'Saving...' : 'Save'}</Btn></td>
          </tr>
        })}
      </Table>
      </div>
      {users.length === 0 ? <p className="mt-3 text-sm text-amber-700">No active InquiryAssistant users are available for assignment.</p> : null}
    </div>
  )
}
