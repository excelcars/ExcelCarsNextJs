CREATE TABLE "public"."whatsapp_message_statuses" (
  "id" SERIAL PRIMARY KEY,
  "provider_message_id" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "occurred_at" TIMESTAMPTZ(6) NOT NULL,
  "error_message" TEXT
);
CREATE UNIQUE INDEX "uq_whatsapp_message_status_event" ON "public"."whatsapp_message_statuses" ("provider_message_id", "status", "occurred_at");
CREATE INDEX "ix_whatsapp_message_status_provider_time" ON "public"."whatsapp_message_statuses" ("provider_message_id", "occurred_at");
