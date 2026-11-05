import test from 'node:test'
import assert from 'node:assert/strict'

const { getEnquiryWhatsAppTemplateName, getNoInventoryWhatsAppTemplateName } = await import(new URL('./meta.ts', import.meta.url).href)

test('getEnquiryWhatsAppTemplateName uses the environment-specific template', () => {
  const previous = process.env.WHATSAPP_ENQUIRY_TEMPLATE_NAME
  process.env.WHATSAPP_ENQUIRY_TEMPLATE_NAME = 'enquiry_temp_uat'
  assert.equal(getEnquiryWhatsAppTemplateName(), 'enquiry_temp_uat')

  delete process.env.WHATSAPP_ENQUIRY_TEMPLATE_NAME
  assert.equal(getEnquiryWhatsAppTemplateName(), 'enquiry_temp')

  if (previous === undefined) delete process.env.WHATSAPP_ENQUIRY_TEMPLATE_NAME
  else process.env.WHATSAPP_ENQUIRY_TEMPLATE_NAME = previous
})

test('getNoInventoryWhatsAppTemplateName uses the environment-specific template', () => {
  const previous = process.env.WHATSAPP_NO_INVENTORY_TEMPLATE_NAME
  process.env.WHATSAPP_NO_INVENTORY_TEMPLATE_NAME = 'enquiry_noinventory_production'
  assert.equal(getNoInventoryWhatsAppTemplateName(), 'enquiry_noinventory_production')
  delete process.env.WHATSAPP_NO_INVENTORY_TEMPLATE_NAME
  assert.equal(getNoInventoryWhatsAppTemplateName(), 'enquiry_noinventory')
  if (previous === undefined) delete process.env.WHATSAPP_NO_INVENTORY_TEMPLATE_NAME
  else process.env.WHATSAPP_NO_INVENTORY_TEMPLATE_NAME = previous
})


test('all template entry points are paused without loading the database', async () => {
  const { sendEnquiryTemplate, sendNoInventoryEnquiryTemplate, sendGlobalTemplate } = await import(new URL('./meta.ts', import.meta.url).href)
  const results = await Promise.all([
    sendEnquiryTemplate({ to: '919000000001', customerName: 'Test', vehicleName: 'Car', buttonUrlSuffix: 'vehicle/test' }),
    sendNoInventoryEnquiryTemplate({ to: '919000000001', customerName: 'Test' }),
    sendGlobalTemplate({ to: '919000000001', customerName: 'Test', message: 'Hello' }),
  ])
  for (const result of results) {
    assert.equal(result.success, false)
    assert.match(result.error, /temporarily disabled/)
  }
})
