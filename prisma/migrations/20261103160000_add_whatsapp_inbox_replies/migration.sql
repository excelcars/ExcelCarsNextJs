CREATE TABLE "public"."whatsapp_inbox_replies" (
  "id" TEXT PRIMARY KEY,
  "received_message_id" INTEGER NOT NULL,
  "created_by" INTEGER NOT NULL,
  "body" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "provider_message_id" TEXT,
  "error_message" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "whatsapp_inbox_replies_received_message_id_fkey" FOREIGN KEY ("received_message_id")
    REFERENCES "public"."whatsapp_received_messages" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "whatsapp_inbox_replies_received_message_id_created_at_idx"
  ON "public"."whatsapp_inbox_replies" ("received_message_id", "created_at");
CREATE INDEX "ix_whatsapp_inbox_sender_sent"
  ON "public"."whatsapp_received_messages" ("phone_number_id", "sender_mobile", "sent_at");
