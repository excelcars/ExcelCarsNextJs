import { createHmac, timingSafeEqual } from 'node:crypto'

export function secureEqual(actual: string, expected: string) {
  const a = Buffer.from(actual)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function verifyWhatsAppSignature(body: Uint8Array, signature: string | null, secret: string) {
  if (!secret || !signature || !/^sha256=[a-f0-9]{64}$/.test(signature)) return false
  return secureEqual(signature, `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`)
}

type RecordValue = Record<string, unknown>
function object(value: unknown): RecordValue {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : {}
}
function list(value: unknown): unknown[] { return Array.isArray(value) ? value : [] }
function text(value: unknown, max = 4096) { return typeof value === 'string' ? value.slice(0, max) : '' }

export type ReceivedWhatsAppMessage = {
  providerMessageId: string; phoneNumberId: string; senderMobile: string; senderName: string | null
  messageType: string; body: string; mediaId: string | null; sentAt: Date
}

export function inspectWhatsAppEvent(payload: unknown, allowedPhoneNumberId: string) {
  const root = object(payload)
  if (root.object !== 'whatsapp_business_account') throw new Error('Invalid WhatsApp event')
  const result: ReceivedWhatsAppMessage[] = []
  const deliveryStatuses: { providerMessageId: string; status: string; occurredAt: Date; errorMessage: string | null }[] = []
  const failureCodes: number[] = []
  let incomingMessages = 0
  let statusUpdates = 0
  let skippedPhoneNumberMessages = 0
  for (const entry of list(root.entry)) for (const change of list(object(entry).changes)) {
    if (object(change).field !== 'messages') continue
    const value = object(object(change).value)
    const incoming = list(value.messages)
    incomingMessages += incoming.length
    statusUpdates += list(value.statuses).length
    const phoneNumberId = text(object(value.metadata).phone_number_id, 100)
    if (!allowedPhoneNumberId || phoneNumberId !== allowedPhoneNumberId) {
      skippedPhoneNumberMessages += incoming.length
      continue
    }
    for (const item of list(value.statuses)) {
      const delivery = object(item)
      const providerMessageId = text(delivery.id, 512)
      const status = text(delivery.status, 32)
      const occurredAt = new Date(Number(delivery.timestamp) * 1000)
      if (!providerMessageId || !['sent', 'delivered', 'read', 'failed'].includes(status) || !Number.isFinite(occurredAt.getTime()) || occurredAt.getTime() <= 0) continue
      const errors = list(delivery.errors).map(object)
      for (const error of errors) if (typeof error.code === 'number' && Number.isSafeInteger(error.code)) failureCodes.push(error.code)
      const errorMessage = errors.map(error => [typeof error.code === 'number' ? String(error.code) : '', text(error.title, 200), text(object(error.error_data).details, 500)].filter(Boolean).join(': ')).join('; ').slice(0, 1000) || null
      deliveryStatuses.push({ providerMessageId, status, occurredAt, errorMessage })
    }
    for (const item of incoming) {
      const message = object(item)
      const providerMessageId = text(message.id, 512)
      const senderMobile = text(message.from, 32)
      const messageType = text(message.type, 64)
      const timestamp = Number(message.timestamp)
      const sentAt = new Date(timestamp * 1000)
      if (!providerMessageId || !/^\d{5,20}$/.test(senderMobile) || !messageType || !Number.isFinite(timestamp) || timestamp <= 0 || !Number.isFinite(sentAt.getTime())) {
        throw new Error('Invalid incoming message')
      }
      const contact = list(value.contacts).map(object).find(contact => contact.wa_id === senderMobile)
      const content = object(message[messageType])
      let body = text(content.body)
      if (['image', 'video', 'audio', 'document', 'sticker'].includes(messageType)) {
        body = text(content.caption) || text(content.filename) || `[${messageType}]`
      } else if (messageType === 'button') body = text(content.text) || text(content.payload)
      else if (messageType === 'interactive') {
        const reply = object(content.button_reply ?? content.list_reply)
        body = text(reply.title) || text(reply.id)
      } else if (messageType === 'location') {
        body = [text(content.name), text(content.address), typeof content.latitude === 'number' && typeof content.longitude === 'number' ? `${content.latitude}, ${content.longitude}` : ''].filter(Boolean).join('\n')
      } else if (messageType === 'contacts') {
        body = list(message.contacts).map(contact => text(object(object(contact).name).formatted_name)).filter(Boolean).join(', ')
      }
      result.push({ providerMessageId, phoneNumberId, senderMobile, senderName: text(object(contact?.profile).name, 200) || null,
        messageType, body: body.slice(0, 4096) || `[${messageType}]`, mediaId: text(content.id, 512) || null, sentAt })
    }
  }
  return { messages: result, deliveryStatuses, failureCodes, incomingMessages, statusUpdates, skippedPhoneNumberMessages }
}

export function parseWhatsAppMessages(payload: unknown, allowedPhoneNumberId: string): ReceivedWhatsAppMessage[] {
  return inspectWhatsAppEvent(payload, allowedPhoneNumberId).messages
}
