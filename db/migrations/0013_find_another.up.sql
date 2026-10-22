ALTER TABLE rose_search
  ADD COLUMN IF NOT EXISTS query text,
  ADD COLUMN IF NOT EXISTS tried boolean NOT NULL DEFAULT false;
ALTER TABLE purchase_requests
  ADD COLUMN IF NOT EXISTS queries jsonb;
