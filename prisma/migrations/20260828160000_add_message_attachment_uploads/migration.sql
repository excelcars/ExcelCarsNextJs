CREATE TABLE "message_attachment_upload" (
    "upload_id" UUID NOT NULL,
    "template_id" INTEGER NOT NULL,
    "stored_path" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "scope" TEXT NOT NULL,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "message_attachment_upload_pkey" PRIMARY KEY ("upload_id")
);

CREATE INDEX "ix_message_attachment_upload_template" ON "message_attachment_upload"("template_id");
CREATE INDEX "ix_message_attachment_upload_user_scope" ON "message_attachment_upload"("created_by", "scope");

ALTER TABLE "message_attachment_upload"
  ADD CONSTRAINT "fk_message_attachment_upload_template"
  FOREIGN KEY ("template_id") REFERENCES "message_template"("type_id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "message_attachment_upload"
  ADD CONSTRAINT "fk_message_attachment_upload_user"
  FOREIGN KEY ("created_by") REFERENCES "user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
