'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Phone, PhoneCall, AlertTriangle, Eye, Pencil, ChevronLeft, ChevronRight, Download, Loader2 } from 'lucide-react'
import { Badge, Btn, Input, Select, Textarea, Modal, Table, PageHeader, SearchBar } from '@/components/ui'
import { logFollowup, type LogFollowupInput } from './actions'

const CLASSIFICATIONS = ['Hot', 'Warm', 'Cold'] as const
const STATUSES = ['FollowUp', 'Closed'] as const
const SUB_STATUS_SUGGESTIONS = ['Ringing', 'Not Intrested', 'Busy', 'Desired Car Not In Stock', 'Not connected', 'Already Bought Car', 'Visited', 'Gave Details', 'Sold Car']

interface FollowupRow {
  inquiryId: number
  inquiryNo: string | null
  dateOfInquiry: Date | string | null
  website: string | null
  customerId?: number | null
  customerNameLegacy: string | null
  mobileno: string | null
  email: string | null
  budgetOfCustomer?: string | number | null
  classification: string | null
  status?: string | null
  subStatus: string | null
  followUpDate: Date | string | null
  visitedDateOfCustomer?: Date | string | null
  remark: string | null
  createdBy?: number | null
  createdByUser?: UserOption | null
  customer: { custId?: number; custName: string; custMobile?: string | null; custEmail?: string | null } | null
  inquiryCarDetails: {
    year: number | null
    carVariantMaster: {
      variant: string | null
      carMakeMaster: { make: string | null } | null
      carModelMaster: { model: string | null } | null
    } | null
  }[]
}

interface HistoryEntry {
  pkFollowupId: number
  followupDate: string | null
  followupStatus: string | null
  followupSubStatus: string | null
  followupClassification: string | null
  comments: string | null
}

interface CarMakeMaster { pkMakeId: number; make: string | null }
interface CarModelMaster { pkModelId: number; model: string | null }
interface CarVariantMaster { pkVariantId: number; variant: string | null }
interface UserOption { userId: number; userName: string | null; displayName: string | null }

const JUNK_VALUES = new Set(['null', 'na', 'n/a'])
const clean = (v: string | null | undefined) => (!v || JUNK_VALUES.has(v.trim().toLowerCase()) ? '' : v)
const fmtDate = (d: Date | string | null) => d ? new Date(d).toISOString().slice(0, 10) : ''
const isOverdue = (d: Date | string | null) => d ? new Date(d) < new Date(new Date().toDateString()) : false
const fmtMoney = (n: string | number | null | undefined) => n ? `₹${Number(n).toLocaleString('en-IN')}` : '—'

function csvValue(value: string | number | boolean | null | undefined) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildFollowupExportFileName(rows: FollowupRow[], status: string, classification: string) {
  const today = new Date().toISOString().slice(0, 10)
  const parts = ['followup']
  if (status && status !== 'All') parts.push(slugify(status))
  if (classification && classification !== 'All') parts.push(slugify(classification))
  if (parts.length === 1) parts.push(`${rows.length}-rows`)
  parts.push(today)
  return `${parts.join('-')}.csv`
}

function exportFollowupCsv(rows: FollowupRow[], status: string, classification: string) {
  const headers = [
    'Inquiry ID',
    'Inquiry No',
    'Inquiry Date',
    'Source',
    'Inquiry Made By User ID',
    'Linked Customer ID',
    'Customer Name',
    'Mobile',
    'Email',
    'Make',
    'Model',
    'Variant',
    'Car Year',
    'Budget',
    'Classification',
    'Status',
    'Sub-status',
    'Follow-up Date',
    'Visited Date',
    'Remarks',
  ]

  const lines = [headers.map(csvValue).join(',')]
  for (const row of rows) {
    const car = row.inquiryCarDetails[0]
    const make = clean(car?.carVariantMaster?.carMakeMaster?.make)
    const model = clean(car?.carVariantMaster?.carModelMaster?.model)
    const variant = clean(car?.carVariantMaster?.variant)
    const line = [
      row.inquiryId,
      row.inquiryNo,
      fmtDate(row.dateOfInquiry),
      row.website,
      row.createdByUser?.displayName ?? row.createdByUser?.userName ?? row.createdBy,
      row.customer?.custId ?? row.customerId,
      row.customer?.custName ?? row.customerNameLegacy,
      row.mobileno,
      row.email,
      make,
      model,
      variant,
      car?.year ?? null,
      row.budgetOfCustomer,
      row.classification,
      row.status,
      row.subStatus,
      fmtDate(row.followUpDate),
      fmtDate(row.visitedDateOfCustomer ?? null),
      row.remark,
    ]
    lines.push(line.map(csvValue).join(','))
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = buildFollowupExportFileName(rows, status, classification)
  link.click()
  URL.revokeObjectURL(url)
}

function emptyForm(): LogFollowupInput {
  return { status: 'FollowUp', subStatus: '', classification: 'Warm', comments: '', nextFollowUpDate: '' }
}

export function FollowupClient({
  initialData,
  search: initialSearch,
  classification,
  status: initialStatus,
  subStatus: initialSubStatus,
  website: initialWebsite,
  customerMobile: initialCustomerMobile,
  users,
  userId: initialUserId,
  makes,
  models,
  variants,
  makeId,
  modelId,
  variantId,
  total,
  page,
  pageCount,
  inquiryDateFrom: initialInquiryDateFrom,
  inquiryDateTo: initialInquiryDateTo,
  followUpDateFrom: initialFollowUpDateFrom,
  followUpDateTo: initialFollowUpDateTo,
  visitedDateFrom: initialVisitedDateFrom,
  visitedDateTo: initialVisitedDateTo,
}: {
  initialData: FollowupRow[]
  search: string
  classification: string
  status: string
  subStatus: string
  website: string
  customerMobile: string
  users: UserOption[]
  userId: string
  makes: CarMakeMaster[]
  models: CarModelMaster[]
  variants: CarVariantMaster[]
  makeId: string
  modelId: string
  variantId: string
  total: number
  page: number
  pageCount: number
  inquiryDateFrom: string
  inquiryDateTo: string
  followUpDateFrom: string
  followUpDateTo: string
  visitedDateFrom: string
  visitedDateTo: string
}) {
  const router = useRouter()
  const [search, setSearch] = useState(initialSearch)
  const [status, setStatus] = useState(initialStatus)
  const [subStatus, setSubStatus] = useState(initialSubStatus)
  const [website, setWebsite] = useState(initialWebsite)
  const [customerMobile, setCustomerMobile] = useState(initialCustomerMobile)
  const [userId, setUserId] = useState(initialUserId)
  const [inquiryDateFrom, setInquiryDateFrom] = useState(initialInquiryDateFrom)
  const [inquiryDateTo, setInquiryDateTo] = useState(initialInquiryDateTo)
  const [followUpDateFrom, setFollowUpDateFrom] = useState(initialFollowUpDateFrom)
  const [followUpDateTo, setFollowUpDateTo] = useState(initialFollowUpDateTo)
  const [visitedDateFrom, setVisitedDateFrom] = useState(initialVisitedDateFrom)
  const [visitedDateTo, setVisitedDateTo] = useState(initialVisitedDateTo)
  const [logRow, setLogRow] = useState<FollowupRow | null>(null)
  const [form, setForm] = useState<LogFollowupInput>(emptyForm())
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [error, setError] = useState('')
  const [exportError, setExportError] = useState('')
  const [isRoutePending, startRouteTransition] = useTransition()
  const [isPending, startTransition] = useTransition()
  const [isExporting, startExportTransition] = useTransition()
  const historyRequestRef = useRef(0)
  const overdueCount = useMemo(() => initialData.filter(r => isOverdue(r.followUpDate)).length, [initialData])
  const activeFilterCount = [
    search.trim() ? 1 : 0,
    status !== 'FollowUp' ? 1 : 0,
    subStatus.trim() ? 1 : 0,
    website.trim() ? 1 : 0,
    customerMobile.trim() ? 1 : 0,
    userId ? 1 : 0,
    makeId ? 1 : 0,
    modelId ? 1 : 0,
    variantId ? 1 : 0,
    classification !== 'All' ? 1 : 0,
    inquiryDateFrom ? 1 : 0,
    inquiryDateTo ? 1 : 0,
    followUpDateFrom ? 1 : 0,
    followUpDateTo ? 1 : 0,
    visitedDateFrom ? 1 : 0,
    visitedDateTo ? 1 : 0,
  ].reduce((sum, value) => sum + value, 0)
  const hasActiveFilters = Boolean(
    search.trim() ||
    status !== 'FollowUp' ||
    subStatus.trim() ||
    website.trim() ||
    customerMobile.trim() ||
    userId ||
    makeId ||
    modelId ||
    variantId ||
    classification !== 'All' ||
    inquiryDateFrom ||
    inquiryDateTo ||
    followUpDateFrom ||
    followUpDateTo ||
    visitedDateFrom ||
    visitedDateTo ||
    page > 1
  )

  useEffect(() => {
    setSearch(initialSearch)
    setStatus(initialStatus)
    setSubStatus(initialSubStatus)
    setWebsite(initialWebsite)
    setCustomerMobile(initialCustomerMobile)
    setUserId(initialUserId)
    setInquiryDateFrom(initialInquiryDateFrom)
    setInquiryDateTo(initialInquiryDateTo)
    setFollowUpDateFrom(initialFollowUpDateFrom)
    setFollowUpDateTo(initialFollowUpDateTo)
    setVisitedDateFrom(initialVisitedDateFrom)
    setVisitedDateTo(initialVisitedDateTo)
  }, [initialCustomerMobile, initialFollowUpDateFrom, initialFollowUpDateTo, initialInquiryDateFrom, initialInquiryDateTo, initialSearch, initialStatus, initialSubStatus, initialUserId, initialVisitedDateFrom, initialVisitedDateTo, initialWebsite])

  const pushQuery = (params: Record<string, string>) => {
    const q = new URLSearchParams({
      search: initialSearch,
      classification,
      status: initialStatus,
      subStatus: initialSubStatus,
      website: initialWebsite,
      customerMobile: initialCustomerMobile,
      userId: initialUserId,
      makeId,
      modelId,
      variantId,
      page: String(page),
      inquiryDateFrom: initialInquiryDateFrom,
      inquiryDateTo: initialInquiryDateTo,
      followUpDateFrom: initialFollowUpDateFrom,
      followUpDateTo: initialFollowUpDateTo,
      visitedDateFrom: initialVisitedDateFrom,
      visitedDateTo: initialVisitedDateTo,
      ...params,
    })
    for (const [k, v] of [...q.entries()]) {
      if (!v || v === 'All') q.delete(k)
    }
    startRouteTransition(() => {
      router.push(`/followup${q.toString() ? `?${q.toString()}` : ''}`)
    })
  }

  useEffect(() => {
    const handle = setTimeout(() => {
      if (
        search !== initialSearch ||
        status !== initialStatus ||
        subStatus !== initialSubStatus ||
        website !== initialWebsite ||
        customerMobile !== initialCustomerMobile ||
        userId !== initialUserId
      ) {
        pushQuery({ search, status, subStatus, website, customerMobile, userId, page: '1' })
      }
    }, 400)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerMobile, initialCustomerMobile, initialSearch, initialStatus, initialSubStatus, initialUserId, initialWebsite, search, status, subStatus, userId, website])

  useEffect(() => {
    const handle = setTimeout(() => {
      if (
        inquiryDateFrom !== initialInquiryDateFrom ||
        inquiryDateTo !== initialInquiryDateTo ||
        followUpDateFrom !== initialFollowUpDateFrom ||
        followUpDateTo !== initialFollowUpDateTo ||
        visitedDateFrom !== initialVisitedDateFrom ||
        visitedDateTo !== initialVisitedDateTo
      ) {
        pushQuery({
          inquiryDateFrom,
          inquiryDateTo,
          followUpDateFrom,
          followUpDateTo,
          visitedDateFrom,
          visitedDateTo,
          page: '1',
        })
      }
    }, 250)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    followUpDateFrom,
    followUpDateTo,
    initialFollowUpDateFrom,
    initialFollowUpDateTo,
    initialInquiryDateFrom,
    initialInquiryDateTo,
    initialVisitedDateFrom,
    initialVisitedDateTo,
    inquiryDateFrom,
    inquiryDateTo,
    visitedDateFrom,
    visitedDateTo,
  ])

  const openLog = async (r: FollowupRow) => {
    const requestId = historyRequestRef.current + 1
    historyRequestRef.current = requestId
    setLogRow(r)
    setForm({ ...emptyForm(), classification: r.classification ?? 'Warm' })
    setError('')
    setHistory([])
    setHistoryError('')
    setHistoryLoading(true)
    try {
      const res = await fetch(`/api/followup/history?inquiryId=${r.inquiryId}`)
      const payload = await res.json().catch(() => null)
      if (historyRequestRef.current !== requestId) return
      if (!res.ok || !Array.isArray(payload)) {
        throw new Error(payload?.error ?? 'Could not load follow-up history.')
      }
      setHistory(payload as HistoryEntry[])
    } catch (err) {
      if (historyRequestRef.current !== requestId) return
      setHistory([])
      setHistoryError(err instanceof Error ? err.message : 'Could not load follow-up history.')
    } finally {
      if (historyRequestRef.current === requestId) setHistoryLoading(false)
    }
  }

  const f = <K extends keyof LogFollowupInput>(k: K, v: LogFollowupInput[K]) => setForm(prev => ({ ...prev, [k]: v }))

  const save = () => {
    if (!logRow) return
    setError('')
    startTransition(async () => {
      const result = await logFollowup(logRow.inquiryId, form)
      if (!result.success) {
        setError(result.error ?? 'Something went wrong.')
        return
      }
      setLogRow(null)
      router.refresh()
    })
  }

  const openInquiryView = (inquiryId: number) => {
    router.push(`/inquiry?view=${inquiryId}`)
  }

  const openInquiryEdit = (inquiryId: number) => {
    router.push(`/inquiry?edit=${inquiryId}`)
  }

  const exportAllMatchingFollowups = () => {
    setExportError('')
    startExportTransition(async () => {
      try {
        const params = new URLSearchParams()
        if (search.trim()) params.set('search', search)
        if (classification !== 'All') params.set('classification', classification)
        if (status !== 'FollowUp') params.set('status', status)
        if (subStatus.trim()) params.set('subStatus', subStatus)
        if (website.trim()) params.set('website', website)
        if (customerMobile.trim()) params.set('customerMobile', customerMobile)
        if (userId) params.set('userId', userId)
        if (makeId) params.set('makeId', makeId)
        if (modelId) params.set('modelId', modelId)
        if (variantId) params.set('variantId', variantId)
        if (inquiryDateFrom) params.set('inquiryDateFrom', inquiryDateFrom)
        if (inquiryDateTo) params.set('inquiryDateTo', inquiryDateTo)
        if (followUpDateFrom) params.set('followUpDateFrom', followUpDateFrom)
        if (followUpDateTo) params.set('followUpDateTo', followUpDateTo)
        if (visitedDateFrom) params.set('visitedDateFrom', visitedDateFrom)
        if (visitedDateTo) params.set('visitedDateTo', visitedDateTo)

        const res = await fetch(`/api/followup/export${params.toString() ? `?${params.toString()}` : ''}`)
        const payload = await res.json().catch(() => null)
        if (!res.ok || !Array.isArray(payload)) {
          throw new Error(payload?.error ?? 'Could not export follow-ups.')
        }
        exportFollowupCsv(payload as FollowupRow[], status, classification)
      } catch (err) {
        setExportError(err instanceof Error ? err.message : 'Could not export follow-ups.')
      }
    })
  }

  const resetFilters = () => {
    setSearch('')
    setStatus('FollowUp')
    setSubStatus('')
    setWebsite('')
    setCustomerMobile('')
    setUserId('')
    setInquiryDateFrom('')
    setInquiryDateTo('')
    setFollowUpDateFrom('')
    setFollowUpDateTo('')
    setVisitedDateFrom('')
    setVisitedDateTo('')
    pushQuery({
      search: '',
      status: 'FollowUp',
      subStatus: '',
      website: '',
      customerMobile: '',
      userId: '',
      makeId: '',
      modelId: '',
      variantId: '',
      classification: 'All',
      inquiryDateFrom: '',
      inquiryDateTo: '',
      followUpDateFrom: '',
      followUpDateTo: '',
      visitedDateFrom: '',
      visitedDateTo: '',
      page: '1',
    })
  }

  return (
    <div>
      <PageHeader
        title="Follow-up Queue"
        subtitle={`${total.toLocaleString('en-IN')} ${status === 'Closed' ? 'closed' : status === 'All' ? 'matching' : 'open'} inquiries${overdueCount && status !== 'Closed' ? ` · ${overdueCount} overdue on this page` : ''}${pageCount > 1 ? ` · Page ${page} of ${pageCount}` : ''}`}
        action={
          <Btn variant="outline" size="sm" onClick={exportAllMatchingFollowups} disabled={isExporting || total === 0}>
            <Download className="w-3.5 h-3.5" />{isExporting ? 'Exporting...' : `${hasActiveFilters ? 'Export Filtered' : 'Export All'} (${total})`}
          </Btn>
        }
      />

      {exportError ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{exportError}</div>
      ) : null}

      <div className="flex flex-wrap gap-3 mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Customer, mobile..." disabled={isRoutePending} />
        <Select
          value={status}
          onChange={e => setStatus(e.target.value)}
          disabled={isRoutePending}
          className="min-w-[160px]"
        >
          <option value="FollowUp">Follow-up Only</option>
          <option value="Closed">Closed</option>
          <option value="All">All Status</option>
        </Select>
        <Input
          value={subStatus}
          onChange={e => setSubStatus(e.target.value)}
          placeholder="Filter sub-status..."
          disabled={isRoutePending}
          className="min-w-[220px]"
        />
        <Input
          value={website}
          onChange={e => setWebsite(e.target.value)}
          placeholder="Source / website..."
          disabled={isRoutePending}
          className="min-w-[220px]"
        />
        <Input
          value={customerMobile}
          onChange={e => setCustomerMobile(e.target.value)}
          placeholder="Customer mobile..."
          disabled={isRoutePending}
          className="min-w-[200px]"
        />
        <Select value={userId} onChange={e => setUserId(e.target.value)} disabled={isRoutePending} className="min-w-[200px]">
          <option value="">All Users</option>
          {users.map(item => <option key={item.userId} value={String(item.userId)}>{item.displayName ?? item.userName ?? `User #${item.userId}`}</option>)}
        </Select>
        <Select value={makeId} onChange={e => pushQuery({ makeId: e.target.value, modelId: '', variantId: '', page: '1' })} disabled={isRoutePending} className="min-w-[180px]">
          <option value="">All Makes</option>
          {makes.map(item => <option key={item.pkMakeId} value={String(item.pkMakeId)}>{item.make ?? '—'}</option>)}
        </Select>
        <Select value={modelId} onChange={e => pushQuery({ modelId: e.target.value, variantId: '', page: '1' })} disabled={isRoutePending || !makeId} className="min-w-[180px]">
          <option value="">All Models</option>
          {models.map(item => <option key={item.pkModelId} value={String(item.pkModelId)}>{item.model ?? '—'}</option>)}
        </Select>
        <Select value={variantId} onChange={e => pushQuery({ variantId: e.target.value, page: '1' })} disabled={isRoutePending || !modelId} className="min-w-[180px]">
          <option value="">All Variants</option>
          {variants.map(item => <option key={item.pkVariantId} value={String(item.pkVariantId)}>{item.variant ?? '—'}</option>)}
        </Select>
        <div className="flex flex-wrap gap-1.5">
          {['All', ...CLASSIFICATIONS].map(c => (
            <button key={c} onClick={() => pushQuery({ classification: c })}
              disabled={isRoutePending}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-60 disabled:cursor-not-allowed ${classification === c ? 'text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              style={classification === c ? { backgroundColor: '#C8102E' } : {}}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Input
          label="Inquiry Date From"
          type="date"
          value={inquiryDateFrom}
          onChange={e => setInquiryDateFrom(e.target.value)}
          disabled={isRoutePending}
        />
        <Input
          label="Inquiry Date To"
          type="date"
          value={inquiryDateTo}
          onChange={e => setInquiryDateTo(e.target.value)}
          disabled={isRoutePending}
        />
        <Input
          label="Follow-up Date From"
          type="date"
          value={followUpDateFrom}
          onChange={e => setFollowUpDateFrom(e.target.value)}
          disabled={isRoutePending}
        />
        <Input
          label="Follow-up Date To"
          type="date"
          value={followUpDateTo}
          onChange={e => setFollowUpDateTo(e.target.value)}
          disabled={isRoutePending}
        />
        <Input
          label="Visited Date From"
          type="date"
          value={visitedDateFrom}
          onChange={e => setVisitedDateFrom(e.target.value)}
          disabled={isRoutePending}
        />
        <Input
          label="Visited Date To"
          type="date"
          value={visitedDateTo}
          onChange={e => setVisitedDateTo(e.target.value)}
          disabled={isRoutePending}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
        <div>
          <div className="text-sm font-medium text-gray-900">
            Showing {total.toLocaleString('en-IN')} matching {total === 1 ? 'inquiry' : 'inquiries'}
          </div>
          <div className="text-xs text-gray-500">
            {hasActiveFilters
              ? `${activeFilterCount} active filter${activeFilterCount === 1 ? '' : 's'} applied${pageCount > 1 ? ` · Page ${page} of ${pageCount}` : ''}`
              : `Default follow-up queue${pageCount > 1 ? ` · Page ${page} of ${pageCount}` : ''}`}
          </div>
        </div>
        <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600 shadow-sm">
          {hasActiveFilters ? 'Filtered view' : 'Default view'}
        </div>
      </div>

      <div className="mb-4 flex justify-end">
        <Btn variant="outline" size="sm" onClick={resetFilters} disabled={isRoutePending || !hasActiveFilters}>
          Reset Filters
        </Btn>
      </div>

      <div className="relative min-h-[280px]">
        <div
          aria-busy={isRoutePending}
          className={isRoutePending
            ? 'pointer-events-none select-none opacity-45 transition-opacity'
            : 'transition-opacity'}
        >
          <Table headers={['Inquiry Date', 'Source', 'Inquiry Made By', 'Customer', 'Contact', 'Car of Interest', 'Budget', 'Visited Date', 'Classification', 'Status', 'Sub-status', 'Follow-up Date', 'Last Remark', 'Actions']} empty={initialData.length === 0}>
            {initialData.map(r => {
              const car = r.inquiryCarDetails[0]
              const name = r.customer?.custName ?? r.customerNameLegacy ?? '—'
              const overdue = isOverdue(r.followUpDate)
              const inquiryMadeBy = r.createdByUser?.displayName ?? r.createdByUser?.userName ?? (r.createdBy ? `User #${r.createdBy}` : '—')
              return (
                <tr key={r.inquiryId} className={`hover:bg-gray-50 transition ${overdue ? 'bg-red-50/40' : ''}`}>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{fmtDate(r.dateOfInquiry) || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[140px] truncate" title={r.website ?? ''}>{r.website ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[160px] truncate" title={String(inquiryMadeBy)}>{inquiryMadeBy}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{name}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-sm text-gray-700 font-mono">
                      <Phone className="w-3 h-3 text-gray-400" />{r.mobileno ?? '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {car?.carVariantMaster
                      ? [clean(car.carVariantMaster.carMakeMaster?.make), clean(car.carVariantMaster.carModelMaster?.model), clean(car.carVariantMaster.variant)]
                          .filter(Boolean).join(' ') + (car.year ? ` · ${car.year}` : '') || '—'
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-800 whitespace-nowrap">{fmtMoney(r.budgetOfCustomer)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{fmtDate(r.visitedDateOfCustomer ?? null) || '—'}</td>
                  <td className="px-4 py-3">{r.classification ? <Badge label={r.classification} /> : '—'}</td>
                  <td className="px-4 py-3">{r.status ? <Badge label={r.status} /> : '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[160px] truncate" title={r.subStatus ?? ''}>{r.subStatus ?? '—'}</td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    <div className={`flex items-center gap-1 ${overdue ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                      {overdue && <AlertTriangle className="w-3.5 h-3.5" />}
                      {fmtDate(r.followUpDate) || '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate" title={r.remark ?? ''}>{r.remark ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openLog(r)}
                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition"
                        title="Log follow-up"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openInquiryView(r.inquiryId)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition"
                        title="View"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openInquiryEdit(r.inquiryId)}
                        className="p-1.5 text-gray-400 hover:text-[#1B2A6B] hover:bg-blue-50 rounded transition"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </Table>
        </div>
        {isRoutePending ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-white/35 backdrop-blur-[1px] text-sm text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <div>Updating follow-up list...</div>
          </div>
        ) : null}
      </div>

      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Showing {((page - 1) * initialData.length) + (initialData.length ? 1 : 0)}-{((page - 1) * 25) + initialData.length} of {total.toLocaleString('en-IN')} · Page {page} of {pageCount}
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

      <Modal title={`Log Follow-up${logRow ? ` — ${logRow.customer?.custName ?? logRow.customerNameLegacy ?? ''}` : ''}`} open={!!logRow} onClose={() => setLogRow(null)}>
        {logRow && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Inquiry Context</div>
                <div className="mt-3 space-y-2 text-sm text-gray-700">
                  <div><span className="font-medium text-gray-900">Inquiry ID:</span> {logRow.inquiryId}</div>
                  <div><span className="font-medium text-gray-900">Inquiry No:</span> {logRow.inquiryNo ?? '—'}</div>
                  <div><span className="font-medium text-gray-900">Inquiry Date:</span> {fmtDate(logRow.dateOfInquiry) || '—'}</div>
                  <div><span className="font-medium text-gray-900">Source:</span> {logRow.website ?? '—'}</div>
                  <div><span className="font-medium text-gray-900">Budget:</span> {logRow.budgetOfCustomer ? `₹${Number(logRow.budgetOfCustomer).toLocaleString('en-IN')}` : '—'}</div>
                  <div><span className="font-medium text-gray-900">Visited Date:</span> {fmtDate(logRow.visitedDateOfCustomer ?? null) || '—'}</div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Customer & Vehicle</div>
                <div className="mt-3 space-y-2 text-sm text-gray-700">
                  <div><span className="font-medium text-gray-900">Linked Customer ID:</span> {logRow.customer?.custId ?? logRow.customerId ?? '—'}</div>
                  <div><span className="font-medium text-gray-900">Customer:</span> {logRow.customer?.custName ?? logRow.customerNameLegacy ?? '—'}</div>
                  <div><span className="font-medium text-gray-900">Mobile:</span> {logRow.customer?.custMobile ?? logRow.mobileno ?? '—'}</div>
                  <div><span className="font-medium text-gray-900">Email:</span> {logRow.customer?.custEmail ?? logRow.email ?? '—'}</div>
                  <div><span className="font-medium text-gray-900">Car of Interest:</span> {(() => {
                    const car = logRow.inquiryCarDetails[0]
                    return car?.carVariantMaster
                      ? [clean(car.carVariantMaster.carMakeMaster?.make), clean(car.carVariantMaster.carModelMaster?.model), clean(car.carVariantMaster.variant)]
                          .filter(Boolean).join(' ') + (car.year ? ` · ${car.year}` : '') || '—'
                      : '—'
                  })()}</div>
                  <div><span className="font-medium text-gray-900">Current Follow-up Date:</span> {fmtDate(logRow.followUpDate) || '—'}</div>
                  <div><span className="font-medium text-gray-900">Last Remark:</span> {logRow.remark?.trim() ? logRow.remark : '—'}</div>
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-gray-600 mb-1.5">Recent activity</div>
              {historyLoading ? (
                <div className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-lg border border-gray-100 bg-gray-50 text-xs text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <div>Loading follow-up history...</div>
                </div>
              ) : historyError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{historyError}</div>
              ) : history.length === 0 ? (
                <div className="text-xs text-gray-400">No prior follow-ups logged.</div>
              ) : (
                <div className="space-y-1.5 max-h-32 overflow-y-auto border border-gray-100 rounded-lg p-2 bg-gray-50">
                  {history.map(h => (
                    <div key={h.pkFollowupId} className="text-xs text-gray-600 flex gap-2">
                      <span className="text-gray-400 whitespace-nowrap">{fmtDate(h.followupDate)}</span>
                      {h.followupStatus && <Badge label={h.followupStatus} />}
                      <span className="truncate">{h.followupSubStatus ?? h.comments ?? ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select label="Status *" value={form.status} onChange={e => f('status', e.target.value)}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </Select>
              <Select label="Classification" value={form.classification} onChange={e => f('classification', e.target.value)}>
                {CLASSIFICATIONS.map(c => <option key={c}>{c}</option>)}
              </Select>
              <div>
                <Input label="Sub-status" list="followup-sub-status-suggestions" value={form.subStatus} onChange={e => f('subStatus', e.target.value)} />
                <datalist id="followup-sub-status-suggestions">
                  {SUB_STATUS_SUGGESTIONS.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>
              {form.status === 'FollowUp' && (
                <Input label="Next Follow-up Date *" type="date" value={form.nextFollowUpDate} onChange={e => f('nextFollowUpDate', e.target.value)} />
              )}
            </div>
            <Textarea label="Comments" value={form.comments} onChange={e => f('comments', e.target.value)} placeholder="What was discussed on this call..." />

            {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}

            <div className="flex gap-3 justify-end pt-2">
              <Btn variant="outline" onClick={() => openInquiryView(logRow.inquiryId)}>
                <Eye className="w-3.5 h-3.5" />View Inquiry
              </Btn>
              <Btn variant="outline" onClick={() => openInquiryEdit(logRow.inquiryId)}>
                <Pencil className="w-3.5 h-3.5" />Edit Inquiry
              </Btn>
              <Btn variant="outline" onClick={() => setLogRow(null)}>Cancel</Btn>
              <Btn onClick={save} disabled={isPending}>{isPending ? 'Saving...' : 'Save Follow-up'}</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
