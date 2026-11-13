CREATE TABLE "partner_vehicle_mappings" (
    "id" SERIAL NOT NULL,
    "partner" TEXT NOT NULL,
    "description_key" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "variant_id" INTEGER NOT NULL,
    "confirmed_by" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "partner_vehicle_mappings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "partner_vehicle_mappings_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "car_variant_master"("pk_variant_id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "partner_vehicle_mappings_partner_description_key_key" ON "partner_vehicle_mappings"("partner", "description_key");
CREATE INDEX "partner_vehicle_mappings_variant_id_idx" ON "partner_vehicle_mappings"("variant_id");
