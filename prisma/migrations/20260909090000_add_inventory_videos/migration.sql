CREATE TABLE IF NOT EXISTS "inventory_videos" (
  "inventory_video_id" SERIAL NOT NULL,
  "fk_inventory_id" INTEGER NOT NULL,
  "source_type" TEXT NOT NULL,
  "youtube_url" TEXT,
  "youtube_video_id" TEXT,
  "storage_path" TEXT,
  "file_name" TEXT,
  "is_featured" BOOLEAN NOT NULL DEFAULT false,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_videos_pkey" PRIMARY KEY ("inventory_video_id"),
  CONSTRAINT "inventory_videos_source_type_check" CHECK ("source_type" IN ('YOUTUBE', 'UPLOAD'))
);

CREATE INDEX IF NOT EXISTS "ix_inventory_videos_inventory" ON "inventory_videos"("fk_inventory_id");
CREATE INDEX IF NOT EXISTS "ix_inventory_videos_featured" ON "inventory_videos"("fk_inventory_id", "is_featured");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_inventory_videos_inventory') THEN
    ALTER TABLE "inventory_videos"
      ADD CONSTRAINT "fk_inventory_videos_inventory"
      FOREIGN KEY ("fk_inventory_id") REFERENCES "inventory_management"("inventory_id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;
