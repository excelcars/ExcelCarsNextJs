'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { auth } from '../../../auth'
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
  fkVariantId: number | null
  subVariant: string
  carYear: number | null
}

export interface ActionResult {
  success: boolean
  error?: string
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
  const session = await auth()
  const id = session?.user?.id
  return id ? Number(id) : null
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

async function resolveInquiryCarDetail(input: InquiryFormInput) {
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

async function sendInquiryCarEmail(inquiryId: number): Promise<ActionResult> {
  const session = await auth()

  const inquiry = await prisma.inquiry.findUnique({
    where: { inquiryId },
    include: {
      customer: true,
      inquiryCarDetails: {
        include: { carVariantMaster: { include: { carMakeMaster: true, carModelMaster: true } } },
        take: 1,
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
  return sendInquiryCarEmail(inquiryId)
}

export async function getInquiryDetail(inquiryId: number) {
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
  const session = await auth()

  const [inquiry, inventory] = await Promise.all([
    prisma.inquiry.findUnique({
      where: { inquiryId },
      include: { customer: true },
    }),
    prisma.inventoryManagement.findUnique({
      where: { inventoryId },
      include: {
        carVariantMaster: {
          include: { carMakeMaster: true, carModelMaster: true },
        },
      },
    }),
  ])

  if (!inquiry) return { success: false, error: 'Inquiry not found.' }
  if (!inventory) return { success: false, error: 'Inventory vehicle not found.' }

  const toEmail = inquiry.customer?.custEmail || inquiry.email
  const toName = inquiry.customer?.custName || inquiry.customerNameLegacy || 'there'
  if (!toEmail) return { success: false, error: 'This inquiry has no customer email on file.' }

  const vehicleDetails = {
    make: inventory.carVariantMaster?.carMakeMaster?.make ?? inventory.makeLegacy ?? '',
    model: inventory.carVariantMaster?.carModelMaster?.model ?? inventory.modelLegacy ?? '',
    variant: inventory.carVariantMaster?.variant ?? inventory.variantLegacy ?? '',
    year: inventory.year,
  }
  const vehicleSlug = buildVehicleSlug(vehicleDetails)

  const trackedLink = await createTrackedVehicleEmailLink({
    inventoryId,
    customerId: inquiry.customerId,
    recipientEmail: toEmail,
    recipientName: toName,
    slug: vehicleSlug,
  })

  const { subject, html } = vehicleDetailsEmail({
    customerName: toName,
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
    signedBy: session?.user?.name || 'Excel Cars Team',
    viewDetailsUrl: trackedLink.url,
  })

  const result = await sendEmail({ to: toEmail, subject, html })
  if (!result.success) {
    await prisma.vehicleEmailLink.delete({ where: { vehicleEmailLinkId: trackedLink.vehicleEmailLinkId } }).catch(() => undefined)
    return result
  }

  return { success: true }
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
  const resolvedContact = await resolveInquiryContact(input)
  if (resolvedContact.error) {
    return { success: false, error: resolvedContact.error }
  }
  const resolvedCarDetail = await resolveInquiryCarDetail(input)

  let newInquiryId: number | null = null

  try {
    const created = await prisma.inquiry.create({
      data: {
        ...buildInquiryData(input, resolvedContact),
        ...(resolvedContact.customerId ? { customer: { connect: { custId: resolvedContact.customerId } } } : {}),
        createdDt: new Date(),
        updatedDt: new Date(),
        ...(userId ? { createdByUser: { connect: { userId } }, updatedByUser: { connect: { userId } } } : {}),
        ...(input.fkVariantId || input.carYear
          ? {
              inquiryCarDetails: {
                create: [
                  {
                    fkVariantId: resolvedCarDetail.fkVariantId,
                    makeLegacy: resolvedCarDetail.makeLegacy,
                    modelLegacy: resolvedCarDetail.modelLegacy,
                    variantLegacy: resolvedCarDetail.variantLegacy,
                    subVariant: resolvedCarDetail.subVariant,
                    year: resolvedCarDetail.year,
                    createdDt: new Date(),
                    updatedDt: new Date(),
                    ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
                  },
                ],
              },
            }
          : {}),
      },
    })
    newInquiryId = created.inquiryId
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  // matches legacy behavior: a brand-new inquiry with a car of interest selected
  // silently emails the customer the car details on first save. Best-effort —
  // must never fail the inquiry save itself (e.g. no email on file, email not configured).
  if (newInquiryId && (input.fkVariantId || input.carYear)) {
    try {
      await sendInquiryCarEmail(newInquiryId)
    } catch {
      // swallow — saving the inquiry succeeded regardless of email outcome
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
  const resolvedContact = await resolveInquiryContact(input)
  if (resolvedContact.error) {
    return { success: false, error: resolvedContact.error }
  }
  const resolvedCarDetail = await resolveInquiryCarDetail(input)

  try {
    const now = new Date()
    await prisma.$transaction(async (tx) => {
      const existing = await tx.inquiryCarDetails.findFirst({
        where: { fkInquiryId: id },
        orderBy: [{ updatedDt: 'desc' }, { inquiryCarDetailsId: 'desc' }],
      })

      await tx.inquiry.update({
        where: { inquiryId: id },
        data: {
          ...buildInquiryData(input, resolvedContact),
          customer: resolvedContact.customerId ? { connect: { custId: resolvedContact.customerId } } : { disconnect: true },
          updatedDt: now,
          ...(userId ? { updatedByUser: { connect: { userId } } } : {}),
        },
      })

      if (input.fkVariantId || input.carYear) {
        let keepId: number
        if (existing) {
          const updated = await tx.inquiryCarDetails.update({
            where: { inquiryCarDetailsId: existing.inquiryCarDetailsId },
            data: {
              fkVariantId: resolvedCarDetail.fkVariantId,
              makeLegacy: resolvedCarDetail.makeLegacy,
              modelLegacy: resolvedCarDetail.modelLegacy,
              variantLegacy: resolvedCarDetail.variantLegacy,
              subVariant: resolvedCarDetail.subVariant,
              year: resolvedCarDetail.year,
              updatedDt: now,
              ...(userId ? { updatedBy: userId } : {}),
            },
          })
          keepId = updated.inquiryCarDetailsId
        } else {
          const created = await tx.inquiryCarDetails.create({
            data: {
              fkInquiryId: id,
              fkVariantId: resolvedCarDetail.fkVariantId,
              makeLegacy: resolvedCarDetail.makeLegacy,
              modelLegacy: resolvedCarDetail.modelLegacy,
              variantLegacy: resolvedCarDetail.variantLegacy,
              subVariant: resolvedCarDetail.subVariant,
              year: resolvedCarDetail.year,
              createdDt: now,
              updatedDt: now,
              ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
            },
          })
          keepId = created.inquiryCarDetailsId
        }

        await tx.inquiryCarDetails.deleteMany({
          where: {
            fkInquiryId: id,
            inquiryCarDetailsId: { not: keepId },
          },
        })
      } else {
        await tx.inquiryCarDetails.deleteMany({ where: { fkInquiryId: id } })
      }
    })
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  revalidatePath('/inquiry')
  return { success: true }
}

export async function deleteInquiry(id: number): Promise<ActionResult> {
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
