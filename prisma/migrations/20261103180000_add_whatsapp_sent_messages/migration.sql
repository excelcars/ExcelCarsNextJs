CREATE TABLE "public"."whatsapp_sent_messages" (
  "id" SERIAL PRIMARY KEY,
  "phone_number_id" TEXT NOT NULL,
  "recipient_mobile" TEXT NOT NULL,
  "recipient_name" TEXT,
  "template_name" TEXT NOT NULL,
  "template_language" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "parameters" JSONB NOT NULL,
  "button_url_suffix" TEXT,
  "provider_message_id" TEXT,
  "status" TEXT NOT NULL,
  "error_message" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ix_whatsapp_sent_contact_time" ON "public"."whatsapp_sent_messages" ("phone_number_id", "recipient_mobile", "created_at");
CREATE INDEX "ix_whatsapp_sent_provider" ON "public"."whatsapp_sent_messages" ("provider_message_id");
