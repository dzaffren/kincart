ALTER TABLE purchase_requests
  ADD COLUMN IF NOT EXISTS shop text,
  ADD COLUMN IF NOT EXISTS listing_url text,
  ADD COLUMN IF NOT EXISTS reason text;

CREATE TABLE IF NOT EXISTS rose_search (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  words text NOT NULL,
  outcome text NOT NULL
    CHECK (outcome IN ('options', 'nothing found', 'over limit', 'several', 'retry')),
  listings jsonb NOT NULL DEFAULT '[]',
  searched_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS price_limit (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  cents integer NOT NULL CHECK (cents BETWEEN 500 AND 50000),
  set_at timestamptz NOT NULL DEFAULT now()
);
