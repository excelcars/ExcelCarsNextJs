CREATE TABLE "public"."user_notifications" (
  "notification_id" SERIAL NOT NULL,
  "recipient_user_id" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "href" TEXT,
  "entity_type" TEXT,
  "entity_id" INTEGER,
  "dedupe_key" TEXT NOT NULL,
  "read_at" TIMESTAMPTZ(6),
  "archived_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("notification_id")
);

CREATE UNIQUE INDEX "uq_user_notifications_dedupe_key"
  ON "public"."user_notifications"("dedupe_key");
CREATE INDEX "ix_user_notifications_recipient_active"
  ON "public"."user_notifications"("recipient_user_id", "archived_at", "created_at" DESC);
CREATE INDEX "ix_user_notifications_recipient_read"
  ON "public"."user_notifications"("recipient_user_id", "read_at");

ALTER TABLE "public"."user_notifications"
  ADD CONSTRAINT "fk_user_notifications_recipient"
  FOREIGN KEY ("recipient_user_id") REFERENCES "public"."user_table"("user_id")
  ON DELETE CASCADE ON UPDATE NO ACTION;
