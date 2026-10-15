'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, X, Car, Download, Loader2, Pencil } from 'lucide-react'
import { Btn, Input, Modal, PageHeader, SearchBar, ConfirmDialog } from '@/components/ui'
import { ListPagination } from '@/components/ListPagination'
import { ChecklistTable } from './ChecklistTable'
import { ChecklistYesNoToggle } from './ChecklistYesNoToggle'
import { ChecklistDocumentTypeToggle } from './ChecklistDocumentTypeToggle'
import { CustomerPicker } from '@/components/CustomerPicker'
import { createChecklist, updateChecklist, deleteChecklist, type ChecklistFormInput, type DocRow } from './actions'
import { isValidEmail, isValidPhone, isValidYear } from '@/lib/validation'

const LEGACY_DOCS = [
  'Original Registration Book / RC Card',
  'Original Tax Book for before 97 vehicle',
  'Dealers Invoice',
  'Insurance Certificate (State Comprehensive / Third Party )',
  'Muncipal Tax Receipt (If applicable)',
  'TTO Set duly signed all places',
  'Authorised Signatory Letter on Company Letter Head (In case of Company Vehicle)',
  'NOC Finance Company (If Hypothecation Case)',
  'Owner Authority Letter to Middle Man for selling car',
  'PUC Validity',
  'Duplicate Keys',
  'Manuals',
  'Spare Tyre & Tool Kit',
] as const

interface CustomerOption { custId: number; custName: string; custMobile: string | null; custEmail: string | null }
interface UserOption { userId: number; userName: string | null; displayName: string | null }

interface Vehicle {
  inventoryId: number
  registrationNo: string | null
  sku: string | null
  colour: string | null
  year: number | null
  fuelType: string | null
  customerId: number | null
  customerName: string | null
  customer: CustomerOption | null
  carVariantMaster: {
    variant: string | null
    carMakeMaster: { make: string | null } | null
    carModelMaster: { model: string | null } | null
  } | null
}

export interface ChecklistListRow {
  documentId: number
  make: string | null
  model: string | null
  variant: string | null
  colour: string | null
  registrationNo: string | null
  year: number | null
  fuelType: string | null
  customerId: number | null
  customerNameLegacy: string | null
  customerMobileLegacy: string | null
  customerEmailLegacy: string | null
  createdBy: number | null
  createdDate: Date | string | null
  updatedBy: number | null
  updatedDate: Date | string | null
  inventoryId: number | null
  customer: CustomerOption | null
  documentCount: number
  applicableCount: number
  receivedApplicableCount: number
  receivedCount: number
  createdByUser?: UserOption | null
  updatedByUser?: UserOption | null
}

interface ChecklistDetailRow extends Omit<ChecklistListRow, 'documentCount' | 'applicableCount' | 'receivedApplicableCount' | 'receivedCount'> {
  checklistDocDetails: { checklistDetailsId: number; documentName: string | null; applicable: string | null; received: string | null; originalCopy: string | null }[]
}

const JUNK_VALUES = new Set(['null', 'na', 'n/a'])
const clean = (v: string | null | undefined) => (!v || JUNK_VALUES.has(v.trim().toLowerCase()) ? '' : v)
const normalizeRegistration = (v: string | null | undefined) => (v ?? '').replace(/[^a-z0-9]/gi, '').toLowerCase()
const fmtDateTime = (value: Date | string | null | undefined) => {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function vehicleLabel(v: Vehicle) {
  const parts = [clean(v.carVariantMaster?.carMakeMaster?.make), clean(v.carVariantMaster?.carModelMaster?.model), clean(v.carVariantMaster?.variant)].filter(Boolean)
  return `${v.registrationNo ?? v.sku ?? '—'} — ${parts.join(' ')}`
}

function emptyForm(): ChecklistFormInput {
  return {
    inventoryId: null, make: '', model: '', variant: '', colour: '', registrationNo: '', year: null, fuelType: '',
    customerId: null, customerNameLegacy: '', customerMobileLegacy: '', customerEmailLegacy: '',
    docs: LEGACY_DOCS.map(name => ({ documentName: name, applicable: 'No', received: 'No', originalCopy: 'Original' })),
  }
}

function optionSnapshot<T extends object | null>(value: T) {
  return value
    ? JSON.stringify(
        Object.keys(value as object)
          .sort()
          .reduce<Record<string, unknown>>((acc, key) => {
            acc[key] = (value as Record<string, unknown>)[key]
            return acc
          }, {}),
      )
    : ''
}

function isApplicable(value: string | null) {
  return value === 'Yes' || value === 'Applicable'
}

function customerSnapshotForVehicle(v: Vehicle) {
  return {
    customerId: v.customer?.custId ?? v.customerId,
    customerNameLegacy: v.customer?.custName ?? v.customerName ?? '',
    customerMobileLegacy: v.customer?.custMobile ?? '',
    customerEmailLegacy: v.customer?.custEmail ?? '',
  }
}

function computeStatus(docs: { applicable: string | null; received: string | null }[]) {
  const applicable = docs.filter(d => isApplicable(d.applicable))
  if (applicable.length === 0) return 'Partial'
  return applicable.every(d => d.received === 'Yes') ? 'Complete' : 'Partial'
}

function csvValue(value: string | number | boolean | null | undefined) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildChecklistExportFileName(rows: Array<{ documentId: number }>, search: string, kind: 'summary' | 'details') {
  const today = new Date().toISOString().slice(0, 10)
  const parts = ['checklist', kind]
  if (search.trim()) parts.push('filtered')
  if (parts.length === 1) parts.push(`${rows.length}-rows`)
  parts.push(today)
  return `${parts.map(slugify).filter(Boolean).join('-')}.csv`
}

function exportChecklistCsv(rows: ChecklistDetailRow[], search: string) {
  const headers = [
    'Checklist ID',
    'Linked Inventory ID',
    'Registration No',
    'Make',
    'Model',
    'Variant',
    'Colour',
    'Year',
    'Fuel Type',
    'Linked Customer ID',
    'Customer Name',
    'Customer Mobile',
    'Customer Email',
    'Document Count',
    'Received Count',
    'Status',
    'Documents Summary',
  ]

  const lines = [headers.map(csvValue).join(',')]
  for (const row of rows) {
    const receivedCount = row.checklistDocDetails.filter(d => d.received === 'Yes').length
    const docsSummary = row.checklistDocDetails
      .map(d => `${d.documentName ?? ''} | Applicable: ${d.applicable ?? ''} | Received: ${d.received ?? ''} | Type: ${d.originalCopy ?? ''}`)
      .join(' ; ')

    lines.push([
      row.documentId,
      row.inventoryId,
      row.registrationNo,
      clean(row.make),
      clean(row.model),
      clean(row.variant),
      clean(row.colour),
      row.year,
      clean(row.fuelType),
      row.customer?.custId ?? row.customerId,
      row.customer?.custName ?? row.customerNameLegacy,
      row.customer?.custMobile ?? row.customerMobileLegacy,
      row.customer?.custEmail ?? row.customerEmailLegacy,
      row.checklistDocDetails.length,
      receivedCount,
      computeStatus(row.checklistDocDetails),
      docsSummary,
    ].map(csvValue).join(','))
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = buildChecklistExportFileName(rows, search, 'summary')
  link.click()
  URL.revokeObjectURL(url)
}

function exportLegacyChecklistDetailsCsv(rows: ChecklistDetailRow[], search: string) {
  const headers = [
    'Make',
    'Model',
    'Variant',
    'Colour',
    'Registration No',
    'Year',
    'Fuel Type',
    'Customer Name',
    'Customer Mobile',
    'Customer Email',
    'Document Name',
    'Applicable',
    'Received',
    'Original Copy',
  ]
  const lines = [headers.map(csvValue).join(',')]

  for (const row of rows) {
    for (const detail of row.checklistDocDetails) {
      lines.push([
        clean(row.make),
        clean(row.model),
        clean(row.variant),
        clean(row.colour),
        row.registrationNo,
        row.year,
        clean(row.fuelType),
        row.customer?.custName ?? row.customerNameLegacy,
        row.customer?.custMobile ?? row.customerMobileLegacy,
        row.customer?.custEmail ?? row.customerEmailLegacy,
        detail.documentName,
        detail.applicable,
        detail.received,
        detail.originalCopy,
      ].map(csvValue).join(','))
    }
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = buildChecklistExportFileName(rows, search, 'details')
  link.click()
  URL.revokeObjectURL(url)
}

export function ChecklistClient({
  initialData,
  vehicles,
  total,
  page,
  pageCount,
  pageSize,
  initialSearch,
  initialRegistration,
}: {
  initialData: ChecklistListRow[]
  vehicles: Vehicle[]
  total: number
  page: number
  pageCount: number
  pageSize: number
  initialSearch: string
  initialRegistration: string
}) {
  const router = useRouter()
  const [data, setData] = useState(initialData)
  const [search, setSearch] = useState(initialSearch)
  const [registration, setRegistration] = useState(initialRegistration)
  const [modal, setModal] = useState<null | 'add' | 'edit'>(null)
  const [entryMode, setEntryMode] = useState<'existing' | 'manual'>('existing')
  const [viewOpen, setViewOpen] = useState(false)
  const [viewRow, setViewRow] = useState<ChecklistDetailRow | null>(null)
  const [form, setForm] = useState<ChecklistFormInput>(emptyForm())
  const [savedFormSnapshot, setSavedFormSnapshot] = useState(JSON.stringify(emptyForm()))
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null)
  const [savedCustomerSnapshot, setSavedCustomerSnapshot] = useState('')
  const [vehicleQuery, setVehicleQuery] = useState('')
  const [vehicleOpen, setVehicleOpen] = useState(false)
  const [registrationOpen, setRegistrationOpen] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [savedVehicleSnapshot, setSavedVehicleSnapshot] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleteDocIndex, setDeleteDocIndex] = useState<number | null>(null)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<Record<string, boolean>>({})
  const [detailError, setDetailError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [isRoutePending, startRouteTransition] = useTransition()
  const [exportError, setExportError] = useState('')
  const [isExporting, startExportTransition] = useTransition()
  const [detailLoading, setDetailLoading] = useState(false)
  const detailRequestRef = useRef(0)
  const detailCacheRef = useRef(new Map<number, ChecklistDetailRow>())

  useEffect(() => {
    setData(initialData)
  }, [initialData])

  useEffect(() => {
    setSearch(initialSearch)
  }, [initialSearch])

  useEffect(() => {
    setRegistration(initialRegistration)
  }, [initialRegistration])

  const vehicleMatches = useMemo(() => {
    const q = vehicleQuery.toLowerCase()
    if (!q) return vehicles.slice(0, 20)
    return vehicles.filter(v => vehicleLabel(v).toLowerCase().includes(q)).slice(0, 20)
  }, [vehicles, vehicleQuery])

  const registrationMatches = useMemo(() => {
    const q = normalizeRegistration(form.registrationNo)
    const withRegistration = vehicles.filter(v => clean(v.registrationNo))
    if (!q) return withRegistration.slice(0, 20)
    return withRegistration.filter(v => normalizeRegistration(v.registrationNo).includes(q)).slice(0, 20)
  }, [vehicles, form.registrationNo])

  const hasUnsavedChanges = useMemo(() => {
    if (!modal) return false
    return (
      JSON.stringify(form) !== savedFormSnapshot ||
      optionSnapshot(selectedCustomer) !== savedCustomerSnapshot ||
      optionSnapshot(selectedVehicle) !== savedVehicleSnapshot
    )
  }, [form, modal, savedCustomerSnapshot, savedFormSnapshot, savedVehicleSnapshot, selectedCustomer, selectedVehicle])

  const openAdd = () => {
    const nextForm = emptyForm()
    setForm(nextForm)
    setSavedFormSnapshot(JSON.stringify(nextForm))
    setSelectedCustomer(null)
    setSavedCustomerSnapshot('')
    setSelectedVehicle(null)
    setSavedVehicleSnapshot('')
    setVehicleQuery('')
    setRegistrationOpen(false)
    setEditId(null)
    setEntryMode('existing')
    setError('')
    setModal('add')
  }

  const applyDetailToForm = (r: ChecklistDetailRow) => {
    const nextVehicle = vehicles.find(v => v.inventoryId === r.inventoryId) ?? null
    setEntryMode(nextVehicle ? 'existing' : 'manual')
    const vehicleCustomer = nextVehicle ? customerSnapshotForVehicle(nextVehicle) : null
    const nextForm: ChecklistFormInput = {
      inventoryId: r.inventoryId,
      make: r.make ?? '', model: r.model ?? '', variant: r.variant ?? '', colour: r.colour ?? '',
      registrationNo: r.registrationNo ?? '', year: r.year, fuelType: r.fuelType ?? '',
      customerId: vehicleCustomer?.customerId ?? r.customerId,
      customerNameLegacy: vehicleCustomer?.customerNameLegacy ?? r.customerNameLegacy ?? '',
      customerMobileLegacy: vehicleCustomer?.customerMobileLegacy ?? r.customerMobileLegacy ?? '',
      customerEmailLegacy: vehicleCustomer?.customerEmailLegacy ?? r.customerEmailLegacy ?? '',
      docs: r.checklistDocDetails.length
        ? r.checklistDocDetails.map(d => ({ documentName: d.documentName ?? '', applicable: d.applicable === 'Applicable' ? 'Yes' : d.applicable ?? 'No', received: d.received ?? 'No', originalCopy: d.originalCopy ?? 'Original' }))
        : emptyForm().docs,
    }
    const nextCustomer = nextVehicle?.customer ?? r.customer
    setForm(nextForm)
    setSavedFormSnapshot(JSON.stringify(nextForm))
    setSelectedCustomer(nextCustomer)
    setSavedCustomerSnapshot(optionSnapshot(nextCustomer))
    setSelectedVehicle(nextVehicle)
    setSavedVehicleSnapshot(optionSnapshot(nextVehicle))
    setVehicleQuery('')
    setRegistrationOpen(false)
  }

  const loadChecklistDetail = async (documentId: number) => {
    const cached = detailCacheRef.current.get(documentId)
    if (cached) return cached

    const res = await fetch(`/api/checklist/detail?documentId=${documentId}`)
    const body = await res.json().catch(() => null)
    if (!res.ok) {
      throw new Error((body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') ? body.error : 'Could not load checklist details.')
    }
    detailCacheRef.current.set(documentId, body as ChecklistDetailRow)
    return body as ChecklistDetailRow
  }

  const openEdit = (r: Pick<ChecklistListRow, 'documentId'>) => {
    setEditId(r.documentId)
    setError('')
    setDetailError('')
    setForm(emptyForm())
    setSelectedCustomer(null)
    setSelectedVehicle(null)
    setVehicleQuery('')
    setModal('edit')
    const requestId = ++detailRequestRef.current
    setDetailLoading(true)
    void loadChecklistDetail(r.documentId)
      .then(detail => {
        if (detailRequestRef.current !== requestId) return
        applyDetailToForm(detail)
      })
      .catch(err => {
        if (detailRequestRef.current !== requestId) return
        setDetailError(err instanceof Error ? err.message : 'Could not load checklist details.')
      })
      .finally(() => {
        if (detailRequestRef.current === requestId) setDetailLoading(false)
      })
  }

  const openView = (r: ChecklistListRow) => {
    setViewOpen(true)
    setViewRow(null)
    setDetailError('')
    const requestId = ++detailRequestRef.current
    setDetailLoading(true)
    void loadChecklistDetail(r.documentId)
      .then(detail => {
        if (detailRequestRef.current !== requestId) return
        setViewRow(detail)
      })
      .catch(err => {
        if (detailRequestRef.current !== requestId) return
        setDetailError(err instanceof Error ? err.message : 'Could not load checklist details.')
      })
      .finally(() => {
        if (detailRequestRef.current === requestId) setDetailLoading(false)
      })
  }

  const selectVehicle = (v: Vehicle) => {
    const customer = customerSnapshotForVehicle(v)
    setSelectedVehicle(v)
    setSelectedCustomer(v.customer)
    setVehicleOpen(false)
    setRegistrationOpen(false)
    setVehicleQuery('')
    setForm(f => ({
      ...f,
      inventoryId: v.inventoryId,
      make: clean(v.carVariantMaster?.carMakeMaster?.make),
      model: clean(v.carVariantMaster?.carModelMaster?.model),
      variant: clean(v.carVariantMaster?.variant),
      colour: v.colour ?? '',
      registrationNo: v.registrationNo ?? '',
      year: v.year,
      fuelType: v.fuelType ?? '',
      ...customer,
    }))
  }

  const onRegistrationChange = (value: string) => {
    const exactMatch = vehicles.find(v => normalizeRegistration(v.registrationNo) === normalizeRegistration(value))

    if (exactMatch) {
      selectVehicle(exactMatch)
      return
    }

    setSelectedVehicle(null)
    setSelectedCustomer(null)
    setRegistrationOpen(true)
    setForm(f => ({
      ...f,
      inventoryId: null,
      registrationNo: value,
      make: '',
      model: '',
      variant: '',
      colour: '',
      year: null,
      fuelType: '',
      customerId: null,
      customerNameLegacy: '',
      customerMobileLegacy: '',
      customerEmailLegacy: '',
    }))
  }

  const onCustomerChange = (customer: CustomerOption | null) => {
    setSelectedCustomer(customer)
    setForm(f => ({ ...f, customerId: customer?.custId ?? null, customerNameLegacy: customer?.custName ?? '', customerMobileLegacy: customer?.custMobile ?? '', customerEmailLegacy: customer?.custEmail ?? '' }))
  }

  const updateDoc = (i: number, patch: Partial<DocRow>) => {
    setForm(f => ({ ...f, docs: f.docs.map((d, idx) => idx === i ? { ...d, ...patch } : d) }))
  }
  const addDoc = () => setForm(f => ({ ...f, docs: [...f.docs, { documentName: '', applicable: 'No', received: 'No', originalCopy: 'Original' }] }))
  const removeDoc = (i: number) => setForm(f => ({ ...f, docs: f.docs.filter((_, idx) => idx !== i) }))

  const closeForm = () => {
    setModal(null)
    setDiscardOpen(false)
    setError('')
    setErrors({})
    setDetailError('')
    setDetailLoading(false)
  }

  const requestCloseForm = () => {
    if (isPending) return
    if (hasUnsavedChanges) {
      setDiscardOpen(true)
      return
    }
    closeForm()
  }

  const save = () => {
    setError('')
    const newErrors: Record<string, boolean> = {}

    if (!form.registrationNo?.trim()) {
      newErrors.registrationNo = true
    }
    if (form.customerMobileLegacy && !isValidPhone(form.customerMobileLegacy)) {
      newErrors.customerMobileLegacy = true
    }
    if (form.customerEmailLegacy && !isValidEmail(form.customerEmailLegacy)) {
      newErrors.customerEmailLegacy = true
    }
    if (form.year !== null && !isValidYear(form.year)) {
      newErrors.year = true
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      if (newErrors.registrationNo) setError('Registration number is required.')
      else if (newErrors.customerMobileLegacy) setError('Customer mobile must contain exactly 10 digits.')
      else if (newErrors.customerEmailLegacy) setError('Enter a valid customer email address.')
      else if (newErrors.year) setError('Enter a valid vehicle year.')
      else setError('Complete the required checklist information.')
      return
    }
    setErrors({})

    startTransition(async () => {
      const result = editId ? await updateChecklist(editId, form) : await createChecklist(form)
      if (!result.success) {
        setError(result.error ?? 'Something went wrong.')
        return
      }
      setSavedFormSnapshot(JSON.stringify(form))
      setSavedCustomerSnapshot(optionSnapshot(selectedCustomer))
      setSavedVehicleSnapshot(optionSnapshot(selectedVehicle))
      closeForm()
      window.location.reload()
    })
  }

  const del = () => {
    if (!deleteId) return
    startTransition(async () => {
      const result = await deleteChecklist(deleteId)
      if (result.success) {
        setData(prev => prev.filter(r => r.documentId !== deleteId))
      } else {
        setError(result.error ?? 'Could not delete this record.')
      }
      setDeleteId(null)
    })
  }

  const exportRows = (format: 'summary' | 'details') => {
    setExportError('')
    startExportTransition(async () => {
      try {
        const params = new URLSearchParams()
        if (search.trim()) params.set('search', search.trim())
        if (registration.trim()) params.set('registration', registration.trim())
        const res = await fetch(`/api/checklist/export${params.toString() ? `?${params.toString()}` : ''}`)
        const payload = await res.json().catch(() => null)
        if (!res.ok || !Array.isArray(payload)) {
          throw new Error(payload?.error ?? 'Could not export checklist records.')
        }
        const rows = payload as ChecklistDetailRow[]
        if (format === 'details') {
          exportLegacyChecklistDetailsCsv(rows, search)
        } else {
          exportChecklistCsv(rows, search)
        }
      } catch (err) {
        setExportError(err instanceof Error ? err.message : 'Could not export checklist records.')
      }
    })
  }

  const pushQuery = (params: Record<string, string>) => {
    const q = new URLSearchParams({
      search: initialSearch,
      registration: initialRegistration,
      page: String(page),
      ...params,
    })
    for (const [k, v] of [...q.entries()]) {
      if (!v) q.delete(k)
    }
    startRouteTransition(() => {
      router.push(`/checklist${q.toString() ? `?${q.toString()}` : ''}`)
    })
  }

  useEffect(() => {
    const handle = setTimeout(() => {
      if (search !== initialSearch || registration !== initialRegistration) {
        pushQuery({ search, registration, page: '1' })
      }
    }, 350)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRegistration, initialSearch, registration, search])

  return (
    <div>
      <PageHeader
        title="Checklist / Documents"
        subtitle={`${total} vehicle checklists`}
        action={
          <div className="flex items-center gap-2">
            <Btn variant="outline" size="sm" onClick={() => exportRows('summary')} disabled={isExporting || total === 0}>
              <Download className="w-3.5 h-3.5" />{isExporting ? 'Exporting...' : `${search.trim() ? 'Export Filtered' : 'Export Summary'} (${total})`}
            </Btn>
            <Btn variant="outline" size="sm" onClick={() => exportRows('details')} disabled={isExporting || total === 0}>
              <Download className="w-3.5 h-3.5" />{isExporting ? 'Exporting...' : 'Export Detail Rows'}
            </Btn>
            <Btn size="sm" onClick={openAdd}><Plus className="w-3.5 h-3.5" />Add Checklist</Btn>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <SearchBar value={search} onChange={setSearch} placeholder="Search reg no, customer..." disabled={isRoutePending} />
          <div className="w-56">
            <Input value={registration} onChange={e => setRegistration(e.target.value)} placeholder="Exact registration no..." disabled={isRoutePending} />
          </div>
        </div>
        <div className="text-xs text-gray-500">{total} checklist records</div>
      </div>
      {exportError && <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{exportError}</div>}

      <ChecklistTable data={data} pending={isRoutePending} onView={openView} onEdit={openEdit} onDelete={setDeleteId} />
      <ListPagination
        page={page}
        pageCount={pageCount}
        total={total}
        showingText={`Showing ${total === 0 ? 0 : (page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)}`}
        pending={isRoutePending}
        onPageChange={nextPage => pushQuery({ page: String(nextPage) })}
      />

      <Modal title={editId ? 'Edit Checklist' : 'Add Checklist'} open={!!modal} onClose={requestCloseForm} width="max-w-3xl">
        {detailLoading && editId ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-6">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading checklist details...</span>
          </div>
        ) : detailError && editId ? (
          <div className="space-y-4 py-2">
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{detailError}</div>
            <div className="flex justify-end">
              <Btn variant="outline" onClick={requestCloseForm}>Close</Btn>
            </div>
          </div>
        ) : (
        <div className="space-y-4">
          <div className="inline-flex rounded-lg bg-slate-100 p-1">
            <button type="button" onClick={() => setEntryMode('existing')} className={`rounded-md px-3 py-2 text-sm font-medium ${entryMode === 'existing' ? 'bg-white text-[#1B2A6B] shadow-sm' : 'text-slate-600'}`}>Existing vehicle</button>
            <button type="button" onClick={() => { setEntryMode('manual'); setSelectedVehicle(null); setSelectedCustomer(null); setForm(f => ({ ...f, inventoryId: null, customerId: null })) }} className={`rounded-md px-3 py-2 text-sm font-medium ${entryMode === 'manual' ? 'bg-white text-[#1B2A6B] shadow-sm' : 'text-slate-600'}`}>Manual entry</button>
          </div>
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="relative">
            <Input
              label={entryMode === 'existing' ? 'Registration No *' : 'Registration No *'}
              placeholder={entryMode === 'existing' ? 'Search existing registration...' : 'Enter registration number...'}
              value={form.registrationNo}
              onChange={e => entryMode === 'existing' ? (onRegistrationChange(e.target.value), setRegistrationOpen(true)) : setForm(f => ({ ...f, registrationNo: e.target.value }))}
              onFocus={() => entryMode === 'existing' && setRegistrationOpen(true)}
              error={errors.registrationNo}
            />
            {entryMode === 'existing' && registrationOpen && !selectedVehicle && (
              <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                <div className="sticky top-0 flex justify-end border-b border-gray-100 bg-white px-2 py-1"><button type="button" onClick={() => setRegistrationOpen(false)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="Close selector"><X className="h-4 w-4" /></button></div>
                {registrationMatches.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-400">No matching registrations</div>
                ) : registrationMatches.map(v => (
                  <button key={v.inventoryId} type="button" onClick={() => selectVehicle(v)} className="w-full border-b border-gray-50 px-3 py-2 text-left text-sm hover:bg-gray-50 last:border-0">
                    <span className="font-medium text-gray-800">{v.registrationNo ?? v.sku ?? '—'}</span>
                    <span className="block text-xs text-gray-500">{vehicleLabel(v)}</span>
                  </button>
                ))}
              </div>
            )}
            {entryMode === 'existing' && <div className="mt-1 text-xs text-gray-500">
              {selectedVehicle
                ? `Linked vehicle: ${vehicleLabel(selectedVehicle)}`
                : form.registrationNo.trim()
                  ? 'Select an existing registration number to auto-fill vehicle details.'
                  : 'Search by registration number first, or use the vehicle picker below.'}
            </div>}
          </div>

          {entryMode === 'existing' && <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Vehicle *</label>
            {selectedVehicle ? (
              <div className="flex items-center justify-between border border-gray-200 rounded-md px-3 py-2 bg-gray-50">
                <div className="flex items-center gap-2 text-sm text-gray-800">
                  <Car className="w-4 h-4 text-gray-400" />{vehicleLabel(selectedVehicle)}
                </div>
                <button type="button" onClick={() => { setSelectedVehicle(null); setSelectedCustomer(null); setForm(f => ({ ...f, inventoryId: null, customerId: null, customerNameLegacy: '', customerMobileLegacy: '', customerEmailLegacy: '' })) }} className="text-gray-400 hover:text-red-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  placeholder="Search by reg no, make, model..."
                  value={vehicleQuery}
                  onChange={e => { setVehicleQuery(e.target.value); setVehicleOpen(true) }}
                  onFocus={() => setVehicleOpen(true)}
                />
                {vehicleOpen && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                    {vehicleMatches.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-400">No matches</div>
                    ) : vehicleMatches.map(v => (
                      <button key={v.inventoryId} type="button" onClick={() => selectVehicle(v)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0">
                        {vehicleLabel(v)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>}

          <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="mb-3"><h3 className="text-sm font-semibold text-slate-900">Car details</h3><p className="text-xs text-slate-500">Confirm or enter the vehicle information for this checklist.</p></div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Input label="Make *" value={form.make} disabled={entryMode === 'existing'} onChange={e => setForm(f => ({ ...f, make: e.target.value }))} />
              <Input label="Model *" value={form.model} disabled={entryMode === 'existing'} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
              <Input label="Variant *" value={form.variant} disabled={entryMode === 'existing'} onChange={e => setForm(f => ({ ...f, variant: e.target.value }))} />
              <Input label="Colour *" value={form.colour} disabled={entryMode === 'existing'} onChange={e => setForm(f => ({ ...f, colour: e.target.value }))} />
              <Input label="Year *" type="number" value={form.year ?? ''} disabled={entryMode === 'existing'} onChange={e => setForm(f => ({ ...f, year: e.target.value ? Number(e.target.value) : null }))} />
              <Input label="Fuel Type *" value={form.fuelType} disabled={entryMode === 'existing'} onChange={e => setForm(f => ({ ...f, fuelType: e.target.value }))} />
            </div>
            {entryMode === 'existing' ? <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2"><div className="text-xs font-medium text-slate-500">Customer</div>{form.customerNameLegacy ? <><div className="mt-0.5 text-sm font-medium text-slate-800">{form.customerNameLegacy}</div><div className="text-xs text-slate-500">{form.customerMobileLegacy || '—'} {form.customerEmailLegacy ? `· ${form.customerEmailLegacy}` : ''}</div></> : <div className="mt-2"><CustomerPicker value={selectedCustomer} onChange={onCustomerChange} /></div>}</div> : <div className="mt-3"><div className="mb-2 text-xs font-medium text-slate-600">Customer details</div><div className="grid grid-cols-1 gap-3 md:grid-cols-3"><Input label="Customer name" value={form.customerNameLegacy} onChange={e => setForm(f => ({ ...f, customerNameLegacy: e.target.value }))} /><Input label="Customer mobile" value={form.customerMobileLegacy} error={errors.customerMobileLegacy} onChange={e => setForm(f => ({ ...f, customerMobileLegacy: e.target.value.replace(/\D/g, '') }))} /><Input label="Customer email" type="email" value={form.customerEmailLegacy} error={errors.customerEmailLegacy} onChange={e => setForm(f => ({ ...f, customerEmailLegacy: e.target.value }))} /></div></div>}
          </section>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">Document Checklist</label>
              <Btn variant="outline" size="sm" onClick={addDoc}><Plus className="w-3.5 h-3.5" />Add Document</Btn>
            </div>
            <div className="space-y-2">
              {form.docs.map((d, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-end border border-gray-100 rounded-lg p-2.5">
                      <Input label={i === 0 ? 'Document' : undefined} list="doc-name-suggestions" value={d.documentName} onChange={e => updateDoc(i, { documentName: e.target.value })} />
                      <ChecklistYesNoToggle label={i === 0 ? 'Applicable' : undefined} value={d.applicable} onChange={value => updateDoc(i, { applicable: value })} />
                      <ChecklistYesNoToggle label={i === 0 ? 'Received' : undefined} value={d.received} onChange={value => updateDoc(i, { received: value })} />
                      <ChecklistDocumentTypeToggle label={i === 0 ? 'Document type' : undefined} value={d.originalCopy} onChange={value => updateDoc(i, { originalCopy: value })} />
                  <button type="button" onClick={() => setDeleteDocIndex(i)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Remove document"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              <datalist id="doc-name-suggestions">
                {LEGACY_DOCS.map(d => <option key={d} value={d} />)}
              </datalist>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Btn variant="outline" onClick={requestCloseForm} disabled={isPending}>Cancel</Btn>
            <Btn onClick={save} disabled={isPending}>{isPending ? 'Saving...' : 'Save Checklist'}</Btn>
          </div>
        </div>
        )}
      </Modal>

      <Modal title="View Checklist" open={viewOpen} onClose={() => { setViewOpen(false); setViewRow(null); setDetailError('') }} width="max-w-4xl">
        {detailLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-6">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading checklist details...</span>
          </div>
        ) : detailError ? (
          <div className="space-y-4 py-2">
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{detailError}</div>
            <div className="flex justify-end">
              <Btn variant="outline" onClick={() => { setViewOpen(false); setViewRow(null); setDetailError('') }}>Close</Btn>
            </div>
          </div>
        ) : viewRow ? (
          <div className="space-y-5">
            {(() => {
              const documents = viewRow.checklistDocDetails
              const applicable = documents.filter(document => document.applicable === 'Yes').length
              const received = documents.filter(document => document.applicable === 'Yes' && document.received === 'Yes').length
              return <>
                <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-[#1B2A6B]">Vehicle checklist</div>
                      <div className="mt-1 font-mono text-xl font-bold text-gray-900">{viewRow.registrationNo ?? 'Registration not added'}</div>
                      <div className="mt-1 text-sm text-gray-600">{[clean(viewRow.make), clean(viewRow.model), clean(viewRow.variant), viewRow.year].filter(Boolean).join(' · ') || 'Vehicle details unavailable'}</div>
                    </div>
                    <Btn size="sm" variant="outline" onClick={() => { setViewOpen(false); openEdit(viewRow) }}><Pencil className="h-3.5 w-3.5" />Edit Checklist</Btn>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"><div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Documents</div><div className="mt-1 text-xl font-bold text-gray-900">{documents.length}</div></div>
                  <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3"><div className="text-xs font-semibold uppercase tracking-wide text-blue-700">Applicable</div><div className="mt-1 text-xl font-bold text-blue-800">{applicable}</div></div>
                  <div className="rounded-lg border border-green-100 bg-green-50 px-4 py-3"><div className="text-xs font-semibold uppercase tracking-wide text-green-700">Received</div><div className="mt-1 text-xl font-bold text-green-800">{received}<span className="ml-1 text-sm font-medium">/ {applicable}</span></div></div>
                </div>
              </>
            })()}

            <div className="text-sm font-semibold text-gray-800">Vehicle and customer</div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Registration No</div>
                <div className="mt-1 font-mono text-sm font-semibold text-gray-900">{viewRow.registrationNo ?? '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Vehicle</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{[clean(viewRow.make), clean(viewRow.model), clean(viewRow.variant)].filter(Boolean).join(' ') || '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Colour / Year</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{clean(viewRow.colour) || '—'}{viewRow.year ? ` / ${viewRow.year}` : ''}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Fuel Type</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{clean(viewRow.fuelType) || '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Customer</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{viewRow.customer?.custName ?? viewRow.customerNameLegacy ?? '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Customer Mobile</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{viewRow.customer?.custMobile ?? viewRow.customerMobileLegacy ?? '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 md:col-span-2 xl:col-span-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Customer Email</div>
                <div className="mt-1 text-sm font-medium text-gray-900 break-all">{viewRow.customer?.custEmail ?? viewRow.customerEmailLegacy ?? '—'}</div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-5 text-sm font-semibold text-gray-800">Record activity</div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Created</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{fmtDateTime(viewRow.createdDate)}</div>
                <div className="mt-1 text-xs text-gray-500">
                  By {viewRow.createdByUser?.displayName ?? viewRow.createdByUser?.userName ?? (viewRow.createdBy ? `User #${viewRow.createdBy}` : '—')}
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Last Updated</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{fmtDateTime(viewRow.updatedDate)}</div>
                <div className="mt-1 text-xs text-gray-500">
                  By {viewRow.updatedByUser?.displayName ?? viewRow.updatedByUser?.userName ?? (viewRow.updatedBy ? `User #${viewRow.updatedBy}` : '—')}
                </div>
              </div>
            </div>

            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div className="text-sm font-semibold text-gray-900">Document Checklist</div><div className="text-xs font-medium text-gray-500">Received documents are marked in green.</div></div>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Document</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Applicable</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Received</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Original / Copy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {viewRow.checklistDocDetails.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-400">No documents found.</td>
                      </tr>
                    ) : (
                      viewRow.checklistDocDetails.map(d => (
                        <tr key={d.checklistDetailsId}>
                          <td className="px-4 py-3 text-sm text-gray-800">{d.documentName ?? '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600"><span className={`rounded px-2 py-0.5 text-xs font-medium ${d.applicable === 'Yes' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{d.applicable ?? '—'}</span></td>
                          <td className="px-4 py-3 text-sm text-gray-600"><span className={`rounded px-2 py-0.5 text-xs font-medium ${d.received === 'Yes' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{d.received ?? '—'}</span></td>
                          <td className="px-4 py-3 text-sm text-gray-600">{d.originalCopy ?? '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Btn variant="outline" onClick={() => { setViewOpen(false); openEdit(viewRow) }}><Pencil className="h-4 w-4" />Edit Checklist</Btn>
              <Btn variant="outline" onClick={() => { setViewOpen(false); setViewRow(null); setDetailError('') }}>Close</Btn>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog open={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={del}
        message="Delete this checklist record? This cannot be undone."
        confirmLabel={isPending ? 'Deleting...' : 'Delete'}
        confirmDisabled={isPending}
        cancelDisabled={isPending}
        closeOnConfirm={false}
      />
      <ConfirmDialog
        open={deleteDocIndex !== null}
        onClose={() => setDeleteDocIndex(null)}
        onConfirm={() => { if (deleteDocIndex !== null) removeDoc(deleteDocIndex); setDeleteDocIndex(null) }}
        title="Remove document?"
        message="Remove this document from the checklist?"
        confirmLabel="Remove"
      />
      <ConfirmDialog
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        onConfirm={closeForm}
        title="Discard changes?"
        confirmLabel="Discard"
        message="You have unsaved changes in this checklist form. Discard them and close?"
      />
    </div>
  )
}
