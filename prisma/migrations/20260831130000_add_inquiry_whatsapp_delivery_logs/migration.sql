ALTER TABLE "vehicle_email_links"
  ADD COLUMN IF NOT EXISTS "channel" TEXT NOT NULL DEFAULT 'Email';

CREATE TABLE IF NOT EXISTS "whatsapp_delivery_log" (
  "whatsapp_delivery_log_id" SERIAL NOT NULL,
  "inquiry_id" INTEGER NOT NULL,
  "inventory_id" INTEGER NOT NULL,
  "recipient_mobile" TEXT NOT NULL,
  "recipient_name" TEXT,
  "template_name" TEXT NOT NULL,
  "template_language" TEXT NOT NULL,
  "vehicle_name" TEXT NOT NULL,
  "button_url_suffix" TEXT,
  "provider_message_id" TEXT,
  "status" TEXT NOT NULL,
  "error_message" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "attempted_at" TIMESTAMPTZ(6),
  CONSTRAINT "whatsapp_delivery_log_pkey" PRIMARY KEY ("whatsapp_delivery_log_id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_whatsapp_delivery_log_inquiry_inventory"
  ON "whatsapp_delivery_log"("inquiry_id", "inventory_id");
CREATE INDEX IF NOT EXISTS "ix_whatsapp_delivery_log_inquiry_created"
  ON "whatsapp_delivery_log"("inquiry_id", "created_at");
CREATE INDEX IF NOT EXISTS "ix_whatsapp_delivery_log_status_created"
  ON "whatsapp_delivery_log"("status", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_whatsapp_delivery_log_inquiry') THEN
    ALTER TABLE "whatsapp_delivery_log"
      ADD CONSTRAINT "fk_whatsapp_delivery_log_inquiry"
      FOREIGN KEY ("inquiry_id") REFERENCES "inquiry"("inquiry_id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_whatsapp_delivery_log_inventory') THEN
    ALTER TABLE "whatsapp_delivery_log"
      ADD CONSTRAINT "fk_whatsapp_delivery_log_inventory"
      FOREIGN KEY ("inventory_id") REFERENCES "inventory_management"("inventory_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
  END IF;
END $$;
