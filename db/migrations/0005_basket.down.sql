DELETE FROM rose_search WHERE outcome IN ('basket', 'too many');

ALTER TABLE rose_search
  DROP CONSTRAINT IF EXISTS rose_search_outcome_check,
  ADD CONSTRAINT rose_search_outcome_check
    CHECK (outcome IN ('options', 'nothing found', 'over limit', 'several', 'retry')),
  DROP COLUMN IF EXISTS groups;

ALTER TABLE purchase_requests
  DROP COLUMN IF EXISTS left_out,
  DROP COLUMN IF EXISTS lines;
