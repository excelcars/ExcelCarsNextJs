ALTER TABLE "customer_feedback" ADD COLUMN IF NOT EXISTS "submitted_at" TIMESTAMPTZ(6);
CREATE INDEX IF NOT EXISTS "ix_customer_feedback_submitted_at" ON "customer_feedback"("submitted_at");
