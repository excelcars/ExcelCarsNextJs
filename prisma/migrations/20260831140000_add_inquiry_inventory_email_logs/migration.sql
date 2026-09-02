CREATE TABLE IF NOT EXISTS "inquiry_inventory_email_log" (
  "inquiry_inventory_email_log_id" SERIAL NOT NULL,
  "inquiry_id" INTEGER NOT NULL,
  "inventory_id" INTEGER NOT NULL,
  "recipient_email" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "error_message" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "attempted_at" TIMESTAMPTZ(6),
  CONSTRAINT "inquiry_inventory_email_log_pkey" PRIMARY KEY ("inquiry_inventory_email_log_id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_inquiry_inventory_email_log_inquiry_inventory"
  ON "inquiry_inventory_email_log"("inquiry_id", "inventory_id");
CREATE INDEX IF NOT EXISTS "ix_inquiry_inventory_email_log_inquiry_created"
  ON "inquiry_inventory_email_log"("inquiry_id", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_inquiry_inventory_email_log_inquiry') THEN
    ALTER TABLE "inquiry_inventory_email_log"
      ADD CONSTRAINT "fk_inquiry_inventory_email_log_inquiry"
      FOREIGN KEY ("inquiry_id") REFERENCES "inquiry"("inquiry_id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_inquiry_inventory_email_log_inventory') THEN
    ALTER TABLE "inquiry_inventory_email_log"
      ADD CONSTRAINT "fk_inquiry_inventory_email_log_inventory"
      FOREIGN KEY ("inventory_id") REFERENCES "inventory_management"("inventory_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
  END IF;
END $$;
