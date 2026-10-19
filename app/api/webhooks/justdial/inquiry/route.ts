import { NextRequest, NextResponse } from 'next/server'
import { isPartnerWebhookAuthorized, receivePartnerInquiry } from '@/features/inquiry/partnerWebhook'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function toPayload(entries: Iterable<[string, FormDataEntryValue]>) {
  return Object.fromEntries([...entries].map(([key, value]) => [key, typeof value === 'string' ? value : '']))
}

async function payloadFromRequest(request: NextRequest) {
  if (request.method === 'GET') return Object.fromEntries(request.nextUrl.searchParams.entries())
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? ''
  if (contentType.includes('application/json')) {
    const payload = await request.json()
    if (!payload || Array.isArray(payload) || typeof payload !== 'object') throw new Error('JSON object expected.')
    return payload as Record<string, unknown>
  }
  if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) return toPayload((await request.formData()).entries())
  throw new Error('Unsupported content type.')
}

async function handle(request: NextRequest) {
  if (!isPartnerWebhookAuthorized(request.headers, process.env.JUSTDIAL_WEBHOOK_SECRET)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  try {
    const result = await receivePartnerInquiry('JUSTDIAL', await payloadFromRequest(request))
    return result.success ? new NextResponse('SUCCESS', { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } }) : NextResponse.json({ error: result.error }, { status: result.status })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not process Justdial enquiry.'
    const status = message === 'Unsupported content type.' ? 415 : message === 'JSON object expected.' ? 422 : 500
    if (status === 500) console.error('Justdial webhook failed:', error)
    return NextResponse.json({ error: message }, { status })
  }
}

export async function GET(request: NextRequest) { return handle(request) }
export async function POST(request: NextRequest) { return handle(request) }
