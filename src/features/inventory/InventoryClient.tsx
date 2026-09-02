/* eslint-disable @next/next/no-img-element */
'use client'


import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Eye, Mail, X, Images, Upload, Loader2, Download, Link2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge, Btn, Input, Select, Textarea, Modal, Table, PageHeader, SearchBar, ConfirmDialog } from '@/components/ui'
import { CustomerPicker } from '@/components/CustomerPicker'
import { CatalogTextPicker } from '@/components/CatalogTextPicker'
import { createMake, createModel, createVariant } from '@/features/catalog/adminActions'
import { INVENTORY_STATUSES } from './queries'
import { createInventory, updateInventory, deleteInventory, sendInventoryEmail, getInventoryBulkEmailConfig, syncInventoryToInquiry, updateInventoryEmailRecipient, getInventorySku, getNextInventoryNumber, type InventoryFormInput } from './actions'
import { isValidEmail, isValidInventoryOwnerMobile, isValidYear, normalizeRegistrationNo } from '@/lib/validation'

interface CarMakeMaster { pkMakeId: number; make: string | null }
interface CarModelMaster { pkModelId: number; model: string | null }
interface CarVariantMaster { pkVariantId: number; variant: string | null }
interface Dealer { dealerId: number; dealerName: string | null; dealerMobileNo: string | null; dealerEmail: string | null }
interface CustomerOption { custId: number; custName: string; custAddress?: string | null; custMobile: string | null; custEmail: string | null }
interface EmailProgressItem { inventoryId: number; label: string; status: 'pending' | 'sending' | 'sent' | 'failed'; error?: string }

interface InventoryRow {
  inventoryId: number
  inventoryNumber: string | null
  sku: string | null
  registrationNo: string | null
  makeLegacy: string | null
  modelLegacy: string | null
  variantLegacy: string | null
  year: number | null
  month: string | null
  colour: string | null
  fuelType: string | null
  noOfOwners: number | null
  tax: string | null
  isCarRegistered: boolean | null
  kmsDriven: string | null
  insuranceType: string | null
  price: string | null
  status: string | null
  ownedType: string | null
  ownedBy: string | null
  mobileNoOwnedBy: string | null
  emailIdOwnedBy: string | null
  customerId: number | null
  customerName: string | null
  internalComments: string | null
  otherRemarks: string | null
  fkVariantId: number | null
  customer: CustomerOption | null
  _count: { inventoryPhotos: number }
  vehicleEmailLinks?: Array<{
    vehicleEmailLinkId: number
    recipientEmail: string
    recipientName: string | null
    emailSentAt: string | Date | null
    firstRequestedAt: string | Date | null
    firstHumanViewAt: string | Date | null
    lastRequestedAt: string | Date | null
    requestCount: number
    humanViewCount: number
    isActive: boolean
    interactionSummary?: {
      callClickCount: number
      whatsappClickCount: number
      emailClickCount: number
      firstInteractionAt: string | Date | null
      lastInteractionAt: string | Date | null
    }
  }>
  carVariantMaster: {
    variant: string | null
    carMakeMaster: { pkMakeId: number; make: string | null } | null
    carModelMaster: { pkModelId: number; model: string | null } | null
  } | null
}

interface InventoryPhoto {
  documentId: number
  path: string | null
  inventoryNumberLegacy: string | null
  isUploadedHere: boolean
  fileName: string
}

interface UploadQueueItem {
  id: string
  file: File
  previewUrl: string
  status: 'queued' | 'uploading' | 'uploaded' | 'failed'
  error?: string
}

interface InquiryOption {
  inquiryId: number
  inquiryNo: string | null
  customerId: number | null
  customerNameLegacy: string | null
  mobileno: string | null
  email: string | null
  classification: string | null
  status: string | null
  subStatus: string | null
  customer: CustomerOption | null
  inquiryCarDetails: Array<{
    fkVariantId: number | null
    year: number | null
    carVariantMaster: {
      variant: string | null
      carMakeMaster: { make: string | null } | null
      carModelMaster: { model: string | null } | null
    } | null
  }>
}

interface EmailRecipient {
  key: string
  recipientType: 'dealer' | 'customer'
  recipientId: number
  name: string
  email: string | null
  meta: string
}

interface InventoryFilters {
  search: string
  status: string
  make: string
  model: string
  fuelType: string
  inventoryNumber: string
  sku: string
  registrationNo: string
  variant: string
  colour: string
  year: string
  month: string
  noOfOwners: string
  tax: string
  isCarRegistered: string
  kmsMin: string
  kmsMax: string
  insuranceType: string
  priceMin: string
  priceMax: string
  ownedType: string
  ownedBy: string
  mobileNoOwnedBy: string
  emailIdOwnedBy: string
  customerName: string
  linkedCustomer: string
  internalComments: string
  otherRemarks: string
}

const fmt = (n: string | number | null) => (n !== null && n !== '' ? `₹${Number(n).toLocaleString('en-IN')}` : '—')
const formatPriceInput = (value: number | null) => value === null || !Number.isFinite(value)
  ? ''
  : value.toLocaleString('en-IN', { maximumFractionDigits: 2 })
const fmtDateTime = (value: string | Date | null | undefined) => value ? new Date(value).toLocaleString('en-IN') : '—'
const clean = (v: string | null | undefined) => {
  const value = v?.trim()
  if (!value) return ''
  return ['null', 'na', 'n/a'].includes(value.toLowerCase()) ? '' : value
}
const text = (v: string | null | undefined) => clean(v).toLowerCase()
const num = (v: string | number | null | undefined) => (v === null || v === undefined || v === '' ? null : Number(v))
const INVENTORY_FUEL_TYPES = ['Petrol', 'Diesel', 'CNG']

function InventoryDetailCell({
  items,
}: {
  items: Array<[string, string | number | boolean | null | undefined]>
}) {
  return (
    <div className="space-y-0.5 text-xs leading-5 text-gray-600">
      {items.map(([label, value]) => {
        const displayValue = value === null || value === undefined || value === ''
          ? '—'
          : typeof value === 'boolean'
            ? value ? 'Yes' : 'No'
            : String(value)

        return (
          <div key={label}>
            <span className="font-semibold text-gray-700">{label}:</span>{' '}
            <span>{displayValue}</span>
          </div>
        )
      })}
    </div>
  )
}

function emptyFilters(): InventoryFilters {
  return {
    search: '',
    status: 'All',
    make: '',
    model: '',
    fuelType: '',
    inventoryNumber: '',
    sku: '',
    registrationNo: '',
    variant: '',
    colour: '',
    year: '',
    month: '',
    noOfOwners: '',
    tax: '',
    isCarRegistered: '',
    kmsMin: '',
    kmsMax: '',
    insuranceType: '',
    priceMin: '',
    priceMax: '',
    ownedType: '',
    ownedBy: '',
    mobileNoOwnedBy: '',
    emailIdOwnedBy: '',
    customerName: '',
    linkedCustomer: '',
    internalComments: '',
    otherRemarks: '',
  }
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

function buildInventoryExportFileName(rows: InventoryRow[], filters: InventoryFilters) {
  const today = new Date().toISOString().slice(0, 10)
  const parts = ['inventory']
  if (filters.status && filters.status !== 'All') parts.push(slugify(filters.status))
  if (filters.make) parts.push(slugify(filters.make))
  if (filters.model) parts.push(slugify(filters.model))
  if (filters.fuelType) parts.push(slugify(filters.fuelType))
  if (filters.year) parts.push(slugify(filters.year))
  if (filters.month) parts.push(slugify(filters.month))
  if (filters.registrationNo) parts.push('reg-filter')
  if (filters.inventoryNumber) parts.push('inv-filter')
  if (parts.length === 1) parts.push(`${rows.length}-rows`)
  parts.push(today)
  return `${parts.filter(Boolean).join('-')}.csv`
}

function buildInventoryExportParams(filters: InventoryFilters) {
  const params = new URLSearchParams()
  const append = (key: keyof InventoryFilters) => {
    const value = filters[key]
    if (!value || value === 'All') return
    params.set(key, value)
  }

  append('search')
  append('status')
  append('make')
  append('model')
  append('fuelType')
  append('inventoryNumber')
  append('sku')
  append('registrationNo')
  append('variant')
  append('colour')
  append('year')
  append('month')
  append('noOfOwners')
  append('tax')
  append('isCarRegistered')
  append('kmsMin')
  append('kmsMax')
  append('insuranceType')
  append('priceMin')
  append('priceMax')
  append('ownedType')
  append('ownedBy')
  append('mobileNoOwnedBy')
  append('emailIdOwnedBy')
  append('customerName')
  append('linkedCustomer')
  append('internalComments')
  append('otherRemarks')

  return params
}

async function readJsonResponse<T>(res: Response): Promise<T | null> {
  const textBody = await res.text()
  if (!textBody.trim()) return null
  try {
    return JSON.parse(textBody) as T
  } catch {
    return null
  }
}

function exportInventoryCsv(rows: InventoryRow[], filters: InventoryFilters) {
  const headers = [
    'Make',
    'Model',
    'Variant',
    'Colour',
    'Year',
    'Month',
    'Fuel Type',
    'KM Driven',
    'No Of Owners',
    'Registration No',
    'Tax',
    'Price',
    'Insurance Type',
    'Status',
    'Owned Type',
    'SKU',
    'Owned By',
    'Owner Mobile',
    'Owner Email',
    'Other Remarks',
    'Customer Name',
    'Customer Address',
    'Customer Mobile',
    'Customer Email',
  ]

  const lines = [headers.map(csvValue).join(',')]
  for (const row of rows) {
    const make = clean(row.makeLegacy ?? row.carVariantMaster?.carMakeMaster?.make)
    const model = clean(row.modelLegacy ?? row.carVariantMaster?.carModelMaster?.model)
    const variant = clean(row.variantLegacy ?? row.carVariantMaster?.variant)
    const line = [
      make,
      model,
      variant,
      row.colour,
      row.year,
      row.month,
      row.fuelType,
      row.kmsDriven,
      row.noOfOwners,
      row.registrationNo,
      row.tax,
      row.price,
      row.insuranceType,
      row.status,
      row.ownedType,
      row.sku,
      row.ownedBy,
      row.mobileNoOwnedBy,
      row.emailIdOwnedBy,
      row.otherRemarks,
      row.customerName,
      row.customer?.custAddress,
      row.customer?.custMobile,
      row.customer?.custEmail,
    ]
    lines.push(line.map(csvValue).join(','))
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = buildInventoryExportFileName(rows, filters)
  link.click()
  URL.revokeObjectURL(url)
}

async function exportInventoryCsvFromServer(filters: InventoryFilters) {
  const params = buildInventoryExportParams(filters)
  const res = await fetch(`/api/inventory/export${params.toString() ? `?${params.toString()}` : ''}`)
  const payload = await readJsonResponse<InventoryRow[] | { error?: string }>(res)
  if (!res.ok) {
    throw new Error(payload && !Array.isArray(payload) && payload.error ? payload.error : 'Could not export inventory.')
  }
  if (!payload || !Array.isArray(payload)) {
    throw new Error('Could not export inventory.')
  }
  exportInventoryCsv(payload, filters)
  return payload.length
}

function emptyForm(): InventoryFormInput {
  return {
    registrationNo: '', fkVariantId: null, makeLegacy: '', modelLegacy: '', variantLegacy: '',
    colour: '', year: new Date().getFullYear(), month: '', fuelType: '', noOfOwners: 1,
    tax: '', isCarRegistered: null, kmsDriven: null, insuranceType: '', price: null,
    status: 'In Stock', ownedType: '', ownedBy: '', mobileNoOwnedBy: '', emailIdOwnedBy: '',
    customerId: null, customerName: '', internalComments: '', otherRemarks: '',
  }
}

function buildDirtySnapshot(form: InventoryFormInput, selectedCustomer: CustomerOption | null) {
  return JSON.stringify({
    ...form,
    selectedCustomerId: selectedCustomer?.custId ?? null,
  })
}

export function InventoryClient({
  initialData,
  makes,
  dealers,
  inventoryColours,
  emailConfigured,
  initialSearch,
  initialStatus,
  initialMake,
  initialModel,
  initialFuelType,
  initialInventoryNumber,
  initialSku,
  initialRegistrationNo,
  initialVariant,
  initialColour,
  initialYear,
  initialMonth,
  initialNoOfOwners,
  initialTax,
  initialIsCarRegistered,
  initialKmsMin,
  initialKmsMax,
  initialInsuranceType,
  initialPriceMin,
  initialPriceMax,
  initialOwnedType,
  initialOwnedBy,
  initialMobileNoOwnedBy,
  initialEmailIdOwnedBy,
  initialCustomerName,
  initialLinkedCustomer,
  initialInternalComments,
  initialOtherRemarks,
  total,
  page,
  pageCount,
  pageSize,
}: {
  initialData: InventoryRow[]
  makes: CarMakeMaster[]
  dealers: Dealer[]
  inventoryColours: string[]
  emailConfigured: boolean
  initialSearch: string
  initialStatus: string
  initialMake: string
  initialModel: string
  initialFuelType: string
  initialInventoryNumber: string
  initialSku: string
  initialRegistrationNo: string
  initialVariant: string
  initialColour: string
  initialYear: string
  initialMonth: string
  initialNoOfOwners: string
  initialTax: string
  initialIsCarRegistered: string
  initialKmsMin: string
  initialKmsMax: string
  initialInsuranceType: string
  initialPriceMin: string
  initialPriceMax: string
  initialOwnedType: string
  initialOwnedBy: string
  initialMobileNoOwnedBy: string
  initialEmailIdOwnedBy: string
  initialCustomerName: string
  initialLinkedCustomer: string
  initialInternalComments: string
  initialOtherRemarks: string
  total: number
  page: number
  pageCount: number
  pageSize: number
}) {
  const router = useRouter()
  const [data, setData] = useState(initialData)
  const [searchInput, setSearchInput] = useState(initialSearch)
  const [filters, setFilters] = useState<InventoryFilters>(() => ({
    ...emptyFilters(),
    search: initialSearch,
    status: initialStatus,
    make: initialMake,
    model: initialModel,
    fuelType: initialFuelType,
    inventoryNumber: initialInventoryNumber,
    sku: initialSku,
    registrationNo: initialRegistrationNo,
    variant: initialVariant,
    colour: initialColour,
    year: initialYear,
    month: initialMonth,
    noOfOwners: initialNoOfOwners,
    tax: initialTax,
    isCarRegistered: initialIsCarRegistered,
    kmsMin: initialKmsMin,
    kmsMax: initialKmsMax,
    insuranceType: initialInsuranceType,
    priceMin: initialPriceMin,
    priceMax: initialPriceMax,
    ownedType: initialOwnedType,
    ownedBy: initialOwnedBy,
    mobileNoOwnedBy: initialMobileNoOwnedBy,
    emailIdOwnedBy: initialEmailIdOwnedBy,
    customerName: initialCustomerName,
    linkedCustomer: initialLinkedCustomer,
    internalComments: initialInternalComments,
    otherRemarks: initialOtherRemarks,
  }))
  const [modal, setModal] = useState<null | 'add' | 'edit' | 'view'>(null)
  const [form, setForm] = useState<InventoryFormInput>(emptyForm())
  const [editId, setEditId] = useState<number | null>(null)
  const [originalStatus, setOriginalStatus] = useState<string | null>(null)
  const [currentInventoryNumber, setCurrentInventoryNumber] = useState<string | null>(null)
  const [currentSku, setCurrentSku] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<Record<string, boolean>>({})
  const [isPending, startTransition] = useTransition()

  const [selectedMakeId, setSelectedMakeId] = useState<number | null>(null)
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null)
  const [catalogMakeText, setCatalogMakeText] = useState('')
  const [catalogModelText, setCatalogModelText] = useState('')
  const [catalogVariantText, setCatalogVariantText] = useState('')
  const [catalogAddType, setCatalogAddType] = useState<'make' | 'model' | 'variant' | null>(null)
  const [catalogAddValue, setCatalogAddValue] = useState('')
  const [catalogAddError, setCatalogAddError] = useState('')
  const [catalogAddPending, setCatalogAddPending] = useState(false)
  const [models, setModels] = useState<CarModelMaster[]>([])
  const [variants, setVariants] = useState<CarVariantMaster[]>([])
  const [viewRow, setViewRow] = useState<InventoryRow | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const detailRequestRef = useRef(0)
  const detailCacheRef = useRef(new Map<number, InventoryRow>())
  const editBaselineRef = useRef(buildDirtySnapshot(emptyForm(), null))
  const [discardOpen, setDiscardOpen] = useState(false)

  const [emailRow, setEmailRow] = useState<InventoryRow | null>(null)
  const [emailRows, setEmailRows] = useState<InventoryRow[]>([])
  const [selectedInventoryIds, setSelectedInventoryIds] = useState<number[]>([])
  const [recipientType, setRecipientType] = useState<'dealer' | 'customer'>('customer')
  const [dealerQuery, setDealerQuery] = useState('')
  const [dealerOpen, setDealerOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null)
  const [emailSelectedDealer, setEmailSelectedDealer] = useState<Dealer | null>(null)
  const [emailSelectedCustomer, setEmailSelectedCustomer] = useState<CustomerOption | null>(null)
  const [emailRecipients, setEmailRecipients] = useState<EmailRecipient[]>([])
  const [editingRecipientEmailKey, setEditingRecipientEmailKey] = useState<string | null>(null)
  const [recipientEmailDraft, setRecipientEmailDraft] = useState('')
  const [recipientEmailError, setRecipientEmailError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [emailSentMessage, setEmailSentMessage] = useState<string | null>(null)
  const [emailProgress, setEmailProgress] = useState<EmailProgressItem[]>([])
  const [isEmailSending, setIsEmailSending] = useState(false)
  const [photoRow, setPhotoRow] = useState<InventoryRow | null>(null)
  const [photos, setPhotos] = useState<InventoryPhoto[]>([])
  const [photoError, setPhotoError] = useState('')
  const [photoLoading, setPhotoLoading] = useState(false)
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([])
  const [isUploadingPhotos, startPhotoUploadTransition] = useTransition()
  const [isDeletingPhoto, startPhotoDeleteTransition] = useTransition()
  const [exportError, setExportError] = useState('')
  const [isExporting, startExportTransition] = useTransition()
  const [inquiryRow, setInquiryRow] = useState<InventoryRow | null>(null)
  const [inquiryQuery, setInquiryQuery] = useState('')
  const [inquiryMatches, setInquiryMatches] = useState<InquiryOption[]>([])
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryOption | null>(null)
  const [inquiryLoading, setInquiryLoading] = useState(false)
  const [inquiryError, setInquiryError] = useState('')
  const [isSyncingInquiry, startSyncInquiryTransition] = useTransition()
  const [pendingInventoryRefresh, setPendingInventoryRefresh] = useState(false)
  const inquiryDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inquiryRequestRef = useRef(0)
  const listDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isListLoading, setIsListLoading] = useState(false)
  const PAGE_SIZE_OPTIONS = [25, 50, 100]
  const isEditDirty = modal === 'edit' && buildDirtySnapshot(form, selectedCustomer) !== editBaselineRef.current

  useEffect(() => {
    setData(initialData)
    setIsListLoading(false)
  }, [initialData])

  useEffect(() => {
    setSearchInput(initialSearch)
    setFilters(prev => ({
      ...prev,
      search: initialSearch,
      status: initialStatus,
      make: initialMake,
      model: initialModel,
      fuelType: initialFuelType,
      inventoryNumber: initialInventoryNumber,
      sku: initialSku,
      registrationNo: initialRegistrationNo,
      variant: initialVariant,
      colour: initialColour,
      year: initialYear,
      month: initialMonth,
      noOfOwners: initialNoOfOwners,
      tax: initialTax,
      isCarRegistered: initialIsCarRegistered,
      kmsMin: initialKmsMin,
      kmsMax: initialKmsMax,
      insuranceType: initialInsuranceType,
      priceMin: initialPriceMin,
      priceMax: initialPriceMax,
      ownedType: initialOwnedType,
      ownedBy: initialOwnedBy,
      mobileNoOwnedBy: initialMobileNoOwnedBy,
      emailIdOwnedBy: initialEmailIdOwnedBy,
      customerName: initialCustomerName,
      linkedCustomer: initialLinkedCustomer,
      internalComments: initialInternalComments,
      otherRemarks: initialOtherRemarks,
    }))
  }, [
    initialColour,
    initialCustomerName,
    initialEmailIdOwnedBy,
    initialFuelType,
    initialInsuranceType,
    initialInternalComments,
    initialInventoryNumber,
    initialIsCarRegistered,
    initialKmsMax,
    initialKmsMin,
    initialLinkedCustomer,
    initialMake,
    initialMobileNoOwnedBy,
    initialModel,
    initialMonth,
    initialNoOfOwners,
    initialOtherRemarks,
    initialOwnedBy,
    initialOwnedType,
    initialPriceMax,
    initialPriceMin,
    initialRegistrationNo,
    initialSearch,
    initialSku,
    initialStatus,
    initialTax,
    initialVariant,
    initialYear,
  ])

  const pushQuery = (params: Record<string, string>) => {
    setIsListLoading(true)
    const q = new URLSearchParams({
      search: initialSearch,
      status: initialStatus,
      make: initialMake,
      model: initialModel,
      fuelType: initialFuelType,
      inventoryNumber: initialInventoryNumber,
      sku: initialSku,
      registrationNo: initialRegistrationNo,
      variant: initialVariant,
      colour: initialColour,
      year: initialYear,
      month: initialMonth,
      noOfOwners: initialNoOfOwners,
      tax: initialTax,
      isCarRegistered: initialIsCarRegistered,
      kmsMin: initialKmsMin,
      kmsMax: initialKmsMax,
      insuranceType: initialInsuranceType,
      priceMin: initialPriceMin,
      priceMax: initialPriceMax,
      ownedType: initialOwnedType,
      ownedBy: initialOwnedBy,
      mobileNoOwnedBy: initialMobileNoOwnedBy,
      emailIdOwnedBy: initialEmailIdOwnedBy,
      customerName: initialCustomerName,
      linkedCustomer: initialLinkedCustomer,
      internalComments: initialInternalComments,
      otherRemarks: initialOtherRemarks,
      page: String(page),
      pageSize: String(pageSize),
      ...params,
    })
    for (const [key, value] of [...q.entries()]) {
      if (!value || value === 'All') q.delete(key)
      if (key === 'page' && value === '1') q.delete(key)
      if (key === 'pageSize' && value === '25') q.delete(key)
    }
    router.push(`/inventory${q.toString() ? `?${q.toString()}` : ''}`)
  }

  const dealerMatches = useMemo(() => {
    const q = dealerQuery.toLowerCase()
    const withEmail = dealers.filter(d => d.dealerEmail)
    if (!q) return withEmail.slice(0, 20)
    return withEmail.filter(d => (d.dealerName ?? '').toLowerCase().includes(q)).slice(0, 20)
  }, [dealers, dealerQuery])

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase()
    return data.filter(r => {
      const make = clean(r.carVariantMaster?.carMakeMaster?.make ?? r.makeLegacy)
      const model = clean(r.carVariantMaster?.carModelMaster?.model ?? r.modelLegacy)
      const variant = clean(r.carVariantMaster?.variant ?? r.variantLegacy)
      const matches = !q
        || (r.registrationNo ?? '').toLowerCase().includes(q)
        || make.toLowerCase().includes(q)
        || model.toLowerCase().includes(q)
        || variant.toLowerCase().includes(q)
        || (r.colour ?? '').toLowerCase().includes(q)
        || (r.ownedBy ?? '').toLowerCase().includes(q)
        || (r.mobileNoOwnedBy ?? '').toLowerCase().includes(q)
      if (!matches) return false
      if (filters.status !== 'All' && r.status !== filters.status) return false
      if (filters.fuelType && clean(r.fuelType) !== filters.fuelType) return false
      if (filters.ownedType && text(r.ownedType) !== filters.ownedType.toLowerCase()) return false
      return true
    })
  }, [data, filters])

  const activeFilterChips = useMemo(() => {
    const items: Array<{ key: keyof InventoryFilters; label: string }> = []
    const push = (key: keyof InventoryFilters, label: string, value: string) => {
      if (!value || value === 'All') return
      items.push({ key, label: `${label}: ${value}` })
    }
    push('search', 'Search', filters.search)
    push('status', 'Status', filters.status)
    push('fuelType', 'Fuel', filters.fuelType)
    push('ownedType', 'Owner Type', filters.ownedType)
    return items
  }, [filters])

  const hasActiveFilters = activeFilterChips.length > 0
  const vehicleLabel = (r: InventoryRow | InquiryOption['inquiryCarDetails'][number]) => {
    const variantRecord = 'carVariantMaster' in r ? r.carVariantMaster : null
    const makeLegacy = 'makeLegacy' in r ? r.makeLegacy : null
    const modelLegacy = 'modelLegacy' in r ? r.modelLegacy : null
    const variantLegacy = 'variantLegacy' in r ? r.variantLegacy : null
    return [
      clean(variantRecord?.carMakeMaster?.make ?? makeLegacy),
      clean(variantRecord?.carModelMaster?.model ?? modelLegacy),
      clean(variantRecord?.variant ?? variantLegacy),
    ].filter(Boolean).join(' ') || '—'
  }

  useEffect(() => {
    if (!inquiryRow) return
    if (inquiryDebounceRef.current) clearTimeout(inquiryDebounceRef.current)
    inquiryDebounceRef.current = setTimeout(async () => {
      const requestId = ++inquiryRequestRef.current
      setInquiryLoading(true)
      setInquiryError('')
      try {
        const res = await fetch(`/api/inventory/inquiries?q=${encodeURIComponent(inquiryQuery)}`)
        const payload = await res.json()
        if (inquiryRequestRef.current !== requestId) return
        if (!res.ok) {
          setInquiryMatches([])
          setInquiryError(payload.error ?? 'Could not load inquiries.')
          return
        }
        setInquiryMatches(payload)
      } catch {
        if (inquiryRequestRef.current !== requestId) return
        setInquiryMatches([])
        setInquiryError('Could not load inquiries.')
      } finally {
        if (inquiryRequestRef.current === requestId) setInquiryLoading(false)
      }
    }, inquiryQuery.trim() ? 250 : 0)

    return () => {
      if (inquiryDebounceRef.current) clearTimeout(inquiryDebounceRef.current)
    }
  }, [inquiryQuery, inquiryRow])

  useEffect(() => {
    if (listDebounceRef.current) clearTimeout(listDebounceRef.current)
    if (searchInput === initialSearch) return
    setFilters(prev => ({ ...prev, search: searchInput }))
    listDebounceRef.current = setTimeout(() => pushQuery({ search: searchInput, page: '1' }), 400)
    return () => {
      if (listDebounceRef.current) clearTimeout(listDebounceRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  const serverFilterSnapshot = useMemo(() => ({
    status: filters.status,
    make: filters.make,
    model: filters.model,
    fuelType: filters.fuelType,
    inventoryNumber: filters.inventoryNumber,
    sku: filters.sku,
    registrationNo: filters.registrationNo,
    variant: filters.variant,
    colour: filters.colour,
    year: filters.year,
    month: filters.month,
    noOfOwners: filters.noOfOwners,
    tax: filters.tax,
    isCarRegistered: filters.isCarRegistered,
    kmsMin: filters.kmsMin,
    kmsMax: filters.kmsMax,
    insuranceType: filters.insuranceType,
    priceMin: filters.priceMin,
    priceMax: filters.priceMax,
    ownedType: filters.ownedType,
    ownedBy: filters.ownedBy,
    mobileNoOwnedBy: filters.mobileNoOwnedBy,
    emailIdOwnedBy: filters.emailIdOwnedBy,
    customerName: filters.customerName,
    linkedCustomer: filters.linkedCustomer,
    internalComments: filters.internalComments,
    otherRemarks: filters.otherRemarks,
  }), [filters])

  const initialServerFilterSnapshot = useMemo(() => ({
    status: initialStatus,
    make: initialMake,
    model: initialModel,
    fuelType: initialFuelType,
    inventoryNumber: initialInventoryNumber,
    sku: initialSku,
    registrationNo: initialRegistrationNo,
    variant: initialVariant,
    colour: initialColour,
    year: initialYear,
    month: initialMonth,
    noOfOwners: initialNoOfOwners,
    tax: initialTax,
    isCarRegistered: initialIsCarRegistered,
    kmsMin: initialKmsMin,
    kmsMax: initialKmsMax,
    insuranceType: initialInsuranceType,
    priceMin: initialPriceMin,
    priceMax: initialPriceMax,
    ownedType: initialOwnedType,
    ownedBy: initialOwnedBy,
    mobileNoOwnedBy: initialMobileNoOwnedBy,
    emailIdOwnedBy: initialEmailIdOwnedBy,
    customerName: initialCustomerName,
    linkedCustomer: initialLinkedCustomer,
    internalComments: initialInternalComments,
    otherRemarks: initialOtherRemarks,
  }), [
    initialColour,
    initialCustomerName,
    initialEmailIdOwnedBy,
    initialFuelType,
    initialInsuranceType,
    initialInternalComments,
    initialInventoryNumber,
    initialIsCarRegistered,
    initialKmsMax,
    initialKmsMin,
    initialLinkedCustomer,
    initialMake,
    initialMobileNoOwnedBy,
    initialModel,
    initialMonth,
    initialNoOfOwners,
    initialOtherRemarks,
    initialOwnedBy,
    initialOwnedType,
    initialPriceMax,
    initialPriceMin,
    initialRegistrationNo,
    initialSku,
    initialStatus,
    initialTax,
    initialVariant,
    initialYear,
  ])

  useEffect(() => {
    if (listDebounceRef.current) clearTimeout(listDebounceRef.current)
    if (JSON.stringify(serverFilterSnapshot) === JSON.stringify(initialServerFilterSnapshot)) return
    listDebounceRef.current = setTimeout(() => pushQuery({ ...serverFilterSnapshot, page: '1' }), 250)
    return () => {
      if (listDebounceRef.current) clearTimeout(listDebounceRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialServerFilterSnapshot, serverFilterSnapshot])

  const resetCascade = () => { setSelectedMakeId(null); setSelectedModelId(null); setModels([]); setVariants([]) }

  const hydrateEditForm = async (row: InventoryRow) => {
    setForm({
      registrationNo: normalizeRegistrationNo(row.registrationNo),
      fkVariantId: row.fkVariantId,
      makeLegacy: row.makeLegacy ?? '',
      modelLegacy: row.modelLegacy ?? '',
      variantLegacy: row.variantLegacy ?? '',
      colour: row.colour ?? '',
      year: row.year,
      month: row.month ?? '',
      fuelType: row.fuelType ?? '',
      noOfOwners: row.noOfOwners,
      tax: row.tax ?? '',
      isCarRegistered: row.isCarRegistered,
      kmsDriven: row.kmsDriven !== null ? Number(row.kmsDriven) : null,
      insuranceType: row.insuranceType ?? '',
      price: row.price !== null ? Number(row.price) : null,
      status: row.status ?? 'In Stock',
      ownedType: row.ownedType ?? '',
      ownedBy: row.ownedBy ?? '',
      mobileNoOwnedBy: row.mobileNoOwnedBy ?? '',
      emailIdOwnedBy: row.emailIdOwnedBy ?? '',
      customerId: row.customerId,
      customerName: row.customerName ?? '',
      internalComments: row.internalComments ?? '',
      otherRemarks: row.otherRemarks ?? '',
    })
    setSelectedCustomer(row.customer)
    setOriginalStatus(row.status ?? null)
    setCurrentInventoryNumber(row.inventoryNumber)
    setCurrentSku(row.sku)
    setCatalogMakeText(row.carVariantMaster?.carMakeMaster?.make ?? row.makeLegacy ?? '')
    setCatalogModelText(row.carVariantMaster?.carModelMaster?.model ?? row.modelLegacy ?? '')
    setCatalogVariantText(row.carVariantMaster?.variant ?? row.variantLegacy ?? '')

    const makeId = row.carVariantMaster?.carMakeMaster?.pkMakeId ?? null
    const modelId = row.carVariantMaster?.carModelMaster?.pkModelId ?? null
    setSelectedMakeId(makeId)
    setSelectedModelId(modelId)
    setModels([])
    setVariants([])
    if (makeId) {
      const res = await fetch(`/api/catalog/models?makeId=${makeId}`)
      setModels(await res.json())
    }
    if (modelId) {
      const res = await fetch(`/api/catalog/variants?modelId=${modelId}`)
      setVariants(await res.json())
    }
  }

  const fetchInventoryDetail = async (inventoryId: number) => {
    const cached = detailCacheRef.current.get(inventoryId)
    if (cached) return cached
    const res = await fetch(`/api/inventory/${inventoryId}`)
    const payload = await readJsonResponse<InventoryRow & { error?: string }>(res)
    if (!res.ok) {
      throw new Error(payload?.error ?? 'Could not load vehicle details.')
    }
    if (!payload) {
      throw new Error('Could not load vehicle details.')
    }
    detailCacheRef.current.set(inventoryId, payload)
    return payload as InventoryRow
  }

  const openAdd = () => {
    const nextForm = emptyForm()
    setForm(nextForm)
    setSelectedCustomer(null)
    setCurrentInventoryNumber(null)
    setCurrentSku(null)
    setCatalogMakeText('')
    setCatalogModelText('')
    setCatalogVariantText('')
    setEditId(null)
    setOriginalStatus(null)
    setViewRow(null)
    resetCascade()
    setError('')
    setDetailError('')
    setDetailLoading(false)
    editBaselineRef.current = buildDirtySnapshot(nextForm, null)
    setModal('add')
    void getNextInventoryNumber().then(setCurrentInventoryNumber)
  }

  const openEdit = async (r: InventoryRow) => {
    setEditId(r.inventoryId)
    setForm(emptyForm())
    setSelectedCustomer(null)
    setCurrentInventoryNumber(r.inventoryNumber)
    setCurrentSku(r.sku)
    setCatalogMakeText('')
    setCatalogModelText('')
    setCatalogVariantText('')
    setOriginalStatus(null)
    resetCascade()
    setError('')
    setDetailError('')
    setDetailLoading(true)
    editBaselineRef.current = buildDirtySnapshot(emptyForm(), null)
    setModal('edit')
    const requestId = ++detailRequestRef.current
    try {
      const detailRow = await fetchInventoryDetail(r.inventoryId)
      if (detailRequestRef.current !== requestId) return
      await hydrateEditForm(detailRow)
      editBaselineRef.current = buildDirtySnapshot({
        registrationNo: normalizeRegistrationNo(detailRow.registrationNo),
        fkVariantId: detailRow.fkVariantId,
        makeLegacy: detailRow.makeLegacy ?? '',
        modelLegacy: detailRow.modelLegacy ?? '',
        variantLegacy: detailRow.variantLegacy ?? '',
        colour: detailRow.colour ?? '',
        year: detailRow.year,
        month: detailRow.month ?? '',
        fuelType: detailRow.fuelType ?? '',
        noOfOwners: detailRow.noOfOwners,
        tax: detailRow.tax ?? '',
        isCarRegistered: detailRow.isCarRegistered,
        kmsDriven: detailRow.kmsDriven !== null ? Number(detailRow.kmsDriven) : null,
        insuranceType: detailRow.insuranceType ?? '',
        price: detailRow.price !== null ? Number(detailRow.price) : null,
        status: detailRow.status ?? 'In Stock',
        ownedType: detailRow.ownedType ?? '',
        ownedBy: detailRow.ownedBy ?? '',
        mobileNoOwnedBy: detailRow.mobileNoOwnedBy ?? '',
        emailIdOwnedBy: detailRow.emailIdOwnedBy ?? '',
        customerId: detailRow.customerId,
        customerName: detailRow.customerName ?? '',
        internalComments: detailRow.internalComments ?? '',
        otherRemarks: detailRow.otherRemarks ?? '',
      }, detailRow.customer)
    } catch (err) {
      if (detailRequestRef.current !== requestId) return
      setDetailError(err instanceof Error ? err.message : 'Could not load vehicle details.')
    } finally {
      if (detailRequestRef.current === requestId) setDetailLoading(false)
    }
  }

  const openView = async (r: InventoryRow) => {
    setViewRow(null)
    setDetailError('')
    setDetailLoading(true)
    setModal('view')
    const requestId = ++detailRequestRef.current
    try {
      const detailRow = await fetchInventoryDetail(r.inventoryId)
      if (detailRequestRef.current !== requestId) return
      setViewRow(detailRow)
    } catch (err) {
      if (detailRequestRef.current !== requestId) return
      setDetailError(err instanceof Error ? err.message : 'Could not load vehicle details.')
    } finally {
      if (detailRequestRef.current === requestId) setDetailLoading(false)
    }
  }

  const closeModalImmediately = () => {
    detailRequestRef.current += 1
    setModal(null)
    setDetailLoading(false)
    setDetailError('')
    setDiscardOpen(false)
    setError('')
    setErrors({})
  }

  const requestModalClose = () => {
    if (modal === 'edit' && isEditDirty && !detailLoading) {
      setDiscardOpen(true)
      return
    }
    closeModalImmediately()
  }

  const refreshSku = async (make: string, model: string, colour: string) => {
    const sku = await getInventorySku(make, model, colour, editId ?? undefined)
    setCurrentSku(sku || null)
  }

  const f = <K extends keyof InventoryFormInput>(k: K, v: InventoryFormInput[K]) => {
    setForm(prev => ({ ...prev, [k]: v }))
    if (k === 'colour') {
      const make = makes.find(item => item.pkMakeId === selectedMakeId)?.make ?? form.makeLegacy
      const model = models.find(item => item.pkModelId === selectedModelId)?.model ?? form.modelLegacy
      void refreshSku(make ?? '', model ?? '', String(v))
    }
  }

  const onOwnerTypeChange = (value: string) => {
    f('ownedType', value)
    if (value === 'Excel Cars') {
      f('ownedBy', 'Excel Cars')
    } else {
      f('ownedBy', '')
      f('mobileNoOwnedBy', '')
      f('emailIdOwnedBy', '')
    }
  }

  const onDealerChange = (value: string) => {
    const dealer = dealers.find(item => item.dealerName?.trim().toLowerCase() === value.trim().toLowerCase())
    f('ownedBy', value)
    f('mobileNoOwnedBy', dealer?.dealerMobileNo ?? '')
    f('emailIdOwnedBy', dealer?.dealerEmail ?? '')
  }

  const onCatalogMakeChange = async (value: string) => {
    setCatalogMakeText(value)
    setCatalogModelText('')
    setCatalogVariantText('')
    setSelectedModelId(null)
    setVariants([])
    setForm(prev => ({ ...prev, fkVariantId: null }))
    const match = makes.find(item => item.make?.trim().toLowerCase() === value.trim().toLowerCase())
    setSelectedMakeId(match?.pkMakeId ?? null)
    if (match) {
      const res = await fetch(`/api/catalog/models?makeId=${match.pkMakeId}`)
      setModels(await res.json())
    } else setModels([])
  }

  const onCatalogModelChange = async (value: string) => {
    setCatalogModelText(value)
    setCatalogVariantText('')
    setForm(prev => ({ ...prev, fkVariantId: null }))
    const match = models.find(item => item.model?.trim().toLowerCase() === value.trim().toLowerCase())
    setSelectedModelId(match?.pkModelId ?? null)
    if (match) {
      const res = await fetch(`/api/catalog/variants?modelId=${match.pkModelId}`)
      setVariants(await res.json())
    } else setVariants([])
  }

  const openCatalogAdd = (type: 'make' | 'model' | 'variant', value: string) => {
    setCatalogAddType(type)
    setCatalogAddValue(value)
    setCatalogAddError('')
  }

  const addCatalogValue = async () => {
    if (!catalogAddType || !catalogAddValue.trim()) return
    setCatalogAddPending(true)
    setCatalogAddError('')
    try {
      if (catalogAddType === 'make') {
        const result = await createMake(catalogAddValue)
        if (!result.success || !result.id) throw new Error(result.error ?? 'Could not add make.')
        setCatalogMakeText(catalogAddValue.trim())
        setSelectedMakeId(result.id)
        setCatalogModelText('')
        setCatalogVariantText('')
        setSelectedModelId(null)
        setVariants([])
        setForm(prev => ({ ...prev, fkVariantId: null }))
        const response = await fetch(`/api/catalog/models?makeId=${result.id}`)
        setModels(await response.json())
      } else if (catalogAddType === 'model') {
        if (!selectedMakeId) throw new Error('Add or select a Make first.')
        const result = await createModel(catalogAddValue, selectedMakeId)
        if (!result.success || !result.id) throw new Error(result.error ?? 'Could not add model.')
        setCatalogModelText(catalogAddValue.trim())
        setSelectedModelId(result.id)
        setCatalogVariantText('')
        setVariants([])
        setForm(prev => ({ ...prev, fkVariantId: null }))
        const response = await fetch(`/api/catalog/variants?modelId=${result.id}`)
        setVariants(await response.json())
      } else {
        if (!selectedMakeId || !selectedModelId) throw new Error('Add or select a Make and Model first.')
        const result = await createVariant(catalogAddValue, selectedMakeId, selectedModelId)
        if (!result.success || !result.id) throw new Error(result.error ?? 'Could not add variant.')
        const variantId = result.id
        setCatalogVariantText(catalogAddValue.trim())
        setForm(prev => ({ ...prev, fkVariantId: variantId }))
        setVariants(prev => [...prev, { pkVariantId: variantId, variant: catalogAddValue.trim() }])
      }
      setCatalogAddType(null)
    } catch (err) {
      setCatalogAddError(err instanceof Error ? err.message : 'Could not add catalog value.')
    } finally {
      setCatalogAddPending(false)
    }
  }
  const setFilter = <K extends keyof InventoryFilters>(key: K, value: InventoryFilters[K]) => setFilters(prev => ({ ...prev, [key]: value }))
  const clearAllFilters = () => {
    setSearchInput('')
    setFilters(emptyFilters())
    router.push('/inventory')
  }

  const onCustomerChange = (c: CustomerOption | null) => {
    setSelectedCustomer(c)
    setForm(prev => ({
      ...prev,
      customerId: c?.custId ?? null,
      customerName: c?.custName ?? prev.customerName,
    }))
  }

  const openEmail = (r: InventoryRow) => {
    setEmailRow(r)
    setEmailRows([r])
    setRecipientType('customer')
    setEmailSelectedDealer(null)
    setEmailSelectedCustomer(null)
    setEmailRecipients([])
    setEditingRecipientEmailKey(null)
    setRecipientEmailDraft('')
    setRecipientEmailError('')
    setDealerQuery('')
    setEmailError('')
    setEmailSentMessage(null)
    setEmailProgress([])
  }

  const openBulkEmail = () => {
    const rows = filtered.filter(row => selectedInventoryIds.includes(row.inventoryId))
    if (rows.length === 0) return
    setEmailRow(rows[0])
    setEmailRows(rows)
    setRecipientType('customer')
    setEmailSelectedDealer(null)
    setEmailSelectedCustomer(null)
    setEmailRecipients([])
    setEditingRecipientEmailKey(null)
    setRecipientEmailDraft('')
    setRecipientEmailError('')
    setDealerQuery('')
    setEmailError('')
    setEmailSentMessage(null)
    setEmailProgress([])
  }

  const addEmailRecipient = (recipient: EmailRecipient) => {
    setEmailRecipients(prev => prev.some(item => item.key === recipient.key) ? prev : [...prev, recipient])
  }

  const removeEmailRecipient = (key: string) => {
    setEmailRecipients(prev => prev.filter(item => item.key !== key))
    if (editingRecipientEmailKey === key) {
      setEditingRecipientEmailKey(null)
      setRecipientEmailDraft('')
      setRecipientEmailError('')
    }
  }

  const saveRecipientEmail = (recipient: EmailRecipient) => {
    const email = recipientEmailDraft.trim().toLowerCase()
    if (!isValidEmail(email)) {
      setRecipientEmailError('Enter a valid email address.')
      return
    }
    setRecipientEmailError('')
    startTransition(async () => {
      const result = await updateInventoryEmailRecipient({
        recipientType: recipient.recipientType,
        recipientId: recipient.recipientId,
        email,
      })
      if (!result.success) {
        setRecipientEmailError(result.error ?? 'Could not update the email address.')
        return
      }
      setEmailRecipients(prev => prev.map(item => item.key === recipient.key ? { ...item, email } : item))
      setEmailRow(prev => prev?.customer?.custId === recipient.recipientId && recipient.recipientType === 'customer'
        ? { ...prev, customer: { ...prev.customer, custEmail: email } }
        : prev)
      setEditingRecipientEmailKey(null)
      setRecipientEmailDraft('')
      setRecipientEmailError('')
    })
  }

  const openInquirySync = (r: InventoryRow) => {
    setInquiryRow(r)
    setInquiryQuery('')
    setInquiryMatches([])
    setSelectedInquiry(null)
    setInquiryError('')
    inquiryRequestRef.current += 1
  }

  const syncInquiry = () => {
    if (!inquiryRow || !selectedInquiry) {
      setInquiryError('Select an inquiry to update.')
      return
    }
    setInquiryError('')
    startSyncInquiryTransition(async () => {
      const result = await syncInventoryToInquiry(inquiryRow.inventoryId, { inquiryId: selectedInquiry.inquiryId })
      if (!result.success) {
        setInquiryError(result.error ?? 'Could not update inquiry.')
        return
      }
      setInquiryRow(null)
      setSelectedInquiry(null)
      setInquiryMatches([])
      setInquiryQuery('')
      if (pendingInventoryRefresh) window.location.reload()
    })
  }

  const buildInventoryRowFromForm = (inventoryId: number, inventoryNumber: string | null): InventoryRow => ({
    inventoryId,
    inventoryNumber,
    sku: data.find(r => r.inventoryId === inventoryId)?.sku ?? null,
    registrationNo: form.registrationNo || null,
    makeLegacy: form.makeLegacy || null,
    modelLegacy: form.modelLegacy || null,
    variantLegacy: form.variantLegacy || null,
    year: form.year,
    month: form.month || null,
    colour: form.colour || null,
    fuelType: form.fuelType || null,
    noOfOwners: form.noOfOwners,
    tax: form.tax || null,
    isCarRegistered: form.isCarRegistered,
    kmsDriven: form.kmsDriven !== null ? String(form.kmsDriven) : null,
    insuranceType: form.insuranceType || null,
    price: form.price !== null ? String(form.price) : null,
    status: form.status || null,
    ownedType: form.ownedType || null,
    ownedBy: form.ownedBy || null,
    mobileNoOwnedBy: form.mobileNoOwnedBy || null,
    emailIdOwnedBy: form.emailIdOwnedBy || null,
    customerId: form.customerId,
    customerName: form.customerName || null,
    internalComments: form.internalComments || null,
    otherRemarks: form.otherRemarks || null,
    fkVariantId: form.fkVariantId,
    customer: selectedCustomer,
    _count: { inventoryPhotos: data.find(r => r.inventoryId === inventoryId)?._count.inventoryPhotos ?? 0 },
    carVariantMaster: null,
  })

  const refreshPhotoCount = (inventoryId: number, delta: number) => {
    setData(prev => prev.map(row => row.inventoryId === inventoryId
      ? { ...row, _count: { inventoryPhotos: Math.max(0, row._count.inventoryPhotos + delta) } }
      : row))
  }

  const openPhotos = async (r: InventoryRow) => {
    setPhotoRow(r)
    setPhotos([])
    setPhotoError('')
    setUploadQueue([])
    setPhotoLoading(true)
    try {
      const res = await fetch(`/api/inventory/photos?inventoryId=${r.inventoryId}&inventoryNumber=${encodeURIComponent(r.inventoryNumber ?? '')}`)
      const payload = await res.json()
      if (!res.ok) {
        setPhotoError(payload.error ?? 'Could not load photos.')
        return
      }
      setPhotos(payload)
    } catch {
      setPhotoError('Could not load photos.')
    } finally {
      setPhotoLoading(false)
    }
  }

  const onSelectFiles = (files: FileList | null) => {
    if (!files?.length) return
    const nextItems: UploadQueueItem[] = Array.from(files).map(file => ({
      id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'queued',
    }))
    setUploadQueue(prev => [...prev, ...nextItems])
  }

  const removeQueuedFile = (id: string) => {
    setUploadQueue(prev => {
      const item = prev.find(entry => entry.id === id)
      if (item) URL.revokeObjectURL(item.previewUrl)
      return prev.filter(entry => entry.id !== id)
    })
  }

  const uploadPhotos = () => {
    if (!photoRow || uploadQueue.length === 0) return
    setPhotoError('')
    startPhotoUploadTransition(async () => {
      setUploadQueue(prev => prev.map(item => ({ ...item, status: 'uploading', error: undefined })))
      const formData = new FormData()
      formData.append('inventoryId', String(photoRow.inventoryId))
      formData.append('inventoryNumber', photoRow.inventoryNumber ?? '')
      uploadQueue.forEach(item => formData.append('files', item.file))

      try {
        const res = await fetch('/api/inventory/photos', { method: 'POST', body: formData })
        const payload = await res.json()
        if (!res.ok) {
          setPhotoError(payload.error ?? 'Upload failed.')
          setUploadQueue(prev => prev.map(item => ({ ...item, status: 'failed', error: payload.error ?? 'Upload failed.' })))
          return
        }

        const successNames = new Set<string>()
        const failedByName = new Map<string, string>()
        const uploadedPhotos: InventoryPhoto[] = []
        for (const result of payload.results as Array<{ name: string; success: boolean; error?: string; photo?: InventoryPhoto }>) {
          if (result.success) {
            successNames.add(result.name)
            if (result.photo) uploadedPhotos.push(result.photo)
          } else {
            failedByName.set(result.name, result.error ?? 'Upload failed.')
          }
        }

        setPhotos(prev => [...uploadedPhotos, ...prev])
        if (uploadedPhotos.length > 0) refreshPhotoCount(photoRow.inventoryId, uploadedPhotos.length)
        setUploadQueue(prev => prev
          .map(item => successNames.has(item.file.name)
            ? { ...item, status: 'uploaded' as const }
            : { ...item, status: 'failed' as const, error: failedByName.get(item.file.name) ?? item.error ?? 'Upload failed.' }))
        setUploadQueue(prev => {
          const failed = prev.filter(item => item.status === 'failed')
          prev.filter(item => item.status === 'uploaded').forEach(item => URL.revokeObjectURL(item.previewUrl))
          return failed
        })
      } catch {
        setPhotoError('Upload failed.')
        setUploadQueue(prev => prev.map(item => ({ ...item, status: 'failed', error: 'Upload failed.' })))
      }
    })
  }

  const deletePhoto = (photo: InventoryPhoto) => {
    if (!photoRow) return
    startPhotoDeleteTransition(async () => {
      setPhotoError('')
      try {
        const res = await fetch('/api/inventory/photos', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId: photo.documentId }),
        })
        const payload = await res.json()
        if (!res.ok) {
          setPhotoError(payload.error ?? 'Could not delete photo.')
          return
        }
        setPhotos(prev => prev.filter(item => item.documentId !== photo.documentId))
        refreshPhotoCount(photoRow.inventoryId, -1)
      } catch {
        setPhotoError('Could not delete photo.')
      }
    })
  }

  const sendEmail = async () => {
    if (!emailRow) return
    if (!emailConfigured) {
      setEmailError('Email is not configured yet — add SMTP_HOST, SMTP_USER, SMTP_PASSWORD and EMAIL_FROM_ADDRESS to the environment.')
      return
    }
    if (emailRecipients.length === 0) {
      setEmailError('Add at least one recipient before sending.')
      return
    }
    setEmailError('')
    setIsEmailSending(true)
    try {
      const rows = emailRows.length > 0 ? emailRows : [emailRow]
      const recipients = emailRecipients.map(recipient => ({ recipientType: recipient.recipientType, recipientId: recipient.recipientId }))
      setEmailProgress(rows.map(row => ({ inventoryId: row.inventoryId, label: row.registrationNo ?? row.inventoryNumber ?? `Vehicle #${row.inventoryId}`, status: 'pending' })))
      if (rows.length > 1) {
        const limits = await getInventoryBulkEmailConfig()
        if (!limits) {
          setEmailError('Not authorized.')
          return
        }
        if (rows.length > limits.maxVehicles) {
          setEmailError(`Select no more than ${limits.maxVehicles} vehicles for bulk email.`)
          return
        }
        if (recipients.length > limits.maxRecipients || rows.length * recipients.length > limits.maxMessages) {
          setEmailError(`Bulk email is limited to ${limits.maxVehicles} vehicles, ${limits.maxRecipients} recipients, and ${limits.maxMessages} total emails.`)
          return
        }
      }

      const failures: string[] = []
      let sentCount = 0
      for (const row of rows) {
        setEmailProgress(prev => prev.map(item => item.inventoryId === row.inventoryId ? { ...item, status: 'sending' } : item))
        const result = await sendInventoryEmail(row.inventoryId, { recipients })
        if (result.success) {
          sentCount += 1
          setEmailProgress(prev => prev.map(item => item.inventoryId === row.inventoryId ? { ...item, status: 'sent' } : item))
        } else {
          const message = result.error ?? 'Email failed.'
          failures.push(row.registrationNo ?? row.inventoryNumber ?? `Vehicle #${row.inventoryId}`)
          setEmailProgress(prev => prev.map(item => item.inventoryId === row.inventoryId ? { ...item, status: 'failed', error: message } : item))
        }
      }
      if (sentCount === 0) {
        setEmailError('Could not send email for any selected vehicle.')
        return
      }
      setEmailSentMessage(`${sentCount} vehicle${sentCount === 1 ? '' : 's'} sent to ${emailRecipients.length} recipient${emailRecipients.length === 1 ? '' : 's'}.${failures.length > 0 ? ` Failed: ${failures.join(', ')}.` : ''}`)
    } finally {
      setIsEmailSending(false)
    }
  }

  const save = () => {
    setError('')
    const newErrors: Record<string, boolean> = {}

    if (!form.registrationNo?.trim()) {
      newErrors.registrationNo = true
    }
    if (!catalogMakeText.trim() || !catalogModelText.trim() || !form.fkVariantId || !catalogVariantText.trim()) {
      newErrors.fkVariantId = true
    }
    if (form.year === null || form.year === undefined) {
      newErrors.year = true
    }
    if (form.year !== null && form.year !== undefined && !isValidYear(form.year)) {
      newErrors.year = true
    }
    if (form.isCarRegistered === true && !form.tax.trim()) {
      newErrors.tax = true
    }
    if (form.isCarRegistered === true && form.kmsDriven === null) {
      newErrors.kmsDriven = true
    }
    if (!form.colour.trim()) {
      newErrors.colour = true
    }
    if (!form.fuelType.trim()) {
      newErrors.fuelType = true
    }
    if (form.kmsDriven !== null && Number(form.kmsDriven) < 0) {
      newErrors.kmsDriven = true
    }
    if (form.noOfOwners === null || form.noOfOwners === undefined || !Number.isInteger(form.noOfOwners) || form.noOfOwners < 1) {
      newErrors.noOfOwners = true
    }
    if (form.price === null || !Number.isFinite(form.price) || form.price <= 0) {
      newErrors.price = true
    }
    if (form.isCarRegistered === true && !form.insuranceType.trim()) {
      newErrors.insuranceType = true
    }
    if (form.mobileNoOwnedBy && !isValidInventoryOwnerMobile(form.mobileNoOwnedBy)) {
      newErrors.mobileNoOwnedBy = true
    }
    if (form.emailIdOwnedBy && !isValidEmail(form.emailIdOwnedBy)) {
      newErrors.emailIdOwnedBy = true
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setErrors({})

    const saveForm = {
      ...form,
      makeLegacy: form.makeLegacy.trim() || catalogMakeText.trim(),
      modelLegacy: form.modelLegacy.trim() || catalogModelText.trim(),
      variantLegacy: form.variantLegacy.trim() || catalogVariantText.trim(),
    }

    startTransition(async () => {
      const result = editId ? await updateInventory(editId, saveForm) : await createInventory(saveForm)
      if (!result.success) {
        setError(result.error ?? 'Something went wrong.')
        return
      }
      setModal(null)
      const savedInventoryId = result.inventoryId
      const shouldPromptInquiry = savedInventoryId !== undefined && (
        editId
          ? (form.status === 'Booked' || form.status === 'Sold') && form.status !== (originalStatus ?? '')
          : (form.status === 'Booked' || form.status === 'Sold')
      )
      if (shouldPromptInquiry) {
        setPendingInventoryRefresh(true)
        openInquirySync(buildInventoryRowFromForm(savedInventoryId, result.inventoryNumber ?? currentInventoryNumber))
        return
      }
      window.location.reload()
    })
  }

  const del = () => {
    if (!deleteId) return
    startTransition(async () => {
      const result = await deleteInventory(deleteId)
      if (result.success) {
        setData(prev => prev.filter(r => r.inventoryId !== deleteId))
      } else {
        setError(result.error ?? 'Could not delete this record.')
      }
      setDeleteId(null)
    })
  }

  const exportAllMatchingRows = () => {
    setExportError('')
    startExportTransition(async () => {
      try {
        await exportInventoryCsvFromServer(filters)
      } catch (err) {
        setExportError(err instanceof Error ? err.message : 'Could not export inventory.')
      }
    })
  }

  return (
    <div>
      <PageHeader
        title="Inventory Management"
        subtitle={`${total.toLocaleString('en-IN')} vehicles${filters.status !== 'All' ? ` · ${filters.status}` : ''}`}
        action={
          <div className="flex items-center gap-2">
            <Btn variant="outline" size="sm" onClick={openBulkEmail} disabled={selectedInventoryIds.length === 0}>
              <Mail className="w-3.5 h-3.5" />Send Email{selectedInventoryIds.length > 0 ? ` (${selectedInventoryIds.length})` : ''}
            </Btn>
            <Btn variant="outline" size="sm" onClick={exportAllMatchingRows} disabled={isExporting || total === 0}>
              <Download className="w-3.5 h-3.5" />{isExporting ? 'Exporting...' : `${hasActiveFilters ? 'Export Filtered' : 'Export All'} (${total})`}
            </Btn>
            <Btn size="sm" onClick={openAdd}><Plus className="w-3.5 h-3.5" />Add Vehicle</Btn>
          </div>
        }
      />

      {exportError ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{exportError}</div>
      ) : null}

      <div className="mb-4 space-y-3 rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto]">
          <SearchBar value={searchInput} onChange={setSearchInput} placeholder="Search make, model, variant, colour, owner, mobile or registration..." disabled={isListLoading} />
          <Select disabled={isListLoading} value={filters.status} onChange={e => {
            const nextStatus = e.target.value
            setFilter('status', nextStatus)
          }}>
            <option value="All">All Statuses</option>
            {INVENTORY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select disabled={isListLoading} value={filters.fuelType} onChange={e => {
            const nextFuelType = e.target.value
            setFilter('fuelType', nextFuelType)
          }}>
            <option value="">All Fuels</option>
            {INVENTORY_FUEL_TYPES.map(option => <option key={option} value={option}>{option}</option>)}
          </Select>
          <Select disabled={isListLoading} value={filters.ownedType} onChange={e => setFilter('ownedType', e.target.value)}>
            <option value="">All Owner Types</option>
            <option value="Excel Cars">Excel Cars</option>
            <option value="Dealer">Dealer</option>
            <option value="Individual">Individual</option>
          </Select>
          {hasActiveFilters ? <Btn variant="ghost" onClick={clearAllFilters} disabled={isListLoading}>Clear All</Btn> : null}
        </div>

        {activeFilterChips.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {activeFilterChips.map(chip => (
              <button
                key={`${chip.key}-${chip.label}`}
                type="button"
                onClick={() => {
                  if (chip.key === 'search') {
                    setSearchInput('')
                    setFilter('search', '')
                    return
                  }
                  if (chip.key === 'status') {
                    setFilter('status', 'All')
                    return
                  }
                  if (chip.key === 'make') {
                    setFilter('make', '')
                    setFilter('model', '')
                    return
                  }
                  if (chip.key === 'model') {
                    setFilter('model', '')
                    return
                  }
                  if (chip.key === 'fuelType') {
                    setFilter('fuelType', '')
                    return
                  }
                  setFilter(chip.key, '')
                }}
                className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
              >
                {chip.label}<X className="w-3 h-3" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className={`space-y-3 transition-opacity ${isListLoading ? 'opacity-60' : 'opacity-100'}`}>
        {isListLoading ? (
          <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading inventory results...</span>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-gray-500">{selectedInventoryIds.length > 0 ? `${selectedInventoryIds.length} vehicle${selectedInventoryIds.length === 1 ? '' : 's'} selected` : 'Select vehicles for bulk email'}</span>
          <div className="flex gap-2">
            <Btn variant="ghost" size="sm" onClick={() => setSelectedInventoryIds(filtered.map(row => row.inventoryId))} disabled={filtered.length === 0}>Select visible</Btn>
            {selectedInventoryIds.length > 0 ? <Btn variant="ghost" size="sm" onClick={() => setSelectedInventoryIds([])}>Clear selection</Btn> : null}
          </div>
        </div>
        <div className="[&_table]:min-w-0 [&_th]:px-2 [&_td]:px-2 [&_th:first-child]:w-16 [&_th:first-child]:min-w-16 [&_th:first-child]:max-w-16 [&_td:first-child]:w-16 [&_td:first-child]:min-w-16 [&_td:first-child]:max-w-16">
        <Table headers={['Select', 'Sr. No.', 'Make / Model / Variant', 'Year / Month / Colour', 'No. of Owners / Tax / Fuel Type', 'Regi. No. / Kms Driven / Insurance Type', 'Price / Status', 'Owner Details', 'Customer Details', 'Actions']} empty={filtered.length === 0}>
          {filtered.map((r, index) => (
            <tr key={r.inventoryId} className="hover:bg-gray-50 transition">
            <td className="px-2 py-3 text-center"><input type="checkbox" checked={selectedInventoryIds.includes(r.inventoryId)} onChange={event => setSelectedInventoryIds(prev => event.target.checked ? [...prev, r.inventoryId] : prev.filter(id => id !== r.inventoryId))} aria-label={`Select ${r.registrationNo ?? r.inventoryNumber ?? 'vehicle'}`} /></td>
            <td className="px-4 py-3 text-center font-semibold text-gray-700">{((page - 1) * pageSize) + index + 1}</td>
            <td className="px-4 py-3">
              <InventoryDetailCell items={[
                ['Make', clean(r.carVariantMaster?.carMakeMaster?.make ?? r.makeLegacy)],
                ['Model', clean(r.carVariantMaster?.carModelMaster?.model ?? r.modelLegacy)],
                ['Variant', clean(r.carVariantMaster?.variant ?? r.variantLegacy)],
              ]} />
            </td>
            <td className="px-4 py-3">
              <InventoryDetailCell items={[
                ['Year', r.year],
                ['Month', r.month],
                ['Colour', r.colour],
              ]} />
            </td>
            <td className="px-4 py-3">
              <InventoryDetailCell items={[
                ['No. of Owners', r.noOfOwners],
                ['Tax', r.tax],
                ['Fuel Type', r.fuelType],
              ]} />
            </td>
            <td className="px-4 py-3">
              <InventoryDetailCell items={[
                ['Regi. No', r.registrationNo],
                ['Kms Driven', r.kmsDriven !== null ? Number(r.kmsDriven).toFixed(2) : null],
                ['Insurance Type', r.insuranceType],
              ]} />
            </td>
            <td className="px-4 py-3">
              <InventoryDetailCell items={[
                ['Price', r.price !== null ? Number(r.price).toFixed(2) : null],
                ['Status', r.status],
              ]} />
            </td>
            <td className="px-4 py-3">
              <InventoryDetailCell items={[
                ['Owned Type', r.ownedType],
                ['Owned By', r.ownedBy],
                ['Mobile', r.mobileNoOwnedBy],
                ['Email', r.emailIdOwnedBy],
              ]} />
            </td>
            <td className="px-4 py-3">
              <InventoryDetailCell items={[
                ['Customer', r.customerName ?? r.customer?.custName],
                ['Mobile', r.customer?.custMobile],
                ['Email', r.customer?.custEmail],
              ]} />
            </td>
            <td className="px-4 py-3">
              <div className="flex items-center flex-wrap gap-1">
                <button onClick={() => openView(r)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="View"><Eye className="w-3.5 h-3.5" /></button>
                <button onClick={() => openInquirySync(r)} className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded transition" title="Update Inquiry"><Link2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => openPhotos(r)} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition" title="Manage Photos">
                  <span className="relative inline-flex">
                    <Images className="w-3.5 h-3.5" />
                    {r._count.inventoryPhotos > 0 ? <span className="absolute -right-2 -top-2 min-w-4 h-4 px-1 rounded-full bg-amber-500 text-[10px] leading-4 text-white text-center">{r._count.inventoryPhotos}</span> : null}
                  </span>
                </button>
                <button onClick={() => openEmail(r)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition" title="Send Email"><Mail className="w-3.5 h-3.5" /></button>
                <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-[#1B2A6B] hover:bg-blue-50 rounded transition" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDeleteId(r.inventoryId)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </td>
            </tr>
          ))}
        </Table>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-gray-500">
          Page {page} of {pageCount} · {total.toLocaleString('en-IN')} total records
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Rows</span>
            <Select
              value={String(pageSize)}
              onChange={e => pushQuery({ pageSize: e.target.value, page: '1' })}
              className="min-w-24"
              disabled={isListLoading}
            >
              {PAGE_SIZE_OPTIONS.map(option => <option key={option} value={option}>{option} / page</option>)}
            </Select>
          </div>
          <div className="flex gap-1.5">
            <Btn variant="outline" size="sm" disabled={page <= 1 || isPending || isListLoading} onClick={() => pushQuery({ page: String(page - 1) })}>
              <ChevronLeft className="w-3.5 h-3.5" />Prev
            </Btn>
            <Btn variant="outline" size="sm" disabled={page >= pageCount || isPending || isListLoading} onClick={() => pushQuery({ page: String(page + 1) })}>
              Next<ChevronRight className="w-3.5 h-3.5" />
            </Btn>
          </div>
        </div>
      </div>

      <Modal title={modal === 'view' ? 'Vehicle Details' : editId ? 'Edit Vehicle' : 'Add New Vehicle'} open={!!modal} onClose={requestModalClose} width="max-w-5xl">
        {modal === 'view' ? (
          detailLoading ? (
            <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-sm text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <div>Loading vehicle details...</div>
            </div>
          ) : detailError ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{detailError}</div>
              <div className="flex justify-end"><Btn variant="outline" onClick={requestModalClose}>Close</Btn></div>
            </div>
          ) : viewRow ? (
          <div className="space-y-6 text-sm">
            <div className="grid grid-cols-2 gap-4">
              {[
              ['Inventory No', viewRow.inventoryNumber],
              ['SKU', viewRow.sku],
              ['Reg No', viewRow.registrationNo],
              ['Make', clean(viewRow.carVariantMaster?.carMakeMaster?.make ?? viewRow.makeLegacy)],
              ['Model', clean(viewRow.carVariantMaster?.carModelMaster?.model ?? viewRow.modelLegacy)],
              ['Variant', clean(viewRow.carVariantMaster?.variant ?? viewRow.variantLegacy)],
              ['Legacy Make', viewRow.makeLegacy],
              ['Legacy Model', viewRow.modelLegacy],
              ['Legacy Variant', viewRow.variantLegacy],
              ['Year', viewRow.year],
              ['Month', viewRow.month],
              ['Colour', viewRow.colour],
              ['Fuel', viewRow.fuelType],
              ['Owners', viewRow.noOfOwners],
              ['Tax', viewRow.tax],
              ['Registered', viewRow.isCarRegistered === null ? null : viewRow.isCarRegistered ? 'Yes' : 'No'],
              ['KM Driven', viewRow.kmsDriven !== null ? Number(viewRow.kmsDriven).toLocaleString('en-IN') : null],
              ['Insurance', viewRow.insuranceType],
              ['Price', fmt(viewRow.price)],
              ['Status', viewRow.status],
              ['Owner Type', viewRow.ownedType],
              ['Owned By', viewRow.ownedBy],
              ['Owner Mobile', viewRow.mobileNoOwnedBy],
              ['Owner Email', viewRow.emailIdOwnedBy],
              ['Linked Customer', viewRow.customer?.custName],
              ['Linked Customer Mobile', viewRow.customer?.custMobile],
              ['Linked Customer Email', viewRow.customer?.custEmail],
              ['Customer / Source', viewRow.customerName],
              ['Internal Comments', viewRow.internalComments],
              ['Remarks', viewRow.otherRemarks],
              ].map(([k, v]) => (
                <div key={String(k)}>
                  <div className="text-xs text-gray-400 mb-0.5">{k}</div>
                  <div className="font-medium text-gray-800">{v != null && v !== '' ? String(v) : '—'}</div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="mb-3 text-sm font-semibold text-gray-900">Email Link Tracking</div>
              {!viewRow.vehicleEmailLinks || viewRow.vehicleEmailLinks.length === 0 ? (
                <div className="text-sm text-gray-500">No tracked vehicle emails have been sent for this inventory record yet.</div>
              ) : (
                <div className="space-y-3">
                  {viewRow.vehicleEmailLinks.map(link => (
                    <div key={link.vehicleEmailLinkId} className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="font-medium text-gray-900">{link.recipientName || 'Recipient'}</div>
                          <div className="text-xs text-gray-500">{link.recipientEmail}</div>
                        </div>
                        <div className="text-xs font-medium text-gray-500">
                          Viewed: <span className={link.firstHumanViewAt ? 'text-green-700' : 'text-gray-700'}>{link.firstHumanViewAt ? 'Yes' : 'No'}</span>
                        </div>
                      </div>
                        <div className="mt-3 grid gap-3 text-xs text-gray-600 md:grid-cols-2 xl:grid-cols-5">
                          <div><span className="font-medium text-gray-800">Sent:</span> {fmtDateTime(link.emailSentAt)}</div>
                          <div><span className="font-medium text-gray-800">First Request:</span> {fmtDateTime(link.firstRequestedAt)}</div>
                          <div><span className="font-medium text-gray-800">First Human View:</span> {fmtDateTime(link.firstHumanViewAt)}</div>
                          <div><span className="font-medium text-gray-800">Last Request:</span> {fmtDateTime(link.lastRequestedAt)}</div>
                          <div><span className="font-medium text-gray-800">Requests / Human Views:</span> {link.requestCount} / {link.humanViewCount}</div>
                        </div>
                        <div className="mt-3 grid gap-3 text-xs text-gray-600 md:grid-cols-2 xl:grid-cols-5">
                          <div><span className="font-medium text-gray-800">Call Clicks:</span> {link.interactionSummary?.callClickCount ?? 0}</div>
                          <div><span className="font-medium text-gray-800">WhatsApp Clicks:</span> {link.interactionSummary?.whatsappClickCount ?? 0}</div>
                          <div><span className="font-medium text-gray-800">Enquire Clicks:</span> {link.interactionSummary?.emailClickCount ?? 0}</div>
                          <div><span className="font-medium text-gray-800">First Interaction:</span> {fmtDateTime(link.interactionSummary?.firstInteractionAt)}</div>
                          <div><span className="font-medium text-gray-800">Last Interaction:</span> {fmtDateTime(link.interactionSummary?.lastInteractionAt)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
              )}
            </div>
          </div>
          ) : null
        ) : modal ? (
          detailLoading && editId ? (
            <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-sm text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <div>Loading vehicle details...</div>
            </div>
          ) : detailError && editId ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{detailError}</div>
              <div className="flex justify-end"><Btn variant="outline" onClick={requestModalClose}>Close</Btn></div>
            </div>
          ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Input label="Inventory No" value={currentInventoryNumber ?? 'Auto-generated on save'} readOnly disabled />
              <Input label="SKU" value={currentSku ?? 'Enter make, model, and colour'} readOnly disabled />
              <Input label="Registration No *" value={form.registrationNo} onChange={e => f('registrationNo', normalizeRegistrationNo(e.target.value))} placeholder="Any registration value" error={errors.registrationNo} />
              <Select label="Status" value={form.status} onChange={e => f('status', e.target.value)}>
                {INVENTORY_STATUSES.map(s => <option key={s}>{s}</option>)}
              </Select>
              <CatalogTextPicker label="Make *" value={catalogMakeText} onChange={value => void onCatalogMakeChange(value)} placeholder="Search make..." options={makes.map(make => make.make ?? '').filter(Boolean)} error={errors.fkVariantId} />
              <CatalogTextPicker label="Model *" value={catalogModelText} onChange={value => void onCatalogModelChange(value)} placeholder={selectedMakeId ? 'Search model...' : 'Select make first'} options={models.map(model => model.model ?? '').filter(Boolean)} error={errors.fkVariantId} />
              <CatalogTextPicker label="Variant *" value={catalogVariantText} onChange={value => { setCatalogVariantText(value); const match = variants.find(item => item.variant?.trim().toLowerCase() === value.trim().toLowerCase()); f('fkVariantId', match?.pkVariantId ?? null) }} placeholder={selectedModelId ? 'Search variant...' : 'Select model first'} options={variants.map(variant => variant.variant ?? '').filter(Boolean)} error={errors.fkVariantId} />
              <Input label="Year *" type="number" value={form.year ?? ''} onChange={e => f('year', e.target.value ? +e.target.value : null)} error={errors.year} />
              <Input label="Month" value={form.month} onChange={e => f('month', e.target.value)} placeholder="Jan / Feb / Mar" />
              <CatalogTextPicker label="Colour *" value={form.colour} onChange={value => f('colour', value)} placeholder="Search or enter colour..." options={inventoryColours} error={errors.colour} />
              <Select label="Fuel Type *" value={form.fuelType} onChange={e => f('fuelType', e.target.value)} error={errors.fuelType}>
                <option value="">Select Fuel Type</option>
                {form.fuelType && !INVENTORY_FUEL_TYPES.includes(form.fuelType) ? <option value={form.fuelType}>{form.fuelType}</option> : null}
                {INVENTORY_FUEL_TYPES.map(fuelType => <option key={fuelType} value={fuelType}>{fuelType}</option>)}
              </Select>
              <Input label="No. of Owners *" type="number" min={1} step={1} value={form.noOfOwners ?? ''} onChange={e => f('noOfOwners', e.target.value ? +e.target.value : null)} error={errors.noOfOwners} />
              <Select label={`Tax${form.isCarRegistered === true ? ' *' : ''}`} value={form.tax} onChange={e => f('tax', e.target.value)} error={errors.tax}>
                <option value="">Select Tax Type</option>
                <option value="Individual">Individual</option>
                <option value="Corporate">Corporate</option>
              </Select>
              <Select label="Car Registered" value={form.isCarRegistered === null ? '' : form.isCarRegistered ? 'yes' : 'no'} onChange={e => f('isCarRegistered', e.target.value === 'yes' ? true : e.target.value === 'no' ? false : null)}>
                <option value="">Select</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </Select>
              <Input
                label={`KM Driven${form.isCarRegistered === true ? ' *' : ''}`}
                type="text"
                inputMode="decimal"
                value={formatPriceInput(form.kmsDriven)}
                onChange={e => {
                  const raw = e.target.value.replace(/,/g, '').replace(/[^\d.]/g, '')
                  const parts = raw.split('.')
                  const normalized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : raw
                  f('kmsDriven', normalized ? Number(normalized) : null)
                }}
                error={errors.kmsDriven}
              />
              <Input label={`Insurance Type${form.isCarRegistered === true ? ' *' : ''}`} value={form.insuranceType} onChange={e => f('insuranceType', e.target.value)} placeholder="Comprehensive / Expired" error={errors.insuranceType} />
              <Input
                label="Price (₹) *"
                type="text"
                inputMode="decimal"
                value={formatPriceInput(form.price)}
                onChange={e => {
                  const raw = e.target.value.replace(/,/g, '').replace(/[^\d.]/g, '')
                  const parts = raw.split('.')
                  const normalized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : raw
                  f('price', normalized ? Number(normalized) : null)
                }}
                error={errors.price}
              />
              <Select label="Owner Type *" value={form.ownedType} onChange={e => onOwnerTypeChange(e.target.value)} error={errors.ownedType}>
                <option value="">Select Owner Type</option>
                {form.ownedType && !['Excel Cars', 'Dealer', 'Individual'].includes(form.ownedType) ? <option value={form.ownedType}>{form.ownedType}</option> : null}
                <option value="Excel Cars">Excel Cars</option>
                <option value="Dealer">Dealer</option>
                <option value="Individual">Individual</option>
              </Select>
              {form.ownedType === 'Dealer' ? (
                <CatalogTextPicker label="Name of Owner *" value={form.ownedBy} onChange={onDealerChange} placeholder="Search dealer..." options={dealers.map(dealer => dealer.dealerName ?? '').filter(Boolean)} error={errors.ownedBy} />
              ) : (
                <Input label="Name of Owner *" value={form.ownedBy} autoComplete="new-password" onChange={e => f('ownedBy', e.target.value)} error={errors.ownedBy} />
              )}
              <Input label="Owner Mobile" value={form.mobileNoOwnedBy} onChange={e => f('mobileNoOwnedBy', e.target.value.replace(/\D/g, '').slice(0, 11))} inputMode="numeric" maxLength={11} error={errors.mobileNoOwnedBy} />
              <Input label="Owner Email" type="email" value={form.emailIdOwnedBy} onChange={e => f('emailIdOwnedBy', e.target.value)} error={errors.emailIdOwnedBy} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Customer</label>
                <CustomerPicker value={selectedCustomer} onChange={onCustomerChange} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Textarea label="Internal Comments" value={form.internalComments} onChange={e => f('internalComments', e.target.value)} />
              <Textarea label="Remarks" value={form.otherRemarks} onChange={e => f('otherRemarks', e.target.value)} />
            </div>

            {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}

            <div className="flex gap-3 justify-end pt-2">
              <Btn variant="outline" onClick={requestModalClose}>Cancel</Btn>
              <Btn onClick={save} disabled={isPending}>{isPending ? 'Saving...' : 'Save Vehicle'}</Btn>
            </div>
            <datalist id="inventory-makes">
              {makes.map(make => <option key={make.pkMakeId} value={make.make ?? ''} />)}
            </datalist>
            <datalist id="inventory-models">
              {models.map(model => <option key={model.pkModelId} value={model.model ?? ''} />)}
            </datalist>
            <datalist id="inventory-variants">
              {variants.map(variant => <option key={variant.pkVariantId} value={variant.variant ?? ''} />)}
            </datalist>
          </div>
          )
        ) : null}
      </Modal>

      <Modal
        title={`Add ${catalogAddType === 'make' ? 'Make' : catalogAddType === 'model' ? 'Model' : 'Variant'}`}
        open={catalogAddType !== null}
        onClose={() => { if (!catalogAddPending) setCatalogAddType(null) }}
        width="max-w-md"
      >
        <div className="space-y-4">
          <Input label="Name" value={catalogAddValue} onChange={event => setCatalogAddValue(event.target.value)} autoFocus />
          {catalogAddError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{catalogAddError}</div>}
          <div className="flex justify-end gap-3">
            <Btn variant="outline" onClick={() => setCatalogAddType(null)} disabled={catalogAddPending}>Cancel</Btn>
            <Btn onClick={() => void addCatalogValue()} disabled={catalogAddPending || !catalogAddValue.trim()}>{catalogAddPending ? 'Adding...' : 'Add'}</Btn>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        onConfirm={closeModalImmediately}
        title="Discard changes?"
        confirmLabel="Discard"
        message="You have unsaved changes in this vehicle form. Discard them and close?"
      />

      <ConfirmDialog
        open={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={del}
        message="This will permanently delete the vehicle record. This action cannot be undone."
      />

      <Modal title={`Send Car Details${emailRows.length > 1 ? ` — ${emailRows.length} vehicles` : emailRow ? ` — ${emailRow.registrationNo ?? emailRow.sku ?? ''}` : ''}`} open={!!emailRow} onClose={() => setEmailRow(null)}>
        {emailRow && (
          emailSentMessage ? (
            <div className="space-y-4">
              {emailRows.length > 1 ? <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2 text-xs text-gray-600">{emailSentMessage ? 'Email sent for these vehicles' : 'Sending these vehicles'}: {emailRows.map(row => row.registrationNo ?? row.inventoryNumber ?? `#${row.inventoryId}`).join(', ')}</div> : null}
              {emailProgress.length > 0 ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 space-y-2">
                  <div className="flex items-center justify-between text-xs font-medium text-gray-600">
                    <span>{emailProgress.some(item => item.status === 'sending') ? `Sending ${emailProgress.findIndex(item => item.status === 'sending') + 1} of ${emailProgress.length} vehicles` : 'Email sending completed'}</span>
                    <span>{emailProgress.filter(item => item.status === 'sent' || item.status === 'failed').length} of {emailProgress.length}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-200"><div className="h-full rounded-full bg-[#1B2A6B] transition-all" style={{ width: `${(emailProgress.filter(item => item.status === 'sent' || item.status === 'failed').length / emailProgress.length) * 100}%` }} /></div>
                  <div className="space-y-1 text-xs">
                    {emailProgress.map(item => <div key={item.inventoryId} className="flex items-center justify-between gap-3"><span className="truncate">{item.label}</span><span className={item.status === 'sent' ? 'text-green-600' : item.status === 'failed' ? 'text-red-600' : item.status === 'sending' ? 'text-blue-600' : 'text-gray-400'}>{item.status === 'sent' ? 'Sent' : item.status === 'failed' ? `Failed${item.error ? `: ${item.error}` : ''}` : item.status === 'sending' ? 'Sending...' : 'Waiting'}</span></div>)}
                  </div>
                </div>
              ) : null}
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">{emailSentMessage}</div>
              <div className="flex justify-end"><Btn onClick={() => setEmailRow(null)}>Close</Btn></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-1.5">
                {(['customer', 'dealer'] as const).map(t => (
                  <button key={t} onClick={() => setRecipientType(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${recipientType === t ? 'text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    style={recipientType === t ? { backgroundColor: '#1B2A6B' } : {}}>
                    {t}
                  </button>
                ))}
              </div>

              {emailRecipients.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Recipients</div>
                  <div className="space-y-2">
                    {emailRecipients.map(recipient => (
                      <div key={recipient.key} className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium text-gray-800">{recipient.name}</div>
                            <div className="text-xs text-gray-500">{recipient.meta}{recipient.email ? ` · ${recipient.email}` : ''}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingRecipientEmailKey(recipient.key)
                                setRecipientEmailDraft(recipient.email ?? '')
                                setRecipientEmailError('')
                              }}
                              className="text-xs font-medium text-[#1B2A6B] hover:underline"
                            >
                              {recipient.email ? 'Update email' : 'Add email'}
                            </button>
                            <button type="button" onClick={() => removeEmailRecipient(recipient.key)} className="text-gray-400 hover:text-red-600">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {editingRecipientEmailKey === recipient.key ? (
                          <div className="mt-3 flex flex-wrap items-start gap-2">
                            <div className="min-w-52 flex-1">
                              <input
                                type="email"
                                autoFocus
                                value={recipientEmailDraft}
                                onChange={event => { setRecipientEmailDraft(event.target.value); setRecipientEmailError('') }}
                                placeholder="Email address"
                                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1B2A6B] focus:ring-1 focus:ring-[#1B2A6B]"
                              />
                              {recipientEmailError ? <div className="mt-1 text-xs text-red-600">{recipientEmailError}</div> : null}
                            </div>
                            <Btn size="sm" onClick={() => saveRecipientEmail(recipient)} disabled={isPending}>Save email</Btn>
                            <Btn size="sm" variant="outline" onClick={() => { setEditingRecipientEmailKey(null); setRecipientEmailDraft(''); setRecipientEmailError('') }} disabled={isPending}>Cancel</Btn>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {recipientType === 'customer' ? (
                <div className="space-y-2">
                  {emailRow.customer ? (
                    <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2.5">
                      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[#1B2A6B]">Suggested linked customer</div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-gray-800">{emailRow.customer.custName}</div>
                          <div className="truncate text-xs text-gray-500">
                            {emailRow.customer.custMobile ?? '—'}{emailRow.customer.custEmail ? ` · ${emailRow.customer.custEmail}` : ''}
                          </div>
                        </div>
                        <Btn
                          size="sm"
                          onClick={() => addEmailRecipient({
                            key: `customer-${emailRow.customer!.custId}`,
                            recipientType: 'customer',
                            recipientId: emailRow.customer!.custId,
                            name: emailRow.customer!.custName,
                            email: emailRow.customer!.custEmail,
                            meta: emailRow.customer!.custMobile ?? 'Customer',
                          })}
                          disabled={emailRecipients.some(recipient => recipient.key === `customer-${emailRow.customer!.custId}`)}
                        >
                          {emailRecipients.some(recipient => recipient.key === `customer-${emailRow.customer!.custId}`) ? 'Added' : 'Add'}
                        </Btn>
                      </div>
                    </div>
                  ) : null}
                  <CustomerPicker value={emailSelectedCustomer} onChange={customer => {
                    setEmailSelectedCustomer(customer)
                    if (!customer) return
                    addEmailRecipient({
                      key: `customer-${customer.custId}`,
                      recipientType: 'customer',
                      recipientId: customer.custId,
                      name: customer.custName,
                      email: customer.custEmail,
                      meta: customer.custMobile ?? 'Customer',
                    })
                    setEmailSelectedCustomer(null)
                  }} />
                  <div className="text-xs text-gray-400">Select a customer to add them to the send list. The inventory&apos;s linked customer is suggested above when available.</div>
                </div>
              ) : (
                <div className="relative">
                  {emailSelectedDealer ? (
                    <div className="flex items-center justify-between border border-gray-200 rounded-md px-3 py-2 bg-gray-50">
                      <div>
                        <div className="text-sm font-medium text-gray-800">{emailSelectedDealer.dealerName}</div>
                        <div className="text-xs text-gray-500">{emailSelectedDealer.dealerEmail}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Btn size="sm" onClick={() => {
                          if (!emailSelectedDealer) return
                          addEmailRecipient({
                            key: `dealer-${emailSelectedDealer.dealerId}`,
                            recipientType: 'dealer',
                            recipientId: emailSelectedDealer.dealerId,
                            name: emailSelectedDealer.dealerName ?? 'Dealer',
                            email: emailSelectedDealer.dealerEmail,
                            meta: 'Dealer',
                          })
                          setEmailSelectedDealer(null)
                        }}>Add</Btn>
                        <button type="button" onClick={() => setEmailSelectedDealer(null)} className="text-gray-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Input
                        placeholder="Search dealers with an email on file..."
                        value={dealerQuery}
                        onChange={e => { setDealerQuery(e.target.value); setDealerOpen(true) }}
                        onFocus={() => setDealerOpen(true)}
                      />
                      {dealerOpen && (
                        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                          {dealerMatches.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-400">No matches</div>
                          ) : dealerMatches.map(d => (
                            <button key={d.dealerId} type="button"
                              onClick={() => { setEmailSelectedDealer(d); setDealerOpen(false); setDealerQuery('') }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0">
                              <div className="font-medium text-gray-800">{d.dealerName}</div>
                              <div className="text-xs text-gray-500">{d.dealerEmail}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {emailError && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{emailError}</div>}
              {!emailConfigured && !emailError && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                  Email is not configured yet. Add <span className="font-mono">SMTP_HOST</span>, <span className="font-mono">SMTP_USER</span>, <span className="font-mono">SMTP_PASSWORD</span> and <span className="font-mono">EMAIL_FROM_ADDRESS</span> to the environment before sending.
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <Btn variant="outline" onClick={() => setEmailRow(null)}>Cancel</Btn>
                <Btn onClick={() => void sendEmail()} disabled={isPending || isEmailSending || !emailConfigured || emailRecipients.length === 0}>{isEmailSending ? 'Sending...' : `Send Email${emailRecipients.length > 0 ? ` (${emailRecipients.length})` : ''}`}</Btn>
              </div>
            </div>
          )
        )}
      </Modal>

      <Modal title={`Inventory Photos${photoRow ? ` — ${photoRow.registrationNo ?? photoRow.inventoryNumber ?? ''}` : ''}`} open={!!photoRow} onClose={() => {
        uploadQueue.forEach(item => URL.revokeObjectURL(item.previewUrl))
        setUploadQueue([])
        setPhotoRow(null)
        setPhotoError('')
      }} width="max-w-5xl">
        {photoRow ? (
          <div className="space-y-5">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              <div><span className="font-medium text-gray-800">Inventory No:</span> {photoRow.inventoryNumber ?? '—'}</div>
              <div><span className="font-medium text-gray-800">Vehicle:</span> {[clean(photoRow.carVariantMaster?.carMakeMaster?.make ?? photoRow.makeLegacy), clean(photoRow.carVariantMaster?.carModelMaster?.model ?? photoRow.modelLegacy), clean(photoRow.carVariantMaster?.variant ?? photoRow.variantLegacy)].filter(Boolean).join(' ') || '—'}</div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-gray-900">Existing Photos</h4>
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <Upload className="h-4 w-4" />Select Multiple Photos
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={e => {
                      onSelectFiles(e.target.files)
                      e.currentTarget.value = ''
                    }}
                  />
                </label>
              </div>

              {photoError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{photoError}</div>}

              {photoLoading ? (
                <div className="text-sm text-gray-400">Loading photos...</div>
              ) : photos.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">No photos on file yet.</div>
              ) : (
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {photos.map(photo => (
                    <div key={photo.documentId} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                      {photo.path?.startsWith('/uploads/') ? (
                        <img src={photo.path} alt={photo.fileName} className="h-40 w-full bg-gray-100 object-cover" />
                      ) : (
                        <div className="flex h-40 items-center justify-center bg-gray-100 px-3 text-center text-xs text-gray-500">
                          Legacy file reference only
                        </div>
                      )}
                      <div className="space-y-2 p-3">
                        <div className="truncate text-xs font-medium text-gray-700">{photo.fileName}</div>
                        {!photo.isUploadedHere ? <div className="text-[11px] text-amber-700">File unavailable in current app storage</div> : null}
                        <button
                          type="button"
                          onClick={() => deletePhoto(photo)}
                          disabled={isDeletingPhoto}
                          className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3 rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-gray-900">Upload Queue</h4>
                <Btn onClick={uploadPhotos} disabled={isUploadingPhotos || uploadQueue.length === 0}>
                  {isUploadingPhotos ? <><Loader2 className="h-4 w-4 animate-spin" />Uploading...</> : <><Upload className="h-4 w-4" />Upload Photos</>}
                </Btn>
              </div>

              {uploadQueue.length === 0 ? (
                <div className="text-sm text-gray-400">Select one or more JPG, PNG, or WEBP files up to 10 MB each.</div>
              ) : (
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {uploadQueue.map(item => (
                    <div key={item.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                      <img src={item.previewUrl} alt={item.file.name} className="h-32 w-full bg-gray-100 object-cover" />
                      <div className="space-y-1 p-3">
                        <div className="truncate text-xs font-medium text-gray-700">{item.file.name}</div>
                        <div className="text-[11px] text-gray-400">{(item.file.size / (1024 * 1024)).toFixed(2)} MB</div>
                        <div className={`text-[11px] font-medium ${item.status === 'failed' ? 'text-red-600' : item.status === 'uploaded' ? 'text-green-600' : item.status === 'uploading' ? 'text-blue-600' : 'text-gray-500'}`}>
                          {item.status === 'queued' ? 'Queued' : item.status === 'uploading' ? 'Uploading...' : item.status === 'uploaded' ? 'Uploaded' : item.error ?? 'Failed'}
                        </div>
                        {item.status === 'queued' || item.status === 'failed' ? (
                          <button type="button" onClick={() => removeQueuedFile(item.id)} className="text-[11px] font-medium text-gray-500 hover:text-red-600">
                            Remove
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal title={`Update Inquiry${inquiryRow ? ` — ${inquiryRow.registrationNo ?? inquiryRow.inventoryNumber ?? ''}` : ''}`} open={!!inquiryRow} onClose={() => {
        setInquiryRow(null)
        setSelectedInquiry(null)
        setInquiryMatches([])
        setInquiryQuery('')
        setInquiryError('')
        if (pendingInventoryRefresh) window.location.reload()
      }} width="max-w-4xl">
        {inquiryRow ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              <div><span className="font-medium text-gray-800">Vehicle:</span> {vehicleLabel(inquiryRow)}</div>
              <div><span className="font-medium text-gray-800">Inventory Status:</span> {inquiryRow.status ?? '—'}</div>
              <div><span className="font-medium text-gray-800">What this will do:</span> update the selected inquiry with this vehicle and move the lead to {inquiryRow.status === 'Sold' ? 'Closed / Sold Car' : 'FollowUp / Booked Vehicle'}.</div>
              <div><span className="font-medium text-gray-800">No inquiry exists?</span> You can skip this step and keep the inventory save as-is.</div>
            </div>

            <Input
              label="Find Inquiry"
              value={inquiryQuery}
              onChange={e => setInquiryQuery(e.target.value)}
              placeholder="Search by inquiry no, customer, mobile, or email..."
            />

            {inquiryError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{inquiryError}</div>}

            <div className="rounded-lg border border-gray-200">
              {inquiryLoading ? (
                <div className="px-4 py-6 text-sm text-gray-400">Loading inquiries...</div>
              ) : inquiryMatches.length === 0 ? (
                <div className="px-4 py-6 text-sm text-gray-400">No inquiries found.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {inquiryMatches.map(inquiry => {
                    const car = inquiry.inquiryCarDetails[0]
                    const isSelected = selectedInquiry?.inquiryId === inquiry.inquiryId
                    return (
                      <button
                        key={inquiry.inquiryId}
                        type="button"
                        onClick={() => setSelectedInquiry(inquiry)}
                        className={`w-full px-4 py-3 text-left transition ${isSelected ? 'bg-violet-50' : 'hover:bg-gray-50'}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {inquiry.customer?.custName ?? inquiry.customerNameLegacy ?? 'Unnamed Inquiry'}
                              <span className="ml-2 font-mono text-xs text-gray-500">{inquiry.inquiryNo ?? `Inquiry #${inquiry.inquiryId}`}</span>
                            </div>
                            <div className="mt-0.5 text-xs text-gray-500">{inquiry.mobileno ?? '—'} {inquiry.email ? `· ${inquiry.email}` : ''}</div>
                            <div className="mt-1 text-xs text-gray-600">Interested Car: {car ? vehicleLabel(car) : '—'}{car?.year ? ` · ${car.year}` : ''}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {inquiry.classification ? <Badge label={inquiry.classification} /> : null}
                            {inquiry.status ? <Badge label={inquiry.status} /> : null}
                            <button type="button" className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-[#1B2A6B] hover:bg-blue-50" onClick={() => router.push(`/inquiry?edit=${inquiry.inquiryId}`)}>
                              Open Inquiry
                            </button>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <Btn variant="outline" onClick={() => {
                setInquiryRow(null)
                setSelectedInquiry(null)
                setInquiryMatches([])
                setInquiryQuery('')
                setInquiryError('')
                if (pendingInventoryRefresh) window.location.reload()
              }}>Skip for now</Btn>
              <Btn onClick={syncInquiry} disabled={isSyncingInquiry || !selectedInquiry}>
                {isSyncingInquiry ? 'Updating...' : 'Update Inquiry'}
              </Btn>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
