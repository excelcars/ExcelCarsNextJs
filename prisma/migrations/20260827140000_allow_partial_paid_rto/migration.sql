-- Keep the RTO payment status values consistent with the application UI.
ALTER TABLE "rto_agent"
  DROP CONSTRAINT IF EXISTS "ck_rtoagent_paymentstatus";

ALTER TABLE "rto_agent"
  ADD CONSTRAINT "ck_rtoagent_paymentstatus"
  CHECK (payment_status = ANY (ARRAY['Pending'::text, 'Partially Paid'::text, 'Fully Paid'::text]) OR payment_status IS NULL);

ALTER TABLE "rto_payment_details"
  DROP CONSTRAINT IF EXISTS "ck_rtopay_paymentstatus";

ALTER TABLE "rto_payment_details"
  ADD CONSTRAINT "ck_rtopay_paymentstatus"
  CHECK (payment_status = ANY (ARRAY['Pending'::text, 'Partially Paid'::text, 'Fully Paid'::text]) OR payment_status IS NULL);
