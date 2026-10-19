-- A vehicle can have renewed policies. Prevent duplicate policy records only
-- when normalized registration and expiry date match.
CREATE UNIQUE INDEX "idx_insurance_main_registration_expiry_uq"
ON "public"."insurance_main" (regexp_replace(upper("car_registration_no"), '[[:space:]]+', '', 'g'), "expiry_date")
WHERE "car_registration_no" IS NOT NULL
  AND "expiry_date" IS NOT NULL
  AND length(regexp_replace("car_registration_no", '[[:space:]]+', '', 'g')) > 5;
