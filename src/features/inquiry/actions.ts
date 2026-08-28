'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { auth } from '../../../auth'
import { getAuthorizedUserIdForRoute } from '@/lib/access/accessControl'
import { sendEmail } from '@/lib/email/sendMail'
import { vehicleDetailsEmail } from '@/lib/email/templates'
import { buildTrackedVehicleUrl, buildVehicleSlug, generateVehicleEmailToken } from '@/lib/vehicleEmailLinks'

export interface InquiryFormInput {
  inquiryNo: string
  dateOfInquiry: string
  website: string
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
}

export interface InquiryCarInput {
  inquiryCarDetailsId?: number | null
  selectedMakeId?: number | null
  selectedModelId?: number | null
  fkVariantId: number | null
  subVariant: string
  carYear: number | null
}

export interface ActionResult {
  success: boolean
  error?: string
  message?: string
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

async function currentUserId(): Promise<number | null> {
  return getAuthorizedUserIdForRoute('/inquiry')
}

function toDate(v: string): Date | null {
  return v ? new Date(v) : null
}

async function resolveInquiryContact(input: InquiryFormInput) {
  if (!input.customerId) {
    return {
      customerId: null,
      customerNameLegacy: input.customerNameLegacy.trim() || null,
      mobileno: input.mobileno.trim() || null,
      email: input.email.trim() || null,
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
  return Boolean(input.fkVariantId || input.subVariant.trim() || input.carYear)
}

async function resolveInquiryCarDetail(input: InquiryCarInput) {
  if (!input.fkVariantId) {
    return {
      fkVariantId: null,
      makeLegacy: null,
      modelLegacy: null,
      variantLegacy: null,
      subVariant: input.subVariant.trim() || null,
      year: input.carYear,
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
      year: input.carYear,
    }
  }

  return {
    fkVariantId: input.fkVariantId,
    makeLegacy: variant.carMakeMaster?.make?.trim() || null,
    modelLegacy: variant.carModelMaster?.model?.trim() || null,
    variantLegacy: variant.variant?.trim() || null,
    subVariant: input.subVariant.trim() || null,
    year: input.carYear,
  }
}

function buildInquiryData(input: InquiryFormInput, resolvedContact: Awaited<ReturnType<typeof resolveInquiryContact>>) {
  return {
    inquiryNo: input.inquiryNo || null,
    dateOfInquiry: toDate(input.dateOfInquiry),
    website: input.website || null,
    customerNameLegacy: resolvedContact.customerNameLegacy,
    mobileno: resolvedContact.mobileno,
    email: resolvedContact.email,
    budgetOfCustomer: input.budgetOfCustomer,
    visitedDateOfCustomer: toDate(input.visitedDateOfCustomer),
    classification: input.classification || null,
    status: input.status || null,
    subStatus: input.subStatus || null,
    followUpDate: toDate(input.followUpDate),
    remark: input.remark || null,
  }
}

function validateInquiryWorkflow(input: InquiryFormInput): string | null {
  const status = input.status.trim()
  const subStatus = input.subStatus.trim().toLowerCase()
  const inquiryDate = input.dateOfInquiry.trim()
  const followUpDate = input.followUpDate.trim()
  const visitedDate = input.visitedDateOfCustomer.trim()

  if (status === 'FollowUp' && !followUpDate) {
    return 'Follow-up date is required when status is FollowUp.'
  }

  if (subStatus === 'visited' && !visitedDate) {
    return 'Visited date is required when sub-status is Visited.'
  }

  if (inquiryDate && followUpDate && followUpDate < inquiryDate) {
    return 'Follow-up date cannot be before inquiry date.'
  }

  if (inquiryDate && visitedDate && visitedDate < inquiryDate) {
    return 'Visited date cannot be before inquiry date.'
  }

  return null
}

async function resolveInquiryCarDetails(input: InquiryFormInput) {
  const meaningfulCars = input.inquiryCars.filter(hasMeaningfulInquiryCar)
  return Promise.all(meaningfulCars.map(resolveInquiryCarDetail))
}

async function sendInquiryCarEmail(inquiryId: number): Promise<ActionResult> {
  const session = await auth()

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
    signedBy: session?.user?.name || 'Excel Cars Team',
  })

  return sendEmail({ to: toEmail, subject, html })
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
}: {
  inquiryId: number
  inventoryId: number
  signedBy: string
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
    signedBy,
    viewDetailsUrl: trackedLink.url,
  })

  const result = await sendEmail({ to: recipient.toEmail, subject, html })
  if (!result.success) {
    await prisma.vehicleEmailLink.delete({ where: { vehicleEmailLinkId: trackedLink.vehicleEmailLinkId } }).catch(() => undefined)
    return result
  }

  return { success: true }
}

async function findMatchingInventoryIdsForInquiryCars(resolvedCarDetails: Awaited<ReturnType<typeof resolveInquiryCarDetails>>) {
  const matchIds = new Set<number>()

  for (const car of resolvedCarDetails) {
    const where: Prisma.InventoryManagementWhereInput = {
      status: { equals: 'In Stock', mode: 'insensitive' },
      ...(car.year ? { year: car.year } : {}),
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

export async function getInquiryDetail(inquiryId: number) {
  const userId = await currentUserId()
  if (!userId) return null
  const detail = await prisma.inquiry.findUnique({
    where: { inquiryId },
    include: {
      customer: true,
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
    },
  })

  if (!detail) return null

  return {
    ...detail,
    budgetOfCustomer: detail.budgetOfCustomer ? detail.budgetOfCustomer.toString() : null,
  }
}

export async function sendInquiryInventoryEmail(inquiryId: number, inventoryId: number): Promise<ActionResult> {
  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }
  const session = await auth()
  return sendMatchedInventoryEmailToInquiryRecipient({
    inquiryId,
    inventoryId,
    signedBy: session?.user?.name || 'Excel Cars Team',
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
  const failedIds: number[] = []

  for (const inventoryId of uniqueInventoryIds) {
    const result = await sendMatchedInventoryEmailToInquiryRecipient({
      inquiryId,
      inventoryId,
      signedBy: session?.user?.name || 'Excel Cars Team',
    })
    if (result.success) {
      sentCount += 1
    } else {
      failedIds.push(inventoryId)
    }
  }

  if (sentCount === 0) {
    return { success: false, error: 'Could not send any of the selected matching inventory vehicles.' }
  }

  return {
    success: true,
    message: failedIds.length > 0
      ? `Sent ${sentCount} matching vehicle email${sentCount === 1 ? '' : 's'}. Failed for ${failedIds.length} vehicle${failedIds.length === 1 ? '' : 's'}.`
      : `Sent ${sentCount} matching vehicle email${sentCount === 1 ? '' : 's'}.`,
  }
}

function nextInquiryNumberFromLatest(latestInquiryNo: string | null | undefined) {
  if (!latestInquiryNo) return 'Inquiry/1'

  const parts = latestInquiryNo.split('/')
  const lastPart = parts[parts.length - 1]
  const parsed = Number(lastPart)
  if (!Number.isFinite(parsed) || parsed < 1) return 'Inquiry/1'

  const prefix = parts.slice(0, -1).join('/') || 'Inquiry'
  return `${prefix}/${parsed + 1}`
}

export async function getNextInquiryNumber(): Promise<string> {
  const userId = await currentUserId()
  if (!userId) return 'Inquiry/1'
  const latest = await prisma.inquiry.findFirst({
    orderBy: { inquiryId: 'desc' },
    select: { inquiryNo: true },
  })

  return nextInquiryNumberFromLatest(latest?.inquiryNo)
}

function isInquiryNumberConflict(err: unknown) {
  const targets = Array.isArray((err as { meta?: { target?: unknown } })?.meta?.target)
    ? ((err as { meta?: { target?: unknown[] } }).meta?.target ?? []).map(target => String(target))
    : []

  return err instanceof Prisma.PrismaClientKnownRequestError
    && err.code === 'P2002'
    && targets.some(target => target === 'inquiry_no' || target === 'inquiryNo' || target.includes('inquiry'))
}

export async function createInquiry(input: InquiryFormInput): Promise<ActionResult> {
  if (!input.customerId && !input.customerNameLegacy.trim() && !input.mobileno.trim()) {
    return { success: false, error: 'Link a customer or enter a name/mobile.' }
  }
  const workflowError = validateInquiryWorkflow(input)
  if (workflowError) {
    return { success: false, error: workflowError }
  }

  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }
  const resolvedContact = await resolveInquiryContact(input)
  if (resolvedContact.error) {
    return { success: false, error: resolvedContact.error }
  }
  const resolvedCarDetails = await resolveInquiryCarDetails(input)

  let newInquiryId: number | null = null

  try {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const inquiryNo = await getNextInquiryNumber()
      try {
        const created = await prisma.inquiry.create({
          data: {
            ...buildInquiryData({ ...input, inquiryNo }, resolvedContact),
            ...(resolvedContact.customerId ? { customer: { connect: { custId: resolvedContact.customerId } } } : {}),
            createdDt: new Date(),
            updatedDt: new Date(),
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
                      createdDt: new Date(),
                      updatedDt: new Date(),
                      ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
                    })),
                  },
                }
              : {}),
          },
        })
        newInquiryId = created.inquiryId
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

  if (newInquiryId && resolvedCarDetails.length > 0) {
    try {
      const matchedInventoryIds = await findMatchingInventoryIdsForInquiryCars(resolvedCarDetails)
      if (matchedInventoryIds.length > 0) {
        await sendInquiryInventoryEmails(newInquiryId, matchedInventoryIds)
      }
    } catch {
      // swallow — saving the inquiry succeeded regardless of auto-email outcome
    }
  }

  revalidatePath('/inquiry')
  return { success: true }
}

export async function updateInquiry(id: number, input: InquiryFormInput): Promise<ActionResult> {
  if (!input.customerId && !input.customerNameLegacy.trim() && !input.mobileno.trim()) {
    return { success: false, error: 'Link a customer or enter a name/mobile.' }
  }
  const workflowError = validateInquiryWorkflow(input)
  if (workflowError) {
    return { success: false, error: workflowError }
  }

  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }
  const resolvedContact = await resolveInquiryContact(input)
  if (resolvedContact.error) {
    return { success: false, error: resolvedContact.error }
  }
  const resolvedCarDetails = await resolveInquiryCarDetails(input)

  try {
    const now = new Date()
    await prisma.$transaction(async (tx) => {
      await tx.inquiry.update({
        where: { inquiryId: id },
        data: {
          ...buildInquiryData(input, resolvedContact),
          customer: resolvedContact.customerId ? { connect: { custId: resolvedContact.customerId } } : { disconnect: true },
          updatedDt: now,
          ...(userId ? { updatedByUser: { connect: { userId } } } : {}),
        },
      })

      await tx.inquiryCarDetails.deleteMany({ where: { fkInquiryId: id } })

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
            createdDt: now,
            updatedDt: now,
            ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
          })),
        })
      }
    })
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  revalidatePath('/inquiry')
  return { success: true }
}

export async function deleteInquiry(id: number): Promise<ActionResult> {
  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }
  try {
    await prisma.inquiryCarDetails.deleteMany({ where: { fkInquiryId: id } })
    await prisma.inquiry.delete({ where: { inquiryId: id } })
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  revalidatePath('/inquiry')
  return { success: true }
}

function describeError(err: unknown): string {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2003') {
      return 'This inquiry has related records and cannot be deleted.'
    }
  }
  return 'Something went wrong saving this record.'
}
