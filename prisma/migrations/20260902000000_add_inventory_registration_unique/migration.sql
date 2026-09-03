-- Registration numbers are normalized by the Inventory actions (uppercase,
-- whitespace removed). Keep the legacy short-value exception and nullable
-- historical rows, but make valid registration numbers concurrency-safe.
CREATE UNIQUE INDEX "idx_inventory_management_registration_no_uq"
ON "public"."inventory_management"("registration_no")
WHERE "registration_no" IS NOT NULL
  AND length("registration_no") > 5;
