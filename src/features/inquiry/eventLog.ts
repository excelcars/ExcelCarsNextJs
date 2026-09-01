import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'

type DbClient = typeof prisma | Prisma.TransactionClient

export interface InquiryActivityEvent {
  inquiryActivityLogId: number
  inquiryId: number
  eventType: string
  eventLabel: string | null
  eventDetail: string | null
  actorUserId: number | null
  actorUserName: string | null
  inventoryId: number | null
  followupId: number | null
  inquiryCarDetailsId: number | null
  createdAt: Date
}

interface LogInquiryEventInput {
  inquiryId: number
  eventType: string
  eventLabel?: string | null
  eventDetail?: string | null
  actorUserId?: number | null
  actorUserName?: string | null
  inventoryId?: number | null
  followupId?: number | null
  inquiryCarDetailsId?: number | null
  createdAt?: Date
}

let ensureInquiryActivityLogTablePromise: Promise<void> | null = null

function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

async function lookupActorUserName(db: DbClient, actorUserId: number | null | undefined) {
  if (!actorUserId) return null
  const actor = await db.userTable.findUnique({
    where: { userId: actorUserId },
    select: { displayName: true, userName: true },
  })
  return actor?.displayName?.trim() || actor?.userName?.trim() || null
}

export async function ensureInquiryActivityLogTable() {
  if (!ensureInquiryActivityLogTablePromise) {
    ensureInquiryActivityLogTablePromise = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS inquiry_activity_log (
          inquiry_activity_log_id SERIAL PRIMARY KEY,
          inquiry_id INTEGER NOT NULL,
          event_type TEXT NOT NULL,
          event_label TEXT NULL,
          event_detail TEXT NULL,
          actor_user_id INTEGER NULL,
          actor_user_name TEXT NULL,
          inventory_id INTEGER NULL,
          followup_id INTEGER NULL,
          inquiry_car_details_id INTEGER NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `)
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS ix_inquiry_activity_log_inquiry_id
          ON inquiry_activity_log (inquiry_id, created_at DESC)
      `)
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS ix_inquiry_activity_log_actor_user_id
          ON inquiry_activity_log (actor_user_id, created_at DESC)
      `)
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS ix_inquiry_activity_log_inventory_id
          ON inquiry_activity_log (inventory_id, created_at DESC)
      `)
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS ix_inquiry_activity_log_followup_id
          ON inquiry_activity_log (followup_id, created_at DESC)
      `)
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS ix_inquiry_activity_log_event_type
          ON inquiry_activity_log (event_type, created_at DESC)
      `)
    })().catch(error => {
      ensureInquiryActivityLogTablePromise = null
      throw error
    })
  }

  await ensureInquiryActivityLogTablePromise
}

export async function logInquiryEvent(
  db: DbClient,
  input: LogInquiryEventInput,
) {
  await ensureInquiryActivityLogTable()
  const actorUserName = normalizeOptionalText(input.actorUserName) ?? await lookupActorUserName(db, input.actorUserId)

  await db.$executeRaw(Prisma.sql`
    INSERT INTO inquiry_activity_log (
      inquiry_id,
      event_type,
      event_label,
      event_detail,
      actor_user_id,
      actor_user_name,
      inventory_id,
      followup_id,
      inquiry_car_details_id,
      created_at
    ) VALUES (
      ${input.inquiryId},
      ${input.eventType},
      ${normalizeOptionalText(input.eventLabel) ?? null},
      ${normalizeOptionalText(input.eventDetail) ?? null},
      ${input.actorUserId ?? null},
      ${actorUserName},
      ${input.inventoryId ?? null},
      ${input.followupId ?? null},
      ${input.inquiryCarDetailsId ?? null},
      ${input.createdAt ?? new Date()}
    )
  `)
}

export async function getInquiryActivityEvents(inquiryId: number) {
  await ensureInquiryActivityLogTable()
  const rows = await prisma.$queryRaw<Array<{
    inquiry_activity_log_id: number
    inquiry_id: number
    event_type: string
    event_label: string | null
    event_detail: string | null
    actor_user_id: number | null
    actor_user_name: string | null
    inventory_id: number | null
    followup_id: number | null
    inquiry_car_details_id: number | null
    created_at: Date
  }>>(Prisma.sql`
    SELECT
      inquiry_activity_log_id,
      inquiry_id,
      event_type,
      event_label,
      event_detail,
      actor_user_id,
      actor_user_name,
      inventory_id,
      followup_id,
      inquiry_car_details_id,
      created_at
    FROM inquiry_activity_log
    WHERE inquiry_id = ${inquiryId}
    ORDER BY created_at DESC, inquiry_activity_log_id DESC
    LIMIT 200
  `)

  return rows.map(row => ({
    inquiryActivityLogId: row.inquiry_activity_log_id,
    inquiryId: row.inquiry_id,
    eventType: row.event_type,
    eventLabel: row.event_label,
    eventDetail: row.event_detail,
    actorUserId: row.actor_user_id,
    actorUserName: row.actor_user_name,
    inventoryId: row.inventory_id,
    followupId: row.followup_id,
    inquiryCarDetailsId: row.inquiry_car_details_id,
    createdAt: row.created_at,
  })) satisfies InquiryActivityEvent[]
}
