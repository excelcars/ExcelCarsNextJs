'use client'

import { catalogSelectOptions } from '@/lib/catalogNames'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Badge, Btn, Input, Select, Textarea } from '@/components/ui'
import { FormDropdown } from '@/components/FormDropdown'
import { logFollowup, type LogFollowupInput } from './actions'
import { CustomerPicker } from '@/components/CustomerPicker'
import { InquiryDetailView } from '@/features/inquiry/InquiryDetailView'
import { INQUIRY_CLASSIFICATIONS, INQUIRY_STATUSES, inquiryStatusLabel } from '@/features/inquiry/queries'
import { getInquiryDetail, updateInquiry, type InquiryCarInput, type InquiryFormInput } from '@/features/inquiry/actions'
import { isValidYear } from '@/lib/validation'
import { FOLLOWUP_LEGACY_SUB_STATUS_OPTIONS, isFollowupStatus, resolveFollowupSubStatusInput, validateFollowupLogInput, validateInquiryFormInput } from '@/lib/inquiryFollowupValidation'
import { LIST_FILTER_DEBOUNCE_MS } from '@/lib/listFilterTiming'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import type { InquirySourceOption } from '@/features/inquiry/sourceMaster'
import type { InquiryLocationOption } from '@/features/inquiry/locationMaster'
import { FollowupFilters } from './FollowupFilters'
import { FollowupTable } from './FollowupTable'
import { FollowupHeader } from './FollowupHeader'
import { FollowupHistoryList } from './FollowupHistoryList'
import { ListPagination } from '@/components/ListPagination'
import { ListLoadingOverlay } from '@/components/ListLoadingOverlay'
import { buildFollowupExportFileName, csvValue, FOLLOWUP_EXPORT_HEADERS } from './followupExportHelpers'
import { LogFollowupModal } from './LogFollowupModal'
import { FollowupHistoryModal } from './FollowupHistoryModal'
import { FollowupInquiryViewModal } from './FollowupInquiryViewModal'
import { FollowupInquiryEditModal } from './FollowupInquiryEditModal'
import { InquiryCarTable } from '@/features/inquiry/InquiryCarTable'
import { LogFollowupRecentActivity } from './LogFollowupRecentActivity'
import { LogFollowupContactOutcome } from './LogFollowupContactOutcome'
import { LogFollowupRemark } from './LogFollowupRemark'
import { cleanListValue as clean, formatListDate as fmtDate, formatListDateTime as fmtDateTime } from '@/lib/listFormatters'
import { buildListQueryString } from '@/lib/listQueryParams'
import { summarizeVehicleEmailEngagement } from '@/lib/vehicleEmailEngagement'

const CLASSIFICATIONS = ['Hot', 'Warm', 'Cold'] as const
const STATUSES = ['Open', 'FollowUp', 'Closed'] as const
const SUB_STATUS_SUGGESTIONS = [...FOLLOWUP_LEGACY_SUB_STATUS_OPTIONS]
const FOLLOWUP_OTHER_SUB_STATUS_VALUE = '__OTHER__'
const VEHICLE_YEAR_OPTIONS = Array.from(
  { length: new Date().getFullYear() - 1899 },
  (_, index) => {
    const year = String(new Date().getFullYear() + 1 - index)
    return { value: year, label: year }
  },
)
const OWNER_COUNT_OPTIONS = Array.from({ length: 11 }, (_, value) => ({ value: String(value), label: String(value) }))
const FRIENDLY_STATUS_OPTIONS = [
  { key: 'open-new', status: 'Open', subStatus: '', label: 'Open — fresh lead / no date fixed' },
  { key: 'followup-working', status: 'FollowUp', subStatus: '', label: 'Follow-up — still working it' },
  { key: 'followup-negotiation', status: 'FollowUp', subStatus: 'Negotiation', label: 'Negotiation — discussing price' },
  { key: 'followup-visit', status: 'FollowUp', subStatus: 'Visit scheduled', label: 'Visit scheduled' },
  { key: 'closed-done', status: 'Closed', subStatus: 'Deal done', label: 'Closed — deal done' },
  { key: 'closed-lost', status: 'Closed', subStatus: 'Lost', label: 'Closed — lost' },
  { key: 'closed-unreachable', status: 'Closed', subStatus: 'Unreachable', label: 'Unreachable' },
] as const
const CONTACT_OUTCOME_OPTIONS = [
  { key: 'spoke', value: 'spoke_to_customer', title: 'Spoke to customer', hint: 'Had a conversation', statusKey: 'followup-working', subStatus: 'Gave Details' },
  { key: 'no-answer', value: 'no_answer', title: 'No answer', hint: 'Rang, nobody picked', statusKey: 'followup-working', subStatus: 'Ringing' },
  { key: 'call-back', value: 'asked_to_call_back', title: 'Asked to call back', hint: 'Bad time', statusKey: 'followup-working', subStatus: 'Asked to call back' },
  { key: 'number-issue', value: 'number_not_working', title: 'Number not working', hint: 'Wrong or disconnected', statusKey: 'closed-unreachable', subStatus: 'Number not working' },
] as const

function formatFriendlyStatus(status: string, subStatus: string) {
  const matched = FRIENDLY_STATUS_OPTIONS.find(option => option.status === status && option.subStatus === subStatus)
  if (matched) return matched.label
  if (status === 'Open' && !subStatus) return 'Open — fresh lead / no date fixed'
  if (status === 'FollowUp' && !subStatus) return 'Follow-up — still working it'
  if (subStatus) return `${status} — ${subStatus}`
  return status || '—'
}

function usesOtherSubStatus(subStatus: string | null | undefined) {
  const value = clean(subStatus)
  return !!value && !(SUB_STATUS_SUGGESTIONS as readonly string[]).includes(value)
}

function getFriendlyStatusKey(status: string, subStatus: string) {
  return FRIENDLY_STATUS_OPTIONS.find(option => option.status === status && option.subStatus === subStatus)?.key ?? ''
}

function addDays(base: Date, days: number) {
  const next = new Date(base)
  next.setDate(next.getDate() + days)
  return next
}

function contactOutcomeLabel(value: string | null | undefined) {
  const matched = CONTACT_OUTCOME_OPTIONS.find(option => option.value === value)
  return matched?.title ?? 'Not recorded'
}

interface FollowupRow {
  inquiryId: number
  inquiryNo: string | null
  dateOfInquiry: Date | string | null
  website: string | null
  sourceDetail?: string | null
  location?: string | null
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
  followupInquiry?: HistoryEntry[]
  vehicleEmailLinks?: VehicleEmailLinkRow[]
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
  createdDt?: Date | string | null
  followupDate: Date | string | null
  contactOutcome?: string | null
  followupStatus: string | null
  followupSubStatus: string | null
  followupClassification: string | null
  comments: string | null
}

interface VehicleEmailLinkRow {
  vehicleEmailLinkId: number
  recipientEmail: string
  recipientName: string | null
  emailSentAt: Date | string | null
  firstRequestedAt: Date | string | null
  firstHumanViewAt: Date | string | null
  lastRequestedAt: Date | string | null
  requestCount: number
  humanViewCount: number
  isActive: boolean
  inventoryManagement: {
    inventoryId: number
    inventoryNumber: string | null
    registrationNo: string | null
    year: number | null
    kmsDriven: string | number | null
    price: string | number | null
    status: string | null
    carVariantMaster: {
      variant: string | null
      carMakeMaster: { make: string | null } | null
      carModelMaster: { model: string | null } | null
    } | null
  }
  visits: Array<{
    vehicleEmailLinkVisitId: number
    visitedAt: Date | string
    visitKind: string
  }>
  interactions: Array<{
    vehicleEmailLinkInteractionId: number
    interactionAt: Date | string
    interactionType: string
    interactionLabel: string | null
  }>
}

interface CarMakeMaster { pkMakeId: number; make: string | null }
interface CarModelMaster { pkModelId: number; model: string | null }
interface CarVariantMaster { pkVariantId: number; variant: string | null }
interface CustomerOption { custId: number; custName: string; custMobile: string | null; custEmail: string | null }
interface UserOption {
  userId: number
  userName: string | null
  displayName: string | null
  empId?: number | null
  employee?: {
    empId: number
    empFirstName: string | null
    empLastName: string | null
  } | null
}

const isOverdue = (d: Date | string | null) => d ? new Date(d) < new Date(new Date().toDateString()) : false
const followupUserLabel = (user: UserOption) => {
  const employeeName = `${user.employee?.empFirstName ?? ''} ${user.employee?.empLastName ?? ''}`.trim()
  const userName = user.userName?.trim()
  const name = user.displayName?.trim() || employeeName
  const employeeId = user.employee?.empId ?? user.empId
  if (userName && name && userName.toLowerCase() !== name.toLowerCase()) {
    return employeeId ? `${userName} · ${name} (${employeeId})` : `${userName} · ${name}`
  }
  if (userName) {
    return employeeId ? `${userName} (${employeeId})` : userName
  }
  if (name) {
    return employeeId ? `${name} (${employeeId})` : name
  }
  return `User #${user.userId}`
}
const auditUserLabel = (user?: UserOption | null, fallbackId?: number | null) => user?.displayName ?? user?.userName ?? (fallbackId ? String(fallbackId) : '')

function getInquiryCarSummary(car: FollowupRow['inquiryCarDetails'][number] | null | undefined) {
  const make = clean(car?.carVariantMaster?.carMakeMaster?.make) || clean(car?.makeLegacy)
  const model = clean(car?.carVariantMaster?.carModelMaster?.model) || clean(car?.modelLegacy)
  const variant = clean(car?.carVariantMaster?.variant) || clean(car?.variantLegacy)
  const parts = [make, model, variant].filter(Boolean)
  if (!parts.length && !car?.year) return '—'
  return `${parts.join(' ') || '—'}${car?.year ? ` · ${car.year}` : ''}`
}

function getInquiryCarsSummary(cars: FollowupRow['inquiryCarDetails']) {
  if (!cars.length) return '—'
  const labels = cars.map(car => getInquiryCarSummary(car)).filter(label => label !== '—')
  if (!labels.length) return '—'
  if (labels.length === 1) return labels[0]
  return `${labels[0]} +${labels.length - 1} more`
}

function toDateValue(d: Date | string | null | undefined) {
  if (!d) return null
  const value = new Date(d)
  return Number.isNaN(value.getTime()) ? null : value
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function daysFromToday(d: Date | string | null | undefined) {
  const value = toDateValue(d)
  if (!value) return null
  const diff = startOfDay(new Date()).getTime() - startOfDay(value).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function fmtLongDate(d: Date | string | null | undefined) {
  const value = toDateValue(d)
  if (!value) return '—'
  return value.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export function buildVehicleHistoryRows(
  inquiryInventoryLinks: Array<{
    inquiryInventoryLinkId: number
    linkType: string
    createdAt: Date | string | null
    inventoryManagement: {
      inventoryId: number
      inventoryNumber: string | null
      registrationNo: string | null
      year: number | null
      price: string | number | null
      status: string | null
      carVariantMaster: {
        variant: string | null
        carMakeMaster: { make: string | null } | null
        carModelMaster: { model: string | null } | null
      } | null
    }
  }> | undefined,
  vehicleEmailLinks: VehicleEmailLinkRow[] | undefined,
) {
  const rows = new Map<number, {
    inventoryId: number
    inventoryNumber: string | null
    registrationNo: string | null
    vehicle: string
    year: number | null
    status: string | null
    price: string | number | null
    matchedAt: Date | string | null
    emailedAt: Date | string | null
    emailCount: number
    humanViewCount: number
    requestCount: number
    callClicks: number
    whatsappClicks: number
    emailClicks: number
  }>()

  for (const link of inquiryInventoryLinks ?? []) {
    const inventoryId = link.inventoryManagement.inventoryId
    const vehicle = [
      clean(link.inventoryManagement.carVariantMaster?.carMakeMaster?.make),
      clean(link.inventoryManagement.carVariantMaster?.carModelMaster?.model),
      clean(link.inventoryManagement.carVariantMaster?.variant),
    ].filter(Boolean).join(' ') || '—'

    const existing = rows.get(inventoryId)
    const next = existing ?? {
      inventoryId,
      inventoryNumber: link.inventoryManagement.inventoryNumber,
      registrationNo: link.inventoryManagement.registrationNo,
      vehicle,
      year: link.inventoryManagement.year,
      status: link.inventoryManagement.status,
      price: link.inventoryManagement.price,
      matchedAt: null,
      emailedAt: null,
      emailCount: 0,
      humanViewCount: 0,
      requestCount: 0,
      callClicks: 0,
      whatsappClicks: 0,
      emailClicks: 0,
    }

    if (link.linkType.toLowerCase() === 'matched' && !next.matchedAt) {
      next.matchedAt = link.createdAt
    }
    if (link.linkType.toLowerCase() === 'emailed' && !next.emailedAt) {
      next.emailedAt = link.createdAt
    }

    rows.set(inventoryId, next)
  }

  for (const link of vehicleEmailLinks ?? []) {
    const inventoryId = link.inventoryManagement.inventoryId
    const vehicle = [
      clean(link.inventoryManagement.carVariantMaster?.carMakeMaster?.make),
      clean(link.inventoryManagement.carVariantMaster?.carModelMaster?.model),
      clean(link.inventoryManagement.carVariantMaster?.variant),
    ].filter(Boolean).join(' ') || '—'
    const engagement = summarizeVehicleEmailEngagement(link)

    const existing = rows.get(inventoryId)
    const next = existing ?? {
      inventoryId,
      inventoryNumber: link.inventoryManagement.inventoryNumber,
      registrationNo: link.inventoryManagement.registrationNo,
      vehicle,
      year: link.inventoryManagement.year,
      status: link.inventoryManagement.status,
      price: link.inventoryManagement.price,
      matchedAt: null,
      emailedAt: null,
      emailCount: 0,
      humanViewCount: 0,
      requestCount: 0,
      callClicks: 0,
      whatsappClicks: 0,
      emailClicks: 0,
    }

    if (!next.emailedAt) {
      next.emailedAt = link.emailSentAt ?? null
    }

    next.emailCount += 1
    next.humanViewCount += link.humanViewCount
    next.requestCount += link.requestCount
    next.callClicks += engagement.callClicks
    next.whatsappClicks += engagement.whatsappClicks
    next.emailClicks += engagement.emailClicks

    rows.set(inventoryId, next)
  }

  return [...rows.values()].sort((a, b) => {
    const aTime = a.emailedAt ? new Date(a.emailedAt).getTime() : a.matchedAt ? new Date(a.matchedAt).getTime() : 0
    const bTime = b.emailedAt ? new Date(b.emailedAt).getTime() : b.matchedAt ? new Date(b.matchedAt).getTime() : 0
    return bTime - aTime
  })
}

function exportFollowupCsv(rows: FollowupRow[], status: string, classification: string) {
  const lines = [FOLLOWUP_EXPORT_HEADERS.map(csvValue).join(',')]
  for (const row of rows) {
    const carRows = row.inquiryCarDetails.length > 0 ? row.inquiryCarDetails : [null]
    const historyRows = row.followupInquiry && row.followupInquiry.length > 0 ? row.followupInquiry : [null]

    for (const car of carRows) {
      const make = clean(car?.carVariantMaster?.carMakeMaster?.make) || clean(car?.makeLegacy)
      const model = clean(car?.carVariantMaster?.carModelMaster?.model) || clean(car?.modelLegacy)
      const variant = clean(car?.carVariantMaster?.variant) || clean(car?.variantLegacy)

      for (const history of historyRows) {
        const line = [
          row.inquiryId,
          row.inquiryNo,
          fmtDate(row.dateOfInquiry),
          row.website,
          row.sourceDetail,
          auditUserLabel(row.createdByUser, row.createdBy),
          row.createdBy ?? null,
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
          fmtDate(history?.followupDate ?? null),
          history?.followupStatus ?? '',
          history?.followupSubStatus ?? '',
          history?.comments ?? '',
          history?.followupClassification ?? '',
        ]
        lines.push(line.map(csvValue).join(','))
      }
    }
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = buildFollowupExportFileName(rows.length, status, classification)
  link.click()
  URL.revokeObjectURL(url)
}

function emptyForm(): LogFollowupInput {
  return {
    // Contact outcome is retained for older records and reporting, but is no
    // longer required or inferred from the lead's Status/Sub-status.
    contactOutcome: '',
    status: 'FollowUp',
    subStatus: '',
    useOtherSubStatus: false,
    otherSubStatus: '',
    classification: 'Warm',
    comments: '',
    nextFollowUpDate: '',
  }
}

function emptyInquiryCar(): InquiryCarInput {
  return {
    inquiryCarDetailsId: null,
    selectedMakeId: null,
    selectedModelId: null,
    fkVariantId: null,
    subVariant: '',
    carYear: null,
    noOfOwners: null,
  }
}

function emptyInquiryForm(): InquiryFormInput {
  return {
    inquiryNo: '',
    dateOfInquiry: '',
    website: '',
    sourceCode: '',
    sourceDetail: '',
    locationId: null,
    location: '',
    customerId: null,
    customerNameLegacy: '',
    mobileno: '',
    email: '',
    budgetOfCustomer: null,
    visitedDateOfCustomer: '',
    classification: 'Warm',
    status: 'Open',
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
  contactOutcome: initialContactOutcome,
  customerName: initialCustomerName,
  subStatus: initialSubStatus,
  website: initialWebsite,
  sourceOptions,
  locationOptions,
  subStatusSuggestions,
  customerMobile: initialCustomerMobile,
  users,
  userId: initialUserId,
  makes,
  models,
  variants,
  makeId,
  modelId,
  variantId,
  sort: initialSort,
  total,
  page,
  pageCount,
  inquiryDateFrom: initialInquiryDateFrom,
  inquiryDateTo: initialInquiryDateTo,
  followUpDateFrom: initialFollowUpDateFrom,
  followUpDateTo: initialFollowUpDateTo,
  visitedDateFrom: initialVisitedDateFrom,
  visitedDateTo: initialVisitedDateTo,
  budgetFrom: initialBudgetFrom,
  budgetTo: initialBudgetTo,
  restricted,
  currentUserId,
}: {
  initialData: FollowupRow[]
  search: string
  classification: string
  status: string
  contactOutcome: string
  customerName: string
  subStatus: string
  website: string
  sourceOptions: InquirySourceOption[]
  locationOptions: InquiryLocationOption[]
  subStatusSuggestions: string[]
  customerMobile: string
  users: UserOption[]
  userId: string
  makes: CarMakeMaster[]
  models: CarModelMaster[]
  variants: CarVariantMaster[]
  makeId: string
  modelId: string
  variantId: string
  sort: 'due' | 'activity' | 'inquiry'
  total: number
  page: number
  pageCount: number
  inquiryDateFrom: string
  inquiryDateTo: string
  followUpDateFrom: string
  followUpDateTo: string
  visitedDateFrom: string
  visitedDateTo: string
  budgetFrom: string
  budgetTo: string
  restricted: boolean
  currentUserId: string
}) {
  const router = useRouter()
  const [search, setSearch] = useState(initialSearch)
  const [status, setStatus] = useState(initialStatus)
  const [sort, setSort] = useState(initialSort)
  const [contactOutcome, setContactOutcome] = useState(initialContactOutcome)
  const [customerName, setCustomerName] = useState(initialCustomerName)
  const [subStatus, setSubStatus] = useState(initialSubStatus)
  const [website, setWebsite] = useState(initialWebsite)
  const [customerMobile, setCustomerMobile] = useState(initialCustomerMobile)
  const [userId, setUserId] = useState(initialUserId)
  const debouncedSearch = useDebouncedValue(search, LIST_FILTER_DEBOUNCE_MS)
  const debouncedCustomerName = useDebouncedValue(customerName, LIST_FILTER_DEBOUNCE_MS)
  const debouncedSubStatus = useDebouncedValue(subStatus, LIST_FILTER_DEBOUNCE_MS)
  const debouncedCustomerMobile = useDebouncedValue(customerMobile, LIST_FILTER_DEBOUNCE_MS)
  const [inquiryDateFrom, setInquiryDateFrom] = useState(initialInquiryDateFrom)
  const [inquiryDateTo, setInquiryDateTo] = useState(initialInquiryDateTo)
  const [followUpDateFrom, setFollowUpDateFrom] = useState(initialFollowUpDateFrom)
  const [followUpDateTo, setFollowUpDateTo] = useState(initialFollowUpDateTo)
  const [visitedDateFrom, setVisitedDateFrom] = useState(initialVisitedDateFrom)
  const [visitedDateTo, setVisitedDateTo] = useState(initialVisitedDateTo)
  const [budgetFrom, setBudgetFrom] = useState(initialBudgetFrom)
  const [budgetTo, setBudgetTo] = useState(initialBudgetTo)
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
  const [successMessage, setSuccessMessage] = useState('')
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
  const hasActiveFilters = Boolean(
    search.trim() ||
    status !== 'FollowUp' ||
    sort !== 'due' ||
    contactOutcome ||
    customerName.trim() ||
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
    budgetFrom ||
    budgetTo ||
    page > 1
  )

  useEffect(() => {
    setSearch(initialSearch)
    setStatus(initialStatus)
    setSort(initialSort)
    setContactOutcome(initialContactOutcome)
    setCustomerName(initialCustomerName)
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
    setBudgetFrom(initialBudgetFrom)
    setBudgetTo(initialBudgetTo)
    if (restricted && currentUserId) {
      setUserId(currentUserId)
    }
  }, [currentUserId, initialBudgetFrom, initialBudgetTo, initialContactOutcome, initialCustomerMobile, initialCustomerName, initialFollowUpDateFrom, initialFollowUpDateTo, initialInquiryDateFrom, initialInquiryDateTo, initialSearch, initialSort, initialStatus, initialSubStatus, initialUserId, initialVisitedDateFrom, initialVisitedDateTo, initialWebsite, restricted])

  const pushQuery = (params: Record<string, string>) => {
    const query = buildListQueryString({
      search: initialSearch,
      classification,
      status: initialStatus,
      contactOutcome: initialContactOutcome,
      customerName: initialCustomerName,
      subStatus: initialSubStatus,
      website: initialWebsite,
      customerMobile: initialCustomerMobile,
      userId: initialUserId,
      makeId,
      modelId,
      variantId,
      sort: initialSort,
      page: String(page),
      inquiryDateFrom: initialInquiryDateFrom,
      inquiryDateTo: initialInquiryDateTo,
      followUpDateFrom: initialFollowUpDateFrom,
      followUpDateTo: initialFollowUpDateTo,
      visitedDateFrom: initialVisitedDateFrom,
      visitedDateTo: initialVisitedDateTo,
      budgetFrom: initialBudgetFrom,
      budgetTo: initialBudgetTo,
    }, params)
    startRouteTransition(() => {
      router.push(`/followup${query ? `?${query}` : ''}`)
    })
  }

  useEffect(() => {
    if (
      debouncedSearch !== initialSearch ||
      debouncedCustomerName !== initialCustomerName ||
      debouncedSubStatus !== initialSubStatus ||
      debouncedCustomerMobile !== initialCustomerMobile
    ) {
      pushQuery({
        search: debouncedSearch,
        customerName: debouncedCustomerName,
        subStatus: debouncedSubStatus,
        customerMobile: debouncedCustomerMobile,
        page: '1',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedCustomerMobile, debouncedCustomerName, debouncedSearch, debouncedSubStatus, initialCustomerMobile, initialCustomerName, initialSearch, initialSubStatus])

  useEffect(() => {
    const handle = setTimeout(() => {
      if (
        inquiryDateFrom !== initialInquiryDateFrom ||
        inquiryDateTo !== initialInquiryDateTo ||
        followUpDateFrom !== initialFollowUpDateFrom ||
        followUpDateTo !== initialFollowUpDateTo ||
        visitedDateFrom !== initialVisitedDateFrom ||
        visitedDateTo !== initialVisitedDateTo
        || budgetFrom !== initialBudgetFrom
        || budgetTo !== initialBudgetTo
      ) {
        pushQuery({
          inquiryDateFrom,
          inquiryDateTo,
          followUpDateFrom,
          followUpDateTo,
          visitedDateFrom,
          visitedDateTo,
          budgetFrom,
          budgetTo,
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
    budgetFrom,
    budgetTo,
    initialBudgetFrom,
    initialBudgetTo,
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
      noOfOwners: row.noOfOwners ?? null,
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
      setCarEditorError('Select a valid vehicle year before adding the vehicle row.')
      return
    }

    const nextRow: InquiryCarInput = {
      inquiryCarDetailsId: carEditor.inquiryCarDetailsId ?? null,
      selectedMakeId: carEditor.selectedMakeId ?? null,
      selectedModelId: carEditor.selectedModelId ?? null,
      fkVariantId: carEditor.fkVariantId ?? null,
      subVariant: carEditor.subVariant,
      carYear: carEditor.carYear,
      noOfOwners: carEditor.noOfOwners,
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
    setSuccessMessage('')
    const requestId = historyRequestRef.current + 1
    historyRequestRef.current = requestId
    setLogRow(r)
    setForm({
      ...emptyForm(),
      classification: r.classification ?? 'Warm',
      subStatus: usesOtherSubStatus(r.subStatus) ? '' : (r.subStatus ?? ''),
      useOtherSubStatus: usesOtherSubStatus(r.subStatus),
      otherSubStatus: usesOtherSubStatus(r.subStatus) ? (r.subStatus ?? '') : '',
    })
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
    const validation = validateFollowupLogInput(form)
    if (validation.error) {
      setError('')
      setErrors(validation.fieldErrors)
      return
    }
    setErrors({})

    startTransition(async () => {
      const result = await logFollowup(logRow.inquiryId, form)
      if (!result.success) {
        setError(result.error ?? 'Something went wrong.')
        return
      }
      setSuccessMessage('Follow-up saved successfully.')
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

    getInquiryDetail(inquiryId, { route: '/followup' })
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

    getInquiryDetail(inquiryId, { route: '/followup' })
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
          noOfOwners: car.noOfOwners ?? null,
        })) : []

        setEditInquiryForm({
          inquiryNo: detail.inquiryNo ?? '',
          dateOfInquiry: fmtDate(detail.dateOfInquiry),
          website: detail.website ?? '',
          sourceCode: detail.source?.code ?? '',
          sourceDetail: detail.sourceDetail ?? '',
          locationId: detail.locationId ?? null,
          location: detail.location ?? '',
          customerId: detail.customerId,
          customerNameLegacy: detail.customerNameLegacy ?? '',
          mobileno: detail.mobileno ?? '',
          email: detail.email ?? '',
          budgetOfCustomer: detail.budgetOfCustomer ? Number(detail.budgetOfCustomer) : null,
          visitedDateOfCustomer: fmtDate(detail.visitedDateOfCustomer),
          classification: detail.classification ?? 'Warm',
          status: detail.status ?? 'Open',
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
    if (key === 'status') {
      const nextStatus = String(value)
      setEditInquiryForm(prev => ({
        ...prev,
        status: nextStatus,
        followUpDate: isFollowupStatus(nextStatus) ? prev.followUpDate : '',
      }))
      return
    }

    setEditInquiryForm(prev => ({ ...prev, [key]: value }))
  }

  const saveInquiryEdit = () => {
    if (!editInquiryId) return

    setEditInquiryError('')
    const validation = validateInquiryFormInput(editInquiryForm)
    if (validation.error) {
      const labels: Record<string, string> = {
        customer: 'Customer',
        mobileno: 'Customer Mobile No.',
        email: 'Customer Email',
        website: 'Reference Website / Source',
        budgetOfCustomer: 'Budget of customer',
        inquiryCars: 'Car Details',
        dateOfInquiry: 'Date of Inquiry',
        followUpDate: 'FollowUp Date',
        visitedDateOfCustomer: 'Visited Date of customer',
      }
      const invalidFields = Object.keys(validation.fieldErrors).map(key => labels[key] ?? (key.startsWith('carYear-') ? 'Car Year' : key.startsWith('noOfOwners-') ? 'Number of Owners' : key))
      setEditInquiryError(invalidFields.length > 0 ? `Complete or correct: ${invalidFields.join(', ')}.` : validation.error)
      setEditInquiryErrors(validation.fieldErrors)
      return
    }

    setEditInquiryErrors({})
    startTransition(async () => {
      const result = await updateInquiry(editInquiryId, editInquiryForm, { route: '/followup' })
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
        if (contactOutcome) params.set('contactOutcome', contactOutcome)
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
        if (budgetFrom) params.set('budgetFrom', budgetFrom)
        if (budgetTo) params.set('budgetTo', budgetTo)

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
    setSort('due')
    setContactOutcome('')
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
    setBudgetFrom('')
    setBudgetTo('')
    pushQuery({
      search: '',
      status: 'FollowUp',
      contactOutcome: '',
      subStatus: '',
      website: '',
      customerMobile: '',
      userId: '',
      makeId: '',
      modelId: '',
      variantId: '',
      sort: 'due',
      classification: 'All',
      inquiryDateFrom: '',
      inquiryDateTo: '',
      followUpDateFrom: '',
      followUpDateTo: '',
      visitedDateFrom: '',
      visitedDateTo: '',
      budgetFrom: '',
      budgetTo: '',
      page: '1',
    })
  }

  const applyQuickFilter = (preset: 'active' | 'overdue' | 'today' | 'upcoming' | 'activity' | 'all') => {
    const today = new Date()
    const formatDate = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const common = {
      search: '', classification: 'All', contactOutcome: '', customerName: '', subStatus: '', website: '', customerMobile: '', userId: '',
      makeId: '', modelId: '', variantId: '', inquiryDateFrom: '', inquiryDateTo: '', visitedDateFrom: '', visitedDateTo: '', budgetFrom: '', budgetTo: '', page: '1',
    }
    const presets = {
      active: { status: 'FollowUp', sort: 'due', followUpDateFrom: '', followUpDateTo: '' },
      overdue: { status: 'FollowUp', sort: 'due', followUpDateFrom: '', followUpDateTo: formatDate(yesterday) },
      today: { status: 'FollowUp', sort: 'due', followUpDateFrom: formatDate(today), followUpDateTo: formatDate(today) },
      upcoming: { status: 'FollowUp', sort: 'due', followUpDateFrom: formatDate(tomorrow), followUpDateTo: '' },
      activity: { status: 'All', sort: 'activity', followUpDateFrom: '', followUpDateTo: '' },
      all: { status: 'All', sort: 'inquiry', followUpDateFrom: '', followUpDateTo: '' },
    } as const
    pushQuery({ ...common, ...presets[preset] })
  }

  const formatLocalDate = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
  const quickFilterToday = new Date()
  const quickFilterYesterday = new Date(quickFilterToday)
  quickFilterYesterday.setDate(quickFilterYesterday.getDate() - 1)
  const quickFilterTomorrow = new Date(quickFilterToday)
  quickFilterTomorrow.setDate(quickFilterTomorrow.getDate() + 1)
  const activeQuickFilter = status === 'FollowUp' && sort === 'due' && !followUpDateFrom && !followUpDateTo
    ? 'active'
    : status === 'FollowUp' && sort === 'due' && !followUpDateFrom && followUpDateTo === formatLocalDate(quickFilterYesterday)
      ? 'overdue'
      : status === 'FollowUp' && sort === 'due' && followUpDateFrom === formatLocalDate(quickFilterToday) && followUpDateTo === formatLocalDate(quickFilterToday)
        ? 'today'
        : status === 'FollowUp' && sort === 'due' && followUpDateFrom === formatLocalDate(quickFilterTomorrow) && !followUpDateTo
          ? 'upcoming'
          : status === 'All' && sort === 'activity'
            ? 'activity'
            : status === 'All' && sort === 'inquiry'
              ? 'all'
              : ''
  const resultLabel = status === 'Closed' ? 'closed inquiries' : status === 'All' ? 'matching inquiries' : status === 'FollowUp' ? 'active follow-ups' : 'open inquiries'

  return (
    <div className="min-w-0">
      <FollowupHeader
        total={total}
        filtered={hasActiveFilters}
        exporting={isExporting}
        onExport={exportAllMatchingFollowups}
        subtitle={`${total.toLocaleString('en-IN')} ${resultLabel}${overdueCount && status !== 'Closed' ? ` · ${overdueCount} overdue on this page` : ''}${pageCount > 1 ? ` · Page ${page} of ${pageCount}` : ''}`}
      />

      {exportError ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{exportError}</div>
      ) : null}
      {successMessage ? (
        <div role="status" aria-live="polite" className="fixed right-4 top-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-4 rounded-lg border border-green-200 bg-white px-4 py-3 text-sm text-green-700 shadow-lg sm:right-6 sm:top-6">
          <span>{successMessage}</span>
          <button type="button" onClick={() => setSuccessMessage('')} className="font-medium text-green-800 hover:text-green-950" aria-label="Dismiss success message">Dismiss</button>
        </div>
      ) : null}

      <div className="mb-4 flex min-w-0 flex-nowrap gap-2 overflow-x-auto pb-1 sm:flex-wrap" aria-label="Quick follow-up filters">
        {[
          ['active', 'Active'], ['overdue', 'Overdue'], ['today', 'Today'], ['upcoming', 'Upcoming'], ['activity', 'Newest Activity'], ['all', 'All Inquiries'],
        ].map(([preset, label]) => (
          <button
            key={preset}
            type="button"
            onClick={() => applyQuickFilter(preset as 'active' | 'overdue' | 'today' | 'upcoming' | 'activity' | 'all')}
            disabled={isRoutePending}
            aria-pressed={activeQuickFilter === preset}
            className={`min-h-11 shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${activeQuickFilter === preset ? 'border-[#1B2A6B] bg-[#1B2A6B] text-white shadow-sm' : 'border-gray-200 bg-white text-gray-700 hover:border-[#1B2A6B] hover:bg-blue-50 hover:text-[#1B2A6B]'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <FollowupFilters
        search={search}
        status={status}
        contactOutcome={contactOutcome}
        customerName={customerName}
        subStatus={subStatus}
        website={website}
        customerMobile={customerMobile}
        userId={userId}
        makeId={makeId}
        modelId={modelId}
        variantId={variantId}
        classification={classification}
        inquiryDateFrom={inquiryDateFrom}
        inquiryDateTo={inquiryDateTo}
        followUpDateFrom={followUpDateFrom}
        followUpDateTo={followUpDateTo}
        visitedDateFrom={visitedDateFrom}
        visitedDateTo={visitedDateTo}
        budgetFrom={budgetFrom}
        budgetTo={budgetTo}
        restricted={restricted}
        currentUserId={currentUserId}
        isRoutePending={isRoutePending}
        statuses={STATUSES}
        classifications={CLASSIFICATIONS}
        contactOutcomes={CONTACT_OUTCOME_OPTIONS}
        sourceOptions={sourceOptions}
        users={users}
        makes={makes}
        models={models}
        variants={variants}
        userLabel={followupUserLabel}
        onSearchChange={setSearch}
        onStatusChange={status => pushQuery({ status, page: '1' })}
        onContactOutcomeChange={contactOutcome => pushQuery({ contactOutcome, page: '1' })}
        onCustomerNameChange={setCustomerName}
        onSubStatusChange={setSubStatus}
        onWebsiteChange={website => pushQuery({ website, page: '1' })}
        onCustomerMobileChange={setCustomerMobile}
        onUserIdChange={userId => pushQuery({ userId, page: '1' })}
        onClassificationChange={classification => pushQuery({ classification })}
        onMakeChange={makeId => pushQuery({ makeId, modelId: '', variantId: '', page: '1' })}
        onModelChange={modelId => pushQuery({ modelId, variantId: '', page: '1' })}
        onVariantChange={variantId => pushQuery({ variantId, page: '1' })}
        onInquiryDateFromChange={setInquiryDateFrom}
        onInquiryDateToChange={setInquiryDateTo}
        onFollowUpDateFromChange={setFollowUpDateFrom}
        onFollowUpDateToChange={setFollowUpDateTo}
        onVisitedDateFromChange={setVisitedDateFrom}
        onVisitedDateToChange={setVisitedDateTo}
        onBudgetFromChange={setBudgetFrom}
        onBudgetToChange={setBudgetTo}
      />

      <div className="mb-4 flex justify-end">
        <Btn variant="outline" size="sm" className="min-h-11" onClick={() => { setSuccessMessage(''); resetFilters() }} disabled={isRoutePending || !hasActiveFilters}>
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
          <FollowupTable
            rows={initialData}
            page={page}
            pageSize={25}
            onLogFollowup={openLog}
            renderInlineCells={row => logRow?.inquiryId === row.inquiryId ? {
              classification: <div className="space-y-2"><FormDropdown label="Classification" value={form.classification} options={CLASSIFICATIONS.map(value => ({ value, label: value }))} placeholder="Select" error={errors.classification} errorMessage="Classification is required." onChange={value => f('classification', value)} /><FormDropdown label="Status" value={form.status} options={STATUSES.map(value => ({ value, label: value === 'FollowUp' ? 'Follow-up' : value }))} placeholder="Select" error={errors.status} errorMessage="Status is required." onChange={value => { f('status', value); if (value === 'Closed') f('nextFollowUpDate', '') }} /><FormDropdown label="Sub-status" value={form.useOtherSubStatus ? FOLLOWUP_OTHER_SUB_STATUS_VALUE : form.subStatus} options={[...SUB_STATUS_SUGGESTIONS.map(value => ({ value, label: value })), { value: FOLLOWUP_OTHER_SUB_STATUS_VALUE, label: 'OTHER' }]} placeholder="Select" allowClear onChange={value => { if (value === FOLLOWUP_OTHER_SUB_STATUS_VALUE) { f('useOtherSubStatus', true); f('subStatus', ''); return }; f('useOtherSubStatus', false); f('otherSubStatus', ''); f('subStatus', value) }} />{form.useOtherSubStatus ? <Input label="Other sub-status" value={form.otherSubStatus ?? ''} error={errors.otherSubStatus} errorMessage="Enter the custom sub-status." onChange={event => f('otherSubStatus', event.target.value)} /> : null}</div>,
              followup: <div className="space-y-2"><Input label="Follow-up date" type="date" value={form.nextFollowUpDate} error={errors.nextFollowUpDate} errorMessage="Select a follow-up date today or later." disabled={!isFollowupStatus(form.status)} onChange={event => f('nextFollowUpDate', event.target.value)} /><div className="pt-1 text-xs text-gray-500"><span className="font-semibold text-gray-700">Inquiry made by:</span> {row.createdByUser?.displayName ?? row.createdByUser?.userName ?? (row.createdBy ? `User #${row.createdBy}` : '—')}</div></div>,
              remark: <div className="min-w-0"><Textarea label="Remark *" value={form.comments} error={errors.comments} errorMessage="Remark is required." onChange={event => f('comments', event.target.value)} placeholder="Update..." className="min-h-20 min-w-0 w-full" />{error ? <div className="mt-2 text-xs font-medium text-red-600">{error}</div> : null}</div>,
              actions: <><button type="button" onClick={save} disabled={isPending} className="min-h-11 rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-100 disabled:opacity-50" title="Save follow-up">{isPending ? 'Saving...' : 'Save'}</button><button type="button" onClick={() => setLogRow(null)} disabled={isPending} className="min-h-11 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 disabled:opacity-50" title="Cancel inline edit">Cancel</button></>,
            } : null}
            onViewFollowup={openFollowupView}
            onEditInquiry={openInquiryEdit}
          />
        </div>
        {isRoutePending ? <ListLoadingOverlay message="Updating follow-up list..." /> : null}
      </div>

      <ListPagination
        page={page}
        pageCount={pageCount}
        total={total}
        showingText={`Showing ${((page - 1) * initialData.length) + (initialData.length ? 1 : 0)}-${((page - 1) * 25) + initialData.length}`}
        pending={isRoutePending}
        className="mt-4 flex-col gap-3 sm:flex-row [&_button]:min-h-11"
        onPageChange={nextPage => pushQuery({ page: String(nextPage) })}
      />

      <LogFollowupModal title={`Log Follow-up${logRow ? ` — ${logRow.customer?.custName ?? logRow.customerNameLegacy ?? ''}` : ''}`} open={false} onClose={() => setLogRow(null)}>
        {logRow && (
          (() => {
            const today = new Date()
            const effectiveSubStatus = resolveFollowupSubStatusInput(form)
            const friendlyStatusKey = getFriendlyStatusKey(form.status, effectiveSubStatus)
            const daysLate = logRow.followUpDate ? daysFromToday(logRow.followUpDate) : null
            const nextDateRequired = isFollowupStatus(form.status)
            const lastEntry = history[0] ?? null

            return (
              <div className="space-y-5">
                <div className="rounded-xl border border-gray-200 bg-white">
                  <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">{logRow.inquiryNo ?? `Inquiry/${logRow.inquiryId}`}</span>
                        {logRow.website ? <span className="rounded-md bg-blue-50 px-3 py-1 text-sm font-medium text-[#1B2A6B]">{logRow.website}</span> : null}
                      </div>
                      <h2 className="mt-2 text-xl font-bold text-gray-900">{logRow.customer?.custName ?? logRow.customerNameLegacy ?? 'Unnamed inquiry'}</h2>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                        <span>Customer #{logRow.customer?.custId ?? logRow.customerId ?? '—'}</span>
                        <span>·</span>
                        <span>{getInquiryCarsSummary(logRow.inquiryCarDetails)}</span>
                        <span>·</span>
                        <span>{formatFriendlyStatus(form.status, effectiveSubStatus)}</span>
                      </div>
                    </div>
                    <div className="grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
                      <div><span className="font-medium text-gray-900">Mobile:</span> {logRow.customer?.custMobile ?? logRow.mobileno ?? '—'}</div>
                      <div><span className="font-medium text-gray-900">Email:</span> {logRow.customer?.custEmail ?? logRow.email ?? '—'}</div>
                      <div><span className="font-medium text-gray-900">Current follow-up:</span> {fmtDate(logRow.followUpDate) || '—'}</div>
                      <div><span className="font-medium text-gray-900">Classification:</span> {form.classification || '—'}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
                  <div className="mb-4 text-sm font-semibold text-[#1B2A6B]">Follow-up Details</div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormDropdown label="Classification" value={form.classification} options={CLASSIFICATIONS.map(value => ({ value, label: value }))} placeholder="Select classification" onChange={value => f('classification', value)} />
                    <FormDropdown label="Status *" value={friendlyStatusKey} options={FRIENDLY_STATUS_OPTIONS.map(option => ({ value: option.key, label: option.label }))} placeholder="Select status" error={errors.status} onChange={value => { const selected = FRIENDLY_STATUS_OPTIONS.find(option => option.key === value); if (!selected) return; f('status', selected.status); f('subStatus', selected.subStatus); f('useOtherSubStatus', false); f('otherSubStatus', ''); if (selected.status === 'Closed') f('nextFollowUpDate', '') }} />
                    <FormDropdown label="Sub-status" value={form.useOtherSubStatus ? FOLLOWUP_OTHER_SUB_STATUS_VALUE : form.subStatus} options={[...SUB_STATUS_SUGGESTIONS.map(value => ({ value, label: value })), { value: FOLLOWUP_OTHER_SUB_STATUS_VALUE, label: 'OTHER' }]} placeholder="Select sub-status" allowClear onChange={value => { if (value === FOLLOWUP_OTHER_SUB_STATUS_VALUE) { f('useOtherSubStatus', true); f('subStatus', ''); return }; f('useOtherSubStatus', false); f('otherSubStatus', ''); f('subStatus', value) }} />
                    <Input label={nextDateRequired ? 'Next Follow-up Date *' : 'Next Follow-up Date'} type="date" value={form.nextFollowUpDate} onChange={e => f('nextFollowUpDate', e.target.value)} error={errors.nextFollowUpDate} disabled={!nextDateRequired} />
                    {form.useOtherSubStatus ? <Input label="Other Sub-status *" value={form.otherSubStatus ?? ''} onChange={e => f('otherSubStatus', e.target.value)} error={errors.otherSubStatus} placeholder="Enter sub-status" /> : null}
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
                  <div className="text-sm font-semibold text-[#1B2A6B]">Remark <span className="text-red-600">*</span></div>
                  {logRow.remark?.trim() ? <div className="mt-2 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600"><span className="font-medium text-gray-800">Last remark:</span> {logRow.remark}</div> : null}
                  <div className="mt-3"><Textarea label="" value={form.comments} onChange={event => f('comments', event.target.value)} placeholder="Write your remark here..." error={errors.comments} className="min-h-28" /></div>
                </div>
                {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
                <div className="sticky bottom-[-1rem] flex items-center justify-end gap-3 border-t border-gray-200 bg-white px-1 pb-1 pt-4"><Btn variant="outline" onClick={() => setLogRow(null)}>Cancel</Btn><Btn onClick={save} disabled={isPending}>{isPending ? 'Saving...' : 'Save Changes'}</Btn></div>

                <div className="hidden">
                <LogFollowupContactOutcome
                  options={CONTACT_OUTCOME_OPTIONS}
                  selectedValue={form.contactOutcome}
                  onSelect={option => {
                    const configuredOption = CONTACT_OUTCOME_OPTIONS.find(item => item.key === option.key)
                    if (!configuredOption) return
                    const target = FRIENDLY_STATUS_OPTIONS.find(item => item.key === configuredOption.statusKey)
                    f('contactOutcome', configuredOption.value)
                    if (target) {
                      f('status', target.status)
                      f('subStatus', configuredOption.subStatus || target.subStatus)
                      f('useOtherSubStatus', false)
                      f('otherSubStatus', '')
                      if (target.status === 'Closed') f('nextFollowUpDate', '')
                    } else {
                      f('subStatus', configuredOption.subStatus)
                      f('useOtherSubStatus', false)
                      f('otherSubStatus', '')
                    }
                  }}
                />

                <LogFollowupRemark lastRemark={logRow.remark} value={form.comments} error={errors.comments} onChange={value => f('comments', value)} />

                <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded border border-[#1B2A6B]/20 bg-blue-50 text-xs font-semibold text-[#1B2A6B]">3</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-base font-semibold text-gray-900">Where does that leave the lead?</div>
                      <div className="text-sm text-gray-500">Business status on screen, current status fields underneath.</div>
                      <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                        <span className="font-medium text-gray-900">Reached outcome:</span> {contactOutcomeLabel(form.contactOutcome)}
                      </div>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <FormDropdown
                          label="Status *"
                          value={friendlyStatusKey}
                          options={FRIENDLY_STATUS_OPTIONS.map(option => ({ value: option.key, label: option.label }))}
                          placeholder="Select status"
                          onChange={value => {
                            const selected = FRIENDLY_STATUS_OPTIONS.find(option => option.key === value)
                            if (!selected) return
                            f('status', selected.status)
                            f('subStatus', selected.subStatus)
                            f('useOtherSubStatus', false)
                            f('otherSubStatus', '')
                            if (selected.status === 'Closed') {
                              f('nextFollowUpDate', '')
                            }
                          }}
                          error={errors.status}
                        />
                        <FormDropdown label="Classification" value={form.classification} options={CLASSIFICATIONS.map(value => ({ value, label: value }))} placeholder="Select classification" onChange={value => f('classification', value)} />
                      </div>
                      <div className="mt-4">
                        <FormDropdown
                          label="Sub-status"
                          value={form.useOtherSubStatus ? FOLLOWUP_OTHER_SUB_STATUS_VALUE : form.subStatus}
                          options={[...SUB_STATUS_SUGGESTIONS.map(value => ({ value, label: value })), { value: FOLLOWUP_OTHER_SUB_STATUS_VALUE, label: 'OTHER' }]}
                          placeholder="-- none --"
                          allowClear
                          onChange={value => {
                            if (value === FOLLOWUP_OTHER_SUB_STATUS_VALUE) {
                              f('useOtherSubStatus', true)
                              f('subStatus', '')
                              return
                            }
                            f('useOtherSubStatus', false)
                            f('otherSubStatus', '')
                            f('subStatus', value)
                          }}
                        />
                        {form.useOtherSubStatus ? (
                          <div className="mt-3">
                            <Input
                              label="Other Sub-status *"
                              value={form.otherSubStatus ?? ''}
                              onChange={e => f('otherSubStatus', e.target.value)}
                              error={errors.otherSubStatus}
                              placeholder="Enter the real sub-status"
                            />
                          </div>
                        ) : null}
                        <div className="mt-1 text-xs text-gray-500">Choose a standard sub-status, or select OTHER and enter the actual value.</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded border border-[#1B2A6B]/20 bg-blue-50 text-xs font-semibold text-[#1B2A6B]">4</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-base font-semibold text-gray-900">When next?</div>
                      <div className="text-sm text-gray-500">Shortcuts help schedule the next follow-up faster.</div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {[
                          { label: 'In 2 days', value: addDays(today, 2).toISOString().slice(0, 10) },
                          { label: 'In a week', value: addDays(today, 7).toISOString().slice(0, 10) },
                          { label: 'In 2 weeks', value: addDays(today, 14).toISOString().slice(0, 10) },
                        ].map(preset => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              f('status', 'FollowUp')
                              f('nextFollowUpDate', preset.value)
                              if (!effectiveSubStatus) {
                                f('useOtherSubStatus', false)
                                f('otherSubStatus', '')
                                f('subStatus', 'Ringing')
                              }
                            }}
                            className={`rounded-full border px-3 py-1.5 text-sm transition ${form.nextFollowUpDate === preset.value ? 'border-[#1B2A6B] bg-blue-50 text-[#1B2A6B]' : 'border-gray-200 bg-white text-gray-600 hover:border-[#1B2A6B]/35 hover:bg-gray-50'}`}
                          >
                            {preset.label}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            f('status', 'Closed')
                            f('nextFollowUpDate', '')
                          }}
                          className={`rounded-full border px-3 py-1.5 text-sm transition ${!nextDateRequired ? 'border-[#1B2A6B] bg-blue-50 text-[#1B2A6B]' : 'border-gray-200 bg-white text-gray-600 hover:border-[#1B2A6B]/35 hover:bg-gray-50'}`}
                        >
                          No follow-up needed
                        </button>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <Input
                          label={nextDateRequired ? 'Next Follow-up Date *' : 'Next Follow-up Date'}
                          type="date"
                          value={form.nextFollowUpDate}
                          onChange={e => f('nextFollowUpDate', e.target.value)}
                          error={errors.nextFollowUpDate}
                          disabled={!nextDateRequired}
                        />
                        <Input label="Who's calling next" value="Me" readOnly />
                      </div>

                      {daysLate !== null && daysLate > 0 ? (
                        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                          Follow-up was due {daysLate} day{daysLate === 1 ? '' : 's'} ago on {fmtLongDate(logRow.followUpDate)}.
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

                <LogFollowupRecentActivity
                  history={history}
                  loading={historyLoading}
                  error={historyError}
                  daysLate={daysLate}
                  scheduledFollowupDate={logRow.followUpDate}
                  onViewFullLog={() => {
                    setLogRow(null)
                    openFollowupView(logRow.inquiryId)
                  }}
                  formatDate={fmtLongDate}
                  formatOutcome={contactOutcomeLabel}
                  cleanRemark={clean}
                />

                {lastEntry ? (
                  <details className="rounded-xl border border-gray-200 bg-white px-5 py-4">
                    <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Record Details</summary>
                    <div className="mt-4 grid gap-3 text-sm text-gray-600 md:grid-cols-2">
                      <div><span className="font-medium text-gray-900">Inquiry ID:</span> {logRow.inquiryId}</div>
                      <div><span className="font-medium text-gray-900">Inquiry Date:</span> {fmtLongDate(logRow.dateOfInquiry)}</div>
                      <div><span className="font-medium text-gray-900">Last entry date:</span> {fmtLongDate(lastEntry.createdDt ?? lastEntry.followupDate)}</div>
                      <div><span className="font-medium text-gray-900">Last status:</span> {formatFriendlyStatus(lastEntry.followupStatus ?? '', lastEntry.followupSubStatus ?? '')}</div>
                    </div>
                  </details>
                ) : null}

                <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-1 pt-4">
                  <div className="text-sm text-gray-500">{form.comments.trim() ? 'Ready to save this follow-up.' : 'Add the key follow-up note before saving.'}</div>
                  <div className="flex gap-3">
                    <Btn variant="outline" onClick={() => setLogRow(null)}>Cancel</Btn>
                    <Btn onClick={save} disabled={isPending}>{isPending ? 'Saving...' : 'Save follow-up'}</Btn>
                  </div>
                </div>
                </div>
              </div>
            )
          })()
        )}
      </LogFollowupModal>

      <FollowupHistoryModal title={`View Follow-up${viewHistoryRow ? ` — ${viewHistoryRow.inquiryNo ?? `Inquiry #${viewHistoryRow.inquiryId}`}` : ''}`} open={viewHistoryRow !== null} onClose={closeFollowupView}>
        <div className="space-y-4">
          {viewHistoryLoading ? (
            <div className="flex min-h-32 flex-col items-center justify-center gap-3 text-sm text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <div>Loading follow-up history...</div>
            </div>
          ) : viewHistoryError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{viewHistoryError}</div>
          ) : viewHistoryRow ? (
            (() => {
              const sortedHistory = [...viewHistory].sort((a, b) => {
                const aTime = toDateValue(a.createdDt ?? a.followupDate)?.getTime() ?? 0
                const bTime = toDateValue(b.createdDt ?? b.followupDate)?.getTime() ?? 0
                return bTime - aTime
              })

              return (
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{viewHistoryRow.customer?.custName ?? viewHistoryRow.customerNameLegacy ?? 'Unnamed inquiry'}</div>
                      <div className="mt-1 text-xs text-gray-500">{viewHistoryRow.inquiryNo ?? `Inquiry/${viewHistoryRow.inquiryId}`} · Raised {fmtDate(viewHistoryRow.dateOfInquiry) || '—'}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {viewHistoryRow.classification ? <Badge label={viewHistoryRow.classification} /> : null}
                        {viewHistoryRow.status ? <Badge label={viewHistoryRow.status} /> : null}
                      </div>
                      <Btn size="sm" onClick={() => {
                        closeFollowupView()
                        openLog(viewHistoryRow)
                      }}>
                        Add follow-up
                      </Btn>
                    </div>
                  </div>
                  <FollowupHistoryList history={sortedHistory} formatDate={fmtDate} formatStatus={formatFriendlyStatus} cleanRemark={clean} />
                </div>
              )
            })()
          ) : null}
        </div>
      </FollowupHistoryModal>

      <FollowupInquiryViewModal title={`View Inquiry${viewInquiry ? ` — ${viewInquiry.inquiryNo ?? `Inquiry #${viewInquiry.inquiryId}`}` : viewInquiryId ? ` — Inquiry #${viewInquiryId}` : ''}`} open={viewInquiryId !== null} onClose={closeInquiryView}>
        <div className="space-y-4">
          {viewInquiryLoading ? (
            <div className="flex min-h-32 flex-col items-center justify-center gap-3 text-sm text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <div>Loading inquiry details...</div>
            </div>
          ) : viewInquiryError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{viewInquiryError}</div>
          ) : viewInquiry ? (
            <InquiryDetailView
              inquiry={viewInquiry}
              detailRoute="/followup"
              onClose={closeInquiryView}
              onEdit={() => {
                closeInquiryView()
                openInquiryEdit(viewInquiry.inquiryId)
              }}
              onLogFollowup={() => {
                closeInquiryView()
                openLog(viewInquiry as unknown as FollowupRow)
              }}
            />
          ) : null}
        </div>
      </FollowupInquiryViewModal>

      <FollowupInquiryEditModal title={editInquiryId ? `Edit Inquiry — #${editInquiryId}` : 'Edit Inquiry'} open={editInquiryId !== null} onClose={closeInquiryEdit}>
        {editInquiryLoading ? (
          <div className="flex min-h-32 flex-col items-center justify-center gap-3 text-sm text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <div>Loading inquiry details...</div>
          </div>
        ) : (
          <div className="space-y-4">
            {editInquiryError ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{editInquiryError}</div> : null}
            <div className="grid gap-4 md:grid-cols-3">
              <Input label="Inquiry No*" value={editInquiryForm.inquiryNo} readOnly />
              <Input label="Date of Inquiry*" type="date" value={editInquiryForm.dateOfInquiry} onChange={e => updateInquiryField('dateOfInquiry', e.target.value)} error={editInquiryErrors.dateOfInquiry} />
              <Select
                label="Reference Website / Source*"
                value={editInquiryForm.sourceCode}
                onChange={e => {
                  const selected = sourceOptions.find(source => source.code === e.target.value)
                  setEditInquiryForm(previous => ({
                    ...previous,
                    sourceCode: e.target.value,
                    website: selected?.displayName ?? '',
                    sourceDetail: selected?.requiresDetail ? previous.sourceDetail : '',
                  }))
                }}
                error={editInquiryErrors.website}
              >
                <option value="">Select source</option>
                {sourceOptions.map(source => <option key={source.code} value={source.code}>{source.displayName}</option>)}
              </Select>
            </div>

            {sourceOptions.find(source => source.code === editInquiryForm.sourceCode)?.requiresDetail ? (
              <Input
                label={editInquiryForm.sourceCode === 'REFERENCE' ? 'Reference Details*' : 'Other Source Details*'}
                value={editInquiryForm.sourceDetail}
                onChange={e => updateInquiryField('sourceDetail', e.target.value)}
                placeholder={editInquiryForm.sourceCode === 'REFERENCE' ? 'Customer, dealer, or referral person' : 'Describe the source'}
              />
            ) : null}

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
              <Input label="Customer Name *" value={editInquiryForm.customerNameLegacy} onChange={e => updateInquiryField('customerNameLegacy', e.target.value)} disabled={!!selectedCustomer} error={editInquiryErrors.customer} />
              <Input label="Customer Mobile No *" value={editInquiryForm.mobileno} onChange={e => updateInquiryField('mobileno', e.target.value)} disabled={!!selectedCustomer} error={editInquiryErrors.mobileno} />
              <Input label="Customer Email" type="email" value={editInquiryForm.email} onChange={e => updateInquiryField('email', e.target.value)} disabled={!!selectedCustomer} error={editInquiryErrors.email} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FormDropdown label="City / Reporting Location (Optional)" value={String(editInquiryForm.locationId ?? '')} options={locationOptions.map(item => ({ value: String(item.locationId), label: `${item.displayName} · ${item.region}` }))} placeholder="Select reporting location" allowClear error={editInquiryErrors.locationId} onChange={value => updateInquiryField('locationId', Number(value) || null)} />
              <Input label="Area / Locality" value={editInquiryForm.location} onChange={e => updateInquiryField('location', e.target.value)} placeholder="e.g. Andheri West, Kothrud, JLT" />
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-gray-900">Car Details</div>
                  <div className="text-xs text-gray-500">Update the customer requirement here, including changing or adding more cars.</div>
                </div>
                {editingCarIndex !== null ? <Btn variant="outline" size="sm" onClick={resetCarEditor}>Cancel Edit</Btn> : null}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3 2xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,.8fr)_minmax(0,.8fr)_minmax(0,1.1fr)_auto]">
                <FormDropdown label="Make *" value={String(carEditor.selectedMakeId ?? '')} options={catalogSelectOptions(makes, item => item.pkMakeId, item => item.make, carEditor.selectedMakeId, 'make')} placeholder="Select make" allowClear onChange={value => onCarEditorMakeChange(Number(value))} />
                <FormDropdown label="Model *" value={String(carEditor.selectedModelId ?? '')} options={catalogSelectOptions(carEditorModels, item => item.pkModelId, item => item.model, carEditor.selectedModelId, 'model')} placeholder="Select model" allowClear disabled={!carEditor.selectedMakeId} onChange={value => onCarEditorModelChange(Number(value))} />
                <FormDropdown label="Variant *" value={String(carEditor.fkVariantId ?? '')} options={catalogSelectOptions(carEditorVariants, item => item.pkVariantId, item => item.variant, carEditor.fkVariantId, 'variant')} placeholder="Select variant" allowClear disabled={!carEditor.selectedModelId} onChange={value => {
                  setCarEditor(prev => ({ ...prev, fkVariantId: Number(value) || null }))
                  setCarEditorError('')
                }} />
                <FormDropdown label="Year (Optional)" value={carEditor.carYear ? String(carEditor.carYear) : ''} options={VEHICLE_YEAR_OPTIONS} placeholder="Select year" allowClear onChange={value => {
                  setCarEditor(prev => ({ ...prev, carYear: value ? Number(value) : null }))
                  setCarEditorError('')
                }} />
                <FormDropdown label="Number of Owners" value={carEditor.noOfOwners === null ? '' : String(carEditor.noOfOwners)} options={OWNER_COUNT_OPTIONS} placeholder="Any" allowClear onChange={value => {
                  setCarEditor(prev => ({ ...prev, noOfOwners: value === '' ? null : Number(value) }))
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

              <InquiryCarTable
                cars={editInquiryForm.inquiryCars}
                makeNames={Object.fromEntries(makes.map(item => [item.pkMakeId, item.make]))}
                modelNames={modelNameCache}
                variantNames={variantNameCache}
                onMove={moveInquiryCar}
                onEdit={editInquiryCar}
                onDelete={removeInquiryCar}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Budget of customer (optional)" type="number" value={editInquiryForm.budgetOfCustomer ?? ''} onChange={e => updateInquiryField('budgetOfCustomer', e.target.value ? Number(e.target.value) : null)} error={editInquiryErrors.budgetOfCustomer} />
              <FormDropdown label="Classification *" value={editInquiryForm.classification} options={INQUIRY_CLASSIFICATIONS.map(value => ({ value, label: value }))} placeholder="Select classification" onChange={value => updateInquiryField('classification', value)} />
              <Input label="Visited Date of customer" type="date" value={editInquiryForm.visitedDateOfCustomer} onChange={e => updateInquiryField('visitedDateOfCustomer', e.target.value)} error={editInquiryErrors.visitedDateOfCustomer} />
              <FormDropdown label="Status *" value={editInquiryForm.status} options={INQUIRY_STATUSES.map(value => ({ value, label: inquiryStatusLabel(value) }))} placeholder="Select status" onChange={value => updateInquiryField('status', value)} />
              <FormDropdown label="Sub Status" value={editInquiryForm.subStatus} options={subStatusSuggestions.map(value => ({ value, label: value }))} placeholder="Select sub status" allowClear onChange={value => updateInquiryField('subStatus', value)} />
              <Input
                label={isFollowupStatus(editInquiryForm.status) ? 'FollowUp Date*' : 'FollowUp Date'}
                type="date"
                value={editInquiryForm.followUpDate}
                onChange={e => updateInquiryField('followUpDate', e.target.value)}
                error={editInquiryErrors.followUpDate}
                disabled={!isFollowupStatus(editInquiryForm.status)}
              />
            </div>

            <Textarea label="Remark" value={editInquiryForm.remark} onChange={e => updateInquiryField('remark', e.target.value)} placeholder="Notes about this inquiry..." />

            <div className="flex justify-end gap-3 pt-2">
              <Btn variant="outline" onClick={closeInquiryEdit}>Cancel</Btn>
              <Btn onClick={saveInquiryEdit} disabled={isPending}>{isPending ? 'Saving...' : 'Save Inquiry'}</Btn>
            </div>
          </div>
        )}
      </FollowupInquiryEditModal>
    </div>
  )
}
