import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

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

  if (process.env.INSURANCE_REMINDER_ENABLED !== 'true') {
    return NextResponse.json({ ok: true, skipped: true, reason: 'Insurance reminders are disabled.' })
  }

  try {
    const { queueDailyInsuranceReminders, retryInsuranceReminders } = await import('../../../../src/worker/insuranceReminders.mjs')
    await queueDailyInsuranceReminders(prisma)
    await retryInsuranceReminders(prisma)
    return NextResponse.json({ ok: true, ranAt: new Date().toISOString() })
  } catch (error) {
    console.error('Insurance reminder cron failed:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Insurance reminder cron failed.' }, { status: 500 })
  }
}
