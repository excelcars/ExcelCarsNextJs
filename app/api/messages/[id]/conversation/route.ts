import { WHATSAPP_SENDING_ENABLED, WHATSAPP_PAUSED_MESSAGE } from '@/lib/whatsapp/sendingPolicy.mjs'
import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedActorForFunctions } from '@/lib/access/accessControl'
import { WHATSAPP_INBOX_FUNCTION } from '@/lib/access/accessCatalog'
import { canReplyToWhatsApp, REPLY_WINDOW_MS } from '@/lib/whatsapp/reply'
import { latestDeliveryEvent, outboundHistorySql } from '@/lib/whatsapp/outboundHistory'

type Context = { params: Promise<{ id: string }> }
type Entry = { key: string; messageId: number | null; body: string; sentAt: Date; direction: string; status: string; messageType: string; mediaId: string | null; errorMessage: string | null; templateName: string | null; templateLanguage: string | null; buttonUrlSuffix: string | null; providerMessageId: string | null }

export async function GET(request: Request, context: Context) {
  if (!await getAuthorizedActorForFunctions([WHATSAPP_INBOX_FUNCTION])) return NextResponse.json({ error: 'Access denied.' }, { status: 403 })
  const anchorId = (await context.params).id
  const id = Number(anchorId)
  const outboundAnchor = /^(sent|vehicle|noinventory|insurance)-[1-9]\d*$/.test(anchorId)
  const params = new URL(request.url).searchParams
  const before = params.get('before')
  const beforeKey = params.get('beforeKey')
  if ((!outboundAnchor && (!Number.isSafeInteger(id) || id <= 0)) || (before && (!Number.isFinite(new Date(before).getTime()) || !beforeKey || beforeKey.length > 100))) return NextResponse.json({ error: 'Invalid conversation.' }, { status: 400 })
  try {
    const anchor = outboundAnchor
      ? (await prisma.$queryRaw<{ phoneNumberId: string; senderMobile: string }[]>(Prisma.sql`WITH outbound AS (${outboundHistorySql()}) SELECT phone_number_id AS "phoneNumberId", sender_mobile AS "senderMobile" FROM outbound WHERE key = ${anchorId} LIMIT 1`))[0]
      : await prisma.whatsAppReceivedMessage.findUnique({ where: { id } })
    if (!anchor) return NextResponse.json({ error: 'Chat not found.' }, { status: 404 })
    const latest = await prisma.whatsAppReceivedMessage.findFirst({ where: { phoneNumberId: anchor.phoneNumberId, senderMobile: anchor.senderMobile }, orderBy: [{ sentAt: 'desc' }, { id: 'desc' }] })
    const entries = await prisma.$queryRaw<Entry[]>(Prisma.sql`WITH outbound AS (${outboundHistorySql()}), timeline AS (
      SELECT 'in-' || id AS key, id AS "messageId", body, date_trunc('milliseconds', sent_at) AS "sentAt", 'incoming' AS direction,
        'received' AS status, message_type AS "messageType", media_id AS "mediaId", NULL::text AS "errorMessage",
        NULL::text AS "templateName", NULL::text AS "templateLanguage", NULL::text AS "buttonUrlSuffix", provider_message_id AS "providerMessageId"
      FROM whatsapp_received_messages WHERE phone_number_id = ${anchor.phoneNumberId} AND sender_mobile = ${anchor.senderMobile}
      UNION ALL
      SELECT 'out-' || r.id, r.received_message_id, r.body, date_trunc('milliseconds', r.created_at), 'outgoing', r.status, 'text', NULL::text, r.error_message,
        NULL::text, NULL::text, NULL::text, r.provider_message_id
      FROM whatsapp_inbox_replies r JOIN whatsapp_received_messages m ON m.id = r.received_message_id
      WHERE m.phone_number_id = ${anchor.phoneNumberId} AND m.sender_mobile = ${anchor.senderMobile}
      UNION ALL
      SELECT key, NULL::int, body, date_trunc('milliseconds', occurred_at), 'outgoing', lower(status), 'template', NULL::text, error_message,
        template_name, template_language, button_url_suffix, provider_message_id
      FROM outbound WHERE phone_number_id = ${anchor.phoneNumberId} AND sender_mobile = ${anchor.senderMobile}
    ) SELECT * FROM timeline
    ${before ? Prisma.sql`WHERE ("sentAt", key) < (${new Date(before)}, ${beforeKey})` : Prisma.empty}
    ORDER BY "sentAt" DESC, key DESC LIMIT 51`)
    const page = entries.slice(0, 50)
    const oldest = page.at(-1)
    const providerIds = page.filter(entry => entry.direction === 'outgoing' && entry.providerMessageId).map(entry => entry.providerMessageId as string)
    const statuses = providerIds.length ? await prisma.whatsAppMessageStatus.findMany({ where: { providerMessageId: { in: providerIds } }, orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }] }) : []
    const history = page.reverse().map(entry => {
      if (entry.direction !== 'outgoing' || !entry.providerMessageId) return entry
      const delivery = latestDeliveryEvent(statuses.filter(event => event.providerMessageId === entry.providerMessageId))
      return delivery ? { ...entry, status: delivery.status, errorMessage: delivery.errorMessage } : entry
    })
    return NextResponse.json({ entries: history, latestMessageId: latest?.id ?? null,
      canReply: WHATSAPP_SENDING_ENABLED && !!latest && canReplyToWhatsApp(latest.sentAt), replyWindowClosesAt: latest ? new Date(latest.sentAt.getTime() + REPLY_WINDOW_MS).toISOString() : null,
      nextCursor: entries.length > 50 && oldest ? { before: oldest.sentAt.toISOString(), beforeKey: oldest.key } : null,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch { return NextResponse.json({ error: 'Unable to load conversation.' }, { status: 500 }) }
}

export async function PATCH(_request: Request, context: Context) {
  if (!await getAuthorizedActorForFunctions([WHATSAPP_INBOX_FUNCTION])) return NextResponse.json({ error: 'Access denied.' }, { status: 403 })
  const id = Number((await context.params).id)
  if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: 'Invalid conversation.' }, { status: 400 })
  try {
    const anchor = await prisma.whatsAppReceivedMessage.findUnique({ where: { id } })
    if (!anchor) return NextResponse.json({ error: 'Chat not found.' }, { status: 404 })
    const result = await prisma.whatsAppReceivedMessage.updateMany({ where: { phoneNumberId: anchor.phoneNumberId, senderMobile: anchor.senderMobile, id: { lte: id }, readAt: null }, data: { readAt: new Date() } })
    return NextResponse.json({ markedRead: result.count })
  } catch { return NextResponse.json({ error: 'Unable to mark chat as read.' }, { status: 500 }) }
}
