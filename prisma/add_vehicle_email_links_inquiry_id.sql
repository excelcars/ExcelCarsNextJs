ALTER TABLE "vehicle_email_links"
ADD COLUMN IF NOT EXISTS "inquiry_id" integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_vehicle_email_links_inquiry'
  ) THEN
    ALTER TABLE "vehicle_email_links"
    ADD CONSTRAINT "fk_vehicle_email_links_inquiry"
    FOREIGN KEY ("inquiry_id")
    REFERENCES "inquiry"("inquiry_id")
    ON DELETE SET NULL
    ON UPDATE NO ACTION;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_vehicle_email_links_inquiry_id"
ON "vehicle_email_links" ("inquiry_id");
