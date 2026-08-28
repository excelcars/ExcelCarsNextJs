-- Run after confirming that no normalized Name + primary Mobile duplicates exist.
-- This protects application writes from concurrent duplicate creates/updates.
CREATE UNIQUE INDEX IF NOT EXISTS idx_16457_uq_dealer_master_normalized_name_mobile
  ON dealer_master (lower(btrim(dealer_name)), btrim(dealer_mobile_no))
  WHERE dealer_name IS NOT NULL
    AND dealer_mobile_no IS NOT NULL
    AND btrim(dealer_name) <> ''
    AND btrim(dealer_mobile_no) <> '';
