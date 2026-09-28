CREATE TABLE IF NOT EXISTS "inventory_documents" (
  "inventory_document_id" SERIAL NOT NULL,
  "inventory_id" INTEGER NOT NULL,
  "document_type" TEXT,
  "original_name" TEXT NOT NULL,
  "storage_path" TEXT NOT NULL,
  "content_type" TEXT NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_documents_pkey" PRIMARY KEY ("inventory_document_id")
);

CREATE INDEX IF NOT EXISTS "ix_inventory_documents_inventory"
  ON "inventory_documents"("inventory_id", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_inventory_documents_inventory') THEN
    ALTER TABLE "inventory_documents"
      ADD CONSTRAINT "fk_inventory_documents_inventory"
      FOREIGN KEY ("inventory_id") REFERENCES "inventory_management"("inventory_id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;
