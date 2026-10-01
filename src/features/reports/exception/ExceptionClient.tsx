'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Btn, Input, Select, Table, PageHeader } from '@/components/ui'
import { formatExceptionDateTime } from './date'

interface ExceptionRow {
  logginsId: number
  userName: string | null
  code: string | null
  message: string | null
  error: string | null
  url: string | null
  source: string | null
  ipaddress: string | null
  datetime: Date | string | null
}
interface UserOption { userId: number; displayName: string | null; userName: string | null }

export function ExceptionClient({
  initialData, users, total, page, pageCount, fromDate, toDate, userId, filterError,
}: {
  initialData: ExceptionRow[]
  users: UserOption[]
  total: number
  page: number
  pageCount: number
  fromDate: string
  toDate: string
  userId: number | null
  filterError: string | null
}) {
  const router = useRouter()

  const pushQuery = (params: Record<string, string>) => {
    const q = new URLSearchParams({ fromDate, toDate, ...(userId ? { userId: String(userId) } : {}), page: '1', ...params })
    for (const [k, v] of [...q.entries()]) {
      if (!v) q.delete(k)
    }
    router.push(`/reports/exception${q.toString() ? `?${q.toString()}` : ''}`)
  }

  return (
    <div>
      <PageHeader title="Exception Log" subtitle={`${total.toLocaleString('en-IN')} logged exceptions`} />

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <Input label="From" type="date" value={fromDate} onChange={e => pushQuery({ fromDate: e.target.value })} />
        <Input label="To" type="date" value={toDate} onChange={e => pushQuery({ toDate: e.target.value })} />
        <Select label="User" value={userId ?? ''} onChange={e => pushQuery({ userId: e.target.value })}>
          <option value="">All Users</option>
          {users.map(u => <option key={u.userId} value={u.userId}>{u.displayName ?? u.userName}</option>)}
        </Select>
        {(fromDate || toDate || userId || filterError) && (
          <Btn variant="outline" size="sm" onClick={() => pushQuery({ fromDate: '', toDate: '', userId: '' })}>Clear filters</Btn>
        )}
      </div>

      {filterError && <p role="alert" className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{filterError}</p>}

      <Table
        headers={['Date/Time', 'User', 'Code', 'Message', 'Error', 'Source', 'URL']}
        empty={initialData.length === 0}
        emptyMessage={filterError ? 'Correct the filters above to load exception logs.' : 'No exception logs match the current filters.'}
      >
        {initialData.map(r => (
          <tr key={r.logginsId} className="hover:bg-gray-50 transition">
            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatExceptionDateTime(r.datetime)}</td>
            <td className="px-4 py-3 text-sm text-gray-700">{r.userName ?? '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{r.code ?? '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title={r.message ?? ''}>{r.message ?? '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title={r.error ?? ''}>{r.error ?? '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{r.source ?? '—'}</td>
            <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate" title={r.url ?? ''}>{r.url ?? '—'}</td>
          </tr>
        ))}
      </Table>

      {pageCount > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-xs text-gray-500">Page {page} of {pageCount}</div>
          <div className="flex gap-1.5">
            <Btn variant="outline" size="sm" disabled={page <= 1} onClick={() => pushQuery({ page: String(page - 1) })}>
              <ChevronLeft className="w-3.5 h-3.5" />Prev
            </Btn>
            <Btn variant="outline" size="sm" disabled={page >= pageCount} onClick={() => pushQuery({ page: String(page + 1) })}>
              Next<ChevronRight className="w-3.5 h-3.5" />
            </Btn>
          </div>
        </div>
      )}
    </div>
  )
}
