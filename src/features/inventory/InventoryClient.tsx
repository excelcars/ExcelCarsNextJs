/* eslint-disable @next/next/no-img-element */
'use client'


import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Loader2 } from 'lucide-react'
import { Btn, Input, Modal } from '@/components/ui'
import { deleteInventory, sendInventoryEmail, sendBulkInventoryEmail, getInventoryBulkEmailConfig, syncInventoryToInquiry, updateInventoryEmailRecipient, getNextInventoryNumber } from './actions'
import { isValidEmail, normalizeRegistrationNo } from '@/lib/validation'
import type { CarMakeMaster, Dealer, CustomerOption, InventoryRow, InventoryPhoto, UploadQueueItem, InquiryOption, EmailRecipient, InventoryFilters } from './inventoryTypes'
import { InventoryTable } from './InventoryTable'
import { InventoryPagination } from './InventoryPagination'
import { InventoryFilters as InventoryFiltersPanel, type InventoryFilterChip } from './InventoryFilters'
import { InventoryConfirmDialogs } from './InventoryConfirmDialogs'
import { useInventoryFilters } from './hooks/useInventoryFilters'
import { InventoryHeader, InventorySelectionBar } from './InventoryHeader'
import { useInventorySave } from './hooks/useInventorySave'
import { useInventoryController } from './hooks/useInventoryController'
import { InventoryFormModal } from './InventoryFormModal'
import { InventoryViewModal } from './InventoryViewModal'
import { InventoryEmailModal } from './InventoryEmailModal'
import { InventoryInquiryModal } from './InventoryInquiryModal'
import { buildDirtySnapshot, clean, emptyFilters, emptyForm, formatPriceInput } from './inventoryUtils'

const INVENTORY_FUEL_TYPES = ['Petrol', 'Diesel', 'CNG']

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
  const inventory = useInventoryController(emptyForm(), { makes, dealers })
  const { modal, setModal } = inventory.modal
  const inventoryForm = inventory.form
  const inventoryInquiry = inventory.inquiry
  const { form, editId, originalStatus, currentInventoryNumber, currentSku, error, errors, selectedCustomer } = inventoryForm.formState
  const { selectedMakeId, selectedModelId, catalogMakeText, catalogModelText, catalogVariantText, catalogAddType, catalogAddValue, catalogAddError, catalogAddPending, models, variants } = inventoryForm.catalogState
  const { setForm, setEditId, setOriginalStatus, setCurrentInventoryNumber, setCurrentSku, setError, setErrors, setSelectedCustomer, setSelectedMakeId, setSelectedModelId, setCatalogMakeText, setCatalogModelText, setCatalogVariantText, setCatalogAddType, setCatalogAddValue, setModels, setVariants, fieldChange, onCustomerChange: formCustomerChange, addCatalogValue } = inventoryForm.actions
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()
  const [viewRow, setViewRow] = useState<InventoryRow | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const detailRequestRef = useRef(0)
  const detailCacheRef = useRef(new Map<number, InventoryRow>())
  const editBaselineRef = useRef(buildDirtySnapshot(emptyForm(), null))
  const [discardOpen, setDiscardOpen] = useState(false)

  const { emailRow, setEmailRow, emailRows, setEmailRows, recipientType, setRecipientType, dealerQuery, setDealerQuery, dealerOpen, setDealerOpen, emailSelectedDealer, setEmailSelectedDealer, emailSelectedCustomer, setEmailSelectedCustomer, emailRecipients, setEmailRecipients, editingRecipientEmailKey, setEditingRecipientEmailKey, recipientEmailDraft, setRecipientEmailDraft, recipientEmailError, setRecipientEmailError, emailError, setEmailError, emailSentMessage, setEmailSentMessage, emailProgress, setEmailProgress, isEmailSending, setIsEmailSending } = inventory.email
  const [selectedInventoryIds, setSelectedInventoryIds] = useState<number[]>([])
  const [photoRow, setPhotoRow] = useState<InventoryRow | null>(null)
  const [photos, setPhotos] = useState<InventoryPhoto[]>([])
  const [photoError, setPhotoError] = useState('')
  const [photoLoading, setPhotoLoading] = useState(false)
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([])
  const [isUploadingPhotos, startPhotoUploadTransition] = useTransition()
  const [isDeletingPhoto, startPhotoDeleteTransition] = useTransition()
  const [exportError, setExportError] = useState('')
  const [isExporting, startExportTransition] = useTransition()
  const [isSyncingInquiry, startSyncInquiryTransition] = useTransition()
  const [pendingInventoryRefresh, setPendingInventoryRefresh] = useState(false)
  const { inquiryRow, inquiryQuery, inquiryMatches, selectedInquiry, inquiryLoading, inquiryError } = inventoryInquiry.state
  const { setInquiryRow, setInquiryQuery, setInquiryMatches, setSelectedInquiry, setInquiryError } = inventoryInquiry.actions
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

  const { activeFilterChips, hasActiveFilters } = useInventoryFilters(filters)
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

  const serverFilterSnapshot = useMemo(() => ({
    search: filters.search,
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
    initialSearch,
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

  const f = fieldChange
  const onCustomerChange = formCustomerChange
  const { onOwnerTypeChange, onDealerChange, onCatalogMakeChange, onCatalogModelChange } = inventoryForm.actions

  const setFilter = <K extends keyof InventoryFilters>(key: K, value: InventoryFilters[K]) => setFilters(prev => ({ ...prev, [key]: value }))
  const clearAllFilters = () => {
    setSearchInput('')
    setFilters(emptyFilters())
    router.push('/inventory')
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
    const rows = data.filter(row => selectedInventoryIds.includes(row.inventoryId))
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
    inventoryInquiry.invalidateRequests()
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

        setEmailProgress(prev => prev.map(item => ({ ...item, status: 'sending' })))
        const result = await sendBulkInventoryEmail(rows.map(row => row.inventoryId), { recipients })
        const sentIds = new Set(result.sentInventoryIds ?? [])
        const failedIds = new Set(result.failedInventoryIds ?? rows.filter(row => !sentIds.has(row.inventoryId)).map(row => row.inventoryId))
        setEmailProgress(prev => prev.map(item => sentIds.has(item.inventoryId)
          ? { ...item, status: 'sent', error: undefined }
          : { ...item, status: 'failed', error: 'Email failed.' }))
        if (!result.success) {
          setEmailError(result.error ?? 'Could not send email for any selected vehicle.')
          return
        }
        const failures = rows
          .filter(row => failedIds.has(row.inventoryId))
          .map(row => row.registrationNo ?? row.inventoryNumber ?? `Vehicle #${row.inventoryId}`)
        setEmailSentMessage(`${sentIds.size} vehicle${sentIds.size === 1 ? '' : 's'} sent to ${emailRecipients.length} recipient${emailRecipients.length === 1 ? '' : 's'}.${failures.length > 0 ? ` Failed: ${failures.join(', ')}.` : ''}`)
        return
      }

      const row = rows[0]
      setEmailProgress(prev => prev.map(item => ({ ...item, status: 'sending' })))
      const result = await sendInventoryEmail(row.inventoryId, { recipients })
      if (!result.success) {
        setEmailProgress(prev => prev.map(item => ({ ...item, status: 'failed', error: result.error ?? 'Email failed.' })))
        setEmailError(result.error ?? 'Could not send email for this vehicle.')
        return
      }
      setEmailProgress(prev => prev.map(item => ({ ...item, status: 'sent', error: undefined })))
      setEmailSentMessage(`1 vehicle sent to ${emailRecipients.length} recipient${emailRecipients.length === 1 ? '' : 's'}.`)
    } finally {
      setIsEmailSending(false)
    }
  }

  const { save } = useInventorySave({
    form,
    editId,
    catalogMakeText,
    catalogModelText,
    catalogVariantText,
    setErrors,
    setError,
    startTransition,
    onSaved: (result, saveForm, savedEditId) => {
      setModal(null)
      const savedInventoryId = result.inventoryId
      const shouldPromptInquiry = savedInventoryId !== undefined && (
        savedEditId
          ? (saveForm.status === 'Booked' || saveForm.status === 'Sold') && saveForm.status !== (originalStatus ?? '')
          : (saveForm.status === 'Booked' || saveForm.status === 'Sold')
      )
      if (shouldPromptInquiry) {
        setPendingInventoryRefresh(true)
        openInquirySync(buildInventoryRowFromForm(savedInventoryId, result.inventoryNumber ?? currentInventoryNumber))
        return
      }
      window.location.reload()
    },
  })

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

  const formModalProps = {
    open: modal === 'add' || modal === 'edit',
    isEditing: editId !== null,
    title: editId ? 'Edit Vehicle' : 'Add New Vehicle',
    detailLoading: detailLoading && !!editId,
    detailError: editId ? detailError : '',
    form, errors, error, isPending, currentInventoryNumber, currentSku,
    catalogMakeText, catalogModelText, catalogVariantText, selectedMakeId, selectedModelId,
    selectedCustomer, makes, models, variants, dealers, inventoryColours,
    fuelTypes: INVENTORY_FUEL_TYPES,
    onClose: requestModalClose, onFieldChange: f, onMakeChange: onCatalogMakeChange,
    onModelChange: onCatalogModelChange,
    onVariantChange: (value: string) => {
      setCatalogVariantText(value)
      const match = variants.find(item => item.variant?.trim().toLowerCase() === value.trim().toLowerCase())
      f('fkVariantId', match?.pkVariantId ?? null)
    },
    onOwnerTypeChange, onDealerChange, onCustomerChange, onSave: save,
    formatPriceInput,
  }

  const emailModalProps = {
    row: emailRow, rows: emailRows, recipientType, dealerQuery, dealerOpen,
    selectedDealer: emailSelectedDealer, selectedCustomer: emailSelectedCustomer,
    recipients: emailRecipients, editingRecipientEmailKey, recipientEmailDraft,
    recipientEmailError, emailError, sentMessage: emailSentMessage, progress: emailProgress,
    emailConfigured, isPending, isSending: isEmailSending, dealerMatches,
    onClose: () => setEmailRow(null), onRecipientTypeChange: setRecipientType,
    onDealerQueryChange: (value: string) => { setDealerQuery(value); setDealerOpen(true) },
    onDealerFocus: () => setDealerOpen(true),
    onDealerSelect: (dealer: Dealer) => { setEmailSelectedDealer(dealer); setDealerOpen(false); setDealerQuery('') },
    onSelectedDealerClear: () => setEmailSelectedDealer(null),
    onSelectedCustomerChange: (customer: CustomerOption | null) => {
      setEmailSelectedCustomer(customer)
      if (customer) addEmailRecipient({ key: `customer-${customer.custId}`, recipientType: 'customer', recipientId: customer.custId, name: customer.custName, email: customer.custEmail, meta: customer.custMobile ?? 'Customer' })
    },
    onAddRecipient: addEmailRecipient, onRemoveRecipient: removeEmailRecipient,
    onEditRecipient: (recipient: EmailRecipient) => { setEditingRecipientEmailKey(recipient.key); setRecipientEmailDraft(recipient.email ?? ''); setRecipientEmailError('') },
    onRecipientEmailDraftChange: (value: string) => { setRecipientEmailDraft(value); setRecipientEmailError('') },
    onSaveRecipientEmail: saveRecipientEmail,
    onCancelRecipientEdit: () => { setEditingRecipientEmailKey(null); setRecipientEmailDraft(''); setRecipientEmailError('') },
    onSend: () => void sendEmail(),
  }

  const inquiryModalProps = {
    row: inquiryRow, query: inquiryQuery, matches: inquiryMatches, selected: selectedInquiry,
    loading: inquiryLoading, error: inquiryError, syncing: isSyncingInquiry,
    pendingRefresh: pendingInventoryRefresh, vehicleLabel,
    onClose: () => { setInquiryRow(null); setSelectedInquiry(null); setInquiryMatches([]); setInquiryQuery(''); setInquiryError(''); if (pendingInventoryRefresh) window.location.reload() },
    onQueryChange: setInquiryQuery, onSelect: setSelectedInquiry,
    onOpenInquiry: (id: number) => router.push(`/inquiry?edit=${id}`), onSync: syncInquiry,
  }

  return (
    <div>
      <InventoryHeader total={total} status={filters.status} selectedCount={selectedInventoryIds.length} hasActiveFilters={hasActiveFilters} isExporting={isExporting} onBulkEmail={openBulkEmail} onExport={exportAllMatchingRows} onAdd={openAdd} />

      {exportError ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{exportError}</div>
      ) : null}

      <InventoryFiltersPanel searchInput={searchInput} filters={filters} activeFilterChips={activeFilterChips as InventoryFilterChip[]} isLoading={isListLoading} fuelTypes={INVENTORY_FUEL_TYPES} onSearchChange={value => { setSearchInput(value); setFilter('search', value) }} onFilterChange={(key, value) => setFilter(key, value)} onClear={clearAllFilters} />

      <div className={`space-y-3 transition-opacity ${isListLoading ? 'opacity-60' : 'opacity-100'}`}>
        {isListLoading ? (
          <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading inventory results...</span>
          </div>
        ) : null}
        <InventorySelectionBar selectedCount={selectedInventoryIds.length} visibleCount={data.length} onSelectVisible={() => setSelectedInventoryIds(data.map(row => row.inventoryId))} onClear={() => setSelectedInventoryIds([])} />
        <InventoryTable
          rows={data}
          selectedInventoryIds={selectedInventoryIds}
          page={page}
          pageSize={pageSize}
          onSelectionChange={(inventoryId, checked) => setSelectedInventoryIds(prev => checked ? [...prev, inventoryId] : prev.filter(id => id !== inventoryId))}
          onView={openView}
          onInquirySync={openInquirySync}
          onPhotos={openPhotos}
          onEmail={openEmail}
          onEdit={openEdit}
          onDelete={setDeleteId}
        />
      </div>

      <InventoryPagination
        page={page}
        pageCount={pageCount}
        pageSize={pageSize}
        total={total}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        isPending={isPending}
        isLoading={isListLoading}
        onPageChange={nextPage => pushQuery({ page: String(nextPage) })}
        onPageSizeChange={nextPageSize => pushQuery({ pageSize: String(nextPageSize), page: '1' })}
      />

      <InventoryViewModal
          open={modal === 'view'}
          loading={detailLoading}
          error={detailError}
          row={viewRow}
          onClose={requestModalClose}
      />

      <InventoryFormModal {...formModalProps} />

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

      <InventoryConfirmDialogs
        discardOpen={discardOpen}
        deleteOpen={deleteId !== null}
        onCloseDiscard={() => setDiscardOpen(false)}
        onDiscard={closeModalImmediately}
        onCloseDelete={() => setDeleteId(null)}
        onDelete={del}
      />

      <InventoryEmailModal {...emailModalProps} />

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
                      {photo.isUploadedHere && photo.path ? (
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

      <InventoryInquiryModal {...inquiryModalProps} />
    </div>
  )
}
