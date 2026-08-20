'use client'

import { useRouter } from 'next/navigation'
import { Badge, Btn, Input, Select, Table, PageHeader } from '@/components/ui'

interface FollowupRow {
  pkFollowupId: number
  followupDate: Date | string | null
  followupStatus: string | null
  followupSubStatus: string | null
  followupClassification: string | null
  comments: string | null
  updatedDt: Date | string | null
  updatedByName: string | null
  inquiryNo: string | null
  dateOfInquiry: Date | string | null
  customerName: string | null
  mobileno: string | null
  email: string | null
  budgetOfCustomer: string | null
  createdByName: string | null
  carDetails: string
}
interface UserOption { userId: number; displayName: string | null; userName: string | null }

const fmtDate = (d: Date | string | null) => d ? new Date(d).toISOString().slice(0, 10) : ''
const fmtMoney = (n: string | number | null) => n ? `₹${Number(n).toLocaleString('en-IN')}` : '—'

export function TodayClient({
  initialData, users, fromDate, toDate, userId, restricted,
}: {
  initialData: FollowupRow[]
  users: UserOption[]
  fromDate: string
  toDate: string
  userId: number | null
  restricted: boolean
}) {
  const router = useRouter()

  const pushQuery = (params: Record<string, string>) => {
    const q = new URLSearchParams({ fromDate, toDate, ...(userId ? { userId: String(userId) } : {}), ...params })
    for (const [k, v] of [...q.entries()]) {
      if (!v) q.delete(k)
    }
    router.push(`/reports/today${q.toString() ? `?${q.toString()}` : ''}`)
  }

  return (
    <div>
      <PageHeader
        title="Today's Inquiry & Follow-up"
        subtitle={`${initialData.length} follow-up activities${restricted ? ' · showing your inquiries only' : ''}`}
      />

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <Input label="From" type="date" value={fromDate} onChange={e => pushQuery({ fromDate: e.target.value })} />
        <Input label="To" type="date" value={toDate} onChange={e => pushQuery({ toDate: e.target.value })} />
        {!restricted && (
          <Select label="Updated By" value={userId ?? ''} onChange={e => pushQuery({ userId: e.target.value })}>
            <option value="">All Users</option>
            {users.map(u => <option key={u.userId} value={u.userId}>{u.displayName ?? u.userName}</option>)}
          </Select>
        )}
        <Btn variant="outline" size="sm" onClick={() => { const t = new Date().toISOString().slice(0, 10); pushQuery({ fromDate: t, toDate: t, userId: '' }) }}>Today</Btn>
      </div>

      <Table headers={['Inquiry', 'Customer', 'Contact', 'Car Interest', 'Budget', 'Classification', 'Status', 'Sub-status', 'Comments', 'Updated By', 'Updated']} empty={initialData.length === 0}>
        {initialData.map(r => (
          <tr key={r.pkFollowupId} className="hover:bg-gray-50 transition">
            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{r.inquiryNo ?? '—'}</td>
            <td className="px-4 py-3 font-medium text-gray-900">{r.customerName ?? '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-600 font-mono">{r.mobileno ?? '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{r.carDetails || '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{fmtMoney(r.budgetOfCustomer)}</td>
            <td className="px-4 py-3">{r.followupClassification ? <Badge label={r.followupClassification} /> : '—'}</td>
            <td className="px-4 py-3">{r.followupStatus ? <Badge label={r.followupStatus} /> : '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-600 max-w-[140px] truncate" title={r.followupSubStatus ?? ''}>{r.followupSubStatus ?? '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-600 max-w-[180px] truncate" title={r.comments ?? ''}>{r.comments ?? '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{r.updatedByName ?? '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{fmtDate(r.updatedDt)}</td>
          </tr>
        ))}
      </Table>
    </div>
  )
}
