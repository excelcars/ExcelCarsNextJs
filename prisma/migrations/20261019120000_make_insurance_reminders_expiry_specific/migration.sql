ALTER TABLE "public"."insurance_reminder_delivery"
  ADD COLUMN "scheduled_expiry_date" TIMESTAMPTZ(6);

UPDATE "public"."insurance_reminder_delivery" AS delivery
SET "scheduled_expiry_date" = insurance."expiry_date"
FROM "public"."insurance_main" AS insurance
WHERE insurance."insurance_main_id" = delivery."insurance_main_id";

ALTER TABLE "public"."insurance_reminder_delivery"
  ALTER COLUMN "scheduled_expiry_date" SET NOT NULL;

DROP INDEX "public"."uq_insurance_reminder_delivery_schedule";

CREATE UNIQUE INDEX "uq_insurance_reminder_delivery_schedule"
  ON "public"."insurance_reminder_delivery" ("insurance_main_id", "recipient_key", "channel", "scheduled_expiry_date", "days_before_expiry");
