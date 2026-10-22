import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'

type NotificationClient = Prisma.TransactionClient | typeof prisma

const NOTIFICATION_WRITE_CONCURRENCY = 5
const USER_SYNC_CONCURRENCY = 2

export type NotificationInput = {
  recipientUserId: number
  type: 'inquiry_assigned' | 'inquiry_reassigned' | 'portal_lead' | 'followup_due' | 'followup_overdue'
  title: string
  body?: string | null
  href?: string | null
  entityType?: string | null
  entityId?: number | null
  dedupeKey: string
}

export async function createUserNotification(db: NotificationClient, input: NotificationInput) {
  return db.userNotification.upsert({
    where: { dedupeKey: input.dedupeKey },
    create: input,
    update: {
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      archivedAt: null,
      readAt: null,
    },
  })
}

export async function archiveFollowupNotifications(db: NotificationClient, inquiryId: number) {
  await db.userNotification.updateMany({
    where: {
      entityType: 'inquiry',
      entityId: inquiryId,
      type: { in: ['followup_due', 'followup_overdue'] },
      archivedAt: null,
    },
    data: { archivedAt: new Date() },
  })
}

async function mapWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  const pending = [...items]
  const workers = Array.from({ length: Math.min(limit, pending.length) }, async () => {
    while (pending.length) {
      const item = pending.shift()
      if (item !== undefined) await worker(item)
    }
  })
  await Promise.all(workers)
}

function startOfIndiaToday() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const value = (type: string) => parts.find(part => part.type === type)?.value
  return new Date(Date.UTC(Number(value('year')), Number(value('month')) - 1, Number(value('day'))))
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' }).format(value)
}

export async function syncFollowupNotificationsForUser(userId: number, db: NotificationClient = prisma) {
  const today = startOfIndiaToday()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dueInquiries = await db.inquiry.findMany({
    where: {
      status: 'FollowUp',
      followUpDate: { lt: tomorrow },
      OR: [{ assignedTo: userId }, { createdBy: userId }],
    },
    select: {
      inquiryId: true,
      inquiryNo: true,
      customerNameLegacy: true,
      followUpDate: true,
      customer: { select: { custName: true } },
    },
  })

  await mapWithConcurrency(dueInquiries.filter(row => row.followUpDate), NOTIFICATION_WRITE_CONCURRENCY, async row => {
    const overdue = row.followUpDate! < today
    const customerName = row.customer?.custName || row.customerNameLegacy || `Inquiry #${row.inquiryId}`
    const type = overdue ? 'followup_overdue' : 'followup_due'
    await createUserNotification(db, {
      recipientUserId: userId,
      type,
      title: overdue ? 'Follow-up overdue' : 'Follow-up due today',
      body: overdue
        ? `${customerName} was due on ${formatDate(row.followUpDate!)}.`
        : `${customerName} needs follow-up today.`,
      href: `/inquiry?search=${encodeURIComponent(row.inquiryNo ?? String(row.inquiryId))}`,
      entityType: 'inquiry',
      entityId: row.inquiryId,
      dedupeKey: `${type}:${userId}:${row.inquiryId}`,
    })
  })
}

export async function syncFollowupNotificationsForActiveUsers() {
  const users = await prisma.userTable.findMany({
    where: { status: 'Active' },
    select: { userId: true },
  })

  await mapWithConcurrency(users, USER_SYNC_CONCURRENCY, user => syncFollowupNotificationsForUser(user.userId))
  return { usersProcessed: users.length }
}

export async function getNotificationSnapshot(userId: number) {
  const [items, unreadCount] = await Promise.all([
    prisma.userNotification.findMany({
      where: { recipientUserId: userId, archivedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { notificationId: true, type: true, title: true, body: true, href: true, readAt: true, createdAt: true },
    }),
    prisma.userNotification.count({ where: { recipientUserId: userId, archivedAt: null, readAt: null } }),
  ])
  return { items, unreadCount }
}
