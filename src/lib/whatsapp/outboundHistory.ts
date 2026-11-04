import { Prisma } from '@prisma/client'

/** Older logs did not retain the sending number; associate those environment-local logs with its configured number. */
export function outboundHistorySql({ includeSentMessages = true }: { includeSentMessages?: boolean } = {}) {
  const legacyPhone = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || ''
  const journal = includeSentMessages ? Prisma.sql`
    SELECT 'sent-' || id AS key, phone_number_id, recipient_mobile AS sender_mobile, recipient_name AS sender_name,
      body, created_at AS occurred_at, status, error_message, template_name, template_language,
      button_url_suffix, provider_message_id
    FROM whatsapp_sent_messages` : Prisma.sql`
    SELECT NULL::text AS key, NULL::text AS phone_number_id, NULL::text AS sender_mobile, NULL::text AS sender_name,
      NULL::text AS body, NULL::timestamptz AS occurred_at, NULL::text AS status, NULL::text AS error_message,
      NULL::text AS template_name, NULL::text AS template_language, NULL::text AS button_url_suffix, NULL::text AS provider_message_id WHERE false`
  const deduplicate = (alias: 'l' | 'a') => includeSentMessages
    ? Prisma.sql`NOT EXISTS (SELECT 1 FROM whatsapp_sent_messages s WHERE s.provider_message_id = ${Prisma.raw(alias)}.provider_message_id)`
    : Prisma.sql`true`
  return Prisma.sql`
    ${journal}
    UNION ALL
    SELECT 'vehicle-' || l.whatsapp_delivery_log_id, ${legacyPhone}, regexp_replace(l.recipient_mobile, '[^0-9]', '', 'g'), l.recipient_name,
      concat_ws(chr(10), 'Customer: ' || l.recipient_name, 'Vehicle: ' || l.vehicle_name), coalesce(l.attempted_at, l.created_at),
      l.status, l.error_message, l.template_name, l.template_language, l.button_url_suffix, l.provider_message_id
    FROM whatsapp_delivery_log l WHERE l.provider_message_id IS NOT NULL
      AND ${deduplicate('l')}
    UNION ALL
    SELECT 'noinventory-' || l.inquiry_no_inventory_notification_log_id, ${legacyPhone}, regexp_replace(l.recipient, '[^0-9]', '', 'g'),
      coalesce(nullif(trim(c.cust_name), ''), nullif(trim(i.customer_name_legacy), '')),
      'No-inventory enquiry template', coalesce(l.attempted_at, l.created_at), l.status, l.error_message, l.template_name, 'en', NULL::text, l.provider_message_id
    FROM inquiry_no_inventory_notification_log l
    LEFT JOIN inquiry i ON i.inquiry_id = l.inquiry_id
    LEFT JOIN customer c ON c.cust_id = i.customer_id
    WHERE l.channel = 'WhatsApp' AND l.provider_message_id IS NOT NULL
      AND ${deduplicate('l')}
    UNION ALL
    SELECT 'insurance-' || a.insurance_reminder_attempt_id, ${legacyPhone}, regexp_replace(d.recipient_address, '[^0-9]', '', 'g'), d.recipient_name,
      coalesce(d.whatsapp_message, 'Insurance renewal reminder'), a.attempted_at, a.status, a.error_message,
      'global_temp', 'en', NULL::text, a.provider_message_id
    FROM insurance_reminder_attempt a JOIN insurance_reminder_delivery d ON d.insurance_reminder_delivery_id = a.insurance_reminder_delivery_id
    WHERE d.channel = 'WhatsApp' AND a.provider_message_id IS NOT NULL
      AND ${deduplicate('a')}
  `
}

export function latestDeliveryEvent<T extends { status: string }>(events: T[]) {
  return events.find(event => event.status === 'read') ?? events.find(event => event.status === 'delivered') ?? events[0]
}
