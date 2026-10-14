CREATE TABLE IF NOT EXISTS total_limit (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  cents integer NOT NULL CHECK (cents BETWEEN 500 AND 250000),
  set_at timestamptz NOT NULL DEFAULT now()
);
