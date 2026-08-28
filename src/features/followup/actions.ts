'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUserIdForRoute } from '@/lib/access/accessControl'

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
  return getAuthorizedUserIdForRoute('/followup')
}

export async function logFollowup(inquiryId: number, input: LogFollowupInput): Promise<ActionResult> {
  if (!input.status) {
    return { success: false, error: 'Status is required.' }
  }
  if (input.status === 'FollowUp' && !input.nextFollowUpDate) {
    return { success: false, error: 'Next follow-up date is required unless the inquiry is being closed.' }
  }

  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }
  const now = new Date()

  try {
    await prisma.followupInquiry.create({
      data: {
        fkInquiryId: inquiryId,
        followupDate: now,
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
        followUpDate: input.status === 'FollowUp' ? new Date(input.nextFollowUpDate) : null,
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
