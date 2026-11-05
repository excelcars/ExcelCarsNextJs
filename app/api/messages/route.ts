import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getAuthorizedActorForFunctions } from '@/lib/access/accessControl'
import { WHATSAPP_INBOX_FUNCTION } from '@/lib/access/accessCatalog'
import { prisma } from '@/lib/db/prisma'

export async function GET(request: Request) {
  if (!await getAuthorizedActorForFunctions([WHATSAPP_INBOX_FUNCTION])) return NextResponse.json({ error: 'Access denied.' }, { status: 403 })
  const params = new URL(request.url).searchParams
  const search = (params.get('search') ?? '').trim().slice(0, 200)
  const page = Math.min(100000, Math.max(1, Number(params.get('page')) || 1))
  if (!Number.isInteger(page)) return NextResponse.json({ error: 'Invalid page.' }, { status: 400 })
  const where: Prisma.WhatsAppReceivedMessageWhereInput = {
    ...(params.get('unread') === '1' ? { readAt: null } : {}),
    ...(search ? { OR: ['senderMobile', 'senderName', 'body'].map(field => ({ [field]: { contains: search, mode: 'insensitive' } })) } : {}),
  }
  try {
    const [messages, total, unread] = await prisma.$transaction([
      prisma.whatsAppReceivedMessage.findMany({ where, orderBy: [{ receivedAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * 50, take: 50 }),
      prisma.whatsAppReceivedMessage.count({ where }),
      prisma.whatsAppReceivedMessage.count({ where: { readAt: null } }),
    ])
    return NextResponse.json({ messages, total, unread, page }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Unable to load messages. Please try again.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  if (!await getAuthorizedActorForFunctions([WHATSAPP_INBOX_FUNCTION])) return NextResponse.json({ error: 'Access denied.' }, { status: 403 })
  const input = await request.json().catch(() => null)
  if (!Number.isSafeInteger(input?.id) || input.id <= 0) return NextResponse.json({ error: 'Invalid message.' }, { status: 400 })
  try {
    await prisma.whatsAppReceivedMessage.updateMany({ where: { id: input.id, readAt: null }, data: { readAt: new Date() } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unable to mark message as read.' }, { status: 500 })
  }
}
