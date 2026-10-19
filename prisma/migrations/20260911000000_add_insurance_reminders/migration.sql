CREATE TABLE "public"."insurance_reminder_delivery" (
  "insurance_reminder_delivery_id" SERIAL NOT NULL,
  "insurance_main_id" INTEGER NOT NULL,
  "recipient_type" TEXT NOT NULL,
  "recipient_name" TEXT,
  "recipient_key" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "days_before_expiry" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "recipient_address" TEXT NOT NULL,
  "email_subject" TEXT,
  "email_html" TEXT,
  "whatsapp_message" TEXT,
  "error_message" TEXT,
  "provider_message_id" TEXT,
  "retry_count" INTEGER NOT NULL DEFAULT 0,
  "next_retry_at" TIMESTAMPTZ(6),
  "attempted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pk_insurance_reminder_delivery" PRIMARY KEY ("insurance_reminder_delivery_id"),
  CONSTRAINT "fk_insurance_reminder_delivery_insurance" FOREIGN KEY ("insurance_main_id") REFERENCES "public"."insurance_main"("insurance_main_id") ON DELETE CASCADE ON UPDATE NO ACTION
);
CREATE UNIQUE INDEX "uq_insurance_reminder_delivery_schedule" ON "public"."insurance_reminder_delivery"("insurance_main_id", "recipient_key", "channel", "days_before_expiry");
CREATE INDEX "ix_insurance_reminder_delivery_status_attempted" ON "public"."insurance_reminder_delivery"("status", "attempted_at");
CREATE INDEX "ix_insurance_reminder_delivery_insurance_attempted" ON "public"."insurance_reminder_delivery"("insurance_main_id", "attempted_at");

CREATE TABLE "public"."insurance_reminder_attempt" (
  "insurance_reminder_attempt_id" SERIAL NOT NULL,
  "insurance_reminder_delivery_id" INTEGER NOT NULL,
  "attempt_number" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "error_message" TEXT,
  "provider_message_id" TEXT,
  "attempted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pk_insurance_reminder_attempt" PRIMARY KEY ("insurance_reminder_attempt_id"),
  CONSTRAINT "fk_insurance_reminder_attempt_delivery" FOREIGN KEY ("insurance_reminder_delivery_id") REFERENCES "public"."insurance_reminder_delivery"("insurance_reminder_delivery_id") ON DELETE CASCADE ON UPDATE NO ACTION
);
CREATE INDEX "ix_insurance_reminder_attempt_delivery_attempted" ON "public"."insurance_reminder_attempt"("insurance_reminder_delivery_id", "attempted_at");

INSERT INTO "public"."message_template" ("message_type", "message_subject", "message_body", "created_date", "updated_date")
SELECT 'Email', 'Insurance renewal reminder — policy expiry approaching',
  '<p>Hello {{customerName}},</p><p>Your vehicle insurance for <strong>{{registrationNo}}</strong> expires on <strong>{{expiryDate}}</strong>.</p><p>Please contact {{agentName}} at {{agentMobile}} to renew your policy.</p><p>Regards,<br>Excel Cars</p>', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "public"."message_template" WHERE lower("message_subject") = lower('Insurance renewal reminder — policy expiry approaching'));
