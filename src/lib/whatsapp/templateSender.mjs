import { WHATSAPP_SENDING_ENABLED, WHATSAPP_PAUSED_MESSAGE } from './sendingPolicy.mjs'
/** Shared by the Next.js app and reminder worker. Never sends without reserving a history row. */
export async function sendLoggedWhatsAppTemplate(prisma, input) {
  if (!WHATSAPP_SENDING_ENABLED) return { success: false, error: WHATSAPP_PAUSED_MESSAGE }
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim()
  const version = process.env.WHATSAPP_GRAPH_API_VERSION?.trim() || 'v23.0'
  if (!phoneNumberId || !accessToken) return { success: false, error: 'WhatsApp is not configured yet.' }
  let row
  try {
    row = await prisma.whatsAppSentMessage.create({ data: {
      phoneNumberId, recipientMobile: input.to, recipientName: input.customerName,
      templateName: input.templateName, templateLanguage: 'en', body: input.body,
      parameters: input.components, buttonUrlSuffix: input.buttonUrlSuffix || null, status: 'Sending',
    } })
  } catch {
    return { success: false, error: 'Unable to save WhatsApp send history. Apply the sent-message migration before sending.' }
  }
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  let outcome
  try {
    const response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
      method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: input.to, type: 'template', template: { name: input.templateName, language: { code: 'en' }, components: input.components } }),
      signal: controller.signal,
    })
    const payload = await response.json().catch(() => null)
    const providerMessageId = payload?.messages?.[0]?.id
    outcome = response.ok && providerMessageId
      ? { success: true, providerMessageId, status: 'Submitted' }
      : { success: false, status: response.status >= 500 || response.ok ? 'Unknown' : 'Failed', error: payload?.error?.message || `WhatsApp did not confirm the send (HTTP ${response.status}).` }
  } catch {
    outcome = { success: false, status: 'Unknown', error: 'WhatsApp send status is unconfirmed. Check history before sending again.' }
  } finally { clearTimeout(timeout) }
  try {
    await prisma.whatsAppSentMessage.update({ where: { id: row.id }, data: { status: outcome.status,
      providerMessageId: outcome.providerMessageId || null, errorMessage: outcome.error?.slice(0, 1000) || null } })
  } catch {
    // Do not report an accepted send as failed: callers might otherwise send it again.
    console.error('Unable to finalize WhatsApp sent-message history')
  }
  return { success: outcome.success, providerMessageId: outcome.providerMessageId, error: outcome.error }
}
