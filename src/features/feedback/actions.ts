'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import { auth } from '../../../auth'

export interface FeedbackFormInput {
  customerId: number | null
  customerName: string
  customerMob: string
  customerEmail: string
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
  const session = await auth()
  const id = session?.user?.id
  return id ? Number(id) : null
}

function buildData(input: FeedbackFormInput) {
  return {
    customerName: input.customerName || null,
    customerMob: input.customerMob || null,
    customerEmail: input.customerEmail || null,
    carMakeLegacy: input.carMakeLegacy || null,
    carModelLegacy: input.carModelLegacy || null,
    carVariantLegacy: input.carVariantLegacy || null,
    carYear: input.carYear,
    carRegistrationNo: input.carRegistrationNo || null,
    answer_1: input.answer_1 || null,
    answer_2: input.answer_2 || null,
    answer_3: input.answer_3 || null,
    answer_4: input.answer_4 || null,
    answer_5: input.answer_5 || null,
    comments: input.comments || null,
  }
}

export async function createFeedback(input: FeedbackFormInput): Promise<ActionResult> {
  if (!input.customerId && !input.customerName.trim()) {
    return { success: false, error: 'Link a customer or enter a name.' }
  }

  const userId = await currentUserId()

  try {
    await prisma.customerFeedback.create({
      data: {
        ...buildData(input),
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
  if (!input.customerId && !input.customerName.trim()) {
    return { success: false, error: 'Link a customer or enter a name.' }
  }

  const userId = await currentUserId()

  try {
    await prisma.customerFeedback.update({
      where: { feedbackId: id },
      data: {
        ...buildData(input),
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
  try {
    await prisma.customerFeedback.delete({ where: { feedbackId: id } })
  } catch {
    return { success: false, error: 'Something went wrong deleting this record.' }
  }

  revalidatePath('/config/feedback')
  return { success: true }
}
