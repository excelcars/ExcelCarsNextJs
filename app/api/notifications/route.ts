import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserAccessProfile } from '@/lib/access/accessControl'
import { prisma } from '@/lib/db/prisma'
import { getNotificationSnapshot } from '@/features/notifications/service'

export const dynamic = 'force-dynamic'

export async function GET() {
  const profile = await getCurrentUserAccessProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await getNotificationSnapshot(profile.userId))
}

export async function POST(request: NextRequest) {
  const profile = await getCurrentUserAccessProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => null) as { notificationId?: number; markAllRead?: boolean } | null
  const now = new Date()
  if (body?.markAllRead) {
    await prisma.userNotification.updateMany({ where: { recipientUserId: profile.userId, archivedAt: null, readAt: null }, data: { readAt: now } })
  } else if (Number.isInteger(body?.notificationId) && (body?.notificationId ?? 0) > 0) {
    await prisma.userNotification.updateMany({ where: { notificationId: body!.notificationId, recipientUserId: profile.userId, archivedAt: null }, data: { readAt: now } })
  } else {
    return NextResponse.json({ error: 'A notification action is required.' }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
