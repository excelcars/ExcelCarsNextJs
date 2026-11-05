import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedActorForFunctions } from '@/lib/access/accessControl'
import { WHATSAPP_INBOX_FUNCTION } from '@/lib/access/accessCatalog'
import { outboundHistorySql } from '@/lib/whatsapp/outboundHistory'

export async function GET(request: Request) {
  if (!await getAuthorizedActorForFunctions([WHATSAPP_INBOX_FUNCTION])) return NextResponse.json({ error: 'Access denied.' }, { status: 403 })
  const params = new URL(request.url).searchParams
  const search = (params.get('search') || '').trim().slice(0, 200)
  const unread = params.get('unread') === '1'
  const page = Number(params.get('page') || 1)
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000) return NextResponse.json({ error: 'Invalid page.' }, { status: 400 })
  const chats = Prisma.sql`WITH outbound AS (${outboundHistorySql()}), events AS (
    SELECT id::text AS id, phone_number_id, sender_mobile, sender_name, body, 'incoming' AS direction,
      'in-' || id AS key, received_at AS occurred_at, read_at IS NULL AS is_unread
    FROM whatsapp_received_messages
    UNION ALL
    SELECT key, phone_number_id, sender_mobile, sender_name, body, 'outgoing', key, occurred_at, false FROM outbound
    UNION ALL
    SELECT r.received_message_id::text, m.phone_number_id, m.sender_mobile, m.sender_name, r.body, 'outgoing', 'out-' || r.id, r.created_at, false
    FROM whatsapp_inbox_replies r JOIN whatsapp_received_messages m ON m.id = r.received_message_id
  ), grouped AS (
    SELECT phone_number_id, sender_mobile, COUNT(*) FILTER (WHERE is_unread)::int AS unread,
      BOOL_OR(sender_name ILIKE ${`%${search}%`} OR sender_mobile ILIKE ${`%${search}%`} OR body ILIKE ${`%${search}%`}) AS matches
    FROM events GROUP BY phone_number_id, sender_mobile
  ), chats AS (
    SELECT latest.*, grouped.unread FROM grouped CROSS JOIN LATERAL (
      SELECT id, coalesce(sender_name, (SELECT e.sender_name FROM events e WHERE e.phone_number_id = grouped.phone_number_id AND e.sender_mobile = grouped.sender_mobile AND e.sender_name IS NOT NULL ORDER BY e.occurred_at DESC LIMIT 1)) AS "senderName",
        sender_mobile AS "senderMobile", phone_number_id AS "phoneNumberId", body, direction, occurred_at AS "receivedAt"
      FROM events m WHERE m.phone_number_id = grouped.phone_number_id AND m.sender_mobile = grouped.sender_mobile
      ORDER BY occurred_at DESC, key DESC LIMIT 1
    ) latest WHERE (${search === ''} OR grouped.matches) AND (${!unread} OR grouped.unread > 0)
  )`
  try {
    const [conversations, count] = await Promise.all([
      prisma.$queryRaw(Prisma.sql`${chats} SELECT * FROM chats ORDER BY "receivedAt" DESC, id DESC LIMIT 50 OFFSET ${(page - 1) * 50}`),
      prisma.$queryRaw<{ total: number }[]>(Prisma.sql`${chats} SELECT COUNT(*)::int AS total FROM chats`),
    ])
    return NextResponse.json({ conversations, total: count[0]?.total || 0 }, { headers: { 'Cache-Control': 'no-store' } })
  } catch { return NextResponse.json({ error: 'Unable to load chats. Please try again.' }, { status: 500 }) }
}
