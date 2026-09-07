'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, X, Car, Eye, Download, Loader2 } from 'lucide-react'
import { Badge, Btn, Input, Modal, Table, PageHeader, SearchBar, ConfirmDialog } from '@/components/ui'
import { FormDropdown } from '@/components/FormDropdown'
import { CustomerPicker } from '@/components/CustomerPicker'
import { createChecklist, updateChecklist, deleteChecklist, type ChecklistFormInput, type DocRow } from './actions'
import { isValidEmail, isValidPhone, isValidYear } from '@/lib/validation'

const LEGACY_DOCS = [
  'Original Registration Book / RC Card',
  'Original Tax Book for before 97 vehicle',
  'Dealers Invoice',
  'Insurance Certificate (State Comprehensive / Third Party)',
  'Municipal Tax Receipt (If applicable)',
  'TTO Set duly signed all places',
  'Authorised Signatory Letter on Company Letter Head (In case of Company Vehicle)',
  'NOC Finance Company (If Hypothecation Case)',
  'Owner Authority Letter to Middle Man for selling car',
  'Form No 35',
  'Spare Key',
  'PUC Certificate',
  'Service History',
  'Road Tax',
  'Hypothecation NOC',
] as const
const YES_NO = ['Yes', 'No'] as const
const APPLICABILITY_OPTIONS = ['Applicable', 'Not Applicable'] as const
const ORIGINAL_COPY = ['Original', 'Copy'] as const

interface CustomerOption { custId: number; custName: string; custMobile: string | null; custEmail: string | null }
interface UserOption { userId: number; userName: string | null; displayName: string | null }

interface Vehicle {
  inventoryId: number
  registrationNo: string | null
  sku: string | null
  colour: string | null
  year: number | null
  fuelType: string | null
  carVariantMaster: {
    variant: string | null
    carMakeMaster: { make: string | null } | null
    carModelMaster: { model: string | null } | null
  } | null
}

interface ChecklistListRow {
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
    docs: LEGACY_DOCS.map(name => ({ documentName: name, applicable: 'Not Applicable', received: 'No', originalCopy: 'Original' })),
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

function computeStatus(docs: { applicable: string | null; received: string | null }[]) {
  const applicable = docs.filter(d => d.applicable === 'Applicable')
  if (applicable.length === 0) return 'Partial'
  return applicable.every(d => d.received === 'Yes') ? 'Complete' : 'Partial'
}

function computeStatusFromCounts(applicableCount: number, receivedApplicableCount: number) {
  if (applicableCount === 0) return 'Partial'
  return applicableCount === receivedApplicableCount ? 'Complete' : 'Partial'
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

function buildChecklistExportFileName(rows: Array<{ documentId: number }>, search: string) {
  const today = new Date().toISOString().slice(0, 10)
  const parts = ['checklist']
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
  link.download = buildChecklistExportFileName(rows, search)
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
}: {
  initialData: ChecklistListRow[]
  vehicles: Vehicle[]
  total: number
  page: number
  pageCount: number
  pageSize: number
  initialSearch: string
}) {
  const router = useRouter()
  const [data, setData] = useState(initialData)
  const [search, setSearch] = useState(initialSearch)
  const [modal, setModal] = useState<null | 'add' | 'edit'>(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [viewRow, setViewRow] = useState<ChecklistDetailRow | null>(null)
  const [form, setForm] = useState<ChecklistFormInput>(emptyForm())
  const [savedFormSnapshot, setSavedFormSnapshot] = useState(JSON.stringify(emptyForm()))
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null)
  const [savedCustomerSnapshot, setSavedCustomerSnapshot] = useState('')
  const [vehicleQuery, setVehicleQuery] = useState('')
  const [vehicleOpen, setVehicleOpen] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [savedVehicleSnapshot, setSavedVehicleSnapshot] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
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
    setEditId(null)
    setError('')
    setModal('add')
  }

  const applyDetailToForm = (r: ChecklistDetailRow) => {
    const nextForm: ChecklistFormInput = {
      inventoryId: r.inventoryId,
      make: r.make ?? '', model: r.model ?? '', variant: r.variant ?? '', colour: r.colour ?? '',
      registrationNo: r.registrationNo ?? '', year: r.year, fuelType: r.fuelType ?? '',
      customerId: r.customerId,
      customerNameLegacy: r.customerNameLegacy ?? '', customerMobileLegacy: r.customerMobileLegacy ?? '', customerEmailLegacy: r.customerEmailLegacy ?? '',
      docs: r.checklistDocDetails.length
        ? r.checklistDocDetails.map(d => ({ documentName: d.documentName ?? '', applicable: d.applicable ?? 'Not Applicable', received: d.received ?? 'No', originalCopy: d.originalCopy ?? 'Original' }))
        : emptyForm().docs,
    }
    const nextCustomer = r.customer
    const nextVehicle = vehicles.find(v => v.inventoryId === r.inventoryId) ?? null
    setForm(nextForm)
    setSavedFormSnapshot(JSON.stringify(nextForm))
    setSelectedCustomer(nextCustomer)
    setSavedCustomerSnapshot(optionSnapshot(nextCustomer))
    setSelectedVehicle(nextVehicle)
    setSavedVehicleSnapshot(optionSnapshot(nextVehicle))
    setVehicleQuery('')
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

  const openEdit = (r: ChecklistListRow) => {
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
    setSelectedVehicle(v)
    setVehicleOpen(false)
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
    }))
  }

  const onRegistrationChange = (value: string) => {
    const exactMatch = vehicles.find(v => normalizeRegistration(v.registrationNo) === normalizeRegistration(value))

    if (exactMatch) {
      selectVehicle(exactMatch)
      return
    }

    setSelectedVehicle(null)
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
    }))
  }

  const onCustomerChange = (c: CustomerOption | null) => {
    setSelectedCustomer(c)
    setForm(f => ({
      ...f,
      customerId: c?.custId ?? null,
      customerNameLegacy: c?.custName ?? f.customerNameLegacy,
      customerMobileLegacy: c?.custMobile ?? f.customerMobileLegacy,
      customerEmailLegacy: c?.custEmail ?? f.customerEmailLegacy,
    }))
  }

  const updateDoc = (i: number, patch: Partial<DocRow>) => {
    setForm(f => ({ ...f, docs: f.docs.map((d, idx) => idx === i ? { ...d, ...patch } : d) }))
  }
  const addDoc = () => setForm(f => ({ ...f, docs: [...f.docs, { documentName: '', applicable: 'Not Applicable', received: 'No', originalCopy: 'Original' }] }))
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
    if (!form.customerId && !form.customerNameLegacy?.trim()) {
      newErrors.customer = true
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

  const exportRows = () => {
    setExportError('')
    startExportTransition(async () => {
      try {
        const params = new URLSearchParams()
        if (search.trim()) params.set('search', search.trim())
        const res = await fetch(`/api/checklist/export${params.toString() ? `?${params.toString()}` : ''}`)
        const payload = await res.json().catch(() => null)
        if (!res.ok || !Array.isArray(payload)) {
          throw new Error(payload?.error ?? 'Could not export checklist records.')
        }
        exportChecklistCsv(payload as ChecklistDetailRow[], search)
      } catch (err) {
        setExportError(err instanceof Error ? err.message : 'Could not export checklist records.')
      }
    })
  }

  const pushQuery = (params: Record<string, string>) => {
    const q = new URLSearchParams({
      search: initialSearch,
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
      if (search !== initialSearch) {
        pushQuery({ search, page: '1' })
      }
    }, 350)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSearch, search])

  return (
    <div>
      <PageHeader
        title="Checklist / Documents"
        subtitle={`${total} vehicle checklists`}
        action={
          <div className="flex items-center gap-2">
            <Btn variant="outline" size="sm" onClick={exportRows} disabled={isExporting || total === 0}>
              <Download className="w-3.5 h-3.5" />{isExporting ? 'Exporting...' : `${search.trim() ? 'Export Filtered' : 'Export All'} (${total})`}
            </Btn>
            <Btn size="sm" onClick={openAdd}><Plus className="w-3.5 h-3.5" />Add Checklist</Btn>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Reg no, customer..." disabled={isRoutePending} />
        <div className="text-xs text-gray-500">
          Page {page} of {pageCount} · {pageSize} per page
        </div>
      </div>
      {exportError && <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{exportError}</div>}

      <div className={isRoutePending ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
      <Table headers={['Reg No', 'Vehicle', 'Customer', 'Documents', 'Status', 'Actions']} empty={data.length === 0}>
        {data.map(r => {
          const status = computeStatusFromCounts(r.applicableCount, r.receivedApplicableCount)
          const received = r.receivedCount
          return (
            <tr key={r.documentId} className="hover:bg-gray-50 transition">
              <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-800 whitespace-nowrap">{r.registrationNo ?? '—'}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{[clean(r.make), clean(r.model), clean(r.variant)].filter(Boolean).join(' ') || '—'}</td>
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900">{r.customer?.custName ?? r.customerNameLegacy ?? '—'}</div>
                <div className="text-xs text-gray-500 font-mono">{r.customerMobileLegacy ?? ''}</div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">{received} / {r.documentCount} received</td>
              <td className="px-4 py-3"><Badge label={status} /></td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <button onClick={() => openView(r)} className="p-1.5 text-gray-400 hover:text-[#1B2A6B] hover:bg-blue-50 rounded transition" title="View"><Eye className="w-3.5 h-3.5" /></button>
                  <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-[#1B2A6B] hover:bg-blue-50 rounded transition" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setDeleteId(r.documentId)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </td>
            </tr>
          )
        })}
      </Table>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="text-sm text-gray-500">
          Showing {data.length === 0 ? 0 : (page - 1) * pageSize + 1}-{(page - 1) * pageSize + data.length} of {total}
        </div>
        <div className="flex items-center gap-2">
          <Btn
            variant="outline"
            size="sm"
            onClick={() => pushQuery({ search, page: String(page - 1) })}
            disabled={page <= 1 || isRoutePending}
          >
            Previous
          </Btn>
          <Btn
            variant="outline"
            size="sm"
            onClick={() => pushQuery({ search, page: String(page + 1) })}
            disabled={page >= pageCount || isRoutePending}
          >
            Next
          </Btn>
        </div>
      </div>

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
          <div>
            <Input
              label="Registration No *"
              placeholder="Start typing registration no..."
              value={form.registrationNo}
              list="checklist-registration-options"
              onChange={e => onRegistrationChange(e.target.value)}
              error={errors.registrationNo}
            />
            <datalist id="checklist-registration-options">
              {registrationMatches.map(v => (
                <option key={v.inventoryId} value={v.registrationNo ?? ''}>{vehicleLabel(v)}</option>
              ))}
            </datalist>
            <div className="mt-1 text-xs text-gray-500">
              {selectedVehicle
                ? `Linked vehicle: ${vehicleLabel(selectedVehicle)}`
                : form.registrationNo.trim()
                  ? 'Select an existing registration number to auto-fill vehicle details.'
                  : 'Search by registration number first, or use the vehicle picker below.'}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Vehicle *</label>
            {selectedVehicle ? (
              <div className="flex items-center justify-between border border-gray-200 rounded-md px-3 py-2 bg-gray-50">
                <div className="flex items-center gap-2 text-sm text-gray-800">
                  <Car className="w-4 h-4 text-gray-400" />{vehicleLabel(selectedVehicle)}
                </div>
                <button type="button" onClick={() => { setSelectedVehicle(null); setForm(f => ({ ...f, inventoryId: null })) }} className="text-gray-400 hover:text-red-600">
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
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Customer</label>
            <CustomerPicker value={selectedCustomer} onChange={onCustomerChange} error={errors.customer} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">Document Checklist</label>
              <Btn variant="outline" size="sm" onClick={addDoc}><Plus className="w-3.5 h-3.5" />Add Document</Btn>
            </div>
            <div className="space-y-2">
              {form.docs.map((d, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-end border border-gray-100 rounded-lg p-2.5">
                      <Input label={i === 0 ? 'Document' : undefined} list="doc-name-suggestions" value={d.documentName} onChange={e => updateDoc(i, { documentName: e.target.value })} />
                      <FormDropdown label={i === 0 ? 'Applicable / Not Applicable' : undefined} value={d.applicable} options={APPLICABILITY_OPTIONS.map(value => ({ value, label: value }))} placeholder="Select" onChange={value => updateDoc(i, { applicable: value })} />
                      <FormDropdown label={i === 0 ? 'Received' : undefined} value={d.received} options={YES_NO.map(value => ({ value, label: value }))} placeholder="Select" onChange={value => updateDoc(i, { received: value })} />
                      <FormDropdown label={i === 0 ? 'Original' : undefined} value={d.originalCopy} options={ORIGINAL_COPY.map(value => ({ value, label: value }))} placeholder="Select" onChange={value => updateDoc(i, { originalCopy: value })} />
                  <button type="button" onClick={() => removeDoc(i)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              <datalist id="doc-name-suggestions">
                {LEGACY_DOCS.map(d => <option key={d} value={d} />)}
              </datalist>
            </div>
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}

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
              <div className="mb-2 text-sm font-semibold text-gray-900">Document Checklist</div>
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
                          <td className="px-4 py-3 text-sm text-gray-600">{d.applicable ?? '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{d.received ?? '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{d.originalCopy ?? '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end">
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
