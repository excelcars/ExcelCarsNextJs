-- Supports the dashboard, follow-up list, and daily notification sync.
CREATE INDEX IF NOT EXISTS "idx_inquiry_status_followup_date"
  ON "public"."inquiry"("status", "follow_up_date");

-- Supports date-scoped lead totals, reports, and inquiry searches.
CREATE INDEX IF NOT EXISTS "idx_inquiry_date_of_inquiry"
  ON "public"."inquiry"("date_of_inquiry");
