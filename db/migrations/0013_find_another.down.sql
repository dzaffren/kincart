ALTER TABLE rose_search
  DROP COLUMN IF EXISTS query,
  DROP COLUMN IF EXISTS tried;
ALTER TABLE purchase_requests
  DROP COLUMN IF EXISTS queries;
