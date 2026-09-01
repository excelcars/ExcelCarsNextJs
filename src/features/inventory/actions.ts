'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { unlink } from 'fs/promises'
import path from 'path'
import { prisma } from '@/lib/db/prisma'
import { auth } from '../../../auth'
import { getAuthorizedUserIdForRoute } from '@/lib/access/accessControl'
import { sendEmail } from '@/lib/email/sendMail'
import { vehicleDetailsEmail } from '@/lib/email/templates'
import { buildTrackedVehicleUrl, buildVehicleSlug, generateVehicleEmailToken } from '@/lib/vehicleEmailLinks'
import { normalizeRegistrationNo, validateInventoryInput } from '@/lib/validation'
import { getInventoryBulkEmailLimits } from './emailLimits'

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

/** Returns the next inventory number using the legacy Inventory/{number} sequence. */
export async function getNextInventoryNumber() {
  if (!(await currentUserId())) return null
  const latest = await prisma.inventoryManagement.findFirst({
    where: { inventoryNumber: { not: null } },
    orderBy: { inventoryId: 'desc' },
    select: { inventoryNumber: true },
  })
  const match = latest?.inventoryNumber?.match(/^([^/]+)\/(\d+)$/)
  return match ? `${match[1]}/${Number(match[2]) + 1}` : 'Inventory/1'
}

/** Returns the legacy SKU preview/next value for a make, model, and colour. */
export async function getInventorySku(make: string, model: string, colour: string, excludeInventoryId?: number) {
  if (!(await currentUserId())) return ''
  const cleanMake = make.trim()
  const cleanModel = model.trim()
  const cleanColour = colour.trim()
  if (!cleanMake || !cleanModel || !cleanColour) return ''

  const previous = await prisma.inventoryManagement.findFirst({
    where: {
      makeLegacy: cleanMake,
      modelLegacy: cleanModel,
      colour: cleanColour,
      ...(excludeInventoryId ? { NOT: { inventoryId: excludeInventoryId } } : {}),
    },
    orderBy: { inventoryId: 'desc' },
    select: { sku: true },
  })

  if (previous?.sku) {
    const parts = previous.sku.split('-')
    const last = Number(parts[parts.length - 1])
    if (parts.length > 1 && Number.isInteger(last)) {
      parts[parts.length - 1] = String(last + 1)
      return parts.join('-')
    }
  }

  return `${legacySkuPart(cleanMake)}-${legacySkuPart(cleanModel)}-${legacySkuPart(cleanColour)}-1`
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
}: {
  inventoryId: number
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

    const normalizedRegistrationNo = normalizeRegistrationNo(input.registrationNo)
    if (normalizedRegistrationNo.length > 5) {
      const duplicate = await prisma.inventoryManagement.findFirst({
        where: { registrationNo: normalizedRegistrationNo },
        select: { inventoryId: true },
      })
      if (duplicate) return { success: false, error: 'This registration number is already active on another vehicle in stock.' }
    }

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
    const sku = await getInventorySku(skuMake, skuModel, input.colour)
    const inventoryNumber = await getNextInventoryNumber()
    if (!inventoryNumber) return { success: false, error: 'Not authorized.' }
    const created = await prisma.inventoryManagement.create({
      data: {
        ...buildData(input),
        sku,
        inventoryNumber,
        createdDate: new Date(),
        updatedDate: new Date(),
        ...(userId ? { createdByUser: { connect: { userId } }, updatedByUser: { connect: { userId } } } : {}),
      },
      select: { inventoryId: true, inventoryNumber: true },
    })

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
      if (duplicate) return { success: false, error: 'This registration number is already active on another vehicle in stock.' }
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

    const [photos, checklistCount, dsaCount, insuranceCount, inquiryLinkCount, emailLinkCount, feedbackCount, loanCount, rtoCount] = await Promise.all([
      prisma.inventoryPhotos.findMany({ where: { fkInventoryId: id }, select: { path: true } }),
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

    await cleanupInventoryPhotoFiles(photos.map(photo => photo.path))
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  revalidatePath('/inventory')
  return { success: true }
}

export interface SendInventoryEmailInput {
  recipients: Array<{
    recipientType: 'dealer' | 'customer'
    recipientId: number
  }>
}

export interface UpdateInventoryEmailRecipientInput {
  recipientType: 'dealer' | 'customer'
  recipientId: number
  email: string
}

export interface SyncInventoryInquiryInput {
  inquiryId: number
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

  for (const recipient of input.recipients) {
    if (recipient.recipientType === 'dealer') {
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

export async function syncInventoryToInquiry(inventoryId: number, input: SyncInventoryInquiryInput): Promise<ActionResult> {
  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }

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

    const inquiry = await prisma.inquiry.findUnique({
      where: { inquiryId: input.inquiryId },
      include: { inquiryCarDetails: { take: 1, orderBy: [{ updatedDt: 'desc' }, { inquiryCarDetailsId: 'desc' }] } },
    })
    if (!inquiry) return { success: false, error: 'Inquiry not found.' }

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
          customerNameLegacy: inventory.customerName || inquiry.customerNameLegacy || null,
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
    })
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  revalidatePath('/inventory')
  revalidatePath('/inquiry')
  return { success: true }
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

  const ids = [...new Set(inventoryIds.filter(Number.isInteger))]
  const recipients = input.recipients.filter(recipient => Number.isInteger(recipient.recipientId))
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
