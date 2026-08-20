'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { auth } from '../../../auth'
import { sendEmail } from '@/lib/email/sendMail'
import { vehicleDetailsEmail } from '@/lib/email/templates'

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
  carYear: number | null
}

export interface ActionResult {
  success: boolean
  error?: string
}

async function currentUserId(): Promise<number | null> {
  const session = await auth()
  const id = session?.user?.id
  return id ? Number(id) : null
}

function toDate(v: string): Date | null {
  return v ? new Date(v) : null
}

function buildInquiryData(input: InquiryFormInput) {
  return {
    inquiryNo: input.inquiryNo || null,
    dateOfInquiry: toDate(input.dateOfInquiry),
    website: input.website || null,
    customerNameLegacy: input.customerNameLegacy || null,
    mobileno: input.mobileno || null,
    email: input.email || null,
    budgetOfCustomer: input.budgetOfCustomer,
    visitedDateOfCustomer: toDate(input.visitedDateOfCustomer),
    classification: input.classification || null,
    status: input.status || null,
    subStatus: input.subStatus || null,
    followUpDate: toDate(input.followUpDate),
    remark: input.remark || null,
  }
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
    make: car.carVariantMaster?.carMakeMaster?.make ?? '',
    model: car.carVariantMaster?.carModelMaster?.model ?? '',
    variant: car.carVariantMaster?.variant ?? '',
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

export async function createInquiry(input: InquiryFormInput): Promise<ActionResult> {
  if (!input.customerId && !input.customerNameLegacy.trim() && !input.mobileno.trim()) {
    return { success: false, error: 'Link a customer or enter a name/mobile.' }
  }

  const userId = await currentUserId()

  let newInquiryId: number | null = null

  try {
    const created = await prisma.inquiry.create({
      data: {
        ...buildInquiryData(input),
        ...(input.customerId ? { customer: { connect: { custId: input.customerId } } } : {}),
        createdDt: new Date(),
        updatedDt: new Date(),
        ...(userId ? { createdByUser: { connect: { userId } }, updatedByUser: { connect: { userId } } } : {}),
        ...(input.fkVariantId || input.carYear
          ? {
              inquiryCarDetails: {
                create: [
                  {
                    fkVariantId: input.fkVariantId,
                    year: input.carYear,
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

  const userId = await currentUserId()

  try {
    const existing = await prisma.inquiryCarDetails.findFirst({ where: { fkInquiryId: id } })

    await prisma.inquiry.update({
      where: { inquiryId: id },
      data: {
        ...buildInquiryData(input),
        customer: input.customerId ? { connect: { custId: input.customerId } } : { disconnect: true },
        updatedDt: new Date(),
        ...(userId ? { updatedByUser: { connect: { userId } } } : {}),
      },
    })

    if (input.fkVariantId || input.carYear) {
      if (existing) {
        await prisma.inquiryCarDetails.update({
          where: { inquiryCarDetailsId: existing.inquiryCarDetailsId },
          data: {
            fkVariantId: input.fkVariantId,
            year: input.carYear,
            updatedDt: new Date(),
            ...(userId ? { updatedBy: userId } : {}),
          },
        })
      } else {
        await prisma.inquiryCarDetails.create({
          data: {
            fkInquiryId: id,
            fkVariantId: input.fkVariantId,
            year: input.carYear,
            createdDt: new Date(),
            updatedDt: new Date(),
            ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
          },
        })
      }
    } else if (existing) {
      await prisma.inquiryCarDetails.delete({ where: { inquiryCarDetailsId: existing.inquiryCarDetailsId } })
    }
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
