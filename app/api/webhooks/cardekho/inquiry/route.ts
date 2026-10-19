import { NextRequest, NextResponse } from 'next/server'
import { isPartnerWebhookAuthorized, receivePartnerInquiry } from '@/features/inquiry/partnerWebhook'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  if (!isPartnerWebhookAuthorized(request.headers, process.env.CARDEKHO_WEBHOOK_SECRET)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) return NextResponse.json({ error: 'Content-Type must be application/json.' }, { status: 415 })
  try {
    const payload = await request.json()
    if (!payload || Array.isArray(payload) || typeof payload !== 'object') return NextResponse.json({ error: 'JSON object expected.' }, { status: 422 })
    const result = await receivePartnerInquiry('CARDEKHO', payload as Record<string, unknown>)
    return result.success ? new NextResponse('SUCCESS', { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } }) : NextResponse.json({ error: result.error }, { status: result.status })
  } catch (error) {
    console.error('Cardekho webhook failed:', error)
    return NextResponse.json({ error: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : 'Could not process Cardekho enquiry.' }, { status: 500 })
  }
}
