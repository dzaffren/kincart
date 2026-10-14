ALTER TABLE purchase_requests
  ADD COLUMN IF NOT EXISTS lines jsonb,
  ADD COLUMN IF NOT EXISTS left_out jsonb;

ALTER TABLE rose_search
  ADD COLUMN IF NOT EXISTS groups jsonb NOT NULL DEFAULT '[]',
  DROP CONSTRAINT IF EXISTS rose_search_outcome_check,
  ADD CONSTRAINT rose_search_outcome_check
    CHECK (outcome IN ('options', 'nothing found', 'over limit', 'several', 'retry', 'basket', 'too many'));
