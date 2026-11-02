CREATE TABLE IF NOT EXISTS passkey_challenges (
  challenge text PRIMARY KEY,
  household_id bigint NOT NULL REFERENCES households (id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('on', 'off', 'ok', 'links')),
  made_at timestamptz NOT NULL DEFAULT now()
);
