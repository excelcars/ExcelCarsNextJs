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

export interface CreateInquiryOptions {
  sendMatchingInventoryOnCreate?: boolean
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

function hasMeaningfulFollowupState(input: InquiryFormInput) {
  return Boolean(
    normalizeOptionalText(input.status)
    || normalizeOptionalText(input.subStatus)
    || normalizeOptionalText(input.classification)
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
  await prisma.followupInquiry.create({
    data: {
      fkInquiryId: inquiryId,
      followupDate: selectedFollowupDate ?? now,
      followupStatus: normalizeOptionalText(input.status),
      followupSubStatus: normalizeOptionalText(input.subStatus),
      followupClassification: normalizeOptionalText(input.classification),
      comments: normalizeOptionalText(input.remark),
      createdDt: now,
      updatedDt: now,
      ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
    },
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
    },
  })

  if (!detail) return null

  return {
    ...detail,
    budgetOfCustomer: detail.budgetOfCustomer ? detail.budgetOfCustomer.toString() : null,
    inquiryInventoryLinks: detail.inquiryInventoryLinks.map(link => ({
      ...link,
      inventoryManagement: {
        ...link.inventoryManagement,
        kmsDriven: link.inventoryManagement.kmsDriven ? link.inventoryManagement.kmsDriven.toString() : null,
        price: link.inventoryManagement.price ? link.inventoryManagement.price.toString() : null,
      },
    })),
  }
}

export async function sendInquiryInventoryEmail(inquiryId: number, inventoryId: number): Promise<ActionResult> {
  const session = await auth()
  return sendMatchedInventoryEmailToInquiryRecipient({
    inquiryId,
    inventoryId,
    signedBy: session?.user?.name || 'Excel Cars Team',
    userId: session?.user?.id ? Number(session.user.id) : null,
  })
}

export async function sendInquiryInventoryEmails(inquiryId: number, inventoryIds: number[]): Promise<ActionResult> {
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
      userId: session?.user?.id ? Number(session.user.id) : null,
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

export async function getNextInquiryNumber(): Promise<string> {
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
  const resolvedCarDetails = await resolveInquiryCarDetails(input)

  let newInquiryId: number | null = null

  try {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const inquiryNo = await getNextInquiryNumber()
      const now = new Date()
      try {
        const created = await prisma.inquiry.create({
          data: {
            ...buildInquiryData({ ...input, inquiryNo }, resolvedContact),
            ...(resolvedContact.customerId ? { customer: { connect: { custId: resolvedContact.customerId } } } : {}),
            createdDt: now,
            updatedDt: now,
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
        resultMessage = emailResult.success
          ? (emailResult.message ?? 'Inquiry saved and matching inventory email sent.')
          : 'Inquiry saved, but matching inventory email could not be sent.'
      } else {
        resultMessage = 'Inquiry saved. No matching inventory was available to send.'
      }
    } catch {
      resultMessage = 'Inquiry saved, but matching inventory email could not be sent.'
    }
  } else if (options.sendMatchingInventoryOnCreate) {
    resultMessage = 'Inquiry saved. No vehicle rows were available for matching inventory send.'
  }

  revalidatePath('/inquiry')
  revalidatePath('/followup')
  revalidatePath('/dashboard')
  revalidatePath('/config/customers')
  return { success: true, message: resultMessage }
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
  const resolvedCarDetails = await resolveInquiryCarDetails(input)

  try {
    const now = new Date()
    const existing = await prisma.inquiry.findUnique({
      where: { inquiryId: id },
      select: {
        status: true,
        subStatus: true,
        classification: true,
        remark: true,
        followUpDate: true,
      },
    })

    if (!existing) {
      return { success: false, error: 'Inquiry not found.' }
    }

    const shouldAppendFollowup = hasMeaningfulFollowupState(input) && hasFollowupStateChanged(existing, input)
    const selectedFollowupDate = toDate(input.followUpDate)

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

      if (shouldAppendFollowup) {
        await tx.followupInquiry.create({
          data: {
            fkInquiryId: id,
            followupDate: selectedFollowupDate ?? now,
            followupStatus: normalizeOptionalText(input.status),
            followupSubStatus: normalizeOptionalText(input.subStatus),
            followupClassification: normalizeOptionalText(input.classification),
            comments: normalizeOptionalText(input.remark),
            createdDt: now,
            updatedDt: now,
            ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
          },
        })
      }
    })
  } catch (err) {
    return { success: false, error: describeError(err) }
  }

  revalidatePath('/inquiry')
  revalidatePath('/followup')
  revalidatePath('/dashboard')
  revalidatePath('/config/customers')
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
