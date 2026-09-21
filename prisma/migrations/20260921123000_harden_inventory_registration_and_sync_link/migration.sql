-- Inventory actions store registration numbers in normalized uppercase form,
-- but historical data can contain spaces or mixed case. Enforce the same
-- normalization at the database boundary while retaining nullable and short
-- legacy values.
DROP INDEX IF EXISTS "idx_inventory_management_registration_no_uq";

CREATE UNIQUE INDEX "idx_inventory_management_registration_normalized_uq"
ON "public"."inventory_management" (regexp_replace(upper("registration_no"), '[[:space:]]+', '', 'g'))
WHERE "registration_no" IS NOT NULL
  AND length(regexp_replace("registration_no", '[[:space:]]+', '', 'g')) > 5;

-- Inventory synchronization is a durable state relationship. Other link
-- types retain their event-history semantics, so only this workflow gets a
-- partial uniqueness constraint.
CREATE UNIQUE INDEX "idx_inquiry_inventory_links_inventory_sync_uq"
ON "public"."inquiry_inventory_links" ("inquiry_id", "inventory_id")
WHERE "link_type" = 'inventory-sync';
