-- The inquiry UI records an initial Open state in followup_inquiry history.
-- Keep the database constraint aligned with the application status contract.
ALTER TABLE "public"."followup_inquiry"
    DROP CONSTRAINT IF EXISTS "ck_followup_status";

ALTER TABLE "public"."followup_inquiry"
    ADD CONSTRAINT "ck_followup_status"
    CHECK (
        "followup_status" = ANY (ARRAY['Open'::text, 'FollowUp'::text, 'Closed'::text])
        OR "followup_status" IS NULL
    );
