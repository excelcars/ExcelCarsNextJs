'use server'

import { WHATSAPP_SENDING_ENABLED } from '@/lib/whatsapp/sendingPolicy.mjs'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { auth } from '../../../auth'
import { getAuthorizedUserIdForRoute } from '@/lib/access/accessControl'
import { canAccessInquiryByOwnership } from '@/lib/access/inquiryOwnership'
import { normalizeInquiryCarYear, requiresInquiryFollowupDate, validateInquiryFormInput } from '@/lib/inquiryFollowupValidation'
import { sendEmail } from '@/lib/email/sendMail'
import { noInventoryEnquiryEmail, vehicleDetailsEmail } from '@/lib/email/templates'
import { buildTrackedVehicleUrl, buildVehicleSlug, generateVehicleEmailToken } from '@/lib/vehicleEmailLinks'
import { getEnquiryWhatsAppTemplateName, getNoInventoryWhatsAppTemplateName, normalizeWhatsAppRecipient, sendEnquiryTemplate, sendNoInventoryEnquiryTemplate } from '@/lib/whatsapp/meta'
import { getInquiryActivityEvents, logInquiryEvent } from './eventLog'
import { archiveFollowupNotifications, createUserNotification } from '@/features/notifications/service'
import { INQUIRY_INVENTORY_WORKFLOW_OPTIONS, type InquiryInventoryWorkflowType } from './workflow'
import { ensureInquirySourceMasterSeed } from './sourceMaster.server'
import { ensureInquiryLocationMasterSeed } from './locationMaster.server'
import { rememberPartnerVehicleMapping, PartnerVehicleMappingError } from './partnerVehicleMapping.server'

export interface InquiryFormInput {
  inquiryNo: string
  dateOfInquiry: string
  website: string
  sourceCode: string
  sourceDetail: string
  locationId: number | null
  location: string
  customerId: number | null
  customerNameLegacy: string
  mobileno: string
  email: string
  budgetOfCustomer: number | null
  visitedDateOfCustomer: string
  classification: string
  status: string
  subStatus: string
  followUpDate: string
  remark: string
  inquiryCars: InquiryCarInput[]
  rememberPartnerVehicleMappings?: boolean
}

export interface InquiryCarInput {
  inquiryCarDetailsId?: number | null
  selectedMakeId?: number | null
  selectedModelId?: number | null
  fkVariantId: number | null
  subVariant: string
  carYear: number | null
  noOfOwners: number | null
}

export interface ActionResult {
  success: boolean
  error?: string
  message?: string
}

export interface AssignInquiryInput {
  inquiryId: number
  assignedToUserId: number | null
}

export interface CreateInquiryOptions {
  sendMatchingInventoryOnCreate?: boolean
}

type NotificationAttemptResult = {
  status: 'submitted' | 'failed' | 'skipped'
  error?: string
}

async function createTrackedVehicleEmailLink({
  inventoryId,
  inquiryId,
  customerId,
  recipientEmail,
  recipientName,
  slug,
}: {
  inventoryId: number
  inquiryId?: number | null
  customerId: number | null
  recipientEmail: string
  recipientName: string
  slug: string
}) {
  const { rawToken, tokenHash } = generateVehicleEmailToken()
  const row = await prisma.vehicleEmailLink.create({
    data: {
      inventoryManagement: { connect: { inventoryId } },
      ...(customerId ? { customer: { connect: { custId: customerId } } } : {}),
      recipientEmail,
      recipientName: recipientName || null,
      tokenHash,
      emailSentAt: new Date(),
      isActive: true,
    },
  })

  if (inquiryId) {
    await prisma.$executeRaw`
      UPDATE "vehicle_email_links"
      SET "inquiry_id" = ${inquiryId}
      WHERE "vehicle_email_link_id" = ${row.vehicleEmailLinkId}
    `
  }

  return {
    vehicleEmailLinkId: row.vehicleEmailLinkId,
    url: buildTrackedVehicleUrl(slug, rawToken),
  }
}

async function currentUserId(route = '/inquiry'): Promise<number | null> {
  return getAuthorizedUserIdForRoute(route)
}

function toDate(v: string): Date | null {
  return v ? new Date(v) : null
}

function normalizeMobile(value: string | null | undefined) {
  const digits = (value ?? '').replace(/\D/g, '')
  if (!digits) return ''
  return digits.length > 10 ? digits.slice(-10) : digits
}

async function findCustomerByNormalizedMobile(mobile: string) {
  const normalizedMobile = normalizeMobile(mobile)
  if (!normalizedMobile) return null

  const rows = await prisma.$queryRaw<Array<{ cust_id: number }>>(Prisma.sql`
    SELECT cust_id
    FROM customer
    WHERE RIGHT(regexp_replace(COALESCE(cust_mobile, ''), '\D', '', 'g'), 10) = ${normalizedMobile}
    ORDER BY cust_id DESC
    LIMIT 1
  `)

  if (rows.length === 0) return null

  return prisma.customer.findUnique({
    where: { custId: rows[0].cust_id },
    select: {
      custId: true,
      custName: true,
      custMobile: true,
      custEmail: true,
    },
  })
}

async function resolveInquiryContact(input: InquiryFormInput) {
  if (!input.customerId) {
    const trimmedName = input.customerNameLegacy.trim()
    const trimmedMobile = input.mobileno.trim()
    const trimmedEmail = input.email.trim()
    const userId = await currentUserId()

    if (!trimmedName) {
      return {
        customerId: null,
        customerNameLegacy: null,
        mobileno: trimmedMobile || null,
        email: trimmedEmail || null,
        error: null,
      }
    }

    const existingByMobile = trimmedMobile ? await findCustomerByNormalizedMobile(trimmedMobile) : null
    if (existingByMobile) {
      const normalizedExistingMobile = normalizeMobile(existingByMobile.custMobile)
      const normalizedIncomingMobile = normalizeMobile(trimmedMobile)

      if (
        userId
        && (
          (!existingByMobile.custEmail && trimmedEmail)
          || (!normalizedExistingMobile && normalizedIncomingMobile)
        )
      ) {
        await prisma.customer.update({
          where: { custId: existingByMobile.custId },
          data: {
            ...(trimmedEmail && !existingByMobile.custEmail ? { custEmail: trimmedEmail } : {}),
            ...(normalizedIncomingMobile && !normalizedExistingMobile ? { custMobile: trimmedMobile } : {}),
            updatedDt: new Date(),
            updatedByUser: { connect: { userId } },
          },
        })
      }

      return {
        customerId: existingByMobile.custId,
        customerNameLegacy: existingByMobile.custName?.trim() || trimmedName || null,
        mobileno: existingByMobile.custMobile?.trim() || trimmedMobile || null,
        email: existingByMobile.custEmail?.trim() || trimmedEmail || null,
        error: null,
      }
    }

    if (!userId) {
      return {
        customerId: null,
        customerNameLegacy: trimmedName || null,
        mobileno: trimmedMobile || null,
        email: trimmedEmail || null,
        error: null,
      }
    }

    const createdCustomer = await prisma.customer.create({
      data: {
        type: 'Customer',
        custName: trimmedName,
        custMobile: trimmedMobile || null,
        custEmail: trimmedEmail || null,
        comments: 'Auto-created from inquiry save',
        createdDt: new Date(),
        updatedDt: new Date(),
        createdByUser: { connect: { userId } },
        updatedByUser: { connect: { userId } },
      },
      select: {
        custId: true,
        custName: true,
        custMobile: true,
        custEmail: true,
      },
    })

    return {
      customerId: createdCustomer.custId,
      customerNameLegacy: createdCustomer.custName?.trim() || trimmedName || null,
      mobileno: createdCustomer.custMobile?.trim() || trimmedMobile || null,
      email: createdCustomer.custEmail?.trim() || trimmedEmail || null,
      error: null,
    }
  }

  const customer = await prisma.customer.findUnique({
    where: { custId: input.customerId },
    select: {
      custId: true,
      custName: true,
      custMobile: true,
      custEmail: true,
    },
  })

  if (!customer) {
    return {
      customerId: null,
      customerNameLegacy: null,
      mobileno: null,
      email: null,
      error: 'Selected customer was not found.',
    }
  }

  return {
    customerId: customer.custId,
    customerNameLegacy: customer.custName?.trim() || null,
    mobileno: customer.custMobile?.trim() || null,
    email: customer.custEmail?.trim() || null,
    error: null,
  }
}

function hasMeaningfulInquiryCar(input: InquiryCarInput) {
  return Boolean(input.fkVariantId || input.subVariant.trim() || input.carYear || input.noOfOwners !== null)
}

async function resolveInquiryCarDetail(input: InquiryCarInput) {
  if (!input.fkVariantId) {
    return {
      fkVariantId: null,
      makeLegacy: null,
      modelLegacy: null,
      variantLegacy: null,
      subVariant: input.subVariant.trim() || null,
      year: normalizeInquiryCarYear(input.carYear),
      noOfOwners: input.noOfOwners,
    }
  }

  const variant = await prisma.carVariantMaster.findUnique({
    where: { pkVariantId: input.fkVariantId },
    include: {
      carMakeMaster: true,
      carModelMaster: true,
    },
  })

  if (!variant) {
    return {
      fkVariantId: input.fkVariantId,
      makeLegacy: null,
      modelLegacy: null,
      variantLegacy: null,
      subVariant: input.subVariant.trim() || null,
      year: normalizeInquiryCarYear(input.carYear),
      noOfOwners: input.noOfOwners,
    }
  }

  return {
    fkVariantId: input.fkVariantId,
    makeLegacy: variant.carMakeMaster?.make?.trim() || null,
    modelLegacy: variant.carModelMaster?.model?.trim() || null,
    variantLegacy: variant.variant?.trim() || null,
    subVariant: input.subVariant.trim() || null,
    year: normalizeInquiryCarYear(input.carYear),
    noOfOwners: input.noOfOwners,
  }
}

async function resolveInquirySource(input: InquiryFormInput) {
  const code = input.sourceCode.trim()
  if (!code) return { source: null, error: 'Select a source before saving the inquiry.' }

  await ensureInquirySourceMasterSeed()
  const source = await prisma.inquirySourceMaster.findUnique({
    where: { code },
    select: { sourceId: true, code: true, displayName: true, requiresDetail: true, isActive: true },
  })

  if (!source || !source.isActive) return { source: null, error: 'Select an active source before saving the inquiry.' }
  if (source.requiresDetail && !input.sourceDetail.trim()) {
    return { source: null, error: `${source.displayName} detail is required.` }
  }

  return { source, error: null }
}

async function resolveInquiryLocation(input: InquiryFormInput) {
  if (!input.locationId) return { location: null, error: null }
  await ensureInquiryLocationMasterSeed()
  const location = await prisma.inquiryLocationMaster.findUnique({
    where: { locationId: input.locationId },
    select: { locationId: true, displayName: true, region: true, isActive: true },
  })
  if (!location || !location.isActive) return { location: null, error: 'Select an active reporting location before saving the inquiry.' }
  return { location, error: null }
}

function buildInquiryData(
  input: InquiryFormInput,
  resolvedContact: Awaited<ReturnType<typeof resolveInquiryContact>>,
  source: NonNullable<Awaited<ReturnType<typeof resolveInquirySource>>['source']>,
  location: Awaited<ReturnType<typeof resolveInquiryLocation>>['location'],
) {
  const normalizedStatus = normalizeOptionalText(input.status)
  return {
    inquiryNo: input.inquiryNo || null,
    dateOfInquiry: toDate(input.dateOfInquiry),
    website: source.displayName,
    source: { connect: { sourceId: source.sourceId } },
    sourceDetail: normalizeOptionalText(input.sourceDetail),
    ...(location ? { reportingLocation: { connect: { locationId: location.locationId } } } : {}),
    location: normalizeOptionalText(input.location),
    customerNameLegacy: resolvedContact.customerNameLegacy,
    mobileno: resolvedContact.mobileno,
    email: resolvedContact.email,
    budgetOfCustomer: input.budgetOfCustomer === 0 ? null : input.budgetOfCustomer,
    visitedDateOfCustomer: toDate(input.visitedDateOfCustomer),
    classification: input.classification || null,
    status: normalizedStatus,
    subStatus: input.subStatus || null,
    followUpDate: requiresInquiryFollowupDate(normalizedStatus) ? toDate(input.followUpDate) : null,
    remark: input.remark || null,
  }
}

function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function normalizeOptionalDate(value: string | Date | null | undefined) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

function summarizeInquiryCarForLog(car: {
  makeLegacy: string | null
  modelLegacy: string | null
  variantLegacy: string | null
  subVariant: string | null
  year: number | null
  noOfOwners?: number | null
}) {
  const parts = [
    normalizeOptionalText(car.makeLegacy),
    normalizeOptionalText(car.modelLegacy),
    normalizeOptionalText(car.variantLegacy),
    normalizeOptionalText(car.subVariant),
  ].filter(Boolean)

  return `${parts.join(' ')}${car.year ? ` · ${car.year}` : ''}${car.noOfOwners !== null && car.noOfOwners !== undefined ? ` · ${car.noOfOwners} owner${car.noOfOwners === 1 ? '' : 's'}` : ''}`.trim() || 'Vehicle requirement'
}

function summarizeFollowupLog(input: {
  status: string
  subStatus: string
  classification: string
  followUpDate: string
  remark: string
}) {
  return [
    normalizeOptionalText(input.status) ? `Status ${normalizeOptionalText(input.status)}` : '',
    normalizeOptionalText(input.subStatus) ? `Sub-status ${normalizeOptionalText(input.subStatus)}` : '',
    normalizeOptionalText(input.classification) ? `Class ${normalizeOptionalText(input.classification)}` : '',
    normalizeOptionalText(input.followUpDate) ? `Next ${normalizeOptionalText(input.followUpDate)}` : '',
    normalizeOptionalText(input.remark) ? normalizeOptionalText(input.remark) : '',
  ].filter(Boolean).join(' · ')
}

function toPlainActionPayload<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, (_key, currentValue) => {
    if (typeof currentValue === 'bigint') {
      return currentValue.toString()
    }
    return currentValue
  })) as T
}

function hasMeaningfulFollowupState(input: InquiryFormInput) {
  const normalizedStatus = normalizeOptionalText(input.status)
  const normalizedClassification = normalizeOptionalText(input.classification)
  return Boolean(
    (normalizedStatus && normalizedStatus !== 'Open')
    || normalizeOptionalText(input.subStatus)
    || (normalizedClassification && normalizedClassification !== 'Warm')
    || normalizeOptionalText(input.remark)
    || normalizeOptionalDate(input.followUpDate),
  )
}

function hasFollowupStateChanged(
  previous: {
    status: string | null
    subStatus: string | null
    classification: string | null
    remark: string | null
    followUpDate: Date | null
  },
  next: InquiryFormInput,
) {
  return normalizeOptionalText(previous.status) !== normalizeOptionalText(next.status)
    || normalizeOptionalText(previous.subStatus) !== normalizeOptionalText(next.subStatus)
    || normalizeOptionalText(previous.classification) !== normalizeOptionalText(next.classification)
    || normalizeOptionalText(previous.remark) !== normalizeOptionalText(next.remark)
    || normalizeOptionalDate(previous.followUpDate) !== normalizeOptionalDate(next.followUpDate)
}

async function appendInquiryFollowupHistory({
  inquiryId,
  input,
  userId,
  now,
}: {
  inquiryId: number
  input: InquiryFormInput
  userId: number | null
  now: Date
}) {
  const selectedFollowupDate = toDate(input.followUpDate)
  const followup = await prisma.followupInquiry.create({
    data: {
      fkInquiryId: inquiryId,
      followupDate: requiresInquiryFollowupDate(input.status) ? selectedFollowupDate : null,
      followupStatus: normalizeOptionalText(input.status),
      followupSubStatus: normalizeOptionalText(input.subStatus),
      followupClassification: normalizeOptionalText(input.classification),
      comments: normalizeOptionalText(input.remark),
      createdDt: now,
      updatedDt: now,
      ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
    },
  })

  await logInquiryEvent(prisma, {
    inquiryId,
    eventType: 'followup_recorded',
    eventLabel: 'Follow-up recorded',
    eventDetail: summarizeFollowupLog(input),
    actorUserId: userId,
    followupId: followup.pkFollowupId,
    createdAt: now,
  })
}

async function createInquiryInventoryLinks({
  inquiryId,
  inventoryIds,
  linkType,
  userId,
}: {
  inquiryId: number
  inventoryIds: number[]
  linkType: string
  userId: number | null
}) {
  const uniqueInventoryIds = [...new Set(inventoryIds.filter(id => Number.isFinite(id) && id > 0))]
  if (uniqueInventoryIds.length === 0) return

  const now = new Date()
  await prisma.inquiryInventoryLink.createMany({
    data: uniqueInventoryIds.map(inventoryId => ({
      inquiryId,
      inventoryId,
      linkType,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
    })),
  })

  for (const inventoryId of uniqueInventoryIds) {
    await logInquiryEvent(prisma, {
      inquiryId,
      eventType: 'inventory_linked',
      eventLabel: `Inventory ${linkType}`,
      eventDetail: `Inventory #${inventoryId} marked as ${linkType}.`,
      actorUserId: userId,
      inventoryId,
      createdAt: now,
    })
  }
}

function isSupportedInquiryInventoryWorkflowType(value: string): value is InquiryInventoryWorkflowType {
  return INQUIRY_INVENTORY_WORKFLOW_OPTIONS.includes(value as InquiryInventoryWorkflowType)
}

async function getInquiryTrackedVehicleEmailHistory(inquiryId: number) {
  const links = await prisma.$queryRaw<Array<{
    vehicle_email_link_id: number
    inventory_id: number
    recipient_email: string
    recipient_name: string | null
    email_sent_at: Date | null
    created_at: Date
    expires_at: Date | null
    first_requested_at: Date | null
    first_human_view_at: Date | null
    last_requested_at: Date | null
    request_count: number | null
    human_view_count: number | null
    is_active: boolean
  }>>(Prisma.sql`
    SELECT
      "vehicle_email_link_id",
      "inventory_id",
      "recipient_email",
      "recipient_name",
      "email_sent_at",
      "created_at",
      "expires_at",
      "first_requested_at",
      "first_human_view_at",
      "last_requested_at",
      "request_count",
      "human_view_count",
      "is_active"
    FROM "vehicle_email_links"
    WHERE "inquiry_id" = ${inquiryId}
    ORDER BY "email_sent_at" DESC NULLS LAST, "vehicle_email_link_id" DESC
  `)

  if (links.length === 0) return []

  const vehicleEmailLinkIds = links.map(link => link.vehicle_email_link_id)
  const inventoryIds = [...new Set(links.map(link => link.inventory_id).filter(id => Number.isFinite(id) && id > 0))]

  const [inventories, visits, interactions] = await Promise.all([
    prisma.inventoryManagement.findMany({
      where: { inventoryId: { in: inventoryIds } },
      include: {
        carVariantMaster: {
          include: { carMakeMaster: true, carModelMaster: true },
        },
      },
    }),
    prisma.vehicleEmailLinkVisit.findMany({
      where: { vehicleEmailLinkId: { in: vehicleEmailLinkIds } },
      orderBy: [{ visitedAt: 'desc' }, { vehicleEmailLinkVisitId: 'desc' }],
      select: {
        vehicleEmailLinkVisitId: true,
        vehicleEmailLinkId: true,
        visitedAt: true,
        visitKind: true,
      },
    }),
    prisma.vehicleEmailLinkInteraction.findMany({
      where: { vehicleEmailLinkId: { in: vehicleEmailLinkIds } },
      orderBy: [{ interactionAt: 'desc' }, { vehicleEmailLinkInteractionId: 'desc' }],
      select: {
        vehicleEmailLinkInteractionId: true,
        vehicleEmailLinkId: true,
        interactionAt: true,
        interactionType: true,
        interactionLabel: true,
      },
    }),
  ])

  const inventoryById = new Map(inventories.map(inventory => [inventory.inventoryId, inventory]))
  const visitsByLinkId = new Map<number, typeof visits>()
  const interactionsByLinkId = new Map<number, typeof interactions>()

  for (const visit of visits) {
    const group = visitsByLinkId.get(visit.vehicleEmailLinkId) ?? []
    group.push(visit)
    visitsByLinkId.set(visit.vehicleEmailLinkId, group)
  }

  for (const interaction of interactions) {
    const group = interactionsByLinkId.get(interaction.vehicleEmailLinkId) ?? []
    group.push(interaction)
    interactionsByLinkId.set(interaction.vehicleEmailLinkId, group)
  }

  const payload = links.map(link => {
    const inventory = inventoryById.get(link.inventory_id)
    return {
      vehicleEmailLinkId: link.vehicle_email_link_id,
      recipientEmail: link.recipient_email,
      recipientName: link.recipient_name,
      emailSentAt: link.email_sent_at,
      createdAt: link.created_at,
      expiresAt: link.expires_at,
      firstRequestedAt: link.first_requested_at,
      firstHumanViewAt: link.first_human_view_at,
      lastRequestedAt: link.last_requested_at,
      requestCount: link.request_count ?? 0,
      humanViewCount: link.human_view_count ?? 0,
      isActive: link.is_active,
      inventoryManagement: inventory ? {
        ...inventory,
        kmsDriven: inventory.kmsDriven ? inventory.kmsDriven.toString() : null,
        price: inventory.price ? inventory.price.toString() : null,
      } : {
        inventoryId: link.inventory_id,
        inventoryNumber: null,
        makeLegacy: null,
        modelLegacy: null,
        variantLegacy: null,
        colour: null,
        sku: null,
        year: null,
        month: null,
        fuelType: null,
        noOfOwners: null,
        tax: null,
        isCarRegistered: null,
        registrationNo: null,
        kmsDriven: null,
        insuranceType: null,
        price: null,
        otherRemarks: null,
        status: null,
        ownedType: null,
        ownedBy: null,
        mobileNoOwnedBy: null,
        emailIdOwnedBy: null,
        customerId: null,
        customerName: null,
        internalComments: null,
        createdDate: null,
        createdBy: null,
        updatedDate: null,
        updatedBy: null,
        fkVariantId: null,
        carVariantMaster: null,
      },
      visits: visitsByLinkId.get(link.vehicle_email_link_id) ?? [],
      interactions: interactionsByLinkId.get(link.vehicle_email_link_id) ?? [],
    }
  })

  return toPlainActionPayload(payload)
}

async function resolveInquiryCarDetails(input: InquiryFormInput) {
  const meaningfulCars = input.inquiryCars.filter(hasMeaningfulInquiryCar)
  return Promise.all(meaningfulCars.map(resolveInquiryCarDetail))
}

async function sendInquiryCarEmail(inquiryId: number): Promise<ActionResult> {
  const session = await auth()
  const attemptedBy = session?.user?.id ? Number(session.user.id) : null

  const inquiry = await prisma.inquiry.findUnique({
    where: { inquiryId },
    include: {
      customer: true,
      inquiryCarDetails: {
        include: { carVariantMaster: { include: { carMakeMaster: true, carModelMaster: true } } },
        orderBy: [{ updatedDt: 'desc' }, { inquiryCarDetailsId: 'desc' }],
      },
    },
  })
  if (!inquiry) return { success: false, error: 'Inquiry not found.' }

  const toEmail = inquiry.customer?.custEmail || inquiry.email
  const toName = inquiry.customer?.custName || inquiry.customerNameLegacy || 'there'
  if (!toEmail) return { success: false, error: 'This inquiry has no customer email on file.' }

  const car = inquiry.inquiryCarDetails[0]
  if (!car) return { success: false, error: 'This inquiry has no car of interest selected.' }

  const { subject, html } = vehicleDetailsEmail({
    customerName: toName,
    make: car.carVariantMaster?.carMakeMaster?.make ?? car.makeLegacy ?? '',
    model: car.carVariantMaster?.carModelMaster?.model ?? car.modelLegacy ?? '',
    variant: car.carVariantMaster?.variant ?? car.variantLegacy ?? '',
    year: car.year,
    colour: '',
    fuelType: '',
    noOfOwners: null,
    registrationNo: '',
    kmsDriven: null,
    price: null,
    remarks: '',
    signedBy: 'Excel Cars Team',
  })

  const result = await sendEmail({ to: toEmail, subject, html })

  await prisma.inquiryEmailHistory.create({
    data: {
      inquiryId,
      emailType: 'generic_inquiry',
      recipientEmail: toEmail,
      recipientName: toName,
      emailSubject: subject,
      deliveryStatus: result.success ? 'Sent' : 'Failed',
      errorMessage: result.success ? null : (result.error ?? 'Failed to send email.').slice(0, 1000),
      sentAt: result.success ? new Date() : null,
      attemptedBy,
    },
  }).catch(() => undefined)

  if (result.success) {
    await logInquiryEvent(prisma, {
      inquiryId,
      eventType: 'inquiry_email_sent',
      eventLabel: 'Inquiry email sent',
      eventDetail: `Sent to ${toEmail}.`,
      actorUserId: attemptedBy,
      createdAt: new Date(),
    }).catch(() => undefined)
  }

  return result
}

export async function sendInquiryEmail(inquiryId: number): Promise<ActionResult> {
  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }
  return sendInquiryCarEmail(inquiryId)
}

async function getInquiryRecipient(inquiryId: number) {
  const inquiry = await prisma.inquiry.findUnique({
    where: { inquiryId },
    include: { customer: true },
  })
  if (!inquiry) {
    return { error: 'Inquiry not found.' } as const
  }

  const toEmail = inquiry.customer?.custEmail || inquiry.email
  const toName = inquiry.customer?.custName || inquiry.customerNameLegacy || 'there'
  if (!toEmail) {
    return { error: 'This inquiry has no customer email on file.' } as const
  }

  return {
    inquiry,
    toEmail,
    toName,
  } as const
}

async function sendMatchedInventoryEmailToInquiryRecipient({
  inquiryId,
  inventoryId,
  signedBy,
  userId,
}: {
  inquiryId: number
  inventoryId: number
  signedBy: string
  userId: number | null
}): Promise<ActionResult> {
  const [recipient, inventory] = await Promise.all([
    getInquiryRecipient(inquiryId),
    prisma.inventoryManagement.findUnique({
      where: { inventoryId },
      include: {
        carVariantMaster: {
          include: { carMakeMaster: true, carModelMaster: true },
        },
      },
    }),
  ])

  if ('error' in recipient) return { success: false, error: recipient.error }
  if (!inventory) return { success: false, error: 'Inventory vehicle not found.' }

  const vehicleDetails = {
    make: inventory.carVariantMaster?.carMakeMaster?.make ?? inventory.makeLegacy ?? '',
    model: inventory.carVariantMaster?.carModelMaster?.model ?? inventory.modelLegacy ?? '',
    variant: inventory.carVariantMaster?.variant ?? inventory.variantLegacy ?? '',
    year: inventory.year,
  }
  const vehicleSlug = buildVehicleSlug(vehicleDetails)

  const trackedLink = await createTrackedVehicleEmailLink({
    inventoryId,
    inquiryId,
    customerId: recipient.inquiry.customerId,
    recipientEmail: recipient.toEmail,
    recipientName: recipient.toName,
    slug: vehicleSlug,
  })

  const { subject, html } = vehicleDetailsEmail({
    customerName: recipient.toName,
    make: vehicleDetails.make,
    model: vehicleDetails.model,
    variant: vehicleDetails.variant,
    year: inventory.year,
    colour: inventory.colour ?? '',
    fuelType: inventory.fuelType ?? '',
    noOfOwners: inventory.noOfOwners,
    registrationNo: inventory.registrationNo ?? '',
    kmsDriven: inventory.kmsDriven ? inventory.kmsDriven.toString() : null,
    price: inventory.price ? inventory.price.toString() : null,
    remarks: inventory.otherRemarks ?? '',
    signedBy,
    viewDetailsUrl: trackedLink.url,
  })

  const result = await sendEmail({ to: recipient.toEmail, subject, html })

  await prisma.inquiryEmailHistory.create({
    data: {
      inquiryId,
      inventoryId,
      emailType: 'inventory_vehicle',
      recipientEmail: recipient.toEmail,
      recipientName: recipient.toName,
      emailSubject: subject,
      deliveryStatus: result.success ? 'Sent' : 'Failed',
      errorMessage: result.success ? null : (result.error ?? 'Failed to send email.').slice(0, 1000),
      sentAt: result.success ? new Date() : null,
      attemptedBy: userId,
    },
  }).catch(() => undefined)

  if (result.success) {
    await logInquiryEvent(prisma, {
      inquiryId,
      eventType: 'inventory_email_sent',
      eventLabel: 'Inventory email sent',
      eventDetail: `Inventory #${inventoryId} sent to ${recipient.toEmail}.`,
      actorUserId: userId,
      inventoryId,
      createdAt: new Date(),
    }).catch(() => undefined)
  }

  if (!result.success) {
    await prisma.vehicleEmailLink.delete({ where: { vehicleEmailLinkId: trackedLink.vehicleEmailLinkId } }).catch(() => undefined)
    return result
  }

  await createInquiryInventoryLinks({
    inquiryId,
    inventoryIds: [inventoryId],
    linkType: 'emailed',
    userId,
  })

  return { success: true }
}

async function findMatchingInventoryIdsForInquiryCars(resolvedCarDetails: Awaited<ReturnType<typeof resolveInquiryCarDetails>>) {
  const matchIds = new Set<number>()

  for (const car of resolvedCarDetails) {
    const where = buildInventoryMatchWhere(car)

    const matches = await prisma.inventoryManagement.findMany({
      where,
      select: { inventoryId: true },
      take: 100,
      orderBy: { inventoryId: 'desc' },
    })

    for (const match of matches) {
      matchIds.add(match.inventoryId)
    }
  }

  return [...matchIds]
}

function buildInventoryMatchWhere(car: Awaited<ReturnType<typeof resolveInquiryCarDetail>>): Prisma.InventoryManagementWhereInput {
  const where: Prisma.InventoryManagementWhereInput = {
    status: { equals: 'In Stock', mode: 'insensitive' },
    ...(car.year ? { year: car.year } : {}),
    ...(car.noOfOwners !== null ? { noOfOwners: car.noOfOwners } : {}),
  }

  if (car.fkVariantId) {
    where.fkVariantId = car.fkVariantId
  } else {
    where.AND = [
      car.makeLegacy ? { makeLegacy: { equals: car.makeLegacy, mode: 'insensitive' } } : {},
      car.modelLegacy ? { modelLegacy: { equals: car.modelLegacy, mode: 'insensitive' } } : {},
      car.variantLegacy ? { variantLegacy: { equals: car.variantLegacy, mode: 'insensitive' } } : {},
    ]
  }
  return where
}

async function findUniquelyMatchedInventoryIdsForInquiryCars(resolvedCarDetails: Awaited<ReturnType<typeof resolveInquiryCarDetails>>) {
  const inventoryIds = new Set<number>()
  let noMatchCount = 0
  let ambiguousCount = 0

  for (const car of resolvedCarDetails) {
    const matches = await prisma.inventoryManagement.findMany({
      where: buildInventoryMatchWhere(car),
      select: { inventoryId: true },
      orderBy: { inventoryId: 'desc' },
      take: 2,
    })
    if (matches.length === 1) inventoryIds.add(matches[0].inventoryId)
    else if (matches.length === 0) noMatchCount += 1
    else ambiguousCount += 1
  }

  return { inventoryIds: [...inventoryIds], noMatchCount, ambiguousCount }
}

async function createTrackedVehicleWhatsAppLink({
  inquiryId,
  inventoryId,
  customerId,
  recipientMobile,
  recipientName,
  slug,
}: {
  inquiryId: number
  inventoryId: number
  customerId: number | null
  recipientMobile: string
  recipientName: string
  slug: string
}) {
  const { rawToken, tokenHash } = generateVehicleEmailToken()
  const row = await prisma.vehicleEmailLink.create({
    data: {
      inventoryManagement: { connect: { inventoryId } },
      inquiry: { connect: { inquiryId } },
      ...(customerId ? { customer: { connect: { custId: customerId } } } : {}),
      // This legacy table is also the secure public-vehicle-link store. The channel
      // makes the non-email recipient value unambiguous for future reporting.
      recipientEmail: `whatsapp:${recipientMobile}`,
      recipientName: recipientName || null,
      channel: 'WhatsApp',
      tokenHash,
      isActive: true,
    },
  })

  const url = new URL(buildTrackedVehicleUrl(slug, rawToken))
  return {
    vehicleEmailLinkId: row.vehicleEmailLinkId,
    buttonUrlSuffix: `${url.pathname}${url.search}`.replace(/^\//, ''),
  }
}

async function sendInquiryInventoryWhatsApp(inquiryId: number, inventoryId: number) {
  if (!WHATSAPP_SENDING_ENABLED) return { status: 'skipped' } satisfies NotificationAttemptResult
  const [inquiry, inventory] = await Promise.all([
    prisma.inquiry.findUnique({ where: { inquiryId }, include: { customer: true } }),
    prisma.inventoryManagement.findUnique({
      where: { inventoryId },
      include: { carVariantMaster: { include: { carMakeMaster: true, carModelMaster: true } } },
    }),
  ])
  if (!inquiry || !inventory) return { status: 'failed', error: 'Matching inquiry or inventory was not found.' } satisfies NotificationAttemptResult

  const customerName = inquiry.customer?.custName?.trim() || inquiry.customerNameLegacy?.trim() || 'Customer'
  const recipientMobile = normalizeWhatsAppRecipient(inquiry.customer?.custMobile || inquiry.mobileno)
  const make = inventory.carVariantMaster?.carMakeMaster?.make ?? inventory.makeLegacy ?? ''
  const model = inventory.carVariantMaster?.carModelMaster?.model ?? inventory.modelLegacy ?? ''
  const variant = inventory.carVariantMaster?.variant ?? inventory.variantLegacy ?? ''
  const vehicleName = [inventory.year ? String(inventory.year) : '', make, model, variant].filter(Boolean).join(' ').trim() || `Inventory ${inventory.inventoryNumber || inventory.inventoryId}`

  let deliveryLog: { whatsAppDeliveryLogId: number }
  try {
    deliveryLog = await prisma.whatsAppDeliveryLog.create({
      data: {
        inquiryId,
        inventoryId,
        recipientMobile: recipientMobile || '',
        recipientName: customerName,
        templateName: getEnquiryWhatsAppTemplateName(),
        templateLanguage: 'en',
        vehicleName,
        status: 'Preparing',
      },
      select: { whatsAppDeliveryLogId: true },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return { status: 'skipped' } satisfies NotificationAttemptResult
    throw error
  }

  if (!recipientMobile) {
    await prisma.whatsAppDeliveryLog.update({
      where: { whatsAppDeliveryLogId: deliveryLog.whatsAppDeliveryLogId },
      data: { status: 'Failed', errorMessage: 'The inquiry has no valid 10-digit customer mobile number.', attemptedAt: new Date() },
    })
    return { status: 'failed', error: 'The inquiry has no valid 10-digit customer mobile number.' } satisfies NotificationAttemptResult
  }

  try {
    const vehicleLink = await createTrackedVehicleWhatsAppLink({
      inquiryId,
      inventoryId,
      customerId: inquiry.customerId,
      recipientMobile,
      recipientName: customerName,
      slug: buildVehicleSlug({ make, model, variant, year: inventory.year }),
    })
    await prisma.whatsAppDeliveryLog.update({
      where: { whatsAppDeliveryLogId: deliveryLog.whatsAppDeliveryLogId },
      data: { buttonUrlSuffix: vehicleLink.buttonUrlSuffix, attemptedAt: new Date(), status: 'Sending' },
    })

    const result = await sendEnquiryTemplate({
      to: recipientMobile,
      customerName,
      vehicleName,
      buttonUrlSuffix: vehicleLink.buttonUrlSuffix,
    })
    await prisma.whatsAppDeliveryLog.update({
      where: { whatsAppDeliveryLogId: deliveryLog.whatsAppDeliveryLogId },
      data: {
        status: result.success ? 'Submitted' : 'Failed',
        providerMessageId: result.providerMessageId ?? null,
        errorMessage: result.success ? null : (result.error || 'WhatsApp API request failed.').slice(0, 1000),
      },
    })
    return result.success
      ? { status: 'submitted' } satisfies NotificationAttemptResult
      : { status: 'failed', error: result.error || 'WhatsApp API request failed.' } satisfies NotificationAttemptResult
  } catch (error) {
    await prisma.whatsAppDeliveryLog.update({
      where: { whatsAppDeliveryLogId: deliveryLog.whatsAppDeliveryLogId },
      data: { status: 'Failed', errorMessage: 'Could not prepare the WhatsApp vehicle link.', attemptedAt: new Date() },
    }).catch(() => undefined)
    console.error('Inquiry WhatsApp automation failed:', error)
    return { status: 'failed', error: 'Could not prepare the WhatsApp vehicle link.' } satisfies NotificationAttemptResult
  }
}

async function sendWhatsAppForMatchedInquiryInventory(inquiryId: number, inventoryIds: number[]) {
  return Promise.all(inventoryIds.map(inventoryId => sendInquiryInventoryWhatsApp(inquiryId, inventoryId)))
}

async function sendAutomatedInquiryInventoryEmail(inquiryId: number, inventoryId: number, userId: number | null) {
  const recipient = await getInquiryRecipient(inquiryId)
  if ('error' in recipient) return { status: 'failed', error: recipient.error } satisfies NotificationAttemptResult

  let deliveryLog: { inquiryInventoryEmailLogId: number }
  try {
    deliveryLog = await prisma.inquiryInventoryEmailLog.create({
      data: {
        inquiryId,
        inventoryId,
        recipientEmail: recipient.toEmail,
        status: 'Preparing',
      },
      select: { inquiryInventoryEmailLogId: true },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return { status: 'skipped' } satisfies NotificationAttemptResult
    throw error
  }

  try {
    const result = await sendMatchedInventoryEmailToInquiryRecipient({
      inquiryId,
      inventoryId,
      signedBy: 'Excel Cars Team',
      userId,
    })
    await prisma.inquiryInventoryEmailLog.update({
      where: { inquiryInventoryEmailLogId: deliveryLog.inquiryInventoryEmailLogId },
      data: {
        status: result.success ? 'Sent' : 'Failed',
        errorMessage: result.success ? null : (result.error || 'Could not send inventory email.').slice(0, 1000),
        attemptedAt: new Date(),
      },
    })
    return result.success
      ? { status: 'submitted' } satisfies NotificationAttemptResult
      : { status: 'failed', error: result.error || 'Could not send inventory email.' } satisfies NotificationAttemptResult
  } catch (error) {
    await prisma.inquiryInventoryEmailLog.update({
      where: { inquiryInventoryEmailLogId: deliveryLog.inquiryInventoryEmailLogId },
      data: { status: 'Failed', errorMessage: 'Could not send inventory email.', attemptedAt: new Date() },
    }).catch(() => undefined)
    console.error('Inquiry email automation failed:', error)
    return { status: 'failed', error: 'Could not send inventory email.' } satisfies NotificationAttemptResult
  }
}

async function sendEmailForMatchedInquiryInventory(inquiryId: number, inventoryIds: number[], userId: number | null) {
  return Promise.all(inventoryIds.map(inventoryId => sendAutomatedInquiryInventoryEmail(inquiryId, inventoryId, userId)))
}

async function createNoInventoryNotificationLog({ inquiryId, channel, recipient, templateName }: { inquiryId: number; channel: string; recipient: string; templateName: string | null }) {
  try {
    return await prisma.inquiryNoInventoryNotificationLog.create({
      data: { inquiryId, channel, recipient, templateName, status: 'Preparing' },
      select: { inquiryNoInventoryNotificationLogId: true },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return null
    throw error
  }
}

async function sendNoInventoryWhatsApp(inquiryId: number): Promise<NotificationAttemptResult> {
  if (!WHATSAPP_SENDING_ENABLED) return { status: 'skipped' } satisfies NotificationAttemptResult
  const inquiry = await prisma.inquiry.findUnique({ where: { inquiryId }, include: { customer: true } })
  if (!inquiry) return { status: 'failed', error: 'Inquiry not found.' }
  const customerName = inquiry.customer?.custName?.trim() || inquiry.customerNameLegacy?.trim() || 'Customer'
  const recipientMobile = normalizeWhatsAppRecipient(inquiry.customer?.custMobile || inquiry.mobileno)
  const log = await createNoInventoryNotificationLog({ inquiryId, channel: 'WhatsApp', recipient: recipientMobile || '', templateName: getNoInventoryWhatsAppTemplateName() })
  if (!log) return { status: 'skipped' }
  if (!recipientMobile) {
    await prisma.inquiryNoInventoryNotificationLog.update({ where: { inquiryNoInventoryNotificationLogId: log.inquiryNoInventoryNotificationLogId }, data: { status: 'Failed', errorMessage: 'The inquiry has no valid 10-digit customer mobile number.', attemptedAt: new Date() } })
    return { status: 'failed', error: 'The inquiry has no valid 10-digit customer mobile number.' }
  }
  const result = await sendNoInventoryEnquiryTemplate({ to: recipientMobile, customerName })
  await prisma.inquiryNoInventoryNotificationLog.update({
    where: { inquiryNoInventoryNotificationLogId: log.inquiryNoInventoryNotificationLogId },
    data: { status: result.success ? 'Submitted' : 'Failed', errorMessage: result.success ? null : (result.error || 'WhatsApp API request failed.').slice(0, 1000), providerMessageId: result.providerMessageId ?? null, attemptedAt: new Date() },
  })
  return result.success ? { status: 'submitted' } : { status: 'failed', error: result.error }
}

async function sendNoInventoryEmail(inquiryId: number): Promise<NotificationAttemptResult> {
  const recipient = await getInquiryRecipient(inquiryId)
  const email = 'error' in recipient ? '' : recipient.toEmail
  const name = 'error' in recipient ? 'Customer' : recipient.toName
  const log = await createNoInventoryNotificationLog({ inquiryId, channel: 'Email', recipient: email, templateName: null })
  if (!log) return { status: 'skipped' }
  if (!email) {
    await prisma.inquiryNoInventoryNotificationLog.update({ where: { inquiryNoInventoryNotificationLogId: log.inquiryNoInventoryNotificationLogId }, data: { status: 'Failed', errorMessage: 'This inquiry has no customer email on file.', attemptedAt: new Date() } })
    return { status: 'failed', error: 'This inquiry has no customer email on file.' }
  }
  const message = noInventoryEnquiryEmail(name)
  const result = await sendEmail({ to: email, ...message })
  await prisma.inquiryNoInventoryNotificationLog.update({
    where: { inquiryNoInventoryNotificationLogId: log.inquiryNoInventoryNotificationLogId },
    data: { status: result.success ? 'Sent' : 'Failed', errorMessage: result.success ? null : (result.error || 'Could not send email.').slice(0, 1000), attemptedAt: new Date() },
  })
  return result.success ? { status: 'submitted' } : { status: 'failed', error: result.error }
}

async function sendNoInventoryNotifications(inquiryId: number) {
  const [whatsapp, email] = await Promise.all([sendNoInventoryWhatsApp(inquiryId), sendNoInventoryEmail(inquiryId)])
  return { whatsapp, email }
}

function describeNotificationResults({
  matchedInventoryCount,
  noMatchCount,
  ambiguousCount,
  whatsapp,
  email,
}: {
  matchedInventoryCount: number
  noMatchCount: number
  ambiguousCount: number
  whatsapp: NotificationAttemptResult[]
  email: NotificationAttemptResult[]
}) {
  const messages = ['Inquiry saved.']
  if (matchedInventoryCount === 0) messages.push('No exact in-stock inventory match was found, so no notifications were sent.')
  else messages.push(`${matchedInventoryCount} exact inventory ${matchedInventoryCount === 1 ? 'match was' : 'matches were'} found.`)

  const describeChannel = (label: string, results: NotificationAttemptResult[], acceptedWording: string) => {
    const submitted = results.filter(result => result.status === 'submitted').length
    const failed = results.filter(result => result.status === 'failed')
    if (submitted) messages.push(`${label}: ${acceptedWording} for ${submitted} ${submitted === 1 ? 'vehicle' : 'vehicles'}${label === 'Email' ? '; delivery is not yet confirmed.' : '.'}`)
    if (failed.length) messages.push(`${label} failed: ${failed.map(result => result.error).filter(Boolean).join(' ')}`)
  }

  describeChannel('WhatsApp', whatsapp, 'submitted to Meta')
  describeChannel('Email', email, 'accepted by SMTP')
  if (noMatchCount) messages.push(`${noMatchCount} car ${noMatchCount === 1 ? 'choice had' : 'choices had'} no in-stock match.`)
  if (ambiguousCount) messages.push(`${ambiguousCount} car ${ambiguousCount === 1 ? 'choice matched multiple inventory items' : 'choices matched multiple inventory items'}; those notifications were skipped.`)
  return messages.join(' ')
}

function describeNoInventoryNotificationResults(whatsapp: NotificationAttemptResult, email: NotificationAttemptResult) {
  const message = ['Inquiry saved. No in-stock inventory match was found.']
  if (whatsapp.status === 'submitted') message.push('WhatsApp no-inventory message submitted to Meta.')
  else if (whatsapp.status === 'failed') message.push(`WhatsApp failed: ${whatsapp.error || 'unknown error.'}`)
  if (email.status === 'submitted') message.push('No-inventory email accepted by SMTP; delivery is not yet confirmed.')
  else if (email.status === 'failed') message.push(`Email failed: ${email.error || 'unknown error.'}`)
  return message.join(' ')
}

export async function getInquiryDetail(inquiryId: number, options: { route?: string } = {}) {
  const route = options.route ?? '/inquiry'
  const userId = await currentUserId(route)
  if (!userId) return null
  if (!(await canAccessInquiryByOwnership(inquiryId, route))) return null
  const detail = await prisma.inquiry.findUnique({
    where: { inquiryId },
    include: {
      customer: true,
      source: true,
      assignedToUser: {
        select: {
          userId: true,
          userName: true,
          displayName: true,
          employee: { select: { empId: true, empFirstName: true, empLastName: true, empMobileNo: true, empEmailId: true } },
        },
      },
      createdByUser: {
        select: {
          userId: true,
          userName: true,
          displayName: true,
        },
      },
      updatedByUser: {
        select: {
          userId: true,
          userName: true,
          displayName: true,
        },
      },
      inquiryCarDetails: {
        orderBy: [{ updatedDt: 'desc' }, { inquiryCarDetailsId: 'desc' }],
        include: {
          carVariantMaster: {
            include: { carMakeMaster: true, carModelMaster: true },
          },
        },
      },
      followupInquiry: {
        orderBy: [{ createdDt: 'desc' }, { pkFollowupId: 'desc' }],
        include: {
          createdByUser: {
            select: {
              userId: true,
              userName: true,
              displayName: true,
            },
          },
        },
      },
      inquiryInventoryLinks: {
        orderBy: [{ createdAt: 'desc' }, { inquiryInventoryLinkId: 'desc' }],
        include: {
          inventoryManagement: {
            include: {
              carVariantMaster: {
                include: { carMakeMaster: true, carModelMaster: true },
              },
            },
          },
          createdByUser: {
            select: {
              userId: true,
              userName: true,
              displayName: true,
            },
          },
        },
      },
      inquiryEmailHistories: {
        orderBy: [{ createdAt: 'desc' }, { inquiryEmailHistoryId: 'desc' }],
        include: {
          attemptedByUser: {
            select: {
              userId: true,
              userName: true,
              displayName: true,
            },
          },
          inventoryManagement: {
            include: {
              carVariantMaster: {
                include: { carMakeMaster: true, carModelMaster: true },
              },
            },
          },
        },
      },
    },
  })

  if (!detail) return null

  const [vehicleEmailLinks, inquiryActivityEvents] = await Promise.all([
    getInquiryTrackedVehicleEmailHistory(inquiryId),
    getInquiryActivityEvents(inquiryId),
  ])

  return toPlainActionPayload({
    ...detail,
    budgetOfCustomer: detail.budgetOfCustomer ? detail.budgetOfCustomer.toString() : null,
    inquiryEmailHistories: detail.inquiryEmailHistories.map(history => ({
      ...history,
      inventoryManagement: history.inventoryManagement ? {
        ...history.inventoryManagement,
        kmsDriven: history.inventoryManagement.kmsDriven ? history.inventoryManagement.kmsDriven.toString() : null,
        price: history.inventoryManagement.price ? history.inventoryManagement.price.toString() : null,
      } : null,
    })),
    inquiryInventoryLinks: detail.inquiryInventoryLinks.map(link => ({
      ...link,
      inventoryManagement: {
        ...link.inventoryManagement,
        kmsDriven: link.inventoryManagement.kmsDriven ? link.inventoryManagement.kmsDriven.toString() : null,
        price: link.inventoryManagement.price ? link.inventoryManagement.price.toString() : null,
      },
    })),
    vehicleEmailLinks,
    inquiryActivityEvents,
  })
}

export async function sendInquiryInventoryEmail(inquiryId: number, inventoryId: number): Promise<ActionResult> {
  const userId = await currentUserId('/inquiry')
  if (!userId) return { success: false, error: 'Not authorized.' }
  const session = await auth()
  return sendMatchedInventoryEmailToInquiryRecipient({
    inquiryId,
    inventoryId,
    signedBy: 'Excel Cars Team',
    userId: session?.user?.id ? Number(session.user.id) : null,
  })
}

export async function sendInquiryInventoryEmails(inquiryId: number, inventoryIds: number[]): Promise<ActionResult> {
  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }
  const session = await auth()
  const uniqueInventoryIds = [...new Set(inventoryIds.filter(id => Number.isFinite(id) && id > 0))]
  if (uniqueInventoryIds.length === 0) {
    return { success: false, error: 'Select at least one inventory vehicle to send.' }
  }

  let sentCount = 0
  const failures: string[] = []

  for (const inventoryId of uniqueInventoryIds) {
    const result = await sendMatchedInventoryEmailToInquiryRecipient({
      inquiryId,
      inventoryId,
      signedBy: 'Excel Cars Team',
      userId: session?.user?.id ? Number(session.user.id) : null,
    })
    if (result.success) {
      sentCount += 1
    } else {
      failures.push(result.error || `Vehicle #${inventoryId}`)
    }
  }

  if (sentCount === 0) {
    return { success: false, error: `No matching emails were accepted by SMTP. ${failures.join(' ')}`.trim() }
  }

  return {
    success: true,
    message: failures.length > 0
      ? `Email accepted by SMTP for ${sentCount} matching ${sentCount === 1 ? 'vehicle' : 'vehicles'}; delivery is not yet confirmed. Failed for ${failures.length} ${failures.length === 1 ? 'vehicle' : 'vehicles'}: ${failures.join(' ')}`
      : `Email accepted by SMTP for ${sentCount} matching ${sentCount === 1 ? 'vehicle' : 'vehicles'}; delivery is not yet confirmed.`,
  }
}

export async function setInquiryInventoryWorkflowState(
  inquiryId: number,
  inventoryId: number,
  linkType: string,
  options: { route?: string } = {},
): Promise<ActionResult> {
  const route = options.route ?? '/inquiry'
  const userId = await currentUserId(route)
  if (!userId) return { success: false, error: 'Not authorized.' }
  if (!(await canAccessInquiryByOwnership(inquiryId, route))) {
    return { success: false, error: 'You can only update inventory state for inquiries you can access.' }
  }

  const normalizedLinkType = normalizeOptionalText(linkType)?.toLowerCase() ?? ''
  if (!isSupportedInquiryInventoryWorkflowType(normalizedLinkType)) {
    return { success: false, error: 'Select a valid inventory state.' }
  }

  const inventory = await prisma.inventoryManagement.findUnique({
    where: { inventoryId },
    select: { inventoryId: true },
  })

  if (!inventory) {
    return { success: false, error: 'Inventory vehicle not found.' }
  }

  const existingInquiryLink = await prisma.inquiryInventoryLink.findFirst({
    where: { inquiryId, inventoryId },
    select: { inquiryInventoryLinkId: true },
  })
  const existingEmailLink = await prisma.vehicleEmailLink.findFirst({
    where: { inquiryId, inventoryId },
    select: { vehicleEmailLinkId: true },
  })

  if (!existingInquiryLink && !existingEmailLink) {
    return { success: false, error: 'Only stock already linked to this inquiry can be updated.' }
  }

  try {
    await createInquiryInventoryLinks({
      inquiryId,
      inventoryIds: [inventoryId],
      linkType: normalizedLinkType,
      userId,
    })
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  revalidatePath('/inquiry')
  revalidatePath('/followup')
  revalidatePath('/dashboard')
  return { success: true, message: `Inventory marked as ${normalizedLinkType}.` }
}

export async function getNextInquiryNumber(): Promise<string> {
  const userId = await currentUserId()
  if (!userId) return 'Inquiry/1'
  const rows = await prisma.$queryRaw<Array<{ max_inquiry_number: number | bigint | null }>>(Prisma.sql`
    SELECT COALESCE(MAX((regexp_match(inquiry_no, '([0-9]+)$'))[1]::int), 0) AS max_inquiry_number
    FROM inquiry
    WHERE inquiry_no ~ '[0-9]+$'
  `)

  const rawMax = rows[0]?.max_inquiry_number
  const maxInquiryNumber = typeof rawMax === 'bigint' ? Number(rawMax) : Number(rawMax ?? 0)
  const safeMax = Number.isFinite(maxInquiryNumber) && maxInquiryNumber > 0 ? maxInquiryNumber : 0
  return `Inquiry/${safeMax + 1}`
}

function isInquiryNumberConflict(err: unknown) {
  const targets = Array.isArray((err as { meta?: { target?: unknown } })?.meta?.target)
    ? ((err as { meta?: { target?: unknown[] } }).meta?.target ?? []).map(target => String(target))
    : []
  const message = err instanceof Error ? err.message.toLowerCase() : ''

  return err instanceof Prisma.PrismaClientKnownRequestError
    && err.code === 'P2002'
    && (
      targets.some(target => target === 'inquiry_no' || target === 'inquiryNo' || target.includes('inquiry'))
      || message.includes('inquiry_no')
      || message.includes('idx_16506_uq_inquiry_inquiry_no')
      || message.includes('unique constraint')
    )
}

export async function createInquiry(input: InquiryFormInput, options: CreateInquiryOptions = {}): Promise<ActionResult> {
  const validation = validateInquiryFormInput(input)
  if (validation.error) {
    return { success: false, error: validation.error }
  }

  const userId = await currentUserId('/inquiry')
  if (!userId) return { success: false, error: 'Not authorized.' }
  const resolvedSource = await resolveInquirySource(input)
  if (resolvedSource.error || !resolvedSource.source) {
    return { success: false, error: resolvedSource.error ?? 'Select a valid source before saving the inquiry.' }
  }
  const resolvedLocation = await resolveInquiryLocation(input)
  if (resolvedLocation.error) {
    return { success: false, error: resolvedLocation.error }
  }
  const resolvedContact = await resolveInquiryContact(input)
  if (resolvedContact.error) {
    return { success: false, error: resolvedContact.error }
  }
  const resolvedCarDetails = await resolveInquiryCarDetails(input)

  let newInquiryId: number | null = null

  try {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const inquiryNo = await getNextInquiryNumber()
      const now = new Date()
      try {
        const created = await prisma.inquiry.create({
          data: {
            ...buildInquiryData({ ...input, inquiryNo }, resolvedContact, resolvedSource.source, resolvedLocation.location),
            ...(resolvedContact.customerId ? { customer: { connect: { custId: resolvedContact.customerId } } } : {}),
            createdDt: now,
            updatedDt: now,
            assignedToUser: { connect: { userId } },
            ...(userId ? { createdByUser: { connect: { userId } }, updatedByUser: { connect: { userId } } } : {}),
            ...(resolvedCarDetails.length > 0
              ? {
                  inquiryCarDetails: {
                    create: resolvedCarDetails.map(car => ({
                      fkVariantId: car.fkVariantId,
                      makeLegacy: car.makeLegacy,
                      modelLegacy: car.modelLegacy,
                      variantLegacy: car.variantLegacy,
                      subVariant: car.subVariant,
                      year: car.year,
                      noOfOwners: car.noOfOwners,
                      createdDt: now,
                      updatedDt: now,
                      ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
                    })),
                  },
                }
              : {}),
          },
        })
        newInquiryId = created.inquiryId
        await logInquiryEvent(prisma, {
          inquiryId: created.inquiryId,
          eventType: 'inquiry_created',
          eventLabel: 'Inquiry created',
          eventDetail: [
            inquiryNo ? `No ${inquiryNo}` : '',
            `Source ${resolvedSource.source.displayName}${normalizeOptionalText(input.sourceDetail) ? ` (${normalizeOptionalText(input.sourceDetail)})` : ''}`,
            resolvedContact.customerId ? `Linked customer #${resolvedContact.customerId}` : '',
          ].filter(Boolean).join(' · '),
          actorUserId: userId,
          createdAt: now,
        })
        for (const car of resolvedCarDetails) {
          await logInquiryEvent(prisma, {
            inquiryId: created.inquiryId,
            eventType: 'inquiry_car_added',
            eventLabel: 'Inquiry car added',
            eventDetail: summarizeInquiryCarForLog(car),
            actorUserId: userId,
            createdAt: now,
          })
        }
        if (hasMeaningfulFollowupState(input)) {
          await appendInquiryFollowupHistory({
            inquiryId: created.inquiryId,
            input,
            userId,
            now,
          })
        }
        break
      } catch (err) {
        if (isInquiryNumberConflict(err) && attempt < 4) {
          continue
        }
        throw err
      }
    }
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  let resultMessage: string | undefined

  // The enquiry has committed at this point. WhatsApp failures must never roll it
  // back or turn a successful save into an error for the user.
  if (newInquiryId && resolvedCarDetails.length > 0) {
    try {
      const matches = await findUniquelyMatchedInventoryIdsForInquiryCars(resolvedCarDetails)
      if (matches.inventoryIds.length === 0 && matches.noMatchCount > 0 && matches.ambiguousCount === 0) {
        const noInventory = await sendNoInventoryNotifications(newInquiryId)
        resultMessage = describeNoInventoryNotificationResults(noInventory.whatsapp, noInventory.email)
      } else {
        const [whatsapp, email] = await Promise.all([
          sendWhatsAppForMatchedInquiryInventory(newInquiryId, matches.inventoryIds),
          sendEmailForMatchedInquiryInventory(newInquiryId, matches.inventoryIds, userId),
        ])
        resultMessage = describeNotificationResults({
          matchedInventoryCount: matches.inventoryIds.length,
          noMatchCount: matches.noMatchCount,
          ambiguousCount: matches.ambiguousCount,
          whatsapp,
          email,
        })
      }
    } catch (error) {
      console.error('Inquiry notification automation failed:', error)
      resultMessage = 'Inquiry saved, but automatic WhatsApp and email notifications could not be checked.'
    }
  }

  if (newInquiryId && resolvedCarDetails.length > 0 && options.sendMatchingInventoryOnCreate) {
    try {
      const matchedInventoryIds = await findMatchingInventoryIdsForInquiryCars(resolvedCarDetails)
      if (matchedInventoryIds.length > 0) {
        await createInquiryInventoryLinks({
          inquiryId: newInquiryId,
          inventoryIds: matchedInventoryIds,
          linkType: 'matched',
          userId,
        })
        const emailResult = await sendInquiryInventoryEmails(newInquiryId, matchedInventoryIds)
        const manualMessage = emailResult.success
          ? (emailResult.message ?? 'Matching inventory email accepted by SMTP; delivery is not yet confirmed.')
          : `Manual matching inventory email failed: ${emailResult.error ?? 'unknown error.'}`
        resultMessage = [resultMessage, manualMessage].filter(Boolean).join(' ')
      } else {
        resultMessage = [resultMessage, 'No matching inventory was available for the manual email send.'].filter(Boolean).join(' ')
      }
    } catch {
      resultMessage = [resultMessage, 'Manual matching inventory email could not be sent.'].filter(Boolean).join(' ')
    }
  } else if (options.sendMatchingInventoryOnCreate) {
    resultMessage = [resultMessage, 'No vehicle rows were available for the manual email send.'].filter(Boolean).join(' ')
  }

  revalidatePath('/inquiry')
  revalidatePath('/followup')
  revalidatePath('/dashboard')
  revalidatePath('/config/customers')
  return { success: true, message: resultMessage }
}

export async function updateInquiry(id: number, input: InquiryFormInput, options: { route?: string } = {}): Promise<ActionResult> {
  const validation = validateInquiryFormInput(input)
  if (validation.error) {
    return { success: false, error: validation.error }
  }

  const route = options.route ?? '/inquiry'
  const userId = await currentUserId(route)
  if (!userId) return { success: false, error: 'Not authorized.' }
  if (!(await canAccessInquiryByOwnership(id, route))) {
    return { success: false, error: 'You can only update your own inquiries.' }
  }
  const resolvedSource = await resolveInquirySource(input)
  if (resolvedSource.error || !resolvedSource.source) {
    return { success: false, error: resolvedSource.error ?? 'Select a valid source before saving the inquiry.' }
  }
  const resolvedLocation = await resolveInquiryLocation(input)
  if (resolvedLocation.error) {
    return { success: false, error: resolvedLocation.error }
  }
  const resolvedContact = await resolveInquiryContact(input)
  if (resolvedContact.error) {
    return { success: false, error: resolvedContact.error }
  }
  const resolvedCarDetails = await resolveInquiryCarDetails(input)

  try {
    const now = new Date()
    const existing = await prisma.inquiry.findUnique({
      where: { inquiryId: id },
      select: {
        inquiryNo: true,
        customerId: true,
        website: true,
        sourceId: true,
        sourceDetail: true,
        locationId: true,
        location: true,
        status: true,
        subStatus: true,
        classification: true,
        remark: true,
        followUpDate: true,
        inquiryCarDetails: {
          select: {
            inquiryCarDetailsId: true,
            makeLegacy: true,
            modelLegacy: true,
            variantLegacy: true,
            subVariant: true,
            year: true,
            noOfOwners: true,
          },
        },
      },
    })

    if (!existing) {
      return { success: false, error: 'Inquiry not found.' }
    }

    const shouldAppendFollowup = hasMeaningfulFollowupState(input) && hasFollowupStateChanged(existing, input)
    const selectedFollowupDate = toDate(input.followUpDate)

    await prisma.$transaction(async (tx) => {
      const previousCars = existing.inquiryCarDetails.map(car => ({
        inquiryCarDetailsId: car.inquiryCarDetailsId ?? null,
        summary: summarizeInquiryCarForLog(car),
      }))

      if (input.rememberPartnerVehicleMappings) {
        const mapping = await rememberPartnerVehicleMapping(tx, { inquiryId: id, userId, existingCars: existing.inquiryCarDetails, cars: input.inquiryCars })
        await logInquiryEvent(tx, { inquiryId: id, eventType: 'partner_vehicle_mapping_confirmed', eventLabel: 'CarDekho vehicle mapping confirmed', eventDetail: `${mapping.description} → catalog variant #${mapping.variantId}${mapping.previousVariantId ? ` (previous #${mapping.previousVariantId})` : ''}`, actorUserId: userId, createdAt: now })
      }

      await tx.inquiry.update({
        where: { inquiryId: id },
        data: {
          ...buildInquiryData(input, resolvedContact, resolvedSource.source, resolvedLocation.location),
          customer: resolvedContact.customerId ? { connect: { custId: resolvedContact.customerId } } : { disconnect: true },
          updatedDt: now,
          ...(userId ? { updatedByUser: { connect: { userId } } } : {}),
        },
      })
      if (shouldAppendFollowup) await archiveFollowupNotifications(tx, id)

      await tx.inquiryCarDetails.deleteMany({ where: { fkInquiryId: id } })

      for (const previousCar of previousCars) {
        await logInquiryEvent(tx, {
          inquiryId: id,
          eventType: 'inquiry_car_removed',
          eventLabel: 'Inquiry car removed',
          eventDetail: previousCar.summary,
          actorUserId: userId,
          inquiryCarDetailsId: previousCar.inquiryCarDetailsId,
          createdAt: now,
        })
      }

      if (resolvedCarDetails.length > 0) {
        await tx.inquiryCarDetails.createMany({
          data: resolvedCarDetails.map(car => ({
            fkInquiryId: id,
            fkVariantId: car.fkVariantId,
            makeLegacy: car.makeLegacy,
            modelLegacy: car.modelLegacy,
            variantLegacy: car.variantLegacy,
            subVariant: car.subVariant,
            year: car.year,
            noOfOwners: car.noOfOwners,
            createdDt: now,
            updatedDt: now,
            ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
          })),
        })
      }

      for (const car of resolvedCarDetails) {
        await logInquiryEvent(tx, {
          inquiryId: id,
          eventType: 'inquiry_car_added',
          eventLabel: 'Inquiry car added',
          eventDetail: summarizeInquiryCarForLog(car),
          actorUserId: userId,
          createdAt: now,
        })
      }

      if (shouldAppendFollowup) {
        const followup = await tx.followupInquiry.create({
          data: {
            fkInquiryId: id,
            followupDate: requiresInquiryFollowupDate(input.status) ? selectedFollowupDate : null,
            followupStatus: normalizeOptionalText(input.status),
            followupSubStatus: normalizeOptionalText(input.subStatus),
            followupClassification: normalizeOptionalText(input.classification),
            comments: normalizeOptionalText(input.remark),
            createdDt: now,
            updatedDt: now,
            ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
          },
        })
        await logInquiryEvent(tx, {
          inquiryId: id,
          eventType: 'followup_recorded',
          eventLabel: 'Follow-up recorded',
          eventDetail: summarizeFollowupLog(input),
          actorUserId: userId,
          followupId: followup.pkFollowupId,
          createdAt: now,
        })
      }

      await logInquiryEvent(tx, {
        inquiryId: id,
        eventType: 'inquiry_updated',
        eventLabel: 'Inquiry updated',
        eventDetail: [
          existing.sourceId !== resolvedSource.source.sourceId || normalizeOptionalText(existing.sourceDetail) !== normalizeOptionalText(input.sourceDetail)
            ? `Source ${normalizeOptionalText(existing.website) ?? 'blank'}${normalizeOptionalText(existing.sourceDetail) ? ` (${normalizeOptionalText(existing.sourceDetail)})` : ''} -> ${resolvedSource.source.displayName}${normalizeOptionalText(input.sourceDetail) ? ` (${normalizeOptionalText(input.sourceDetail)})` : ''}`
            : '',
          existing.customerId !== resolvedContact.customerId ? `Customer ${existing.customerId ?? 'none'} -> ${resolvedContact.customerId ?? 'none'}` : '',
          normalizeOptionalText(existing.location) !== normalizeOptionalText(input.location) ? `Location ${normalizeOptionalText(existing.location) ?? 'blank'} -> ${normalizeOptionalText(input.location) ?? 'blank'}` : '',
          existing.status !== normalizeOptionalText(input.status) ? `Status ${existing.status ?? 'blank'} -> ${normalizeOptionalText(input.status) ?? 'blank'}` : '',
          existing.subStatus !== normalizeOptionalText(input.subStatus) ? `Sub-status ${existing.subStatus ?? 'blank'} -> ${normalizeOptionalText(input.subStatus) ?? 'blank'}` : '',
        ].filter(Boolean).join(' · ') || 'Inquiry fields updated.',
        actorUserId: userId,
        createdAt: now,
      })
    }, { maxWait: 10_000, timeout: 30_000 })
  } catch (err) {
    return { success: false, error: err instanceof PartnerVehicleMappingError ? err.message : describeError(err) }
  }

  revalidatePath('/inquiry')
  revalidatePath('/followup')
  revalidatePath('/dashboard')
  revalidatePath('/config/customers')
  return { success: true }
}

export async function assignInquiry(input: AssignInquiryInput): Promise<ActionResult> {
  const userId = await currentUserId('/inquiry')
  if (!userId) return { success: false, error: 'Not authorized.' }
  if (!(await canAccessInquiryByOwnership(input.inquiryId, '/inquiry'))) {
    return { success: false, error: 'You can only assign inquiries you own.' }
  }

  const assignedToUserId = input.assignedToUserId && input.assignedToUserId > 0 ? input.assignedToUserId : null

  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.inquiry.findUnique({
        where: { inquiryId: input.inquiryId },
        select: { assignedTo: true, inquiryNo: true, customerNameLegacy: true, customer: { select: { custName: true } } },
      })

      if (!current) throw new Error('Inquiry not found.')
      // Saving an existing creator assignment is valid even when the creator is an admin.
      if (current.assignedTo === assignedToUserId) return

      if (assignedToUserId) {
        const assignee = await tx.userTable.findUnique({
          where: { userId: assignedToUserId },
          select: {
            userId: true,
            status: true,
          },
        })

        if (!assignee || assignee.status !== 'Active') {
          throw new Error('Select a valid active user to assign this inquiry.')
        }
      }

      const now = new Date()
      await tx.inquiry.update({
        where: { inquiryId: input.inquiryId },
        data: {
          assignedToUser: assignedToUserId
            ? { connect: { userId: assignedToUserId } }
            : { disconnect: true },
          updatedDt: now,
          ...(userId ? { updatedByUser: { connect: { userId } } } : {}),
        },
      })

      await logInquiryEvent(tx, {
        inquiryId: input.inquiryId,
        eventType: 'inquiry_assignment_changed',
        eventLabel: assignedToUserId ? 'Inquiry assigned' : 'Inquiry assignment cleared',
        eventDetail: `Assigned ${current?.assignedTo ?? 'none'} -> ${assignedToUserId ?? 'none'}.`,
        actorUserId: userId,
        createdAt: now,
      })

      if (current?.assignedTo !== assignedToUserId) {
        await archiveFollowupNotifications(tx, input.inquiryId)
        const customerName = current?.customer?.custName || current?.customerNameLegacy || `Inquiry #${input.inquiryId}`
        const href = `/inquiry?search=${encodeURIComponent(current?.inquiryNo ?? String(input.inquiryId))}`
        if (assignedToUserId && assignedToUserId !== userId) {
          await createUserNotification(tx, { recipientUserId: assignedToUserId, type: 'inquiry_assigned', title: 'Inquiry assigned to you', body: `${customerName} has been assigned to you.`, href, entityType: 'inquiry', entityId: input.inquiryId, dedupeKey: `inquiry_assigned:${assignedToUserId}:${input.inquiryId}` })
        }
        if (current?.assignedTo && current.assignedTo !== userId) {
          await createUserNotification(tx, { recipientUserId: current.assignedTo, type: 'inquiry_reassigned', title: 'Inquiry reassigned', body: `${customerName} is no longer assigned to you.`, href, entityType: 'inquiry', entityId: input.inquiryId, dedupeKey: `inquiry_reassigned:${current.assignedTo}:${input.inquiryId}:${assignedToUserId ?? 'none'}` })
        }
      }
    })
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  revalidatePath('/inquiry')
  revalidatePath('/followup')
  revalidatePath('/dashboard')
  revalidatePath('/reports/today')
  return { success: true, message: assignedToUserId ? 'Inquiry assigned successfully.' : 'Inquiry assignment cleared.' }
}

export async function deleteInquiry(id: number): Promise<ActionResult> {
  const route = '/inquiry'
  const userId = await currentUserId(route)
  if (!userId) return { success: false, error: 'Not authorized.' }
  if (!(await canAccessInquiryByOwnership(id, route))) {
    return { success: false, error: 'You can only delete inquiries you own.' }
  }
  try {
    const existing = await prisma.inquiry.findUnique({
      where: { inquiryId: id },
      select: {
        inquiryNo: true,
        customerNameLegacy: true,
        customer: { select: { custName: true } },
      },
    })

    await prisma.$transaction(async tx => {
      // These are non-cascading legacy relations and must be removed before
      // their parent inquiry. Notification logs and inventory links cascade.
      await tx.followupInquiry.deleteMany({ where: { fkInquiryId: id } })
      await tx.inquiryCarDetails.deleteMany({ where: { fkInquiryId: id } })
      await tx.inquiry.delete({ where: { inquiryId: id } })
    })

    await logInquiryEvent(prisma, {
      inquiryId: id,
      eventType: 'inquiry_deleted',
      eventLabel: 'Inquiry deleted',
      eventDetail: [existing?.inquiryNo ?? '', existing?.customer?.custName ?? existing?.customerNameLegacy ?? ''].filter(Boolean).join(' · '),
      actorUserId: userId,
      createdAt: new Date(),
    }).catch(() => undefined)
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  revalidatePath('/inquiry')
  revalidatePath('/followup')
  return { success: true, message: 'Inquiry deleted successfully.' }
}

function describeError(err: unknown): string {
  console.error('Inquiry action failed:', err)

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const message = err.message.toLowerCase()
      if (message.includes('inquiry_no') || message.includes('idx_16506_uq_inquiry_inquiry_no')) {
        return 'Inquiry number conflict occurred. Please try saving again.'
      }
    }
    if (err.code === 'P2003') {
      return 'This inquiry has related records and cannot be deleted.'
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return process.env.NODE_ENV === 'development'
      ? `Prisma validation error: ${err.message}`
      : 'Something went wrong saving this record.'
  }

  if (err instanceof Error) {
    return process.env.NODE_ENV === 'development'
      ? err.message
      : 'Something went wrong saving this record.'
  }

  return 'Something went wrong saving this record.'
}
