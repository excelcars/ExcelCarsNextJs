import { sendLoggedWhatsAppTemplate } from './templateSender.mjs'
import { renderNoInventoryMessage } from './messageText.mjs'

export interface WhatsAppTemplateResult { success: boolean; providerMessageId?: string; error?: string }
export function getEnquiryWhatsAppTemplateName() { return process.env.WHATSAPP_ENQUIRY_TEMPLATE_NAME?.trim() || 'enquiry_temp' }
export function getNoInventoryWhatsAppTemplateName() { return process.env.WHATSAPP_NO_INVENTORY_TEMPLATE_NAME?.trim() || 'enquiry_noinventory' }

export function normalizeWhatsAppRecipient(value: string | null | undefined) {
  const digits = (value ?? '').replace(/\D/g, '')
  if (!digits) return null
  const local = digits.length > 10 ? digits.slice(-10) : digits
  return local.length === 10 ? `91${local}` : null
}

async function send(input: Parameters<typeof sendLoggedWhatsAppTemplate>[1]): Promise<WhatsAppTemplateResult> {
  // Lazy import keeps configuration helpers usable in standalone scripts/tests.
  const { prisma } = await import('@/lib/db/prisma')
  return sendLoggedWhatsAppTemplate(prisma, input)
}

export async function sendEnquiryTemplate({ to, customerName, vehicleName, buttonUrlSuffix }: {
  to: string; customerName: string; vehicleName: string; buttonUrlSuffix: string
}): Promise<WhatsAppTemplateResult> {
  return send({ to, customerName, templateName: getEnquiryWhatsAppTemplateName(),
    // These are the exact parameters, not a reconstruction of Meta's approved static wording.
    body: `Customer: ${customerName}\nVehicle: ${vehicleName}`, buttonUrlSuffix,
    components: [{ type: 'body', parameters: [{ type: 'text', text: customerName }, { type: 'text', text: vehicleName }] },
      { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: buttonUrlSuffix }] }],
  })
}

export async function sendNoInventoryEnquiryTemplate({ to, customerName }: { to: string; customerName: string }): Promise<WhatsAppTemplateResult> {
  return send({ to, customerName, templateName: getNoInventoryWhatsAppTemplateName(), body: renderNoInventoryMessage(customerName),
    components: [{ type: 'body', parameters: [{ type: 'text', text: customerName }] }],
  })
}

export async function sendGlobalTemplate({ to, customerName, message }: { to: string; customerName: string; message: string }): Promise<WhatsAppTemplateResult> {
  return send({ to, customerName, templateName: 'global_temp', body: message,
    components: [{ type: 'body', parameters: [{ type: 'text', text: customerName }, { type: 'text', text: message }] }],
  })
}
