-- Run this before syncing source data with: npm run db:sync-inquiry-sources
-- Existing inquiry.website values are intentionally preserved as historic raw text.

CREATE TABLE IF NOT EXISTS inquiry_source_master (
  source_id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  requires_detail BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  reporting_sort INTEGER NOT NULL DEFAULT 999,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inquiry_source_master_active_sort
  ON inquiry_source_master (is_active, reporting_sort);

ALTER TABLE inquiry ADD COLUMN IF NOT EXISTS source_id INTEGER NULL;
ALTER TABLE inquiry ADD COLUMN IF NOT EXISTS source_detail TEXT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_inquiry_source_id') THEN
    ALTER TABLE inquiry
      ADD CONSTRAINT fk_inquiry_source_id
      FOREIGN KEY (source_id) REFERENCES inquiry_source_master(source_id)
      ON DELETE NO ACTION;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_inquiry_source_id ON inquiry (source_id);

CREATE TABLE IF NOT EXISTS legacy_inquiry_source_mapping (
  legacy_inquiry_source_mapping_id SERIAL PRIMARY KEY,
  legacy_source TEXT NOT NULL,
  normalized_source TEXT NOT NULL UNIQUE,
  source_id INTEGER NOT NULL REFERENCES inquiry_source_master(source_id) ON DELETE NO ACTION,
  mapping_status TEXT NOT NULL DEFAULT 'approved',
  review_note TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legacy_inquiry_source_mapping_source_id
  ON legacy_inquiry_source_mapping (source_id);
