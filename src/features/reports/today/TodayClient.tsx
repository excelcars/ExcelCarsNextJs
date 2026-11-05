'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Download, Mail, Phone } from 'lucide-react'
import { Badge, Btn, Input, LoadingOverlay, Select, Table, PageHeader } from '@/components/ui'
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

function ActivityMobileCard({ row, number }: { row: FollowupRow; number: number }) {
  return (
    <article className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm [overflow-wrap:anywhere]">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500"><span className="font-semibold text-blue-700">#{number} · {row.inquiryNo ?? '—'}</span><span>{fmtDate(row.dateOfInquiry) || '—'}</span></div>
      <h2 className="mt-2 text-base font-bold text-gray-900">{row.customerName ?? '—'}</h2>
      <div className="mt-2 flex flex-wrap gap-2">{row.followupClassification ? <Badge label={row.followupClassification} /> : null}{row.followupStatus ? <Badge label={row.followupStatus} /> : null}</div>
      <div className="mt-3 space-y-1 text-sm">
        {row.mobileno ? <a href={`tel:${row.mobileno}`} className="flex min-h-11 items-center gap-2 text-blue-700"><Phone aria-hidden="true" className="h-4 w-4 shrink-0" />{row.mobileno}</a> : <p className="text-gray-500">No mobile number</p>}
        {row.email ? <a href={`mailto:${row.email}`} className="flex min-h-11 items-center gap-2 text-blue-700"><Mail aria-hidden="true" className="h-4 w-4 shrink-0" />{row.email}</a> : null}
      </div>
      <dl className="mt-3 grid grid-cols-1 gap-3 rounded-lg bg-gray-50 p-3 text-sm min-[360px]:grid-cols-2">
        {[
          ['Follow-up date', fmtDate(row.followupDate) || '—'],
          ['Sub-status', row.followupSubStatus ?? '—'],
          ['Budget', fmtMoney(row.budgetOfCustomer)],
          ['Visited date', fmtDate(row.visitedDateOfCustomer) || 'NA'],
        ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-gray-500">{label}</dt><dd className="mt-1 font-medium text-gray-800">{value}</dd></div>)}
        <div className="min-w-0 min-[360px]:col-span-2"><dt className="text-xs text-gray-500">Source</dt><dd className="mt-1 text-gray-700">{row.website ?? '—'}</dd></div>
        <div className="min-w-0 min-[360px]:col-span-2"><dt className="text-xs text-gray-500">Car details</dt><dd className="mt-1 whitespace-pre-wrap text-gray-700">{row.carDetails || '—'}</dd></div>
      </dl>
      <div className="mt-3 text-sm"><h3 className="text-xs text-gray-500">Follow-up comments</h3><p className="mt-1 whitespace-pre-wrap text-gray-700">{row.comments ?? '—'}</p></div>
      <details className="group mt-3 border-t border-gray-100 pt-2">
        <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 text-sm font-medium text-blue-800">Activity audit details<ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" /></summary>
        <dl className="mt-2 space-y-3 text-sm"><div><dt className="text-xs text-gray-500">Created</dt><dd className="mt-1 text-gray-700">{fmtDate(row.createdDt) || '—'} · {row.createdByName ?? '—'}</dd></div><div><dt className="text-xs text-gray-500">Updated</dt><dd className="mt-1 text-gray-700">{fmtDate(row.updatedDt) || '—'} · {row.updatedByName ?? '—'}</dd></div></dl>
      </details>
    </article>
  )
}

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
  const [isNavigating, startNavigationTransition] = useTransition()
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

  const navigateToReport = (url: string) => {
    startNavigationTransition(() => {
      router.push(url)
    })
  }

  const search = () => navigateToReport(reportUrl(filters, true))
  const reset = () => navigateToReport('/reports/today')
  const setToday = () => {
    const date = indiaDateKey()
    navigateToReport(reportUrl({ fromDate: date, toDate: date, userId: '' }, false))
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
    <div className="min-w-0 [&>div:first-child]:flex-col [&>div:first-child]:sm:flex-row">
      <PageHeader
        title="Today's Inquiry & Follow-up"
        subtitle={searched && !searchError && !queryError ? `${initialData.length} follow-up activities${restricted ? ' · showing your inquiries only' : ''}` : undefined}
        action={searched && !searchError && !queryError && initialData.length > 0 ? <Btn variant="outline" size="sm" className="min-h-11" onClick={exportRows} disabled={isExporting}><Download className="w-3.5 h-3.5" />{isExporting ? 'Exporting...' : 'Export'}</Btn> : undefined}
      />

      {exportError && <p className="mb-4 text-sm text-red-600" role="alert">{exportError}</p>}

      <div className="mb-4 grid min-w-0 gap-3 rounded-xl border border-gray-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0 [&_input]:min-h-11 [&_input]:max-w-full [&_input]:min-w-0 [&_select]:min-h-11 [&_select]:max-w-full [&_select]:min-w-0 [&_input]:text-base [&_select]:text-base sm:[&_input]:text-sm sm:[&_select]:text-sm">
        <Input label="From" type="date" value={filters.fromDate} disabled={isNavigating} error={Boolean(searchError)} onChange={e => setFilters(current => ({ ...current, fromDate: e.target.value }))} />
        <Input label="To" type="date" value={filters.toDate} disabled={isNavigating} error={Boolean(searchError)} onChange={e => setFilters(current => ({ ...current, toDate: e.target.value }))} />
        {!restricted && (
          <Select label="Updated By" value={filters.userId} disabled={isNavigating} onChange={e => setFilters(current => ({ ...current, userId: e.target.value }))}>
            <option value="">All Users</option>
            {users.map(u => <option key={u.userId} value={u.userId}>{u.displayName ?? u.userName}</option>)}
          </Select>
        )}
        <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-3 sm:col-span-2 sm:flex lg:col-span-3 [&>button]:min-h-11 [&>button]:justify-center">
        <Btn size="sm" onClick={search} disabled={isNavigating}>{isNavigating ? 'Loading...' : 'Search'}</Btn>
        <Btn variant="outline" size="sm" onClick={reset} disabled={isNavigating}>Reset</Btn>
        <Btn variant="outline" size="sm" onClick={setToday} disabled={isNavigating}>Today</Btn>
        </div>
      </div>

      {searchError && <p className="mb-4 text-sm text-red-600" role="alert">{searchError}</p>}
      {queryError && <p className="mb-4 text-sm text-red-600" role="alert">{queryError}</p>}

      <div className="relative min-h-24" aria-busy={isNavigating}>
        <LoadingOverlay show={isNavigating} label="Loading today activity report..." />
        {!searched && !searchError && !queryError ? <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">Choose your dates and select Search to view activity.</div> : null}
      {searched && !searchError && !queryError && <>
      <div className="space-y-3 lg:hidden">
        {initialData.length === 0 ? <div className="rounded-xl border border-gray-200 bg-white px-4 py-12 text-center text-sm text-gray-500">No matching follow-up activities found.</div> : initialData.map((row, index) => <ActivityMobileCard key={row.pkFollowupId} row={row} number={index + 1} />)}
      </div>
      <div className="hidden lg:block">
      <Table headers={['#', 'Inquiry', 'Customer Details', 'Car Details', 'Budget', 'Follow-up State', 'Follow-up Detail', 'Created Audit', 'Updated Audit']} empty={initialData.length === 0} emptyMessage="No matching follow-up activities found." minWidthClass="min-w-[1280px]" compact columnWidths={['4%', '11%', '17%', '13%', '10%', '15%', '15%', '8%', '7%']}>
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
      </Table>
      </div>
      </>}
      </div>
    </div>
  )
}
