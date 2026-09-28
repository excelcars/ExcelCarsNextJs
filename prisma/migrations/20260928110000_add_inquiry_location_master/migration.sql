CREATE TABLE IF NOT EXISTS "public"."inquiry_location_master" (
  "location_id" SERIAL NOT NULL,
  "display_name" TEXT NOT NULL,
  "region" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "reporting_sort" INTEGER NOT NULL DEFAULT 999,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inquiry_location_master_pkey" PRIMARY KEY ("location_id"),
  CONSTRAINT "uq_inquiry_location_master_display_name" UNIQUE ("display_name")
);

ALTER TABLE "public"."inquiry" ADD COLUMN IF NOT EXISTS "location_id" INTEGER;
CREATE INDEX IF NOT EXISTS "idx_inquiry_location_id" ON "public"."inquiry"("location_id");
CREATE INDEX IF NOT EXISTS "idx_inquiry_location_master_active_sort" ON "public"."inquiry_location_master"("is_active", "reporting_sort");
CREATE INDEX IF NOT EXISTS "idx_inquiry_location_master_region" ON "public"."inquiry_location_master"("region");

DO $$ BEGIN
  ALTER TABLE "public"."inquiry" ADD CONSTRAINT "fk_inquiry_location_id" FOREIGN KEY ("location_id") REFERENCES "public"."inquiry_location_master"("location_id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO "public"."inquiry_location_master" ("display_name", "region", "reporting_sort") VALUES
  ('Mumbai', 'Mumbai', 1),
  ('Navi Mumbai', 'Outside Mumbai', 2),
  ('Thane', 'Outside Mumbai', 3),
  ('Pune', 'Outside Mumbai', 4),
  ('Other Maharashtra', 'Outside Mumbai', 5),
  ('Outside Maharashtra', 'Outside Maharashtra', 6)
ON CONFLICT ("display_name") DO NOTHING;
