'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { auth } from '../../../auth'
import { sendEmail } from '@/lib/email/sendMail'
import { vehicleDetailsEmail } from '@/lib/email/templates'
import { buildTrackedVehicleUrl, buildVehicleSlug, generateVehicleEmailToken } from '@/lib/vehicleEmailLinks'

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
}

async function currentUserId(): Promise<number | null> {
  const session = await auth()
  const id = session?.user?.id
  return id ? Number(id) : null
}

function hasVehicleIdentity(input: InventoryFormInput) {
  return Boolean(
    input.fkVariantId
    || input.makeLegacy.trim()
    || input.modelLegacy.trim()
    || input.variantLegacy.trim(),
  )
}

function buildData(input: InventoryFormInput) {
  return {
    registrationNo: input.registrationNo || null,
    ...(input.fkVariantId
      ? { carVariantMaster: { connect: { pkVariantId: input.fkVariantId } } }
      : {}),
    makeLegacy: input.makeLegacy || null,
    modelLegacy: input.modelLegacy || null,
    variantLegacy: input.variantLegacy || null,
    colour: input.colour || null,
    year: input.year,
    month: input.month || null,
    fuelType: input.fuelType || null,
    noOfOwners: input.noOfOwners,
    tax: input.tax || null,
    isCarRegistered: input.isCarRegistered,
    kmsDriven: input.kmsDriven,
    insuranceType: input.insuranceType || null,
    price: input.price,
    status: input.status || null,
    ownedType: input.ownedType || null,
    ownedBy: input.ownedBy || null,
    mobileNoOwnedBy: input.mobileNoOwnedBy || null,
    emailIdOwnedBy: input.emailIdOwnedBy || null,
    customerName: input.customerName || null,
    internalComments: input.internalComments || null,
    otherRemarks: input.otherRemarks || null,
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
  if (!input.registrationNo?.trim()) {
    return { success: false, error: 'Registration number is required.' }
  }
  if (!hasVehicleIdentity(input)) {
    return { success: false, error: 'Select a catalog variant or enter legacy vehicle details.' }
  }

  const userId = await currentUserId()

  try {
    const created = await prisma.inventoryManagement.create({
      data: {
        ...buildData(input),
        createdDate: new Date(),
        updatedDate: new Date(),
        ...(userId ? { createdByUser: { connect: { userId } }, updatedByUser: { connect: { userId } } } : {}),
      },
      select: { inventoryId: true, inventoryNumber: true },
    })

    const inventoryNumber = `Inventory/${created.inventoryId}`
    const sku = `EC-${String(created.inventoryId).padStart(4, '0')}`

    const finalized = await prisma.inventoryManagement.update({
      where: { inventoryId: created.inventoryId },
      data: { sku, inventoryNumber },
      select: { inventoryId: true, inventoryNumber: true },
    })

    revalidatePath('/inventory')
    return { success: true, inventoryId: finalized.inventoryId, inventoryNumber: finalized.inventoryNumber }
  } catch (err) {
    return { success: false, error: describeError(err) }
  }
}

export async function updateInventory(id: number, input: InventoryFormInput): Promise<ActionResult> {
  if (!input.registrationNo?.trim()) {
    return { success: false, error: 'Registration number is required.' }
  }
  if (!hasVehicleIdentity(input)) {
    return { success: false, error: 'Select a catalog variant or enter legacy vehicle details.' }
  }

  const userId = await currentUserId()

  try {
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
  try {
    await prisma.inventoryManagement.delete({ where: { inventoryId: id } })
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

export interface SyncInventoryInquiryInput {
  inquiryId: number
}

export async function sendInventoryEmail(inventoryId: number, input: SendInventoryEmailInput): Promise<ActionResult> {
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
      return 'This registration number is already active on another vehicle in stock.'
    }
    if (err.code === 'P2003') {
      return 'This vehicle has related records (checklist, insurance, loan, RTO, or DSA entries) and cannot be deleted.'
    }
  }
  return 'Something went wrong saving this record.'
}
