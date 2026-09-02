'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUserIdForRoute } from '@/lib/access/accessControl'
import { canAccessInquiryByOwnership } from '@/lib/access/inquiryOwnership'
import { isFollowupStatus, resolveFollowupSubStatusInput, validateFollowupLogInput } from '@/lib/inquiryFollowupValidation'
import { logInquiryEvent } from '@/features/inquiry/eventLog'

export interface LogFollowupInput {
  contactOutcome: string
  status: string
  subStatus: string
  useOtherSubStatus?: boolean
  otherSubStatus?: string
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

function toDate(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export async function logFollowup(inquiryId: number, input: LogFollowupInput): Promise<ActionResult> {
  const validation = validateFollowupLogInput(input)
  if (validation.error) {
    return { success: false, error: validation.error }
  }

  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }
  if (!(await canAccessInquiryByOwnership(inquiryId, '/followup'))) {
    return { success: false, error: 'You can only log follow-up for your own inquiries.' }
  }
  const now = new Date()
  const selectedFollowupDate = toDate(input.nextFollowUpDate)
  const resolvedSubStatus = resolveFollowupSubStatusInput(input)

  try {
    await prisma.$transaction(async tx => {
      const followup = await tx.followupInquiry.create({
        data: {
          fkInquiryId: inquiryId,
          followupDate: isFollowupStatus(input.status) ? selectedFollowupDate : null,
          contactOutcome: input.contactOutcome || null,
          followupStatus: input.status,
          followupSubStatus: resolvedSubStatus || null,
          followupClassification: input.classification || null,
          comments: input.comments || null,
          createdDt: now,
          updatedDt: now,
          ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
        },
      })

      await tx.inquiry.update({
        where: { inquiryId },
        data: {
          status: input.status,
          subStatus: resolvedSubStatus || null,
          classification: input.classification || null,
          remark: input.comments || null,
          followUpDate: isFollowupStatus(input.status) ? selectedFollowupDate : null,
          updatedDt: now,
          ...(userId ? { updatedByUser: { connect: { userId } } } : {}),
        },
      })

      await logInquiryEvent(tx, {
        inquiryId,
        eventType: 'followup_recorded',
        eventLabel: 'Follow-up recorded',
        eventDetail: [
          input.status ? `Status ${input.status}` : '',
          resolvedSubStatus ? `Sub-status ${resolvedSubStatus}` : '',
          input.classification ? `Class ${input.classification}` : '',
          input.nextFollowUpDate ? `Next ${input.nextFollowUpDate}` : '',
          input.comments?.trim() ? input.comments.trim() : '',
        ].filter(Boolean).join(' · '),
        actorUserId: userId,
        followupId: followup.pkFollowupId,
        createdAt: now,
      })
    })
  } catch {
    return { success: false, error: 'Something went wrong logging this follow-up.' }
  }

  revalidatePath('/followup')
  revalidatePath('/inquiry')
  return { success: true }
}
