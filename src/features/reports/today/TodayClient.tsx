'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download } from 'lucide-react'
import { Badge, Btn, Input, Select, Table, PageHeader } from '@/components/ui'
import { formatIndiaDate, indiaDateKey } from './date'

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
  website: string | null
  customerName: string | null
  mobileno: string | null
  email: string | null
  budgetOfCustomer: string | null
  visitedDateOfCustomer: Date | string | null
  createdDt: Date | string | null
  createdByName: string | null
  carDetails: string
}
interface UserOption { userId: number; displayName: string | null; userName: string | null }

const fmtDate = formatIndiaDate
const fmtMoney = (n: string | number | null) => n ? `₹${Number(n).toLocaleString('en-IN')}` : '—'

export function TodayClient({
  initialData, users, fromDate, toDate, userId, restricted, searched, searchError, queryError,
}: {
  initialData: FollowupRow[]
  users: UserOption[]
  fromDate: string
  toDate: string
  userId: number | null
  restricted: boolean
  searched: boolean
  searchError: string | null
  queryError: string | null
}) {
  const router = useRouter()
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [filters, setFilters] = useState({ fromDate, toDate, userId: userId ? String(userId) : '' })

  useEffect(() => {
    setFilters({ fromDate, toDate, userId: userId ? String(userId) : '' })
  }, [fromDate, toDate, userId])

  const reportUrl = (next: typeof filters, includeSearch: boolean) => {
    const q = new URLSearchParams(next)
    for (const [k, v] of q.entries()) {
      if (!v) q.delete(k)
    }
    if (includeSearch) q.set('search', '1')
    return `/reports/today${q.toString() ? `?${q.toString()}` : ''}`
  }

  const search = () => router.push(reportUrl(filters, true))
  const reset = () => router.push('/reports/today')
  const setToday = () => {
    const date = indiaDateKey()
    router.push(reportUrl({ fromDate: date, toDate: date, userId: '' }, false))
  }

  const exportRows = async () => {
    setExportError('')
    setIsExporting(true)
    try {
      const q = new URLSearchParams({ fromDate, toDate, ...(userId ? { userId: String(userId) } : {}) })
      const response = await fetch(`/api/reports/today/export?${q.toString()}`)
      if (!response.ok) throw new Error('Export failed')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'today-inquiry-followup-report.xlsx'
      anchor.click()
      URL.revokeObjectURL(url)
    } catch {
      setExportError('Could not export today activity report. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Today's Inquiry & Follow-up"
        subtitle={searched && !searchError && !queryError ? `${initialData.length} follow-up activities${restricted ? ' · showing your inquiries only' : ''}` : undefined}
        action={searched && !searchError && !queryError && initialData.length > 0 ? <Btn variant="outline" size="sm" onClick={exportRows} disabled={isExporting}><Download className="w-3.5 h-3.5" />{isExporting ? 'Exporting...' : 'Export'}</Btn> : undefined}
      />

      {exportError && <p className="mb-4 text-sm text-red-600" role="alert">{exportError}</p>}

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <Input label="From" type="date" value={filters.fromDate} error={Boolean(searchError)} onChange={e => setFilters(current => ({ ...current, fromDate: e.target.value }))} />
        <Input label="To" type="date" value={filters.toDate} error={Boolean(searchError)} onChange={e => setFilters(current => ({ ...current, toDate: e.target.value }))} />
        {!restricted && (
          <Select label="Updated By" value={filters.userId} onChange={e => setFilters(current => ({ ...current, userId: e.target.value }))}>
            <option value="">All Users</option>
            {users.map(u => <option key={u.userId} value={u.userId}>{u.displayName ?? u.userName}</option>)}
          </Select>
        )}
        <Btn size="sm" onClick={search}>Search</Btn>
        <Btn variant="outline" size="sm" onClick={reset}>Reset</Btn>
        <Btn variant="outline" size="sm" onClick={setToday}>Today</Btn>
      </div>

      {searchError && <p className="mb-4 text-sm text-red-600" role="alert">{searchError}</p>}
      {queryError && <p className="mb-4 text-sm text-red-600" role="alert">{queryError}</p>}

      {searched && !searchError && !queryError && <Table headers={['#', 'Inquiry', 'Customer Details', 'Car Details', 'Budget', 'Follow-up State', 'Follow-up Detail', 'Created Audit', 'Updated Audit']} empty={initialData.length === 0} emptyMessage="No matching follow-up activities found." minWidthClass="min-w-[1280px]" compact columnWidths={['4%', '11%', '17%', '13%', '10%', '15%', '15%', '8%', '7%']}>
        {initialData.map((r, index) => (
          <tr key={r.pkFollowupId} className="hover:bg-gray-50 transition">
            <td className="px-4 py-3 text-sm text-gray-600 tabular-nums">{index + 1}</td>
            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
              <div className="font-medium text-gray-900">{r.inquiryNo ?? '—'}</div>
              <div>{fmtDate(r.dateOfInquiry) || '—'}</div>
              <div>{r.website ?? '—'}</div>
            </td>
            <td className="px-4 py-3 text-sm text-gray-600">
              <div className="font-medium text-gray-900">{r.customerName ?? '—'}</div>
              <div className="font-mono">{r.mobileno ?? '—'}</div>
              <div>{r.email ?? '—'}</div>
            </td>
            <td className="px-4 py-3 text-sm text-gray-600">{r.carDetails || '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
              <div>{fmtMoney(r.budgetOfCustomer)}</div>
              <div>{fmtDate(r.visitedDateOfCustomer) || 'NA'}</div>
            </td>
            <td className="px-4 py-3 text-sm text-gray-600">
              <div>{r.followupClassification ? <Badge label={r.followupClassification} /> : '—'}</div>
              <div className="mt-1">{r.followupStatus ? <Badge label={r.followupStatus} /> : '—'}</div>
              <div className="mt-1 max-w-[180px] truncate" title={r.followupSubStatus ?? ''}>{r.followupSubStatus ?? '—'}</div>
            </td>
            <td className="px-4 py-3 text-sm text-gray-600">
              <div className="whitespace-nowrap">{fmtDate(r.followupDate) || '—'}</div>
              <div className="max-w-[240px] truncate" title={r.comments ?? ''}>{r.comments ?? '—'}</div>
            </td>
            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
              <div>{fmtDate(r.createdDt) || '—'}</div>
              <div>{r.createdByName ?? '—'}</div>
            </td>
            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
              <div>{fmtDate(r.updatedDt) || '—'}</div>
              <div>{r.updatedByName ?? '—'}</div>
            </td>
          </tr>
        ))}
      </Table>}
    </div>
  )
}
