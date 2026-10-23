-- Converges databases created through earlier manual schema changes.
-- All statements are idempotent so UAT remains unchanged if this migration is later deployed there.

DROP INDEX IF EXISTS "ux_inventory_regno_active";
CREATE UNIQUE INDEX IF NOT EXISTS "idx_inventory_management_registration_normalized_uq"
  ON "inventory_management" (
    regexp_replace(upper("registration_no"), '[[:space:]]+', '', 'g')
  )
  WHERE "registration_no" IS NOT NULL
    AND (
      upper(regexp_replace("registration_no", '[[:space:]]+', '', 'g')) ~ '^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{1,4}$'
      OR upper(regexp_replace("registration_no", '[[:space:]]+', '', 'g')) ~ '^[0-9]{2}BH[0-9]{4}[A-Z]{1,2}$'
    );

ALTER TABLE "rto_agent" DROP CONSTRAINT IF EXISTS "ck_rtoagent_paymentstatus";
ALTER TABLE "rto_agent"
  ADD CONSTRAINT "ck_rtoagent_paymentstatus"
  CHECK ("payment_status" IN ('Pending', 'Partially Paid', 'Fully Paid') OR "payment_status" IS NULL);

ALTER TABLE "rto_payment_details" DROP CONSTRAINT IF EXISTS "ck_rtopay_paymentstatus";
ALTER TABLE "rto_payment_details"
  ADD CONSTRAINT "ck_rtopay_paymentstatus"
  CHECK ("payment_status" IN ('Pending', 'Partially Paid', 'Fully Paid') OR "payment_status" IS NULL);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'inventory_videos_source_type_check'
      AND conrelid = 'inventory_videos'::regclass
  ) THEN
    ALTER TABLE "inventory_videos"
      ADD CONSTRAINT "inventory_videos_source_type_check"
      CHECK ("source_type" IN ('YOUTUBE', 'UPLOAD'));
  END IF;
END $$;

DROP INDEX IF EXISTS "ix_user_notifications_recipient_active";
CREATE INDEX "ix_user_notifications_recipient_active"
  ON "user_notifications" ("recipient_user_id", "archived_at", "created_at" DESC);

ALTER TABLE "user_notifications"
  ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "inquiry_activity_log"
  ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "user_notifications" DROP CONSTRAINT IF EXISTS "user_notifications_recipient_user_id_fkey";
ALTER TABLE "user_notifications" DROP CONSTRAINT IF EXISTS "fk_user_notifications_recipient";
ALTER TABLE "user_notifications"
  ADD CONSTRAINT "fk_user_notifications_recipient"
  FOREIGN KEY ("recipient_user_id") REFERENCES "user_table"("user_id") ON DELETE CASCADE;
