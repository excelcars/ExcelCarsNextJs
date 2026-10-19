CREATE UNIQUE INDEX IF NOT EXISTS idx_16506_uq_inquiry_inquiry_no
  ON inquiry (inquiry_no)
  WHERE inquiry_no IS NOT NULL;
