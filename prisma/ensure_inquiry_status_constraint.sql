ALTER TABLE inquiry
  DROP CONSTRAINT IF EXISTS ck_inquiry_status;

ALTER TABLE inquiry
  ADD CONSTRAINT ck_inquiry_status
  CHECK (
    status = ANY (ARRAY['Open'::text, 'FollowUp'::text, 'Closed'::text])
    OR status IS NULL
  );

ALTER TABLE followup_inquiry
  DROP CONSTRAINT IF EXISTS ck_followup_status;

ALTER TABLE followup_inquiry
  ADD CONSTRAINT ck_followup_status
  CHECK (
    followup_status = ANY (ARRAY['Open'::text, 'FollowUp'::text, 'Closed'::text])
    OR followup_status IS NULL
  );
