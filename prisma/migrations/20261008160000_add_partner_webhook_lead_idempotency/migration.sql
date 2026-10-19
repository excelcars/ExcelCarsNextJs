CREATE TABLE IF NOT EXISTS "public"."partner_webhook_leads" (
  "partner_webhook_lead_id" SERIAL NOT NULL,
  "partner" TEXT NOT NULL,
  "external_lead_id" TEXT NOT NULL,
  "source_id" INTEGER NOT NULL,
  "inquiry_id" INTEGER,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "partner_webhook_leads_pkey" PRIMARY KEY ("partner_webhook_lead_id"),
  CONSTRAINT "uq_partner_webhook_lead_partner_external" UNIQUE ("partner", "external_lead_id"),
  CONSTRAINT "uq_partner_webhook_lead_inquiry" UNIQUE ("inquiry_id")
);

CREATE INDEX IF NOT EXISTS "idx_partner_webhook_lead_source" ON "public"."partner_webhook_leads"("source_id");
