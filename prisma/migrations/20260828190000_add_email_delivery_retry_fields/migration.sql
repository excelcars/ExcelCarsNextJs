ALTER TABLE "email_delivery_log" ADD COLUMN IF NOT EXISTS "retry_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "email_delivery_log" ADD COLUMN IF NOT EXISTS "next_retry_at" TIMESTAMPTZ(6);
ALTER TABLE "email_delivery_log" ADD COLUMN IF NOT EXISTS "email_subject" TEXT NOT NULL DEFAULT '';
ALTER TABLE "email_delivery_log" ADD COLUMN IF NOT EXISTS "email_html" TEXT NOT NULL DEFAULT '';
ALTER TABLE "email_delivery_log" ADD COLUMN IF NOT EXISTS "attachment_json" TEXT;
CREATE INDEX IF NOT EXISTS "ix_email_delivery_log_retry" ON "email_delivery_log"("status", "next_retry_at");
