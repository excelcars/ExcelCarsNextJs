'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Phone, PhoneCall, AlertTriangle, Eye, Pencil, ChevronLeft, ChevronRight, Download, Loader2 } from 'lucide-react'
import { Badge, Btn, Input, Select, Textarea, Modal, Table, PageHeader, SearchBar, N } from '@/components/ui'
import { logFollowup, type LogFollowupInput } from './actions'
import { CustomerPicker } from '@/components/CustomerPicker'
import { INQUIRY_CLASSIFICATIONS, INQUIRY_STATUSES } from '@/features/inquiry/queries'
import { getInquiryDetail, updateInquiry, type InquiryCarInput, type InquiryFormInput } from '@/features/inquiry/actions'
import { isValidEmail, isValidPhone, isValidYear } from '@/lib/validation'

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
    inquiryCarDetailsId?: number
    makeLegacy?: string | null
    modelLegacy?: string | null
    variantLegacy?: string | null
    subVariant?: string | null
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
  createdDt?: string | null
  followupDate: string | null
  followupStatus: string | null
  followupSubStatus: string | null
  followupClassification: string | null
  comments: string | null
}

interface CarMakeMaster { pkMakeId: number; make: string | null }
interface CarModelMaster { pkModelId: number; model: string | null }
interface CarVariantMaster { pkVariantId: number; variant: string | null }
interface CustomerOption { custId: number; custName: string; custMobile: string | null; custEmail: string | null }
interface UserOption { userId: number; userName: string | null; displayName: string | null }

const JUNK_VALUES = new Set(['null', 'na', 'n/a'])
const clean = (v: string | null | undefined) => (!v || JUNK_VALUES.has(v.trim().toLowerCase()) ? '' : v)
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
const isOverdue = (d: Date | string | null) => d ? new Date(d) < new Date(new Date().toDateString()) : false
const fmtMoney = (n: string | number | null | undefined) => n ? `₹${Number(n).toLocaleString('en-IN')}` : '—'

function getInquiryCarSummary(car: FollowupRow['inquiryCarDetails'][number] | null | undefined) {
  const make = clean(car?.carVariantMaster?.carMakeMaster?.make) || clean(car?.makeLegacy)
  const model = clean(car?.carVariantMaster?.carModelMaster?.model) || clean(car?.modelLegacy)
  const variant = clean(car?.carVariantMaster?.variant) || clean(car?.variantLegacy)
  const parts = [make, model, variant].filter(Boolean)
  if (!parts.length && !car?.year) return '—'
  return `${parts.join(' ') || '—'}${car?.year ? ` · ${car.year}` : ''}`
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
    const make = clean(car?.carVariantMaster?.carMakeMaster?.make) || clean(car?.makeLegacy)
    const model = clean(car?.carVariantMaster?.carModelMaster?.model) || clean(car?.modelLegacy)
    const variant = clean(car?.carVariantMaster?.variant) || clean(car?.variantLegacy)
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

function emptyInquiryCar(): InquiryCarInput {
  return {
    inquiryCarDetailsId: null,
    selectedMakeId: null,
    selectedModelId: null,
    fkVariantId: null,
    subVariant: '',
    carYear: null,
  }
}

function emptyInquiryForm(): InquiryFormInput {
  return {
    inquiryNo: '',
    dateOfInquiry: '',
    website: '',
    customerId: null,
    customerNameLegacy: '',
    mobileno: '',
    email: '',
    budgetOfCustomer: null,
    visitedDateOfCustomer: '',
    classification: 'Warm',
    status: 'FollowUp',
    subStatus: '',
    followUpDate: '',
    remark: '',
    inquiryCars: [],
  }
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
  const [viewHistoryRow, setViewHistoryRow] = useState<FollowupRow | null>(null)
  const [viewHistory, setViewHistory] = useState<HistoryEntry[]>([])
  const [viewHistoryLoading, setViewHistoryLoading] = useState(false)
  const [viewHistoryError, setViewHistoryError] = useState('')
  const [viewInquiryId, setViewInquiryId] = useState<number | null>(null)
  const [viewInquiry, setViewInquiry] = useState<Awaited<ReturnType<typeof getInquiryDetail>> | null>(null)
  const [viewInquiryLoading, setViewInquiryLoading] = useState(false)
  const [viewInquiryError, setViewInquiryError] = useState('')
  const [editInquiryId, setEditInquiryId] = useState<number | null>(null)
  const [editInquiryForm, setEditInquiryForm] = useState<InquiryFormInput>(emptyInquiryForm())
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null)
  const [editInquiryLoading, setEditInquiryLoading] = useState(false)
  const [editInquiryError, setEditInquiryError] = useState('')
  const [editInquiryErrors, setEditInquiryErrors] = useState<Record<string, boolean>>({})
  const [carEditor, setCarEditor] = useState<InquiryCarInput>(emptyInquiryCar())
  const [carEditorModels, setCarEditorModels] = useState<CarModelMaster[]>([])
  const [carEditorVariants, setCarEditorVariants] = useState<CarVariantMaster[]>([])
  const [editingCarIndex, setEditingCarIndex] = useState<number | null>(null)
  const [carEditorError, setCarEditorError] = useState('')
  const [modelNameCache, setModelNameCache] = useState<Record<number, string>>({})
  const [variantNameCache, setVariantNameCache] = useState<Record<number, string>>({})
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<Record<string, boolean>>({})
  const [exportError, setExportError] = useState('')
  const [isRoutePending, startRouteTransition] = useTransition()
  const [isPending, startTransition] = useTransition()
  const [isExporting, startExportTransition] = useTransition()
  const historyRequestRef = useRef(0)
  const viewHistoryRequestRef = useRef(0)
  const viewInquiryRequestRef = useRef(0)
  const editInquiryRequestRef = useRef(0)
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

  const resetCarEditor = () => {
    setCarEditor(emptyInquiryCar())
    setCarEditorModels([])
    setCarEditorVariants([])
    setEditingCarIndex(null)
    setCarEditorError('')
  }

  const loadModelsForMake = async (selectedMakeId: number) => {
    if (!selectedMakeId) {
      setCarEditorModels([])
      return []
    }
    const response = await fetch(`/api/catalog/models?makeId=${selectedMakeId}`)
    const payload = await response.json().catch(() => [])
    const nextModels = Array.isArray(payload) ? payload as CarModelMaster[] : []
    setCarEditorModels(nextModels)
    setModelNameCache(prev => ({
      ...prev,
      ...Object.fromEntries(nextModels.map(model => [model.pkModelId, model.model ?? '—'])),
    }))
    return nextModels
  }

  const loadVariantsForModel = async (selectedModelId: number) => {
    if (!selectedModelId) {
      setCarEditorVariants([])
      return []
    }
    const response = await fetch(`/api/catalog/variants?modelId=${selectedModelId}`)
    const payload = await response.json().catch(() => [])
    const nextVariants = Array.isArray(payload) ? payload as CarVariantMaster[] : []
    setCarEditorVariants(nextVariants)
    setVariantNameCache(prev => ({
      ...prev,
      ...Object.fromEntries(nextVariants.map(variant => [variant.pkVariantId, variant.variant ?? '—'])),
    }))
    return nextVariants
  }

  const onCarEditorMakeChange = async (nextMakeId: number) => {
    setCarEditor(prev => ({
      ...prev,
      selectedMakeId: nextMakeId || null,
      selectedModelId: null,
      fkVariantId: null,
    }))
    setCarEditorVariants([])
    setCarEditorError('')
    await loadModelsForMake(nextMakeId)
  }

  const onCarEditorModelChange = async (nextModelId: number) => {
    setCarEditor(prev => ({
      ...prev,
      selectedModelId: nextModelId || null,
      fkVariantId: null,
    }))
    setCarEditorError('')
    await loadVariantsForModel(nextModelId)
  }

  const editInquiryCar = async (rowIndex: number) => {
    const row = editInquiryForm.inquiryCars[rowIndex]
    if (!row) return

    setEditingCarIndex(rowIndex)
    setCarEditor({
      inquiryCarDetailsId: row.inquiryCarDetailsId ?? null,
      selectedMakeId: row.selectedMakeId ?? null,
      selectedModelId: row.selectedModelId ?? null,
      fkVariantId: row.fkVariantId ?? null,
      subVariant: row.subVariant ?? '',
      carYear: row.carYear ?? null,
    })
    setCarEditorError('')

    if (row.selectedMakeId) {
      await loadModelsForMake(row.selectedMakeId)
    } else {
      setCarEditorModels([])
    }

    if (row.selectedModelId) {
      await loadVariantsForModel(row.selectedModelId)
    } else {
      setCarEditorVariants([])
    }
  }

  const saveInquiryCarRow = () => {
    if (!carEditor.selectedMakeId || !carEditor.selectedModelId || !carEditor.fkVariantId) {
      setCarEditorError('Select make, model, and variant before adding the vehicle row.')
      return
    }
    if (carEditor.carYear !== null && !isValidYear(carEditor.carYear)) {
      setCarEditorError('Enter a valid 4-digit year for the vehicle row.')
      return
    }

    const nextRow: InquiryCarInput = {
      inquiryCarDetailsId: carEditor.inquiryCarDetailsId ?? null,
      selectedMakeId: carEditor.selectedMakeId ?? null,
      selectedModelId: carEditor.selectedModelId ?? null,
      fkVariantId: carEditor.fkVariantId ?? null,
      subVariant: carEditor.subVariant,
      carYear: carEditor.carYear,
    }

    setEditInquiryForm(prev => {
      const inquiryCars = [...prev.inquiryCars]
      if (editingCarIndex !== null) {
        inquiryCars[editingCarIndex] = nextRow
      } else {
        inquiryCars.push(nextRow)
      }
      return { ...prev, inquiryCars }
    })
    resetCarEditor()
  }

  const removeInquiryCar = (rowIndex: number) => {
    setEditInquiryForm(prev => ({
      ...prev,
      inquiryCars: prev.inquiryCars.filter((_, index) => index !== rowIndex),
    }))
    if (editingCarIndex === rowIndex) {
      resetCarEditor()
      return
    }
    if (editingCarIndex !== null && rowIndex < editingCarIndex) {
      setEditingCarIndex(editingCarIndex - 1)
    }
  }

  const moveInquiryCar = (rowIndex: number, direction: -1 | 1) => {
    const nextIndex = rowIndex + direction
    if (nextIndex < 0 || nextIndex >= editInquiryForm.inquiryCars.length) return

    setEditInquiryForm(prev => {
      const inquiryCars = [...prev.inquiryCars]
      const [moved] = inquiryCars.splice(rowIndex, 1)
      inquiryCars.splice(nextIndex, 0, moved)
      return { ...prev, inquiryCars }
    })

    if (editingCarIndex === rowIndex) {
      setEditingCarIndex(nextIndex)
    } else if (editingCarIndex === nextIndex) {
      setEditingCarIndex(rowIndex)
    }
  }

  const openLog = async (r: FollowupRow) => {
    const requestId = historyRequestRef.current + 1
    historyRequestRef.current = requestId
    setLogRow(r)
    setForm({ ...emptyForm(), classification: r.classification ?? 'Warm' })
    setError('')
    setErrors({})
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
    const newErrors: Record<string, boolean> = {}

    if (!form.comments?.trim()) {
      newErrors.comments = true
    }
    if (form.status === 'FollowUp') {
      if (!form.nextFollowUpDate?.trim()) {
        newErrors.nextFollowUpDate = true
      } else {
        const today = new Date().toISOString().slice(0, 10)
        if (form.nextFollowUpDate < today) {
          newErrors.nextFollowUpDate = true
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setErrors({})

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

  const openFollowupView = (inquiryId: number) => {
    const row = initialData.find(item => item.inquiryId === inquiryId) ?? null
    const requestId = ++viewHistoryRequestRef.current
    setViewHistoryRow(row)
    setViewHistory([])
    setViewHistoryError('')
    setViewHistoryLoading(true)

    fetch(`/api/followup/history?inquiryId=${inquiryId}&limit=all`)
      .then(async res => {
        const payload = await res.json().catch(() => null)
        if (viewHistoryRequestRef.current !== requestId) return
        if (!res.ok || !Array.isArray(payload)) {
          throw new Error(payload?.error ?? 'Could not load follow-up history.')
        }
        setViewHistory(payload as HistoryEntry[])
      })
      .catch(err => {
        if (viewHistoryRequestRef.current !== requestId) return
        setViewHistory([])
        setViewHistoryError(err instanceof Error ? err.message : 'Could not load follow-up history.')
      })
      .finally(() => {
        if (viewHistoryRequestRef.current === requestId) setViewHistoryLoading(false)
      })
  }

  const openInquiryView = (inquiryId: number) => {
    const requestId = ++viewInquiryRequestRef.current
    setLogRow(null)
    setViewHistoryRow(null)
    setViewInquiryId(inquiryId)
    setViewInquiry(null)
    setViewInquiryError('')
    setViewInquiryLoading(true)

    getInquiryDetail(inquiryId)
      .then(detail => {
        if (viewInquiryRequestRef.current !== requestId) return
        if (!detail) {
          setViewInquiryError('Inquiry not found.')
          return
        }
        setViewInquiry(detail)
      })
      .catch(() => {
        if (viewInquiryRequestRef.current !== requestId) return
        setViewInquiryError('Could not load inquiry details.')
      })
      .finally(() => {
        if (viewInquiryRequestRef.current === requestId) setViewInquiryLoading(false)
      })
  }

  const openInquiryEdit = (inquiryId: number) => {
    const requestId = ++editInquiryRequestRef.current
    setLogRow(null)
    setViewHistoryRow(null)
    setViewInquiryId(null)
    setEditInquiryId(inquiryId)
    setEditInquiryLoading(true)
    setEditInquiryError('')
    setEditInquiryErrors({})
    resetCarEditor()

    getInquiryDetail(inquiryId)
      .then(detail => {
        if (editInquiryRequestRef.current !== requestId) return
        if (!detail) {
          setEditInquiryError('Inquiry not found.')
          setEditInquiryId(null)
          return
        }

        const inquiryCars = detail.inquiryCarDetails.length > 0 ? detail.inquiryCarDetails.map(car => ({
          inquiryCarDetailsId: car.inquiryCarDetailsId ?? null,
          selectedMakeId: car.carVariantMaster?.carMakeMaster?.pkMakeId ?? null,
          selectedModelId: car.carVariantMaster?.carModelMaster?.pkModelId ?? null,
          fkVariantId: car.fkVariantId ?? null,
          subVariant: car.subVariant ?? '',
          carYear: car.year ?? null,
        })) : []

        setEditInquiryForm({
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
          inquiryCars,
        })
        setSelectedCustomer(detail.customer)
        setModelNameCache(Object.fromEntries(
          detail.inquiryCarDetails
            .filter(car => car.carVariantMaster?.carModelMaster?.pkModelId)
            .map(car => [car.carVariantMaster?.carModelMaster?.pkModelId as number, car.carVariantMaster?.carModelMaster?.model ?? '—']),
        ))
        setVariantNameCache(Object.fromEntries(
          detail.inquiryCarDetails
            .filter(car => car.carVariantMaster?.pkVariantId)
            .map(car => [car.carVariantMaster?.pkVariantId as number, car.carVariantMaster?.variant ?? '—']),
        ))
      })
      .catch(() => {
        if (editInquiryRequestRef.current !== requestId) return
        setEditInquiryError('Could not load inquiry details.')
        setEditInquiryId(null)
      })
      .finally(() => {
        if (editInquiryRequestRef.current === requestId) setEditInquiryLoading(false)
      })
  }

  const closeFollowupView = () => {
    setViewHistoryRow(null)
    setViewHistory([])
    setViewHistoryError('')
    setViewHistoryLoading(false)
  }

  const closeInquiryView = () => {
    setViewInquiryId(null)
    setViewInquiry(null)
    setViewInquiryError('')
    setViewInquiryLoading(false)
  }

  const closeInquiryEdit = () => {
    setEditInquiryId(null)
    setEditInquiryLoading(false)
    setEditInquiryError('')
    setEditInquiryErrors({})
    setSelectedCustomer(null)
    setEditInquiryForm(emptyInquiryForm())
    resetCarEditor()
  }

  const onInquiryCustomerChange = (customer: CustomerOption | null) => {
    setSelectedCustomer(customer)
    setEditInquiryForm(current => ({
      ...current,
      customerId: customer?.custId ?? null,
      customerNameLegacy: customer?.custName ?? current.customerNameLegacy,
      mobileno: customer?.custMobile ?? current.mobileno,
      email: customer?.custEmail ?? current.email,
    }))
  }

  const updateInquiryField = <K extends keyof InquiryFormInput>(key: K, value: InquiryFormInput[K]) => {
    setEditInquiryForm(prev => ({ ...prev, [key]: value }))
  }

  const saveInquiryEdit = () => {
    if (!editInquiryId) return

    setEditInquiryError('')
    const newErrors: Record<string, boolean> = {}

    if (!editInquiryForm.customerId && !editInquiryForm.customerNameLegacy?.trim()) {
      newErrors.customer = true
    }
    if (!editInquiryForm.mobileno?.trim() || !isValidPhone(editInquiryForm.mobileno)) {
      newErrors.mobileno = true
    }
    if (editInquiryForm.email && !isValidEmail(editInquiryForm.email)) {
      newErrors.email = true
    }
    if (!editInquiryForm.website?.trim()) {
      newErrors.website = true
    }
    if (editInquiryForm.budgetOfCustomer !== null && editInquiryForm.budgetOfCustomer <= 0) {
      newErrors.budgetOfCustomer = true
    }
    if (editInquiryForm.inquiryCars.length === 0) {
      newErrors.inquiryCars = true
    }
    const invalidCarIndex = editInquiryForm.inquiryCars.findIndex(car => car.carYear !== null && !isValidYear(car.carYear))
    if (invalidCarIndex >= 0) {
      newErrors[`carYear-${invalidCarIndex}`] = true
    }

    const currentStatus = editInquiryForm.status.trim()
    const currentSubStatus = editInquiryForm.subStatus.trim().toLowerCase()
    const inquiryDate = editInquiryForm.dateOfInquiry.trim()
    const followUpDate = editInquiryForm.followUpDate.trim()
    const visitedDate = editInquiryForm.visitedDateOfCustomer.trim()

    if (currentStatus === 'FollowUp' && !followUpDate) {
      newErrors.followUpDate = true
    }
    if (currentSubStatus === 'visited' && !visitedDate) {
      newErrors.visitedDateOfCustomer = true
    }
    if (inquiryDate && followUpDate && followUpDate < inquiryDate) {
      newErrors.followUpDate = true
      newErrors.dateOfInquiry = true
    }
    if (inquiryDate && visitedDate && visitedDate < inquiryDate) {
      newErrors.visitedDateOfCustomer = true
      newErrors.dateOfInquiry = true
    }

    if (Object.keys(newErrors).length > 0) {
      if (newErrors.inquiryCars) {
        setEditInquiryError('Add at least one car of interest before saving the inquiry.')
      } else if (newErrors.followUpDate && currentStatus === 'FollowUp' && !followUpDate) {
        setEditInquiryError('Follow-up date is required when status is FollowUp.')
      } else if (newErrors.visitedDateOfCustomer && currentSubStatus === 'visited' && !visitedDate) {
        setEditInquiryError('Visited date is required when sub-status is Visited.')
      } else if (newErrors.followUpDate && newErrors.dateOfInquiry) {
        setEditInquiryError('Follow-up date cannot be before inquiry date.')
      } else if (newErrors.visitedDateOfCustomer && newErrors.dateOfInquiry) {
        setEditInquiryError('Visited date cannot be before inquiry date.')
      } else {
        setEditInquiryError('Please fix the highlighted inquiry fields before saving.')
      }
      setEditInquiryErrors(newErrors)
      return
    }

    setEditInquiryErrors({})
    startTransition(async () => {
      const result = await updateInquiry(editInquiryId, editInquiryForm)
      if (!result.success) {
        setEditInquiryError(result.error ?? 'Something went wrong saving this inquiry.')
        return
      }
      closeInquiryEdit()
      router.refresh()
    })
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
          <Table
            headers={[
              'Inquiry Date / Website',
              'Customer Details',
              'Car Details',
              'Budget / Visited Date',
              'Classification / Follow-up Status / Sub-status',
              'Follow-up Date / Inquiry Made By',
              'Remark',
              'Follow-up',
              'Inquiry',
            ]}
            empty={initialData.length === 0}
          >
            {initialData.map(r => {
              const name = r.customer?.custName ?? r.customerNameLegacy ?? '—'
              const overdue = isOverdue(r.followUpDate)
              const inquiryMadeBy = r.createdByUser?.displayName ?? r.createdByUser?.userName ?? (r.createdBy ? `User #${r.createdBy}` : '—')
              return (
                <tr key={r.inquiryId} className={`hover:bg-gray-50 transition ${overdue ? 'bg-red-50/40' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="space-y-1 text-sm text-gray-700 min-w-[160px]">
                      <div><span className="font-medium text-gray-900">Inquiry Date:</span> {fmtDate(r.dateOfInquiry) || '—'}</div>
                      <div className="break-words"><span className="font-medium text-gray-900">Website:</span> {r.website ?? '—'}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <div className="space-y-1 min-w-[180px]">
                      <div className="font-medium text-gray-900 break-words">{name}</div>
                      <div className="flex items-center gap-1 font-mono">
                        <Phone className="w-3 h-3 text-gray-400" />{r.customer?.custMobile ?? r.mobileno ?? '—'}
                      </div>
                      <div className="break-words text-gray-600">{r.customer?.custEmail ?? r.email ?? '—'}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="min-w-[180px] space-y-3 text-sm text-gray-700">
                      {r.inquiryCarDetails.length > 0 ? r.inquiryCarDetails.map(car => (
                        <div key={car.inquiryCarDetailsId ?? `${car.makeLegacy}-${car.modelLegacy}-${car.variantLegacy}-${car.year ?? 'na'}`} className="border-b border-dashed border-gray-200 pb-2 last:border-b-0 last:pb-0">
                          <div><span className="font-medium text-gray-900">Make:</span> {clean(car.carVariantMaster?.carMakeMaster?.make) || clean(car.makeLegacy) || '—'}</div>
                          <div><span className="font-medium text-gray-900">Model:</span> {clean(car.carVariantMaster?.carModelMaster?.model) || clean(car.modelLegacy) || '—'}</div>
                          <div><span className="font-medium text-gray-900">Variant:</span> {clean(car.carVariantMaster?.variant) || clean(car.variantLegacy) || clean(car.subVariant) || '—'}</div>
                          <div><span className="font-medium text-gray-900">Year:</span> {car.year ?? '—'}</div>
                        </div>
                      )) : (
                        <div>—</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 min-w-[150px]">
                    <div><span className="font-medium text-gray-900">Budget:</span> {fmtMoney(r.budgetOfCustomer)}</div>
                    <div className="mt-2"><span className="font-medium text-gray-900">Visited Date:</span> {fmtDate(r.visitedDateOfCustomer ?? null) || '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 min-w-[200px]">
                    <div><span className="font-medium text-gray-900">Classification:</span> {r.classification ? <span className="ml-1 inline-block align-middle"><Badge label={r.classification} /></span> : ' —'}</div>
                    <div className="mt-2"><span className="font-medium text-gray-900">Status:</span> {r.status ? <span className="ml-1 inline-block align-middle"><Badge label={r.status} /></span> : ' —'}</div>
                    <div className="mt-2 break-words"><span className="font-medium text-gray-900">Sub-status:</span> {r.subStatus ?? '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-sm min-w-[180px]">
                    <div className={`flex items-center gap-1 ${overdue ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>
                      {overdue && <AlertTriangle className="w-3.5 h-3.5" />}
                      <span className="font-medium text-gray-900">Follow-up Date:</span>
                      <span>{fmtDate(r.followUpDate) || '—'}</span>
                    </div>
                    <div className="mt-2 break-words text-gray-700">
                      <span className="font-medium text-gray-900">Inquiry Made By:</span> {inquiryMadeBy}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 min-w-[160px] break-words">{r.remark ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-[96px] items-center justify-center gap-2">
                      <button
                        onClick={() => openLog(r)}
                        className="inline-flex p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition"
                        title="Edit Follow-up"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openFollowupView(r.inquiryId)}
                        className="inline-flex p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition"
                        title="View Follow-up"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-[96px] items-center justify-center gap-2">
                      <button
                        onClick={() => openInquiryView(r.inquiryId)}
                        className="inline-flex p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition"
                        title="View Inquiry"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openInquiryEdit(r.inquiryId)}
                        className="inline-flex p-1.5 text-gray-400 hover:text-[#1B2A6B] hover:bg-blue-50 rounded transition"
                        title="Edit Inquiry"
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
                  <div><span className="font-medium text-gray-900">Car of Interest:</span> {getInquiryCarSummary(logRow.inquiryCarDetails[0])}</div>
                  <div><span className="font-medium text-gray-900">Current Follow-up Date:</span> {fmtDate(logRow.followUpDate) || '—'}</div>
                  <div><span className="font-medium text-gray-900">Last Remark:</span> {logRow.remark?.trim() ? logRow.remark : '—'}</div>
                </div>
              </div>
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
                <Input label="Next Follow-up Date *" type="date" value={form.nextFollowUpDate} onChange={e => f('nextFollowUpDate', e.target.value)} error={errors.nextFollowUpDate} />
              )}
            </div>
            <Textarea label="Remark" value={form.comments} onChange={e => f('comments', e.target.value)} placeholder="What was discussed on this call..." error={errors.comments} />

            {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}

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

            <div className="flex gap-3 justify-end pt-2">
              <Btn variant="outline" onClick={() => setLogRow(null)}>Cancel</Btn>
              <Btn onClick={save} disabled={isPending}>{isPending ? 'Saving...' : 'Save Follow-up'}</Btn>
            </div>
          </div>
        )}
      </Modal>

      <Modal title={`View Follow-up${viewHistoryRow ? ` — ${viewHistoryRow.inquiryNo ?? `Inquiry #${viewHistoryRow.inquiryId}`}` : ''}`} open={viewHistoryRow !== null} onClose={closeFollowupView}>
        <div className="space-y-4">
          {viewHistoryLoading ? (
            <div className="flex min-h-32 flex-col items-center justify-center gap-3 text-sm text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <div>Loading follow-up history...</div>
            </div>
          ) : viewHistoryError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{viewHistoryError}</div>
          ) : viewHistoryRow ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Inquiry Context</div>
                  <div className="mt-3 space-y-2 text-sm text-gray-700">
                    <div><span className="font-medium text-gray-900">Inquiry ID:</span> {viewHistoryRow.inquiryId}</div>
                    <div><span className="font-medium text-gray-900">Inquiry No:</span> {viewHistoryRow.inquiryNo ?? '—'}</div>
                    <div><span className="font-medium text-gray-900">Inquiry Date:</span> {fmtDate(viewHistoryRow.dateOfInquiry) || '—'}</div>
                    <div><span className="font-medium text-gray-900">Source:</span> {viewHistoryRow.website ?? '—'}</div>
                    <div><span className="font-medium text-gray-900">Current Follow-up Date:</span> {fmtDate(viewHistoryRow.followUpDate) || '—'}</div>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Customer & Vehicle</div>
                  <div className="mt-3 space-y-2 text-sm text-gray-700">
                    <div><span className="font-medium text-gray-900">Linked Customer ID:</span> {viewHistoryRow.customer?.custId ?? viewHistoryRow.customerId ?? '—'}</div>
                    <div><span className="font-medium text-gray-900">Customer:</span> {viewHistoryRow.customer?.custName ?? viewHistoryRow.customerNameLegacy ?? '—'}</div>
                    <div><span className="font-medium text-gray-900">Mobile:</span> {viewHistoryRow.customer?.custMobile ?? viewHistoryRow.mobileno ?? '—'}</div>
                    <div><span className="font-medium text-gray-900">Email:</span> {viewHistoryRow.customer?.custEmail ?? viewHistoryRow.email ?? '—'}</div>
                    <div><span className="font-medium text-gray-900">Car of Interest:</span> {getInquiryCarSummary(viewHistoryRow.inquiryCarDetails[0])}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Follow-up Details</div>
                {viewHistory.length === 0 ? (
                  <div className="mt-3 text-sm text-gray-700">No follow-up history recorded yet.</div>
                ) : (
                  <div className="mt-3 overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead
                        className="text-left text-xs font-semibold uppercase tracking-wide text-white"
                        style={{ backgroundColor: N }}
                      >
                        <tr>
                          <th className="px-3 py-2">Sr.No.</th>
                          <th className="px-3 py-2">Entry Date</th>
                          <th className="px-3 py-2">Followup Date</th>
                          <th className="px-3 py-2">Remarks</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Sub-status</th>
                          <th className="px-3 py-2">Classification</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {viewHistory.map((item, index) => (
                          <tr key={item.pkFollowupId}>
                            <td className="px-3 py-2 text-gray-700">{index + 1}</td>
                            <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{fmtDate(item.createdDt ?? null) || '—'}</td>
                            <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{fmtDate(item.followupDate) || '—'}</td>
                            <td className="px-3 py-2 text-gray-700 min-w-[220px] break-words">{clean(item.comments) || '—'}</td>
                            <td className="px-3 py-2 text-gray-700">{item.followupStatus ?? '—'}</td>
                            <td className="px-3 py-2 text-gray-700">{item.followupSubStatus ?? '—'}</td>
                            <td className="px-3 py-2 text-gray-700">{item.followupClassification ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Btn variant="outline" onClick={closeFollowupView}>Close</Btn>
              </div>
            </>
          ) : null}
        </div>
      </Modal>

      <Modal title={`View Inquiry${viewInquiry ? ` — ${viewInquiry.inquiryNo ?? `Inquiry #${viewInquiry.inquiryId}`}` : viewInquiryId ? ` — Inquiry #${viewInquiryId}` : ''}`} open={viewInquiryId !== null} onClose={closeInquiryView}>
        <div className="space-y-4">
          {viewInquiryLoading ? (
            <div className="flex min-h-32 flex-col items-center justify-center gap-3 text-sm text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <div>Loading inquiry details...</div>
            </div>
          ) : viewInquiryError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{viewInquiryError}</div>
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
                {viewInquiry.inquiryCarDetails.length === 0 ? (
                  <div className="mt-3 text-sm text-gray-700">No vehicle requirement captured.</div>
                ) : (
                  <div className="mt-3 space-y-3">
                    {viewInquiry.inquiryCarDetails.map((car, index) => (
                      <div key={car.inquiryCarDetailsId ?? `view-car-${index}`} className="rounded-md border border-gray-100 bg-gray-50 px-3 py-3">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Vehicle {index + 1}</div>
                        <div className="grid gap-2 text-sm text-gray-700 md:grid-cols-2">
                          <div><span className="font-medium text-gray-900">Make:</span> {clean(car.carVariantMaster?.carMakeMaster?.make) || clean(car.makeLegacy) || '—'}</div>
                          <div><span className="font-medium text-gray-900">Model:</span> {clean(car.carVariantMaster?.carModelMaster?.model) || clean(car.modelLegacy) || '—'}</div>
                          <div><span className="font-medium text-gray-900">Variant:</span> {clean(car.carVariantMaster?.variant) || clean(car.variantLegacy) || '—'}</div>
                          <div><span className="font-medium text-gray-900">Sub Variant:</span> {clean(car.subVariant) || '—'}</div>
                          <div><span className="font-medium text-gray-900">Year:</span> {car.year ?? '—'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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

              <div className="flex justify-end">
                <Btn variant="outline" onClick={closeInquiryView}>Close</Btn>
              </div>
            </>
          ) : null}
        </div>
      </Modal>

      <Modal title={editInquiryId ? `Edit Inquiry — #${editInquiryId}` : 'Edit Inquiry'} open={editInquiryId !== null} onClose={closeInquiryEdit}>
        {editInquiryLoading ? (
          <div className="flex min-h-32 flex-col items-center justify-center gap-3 text-sm text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <div>Loading inquiry details...</div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Input label="Inquiry No*" value={editInquiryForm.inquiryNo} readOnly />
              <Input label="Date of Inquiry*" type="date" value={editInquiryForm.dateOfInquiry} onChange={e => updateInquiryField('dateOfInquiry', e.target.value)} error={editInquiryErrors.dateOfInquiry} />
              <Input label="Reference Website" value={editInquiryForm.website} onChange={e => updateInquiryField('website', e.target.value)} error={editInquiryErrors.website} />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Link Existing Customer</label>
              <CustomerPicker value={selectedCustomer} onChange={onInquiryCustomerChange} error={editInquiryErrors.customer} />
            </div>

            {selectedCustomer ? (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                This inquiry is linked to a customer record. Name, mobile, and email stay synced with that customer.
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-3">
              <Input label="Customer Name*#" value={editInquiryForm.customerNameLegacy} onChange={e => updateInquiryField('customerNameLegacy', e.target.value)} disabled={!!selectedCustomer} error={editInquiryErrors.customer} />
              <Input label="Customer Mobile No*#" value={editInquiryForm.mobileno} onChange={e => updateInquiryField('mobileno', e.target.value)} disabled={!!selectedCustomer} error={editInquiryErrors.mobileno} />
              <Input label="Customer Email" type="email" value={editInquiryForm.email} onChange={e => updateInquiryField('email', e.target.value)} disabled={!!selectedCustomer} error={editInquiryErrors.email} />
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-gray-900">Car Details</div>
                  <div className="text-xs text-gray-500">Update the customer requirement here, including changing or adding more cars.</div>
                </div>
                {editingCarIndex !== null ? <Btn variant="outline" size="sm" onClick={resetCarEditor}>Cancel Edit</Btn> : null}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-6">
                <Select label="Make*#" value={carEditor.selectedMakeId ?? ''} onChange={e => onCarEditorMakeChange(Number(e.target.value))}>
                  <option value="">SELECT</option>
                  {makes.map(item => <option key={item.pkMakeId} value={item.pkMakeId}>{item.make ?? '—'}</option>)}
                </Select>
                <Select label="Model*#" value={carEditor.selectedModelId ?? ''} onChange={e => onCarEditorModelChange(Number(e.target.value))} disabled={!carEditor.selectedMakeId}>
                  <option value="">SELECT</option>
                  {carEditorModels.map(item => <option key={item.pkModelId} value={item.pkModelId}>{item.model ?? '—'}</option>)}
                </Select>
                <Select label="Variant*#" value={carEditor.fkVariantId ?? ''} onChange={e => {
                  setCarEditor(prev => ({ ...prev, fkVariantId: Number(e.target.value) || null }))
                  setCarEditorError('')
                }} disabled={!carEditor.selectedModelId}>
                  <option value="">SELECT</option>
                  {carEditorVariants.map(item => <option key={item.pkVariantId} value={item.pkVariantId}>{item.variant ?? '—'}</option>)}
                </Select>
                <Input label="Year#" type="number" value={carEditor.carYear ?? ''} onChange={e => {
                  setCarEditor(prev => ({ ...prev, carYear: e.target.value ? Number(e.target.value) : null }))
                  setCarEditorError('')
                }} />
                <Input label="Sub Variant" value={carEditor.subVariant} onChange={e => {
                  setCarEditor(prev => ({ ...prev, subVariant: e.target.value }))
                  setCarEditorError('')
                }} placeholder="Optional" />
                <div className="flex items-end">
                  <Btn onClick={saveInquiryCarRow} className="w-full">{editingCarIndex !== null ? 'Update' : 'Add'}</Btn>
                </div>
              </div>

              {carEditorError ? <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{carEditorError}</div> : null}
              {editInquiryErrors.inquiryCars ? <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">Add at least one car row.</div> : null}

              <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-3 py-2">Make</th>
                      <th className="px-3 py-2">Model</th>
                      <th className="px-3 py-2">Variant</th>
                      <th className="px-3 py-2">Sub Variant</th>
                      <th className="px-3 py-2">Year</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {editInquiryForm.inquiryCars.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-sm text-gray-500">No vehicle rows added yet.</td>
                      </tr>
                    ) : editInquiryForm.inquiryCars.map((car, index) => {
                      const makeName = makes.find(item => item.pkMakeId === car.selectedMakeId)?.make ?? '—'
                      const modelName = car.selectedModelId ? (modelNameCache[car.selectedModelId] ?? '—') : '—'
                      const variantName = car.fkVariantId ? (variantNameCache[car.fkVariantId] ?? '—') : '—'

                      return (
                        <tr key={car.inquiryCarDetailsId ?? `inquiry-car-${index}`}>
                          <td className="px-3 py-2 text-gray-700">{makeName}</td>
                          <td className="px-3 py-2 text-gray-700">{modelName}</td>
                          <td className="px-3 py-2 text-gray-700">{variantName}</td>
                          <td className="px-3 py-2 text-gray-700">{car.subVariant.trim() || '—'}</td>
                          <td className="px-3 py-2 text-gray-700">{car.carYear ?? '—'}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button type="button" onClick={() => moveInquiryCar(index, -1)} disabled={index === 0} className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">Up</button>
                              <button type="button" onClick={() => moveInquiryCar(index, 1)} disabled={index === editInquiryForm.inquiryCars.length - 1} className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">Down</button>
                              <button type="button" onClick={() => editInquiryCar(index)} className="rounded border border-blue-200 px-2 py-1 text-xs text-blue-700 transition hover:bg-blue-50">Edit</button>
                              <button type="button" onClick={() => removeInquiryCar(index)} className="rounded border border-red-200 px-2 py-1 text-xs text-red-700 transition hover:bg-red-50">Delete</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Budget of customer" type="number" value={editInquiryForm.budgetOfCustomer ?? ''} onChange={e => updateInquiryField('budgetOfCustomer', e.target.value ? Number(e.target.value) : null)} error={editInquiryErrors.budgetOfCustomer} />
              <Select label="Classification*" value={editInquiryForm.classification} onChange={e => updateInquiryField('classification', e.target.value)}>
                {INQUIRY_CLASSIFICATIONS.map(item => <option key={item}>{item}</option>)}
              </Select>
              <Input label="Visited Date of customer" type="date" value={editInquiryForm.visitedDateOfCustomer} onChange={e => updateInquiryField('visitedDateOfCustomer', e.target.value)} error={editInquiryErrors.visitedDateOfCustomer} />
              <Select label="Status*#" value={editInquiryForm.status} onChange={e => updateInquiryField('status', e.target.value)}>
                {INQUIRY_STATUSES.map(item => <option key={item}>{item}</option>)}
              </Select>
              <div>
                <Input label="Sub Status" list="followup-edit-inquiry-sub-status-suggestions" value={editInquiryForm.subStatus} onChange={e => updateInquiryField('subStatus', e.target.value)} />
                <datalist id="followup-edit-inquiry-sub-status-suggestions">
                  {SUB_STATUS_SUGGESTIONS.map(item => <option key={item} value={item} />)}
                </datalist>
              </div>
              <Input label="FollowUp Date" type="date" value={editInquiryForm.followUpDate} onChange={e => updateInquiryField('followUpDate', e.target.value)} error={editInquiryErrors.followUpDate} />
            </div>

            <Textarea label="Remark" value={editInquiryForm.remark} onChange={e => updateInquiryField('remark', e.target.value)} placeholder="Notes about this inquiry..." />

            {editInquiryError ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{editInquiryError}</div> : null}

            <div className="flex justify-end gap-3 pt-2">
              <Btn variant="outline" onClick={closeInquiryEdit}>Cancel</Btn>
              <Btn onClick={saveInquiryEdit} disabled={isPending}>{isPending ? 'Saving...' : 'Save Inquiry'}</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
