CREATE TABLE IF NOT EXISTS role_access_audit (
  role_access_audit_id SERIAL PRIMARY KEY,
  role_id INTEGER NOT NULL,
  role_name_snapshot TEXT NULL,
  changed_by_user_id INTEGER NOT NULL,
  changed_by_user_name TEXT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  added_function_names_csv TEXT NULL,
  removed_function_names_csv TEXT NULL,
  before_function_names_csv TEXT NULL,
  after_function_names_csv TEXT NULL
);

CREATE INDEX IF NOT EXISTS ix_role_access_audit_role_id
  ON role_access_audit (role_id);

CREATE INDEX IF NOT EXISTS ix_role_access_audit_changed_by_user_id
  ON role_access_audit (changed_by_user_id);

CREATE INDEX IF NOT EXISTS ix_role_access_audit_changed_at
  ON role_access_audit (changed_at DESC);
