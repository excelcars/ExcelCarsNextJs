CREATE TABLE IF NOT EXISTS "public"."partner_webhook_payloads" (
  "partner_webhook_payload_id" SERIAL NOT NULL,
  "partner" TEXT NOT NULL,
  "external_lead_id" TEXT,
  "raw_payload" JSONB NOT NULL,
  "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "inquiry_id" INTEGER,
  CONSTRAINT "partner_webhook_payloads_pkey" PRIMARY KEY ("partner_webhook_payload_id")
);

CREATE INDEX IF NOT EXISTS "idx_partner_webhook_payload_partner_external"
  ON "public"."partner_webhook_payloads"("partner", "external_lead_id");

CREATE INDEX IF NOT EXISTS "idx_partner_webhook_payload_inquiry"
  ON "public"."partner_webhook_payloads"("inquiry_id");

CREATE INDEX IF NOT EXISTS "idx_partner_webhook_payload_received_at"
  ON "public"."partner_webhook_payloads"("received_at");
