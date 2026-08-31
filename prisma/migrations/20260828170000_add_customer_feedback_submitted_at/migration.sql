ALTER TABLE "customer_feedback" ADD COLUMN "submitted_at" TIMESTAMPTZ(6);
CREATE INDEX "ix_customer_feedback_submitted_at" ON "customer_feedback"("submitted_at");
