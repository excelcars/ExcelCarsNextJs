'use client'

import { useEffect, useId, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Image as ImageIcon, Download, Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import { Btn, Input, Select, Table, SearchBar, Modal } from '@/components/ui'
import { INVENTORY_STATUSES } from '@/features/inventory/queries'

interface StockRow {
  inventoryId: number
  registrationNo: string | null
  sku: string | null
  colour: string | null
  year: number | null
  month: string | null
  fuelType: string | null
  kmsDriven: string | null
  noOfOwners: number | null
  tax: string | null
  insuranceType: string | null
  price: string | null
  status: string | null
  otherRemarks: string | null
  internalComments: string | null
  ownedBy: string | null
  mobileNoOwnedBy: string | null
  customerName: string | null
  carVariantMaster: {
    variant: string | null
    carMakeMaster: { make: string | null } | null
    carModelMaster: { model: string | null } | null
  } | null
  _count: { inventoryPhotos: number }
}

interface Photo { documentId: number; fileName: string; previewUrl: string | null }
const STRUCTURED_FILTERS = [
  ['make', 'Make'], ['model', 'Model'], ['variant', 'Variant'], ['colour', 'Colour'], ['fuelType', 'Fuel Type'],
  ['ownerType', 'Owner Type'], ['ownerName', 'Owner Name'], ['ownerMobile', 'Owner Mobile'], ['registrationNo', 'Registration No'],
] as const
type StructuredFilterKey = (typeof STRUCTURED_FILTERS)[number][0]

const JUNK_VALUES = new Set(['null', 'na', 'n/a'])
const STOCK_REPORT_PAGE_SIZES = [25, 50, 100] as const
const OPTIONAL_COLUMNS = [
  ['sku', 'SKU'], ['registrationNo', 'Reg No'], ['fuelType', 'Fuel'], ['ownerCount', 'Owner Count'], ['owner', 'Owner Name'],
  ['tax', 'Tax'], ['insurance', 'Insurance'], ['remarks', 'Remarks'], ['comments', 'Internal Comments'], ['photos', 'Photos'],
] as const
type OptionalColumn = (typeof OPTIONAL_COLUMNS)[number][0]
const clean = (v: string | null | undefined) => (!v || JUNK_VALUES.has(v.trim().toLowerCase()) ? '' : v)
const fmtMoney = (n: string | number | null) => n ? `₹${Number(n).toLocaleString('en-IN')}` : '—'

function StockStatusBadge({ label }: { label: string }) {
  const status = label.trim().toLowerCase()
  const tone = status === 'loan process'
    ? 'border-violet-100 bg-violet-50 text-violet-700 before:bg-violet-500'
    : status === 'not available'
      ? 'border-slate-200 bg-slate-100 text-slate-600 before:bg-slate-400'
      : status === 'available' || status === 'in stock'
        ? 'border-emerald-100 bg-emerald-50 text-emerald-700 before:bg-emerald-500'
        : status === 'sold'
          ? 'border-red-100 bg-red-50 text-red-700 before:bg-red-500'
          : 'border-blue-100 bg-blue-50 text-blue-700 before:bg-blue-500'

  return <span title={label} className={`inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold leading-none ${tone} before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full`}>{label}</span>
}
const stockColourSwatches: Array<[string, string]> = [['a.royale', '#102f77'], ['royale', '#102f77'], ['blue', '#2563eb'], ['white', '#e5e7eb'], ['black', '#111827'], ['silver', '#cbd5e1'], ['grey', '#94a3b8'], ['gray', '#94a3b8'], ['red', '#dc2626'], ['pink', '#ec4899'], ['green', '#16a34a'], ['brown', '#92400e'], ['gold', '#ca8a04'], ['orange', '#ea580c']]
const stockColourSwatch = (colour: string | null) => stockColourSwatches.find(([name]) => clean(colour).toLowerCase().includes(name))?.[1] ?? '#94a3b8'

interface StockReportClientProps {
  initialData: StockRow[]
  initialFilters: {
    search: string; status: string; make: string; model: string; variant: string; colour: string; fuelType: string
    ownerType: string; ownerName: string; ownerMobile: string; registrationNo: string
  }
  total: number
  page: number
  pageSize: number
  pageCount: number
  totalValue: string | null
  statusCounts: Array<{ status: string; count: number }>
  canAccessInventory: boolean
}

export function StockReportClient({ initialData, initialFilters, total, page, pageSize, pageCount, totalValue, statusCounts, canAccessInventory }: StockReportClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState(initialFilters.search)
  const [filterStatus, setFilterStatus] = useState(initialFilters.status)
  const [filters, setFilters] = useState(initialFilters)
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const filterPanelId = useId()
  const activeFilterCount = STRUCTURED_FILTERS.filter(([key]) => filters[key].trim()).length
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [photoRow, setPhotoRow] = useState<StockRow | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [photosLoading, setPhotosLoading] = useState(false)
  const [photosError, setPhotosError] = useState('')
  const [unavailablePhotoIds, setUnavailablePhotoIds] = useState<Set<number>>(new Set())
  const [suggestions, setSuggestions] = useState<Partial<Record<StructuredFilterKey, string[]>>>({})
  const [visibleColumns, setVisibleColumns] = useState<Set<OptionalColumn>>(() => new Set(OPTIONAL_COLUMNS.map(([key]) => key)))
  const suggestionTimers = useRef<Partial<Record<StructuredFilterKey, ReturnType<typeof setTimeout>>>>({})
  const suggestionRequestIds = useRef<Partial<Record<StructuredFilterKey, number>>>({})

  useEffect(() => {
    setSearch(initialFilters.search)
    setFilterStatus(initialFilters.status)
    setFilters(initialFilters)
  }, [initialFilters])

  const pushFilters = (next: typeof initialFilters, nextPage = 1, nextPageSize = pageSize) => {
    const params = new URLSearchParams()
    Object.entries(next).forEach(([key, value]) => {
      if (value && !(key === 'status' && value === 'All')) params.set(key, value.trim())
    })
    if (nextPage > 1) params.set('page', String(nextPage))
    if (nextPageSize !== 25) params.set('pageSize', String(nextPageSize))
    startTransition(() => router.push(`/reports/stock${params.size ? `?${params}` : ''}`))
  }

  const applyFilters = () => pushFilters({ ...filters, search, status: filterStatus })
  const resetView = () => {
    const empty = { search: '', status: 'All', make: '', model: '', variant: '', colour: '', fuelType: '', ownerType: '', ownerName: '', ownerMobile: '', registrationNo: '' }
    setSearch('')
    setFilterStatus('All')
    setFilters(empty)
    pushFilters(empty, 1, 25)
  }

  const loadSuggestions = (key: StructuredFilterKey, value: string) => {
    if (suggestionTimers.current[key]) clearTimeout(suggestionTimers.current[key])
    if (value.trim().length < 2) {
      setSuggestions(current => ({ ...current, [key]: [] }))
      return
    }
    suggestionTimers.current[key] = setTimeout(async () => {
      const requestId = (suggestionRequestIds.current[key] ?? 0) + 1
      suggestionRequestIds.current[key] = requestId
      try {
        const res = await fetch(`/api/reports/stock/suggestions?field=${key}&q=${encodeURIComponent(value.trim())}`)
        const payload: unknown = await res.json()
        if (suggestionRequestIds.current[key] === requestId) {
          setSuggestions(current => ({ ...current, [key]: res.ok && Array.isArray(payload) ? payload.filter((item): item is string => typeof item === 'string') : [] }))
        }
      } catch {
        if (suggestionRequestIds.current[key] === requestId) setSuggestions(current => ({ ...current, [key]: [] }))
      }
    }, 250)
  }

  const exportRows = async () => {
    setExportError('')
    setIsExporting(true)
    try {
      const params = new URLSearchParams()
      Object.entries(initialFilters).forEach(([key, value]) => {
        if (value && !(key === 'status' && value === 'All')) params.set(key, value)
      })
      const res = await fetch(`/api/reports/stock/export${params.size ? `?${params}` : ''}`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'stock-report.xlsx'
      anchor.click()
      URL.revokeObjectURL(url)
    } catch {
      setExportError('Could not export the stock report. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const openPhotos = async (r: StockRow) => {
    setPhotoRow(r)
    setPhotos([])
    setPhotosError('')
    setUnavailablePhotoIds(new Set())
    setPhotosLoading(true)
    try {
      const res = await fetch(`/api/reports/photos?inventoryId=${r.inventoryId}`)
      const payload: unknown = await res.json()
      if (!res.ok || !Array.isArray(payload)) throw new Error('Photo load failed')
      setPhotos(payload as Photo[])
    } catch {
      setPhotosError('Could not load photos. Please try again.')
    } finally {
      setPhotosLoading(false)
    }
  }

  const downloadPhoto = async (photo: Photo) => {
    if (!photo.previewUrl) return
    try {
      const res = await fetch(photo.previewUrl)
      if (!res.ok) throw new Error('Photo download failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = photo.fileName
      anchor.click()
      URL.revokeObjectURL(url)
    } catch {
      setPhotosError(`Could not download ${photo.fileName}. Please try again.`)
    }
  }

  const tableHeaders = [
    ...(visibleColumns.has('sku') ? ['SKU'] : []), ...(visibleColumns.has('registrationNo') ? ['Reg No'] : []), 'Vehicle', 'Year / Month',
    ...(visibleColumns.has('fuelType') ? ['Fuel'] : []), 'KM Driven', ...(visibleColumns.has('ownerCount') ? ['Owner Count'] : []), ...(visibleColumns.has('owner') ? ['Owner Name'] : []), ...(visibleColumns.has('tax') ? ['Tax'] : []), ...(visibleColumns.has('insurance') ? ['Insurance'] : []), 'Price', 'Status', ...(visibleColumns.has('remarks') ? ['Remarks'] : []), ...(visibleColumns.has('comments') ? ['Internal Comments'] : []), ...(visibleColumns.has('photos') ? ['Photos'] : []), ...(canAccessInventory ? ['Actions'] : []),
  ]
  const tableWidths = [
    ...(visibleColumns.has('sku') ? ['6%'] : []), ...(visibleColumns.has('registrationNo') ? ['6%'] : []), '9%', '5%', ...(visibleColumns.has('fuelType') ? ['5%'] : []), '5%', ...(visibleColumns.has('ownerCount') ? ['5%'] : []), ...(visibleColumns.has('owner') ? ['6%'] : []), ...(visibleColumns.has('tax') ? ['5%'] : []), ...(visibleColumns.has('insurance') ? ['6%'] : []), '8%', '7%', ...(visibleColumns.has('remarks') ? ['7%'] : []), ...(visibleColumns.has('comments') ? ['8%'] : []), ...(visibleColumns.has('photos') ? ['6%'] : []), ...(canAccessInventory ? ['7%'] : []),
  ]

  return (
    <div className="min-w-0 [overflow-wrap:anywhere] [&_input]:min-w-0 [&_input]:max-w-full [&_input:not([type=checkbox])]:text-base sm:[&_input:not([type=checkbox])]:text-sm [&_select]:text-base sm:[&_select]:text-sm [&_button]:min-h-11 [&_select]:min-h-11">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div><h1 className="text-xl font-bold text-gray-900">Stock Report</h1><p className="mt-0.5 text-sm text-gray-500">{total.toLocaleString('en-IN')} vehicles · Page {page} of {pageCount}</p></div>
        <Btn className="justify-center" variant="outline" size="sm" onClick={exportRows} disabled={isExporting}><Download className="h-4 w-4" />{isExporting ? 'Exporting...' : 'Export'}</Btn>
      </header>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white px-4 py-3 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">Matching vehicles</div>
          <div className="mt-1 text-2xl font-bold text-blue-950">{total.toLocaleString('en-IN')}</div>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white px-4 py-3 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Total stock value</div>
          <div className="mt-1 text-2xl font-bold text-emerald-950">{fmtMoney(totalValue)}</div>
        </div>
        <div className="rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white px-4 py-3 shadow-sm sm:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-violet-700">Status breakdown</div>
          <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-700">
            {statusCounts.length ? statusCounts.map(item => <span key={item.status} className="rounded-full bg-white px-2.5 py-1 shadow-sm ring-1 ring-violet-100"><span className="font-semibold">{item.status}</span> {item.count.toLocaleString('en-IN')}</span>) : <span>None</span>}
          </div>
        </div>
      </div>

      <div className="grid gap-3 mb-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">Quick search</label>
          <SearchBar value={search} onChange={setSearch} placeholder="Reg no, make, model, owner..." />
        </div>
        <button type="button" aria-expanded={filtersExpanded} aria-controls={filterPanelId} onClick={() => setFiltersExpanded(current => !current)} className="rounded-lg border border-gray-200 bg-white px-3 text-left text-sm font-medium text-gray-700 md:hidden">{filtersExpanded ? 'Hide filters' : 'Show filters'}{activeFilterCount ? ` (${activeFilterCount} active)` : ''}</button>
        <div id={filterPanelId} className={`${filtersExpanded ? 'grid' : 'hidden'} gap-3 md:contents`}>
        {STRUCTURED_FILTERS.map(([key, label]) => (
          <div key={key}>
            <Input label={label} list={`${key}-suggestions`} value={filters[key]}
            onChange={event => {
              const value = event.target.value
              setFilters(current => ({ ...current, [key]: value }))
              loadSuggestions(key, value)
            }}
            onFocus={() => loadSuggestions(key, filters[key])}
            placeholder={`Filter by ${label.toLowerCase()}`} disabled={isPending} />
            <datalist id={`${key}-suggestions`}>
              {(suggestions[key] ?? []).map(value => <option key={value} value={value} />)}
            </datalist>
          </div>
        ))}
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-gray-600">Actions</span>
          <Btn onClick={applyFilters} disabled={isPending} className="justify-center">{isPending ? 'Applying...' : 'Apply filters'}</Btn>
          <Btn variant="outline" onClick={resetView} disabled={isPending} className="justify-center">Reset filters</Btn>
        </div>
      </div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex flex-wrap gap-1.5">
          {['All', ...INVENTORY_STATUSES].map(s => (
            <button key={s} type="button" aria-pressed={filterStatus === s} onClick={() => {
              setFilterStatus(s)
              pushFilters({ ...filters, search, status: s })
            }} disabled={isPending}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${filterStatus === s ? 'text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              style={filterStatus === s ? { backgroundColor: '#1B2A6B' } : {}}>
              {s}
            </button>
          ))}
        </div>
        <Select label="Rows per page" value={String(pageSize)} disabled={isPending}
          onChange={event => pushFilters(initialFilters, 1, Number(event.target.value))}>
          {STOCK_REPORT_PAGE_SIZES.map(size => <option key={size} value={size}>{size}</option>)}
        </Select>
        <details className="relative w-full sm:w-auto">
          <summary className="flex min-h-11 cursor-pointer items-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">Columns</summary>
          <div className="absolute left-0 z-20 mt-1 grid w-full max-w-[calc(100vw-4rem)] gap-2 sm:left-auto sm:right-0 sm:w-80 rounded-lg border border-gray-200 bg-white p-3 shadow-lg sm:grid-cols-2">
            {OPTIONAL_COLUMNS.map(([key, label]) => (
              <label key={key} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-gray-700">
                <input className="h-5 w-5 shrink-0" type="checkbox" checked={visibleColumns.has(key)} onChange={() => setVisibleColumns(current => {
                  const next = new Set(current)
                  if (next.has(key)) next.delete(key); else next.add(key)
                  return next
                })} />
                {label}
              </label>
            ))}
          </div>
        </details>
      </div>

      {exportError ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{exportError}</div> : null}

      <div className="space-y-3 lg:hidden">
        {initialData.length === 0 ? <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">No records found</div> : initialData.map(r => (
          <article key={r.inventoryId} className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2"><h2 className="min-w-0 flex-1 font-semibold text-gray-900">{[clean(r.carVariantMaster?.carMakeMaster?.make), clean(r.carVariantMaster?.carModelMaster?.model)].filter(Boolean).join(' ') || 'Vehicle'}</h2>{r.status && <StockStatusBadge label={r.status} />}</div>
            {clean(r.carVariantMaster?.variant) && <p className="mt-1 text-sm text-gray-500">{clean(r.carVariantMaster?.variant)}</p>}
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-sm text-gray-600">{visibleColumns.has('registrationNo') && <span>{r.registrationNo ?? '—'}</span>}{visibleColumns.has('sku') && <span>SKU: {r.sku ?? '—'}</span>}</div>
            <p className="mt-3 text-lg font-bold text-gray-900">{fmtMoney(r.price)}</p>
            <dl className="mt-3 grid grid-cols-1 gap-3 rounded-lg bg-gray-50 p-3 text-sm min-[360px]:grid-cols-2">
              <div className="min-w-0"><dt className="text-xs text-gray-500">Year / Month</dt><dd className="mt-1 text-gray-800">{r.year ?? '—'} / {r.month ?? '—'}</dd></div>
              <div className="min-w-0"><dt className="text-xs text-gray-500">KM driven</dt><dd className="mt-1 text-gray-800">{r.kmsDriven ? Number(r.kmsDriven).toLocaleString('en-IN') : '—'}</dd></div>
              <div className="min-w-0"><dt className="text-xs text-gray-500">Colour</dt><dd className="mt-1 flex items-start gap-2 text-gray-800"><span aria-hidden="true" className="mt-1 h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10" style={{ backgroundColor: stockColourSwatch(r.colour) }} />{r.colour ?? '—'}</dd></div>
              {visibleColumns.has('fuelType') && <div className="min-w-0"><dt className="text-xs text-gray-500">Fuel</dt><dd className="mt-1 text-gray-800">{r.fuelType ?? '—'}</dd></div>}
              {visibleColumns.has('ownerCount') && <div className="min-w-0"><dt className="text-xs text-gray-500">Owner count</dt><dd className="mt-1 text-gray-800">{r.noOfOwners ?? '—'}</dd></div>}
              {visibleColumns.has('owner') && <div className="min-w-0"><dt className="text-xs text-gray-500">Owner name</dt><dd className="mt-1 text-gray-800">{r.ownedBy ?? '—'}</dd></div>}
              {visibleColumns.has('tax') && <div className="min-w-0"><dt className="text-xs text-gray-500">Tax</dt><dd className="mt-1 text-gray-800">{r.tax ?? '—'}</dd></div>}
              {visibleColumns.has('insurance') && <div className="min-w-0"><dt className="text-xs text-gray-500">Insurance</dt><dd className="mt-1 text-gray-800">{r.insuranceType ?? '—'}</dd></div>}
            </dl>
            {visibleColumns.has('remarks') && <div className="mt-3 text-sm"><p className="text-xs text-gray-500">Remarks</p><p className="mt-1 whitespace-pre-wrap text-gray-700">{r.otherRemarks ?? '—'}</p></div>}
            {visibleColumns.has('comments') && <div className="mt-3 text-sm"><p className="text-xs text-gray-500">Internal Comments</p><p className="mt-1 whitespace-pre-wrap text-gray-700">{r.internalComments ?? '—'}</p></div>}
            {(visibleColumns.has('photos') || canAccessInventory) && <div className="mt-3 grid gap-2 border-t border-gray-100 pt-3">
              {visibleColumns.has('photos') && <Btn className="justify-center" variant="outline" disabled={r._count.inventoryPhotos === 0} onClick={() => void openPhotos(r)}><ImageIcon className="h-4 w-4" />Photos ({r._count.inventoryPhotos})</Btn>}
              {canAccessInventory && <Link className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-gray-300 text-sm font-medium text-[#1B2A6B] hover:bg-gray-50" href={`/inventory?registrationNo=${encodeURIComponent(r.registrationNo ?? '')}`}><Eye className="h-4 w-4" />Open Inventory</Link>}
            </div>}
          </article>
        ))}
      </div>
      <div className="hidden lg:block">
      <Table headers={tableHeaders} columnWidths={tableWidths} empty={initialData.length === 0} stickyLastColumn={canAccessInventory} minWidthClass="min-w-[1680px]" compact>
        {initialData.map(r => (
          <tr key={r.inventoryId} className="hover:bg-gray-50 transition">
            {visibleColumns.has('sku') ? <td className="px-4 py-3 font-mono text-sm text-gray-500">{r.sku ?? '—'}</td> : null}
            {visibleColumns.has('registrationNo') ? <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-800">{r.registrationNo ?? '—'}</td> : null}
            <td className="px-4 py-3">
              <div className="min-w-0"><div className="font-semibold text-gray-900">{clean(r.carVariantMaster?.carMakeMaster?.make)} {clean(r.carVariantMaster?.carModelMaster?.model)}</div><div className="text-sm text-gray-500">{clean(r.carVariantMaster?.variant)}</div><div className="mt-1 flex items-center gap-1 text-sm text-gray-500"><span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10" style={{ backgroundColor: stockColourSwatch(r.colour) }} />{r.colour ?? '—'}</div></div>
            </td>
            <td className="px-2 py-3 text-gray-700"><div className="font-semibold">{r.year ?? '—'}</div><div className="mt-1 text-sm text-gray-500">{r.month ?? '—'}</div></td>
            {visibleColumns.has('fuelType') ? <td className="px-4 py-3 text-gray-700">{r.fuelType ?? '—'}</td> : null}
            <td className="px-4 py-3 text-gray-700">{r.kmsDriven ? Number(r.kmsDriven).toLocaleString('en-IN') : '—'}</td>
            {visibleColumns.has('ownerCount') ? <td className="px-4 py-3 text-gray-700">{r.noOfOwners ?? '—'}</td> : null}
            {visibleColumns.has('owner') ? <td className="px-4 py-3 text-sm text-gray-600">{r.ownedBy ?? '—'}</td> : null}
            {visibleColumns.has('tax') ? <td className="px-4 py-3 text-gray-700">{r.tax ?? '—'}</td> : null}
            {visibleColumns.has('insurance') ? <td className="px-4 py-3 text-gray-700">{r.insuranceType ?? '—'}</td> : null}
            <td className="px-4 py-3 font-semibold text-gray-900">{fmtMoney(r.price)}</td>
            <td className="px-4 py-3">{r.status ? <StockStatusBadge label={r.status} /> : '—'}</td>
            {visibleColumns.has('remarks') ? <td className="px-4 py-3 text-sm text-gray-600">{r.otherRemarks ?? '—'}</td> : null}
            {visibleColumns.has('comments') ? <td className="px-4 py-3 text-sm text-gray-600">{r.internalComments ?? '—'}</td> : null}
            {visibleColumns.has('photos') ? <td className="px-2 py-3">
              {r._count.inventoryPhotos > 0 ? (
                <button onClick={() => openPhotos(r)} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-[#1B2A6B] hover:bg-blue-100">
                  <ImageIcon className="w-3.5 h-3.5" />{r._count.inventoryPhotos}
                </button>
              ) : '—'}
            </td> : null}
            {canAccessInventory ? <td className="px-2 py-3">
              <Link href={`/inventory?registrationNo=${encodeURIComponent(r.registrationNo ?? '')}`} aria-label="Open Inventory" title="Open Inventory" className="group relative inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#1B2A6B]/60 text-[#1B2A6B] transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-[#1B2A6B]/20"><Eye className="h-4 w-4" /><span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">Open Inventory</span></Link>
            </td> : null}
          </tr>
        ))}
      </Table>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="text-sm text-gray-500">
          {total === 0 ? 'No matching rows found.' : `Showing ${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} of ${total.toLocaleString('en-IN')} rows.`}
        </div>
        <nav aria-label="Stock report pagination" className="grid grid-cols-2 items-center gap-2 sm:flex [&>button]:justify-center">
          <Btn variant="outline" disabled={isPending || page <= 1} onClick={() => pushFilters(initialFilters, page - 1)}><ChevronLeft className="h-4 w-4" />Prev</Btn>
          <span className="col-span-2 row-start-1 text-center text-sm text-gray-600 sm:order-none">Page {page} of {pageCount}</span>
          <Btn variant="outline" disabled={isPending || page >= pageCount} onClick={() => pushFilters(initialFilters, page + 1)}><ChevronRight className="h-4 w-4" />Next</Btn>
        </nav>
      </div>

      <Modal title={`Photos — ${photoRow?.registrationNo ?? ''}`} open={!!photoRow} onClose={() => setPhotoRow(null)}>
        <div className="min-w-0 space-y-2 [overflow-wrap:anywhere]">
          <p className="text-xs text-gray-500">Open any available image in full size or download it. Files unavailable in the current environment remain listed for reference.</p>
          {photosLoading ? (
            <div className="text-sm text-gray-400">Loading...</div>
          ) : photosError ? (
            <div className="text-sm text-red-600">{photosError}</div>
          ) : photos.length === 0 ? (
            <div className="text-sm text-gray-400">No photos on file.</div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {photos.map(p => (
                <li key={p.documentId} className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                  {p.previewUrl && !unavailablePhotoIds.has(p.documentId) ? (
                    <img
                      src={p.previewUrl}
                      alt={p.fileName}
                      className="h-40 w-full bg-gray-100 object-cover"
                      onError={() => setUnavailablePhotoIds(current => new Set(current).add(p.documentId))}
                    />
                  ) : (
                    <div className="flex h-40 items-center justify-center px-3 text-center text-xs text-gray-400">Preview unavailable</div>
                  )}
                  <div className="space-y-2 px-3 py-2">
                    <div className="[overflow-wrap:anywhere] text-xs font-mono text-gray-600" title={p.fileName}>{p.fileName}</div>
                    {p.previewUrl && !unavailablePhotoIds.has(p.documentId) ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <a href={p.previewUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#1B2A6B] hover:underline"><Eye className="h-3.5 w-3.5" />View</a>
                        <button type="button" onClick={() => downloadPhoto(p)} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#1B2A6B] hover:underline"><Download className="h-3.5 w-3.5" />Download</button>
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
    </div>
  )
}
