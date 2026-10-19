-- Short registration fragments (for example MH or MH02) are stock labels,
-- not complete registration numbers. They must be reusable. The normalized
-- unique index introduced previously continues to protect full numbers.
DROP INDEX IF EXISTS "public"."ux_inventory_regno_active";
