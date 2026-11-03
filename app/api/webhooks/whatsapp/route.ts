import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { parseWhatsAppMessages, secureEqual, verifyWhatsAppSignature } from '@/lib/whatsapp/webhook'

export const runtime = 'nodejs'
const MAX_BODY_BYTES = 1024 * 1024

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const token = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim()
  if (!token) return NextResponse.json({ error: 'Webhook is not configured.' }, { status: 503 })
  if (params.get('hub.mode') !== 'subscribe' || !secureEqual(params.get('hub.verify_token') ?? '', token) || !params.get('hub.challenge')) {
    return NextResponse.json({ error: 'Verification failed.' }, { status: 403 })
  }
  return new Response(params.get('hub.challenge'), { headers: { 'Content-Type': 'text/plain' } })
}

export async function POST(request: Request) {
  const secret = process.env.WHATSAPP_APP_SECRET?.trim()
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
  if (!secret || !phoneNumberId) return NextResponse.json({ error: 'Webhook is not configured.' }, { status: 503 })
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return NextResponse.json({ error: 'JSON required.' }, { status: 415 })
  }
  const reader = request.body?.getReader()
  if (!reader) return NextResponse.json({ error: 'Missing body.' }, { status: 400 })
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_BODY_BYTES) {
        await reader.cancel()
        return NextResponse.json({ error: 'Payload too large.' }, { status: 413 })
      }
      chunks.push(value)
    }
  } catch {
    return NextResponse.json({ error: 'Unable to read body.' }, { status: 400 })
  } finally { reader.releaseLock() }
  const raw = Buffer.concat(chunks)
  if (!verifyWhatsAppSignature(raw, request.headers.get('x-hub-signature-256'), secret)) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 })
  }
  let messages
  try { messages = parseWhatsAppMessages(JSON.parse(raw.toString('utf8')), phoneNumberId) }
  catch { return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 }) }
  try {
    // A unique provider ID and skipDuplicates make concurrent Meta retries safe.
    if (messages.length) await prisma.whatsAppReceivedMessage.createMany({ data: messages, skipDuplicates: true })
    return NextResponse.json({ received: true })
  } catch {
    console.error('WhatsApp webhook persistence failed')
    return NextResponse.json({ error: 'Unable to save messages.' }, { status: 500 })
  }
}
