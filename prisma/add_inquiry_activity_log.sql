CREATE TABLE IF NOT EXISTS inquiry_activity_log (
  inquiry_activity_log_id SERIAL PRIMARY KEY,
  inquiry_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  event_label TEXT NULL,
  event_detail TEXT NULL,
  actor_user_id INTEGER NULL,
  actor_user_name TEXT NULL,
  inventory_id INTEGER NULL,
  followup_id INTEGER NULL,
  inquiry_car_details_id INTEGER NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_inquiry_activity_log_inquiry_id
  ON inquiry_activity_log (inquiry_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ix_inquiry_activity_log_actor_user_id
  ON inquiry_activity_log (actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ix_inquiry_activity_log_inventory_id
  ON inquiry_activity_log (inventory_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ix_inquiry_activity_log_followup_id
  ON inquiry_activity_log (followup_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ix_inquiry_activity_log_event_type
  ON inquiry_activity_log (event_type, created_at DESC);
