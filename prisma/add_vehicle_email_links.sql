CREATE TABLE "vehicle_email_links" (
  "vehicle_email_link_id" SERIAL PRIMARY KEY,
  "inventory_id" INTEGER NOT NULL,
  "customer_id" INTEGER NULL,
  "recipient_email" TEXT NOT NULL,
  "recipient_name" TEXT NULL,
  "token_hash" TEXT NOT NULL,
  "email_sent_at" TIMESTAMPTZ NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "expires_at" TIMESTAMPTZ NULL,
  "first_requested_at" TIMESTAMPTZ NULL,
  "first_human_view_at" TIMESTAMPTZ NULL,
  "last_requested_at" TIMESTAMPTZ NULL,
  "request_count" INTEGER NOT NULL DEFAULT 0,
  "human_view_count" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX "idx_vehicle_email_links_token_hash_uq"
  ON "vehicle_email_links" ("token_hash");

CREATE INDEX "idx_vehicle_email_links_inventory_id"
  ON "vehicle_email_links" ("inventory_id");

CREATE INDEX "idx_vehicle_email_links_customer_id"
  ON "vehicle_email_links" ("customer_id");

CREATE INDEX "idx_vehicle_email_links_recipient_email"
  ON "vehicle_email_links" ("recipient_email");

ALTER TABLE "vehicle_email_links"
  ADD CONSTRAINT "fk_vehicle_email_links_inventory"
  FOREIGN KEY ("inventory_id") REFERENCES "inventory_management" ("inventory_id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "vehicle_email_links"
  ADD CONSTRAINT "fk_vehicle_email_links_customer"
  FOREIGN KEY ("customer_id") REFERENCES "customer" ("cust_id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE TABLE "vehicle_email_link_visits" (
  "vehicle_email_link_visit_id" SERIAL PRIMARY KEY,
  "vehicle_email_link_id" INTEGER NOT NULL,
  "visited_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "visit_kind" TEXT NOT NULL,
  "user_agent" TEXT NULL,
  "ip_address" TEXT NULL,
  "referrer" TEXT NULL
);

CREATE INDEX "idx_vehicle_email_link_visits_link_id"
  ON "vehicle_email_link_visits" ("vehicle_email_link_id");

ALTER TABLE "vehicle_email_link_visits"
  ADD CONSTRAINT "fk_vehicle_email_link_visits_link"
  FOREIGN KEY ("vehicle_email_link_id") REFERENCES "vehicle_email_links" ("vehicle_email_link_id")
  ON DELETE CASCADE ON UPDATE NO ACTION;
