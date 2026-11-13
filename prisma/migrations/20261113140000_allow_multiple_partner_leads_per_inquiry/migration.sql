-- Each partner lead ID stays unique, but repeat contact submissions can share
-- their existing inquiry without deleting either lead or its original payload.
DROP INDEX "uq_partner_webhook_lead_inquiry";
CREATE INDEX "idx_partner_webhook_lead_inquiry" ON "partner_webhook_leads"("inquiry_id");
