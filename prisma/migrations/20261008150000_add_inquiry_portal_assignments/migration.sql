CREATE TABLE IF NOT EXISTS "public"."inquiry_portal_assignments" (
  "inquiry_portal_assignment_id" SERIAL NOT NULL,
  "source_id" INTEGER NOT NULL,
  "assigned_to_user_id" INTEGER NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" INTEGER,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by" INTEGER,
  CONSTRAINT "inquiry_portal_assignments_pkey" PRIMARY KEY ("inquiry_portal_assignment_id"),
  CONSTRAINT "uq_inquiry_portal_assignment_source" UNIQUE ("source_id")
);

CREATE INDEX IF NOT EXISTS "idx_inquiry_portal_assignment_assignee" ON "public"."inquiry_portal_assignments"("assigned_to_user_id");
CREATE INDEX IF NOT EXISTS "idx_inquiry_portal_assignment_active" ON "public"."inquiry_portal_assignments"("is_active");

DO $$ BEGIN
  ALTER TABLE "public"."inquiry_portal_assignments" ADD CONSTRAINT "fk_inquiry_portal_assignment_source" FOREIGN KEY ("source_id") REFERENCES "public"."inquiry_source_master"("source_id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "public"."inquiry_portal_assignments" ADD CONSTRAINT "fk_inquiry_portal_assignment_assignee" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "public"."inquiry_portal_assignments" ADD CONSTRAINT "fk_inquiry_portal_assignment_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "public"."inquiry_portal_assignments" ADD CONSTRAINT "fk_inquiry_portal_assignment_updated_by" FOREIGN KEY ("updated_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
