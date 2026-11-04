import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedActorForFunctions } from '@/lib/access/accessControl'
import { getAllowedFunctionNamesForRoute } from '@/lib/access/accessCatalog'
import { outboundHistorySql } from '@/lib/whatsapp/outboundHistory'
import { resolveLoggedMessage } from '@/lib/whatsapp/messageText.mjs'

type LogRow = { key: string; templateName: string | null; body: string | null; recipientName: string | null }

function dateBoundary(value: string | null) {
  if (!value) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Invalid date.')
  const date = new Date(`${value}T00:00:00+05:30`)
  if (!Number.isFinite(date.getTime()) || new Date(date.getTime() + 19800000).toISOString().slice(0, 10) !== value) throw new Error('Invalid date.')
  return date
}

export async function GET(request: Request) {
  if (!await getAuthorizedActorForFunctions(getAllowedFunctionNamesForRoute('/messages/logs'))) return NextResponse.json({ error: 'Access denied.' }, { status: 403 })
  const params = new URL(request.url).searchParams
  const page = Number(params.get('page') || 1)
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000) return NextResponse.json({ error: 'Invalid page.' }, { status: 400 })
  const search = (params.get('search') || '').trim().slice(0, 200)
  let from: Date | null, to: Date | null
  try {
    from = dateBoundary(params.get('from'))
    to = dateBoundary(params.get('to'))
    if (from && to && from > to) throw new Error('Invalid date range.')
  } catch { return NextResponse.json({ error: 'Choose a valid date range.' }, { status: 400 }) }
  const conditions = [Prisma.sql`true`]
  if (search) conditions.push(Prisma.sql`(sender_mobile ILIKE ${`%${search}%`} OR sender_name ILIKE ${`%${search}%`} OR template_name ILIKE ${`%${search}%`} OR provider_message_id ILIKE ${`%${search}%`})`)
  if (from) conditions.push(Prisma.sql`occurred_at >= ${from}`)
  if (to) conditions.push(Prisma.sql`occurred_at < ${new Date(to.getTime() + 86400000)}`)
  try {
    const [tables] = await prisma.$queryRaw<{ sent: boolean; replies: boolean; statuses: boolean }[]>`SELECT
      to_regclass('whatsapp_sent_messages') IS NOT NULL AS sent,
      to_regclass('whatsapp_inbox_replies') IS NOT NULL AND to_regclass('whatsapp_received_messages') IS NOT NULL AS replies,
      to_regclass('whatsapp_message_statuses') IS NOT NULL AS statuses`
    const replies = tables.replies ? Prisma.sql`
      UNION ALL
      SELECT 'reply-' || r.id, m.phone_number_id, m.sender_mobile, m.sender_name, r.body, r.created_at,
        r.status, r.error_message, NULL::text, NULL::text, NULL::text, r.provider_message_id, 'Text reply'
      FROM whatsapp_inbox_replies r JOIN whatsapp_received_messages m ON m.id = r.received_message_id` : Prisma.empty
    const events = tables.statuses ? Prisma.sql`SELECT id, provider_message_id, status, occurred_at, error_message FROM whatsapp_message_statuses`
      : Prisma.sql`SELECT NULL::int AS id, NULL::text AS provider_message_id, NULL::text AS status, NULL::timestamptz AS occurred_at, NULL::text AS error_message WHERE false`
    const logs = Prisma.sql`WITH outbound AS (${outboundHistorySql({ includeSentMessages: tables.sent })}), delivery_events AS (${events}), sends AS (
      SELECT *, 'Template' AS message_type FROM outbound
      ${replies}
    ), filtered AS (
      SELECT * FROM sends WHERE ${Prisma.join(conditions, ' AND ')}
    ), logs AS (
      SELECT f.*, CASE WHEN event.status IS NOT NULL THEN event.status
        WHEN lower(f.status) IN ('accepted', 'submitted', 'success') THEN 'submitted'
        ELSE lower(f.status) END AS delivery_status,
        event.occurred_at AS status_at,
        CASE WHEN event.status IS NOT NULL THEN event.error_message ELSE f.error_message END AS delivery_error
      FROM filtered f LEFT JOIN LATERAL (
        SELECT status, occurred_at, error_message FROM delivery_events
        WHERE provider_message_id = f.provider_message_id
        ORDER BY CASE status WHEN 'read' THEN 0 WHEN 'delivered' THEN 1 ELSE 2 END, occurred_at DESC, id DESC LIMIT 1
      ) event ON true
    )`
    const [rows, counts] = await prisma.$transaction([
      prisma.$queryRaw<LogRow[]>(Prisma.sql`${logs}
        SELECT key, sender_mobile AS "recipientMobile", sender_name AS "recipientName", phone_number_id AS "phoneNumberId",
          body, message_type AS "messageType", template_name AS "templateName", occurred_at AS "sentAt",
          delivery_status AS status, status_at AS "statusAt", delivery_error AS "errorMessage", provider_message_id AS "providerMessageId",
          COUNT(*) OVER (PARTITION BY sender_mobile)::int AS "phoneMessageCount"
        FROM logs ORDER BY occurred_at DESC, key DESC LIMIT 50 OFFSET ${(page - 1) * 50}`),
      prisma.$queryRaw<{ total: number; phones: number; submitted: number; delivered: number; failed: number }[]>(Prisma.sql`${logs}
        SELECT COUNT(*)::int AS total, COUNT(DISTINCT sender_mobile)::int AS phones,
          COUNT(*) FILTER (WHERE delivery_status IN ('submitted', 'sent', 'delivered', 'read'))::int AS submitted,
          COUNT(*) FILTER (WHERE delivery_status IN ('delivered', 'read'))::int AS delivered,
          COUNT(*) FILTER (WHERE delivery_status = 'failed')::int AS failed FROM logs`),
    ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
    return NextResponse.json({ rows: rows.map(row => ({ ...row, body: resolveLoggedMessage(row) })), summary: counts[0], page, pageSize: 50,
      historyNotice: !tables.sent || !tables.replies || !tables.statuses
        ? 'Showing available saved logs. Some newer send history, replies, or delivery updates are unavailable in this database.' : null,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch { return NextResponse.json({ error: 'Unable to load Meta message logs. Please try again.' }, { status: 500 }) }
}
