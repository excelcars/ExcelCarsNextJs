-- Stock labels such as MH and MH02 are not complete registration numbers and
-- may be shared. Protect only a complete vehicle registration number, after
-- applying the same whitespace and case normalization as the application.
DROP INDEX IF EXISTS "public"."ux_inventory_regno_active";
DROP INDEX IF EXISTS "public"."idx_inventory_management_registration_no_uq";
DROP INDEX IF EXISTS "public"."idx_inventory_management_registration_normalized_uq";

CREATE UNIQUE INDEX "idx_inventory_management_registration_normalized_uq"
ON "public"."inventory_management" (regexp_replace(upper("registration_no"), '[[:space:]]+', '', 'g'))
WHERE "registration_no" IS NOT NULL
  AND (
    upper(regexp_replace("registration_no", '[[:space:]]+', '', 'g')) ~ '^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{1,4}$'
    OR upper(regexp_replace("registration_no", '[[:space:]]+', '', 'g')) ~ '^[0-9]{2}BH[0-9]{4}[A-Z]{1,2}$'
  );
