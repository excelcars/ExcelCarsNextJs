import { NextRequest, NextResponse } from 'next/server'
import { recordTrackedVehicleInteraction } from '@/features/vehicleEmailLinks/service'

const ALLOWED_INTERACTIONS = new Set(['call_click', 'whatsapp_click', 'email_click'])

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const token = typeof body?.token === 'string' ? body.token.trim() : ''
  const interactionType = typeof body?.interactionType === 'string' ? body.interactionType.trim() : ''
  const interactionLabel = typeof body?.interactionLabel === 'string' ? body.interactionLabel.trim() : ''

  if (!token) {
    return NextResponse.json({ error: 'Token is required.' }, { status: 400 })
  }

  if (!ALLOWED_INTERACTIONS.has(interactionType)) {
    return NextResponse.json({ error: 'Unsupported interaction type.' }, { status: 400 })
  }

  const forwardedFor = req.headers.get('x-forwarded-for')
  const result = await recordTrackedVehicleInteraction(token, interactionType, interactionLabel || null, {
    userAgent: req.headers.get('user-agent'),
    referrer: req.headers.get('referer'),
    ipAddress: forwardedFor?.split(',')[0]?.trim() || null,
  })
  if (!result.ok) {
    return NextResponse.json({ error: 'Link is unavailable.' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
