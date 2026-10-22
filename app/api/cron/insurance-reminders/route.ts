import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { syncFollowupNotificationsForActiveUsers } from '@/features/notifications/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  return request.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized cron request.' }, { status: 401 })
  }

  let followupNotifications: { usersProcessed?: number; error?: string }
  try {
    followupNotifications = await syncFollowupNotificationsForActiveUsers()
  } catch (error) {
    console.error('Follow-up notification sync failed:', error)
    followupNotifications = { error: error instanceof Error ? error.message : 'Follow-up notification sync failed.' }
  }

  let insuranceReminders: { skipped: boolean; error?: string } = { skipped: true }
  if (process.env.INSURANCE_REMINDER_ENABLED === 'true') {
    try {
      const { queueDailyInsuranceReminders, retryInsuranceReminders } = await import('../../../../src/worker/insuranceReminders.mjs')
      await queueDailyInsuranceReminders(prisma)
      await retryInsuranceReminders(prisma)
      insuranceReminders = { skipped: false }
    } catch (error) {
      console.error('Insurance reminder cron failed:', error)
      insuranceReminders = { skipped: false, error: error instanceof Error ? error.message : 'Insurance reminder cron failed.' }
    }
  }

  const ranAt = new Date().toISOString()
  if (followupNotifications.error || insuranceReminders.error) {
    return NextResponse.json({ error: 'Daily reminder cron completed with errors.', followupNotifications, insuranceReminders, ranAt }, { status: 500 })
  }

  return NextResponse.json({ ok: true, followupNotifications, insuranceReminders, ranAt })
}
