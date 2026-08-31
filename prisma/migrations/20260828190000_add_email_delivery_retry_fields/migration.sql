ALTER TABLE "email_delivery_log" ADD COLUMN "retry_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "email_delivery_log" ADD COLUMN "next_retry_at" TIMESTAMPTZ(6);
ALTER TABLE "email_delivery_log" ADD COLUMN "email_subject" TEXT NOT NULL DEFAULT '';
ALTER TABLE "email_delivery_log" ADD COLUMN "email_html" TEXT NOT NULL DEFAULT '';
ALTER TABLE "email_delivery_log" ADD COLUMN "attachment_json" TEXT;
CREATE INDEX "ix_email_delivery_log_retry" ON "email_delivery_log"("status", "next_retry_at");
