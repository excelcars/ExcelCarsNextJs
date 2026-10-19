ALTER TABLE "inquiry"
  ADD COLUMN IF NOT EXISTS "assigned_to" INTEGER;

CREATE INDEX IF NOT EXISTS "idx_16506_ix_inquiry_assigned_to"
  ON "inquiry" ("assigned_to");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_inquiry_assigned_to_user'
      AND conrelid = 'inquiry'::regclass
  ) THEN
    ALTER TABLE "inquiry"
      ADD CONSTRAINT "fk_inquiry_assigned_to_user"
      FOREIGN KEY ("assigned_to") REFERENCES "user_table"("user_id")
      ON DELETE NO ACTION
      ON UPDATE NO ACTION;
  END IF;
END $$;
