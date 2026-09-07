'use client'

import { useEffect, useState, useTransition } from 'react'
import { Badge, Btn } from '@/components/ui'
import { getInquiryDetail, setInquiryInventoryWorkflowState } from './actions'
import { formatInquiryInventoryWorkflowLabel, INQUIRY_INVENTORY_WORKFLOW_OPTIONS } from './workflow'
import { isFollowupStatus } from '@/lib/inquiryFollowupValidation'

interface InquiryDetailUser {
  userId: number
  userName: string | null
  displayName: string | null
}

interface InquiryDetailCustomer {
  custId?: number | null
  custName: string | null
  custMobile?: string | null
  custEmail?: string | null
}

interface InquiryDetailCar {
  inquiryCarDetailsId?: number | null
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
}

interface InquiryDetailFollowup {
  pkFollowupId: number
  followupDate: Date | string | null
  followupStatus: string | null
  followupSubStatus: string | null
  followupClassification: string | null
  comments: string | null
  createdDt: Date | string | null
  createdByUser?: InquiryDetailUser | null
}

interface InquiryDetailInventoryLink {
  inquiryInventoryLinkId: number
  linkType: string
  createdAt: Date | string | null
  createdByUser?: InquiryDetailUser | null
  inventoryManagement: {
    inventoryId: number
    inventoryNumber: string | null
    registrationNo: string | null
    year: number | null
    status: string | null
    price: string | number | null
    carVariantMaster: {
      variant: string | null
      carMakeMaster: { make: string | null } | null
      carModelMaster: { model: string | null } | null
    } | null
  }
}

interface InquiryDetailVehicleEmailLink {
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
    kmsDriven?: string | number | null
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

interface InquiryDetailEmailHistory {
  inquiryEmailHistoryId: number
  emailType: string
  recipientEmail: string
  recipientName: string | null
  emailSubject: string
  deliveryStatus: string
  errorMessage: string | null
  sentAt: Date | string | null
  createdAt: Date | string | null
  attemptedByUser?: InquiryDetailUser | null
  inventoryManagement?: {
    inventoryId: number
    inventoryNumber: string | null
    makeLegacy?: string | null
    modelLegacy?: string | null
    variantLegacy?: string | null
    registrationNo: string | null
    year: number | null
    kmsDriven?: string | number | null
    price: string | number | null
    status: string | null
    carVariantMaster: {
      variant: string | null
      carMakeMaster: { make: string | null } | null
      carModelMaster: { model: string | null } | null
    } | null
  } | null
}

interface InquiryDetailActivityEvent {
  inquiryActivityLogId: number
  inquiryId: number
  eventType: string
  eventLabel: string | null
  eventDetail: string | null
  actorUserId: number | null
  actorUserName: string | null
  inventoryId: number | null
  followupId: number | null
  inquiryCarDetailsId: number | null
  createdAt: Date | string
}

type InquiryDetailData = {
  inquiryId: number
  inquiryNo: string | null
  dateOfInquiry: Date | string | null
  website: string | null
  sourceDetail: string | null
  customerId: number | null
  customerNameLegacy: string | null
  mobileno: string | null
  email: string | null
  budgetOfCustomer: string | number | null
  visitedDateOfCustomer: Date | string | null
  classification: string | null
  status: string | null
  subStatus: string | null
  followUpDate: Date | string | null
  remark: string | null
  createdDt?: Date | string | null
  updatedDt?: Date | string | null
  assignedToUser?: InquiryDetailUser | null
  createdByUser?: InquiryDetailUser | null
  updatedByUser?: InquiryDetailUser | null
  customer: InquiryDetailCustomer | null
  inquiryCarDetails: InquiryDetailCar[]
  followupInquiry?: InquiryDetailFollowup[]
  inquiryEmailHistories?: InquiryDetailEmailHistory[]
  inquiryInventoryLinks?: InquiryDetailInventoryLink[]
  vehicleEmailLinks?: InquiryDetailVehicleEmailLink[]
  inquiryActivityEvents?: InquiryDetailActivityEvent[]
}

const INVENTORY_STATE_LINK_TYPES = ['shortlisted', 'visited', 'booked', 'rejected'] as const
const INVENTORY_WORKFLOW_TONES: Record<string, string> = {
  matched: 'border-blue-200 bg-blue-50 text-blue-700',
  emailed: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  shortlisted: 'border-amber-200 bg-amber-50 text-amber-700',
  visited: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  booked: 'border-green-200 bg-green-50 text-green-700',
  rejected: 'border-red-200 bg-red-50 text-red-700',
}

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return ''
  const value = new Date(d)
  if (Number.isNaN(value.getTime())) return ''
  return value.toISOString().slice(0, 10)
}

function fmtDateTime(d: Date | string | null | undefined) {
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

function fmtMoney(n: string | number | null | undefined) {
  return n ? `Rs ${Number(n).toLocaleString('en-IN')}` : '-'
}

const JUNK_VALUES = new Set(['null', 'na', 'n/a'])
const clean = (v: string | null | undefined) => (!v || JUNK_VALUES.has(v.trim().toLowerCase()) ? '' : v)

function userOptionLabel(user?: InquiryDetailData['assignedToUser'] | InquiryDetailData['createdByUser'] | InquiryDetailInventoryLink['createdByUser'] | null) {
  if (!user) return '-'
  return user.displayName?.trim() || user.userName?.trim() || `User #${user.userId}`
}

function summarizeInquiryVehicles(cars: InquiryDetailData['inquiryCarDetails'] | undefined | null) {
  if (!cars || cars.length === 0) return '-'
  const labels = cars.map(car => {
    const parts = [
      clean(car.carVariantMaster?.carMakeMaster?.make) || clean(car.makeLegacy),
      clean(car.carVariantMaster?.carModelMaster?.model) || clean(car.modelLegacy),
      clean(car.carVariantMaster?.variant) || clean(car.variantLegacy),
      clean(car.subVariant),
    ].filter(Boolean)
    return `${parts.join(' ')}${car.year ? ` · ${car.year}` : ''}`.trim()
  }).filter(Boolean)
  if (labels.length === 0) return '-'
  if (labels.length === 1) return labels[0]
  return `${labels[0]} +${labels.length - 1} more`
}

function summarizeVehicleEmailEngagement(link: NonNullable<InquiryDetailData['vehicleEmailLinks']>[number]) {
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

function formatEmailTypeLabel(emailType: string | null | undefined) {
  if (emailType === 'generic_inquiry') return 'Inquiry email'
  if (emailType === 'inventory_vehicle') return 'Inventory email'
  return emailType || 'Email'
}

function buildVehicleHistoryRows(
  inquiryInventoryLinks: InquiryDetailData['inquiryInventoryLinks'] | undefined,
  vehicleEmailLinks: InquiryDetailData['vehicleEmailLinks'] | undefined,
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
    currentState: string | null
    currentStateAt: Date | string | null
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
    ].filter(Boolean).join(' ') || '-'
    const normalizedLinkType = link.linkType.toLowerCase()

    const next = rows.get(inventoryId) ?? {
      inventoryId,
      inventoryNumber: link.inventoryManagement.inventoryNumber,
      registrationNo: link.inventoryManagement.registrationNo,
      vehicle,
      year: link.inventoryManagement.year,
      status: link.inventoryManagement.status,
      price: link.inventoryManagement.price,
      matchedAt: null,
      emailedAt: null,
      currentState: null,
      currentStateAt: null,
      emailCount: 0,
      humanViewCount: 0,
      requestCount: 0,
      callClicks: 0,
      whatsappClicks: 0,
      emailClicks: 0,
    }

    if (normalizedLinkType === 'matched' && !next.matchedAt) next.matchedAt = link.createdAt
    if (normalizedLinkType === 'emailed' && !next.emailedAt) next.emailedAt = link.createdAt
    if (INVENTORY_STATE_LINK_TYPES.includes(normalizedLinkType as (typeof INVENTORY_STATE_LINK_TYPES)[number]) && !next.currentState) {
      next.currentState = normalizedLinkType
      next.currentStateAt = link.createdAt
    }
    rows.set(inventoryId, next)
  }

  for (const link of vehicleEmailLinks ?? []) {
    const inventoryId = link.inventoryManagement.inventoryId
    const vehicle = [
      clean(link.inventoryManagement.carVariantMaster?.carMakeMaster?.make) || clean(link.inventoryManagement.makeLegacy),
      clean(link.inventoryManagement.carVariantMaster?.carModelMaster?.model) || clean(link.inventoryManagement.modelLegacy),
      clean(link.inventoryManagement.carVariantMaster?.variant) || clean(link.inventoryManagement.variantLegacy),
    ].filter(Boolean).join(' ') || '-'
    const engagement = summarizeVehicleEmailEngagement(link)

    const next = rows.get(inventoryId) ?? {
      inventoryId,
      inventoryNumber: link.inventoryManagement.inventoryNumber,
      registrationNo: link.inventoryManagement.registrationNo,
      vehicle,
      year: link.inventoryManagement.year,
      status: link.inventoryManagement.status,
      price: link.inventoryManagement.price,
      matchedAt: null,
      emailedAt: null,
      currentState: null,
      currentStateAt: null,
      emailCount: 0,
      humanViewCount: 0,
      requestCount: 0,
      callClicks: 0,
      whatsappClicks: 0,
      emailClicks: 0,
    }

    if (!next.emailedAt) next.emailedAt = link.emailSentAt ?? link.createdAt ?? null
    next.emailCount += 1
    next.humanViewCount += link.humanViewCount
    next.requestCount += link.requestCount
    next.callClicks += engagement.callClicks
    next.whatsappClicks += engagement.whatsappClicks
    next.emailClicks += engagement.emailClicks
    rows.set(inventoryId, next)
  }

  return [...rows.values()].sort((a, b) => {
    const aTime = a.currentStateAt ? new Date(a.currentStateAt).getTime() : a.emailedAt ? new Date(a.emailedAt).getTime() : a.matchedAt ? new Date(a.matchedAt).getTime() : 0
    const bTime = b.currentStateAt ? new Date(b.currentStateAt).getTime() : b.emailedAt ? new Date(b.emailedAt).getTime() : b.matchedAt ? new Date(b.matchedAt).getTime() : 0
    return bTime - aTime
  })
}

function buildInquiryActivityItems(inquiry: InquiryDetailData) {
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
      title: `Status set to ${followup.followupStatus ?? '-'}`,
      detail: [
        followup.followupSubStatus ? `Sub-status: ${followup.followupSubStatus}` : '',
        followup.followupClassification ? `Class: ${followup.followupClassification}` : '',
        isFollowupStatus(followup.followupStatus) && followup.followupDate ? `Next follow-up: ${fmtDate(followup.followupDate)}` : '',
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
      title: 'Vehicle email sent',
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

  for (const link of inquiry.inquiryInventoryLinks ?? []) {
    const normalizedLinkType = link.linkType.toLowerCase()
    if (!INVENTORY_STATE_LINK_TYPES.includes(normalizedLinkType as (typeof INVENTORY_STATE_LINK_TYPES)[number])) continue
    const vehicle = [
      clean(link.inventoryManagement.carVariantMaster?.carMakeMaster?.make),
      clean(link.inventoryManagement.carVariantMaster?.carModelMaster?.model),
      clean(link.inventoryManagement.carVariantMaster?.variant),
    ].filter(Boolean).join(' ') || (link.inventoryManagement.inventoryNumber ?? `Inventory #${link.inventoryManagement.inventoryId}`)

    items.push({
      key: `inventory-state-${link.inquiryInventoryLinkId}`,
      at: link.createdAt,
      title: `Inventory marked ${formatInquiryInventoryWorkflowLabel(normalizedLinkType).toLowerCase()}`,
      detail: [
        vehicle,
        link.inventoryManagement.registrationNo ?? '',
        link.createdByUser ? `By ${userOptionLabel(link.createdByUser)}` : '',
      ].filter(Boolean).join(' · '),
      tone: normalizedLinkType === 'booked' ? 'success' : normalizedLinkType === 'rejected' ? 'danger' : 'info',
    })
  }

  for (const email of inquiry.inquiryEmailHistories ?? []) {
    if (email.emailType !== 'generic_inquiry') continue
    items.push({
      key: `generic-email-${email.inquiryEmailHistoryId}`,
      at: email.sentAt ?? email.createdAt ?? null,
      title: email.deliveryStatus === 'Sent' ? 'Inquiry email sent' : 'Inquiry email failed',
      detail: [
        email.recipientEmail,
        email.emailSubject,
        email.attemptedByUser ? `By ${userOptionLabel(email.attemptedByUser)}` : '',
        email.errorMessage?.trim() ? `Error: ${email.errorMessage.trim()}` : '',
      ].filter(Boolean).join(' · '),
      tone: email.deliveryStatus === 'Sent' ? 'success' : 'danger',
    })
  }

  for (const event of inquiry.inquiryActivityEvents ?? []) {
    items.push({
      key: `event-${event.inquiryActivityLogId}`,
      at: event.createdAt,
      title: event.eventLabel?.trim() || event.eventType,
      detail: [
        event.eventDetail?.trim() ? `Remark: ${event.eventDetail.trim()}` : '',
        event.actorUserName ? `By ${event.actorUserName}` : '',
      ].filter(Boolean).join(' · ') || 'Activity recorded',
      tone: 'neutral',
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

export function InquiryDetailView({
  inquiry,
  onClose,
  onEdit,
  onLogFollowup,
  onOpenMatch,
  detailRoute = '/inquiry',
}: {
  inquiry: InquiryDetailData
  onClose: () => void
  onEdit: () => void
  onLogFollowup: () => void
  onOpenMatch?: () => void
  detailRoute?: string
}) {
  const [currentInquiry, setCurrentInquiry] = useState(inquiry)
  const [tab, setTab] = useState<'overview' | 'requirement' | 'activity' | 'record'>('overview')
  const [workflowSelectionByInventoryId, setWorkflowSelectionByInventoryId] = useState<Record<number, string>>({})
  const [workflowFeedback, setWorkflowFeedback] = useState<{ ok: boolean; message: string } | null>(null)
  const [workflowInventoryId, setWorkflowInventoryId] = useState<number | null>(null)
  const [isWorkflowPending, startWorkflowTransition] = useTransition()

  useEffect(() => {
    setCurrentInquiry(inquiry)
    setWorkflowSelectionByInventoryId({})
    setWorkflowFeedback(null)
    setWorkflowInventoryId(null)
  }, [inquiry])

  const historyRows = buildVehicleHistoryRows(currentInquiry.inquiryInventoryLinks, currentInquiry.vehicleEmailLinks)
  const activityItems = buildInquiryActivityItems(currentInquiry)
  const overdueDays = currentInquiry.followUpDate && currentInquiry.status === 'FollowUp'
    ? Math.floor((new Date(new Date().toDateString()).getTime() - new Date(new Date(currentInquiry.followUpDate).toDateString()).getTime()) / (1000 * 60 * 60 * 24))
    : null
  const followupOverdue = overdueDays !== null && overdueDays > 0
  const vehicleSummary = summarizeInquiryVehicles(currentInquiry.inquiryCarDetails)

  const saveWorkflowState = (inventoryId: number, currentState: string | null) => {
    const selectedState = workflowSelectionByInventoryId[inventoryId] ?? currentState ?? ''
    if (!selectedState) return

    setWorkflowInventoryId(inventoryId)
    setWorkflowFeedback(null)
    startWorkflowTransition(async () => {
      const result = await setInquiryInventoryWorkflowState(currentInquiry.inquiryId, inventoryId, selectedState, { route: detailRoute })
      if (!result.success) {
        setWorkflowFeedback({ ok: false, message: result.error ?? 'Could not save inventory state.' })
        setWorkflowInventoryId(null)
        return
      }

      const refreshed = await getInquiryDetail(currentInquiry.inquiryId, { route: detailRoute })
      if (refreshed) {
        setCurrentInquiry(refreshed)
      }
      setWorkflowSelectionByInventoryId(prev => ({ ...prev, [inventoryId]: selectedState }))
      setWorkflowFeedback({ ok: true, message: result.message ?? 'Inventory state updated.' })
      setWorkflowInventoryId(null)
    })
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">{currentInquiry.inquiryNo ?? `Inquiry/${currentInquiry.inquiryId}`}</span>
            {currentInquiry.website ? <span className="rounded-md bg-blue-50 px-3 py-1 text-sm font-medium text-[#1B2A6B]">{currentInquiry.website}{currentInquiry.sourceDetail ? ` · ${currentInquiry.sourceDetail}` : ''}</span> : null}
          </div>
          <h2 className="mt-3 text-3xl font-bold text-gray-900">{currentInquiry.customer?.custName ?? currentInquiry.customerNameLegacy ?? 'Unnamed inquiry'}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <span>Customer #{currentInquiry.customer?.custId ?? currentInquiry.customerId ?? '-'}</span>
            <span>·</span>
            <span>Raised {fmtDate(currentInquiry.dateOfInquiry) || '-'}</span>
            <span>·</span>
            <span>Inquiry #{currentInquiry.inquiryId}</span>
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 lg:items-end">
          <div className="flex flex-wrap items-center gap-2">
            {currentInquiry.classification ? <Badge label={currentInquiry.classification} /> : null}
            {currentInquiry.status ? <Badge label={currentInquiry.status} /> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn variant="outline" onClick={onEdit}>Edit</Btn>
            <Btn onClick={onLogFollowup}>Log follow-up</Btn>
          </div>
        </div>
      </div>

      {followupOverdue ? (
        <div className="flex flex-col gap-3 border-t border-red-100 bg-red-50 px-6 py-4 text-sm text-red-700 md:flex-row md:items-center md:justify-between">
          <div className="font-medium">Follow-up was due on {fmtDate(currentInquiry.followUpDate)} and is overdue by {overdueDays} day{overdueDays === 1 ? '' : 's'}.</div>
          <div className="flex gap-2">
            <Btn variant="outline" onClick={onEdit}>Reschedule</Btn>
            <Btn onClick={onLogFollowup}>Mark done</Btn>
          </div>
        </div>
      ) : null}

      <div className="grid gap-0 border-t border-gray-100 md:grid-cols-2 xl:grid-cols-4">
        <div className="border-r border-gray-100 px-6 py-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Assigned To</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">{userOptionLabel(currentInquiry.assignedToUser)}</div>
        </div>
        <div className="border-r border-gray-100 px-6 py-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Budget</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">{fmtMoney(currentInquiry.budgetOfCustomer)}</div>
        </div>
        <div className="border-r border-gray-100 px-6 py-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Vehicles Wanted</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">{currentInquiry.inquiryCarDetails.length}</div>
          <div className="mt-1 text-sm text-gray-500">{vehicleSummary}</div>
        </div>
        <div className="px-6 py-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Showroom Visit</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">{fmtDate(currentInquiry.visitedDateOfCustomer) || 'Not visited'}</div>
        </div>
      </div>

      <div className="border-t border-gray-100 px-6">
        <div className="flex flex-wrap gap-6">
          {[
            ['overview', 'Overview'],
            ['requirement', `Requirement${currentInquiry.inquiryCarDetails.length ? ` (${currentInquiry.inquiryCarDetails.length})` : ''}`],
            ['activity', 'Activity'],
            ['record', 'Record'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key as 'overview' | 'requirement' | 'activity' | 'record')}
              className={`border-b-2 px-1 py-4 text-sm font-medium transition ${tab === key ? 'border-[#1B2A6B] text-[#1B2A6B]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-5">
        {tab === 'overview' ? (
          <div className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Contact</div>
                  {(currentInquiry.customer?.custId ?? currentInquiry.customerId) ? <div className="text-sm font-medium text-[#1B2A6B]">Customer #{currentInquiry.customer?.custId ?? currentInquiry.customerId}</div> : null}
                </div>
                <div className="mt-4 space-y-4 text-sm text-gray-700">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Mobile</div>
                    <div className="mt-1 text-xl font-semibold text-gray-900">{currentInquiry.customer?.custMobile ?? currentInquiry.mobileno ?? '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">WhatsApp</div>
                    <div className="mt-1 text-base text-gray-900">{currentInquiry.customer?.custMobile ?? currentInquiry.mobileno ? 'Send listings' : '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Email</div>
                    <div className="mt-1 text-base break-all text-gray-900">{currentInquiry.customer?.custEmail ?? currentInquiry.email ?? '-'}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Requirement</div>
                  <button type="button" className="text-sm font-medium text-[#1B2A6B]" onClick={() => setTab('requirement')}>Open requirement</button>
                </div>
                {currentInquiry.inquiryCarDetails.length === 0 ? (
                  <div className="mt-4 text-sm text-gray-500">No vehicle requirement captured.</div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {currentInquiry.inquiryCarDetails.map((car, index) => (
                      <div key={car.inquiryCarDetailsId ?? `overview-car-${index}`} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-sm font-medium text-[#1B2A6B]">{index + 1}</div>
                          <div>
                            <div className="text-2xl font-semibold text-gray-900">{[
                              clean(car.carVariantMaster?.carMakeMaster?.make) || clean(car.makeLegacy),
                              clean(car.carVariantMaster?.carModelMaster?.model) || clean(car.modelLegacy),
                            ].filter(Boolean).join(' ') || 'Vehicle not set'}</div>
                            <div className="mt-1 text-sm text-gray-500">
                              {clean(car.carVariantMaster?.variant) || clean(car.variantLegacy) || 'variant not set'}
                              {' · '}
                              {clean(car.subVariant) || 'sub-variant not set'}
                              {' · '}
                              {car.year ? String(car.year) : 'year not set'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Remarks</div>
                <button type="button" className="text-sm font-medium text-[#1B2A6B]" onClick={onEdit}>Add note</button>
              </div>
              <div className="mt-4 whitespace-pre-wrap text-sm text-gray-700">{currentInquiry.remark?.trim() ? currentInquiry.remark : 'No remarks recorded yet.'}</div>
            </div>
          </div>
        ) : null}

        {tab === 'requirement' ? (
          <div className="space-y-5">
            <div>
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Cars this customer is looking for</div>
              {currentInquiry.inquiryCarDetails.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 px-5 py-8 text-center text-sm text-gray-500">No vehicle requirement captured.</div>
              ) : (
                <div className="space-y-3">
                  {currentInquiry.inquiryCarDetails.map((car, index) => (
                    <div key={car.inquiryCarDetailsId ?? `requirement-car-${index}`} className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-sm font-medium text-[#1B2A6B]">{index + 1}</div>
                        <div>
                          <div className="text-2xl font-semibold text-gray-900">{[
                            clean(car.carVariantMaster?.carMakeMaster?.make) || clean(car.makeLegacy),
                            clean(car.carVariantMaster?.carModelMaster?.model) || clean(car.modelLegacy),
                          ].filter(Boolean).join(' ') || 'Vehicle not set'}</div>
                          <div className="mt-1 text-sm text-gray-500">
                            Variant {clean(car.carVariantMaster?.variant) || clean(car.variantLegacy) || 'not set'}
                            {' · '}
                            {clean(car.subVariant) || 'sub-variant not set'}
                            {' · '}
                            {car.year ? String(car.year) : 'year not set'}
                          </div>
                        </div>
                      </div>
                      {onOpenMatch ? <Btn variant="outline" onClick={onOpenMatch}>Find matches</Btn> : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Stock matched & shared</div>
              {workflowFeedback ? (
                <div className={`mb-3 rounded-lg border px-4 py-3 text-sm ${workflowFeedback.ok ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                  {workflowFeedback.message}
                </div>
              ) : null}
              {historyRows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-5 py-10 text-center">
                  <div className="text-2xl font-semibold text-gray-900">Nothing sent to this customer yet</div>
                  <div className="mt-2 text-sm text-gray-500">Match live stock from this inquiry, then email the shortlist. Sends will be logged here.</div>
                  {onOpenMatch ? <div className="mt-4"><Btn onClick={onOpenMatch}>Match against stock</Btn></div> : null}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <th className="px-4 py-3">Vehicle</th>
                        <th className="px-4 py-3">Matched</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Current State</th>
                        <th className="px-4 py-3">Update</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyRows.map(row => {
                        const selectedState = workflowSelectionByInventoryId[row.inventoryId] ?? row.currentState ?? ''
                        return (
                          <tr key={row.inventoryId} className="border-t border-gray-200 align-top">
                            <td className="px-4 py-4 text-gray-700">
                              <div className="font-medium text-gray-900">{row.vehicle}{row.year ? ` · ${row.year}` : ''}</div>
                              <div>{row.inventoryNumber ?? `#${row.inventoryId}`}</div>
                              <div>{row.registrationNo ?? '-'}</div>
                              <div>{row.status ?? '-'} / {fmtMoney(row.price)}</div>
                            </td>
                            <td className="px-4 py-4 text-gray-700">
                              <div className="font-medium text-gray-900">{row.matchedAt ? 'Yes' : 'No'}</div>
                              <div>{row.matchedAt ? fmtDateTime(row.matchedAt) : '-'}</div>
                            </td>
                            <td className="px-4 py-4 text-gray-700">
                              <div className="font-medium text-gray-900">{row.emailedAt ? 'Sent' : 'Not sent'}</div>
                              <div>{row.emailedAt ? fmtDateTime(row.emailedAt) : '-'}</div>
                              {row.emailCount > 0 ? (
                                <div className="mt-1 text-xs text-gray-500">
                                  {row.emailCount} send · {row.humanViewCount}/{row.requestCount} open · C {row.callClicks} · W {row.whatsappClicks} · E {row.emailClicks}
                                </div>
                              ) : null}
                            </td>
                            <td className="px-4 py-4 text-gray-700">
                              {row.currentState ? (
                                <>
                                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${INVENTORY_WORKFLOW_TONES[row.currentState] ?? 'border-gray-200 bg-gray-50 text-gray-700'}`}>
                                    {formatInquiryInventoryWorkflowLabel(row.currentState)}
                                  </span>
                                  <div className="mt-1 text-xs text-gray-500">{row.currentStateAt ? fmtDateTime(row.currentStateAt) : '-'}</div>
                                </>
                              ) : (
                                <>
                                  <div className="font-medium text-gray-900">Not marked</div>
                                  <div className="text-xs text-gray-500">Only match/email history exists for this stock row.</div>
                                </>
                              )}
                            </td>
                            <td className="px-4 py-4 text-gray-700">
                              <div className="flex min-w-56 flex-col gap-2">
                                <select
                                  value={selectedState}
                                  onChange={event => {
                                    const value = event.target.value
                                    setWorkflowSelectionByInventoryId(prev => ({ ...prev, [row.inventoryId]: value }))
                                  }}
                                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none"
                                >
                                  <option value="">Select state</option>
                                  {INQUIRY_INVENTORY_WORKFLOW_OPTIONS.map(option => (
                                    <option key={option} value={option}>{formatInquiryInventoryWorkflowLabel(option)}</option>
                                  ))}
                                </select>
                                <Btn
                                  size="sm"
                                  onClick={() => saveWorkflowState(row.inventoryId, row.currentState)}
                                  disabled={
                                    isWorkflowPending
                                    || workflowInventoryId === row.inventoryId
                                    || !selectedState
                                    || selectedState === row.currentState
                                  }
                                >
                                  {isWorkflowPending && workflowInventoryId === row.inventoryId ? 'Saving...' : 'Save state'}
                                </Btn>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {tab === 'activity' ? (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Timeline</div>
              <button type="button" className="text-sm font-medium text-[#1B2A6B]" onClick={onLogFollowup}>Log activity</button>
            </div>
            {activityItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 px-5 py-8 text-center text-sm text-gray-500">No activity recorded yet.</div>
            ) : (
              <div className="space-y-5">
                {activityItems.map((item, index) => (
                  <div key={item.key} className="flex gap-4">
                    <div className="relative flex w-6 justify-center">
                      <span className={`mt-1 h-3.5 w-3.5 rounded-full border-2 ${item.tone === 'danger' ? 'border-red-700 bg-red-700' : item.tone === 'info' ? 'border-[#1B2A6B] bg-white' : item.tone === 'success' ? 'border-green-700 bg-green-700' : 'border-gray-300 bg-white'}`} />
                      {index < activityItems.length - 1 ? <span className="absolute top-5 bottom-[-24px] w-px bg-gray-200" /> : null}
                    </div>
                    <div className="pb-2">
                      <div className="text-sm text-gray-500">{fmtDateTime(item.at) || '-'}</div>
                      <div className="mt-1 text-2xl font-semibold text-gray-900">{item.title}</div>
                      <div className="mt-1 text-sm text-gray-600">{item.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {tab === 'record' ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Identifiers</div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Inquiry No</div>
                  <div className="mt-1 text-2xl font-mono text-gray-900">{currentInquiry.inquiryNo ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Inquiry ID</div>
                  <div className="mt-1 text-2xl font-mono text-gray-900">{currentInquiry.inquiryId}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Customer</div>
                  <div className="mt-1 text-xl text-gray-900">{currentInquiry.customer?.custName ?? currentInquiry.customerNameLegacy ?? '-'}{currentInquiry.customer?.custId ?? currentInquiry.customerId ? ` #${currentInquiry.customer?.custId ?? currentInquiry.customerId}` : ''}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Source</div>
                  <div className="mt-1 text-xl text-gray-900">{currentInquiry.website ?? '-'}{currentInquiry.sourceDetail ? ` (${currentInquiry.sourceDetail})` : ''}</div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Audit</div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Created</div>
                  <div className="mt-1 text-xl text-gray-900">{fmtDateTime(currentInquiry.createdDt) || '-'}</div>
                  <div className="mt-1 text-sm text-gray-500">{userOptionLabel(currentInquiry.createdByUser)}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Last Updated</div>
                  <div className="mt-1 text-xl text-gray-900">{fmtDateTime(currentInquiry.updatedDt) || '-'}</div>
                  <div className="mt-1 text-sm text-gray-500">{userOptionLabel(currentInquiry.updatedByUser)}</div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Email Attempts</div>
              {currentInquiry.inquiryEmailHistories && currentInquiry.inquiryEmailHistories.length > 0 ? (
                <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Recipient</th>
                        <th className="px-4 py-3">Vehicle</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Attempted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentInquiry.inquiryEmailHistories.map(item => {
                        const vehicle = item.inventoryManagement
                          ? [
                              clean(item.inventoryManagement.carVariantMaster?.carMakeMaster?.make) || clean(item.inventoryManagement.makeLegacy),
                              clean(item.inventoryManagement.carVariantMaster?.carModelMaster?.model) || clean(item.inventoryManagement.modelLegacy),
                              clean(item.inventoryManagement.carVariantMaster?.variant) || clean(item.inventoryManagement.variantLegacy),
                            ].filter(Boolean).join(' ') || item.inventoryManagement.inventoryNumber || `Inventory #${item.inventoryManagement.inventoryId}`
                          : null

                        return (
                          <tr key={item.inquiryEmailHistoryId} className="border-t border-gray-200 align-top">
                            <td className="px-4 py-4 text-gray-700">
                              <div className="font-medium text-gray-900">{formatEmailTypeLabel(item.emailType)}</div>
                              <div className="break-all text-xs text-gray-500">{item.emailSubject}</div>
                            </td>
                            <td className="px-4 py-4 text-gray-700">
                              <div className="break-all font-medium text-gray-900">{item.recipientEmail}</div>
                              <div>{item.recipientName ?? '-'}</div>
                            </td>
                            <td className="px-4 py-4 text-gray-700">
                              {vehicle ? (
                                <>
                                  <div className="font-medium text-gray-900">{vehicle}{item.inventoryManagement?.year ? ` · ${item.inventoryManagement.year}` : ''}</div>
                                  <div>{item.inventoryManagement?.inventoryNumber ?? '-'}</div>
                                  <div>{item.inventoryManagement?.registrationNo ?? '-'}</div>
                                </>
                              ) : (
                                <div>-</div>
                              )}
                            </td>
                            <td className="px-4 py-4 text-gray-700">
                              <div className="font-medium text-gray-900">{item.deliveryStatus}</div>
                              {item.errorMessage ? <div className="mt-1 break-words text-xs text-red-600">{item.errorMessage}</div> : null}
                            </td>
                            <td className="px-4 py-4 text-gray-700">
                              <div className="font-medium text-gray-900">{fmtDateTime(item.sentAt ?? item.createdAt) || '-'}</div>
                              <div className="text-xs text-gray-500">{item.attemptedByUser ? userOptionLabel(item.attemptedByUser) : '-'}</div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="mt-4 text-sm text-gray-500">No email attempts recorded yet.</div>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Event Log</div>
              {currentInquiry.inquiryActivityEvents && currentInquiry.inquiryActivityEvents.length > 0 ? (
                <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <th className="px-4 py-3">When</th>
                        <th className="px-4 py-3">Event</th>
                        <th className="px-4 py-3">Detail</th>
                        <th className="px-4 py-3">By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentInquiry.inquiryActivityEvents.map(item => (
                        <tr key={item.inquiryActivityLogId} className="border-t border-gray-200 align-top">
                          <td className="px-4 py-4 text-gray-700">
                            <div className="font-medium text-gray-900">{fmtDateTime(item.createdAt) || '-'}</div>
                            <div className="text-xs text-gray-500">{item.eventType}</div>
                          </td>
                          <td className="px-4 py-4 text-gray-700">
                            <div className="font-medium text-gray-900">{item.eventLabel ?? item.eventType}</div>
                            {item.inventoryId ? <div className="text-xs text-gray-500">Inventory #{item.inventoryId}</div> : null}
                            {item.followupId ? <div className="text-xs text-gray-500">Follow-up #{item.followupId}</div> : null}
                          </td>
                          <td className="px-4 py-4 text-gray-700">{item.eventDetail ?? '-'}</td>
                          <td className="px-4 py-4 text-gray-700">
                            <div className="font-medium text-gray-900">{item.actorUserName ?? '-'}</div>
                            <div className="text-xs text-gray-500">{item.actorUserId ? `User #${item.actorUserId}` : 'System'}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="mt-4 text-sm text-gray-500">No audit events recorded yet.</div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-6 py-4">
        <div className="text-sm text-gray-500">
          {currentInquiry.updatedDt && currentInquiry.createdDt && new Date(currentInquiry.updatedDt).getTime() !== new Date(currentInquiry.createdDt).getTime()
            ? `Updated ${fmtDateTime(currentInquiry.updatedDt)}`
            : 'Never edited since creation'}
        </div>
        <div className="flex gap-3">
          <Btn variant="outline" onClick={onClose}>Close</Btn>
          <Btn onClick={onLogFollowup}>Log follow-up</Btn>
        </div>
      </div>
    </div>
  )
}
