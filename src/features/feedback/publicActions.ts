'use server'

import { createHash } from 'crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { QUESTIONS } from './queries'

const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex')

function isToken(value: string) {
  return /^[a-f0-9]{64}$/i.test(value)
}

export async function getFeedbackInvitation(token: string) {
  if (!isToken(token)) return null

  return prisma.feedbackInvitation.findFirst({
    where: {
      tokenHash: tokenHash(token),
      submittedAt: null,
      invalidatedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      customer: { select: { custName: true } },
      inventoryManagement: {
        select: {
          registrationNo: true,
          year: true,
          fkVariantId: true,
          carVariantMaster: {
            select: {
              variant: true,
              carMakeMaster: { select: { make: true } },
              carModelMaster: { select: { model: true } },
            },
          },
        },
      },
    },
  })
}

export async function submitPublicFeedback(token: string, formData: FormData) {
  if (!isToken(token)) redirect(`/feedback/${token}?status=invalid`)

  const answers = QUESTIONS.map(question => String(formData.get(question.key) ?? ''))
  if (answers.some((answer, index) => !QUESTIONS[index].options.includes(answer as never))) {
    redirect(`/feedback/${token}?status=invalid-answer`)
  }

  const comments = String(formData.get('comments') ?? '').trim()
  if (comments.length > 1000) redirect(`/feedback/${token}?status=invalid-comment`)

  const invitation = await prisma.$transaction(async tx => {
    const record = await tx.feedbackInvitation.findFirst({
      where: {
        tokenHash: tokenHash(token),
        submittedAt: null,
        invalidatedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        customer: true,
        inventoryManagement: {
          include: {
            carVariantMaster: { include: { carMakeMaster: true, carModelMaster: true } },
          },
        },
      },
    })
    if (!record) return null

    const submittedAt = new Date()
    const claimed = await tx.feedbackInvitation.updateMany({
      where: { feedbackInvitationId: record.feedbackInvitationId, submittedAt: null, invalidatedAt: null },
      data: { submittedAt },
    })
    if (claimed.count !== 1) return null

    const vehicle = record.inventoryManagement
    await tx.customerFeedback.create({
      data: {
        customerId: record.customerId,
        customerName: record.customer.custName,
        customerMob: record.customer.custMobile,
        customerEmail: record.customer.custEmail,
        customerDob: record.customer.custDob,
        customerAnniversaryDt: record.customer.custAnniversaryDt,
        carMakeLegacy: vehicle.carVariantMaster?.carMakeMaster?.make ?? vehicle.makeLegacy,
        carModelLegacy: vehicle.carVariantMaster?.carModelMaster?.model ?? vehicle.modelLegacy,
        carVariantLegacy: vehicle.carVariantMaster?.variant ?? vehicle.variantLegacy,
        carYear: vehicle.year,
        carRegistrationNo: vehicle.registrationNo,
        fkVariantId: vehicle.fkVariantId,
        answer_1: answers[0],
        answer_2: answers[1],
        answer_3: answers[2],
        answer_4: answers[3],
        answer_5: answers[4],
        comments: comments || null,
        createdDate: submittedAt,
        updatedDate: submittedAt,
        submittedAt,
      },
    })
    return record.feedbackInvitationId
  })

  if (!invitation) redirect(`/feedback/${token}?status=unavailable`)
  revalidatePath('/config/feedback')
  redirect(`/feedback/${token}?status=thanks`)
}
