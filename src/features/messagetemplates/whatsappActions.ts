'use server'

import { WHATSAPP_SENDING_ENABLED, WHATSAPP_PAUSED_MESSAGE } from '@/lib/whatsapp/sendingPolicy.mjs'

import { getAuthorizedUserIdForRoute } from '@/lib/access/accessControl'
import { normalizeWhatsAppRecipient, sendGlobalTemplate } from '@/lib/whatsapp/meta'
import { prisma } from '@/lib/db/prisma'

async function authorized() { return Boolean(await getAuthorizedUserIdForRoute('/config/sms-email')) }

export async function listWhatsAppDrafts() {
  if (!(await authorized())) return []
  return prisma.whatsAppMessageDraft.findMany({ orderBy: { updatedAt: 'desc' } })
}

export async function saveWhatsAppDraft(input: { title: string; message: string }) {
  if (!(await authorized())) return { success: false, error: 'Not authorized.' }
  if (!input.title.trim() || !input.message.trim()) return { success: false, error: 'Draft title and message are required.' }
  const row = await prisma.whatsAppMessageDraft.create({ data: { title: input.title.trim(), message: input.message.trim(), updatedAt: new Date() } })
  return { success: true, row }
}

export async function deleteWhatsAppDraft(id: number) {
  if (!(await authorized())) return { success: false, error: 'Not authorized.' }
  await prisma.whatsAppMessageDraft.delete({ where: { whatsAppMessageDraftId: id } }).catch(() => undefined)
  return { success: true }
}

export async function sendGlobalWhatsApp(input: { customerName: string; mobile: string; message: string }) {
  if (!WHATSAPP_SENDING_ENABLED) return { success: false, error: WHATSAPP_PAUSED_MESSAGE }
  if (!(await authorized())) return { success: false, error: 'Not authorized.' }
  const to = normalizeWhatsAppRecipient(input.mobile)
  if (!to) return { success: false, error: 'Enter a valid 10-digit mobile number.' }
  if (!input.customerName.trim() || !input.message.trim()) return { success: false, error: 'Customer name and message are required.' }
  return sendGlobalTemplate({ to, customerName: input.customerName.trim(), message: input.message.trim() })
}
