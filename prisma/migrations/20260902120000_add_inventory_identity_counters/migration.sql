CREATE SEQUENCE "public"."inventory_number_seq"
    AS BIGINT
    INCREMENT BY 1
    MINVALUE 1
    START WITH 1
    CACHE 1;

DO $$
DECLARE
    highest_inventory_number BIGINT;
BEGIN
    SELECT COALESCE(
        MAX(substring("inventory_number" FROM '^Inventory/([0-9]+)$')::BIGINT),
        0
    )
    INTO highest_inventory_number
    FROM "public"."inventory_management"
    WHERE "inventory_number" ~ '^Inventory/[0-9]+$';

    IF highest_inventory_number > 0 THEN
        PERFORM setval('public.inventory_number_seq', highest_inventory_number, true);
    ELSE
        PERFORM setval('public.inventory_number_seq', 1, false);
    END IF;
END $$;

CREATE TABLE "public"."inventory_sku_counters" (
    "make_key" TEXT NOT NULL,
    "model_key" TEXT NOT NULL,
    "colour_key" TEXT NOT NULL,
    "last_value" INTEGER NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idx_inventory_sku_counters_pk"
        PRIMARY KEY ("make_key", "model_key", "colour_key")
);

WITH existing_skus AS (
    SELECT
        lower(btrim(COALESCE(inventory."make_legacy", make_master."make"))) AS "make_key",
        lower(btrim(COALESCE(inventory."model_legacy", model_master."model"))) AS "model_key",
        lower(btrim(inventory."colour")) AS "colour_key",
        substring(inventory."sku" FROM '([0-9]+)$')::INTEGER AS "sku_number"
    FROM "public"."inventory_management" AS inventory
    LEFT JOIN "public"."car_variant_master" AS variant_master
        ON variant_master."pk_variant_id" = inventory."fk_variant_id"
    LEFT JOIN "public"."car_make_master" AS make_master
        ON make_master."pk_make_id" = variant_master."fk_make_id"
    LEFT JOIN "public"."car_model_master" AS model_master
        ON model_master."pk_model_id" = variant_master."fk_model_id"
    WHERE NULLIF(btrim(COALESCE(inventory."make_legacy", make_master."make")), '') IS NOT NULL
      AND NULLIF(btrim(COALESCE(inventory."model_legacy", model_master."model")), '') IS NOT NULL
      AND NULLIF(btrim(inventory."colour"), '') IS NOT NULL
      AND inventory."sku" ~ '[0-9]+$'
)
INSERT INTO "public"."inventory_sku_counters" (
    "make_key",
    "model_key",
    "colour_key",
    "last_value",
    "updated_at"
)
SELECT
    "make_key",
    "model_key",
    "colour_key",
    MAX("sku_number"),
    CURRENT_TIMESTAMP
FROM existing_skus
GROUP BY
    "make_key",
    "model_key",
    "colour_key";
