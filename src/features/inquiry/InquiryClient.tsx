'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Pencil, Trash2, Phone, ChevronLeft, ChevronRight, Mail, Download, Loader2, Eye } from 'lucide-react'
import { Badge, Btn, Input, Select, Textarea, Modal, Table, PageHeader, SearchBar, ConfirmDialog } from '@/components/ui'
import { CustomerPicker } from '@/components/CustomerPicker'
import { INQUIRY_STATUSES, INQUIRY_CLASSIFICATIONS } from './queries'
import { createInquiry, updateInquiry, deleteInquiry, sendInquiryEmail, sendInquiryInventoryEmail, getInquiryDetail, type InquiryFormInput } from './actions'

const SUB_STATUS_SUGGESTIONS = ['Ringing', 'Not Intrested', 'Busy', 'Desired Car Not In Stock', 'Not connected', 'Already Bought Car', 'Visited', 'Fresh Lead', 'Sold Car']

interface CustomerOption { custId: number; custName: string; custMobile: string | null; custEmail: string | null }
interface CarMakeMaster { pkMakeId: number; make: string | null }
interface CarModelMaster { pkModelId: number; model: string | null }
interface CarVariantMaster { pkVariantId: number; variant: string | null }
interface UserOption { userId: number; userName: string | null; displayName: string | null }

interface InquiryRow {
  inquiryId: number
  inquiryNo: string | null
  dateOfInquiry: Date | string | null
  website: string | null
  customerId: number | null
  customerNameLegacy: string | null
  mobileno: string | null
  email: string | null
  budgetOfCustomer: string | null
  visitedDateOfCustomer: Date | string | null
  classification: string | null
  status: string | null
  subStatus: string | null
  followUpDate: Date | string | null
  remark: string | null
  createdDt?: Date | string | null
  updatedDt?: Date | string | null
  createdByUser?: UserOption | null
  updatedByUser?: UserOption | null
  customer: CustomerOption | null
  inquiryCarDetails: {
    fkVariantId: number | null
    makeLegacy?: string | null
    modelLegacy?: string | null
    variantLegacy?: string | null
    subVariant?: string | null
    year: number | null
    carVariantMaster: {
      variant: string | null
      carMakeMaster: { pkMakeId: number; make: string | null } | null
      carModelMaster: { pkModelId: number; model: string | null } | null
    } | null
  }[]
}

interface PreviousInquiryMatch {
  inquiryId: number
  inquiryNo: string | null
  dateOfInquiry: Date | string | null
  customerNameLegacy: string | null
  mobileno: string | null
  classification: string | null
  status: string | null
  followUpDate: Date | string | null
  customer: CustomerOption | null
  inquiryCarDetails: InquiryRow['inquiryCarDetails']
}

interface InventoryMatch {
  inventoryId: number
  inventoryNumber: string | null
  registrationNo: string | null
  year: number | null
  kmsDriven: string | null
  price: string | null
  status: string | null
  customer: CustomerOption | null
  _count: { inventoryPhotos: number }
  carVariantMaster: {
    variant: string | null
    carMakeMaster: { pkMakeId: number; make: string | null } | null
    carModelMaster: { pkModelId: number; model: string | null } | null
  } | null
}

const fmtDate = (d: Date | string | null) => d ? new Date(d).toISOString().slice(0, 10) : ''
const fmtDateTime = (d: Date | string | null | undefined) => {
  if (!d) return ''
  const value = new Date(d)
  if (Number.isNaN(value.getTime())) return ''
  return value.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
const fmtMoney = (n: string | number | null) => n ? `₹${Number(n).toLocaleString('en-IN')}` : '—'
// some legacy catalog rows carry placeholder text ("null", "na") instead of a real SQL NULL
const JUNK_VALUES = new Set(['null', 'na', 'n/a'])
const clean = (v: string | null | undefined) => (!v || JUNK_VALUES.has(v.trim().toLowerCase()) ? '' : v)

function inquiryVehicleLabel(car: InquiryRow['inquiryCarDetails'][0] | undefined | null) {
  if (!car) return '—'
  const parts = [
    clean(car.carVariantMaster?.carMakeMaster?.make) || clean(car.makeLegacy),
    clean(car.carVariantMaster?.carModelMaster?.model) || clean(car.modelLegacy),
    clean(car.carVariantMaster?.variant) || clean(car.variantLegacy),
    clean(car.subVariant),
  ].filter(Boolean)

  if (parts.length === 0 && !car.year) return '—'
  return `${parts.join(' ')}${car.year ? ` · ${car.year}` : ''}`.trim()
}

function validateInquiryWorkflow(input: InquiryFormInput) {
  const status = input.status.trim()
  const subStatus = input.subStatus.trim().toLowerCase()
  const inquiryDate = input.dateOfInquiry.trim()
  const followUpDate = input.followUpDate.trim()
  const visitedDate = input.visitedDateOfCustomer.trim()

  if (status === 'FollowUp' && !followUpDate) {
    return 'Follow-up date is required when status is FollowUp.'
  }

  if (subStatus === 'visited' && !visitedDate) {
    return 'Visited date is required when sub-status is Visited.'
  }

  if (inquiryDate && followUpDate && followUpDate < inquiryDate) {
    return 'Follow-up date cannot be before inquiry date.'
  }

  if (inquiryDate && visitedDate && visitedDate < inquiryDate) {
    return 'Visited date cannot be before inquiry date.'
  }

  return ''
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

function buildInquiryExportFileName(rows: InquiryRow[], search: string, status: string, classification: string) {
  const today = new Date().toISOString().slice(0, 10)
  const parts = ['inquiry']
  if (status && status !== 'All') parts.push(slugify(status))
  if (classification && classification !== 'All') parts.push(slugify(classification))
  if (search.trim()) parts.push('search')
  if (parts.length === 1) parts.push(`${rows.length}-rows`)
  parts.push(today)
  return `${parts.join('-')}.csv`
}

function exportInquiryCsv(rows: InquiryRow[], search: string, status: string, classification: string) {
  const headers = [
    'Inquiry ID',
    'Inquiry No',
    'Inquiry Date',
    'Source',
    'Linked Customer ID',
    'Customer Name',
    'Mobile',
    'Email',
    'Make',
    'Model',
    'Variant',
    'Sub Variant',
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
    const make = clean(car?.carVariantMaster?.carMakeMaster?.make) || clean(car?.makeLegacy)
    const model = clean(car?.carVariantMaster?.carModelMaster?.model) || clean(car?.modelLegacy)
    const variant = clean(car?.carVariantMaster?.variant) || clean(car?.variantLegacy)
    const line = [
      row.inquiryId,
      row.inquiryNo,
      fmtDate(row.dateOfInquiry),
      row.website,
      row.customer?.custId ?? row.customerId,
      row.customer?.custName ?? row.customerNameLegacy,
      row.mobileno,
      row.email,
      make,
      model,
      variant,
      clean(car?.subVariant),
      car?.year ?? null,
      row.budgetOfCustomer,
      row.classification,
      row.status,
      row.subStatus,
      fmtDate(row.followUpDate),
      fmtDate(row.visitedDateOfCustomer),
      row.remark,
    ]
    lines.push(line.map(csvValue).join(','))
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = buildInquiryExportFileName(rows, search, status, classification)
  link.click()
  URL.revokeObjectURL(url)
}

function emptyForm(): InquiryFormInput {
  return {
    inquiryNo: '', dateOfInquiry: new Date().toISOString().slice(0, 10), website: '',
    customerId: null, customerNameLegacy: '', mobileno: '', email: '',
    budgetOfCustomer: null, visitedDateOfCustomer: '',
    classification: 'Warm', status: 'FollowUp', subStatus: '',
    followUpDate: '', remark: '', fkVariantId: null, subVariant: '', carYear: null,
  }
}

export function InquiryClient({
  initialData, makes, sourceSuggestions, total, page, pageCount, search, status, classification, source, subStatus, followUpDate, visitedDate, makeId, modelId, variantId, autoOpenViewId, autoOpenEditId,
}: {
  initialData: InquiryRow[]
  makes: CarMakeMaster[]
  sourceSuggestions: string[]
  total: number
  page: number
  pageCount: number
  search: string
  status: string
  classification: string
  source: string
  subStatus: string
  followUpDate: string
  visitedDate: string
  makeId: string
  modelId: string
  variantId: string
  autoOpenViewId: number | null
  autoOpenEditId: number | null
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchInput, setSearchInput] = useState(search)
  const [modal, setModal] = useState<null | 'add' | 'edit'>(null)
  const [form, setForm] = useState<InquiryFormInput>(emptyForm())
  const [savedFormSnapshot, setSavedFormSnapshot] = useState<string>(JSON.stringify(emptyForm()))
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null)
  const [savedCustomerSnapshot, setSavedCustomerSnapshot] = useState<string>('null')
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [error, setError] = useState('')
  const [isRoutePending, startRouteTransition] = useTransition()
  const [isPending, startTransition] = useTransition()

  const [emailingId, setEmailingId] = useState<number | null>(null)
  const [emailFeedback, setEmailFeedback] = useState<{ ok: boolean; message: string } | null>(null)
  const [isEmailPending, startEmailTransition] = useTransition()
  const [viewInquiryId, setViewInquiryId] = useState<number | null>(null)
  const [viewInquiry, setViewInquiry] = useState<InquiryRow | null>(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [viewError, setViewError] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [emailInquiryRow, setEmailInquiryRow] = useState<InquiryRow | null>(null)
  const [emailInventoryMatches, setEmailInventoryMatches] = useState<InventoryMatch[]>([])
  const [emailInventoryLoading, setEmailInventoryLoading] = useState(false)
  const [selectedEmailInventoryId, setSelectedEmailInventoryId] = useState<number | null>(null)
  const [emailModalError, setEmailModalError] = useState('')
  const emailInventoryRequestRef = useRef(0)

  const loadInventoryMatchesForInquiry = async (row: InquiryRow) => {
    const car = row.inquiryCarDetails[0]
    const variantId = car?.fkVariantId
    const makeId = car?.carVariantMaster?.carMakeMaster?.pkMakeId
    const modelId = car?.carVariantMaster?.carModelMaster?.pkModelId
    const year = car?.year

    if (!variantId && !modelId && !makeId) {
      return []
    }

    const params = new URLSearchParams()
    if (makeId) params.set('makeId', String(makeId))
    if (modelId) params.set('modelId', String(modelId))
    if (variantId) params.set('variantId', String(variantId))
    if (year) params.set('year', String(year))

    const res = await fetch(`/api/inquiry/inventory-match?${params.toString()}`)
    const payload = await res.json().catch(() => null)
    if (!res.ok || !Array.isArray(payload)) {
      throw new Error(payload?.error ?? 'Could not load matching inventory.')
    }
    return payload as InventoryMatch[]
  }

  const openEmailModal = (row: InquiryRow) => {
    const requestId = ++emailInventoryRequestRef.current
    setEmailFeedback(null)
    setEmailModalError('')
    setSelectedEmailInventoryId(null)
    setEmailInventoryMatches([])
    setEmailInquiryRow(row)
    setEmailInventoryLoading(true)

    loadInventoryMatchesForInquiry(row)
      .then(matches => {
        if (emailInventoryRequestRef.current !== requestId) return
        setEmailInventoryMatches(matches)
        setSelectedEmailInventoryId(matches[0]?.inventoryId ?? null)
      })
      .catch(err => {
        if (emailInventoryRequestRef.current !== requestId) return
        setEmailModalError(err instanceof Error ? err.message : 'Could not load matching inventory.')
      })
      .finally(() => {
        if (emailInventoryRequestRef.current === requestId) setEmailInventoryLoading(false)
      })
  }

  const handleSendInventoryEmail = () => {
    if (!emailInquiryRow || !selectedEmailInventoryId) return
    setEmailingId(emailInquiryRow.inquiryId)
    setEmailFeedback(null)
    setEmailModalError('')
    startEmailTransition(async () => {
      const result = await sendInquiryInventoryEmail(emailInquiryRow.inquiryId, selectedEmailInventoryId)
      setEmailFeedback(result.success
        ? { ok: true, message: 'Email sent successfully.' }
        : { ok: false, message: result.error ?? 'Something went wrong sending this email.' })
      if (result.success) {
        setEmailInquiryRow(null)
      } else {
        setEmailModalError(result.error ?? 'Something went wrong sending this email.')
      }
      setEmailingId(null)
    })
  }

  const handleSendEmail = (row: InquiryRow) => {
    openEmailModal(row)
  }

  const openView = (row: { inquiryId: number }) => {
    const requestId = ++viewRequestRef.current
    setViewInquiryId(row.inquiryId)
    setViewInquiry(null)
    setViewError('')
    setViewLoading(true)

    getInquiryDetail(row.inquiryId)
      .then(detail => {
        if (viewRequestRef.current !== requestId) return
        if (!detail) {
          setViewError('Inquiry not found.')
          return
        }
        setViewInquiry(detail as InquiryRow)
      })
      .catch(() => {
        if (viewRequestRef.current !== requestId) return
        setViewError('Could not load inquiry details.')
      })
      .finally(() => {
        if (viewRequestRef.current === requestId) setViewLoading(false)
      })
  }

  const closeView = () => {
    setViewInquiryId(null)
    setViewInquiry(null)
    setViewError('')
    setViewLoading(false)
    if (searchParams.has('view')) {
      const next = new URLSearchParams(searchParams.toString())
      next.delete('view')
      router.replace(`/inquiry${next.toString() ? `?${next.toString()}` : ''}`)
    }
  }

  const [selectedMakeId, setSelectedMakeId] = useState<number | null>(null)
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null)
  const [models, setModels] = useState<CarModelMaster[]>([])
  const [variants, setVariants] = useState<CarVariantMaster[]>([])
  const [filterModels, setFilterModels] = useState<CarModelMaster[]>([])
  const [filterVariants, setFilterVariants] = useState<CarVariantMaster[]>([])
  const [previousInquiries, setPreviousInquiries] = useState<PreviousInquiryMatch[]>([])
  const [previousInquiryLoading, setPreviousInquiryLoading] = useState(false)
  const [previousInquiryError, setPreviousInquiryError] = useState('')
  const [inventoryMatches, setInventoryMatches] = useState<InventoryMatch[]>([])
  const [inventoryMatchLoading, setInventoryMatchLoading] = useState(false)
  const [inventoryMatchError, setInventoryMatchError] = useState('')
  const [exportError, setExportError] = useState('')
  const [isExporting, startExportTransition] = useTransition()
  const isFollowUpStatus = form.status.trim() === 'FollowUp'
  const isVisitedSubStatus = form.subStatus.trim().toLowerCase() === 'visited'
  const activeFilterCount = [
    search.trim() ? 1 : 0,
    status !== 'All' ? 1 : 0,
    classification !== 'All' ? 1 : 0,
    source !== 'All' ? 1 : 0,
    subStatus !== 'All' ? 1 : 0,
    followUpDate ? 1 : 0,
    visitedDate ? 1 : 0,
    makeId ? 1 : 0,
    modelId ? 1 : 0,
    variantId ? 1 : 0,
  ].reduce((sum, value) => sum + value, 0)
  const hasActiveFilters = activeFilterCount > 0
  const rowNumberStart = (page - 1) * 25
  const pageStart = total === 0 ? 0 : rowNumberStart + 1
  const pageEnd = Math.min(rowNumberStart + initialData.length, total)
  const emptyInquiryMessage = hasActiveFilters
    ? 'No inquiries match the current filters.'
    : 'No inquiries found yet.'

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const viewRequestRef = useRef(0)
  const editRequestRef = useRef(0)
  const previousInquiryDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previousInquiryRequestRef = useRef(0)
  const inventoryMatchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inventoryMatchRequestRef = useRef(0)

  const pushQuery = (params: Record<string, string>) => {
    const q = new URLSearchParams({ search, status, classification, source, subStatus, followUpDate, visitedDate, makeId, modelId, variantId, page: '1', ...params })
    for (const [k, v] of [...q.entries()]) {
      if (!v || v === 'All') q.delete(k)
    }
    startRouteTransition(() => {
      router.push(`/inquiry${q.toString() ? `?${q.toString()}` : ''}`)
    })
  }

  const clearInquiryEditQuery = () => {
    if (!searchParams.has('edit')) return
    const next = new URLSearchParams(searchParams.toString())
    next.delete('edit')
    router.replace(`/inquiry${next.toString() ? `?${next.toString()}` : ''}`)
  }

  useEffect(() => {
    if (autoOpenEditId && !modal && !editLoading) {
      openEdit({ inquiryId: autoOpenEditId } as InquiryRow)
      return
    }
    if (autoOpenViewId && !modal && viewInquiryId === null && !viewLoading) {
      openView({ inquiryId: autoOpenViewId } as InquiryRow)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenEditId, autoOpenViewId, modal, editLoading, viewInquiryId, viewLoading])

  useEffect(() => {
    let cancelled = false

    const loadFilterCatalog = async () => {
      if (!makeId) {
        setFilterModels([])
        setFilterVariants([])
        return
      }

      try {
        const modelsRes = await fetch(`/api/catalog/models?makeId=${makeId}`)
        const modelPayload = await modelsRes.json().catch(() => [])
        if (cancelled) return
        setFilterModels(Array.isArray(modelPayload) ? modelPayload : [])

        if (!modelId) {
          setFilterVariants([])
          return
        }

        const variantsRes = await fetch(`/api/catalog/variants?modelId=${modelId}`)
        const variantPayload = await variantsRes.json().catch(() => [])
        if (cancelled) return
        setFilterVariants(Array.isArray(variantPayload) ? variantPayload : [])
      } catch {
        if (cancelled) return
        setFilterModels([])
        setFilterVariants([])
      }
    }

    loadFilterCatalog()
    return () => { cancelled = true }
  }, [makeId, modelId])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (searchInput === search) return
    debounceRef.current = setTimeout(() => pushQuery({ search: searchInput }), 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  useEffect(() => {
    if (modal && isVisitedSubStatus && !form.visitedDateOfCustomer) {
      f('visitedDateOfCustomer', new Date().toISOString().slice(0, 10))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisitedSubStatus, modal])

  useEffect(() => {
    if (!modal) {
      setPreviousInquiries([])
      setPreviousInquiryError('')
      setPreviousInquiryLoading(false)
      return
    }

    const mobile = form.mobileno.trim()
    if (previousInquiryDebounceRef.current) clearTimeout(previousInquiryDebounceRef.current)

    if (!mobile) {
      setPreviousInquiries([])
      setPreviousInquiryError('')
      setPreviousInquiryLoading(false)
      return
    }

    previousInquiryDebounceRef.current = setTimeout(async () => {
      const requestId = ++previousInquiryRequestRef.current
      setPreviousInquiryLoading(true)
      setPreviousInquiryError('')
      try {
        const params = new URLSearchParams({ mobile })
        if (editId) params.set('excludeInquiryId', String(editId))
        const res = await fetch(`/api/inquiry/previous?${params.toString()}`)
        const payload = await res.json()
        if (previousInquiryRequestRef.current !== requestId) return
        if (!res.ok) {
          setPreviousInquiries([])
          setPreviousInquiryError(payload.error ?? 'Could not check previous inquiries.')
          return
        }
        setPreviousInquiries(Array.isArray(payload) ? payload : [])
      } catch {
        if (previousInquiryRequestRef.current !== requestId) return
        setPreviousInquiries([])
        setPreviousInquiryError('Could not check previous inquiries.')
      } finally {
        if (previousInquiryRequestRef.current === requestId) setPreviousInquiryLoading(false)
      }
    }, 300)

    return () => {
      if (previousInquiryDebounceRef.current) clearTimeout(previousInquiryDebounceRef.current)
    }
  }, [editId, form.mobileno, modal])

  useEffect(() => {
    if (!modal) {
      setInventoryMatches([])
      setInventoryMatchError('')
      setInventoryMatchLoading(false)
      return
    }

    if (inventoryMatchDebounceRef.current) clearTimeout(inventoryMatchDebounceRef.current)

    if (!selectedMakeId && !selectedModelId && !form.fkVariantId) {
      setInventoryMatches([])
      setInventoryMatchError('')
      setInventoryMatchLoading(false)
      return
    }

    inventoryMatchDebounceRef.current = setTimeout(async () => {
      const requestId = ++inventoryMatchRequestRef.current
      setInventoryMatchLoading(true)
      setInventoryMatchError('')
      try {
        const params = new URLSearchParams()
        if (selectedMakeId) params.set('makeId', String(selectedMakeId))
        if (selectedModelId) params.set('modelId', String(selectedModelId))
        if (form.fkVariantId) params.set('variantId', String(form.fkVariantId))
        if (form.carYear) params.set('year', String(form.carYear))
        const res = await fetch(`/api/inquiry/inventory-match?${params.toString()}`)
        const payload = await res.json()
        if (inventoryMatchRequestRef.current !== requestId) return
        if (!res.ok) {
          setInventoryMatches([])
          setInventoryMatchError(payload.error ?? 'Could not load matching inventory.')
          return
        }
        setInventoryMatches(Array.isArray(payload) ? payload : [])
      } catch {
        if (inventoryMatchRequestRef.current !== requestId) return
        setInventoryMatches([])
        setInventoryMatchError('Could not load matching inventory.')
      } finally {
        if (inventoryMatchRequestRef.current === requestId) setInventoryMatchLoading(false)
      }
    }, 250)

    return () => {
      if (inventoryMatchDebounceRef.current) clearTimeout(inventoryMatchDebounceRef.current)
    }
  }, [form.carYear, form.fkVariantId, modal, selectedMakeId, selectedModelId])

  const resetCascade = () => { setSelectedMakeId(null); setSelectedModelId(null); setModels([]); setVariants([]) }

  const customerSnapshot = (customer: CustomerOption | null) => JSON.stringify(customer ? {
    custId: customer.custId,
    custName: customer.custName ?? '',
    custMobile: customer.custMobile ?? '',
    custEmail: customer.custEmail ?? '',
  } : null)

  const hasUnsavedInquiryChanges = () =>
    JSON.stringify(form) !== savedFormSnapshot || customerSnapshot(selectedCustomer) !== savedCustomerSnapshot

  const forceCloseInquiryModal = () => {
    setModal(null)
    setDiscardOpen(false)
    setError('')
    clearInquiryEditQuery()
  }

  const requestCloseInquiryModal = () => {
    if (isPending) return
    if (!modal) return
    if (!hasUnsavedInquiryChanges()) {
      forceCloseInquiryModal()
      return
    }
    setDiscardOpen(true)
  }

  const openAdd = () => {
    const nextForm = emptyForm()
    setForm(nextForm)
    setSavedFormSnapshot(JSON.stringify(nextForm))
    setSelectedCustomer(null)
    setSavedCustomerSnapshot('null')
    setEditId(null)
    setPreviousInquiries([])
    setPreviousInquiryError('')
    setInventoryMatches([])
    setInventoryMatchError('')
    resetCascade()
    setDiscardOpen(false)
    setError('')
    setModal('add')
  }

  const openEdit = async (r: { inquiryId: number }) => {
    const requestId = ++editRequestRef.current
    setModal('edit')
    setEditLoading(true)
    setEditId(r.inquiryId)
    setPreviousInquiries([])
    setPreviousInquiryError('')
    setInventoryMatches([])
    setInventoryMatchError('')
    setDiscardOpen(false)
    setError('')
    resetCascade()

    try {
      const detail = await getInquiryDetail(r.inquiryId)
      if (editRequestRef.current !== requestId) return
      if (!detail) {
        setError('Inquiry not found.')
        forceCloseInquiryModal()
        return
      }

      const car = detail.inquiryCarDetails[0]
      const nextForm = {
        inquiryNo: detail.inquiryNo ?? '',
        dateOfInquiry: fmtDate(detail.dateOfInquiry),
        website: detail.website ?? '',
        customerId: detail.customerId,
        customerNameLegacy: detail.customerNameLegacy ?? '',
        mobileno: detail.mobileno ?? '',
        email: detail.email ?? '',
        budgetOfCustomer: detail.budgetOfCustomer ? Number(detail.budgetOfCustomer) : null,
        visitedDateOfCustomer: fmtDate(detail.visitedDateOfCustomer),
        classification: detail.classification ?? 'Warm',
        status: detail.status ?? 'FollowUp',
        subStatus: detail.subStatus ?? '',
        followUpDate: fmtDate(detail.followUpDate),
        remark: detail.remark ?? '',
        fkVariantId: car?.fkVariantId ?? null,
        subVariant: car?.subVariant ?? '',
        carYear: car?.year ?? null,
      }
      setForm(nextForm)
      setSavedFormSnapshot(JSON.stringify(nextForm))
      setSelectedCustomer(detail.customer)
      setSavedCustomerSnapshot(customerSnapshot(detail.customer))

      const makeId = car?.carVariantMaster?.carMakeMaster?.pkMakeId ?? null
      const modelId = car?.carVariantMaster?.carModelMaster?.pkModelId ?? null
      setSelectedMakeId(makeId)
      setSelectedModelId(modelId)
      setModels([])
      setVariants([])
      if (makeId) {
        const res = await fetch(`/api/catalog/models?makeId=${makeId}`)
        if (editRequestRef.current !== requestId) return
        setModels(await res.json())
      }
      if (modelId) {
        const res = await fetch(`/api/catalog/variants?modelId=${modelId}`)
        if (editRequestRef.current !== requestId) return
        setVariants(await res.json())
      }
    } catch {
      if (editRequestRef.current !== requestId) return
      setError('Could not load inquiry details.')
      forceCloseInquiryModal()
    } finally {
      if (editRequestRef.current === requestId) setEditLoading(false)
    }
  }

  const onMakeChange = async (makeId: number) => {
    setSelectedMakeId(makeId || null)
    setSelectedModelId(null)
    setVariants([])
    setForm(f => ({ ...f, fkVariantId: null }))
    if (!makeId) { setModels([]); return }
    const res = await fetch(`/api/catalog/models?makeId=${makeId}`)
    setModels(await res.json())
  }

  const onModelChange = async (modelId: number) => {
    setSelectedModelId(modelId || null)
    setForm(f => ({ ...f, fkVariantId: null }))
    if (!modelId) { setVariants([]); return }
    const res = await fetch(`/api/catalog/variants?modelId=${modelId}`)
    setVariants(await res.json())
  }

  const onCustomerChange = (c: CustomerOption | null) => {
    setSelectedCustomer(c)
    setForm(f => ({
      ...f,
      customerId: c?.custId ?? null,
      customerNameLegacy: c?.custName ?? f.customerNameLegacy,
      mobileno: c?.custMobile ?? f.mobileno,
      email: c?.custEmail ?? f.email,
    }))
  }

  const f = <K extends keyof InquiryFormInput>(k: K, v: InquiryFormInput[K]) => setForm(prev => ({ ...prev, [k]: v }))

  const save = () => {
    setError('')
    const workflowError = validateInquiryWorkflow(form)
    if (workflowError) {
      setError(workflowError)
      return
    }
    startTransition(async () => {
      const result = editId ? await updateInquiry(editId, form) : await createInquiry(form)
      if (!result.success) {
        setError(result.error ?? 'Something went wrong.')
        return
      }
      setSavedFormSnapshot(JSON.stringify(form))
      setSavedCustomerSnapshot(customerSnapshot(selectedCustomer))
      forceCloseInquiryModal()
      router.refresh()
    })
  }

  const del = () => {
    if (!deleteId) return
    startTransition(async () => {
      const result = await deleteInquiry(deleteId)
      if (!result.success) setError(result.error ?? 'Could not delete this record.')
      setDeleteId(null)
      router.refresh()
    })
  }

  const exportAllMatchingInquiries = () => {
    setExportError('')
    startExportTransition(async () => {
      try {
        const params = new URLSearchParams()
        if (search.trim()) params.set('search', search)
        if (status !== 'All') params.set('status', status)
        if (classification !== 'All') params.set('classification', classification)
        if (source !== 'All') params.set('source', source)
        if (subStatus !== 'All') params.set('subStatus', subStatus)
        if (followUpDate) params.set('followUpDate', followUpDate)
        if (visitedDate) params.set('visitedDate', visitedDate)
        if (makeId) params.set('makeId', makeId)
        if (modelId) params.set('modelId', modelId)
        if (variantId) params.set('variantId', variantId)
        const res = await fetch(`/api/inquiry/export${params.toString() ? `?${params.toString()}` : ''}`)
        const payload = await res.json().catch(() => null)
        if (!res.ok || !Array.isArray(payload)) {
          throw new Error(payload?.error ?? 'Could not export inquiries.')
        }
        exportInquiryCsv(payload as InquiryRow[], search, status, classification)
      } catch (err) {
        setExportError(err instanceof Error ? err.message : 'Could not export inquiries.')
      }
    })
  }

  const resetFilters = () => {
    setSearchInput('')
    pushQuery({ search: '', status: 'All', classification: 'All', source: 'All', subStatus: 'All', followUpDate: '', visitedDate: '', makeId: '', modelId: '', variantId: '', page: '1' })
  }

  return (
    <div>
      <PageHeader
        title="Inquiry Management"
        subtitle={`${total.toLocaleString('en-IN')} inquiries`}
        action={
          <div className="flex items-center gap-2">
            <Btn variant="outline" size="sm" onClick={exportAllMatchingInquiries} disabled={isExporting || total === 0}>
              <Download className="w-3.5 h-3.5" />{isExporting ? 'Exporting...' : `${search.trim() || status !== 'All' || classification !== 'All' || source !== 'All' || subStatus !== 'All' || !!followUpDate || !!visitedDate || !!makeId || !!modelId || !!variantId ? 'Export Filtered' : 'Export All'} (${total})`}
            </Btn>
            <Btn size="sm" onClick={openAdd}><Plus className="w-3.5 h-3.5" />New Inquiry</Btn>
          </div>
        }
      />

      {exportError ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{exportError}</div>
      ) : null}

      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">Filters</div>
            <div className="text-xs text-gray-500">Use any combination below. Export will follow the same filters.</div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Search</label>
            <SearchBar value={searchInput} onChange={setSearchInput} placeholder="Name, mobile, email, inquiry no..." disabled={isRoutePending} />
          </div>
          <Select label="Source" value={source} onChange={e => pushQuery({ source: e.target.value })} disabled={isRoutePending}>
          <option value="All">All Sources</option>
          {sourceSuggestions.map(item => <option key={item} value={item}>{item}</option>)}
          </Select>
          <Select label="Sub-status" value={subStatus} onChange={e => pushQuery({ subStatus: e.target.value })} disabled={isRoutePending}>
          <option value="All">All Sub-statuses</option>
          {SUB_STATUS_SUGGESTIONS.map(item => <option key={item} value={item}>{item}</option>)}
          </Select>
          <Select label="Make" value={makeId} onChange={e => pushQuery({ makeId: e.target.value, modelId: '', variantId: '' })} disabled={isRoutePending}>
          <option value="">All Makes</option>
          {makes.map(item => <option key={item.pkMakeId} value={String(item.pkMakeId)}>{item.make ?? '—'}</option>)}
          </Select>
          <Select label="Model" value={modelId} onChange={e => pushQuery({ modelId: e.target.value, variantId: '' })} disabled={isRoutePending || !makeId}>
          <option value="">All Models</option>
          {filterModels.map(item => <option key={item.pkModelId} value={String(item.pkModelId)}>{item.model ?? '—'}</option>)}
          </Select>
          <Select label="Variant" value={variantId} onChange={e => pushQuery({ variantId: e.target.value })} disabled={isRoutePending || !modelId}>
          <option value="">All Variants</option>
          {filterVariants.map(item => <option key={item.pkVariantId} value={String(item.pkVariantId)}>{item.variant ?? '—'}</option>)}
          </Select>
          <Input label="Follow-up Date" type="date" value={followUpDate} onChange={e => pushQuery({ followUpDate: e.target.value })} disabled={isRoutePending} />
          <Input label="Visited Date" type="date" value={visitedDate} onChange={e => pushQuery({ visitedDate: e.target.value })} disabled={isRoutePending} />
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-xs font-medium text-gray-600">Classification</label>
            <div className="flex flex-wrap gap-1.5">
              {['All', ...INQUIRY_CLASSIFICATIONS].map(c => (
                <button key={c} onClick={() => pushQuery({ classification: c })} disabled={isRoutePending}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-60 disabled:cursor-not-allowed ${classification === c || (classification === 'All' && c === 'All') ? 'text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  style={classification === c || (classification === 'All' && c === 'All') ? { backgroundColor: '#C8102E' } : {}}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-xs font-medium text-gray-600">Status</label>
            <div className="flex flex-wrap gap-1.5">
              {['All', ...INQUIRY_STATUSES].map(s => (
                <button key={s} onClick={() => pushQuery({ status: s })} disabled={isRoutePending}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-60 disabled:cursor-not-allowed ${status === s || (status === 'All' && s === 'All') ? 'text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  style={status === s || (status === 'All' && s === 'All') ? { backgroundColor: '#1B2A6B' } : {}}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          <Btn variant="outline" size="sm" onClick={resetFilters} disabled={isRoutePending || (!search.trim() && status === 'All' && classification === 'All' && source === 'All' && subStatus === 'All' && !followUpDate && !visitedDate && !makeId && !modelId && !variantId)}>
            Reset Filters
          </Btn>
        </div>
      </div>

      {emailFeedback && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm border ${emailFeedback.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {emailFeedback.message}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
        <div>
          <div className="text-sm font-medium text-gray-900">
            Showing {total.toLocaleString('en-IN')} matching {total === 1 ? 'inquiry' : 'inquiries'}
          </div>
          <div className="text-xs text-gray-500">
            {hasActiveFilters
              ? `${activeFilterCount} active filter${activeFilterCount === 1 ? '' : 's'} applied${pageCount > 1 ? ` · Page ${page} of ${pageCount}` : ''}`
              : `No filters applied${pageCount > 1 ? ` · Page ${page} of ${pageCount}` : ''}`}
          </div>
        </div>
        {hasActiveFilters ? (
          <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600 shadow-sm">
            Filtered view
          </div>
        ) : (
          <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600 shadow-sm">
            Full list
          </div>
        )}
      </div>

      <div className="mb-2 text-xs text-gray-500 sm:hidden">
        Scroll sideways to view all inquiry columns.
      </div>

      <div className="relative min-h-[280px]">
        <div
          aria-busy={isRoutePending}
          className={isRoutePending
            ? 'pointer-events-none select-none opacity-45 transition-opacity'
            : 'transition-opacity'}
        >
          <Table headers={['#', 'Date', 'Customer', 'Source', 'Contact', 'Car of Interest', 'Budget', 'Classification', 'Status', 'Sub-status', 'Follow-up', 'Visited', 'Remark', 'Actions']} empty={initialData.length === 0} emptyMessage={emptyInquiryMessage}>
            {initialData.map((r, index) => {
              const car = r.inquiryCarDetails[0]
              const name = r.customer?.custName ?? r.customerNameLegacy ?? '—'
              return (
                <tr key={r.inquiryId} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{rowNumberStart + index + 1}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{fmtDate(r.dateOfInquiry) || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{name}</div>
                    <div className="text-xs text-gray-500">{r.email ?? ''}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[140px] truncate" title={r.website ?? ''}>{r.website ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-sm text-gray-700 font-mono">
                      <Phone className="w-3 h-3 text-gray-400" />{r.mobileno ?? '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {inquiryVehicleLabel(car)}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-800">{fmtMoney(r.budgetOfCustomer)}</td>
                  <td className="px-4 py-3">{r.classification ? <Badge label={r.classification} /> : '—'}</td>
                  <td className="px-4 py-3">{r.status ? <Badge label={r.status} /> : '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[160px] truncate" title={r.subStatus ?? ''}>{r.subStatus ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{fmtDate(r.followUpDate) || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{fmtDate(r.visitedDateOfCustomer) || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[220px] truncate" title={r.remark ?? ''}>{r.remark?.trim() ? r.remark : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleSendEmail(r)} disabled={isEmailPending && emailingId === r.inquiryId}
                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition disabled:opacity-40" title="Send car details by email">
                        <Mail className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => openView(r)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition" title="View">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-[#1B2A6B] hover:bg-blue-50 rounded transition" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteId(r.inquiryId)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
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
            <div>Updating inquiry list...</div>
          </div>
        ) : null}
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-xs text-gray-500">
            Showing {pageStart.toLocaleString('en-IN')}-{pageEnd.toLocaleString('en-IN')} of {total.toLocaleString('en-IN')} · Page {page} of {pageCount}
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

      <Modal title={`View Inquiry${viewInquiry ? ` — ${viewInquiry.inquiryNo ?? `Inquiry #${viewInquiry.inquiryId}`}` : viewInquiryId ? ` — Inquiry #${viewInquiryId}` : ''}`} open={viewInquiryId !== null} onClose={closeView}>
        <div className="space-y-4">
          {viewLoading ? (
            <div className="flex min-h-32 flex-col items-center justify-center gap-3 text-sm text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <div>Loading inquiry details...</div>
            </div>
          ) : viewError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{viewError}</div>
          ) : viewInquiry ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Customer</div>
                  <div className="mt-3 space-y-2 text-sm text-gray-700">
                    <div><span className="font-medium text-gray-900">Linked Customer:</span> {viewInquiry.customer?.custName ?? '—'}</div>
                    <div><span className="font-medium text-gray-900">Linked Customer ID:</span> {viewInquiry.customer?.custId ?? viewInquiry.customerId ?? '—'}</div>
                    <div><span className="font-medium text-gray-900">Name:</span> {viewInquiry.customer?.custName ?? viewInquiry.customerNameLegacy ?? '—'}</div>
                    <div><span className="font-medium text-gray-900">Mobile:</span> {viewInquiry.customer?.custMobile ?? viewInquiry.mobileno ?? '—'}</div>
                    <div><span className="font-medium text-gray-900">Email:</span> {viewInquiry.customer?.custEmail ?? viewInquiry.email ?? '—'}</div>
                    <div><span className="font-medium text-gray-900">Source:</span> {viewInquiry.website ?? '—'}</div>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Inquiry</div>
                  <div className="mt-3 space-y-2 text-sm text-gray-700">
                    <div><span className="font-medium text-gray-900">Inquiry ID:</span> {viewInquiry.inquiryId}</div>
                    <div><span className="font-medium text-gray-900">Inquiry No:</span> {viewInquiry.inquiryNo ?? '—'}</div>
                    <div><span className="font-medium text-gray-900">Inquiry Date:</span> {fmtDate(viewInquiry.dateOfInquiry) || '—'}</div>
                    <div><span className="font-medium text-gray-900">Classification:</span> {viewInquiry.classification ?? '—'}</div>
                    <div><span className="font-medium text-gray-900">Status:</span> {viewInquiry.status ?? '—'}</div>
                    <div><span className="font-medium text-gray-900">Sub-status:</span> {viewInquiry.subStatus ?? '—'}</div>
                    <div><span className="font-medium text-gray-900">Budget:</span> {fmtMoney(viewInquiry.budgetOfCustomer)}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Car Requirement</div>
                <div className="mt-3 grid gap-2 text-sm text-gray-700 md:grid-cols-2">
                  {(() => {
                    const car = viewInquiry.inquiryCarDetails[0]
                    return (
                      <>
                        <div><span className="font-medium text-gray-900">Make:</span> {clean(car?.carVariantMaster?.carMakeMaster?.make) || clean(car?.makeLegacy) || '—'}</div>
                        <div><span className="font-medium text-gray-900">Model:</span> {clean(car?.carVariantMaster?.carModelMaster?.model) || clean(car?.modelLegacy) || '—'}</div>
                        <div><span className="font-medium text-gray-900">Variant:</span> {clean(car?.carVariantMaster?.variant) || clean(car?.variantLegacy) || '—'}</div>
                        <div><span className="font-medium text-gray-900">Sub Variant:</span> {clean(car?.subVariant) || '—'}</div>
                        <div><span className="font-medium text-gray-900">Year:</span> {car?.year ?? '—'}</div>
                      </>
                    )
                  })()}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Follow-up</div>
                <div className="mt-3 grid gap-2 text-sm text-gray-700 md:grid-cols-2">
                  <div><span className="font-medium text-gray-900">Follow-up Date:</span> {fmtDate(viewInquiry.followUpDate) || '—'}</div>
                  <div><span className="font-medium text-gray-900">Visited Date:</span> {fmtDate(viewInquiry.visitedDateOfCustomer) || '—'}</div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Remarks</div>
                <div className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{viewInquiry.remark?.trim() ? viewInquiry.remark : '—'}</div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Audit</div>
                <div className="mt-3 grid gap-2 text-sm text-gray-700 md:grid-cols-2">
                  <div><span className="font-medium text-gray-900">Created At:</span> {fmtDateTime(viewInquiry.createdDt) || '—'}</div>
                  <div><span className="font-medium text-gray-900">Created By:</span> {viewInquiry.createdByUser?.displayName ?? viewInquiry.createdByUser?.userName ?? '—'}</div>
                  <div><span className="font-medium text-gray-900">Updated At:</span> {fmtDateTime(viewInquiry.updatedDt) || '—'}</div>
                  <div><span className="font-medium text-gray-900">Updated By:</span> {viewInquiry.updatedByUser?.displayName ?? viewInquiry.updatedByUser?.userName ?? '—'}</div>
                </div>
              </div>

              <div className="flex justify-end">
                <Btn variant="outline" onClick={closeView}>Close</Btn>
              </div>
            </>
          ) : null}
        </div>
      </Modal>

      <Modal title={editId ? 'Edit Inquiry' : 'New Inquiry'} open={!!modal} onClose={requestCloseInquiryModal}>
        {editLoading ? (
          <div className="flex min-h-32 flex-col items-center justify-center gap-3 text-sm text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <div>Loading inquiry details...</div>
          </div>
        ) : (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Customer</label>
            <CustomerPicker value={selectedCustomer} onChange={onCustomerChange} />
          </div>

          {selectedCustomer ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              This inquiry is linked to a customer record. Name, mobile, and email below are locked to that customer so the inquiry does not drift from the master customer data.
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <Input label="Name" value={form.customerNameLegacy} onChange={e => f('customerNameLegacy', e.target.value)} disabled={!!selectedCustomer} />
            <Input label="Mobile" value={form.mobileno} onChange={e => f('mobileno', e.target.value)} disabled={!!selectedCustomer} />
            <Input label="Email" type="email" value={form.email} onChange={e => f('email', e.target.value)} disabled={!!selectedCustomer} />
            <Input label="Inquiry No" value={form.inquiryNo} onChange={e => f('inquiryNo', e.target.value)} />
            <Input label="Inquiry Date" type="date" value={form.dateOfInquiry} onChange={e => f('dateOfInquiry', e.target.value)} />
            <div>
              <Input label="Source" list="inquiry-source-suggestions" value={form.website} onChange={e => f('website', e.target.value)} placeholder="Type or pick a source" />
              <datalist id="inquiry-source-suggestions">
                {sourceSuggestions.map(source => <option key={source} value={source} />)}
              </datalist>
            </div>
            <div className="col-span-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              One inquiry tracks one vehicle requirement. If the customer starts considering a different vehicle, create a new inquiry for that vehicle interest.
            </div>
            <Select label="Make" value={selectedMakeId ?? ''} onChange={e => onMakeChange(Number(e.target.value))}>
              <option value="">Select Make</option>
              {makes.map(m => <option key={m.pkMakeId} value={m.pkMakeId}>{m.make}</option>)}
            </Select>
            <Select label="Model" value={selectedModelId ?? ''} onChange={e => onModelChange(Number(e.target.value))} disabled={!selectedMakeId}>
              <option value="">Select Model</option>
              {models.map(m => <option key={m.pkModelId} value={m.pkModelId}>{m.model}</option>)}
            </Select>
            <Select label="Variant" value={form.fkVariantId ?? ''} onChange={e => f('fkVariantId', Number(e.target.value) || null)} disabled={!selectedModelId}>
              <option value="">Select Variant</option>
              {variants.map(v => <option key={v.pkVariantId} value={v.pkVariantId}>{v.variant}</option>)}
            </Select>
            <Input label="Sub Variant" value={form.subVariant} onChange={e => f('subVariant', e.target.value)} placeholder="Optional detailed trim / package" />
            <Input label="Car Year" type="number" value={form.carYear ?? ''} onChange={e => f('carYear', e.target.value ? +e.target.value : null)} />
            <Input label="Budget (₹)" type="number" value={form.budgetOfCustomer ?? ''} onChange={e => f('budgetOfCustomer', e.target.value ? +e.target.value : null)} />
            <Input label="Visited Date" type="date" value={form.visitedDateOfCustomer} onChange={e => f('visitedDateOfCustomer', e.target.value)} />
            <Select label="Classification" value={form.classification} onChange={e => f('classification', e.target.value)}>
              {INQUIRY_CLASSIFICATIONS.map(c => <option key={c}>{c}</option>)}
            </Select>
            <Select label="Status" value={form.status} onChange={e => f('status', e.target.value)}>
              {INQUIRY_STATUSES.map(s => <option key={s}>{s}</option>)}
            </Select>
            <Input label="Follow-up Date" type="date" value={form.followUpDate} onChange={e => f('followUpDate', e.target.value)} />
            <div>
              <Input label="Sub-status" list="sub-status-suggestions" value={form.subStatus} onChange={e => f('subStatus', e.target.value)} />
              <datalist id="sub-status-suggestions">
                {SUB_STATUS_SUGGESTIONS.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
          </div>

          {(isFollowUpStatus || isVisitedSubStatus) ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {isFollowUpStatus ? <div>FollowUp status needs a follow-up date.</div> : null}
              {isVisitedSubStatus ? <div>Visited sub-status needs a visited date.</div> : null}
            </div>
          ) : null}

          {previousInquiryError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{previousInquiryError}</div>
          ) : null}

          {previousInquiryLoading ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Checking previous inquiries for this mobile number...</div>
          ) : null}

          {!previousInquiryLoading && previousInquiries.length > 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4">
              <div className="text-sm font-semibold text-amber-900">Previous inquiries found for this mobile number</div>
              <div className="mt-1 text-xs text-amber-800">Please review before saving. This is only a warning — you can still continue if this is a genuine new inquiry.</div>
              <div className="mt-3 space-y-3">
                {previousInquiries.map(match => {
                  const car = match.inquiryCarDetails[0]
                  const matchName = match.customer?.custName ?? match.customerNameLegacy ?? '—'
                  const matchVehicle = inquiryVehicleLabel(car)

                  return (
                    <div key={match.inquiryId} className="rounded-md border border-amber-100 bg-white px-3 py-3 text-xs text-gray-700">
                      <div className="grid gap-2 md:grid-cols-3">
                        <div><span className="font-medium text-gray-900">Inquiry:</span> {match.inquiryNo ?? `#${match.inquiryId}`}</div>
                        <div><span className="font-medium text-gray-900">Date:</span> {fmtDate(match.dateOfInquiry) || '—'}</div>
                        <div><span className="font-medium text-gray-900">Customer:</span> {matchName}</div>
                        <div><span className="font-medium text-gray-900">Vehicle:</span> {matchVehicle || '—'}</div>
                        <div><span className="font-medium text-gray-900">Status:</span> {match.status ?? '—'}{match.classification ? ` · ${match.classification}` : ''}</div>
                        <div><span className="font-medium text-gray-900">Follow-up:</span> {fmtDate(match.followUpDate) || '—'}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}

          {inventoryMatchError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{inventoryMatchError}</div>
          ) : null}

          {(selectedMakeId || selectedModelId || form.fkVariantId) ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-4">
              <div className="text-sm font-semibold text-blue-900">Matching Inventory</div>
              <div className="mt-1 text-xs text-blue-800">Based on the selected car details, here is matching stock currently in the system.</div>
              {inventoryMatchLoading ? (
                <div className="mt-3 text-sm text-blue-800">Checking matching inventory...</div>
              ) : inventoryMatches.length === 0 ? (
                <div className="mt-3 text-sm text-blue-800">No matching inventory found.</div>
              ) : (
                <div className="mt-3 space-y-3">
                  {inventoryMatches.map(match => {
                    const vehicle = [
                      clean(match.carVariantMaster?.carMakeMaster?.make),
                      clean(match.carVariantMaster?.carModelMaster?.model),
                      clean(match.carVariantMaster?.variant),
                    ].filter(Boolean).join(' ') || '—'
                    return (
                      <div key={match.inventoryId} className="rounded-md border border-blue-100 bg-white px-3 py-3 text-xs text-gray-700">
                        <div className="grid gap-2 md:grid-cols-3">
                          <div><span className="font-medium text-gray-900">Inventory:</span> {match.inventoryNumber ?? `#${match.inventoryId}`}</div>
                          <div><span className="font-medium text-gray-900">Registration:</span> {match.registrationNo ?? '—'}</div>
                          <div><span className="font-medium text-gray-900">Vehicle:</span> {vehicle}{match.year ? ` · ${match.year}` : ''}</div>
                          <div><span className="font-medium text-gray-900">Status:</span> {match.status ?? '—'}</div>
                          <div><span className="font-medium text-gray-900">Price:</span> {fmtMoney(match.price)}</div>
                          <div><span className="font-medium text-gray-900">KM / Photos:</span> {match.kmsDriven ? Number(match.kmsDriven).toLocaleString('en-IN') : '—'} / {match._count.inventoryPhotos}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : null}

          <Textarea label="Remarks" value={form.remark} onChange={e => f('remark', e.target.value)} placeholder="Notes about this inquiry..." />

          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="flex gap-3 justify-end pt-2">
            <Btn variant="outline" onClick={requestCloseInquiryModal}>Cancel</Btn>
            <Btn onClick={save} disabled={isPending}>{isPending ? 'Saving...' : 'Save Inquiry'}</Btn>
          </div>
        </div>
        )}
      </Modal>

      <Modal title={`Send Matching Inventory${emailInquiryRow ? ` — ${emailInquiryRow.inquiryNo ?? `Inquiry #${emailInquiryRow.inquiryId}`}` : ''}`} open={!!emailInquiryRow} onClose={() => {
        if (isEmailPending) return
        emailInventoryRequestRef.current += 1
        setEmailInquiryRow(null)
        setEmailInventoryMatches([])
        setSelectedEmailInventoryId(null)
        setEmailModalError('')
      }}>
        {emailInquiryRow ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              <div><span className="font-medium text-gray-800">Customer:</span> {emailInquiryRow.customer?.custName ?? emailInquiryRow.customerNameLegacy ?? '—'}</div>
              <div><span className="font-medium text-gray-800">Email:</span> {emailInquiryRow.customer?.custEmail ?? emailInquiryRow.email ?? '—'}</div>
              <div><span className="font-medium text-gray-800">Mobile:</span> {emailInquiryRow.mobileno ?? '—'}</div>
            </div>

            {emailModalError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{emailModalError}</div>
            ) : null}

            {emailInventoryLoading ? (
              <div className="flex min-h-24 flex-col items-center justify-center gap-3 text-sm text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <div>Loading matching inventory...</div>
              </div>
            ) : emailInventoryMatches.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
                No matching inventory found for this inquiry yet.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm font-medium text-gray-800">Choose which vehicle to send</div>
                <div className="space-y-2">
                  {emailInventoryMatches.map(match => {
                    const vehicle = [
                      clean(match.carVariantMaster?.carMakeMaster?.make),
                      clean(match.carVariantMaster?.carModelMaster?.model),
                      clean(match.carVariantMaster?.variant),
                    ].filter(Boolean).join(' ') || '—'
                    const isSelected = selectedEmailInventoryId === match.inventoryId
                    return (
                      <button
                        key={match.inventoryId}
                        type="button"
                        onClick={() => setSelectedEmailInventoryId(match.inventoryId)}
                        className={`w-full rounded-lg border px-4 py-3 text-left transition ${isSelected ? 'border-[#1B2A6B] bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                      >
                        <div className="grid gap-2 md:grid-cols-3">
                          <div><span className="font-medium text-gray-900">Inventory:</span> {match.inventoryNumber ?? `#${match.inventoryId}`}</div>
                          <div><span className="font-medium text-gray-900">Registration:</span> {match.registrationNo ?? '—'}</div>
                          <div><span className="font-medium text-gray-900">Status:</span> {match.status ?? '—'}</div>
                          <div><span className="font-medium text-gray-900">Vehicle:</span> {vehicle}{match.year ? ` · ${match.year}` : ''}</div>
                          <div><span className="font-medium text-gray-900">Price:</span> {fmtMoney(match.price)}</div>
                          <div><span className="font-medium text-gray-900">KM / Photos:</span> {match.kmsDriven ? Number(match.kmsDriven).toLocaleString('en-IN') : '—'} / {match._count.inventoryPhotos}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Btn variant="outline" onClick={() => {
                if (isEmailPending) return
                emailInventoryRequestRef.current += 1
                setEmailInquiryRow(null)
                setEmailInventoryMatches([])
                setSelectedEmailInventoryId(null)
                setEmailModalError('')
              }}>Cancel</Btn>
              <Btn onClick={handleSendInventoryEmail} disabled={isEmailPending || !selectedEmailInventoryId || emailInventoryLoading}>
                {isEmailPending ? 'Sending...' : 'Send Email'}
              </Btn>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog open={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={del}
        message="Delete this inquiry record? This cannot be undone." />
      <ConfirmDialog
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        onConfirm={forceCloseInquiryModal}
        title="Discard changes?"
        confirmLabel="Discard"
        message="You have unsaved inquiry changes. Discard them and close?"
      />
    </div>
  )
}
