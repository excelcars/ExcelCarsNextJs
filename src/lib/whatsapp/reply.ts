import { WHATSAPP_SENDING_ENABLED, WHATSAPP_PAUSED_MESSAGE } from './sendingPolicy.mjs'
export const REPLY_WINDOW_MS = 24 * 60 * 60 * 1000

export function canReplyToWhatsApp(lastInboundAt: Date, now = Date.now()) {
  const timestamp = lastInboundAt.getTime()
  return Number.isFinite(timestamp) && timestamp <= now && now - timestamp < REPLY_WINDOW_MS
}

export type TextReplyResult = {
  status: 'accepted' | 'failed' | 'unknown'
  providerMessageId?: string
  error?: string
}

export async function sendWhatsAppTextReply(input: {
  phoneNumberId: string; to: string; body: string; contextMessageId: string
}): Promise<TextReplyResult> {
  if (!WHATSAPP_SENDING_ENABLED) return { status: 'failed', error: WHATSAPP_PAUSED_MESSAGE }
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim()
  const configuredPhone = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
  const version = process.env.WHATSAPP_GRAPH_API_VERSION?.trim() || 'v23.0'
  if (!accessToken || configuredPhone !== input.phoneNumberId) return { status: 'failed', error: 'WhatsApp sending is not configured for this business number.' }
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch(`https://graph.facebook.com/${version}/${input.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: input.to,
        type: 'text', text: { preview_url: false, body: input.body }, context: { message_id: input.contextMessageId } }),
      signal: controller.signal,
    })
    const payload = await response.json().catch(() => null) as { messages?: { id?: string }[]; error?: { code?: number } } | null
    if (!response.ok) {
      const code = payload?.error?.code
      // Provider 5xx errors can have an uncertain outcome. Never retry automatically.
      return { status: response.status >= 500 ? 'unknown' : 'failed', error: code === 131047
        ? 'The 24-hour reply window is closed. Use an approved template.'
        : `WhatsApp rejected the request (HTTP ${response.status}${code ? `, code ${code}` : ''}). Check the business number and access token.` }
    }
    const id = payload?.messages?.[0]?.id
    if (!id) return { status: 'unknown', error: 'WhatsApp returned no message ID. Check WhatsApp before sending again.' }
    return { status: 'accepted', providerMessageId: id }
  } catch {
    return { status: 'unknown', error: 'Delivery could not be confirmed. Check WhatsApp before sending again.' }
  } finally { clearTimeout(timeout) }
}
