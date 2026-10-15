'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, X, Car, IndianRupee, Download, Eye, Loader2 } from 'lucide-react'
import { Badge, Btn, Input, Select, Textarea, Modal, Table, PageHeader, SearchBar, ConfirmDialog } from '@/components/ui'
import { CatalogTextPicker } from '@/components/CatalogTextPicker'
import { CustomerPicker } from '@/components/CustomerPicker'
import { PartnerPicker } from '@/components/PartnerPicker'
import {
  createRto, updateRto, deleteRto, logRtoPayment,
  type RtoFormInput, type LogRtoPaymentInput,
} from './actions'
import { PAYMENT_STATUSES, RC_STATUSES, TRANSFER_STATUSES, CAR_TYPES } from './queries'
import { isValidEmail, isValidPhone, isValidYear } from '@/lib/validation'

interface CustomerOption { custId: number; custName: string; custMobile: string | null; custEmail: string | null }
interface PartnerOption { partnerId: number; name: string; mobile: string | null; email: string | null }
interface CarMakeMaster { pkMakeId: number; make: string | null }
interface CarModelMaster { pkModelId: number; model: string | null }
interface CarVariantMaster { pkVariantId: number; variant: string | null }
interface Vehicle {
  inventoryId: number
  fkVariantId: number | null
  registrationNo: string | null
  sku: string | null
  year: number | null
  carVariantMaster: {
    variant: string | null
    carMakeMaster: { make: string | null } | null
    carModelMaster: { model: string | null } | null
  } | null
}

interface RtoRow {
  rtoAgentMainId: number
  inventoryId: number | null
  agentNameLegacy: string | null
  agentMobileNoLegacy: string | null
  agentEmailIdLegacy: string | null
  customerId: number | null
  customerNameLegacy: string | null
  customerMobLegacy: string | null
  customerEmailLegacy: string | null
  carType: string | null
  carMakeLegacy: string | null
  carModelLegacy: string | null
  carVariantLegacy: string | null
  carYear: number | null
  carRegistrationNo: string | null
  dateOfEntry: Date | string | null
  transferCharges: string | null
  amtPaid: string | null
  paymentStatus: string | null
  paymentDate: Date | string | null
  rcStatus: string | null
  transferStatus: string | null
  followupDate: Date | string | null
  remark: string | null
  fkVariantId: number | null
  fkPartnerId: number | null
  customer: CustomerOption | null
  partnerMaster: PartnerOption | null
  createdByUser: { userName: string | null; displayName: string | null } | null
  updatedByUser: { userName: string | null; displayName: string | null } | null
  createdDt: Date | string | null
  updatedDt: Date | string | null
}

interface PaymentHistoryEntry {
  rtoPaymentId: number
  paymentDate: string | null
  createdDt: string | null
  amountPaid: string | null
  paymentStatus: string | null
  rcStatus: string | null
  transferStatus: string | null
}
interface FollowupHistoryEntry {
  rtoFollowupId: number
  followupDate: string | null
  remark: string | null
}

interface RtoFilters {
  search: string
  registrationNo: string
  customerName: string
  customerMobile: string
  customerEmail: string
  agentName: string
  agentMobile: string
  agentEmail: string
  carType: string
  carYear: string
  make: string
  model: string
  variant: string
  paymentStatus: string
  rcStatus: string
  transferStatus: string
  fromDate: string
  toDate: string
}

const JUNK_VALUES = new Set(['null', 'na', 'n/a'])
const clean = (v: string | null | undefined) => (!v || JUNK_VALUES.has(v.trim().toLowerCase()) ? '' : v)
const fmtDate = (d: Date | string | null) => d ? new Date(d).toISOString().slice(0, 10) : ''
const fmtDateTime = (d: Date | string | null) => d ? new Date(d).toLocaleString('en-IN') : ''
const fmtMoney = (n: string | number | null) => n ? `₹${Number(n).toLocaleString('en-IN')}` : '—'
const todayForInput = () => {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

function paymentSummary(row: Pick<RtoRow, 'transferCharges' | 'amtPaid'>) {
  const charges = Number(row.transferCharges ?? 0)
  const paid = Number(row.amtPaid ?? 0)
  const balance = Math.max(charges - paid, 0)
  const status = paid <= 0 ? 'Pending' : charges > 0 && paid >= charges ? 'Fully Paid' : 'Partially Paid'
  const progress = charges > 0 ? Math.min((paid / charges) * 100, 100) : 0
  return { charges, paid, balance, status, progress }
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

const normalizeRegistrationNo = (value: string | null | undefined) => clean(value).toUpperCase().replace(/[^A-Z0-9]/g, '')

function buildRtoExportFileName(rows: RtoRow[], filters: RtoFilters) {
  const today = new Date().toISOString().slice(0, 10)
  const hasFilters = Object.values(filters).some(v => v && v !== 'All')
  const parts = ['rto']
  if (hasFilters) parts.push('filtered')
  if (!hasFilters) parts.push(`${rows.length}-rows`)
  parts.push(today)
  return `${parts.map(slugify).filter(Boolean).join('-')}.csv`
}

function exportRtoCsv(rows: RtoRow[], filters: RtoFilters) {
  const headers = [
    'RTO ID',
    'Linked Inventory ID',
    'Linked Customer ID',
    'Linked Agent ID',
    'Linked Variant ID',
    'Entry Date',
    'Customer Name',
    'Customer Mobile',
    'Customer Email',
    'Agent Name',
    'Agent Mobile',
    'Agent Email',
    'Registration No',
    'Car Type',
    'Make',
    'Model',
    'Variant',
    'Car Year',
    'Transfer Charges',
    'Total Amount Paid',
    'Payment Status',
    'Payment Date',
    'RC Status',
    'Transfer Status',
    'Follow-up Date',
    'Remark',
  ]

  const lines = [headers.map(csvValue).join(',')]
  for (const row of rows) {
    lines.push([
      row.rtoAgentMainId,
      row.inventoryId,
      row.customer?.custId ?? row.customerId,
      row.fkPartnerId,
      row.fkVariantId,
      fmtDate(row.dateOfEntry),
      row.customer?.custName ?? row.customerNameLegacy,
      row.customer?.custMobile ?? row.customerMobLegacy,
      row.customer?.custEmail ?? row.customerEmailLegacy,
      row.partnerMaster?.name ?? row.agentNameLegacy,
      row.partnerMaster?.mobile ?? row.agentMobileNoLegacy,
      row.partnerMaster?.email ?? row.agentEmailIdLegacy,
      row.carRegistrationNo,
      row.carType,
      row.carMakeLegacy,
      row.carModelLegacy,
      row.carVariantLegacy,
      row.carYear,
      row.transferCharges,
      row.amtPaid,
      row.paymentStatus,
      fmtDate(row.paymentDate),
      row.rcStatus,
      row.transferStatus,
      fmtDate(row.followupDate),
      row.remark,
    ].map(csvValue).join(','))
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = buildRtoExportFileName(rows, filters)
  link.click()
  URL.revokeObjectURL(url)
}

function vehicleLabel(v: Vehicle) {
  const parts = [clean(v.carVariantMaster?.carMakeMaster?.make), clean(v.carVariantMaster?.carModelMaster?.model), clean(v.carVariantMaster?.variant)].filter(Boolean)
  return `${v.registrationNo ?? v.sku ?? '—'} — ${parts.join(' ')}`
}

function emptyForm(): RtoFormInput {
  return {
    partnerId: null, agentNameLegacy: '', agentMobileNoLegacy: '', agentEmailIdLegacy: '',
    customerId: null, customerNameLegacy: '', customerMobLegacy: '', customerEmailLegacy: '',
    inventoryId: null, variantId: null, registrationNo: '', carType: 'PreOwned', carMakeLegacy: '', carModelLegacy: '', carVariantLegacy: '', carYear: null,
    dateOfEntry: new Date().toISOString().slice(0, 10),
    transferCharges: null,
    amountPaid: null,
    paymentStatus: 'Pending', paymentDate: '', rcStatus: 'Pending', transferStatus: 'Pending',
    followupDate: '', remark: '',
  }
}

function emptyPayment(): LogRtoPaymentInput {
  return { amountPaid: null, paymentStatus: 'Pending', rcStatus: 'Pending', transferStatus: 'Pending', nextFollowUpDate: '', remark: '' }
}

function emptyFilters(): RtoFilters {
  return {
    search: '',
    registrationNo: '',
    customerName: '',
    customerMobile: '',
    customerEmail: '',
    agentName: '',
    agentMobile: '',
    agentEmail: '',
    carType: 'All',
    carYear: '',
    make: '',
    model: '',
    variant: '',
    paymentStatus: 'All',
    rcStatus: 'All',
    transferStatus: 'All',
    fromDate: '',
    toDate: '',
  }
}

export function RtoClient({
  initialData,
  vehicles,
  makes,
  initialSearch = '',
  initialRegistrationNo = '',
}: {
  initialData: RtoRow[]
  vehicles: Vehicle[]
  makes: CarMakeMaster[]
  initialSearch?: string
  initialRegistrationNo?: string
}) {
  const [data, setData] = useState(initialData)
  const [filters, setFilters] = useState<RtoFilters>(() => ({
    ...emptyFilters(),
    search: initialSearch,
    registrationNo: initialRegistrationNo,
  }))
  const [draftFilters, setDraftFilters] = useState<RtoFilters>(() => ({
    ...emptyFilters(),
    search: initialSearch,
    registrationNo: initialRegistrationNo,
  }))

  useEffect(() => {
    setFilters(previous => ({ ...previous, search: initialSearch, registrationNo: initialRegistrationNo }))
    setDraftFilters(previous => ({ ...previous, search: initialSearch, registrationNo: initialRegistrationNo }))
  }, [initialSearch, initialRegistrationNo])

  const [modal, setModal] = useState<null | 'add' | 'edit'>(null)
  const [viewRow, setViewRow] = useState<RtoRow | null>(null)
  const [viewTab, setViewTab] = useState<'overview' | 'activity' | 'record'>('overview')
  const [discardOpen, setDiscardOpen] = useState(false)
  const [savedFormSnapshot, setSavedFormSnapshot] = useState(JSON.stringify(emptyForm()))
  const [savedCustomerSnapshot, setSavedCustomerSnapshot] = useState('')
  const [savedAgentSnapshot, setSavedAgentSnapshot] = useState('')
  const [savedVehicleSnapshot, setSavedVehicleSnapshot] = useState('')
  const [form, setForm] = useState<RtoFormInput>(emptyForm())
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null)
  const [customerEntryMode, setCustomerEntryMode] = useState<'existing' | 'manual'>('existing')
  const [selectedAgent, setSelectedAgent] = useState<PartnerOption | null>(null)
  const [selectedMakeId, setSelectedMakeId] = useState<number | null>(null)
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null)
  const [models, setModels] = useState<CarModelMaster[]>([])
  const [variants, setVariants] = useState<CarVariantMaster[]>([])
  const [vehicleQuery, setVehicleQuery] = useState('')
  const [vehicleOpen, setVehicleOpen] = useState(false)
  const vehiclePickerRef = useRef<HTMLDivElement>(null)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [vehicleEntryMode, setVehicleEntryMode] = useState<'existing' | 'manual'>('manual')
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<Record<string, boolean>>({})
  const [isPending, startTransition] = useTransition()

  const [payRow, setPayRow] = useState<RtoRow | null>(null)
  const [payForm, setPayForm] = useState<LogRtoPaymentInput>(emptyPayment())
  const [payments, setPayments] = useState<PaymentHistoryEntry[]>([])
  const [followups, setFollowups] = useState<FollowupHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [exportError, setExportError] = useState('')
  const [isExporting, startExportTransition] = useTransition()
  const [showMoreFilters, setShowMoreFilters] = useState(false)

  useEffect(() => {
    if (!vehicleOpen) return
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!vehiclePickerRef.current?.contains(event.target as Node)) setVehicleOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [vehicleOpen])

  const hasUnsavedChanges = useMemo(() => {
    if (!modal) return false
    return (
      JSON.stringify(form) !== savedFormSnapshot ||
      optionSnapshot(selectedCustomer) !== savedCustomerSnapshot ||
      optionSnapshot(selectedAgent) !== savedAgentSnapshot ||
      optionSnapshot(selectedVehicle) !== savedVehicleSnapshot
    )
  }, [
    form,
    modal,
    savedAgentSnapshot,
    savedCustomerSnapshot,
    savedFormSnapshot,
    savedVehicleSnapshot,
    selectedAgent,
    selectedCustomer,
    selectedVehicle,
  ])

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase()
    return data.filter(r => {
      const customerName = clean(r.customer?.custName ?? r.customerNameLegacy)
      const customerMobile = clean(r.customer?.custMobile ?? r.customerMobLegacy)
      const customerEmail = clean(r.customer?.custEmail ?? r.customerEmailLegacy)
      const agentName = clean(r.partnerMaster?.name ?? r.agentNameLegacy)
      const agentMobile = clean(r.partnerMaster?.mobile ?? r.agentMobileNoLegacy)
      const agentEmail = clean(r.partnerMaster?.email ?? r.agentEmailIdLegacy)
      const registrationNo = clean(r.carRegistrationNo)
      const make = clean(r.carMakeLegacy)
      const model = clean(r.carModelLegacy)
      const variant = clean(r.carVariantLegacy)
      const entryDate = fmtDate(r.dateOfEntry)

      if (
        q &&
        !registrationNo.toLowerCase().includes(q) &&
        !customerName.toLowerCase().includes(q) &&
        !agentName.toLowerCase().includes(q) &&
        !make.toLowerCase().includes(q) &&
        !model.toLowerCase().includes(q) &&
        !variant.toLowerCase().includes(q)
      ) return false

      if (filters.registrationNo && !registrationNo.toLowerCase().includes(filters.registrationNo.toLowerCase())) return false
      if (filters.customerName && !customerName.toLowerCase().includes(filters.customerName.toLowerCase())) return false
      if (filters.customerMobile && !customerMobile.toLowerCase().includes(filters.customerMobile.toLowerCase())) return false
      if (filters.customerEmail && !customerEmail.toLowerCase().includes(filters.customerEmail.toLowerCase())) return false
      if (filters.agentName && !agentName.toLowerCase().includes(filters.agentName.toLowerCase())) return false
      if (filters.agentMobile && !agentMobile.toLowerCase().includes(filters.agentMobile.toLowerCase())) return false
      if (filters.agentEmail && !agentEmail.toLowerCase().includes(filters.agentEmail.toLowerCase())) return false
      if (filters.carType !== 'All' && (r.carType ?? '') !== filters.carType) return false
      if (filters.carYear && String(r.carYear ?? '') !== filters.carYear.trim()) return false
      if (filters.make && !make.toLowerCase().includes(filters.make.toLowerCase())) return false
      if (filters.model && !model.toLowerCase().includes(filters.model.toLowerCase())) return false
      if (filters.variant && !variant.toLowerCase().includes(filters.variant.toLowerCase())) return false
      if (filters.paymentStatus !== 'All' && paymentSummary(r).status !== filters.paymentStatus) return false
      if (filters.rcStatus !== 'All' && (r.rcStatus ?? '') !== filters.rcStatus) return false
      if (filters.transferStatus !== 'All' && (r.transferStatus ?? '') !== filters.transferStatus) return false
      if (filters.fromDate && (!entryDate || entryDate < filters.fromDate)) return false
      if (filters.toDate && (!entryDate || entryDate > filters.toDate)) return false

      return true
    })
  }, [data, filters])

  const vehicleMatches = useMemo(() => {
    const q = vehicleQuery.toLowerCase()
    if (!q) return vehicles.slice(0, 20)
    return vehicles.filter(v => vehicleLabel(v).toLowerCase().includes(q)).slice(0, 20)
  }, [vehicles, vehicleQuery])

  const matchedMake = useMemo(() => {
    const make = form.carMakeLegacy.trim().toLowerCase()
    if (!make) return null
    return makes.find(option => clean(option.make).toLowerCase() === make) ?? null
  }, [form.carMakeLegacy, makes])

  const makeOptions = useMemo(
    () => makes.map(option => clean(option.make)).filter(Boolean),
    [makes],
  )

  const modelOptions = useMemo(
    () => models.map(option => clean(option.model)).filter(Boolean),
    [models],
  )

  const variantOptions = useMemo(
    () => variants.map(option => clean(option.variant)).filter(Boolean),
    [variants],
  )

  const registrationOptions = useMemo(() => {
    const seen = new Set<string>()
    const options: string[] = []
    for (const vehicle of vehicles) {
      const registration = clean(vehicle.registrationNo)
      const normalized = normalizeRegistrationNo(registration)
      if (!registration || !normalized || seen.has(normalized)) continue
      seen.add(normalized)
      options.push(registration)
    }
    return options
  }, [vehicles])

  useEffect(() => {
    const nextMakeId = matchedMake?.pkMakeId ?? null
    if (selectedMakeId === nextMakeId) return
    setSelectedMakeId(nextMakeId)
  }, [matchedMake, selectedMakeId])

  useEffect(() => {
    let ignore = false

    if (!selectedMakeId) {
      setModels([])
      setSelectedModelId(null)
      setVariants([])
      setForm(prev => (prev.variantId === null ? prev : { ...prev, variantId: null }))
      return
    }

    ;(async () => {
      const res = await fetch(`/api/catalog/models?makeId=${selectedMakeId}`)
      const payload = await res.json()
      if (ignore) return
      const nextModels: CarModelMaster[] = Array.isArray(payload) ? payload : []
      setModels(nextModels)

      const currentModel = form.carModelLegacy.trim().toLowerCase()
      const exactModel = nextModels.find(option => clean(option.model).toLowerCase() === currentModel) ?? null
      setSelectedModelId(exactModel?.pkModelId ?? null)

      if (!exactModel) {
        setVariants([])
        setForm(prev => (prev.variantId === null ? prev : { ...prev, variantId: null }))
      }
    })()

    return () => { ignore = true }
  }, [form.carModelLegacy, selectedMakeId])

  useEffect(() => {
    let ignore = false

    if (!selectedModelId) {
      setVariants([])
      setForm(prev => (prev.variantId === null ? prev : { ...prev, variantId: null }))
      return
    }

    ;(async () => {
      const res = await fetch(`/api/catalog/variants?modelId=${selectedModelId}`)
      const payload = await res.json()
      if (ignore) return
      const nextVariants: CarVariantMaster[] = Array.isArray(payload) ? payload : []
      setVariants(nextVariants)

      const currentVariant = form.carVariantLegacy.trim().toLowerCase()
      const exactVariant = nextVariants.find(option => clean(option.variant).toLowerCase() === currentVariant) ?? null
      setForm(prev => {
        const nextVariantId = exactVariant?.pkVariantId ?? null
        return prev.variantId === nextVariantId ? prev : { ...prev, variantId: nextVariantId }
      })
    })()

    return () => { ignore = true }
  }, [form.carVariantLegacy, selectedModelId])

  const resetVehicle = () => { setSelectedVehicle(null); setVehicleQuery(''); setVehicleOpen(false) }

  const closeForm = () => {
    setModal(null)
    setDiscardOpen(false)
    setError('')
    setErrors({})
  }

  const requestCloseForm = () => {
    if (isPending) return
    if (hasUnsavedChanges) {
      setDiscardOpen(true)
      return
    }
    closeForm()
  }

  const openAdd = () => {
    const empty = emptyForm()
    setForm(empty)
    setSelectedCustomer(null)
    setCustomerEntryMode('existing')
    setSelectedAgent(null)
    setSelectedMakeId(null)
    setSelectedModelId(null)
    setModels([])
    setVariants([])
    resetVehicle()
    setVehicleEntryMode('manual')
    setEditId(null)
    setError('')
    setSavedFormSnapshot(JSON.stringify(empty))
    setSavedCustomerSnapshot(optionSnapshot(null))
    setSavedAgentSnapshot(optionSnapshot(null))
    setSavedVehicleSnapshot(optionSnapshot(null))
    setModal('add')
  }

  const openEdit = (r: RtoRow) => {
    const editForm = {
      partnerId: r.fkPartnerId,
      agentNameLegacy: r.partnerMaster?.name ?? r.agentNameLegacy ?? '',
      agentMobileNoLegacy: r.partnerMaster?.mobile ?? r.agentMobileNoLegacy ?? '',
      agentEmailIdLegacy: r.partnerMaster?.email ?? r.agentEmailIdLegacy ?? '',
      customerId: r.customerId,
      customerNameLegacy: r.customerNameLegacy ?? '', customerMobLegacy: r.customerMobLegacy ?? '', customerEmailLegacy: r.customerEmailLegacy ?? '',
      inventoryId: r.inventoryId,
      variantId: r.fkVariantId,
      registrationNo: r.carRegistrationNo ?? '',
      carType: r.carType ?? 'PreOwned',
      carMakeLegacy: clean(r.carMakeLegacy), carModelLegacy: clean(r.carModelLegacy), carVariantLegacy: clean(r.carVariantLegacy), carYear: r.carYear,
      dateOfEntry: fmtDate(r.dateOfEntry),
      transferCharges: r.transferCharges ? Number(r.transferCharges) : null,
      amountPaid: r.amtPaid ? Number(r.amtPaid) : null,
      paymentStatus: r.paymentStatus ?? 'Pending',
      paymentDate: fmtDate(r.paymentDate),
      rcStatus: r.rcStatus ?? 'Pending',
      transferStatus: r.transferStatus ?? 'Pending',
      followupDate: fmtDate(r.followupDate),
      remark: r.remark ?? '',
    }
    setForm(editForm)
    const cust = r.customer
    const partner = r.partnerMaster
    const veh = vehicles.find(v => v.inventoryId === r.inventoryId) ?? null
    setSelectedCustomer(cust)
    setCustomerEntryMode(cust ? 'existing' : 'manual')
    setSelectedAgent(partner)
    setSelectedVehicle(veh)
    setVehicleEntryMode(veh ? 'existing' : 'manual')
    setSelectedMakeId(null)
    setSelectedModelId(null)
    setModels([])
    setVariants([])
    setVehicleQuery('')
    setEditId(r.rtoAgentMainId)
    setError('')
    setSavedFormSnapshot(JSON.stringify(editForm))
    setSavedCustomerSnapshot(optionSnapshot(cust))
    setSavedAgentSnapshot(optionSnapshot(partner))
    setSavedVehicleSnapshot(optionSnapshot(veh))
    setModal('edit')
  }

  const selectVehicle = (v: Vehicle) => {
    setVehicleEntryMode('existing')
    setSelectedVehicle(v)
    setVehicleOpen(false)
    setVehicleQuery('')
    setForm(f => ({
      ...f,
      inventoryId: v.inventoryId,
      variantId: v.fkVariantId,
      carMakeLegacy: clean(v.carVariantMaster?.carMakeMaster?.make),
      carModelLegacy: clean(v.carVariantMaster?.carModelMaster?.model),
      carVariantLegacy: clean(v.carVariantMaster?.variant),
      carYear: v.year,
      registrationNo: v.registrationNo ?? f.registrationNo,
    }))
  }

  const onCustomerChange = (c: CustomerOption | null) => {
    setCustomerEntryMode('existing')
    setSelectedCustomer(c)
    setForm(f => ({
      ...f,
      customerId: c?.custId ?? null,
      customerNameLegacy: c?.custName ?? f.customerNameLegacy,
      customerMobLegacy: c?.custMobile ?? f.customerMobLegacy,
      customerEmailLegacy: c?.custEmail ?? f.customerEmailLegacy,
    }))
  }

  const onAgentChange = (p: PartnerOption | null) => {
    setSelectedAgent(p)
    setForm(f => ({
      ...f,
      partnerId: p?.partnerId ?? null,
      agentNameLegacy: p?.name ?? f.agentNameLegacy,
      agentMobileNoLegacy: p?.mobile ?? f.agentMobileNoLegacy,
      agentEmailIdLegacy: p?.email ?? f.agentEmailIdLegacy,
    }))
  }

  const onRegistrationChange = (value: string) => {
    if (vehicleEntryMode === 'manual') {
      setForm(prev => ({ ...prev, registrationNo: value, inventoryId: null, variantId: null }))
      return
    }
    const normalized = normalizeRegistrationNo(value)
    const match = normalized
      ? vehicles.find(vehicle => normalizeRegistrationNo(vehicle.registrationNo) === normalized) ?? null
      : null

    if (match) {
      setForm(prev => ({ ...prev, registrationNo: value }))
      selectVehicle(match)
      return
    }

    setForm(prev => ({ ...prev, registrationNo: value, inventoryId: null, variantId: null }))
    if (selectedVehicle && normalizeRegistrationNo(selectedVehicle.registrationNo) !== normalized) {
      setSelectedVehicle(null)
    }
  }

  const f = <K extends keyof RtoFormInput>(k: K, v: RtoFormInput[K]) => setForm(prev => ({ ...prev, [k]: v }))
  const setFilter = <K extends keyof RtoFilters>(k: K, v: RtoFilters[K]) => setDraftFilters(prev => ({ ...prev, [k]: v }))
  const applyFilters = () => setFilters(draftFilters)
  const resetFilters = () => {
    const nextFilters = emptyFilters()
    setFilters(nextFilters)
    setDraftFilters(nextFilters)
  }
  const save = () => {
    setError('')
    const newErrors: Record<string, boolean> = {}
    const amountPaid = form.amountPaid ?? 0
    const hasInitialPayment = !editId && amountPaid > 0

    if (vehicleEntryMode === 'existing' && !form.inventoryId) newErrors.inventoryId = true
    if (vehicleEntryMode === 'manual' && !form.registrationNo?.trim()) newErrors.registrationNo = true
    if (!form.partnerId && !form.agentNameLegacy?.trim()) {
      newErrors.partnerId = true
    }
    if (customerEntryMode === 'existing' && !form.customerId) newErrors.customer = true
    if (customerEntryMode === 'manual' && !form.customerNameLegacy?.trim()) newErrors.customerNameLegacy = true
    if (form.transferCharges !== null && form.transferCharges < 0) {
      newErrors.transferCharges = true
    }
    if (form.amountPaid !== null && form.amountPaid < 0) {
      newErrors.amountPaid = true
    }
    if (form.followupDate && form.followupDate < todayForInput()) {
      newErrors.followupDate = true
    }
    if (!form.remark.trim()) {
      newErrors.remark = true
    }
    if (hasInitialPayment) {
      if (form.transferCharges === null) {
        newErrors.transferCharges = true
      } else if (amountPaid > form.transferCharges) {
        newErrors.amountPaid = true
      }
      if (!form.paymentDate?.trim()) {
        newErrors.paymentDate = true
      }
      if (!form.paymentStatus) {
        newErrors.paymentStatus = true
      }
      if (!form.rcStatus) {
        newErrors.rcStatus = true
      }
      if (!form.transferStatus) {
        newErrors.transferStatus = true
      }
    }
    if (form.carYear !== null && !isValidYear(form.carYear)) {
      newErrors.carYear = true
    }
    if (form.agentMobileNoLegacy && !isValidPhone(form.agentMobileNoLegacy)) {
      newErrors.agentMobileNoLegacy = true
    }
    if (form.agentEmailIdLegacy && !isValidEmail(form.agentEmailIdLegacy)) {
      newErrors.agentEmailIdLegacy = true
    }
    if (customerEntryMode === 'manual' && form.customerMobLegacy && !isValidPhone(form.customerMobLegacy)) {
      newErrors.customerMobLegacy = true
    }
    if (customerEntryMode === 'manual' && form.customerEmailLegacy && !isValidEmail(form.customerEmailLegacy)) {
      newErrors.customerEmailLegacy = true
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setErrors({})

    startTransition(async () => {
      const result = editId ? await updateRto(editId, form) : await createRto(form)
      if (!result.success) {
        setError(result.error ?? 'Something went wrong.')
        return
      }
      closeForm()
      window.location.reload()
    })
  }

  const del = () => {
    if (!deleteId) return
    startTransition(async () => {
      const result = await deleteRto(deleteId)
      if (result.success) {
        setData(prev => prev.filter(r => r.rtoAgentMainId !== deleteId))
      } else {
        setError(result.error ?? 'Could not delete this record.')
      }
      setDeleteId(null)
    })
  }

  const loadHistory = async (rtoAgentMainId: number) => {
    setPayments([])
    setFollowups([])
    setHistoryLoading(true)
    try {
      const res = await fetch(`/api/rto/history?rtoAgentMainId=${rtoAgentMainId}`)
      const hist = await res.json()
      if (!res.ok) throw new Error(hist.error ?? 'Could not load RTO history.')
      setPayments(hist.payments ?? [])
      setFollowups(hist.followups ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load RTO history.')
    } finally {
      setHistoryLoading(false)
    }
  }

  const openView = async (r: RtoRow) => {
    setViewRow(r)
    setViewTab('overview')
    setError('')
    await loadHistory(r.rtoAgentMainId)
  }

  const openPay = async (r: RtoRow) => {
    setPayRow(r)
    setPayForm({
      ...emptyPayment(),
      paymentStatus: r.paymentStatus ?? 'Pending',
      rcStatus: r.rcStatus ?? 'Pending',
      transferStatus: r.transferStatus ?? 'Pending',
    })
    setError('')
    setErrors({})
    await loadHistory(r.rtoAgentMainId)
  }

  const pf = <K extends keyof LogRtoPaymentInput>(k: K, v: LogRtoPaymentInput[K]) => setPayForm(prev => ({ ...prev, [k]: v }))

  const savePayment = () => {
    if (!payRow) return
    setError('')
    const newErrors: Record<string, boolean> = {}

    // Prefer the loaded payment ledger over the cached total on the RTO job.
    const totalPaidAlready = payments.length > 0
      ? payments.reduce((sum, payment) => sum + Number(payment.amountPaid ?? 0), 0)
      : Number(payRow.amtPaid ?? 0)
    const charges = Number(payRow.transferCharges ?? 0)
    const statusOnlyUpdate = payForm.amountPaid === null && charges > 0 && totalPaidAlready >= charges
    if (!statusOnlyUpdate) {
      if (payForm.amountPaid === null || payForm.amountPaid <= 0 || charges <= 0 || (payForm.amountPaid !== null && totalPaidAlready + payForm.amountPaid > charges)) {
        newErrors.amountPaid = true
      }
    }
    const resultingPayment = paymentSummary({
      transferCharges: payRow.transferCharges,
      amtPaid: String(totalPaidAlready + (payForm.amountPaid ?? 0)),
    })
    if (!statusOnlyUpdate && resultingPayment.status !== 'Fully Paid') {
      if (!payForm.nextFollowUpDate?.trim()) {
        newErrors.nextFollowUpDate = true
      } else {
        const today = todayForInput()
        if (payForm.nextFollowUpDate < today) {
          newErrors.nextFollowUpDate = true
        }
      }
    }
    if (!payForm.remark?.trim()) {
      newErrors.remark = true
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setErrors({})

    startTransition(async () => {
      const result = await logRtoPayment(payRow.rtoAgentMainId, payForm)
      if (!result.success) {
        setError(result.error ?? 'Something went wrong.')
        return
      }
      setPayRow(null)
      window.location.reload()
    })
  }

  const exportRows = () => {
    setExportError('')
    startExportTransition(async () => {
      try {
        exportRtoCsv(filtered, filters)
      } catch (err) {
        setExportError(err instanceof Error ? err.message : 'Could not export RTO records.')
      }
    })
  }

  return (
    <div>
      <PageHeader
        title="RTO Management"
        subtitle={`${filtered.length} transfer jobs`}
        action={
          <div className="flex items-center gap-2">
            <Btn variant="outline" size="sm" onClick={exportRows} disabled={isExporting || filtered.length === 0}>
              <Download className="w-3.5 h-3.5" />
              {isExporting ? 'Exporting...' : `${Object.values(filters).some(v => v && v !== 'All') ? 'Export Filtered' : 'Export All'} (${filtered.length})`}
            </Btn>
            <Btn size="sm" onClick={openAdd}>
              <Plus className="w-3.5 h-3.5" />Add RTO Job
            </Btn>
          </div>
        }
      />

      <form onSubmit={event => { event.preventDefault(); applyFilters() }} className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3">
          <div className="text-sm font-semibold text-gray-900">Filters</div>
          <div className="text-xs text-gray-500">Use any combination below. Export follows the same filters.</div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Quick search</label>
            <SearchBar
              value={draftFilters.search}
              onChange={value => setFilter('search', value)}
              placeholder="Reg no, customer, agent..."
            />
          </div>
            <Select label="RC Status" value={draftFilters.rcStatus} onChange={e => setFilter('rcStatus', e.target.value)}>
              <option>All</option>
              {RC_STATUSES.map(s => <option key={s}>{s}</option>)}
            </Select>
            <Select label="Transfer Status" value={draftFilters.transferStatus} onChange={e => setFilter('transferStatus', e.target.value)}>
              <option>All</option>
              {TRANSFER_STATUSES.map(s => <option key={s}>{s}</option>)}
            </Select>
            <Select label="Payment Status" value={draftFilters.paymentStatus} onChange={e => setFilter('paymentStatus', e.target.value)}>
              <option>All</option>
              {PAYMENT_STATUSES.map(s => <option key={s}>{s}</option>)}
            </Select>
            <Input label="From Entry Date" type="date" value={draftFilters.fromDate} onChange={e => setFilter('fromDate', e.target.value)} />
            <Input label="To Entry Date" type="date" value={draftFilters.toDate} onChange={e => setFilter('toDate', e.target.value)} />

          {showMoreFilters && (
            <div className="col-span-full grid gap-3 border-t border-gray-200 pt-3 md:grid-cols-2 xl:grid-cols-6">
                <Input label="Registration No" value={draftFilters.registrationNo} onChange={e => setFilter('registrationNo', e.target.value)} />
                <Input label="Customer Name" value={draftFilters.customerName} onChange={e => setFilter('customerName', e.target.value)} />
                <Input label="Customer Mobile" value={draftFilters.customerMobile} onChange={e => setFilter('customerMobile', e.target.value)} />
                <Input label="Customer Email" value={draftFilters.customerEmail} onChange={e => setFilter('customerEmail', e.target.value)} />
                <Input label="Agent Name" value={draftFilters.agentName} onChange={e => setFilter('agentName', e.target.value)} />
                <Input label="Agent Mobile" value={draftFilters.agentMobile} onChange={e => setFilter('agentMobile', e.target.value)} />
                <Input label="Agent Email" value={draftFilters.agentEmail} onChange={e => setFilter('agentEmail', e.target.value)} />
                <Select label="Car Type" value={draftFilters.carType} onChange={e => setFilter('carType', e.target.value)}>
                  <option>All</option>
                  {CAR_TYPES.map(c => <option key={c}>{c}</option>)}
                </Select>
                <Input label="Year" value={draftFilters.carYear} onChange={e => setFilter('carYear', e.target.value)} />
                <Input label="Make" value={draftFilters.make} onChange={e => setFilter('make', e.target.value)} />
                <Input label="Model" value={draftFilters.model} onChange={e => setFilter('model', e.target.value)} />
                <Input label="Variant" value={draftFilters.variant} onChange={e => setFilter('variant', e.target.value)} />
            </div>
          )}
          <div className="col-span-full flex flex-wrap items-center gap-2 pt-1">
            <Btn type="submit" className="justify-center whitespace-nowrap">Apply filters</Btn>
            <Btn type="button" variant="outline" className="whitespace-nowrap" onClick={resetFilters}>Reset</Btn>
            <Btn type="button" variant="outline" className="whitespace-nowrap" onClick={() => setShowMoreFilters(value => !value)}>
              {showMoreFilters ? 'Hide more' : 'More filters'}
            </Btn>
          </div>
        </div>
      </form>
      <div className="mb-4 text-sm text-gray-500">Showing {filtered.length} of {data.length} transfer jobs</div>

      {exportError && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{exportError}</div>}

      <Table headers={['Registration & Vehicle', 'Customer / Agent', 'Payment', 'RC', 'Transfer', 'Follow-up', 'Actions']} empty={filtered.length === 0} minWidthClass="min-w-full">
        {filtered.map(r => {
          const payment = paymentSummary(r)
          return (
            <tr key={r.rtoAgentMainId} className="transition hover:bg-gray-50">
              <td className="px-3 py-3">
                <div className="font-mono text-sm font-semibold text-gray-900">{r.carRegistrationNo ?? '—'}</div>
                <div className="mt-0.5 text-xs text-gray-500">{[r.carMakeLegacy, r.carModelLegacy, r.carVariantLegacy, r.carYear].filter(Boolean).join(' · ') || '—'}</div>
              </td>
              <td className="px-3 py-3 text-xs">
                <div className="font-medium text-gray-800">{r.customer?.custName ?? r.customerNameLegacy ?? '—'}</div>
                <div className="mt-0.5 text-gray-500">{r.customer?.custMobile ?? r.customerMobLegacy ?? '—'}</div>
                <div className="mt-1 font-medium text-gray-700">{r.partnerMaster?.name ?? r.agentNameLegacy ?? '—'}</div>
              </td>
              <td className="px-3 py-3">
                <div className="mb-1"><Badge label={payment.status} /></div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs leading-4">
                  <div><span className="block whitespace-nowrap text-gray-400">Charges</span><span className="whitespace-nowrap font-semibold text-gray-800">{fmtMoney(r.transferCharges)}</span></div>
                  <div><span className="block whitespace-nowrap text-gray-400">Paid</span><span className="whitespace-nowrap font-semibold text-green-700">{fmtMoney(r.amtPaid)}</span></div>
                  <div className="col-span-2"><span className="block whitespace-nowrap text-gray-400">Balance</span><span className="whitespace-nowrap font-semibold text-amber-700">{payment.charges ? fmtMoney(payment.balance) : '—'}</span></div>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-green-500" style={{ width: `${payment.progress}%` }} /></div>
              </td>
              <td className="px-3 py-3">{r.rcStatus ? <Badge label={r.rcStatus} /> : '—'}</td>
              <td className="px-3 py-3">{r.transferStatus ? <Badge label={r.transferStatus} /> : '—'}</td>
              <td className="px-3 py-3 text-xs font-medium text-gray-600 whitespace-nowrap">{fmtDate(r.followupDate) || 'Not scheduled'}</td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-0.5">
                  <button onClick={() => void openView(r)} className="inline-flex rounded-md p-2 text-gray-700 transition hover:bg-gray-50" title="View details"><Eye className="h-4 w-4" /></button>
                  <button onClick={() => openPay(r)} className="p-1.5 text-gray-400 hover:bg-green-50 hover:text-green-600 rounded transition" title="Log payment"><IndianRupee className="w-3.5 h-3.5" /></button>
                  <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:bg-blue-50 hover:text-[#1B2A6B] rounded transition" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setDeleteId(r.rtoAgentMainId)} className="p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded transition" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </td>
            </tr>
          )
        })}
      </Table>

      {/* View Modal */}
      <Modal title={`View RTO Job — ${viewRow?.carRegistrationNo ?? ''}`} open={!!viewRow} onClose={() => setViewRow(null)} width="max-w-4xl">
        {viewRow && (
          <div className="space-y-5">
            <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2"><span className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-[#1B2A6B] shadow-sm">{viewRow.carRegistrationNo ?? 'RTO job'}</span><span className="rounded-md bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">{viewRow.carType ?? 'Vehicle'}</span></div>
                  <div className="mt-3 text-2xl font-bold text-gray-900">{viewRow.customer?.custName ?? viewRow.customerNameLegacy ?? 'Customer not added'}</div>
                  <div className="mt-1 text-sm text-gray-600">{[clean(viewRow.carMakeLegacy), clean(viewRow.carModelLegacy), clean(viewRow.carVariantLegacy), viewRow.carYear].filter(Boolean).join(' · ') || 'Vehicle details unavailable'} <span className="mx-1 text-gray-300">•</span> RTO job #{viewRow.rtoAgentMainId}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex flex-wrap justify-end gap-1"><Badge label={paymentSummary(viewRow).status} /><Badge label={`RC: ${viewRow.rcStatus ?? 'Pending'}`} /><Badge label={`Transfer: ${viewRow.transferStatus ?? 'Pending'}`} /></div>
                  <div className="flex flex-wrap gap-2"><Btn size="sm" variant="outline" onClick={() => { setViewRow(null); openEdit(viewRow) }}>Edit</Btn><Btn size="sm" onClick={() => { setViewRow(null); void openPay(viewRow) }}>Log payment</Btn></div>
                </div>
              </div>
            </div>

            {(() => {
              const payment = paymentSummary(viewRow)
              const pendingSteps = [payment.balance > 0 ? 'payment balance' : '', viewRow.rcStatus === 'Pending' ? 'RC receipt' : '', viewRow.transferStatus === 'Pending' ? 'transfer completion' : ''].filter(Boolean)
              return pendingSteps.length > 0 ? <div className="flex flex-wrap items-center justify-between gap-3 border-y border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"><span><span className="font-semibold">Action needed:</span> Pending {pendingSteps.join(', ')}.</span><Btn size="sm" variant="outline" onClick={() => { setViewRow(null); void openPay(viewRow) }}>Update status</Btn></div> : null
            })()}

            {(() => {
              const payment = paymentSummary(viewRow)
              return (
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"><div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Transfer charges</div><div className="mt-1 text-lg font-bold text-gray-900">{fmtMoney(viewRow.transferCharges)}</div></div>
                  <div className="rounded-lg border border-green-100 bg-green-50 px-4 py-3"><div className="text-xs font-semibold uppercase tracking-wide text-green-700">Amount paid</div><div className="mt-1 flex flex-wrap items-center gap-2 text-lg font-bold text-green-800">{fmtMoney(viewRow.amtPaid)}<Badge label={payment.status} /></div></div>
                  <div className="rounded-lg border border-orange-100 bg-orange-50 px-4 py-3"><div className="text-xs font-semibold uppercase tracking-wide text-orange-700">Pending balance</div><div className="mt-1 text-lg font-bold text-orange-800">{payment.charges ? fmtMoney(payment.balance) : '—'}</div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-orange-100"><div className="h-full rounded-full bg-green-500" style={{ width: `${payment.progress}%` }} /></div></div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"><div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Next follow-up</div><div className="mt-1 text-lg font-bold text-gray-900">{fmtDate(viewRow.followupDate) || '—'}</div></div>
                </div>
              )
            })()}

            <div className="flex gap-5 border-b border-gray-200 px-1">
              {([['overview', 'Overview'], ['activity', `Activity (${payments.length + followups.length})`], ['record', 'Record']] as const).map(([tab, label]) => <button key={tab} type="button" onClick={() => setViewTab(tab)} className={`border-b-2 px-1 pb-3 text-sm font-medium transition ${viewTab === tab ? 'border-[#1B2A6B] text-[#1B2A6B]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>{label}</button>)}
            </div>

            {viewTab === 'overview' && <>
            <div className="text-sm font-semibold text-gray-800">Vehicle details</div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Registration No</div>
                <div className="mt-1 font-mono text-sm font-semibold text-gray-900">{viewRow.carRegistrationNo ?? '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Vehicle</div>
                <div className="mt-1 text-sm font-medium text-gray-900">
                  {[clean(viewRow.carMakeLegacy), clean(viewRow.carModelLegacy), clean(viewRow.carVariantLegacy)].filter(Boolean).join(' ') || '—'}
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Car Type / Year</div>
                <div className="mt-1 text-sm font-medium text-gray-900">
                  {viewRow.carType ?? '—'}{viewRow.carYear ? ` / ${viewRow.carYear}` : ''}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-5 text-sm font-semibold text-gray-800">Customer details</div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Customer</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{viewRow.customer?.custName ?? viewRow.customerNameLegacy ?? '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Customer Mobile</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{viewRow.customer?.custMobile ?? viewRow.customerMobLegacy ?? '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 md:col-span-2 xl:col-span-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Customer Email</div>
                <div className="mt-1 text-sm font-medium text-gray-900 break-all">{viewRow.customer?.custEmail ?? viewRow.customerEmailLegacy ?? '—'}</div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-5 text-sm font-semibold text-gray-800">RTO agent</div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">RTO Agent</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{viewRow.partnerMaster?.name ?? viewRow.agentNameLegacy ?? '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Agent Mobile</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{viewRow.partnerMaster?.mobile ?? viewRow.agentMobileNoLegacy ?? '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 md:col-span-2 xl:col-span-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Agent Email</div>
                <div className="mt-1 text-sm font-medium text-gray-900 break-all">{viewRow.partnerMaster?.email ?? viewRow.agentEmailIdLegacy ?? '—'}</div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-5 text-sm font-semibold text-gray-800">Job dates and notes</div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Entry Date</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{fmtDate(viewRow.dateOfEntry) || '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Transfer Charges</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{fmtMoney(viewRow.transferCharges)}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Amount Paid</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{fmtMoney(viewRow.amtPaid)}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Payment Status</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{viewRow.paymentStatus ?? '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">RC Status</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{viewRow.rcStatus ?? '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Transfer Status</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{viewRow.transferStatus ?? '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 md:col-span-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Follow-up Date</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{fmtDate(viewRow.followupDate) || '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 md:col-span-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Remark</div>
                <div className="mt-1 text-sm font-medium text-gray-900 whitespace-pre-wrap">{viewRow.remark ?? '—'}</div>
              </div>
            </div>

            </>}

            {viewTab === 'activity' && <div className="border-t border-gray-100 pt-4 space-y-4">
              <div>
                <div className="text-sm font-semibold text-gray-800">Payment History</div>
                {historyLoading ? (
                  <div className="mt-2 text-xs text-gray-400">Loading payment history...</div>
                ) : payments.length === 0 ? (
                  <div className="mt-2 text-xs text-gray-400">No payments logged.</div>
                ) : (
                  <div className="mt-2 space-y-2 max-h-48 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50 p-3">
                    {payments.map(payment => (
                      <div key={payment.rtoPaymentId} className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                        <span className="whitespace-nowrap text-gray-400">{fmtDate(payment.paymentDate ?? payment.createdDt) || '—'}</span>
                        <span className="font-medium text-gray-800">{fmtMoney(payment.amountPaid)}</span>
                        {payment.paymentStatus && <Badge label={payment.paymentStatus} />}
                        {payment.rcStatus && <Badge label={`RC: ${payment.rcStatus}`} />}
                        {payment.transferStatus && <Badge label={`Transfer: ${payment.transferStatus}`} />}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="text-sm font-semibold text-gray-800">Follow-up & Remark History</div>
                {historyLoading ? (
                  <div className="mt-2 text-xs text-gray-400">Loading follow-up history...</div>
                ) : followups.length === 0 ? (
                  <div className="mt-2 text-xs text-gray-400">No follow-up history.</div>
                ) : (
                  <div className="mt-2 space-y-2 max-h-48 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50 p-3">
                    {followups.map(followup => (
                      <div key={followup.rtoFollowupId} className="text-xs text-gray-600">
                        <span className="font-medium text-gray-800">{fmtDate(followup.followupDate) || '—'}</span>
                        <span className="mx-1 text-gray-400">—</span>
                        <span className="whitespace-pre-wrap">{followup.remark || 'No remark'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>}

            {/* Audit Log Details */}
            {viewTab === 'record' && <div className="border-t border-gray-100 pt-4 text-xs text-gray-400 flex flex-wrap gap-x-6 gap-y-1">
              <div>
                Created By: <span className="font-medium text-gray-500">{viewRow.createdByUser?.displayName ?? viewRow.createdByUser?.userName ?? 'System'}</span>
                {viewRow.createdDt && <> on <span className="font-medium text-gray-500">{fmtDateTime(viewRow.createdDt)}</span></>}
              </div>
              {viewRow.updatedDt && (
                <div>
                  Last Updated By: <span className="font-medium text-gray-500">{viewRow.updatedByUser?.displayName ?? viewRow.updatedByUser?.userName ?? 'System'}</span>
                  <> on <span className="font-medium text-gray-500">{fmtDateTime(viewRow.updatedDt)}</span></>
                </div>
              )}
            </div>}

            <div className="flex flex-wrap justify-end gap-2">
              <Btn variant="outline" onClick={() => { setViewRow(null); openEdit(viewRow) }}><Pencil className="h-4 w-4" />Edit Job</Btn>
              <Btn onClick={() => { setViewRow(null); void openPay(viewRow) }}><IndianRupee className="h-4 w-4" />Log Payment</Btn>
              <Btn variant="outline" onClick={() => setViewRow(null)}>Close</Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* Add / Edit Form Modal */}
      <Modal title={editId ? 'Edit RTO Job' : 'Add RTO Job'} open={!!modal} onClose={requestCloseForm} width="max-w-3xl">
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">RTO Agent *</label>
              <PartnerPicker partnerType="RTO Agent" label="Agent" value={selectedAgent} onChange={onAgentChange} error={errors.partnerId} />
              {errors.partnerId && <p className="mt-1 text-xs text-red-600">Select an RTO agent.</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">Customer Source *</label>
              <div className="inline-flex rounded-lg bg-gray-100 p-1">
                <button type="button" onClick={() => setCustomerEntryMode('existing')}
                  className={`rounded-md px-3 py-2 text-xs font-medium transition ${customerEntryMode === 'existing' ? 'bg-white text-[#1B2A6B] shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
                  Existing customer
                </button>
                <button type="button" onClick={() => { setCustomerEntryMode('manual'); setSelectedCustomer(null); setForm(fm => ({ ...fm, customerId: null })) }}
                  className={`rounded-md px-3 py-2 text-xs font-medium transition ${customerEntryMode === 'manual' ? 'bg-white text-[#1B2A6B] shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
                  Manual entry
                </button>
              </div>
              <p className="mt-1.5 text-xs text-gray-500">Choose a Customer Master record or enter this customer manually.</p>
              {customerEntryMode === 'existing' ? (
                <div className="mt-2"><CustomerPicker value={selectedCustomer} onChange={onCustomerChange} error={errors.customer} />{errors.customer && <p className="mt-1 text-xs text-red-600">Select an existing customer or switch to manual entry.</p>}</div>
              ) : (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div className="sm:col-span-2"><Input label="Customer Name *" value={form.customerNameLegacy} onChange={e => f('customerNameLegacy', e.target.value)} error={errors.customerNameLegacy} errorMessage={errors.customerNameLegacy ? 'Customer name is required for a manual entry.' : undefined} /></div>
                  <Input label="Mobile No." value={form.customerMobLegacy} onChange={e => f('customerMobLegacy', e.target.value)} error={errors.customerMobLegacy} errorMessage={errors.customerMobLegacy ? 'Enter a valid mobile number.' : undefined} />
                  <Input label="Email" type="email" value={form.customerEmailLegacy} onChange={e => f('customerEmailLegacy', e.target.value)} error={errors.customerEmailLegacy} errorMessage={errors.customerEmailLegacy ? 'Enter a valid email address.' : undefined} />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-gray-600">Vehicle source *</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setVehicleEntryMode('existing')}
                className={`rounded-lg border px-3 py-2.5 text-left transition ${vehicleEntryMode === 'existing' ? 'border-[#1B2A6B] bg-blue-50 ring-1 ring-[#1B2A6B]' : 'border-gray-200 hover:bg-gray-50'}`}>
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-800"><Car className="h-4 w-4 text-[#1B2A6B]" />Existing inventory</div>
                <div className="mt-0.5 text-xs text-gray-500">Search and link a stock vehicle</div>
              </button>
              <button type="button" onClick={() => { setVehicleEntryMode('manual'); resetVehicle(); setForm(fm => ({ ...fm, inventoryId: null, variantId: null })) }}
                className={`rounded-lg border px-3 py-2.5 text-left transition ${vehicleEntryMode === 'manual' ? 'border-[#1B2A6B] bg-blue-50 ring-1 ring-[#1B2A6B]' : 'border-gray-200 hover:bg-gray-50'}`}>
                <div className="text-sm font-semibold text-gray-800">Manual registration</div>
                <div className="mt-0.5 text-xs text-gray-500">Enter the registration and vehicle details</div>
              </button>
            </div>

            {vehicleEntryMode === 'existing' && (
              <div className="mt-3">
                <label className="mb-1 block text-xs font-medium text-gray-600">Select inventory vehicle *</label>
                {selectedVehicle ? (
                  <div className={`flex items-center justify-between border ${errors.inventoryId ? 'border-red-500' : 'border-gray-200'} rounded-md px-3 py-2 bg-gray-50`}>
                    <div className="flex items-center gap-2 text-sm text-gray-800"><Car className="w-4 h-4 text-gray-400" />{vehicleLabel(selectedVehicle)}</div>
                    <button type="button" onClick={() => { setSelectedVehicle(null); setForm(fm => ({ ...fm, inventoryId: null, variantId: null })) }} className="text-gray-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <div ref={vehiclePickerRef} className="relative">
                    <Input
                      placeholder="Search inventory by reg no, make, model..."
                      value={vehicleQuery}
                      onChange={e => { setVehicleQuery(e.target.value); setVehicleOpen(true) }}
                      onFocus={() => setVehicleOpen(true)}
                      onBlur={() => window.setTimeout(() => { if (!vehiclePickerRef.current?.contains(document.activeElement)) setVehicleOpen(false) }, 120)}
                      error={errors.inventoryId}
                      errorMessage={errors.inventoryId ? 'Select an inventory vehicle or switch to manual registration.' : undefined}
                    />
                    {vehicleOpen && (
                      <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                        {vehicleMatches.length === 0 ? <div className="px-3 py-2 text-sm text-gray-400">No matches</div> : vehicleMatches.map(v => (
                          <button key={v.inventoryId} type="button" onClick={() => selectVehicle(v)} className="w-full border-b border-gray-50 px-3 py-2 text-left text-sm hover:bg-gray-50 last:border-0">{vehicleLabel(v)}</button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Select label="Car Type" value={form.carType} onChange={e => f('carType', e.target.value)}>
              {CAR_TYPES.map(c => <option key={c}>{c}</option>)}
            </Select>
            <CatalogTextPicker
              label="Make"
              placeholder="Search make..."
              value={form.carMakeLegacy}
              onChange={value => f('carMakeLegacy', value)}
              options={makeOptions}
            />
            <CatalogTextPicker
              label="Model"
              placeholder="Search model..."
              value={form.carModelLegacy}
              onChange={value => f('carModelLegacy', value)}
              options={modelOptions}
            />
            <CatalogTextPicker
              label="Variant"
              placeholder="Search variant..."
              value={form.carVariantLegacy}
              onChange={value => f('carVariantLegacy', value)}
              options={variantOptions}
            />
            {vehicleEntryMode === 'manual' ? (
              <Input label="Registration No *" placeholder="Enter registration number" value={form.registrationNo} onChange={e => onRegistrationChange(e.target.value)} error={errors.registrationNo} errorMessage={errors.registrationNo ? 'Registration number is required for a manual entry.' : undefined} />
            ) : (
              <CatalogTextPicker label="Registration No" placeholder="Search registration..." value={form.registrationNo} onChange={onRegistrationChange} options={registrationOptions} error={errors.registrationNo} />
            )}
            <Input label="Year" type="number" value={form.carYear ?? ''} onChange={e => f('carYear', e.target.value ? +e.target.value : null)} error={errors.carYear} errorMessage={errors.carYear ? 'Enter a valid vehicle year.' : undefined} />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Input label="Entry Date" type="date" value={form.dateOfEntry} onChange={e => f('dateOfEntry', e.target.value)} />
            <Input label="Transfer Charges (₹)" type="number" value={form.transferCharges ?? ''} onChange={e => f('transferCharges', e.target.value ? +e.target.value : null)} error={errors.transferCharges} errorMessage={errors.transferCharges ? 'Enter transfer charges greater than or equal to zero.' : undefined} />
            {!editId ? (
              <Input
                label="Amount Paid (₹)"
                type="number"
                value={form.amountPaid ?? ''}
                onChange={e => f('amountPaid', e.target.value ? +e.target.value : null)}
                error={errors.amountPaid}
                errorMessage={errors.amountPaid ? 'Amount paid cannot be negative or exceed transfer charges.' : undefined}
              />
            ) : <div />}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Select label={!editId ? 'Initial Payment Status' : 'Payment Status'} value={form.paymentStatus} onChange={e => f('paymentStatus', e.target.value)} error={errors.paymentStatus} errorMessage={errors.paymentStatus ? 'Select a payment status.' : undefined}>
              {PAYMENT_STATUSES.map(s => <option key={s}>{s}</option>)}
            </Select>
            <Input label={!editId ? 'Initial Payment Date' : 'Payment Date'} type="date" value={form.paymentDate} onChange={e => f('paymentDate', e.target.value)} error={errors.paymentDate} errorMessage={errors.paymentDate ? 'Select the initial payment date.' : undefined} />
            <Select label="RC Status" value={form.rcStatus} onChange={e => f('rcStatus', e.target.value)} error={errors.rcStatus} errorMessage={errors.rcStatus ? 'Select an RC status.' : undefined}>
              {RC_STATUSES.map(s => <option key={s}>{s}</option>)}
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Select label="Transfer Status" value={form.transferStatus} onChange={e => f('transferStatus', e.target.value)} error={errors.transferStatus} errorMessage={errors.transferStatus ? 'Select a transfer status.' : undefined}>
              {TRANSFER_STATUSES.map(s => <option key={s}>{s}</option>)}
            </Select>
            <Input label="Follow-up Date" type="date" min={todayForInput()} value={form.followupDate} onChange={e => f('followupDate', e.target.value)} error={errors.followupDate} errorMessage={errors.followupDate ? 'Select today or a future date.' : undefined} />
          </div>
          <Textarea label="Remark *" rows={5} value={form.remark} onChange={e => f('remark', e.target.value)} error={errors.remark} errorMessage={errors.remark ? 'Remark is required.' : undefined} />

          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="flex gap-3 justify-end pt-2">
            <Btn variant="outline" onClick={requestCloseForm}>Cancel</Btn>
            <Btn onClick={save} disabled={isPending}>{isPending ? 'Saving...' : 'Save RTO Job'}</Btn>
          </div>
        </div>
      </Modal>

      {/* Log Payment Modal */}
      <Modal title={`Log Payment${payRow ? ` — ${payRow.carRegistrationNo ?? ''}` : ''}`} open={!!payRow} onClose={() => setPayRow(null)}>
        {payRow && (
          <div className="space-y-4">
            {(() => {
              const paid = payments.length > 0
                ? payments.reduce((sum, payment) => sum + Number(payment.amountPaid ?? 0), 0)
                : Number(payRow.amtPaid ?? 0)
              const summary = paymentSummary({ transferCharges: payRow.transferCharges, amtPaid: String(paid) })
              return (
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                    <div className="text-xs font-semibold uppercase text-gray-500">Transfer charges</div>
                    <div className="mt-1 text-sm font-bold text-gray-900">{fmtMoney(payRow.transferCharges)}</div>
                  </div>
                  <div className="rounded-lg border border-green-100 bg-green-50 px-3 py-2">
                    <div className="text-xs font-semibold uppercase text-green-700">Amount paid</div>
                    <div className="mt-1 flex items-center gap-2"><span className="text-sm font-bold text-green-800">{fmtMoney(paid)}</span><Badge label={summary.status} /></div>
                  </div>
                  <div className="rounded-lg border border-orange-100 bg-orange-50 px-3 py-2">
                    <div className="text-xs font-semibold uppercase text-orange-700">Pending balance</div>
                    <div className="mt-1 text-sm font-bold text-orange-800">{summary.charges ? fmtMoney(summary.balance) : '—'}</div>
                  </div>
                </div>
              )
            })()}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-600">Workflow status</div>
                {(payRow.rcStatus === 'Pending' || payRow.transferStatus === 'Pending') ? (
                  <span className="text-xs font-medium text-amber-700">Action needed</span>
                ) : <span className="text-xs font-medium text-green-700">All steps complete</span>}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className={`rounded-md border px-3 py-2 ${payRow.rcStatus === 'Pending' ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'}`}>
                  <div className="text-gray-500">RC status</div>
                  <div className="mt-1 flex items-center gap-2"><Badge label={payRow.rcStatus ?? 'Pending'} />{payRow.rcStatus === 'Pending' && <span className="text-amber-700">Mark received</span>}</div>
                </div>
                <div className={`rounded-md border px-3 py-2 ${payRow.transferStatus === 'Pending' ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'}`}>
                  <div className="text-gray-500">Transfer status</div>
                  <div className="mt-1 flex items-center gap-2"><Badge label={payRow.transferStatus ?? 'Pending'} />{payRow.transferStatus === 'Pending' && <span className="text-amber-700">Mark done</span>}</div>
                </div>
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-600 mb-1.5">Payment history</div>
              {historyLoading ? (
                <div className="flex items-center text-xs text-gray-400 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-900 mr-2" />
                  Loading history...
                </div>
              ) : payments.length === 0 ? (
                <div className="text-xs text-gray-400">No payments logged yet.</div>
              ) : (
                <div className="space-y-1.5 max-h-32 overflow-y-auto border border-gray-100 rounded-lg p-2 bg-gray-50">
                  {payments.map(p => (
                    <div key={p.rtoPaymentId} className="text-xs text-gray-600 flex gap-2 flex-wrap">
                      <span className="text-gray-400 whitespace-nowrap">{fmtDate(p.paymentDate ?? p.createdDt)}</span>
                      <span className="font-medium">{fmtMoney(p.amountPaid)}</span>
                      {p.paymentStatus && <Badge label={`Payment: ${p.paymentStatus}`} />}
                      {p.rcStatus && <Badge label={`RC: ${p.rcStatus}`} />}
                      {p.transferStatus && <Badge label={`Transfer: ${p.transferStatus}`} />}
                    </div>
                  ))}
                </div>
              )}
              {followups.length > 0 && (
                <div className="mt-2 max-h-32 space-y-1 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50 p-2 text-xs text-gray-500">
                  {followups.map(fu => (
                    <div key={fu.rtoFollowupId}>{fmtDate(fu.followupDate)} — {fu.remark ?? ''}</div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {paymentSummary(payRow).status === 'Fully Paid' && (
                <div className="sm:col-span-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-900">
                  Payment is complete. Leave the amount blank to update the RC or transfer status only.
                </div>
              )}
              <Input
                label={`Amount Paid (₹)${paymentSummary(payRow).status === 'Fully Paid' ? '' : ' *'}`}
                type="number"
                value={payForm.amountPaid ?? ''}
                onChange={e => pf('amountPaid', e.target.value ? +e.target.value : null)}
                error={errors.amountPaid}
                errorMessage={errors.amountPaid ? 'Enter a positive amount that does not exceed the pending balance.' : undefined}
              />
              <Select label="RC Status *" value={payForm.rcStatus} onChange={e => pf('rcStatus', e.target.value)}>
                {RC_STATUSES.map(s => <option key={s}>{s}</option>)}
              </Select>
              <Select label="Transfer Status *" value={payForm.transferStatus} onChange={e => pf('transferStatus', e.target.value)}>
                {TRANSFER_STATUSES.map(s => <option key={s}>{s}</option>)}
              </Select>
              <Input
                label="Next Follow-up Date"
                type="date"
                min={todayForInput()}
                value={payForm.nextFollowUpDate}
                onChange={e => pf('nextFollowUpDate', e.target.value)}
                error={errors.nextFollowUpDate}
                errorMessage={errors.nextFollowUpDate ? 'Select today or a future date while a balance is pending.' : undefined}
              />
            </div>
            <Textarea
              label="Remark *"
              value={payForm.remark}
              onChange={e => pf('remark', e.target.value)}
              error={errors.remark}
              errorMessage={errors.remark ? 'Remark is required.' : undefined}
            />

            {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}

            <div className="flex gap-3 justify-end pt-2">
              <Btn variant="outline" onClick={() => setPayRow(null)}>Cancel</Btn>
              <Btn onClick={savePayment} disabled={isPending}>{isPending ? 'Saving...' : payForm.amountPaid === null && paymentSummary(payRow).status === 'Fully Paid' ? 'Update Status' : 'Save Payment'}</Btn>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={del}
        message="Delete this RTO record? This cannot be undone." />

      <ConfirmDialog
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        onConfirm={closeForm}
        title="Discard changes?"
        confirmLabel="Discard"
        message="You have unsaved changes in this RTO form. Discard them and close?"
      />
    </div>
  )
}
