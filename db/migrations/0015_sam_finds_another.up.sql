ALTER TABLE rose_search
  ADD COLUMN IF NOT EXISTS by_sam boolean NOT NULL DEFAULT false;
