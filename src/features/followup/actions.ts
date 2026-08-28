'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import { auth } from '../../../auth'

export interface LogFollowupInput {
  status: string
  subStatus: string
  classification: string
  comments: string
  nextFollowUpDate: string
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

function toDate(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export async function logFollowup(inquiryId: number, input: LogFollowupInput): Promise<ActionResult> {
  if (!input.status) {
    return { success: false, error: 'Status is required.' }
  }
  if (input.status === 'FollowUp' && !input.nextFollowUpDate) {
    return { success: false, error: 'Next follow-up date is required unless the inquiry is being closed.' }
  }

  const userId = await currentUserId()
  const now = new Date()
  const selectedFollowupDate = toDate(input.nextFollowUpDate)

  try {
    await prisma.followupInquiry.create({
      data: {
        fkInquiryId: inquiryId,
        followupDate: input.status === 'FollowUp' ? selectedFollowupDate : null,
        followupStatus: input.status,
        followupSubStatus: input.subStatus || null,
        followupClassification: input.classification || null,
        comments: input.comments || null,
        createdDt: now,
        updatedDt: now,
        ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
      },
    })

    await prisma.inquiry.update({
      where: { inquiryId },
      data: {
        status: input.status,
        subStatus: input.subStatus || null,
        classification: input.classification || null,
        remark: input.comments || null,
        followUpDate: input.status === 'FollowUp' ? selectedFollowupDate : null,
        updatedDt: now,
        ...(userId ? { updatedByUser: { connect: { userId } } } : {}),
      },
    })
  } catch {
    return { success: false, error: 'Something went wrong logging this follow-up.' }
  }

  revalidatePath('/followup')
  revalidatePath('/inquiry')
  return { success: true }
}
