-- Reconcile schema changes that were previously applied directly to existing databases.
-- This migration is idempotent so an existing database can safely baseline it.

DROP INDEX IF EXISTS "public"."ix_customer_feedback_submitted_at";
DROP INDEX IF EXISTS "public"."ix_email_delivery_log_retry";

ALTER TABLE "public"."email_delivery_log"
    ALTER COLUMN "email_subject" DROP DEFAULT,
    ALTER COLUMN "email_html" DROP DEFAULT;

ALTER TABLE "public"."followup_inquiry"
    ADD COLUMN IF NOT EXISTS "contact_outcome" TEXT;

CREATE TABLE IF NOT EXISTS "public"."inquiry_source_master" (
    "source_id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "requires_detail" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "reporting_sort" INTEGER NOT NULL DEFAULT 999,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pk_inquiry_source_master" PRIMARY KEY ("source_id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_inquiry_source_master_code"
    ON "public"."inquiry_source_master"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_inquiry_source_master_display_name"
    ON "public"."inquiry_source_master"("display_name");
CREATE INDEX IF NOT EXISTS "idx_inquiry_source_master_active_sort"
    ON "public"."inquiry_source_master"("is_active", "reporting_sort");

ALTER TABLE "public"."inquiry"
    ADD COLUMN IF NOT EXISTS "source_id" INTEGER,
    ADD COLUMN IF NOT EXISTS "source_detail" TEXT;

CREATE INDEX IF NOT EXISTS "idx_inquiry_source_id"
    ON "public"."inquiry"("source_id");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_inquiry_source_id') THEN
        ALTER TABLE "public"."inquiry"
            ADD CONSTRAINT "fk_inquiry_source_id"
            FOREIGN KEY ("source_id") REFERENCES "public"."inquiry_source_master"("source_id")
            ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "public"."legacy_inquiry_source_mapping" (
    "legacy_inquiry_source_mapping_id" SERIAL NOT NULL,
    "legacy_source" TEXT NOT NULL,
    "normalized_source" TEXT NOT NULL,
    "source_id" INTEGER NOT NULL,
    "mapping_status" TEXT NOT NULL DEFAULT 'approved',
    "review_note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pk_legacy_inquiry_source_mapping" PRIMARY KEY ("legacy_inquiry_source_mapping_id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_legacy_inquiry_source_mapping_normalized"
    ON "public"."legacy_inquiry_source_mapping"("normalized_source");
CREATE INDEX IF NOT EXISTS "idx_legacy_inquiry_source_mapping_source_id"
    ON "public"."legacy_inquiry_source_mapping"("source_id");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_legacy_inquiry_source_mapping_source') THEN
        ALTER TABLE "public"."legacy_inquiry_source_mapping"
            ADD CONSTRAINT "fk_legacy_inquiry_source_mapping_source"
            FOREIGN KEY ("source_id") REFERENCES "public"."inquiry_source_master"("source_id")
            ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "public"."inquiry_email_history" (
    "inquiry_email_history_id" SERIAL NOT NULL,
    "inquiry_id" INTEGER NOT NULL,
    "inventory_id" INTEGER,
    "email_type" TEXT NOT NULL,
    "recipient_email" TEXT NOT NULL,
    "recipient_name" TEXT,
    "email_subject" TEXT NOT NULL,
    "delivery_status" TEXT NOT NULL,
    "error_message" TEXT,
    "sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempted_by" INTEGER,
    CONSTRAINT "idx_inquiry_email_history_pk" PRIMARY KEY ("inquiry_email_history_id")
);

CREATE INDEX IF NOT EXISTS "idx_inquiry_email_history_inquiry_created_at"
    ON "public"."inquiry_email_history"("inquiry_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_inquiry_email_history_inventory_id"
    ON "public"."inquiry_email_history"("inventory_id");
CREATE INDEX IF NOT EXISTS "idx_inquiry_email_history_attempted_by_created_at"
    ON "public"."inquiry_email_history"("attempted_by", "created_at");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_inquiry_email_history_inquiry') THEN
        ALTER TABLE "public"."inquiry_email_history"
            ADD CONSTRAINT "fk_inquiry_email_history_inquiry"
            FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiry"("inquiry_id")
            ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_inquiry_email_history_inventory') THEN
        ALTER TABLE "public"."inquiry_email_history"
            ADD CONSTRAINT "fk_inquiry_email_history_inventory"
            FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory_management"("inventory_id")
            ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_inquiry_email_history_attempted_by_user') THEN
        ALTER TABLE "public"."inquiry_email_history"
            ADD CONSTRAINT "fk_inquiry_email_history_attempted_by_user"
            FOREIGN KEY ("attempted_by") REFERENCES "public"."user_table"("user_id")
            ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "uq_user_table_emp_id"
    ON "public"."user_table"("emp_id");

ALTER TABLE "public"."vehicle_email_links"
    ADD COLUMN IF NOT EXISTS "inquiry_id" INTEGER;

CREATE INDEX IF NOT EXISTS "idx_vehicle_email_links_inquiry_id"
    ON "public"."vehicle_email_links"("inquiry_id");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_vehicle_email_links_inquiry') THEN
        ALTER TABLE "public"."vehicle_email_links"
            ADD CONSTRAINT "fk_vehicle_email_links_inquiry"
            FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiry"("inquiry_id")
            ON DELETE SET NULL ON UPDATE NO ACTION;
    END IF;
END $$;
