'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { unlink } from 'fs/promises'
import path from 'path'
import { prisma } from '@/lib/db/prisma'
import { auth } from '../../../auth'
import { getAuthorizedUserIdForRoute } from '@/lib/access/accessControl'
import { buildInquiryOwnershipWhere, getInquiryOwnershipScopeForRoute } from '@/lib/access/inquiryOwnership'
import { sendEmail } from '@/lib/email/sendMail'
import { vehicleDetailsEmail } from '@/lib/email/templates'
import { buildTrackedVehicleUrl, buildVehicleSlug, generateVehicleEmailToken } from '@/lib/vehicleEmailLinks'
import { normalizeRegistrationNo, validateInventoryInput } from '@/lib/validation'
import { getInventoryBulkEmailLimits } from './emailLimits'
import { deleteFromFirebaseStorage, isFirebaseStoragePath } from '@/lib/firebase/storage'
import { normalizeWhatsAppRecipient, sendEnquiryTemplate } from '@/lib/whatsapp/meta'

export interface InventoryFormInput {
  registrationNo: string
  fkVariantId: number | null
  makeLegacy: string
  modelLegacy: string
  variantLegacy: string
  colour: string
  year: number | null
  month: string
  fuelType: string
  noOfOwners: number | null
  tax: string
  isCarRegistered: boolean | null
  kmsDriven: number | null
  insuranceType: string
  price: number | null
  status: string
  ownedType: string
  ownedBy: string
  mobileNoOwnedBy: string
  emailIdOwnedBy: string
  customerId: number | null
  customerName: string
  internalComments: string
  otherRemarks: string
}

export interface ActionResult {
  success: boolean
  error?: string
  message?: string
  inventoryId?: number
  inventoryNumber?: string | null
  sentInventoryIds?: number[]
  failedInventoryIds?: number[]
}

export interface UpdateInventoryInquiryInput {
  inquiryId: number
  status: string
  subStatus: string
  followUpDate: string
  remark: string
}

async function currentUserId(): Promise<number | null> {
  return getAuthorizedUserIdForRoute('/inventory')
}

function hasVehicleIdentity(input: InventoryFormInput) {
  return Boolean(input.fkVariantId && input.makeLegacy.trim() && input.modelLegacy.trim())
}

async function validateVariantRelationship(input: InventoryFormInput) {
  if (!input.fkVariantId) return 'Variant is required.'

  const variant = await prisma.carVariantMaster.findUnique({
    where: { pkVariantId: input.fkVariantId },
    include: { carMakeMaster: true, carModelMaster: true },
  })
  if (!variant) return 'The selected variant does not exist.'

  const makeMatches = variant.carMakeMaster?.make?.trim().toLowerCase() === input.makeLegacy.trim().toLowerCase()
  const modelMatches = variant.carModelMaster?.model?.trim().toLowerCase() === input.modelLegacy.trim().toLowerCase()
  if (!makeMatches || !modelMatches) {
    return 'The selected variant must belong to the selected make and model.'
  }
  return null
}

function legacySkuPart(value: string) {
  return value.length < 3 ? value : value.substring(0, 3)
}

type InventoryReadClient = Pick<Prisma.TransactionClient, 'inventoryManagement' | '$queryRaw'>

async function calculateNextInventoryNumber(db: InventoryReadClient) {
  const rows = await db.$queryRaw<Array<{ max_inventory_number: number | bigint | null }>>`
    SELECT COALESCE(MAX((regexp_match(inventory_number, '([0-9]+)$'))[1]::int), 0) AS max_inventory_number
    FROM inventory_management
    WHERE inventory_number ~ '[0-9]+$'
  `
  const rawMax = rows[0]?.max_inventory_number
  const maxInventoryNumber = typeof rawMax === 'bigint' ? Number(rawMax) : Number(rawMax ?? 0)
  const safeMax = Number.isFinite(maxInventoryNumber) && maxInventoryNumber > 0 ? maxInventoryNumber : 0
  return `Inventory/${safeMax + 1}`
}

async function calculateInventorySku(
  db: InventoryReadClient,
  make: string,
  model: string,
  colour: string,
) {
  const cleanMake = make.trim()
  const cleanModel = model.trim()
  const cleanColour = colour.trim()
  if (!cleanMake || !cleanModel || !cleanColour) return ''

  const makeKey = cleanMake.toLowerCase()
  const modelKey = cleanModel.toLowerCase()
  const colourKey = cleanColour.toLowerCase()
  const [counter] = await db.$queryRaw<Array<{ lastValue: number }>>`
    SELECT last_value AS "lastValue"
    FROM public.inventory_sku_counters
    WHERE make_key = ${makeKey}
      AND model_key = ${modelKey}
      AND colour_key = ${colourKey}
  `
  const nextValue = (counter?.lastValue ?? 0) + 1
  return `${legacySkuPart(cleanMake)}-${legacySkuPart(cleanModel)}-${legacySkuPart(cleanColour)}-${nextValue}`
}

async function allocateInventorySku(db: InventoryReadClient, make: string, model: string, colour: string) {
  const cleanMake = make.trim()
  const cleanModel = model.trim()
  const cleanColour = colour.trim()
  const makeKey = cleanMake.toLowerCase()
  const modelKey = cleanModel.toLowerCase()
  const colourKey = cleanColour.toLowerCase()
  const [counter] = await db.$queryRaw<Array<{ lastValue: number }>>`
    INSERT INTO public.inventory_sku_counters (make_key, model_key, colour_key, last_value, updated_at)
    VALUES (${makeKey}, ${modelKey}, ${colourKey}, 1, NOW())
    ON CONFLICT (make_key, model_key, colour_key)
    DO UPDATE SET last_value = "inventory_sku_counters".last_value + 1, updated_at = NOW()
    RETURNING last_value AS "lastValue"
  `
  return `${legacySkuPart(cleanMake)}-${legacySkuPart(cleanModel)}-${legacySkuPart(cleanColour)}-${counter.lastValue}`
}

/** Returns the next inventory number using the highest existing Inventory/{number} suffix. */
export async function getNextInventoryNumber() {
  if (!(await currentUserId())) return null
  return calculateNextInventoryNumber(prisma)
}

/** Returns the legacy SKU preview/next value for a make, model, and colour. */
export async function getInventorySku(make: string, model: string, colour: string) {
  if (!(await currentUserId())) return ''
  return calculateInventorySku(prisma, make, model, colour)
}

function buildData(input: InventoryFormInput) {
  return {
    registrationNo: normalizeRegistrationNo(input.registrationNo) || null,
    ...(input.fkVariantId
      ? { carVariantMaster: { connect: { pkVariantId: input.fkVariantId } } }
      : {}),
    makeLegacy: input.makeLegacy.trim() || null,
    modelLegacy: input.modelLegacy.trim() || null,
    variantLegacy: input.variantLegacy.trim() || null,
    colour: input.colour.trim() || null,
    year: input.year,
    month: input.month.trim() || null,
    fuelType: input.fuelType.trim() || null,
    noOfOwners: input.noOfOwners,
    tax: input.tax.trim() || null,
    isCarRegistered: input.isCarRegistered,
    kmsDriven: input.kmsDriven,
    insuranceType: input.insuranceType.trim() || null,
    price: input.price,
    status: input.status.trim() || null,
    ownedType: input.ownedType.trim() || null,
    ownedBy: input.ownedBy.trim() || null,
    mobileNoOwnedBy: input.mobileNoOwnedBy.trim() || null,
    emailIdOwnedBy: input.emailIdOwnedBy.trim() || null,
    customerName: input.customerName.trim() || null,
    internalComments: input.internalComments.trim() || null,
    otherRemarks: input.otherRemarks.trim() || null,
    ...(input.customerId
      ? { customer: { connect: { custId: input.customerId } } }
      : {}),
  }
}

function buildUpdateData(input: InventoryFormInput) {
  return {
    ...buildData(input),
    customer: input.customerId ? { connect: { custId: input.customerId } } : { disconnect: true },
    carVariantMaster: input.fkVariantId ? { connect: { pkVariantId: input.fkVariantId } } : { disconnect: true },
  }
}

async function createTrackedVehicleEmailLink({
  inventoryId,
  customerId,
  recipientEmail,
  recipientName,
  slug,
  channel = 'Email',
}: {
  inventoryId: number
  customerId: number | null
  recipientEmail: string
  recipientName: string
  slug: string
  channel?: 'Email' | 'WhatsApp'
}) {
  const { rawToken, tokenHash } = generateVehicleEmailToken()
  const row = await prisma.vehicleEmailLink.create({
    data: {
      inventoryManagement: { connect: { inventoryId } },
      ...(customerId ? { customer: { connect: { custId: customerId } } } : {}),
      recipientEmail,
      recipientName: recipientName || null,
      channel,
      tokenHash,
      emailSentAt: new Date(),
      isActive: true,
    },
  })

  return {
    vehicleEmailLinkId: row.vehicleEmailLinkId,
    url: buildTrackedVehicleUrl(slug, rawToken),
  }
}

export async function createInventory(input: InventoryFormInput): Promise<ActionResult> {
  input = { ...input, registrationNo: normalizeRegistrationNo(input.registrationNo) }
  const validationError = validateInventoryInput(input)
  if (validationError) return { success: false, error: validationError }
  if (!hasVehicleIdentity(input)) {
    return { success: false, error: 'Make, Model, and Variant are required.' }
  }

  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }

  try {
    const relationshipError = await validateVariantRelationship(input)
    if (relationshipError) return { success: false, error: relationshipError }

    let skuMake = input.makeLegacy
    let skuModel = input.modelLegacy
    if (input.fkVariantId && (!skuMake.trim() || !skuModel.trim())) {
      const variant = await prisma.carVariantMaster.findUnique({
        where: { pkVariantId: input.fkVariantId },
        include: { carMakeMaster: true, carModelMaster: true },
      })
      skuMake = variant?.carMakeMaster?.make ?? skuMake
      skuModel = variant?.carModelMaster?.model ?? skuModel
    }
    const outcome = await prisma.$transaction(async tx => {
      const normalizedRegistrationNo = normalizeRegistrationNo(input.registrationNo)
      if (normalizedRegistrationNo.length > 5) {
        const duplicate = await tx.inventoryManagement.findFirst({
          where: { registrationNo: normalizedRegistrationNo },
          select: { inventoryId: true },
        })
        if (duplicate) return { duplicateRegistration: true as const }
      }

      const sku = await allocateInventorySku(tx, skuMake, skuModel, input.colour)
      const inventoryNumber = await calculateNextInventoryNumber(tx)
      const created = await tx.inventoryManagement.create({
        data: {
          ...buildData(input),
          sku,
          inventoryNumber,
          createdDate: new Date(),
          updatedDate: new Date(),
          createdByUser: { connect: { userId } },
          updatedByUser: { connect: { userId } },
        },
        select: { inventoryId: true, inventoryNumber: true },
      })
      return { created }
    })

    if ('duplicateRegistration' in outcome) {
      return { success: false, error: 'This registration number already exists on another vehicle in Inventory.' }
    }
    const { created } = outcome

    revalidatePath('/inventory')
    return { success: true, inventoryId: created.inventoryId, inventoryNumber: created.inventoryNumber }
  } catch (err) {
    return { success: false, error: describeError(err) }
  }
}

export async function updateInventory(id: number, input: InventoryFormInput): Promise<ActionResult> {
  input = { ...input, registrationNo: normalizeRegistrationNo(input.registrationNo) }
  const validationError = validateInventoryInput(input)
  if (validationError) return { success: false, error: validationError }
  if (!hasVehicleIdentity(input)) {
    return { success: false, error: 'Make, Model, and Variant are required.' }
  }

  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }

  try {
    const relationshipError = await validateVariantRelationship(input)
    if (relationshipError) return { success: false, error: relationshipError }

    const normalizedRegistrationNo = normalizeRegistrationNo(input.registrationNo)
    if (normalizedRegistrationNo.length > 5) {
      const duplicate = await prisma.inventoryManagement.findFirst({
        where: { registrationNo: normalizedRegistrationNo, NOT: { inventoryId: id } },
        select: { inventoryId: true },
      })
      if (duplicate) return { success: false, error: 'This registration number already exists on another vehicle in Inventory.' }
    }

    const updated = await prisma.inventoryManagement.update({
      where: { inventoryId: id },
      data: {
        ...buildUpdateData(input),
        updatedDate: new Date(),
        ...(userId ? { updatedByUser: { connect: { userId } } } : {}),
      },
      select: { inventoryId: true, inventoryNumber: true },
    })

    revalidatePath('/inventory')
    return { success: true, inventoryId: updated.inventoryId, inventoryNumber: updated.inventoryNumber }
  } catch (err) {
    return { success: false, error: describeError(err) }
  }
}

export async function deleteInventory(id: number): Promise<ActionResult> {
  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }
  try {
    const inventory = await prisma.inventoryManagement.findUnique({
      where: { inventoryId: id },
      select: { inventoryId: true },
    })
    if (!inventory) return { success: false, error: 'Vehicle not found.' }

    const [photos, videos, checklistCount, dsaCount, insuranceCount, inquiryLinkCount, emailLinkCount, feedbackCount, loanCount, rtoCount] = await Promise.all([
      prisma.inventoryPhotos.findMany({ where: { fkInventoryId: id }, select: { path: true } }),
      prisma.inventoryVideo.findMany({ where: { fkInventoryId: id }, select: { storagePath: true } }),
      prisma.checkListDocMain.count({ where: { inventoryId: id } }),
      prisma.dsaManagement.count({ where: { inventoryId: id } }),
      prisma.insuranceMain.count({ where: { inventoryId: id } }),
      prisma.inquiryInventoryLink.count({ where: { inventoryId: id } }),
      prisma.vehicleEmailLink.count({ where: { inventoryId: id } }),
      prisma.feedbackInvitation.count({ where: { inventoryId: id } }),
      prisma.loanManagement.count({ where: { inventoryId: id } }),
      prisma.rtoAgent.count({ where: { inventoryId: id } }),
    ])
    const dependencyCounts: Array<[string, number]> = [
      ['checklist', checklistCount],
      ['DSA', dsaCount],
      ['insurance', insuranceCount],
      ['inquiry link', inquiryLinkCount],
      ['email link', emailLinkCount],
      ['feedback invitation', feedbackCount],
      ['loan', loanCount],
      ['RTO', rtoCount],
    ]
    const dependencies = dependencyCounts
      .filter(([, count]) => count > 0)
      .map(([name, count]) => `${count} ${name}${count === 1 ? '' : ' records'}`)
    if (dependencies.length > 0) {
      return { success: false, error: `Cannot delete this vehicle because it has related records: ${dependencies.join(', ')}.` }
    }

    await prisma.$transaction(async tx => {
      await tx.inventoryPhotos.deleteMany({ where: { fkInventoryId: id } })
      await tx.inventoryManagement.delete({ where: { inventoryId: id } })
    })

    await cleanupInventoryPhotoFiles([...photos.map(photo => photo.path), ...videos.map(video => video.storagePath)])
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  revalidatePath('/inventory')
  return { success: true }
}

export interface SendInventoryEmailInput {
  recipients: Array<{
    recipientType: 'dealer' | 'customer' | 'direct'
    recipientId: number
    email?: string | null
    name?: string | null
  }>
}

export interface UpdateInventoryEmailRecipientInput {
  recipientType: 'dealer' | 'customer'
  recipientId: number
  email: string
}

export interface SendInventoryWhatsAppInput {
  mobiles: string[]
}

export interface SyncInventoryInquiryInput {
  inquiryId: number
}

function normalizeEmailRecipients(recipients: SendInventoryEmailInput['recipients']) {
  const uniqueRecipients = new Map<string, SendInventoryEmailInput['recipients'][number]>()
  for (const recipient of recipients) {
    if (recipient.recipientType === 'direct') {
      const email = recipient.email?.trim().toLowerCase()
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email ?? '') && (email?.length ?? 0) <= 254) uniqueRecipients.set(`direct:${email}`, { ...recipient, email })
      continue
    }
    if (!Number.isInteger(recipient.recipientId) || recipient.recipientId <= 0) continue
    if (recipient.recipientType !== 'customer' && recipient.recipientType !== 'dealer') continue
    uniqueRecipients.set(`${recipient.recipientType}:${recipient.recipientId}`, recipient)
  }
  return [...uniqueRecipients.values()]
}

export async function updateInventoryEmailRecipient(input: UpdateInventoryEmailRecipientInput): Promise<ActionResult> {
  const authorizedUserId = await currentUserId()
  if (!authorizedUserId) return { success: false, error: 'Not authorized.' }

  const email = input.email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return { success: false, error: 'Enter a valid email address.' }
  }

  try {
    if (input.recipientType === 'customer') {
      await prisma.customer.update({ where: { custId: input.recipientId }, data: { custEmail: email, updatedDt: new Date() } })
      revalidatePath('/config/customers')
    } else {
      await prisma.dealerMaster.update({ where: { dealerId: input.recipientId }, data: { dealerEmail: email, updatedDate: new Date() } })
      revalidatePath('/config/dealers')
    }
  } catch {
    return { success: false, error: 'Could not update the recipient email address.' }
  }

  return { success: true, message: 'Email address updated.' }
}

export async function sendInventoryEmail(inventoryId: number, input: SendInventoryEmailInput): Promise<ActionResult> {
  const authorizedUserId = await currentUserId()
  if (!authorizedUserId) return { success: false, error: 'Not authorized.' }
  const recipients = normalizeEmailRecipients(input.recipients)
  const limits = getInventoryBulkEmailLimits()
  if (recipients.length === 0) return { success: false, error: 'Add at least one recipient.' }
  if (recipients.length > limits.maxRecipients) {
    return { success: false, error: `Add no more than ${limits.maxRecipients} recipients.` }
  }
  if (recipients.length > limits.maxMessages) {
    return { success: false, error: `This send would create ${recipients.length} emails. The limit is ${limits.maxMessages}.` }
  }
  const session = await auth()

  const vehicle = await prisma.inventoryManagement.findUnique({
    where: { inventoryId },
    include: { carVariantMaster: { include: { carMakeMaster: true, carModelMaster: true } } },
  })
  if (!vehicle) return { success: false, error: 'Vehicle not found.' }
  const vehicleDetails = {
    make: vehicle.carVariantMaster?.carMakeMaster?.make ?? vehicle.makeLegacy ?? '',
    model: vehicle.carVariantMaster?.carModelMaster?.model ?? vehicle.modelLegacy ?? '',
    variant: vehicle.carVariantMaster?.variant ?? vehicle.variantLegacy ?? '',
    year: vehicle.year,
  }
  const vehicleSlug = buildVehicleSlug(vehicleDetails)

  const uniqueTargets = new Map<string, { toEmail: string; toName: string; customerId: number | null }>()

  for (const recipient of recipients) {
    if (recipient.recipientType === 'direct' && recipient.email) {
      uniqueTargets.set(recipient.email.toLowerCase(), { toEmail: recipient.email, toName: recipient.name?.trim() || 'there', customerId: null })
    } else if (recipient.recipientType === 'dealer') {
      const dealer = await prisma.dealerMaster.findUnique({ where: { dealerId: recipient.recipientId } })
      if (dealer?.dealerEmail) {
        uniqueTargets.set(dealer.dealerEmail.toLowerCase(), {
          toEmail: dealer.dealerEmail,
          toName: dealer.dealerName ?? 'there',
          customerId: null,
        })
      }
    } else {
      const customer = await prisma.customer.findUnique({ where: { custId: recipient.recipientId } })
      if (customer?.custEmail) {
        uniqueTargets.set(customer.custEmail.toLowerCase(), {
          toEmail: customer.custEmail,
          toName: customer.custName ?? 'there',
          customerId: customer.custId,
        })
      }
    }
  }

  if (uniqueTargets.size === 0) {
    return { success: false, error: 'None of the selected recipients have an email address on file.' }
  }

  let sentCount = 0
  const failedRecipients: string[] = []

  for (const recipient of uniqueTargets.values()) {
    const trackedLink = await createTrackedVehicleEmailLink({
      inventoryId,
      customerId: recipient.customerId,
      recipientEmail: recipient.toEmail,
      recipientName: recipient.toName,
      slug: vehicleSlug,
    })
    const personalized = vehicleDetailsEmail({
      customerName: recipient.toName,
      make: vehicleDetails.make,
      model: vehicleDetails.model,
      variant: vehicleDetails.variant,
      year: vehicle.year,
      colour: vehicle.colour ?? '',
      fuelType: vehicle.fuelType ?? '',
      noOfOwners: vehicle.noOfOwners,
      registrationNo: vehicle.registrationNo ?? '',
      kmsDriven: vehicle.kmsDriven ? vehicle.kmsDriven.toString() : null,
      price: vehicle.price ? vehicle.price.toString() : null,
      remarks: vehicle.otherRemarks ?? '',
      signedBy: session?.user?.name || 'Excel Cars Team',
      viewDetailsUrl: trackedLink.url,
    })

    const result = await sendEmail({ to: recipient.toEmail, subject: personalized.subject, html: personalized.html })
    if (result.success) {
      sentCount += 1
    } else {
      await prisma.vehicleEmailLink.delete({ where: { vehicleEmailLinkId: trackedLink.vehicleEmailLinkId } }).catch(() => undefined)
      failedRecipients.push(recipient.toEmail)
    }
  }

  if (sentCount === 0) {
    return { success: false, error: failedRecipients.length > 0 ? `Could not send email to: ${failedRecipients.join(', ')}` : 'Failed to send email.' }
  }

  const message = failedRecipients.length > 0
    ? `Sent to ${sentCount} recipient${sentCount === 1 ? '' : 's'}. Failed: ${failedRecipients.join(', ')}`
    : `Email sent to ${sentCount} recipient${sentCount === 1 ? '' : 's'}.`

  return { success: true, message }
}

export async function sendInventoryWhatsApp(inventoryId: number, input: SendInventoryWhatsAppInput): Promise<ActionResult> {
  if (!(await currentUserId())) return { success: false, error: 'Not authorized.' }
  const recipients = [...new Set(input.mobiles.map(normalizeWhatsAppRecipient).filter((mobile): mobile is string => Boolean(mobile)))].slice(0, 20)
  if (recipients.length === 0) return { success: false, error: 'Enter at least one valid 10-digit WhatsApp number.' }

  const vehicle = await prisma.inventoryManagement.findUnique({ where: { inventoryId }, include: { carVariantMaster: { include: { carMakeMaster: true, carModelMaster: true } } } })
  if (!vehicle) return { success: false, error: 'Vehicle not found.' }
  const make = vehicle.carVariantMaster?.carMakeMaster?.make ?? vehicle.makeLegacy ?? ''
  const model = vehicle.carVariantMaster?.carModelMaster?.model ?? vehicle.modelLegacy ?? ''
  const variant = vehicle.carVariantMaster?.variant ?? vehicle.variantLegacy ?? ''
  const vehicleName = [vehicle.year ? String(vehicle.year) : '', make, model, variant].filter(Boolean).join(' ') || `Inventory ${vehicle.inventoryNumber ?? inventoryId}`
  const slug = buildVehicleSlug({ make, model, variant, year: vehicle.year })
  let sent = 0
  const failed: string[] = []

  const deliveries = await Promise.all(recipients.map(async mobile => {
    try {
      const trackedLink = await createTrackedVehicleEmailLink({ inventoryId, customerId: null, recipientEmail: `whatsapp:${mobile}`, recipientName: 'Customer', slug, channel: 'WhatsApp' })
      const link = new URL(trackedLink.url)
      const result = await sendEnquiryTemplate({ to: mobile, customerName: 'Customer', vehicleName, buttonUrlSuffix: `${link.pathname}${link.search}`.replace(/^\//, '') })
      if (result.success) return { mobile, success: true }
      else {
        await prisma.vehicleEmailLink.delete({ where: { vehicleEmailLinkId: trackedLink.vehicleEmailLinkId } }).catch(() => undefined)
        return { mobile, success: false }
      }
    } catch {
      return { mobile, success: false }
    }
  }))
  sent = deliveries.filter(delivery => delivery.success).length
  failed.push(...deliveries.filter(delivery => !delivery.success).map(delivery => delivery.mobile))

  if (sent === 0) return { success: false, error: `WhatsApp could not be sent${failed.length ? ` to: ${failed.join(', ')}` : '.'}` }
  return { success: true, message: `WhatsApp submitted to ${sent} recipient${sent === 1 ? '' : 's'}${failed.length ? `. Failed: ${failed.join(', ')}` : '.'}` }
}

export async function syncInventoryToInquiry(inventoryId: number, input: SyncInventoryInquiryInput): Promise<ActionResult> {
  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }

  const ownershipScope = await getInquiryOwnershipScopeForRoute('/inventory')
  if (!ownershipScope.userId) return { success: false, error: 'Not authorized.' }

  try {
    const inventory = await prisma.inventoryManagement.findUnique({
      where: { inventoryId },
      include: {
        customer: true,
        carVariantMaster: {
          include: { carMakeMaster: true, carModelMaster: true },
        },
      },
    })
    if (!inventory) return { success: false, error: 'Vehicle not found.' }

    const inquiry = await prisma.inquiry.findFirst({
      where: {
        AND: [
          { inquiryId: input.inquiryId },
          ...(ownershipScope.restrictToUserId
            ? [buildInquiryOwnershipWhere(ownershipScope.restrictToUserId, ownershipScope.ownershipMode)]
            : []),
        ],
      },
      include: { inquiryCarDetails: { take: 1, orderBy: [{ updatedDt: 'desc' }, { inquiryCarDetailsId: 'desc' }] } },
    })
    if (!inquiry) return { success: false, error: 'Inquiry not found or you do not have access to it.' }

    const isSold = inventory.status === 'Sold'
    const syncNote = [
      `Inventory sync from ${inventory.inventoryNumber ?? `#${inventory.inventoryId}`}`,
      inventory.registrationNo ? `Reg ${inventory.registrationNo}` : null,
      inventory.sku ? `SKU ${inventory.sku}` : null,
      inventory.status ? `Status ${inventory.status}` : null,
    ].filter(Boolean).join(' · ')

    const now = new Date()
    await prisma.$transaction(async (tx) => {
      await tx.inquiry.update({
        where: { inquiryId: input.inquiryId },
        data: {
          customer: inventory.customerId ? { connect: { custId: inventory.customerId } } : inquiry.customerId ? undefined : { disconnect: true },
          // A legacy compatibility name without a linked customer is not
          // authoritative. Keep the inquiry's established name instead of
          // overwriting it with potentially stale inventory text.
          customerNameLegacy: inventory.customerId ? inventory.customerName || inquiry.customerNameLegacy || null : inquiry.customerNameLegacy || null,
          mobileno: inventory.mobileNoOwnedBy || inquiry.mobileno || null,
          email: inventory.emailIdOwnedBy || inquiry.email || null,
          classification: 'Hot',
          status: isSold ? 'Closed' : 'FollowUp',
          subStatus: isSold ? 'Sold Car' : 'Booked Vehicle',
          followUpDate: isSold ? null : inquiry.followUpDate,
          remark: inquiry.remark ? `${inquiry.remark}\n${syncNote}` : syncNote,
          updatedDt: now,
          ...(userId ? { updatedByUser: { connect: { userId } } } : {}),
        },
      })

      const carData = {
        fkVariantId: inventory.fkVariantId,
        makeLegacy: inventory.makeLegacy || inventory.carVariantMaster?.carMakeMaster?.make || null,
        modelLegacy: inventory.modelLegacy || inventory.carVariantMaster?.carModelMaster?.model || null,
        variantLegacy: inventory.variantLegacy || inventory.carVariantMaster?.variant || null,
        year: inventory.year,
        updatedDt: now,
        ...(userId ? { updatedBy: userId } : {}),
      }

      let keepId: number
      const existingCar = inquiry.inquiryCarDetails[0]
      if (existingCar) {
        const updated = await tx.inquiryCarDetails.update({
          where: { inquiryCarDetailsId: existingCar.inquiryCarDetailsId },
          data: carData,
        })
        keepId = updated.inquiryCarDetailsId
      } else {
        const created = await tx.inquiryCarDetails.create({
          data: {
            fkInquiryId: input.inquiryId,
            ...carData,
            createdDt: now,
            ...(userId ? { createdBy: userId } : {}),
          },
        })
        keepId = created.inquiryCarDetailsId
      }

      await tx.inquiryCarDetails.deleteMany({
        where: {
          fkInquiryId: input.inquiryId,
          inquiryCarDetailsId: { not: keepId },
        },
      })

      // This is a stateful workflow link, not a history event. The partial
      // unique index added with the inventory registration migration makes
      // repeated synchronizations safe even when requests race.
      await tx.$executeRaw`
        INSERT INTO public.inquiry_inventory_links
          (inquiry_id, inventory_id, link_type, is_active, created_at, created_by, updated_at, updated_by)
        VALUES (${input.inquiryId}, ${inventory.inventoryId}, 'inventory-sync', TRUE, ${now}, ${userId}, ${now}, ${userId})
        ON CONFLICT (inquiry_id, inventory_id) WHERE link_type = 'inventory-sync'
        DO UPDATE SET
          is_active = TRUE,
          updated_at = EXCLUDED.updated_at,
          updated_by = EXCLUDED.updated_by
      `
    })
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  revalidatePath('/inventory')
  revalidatePath('/inquiry')
  return { success: true }
}

export async function updateInventoryInquiry(input: UpdateInventoryInquiryInput): Promise<ActionResult> {
  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }

  const status = input.status.trim()
  if (!['Open', 'FollowUp', 'Closed'].includes(status)) return { success: false, error: 'Select a valid inquiry status.' }
  if (status === 'FollowUp' && !input.followUpDate) return { success: false, error: 'Follow-up date is required for FollowUp status.' }

  try {
    const now = new Date()
    await prisma.$transaction(async tx => {
      const inquiry = await tx.inquiry.findUnique({ where: { inquiryId: input.inquiryId }, select: { inquiryId: true } })
      if (!inquiry) throw new Error('Inquiry not found.')
      await tx.inquiry.update({
        where: { inquiryId: input.inquiryId },
        data: {
          status,
          subStatus: input.subStatus.trim() || null,
          followUpDate: status === 'FollowUp' ? new Date(`${input.followUpDate}T00:00:00.000`) : null,
          remark: input.remark.trim() || null,
          updatedDt: now,
          updatedByUser: { connect: { userId } },
        },
      })
      await tx.followupInquiry.create({
        data: {
          fkInquiryId: input.inquiryId,
          followupDate: status === 'FollowUp' ? new Date(`${input.followUpDate}T00:00:00.000`) : null,
          followupStatus: status,
          followupSubStatus: input.subStatus.trim() || null,
          comments: input.remark.trim() || null,
          createdDt: now,
          updatedDt: now,
          createdBy: userId,
          updatedBy: userId,
        },
      })
    })
  } catch (error) {
    return { success: false, error: error instanceof Error && error.message === 'Inquiry not found.' ? error.message : 'Could not save inquiry changes.' }
  }

  revalidatePath('/inventory')
  revalidatePath('/inquiry')
  revalidatePath('/followup')
  revalidatePath('/dashboard')
  return { success: true, message: 'Inquiry changes saved.' }
}

function describeError(err: unknown): string {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target) ? err.meta.target.join(',') : String(err.meta?.target ?? '')
      if (target.includes('registration')) return 'This registration number is already active on another vehicle in stock.'
      if (target.includes('inventory_number')) return 'The generated inventory number is already in use.'
      if (target.includes('sku')) return 'The generated SKU is already in use.'
      return 'A unique value is already in use.'
    }
    if (err.code === 'P2003') {
      return 'This vehicle has related records and cannot be deleted. Review the dependent module records first.'
    }
  }
  return 'Something went wrong saving this record.'
}

export async function sendBulkInventoryEmail(inventoryIds: number[], input: SendInventoryEmailInput): Promise<ActionResult> {
  const authorizedUserId = await currentUserId()
  if (!authorizedUserId) return { success: false, error: 'Not authorized.' }

  const ids = [...new Set(inventoryIds.filter(id => Number.isInteger(id) && id > 0))]
  const recipients = normalizeEmailRecipients(input.recipients)
  const limits = getInventoryBulkEmailLimits()
  if (ids.length === 0) return { success: false, error: 'Select at least one vehicle.' }
  if (ids.length > limits.maxVehicles) return { success: false, error: `Select no more than ${limits.maxVehicles} vehicles for bulk email.` }
  if (recipients.length === 0) return { success: false, error: 'Add at least one recipient.' }
  if (recipients.length > limits.maxRecipients) return { success: false, error: `Add no more than ${limits.maxRecipients} recipients for bulk email.` }
  if (ids.length * recipients.length > limits.maxMessages) return { success: false, error: `This send would create ${ids.length * recipients.length} emails. The limit is ${limits.maxMessages}.` }

  const sentInventoryIds: number[] = []
  const failedInventoryIds: number[] = []
  for (const inventoryId of ids) {
    const result = await sendInventoryEmail(inventoryId, { recipients })
    if (result.success) sentInventoryIds.push(inventoryId)
    else failedInventoryIds.push(inventoryId)
  }

  return {
    success: sentInventoryIds.length > 0,
    error: sentInventoryIds.length === 0 ? 'Could not send email for any selected vehicle.' : undefined,
    message: `${sentInventoryIds.length} vehicle${sentInventoryIds.length === 1 ? '' : 's'} processed.${failedInventoryIds.length > 0 ? ` ${failedInventoryIds.length} failed.` : ''}`,
    sentInventoryIds,
    failedInventoryIds,
  }
}

export async function getInventoryBulkEmailConfig() {
  if (!(await currentUserId())) return null
  return getInventoryBulkEmailLimits()
}

async function cleanupInventoryPhotoFiles(photoPaths: Array<string | null>) {
  const uploadRoot = path.join(process.cwd(), 'public', 'uploads', 'inventory')
  const root = path.resolve(uploadRoot)

  await Promise.all(photoPaths.map(async photoPath => {
    if (isFirebaseStoragePath(photoPath)) {
      await deleteFromFirebaseStorage(photoPath).catch(error => console.error('Inventory photo cleanup failed:', photoPath, error))
      return
    }
    if (!photoPath?.startsWith('/uploads/inventory')) return
    const resolved = path.resolve(path.join(process.cwd(), 'public', photoPath.replace(/^\//, '')))
    if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) return
    try {
      await unlink(resolved)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('Inventory photo cleanup failed:', resolved, error)
      }
    }
  }))
}
