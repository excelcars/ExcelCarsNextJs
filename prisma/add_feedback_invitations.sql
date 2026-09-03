CREATE TABLE feedback_invitation (
  feedback_invitation_id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customer(cust_id),
  inventory_id INTEGER NOT NULL REFERENCES inventory_management(inventory_id),
  recipient_email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ,
  invalidated_at TIMESTAMPTZ,
  created_by INTEGER
);
CREATE INDEX ix_feedback_invitation_customer_inventory ON feedback_invitation(customer_id, inventory_id);
