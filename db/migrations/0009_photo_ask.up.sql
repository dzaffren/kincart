ALTER TABLE rose_search
  ADD COLUMN IF NOT EXISTS from_photo boolean NOT NULL DEFAULT false,
  DROP CONSTRAINT IF EXISTS rose_search_outcome_check,
  ADD CONSTRAINT rose_search_outcome_check
    CHECK (outcome IN ('options', 'nothing found', 'over limit', 'several', 'retry', 'basket', 'too many', 'nothing in photo'));
