UPDATE rose_search SET outcome = 'nothing found' WHERE outcome = 'nothing in photo';

ALTER TABLE rose_search
  DROP CONSTRAINT IF EXISTS rose_search_outcome_check,
  ADD CONSTRAINT rose_search_outcome_check
    CHECK (outcome IN ('options', 'nothing found', 'over limit', 'several', 'retry', 'basket', 'too many')),
  DROP COLUMN IF EXISTS from_photo;
