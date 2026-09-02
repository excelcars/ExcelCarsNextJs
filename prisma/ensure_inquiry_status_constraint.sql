ALTER TABLE inquiry
  DROP CONSTRAINT IF EXISTS ck_inquiry_status;

ALTER TABLE inquiry
  ADD CONSTRAINT ck_inquiry_status
  CHECK (
    status = ANY (ARRAY['Open'::text, 'FollowUp'::text, 'Closed'::text])
    OR status IS NULL
  );
