'use client'

import { useState } from 'react'
import { Badge, Btn } from '@/components/ui'

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

type InquiryDetailData = {
  inquiryId: number
  inquiryNo: string | null
  dateOfInquiry: Date | string | null
  website: string | null
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
  inquiryInventoryLinks?: InquiryDetailInventoryLink[]
  vehicleEmailLinks?: InquiryDetailVehicleEmailLink[]
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

function userOptionLabel(user?: InquiryDetailData['assignedToUser'] | InquiryDetailData['createdByUser'] | null) {
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
      emailCount: 0,
      humanViewCount: 0,
      requestCount: 0,
      callClicks: 0,
      whatsappClicks: 0,
      emailClicks: 0,
    }

    if (link.linkType.toLowerCase() === 'matched' && !next.matchedAt) next.matchedAt = link.createdAt
    if (link.linkType.toLowerCase() === 'emailed' && !next.emailedAt) next.emailedAt = link.createdAt
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
    const aTime = a.emailedAt ? new Date(a.emailedAt).getTime() : a.matchedAt ? new Date(a.matchedAt).getTime() : 0
    const bTime = b.emailedAt ? new Date(b.emailedAt).getTime() : b.matchedAt ? new Date(b.matchedAt).getTime() : 0
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
}: {
  inquiry: InquiryDetailData
  onClose: () => void
  onEdit: () => void
  onLogFollowup: () => void
  onOpenMatch?: () => void
}) {
  const [tab, setTab] = useState<'overview' | 'requirement' | 'activity' | 'record'>('overview')
  const historyRows = buildVehicleHistoryRows(inquiry.inquiryInventoryLinks, inquiry.vehicleEmailLinks)
  const activityItems = buildInquiryActivityItems(inquiry)
  const overdueDays = inquiry.followUpDate && inquiry.status === 'FollowUp'
    ? Math.floor((new Date(new Date().toDateString()).getTime() - new Date(new Date(inquiry.followUpDate).toDateString()).getTime()) / (1000 * 60 * 60 * 24))
    : null
  const followupOverdue = overdueDays !== null && overdueDays > 0
  const vehicleSummary = summarizeInquiryVehicles(inquiry.inquiryCarDetails)

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">{inquiry.inquiryNo ?? `Inquiry/${inquiry.inquiryId}`}</span>
            {inquiry.website ? <span className="rounded-md bg-blue-50 px-3 py-1 text-sm font-medium text-[#1B2A6B]">{inquiry.website}</span> : null}
          </div>
          <h2 className="mt-3 text-3xl font-bold text-gray-900">{inquiry.customer?.custName ?? inquiry.customerNameLegacy ?? 'Unnamed inquiry'}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <span>Customer #{inquiry.customer?.custId ?? inquiry.customerId ?? '-'}</span>
            <span>·</span>
            <span>Raised {fmtDate(inquiry.dateOfInquiry) || '-'}</span>
            <span>·</span>
            <span>Inquiry #{inquiry.inquiryId}</span>
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 lg:items-end">
          <div className="flex flex-wrap items-center gap-2">
            {inquiry.classification ? <Badge label={inquiry.classification} /> : null}
            {inquiry.status ? <Badge label={inquiry.status} /> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn variant="outline" onClick={onEdit}>Edit</Btn>
            <Btn onClick={onLogFollowup}>Log follow-up</Btn>
          </div>
        </div>
      </div>

      {followupOverdue ? (
        <div className="flex flex-col gap-3 border-t border-red-100 bg-red-50 px-6 py-4 text-sm text-red-700 md:flex-row md:items-center md:justify-between">
          <div className="font-medium">Follow-up was due on {fmtDate(inquiry.followUpDate)} and is overdue by {overdueDays} day{overdueDays === 1 ? '' : 's'}.</div>
          <div className="flex gap-2">
            <Btn variant="outline" onClick={onEdit}>Reschedule</Btn>
            <Btn onClick={onLogFollowup}>Mark done</Btn>
          </div>
        </div>
      ) : null}

      <div className="grid gap-0 border-t border-gray-100 md:grid-cols-2 xl:grid-cols-4">
        <div className="border-r border-gray-100 px-6 py-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Assigned To</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">{userOptionLabel(inquiry.assignedToUser)}</div>
        </div>
        <div className="border-r border-gray-100 px-6 py-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Budget</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">{fmtMoney(inquiry.budgetOfCustomer)}</div>
        </div>
        <div className="border-r border-gray-100 px-6 py-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Vehicles Wanted</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">{inquiry.inquiryCarDetails.length}</div>
          <div className="mt-1 text-sm text-gray-500">{vehicleSummary}</div>
        </div>
        <div className="px-6 py-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Showroom Visit</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">{fmtDate(inquiry.visitedDateOfCustomer) || 'Not visited'}</div>
        </div>
      </div>

      <div className="border-t border-gray-100 px-6">
        <div className="flex flex-wrap gap-6">
          {[
            ['overview', 'Overview'],
            ['requirement', `Requirement${inquiry.inquiryCarDetails.length ? ` (${inquiry.inquiryCarDetails.length})` : ''}`],
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
                  {(inquiry.customer?.custId ?? inquiry.customerId) ? <div className="text-sm font-medium text-[#1B2A6B]">Customer #{inquiry.customer?.custId ?? inquiry.customerId}</div> : null}
                </div>
                <div className="mt-4 space-y-4 text-sm text-gray-700">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Mobile</div>
                    <div className="mt-1 text-xl font-semibold text-gray-900">{inquiry.customer?.custMobile ?? inquiry.mobileno ?? '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">WhatsApp</div>
                    <div className="mt-1 text-base text-gray-900">{inquiry.customer?.custMobile ?? inquiry.mobileno ? 'Send listings' : '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Email</div>
                    <div className="mt-1 text-base break-all text-gray-900">{inquiry.customer?.custEmail ?? inquiry.email ?? '-'}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Requirement</div>
                  <button type="button" className="text-sm font-medium text-[#1B2A6B]" onClick={() => setTab('requirement')}>Open requirement</button>
                </div>
                {inquiry.inquiryCarDetails.length === 0 ? (
                  <div className="mt-4 text-sm text-gray-500">No vehicle requirement captured.</div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {inquiry.inquiryCarDetails.map((car, index) => (
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
              <div className="mt-4 whitespace-pre-wrap text-sm text-gray-700">{inquiry.remark?.trim() ? inquiry.remark : 'No remarks recorded yet.'}</div>
            </div>
          </div>
        ) : null}

        {tab === 'requirement' ? (
          <div className="space-y-5">
            <div>
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Cars this customer is looking for</div>
              {inquiry.inquiryCarDetails.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 px-5 py-8 text-center text-sm text-gray-500">No vehicle requirement captured.</div>
              ) : (
                <div className="space-y-3">
                  {inquiry.inquiryCarDetails.map((car, index) => (
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
                      </tr>
                    </thead>
                    <tbody>
                      {historyRows.map(row => (
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
                        </tr>
                      ))}
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
                  <div className="mt-1 text-2xl font-mono text-gray-900">{inquiry.inquiryNo ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Inquiry ID</div>
                  <div className="mt-1 text-2xl font-mono text-gray-900">{inquiry.inquiryId}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Customer</div>
                  <div className="mt-1 text-xl text-gray-900">{inquiry.customer?.custName ?? inquiry.customerNameLegacy ?? '-'}{inquiry.customer?.custId ?? inquiry.customerId ? ` #${inquiry.customer?.custId ?? inquiry.customerId}` : ''}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Source</div>
                  <div className="mt-1 text-xl text-gray-900">{inquiry.website ?? '-'}</div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Audit</div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Created</div>
                  <div className="mt-1 text-xl text-gray-900">{fmtDateTime(inquiry.createdDt) || '-'}</div>
                  <div className="mt-1 text-sm text-gray-500">{userOptionLabel(inquiry.createdByUser)}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Last Updated</div>
                  <div className="mt-1 text-xl text-gray-900">{fmtDateTime(inquiry.updatedDt) || '-'}</div>
                  <div className="mt-1 text-sm text-gray-500">{userOptionLabel(inquiry.updatedByUser)}</div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-6 py-4">
        <div className="text-sm text-gray-500">
          {inquiry.updatedDt && inquiry.createdDt && new Date(inquiry.updatedDt).getTime() !== new Date(inquiry.createdDt).getTime()
            ? `Updated ${fmtDateTime(inquiry.updatedDt)}`
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
