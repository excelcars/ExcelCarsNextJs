import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedActorForFunctions } from '@/lib/access/accessControl'
import { WHATSAPP_INBOX_FUNCTION } from '@/lib/access/accessCatalog'

export async function GET() {
  if (!await getAuthorizedActorForFunctions([WHATSAPP_INBOX_FUNCTION])) return NextResponse.json({ error: 'Access denied.' }, { status: 403 })
  try {
    const [vehicle, noInventory] = await Promise.all([
      prisma.whatsAppDeliveryLog.findMany({ orderBy: { createdAt: 'desc' }, take: 20, select: { inquiryId: true, templateName: true, status: true, errorMessage: true, providerMessageId: true, createdAt: true } }),
      prisma.inquiryNoInventoryNotificationLog.findMany({ where: { channel: 'WhatsApp' }, orderBy: { createdAt: 'desc' }, take: 20, select: { inquiryId: true, templateName: true, status: true, errorMessage: true, providerMessageId: true, createdAt: true } }),
    ])
    const rows = [...vehicle, ...noInventory].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 20)
    const ids = rows.map(row => row.providerMessageId).filter((id): id is string => !!id)
    const statuses = ids.length ? await prisma.whatsAppMessageStatus.findMany({ where: { providerMessageId: { in: ids } }, orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }] }) : []
    return NextResponse.json({ deliveries: rows.map(row => {
      const events = statuses.filter(event => event.providerMessageId === row.providerMessageId)
      // Positive delivery evidence wins over delayed or out-of-order failure callbacks.
      const latest = events.find(event => event.status === 'read') ?? events.find(event => event.status === 'delivered') ?? events[0]
      return { ...row, status: latest?.status ?? row.status, errorMessage: latest ? latest.errorMessage : row.errorMessage, confirmedAt: latest?.occurredAt ?? null }
    }) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Unable to load WhatsApp delivery status.' }, { status: 500 })
  }
}
