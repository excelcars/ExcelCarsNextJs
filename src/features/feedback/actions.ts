'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUserIdForRoute } from '@/lib/access/accessControl'
import { getFeedbackDetail as queryFeedbackDetail, getVehicles as queryVehicles } from './queries'
import { createHash, randomBytes } from 'crypto'
import { sendEmail } from '@/lib/email/sendMail'

export interface FeedbackFormInput {
  customerId: number | null
  customerName: string
  customerMob: string
  customerEmail: string
  customerDob: string
  customerAnniversaryDt: string
  carMakeLegacy: string
  carModelLegacy: string
  carVariantLegacy: string
  carYear: number | null
  carRegistrationNo: string
  fkVariantId: number | null
  answer_1: string
  answer_2: string
  answer_3: string
  answer_4: string
  answer_5: string
  comments: string
}

export interface ActionResult {
  success: boolean
  error?: string
}

async function currentUserId(): Promise<number | null> {
  return getAuthorizedUserIdForRoute('/config/feedback')
}

export async function sendFeedbackInvitation(customerId: number, inventoryId: number): Promise<ActionResult> {
  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }
  const purchase = await prisma.inventoryManagement.findFirst({ where: { inventoryId, customerId }, include: { customer: true, carVariantMaster: { include: { carMakeMaster: true, carModelMaster: true } } } })
  if (!purchase?.customer?.custEmail) return { success: false, error: 'Select a customer purchase with an email address.' }
  const customer = purchase.customer
  const token = randomBytes(32).toString('hex'); const tokenHash = createHash('sha256').update(token).digest('hex'); const expiresAt = new Date(Date.now() + 7 * 86400000)
  const invitation = await prisma.$transaction(async tx => {
    await tx.feedbackInvitation.updateMany({ where: { customerId, inventoryId, submittedAt: null, invalidatedAt: null }, data: { invalidatedAt: new Date() } })
    return tx.feedbackInvitation.create({ data: { customerId, inventoryId, recipientEmail: customer.custEmail!.trim(), tokenHash, expiresAt, createdBy: userId } })
  })
  const base = (process.env.PUBLIC_APP_URL || process.env.NEXTAUTH_URL || '').replace(/\/$/, '')
  const vehicle = [purchase.carVariantMaster?.carMakeMaster?.make, purchase.carVariantMaster?.carModelMaster?.model, purchase.carVariantMaster?.variant, purchase.registrationNo].filter(Boolean).join(' · ')
  const result = await sendEmail({ to: invitation.recipientEmail, subject: 'Tell us about your Excel Cars purchase', html: `<p>Dear ${customer.custName},</p><p>Thank you for choosing Excel Cars.</p><p><b>Purchase summary:</b> ${vehicle}</p><p><a href="${base}/feedback/${token}">Give Feedback</a></p><p>This one-time link expires in 7 days.</p>` })
  if (!result.success) await prisma.feedbackInvitation.update({ where: { feedbackInvitationId: invitation.feedbackInvitationId }, data: { invalidatedAt: new Date() } })
  return result
}


export async function getFeedbackForAction(feedbackId: number) {
  if (!Number.isInteger(feedbackId) || feedbackId <= 0 || !(await currentUserId())) return null
  return queryFeedbackDetail(feedbackId)
}

export async function searchFeedbackVehicles(query: string, customerId: number | null) {
  if (!(await currentUserId())) return []
  return queryVehicles({ query, customerId })
}

const ANSWERS = [
  ['Satisfied', 'Neutral', 'Unsatisfied'],
  ['Very Good', 'Good', 'Fair'],
  ['Satisfied', 'Neutral', 'Unsatisfied'],
  ['Definitely', 'Probably', 'Not Sure'],
  ['Much Better', 'Somewhat Better', 'About the Same'],
] as const

function parseOptionalDate(value: string, label: string) {
  if (!value.trim()) return { value: null as Date | null }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return { error: `${label} must be a valid date.` }
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return { error: `${label} must be a valid date.` }
  return { value: date }
}

function validate(input: FeedbackFormInput): { error?: string; customerDob?: Date | null; customerAnniversaryDt?: Date | null } {
  if (!input.customerName.trim()) return { error: 'Customer name is required.' }
  if (input.customerName.trim().length > 150) return { error: 'Name cannot exceed 150 characters.' }
  if (!/^\d{10}$/.test(input.customerMob.trim())) return { error: 'Customer mobile must be exactly 10 digits.' }
  if (!input.customerEmail.trim()) return { error: 'Customer email is required.' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.customerEmail.trim())) return { error: 'Enter a valid email address.' }
  if (input.carYear != null && (!Number.isInteger(input.carYear) || input.carYear < 1886 || input.carYear > new Date().getFullYear() + 1)) return { error: 'Enter a valid vehicle year.' }
  const dates = [parseOptionalDate(input.customerDob, 'Date of birth'), parseOptionalDate(input.customerAnniversaryDt, 'Anniversary date')]
  const dateError = dates.find(date => date.error)?.error
  if (dateError) return { error: dateError }
  if (dates[0].value && dates[0].value > new Date()) return { error: 'Date of birth cannot be in the future.' }
  if (dates[1].value && dates[1].value > new Date()) return { error: 'Anniversary date cannot be in the future.' }
  const answers = [input.answer_1, input.answer_2, input.answer_3, input.answer_4, input.answer_5]
  if (answers.some((answer, index) => !ANSWERS[index].includes(answer as never))) return { error: 'Select a valid answer for every feedback question.' }
  return { customerDob: dates[0].value, customerAnniversaryDt: dates[1].value }
}

function buildData(input: FeedbackFormInput, dates: { customerDob?: Date | null; customerAnniversaryDt?: Date | null }) {
  return {
    customerName: input.customerName.trim() || null,
    customerMob: input.customerMob.trim() || null,
    customerEmail: input.customerEmail.trim().toLowerCase() || null,
    customerDob: dates.customerDob ?? null,
    customerAnniversaryDt: dates.customerAnniversaryDt ?? null,
    carMakeLegacy: input.carMakeLegacy.trim() || null,
    carModelLegacy: input.carModelLegacy.trim() || null,
    carVariantLegacy: input.carVariantLegacy.trim() || null,
    carYear: input.carYear,
    carRegistrationNo: input.carRegistrationNo.trim() || null,
    answer_1: input.answer_1 || null,
    answer_2: input.answer_2 || null,
    answer_3: input.answer_3 || null,
    answer_4: input.answer_4 || null,
    answer_5: input.answer_5 || null,
    comments: input.comments.trim() || null,
  }
}

export async function createFeedback(input: FeedbackFormInput): Promise<ActionResult> {
  const validation = validate(input)
  if (validation.error) return { success: false, error: validation.error }

  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }

  try {
    await prisma.customerFeedback.create({
      data: {
        ...buildData(input, validation),
        ...(input.customerId ? { customer: { connect: { custId: input.customerId } } } : {}),
        ...(input.fkVariantId ? { carVariantMaster: { connect: { pkVariantId: input.fkVariantId } } } : {}),
        createdDate: new Date(),
        updatedDate: new Date(),
        ...(userId ? { createdByUser: { connect: { userId } }, updatedByUser: { connect: { userId } } } : {}),
      },
    })
  } catch {
    return { success: false, error: 'Something went wrong saving this record.' }
  }

  revalidatePath('/config/feedback')
  return { success: true }
}

export async function updateFeedback(id: number, input: FeedbackFormInput): Promise<ActionResult> {
  const validation = validate(input)
  if (validation.error) return { success: false, error: validation.error }

  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }

  const existing = await prisma.customerFeedback.findUnique({ where: { feedbackId: id }, select: { submittedAt: true } })
  if (!existing) return { success: false, error: 'Feedback record was not found.' }
  if (existing.submittedAt) return { success: false, error: 'Customer-submitted feedback is read-only and cannot be edited.' }

  try {
    await prisma.customerFeedback.update({
      where: { feedbackId: id },
      data: {
        ...buildData(input, validation),
        customerId: input.customerId,
        fkVariantId: input.fkVariantId,
        updatedDate: new Date(),
        ...(userId ? { updatedBy: userId } : {}),
      },
    })
  } catch {
    return { success: false, error: 'Something went wrong saving this record.' }
  }

  revalidatePath('/config/feedback')
  return { success: true }
}

export async function deleteFeedback(id: number): Promise<ActionResult> {
  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }
  try {
    await prisma.customerFeedback.delete({ where: { feedbackId: id } })
  } catch {
    return { success: false, error: 'Something went wrong deleting this record.' }
  }

  revalidatePath('/config/feedback')
  return { success: true }
}
