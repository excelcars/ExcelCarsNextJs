CREATE TABLE IF NOT EXISTS "whatsapp_message_draft" (
  "whatsapp_message_draft_id" SERIAL NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "whatsapp_message_draft_pkey" PRIMARY KEY ("whatsapp_message_draft_id")
);
