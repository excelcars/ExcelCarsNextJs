export interface WhatsAppTemplateResult {
  success: boolean
  providerMessageId?: string
  error?: string
}

/**
 * Meta URL-button templates have a fixed URL origin. Use a separately approved
 * template for each deployed app origin and select it through its environment.
 */
export function getEnquiryWhatsAppTemplateName() {
  return process.env.WHATSAPP_ENQUIRY_TEMPLATE_NAME?.trim() || 'enquiry_temp'
}

export function getNoInventoryWhatsAppTemplateName() {
  return process.env.WHATSAPP_NO_INVENTORY_TEMPLATE_NAME?.trim() || 'enquiry_noinventory'
}

export function normalizeWhatsAppRecipient(value: string | null | undefined) {
  const digits = (value ?? '').replace(/\D/g, '')
  if (!digits) return null
  const localNumber = digits.length > 10 ? digits.slice(-10) : digits
  return localNumber.length === 10 ? `91${localNumber}` : null
}

export async function sendEnquiryTemplate({
  to,
  customerName,
  vehicleName,
  buttonUrlSuffix,
}: {
  to: string
  customerName: string
  vehicleName: string
  buttonUrlSuffix: string
}): Promise<WhatsAppTemplateResult> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim()
  const apiVersion = process.env.WHATSAPP_GRAPH_API_VERSION?.trim() || 'v23.0'

  if (!phoneNumberId || !accessToken) {
    return { success: false, error: 'WhatsApp is not configured yet — add WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN to the environment.' }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)
  try {
    const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: getEnquiryWhatsAppTemplateName(),
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: customerName },
                { type: 'text', text: vehicleName },
              ],
            },
            {
              type: 'button',
              sub_type: 'url',
              index: '0',
              parameters: [{ type: 'text', text: buttonUrlSuffix }],
            },
          ],
        },
      }),
      signal: controller.signal,
    })
    const payload = await response.json().catch(() => null) as { messages?: Array<{ id?: string }>; error?: { message?: string } } | null
    if (!response.ok) return { success: false, error: payload?.error?.message || `WhatsApp API request failed (${response.status}).` }
    return { success: true, providerMessageId: payload?.messages?.[0]?.id }
  } catch (error) {
    return { success: false, error: error instanceof Error && error.name === 'AbortError' ? 'WhatsApp API request timed out.' : 'WhatsApp API request failed.' }
  } finally {
    clearTimeout(timeout)
  }
}

export async function sendNoInventoryEnquiryTemplate({ to, customerName }: { to: string; customerName: string }): Promise<WhatsAppTemplateResult> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim()
  const apiVersion = process.env.WHATSAPP_GRAPH_API_VERSION?.trim() || 'v23.0'
  if (!phoneNumberId || !accessToken) {
    return { success: false, error: 'WhatsApp is not configured yet — add WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN to the environment.' }
  }

  try {
    const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: getNoInventoryWhatsAppTemplateName(),
          language: { code: 'en' },
          components: [{ type: 'body', parameters: [{ type: 'text', text: customerName }] }],
        },
      }),
    })
    const payload = await response.json().catch(() => null) as { messages?: Array<{ id?: string }>; error?: { message?: string } } | null
    if (!response.ok) return { success: false, error: payload?.error?.message || `WhatsApp API request failed (${response.status}).` }
    return { success: true, providerMessageId: payload?.messages?.[0]?.id }
  } catch {
    return { success: false, error: 'WhatsApp API request failed.' }
  }
}

export async function sendGlobalTemplate({ to, customerName, message }: { to: string; customerName: string; message: string }): Promise<WhatsAppTemplateResult> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim()
  const apiVersion = process.env.WHATSAPP_GRAPH_API_VERSION?.trim() || 'v23.0'
  if (!phoneNumberId || !accessToken) return { success: false, error: 'WhatsApp is not configured yet.' }
  try {
    const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
      method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'template', template: { name: 'global_temp', language: { code: 'en' }, components: [{ type: 'body', parameters: [{ type: 'text', text: customerName }, { type: 'text', text: message }] }] } }),
    })
    const payload = await response.json().catch(() => null) as { messages?: Array<{ id?: string }>; error?: { message?: string } } | null
    return response.ok ? { success: true, providerMessageId: payload?.messages?.[0]?.id } : { success: false, error: payload?.error?.message || `WhatsApp API request failed (${response.status}).` }
  } catch { return { success: false, error: 'WhatsApp API request failed.' } }
}
