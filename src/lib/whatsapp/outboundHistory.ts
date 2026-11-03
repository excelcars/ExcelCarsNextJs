import { Prisma } from '@prisma/client'

/** Older logs did not retain the sending number; associate those environment-local logs with its configured number. */
export function outboundHistorySql() {
  const legacyPhone = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || ''
  return Prisma.sql`
    SELECT 'sent-' || id AS key, phone_number_id, recipient_mobile AS sender_mobile, recipient_name AS sender_name,
      body, created_at AS occurred_at, status, error_message, template_name, template_language,
      button_url_suffix, provider_message_id
    FROM whatsapp_sent_messages
    UNION ALL
    SELECT 'vehicle-' || l.whatsapp_delivery_log_id, ${legacyPhone}, regexp_replace(l.recipient_mobile, '[^0-9]', '', 'g'), l.recipient_name,
      concat_ws(chr(10), 'Customer: ' || l.recipient_name, 'Vehicle: ' || l.vehicle_name), coalesce(l.attempted_at, l.created_at),
      l.status, l.error_message, l.template_name, l.template_language, l.button_url_suffix, l.provider_message_id
    FROM whatsapp_delivery_log l WHERE l.provider_message_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM whatsapp_sent_messages s WHERE s.provider_message_id = l.provider_message_id)
    UNION ALL
    SELECT 'noinventory-' || l.inquiry_no_inventory_notification_log_id, ${legacyPhone}, regexp_replace(l.recipient, '[^0-9]', '', 'g'), NULL::text,
      'No-inventory enquiry template', coalesce(l.attempted_at, l.created_at), l.status, l.error_message, l.template_name, 'en', NULL::text, l.provider_message_id
    FROM inquiry_no_inventory_notification_log l WHERE l.channel = 'WhatsApp' AND l.provider_message_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM whatsapp_sent_messages s WHERE s.provider_message_id = l.provider_message_id)
    UNION ALL
    SELECT 'insurance-' || a.insurance_reminder_attempt_id, ${legacyPhone}, regexp_replace(d.recipient_address, '[^0-9]', '', 'g'), d.recipient_name,
      coalesce(d.whatsapp_message, 'Insurance renewal reminder'), a.attempted_at, a.status, a.error_message,
      'global_temp', 'en', NULL::text, a.provider_message_id
    FROM insurance_reminder_attempt a JOIN insurance_reminder_delivery d ON d.insurance_reminder_delivery_id = a.insurance_reminder_delivery_id
    WHERE d.channel = 'WhatsApp' AND a.provider_message_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM whatsapp_sent_messages s WHERE s.provider_message_id = a.provider_message_id)
  `
}

export function latestDeliveryEvent<T extends { status: string }>(events: T[]) {
  return events.find(event => event.status === 'read') ?? events.find(event => event.status === 'delivered') ?? events[0]
}
