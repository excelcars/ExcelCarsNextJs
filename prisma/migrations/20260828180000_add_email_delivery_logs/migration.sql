CREATE TABLE IF NOT EXISTS "email_delivery_log" (
    "delivery_log_id" SERIAL NOT NULL,
    "template_id" INTEGER NOT NULL,
    "recipient_email" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error_message" TEXT,
    "attachment_count" INTEGER NOT NULL DEFAULT 0,
    "attempted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempted_by" INTEGER NOT NULL,
    CONSTRAINT "email_delivery_log_pkey" PRIMARY KEY ("delivery_log_id")
);
CREATE INDEX IF NOT EXISTS "ix_email_delivery_log_template_attempted" ON "email_delivery_log"("template_id", "attempted_at");
CREATE INDEX IF NOT EXISTS "ix_email_delivery_log_user_attempted" ON "email_delivery_log"("attempted_by", "attempted_at");
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_email_delivery_log_template') THEN
    ALTER TABLE "email_delivery_log" ADD CONSTRAINT "fk_email_delivery_log_template" FOREIGN KEY ("template_id") REFERENCES "message_template"("type_id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_email_delivery_log_user') THEN
    ALTER TABLE "email_delivery_log" ADD CONSTRAINT "fk_email_delivery_log_user" FOREIGN KEY ("attempted_by") REFERENCES "user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
  END IF;
END $$;
