'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUserIdForRoute } from '@/lib/access/accessControl'
import { sendEmail } from '@/lib/email/sendMail'

export interface TemplateFormInput {
  messageType: string
  messageSubject: string
  messageBody: string
}

export interface ActionResult {
  success: boolean
  error?: string
}

async function currentUserId(): Promise<number | null> {
  return getAuthorizedUserIdForRoute('/config/sms-email')
}

export async function createTemplate(input: TemplateFormInput): Promise<ActionResult> {
  if (!input.messageSubject.trim() || !input.messageBody.trim()) {
    return { success: false, error: 'Subject and body are required.' }
  }

  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }

  try {
    await prisma.messageTemplate.create({
      data: {
        messageType: input.messageType || null,
        messageSubject: input.messageSubject.trim(),
        messageBody: input.messageBody,
        createdDate: new Date(),
        updatedDate: new Date(),
        ...(userId ? { createdByUser: { connect: { userId } }, updatedByUser: { connect: { userId } } } : {}),
      },
    })
  } catch {
    return { success: false, error: 'Something went wrong saving this template.' }
  }

  revalidatePath('/config/sms-email')
  return { success: true }
}

export async function updateTemplate(id: number, input: TemplateFormInput): Promise<ActionResult> {
  if (!input.messageSubject.trim() || !input.messageBody.trim()) {
    return { success: false, error: 'Subject and body are required.' }
  }

  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }

  try {
    await prisma.messageTemplate.update({
      where: { typeId: id },
      data: {
        messageType: input.messageType || null,
        messageSubject: input.messageSubject.trim(),
        messageBody: input.messageBody,
        updatedDate: new Date(),
        ...(userId ? { updatedByUser: { connect: { userId } } } : {}),
      },
    })
  } catch {
    return { success: false, error: 'Something went wrong saving this template.' }
  }

  revalidatePath('/config/sms-email')
  return { success: true }
}

export async function sendTemplateEmail(templateId: number, toEmail: string): Promise<ActionResult> {
  if (!toEmail.trim()) {
    return { success: false, error: 'Enter a recipient email address.' }
  }
  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }

  const template = await prisma.messageTemplate.findUnique({ where: { typeId: templateId } })
  if (!template) return { success: false, error: 'Template not found.' }
  if (template.messageType !== 'Email') {
    return { success: false, error: 'Only Email templates can be sent — SMS sending was never wired up, in this app or the legacy one.' }
  }
  if (!template.messageBody?.trim()) {
    return { success: false, error: 'This template has no body to send.' }
  }

  return sendEmail({
    to: toEmail.trim(),
    subject: template.messageSubject || '(no subject)',
    html: template.messageBody,
  })
}

export async function deleteTemplate(id: number): Promise<ActionResult> {
  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }
  try {
    await prisma.messageTemplate.delete({ where: { typeId: id } })
  } catch {
    return { success: false, error: 'Something went wrong deleting this template.' }
  }

  revalidatePath('/config/sms-email')
  return { success: true }
}
