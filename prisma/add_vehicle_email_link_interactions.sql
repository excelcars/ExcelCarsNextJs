CREATE TABLE IF NOT EXISTS "vehicle_email_link_interactions" (
  "vehicle_email_link_interaction_id" SERIAL PRIMARY KEY,
  "vehicle_email_link_id" INTEGER NOT NULL,
  "interaction_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "interaction_type" TEXT NOT NULL,
  "interaction_label" TEXT NULL,
  "user_agent" TEXT NULL,
  "ip_address" TEXT NULL,
  "referrer" TEXT NULL,
  CONSTRAINT "fk_vehicle_email_link_interactions_link"
    FOREIGN KEY ("vehicle_email_link_id")
    REFERENCES "vehicle_email_links" ("vehicle_email_link_id")
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_vehicle_email_link_interactions_link_id"
  ON "vehicle_email_link_interactions" ("vehicle_email_link_id");

CREATE INDEX IF NOT EXISTS "idx_vehicle_email_link_interactions_type"
  ON "vehicle_email_link_interactions" ("interaction_type");
