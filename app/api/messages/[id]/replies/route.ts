import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedActorForFunctions } from '@/lib/access/accessControl'
import { WHATSAPP_INBOX_FUNCTION } from '@/lib/access/accessCatalog'
import { canReplyToWhatsApp, REPLY_WINDOW_MS, sendWhatsAppTextReply } from '@/lib/whatsapp/reply'

export const runtime = 'nodejs'
type Context = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: Context) {
  if (!await getAuthorizedActorForFunctions([WHATSAPP_INBOX_FUNCTION])) return NextResponse.json({ error: 'Access denied.' }, { status: 403 })
  const id = Number((await context.params).id)
  if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: 'Invalid message.' }, { status: 400 })
  try {
    const message = await prisma.whatsAppReceivedMessage.findUnique({ where: { id } })
    if (!message) return NextResponse.json({ error: 'Message not found.' }, { status: 404 })
    const latest = await prisma.whatsAppReceivedMessage.findFirst({ where: { phoneNumberId: message.phoneNumberId, senderMobile: message.senderMobile }, orderBy: { sentAt: 'desc' } })
    const replies = await prisma.whatsAppInboxReply.findMany({ where: { receivedMessageId: id }, orderBy: { createdAt: 'desc' }, take: 50 })
    return NextResponse.json({ replies: replies.reverse(), canReply: !!latest && canReplyToWhatsApp(latest.sentAt),
      replyWindowClosesAt: latest ? new Date(latest.sentAt.getTime() + REPLY_WINDOW_MS).toISOString() : null }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Unable to load reply history.' }, { status: 500 })
  }
}

export async function POST(request: Request, context: Context) {
  const actor = await getAuthorizedActorForFunctions([WHATSAPP_INBOX_FUNCTION])
  if (!actor) return NextResponse.json({ error: 'Access denied.' }, { status: 403 })
  const id = Number((await context.params).id)
  const input = await request.json().catch(() => null)
  const body = typeof input?.body === 'string' ? input.body.trim() : ''
  const requestId = typeof input?.requestId === 'string' ? input.requestId : ''
  if (!Number.isSafeInteger(id) || id <= 0 || !body || body.length > 4096 || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
    return NextResponse.json({ error: 'Enter a reply of 1–4096 characters and a valid request ID.' }, { status: 400 })
  }
  try {
    const existing = await prisma.whatsAppInboxReply.findUnique({ where: { id: requestId } })
    if (existing) {
      if (existing.receivedMessageId !== id || existing.createdBy !== actor.userId || existing.body !== body) return NextResponse.json({ error: 'Request ID already used.' }, { status: 409 })
      return NextResponse.json({ reply: existing })
    }
    const message = await prisma.whatsAppReceivedMessage.findUnique({ where: { id } })
    if (!message) return NextResponse.json({ error: 'Message not found.' }, { status: 404 })
    if (!process.env.WHATSAPP_ACCESS_TOKEN?.trim() || process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() !== message.phoneNumberId) {
      return NextResponse.json({ error: 'Configure WHATSAPP_ACCESS_TOKEN for this business number before replying.' }, { status: 503 })
    }
    const latest = await prisma.whatsAppReceivedMessage.findFirst({ where: { phoneNumberId: message.phoneNumberId, senderMobile: message.senderMobile }, orderBy: { sentAt: 'desc' } })
    if (!latest || !canReplyToWhatsApp(latest.sentAt)) return NextResponse.json({ error: 'The 24-hour reply window is closed. Ask the customer to message again or use an approved template.' }, { status: 409 })
    // Reserve the client request ID before contacting Meta. Concurrent retries cannot send twice.
    try {
      await prisma.whatsAppInboxReply.create({ data: { id: requestId, receivedMessageId: id, createdBy: actor.userId, body, status: 'sending' } })
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') return NextResponse.json({ error: 'This reply is already being processed. Refresh its history.' }, { status: 409 })
      throw error
    }
    const result = await sendWhatsAppTextReply({ phoneNumberId: message.phoneNumberId, to: message.senderMobile, body, contextMessageId: message.providerMessageId })
    const reply = await prisma.whatsAppInboxReply.update({ where: { id: requestId }, data: { status: result.status, providerMessageId: result.providerMessageId ?? null, errorMessage: result.error ?? null } })
    return NextResponse.json({ reply })
  } catch {
    // If persistence fails after Meta accepts, the reserved request ID still prevents a second send.
    return NextResponse.json({ error: 'Unable to confirm reply status. Refresh reply history before trying again.' }, { status: 500 })
  }
}
