'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Mail, Download, Loader2, Eye, UserPlus } from 'lucide-react'
import { Badge, Btn, Input, Select, Textarea, Modal, Table, PageHeader, SearchBar, ConfirmDialog } from '@/components/ui'
import { CustomerPicker } from '@/components/CustomerPicker'
import { InquiryDetailView } from './InquiryDetailView'
import { INQUIRY_STATUSES, INQUIRY_CLASSIFICATIONS } from './queries'
import { assignInquiry, createInquiry, updateInquiry, deleteInquiry, sendInquiryInventoryEmails, getInquiryDetail, getNextInquiryNumber, type InquiryCarInput, type InquiryFormInput } from './actions'
import { isValidYear } from '@/lib/validation'
import { isFollowupStatus, isVisitedSubStatus, validateInquiryFormInput } from '@/lib/inquiryFollowupValidation'
import { formatInquiryInventoryWorkflowLabel } from './workflow'
import type { InquirySourceOption } from './sourceMaster'

interface CustomerOption { custId: number; custName: string; custMobile: string | null; custEmail: string | null }
interface CarMakeMaster { pkMakeId: number; make: string | null }
interface CarModelMaster { pkModelId: number; model: string | null }
interface CarVariantMaster { pkVariantId: number; variant: string | null }
interface UserOption {
  userId: number
  userName: string | null
  displayName: string | null
  employee?: {
    empId: number
    empFirstName: string | null
    empLastName: string | null
    empMobileNo: string | null
    empEmailId: string | null
  } | null
}

interface InquiryRow {
  inquiryId: number
  inquiryNo: string | null
  dateOfInquiry: Date | string | null
  website: string | null
  sourceDetail: string | null
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
  assignedTo?: number | null
  createdDt?: Date | string | null
  updatedDt?: Date | string | null
  assignedToUser?: UserOption | null
  createdByUser?: UserOption | null
  updatedByUser?: UserOption | null
  customer: CustomerOption | null
  inquiryCarDetails: InquiryCarDetailRow[]
  followupInquiry?: FollowupHistoryEntry[]
  inquiryInventoryLinks?: InquiryInventoryLinkRow[]
  vehicleEmailLinks?: VehicleEmailLinkRow[]
}

interface FollowupHistoryEntry {
  pkFollowupId: number
  followupDate: Date | string | null
  followupStatus: string | null
  followupSubStatus: string | null
  followupClassification: string | null
  comments: string | null
  createdDt: Date | string | null
  createdByUser?: UserOption | null
}

interface InquiryCarDetailRow {
  inquiryCarDetailsId?: number | null
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
  matchReasons?: string[]
}

interface InventoryMatch {
  inventoryId: number
  inventoryNumber: string | null
  registrationNo: string | null
  year: number | null
  kmsDriven: string | null
  price: string | null
  status: string | null
  matchReasons?: string[]
  currentState?: string | null
  currentStateAt?: string | null
  customer: CustomerOption | null
  _count: { inventoryPhotos: number }
  carVariantMaster: {
    variant: string | null
    carMakeMaster: { pkMakeId: number; make: string | null } | null
    carModelMaster: { pkModelId: number; model: string | null } | null
  } | null
}

function buildInventoryWorkflowStateMap(
  inquiryInventoryLinks: InquiryInventoryLinkRow[] | undefined,
) {
  const states = new Map<number, { currentState: string | null; currentStateAt: Date | string | null }>()

  for (const link of inquiryInventoryLinks ?? []) {
    const normalizedType = link.linkType.toLowerCase()
    if (!['shortlisted', 'visited', 'booked', 'rejected'].includes(normalizedType)) continue
    if (!states.has(link.inventoryManagement.inventoryId)) {
      states.set(link.inventoryManagement.inventoryId, {
        currentState: normalizedType,
        currentStateAt: link.createdAt,
      })
    }
  }

  return states
}

interface InquiryInventoryLinkRow {
  inquiryInventoryLinkId: number
  linkType: string
  isActive: boolean
  createdAt: Date | string | null
  createdByUser?: UserOption | null
  inventoryManagement: {
    inventoryId: number
    inventoryNumber: string | null
    registrationNo: string | null
    year: number | null
    status: string | null
    price: string | number | null
    carVariantMaster: {
      variant: string | null
      carMakeMaster: { pkMakeId: number; make: string | null } | null
      carModelMaster: { pkModelId: number; model: string | null } | null
    } | null
  }
}

interface VehicleEmailLinkRow {
  vehicleEmailLinkId: number
  recipientEmail: string
  recipientName: string | null
  emailSentAt: Date | string | null
  createdAt?: Date | string | null
  firstRequestedAt: Date | string | null
  firstHumanViewAt: Date | string | null
  lastRequestedAt: Date | string | null
  requestCount: number
  humanViewCount: number
  isActive: boolean
  inventoryManagement: {
    inventoryId: number
    inventoryNumber: string | null
    makeLegacy?: string | null
    modelLegacy?: string | null
    variantLegacy?: string | null
    registrationNo: string | null
    year: number | null
    kmsDriven: string | number | null
    price: string | number | null
    status: string | null
    carVariantMaster: {
      variant: string | null
      carMakeMaster: { pkMakeId?: number; make: string | null } | null
      carModelMaster: { pkModelId?: number; model: string | null } | null
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

function userOptionLabel(user: UserOption | null | undefined) {
  if (!user) return '—'
  const employeeName = `${user.employee?.empFirstName ?? ''} ${user.employee?.empLastName ?? ''}`.trim()
  const userName = user.userName?.trim()
  const name = user.displayName?.trim() || employeeName

  if (userName && name && userName.toLowerCase() !== name.toLowerCase()) {
    return `${userName} · ${name}`
  }

  return userName || name || `User #${user.userId}`
}

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

function summarizeInquiryVehicles(cars: InquiryCarDetailRow[] | undefined | null) {
  if (!cars || cars.length === 0) return '—'
  const labels = cars.map(car => inquiryVehicleLabel(car)).filter(label => label !== '—')
  if (labels.length === 0) return '—'
  if (labels.length === 1) return labels[0]
  return `${labels[0]} +${labels.length - 1} more`
}

function summarizeVehicleEmailEngagement(link: VehicleEmailLinkRow) {
  let callClicks = 0
  let whatsappClicks = 0
  let emailClicks = 0

  for (const interaction of link.interactions) {
    if (interaction.interactionType === 'call_click') callClicks += 1
    if (interaction.interactionType === 'whatsapp_click') whatsappClicks += 1
    if (interaction.interactionType === 'email_click') emailClicks += 1
  }

  return { callClicks, whatsappClicks, emailClicks }
}

function buildVehicleHistoryRows(
  inquiryInventoryLinks: InquiryInventoryLinkRow[] | undefined,
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
      next.emailedAt = link.emailSentAt ?? link.createdAt ?? null
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

function buildInquiryActivityItems(inquiry: InquiryRow) {
  const items: Array<{
    key: string
    at: Date | string | null
    title: string
    detail: string
    tone: 'danger' | 'info' | 'neutral' | 'success'
  }> = []

  if (inquiry.followUpDate && inquiry.status === 'FollowUp') {
    const today = new Date(new Date().toDateString())
    const followUpDate = new Date(inquiry.followUpDate)
    const diffDays = Math.floor((today.getTime() - new Date(followUpDate.toDateString()).getTime()) / (1000 * 60 * 60 * 24))
    const overdue = diffDays > 0
    items.push({
      key: `current-followup-${inquiry.inquiryId}`,
      at: inquiry.followUpDate,
      title: overdue ? 'Follow-up call due' : 'Follow-up scheduled',
      detail: overdue
        ? `Current follow-up is overdue by ${diffDays} day${diffDays === 1 ? '' : 's'}`
        : `Current follow-up is scheduled for ${fmtDate(inquiry.followUpDate)}`,
      tone: overdue ? 'danger' : 'info',
    })
  }

  for (const followup of inquiry.followupInquiry ?? []) {
    items.push({
      key: `followup-${followup.pkFollowupId}`,
      at: followup.createdDt ?? followup.followupDate,
      title: `Status set to ${followup.followupStatus ?? '—'}`,
      detail: [
        followup.followupSubStatus ? `Sub-status: ${followup.followupSubStatus}` : '',
        followup.followupClassification ? `Class: ${followup.followupClassification}` : '',
        followup.comments?.trim() ? followup.comments.trim() : '',
        followup.createdByUser ? `By ${userOptionLabel(followup.createdByUser)}` : '',
      ].filter(Boolean).join(' · ') || 'Follow-up logged',
      tone: followup.followupStatus === 'Closed' ? 'success' : 'info',
    })
  }

  for (const link of inquiry.vehicleEmailLinks ?? []) {
    const vehicle = [
      clean(link.inventoryManagement.carVariantMaster?.carMakeMaster?.make) || clean(link.inventoryManagement.makeLegacy),
      clean(link.inventoryManagement.carVariantMaster?.carModelMaster?.model) || clean(link.inventoryManagement.modelLegacy),
      clean(link.inventoryManagement.carVariantMaster?.variant) || clean(link.inventoryManagement.variantLegacy),
    ].filter(Boolean).join(' ') || (link.inventoryManagement.inventoryNumber ?? `Inventory #${link.inventoryManagement.inventoryId}`)
    const engagement = summarizeVehicleEmailEngagement(link)

    items.push({
      key: `email-${link.vehicleEmailLinkId}`,
      at: link.emailSentAt ?? link.createdAt ?? null,
      title: `Vehicle email sent`,
      detail: [
        vehicle,
        link.recipientEmail,
        link.humanViewCount > 0 || link.requestCount > 0 ? `Opened ${link.humanViewCount}/${link.requestCount}` : '',
        engagement.callClicks || engagement.whatsappClicks || engagement.emailClicks
          ? `Clicks C${engagement.callClicks} W${engagement.whatsappClicks} E${engagement.emailClicks}`
          : '',
      ].filter(Boolean).join(' · '),
      tone: 'success',
    })
  }

  if (inquiry.createdDt) {
    items.push({
      key: `created-${inquiry.inquiryId}`,
      at: inquiry.createdDt,
      title: `Inquiry created from ${inquiry.website ?? 'unknown source'}`,
      detail: [
        inquiry.createdByUser ? userOptionLabel(inquiry.createdByUser) : '',
        inquiry.customer?.custId || inquiry.customerId ? `Linked to customer #${inquiry.customer?.custId ?? inquiry.customerId}` : '',
      ].filter(Boolean).join(' · ') || 'Inquiry created',
      tone: 'neutral',
    })
  }

  return items.sort((a, b) => {
    const aTime = a.at ? new Date(a.at).getTime() : 0
    const bTime = b.at ? new Date(b.at).getTime() : 0
    return bTime - aTime
  })
}

function csvValue(value: string | number | boolean | null | undefined) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function fmtExportDate(d: Date | string | null | undefined) {
  if (!d) return ''
  const value = new Date(d)
  if (Number.isNaN(value.getTime())) return ''
  const day = String(value.getDate()).padStart(2, '0')
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const year = value.getFullYear()
  return `${day}-${month}-${year}`
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
    'Date of Inquiry',
    'Inquiry No',
    'WebSite',
    'Source Detail',
    'Customer',
    'MobileNo',
    'Email',
    'Model',
    'Variant',
    'Sub Variant',
    'Year',
    'Budget of Customer',
    'Visited Date of Customer',
    'Classification',
    'Status',
    'Sub Status',
    'Follow Up Date',
    'Remark',
  ]

  const lines = [headers.map(csvValue).join(',')]
  for (const row of rows) {
    const carRows = row.inquiryCarDetails.length > 0 ? row.inquiryCarDetails : [null]
    for (const car of carRows) {
      const line = [
        fmtExportDate(row.dateOfInquiry),
        row.inquiryNo,
        row.website,
        row.sourceDetail,
        row.customer?.custName ?? row.customerNameLegacy,
        row.mobileno,
        row.email,
        car ? (clean(car.carVariantMaster?.carModelMaster?.model) || clean(car.modelLegacy)) : '',
        car ? (clean(car.carVariantMaster?.variant) || clean(car.variantLegacy)) : '',
        car ? clean(car.subVariant) : '',
        car?.year ?? '',
        row.budgetOfCustomer,
        fmtExportDate(row.visitedDateOfCustomer),
        row.classification,
        row.status,
        row.subStatus,
        fmtExportDate(row.followUpDate),
        row.remark,
      ]
      lines.push(line.map(csvValue).join(','))
    }
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = buildInquiryExportFileName(rows, search, status, classification)
  link.click()
  URL.revokeObjectURL(url)
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

function emptyForm(): InquiryFormInput {
  return {
    inquiryNo: '', dateOfInquiry: new Date().toISOString().slice(0, 10), website: '', sourceCode: '', sourceDetail: '',
    customerId: null, customerNameLegacy: '', mobileno: '', email: '',
    budgetOfCustomer: null, visitedDateOfCustomer: '',
    classification: 'Warm', status: 'Open', subStatus: '',
    followUpDate: '', remark: '', inquiryCars: [],
  }
}

export function InquiryClient({
  initialData, makes, sourceOptions, subStatusSuggestions, inquiryAssistants, total, page, pageCount, search, status, classification, source, subStatus, followUpDate, visitedDate, makeId, modelId, variantId, autoOpenViewId, autoOpenEditId,
}: {
  initialData: InquiryRow[]
  makes: CarMakeMaster[]
  sourceOptions: InquirySourceOption[]
  subStatusSuggestions: string[]
  inquiryAssistants: UserOption[]
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
  const [saveFeedback, setSaveFeedback] = useState<{ ok: boolean; message: string } | null>(null)
  const [errors, setErrors] = useState<Record<string, boolean>>({})
  const [isRoutePending, startRouteTransition] = useTransition()
  const [isPending, startTransition] = useTransition()

  const [emailingId, setEmailingId] = useState<number | null>(null)
  const [emailFeedback, setEmailFeedback] = useState<{ ok: boolean; message: string } | null>(null)
  const [isEmailPending, startEmailTransition] = useTransition()
  const [viewInquiryId, setViewInquiryId] = useState<number | null>(null)
  const [viewInquiry, setViewInquiry] = useState<InquiryRow | null>(null)
  const [viewTab, setViewTab] = useState<'overview' | 'requirement' | 'activity' | 'record'>('overview')
  const [viewLoading, setViewLoading] = useState(false)
  const [viewError, setViewError] = useState('')
  const [assignInquiryRow, setAssignInquiryRow] = useState<InquiryRow | null>(null)
  const [assignUserId, setAssignUserId] = useState('')
  const [assignError, setAssignError] = useState('')
  const [isAssignPending, startAssignTransition] = useTransition()
  const [editLoading, setEditLoading] = useState(false)
  const [emailInquiryRow, setEmailInquiryRow] = useState<InquiryRow | null>(null)
  const [emailInventoryMatches, setEmailInventoryMatches] = useState<InventoryMatch[]>([])
  const [emailHistoryByInventoryId, setEmailHistoryByInventoryId] = useState<Record<number, { emailed: boolean; emailedAt: string | null }>>({})
  const [emailInventoryLoading, setEmailInventoryLoading] = useState(false)
  const [selectedEmailInventoryIds, setSelectedEmailInventoryIds] = useState<number[]>([])
  const [emailInventorySearch, setEmailInventorySearch] = useState('')
  const [emailModalError, setEmailModalError] = useState('')
  const emailInventoryRequestRef = useRef(0)

  const loadInventoryMatches = async (cars: Array<{
    fkVariantId?: number | null
    selectedMakeId?: number | null
    selectedModelId?: number | null
    carYear?: number | null
    carVariantMaster?: {
      carMakeMaster: { pkMakeId: number; make: string | null } | null
      carModelMaster: { pkModelId: number; model: string | null } | null
    } | null
  }>) => {
    const requests = cars
      .map(car => {
        const variantId = car.fkVariantId ?? null
        const makeId = car.selectedMakeId ?? car.carVariantMaster?.carMakeMaster?.pkMakeId ?? null
        const modelId = car.selectedModelId ?? car.carVariantMaster?.carModelMaster?.pkModelId ?? null
        const year = car.carYear ?? null

        if (!variantId && !modelId && !makeId) return null

        const params = new URLSearchParams()
        if (makeId) params.set('makeId', String(makeId))
        if (modelId) params.set('modelId', String(modelId))
        if (variantId) params.set('variantId', String(variantId))
        if (year) params.set('year', String(year))
        return params
      })
      .filter((params): params is URLSearchParams => params !== null)

    if (requests.length === 0) return []

    const results = await Promise.all(requests.map(async params => {
      const res = await fetch(`/api/inquiry/inventory-match?${params.toString()}`)
      const payload = await res.json().catch(() => null)
      if (!res.ok || !Array.isArray(payload)) {
        throw new Error(payload?.error ?? 'Could not load matching inventory.')
      }
      return payload as InventoryMatch[]
    }))

    const deduped = new Map<number, InventoryMatch>()
    for (const group of results) {
      for (const match of group) {
        const previous = deduped.get(match.inventoryId)
        deduped.set(match.inventoryId, {
          ...match,
          matchReasons: [...new Set([...(previous?.matchReasons ?? []), ...(match.matchReasons ?? [])])],
        })
      }
    }
    return [...deduped.values()]
  }

  const loadInventoryMatchesForInquiry = async (row: InquiryRow) => {
    return loadInventoryMatches(row.inquiryCarDetails.map(car => ({
      fkVariantId: car.fkVariantId,
      carYear: car.year,
      carVariantMaster: car.carVariantMaster,
    })))
  }

  const openEmailModal = (row: InquiryRow) => {
    const requestId = ++emailInventoryRequestRef.current
    setEmailFeedback(null)
    setEmailModalError('')
    setSelectedEmailInventoryIds([])
    setEmailInventorySearch('')
    setEmailInventoryMatches([])
    setEmailHistoryByInventoryId({})
    setEmailInquiryRow(row)
    setEmailInventoryLoading(true)

    Promise.all([
      loadInventoryMatchesForInquiry(row),
      getInquiryDetail(row.inquiryId),
    ])
      .then(([matches, detail]) => {
        if (emailInventoryRequestRef.current !== requestId) return
        const workflowStateByInventoryId = buildInventoryWorkflowStateMap(detail?.inquiryInventoryLinks)
        setEmailInventoryMatches(matches.map(match => {
          const state = workflowStateByInventoryId.get(match.inventoryId)
          return {
            ...match,
            currentState: state?.currentState ?? null,
            currentStateAt: state?.currentStateAt ? fmtDateTime(state.currentStateAt) : null,
          }
        }))
        const history: Record<number, { emailed: boolean; emailedAt: string | null }> = {}
        for (const link of detail?.vehicleEmailLinks ?? []) {
          const inventoryId = link.inventoryManagement.inventoryId
          const current = history[inventoryId]
          const sentAt = fmtDateTime(link.emailSentAt ?? link.createdAt ?? null) || null
          if (!current || (!current.emailedAt && sentAt)) {
            history[inventoryId] = { emailed: true, emailedAt: sentAt }
          }
        }
        setEmailHistoryByInventoryId(history)
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
    if (!emailInquiryRow || selectedEmailInventoryIds.length === 0) return
    setEmailingId(emailInquiryRow.inquiryId)
    setEmailFeedback(null)
    setEmailModalError('')
    startEmailTransition(async () => {
      const result = await sendInquiryInventoryEmails(emailInquiryRow.inquiryId, selectedEmailInventoryIds)
      setEmailFeedback(result.success
        ? { ok: true, message: result.message ?? 'Email sent successfully.' }
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

  const toggleEmailInventorySelection = (inventoryId: number) => {
    setSelectedEmailInventoryIds(prev => (
      prev.includes(inventoryId)
        ? prev.filter(id => id !== inventoryId)
        : [...prev, inventoryId]
    ))
  }

  const openView = (row: { inquiryId: number }) => {
    const requestId = ++viewRequestRef.current
    setViewInquiryId(row.inquiryId)
    setViewInquiry(null)
    setViewTab('overview')
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
    setViewTab('overview')
    setViewError('')
    setViewLoading(false)
    if (searchParams.has('view')) {
      const next = new URLSearchParams(searchParams.toString())
      next.delete('view')
      router.replace(`/inquiry${next.toString() ? `?${next.toString()}` : ''}`)
    }
  }

  const [filterModels, setFilterModels] = useState<CarModelMaster[]>([])
  const [filterVariants, setFilterVariants] = useState<CarVariantMaster[]>([])
  const [carEditor, setCarEditor] = useState<InquiryCarInput>(emptyInquiryCar())
  const [carEditorModels, setCarEditorModels] = useState<CarModelMaster[]>([])
  const [carEditorVariants, setCarEditorVariants] = useState<CarVariantMaster[]>([])
  const [editingCarIndex, setEditingCarIndex] = useState<number | null>(null)
  const [carEditorError, setCarEditorError] = useState('')
  const [modelNameCache, setModelNameCache] = useState<Record<number, string>>({})
  const [variantNameCache, setVariantNameCache] = useState<Record<number, string>>({})
  const [previousInquiries, setPreviousInquiries] = useState<PreviousInquiryMatch[]>([])
  const [previousInquiryLoading, setPreviousInquiryLoading] = useState(false)
  const [previousInquiryError, setPreviousInquiryError] = useState('')
  const [inventoryMatches, setInventoryMatches] = useState<InventoryMatch[]>([])
  const [inventoryMatchLoading, setInventoryMatchLoading] = useState(false)
  const [inventoryMatchError, setInventoryMatchError] = useState('')
  const [exportError, setExportError] = useState('')
  const [isExporting, startExportTransition] = useTransition()
  const followUpSelected = isFollowupStatus(form.status)
  const visitedSelected = isVisitedSubStatus(form.subStatus)
  const isMissingFollowUpDate = followUpSelected && !form.followUpDate.trim()
  const isMissingVisitedDate = visitedSelected && !form.visitedDateOfCustomer.trim()
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

  const resetCarEditor = () => {
    setCarEditor(emptyInquiryCar())
    setCarEditorModels([])
    setCarEditorVariants([])
    setEditingCarIndex(null)
    setCarEditorError('')
  }

  const openAssign = (row: InquiryRow) => {
    setAssignInquiryRow(row)
    setAssignUserId(row.assignedTo ? String(row.assignedTo) : '')
    setAssignError('')
    setSaveFeedback(null)
  }

  const forceCloseAssign = () => {
    setAssignInquiryRow(null)
    setAssignUserId('')
    setAssignError('')
  }

  const closeAssign = () => {
    if (isAssignPending) return
    forceCloseAssign()
  }

  const loadModelsForMake = async (selectedMakeId: number) => {
    if (!selectedMakeId) {
      setCarEditorModels([])
      return []
    }
    const response = await fetch(`/api/catalog/models?makeId=${selectedMakeId}`)
    const payload = await response.json().catch(() => [])
    const models = Array.isArray(payload) ? payload as CarModelMaster[] : []
    setCarEditorModels(models)
    setModelNameCache(prev => ({
      ...prev,
      ...Object.fromEntries(models.map(model => [model.pkModelId, model.model ?? '—'])),
    }))
    return models
  }

  const loadVariantsForModel = async (selectedModelId: number) => {
    if (!selectedModelId) {
      setCarEditorVariants([])
      return []
    }
    const response = await fetch(`/api/catalog/variants?modelId=${selectedModelId}`)
    const payload = await response.json().catch(() => [])
    const variants = Array.isArray(payload) ? payload as CarVariantMaster[] : []
    setCarEditorVariants(variants)
    setVariantNameCache(prev => ({
      ...prev,
      ...Object.fromEntries(variants.map(variant => [variant.pkVariantId, variant.variant ?? '—'])),
    }))
    return variants
  }

  const onCarEditorMakeChange = async (makeId: number) => {
    setCarEditor(prev => ({
      ...prev,
      selectedMakeId: makeId || null,
      selectedModelId: null,
      fkVariantId: null,
    }))
    setCarEditorVariants([])
    setCarEditorError('')
    await loadModelsForMake(makeId)
  }

  const onCarEditorModelChange = async (modelId: number) => {
    setCarEditor(prev => ({
      ...prev,
      selectedModelId: modelId || null,
      fkVariantId: null,
    }))
    setCarEditorError('')
    await loadVariantsForModel(modelId)
  }

  const editInquiryCar = async (rowIndex: number) => {
    const row = form.inquiryCars[rowIndex]
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

    setForm(prev => {
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
    setForm(prev => ({
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
    if (nextIndex < 0 || nextIndex >= form.inquiryCars.length) return

    setForm(prev => {
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
    if (modal && visitedSelected && !form.visitedDateOfCustomer) {
      f('visitedDateOfCustomer', new Date().toISOString().slice(0, 10))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal, visitedSelected])

  useEffect(() => {
    if (!modal) {
      setPreviousInquiries([])
      setPreviousInquiryError('')
      setPreviousInquiryLoading(false)
      return
    }

    const mobile = form.mobileno.trim()
    const customerId = form.customerId
    if (previousInquiryDebounceRef.current) clearTimeout(previousInquiryDebounceRef.current)

    if (!mobile && !customerId) {
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
        const params = new URLSearchParams()
        if (mobile) params.set('mobile', mobile)
        if (customerId) params.set('customerId', String(customerId))
        const variantIds = form.inquiryCars.map(car => car.fkVariantId).filter((id): id is number => Boolean(id))
        if (variantIds.length) params.set('variantIds', variantIds.join(','))
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
  }, [editId, form.customerId, form.mobileno, modal])

  useEffect(() => {
    if (!modal) {
      setInventoryMatches([])
      setInventoryMatchError('')
      setInventoryMatchLoading(false)
      return
    }

    if (inventoryMatchDebounceRef.current) clearTimeout(inventoryMatchDebounceRef.current)

    if (!form.inquiryCars.some(car => car.selectedMakeId || car.selectedModelId || car.fkVariantId)) {
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
        const matches = await loadInventoryMatches(form.inquiryCars)
        if (inventoryMatchRequestRef.current !== requestId) return
        setInventoryMatches(matches)
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
  }, [form.inquiryCars, modal])

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
    setErrors({})
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
    setSaveFeedback(null)
    resetCarEditor()
    setModelNameCache({})
    setVariantNameCache({})
    setDiscardOpen(false)
    setError('')
    setModal('add')

    getNextInquiryNumber()
      .then(inquiryNo => {
        setForm(current => ({ ...current, inquiryNo }))
        setSavedFormSnapshot(currentSnapshot => {
          const parsed = JSON.parse(currentSnapshot) as InquiryFormInput
          return JSON.stringify({ ...parsed, inquiryNo })
        })
      })
      .catch(() => {
        setForm(current => ({ ...current, inquiryNo: 'Inquiry/1' }))
        setSavedFormSnapshot(currentSnapshot => {
          const parsed = JSON.parse(currentSnapshot) as InquiryFormInput
          return JSON.stringify({ ...parsed, inquiryNo: 'Inquiry/1' })
        })
      })
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
    setSaveFeedback(null)
    setDiscardOpen(false)
    setError('')
    setErrors({})
    try {
      const detail = await getInquiryDetail(r.inquiryId)
      if (editRequestRef.current !== requestId) return
      if (!detail) {
        setError('Inquiry not found.')
        forceCloseInquiryModal()
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
      const nextForm = {
        inquiryNo: detail.inquiryNo ?? '',
        dateOfInquiry: fmtDate(detail.dateOfInquiry),
        website: detail.website ?? '',
        sourceCode: detail.source?.code ?? '',
        sourceDetail: detail.sourceDetail ?? '',
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
      }
      setForm(nextForm)
      setSavedFormSnapshot(JSON.stringify(nextForm))
      setSelectedCustomer(detail.customer)
      setSavedCustomerSnapshot(customerSnapshot(detail.customer))
      resetCarEditor()
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
    } catch {
      if (editRequestRef.current !== requestId) return
      setError('Could not load inquiry details.')
      forceCloseInquiryModal()
    } finally {
      if (editRequestRef.current === requestId) setEditLoading(false)
    }
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
    const validation = validateInquiryFormInput(form)
    if (validation.error) {
      setError(validation.error)
      setErrors(validation.fieldErrors)
      return
    }
    setErrors({})
    startTransition(async () => {
      const result = editId
        ? await updateInquiry(editId, form)
        : await createInquiry(form)
      if (!result.success) {
        setError(result.error ?? 'Something went wrong.')
        setSaveFeedback(null)
        return
      }
      setSaveFeedback(result.message ? { ok: true, message: result.message } : null)
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
      setSaveFeedback(result.success
        ? { ok: true, message: result.message ?? 'Inquiry deleted successfully.' }
        : { ok: false, message: result.error ?? 'Could not delete this record.' })
      setDeleteId(null)
      if (result.success) router.refresh()
    })
  }

  const saveAssignment = () => {
    if (!assignInquiryRow) return
    setAssignError('')
    startAssignTransition(async () => {
      const result = await assignInquiry({
        inquiryId: assignInquiryRow.inquiryId,
        assignedToUserId: assignUserId ? Number(assignUserId) : null,
      })
      if (!result.success) {
        setAssignError(result.error ?? 'Could not update inquiry assignment.')
        return
      }
      setSaveFeedback({ ok: true, message: result.message ?? 'Inquiry assignment updated.' })
      forceCloseAssign()
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
            <SearchBar value={searchInput} onChange={setSearchInput} placeholder="Name, mobile, email, source, vehicle..." disabled={isRoutePending} />
          </div>
          <Select label="Source" value={source} onChange={e => pushQuery({ source: e.target.value })} disabled={isRoutePending}>
          <option value="All">All Sources</option>
          {sourceOptions.map(item => <option key={item.code} value={item.code}>{item.displayName}</option>)}
          </Select>
          <Select label="Sub-status" value={subStatus} onChange={e => pushQuery({ subStatus: e.target.value })} disabled={isRoutePending}>
          <option value="All">All Sub-statuses</option>
          {subStatusSuggestions.map(item => <option key={item} value={item}>{item}</option>)}
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

      {saveFeedback && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm border ${saveFeedback.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {saveFeedback.message}
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
          <Table headers={['Sr. No', 'Inquiry_Date / Website', 'Customer Details', 'Car Details', 'Budget / Classification', 'Visited Date', 'Status / Sub Status', 'FollowUp Date', 'Remark', 'Actions']} empty={initialData.length === 0} emptyMessage={emptyInquiryMessage}>
            {initialData.map((r, index) => {
              const name = r.customer?.custName ?? r.customerNameLegacy ?? '—'
              const mobile = r.customer?.custMobile ?? r.mobileno ?? '—'
              const email = r.customer?.custEmail ?? r.email ?? ''
              const vehicleLines = r.inquiryCarDetails.length > 0
                ? r.inquiryCarDetails.map(car => ({
                    make: clean(car.carVariantMaster?.carMakeMaster?.make) || clean(car.makeLegacy) || 'na',
                    model: clean(car.carVariantMaster?.carModelMaster?.model) || clean(car.modelLegacy) || 'na',
                    variant: clean(car.carVariantMaster?.variant) || clean(car.variantLegacy) || 'na',
                    year: car.year ?? 0,
                  }))
                : [{ make: 'na', model: 'na', variant: 'na', year: 0 }]
              return (
                <tr key={r.inquiryId} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{rowNumberStart + index + 1}</td>
                  <td className="px-4 py-3">
                    <div className="space-y-1 text-sm text-gray-700">
                      <div>Inquiry Date: {fmtDate(r.dateOfInquiry) || '—'}</div>
                      <div>Ref.: {r.website ?? '—'}{r.sourceDetail ? ` (${r.sourceDetail})` : ''}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1 text-sm text-gray-700">
                      <div>Name: {name}</div>
                      <div>Mob: {mobile}</div>
                      <div>Email: {email || '—'}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-2 text-sm text-gray-700">
                      {vehicleLines.map((car, carIndex) => (
                        <div key={`${r.inquiryId}-car-${carIndex}`}>
                          <div>Make: {car.make}</div>
                          <div>Model: {car.model}</div>
                          <div>Variant: {car.variant}</div>
                          <div>Year: {car.year}</div>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1 text-sm text-gray-700">
                      <div>Budget: {fmtMoney(r.budgetOfCustomer)}</div>
                      <div>Class: {r.classification ?? '—'}</div>
                      <div>Assigned To: {userOptionLabel(r.assignedToUser)}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{fmtDate(r.visitedDateOfCustomer) || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="space-y-1 text-sm text-gray-700">
                      <div>Status: {r.status ?? '—'}</div>
                      <div>Sub_Status: {r.subStatus ?? '—'}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{fmtDate(r.followUpDate) || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[260px] whitespace-normal break-words">{r.remark?.trim() ? r.remark : '—'}</td>
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
                      <button onClick={() => openAssign(r)} className="p-1.5 text-gray-400 hover:text-[#1B2A6B] hover:bg-blue-50 rounded transition" title="Assign Inquiry">
                        <UserPlus className="w-3.5 h-3.5" />
                      </button>
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

      <Modal title={`View Inquiry${viewInquiry ? ` — ${viewInquiry.inquiryNo ?? `Inquiry #${viewInquiry.inquiryId}`}` : viewInquiryId ? ` — Inquiry #${viewInquiryId}` : ''}`} open={viewInquiryId !== null} width="max-w-6xl" onClose={closeView}>
        <div className="space-y-4">
          {viewLoading ? (
            <div className="flex min-h-32 flex-col items-center justify-center gap-3 text-sm text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <div>Loading inquiry details...</div>
            </div>
          ) : viewError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{viewError}</div>
          ) : viewInquiry ? (
            <InquiryDetailView
              inquiry={viewInquiry}
              onClose={closeView}
              onEdit={() => { closeView(); openEdit(viewInquiry) }}
              onLogFollowup={() => { closeView(); openEdit(viewInquiry) }}
              onOpenMatch={() => openEmailModal(viewInquiry)}
            />
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
          <div className="grid grid-cols-3 gap-4">
            <Input label="Inquiry No*" value={form.inquiryNo} readOnly disabled placeholder="Generating..." />
            <Input label="Date of Inquiry*" type="date" value={form.dateOfInquiry} onChange={e => f('dateOfInquiry', e.target.value)} error={errors.dateOfInquiry} />
            <Select
              label="Reference Website / Source*"
              value={form.sourceCode}
              onChange={e => {
                const selected = sourceOptions.find(source => source.code === e.target.value)
                setForm(previous => ({
                  ...previous,
                  sourceCode: e.target.value,
                  website: selected?.displayName ?? '',
                  sourceDetail: selected?.requiresDetail ? previous.sourceDetail : '',
                }))
              }}
              error={errors.website}
            >
              <option value="">Select source</option>
              {sourceOptions.map(source => <option key={source.code} value={source.code}>{source.displayName}</option>)}
            </Select>
          </div>

          {sourceOptions.find(source => source.code === form.sourceCode)?.requiresDetail ? (
            <Input
              label={form.sourceCode === 'REFERENCE' ? 'Reference Details*' : 'Other Source Details*'}
              value={form.sourceDetail}
              onChange={e => f('sourceDetail', e.target.value)}
              placeholder={form.sourceCode === 'REFERENCE' ? 'Customer, dealer, or referral person' : 'Describe the source'}
            />
          ) : null}

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Link Existing Customer</label>
            <CustomerPicker value={selectedCustomer} onChange={onCustomerChange} error={errors.customer} />
          </div>

          {selectedCustomer ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              This inquiry is linked to a customer record. Name, mobile, and email above are locked to that customer so the inquiry does not drift from the master customer data.
            </div>
          ) : null}

          <div className="grid grid-cols-3 gap-4">
            <Input label="Customer Name*#" value={form.customerNameLegacy} onChange={e => f('customerNameLegacy', e.target.value)} disabled={!!selectedCustomer} error={errors.customer} />
            <Input label="Customer Mobile No*#" value={form.mobileno} onChange={e => f('mobileno', e.target.value)} disabled={!!selectedCustomer} error={errors.mobileno} />
            <Input label="Customer Email" type="email" value={form.email} onChange={e => f('email', e.target.value)} disabled={!!selectedCustomer} error={errors.email} />
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-gray-900">Car Details</div>
                <div className="text-xs text-gray-500">Add one or more vehicle interests for the same inquiry, similar to the legacy screen.</div>
              </div>
              {editingCarIndex !== null ? (
                <Btn variant="outline" size="sm" onClick={resetCarEditor}>Cancel Edit</Btn>
              ) : null}
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
                <Btn onClick={saveInquiryCarRow} className="w-full">
                  {editingCarIndex !== null ? 'Update' : 'Add'}
                </Btn>
              </div>
            </div>

            {carEditorError ? (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{carEditorError}</div>
            ) : null}

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
                  {form.inquiryCars.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-sm text-gray-500">
                        No vehicle rows added yet.
                      </td>
                    </tr>
                  ) : form.inquiryCars.map((car, index) => {
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
                            <button type="button" onClick={() => moveInquiryCar(index, -1)} disabled={index === 0}
                              className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">
                              Up
                            </button>
                            <button type="button" onClick={() => moveInquiryCar(index, 1)} disabled={index === form.inquiryCars.length - 1}
                              className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">
                              Down
                            </button>
                            <button type="button" onClick={() => editInquiryCar(index)}
                              className="rounded border border-blue-200 px-2 py-1 text-xs text-blue-700 transition hover:bg-blue-50">
                              Edit
                            </button>
                            <button type="button" onClick={() => removeInquiryCar(index)}
                              className="rounded border border-red-200 px-2 py-1 text-xs text-red-700 transition hover:bg-red-50">
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Budget of customer" type="number" value={form.budgetOfCustomer ?? ''} onChange={e => f('budgetOfCustomer', e.target.value ? +e.target.value : null)} error={errors.budgetOfCustomer} />
            <Select label="Classification*" value={form.classification} onChange={e => f('classification', e.target.value)}>
              {INQUIRY_CLASSIFICATIONS.map(c => <option key={c}>{c}</option>)}
            </Select>
            <Input label="Visited Date of customer" type="date" value={form.visitedDateOfCustomer} onChange={e => f('visitedDateOfCustomer', e.target.value)} error={errors.visitedDateOfCustomer} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select label="Status*#" value={form.status} onChange={e => {
              const nextStatus = e.target.value
              f('status', nextStatus)
              if (!isFollowupStatus(nextStatus)) {
                f('followUpDate', '')
              }
            }}>
              {INQUIRY_STATUSES.map(s => <option key={s}>{s}</option>)}
            </Select>
            <div>
              <Input label="Sub Status" list="sub-status-suggestions" value={form.subStatus} onChange={e => f('subStatus', e.target.value)} />
              <datalist id="sub-status-suggestions">
                {subStatusSuggestions.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
            <Input
              label={followUpSelected ? 'FollowUp Date*' : 'FollowUp Date'}
              type="date"
              value={form.followUpDate}
              onChange={e => f('followUpDate', e.target.value)}
              error={errors.followUpDate}
              disabled={!followUpSelected}
            />
            <Textarea label="Remark" value={form.remark} onChange={e => f('remark', e.target.value)} placeholder="Notes about this inquiry..." />
          </div>

          {(isMissingFollowUpDate || isMissingVisitedDate) ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {isMissingFollowUpDate ? <div>Follow status needs a follow-up date.</div> : null}
              {isMissingVisitedDate ? <div>Visited sub-status needs a visited date.</div> : null}
            </div>
          ) : null}

          {previousInquiryError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{previousInquiryError}</div>
          ) : null}

          {previousInquiryLoading ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Checking previous inquiries for this mobile number or linked customer...</div>
          ) : null}

          {!previousInquiryLoading && previousInquiries.length > 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4">
              <div className="text-sm font-semibold text-amber-900">Possible duplicate or overlapping inquiries found</div>
              <div className="mt-1 text-xs text-amber-800">Please review before saving. This is only a warning — you can still continue if this is a genuine new inquiry.</div>
              <div className="mt-3 space-y-3">
                {previousInquiries.map(match => {
                  const matchName = match.customer?.custName ?? match.customerNameLegacy ?? '—'
                  const matchVehicle = summarizeInquiryVehicles(match.inquiryCarDetails)

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
                      {match.matchReasons && match.matchReasons.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {match.matchReasons.map(reason => (
                            <span key={`${match.inquiryId}-${reason}`} className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                              {reason}
                            </span>
                          ))}
                          <a
                            href={`/inquiry?view=${match.inquiryId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-amber-300 bg-white px-2 py-0.5 text-[11px] font-medium text-amber-800 transition hover:bg-amber-50"
                          >
                            View
                          </a>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}

          {inventoryMatchError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{inventoryMatchError}</div>
          ) : null}

          {form.inquiryCars.some(car => car.selectedMakeId || car.selectedModelId || car.fkVariantId) ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-4">
              <div className="text-sm font-semibold text-blue-900">Matching Inventory</div>
              <div className="mt-1 text-xs text-blue-800">Based on all selected vehicle rows, here is matching stock currently in the system.</div>
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
                          <div className="md:col-span-2"><span className="font-medium text-gray-900">Matched Because:</span> {match.matchReasons?.join(' · ') || 'In stock match'}</div>
                          <div><span className="font-medium text-gray-900">Current State:</span> {match.currentState ? formatInquiryInventoryWorkflowLabel(match.currentState) : 'Not marked'}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : null}

          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="flex gap-3 justify-end pt-2">
            <Btn variant="outline" onClick={requestCloseInquiryModal}>Cancel</Btn>
            {editId ? (
              <Btn onClick={save} disabled={isPending}>{isPending ? 'Saving...' : 'Save Inquiry'}</Btn>
            ) : (
              <Btn onClick={save} disabled={isPending}>{isPending ? 'Saving...' : 'Save Inquiry'}</Btn>
            )}
          </div>
        </div>
        )}
      </Modal>

      <Modal title={assignInquiryRow ? `Assign Inquiry — ${assignInquiryRow.inquiryNo ?? `Inquiry #${assignInquiryRow.inquiryId}`}` : 'Assign Inquiry'} open={!!assignInquiryRow} onClose={closeAssign}>
        {assignInquiryRow ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
              <div><span className="font-medium text-gray-900">Customer:</span> {assignInquiryRow.customer?.custName ?? assignInquiryRow.customerNameLegacy ?? '—'}</div>
              <div><span className="font-medium text-gray-900">Current Assignee:</span> {userOptionLabel(assignInquiryRow.assignedToUser)}</div>
            </div>

            <Select label="Assign To" value={assignUserId} onChange={e => setAssignUserId(e.target.value)} disabled={isAssignPending}>
              <option value="">Unassigned</option>
              {inquiryAssistants.map(user => (
                <option key={user.userId} value={user.userId}>
                  {userOptionLabel(user)}
                </option>
              ))}
            </Select>

            {inquiryAssistants.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                No active InquiryAssistant users are available for assignment.
              </div>
            ) : null}

            {assignError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{assignError}</div>
            ) : null}

            <div className="flex justify-end gap-3">
              <Btn variant="outline" onClick={closeAssign} disabled={isAssignPending}>Cancel</Btn>
              <Btn onClick={saveAssignment} disabled={isAssignPending}>
                {isAssignPending ? 'Saving...' : 'Save Assignment'}
              </Btn>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal title={`Send Matching Inventory${emailInquiryRow ? ` — ${emailInquiryRow.inquiryNo ?? `Inquiry #${emailInquiryRow.inquiryId}`}` : ''}`} open={!!emailInquiryRow} width="max-w-6xl" onClose={() => {
        if (isEmailPending) return
        emailInventoryRequestRef.current += 1
        setEmailInquiryRow(null)
        setEmailInventoryMatches([])
        setEmailHistoryByInventoryId({})
        setSelectedEmailInventoryIds([])
        setEmailInventorySearch('')
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
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-gray-800">Choose which vehicles to send</div>
                  <div className="min-w-56">
                    <SearchBar value={emailInventorySearch} onChange={setEmailInventorySearch} placeholder="Search inventory, reg, make..." />
                  </div>
                </div>
                {(() => {
                  const filteredMatches = emailInventoryMatches.filter(match => {
                    const vehicle = [
                      clean(match.carVariantMaster?.carMakeMaster?.make),
                      clean(match.carVariantMaster?.carModelMaster?.model),
                      clean(match.carVariantMaster?.variant),
                    ].filter(Boolean).join(' ')
                    const haystack = [
                      match.inventoryNumber ?? '',
                      match.registrationNo ?? '',
                      vehicle,
                      match.status ?? '',
                    ].join(' ').toLowerCase()
                    return !emailInventorySearch.trim() || haystack.includes(emailInventorySearch.trim().toLowerCase())
                  })

                  if (emailInventoryMatches.length > 0 && filteredMatches.length === 0) {
                    return (
                      <div className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
                        No vehicles match the current popup search.
                      </div>
                    )
                  }

                  return (
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                      <table className="min-w-full text-sm">
                        <thead className="bg-[#1B2A6B] text-left text-xs font-semibold uppercase tracking-wide text-white">
                          <tr>
                            <th className="px-3 py-3 w-12">Select</th>
                            <th className="px-3 py-3">Make / Model</th>
                            <th className="px-3 py-3">Variant / Color</th>
                            <th className="px-3 py-3">Year</th>
                            <th className="px-3 py-3">Registration No</th>
                            <th className="px-3 py-3">Match Reason</th>
                            <th className="px-3 py-3">Kms Driven</th>
                            <th className="px-3 py-3">Price / Status</th>
                            <th className="px-3 py-3">Current State</th>
                            <th className="px-3 py-3">Email</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredMatches.map(match => {
                            const make = clean(match.carVariantMaster?.carMakeMaster?.make) || '—'
                            const model = clean(match.carVariantMaster?.carModelMaster?.model) || '—'
                            const variant = clean(match.carVariantMaster?.variant) || '—'
                            const isSelected = selectedEmailInventoryIds.includes(match.inventoryId)
                            const emailHistory = emailHistoryByInventoryId[match.inventoryId]

                            return (
                              <tr
                                key={match.inventoryId}
                                onClick={() => toggleEmailInventorySelection(match.inventoryId)}
                                className={`cursor-pointer border-t border-gray-200 align-top transition ${isSelected ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'}`}
                              >
                                <td className="px-3 py-3">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleEmailInventorySelection(match.inventoryId)}
                                    onClick={event => event.stopPropagation()}
                                    className="h-4 w-4 rounded border-gray-300 text-[#1B2A6B] focus:ring-[#1B2A6B]"
                                  />
                                </td>
                                <td className="px-3 py-3 text-gray-700">
                                  <div className="font-medium text-gray-900">{make}</div>
                                  <div>{model}</div>
                                  <div className="text-xs text-gray-500">{match.inventoryNumber ?? `#${match.inventoryId}`}</div>
                                </td>
                                <td className="px-3 py-3 text-gray-700">
                                  <div className="font-medium text-gray-900">{variant}</div>
                                  <div>{'—'}</div>
                                </td>
                                <td className="px-3 py-3 text-gray-700">{match.year ?? '—'}</td>
                                <td className="px-3 py-3 text-gray-700">{match.registrationNo ?? '—'}</td>
                                <td className="px-3 py-3 text-gray-700">
                                  <div className="max-w-44 text-xs leading-5">{match.matchReasons?.join(' · ') || 'In stock match'}</div>
                                </td>
                                <td className="px-3 py-3 text-gray-700">{match.kmsDriven ? Number(match.kmsDriven).toLocaleString('en-IN') : '—'}</td>
                                <td className="px-3 py-3 text-gray-700">
                                  <div>{fmtMoney(match.price)}</div>
                                  <div className="text-xs text-gray-500">{match.status ?? '—'}</div>
                                </td>
                                <td className="px-3 py-3 text-gray-700">
                                  <div className="font-medium text-gray-900">{match.currentState ? formatInquiryInventoryWorkflowLabel(match.currentState) : 'Not marked'}</div>
                                  <div className="text-xs text-gray-500">{match.currentStateAt ?? '—'}</div>
                                </td>
                                <td className="px-3 py-3 text-gray-700">
                                  <div className="font-medium text-gray-900">{emailHistory?.emailed ? 'Yes' : 'No'}</div>
                                  <div className="text-xs text-gray-500">{emailHistory?.emailedAt ?? '—'}</div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
                })()}
                {false && emailInventoryMatches.length > 0 && emailInventoryMatches.filter(match => {
                  const vehicle = [
                    clean(match.carVariantMaster?.carMakeMaster?.make),
                    clean(match.carVariantMaster?.carModelMaster?.model),
                    clean(match.carVariantMaster?.variant),
                  ].filter(Boolean).join(' ')
                  const haystack = [
                    match.inventoryNumber ?? '',
                    match.registrationNo ?? '',
                    vehicle,
                    match.status ?? '',
                  ].join(' ').toLowerCase()
                  return !emailInventorySearch.trim() || haystack.includes(emailInventorySearch.trim().toLowerCase())
                }).length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
                    No vehicles match the current popup search.
                  </div>
                ) : null}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Btn variant="outline" onClick={() => {
                if (isEmailPending) return
                emailInventoryRequestRef.current += 1
                setEmailInquiryRow(null)
                setEmailInventoryMatches([])
                setEmailHistoryByInventoryId({})
                setSelectedEmailInventoryIds([])
                setEmailInventorySearch('')
                setEmailModalError('')
              }}>Cancel</Btn>
              <Btn onClick={handleSendInventoryEmail} disabled={isEmailPending || selectedEmailInventoryIds.length === 0 || emailInventoryLoading}>
                {isEmailPending ? 'Sending...' : `Send Email${selectedEmailInventoryIds.length > 0 ? ` (${selectedEmailInventoryIds.length})` : ''}`}
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
