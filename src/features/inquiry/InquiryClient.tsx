'use client'

import { useState, useTransition, useEffect, useRef, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CarFront, Database, Plus, Download, Loader2, ChevronDown, Search } from 'lucide-react'
import { Badge, Btn, Input, Textarea, PageHeader, ConfirmDialog } from '@/components/ui'
import { CustomerPicker } from '@/components/CustomerPicker'
import { InquiryDetailView } from './InquiryDetailView'
import { INQUIRY_STATUSES, INQUIRY_CLASSIFICATIONS, inquiryStatusLabel } from './queries'
import { assignInquiry, createInquiry, updateInquiry, deleteInquiry, sendInquiryInventoryEmails, getInquiryDetail, getNextInquiryNumber, type InquiryCarInput, type InquiryFormInput } from './actions'
import { isValidYear } from '@/lib/validation'
import { isVisitedSubStatus, requiresInquiryFollowupDate, validateInquiryFormInput } from '@/lib/inquiryFollowupValidation'
import { LIST_FILTER_DEBOUNCE_MS } from '@/lib/listFilterTiming'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { formatInquiryInventoryWorkflowLabel } from './workflow'
import type { InquirySourceOption } from './sourceMaster'
import type { InquiryLocationOption } from './locationMaster'
import { InquiryFilters } from './InquiryFilters'
import { InquiryRowActions } from './InquiryRowActions'
import { InquiryTable } from './InquiryTable'
import { InquiryTableRows } from './InquiryTableRows'
import { AssignInquiryModal } from './AssignInquiryModal'
import { InquiryViewModal } from './InquiryViewModal'
import { InquiryFormModal } from './InquiryFormModal'
import { cleanListValue as clean, formatListDate as fmtDate, formatListDateTime as fmtDateTime, formatListMoney as fmtMoney } from '@/lib/listFormatters'
import { buildListQueryString } from '@/lib/listQueryParams'
import { summarizeVehicleEmailEngagement } from '@/lib/vehicleEmailEngagement'
import { EmailVehicleModal } from './EmailVehicleModal'
import { EmailVehicleContent } from './EmailVehicleContent'
import { InquiryCarTable } from './InquiryCarTable'
import { InquiryTableDataCells } from './InquiryTableDataCells'
import { ListPagination } from '@/components/ListPagination'
import { ListLoadingOverlay } from '@/components/ListLoadingOverlay'

interface CustomerOption { custId: number; custName: string; custMobile: string | null; custEmail: string | null }
interface CarMakeMaster { pkMakeId: number; make: string | null }
interface CarModelMaster { pkModelId: number; model: string | null }
interface CarVariantMaster { pkVariantId: number; variant: string | null }
const VEHICLE_YEAR_OPTIONS = Array.from(
  { length: new Date().getFullYear() - 1899 },
  (_, index) => {
    const year = String(new Date().getFullYear() + 1 - index)
    return { value: year, label: year }
  },
)
const OWNER_COUNT_OPTIONS = Array.from({ length: 11 }, (_, value) => ({ value: String(value), label: String(value) }))
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
  locationId: number | null
  location: string | null
  reportingLocation?: { displayName: string; region: string } | null
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
  noOfOwners: number | null
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
  inquiryOwner?: string
  customer: CustomerOption | null
  inquiryCarDetails: InquiryRow['inquiryCarDetails']
  matchReasons?: string[]
}

interface InventoryMatch {
  inventoryId: number
  inventoryNumber: string | null
  registrationNo: string | null
  year: number | null
  month: string | null
  colour: string | null
  fuelType: string | null
  noOfOwners: number | null
  kmsDriven: string | null
  price: string | null
  status: string | null
  insuranceType: string | null
  otherRemarks: string | null
  internalComments: string | null
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

function InventoryMatchPanel({
  hasRequirements,
  loading,
  error,
  matches,
}: {
  hasRequirements: boolean
  loading: boolean
  error: string
  matches: InventoryMatch[]
}) {
  if (!hasRequirements && !error) return null

  return (
    <div className="rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-slate-50 px-4 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-center gap-3 text-sm font-semibold text-blue-900"><Database className="h-5 w-5 text-blue-600" />Matching Inventory</div>
        {!loading && !error ? <div className="text-xs font-medium text-blue-800">{matches.length} {matches.length === 1 ? 'vehicle' : 'vehicles'} found</div> : null}
      </div>
      <div className="mt-1 text-xs text-blue-800">Live matches update as you select the customer’s vehicle and budget requirements.</div>
      {error ? (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : loading ? (
        <div className="mt-3 text-sm text-blue-800">Checking matching inventory...</div>
      ) : matches.length === 0 ? (
        <div className="mt-3 text-sm text-blue-800">No in-stock inventory matches the selected requirements.</div>
      ) : (
        <div className="mt-3 max-h-72 space-y-3 overflow-y-auto pr-1">
          {matches.map(match => {
            const vehicle = [
              clean(match.carVariantMaster?.carMakeMaster?.make),
              clean(match.carVariantMaster?.carModelMaster?.model),
              clean(match.carVariantMaster?.variant),
            ].filter(Boolean).join(' ') || '—'
            return (
              <div key={match.inventoryId} className="rounded-lg border border-blue-100 bg-white px-3 py-3 text-xs text-gray-700 shadow-sm">
                <div className="grid gap-3 md:grid-cols-[9rem_1fr_1fr_1fr]">
                  <div className="flex min-h-28 items-center justify-center rounded-md bg-slate-50 text-[#1B2A6B]"><CarFront className="h-12 w-12" strokeWidth={1.25} /></div>
                  <div className="space-y-1 border-l-0 border-blue-100 md:border-l md:pl-3"><div><span className="font-semibold text-gray-900">Inventory:</span> {match.inventoryNumber ?? `#${match.inventoryId}`}</div><div className="flex items-center gap-1.5"><span className="font-semibold text-gray-900">Colour / Fuel:</span><span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10" style={{ backgroundColor: inventoryColourSwatch(match.colour) }} /><span>{[match.colour, match.fuelType].filter(Boolean).join(' / ') || '—'}</span></div><div><span className="font-semibold text-gray-900">Insurance:</span> {match.insuranceType?.trim() || '—'}</div><div><span className="font-semibold text-gray-900">State:</span> {match.currentState ? formatInquiryInventoryWorkflowLabel(match.currentState) : 'Not marked'}</div></div>
                  <div className="space-y-1 border-l-0 border-blue-100 md:border-l md:pl-3"><div><span className="font-semibold text-gray-900">Registration:</span> {match.registrationNo ?? '—'}</div><div><span className="font-semibold text-gray-900">KM / Owners:</span> {match.kmsDriven ? Number(match.kmsDriven).toLocaleString('en-IN') : '—'} / {match.noOfOwners ?? '—'}</div><div><span className="font-semibold text-gray-900">Matched because:</span> {match.matchReasons?.join(' · ') || 'In-stock match'}</div></div>
                  <div className="space-y-1 border-l-0 border-blue-100 md:border-l md:pl-3"><div><span className="font-semibold text-gray-900">Vehicle:</span> {vehicle}{match.year ? ` · ${match.year}${match.month ? ` ${match.month}` : ''}` : ''}</div><div><span className="font-semibold text-gray-900">Price:</span> {fmtMoney(match.price)}</div>{match.status ? <Badge label={match.status} /> : null}<div className="whitespace-pre-wrap"><span className="font-semibold text-gray-900">Remarks:</span> {match.otherRemarks?.trim() || '—'}</div></div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const inventoryColourSwatches: Array<[string, string]> = [
  ['a.royale', '#102f77'], ['royale', '#102f77'], ['midnight blue', '#172554'], ['navy blue', '#1e3a8a'], ['sky blue', '#38bdf8'], ['blue', '#2563eb'], ['pearl white', '#f8fafc'], ['white', '#e5e7eb'], ['black', '#111827'], ['silver', '#cbd5e1'], ['grey', '#94a3b8'], ['gray', '#94a3b8'], ['burgundy', '#800020'], ['maroon', '#7f1d1d'], ['red', '#dc2626'], ['pink', '#ec4899'], ['purple', '#7e22ce'], ['champagne', '#d6b98c'], ['beige', '#d6c29a'], ['gold', '#ca8a04'], ['brown', '#92400e'], ['yellow', '#eab308'], ['orange', '#ea580c'], ['green', '#16a34a'],
]

function inventoryColourSwatch(colour: string | null) {
  const normalized = clean(colour).toLowerCase()
  return inventoryColourSwatches.find(([name]) => normalized.includes(name))?.[1] ?? '#94a3b8'
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

// some legacy catalog rows carry placeholder text ("null", "na") instead of a real SQL NULL

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

export function buildVehicleHistoryRows(
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

export function buildInquiryActivityItems(inquiry: InquiryRow) {
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
    'Location',
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
        row.location,
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
    noOfOwners: null,
  }
}

function emptyForm(): InquiryFormInput {
  return {
    inquiryNo: '', dateOfInquiry: new Date().toISOString().slice(0, 10), website: '', sourceCode: '', sourceDetail: '', locationId: null, location: '',
    customerId: null, customerNameLegacy: '', mobileno: '', email: '',
    budgetOfCustomer: null, visitedDateOfCustomer: '',
    classification: 'Warm', status: 'Open', subStatus: '',
    followUpDate: '', remark: '', inquiryCars: [],
  }
}

function fieldLabel(text: string, required = false): ReactNode {
  return <><span className={required ? 'text-gray-600' : 'text-gray-400'}>{text}</span>{required ? <span className="text-red-600"> *</span> : null}</>
}

function FormDropdown({
  label,
  value,
  options,
  placeholder,
  onChange,
  disabled = false,
  allowClear = false,
  allowCustom = false,
  error = false,
}: {
  label: ReactNode
  value: string
  options: Array<{ value: string; label: string }>
  placeholder: string
  onChange: (value: string) => void
  disabled?: boolean
  allowClear?: boolean
  allowCustom?: boolean
  error?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const pickerRef = useRef<HTMLDivElement>(null)
  const availableOptions = value && !options.some(option => option.value === value)
    ? [{ value, label: value }, ...options]
    : options
  const normalizedQuery = query.trim().toLowerCase()
  const matchingOptions = normalizedQuery ? availableOptions.filter(option => option.label.toLowerCase().includes(normalizedQuery)) : availableOptions
  const hasExactMatch = normalizedQuery ? availableOptions.some(option => option.label.trim().toLowerCase() === normalizedQuery) : false

  useEffect(() => {
    if (!open) return
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [open])

  const select = (nextValue: string) => {
    onChange(nextValue)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={pickerRef} className="relative flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => { if (!disabled) { setOpen(current => !current); setQuery('') } }}
        className={`flex w-full items-center justify-between rounded-md border bg-white px-3 py-2 text-left text-sm text-gray-800 outline-none focus:ring-1 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-[#1B2A6B]'}`}
      >
        <span className={value ? '' : 'text-gray-400'}>{availableOptions.find(option => option.value === value)?.label || placeholder}</span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? (
        <div className="absolute z-30 mt-1 w-full min-w-64 max-w-[calc(100vw-3rem)] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 p-2">
            <div className="relative"><Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" /><input autoFocus value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') setOpen(false) }} placeholder={allowCustom ? 'Search or add an option...' : 'Search options...'} className="w-full rounded-md border border-gray-200 py-2 pl-8 pr-3 text-sm outline-none focus:border-[#1B2A6B] focus:ring-1 focus:ring-[#1B2A6B]" /></div>
          </div>
          <div role="listbox" className="max-h-52 overflow-y-auto p-1">
            {allowClear ? <button type="button" role="option" aria-selected={!value} onClick={() => select('')} className={`w-full rounded-md px-3 py-2 text-left text-sm hover:bg-gray-50 ${!value ? 'bg-blue-50 text-[#1B2A6B]' : 'text-gray-700'}`}>{placeholder}</button> : null}
            {matchingOptions.map(option => <button key={option.value} type="button" role="option" aria-selected={value === option.value} onClick={() => select(option.value)} className={`w-full rounded-md px-3 py-2 text-left text-sm hover:bg-gray-50 ${value === option.value ? 'bg-blue-50 font-medium text-[#1B2A6B]' : 'text-gray-700'}`}>{option.label}</button>)}
            {allowCustom && normalizedQuery && !hasExactMatch ? <button type="button" onClick={() => select(query.trim())} className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-[#1B2A6B] hover:bg-blue-50">Use “{query.trim()}”</button> : null}
            {matchingOptions.length === 0 && !allowCustom ? <div className="px-3 py-2 text-sm text-gray-400">No matching options.</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function InquiryClient({
  initialData, makes, sourceOptions, locationOptions, subStatusSuggestions, inquiryAssistants, total, page, pageCount, search, status, classification, source, locationId, location, region, regionPeriod, subStatus, followUpDate, inquiryDate, visitedDate, budgetMin, budgetMax, makeId, modelId, variantId, quickFilter, autoOpenViewId, autoOpenEditId,
}: {
  initialData: InquiryRow[]
  makes: CarMakeMaster[]
  sourceOptions: InquirySourceOption[]
  locationOptions: InquiryLocationOption[]
  subStatusSuggestions: string[]
  inquiryAssistants: UserOption[]
  total: number
  page: number
  pageCount: number
  search: string
  status: string
  classification: string
  source: string
  locationId: string
  location: string
  region: string
  regionPeriod: string
  subStatus: string
  followUpDate: string
  inquiryDate: string
  visitedDate: string
  budgetMin: string
  budgetMax: string
  makeId: string
  modelId: string
  variantId: string
  quickFilter: 'active' | 'overdue' | 'today' | 'upcoming' | 'activity' | 'all'
  autoOpenViewId: number | null
  autoOpenEditId: number | null
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchInput, setSearchInput] = useState(search)
  const debouncedSearchInput = useDebouncedValue(searchInput, LIST_FILTER_DEBOUNCE_MS)
  const [locationInput, setLocationInput] = useState(location)
  const debouncedLocationInput = useDebouncedValue(locationInput, LIST_FILTER_DEBOUNCE_MS)
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
    noOfOwners?: number | null
    carVariantMaster?: {
      carMakeMaster: { pkMakeId: number; make: string | null } | null
      carModelMaster: { pkModelId: number; model: string | null } | null
    } | null
  }>, budget?: number | null) => {
    const requests = cars
      .map(car => {
        const variantId = car.fkVariantId ?? null
        const makeId = car.selectedMakeId ?? car.carVariantMaster?.carMakeMaster?.pkMakeId ?? null
        const modelId = car.selectedModelId ?? car.carVariantMaster?.carModelMaster?.pkModelId ?? null
        const year = car.carYear ?? null
        const noOfOwners = car.noOfOwners ?? null

        if (!variantId && !modelId && !makeId) return null

        const params = new URLSearchParams()
        if (makeId) params.set('makeId', String(makeId))
        if (modelId) params.set('modelId', String(modelId))
        if (variantId) params.set('variantId', String(variantId))
        if (year) params.set('year', String(year))
        if (noOfOwners !== null) params.set('noOfOwners', String(noOfOwners))
        if (budget && budget > 0) params.set('budget', String(budget))
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
      noOfOwners: car.noOfOwners,
      carVariantMaster: car.carVariantMaster,
    })), Number(row.budgetOfCustomer) || null)
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
  const followUpDateRequired = requiresInquiryFollowupDate(form.status)
  const visitedSelected = isVisitedSubStatus(form.subStatus)
  const customerDetailsLocked = Boolean(selectedCustomer || form.customerId)
  const isMissingFollowUpDate = followUpDateRequired && !form.followUpDate.trim()
  const isMissingVisitedDate = visitedSelected && !form.visitedDateOfCustomer.trim()
  const hasInventoryRequirements = Boolean(
    carEditor.selectedMakeId || carEditor.selectedModelId || carEditor.fkVariantId ||
    form.inquiryCars.some(car => car.selectedMakeId || car.selectedModelId || car.fkVariantId),
  )
  const activeFilterCount = [
    search.trim() ? 1 : 0,
    status !== 'All' ? 1 : 0,
    classification !== 'All' ? 1 : 0,
    source !== 'All' ? 1 : 0,
    locationId ? 1 : 0,
    location.trim() ? 1 : 0,
    region.trim() ? 1 : 0,
    subStatus !== 'All' ? 1 : 0,
    followUpDate ? 1 : 0,
    visitedDate ? 1 : 0,
    budgetMin ? 1 : 0,
    budgetMax ? 1 : 0,
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
    if (carEditor.carYear === null) {
      setCarEditorError('Select the vehicle year before adding the vehicle row.')
      return
    }
    if (!isValidYear(carEditor.carYear)) {
      setCarEditorError('Select a valid year for the vehicle row.')
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
    const query = buildListQueryString({ search, status, classification, source, locationId, location, region, regionPeriod, subStatus, followUpDate, inquiryDate, visitedDate, budgetMin, budgetMax, makeId, modelId, variantId, quickFilter, page: '1' }, params, true)
    startRouteTransition(() => {
      router.push(`/inquiry${query ? `?${query}` : ''}`)
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
    if (debouncedSearchInput === search) return
    pushQuery({ search: debouncedSearchInput })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchInput])

  useEffect(() => {
    if (debouncedLocationInput === location) return
    pushQuery({ location: debouncedLocationInput })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedLocationInput])

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
  }, [editId, form.customerId, form.inquiryCars, form.mobileno, modal])

  useEffect(() => {
    if (!modal) {
      setInventoryMatches([])
      setInventoryMatchError('')
      setInventoryMatchLoading(false)
      return
    }

    if (inventoryMatchDebounceRef.current) clearTimeout(inventoryMatchDebounceRef.current)

    const requirementCars = [...form.inquiryCars]
    const draftRequirement = carEditor.selectedMakeId || carEditor.selectedModelId || carEditor.fkVariantId
      ? carEditor
      : null
    if (draftRequirement) {
      if (editingCarIndex !== null) requirementCars[editingCarIndex] = draftRequirement
      else requirementCars.push(draftRequirement)
    }

    if (!requirementCars.some(car => car.selectedMakeId || car.selectedModelId || car.fkVariantId)) {
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
        const matches = await loadInventoryMatches(requirementCars, form.budgetOfCustomer)
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
  }, [carEditor, editingCarIndex, form.budgetOfCustomer, form.inquiryCars, modal])

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
        noOfOwners: car.noOfOwners ?? null,
      })) : []
      const nextForm = {
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
      customerNameLegacy: c?.custName ?? '',
      mobileno: c?.custMobile ?? '',
      email: c?.custEmail ?? '',
    }))
  }

  const f = <K extends keyof InquiryFormInput>(k: K, v: InquiryFormInput[K]) => setForm(prev => ({ ...prev, [k]: v }))
  const save = () => {
    setError('')
    const validation = validateInquiryFormInput(form)
    if (validation.error) {
      const labels: Record<string, string> = {
        customer: 'Customer', mobileno: 'Customer Mobile No.', email: 'Customer Email', website: 'Reference Website / Source',
        budgetOfCustomer: 'Budget of customer', inquiryCars: 'Car Details', dateOfInquiry: 'Date of Inquiry',
        followUpDate: 'FollowUp Date', visitedDateOfCustomer: 'Visited Date of customer',
      }
      const invalidFields = Object.keys(validation.fieldErrors).map(key => labels[key] ?? (key.startsWith('carYear-') ? 'Car Year' : key.startsWith('noOfOwners-') ? 'Number of Owners' : key))
      setError(invalidFields.length > 0 ? `Complete or correct: ${invalidFields.join(', ')}.` : validation.error)
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
        if (locationId) params.set('locationId', locationId)
        if (location.trim()) params.set('location', location)
        if (region.trim()) params.set('region', region)
        if (regionPeriod) params.set('regionPeriod', regionPeriod)
        if (subStatus !== 'All') params.set('subStatus', subStatus)
        if (followUpDate) params.set('followUpDate', followUpDate)
        if (inquiryDate) params.set('inquiryDate', inquiryDate)
        if (visitedDate) params.set('visitedDate', visitedDate)
        if (budgetMin) params.set('budgetMin', budgetMin)
        if (budgetMax) params.set('budgetMax', budgetMax)
        if (makeId) params.set('makeId', makeId)
        if (modelId) params.set('modelId', modelId)
        if (variantId) params.set('variantId', variantId)
        if (quickFilter !== 'active') params.set('quickFilter', quickFilter)
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
    setLocationInput('')
    pushQuery({ search: '', status: 'All', classification: 'All', source: 'All', locationId: '', location: '', region: '', regionPeriod: '', subStatus: 'All', followUpDate: '', inquiryDate: '', visitedDate: '', budgetMin: '', budgetMax: '', makeId: '', modelId: '', variantId: '', quickFilter: 'active', page: '1' })
  }

  const applyQuickFilter = (nextQuickFilter: 'active' | 'overdue' | 'today' | 'upcoming' | 'activity' | 'all') => {
    setSearchInput('')
    setLocationInput('')
    pushQuery({ search: '', status: 'All', classification: 'All', source: 'All', locationId: '', location: '', subStatus: 'All', followUpDate: '', inquiryDate: '', visitedDate: '', budgetMin: '', budgetMax: '', makeId: '', modelId: '', variantId: '', quickFilter: nextQuickFilter, page: '1' })
  }

  const previousInquiryAlert = previousInquiryError ? (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{previousInquiryError}</div>
  ) : previousInquiryLoading ? (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Checking existing inquiries for this customer...</div>
  ) : previousInquiries.length > 0 ? (
    <section className="rounded-lg border-2 border-amber-300 bg-amber-50 px-4 py-4 shadow-sm">
      <div className="text-sm font-bold text-amber-950">Existing inquiries found for this customer ({previousInquiries.length})</div>
      <div className="mt-1 text-xs text-amber-900">Review these before creating another inquiry. You can still continue if this is genuinely new.</div>
      <div className="mt-3 space-y-2">
        {previousInquiries.slice(0, 3).map(match => (
          <div key={match.inquiryId} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-white px-3 py-2 text-xs text-gray-700">
            <div><span className="font-semibold text-gray-900">{match.inquiryNo ?? `Inquiry #${match.inquiryId}`}</span><span className="mx-1.5 text-gray-400">•</span>{summarizeInquiryVehicles(match.inquiryCarDetails) || 'Vehicle not specified'}<span className="mx-1.5 text-gray-400">•</span>{match.status ?? '—'}<span className="mx-1.5 text-gray-400">•</span>Owner: {match.inquiryOwner ?? 'Unassigned'}</div>
            <a href={`/inquiry?view=${match.inquiryId}`} target="_blank" rel="noreferrer" className="font-medium text-amber-900 underline">View inquiry</a>
          </div>
        ))}
        {previousInquiries.length > 3 ? <div className="text-xs font-medium text-amber-900">+ {previousInquiries.length - 3} more existing inquiries</div> : null}
      </div>
    </section>
  ) : null

  return (
    <div>
      <PageHeader
        title="Inquiry Management"
        subtitle={`${total.toLocaleString('en-IN')} inquiries`}
        action={
          <div className="flex items-center gap-2">
            <Btn variant="outline" size="sm" onClick={exportAllMatchingInquiries} disabled={isExporting || total === 0}>
              <Download className="w-3.5 h-3.5" />{isExporting ? 'Exporting...' : `${search.trim() || status !== 'All' || classification !== 'All' || source !== 'All' || locationId || location.trim() || subStatus !== 'All' || !!followUpDate || !!visitedDate || !!budgetMin || !!budgetMax || !!makeId || !!modelId || !!variantId ? 'Export Filtered' : 'Export All'} (${total})`}
            </Btn>
            <Btn size="sm" onClick={openAdd}><Plus className="w-3.5 h-3.5" />New Inquiry</Btn>
          </div>
        }
      />

      {exportError ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{exportError}</div>
      ) : null}

      <InquiryFilters
        search={searchInput}
        source={source}
        locationId={locationId}
        location={locationInput}
        subStatus={subStatus}
        makeId={makeId}
        modelId={modelId}
        variantId={variantId}
        followUpDate={followUpDate}
        visitedDate={visitedDate}
        budgetMin={budgetMin}
        budgetMax={budgetMax}
        classification={classification}
        status={status}
        quickFilter={quickFilter}
        isRoutePending={isRoutePending}
        hasActiveFilters={Boolean(search.trim() || status !== 'All' || classification !== 'All' || source !== 'All' || locationId || location.trim() || region.trim() || subStatus !== 'All' || followUpDate || visitedDate || budgetMin || budgetMax || makeId || modelId || variantId)}
        sourceOptions={sourceOptions}
        locationOptions={locationOptions}
        subStatusSuggestions={subStatusSuggestions}
        makes={makes}
        models={filterModels}
        variants={filterVariants}
        classifications={INQUIRY_CLASSIFICATIONS}
        statuses={INQUIRY_STATUSES}
        onSearchChange={setSearchInput}
        onSourceChange={source => pushQuery({ source })}
        onLocationIdChange={locationId => pushQuery({ locationId })}
        onLocationChange={setLocationInput}
        onSubStatusChange={subStatus => pushQuery({ subStatus })}
        onMakeChange={makeId => pushQuery({ makeId, modelId: '', variantId: '' })}
        onModelChange={modelId => pushQuery({ modelId, variantId: '' })}
        onVariantChange={variantId => pushQuery({ variantId })}
        onFollowUpDateChange={followUpDate => pushQuery({ followUpDate })}
        onVisitedDateChange={visitedDate => pushQuery({ visitedDate })}
        onBudgetApply={(budgetMin, budgetMax) => pushQuery({ budgetMin, budgetMax })}
        onClassificationChange={classification => pushQuery({ classification })}
        onStatusChange={status => pushQuery({ status })}
        onQuickFilterChange={applyQuickFilter}
        onReset={resetFilters}
      />

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
          <InquiryTable empty={initialData.length === 0} emptyMessage={emptyInquiryMessage}>
            <InquiryTableRows rows={initialData}>{(r, index) => (
                <tr key={r.inquiryId} className="hover:bg-gray-50 transition">
                  <InquiryTableDataCells row={r} number={rowNumberStart + index + 1} assignedToLabel={userOptionLabel(r.assignedToUser)} actions={<InquiryRowActions isEmailPending={isEmailPending && emailingId === r.inquiryId} onSendEmail={() => handleSendEmail(r)} onView={() => openView(r)} onEdit={() => openEdit(r)} onAssign={() => openAssign(r)} onDelete={() => setDeleteId(r.inquiryId)} />} />
                </tr>
            )}</InquiryTableRows>
          </InquiryTable>
        </div>
        {isRoutePending ? <ListLoadingOverlay message="Updating inquiry list..." /> : null}
      </div>

      <ListPagination
        page={page}
        pageCount={pageCount}
        total={total}
        showingText={`Showing ${pageStart.toLocaleString('en-IN')}-${pageEnd.toLocaleString('en-IN')}`}
        pending={isRoutePending}
        className="mt-4"
        onPageChange={nextPage => pushQuery({ page: String(nextPage) })}
      />

      <InquiryViewModal title={`View Inquiry${viewInquiry ? ` — ${viewInquiry.inquiryNo ?? `Inquiry #${viewInquiry.inquiryId}`}` : viewInquiryId ? ` — Inquiry #${viewInquiryId}` : ''}`} open={viewInquiryId !== null} onClose={closeView}>
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
      </InquiryViewModal>

      <InquiryFormModal editing={Boolean(editId)} open={!!modal} onClose={requestCloseInquiryModal}>
        {editLoading ? (
          <div className="flex min-h-32 flex-col items-center justify-center gap-3 text-sm text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <div>Loading inquiry details...</div>
          </div>
        ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Input label={fieldLabel('Inquiry No', true)} value={form.inquiryNo} readOnly disabled placeholder="Generating..." />
            <Input label={fieldLabel('Date of Inquiry', true)} type="date" value={form.dateOfInquiry} onChange={e => f('dateOfInquiry', e.target.value)} error={errors.dateOfInquiry} />
            <FormDropdown
              label={fieldLabel('Reference Website / Source', true)}
              value={form.sourceCode}
              options={sourceOptions.map(source => ({ value: source.code, label: source.displayName }))}
              placeholder="Select source"
              allowClear
              error={errors.website}
              onChange={value => {
                const selected = sourceOptions.find(source => source.code === value)
                setForm(previous => ({
                  ...previous,
                  sourceCode: value,
                  website: selected?.displayName ?? '',
                  sourceDetail: selected?.requiresDetail ? previous.sourceDetail : '',
                }))
              }}
            />
          </div>

          {sourceOptions.find(source => source.code === form.sourceCode)?.requiresDetail ? (
            <Input
              label={fieldLabel(form.sourceCode === 'REFERENCE' ? 'Reference Details' : 'Other Source Details', true)}
              value={form.sourceDetail}
              onChange={e => f('sourceDetail', e.target.value)}
              placeholder={form.sourceCode === 'REFERENCE' ? 'Customer, dealer, or referral person' : 'Describe the source'}
            />
          ) : null}

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Link Existing Customer</label>
            <CustomerPicker value={selectedCustomer} onChange={onCustomerChange} error={errors.customer} />
          </div>

          {customerDetailsLocked ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              This inquiry is linked to a customer record. Name, mobile, and email above are locked to that customer so the inquiry does not drift from the master customer data.
            </div>
          ) : null}

          <div className="grid grid-cols-3 gap-4">
            <Input label={fieldLabel('Customer Name', true)} value={form.customerNameLegacy} onChange={e => f('customerNameLegacy', e.target.value)} readOnly={customerDetailsLocked} disabled={customerDetailsLocked} className={customerDetailsLocked ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''} error={errors.customer} />
            <Input label={fieldLabel('Customer Mobile No', true)} value={form.mobileno} onChange={e => f('mobileno', e.target.value)} readOnly={customerDetailsLocked} disabled={customerDetailsLocked} className={customerDetailsLocked ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''} error={errors.mobileno} />
            <Input label={fieldLabel('Customer Email')} type="email" value={form.email} onChange={e => f('email', e.target.value)} readOnly={customerDetailsLocked} disabled={customerDetailsLocked} className={customerDetailsLocked ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''} error={errors.email} />
          </div>
          {previousInquiryAlert}
          <div className="grid grid-cols-2 gap-4">
            <FormDropdown label="City / Reporting Location (Optional)" value={String(form.locationId ?? '')} options={locationOptions.map(item => ({ value: String(item.locationId), label: `${item.displayName} · ${item.region}` }))} placeholder="Select reporting location" allowClear error={errors.locationId} onChange={value => f('locationId', Number(value) || null)} />
            <Input label="Area / Locality" value={form.location} onChange={e => f('location', e.target.value)} placeholder="e.g. Andheri West, Kothrud, JLT" />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-gray-900">Car Details</div>
                <div className="text-xs text-gray-500">Add one or more vehicle interests for the same inquiry, similar to the legacy screen.</div>
              </div>
              {editingCarIndex !== null ? (
                <Btn variant="outline" size="sm" onClick={resetCarEditor}>Cancel Edit</Btn>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,.9fr)_minmax(0,1.1fr)_minmax(0,1fr)_auto] [&_label]:whitespace-nowrap">
              <FormDropdown label={fieldLabel('Make', true)} value={String(carEditor.selectedMakeId ?? '')} options={makes.map(item => ({ value: String(item.pkMakeId), label: item.make ?? '—' }))} placeholder="Select make" allowClear onChange={value => onCarEditorMakeChange(Number(value))} />
              <FormDropdown label={fieldLabel('Model', true)} value={String(carEditor.selectedModelId ?? '')} options={carEditorModels.map(item => ({ value: String(item.pkModelId), label: item.model ?? '—' }))} placeholder="Select model" allowClear disabled={!carEditor.selectedMakeId} onChange={value => onCarEditorModelChange(Number(value))} />
              <FormDropdown label={fieldLabel('Variant', true)} value={String(carEditor.fkVariantId ?? '')} options={carEditorVariants.map(item => ({ value: String(item.pkVariantId), label: item.variant ?? '—' }))} placeholder="Select variant" allowClear disabled={!carEditor.selectedModelId} onChange={value => {
                setCarEditor(prev => ({ ...prev, fkVariantId: Number(value) || null }))
                setCarEditorError('')
              }} />
              <FormDropdown label={fieldLabel('Year', true)} value={carEditor.carYear ? String(carEditor.carYear) : ''} options={VEHICLE_YEAR_OPTIONS} placeholder="Select year" allowClear onChange={value => {
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
                <Btn onClick={saveInquiryCarRow} className="w-full">
                  {editingCarIndex !== null ? 'Update' : <><Plus className="h-4 w-4" />Add</>}
                </Btn>
              </div>
            </div>

            {carEditorError ? (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{carEditorError}</div>
            ) : null}

            <InquiryCarTable
              cars={form.inquiryCars}
              makeNames={Object.fromEntries(makes.map(item => [item.pkMakeId, item.make]))}
              modelNames={modelNameCache}
              variantNames={variantNameCache}
              onMove={moveInquiryCar}
              onEdit={editInquiryCar}
              onDelete={removeInquiryCar}
            />
          </div>

          <InventoryMatchPanel
            hasRequirements={hasInventoryRequirements}
            loading={inventoryMatchLoading}
            error={inventoryMatchError}
            matches={inventoryMatches}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Budget of customer (optional)"
              inputMode="numeric"
              placeholder="e.g. 12,00,000"
              value={form.budgetOfCustomer === null ? '' : form.budgetOfCustomer.toLocaleString('en-IN')}
              onChange={e => {
                const digits = e.target.value.replace(/\D/g, '')
                f('budgetOfCustomer', digits ? Number(digits) : null)
              }}
              error={errors.budgetOfCustomer}
            />
            <FormDropdown label={fieldLabel('Classification', true)} value={form.classification} options={INQUIRY_CLASSIFICATIONS.map(value => ({ value, label: value }))} placeholder="Select classification" onChange={value => f('classification', value)} />
            <Input label="Visited Date of customer" type="date" value={form.visitedDateOfCustomer} onChange={e => f('visitedDateOfCustomer', e.target.value)} error={errors.visitedDateOfCustomer} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormDropdown label={fieldLabel('Status', true)} value={form.status} options={INQUIRY_STATUSES.map(value => ({ value, label: inquiryStatusLabel(value) }))} placeholder="Select status" onChange={nextStatus => {
              f('status', nextStatus)
              if (!requiresInquiryFollowupDate(nextStatus)) {
                f('followUpDate', '')
              }
            }} />
            <FormDropdown label="Sub Status" value={form.subStatus} options={subStatusSuggestions.map(value => ({ value, label: value }))} placeholder="Select sub status" allowClear onChange={value => f('subStatus', value)} />
            <Input
              label={fieldLabel('FollowUp Date', followUpDateRequired)}
              type="date"
              value={form.followUpDate}
              onChange={e => f('followUpDate', e.target.value)}
              error={errors.followUpDate}
              disabled={!followUpDateRequired}
            />
            <Textarea label="Remark" value={form.remark} onChange={e => f('remark', e.target.value)} placeholder="Notes about this inquiry..." />
          </div>

          {(isMissingFollowUpDate || isMissingVisitedDate) ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {isMissingFollowUpDate ? <div>Open and Followup statuses need a follow-up date.</div> : null}
              {isMissingVisitedDate ? <div>Visited sub-status needs a visited date.</div> : null}
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
      </InquiryFormModal>

      <AssignInquiryModal
        row={assignInquiryRow}
        users={inquiryAssistants}
        value={assignUserId}
        error={assignError}
        pending={isAssignPending}
        userLabel={userOptionLabel}
        onChange={setAssignUserId}
        onClose={closeAssign}
        onSave={saveAssignment}
      />

      <EmailVehicleModal title={`Send Matching Inventory${emailInquiryRow ? ` — ${emailInquiryRow.inquiryNo ?? `Inquiry #${emailInquiryRow.inquiryId}`}` : ''}`} open={!!emailInquiryRow} onClose={() => {
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
          <EmailVehicleContent
            customer={emailInquiryRow.customer?.custName ?? emailInquiryRow.customerNameLegacy ?? '—'}
            email={emailInquiryRow.customer?.custEmail ?? emailInquiryRow.email ?? '—'}
            mobile={emailInquiryRow.mobileno ?? '—'}
            error={emailModalError}
            loading={emailInventoryLoading}
            matches={emailInventoryMatches}
            historyByInventoryId={emailHistoryByInventoryId}
            selectedIds={selectedEmailInventoryIds}
            search={emailInventorySearch}
            pending={isEmailPending}
            onSearchChange={setEmailInventorySearch}
            onToggleSelection={toggleEmailInventorySelection}
            onCancel={() => {
              if (isEmailPending) return
              emailInventoryRequestRef.current += 1
              setEmailInquiryRow(null)
              setEmailInventoryMatches([])
              setEmailHistoryByInventoryId({})
              setSelectedEmailInventoryIds([])
              setEmailInventorySearch('')
              setEmailModalError('')
            }}
            onSend={handleSendInventoryEmail}
            clean={clean}
            formatMoney={fmtMoney}
            formatWorkflowState={formatInquiryInventoryWorkflowLabel}
          />
        ) : null}
      </EmailVehicleModal>

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
