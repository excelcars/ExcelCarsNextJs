'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUserIdForRoute } from '@/lib/access/accessControl'
import { sendEmail } from '@/lib/email/sendMail'
import { isValidEmail } from '@/lib/validation'
import { RECIPIENT_GROUPS, resolveMessageRecipients, searchMessageRecipients, type RecipientGroup, type RecipientOption, type RecipientSelection } from './recipients'
import { isSafeStoredAttachmentPath } from './attachments'
import { access } from 'fs/promises'
import { sanitizeEmailHtml } from '@/lib/email/sanitizeHtml'
import { downloadFromFirebaseStorage, isFirebaseStoragePath } from '@/lib/firebase/storage'

const TEMPLATE_VARIABLE_PATTERN = /{{(customerName|registrationNo|expiryDate|agentName|agentMobile|excelCarsName|excelCarsPhone|excelCarsEmail)}}/g
const EXCEL_CARS_NAME = 'Excel Cars'
const EXCEL_CARS_PHONE = process.env.PUBLIC_EXCEL_CARS_CONTACT_PHONE?.trim() || '9820344002 / 9820344332'
const EXCEL_CARS_EMAIL = process.env.PUBLIC_EXCEL_CARS_EMAIL?.trim() || 'naziya@excelcarsmumbai.com'

export interface TemplateFormInput {
  messageType: string
  messageSubject: string
  messageBody: string
}

export interface ActionResult {
  success: boolean
  error?: string
  sentCount?: number
  failedRecipients?: string[]
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)
}

function formatIndiaDate(value: Date | null) {
  return value ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(value) : '—'
}

async function templateVariablesForRecipient(recipient: RecipientOption) {
  let registrationNo = '—'
  let expiryDate = '—'

  // A customer can have an insurance policy linked to their record. Use the
  // newest one when this email is sent manually from the template screen.
  if (recipient.group === 'Customers') {
    const insurance = await prisma.insuranceMain.findFirst({
      where: { customerId: recipient.id },
      select: { carRegistrationNo: true, expiryDate: true },
      orderBy: { expiryDate: 'desc' },
    })
    registrationNo = insurance?.carRegistrationNo?.trim() || registrationNo
    expiryDate = formatIndiaDate(insurance?.expiryDate ?? null)
  }

  return {
    customerName: recipient.name || 'Customer',
    registrationNo,
    expiryDate,
    agentName: EXCEL_CARS_NAME,
    agentMobile: EXCEL_CARS_PHONE,
    excelCarsName: EXCEL_CARS_NAME,
    excelCarsPhone: EXCEL_CARS_PHONE,
    excelCarsEmail: EXCEL_CARS_EMAIL,
  }
}

function renderEmailTemplate(template: string, variables: Awaited<ReturnType<typeof templateVariablesForRecipient>>, html = false) {
  return template.replace(TEMPLATE_VARIABLE_PATTERN, (_, key: keyof typeof variables) => {
    const value = variables[key] || '—'
    return html ? escapeHtml(value) : value
  })
}

async function currentUserId(): Promise<number | null> {
  return getAuthorizedUserIdForRoute('/config/sms-email')
}

async function hasDuplicateEmailSubject(subject: string, excludingId?: number) {
  const match = await prisma.messageTemplate.findFirst({
    where: {
      messageType: 'Email',
      messageSubject: { equals: subject.trim(), mode: 'insensitive' },
      ...(excludingId ? { NOT: { typeId: excludingId } } : {}),
    },
    select: { typeId: true },
  })
  return !!match
}

export async function createTemplate(input: TemplateFormInput): Promise<ActionResult> {
  if (!input.messageSubject.trim() || !input.messageBody.trim()) {
    return { success: false, error: 'Subject and body are required.' }
  }
  if (input.messageType !== 'Email') return { success: false, error: 'Only email templates are supported.' }

  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }
  if (await hasDuplicateEmailSubject(input.messageSubject)) return { success: false, error: 'An email template with this subject already exists.' }

  try {
    await prisma.messageTemplate.create({
      data: {
        messageType: input.messageType || null,
        messageSubject: input.messageSubject.trim(),
        messageBody: sanitizeEmailHtml(input.messageBody),
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
  if (input.messageType !== 'Email') return { success: false, error: 'Only email templates are supported.' }

  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }
  if (await hasDuplicateEmailSubject(input.messageSubject, id)) return { success: false, error: 'An email template with this subject already exists.' }

  try {
    await prisma.messageTemplate.update({
      where: { typeId: id },
      data: {
        messageType: input.messageType || null,
        messageSubject: input.messageSubject.trim(),
        messageBody: sanitizeEmailHtml(input.messageBody),
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

export async function findMessageRecipients(group: RecipientGroup, query: string) {
  const userId = await currentUserId()
  if (!userId) return { success: false as const, error: 'Not authorized.', rows: [] }
  if (!RECIPIENT_GROUPS.includes(group)) return { success: false as const, error: 'Choose a valid recipient group.', rows: [] }
  return { success: true as const, rows: await searchMessageRecipients(group, query) }
}

export async function getTemplateDeliveryHistory(templateId: number) {
  const userId = await currentUserId()
  if (!userId || !Number.isInteger(templateId) || templateId <= 0) return []
  return prisma.emailDeliveryLog.findMany({ where: { templateId }, select: { deliveryLogId: true, recipientEmail: true, status: true, errorMessage: true, attachmentCount: true, attemptedAt: true }, orderBy: { attemptedAt: 'desc' }, take: 50 })
}

export async function sendTemplateEmail(templateId: number, toEmail: string, selections: RecipientSelection[] = [], sendAttachmentIds: string[] = []): Promise<ActionResult> {
  const userId = await currentUserId()
  if (!userId) return { success: false, error: 'Not authorized.' }

  const template = await prisma.messageTemplate.findUnique({ where: { typeId: templateId } })
  if (!template) return { success: false, error: 'Template not found.' }
  if (template.messageType !== 'Email') {
    return { success: false, error: 'Only email templates can be sent.' }
  }
  if (!template.messageBody?.trim()) {
    return { success: false, error: 'This template has no body to send.' }
  }

  if (!Array.isArray(selections) || selections.length > 50) return { success: false, error: 'Select up to 50 recipients at a time.' }
  if (!Array.isArray(sendAttachmentIds) || sendAttachmentIds.length > 10) return { success: false, error: 'Attach up to 10 extra files at a time.' }
  const resolved = await resolveMessageRecipients(selections)
  const recipients = new Map<string, RecipientOption>()
  for (const recipient of resolved) recipients.set(recipient.email!.toLowerCase(), recipient)
  const manualEmail = toEmail.trim()
  if (manualEmail) {
    if (!isValidEmail(manualEmail)) return { success: false, error: 'Enter a valid recipient email address.' }
    recipients.set(manualEmail.toLowerCase(), { group: 'Contacts', id: 0, name: 'Customer', email: manualEmail, mobile: null })
  }
  if (recipients.size === 0) return { success: false, error: 'Select at least one recipient or enter an email address.' }
  const uploads = await prisma.messageAttachmentUpload.findMany({
    where: { templateId, OR: [{ scope: 'template' }, { scope: 'send', createdBy: userId, uploadId: { in: sendAttachmentIds } }] },
    select: { uploadId: true, storedPath: true, originalName: true, mimeType: true },
  })
  const attachments = [] as Array<{ filename: string; path?: string; content?: Buffer; contentType: string }>
  for (const upload of uploads) {
    try {
      if (isFirebaseStoragePath(upload.storedPath)) {
        attachments.push({ filename: upload.originalName, content: await downloadFromFirebaseStorage(upload.storedPath), contentType: upload.mimeType })
      } else if (isSafeStoredAttachmentPath(upload.storedPath)) {
        await access(upload.storedPath)
        attachments.push({ filename: upload.originalName, path: upload.storedPath, contentType: upload.mimeType })
      }
    } catch { /* missing stored file is omitted */ }
  }

  let sentCount = 0
  const failedRecipients: string[] = []
  for (const recipient of recipients.values()) {
    const email = recipient.email!
    const variables = await templateVariablesForRecipient(recipient)
    const emailHtml = sanitizeEmailHtml(renderEmailTemplate(template.messageBody, variables, true))
    const subject = renderEmailTemplate(template.messageSubject || '(no subject)', variables)
    const result = await sendEmail({ to: email, subject, html: emailHtml, attachments })
    await prisma.emailDeliveryLog.create({ data: { templateId, recipientEmail: email, status: result.success ? 'Sent' : 'Retrying', errorMessage: result.success ? null : (result.error ?? 'Failed to send email.').slice(0, 1000), attachmentCount: attachments.length, attemptedBy: userId, nextRetryAt: result.success ? null : new Date(Date.now() + 5 * 60 * 1000), emailSubject: subject, emailHtml, attachmentJson: attachments.length ? JSON.stringify(attachments) : null } })
    if (result.success) sentCount += 1
    else failedRecipients.push(email)
  }
  if (sentCount === 0) return { success: false, error: 'No emails could be sent. Check the email configuration and recipient addresses.', failedRecipients }
  if (sendAttachmentIds.length) await prisma.messageAttachmentUpload.deleteMany({ where: { uploadId: { in: sendAttachmentIds }, scope: 'send', createdBy: userId } })
  return { success: true, sentCount, failedRecipients }
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
