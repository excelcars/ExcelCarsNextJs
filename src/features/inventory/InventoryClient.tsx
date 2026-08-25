/* eslint-disable @next/next/no-img-element */
'use client'


import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Eye, Mail, X, Images, Upload, Loader2, Download, SlidersHorizontal, Link2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge, Btn, Input, Select, Textarea, Modal, Table, PageHeader, SearchBar, ConfirmDialog } from '@/components/ui'
import { CustomerPicker } from '@/components/CustomerPicker'
import { INVENTORY_STATUSES } from './queries'
import { createInventory, updateInventory, deleteInventory, sendInventoryEmail, syncInventoryToInquiry, type InventoryFormInput } from './actions'
import { isValidEmail, isValidPhone, isValidYear } from '@/lib/validation'

interface CarMakeMaster { pkMakeId: number; make: string | null }
interface CarModelMaster { pkModelId: number; model: string | null }
interface CarVariantMaster { pkVariantId: number; variant: string | null }
interface Dealer { dealerId: number; dealerName: string | null; dealerEmail: string | null }
interface CustomerOption { custId: number; custName: string; custMobile: string | null; custEmail: string | null }

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
const fmtDateTime = (value: string | Date | null | undefined) => value ? new Date(value).toLocaleString('en-IN') : '—'
const clean = (v: string | null | undefined) => {
  const value = v?.trim()
  if (!value) return ''
  return ['null', 'na', 'n/a'].includes(value.toLowerCase()) ? '' : value
}
const text = (v: string | null | undefined) => clean(v).toLowerCase()
const num = (v: string | number | null | undefined) => (v === null || v === undefined || v === '' ? null : Number(v))

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
    'Inventory No',
    'Make',
    'Model',
    'Variant',
    'Colour',
    'SKU',
    'Year',
    'Month',
    'Fuel Type',
    'No Of Owners',
    'Tax',
    'Car Registered',
    'Registration No',
    'KM Driven',
    'Insurance Type',
    'Price',
    'Remarks',
    'Status',
    'Owned Type',
    'Owned By',
    'Owner Mobile',
    'Owner Email',
    'Customer ID',
    'Customer Name',
    'Internal Comments',
  ]

  const lines = [headers.map(csvValue).join(',')]
  for (const row of rows) {
    const make = clean(row.makeLegacy ?? row.carVariantMaster?.carMakeMaster?.make)
    const model = clean(row.modelLegacy ?? row.carVariantMaster?.carModelMaster?.model)
    const variant = clean(row.variantLegacy ?? row.carVariantMaster?.variant)
    const line = [
      row.inventoryNumber,
      make,
      model,
      variant,
      row.colour,
      row.sku,
      row.year,
      row.month,
      row.fuelType,
      row.noOfOwners,
      row.tax,
      row.isCarRegistered === null ? '' : row.isCarRegistered ? 'Yes' : 'No',
      row.registrationNo,
      row.kmsDriven,
      row.insuranceType,
      row.price,
      row.otherRemarks,
      row.status,
      row.ownedType,
      row.ownedBy,
      row.mobileNoOwnedBy,
      row.emailIdOwnedBy,
      row.customerId,
      row.customerName,
      row.internalComments,
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
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [modal, setModal] = useState<null | 'add' | 'edit' | 'view'>(null)
  const [form, setForm] = useState<InventoryFormInput>(emptyForm())
  const [editId, setEditId] = useState<number | null>(null)
  const [originalStatus, setOriginalStatus] = useState<string | null>(null)
  const [currentInventoryNumber, setCurrentInventoryNumber] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<Record<string, boolean>>({})
  const [isPending, startTransition] = useTransition()

  const [selectedMakeId, setSelectedMakeId] = useState<number | null>(null)
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null)
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
  const [recipientType, setRecipientType] = useState<'dealer' | 'customer'>('customer')
  const [dealerQuery, setDealerQuery] = useState('')
  const [dealerOpen, setDealerOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null)
  const [emailSelectedDealer, setEmailSelectedDealer] = useState<Dealer | null>(null)
  const [emailSelectedCustomer, setEmailSelectedCustomer] = useState<CustomerOption | null>(null)
  const [emailRecipients, setEmailRecipients] = useState<EmailRecipient[]>([])
  const [emailError, setEmailError] = useState('')
  const [emailSentMessage, setEmailSentMessage] = useState<string | null>(null)
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
  const inquiryDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inquiryRequestRef = useRef(0)
  const listDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [pendingInventoryRefresh, setPendingInventoryRefresh] = useState(false)
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

  const filterOptions = useMemo(() => {
    const getDistinct = (values: Array<string | null | undefined>) =>
      Array.from(new Set(values.map(clean).filter(Boolean))).sort((a, b) => a.localeCompare(b))

    const makeOptions = getDistinct(data.map(r => r.carVariantMaster?.carMakeMaster?.make ?? r.makeLegacy))
    const modelOptions = getDistinct(
      data
        .filter(r => !filters.make || clean(r.carVariantMaster?.carMakeMaster?.make ?? r.makeLegacy) === filters.make)
        .map(r => r.carVariantMaster?.carModelMaster?.model ?? r.modelLegacy),
    )

    return {
      makeOptions,
      modelOptions,
      fuelOptions: getDistinct(data.map(r => r.fuelType)),
      variantOptions: getDistinct(data.map(r => r.carVariantMaster?.variant ?? r.variantLegacy)),
      colourOptions: getDistinct(data.map(r => r.colour)),
      yearOptions: getDistinct(data.map(r => (r.year != null ? String(r.year) : null))),
      monthOptions: getDistinct(data.map(r => r.month)),
      ownerOptions: getDistinct(data.map(r => r.ownedBy)),
      ownerTypeOptions: getDistinct(data.map(r => r.ownedType)),
      insuranceOptions: getDistinct(data.map(r => r.insuranceType)),
      customerOptions: getDistinct(data.map(r => r.customerName)),
      linkedCustomerOptions: getDistinct(data.map(r => r.customer?.custName)),
    }
  }, [data, filters.make])

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase()
    return data.filter(r => {
      const make = clean(r.carVariantMaster?.carMakeMaster?.make ?? r.makeLegacy)
      const model = clean(r.carVariantMaster?.carModelMaster?.model ?? r.modelLegacy)
      const variant = clean(r.carVariantMaster?.variant ?? r.variantLegacy)
      const kmsDriven = num(r.kmsDriven)
      const price = num(r.price)
      const matches = !q
        || (r.inventoryNumber ?? '').toLowerCase().includes(q)
        || (r.registrationNo ?? '').toLowerCase().includes(q)
        || (r.sku ?? '').toLowerCase().includes(q)
        || make.toLowerCase().includes(q)
        || model.toLowerCase().includes(q)
        || variant.toLowerCase().includes(q)
        || (r.customerName ?? '').toLowerCase().includes(q)
        || (r.ownedBy ?? '').toLowerCase().includes(q)
      if (!matches) return false
      if (filters.status !== 'All' && r.status !== filters.status) return false
      if (filters.make && make !== filters.make) return false
      if (filters.model && model !== filters.model) return false
      if (filters.fuelType && clean(r.fuelType) !== filters.fuelType) return false
      if (filters.inventoryNumber && !text(r.inventoryNumber).includes(filters.inventoryNumber.toLowerCase())) return false
      if (filters.sku && !text(r.sku).includes(filters.sku.toLowerCase())) return false
      if (filters.registrationNo && !text(r.registrationNo).includes(filters.registrationNo.toLowerCase())) return false
      if (filters.variant && variant !== filters.variant) return false
      if (filters.colour && clean(r.colour) !== filters.colour) return false
      if (filters.year && String(r.year ?? '') !== filters.year) return false
      if (filters.month && clean(r.month) !== filters.month) return false
      if (filters.noOfOwners && String(r.noOfOwners ?? '') !== filters.noOfOwners) return false
      if (filters.tax && clean(r.tax) !== filters.tax) return false
      if (filters.isCarRegistered) {
        const wanted = filters.isCarRegistered === 'yes'
        if (r.isCarRegistered !== wanted) return false
      }
      if (filters.kmsMin && (kmsDriven === null || kmsDriven < Number(filters.kmsMin))) return false
      if (filters.kmsMax && (kmsDriven === null || kmsDriven > Number(filters.kmsMax))) return false
      if (filters.insuranceType && clean(r.insuranceType) !== filters.insuranceType) return false
      if (filters.priceMin && (price === null || price < Number(filters.priceMin))) return false
      if (filters.priceMax && (price === null || price > Number(filters.priceMax))) return false
      if (filters.ownedType && text(r.ownedType) !== filters.ownedType.toLowerCase()) return false
      if (filters.ownedBy && !text(r.ownedBy).includes(filters.ownedBy.toLowerCase())) return false
      if (filters.mobileNoOwnedBy && !text(r.mobileNoOwnedBy).includes(filters.mobileNoOwnedBy.toLowerCase())) return false
      if (filters.emailIdOwnedBy && !text(r.emailIdOwnedBy).includes(filters.emailIdOwnedBy.toLowerCase())) return false
      if (filters.customerName && !text(r.customerName).includes(filters.customerName.toLowerCase())) return false
      if (filters.linkedCustomer && !text(r.customer?.custName).includes(filters.linkedCustomer.toLowerCase())) return false
      if (filters.internalComments && !text(r.internalComments).includes(filters.internalComments.toLowerCase())) return false
      if (filters.otherRemarks && !text(r.otherRemarks).includes(filters.otherRemarks.toLowerCase())) return false
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
    push('make', 'Make', filters.make)
    push('model', 'Model', filters.model)
    push('fuelType', 'Fuel', filters.fuelType)
    push('inventoryNumber', 'Inv No', filters.inventoryNumber)
    push('sku', 'SKU', filters.sku)
    push('registrationNo', 'Reg No', filters.registrationNo)
    push('variant', 'Variant', filters.variant)
    push('colour', 'Colour', filters.colour)
    push('year', 'Year', filters.year)
    push('month', 'Month', filters.month)
    push('noOfOwners', 'Owners', filters.noOfOwners)
    push('tax', 'Tax', filters.tax)
    push('isCarRegistered', 'Registered', filters.isCarRegistered === 'yes' ? 'Yes' : filters.isCarRegistered === 'no' ? 'No' : '')
    push('kmsMin', 'KM Min', filters.kmsMin)
    push('kmsMax', 'KM Max', filters.kmsMax)
    push('insuranceType', 'Insurance', filters.insuranceType)
    push('priceMin', 'Price Min', filters.priceMin)
    push('priceMax', 'Price Max', filters.priceMax)
    push('ownedType', 'Owner Type', filters.ownedType)
    push('ownedBy', 'Owned By', filters.ownedBy)
    push('mobileNoOwnedBy', 'Owner Mobile', filters.mobileNoOwnedBy)
    push('emailIdOwnedBy', 'Owner Email', filters.emailIdOwnedBy)
    push('customerName', 'Customer / Source', filters.customerName)
    push('linkedCustomer', 'Linked Customer', filters.linkedCustomer)
    push('internalComments', 'Internal Comments', filters.internalComments)
    push('otherRemarks', 'Remarks', filters.otherRemarks)
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
      registrationNo: row.registrationNo ?? '',
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
    setEditId(null)
    setOriginalStatus(null)
    setViewRow(null)
    resetCascade()
    setError('')
    setDetailError('')
    setDetailLoading(false)
    editBaselineRef.current = buildDirtySnapshot(nextForm, null)
    setModal('add')
  }

  const openEdit = async (r: InventoryRow) => {
    setEditId(r.inventoryId)
    setForm(emptyForm())
    setSelectedCustomer(null)
    setCurrentInventoryNumber(r.inventoryNumber)
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
        registrationNo: detailRow.registrationNo ?? '',
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

  const f = <K extends keyof InventoryFormInput>(k: K, v: InventoryFormInput[K]) => setForm(prev => ({ ...prev, [k]: v }))
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
    setRecipientType('customer')
    setEmailSelectedDealer(null)
    setEmailSelectedCustomer(null)
    setEmailRecipients([])
    setDealerQuery('')
    setEmailError('')
    setEmailSentMessage(null)
  }

  const addEmailRecipient = (recipient: EmailRecipient) => {
    setEmailRecipients(prev => prev.some(item => item.key === recipient.key) ? prev : [...prev, recipient])
  }

  const removeEmailRecipient = (key: string) => {
    setEmailRecipients(prev => prev.filter(item => item.key !== key))
  }

  const openInquirySync = (r: InventoryRow) => {
    setInquiryRow(r)
    setInquiryQuery('')
    setInquiryMatches([])
    setSelectedInquiry(null)
    setInquiryError('')
    inquiryRequestRef.current += 1
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

  const sendEmail = () => {
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
    startTransition(async () => {
      const result = await sendInventoryEmail(emailRow.inventoryId, {
        recipients: emailRecipients.map(recipient => ({
          recipientType: recipient.recipientType,
          recipientId: recipient.recipientId,
        })),
      })
      if (!result.success) {
        setEmailError(result.error ?? 'Something went wrong sending this email.')
        return
      }
      setEmailSentMessage(result.message ?? `Email sent to ${emailRecipients.length} recipient${emailRecipients.length === 1 ? '' : 's'}.`)
    })
  }

  const save = () => {
    setError('')
    const newErrors: Record<string, boolean> = {}

    if (!form.registrationNo?.trim()) {
      newErrors.registrationNo = true
    }
    if (!form.fkVariantId) {
      newErrors.fkVariantId = true
    }
    if (form.year === null || form.year === undefined) {
      newErrors.year = true
    }
    if (form.year !== null && form.year !== undefined && !isValidYear(form.year)) {
      newErrors.year = true
    }
    if (form.kmsDriven !== null && Number(form.kmsDriven) < 0) {
      newErrors.kmsDriven = true
    }
    if (form.noOfOwners !== null && form.noOfOwners < 1) {
      newErrors.noOfOwners = true
    }
    if (form.price !== null && Number(form.price) <= 0) {
      newErrors.price = true
    }
    if (form.mobileNoOwnedBy && !isValidPhone(form.mobileNoOwnedBy)) {
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

    startTransition(async () => {
      const result = editId ? await updateInventory(editId, form) : await createInventory(form)
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
        <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_auto_auto]">
          <SearchBar value={searchInput} onChange={setSearchInput} placeholder="Search inv no, reg no, make, model, customer..." disabled={isListLoading} />
          <Select disabled={isListLoading} value={filters.status} onChange={e => {
            const nextStatus = e.target.value
            setFilter('status', nextStatus)
          }}>
            <option value="All">All Statuses</option>
            {INVENTORY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select disabled={isListLoading} value={filters.make} onChange={e => {
            const nextMake = e.target.value
            setFilter('make', nextMake)
            setFilter('model', '')
          }}>
            <option value="">All Makes</option>
            {filterOptions.makeOptions.map(option => <option key={option} value={option}>{option}</option>)}
          </Select>
          <Select disabled={isListLoading} value={filters.model} onChange={e => {
            const nextModel = e.target.value
            setFilter('model', nextModel)
          }}>
            <option value="">All Models</option>
            {filterOptions.modelOptions.map(option => <option key={option} value={option}>{option}</option>)}
          </Select>
          <Select disabled={isListLoading} value={filters.fuelType} onChange={e => {
            const nextFuelType = e.target.value
            setFilter('fuelType', nextFuelType)
          }}>
            <option value="">All Fuels</option>
            {filterOptions.fuelOptions.map(option => <option key={option} value={option}>{option}</option>)}
          </Select>
          <Btn variant="outline" onClick={() => setShowAdvancedFilters(v => !v)} disabled={isListLoading}>
            <SlidersHorizontal className="w-4 h-4" />{showAdvancedFilters ? 'Hide Filters' : 'More Filters'}
          </Btn>
          {hasActiveFilters ? <Btn variant="ghost" onClick={clearAllFilters} disabled={isListLoading}>Clear All</Btn> : <div />}
        </div>

        {showAdvancedFilters ? (
          <div className="grid gap-3 border-t border-gray-100 pt-4 md:grid-cols-2 xl:grid-cols-4">
            <Input disabled={isListLoading} label="Inventory No" value={filters.inventoryNumber} onChange={e => setFilter('inventoryNumber', e.target.value)} />
            <Input disabled={isListLoading} label="SKU" value={filters.sku} onChange={e => setFilter('sku', e.target.value)} />
            <Input disabled={isListLoading} label="Registration No" value={filters.registrationNo} onChange={e => setFilter('registrationNo', e.target.value)} />
            <Select disabled={isListLoading} label="Variant" value={filters.variant} onChange={e => setFilter('variant', e.target.value)}>
              <option value="">All Variants</option>
              {filterOptions.variantOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </Select>
            <Select disabled={isListLoading} label="Colour" value={filters.colour} onChange={e => setFilter('colour', e.target.value)}>
              <option value="">All Colours</option>
              {filterOptions.colourOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </Select>
            <Select disabled={isListLoading} label="Year" value={filters.year} onChange={e => setFilter('year', e.target.value)}>
              <option value="">All Years</option>
              {filterOptions.yearOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </Select>
            <Select disabled={isListLoading} label="Month" value={filters.month} onChange={e => setFilter('month', e.target.value)}>
              <option value="">All Months</option>
              {filterOptions.monthOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </Select>
            <Input disabled={isListLoading} label="No. of Owners" type="number" value={filters.noOfOwners} onChange={e => setFilter('noOfOwners', e.target.value)} />
            <Select disabled={isListLoading} label="Tax" value={filters.tax} onChange={e => setFilter('tax', e.target.value)}>
              <option value="">All Tax Types</option>
              <option value="Individual">Individual</option>
              <option value="Corporate">Corporate</option>
            </Select>
            <Select disabled={isListLoading} label="Car Registered" value={filters.isCarRegistered} onChange={e => setFilter('isCarRegistered', e.target.value)}>
              <option value="">All</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </Select>
            <Input disabled={isListLoading} label="KM Min" type="number" value={filters.kmsMin} onChange={e => setFilter('kmsMin', e.target.value)} />
            <Input disabled={isListLoading} label="KM Max" type="number" value={filters.kmsMax} onChange={e => setFilter('kmsMax', e.target.value)} />
            <Select disabled={isListLoading} label="Insurance Type" value={filters.insuranceType} onChange={e => setFilter('insuranceType', e.target.value)}>
              <option value="">All Insurance Types</option>
              {filterOptions.insuranceOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </Select>
            <Input disabled={isListLoading} label="Price Min" type="number" value={filters.priceMin} onChange={e => setFilter('priceMin', e.target.value)} />
            <Input disabled={isListLoading} label="Price Max" type="number" value={filters.priceMax} onChange={e => setFilter('priceMax', e.target.value)} />
            <Select disabled={isListLoading} label="Owner Type" value={filters.ownedType} onChange={e => setFilter('ownedType', e.target.value)}>
              <option value="">All Owner Types</option>
              {filterOptions.ownerTypeOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </Select>
            <Input disabled={isListLoading} label="Owned By" value={filters.ownedBy} onChange={e => setFilter('ownedBy', e.target.value)} list="inventory-owner-options" />
            <datalist id="inventory-owner-options">
              {filterOptions.ownerOptions.map(option => <option key={option} value={option} />)}
            </datalist>
            <Input disabled={isListLoading} label="Owner Mobile" value={filters.mobileNoOwnedBy} onChange={e => setFilter('mobileNoOwnedBy', e.target.value)} />
            <Input disabled={isListLoading} label="Owner Email" value={filters.emailIdOwnedBy} onChange={e => setFilter('emailIdOwnedBy', e.target.value)} />
            <Input disabled={isListLoading} label="Customer / Source" value={filters.customerName} onChange={e => setFilter('customerName', e.target.value)} list="inventory-customer-options" />
            <datalist id="inventory-customer-options">
              {filterOptions.customerOptions.map(option => <option key={option} value={option} />)}
            </datalist>
            <Input disabled={isListLoading} label="Linked Customer" value={filters.linkedCustomer} onChange={e => setFilter('linkedCustomer', e.target.value)} list="inventory-linked-customer-options" />
            <datalist id="inventory-linked-customer-options">
              {filterOptions.linkedCustomerOptions.map(option => <option key={option} value={option} />)}
            </datalist>
            <Input disabled={isListLoading} label="Internal Comments" value={filters.internalComments} onChange={e => setFilter('internalComments', e.target.value)} />
            <Input disabled={isListLoading} label="Remarks" value={filters.otherRemarks} onChange={e => setFilter('otherRemarks', e.target.value)} />
          </div>
        ) : null}

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
        <Table headers={['Inv No', 'SKU', 'Reg No', 'Vehicle', 'Year', 'Fuel', 'KM', 'Price', 'Status', 'Customer', 'Owner', 'Actions']} empty={filtered.length === 0}>
          {filtered.map(r => (
            <tr key={r.inventoryId} className="hover:bg-gray-50 transition">
            <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.inventoryNumber ?? '—'}</td>
            <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.sku ?? '—'}</td>
            <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-800">{r.registrationNo ?? '—'}</td>
            <td className="px-4 py-3">
              <div className="font-medium text-gray-900">
                {[clean(r.carVariantMaster?.carMakeMaster?.make ?? r.makeLegacy), clean(r.carVariantMaster?.carModelMaster?.model ?? r.modelLegacy)].filter(Boolean).join(' ') || '—'}
              </div>
              <div className="text-xs text-gray-500">{clean(r.carVariantMaster?.variant ?? r.variantLegacy)} {r.colour ? `· ${r.colour}` : ''}</div>
            </td>
            <td className="px-4 py-3 text-gray-700">{r.year ?? '—'}</td>
            <td className="px-4 py-3 text-gray-700">{r.fuelType ?? '—'}</td>
            <td className="px-4 py-3 text-gray-700">{r.kmsDriven !== null ? Number(r.kmsDriven).toLocaleString('en-IN') : '—'}</td>
            <td className="px-4 py-3 font-semibold text-gray-900">{fmt(r.price)}</td>
            <td className="px-4 py-3">{r.status ? <Badge label={r.status} /> : '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{r.customerName ?? '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{r.ownedBy ?? '—'}</td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-1">
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
              <Input label="SKU" value={editId ? (data.find(r => r.inventoryId === editId)?.sku ?? 'Auto-generated') : 'Auto-generated on save'} readOnly disabled />
              <Input label="Registration No *" value={form.registrationNo} onChange={e => f('registrationNo', e.target.value)} placeholder="MH12AB1234" error={errors.registrationNo} />
              <Select label="Status" value={form.status} onChange={e => f('status', e.target.value)}>
                {INVENTORY_STATUSES.map(s => <option key={s}>{s}</option>)}
              </Select>
              <Select label="Make *" value={selectedMakeId ?? ''} onChange={e => onMakeChange(Number(e.target.value))} error={errors.fkVariantId}>
                <option value="">Select Make</option>
                {makes.map(m => <option key={m.pkMakeId} value={m.pkMakeId}>{m.make}</option>)}
              </Select>
              <Select label="Model *" value={selectedModelId ?? ''} onChange={e => onModelChange(Number(e.target.value))} disabled={!selectedMakeId} error={errors.fkVariantId}>
                <option value="">Select Model</option>
                {models.map(m => <option key={m.pkModelId} value={m.pkModelId}>{m.model}</option>)}
              </Select>
              <Select label="Variant *" value={form.fkVariantId ?? ''} onChange={e => f('fkVariantId', Number(e.target.value) || null)} disabled={!selectedModelId} error={errors.fkVariantId}>
                <option value="">Select Variant</option>
                {variants.map(v => <option key={v.pkVariantId} value={v.pkVariantId}>{v.variant}</option>)}
              </Select>
              <Input label="Legacy Make" value={form.makeLegacy} onChange={e => f('makeLegacy', e.target.value)} placeholder="Use when variant is unavailable" />
              <Input label="Legacy Model" value={form.modelLegacy} onChange={e => f('modelLegacy', e.target.value)} />
              <Input label="Legacy Variant" value={form.variantLegacy} onChange={e => f('variantLegacy', e.target.value)} />
              <Input label="Year" type="number" value={form.year ?? ''} onChange={e => f('year', e.target.value ? +e.target.value : null)} error={errors.year} />
              <Input label="Month" value={form.month} onChange={e => f('month', e.target.value)} placeholder="Jan / Feb / Mar" />
              <Input label="Colour" value={form.colour} onChange={e => f('colour', e.target.value)} />
              <Input label="Fuel Type" value={form.fuelType} onChange={e => f('fuelType', e.target.value)} placeholder="Petrol / Diesel / CNG" />
              <Input label="No. of Owners" type="number" value={form.noOfOwners ?? ''} onChange={e => f('noOfOwners', e.target.value ? +e.target.value : null)} error={errors.noOfOwners} />
              <Select label="Tax" value={form.tax} onChange={e => f('tax', e.target.value)}>
                <option value="">Select Tax Type</option>
                <option value="Individual">Individual</option>
                <option value="Corporate">Corporate</option>
              </Select>
              <Select
                label="Car Registered"
                value={form.isCarRegistered === null ? '' : form.isCarRegistered ? 'yes' : 'no'}
                onChange={e => f('isCarRegistered', e.target.value === '' ? null : e.target.value === 'yes')}
              >
                <option value="">Select</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </Select>
              <Input label="KM Driven" type="number" value={form.kmsDriven ?? ''} onChange={e => f('kmsDriven', e.target.value ? +e.target.value : null)} error={errors.kmsDriven} />
              <Input label="Insurance Type" value={form.insuranceType} onChange={e => f('insuranceType', e.target.value)} placeholder="Comprehensive / Expired" />
              <Input label="Price (₹)" type="number" value={form.price ?? ''} onChange={e => f('price', e.target.value ? +e.target.value : null)} error={errors.price} />
              <Input label="Owner Type" value={form.ownedType} onChange={e => f('ownedType', e.target.value)} placeholder="Dealer / Self / Customer" />
              <Input label="Owned By" value={form.ownedBy} onChange={e => f('ownedBy', e.target.value)} />
              <Input label="Owner Mobile" value={form.mobileNoOwnedBy} onChange={e => f('mobileNoOwnedBy', e.target.value)} error={errors.mobileNoOwnedBy} />
              <Input label="Owner Email" type="email" value={form.emailIdOwnedBy} onChange={e => f('emailIdOwnedBy', e.target.value)} error={errors.emailIdOwnedBy} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Linked Customer</label>
                <CustomerPicker value={selectedCustomer} onChange={onCustomerChange} />
              </div>
              <Input label="Customer / Source" value={form.customerName} onChange={e => f('customerName', e.target.value)} placeholder="Customer name or lead source" />
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
          </div>
          )
        ) : null}
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

      <Modal title={`Send Car Details${emailRow ? ` — ${emailRow.registrationNo ?? emailRow.sku ?? ''}` : ''}`} open={!!emailRow} onClose={() => setEmailRow(null)}>
        {emailRow && (
          emailSentMessage ? (
            <div className="space-y-4">
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
                      <div key={recipient.key} className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                        <div>
                          <div className="text-sm font-medium text-gray-800">{recipient.name}</div>
                          <div className="text-xs text-gray-500">{recipient.meta}{recipient.email ? ` · ${recipient.email}` : ''}</div>
                        </div>
                        <button type="button" onClick={() => removeEmailRecipient(recipient.key)} className="text-gray-400 hover:text-red-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {recipientType === 'customer' ? (
                <div className="space-y-2">
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
                  <div className="text-xs text-gray-400">Select a customer to add them to the send list.</div>
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
                <Btn onClick={sendEmail} disabled={isPending || !emailConfigured || emailRecipients.length === 0}>{isPending ? 'Sending...' : `Send Email${emailRecipients.length > 0 ? ` (${emailRecipients.length})` : ''}`}</Btn>
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
