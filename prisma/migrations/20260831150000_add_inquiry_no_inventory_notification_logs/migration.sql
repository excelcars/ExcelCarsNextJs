CREATE TABLE IF NOT EXISTS "inquiry_no_inventory_notification_log" (
  "inquiry_no_inventory_notification_log_id" SERIAL NOT NULL,
  "inquiry_id" INTEGER NOT NULL,
  "channel" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "template_name" TEXT,
  "status" TEXT NOT NULL,
  "error_message" TEXT,
  "provider_message_id" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "attempted_at" TIMESTAMPTZ(6),
  CONSTRAINT "inquiry_no_inventory_notification_log_pkey" PRIMARY KEY ("inquiry_no_inventory_notification_log_id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_inquiry_no_inventory_notification_log_inquiry_channel"
  ON "inquiry_no_inventory_notification_log"("inquiry_id", "channel");
CREATE INDEX IF NOT EXISTS "ix_inquiry_no_inventory_notification_log_inquiry_created"
  ON "inquiry_no_inventory_notification_log"("inquiry_id", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_inquiry_no_inventory_notification_log_inquiry') THEN
    ALTER TABLE "inquiry_no_inventory_notification_log"
      ADD CONSTRAINT "fk_inquiry_no_inventory_notification_log_inquiry"
      FOREIGN KEY ("inquiry_id") REFERENCES "inquiry"("inquiry_id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;
