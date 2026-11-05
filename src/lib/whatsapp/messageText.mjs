// Approved enquiry_noinventory wording supplied by the business.
const NO_INVENTORY_MESSAGE = 'Hi {{1}}, thank you for your enquiry with Excel Cars.\n\nWe have received your request and our team will get in touch with you shortly.\n\nFor any immediate assistance, you can contact us at 82923002.\n\nWe’ll be happy to assist you.'

export function renderNoInventoryMessage(customerName) {
  return NO_INVENTORY_MESSAGE.replace('{{1}}', () => customerName)
}

export function resolveLoggedMessage(row) {
  const noInventoryTemplate = process.env.WHATSAPP_NO_INVENTORY_TEMPLATE_NAME?.trim() || 'enquiry_noinventory'
  const noInventory = row.key.startsWith('noinventory-') || row.templateName === noInventoryTemplate
  const vehicleTemplate = process.env.WHATSAPP_ENQUIRY_TEMPLATE_NAME?.trim() || 'enquiry_temp'
  if (!noInventory && !row.key.startsWith('vehicle-') && row.templateName !== vehicleTemplate) return row.body || null
  const parametersOnly = !row.body || row.body === 'No-inventory enquiry template' || row.body.startsWith('Customer: ')
  if (noInventory && parametersOnly && row.recipientName?.trim()) return renderNoInventoryMessage(row.recipientName.trim())
  return parametersOnly ? null : row.body
}
