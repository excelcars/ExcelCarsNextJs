CREATE TABLE "public"."whatsapp_received_messages" (
  "id" SERIAL PRIMARY KEY,
  "provider_message_id" TEXT NOT NULL UNIQUE,
  "phone_number_id" TEXT NOT NULL,
  "sender_mobile" TEXT NOT NULL,
  "sender_name" TEXT,
  "message_type" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "media_id" TEXT,
  "sent_at" TIMESTAMPTZ(6) NOT NULL,
  "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "read_at" TIMESTAMPTZ(6)
);
CREATE INDEX "whatsapp_received_messages_received_at_id_idx"
  ON "public"."whatsapp_received_messages" ("received_at", "id");
CREATE INDEX "whatsapp_received_messages_read_at_received_at_idx"
  ON "public"."whatsapp_received_messages" ("read_at", "received_at");
