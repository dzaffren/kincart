DROP TABLE IF EXISTS price_limit;
DROP TABLE IF EXISTS rose_search;
ALTER TABLE purchase_requests
  DROP COLUMN IF EXISTS reason,
  DROP COLUMN IF EXISTS listing_url,
  DROP COLUMN IF EXISTS shop;
