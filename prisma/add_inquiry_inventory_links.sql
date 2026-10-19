CREATE TABLE IF NOT EXISTS inquiry_inventory_links (
  inquiry_inventory_link_id SERIAL PRIMARY KEY,
  inquiry_id INTEGER NOT NULL REFERENCES inquiry(inquiry_id) ON DELETE CASCADE,
  inventory_id INTEGER NOT NULL REFERENCES inventory_management(inventory_id) ON DELETE NO ACTION,
  link_type TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by INTEGER NULL REFERENCES user_table(user_id) ON DELETE NO ACTION,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by INTEGER NULL REFERENCES user_table(user_id) ON DELETE NO ACTION
);

CREATE INDEX IF NOT EXISTS idx_inquiry_inventory_links_inquiry_id
  ON inquiry_inventory_links (inquiry_id);

CREATE INDEX IF NOT EXISTS idx_inquiry_inventory_links_inventory_id
  ON inquiry_inventory_links (inventory_id);

CREATE INDEX IF NOT EXISTS idx_inquiry_inventory_links_lookup
  ON inquiry_inventory_links (inquiry_id, inventory_id, link_type);
