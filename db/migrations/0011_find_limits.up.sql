CREATE TABLE IF NOT EXISTS address_uses (
  kind text NOT NULL CHECK (kind IN ('find', 'household')),
  address text NOT NULL,
  used_at timestamptz[] NOT NULL,
  PRIMARY KEY (kind, address)
);
