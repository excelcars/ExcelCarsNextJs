import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'

type NotificationClient = Prisma.TransactionClient | typeof prisma

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

function startOfIndiaToday() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const value = (type: string) => parts.find(part => part.type === type)?.value
  return new Date(Date.UTC(Number(value('year')), Number(value('month')) - 1, Number(value('day'))))
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' }).format(value)
}

export async function syncFollowupNotificationsForUser(userId: number) {
  const today = startOfIndiaToday()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dueInquiries = await prisma.inquiry.findMany({
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

  await Promise.all(dueInquiries.filter(row => row.followUpDate).map(row => {
    const overdue = row.followUpDate! < today
    const customerName = row.customer?.custName || row.customerNameLegacy || `Inquiry #${row.inquiryId}`
    const type = overdue ? 'followup_overdue' : 'followup_due'
    return createUserNotification(prisma, {
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
  }))
}

export async function getNotificationSnapshot(userId: number) {
  await syncFollowupNotificationsForUser(userId)
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
